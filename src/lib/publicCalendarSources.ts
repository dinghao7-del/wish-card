import type { PublicCalendarSignal, PublicCalendarSignalSeverity, PublicCalendarSignalType } from '../domain/publicCalendarIntelligence';
import { getStorageAdapter, STORAGE_KEYS, storageGet, storageSet } from './StorageAdapter';

export interface PublicCalendarQuery {
  year?: number;
  region?: string;
  includeRemote?: boolean;
  remoteEndpoint?: string;
}

export interface PublicCalendarSourceResult {
  sourceId: string;
  sourceName: string;
  signals: PublicCalendarSignal[];
  fetchedAt: string;
  error?: string;
  mode?: 'builtin' | 'local' | 'remote';
  stale?: boolean;
  verifiedUntil?: string;
}

export interface PublicCalendarSource {
  id: string;
  name: string;
  fetchSignals(query: PublicCalendarQuery): Promise<PublicCalendarSourceResult>;
}

export interface PublicCalendarSourceStatus {
  sourceId: string;
  sourceName: string;
  fetchedAt: string;
  signalCount: number;
  mode: 'builtin' | 'local' | 'remote';
  status: 'ok' | 'fallback' | 'needs_config' | 'error';
  stale: boolean;
  verifiedUntil?: string;
  error?: string;
}

export interface PublicCalendarSignalBundle {
  signals: PublicCalendarSignal[];
  statuses: PublicCalendarSourceStatus[];
  loadedAt: string;
  freshnessLabel: string;
  hasRemoteConfigured: boolean;
}

const GOV_CN_2026_HOLIDAY_URL = 'https://www.gov.cn/yaowen/liebiao/202511/content_7047099.htm';
const REMOTE_CACHE_MAX_AGE_DAYS = 7;

interface PublicCalendarRemoteCacheEntry {
  cacheKey: string;
  year?: number;
  region?: string;
  endpointHost?: string;
  signals: PublicCalendarSignal[];
  fetchedAt: string;
  verifiedUntil?: string;
}

const CHINA_2026_HOLIDAY_SIGNALS: PublicCalendarSignal[] = [
  holiday('cn-2026-new-year', '元旦假期', '2026-01-01', '2026-01-03'),
  makeup('cn-2026-new-year-makeup', '元旦调休上班日', '2026-01-04'),
  holiday('cn-2026-spring-festival', '春节假期', '2026-02-15', '2026-02-23'),
  makeup('cn-2026-spring-festival-makeup-1', '春节调休上班日', '2026-02-14'),
  makeup('cn-2026-spring-festival-makeup-2', '春节调休上班日', '2026-02-28'),
  holiday('cn-2026-qingming', '清明节假期', '2026-04-04', '2026-04-06'),
  holiday('cn-2026-labor-day', '劳动节假期', '2026-05-01', '2026-05-05'),
  makeup('cn-2026-labor-day-makeup', '劳动节调休上班日', '2026-05-09'),
  holiday('cn-2026-dragon-boat', '端午节假期', '2026-06-19', '2026-06-21'),
  holiday('cn-2026-mid-autumn', '中秋节假期', '2026-09-25', '2026-09-27'),
  holiday('cn-2026-national-day', '国庆节假期', '2026-10-01', '2026-10-07'),
  makeup('cn-2026-national-day-makeup-1', '国庆节调休上班日', '2026-09-20'),
  makeup('cn-2026-national-day-makeup-2', '国庆节调休上班日', '2026-10-10'),
];

export const builtinChinaHolidaySource: PublicCalendarSource = {
  id: 'builtin-china-holidays',
  name: '中国法定节假日内置种子',
  async fetchSignals(query) {
    const year = query.year || new Date().getFullYear();
    return {
      sourceId: this.id,
      sourceName: this.name,
      signals: year === 2026 ? CHINA_2026_HOLIDAY_SIGNALS : [],
      fetchedAt: new Date().toISOString(),
      mode: 'builtin',
      stale: year !== 2026,
      verifiedUntil: year === 2026 ? '2026-12-31T23:59:59.999+08:00' : undefined,
    };
  },
};

export const localSchoolCalendarSource: PublicCalendarSource = {
  id: 'local-school-calendar',
  name: '家庭手动校历与本地事件',
  async fetchSignals() {
    return {
      sourceId: this.id,
      sourceName: this.name,
      signals: await getStoredPublicCalendarSignals(),
      fetchedAt: new Date().toISOString(),
      mode: 'local',
      stale: false,
    };
  },
};

export const remotePublicEventSource: PublicCalendarSource = {
  id: 'remote-public-events',
  name: '实时公共事件接口',
  async fetchSignals(query) {
    if (!query.includeRemote) {
      return {
        sourceId: this.id,
        sourceName: this.name,
        signals: [],
        fetchedAt: new Date().toISOString(),
        mode: 'remote',
        stale: false,
      };
    }

    const endpoint = query.remoteEndpoint || import.meta.env.VITE_PUBLIC_CALENDAR_ENDPOINT || '';
    if (!endpoint) {
      return {
        sourceId: this.id,
        sourceName: this.name,
        signals: [],
        fetchedAt: new Date().toISOString(),
        mode: 'remote',
        stale: true,
        error: 'REMOTE_SOURCE_NOT_CONFIGURED',
      };
    }

    const url = new URL(endpoint);
    if (query.year) url.searchParams.set('year', String(query.year));
    if (query.region) url.searchParams.set('region', query.region);

    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        return remoteCacheFallback(this.id, this.name, query, endpoint, `REMOTE_SOURCE_HTTP_${response.status}`);
      }

      const payload = await response.json();
      const signals = normalizeRemoteSignals(payload);
      const fetchedAt = new Date().toISOString();
      await saveRemoteCache(query, endpoint, {
        signals,
        fetchedAt,
        verifiedUntil: readRemoteVerifiedUntil(payload),
      });
      return {
        sourceId: this.id,
        sourceName: this.name,
        signals,
        fetchedAt,
        mode: 'remote',
        stale: false,
        verifiedUntil: readRemoteVerifiedUntil(payload),
      };
    } catch (error: any) {
      return remoteCacheFallback(this.id, this.name, query, endpoint, error?.message || 'REMOTE_SOURCE_FETCH_FAILED');
    }
  },
};

export async function loadPublicCalendarSignals(query: PublicCalendarQuery = {}): Promise<PublicCalendarSignal[]> {
  const bundle = await loadPublicCalendarSignalBundle(query);
  return bundle.signals;
}

export async function loadPublicCalendarSignalBundle(query: PublicCalendarQuery = {}): Promise<PublicCalendarSignalBundle> {
  const sources = [builtinChinaHolidaySource, localSchoolCalendarSource, remotePublicEventSource];
  const results = await Promise.all(sources.map(source => source.fetchSignals(query).catch(error => ({
    sourceId: source.id,
    sourceName: source.name,
    signals: [],
    fetchedAt: new Date().toISOString(),
    mode: 'remote' as const,
    stale: true,
    error: error?.message || String(error),
  }))));

  const statuses = results.map(resultToStatus);
  await storageSet(getStorageAdapter(), STORAGE_KEYS.PUBLIC_CALENDAR_SOURCE_STATUS, statuses);

  return {
    signals: dedupeSignals(results.flatMap(result => result.signals)),
    statuses,
    loadedAt: new Date().toISOString(),
    freshnessLabel: buildFreshnessLabel(statuses),
    hasRemoteConfigured: statuses.some(status => status.mode === 'remote' && status.status === 'ok'),
  };
}

export async function getStoredPublicCalendarSourceStatuses(): Promise<PublicCalendarSourceStatus[]> {
  return storageGet<PublicCalendarSourceStatus[]>(getStorageAdapter(), STORAGE_KEYS.PUBLIC_CALENDAR_SOURCE_STATUS, []);
}

export async function getStoredPublicCalendarRemoteCache(): Promise<PublicCalendarRemoteCacheEntry[]> {
  return storageGet<PublicCalendarRemoteCacheEntry[]>(getStorageAdapter(), STORAGE_KEYS.PUBLIC_CALENDAR_REMOTE_CACHE, []);
}

export async function getStoredPublicCalendarSignals(): Promise<PublicCalendarSignal[]> {
  return storageGet<PublicCalendarSignal[]>(getStorageAdapter(), STORAGE_KEYS.PUBLIC_CALENDAR_SIGNALS, []);
}

export async function getStoredPublicCalendarRegion(): Promise<string | undefined> {
  const region = await storageGet<string>(getStorageAdapter(), STORAGE_KEYS.PUBLIC_CALENDAR_REGION, '');
  return normalizeRegion(region);
}

export async function setStoredPublicCalendarRegion(region: string): Promise<string | undefined> {
  const normalized = normalizeRegion(region);
  await storageSet(getStorageAdapter(), STORAGE_KEYS.PUBLIC_CALENDAR_REGION, normalized || '');
  return normalized;
}

export async function saveStoredPublicCalendarSignals(signals: PublicCalendarSignal[]): Promise<void> {
  await storageSet(getStorageAdapter(), STORAGE_KEYS.PUBLIC_CALENDAR_SIGNALS, dedupeSignals(signals));
}

export async function upsertStoredPublicCalendarSignal(signal: PublicCalendarSignal): Promise<PublicCalendarSignal[]> {
  const existing = await getStoredPublicCalendarSignals();
  const next = dedupeSignals([signal, ...existing.filter(item => item.id !== signal.id)]);
  await saveStoredPublicCalendarSignals(next);
  return next;
}

export async function removeStoredPublicCalendarSignal(signalId: string): Promise<PublicCalendarSignal[]> {
  const existing = await getStoredPublicCalendarSignals();
  const next = existing.filter(signal => signal.id !== signalId);
  await saveStoredPublicCalendarSignals(next);
  return next;
}

export type LocalPublicCalendarSignalKind =
  | 'term_start'
  | 'school_break'
  | 'exam'
  | 'school_event'
  | 'emergency'
  | 'public_event';

export function createSchoolCalendarSignal(input: {
  id?: string;
  title: string;
  region?: string;
  startDate: string;
  endDate: string;
  kind: LocalPublicCalendarSignalKind;
  sourceName?: string;
}): PublicCalendarSignal {
  const classification = classifyLocalSignal(input.kind);

  return {
    id: input.id || `school-${Date.now()}`,
    type: classification.type,
    title: input.title,
    region: input.region || 'national',
    startDate: toDayStart(input.startDate),
    endDate: toDayEnd(input.endDate),
    severity: classification.severity,
    sourceName: input.sourceName || classification.sourceName,
    verifiedAt: new Date().toISOString(),
    affectsSchool: classification.affectsSchool,
    affectsWork: classification.affectsWork,
    affectsTravel: classification.affectsTravel,
    recommendationHint: classification.recommendationHint,
  };
}

function classifyLocalSignal(kind: LocalPublicCalendarSignalKind): {
  type: PublicCalendarSignalType;
  severity: PublicCalendarSignalSeverity;
  sourceName: string;
  affectsSchool: boolean;
  affectsWork: boolean;
  affectsTravel: boolean;
  recommendationHint: string;
} {
  if (kind === 'school_break') {
    return {
      type: 'school_break',
      severity: 'notice',
      sourceName: '家庭手动校历',
      affectsSchool: true,
      affectsWork: false,
      affectsTravel: true,
      recommendationHint: '假期期间建议切换假期作息，并提前安排阅读、运动、家务和亲子兑现。',
    };
  }

  if (kind === 'exam') {
    return {
      type: 'school_term',
      severity: 'warning',
      sourceName: '家庭手动校历',
      affectsSchool: true,
      affectsWork: false,
      affectsTravel: false,
      recommendationHint: '建议提前减负并保留复习、睡眠和通勤缓冲，避免同一天叠加太多任务。',
    };
  }

  if (kind === 'emergency') {
    return {
      type: 'emergency',
      severity: 'critical',
      sourceName: '家庭手动公共事件',
      affectsSchool: true,
      affectsWork: true,
      affectsTravel: true,
      recommendationHint: '优先保障安全、接送和家庭沟通，建议暂停非必要外出和低优先级任务。',
    };
  }

  if (kind === 'public_event') {
    return {
      type: 'public_event',
      severity: 'warning',
      sourceName: '家庭手动公共事件',
      affectsSchool: false,
      affectsWork: false,
      affectsTravel: true,
      recommendationHint: '建议提前确认交通、场馆、线下课程和亲子出行安排，必要时预留更大缓冲。',
    };
  }

  return {
    type: 'school_term',
    severity: 'notice',
    sourceName: '家庭手动校历',
    affectsSchool: true,
    affectsWork: false,
    affectsTravel: false,
    recommendationHint: '建议核对学校通知，确认接送、作业、睡眠和课外班安排。',
  };
}

function holiday(id: string, title: string, start: string, end: string): PublicCalendarSignal {
  return {
    id,
    type: 'national_holiday',
    title,
    region: 'national',
    startDate: toDayStart(start),
    endDate: toDayEnd(end),
    severity: 'notice',
    sourceName: '国务院办公厅',
    sourceUrl: GOV_CN_2026_HOLIDAY_URL,
    verifiedAt: '2025-11-04T17:18:00+08:00',
    affectsSchool: true,
    affectsWork: true,
    affectsTravel: true,
  };
}

function makeup(id: string, title: string, date: string): PublicCalendarSignal {
  return {
    id,
    type: 'makeup_workday',
    title,
    region: 'national',
    startDate: toDayStart(date),
    endDate: toDayEnd(date),
    severity: 'warning',
    sourceName: '国务院办公厅',
    sourceUrl: GOV_CN_2026_HOLIDAY_URL,
    verifiedAt: '2025-11-04T17:18:00+08:00',
    affectsSchool: true,
    affectsWork: true,
    affectsTravel: false,
  };
}

function toDayStart(date: string): string {
  return `${date.slice(0, 10)}T00:00:00.000+08:00`;
}

function toDayEnd(date: string): string {
  return `${date.slice(0, 10)}T23:59:59.999+08:00`;
}

function normalizeRegion(region: string | undefined): string | undefined {
  const trimmed = (region || '').trim();
  if (!trimmed || trimmed === 'national' || trimmed === '全国' || trimmed === '通用') return undefined;
  return trimmed;
}

function dedupeSignals(signals: PublicCalendarSignal[]): PublicCalendarSignal[] {
  const seen = new Set<string>();
  return signals.filter(signal => {
    if (seen.has(signal.id)) return false;
    seen.add(signal.id);
    return true;
  });
}

function resultToStatus(result: PublicCalendarSourceResult): PublicCalendarSourceStatus {
  const mode = result.mode || 'remote';
  let status: PublicCalendarSourceStatus['status'] = 'ok';
  if (result.error === 'REMOTE_SOURCE_NOT_CONFIGURED') status = 'needs_config';
  else if (result.error && result.signals.length > 0) status = 'fallback';
  else if (result.error) status = 'error';
  else if (mode === 'builtin' || mode === 'local') status = 'fallback';

  return {
    sourceId: result.sourceId,
    sourceName: result.sourceName,
    fetchedAt: result.fetchedAt,
    signalCount: result.signals.length,
    mode,
    status,
    stale: Boolean(result.stale),
    verifiedUntil: result.verifiedUntil,
    error: result.error,
  };
}

function buildFreshnessLabel(statuses: PublicCalendarSourceStatus[]): string {
  if (statuses.some(status => status.mode === 'remote' && status.status === 'ok')) {
    return '已连接实时公共时间源';
  }
  if (statuses.some(status => status.mode === 'remote' && status.status === 'fallback' && status.signalCount > 0)) {
    return '实时公共时间源暂不可用，正在使用最近缓存';
  }
  if (statuses.some(status => status.mode === 'builtin' && status.signalCount > 0 && !status.stale)) {
    return '正在使用已核验的内置节假日和家庭校历';
  }
  return '正在使用离线兜底数据，建议联网后更新';
}

async function remoteCacheFallback(
  sourceId: string,
  sourceName: string,
  query: PublicCalendarQuery,
  endpoint: string,
  error: string,
): Promise<PublicCalendarSourceResult> {
  const cached = await readMatchingRemoteCache(query, endpoint);
  if (cached && !isRemoteCacheExpired(cached)) {
    return {
      sourceId,
      sourceName,
      signals: cached.signals,
      fetchedAt: new Date().toISOString(),
      mode: 'remote',
      stale: true,
      verifiedUntil: cached.verifiedUntil,
      error,
    };
  }

  return {
    sourceId,
    sourceName,
    signals: [],
    fetchedAt: new Date().toISOString(),
    mode: 'remote',
    stale: true,
    error,
  };
}

async function saveRemoteCache(
  query: PublicCalendarQuery,
  endpoint: string,
  cache: Pick<PublicCalendarRemoteCacheEntry, 'signals' | 'fetchedAt' | 'verifiedUntil'>,
): Promise<void> {
  const nextEntry: PublicCalendarRemoteCacheEntry = {
    cacheKey: buildRemoteCacheKey(query, endpoint),
    year: query.year,
    region: normalizeRegion(query.region),
    endpointHost: safeEndpointHost(endpoint),
    signals: dedupeSignals(cache.signals),
    fetchedAt: cache.fetchedAt,
    verifiedUntil: cache.verifiedUntil,
  };
  const existing = await getStoredPublicCalendarRemoteCache();
  const next = [
    nextEntry,
    ...existing.filter(item => item.cacheKey !== nextEntry.cacheKey),
  ].slice(0, 20);
  await storageSet(getStorageAdapter(), STORAGE_KEYS.PUBLIC_CALENDAR_REMOTE_CACHE, next);
}

async function readMatchingRemoteCache(query: PublicCalendarQuery, endpoint: string): Promise<PublicCalendarRemoteCacheEntry | null> {
  const cacheKey = buildRemoteCacheKey(query, endpoint);
  const entries = await getStoredPublicCalendarRemoteCache();
  return entries.find(entry => entry.cacheKey === cacheKey) || null;
}

function buildRemoteCacheKey(query: PublicCalendarQuery, endpoint: string): string {
  const year = query.year || new Date().getFullYear();
  const region = normalizeRegion(query.region) || 'national';
  return `${safeEndpointHost(endpoint)}::${year}::${region}`;
}

function safeEndpointHost(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
}

function isRemoteCacheExpired(cache: PublicCalendarRemoteCacheEntry): boolean {
  const fetchedAt = new Date(cache.fetchedAt).getTime();
  if (!Number.isFinite(fetchedAt)) return true;
  return Date.now() - fetchedAt > REMOTE_CACHE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function readRemoteVerifiedUntil(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const value = (payload as { verifiedUntil?: unknown }).verifiedUntil;
  return typeof value === 'string' ? value : undefined;
}

function normalizeRemoteSignals(payload: unknown): PublicCalendarSignal[] {
  const rawSignals = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { signals?: unknown })?.signals)
      ? (payload as { signals: unknown[] }).signals
      : [];

  return rawSignals
    .map(normalizeRemoteSignal)
    .filter((signal): signal is PublicCalendarSignal => Boolean(signal));
}

function normalizeRemoteSignal(raw: unknown): PublicCalendarSignal | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<PublicCalendarSignal>;
  if (!item.id || !item.title || !item.type || !item.startDate || !item.endDate) return null;
  if (!isPublicSignalType(item.type) || !isPublicSignalSeverity(item.severity || 'notice')) return null;

  return {
    id: String(item.id),
    type: item.type,
    title: String(item.title),
    region: item.region || 'national',
    startDate: String(item.startDate),
    endDate: String(item.endDate),
    severity: item.severity || 'notice',
    sourceName: item.sourceName || '实时公共事件接口',
    sourceUrl: item.sourceUrl,
    verifiedAt: item.verifiedAt || new Date().toISOString(),
    affectsSchool: Boolean(item.affectsSchool),
    affectsWork: Boolean(item.affectsWork),
    affectsTravel: Boolean(item.affectsTravel),
    recommendationHint: item.recommendationHint,
  };
}

function isPublicSignalType(value: unknown): value is PublicCalendarSignal['type'] {
  return value === 'national_holiday'
    || value === 'makeup_workday'
    || value === 'school_term'
    || value === 'school_break'
    || value === 'emergency'
    || value === 'public_event';
}

function isPublicSignalSeverity(value: unknown): value is PublicCalendarSignal['severity'] {
  return value === 'info' || value === 'notice' || value === 'warning' || value === 'critical';
}
