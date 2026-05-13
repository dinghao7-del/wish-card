import { supabase } from './supabase';
import {
  buildSharedScheduleTemplateAsset,
  getReadyCommunityShareDrafts,
  type SharedScheduleTemplateDraft,
  type StoredSharedScheduleTemplateDraft,
} from './communityShare';
import type { PlanningScenario, ScheduleSlot } from '../domain/familyPlanning';
import { getStorageAdapter, STORAGE_KEYS, storageGet, storageSet } from './StorageAdapter';

export interface SharedScheduleTemplateCloudRow {
  id?: string;
  source_family_id: string | null;
  source_plan_id: string | null;
  author_member_id: string | null;
  title: string;
  scenario: string;
  age_range: string | null;
  grade_band: string | null;
  city_level: string | null;
  content: Record<string, unknown>;
  tips: string[];
  visibility: 'public' | 'unlisted' | 'private';
  moderation_status: 'pending' | 'approved' | 'rejected';
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityShareSyncPreview {
  rowCount: number;
  blockedCount: number;
  rows: SharedScheduleTemplateCloudRow[];
  blockedDrafts: Array<{
    id: string;
    title: string;
    reasons: string[];
  }>;
}

export interface CommunityCloudTemplateQuery {
  keyword?: string;
  scenario?: PlanningScenario | 'all';
  gradeBand?: string;
  cityLevel?: string;
  limit?: number;
}

export interface CommunityCloudTemplateCache {
  updatedAt: string;
  templates: StoredSharedScheduleTemplateDraft[];
}

const MAX_CLOUD_TEMPLATE_CACHE_SIZE = 60;

export function buildSharedScheduleTemplateCloudRow(
  item: StoredSharedScheduleTemplateDraft,
  options: {
    familyId?: string | null;
    authorMemberId?: string | null;
    visibility?: SharedScheduleTemplateCloudRow['visibility'];
  } = {},
): SharedScheduleTemplateCloudRow | null {
  if (item.status !== 'ready_to_publish') return null;
  if (!item.consent?.privacyReviewed || !item.consent?.communityUseAgreed) return null;
  if (item.asset?.publishBlockers?.length) return null;

  return {
    id: normalizeUuidOrUndefined(item.id),
    source_family_id: options.familyId || null,
    source_plan_id: normalizeUuidOrNull(item.draft.sourcePlanId),
    author_member_id: options.authorMemberId || null,
    title: item.draft.title,
    scenario: item.draft.scenario,
    age_range: item.draft.ageRange,
    grade_band: item.draft.gradeBand,
    city_level: item.draft.cityLevel,
    content: {
      ...item.draft.content,
      asset: {
        tags: item.asset.tags,
        slotCount: item.asset.slotCount,
        categoryMix: item.asset.categoryMix,
        privacyRiskLevel: item.asset.privacyRiskLevel,
        qualityScore: item.asset.qualityScore,
        qualityLevel: item.asset.qualityLevel,
        qualityReasons: item.asset.qualityReasons,
        profileSignal: item.asset.profileSignal,
        reuseHint: item.asset.reuseHint,
      },
      consent: {
        version: item.consent.version,
        agreedAt: item.consent.agreedAt,
      },
      redactions: item.draft.redactions,
    },
    tips: item.draft.tips,
    visibility: options.visibility || 'public',
    moderation_status: 'pending',
    usage_count: 0,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function buildCommunityShareSyncPreview(
  drafts: StoredSharedScheduleTemplateDraft[],
  options: {
    familyId?: string | null;
    authorMemberId?: string | null;
    visibility?: SharedScheduleTemplateCloudRow['visibility'];
  } = {},
): CommunityShareSyncPreview {
  const rows: SharedScheduleTemplateCloudRow[] = [];
  const blockedDrafts: CommunityShareSyncPreview['blockedDrafts'] = [];

  for (const item of drafts) {
    const row = buildSharedScheduleTemplateCloudRow(item, options);
    if (row) {
      rows.push(row);
    } else {
      const reasons = getPublishBlockReasons(item);
      if (reasons.length > 0) {
        blockedDrafts.push({
          id: item.id,
          title: item.draft.title,
          reasons,
        });
      }
    }
  }

  return {
    rowCount: rows.length,
    blockedCount: blockedDrafts.length,
    rows,
    blockedDrafts,
  };
}

export async function syncReadyCommunityShareDrafts(
  options: {
    familyId?: string | null;
    authorMemberId?: string | null;
    visibility?: SharedScheduleTemplateCloudRow['visibility'];
  } = {},
): Promise<{ syncedRows: number; blockedRows: number }> {
  const drafts = await getReadyCommunityShareDrafts();
  const preview = buildCommunityShareSyncPreview(drafts, options);

  if (preview.rows.length === 0) {
    return { syncedRows: 0, blockedRows: preview.blockedCount };
  }

  const { error } = await supabase
    .from('shared_schedule_templates')
    .upsert(preview.rows, { onConflict: 'id' });

  if (error) throw error;

  return {
    syncedRows: preview.rows.length,
    blockedRows: preview.blockedCount,
  };
}

export function cloudRowToStoredCommunityTemplate(
  row: SharedScheduleTemplateCloudRow,
): StoredSharedScheduleTemplateDraft {
  const content = row.content || {};
  const slots = Array.isArray((content as any).slots)
    ? (content as any).slots.map(sanitizeCloudSlot)
    : [];
  const assumptions = Array.isArray((content as any).assumptions)
    ? (content as any).assumptions.filter((item: unknown): item is string => typeof item === 'string')
    : [];
  const redactions = Array.isArray((content as any).redactions)
    ? (content as any).redactions.filter((item: unknown): item is string => typeof item === 'string')
    : [];

  const draft: SharedScheduleTemplateDraft = {
    title: row.title,
    scenario: normalizeScenario(row.scenario),
    sourcePlanId: row.source_plan_id || undefined,
    ageRange: row.age_range,
    gradeBand: row.grade_band,
    cityLevel: row.city_level,
    content: {
      summary: typeof (content as any).summary === 'string' ? (content as any).summary : undefined,
      slots,
      assumptions,
    },
    tips: row.tips || [],
    redactions,
  };
  const assetFromCloud = (content as any).asset && typeof (content as any).asset === 'object'
    ? (content as any).asset
    : null;

  return {
    id: row.id || `cloud-${row.title}-${row.updated_at}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: 'ready_to_publish',
    draft,
    asset: assetFromCloud
      ? {
        ...buildSharedScheduleTemplateAsset(draft),
        ...assetFromCloud,
      }
      : buildSharedScheduleTemplateAsset(draft),
    consent: {
      privacyReviewed: true,
      communityUseAgreed: true,
      agreedAt: typeof (content as any).consent?.agreedAt === 'string' ? (content as any).consent.agreedAt : row.created_at,
      version: 'community_share_v1',
    },
  };
}

export async function fetchApprovedCommunityTemplates(
  query: CommunityCloudTemplateQuery = {},
): Promise<StoredSharedScheduleTemplateDraft[]> {
  let request = supabase
    .from('shared_schedule_templates')
    .select('*')
    .eq('visibility', 'public')
    .eq('moderation_status', 'approved')
    .order('usage_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(query.limit || 30);

  if (query.scenario && query.scenario !== 'all') {
    request = request.eq('scenario', query.scenario);
  }
  if (query.gradeBand) {
    request = request.eq('grade_band', query.gradeBand);
  }
  if (query.cityLevel) {
    request = request.eq('city_level', query.cityLevel);
  }
  if (query.keyword?.trim()) {
    const keyword = query.keyword.trim();
    request = request.or(`title.ilike.%${keyword}%,grade_band.ilike.%${keyword}%,city_level.ilike.%${keyword}%`);
  }

  const { data, error } = await request;
  if (error) throw error;

  const templates = (data || []).map(row => cloudRowToStoredCommunityTemplate(row as SharedScheduleTemplateCloudRow));
  await saveCommunityCloudTemplateCache(templates);
  return templates;
}

export async function getCommunityCloudTemplateCache(): Promise<CommunityCloudTemplateCache> {
  return storageGet<CommunityCloudTemplateCache>(
    getStorageAdapter(),
    STORAGE_KEYS.COMMUNITY_CLOUD_TEMPLATE_CACHE,
    { updatedAt: '', templates: [] },
  );
}

export async function saveCommunityCloudTemplateCache(
  templates: StoredSharedScheduleTemplateDraft[],
): Promise<CommunityCloudTemplateCache> {
  const cache: CommunityCloudTemplateCache = {
    updatedAt: new Date().toISOString(),
    templates: dedupeStoredTemplates(templates).slice(0, MAX_CLOUD_TEMPLATE_CACHE_SIZE),
  };
  await storageSet(getStorageAdapter(), STORAGE_KEYS.COMMUNITY_CLOUD_TEMPLATE_CACHE, cache);
  return cache;
}

export async function mergeCommunityCloudTemplateCache(
  templates: StoredSharedScheduleTemplateDraft[],
): Promise<CommunityCloudTemplateCache> {
  const existing = await getCommunityCloudTemplateCache();
  return saveCommunityCloudTemplateCache([...templates, ...existing.templates]);
}

export async function incrementSharedScheduleTemplateUsage(templateId: string): Promise<void> {
  const { data, error } = await supabase
    .from('shared_schedule_templates')
    .select('usage_count')
    .eq('id', templateId)
    .single();

  if (error) throw error;

  await supabase
    .from('shared_schedule_templates')
    .update({ usage_count: ((data as any)?.usage_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', templateId);
}

function getPublishBlockReasons(item: StoredSharedScheduleTemplateDraft): string[] {
  const reasons: string[] = [];
  if (item.status !== 'ready_to_publish') reasons.push('尚未确认可分享');
  if (!item.consent?.privacyReviewed) reasons.push('尚未确认隐私检查');
  if (!item.consent?.communityUseAgreed) reasons.push('尚未同意社区使用');
  if (item.asset?.publishBlockers?.length) reasons.push(...item.asset.publishBlockers);
  return reasons;
}

function normalizeUuidOrUndefined(value?: string): string | undefined {
  return value && isUuid(value) ? value : undefined;
}

function normalizeUuidOrNull(value?: string): string | null {
  return value && isUuid(value) ? value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function dedupeStoredTemplates(templates: StoredSharedScheduleTemplateDraft[]): StoredSharedScheduleTemplateDraft[] {
  const seen = new Set<string>();
  const result: StoredSharedScheduleTemplateDraft[] = [];
  for (const item of templates) {
    const key = item.id || `${item.draft.title}-${item.draft.scenario}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function sanitizeCloudSlot(slot: unknown): Omit<ScheduleSlot, 'childIds'> & { childIds?: never } {
  const value = slot && typeof slot === 'object' ? slot as Record<string, unknown> : {};
  return {
    id: typeof value.id === 'string' ? value.id : `cloud-slot-${Math.random().toString(36).slice(2, 8)}`,
    title: typeof value.title === 'string' ? value.title : '日程安排',
    startTime: typeof value.startTime === 'string' ? value.startTime : '09:00',
    endTime: typeof value.endTime === 'string' ? value.endTime : '09:30',
    category: normalizeSlotCategory(value.category),
    caregiverRequired: Boolean(value.caregiverRequired),
    description: typeof value.description === 'string' ? value.description : undefined,
    rewardStars: typeof value.rewardStars === 'number' ? value.rewardStars : undefined,
    icon: typeof value.icon === 'string' ? value.icon : undefined,
  };
}

function normalizeScenario(value: string): PlanningScenario {
  const allowed: PlanningScenario[] = ['school_day', 'weekend', 'holiday', 'winter_break', 'summer_break', 'travel', 'medical', 'custom'];
  return allowed.includes(value as PlanningScenario) ? value as PlanningScenario : 'custom';
}

function normalizeSlotCategory(value: unknown): ScheduleSlot['category'] {
  const allowed: ScheduleSlot['category'][] = ['study', 'life', 'exercise', 'interest', 'family', 'rest', 'medical', 'travel', 'other'];
  return allowed.includes(value as ScheduleSlot['category']) ? value as ScheduleSlot['category'] : 'other';
}
