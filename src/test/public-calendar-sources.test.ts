import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  builtinChinaHolidaySource,
  createSchoolCalendarSignal,
  getStoredPublicCalendarRegion,
  getStoredPublicCalendarRemoteCache,
  getStoredPublicCalendarSourceStatuses,
  loadPublicCalendarSignalBundle,
  loadPublicCalendarSignals,
  remotePublicEventSource,
  setStoredPublicCalendarRegion,
} from '../lib/publicCalendarSources';

describe('公共时间数据源', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('内置 2026 年中国法定节假日和调休信号', async () => {
    const result = await builtinChinaHolidaySource.fetchSignals({ year: 2026 });

    expect(result.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'cn-2026-spring-festival',
        type: 'national_holiday',
        sourceName: '国务院办公厅',
      }),
      expect.objectContaining({
        id: 'cn-2026-labor-day-makeup',
        type: 'makeup_workday',
        severity: 'warning',
      }),
    ]));
  });

  it('可以创建家庭手动维护的学校校历信号', () => {
    const signal = createSchoolCalendarSignal({
      title: '秋季开学',
      startDate: '2026-09-01',
      endDate: '2026-09-01',
      kind: 'term_start',
      region: '北京',
    });

    expect(signal).toMatchObject({
      type: 'school_term',
      title: '秋季开学',
      region: '北京',
      affectsSchool: true,
    });
  });

  it('可以创建本地突发公共事件信号并参与安全减负判断', () => {
    const signal = createSchoolCalendarSignal({
      title: '暴雨临时停课',
      startDate: '2026-06-02',
      endDate: '2026-06-02',
      kind: 'emergency',
      region: '北京',
    });

    expect(signal).toMatchObject({
      type: 'emergency',
      title: '暴雨临时停课',
      severity: 'critical',
      affectsSchool: true,
      affectsWork: true,
      affectsTravel: true,
      sourceName: '家庭手动公共事件',
    });
    expect(signal.recommendationHint).toContain('暂停非必要外出');
  });

  it('会保存家庭公共时间默认地区，供周报和语音助手复用', async () => {
    await setStoredPublicCalendarRegion(' 北京 ');
    expect(await getStoredPublicCalendarRegion()).toBe('北京');

    await setStoredPublicCalendarRegion('全国');
    expect(await getStoredPublicCalendarRegion()).toBeUndefined();
  });

  it('实时公共事件源未配置时不会阻塞本地信号加载', async () => {
    const remote = await remotePublicEventSource.fetchSignals({ includeRemote: true });
    const allSignals = await loadPublicCalendarSignals({ year: 2026, includeRemote: true });

    expect(remote.error).toBe('REMOTE_SOURCE_NOT_CONFIGURED');
    expect(allSignals.length).toBeGreaterThan(0);
    expect(allSignals.some(signal => signal.id === 'cn-2026-national-day')).toBe(true);
  });

  it('加载公共时间数据包时会返回来源状态和离线新鲜度说明', async () => {
    const bundle = await loadPublicCalendarSignalBundle({ year: 2026, includeRemote: true });
    const storedStatuses = await getStoredPublicCalendarSourceStatuses();

    expect(bundle.signals.some(signal => signal.id === 'cn-2026-national-day')).toBe(true);
    expect(bundle.freshnessLabel).toContain('内置节假日');
    expect(bundle.hasRemoteConfigured).toBe(false);
    expect(bundle.statuses).toContainEqual(expect.objectContaining({
      sourceId: 'remote-public-events',
      status: 'needs_config',
      stale: true,
    }));
    expect(storedStatuses.length).toBeGreaterThanOrEqual(3);
  });

  it('配置远程接口后可以拉取并校验公共事件信号', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        signals: [
          {
            id: 'remote-weather-1',
            type: 'emergency',
            title: '暴雨红色预警',
            region: '北京',
            startDate: '2026-06-01T00:00:00.000+08:00',
            endDate: '2026-06-01T23:59:59.999+08:00',
            severity: 'critical',
            sourceName: '气象部门',
            affectsSchool: true,
            affectsTravel: true,
          },
          {
            id: 'bad-signal',
            title: '缺少类型的坏数据',
            startDate: '2026-06-01T00:00:00.000+08:00',
            endDate: '2026-06-01T23:59:59.999+08:00',
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const remote = await remotePublicEventSource.fetchSignals({
      includeRemote: true,
      year: 2026,
      region: '北京',
      remoteEndpoint: 'https://calendar.example.test/events',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://calendar.example.test/events?year=2026&region=%E5%8C%97%E4%BA%AC',
      { headers: { Accept: 'application/json' } },
    );
    expect(remote.error).toBeUndefined();
    expect(remote.signals).toEqual([
      expect.objectContaining({
        id: 'remote-weather-1',
        type: 'emergency',
        severity: 'critical',
        affectsTravel: true,
      }),
    ]);

    const bundle = await loadPublicCalendarSignalBundle({
      year: 2026,
      includeRemote: true,
      remoteEndpoint: 'https://calendar.example.test/events',
    });
    expect(bundle.hasRemoteConfigured).toBe(true);
    expect(bundle.freshnessLabel).toContain('实时公共时间源');
  });

  it('远程接口失败时会回退到同地区年份的最近缓存', async () => {
    const endpoint = 'https://calendar-cache.example.test/events';
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        verifiedUntil: '2026-06-30T23:59:59.999+08:00',
        signals: [
          {
            id: 'remote-school-closed-1',
            type: 'emergency',
            title: '暴雨停课',
            region: '北京',
            startDate: '2026-06-02T00:00:00.000+08:00',
            endDate: '2026-06-02T23:59:59.999+08:00',
            severity: 'critical',
            sourceName: '城市应急部门',
            affectsSchool: true,
            affectsTravel: true,
          },
        ],
      }),
    })));

    await remotePublicEventSource.fetchSignals({
      includeRemote: true,
      year: 2026,
      region: '北京',
      remoteEndpoint: endpoint,
    });
    expect((await getStoredPublicCalendarRemoteCache()).some(entry => entry.signals.some(signal => signal.id === 'remote-school-closed-1'))).toBe(true);

    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })));

    const fallback = await remotePublicEventSource.fetchSignals({
      includeRemote: true,
      year: 2026,
      region: '北京',
      remoteEndpoint: endpoint,
    });

    expect(fallback).toMatchObject({
      mode: 'remote',
      stale: true,
      error: 'REMOTE_SOURCE_HTTP_503',
      verifiedUntil: '2026-06-30T23:59:59.999+08:00',
    });
    expect(fallback.signals).toEqual([
      expect.objectContaining({
        id: 'remote-school-closed-1',
        title: '暴雨停课',
      }),
    ]);

    const bundle = await loadPublicCalendarSignalBundle({
      includeRemote: true,
      year: 2026,
      region: '北京',
      remoteEndpoint: endpoint,
    });
    expect(bundle.freshnessLabel).toContain('最近缓存');
    expect(bundle.statuses).toContainEqual(expect.objectContaining({
      sourceId: 'remote-public-events',
      status: 'fallback',
      stale: true,
      signalCount: 1,
    }));
  });
});
