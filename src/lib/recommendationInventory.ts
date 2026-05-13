import { getStorageAdapter, STORAGE_KEYS, storageGet, storageSet } from './StorageAdapter';
import type { HolidayBudgetLevel, HolidayCaregiverLoad, HolidayEffortLevel, HolidayPlayMode, HolidayPlayScale } from '../domain/familyPlanning';
import type { RecommendationCategory } from './recommendationConsent';
import type { RecommendationFunnelItem } from './recommendationEvents';
import type { RecommendationCandidate } from './recommendationGateway';
import { supabase } from './supabase';

export type CommercialResourceKind =
  | 'course'
  | 'camp'
  | 'learning_tool'
  | 'parent_child_trip'
  | 'medical_service'
  | 'care_service';

export interface CommercialResourceItem {
  id: string;
  category: RecommendationCategory;
  kind: CommercialResourceKind;
  title: string;
  providerName: string;
  scenarioTags: string[];
  familyStageTags: string[];
  cityLevelTags: string[];
  categoryTags: string[];
  holidayPlayScales?: HolidayPlayScale[];
  holidayPlayModes?: HolidayPlayMode[];
  caregiverLoadTags?: HolidayCaregiverLoad[];
  budgetLevelTags?: HolidayBudgetLevel[];
  effortLevelTags?: HolidayEffortLevel[];
  priorityBoost: number;
  actionLabel: string;
  destination: string;
  sellingPoint: string;
  active?: boolean;
  updatedAt?: string;
}

export interface CommercialResourceCloudRow {
  id: string;
  category: RecommendationCategory;
  kind: CommercialResourceKind;
  title: string;
  provider_name: string;
  scenario_tags: string[];
  family_stage_tags: string[];
  city_level_tags: string[];
  category_tags: string[];
  holiday_play_scales?: HolidayPlayScale[];
  holiday_play_modes?: HolidayPlayMode[];
  caregiver_load_tags?: HolidayCaregiverLoad[];
  budget_level_tags?: HolidayBudgetLevel[];
  effort_level_tags?: HolidayEffortLevel[];
  priority_boost: number;
  action_label: string;
  destination: string;
  selling_point: string;
  active: boolean;
  updated_at: string;
}

export interface CommercialResourceCache {
  resources: CommercialResourceItem[];
  updatedAt: string;
}

export interface CommercialResourceValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CommercialResourceManagementSummary {
  total: number;
  active: number;
  inactive: number;
  byCategory: Record<RecommendationCategory, number>;
  needsReviewIds: string[];
}

export interface CommercialResourcePerformanceRow {
  resource: CommercialResourceItem;
  impressions: number;
  clicks: number;
  dismisses: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
  health: 'strong' | 'watch' | 'weak' | 'new';
  recommendedAction: 'boost' | 'keep' | 'lower' | 'rewrite' | 'observe';
}

export interface ResourceMatchResult {
  resource: CommercialResourceItem;
  score: number;
  reasons: string[];
  candidate: RecommendationCandidate;
}

export interface CommercialResourceOpsInsight {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: 'add_resource' | 'add_tags' | 'boost_resource' | 'lower_resource' | 'observe';
  resourceId?: string;
  category?: RecommendationCategory;
  missingTags?: string[];
}

export interface HolidayPlayPreferenceInput {
  text?: string;
  scale?: HolidayPlayScale;
  mode?: HolidayPlayMode;
  caregiverLoad?: HolidayCaregiverLoad;
  budgetLevel?: HolidayBudgetLevel;
  effortLevel?: HolidayEffortLevel;
}

export function inferHolidayPlayPreference(
  input: HolidayPlayPreferenceInput,
): Required<Omit<HolidayPlayPreferenceInput, 'text'>> {
  const text = input.text || '';
  return {
    scale: input.scale || inferHolidayPlayScale(text),
    mode: input.mode || inferHolidayPlayMode(text),
    caregiverLoad: input.caregiverLoad || inferCaregiverLoad(text),
    budgetLevel: input.budgetLevel || inferBudgetLevel(text),
    effortLevel: input.effortLevel || inferEffortLevel(text),
  };
}

const SEED_COMMERCIAL_RESOURCES: CommercialResourceItem[] = [
  {
    id: 'seed-english-reading',
    category: 'education',
    kind: 'course',
    title: '小学英语阅读提升课',
    providerName: '精选教育资源',
    scenarioTags: ['school_day', 'weekend', 'summer_break', 'winter_break'],
    familyStageTags: ['小学低年级', '小学中年级', '小学高年级'],
    cityLevelTags: ['一线城市', '新一线城市', '二线城市', '其他城市'],
    categoryTags: ['study', 'reading', 'english'],
    priorityBoost: 18,
    actionLabel: '查看课程方向',
    destination: '/plans/smart-recommend',
    sellingPoint: '适合把每日阅读、英语启蒙和假期学习计划连起来。',
  },
  {
    id: 'seed-summer-camp',
    category: 'travel',
    kind: 'camp',
    title: '寒暑假研学营地',
    providerName: '精选营地资源',
    scenarioTags: ['summer_break', 'winter_break', 'holiday'],
    familyStageTags: ['小学中年级', '小学高年级', '初中阶段'],
    cityLevelTags: ['一线城市', '新一线城市', '二线城市'],
    categoryTags: ['travel', 'interest', 'study'],
    holidayPlayScales: ['medium_play', 'big_play'],
    holidayPlayModes: ['science_fun', 'interest_development'],
    caregiverLoadTags: ['medium', 'high'],
    budgetLevelTags: ['medium', 'high'],
    effortLevelTags: ['balanced', 'easy'],
    priorityBoost: 22,
    actionLabel: '查看假期安排',
    destination: '/school-calendar',
    sellingPoint: '适合在放假前，把营地、出行和课外班顺延一起规划。',
  },
  {
    id: 'seed-piano-practice',
    category: 'education',
    kind: 'learning_tool',
    title: '乐器练习打卡工具',
    providerName: '精选学习工具',
    scenarioTags: ['school_day', 'weekend', 'holiday'],
    familyStageTags: ['学龄前', '小学低年级', '小学中年级', '小学高年级'],
    cityLevelTags: ['一线城市', '新一线城市', '二线城市', '其他城市'],
    categoryTags: ['interest', 'music', 'habit'],
    priorityBoost: 14,
    actionLabel: '查看练习方案',
    destination: '/plans',
    sellingPoint: '适合把钢琴、小提琴等长期练习拆成每日任务和阶段复盘。',
  },
  {
    id: 'seed-parent-child-trip',
    category: 'travel',
    kind: 'parent_child_trip',
    title: '周末亲子游路线',
    providerName: '精选亲子旅行',
    scenarioTags: ['weekend', 'holiday', 'travel'],
    familyStageTags: ['学龄前', '小学低年级', '小学中年级', '小学高年级'],
    cityLevelTags: ['一线城市', '新一线城市', '二线城市', '其他城市'],
    categoryTags: ['reward', 'travel', 'family'],
    holidayPlayScales: ['small_play', 'medium_play'],
    holidayPlayModes: ['pure_fun', 'science_fun'],
    caregiverLoadTags: ['medium', 'high'],
    budgetLevelTags: ['low', 'medium'],
    effortLevelTags: ['balanced', 'hands_on'],
    priorityBoost: 15,
    actionLabel: '查看亲子安排',
    destination: '/school-calendar',
    sellingPoint: '适合孩子用积分兑换周末出游后，提醒父母兑现承诺。',
  },
  {
    id: 'seed-science-museum-day',
    category: 'travel',
    kind: 'parent_child_trip',
    title: '科学馆半日探索',
    providerName: '精选科学玩资源',
    scenarioTags: ['weekend', 'holiday', 'summer_break', 'winter_break'],
    familyStageTags: ['学龄前', '小学低年级', '小学中年级'],
    cityLevelTags: ['一线城市', '新一线城市', '二线城市'],
    categoryTags: ['science', 'family', 'interest'],
    holidayPlayScales: ['small_play'],
    holidayPlayModes: ['science_fun', 'interest_development'],
    caregiverLoadTags: ['medium'],
    budgetLevelTags: ['low', 'medium'],
    effortLevelTags: ['balanced'],
    priorityBoost: 19,
    actionLabel: '查看科学玩安排',
    destination: '/school-calendar',
    sellingPoint: '适合预算不高、半天陪伴，把纯玩变成有探索感的科学体验。',
  },
  {
    id: 'seed-family-resort-week',
    category: 'travel',
    kind: 'parent_child_trip',
    title: '省心型亲子度假',
    providerName: '精选亲子度假',
    scenarioTags: ['summer_break', 'winter_break', 'holiday', 'travel'],
    familyStageTags: ['学龄前', '小学低年级', '小学中年级', '小学高年级'],
    cityLevelTags: ['一线城市', '新一线城市', '二线城市'],
    categoryTags: ['travel', 'family', 'reward'],
    holidayPlayScales: ['big_play'],
    holidayPlayModes: ['pure_fun'],
    caregiverLoadTags: ['low', 'medium'],
    budgetLevelTags: ['high'],
    effortLevelTags: ['easy'],
    priorityBoost: 20,
    actionLabel: '查看度假安排',
    destination: '/school-calendar',
    sellingPoint: '适合家长陪伴时间有限、预算较高、希望省心省力的大玩安排。',
  },
  {
    id: 'seed-child-checkup',
    category: 'healthcare',
    kind: 'medical_service',
    title: '儿童体检与就医清单',
    providerName: '精选健康服务',
    scenarioTags: ['medical', 'school_day', 'holiday'],
    familyStageTags: ['学龄前', '小学低年级', '小学中年级', '小学高年级', '初中阶段'],
    cityLevelTags: ['一线城市', '新一线城市', '二线城市', '其他城市'],
    categoryTags: ['medical', 'health', 'care'],
    priorityBoost: 10,
    actionLabel: '查看就医清单',
    destination: '/school-calendar',
    sellingPoint: '适合把挂号、请假、复诊和护理事项整理成家庭日程。',
  },
];

export function getSeedCommercialResources(): CommercialResourceItem[] {
  return SEED_COMMERCIAL_RESOURCES;
}

export function commercialResourceToCloudRow(
  resource: CommercialResourceItem,
): CommercialResourceCloudRow {
  return {
    id: resource.id,
    category: resource.category,
    kind: resource.kind,
    title: resource.title,
    provider_name: resource.providerName,
    scenario_tags: resource.scenarioTags,
    family_stage_tags: resource.familyStageTags,
    city_level_tags: resource.cityLevelTags,
    category_tags: resource.categoryTags,
    holiday_play_scales: resource.holidayPlayScales || [],
    holiday_play_modes: resource.holidayPlayModes || [],
    caregiver_load_tags: resource.caregiverLoadTags || [],
    budget_level_tags: resource.budgetLevelTags || [],
    effort_level_tags: resource.effortLevelTags || [],
    priority_boost: resource.priorityBoost,
    action_label: resource.actionLabel,
    destination: resource.destination,
    selling_point: resource.sellingPoint,
    active: resource.active ?? true,
    updated_at: resource.updatedAt || new Date().toISOString(),
  };
}

export function commercialResourceFromCloudRow(
  row: CommercialResourceCloudRow,
): CommercialResourceItem {
  return {
    id: row.id,
    category: row.category,
    kind: row.kind,
    title: row.title,
    providerName: row.provider_name,
    scenarioTags: row.scenario_tags || [],
    familyStageTags: row.family_stage_tags || [],
    cityLevelTags: row.city_level_tags || [],
    categoryTags: row.category_tags || [],
    holidayPlayScales: row.holiday_play_scales || [],
    holidayPlayModes: row.holiday_play_modes || [],
    caregiverLoadTags: row.caregiver_load_tags || [],
    budgetLevelTags: row.budget_level_tags || [],
    effortLevelTags: row.effort_level_tags || [],
    priorityBoost: row.priority_boost || 0,
    actionLabel: row.action_label,
    destination: row.destination,
    sellingPoint: row.selling_point,
    active: row.active,
    updatedAt: row.updated_at,
  };
}

export async function getCommercialResourceCache(): Promise<CommercialResourceCache> {
  return storageGet<CommercialResourceCache>(
    getStorageAdapter(),
    STORAGE_KEYS.COMMERCIAL_RESOURCE_CACHE,
    { resources: [], updatedAt: '' },
  );
}

export async function setCommercialResourceCache(
  resources: CommercialResourceItem[],
): Promise<CommercialResourceCache> {
  const cache = {
    resources: resources.map(normalizeCommercialResource),
    updatedAt: new Date().toISOString(),
  };
  await storageSet(getStorageAdapter(), STORAGE_KEYS.COMMERCIAL_RESOURCE_CACHE, cache);
  return cache;
}

export async function saveCommercialResourceDraft(
  resource: CommercialResourceItem,
): Promise<CommercialResourceCache> {
  const validation = validateCommercialResource(resource);
  if (!validation.valid) {
    throw new Error(validation.errors.join('；'));
  }
  const cache = await getCommercialResourceCache();
  const normalized = normalizeCommercialResource(resource);
  const resources = [
    normalized,
    ...editableResources(cache.resources).filter(item => item.id !== normalized.id),
  ];
  return setCommercialResourceCache(resources);
}

export async function toggleCommercialResourceActive(
  resourceId: string,
  active: boolean,
): Promise<CommercialResourceCache> {
  const cache = await getCommercialResourceCache();
  return setCommercialResourceCache(editableResources(cache.resources).map(resource =>
    resource.id === resourceId
      ? { ...resource, active, updatedAt: new Date().toISOString() }
      : resource
  ));
}

export async function adjustCommercialResourcePriority(
  resourceId: string,
  delta: number,
): Promise<CommercialResourceCache> {
  const cache = await getCommercialResourceCache();
  return setCommercialResourceCache(editableResources(cache.resources).map(resource =>
    resource.id === resourceId
      ? {
        ...resource,
        priorityBoost: clampPriority(resource.priorityBoost + delta),
        updatedAt: new Date().toISOString(),
      }
      : resource
  ));
}

export function validateCommercialResource(
  resource: CommercialResourceItem,
): CommercialResourceValidationResult {
  const errors: string[] = [];
  if (!resource.id.trim()) errors.push('缺少资源 ID');
  if (!resource.title.trim()) errors.push('缺少资源标题');
  if (!resource.providerName.trim()) errors.push('缺少供应方名称');
  if (!resource.sellingPoint.trim()) errors.push('缺少推荐卖点');
  if (!resource.actionLabel.trim()) errors.push('缺少行动按钮文案');
  if (!resource.destination.trim()) errors.push('缺少跳转目标');
  if (resource.priorityBoost < 0 || resource.priorityBoost > 100) errors.push('权重需在 0-100 之间');
  if (resource.scenarioTags.length === 0 && resource.categoryTags.length === 0) {
    errors.push('至少需要一个场景标签或类别标签');
  }
  if (resource.category === 'travel') {
    const hasHolidayTags = Boolean(resource.holidayPlayScales?.length || resource.holidayPlayModes?.length);
    if (!hasHolidayTags) errors.push('旅行/假期资源需要补充玩法规模或玩法类型');
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function summarizeCommercialResourceManagement(
  resources: CommercialResourceItem[],
): CommercialResourceManagementSummary {
  return resources.reduce<CommercialResourceManagementSummary>((summary, resource) => {
    const validation = validateCommercialResource(resource);
    summary.total += 1;
    if (resource.active === false) summary.inactive += 1;
    else summary.active += 1;
    summary.byCategory[resource.category] += 1;
    if (!validation.valid) summary.needsReviewIds.push(resource.id);
    return summary;
  }, {
    total: 0,
    active: 0,
    inactive: 0,
    byCategory: { education: 0, travel: 0, healthcare: 0 },
    needsReviewIds: [],
  });
}

export function buildCommercialResourcePerformanceRows(
  resources: CommercialResourceItem[],
  funnelItems: RecommendationFunnelItem[] = [],
): CommercialResourcePerformanceRow[] {
  const funnelIndex = new Map(funnelItems.map(item => [item.itemId, item]));
  return resources.map(resource => {
    const funnel = funnelIndex.get(resource.id);
    const impressions = funnel?.impressions || 0;
    const clicks = funnel?.clicks || 0;
    const dismisses = funnel?.dismisses || 0;
    const conversions = funnel?.conversions || 0;
    const clickThroughRate = impressions > 0 ? clicks / impressions : 0;
    const conversionRate = clicks > 0 ? conversions / clicks : 0;
    const health = inferPerformanceHealth({ impressions, clicks, dismisses, conversions, clickThroughRate, conversionRate });
    return {
      resource,
      impressions,
      clicks,
      dismisses,
      conversions,
      clickThroughRate,
      conversionRate,
      health,
      recommendedAction: inferPerformanceAction(health, { clicks, dismisses, conversions }),
    };
  }).sort((a, b) =>
    performanceRank(b.health) - performanceRank(a.health)
    || b.conversions - a.conversions
    || b.clicks - a.clicks
    || b.resource.priorityBoost - a.resource.priorityBoost
  );
}

export function buildCommercialResourceOpsInsights(
  candidates: RecommendationCandidate[],
  resources: CommercialResourceItem[],
  funnelItems: RecommendationFunnelItem[] = [],
): CommercialResourceOpsInsight[] {
  const insights: CommercialResourceOpsInsight[] = [];
  const activeResources = resources.filter(resource => resource.active !== false);
  const matches = matchCommercialResources(candidates, activeResources, Math.max(6, activeResources.length), funnelItems);
  const matchedResourceIds = new Set(matches.map(match => match.resource.id));

  for (const category of ['education', 'travel', 'healthcare'] as RecommendationCategory[]) {
    const categoryCandidates = candidates.filter(candidate => candidate.category === category);
    if (categoryCandidates.length === 0) continue;
    const categoryResources = activeResources.filter(resource => resource.category === category);
    if (categoryResources.length === 0) {
      insights.push({
        id: `missing-category-${category}`,
        severity: 'high',
        title: `${categoryLabel(category)}方向缺少上线资源`,
        description: '当前家庭画像已经产生这个推荐方向，但后台没有可承接的上线资源。',
        action: 'add_resource',
        category,
      });
      continue;
    }

    const bestCandidate = categoryCandidates[0];
    const missingTags = inferMissingResourceTags(bestCandidate, categoryResources);
    if (missingTags.length > 0) {
      insights.push({
        id: `missing-tags-${category}`,
        severity: 'medium',
        title: `${categoryLabel(category)}资源标签覆盖不足`,
        description: `画像里出现了 ${missingTags.slice(0, 3).join('、')}，但现有资源标签覆盖不完整。`,
        action: 'add_tags',
        category,
        missingTags,
      });
    }
  }

  for (const row of buildCommercialResourcePerformanceRows(resources, funnelItems).slice(0, 6)) {
    if (row.recommendedAction === 'boost') {
      insights.push({
        id: `boost-${row.resource.id}`,
        severity: 'low',
        title: `${row.resource.title} 表现较好`,
        description: '近期点击或转化表现好，可以适度提高权重或增加同类资源。',
        action: 'boost_resource',
        resourceId: row.resource.id,
        category: row.resource.category,
      });
    }
    if (row.recommendedAction === 'lower' || row.recommendedAction === 'rewrite') {
      insights.push({
        id: `lower-${row.resource.id}`,
        severity: 'medium',
        title: `${row.resource.title} 需要优化`,
        description: row.recommendedAction === 'lower'
          ? '近期关闭偏多且缺少点击，建议先降权减少干扰。'
          : '有点击但关闭也偏多，建议优化卖点文案或补齐匹配标签。',
        action: row.recommendedAction === 'lower' ? 'lower_resource' : 'add_tags',
        resourceId: row.resource.id,
        category: row.resource.category,
      });
    }
  }

  for (const resource of activeResources) {
    if (!matchedResourceIds.has(resource.id) && validateCommercialResource(resource).valid) {
      insights.push({
        id: `unmatched-${resource.id}`,
        severity: 'low',
        title: `${resource.title} 暂未命中当前画像`,
        description: '资源配置完整但近期画像没有明显匹配，可以继续观察或补充更宽的场景标签。',
        action: 'observe',
        resourceId: resource.id,
        category: resource.category,
      });
    }
  }

  return dedupeOpsInsights(insights)
    .sort((a, b) => insightRank(b.severity) - insightRank(a.severity))
    .slice(0, 8);
}

export function buildCommercialResourceUpsertRows(
  resources: CommercialResourceItem[],
): CommercialResourceCloudRow[] {
  return resources
    .map(normalizeCommercialResource)
    .map(commercialResourceToCloudRow);
}

export async function syncCommercialResourcesToCloud(
  resources: CommercialResourceItem[],
): Promise<{ rowCount: number }> {
  const rows = buildCommercialResourceUpsertRows(resources);
  const result = await supabase
    .from('commercial_resources')
    .upsert(rows, { onConflict: 'id' });

  if (result.error) throw result.error;
  return { rowCount: rows.length };
}

export async function fetchActiveCommercialResources(
  limit = 80,
): Promise<CommercialResourceItem[]> {
  const { data, error } = await supabase
    .from('commercial_resources')
    .select('*')
    .eq('active', true)
    .order('priority_boost', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return ((data || []) as CommercialResourceCloudRow[]).map(commercialResourceFromCloudRow);
}

export async function loadCommercialResources(
  options: { online?: boolean; limit?: number } = {},
): Promise<CommercialResourceItem[]> {
  const cache = await getCommercialResourceCache();
  if (options.online) {
    try {
      const cloudResources = await fetchActiveCommercialResources(options.limit);
      if (cloudResources.length > 0) {
        await setCommercialResourceCache(cloudResources);
        return cloudResources;
      }
    } catch {
      return cache.resources.length > 0 ? cache.resources : SEED_COMMERCIAL_RESOURCES;
    }
  }
  return cache.resources.length > 0 ? cache.resources : SEED_COMMERCIAL_RESOURCES;
}

function normalizeCommercialResource(resource: CommercialResourceItem): CommercialResourceItem {
  return {
    ...resource,
    scenarioTags: dedupeTags(resource.scenarioTags),
    familyStageTags: dedupeTags(resource.familyStageTags),
    cityLevelTags: dedupeTags(resource.cityLevelTags),
    categoryTags: dedupeTags(resource.categoryTags),
    holidayPlayScales: dedupeTags(resource.holidayPlayScales || []),
    holidayPlayModes: dedupeTags(resource.holidayPlayModes || []),
    caregiverLoadTags: dedupeTags(resource.caregiverLoadTags || []),
    budgetLevelTags: dedupeTags(resource.budgetLevelTags || []),
    effortLevelTags: dedupeTags(resource.effortLevelTags || []),
    priorityBoost: clampPriority(resource.priorityBoost),
    active: resource.active ?? true,
    updatedAt: resource.updatedAt || new Date().toISOString(),
  };
}

function editableResources(resources: CommercialResourceItem[]): CommercialResourceItem[] {
  return resources.length > 0 ? resources : SEED_COMMERCIAL_RESOURCES;
}

function dedupeTags<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))) as T[];
}

function clampPriority(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function inferPerformanceHealth(input: {
  impressions: number;
  clicks: number;
  dismisses: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
}): CommercialResourcePerformanceRow['health'] {
  if (input.impressions === 0 && input.clicks === 0 && input.conversions === 0) return 'new';
  if (input.conversions > 0 || input.conversionRate >= 0.2 || input.clickThroughRate >= 0.25) return 'strong';
  if (input.dismisses > input.clicks && input.dismisses >= 2) return 'weak';
  return 'watch';
}

function inferPerformanceAction(
  health: CommercialResourcePerformanceRow['health'],
  input: { clicks: number; dismisses: number; conversions: number },
): CommercialResourcePerformanceRow['recommendedAction'] {
  if (health === 'strong') return 'boost';
  if (health === 'weak') return input.clicks > 0 ? 'rewrite' : 'lower';
  if (health === 'new') return 'observe';
  return input.dismisses > input.conversions + input.clicks ? 'rewrite' : 'keep';
}

function performanceRank(health: CommercialResourcePerformanceRow['health']): number {
  if (health === 'strong') return 4;
  if (health === 'watch') return 3;
  if (health === 'new') return 2;
  return 1;
}

export function matchCommercialResources(
  candidates: RecommendationCandidate[],
  resources: CommercialResourceItem[] = SEED_COMMERCIAL_RESOURCES,
  limit = 6,
  funnelItems: RecommendationFunnelItem[] = [],
): ResourceMatchResult[] {
  const feedbackIndex = new Map(funnelItems.map(item => [item.itemId, item]));
  return resources
    .filter(resource => resource.active !== false)
    .map(resource => matchResource(resource, candidates, feedbackIndex.get(resource.id)))
    .filter((result): result is ResourceMatchResult => Boolean(result))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function matchResource(
  resource: CommercialResourceItem,
  candidates: RecommendationCandidate[],
  feedback?: RecommendationFunnelItem,
): ResourceMatchResult | null {
  const categoryCandidates = candidates.filter(candidate => candidate.category === resource.category);
  if (categoryCandidates.length === 0) return null;

  const best = categoryCandidates
    .map(candidate => scoreResourceCandidate(resource, candidate, feedback))
    .sort((a, b) => b.score - a.score)[0];

  if (!best || best.score <= 0) return null;
  return {
    resource,
    score: best.score,
    reasons: best.reasons,
    candidate: best.candidate,
  };
}

function scoreResourceCandidate(
  resource: CommercialResourceItem,
  candidate: RecommendationCandidate,
  feedback?: RecommendationFunnelItem,
): { score: number; reasons: string[]; candidate: RecommendationCandidate } {
  let score = resource.priorityBoost + priorityScore(candidate.priority);
  const reasons: string[] = [`匹配${categoryLabel(resource.category)}方向`];
  const scenario = stringValue(candidate.safeContext.scenario);
  const familyStage = stringValue(candidate.safeContext.familyStage);
  const cityLevel = stringValue(candidate.safeContext.cityLevel);
  const categoryMix = stringArrayValue(candidate.safeContext.categoryMix);
  const holidayPlayScale = stringValue(candidate.safeContext.holidayPlayScale) as HolidayPlayScale | undefined;
  const holidayPlayMode = stringValue(candidate.safeContext.holidayPlayMode) as HolidayPlayMode | undefined;
  const caregiverLoad = stringValue(candidate.safeContext.caregiverLoad) as HolidayCaregiverLoad | undefined;
  const budgetLevel = stringValue(candidate.safeContext.budgetLevel) as HolidayBudgetLevel | undefined;
  const effortLevel = stringValue(candidate.safeContext.effortLevel) as HolidayEffortLevel | undefined;

  if (scenario && resource.scenarioTags.includes(scenario)) {
    score += 28;
    reasons.push(`适合${scenarioLabel(scenario)}`);
  }
  if (familyStage && resource.familyStageTags.includes(familyStage)) {
    score += 18;
    reasons.push(`适合${familyStage}`);
  }
  if (cityLevel && resource.cityLevelTags.includes(cityLevel)) {
    score += 10;
    reasons.push(`覆盖${cityLevel}`);
  }
  const matchedCategoryTags = categoryMix.filter(tag => resource.categoryTags.includes(tag));
  if (matchedCategoryTags.length > 0) {
    score += matchedCategoryTags.length * 12;
    reasons.push(`贴合${matchedCategoryTags.slice(0, 2).join('、')}`);
  }
  if (candidate.source === 'behavior_signal') {
    score += 8;
    reasons.push('来自近期家庭行为');
  }
  if (holidayPlayScale && resource.holidayPlayScales?.includes(holidayPlayScale)) {
    score += 26;
    reasons.push(`匹配${holidayPlayScaleLabel(holidayPlayScale)}`);
  }
  if (holidayPlayMode && resource.holidayPlayModes?.includes(holidayPlayMode)) {
    score += 24;
    reasons.push(`偏向${holidayPlayModeLabel(holidayPlayMode)}`);
  }
  if (caregiverLoad && resource.caregiverLoadTags?.includes(caregiverLoad)) {
    score += 12;
    reasons.push(`陪伴强度${loadLabel(caregiverLoad)}`);
  }
  if (budgetLevel && resource.budgetLevelTags?.includes(budgetLevel)) {
    score += 10;
    reasons.push(`预算${levelLabel(budgetLevel)}`);
  }
  if (effortLevel && resource.effortLevelTags?.includes(effortLevel)) {
    score += 10;
    reasons.push(effortLevel === 'easy' ? '更省心' : effortLevel === 'hands_on' ? '适合深度陪伴' : '省心与陪伴平衡');
  }
  if (feedback) {
    const feedbackScore = scoreFeedback(feedback);
    score += feedbackScore;
    if (feedback.conversions > 0) {
      reasons.push('近期转化表现好');
    } else if (feedback.clicks > 0) {
      reasons.push('近期点击表现好');
    }
    if (feedback.dismisses > feedback.clicks && feedback.dismisses > 0) {
      reasons.push('近期关闭偏多');
    }
  }

  return { score, reasons: Array.from(new Set(reasons)), candidate };
}

function inferMissingResourceTags(
  candidate: RecommendationCandidate,
  resources: CommercialResourceItem[],
): string[] {
  const wanted = new Set<string>();
  const scenario = stringValue(candidate.safeContext.scenario);
  const familyStage = stringValue(candidate.safeContext.familyStage);
  const cityLevel = stringValue(candidate.safeContext.cityLevel);
  const categoryMix = stringArrayValue(candidate.safeContext.categoryMix);
  const holidayPlayScale = stringValue(candidate.safeContext.holidayPlayScale);
  const holidayPlayMode = stringValue(candidate.safeContext.holidayPlayMode);
  const caregiverLoad = stringValue(candidate.safeContext.caregiverLoad);
  const budgetLevel = stringValue(candidate.safeContext.budgetLevel);
  const effortLevel = stringValue(candidate.safeContext.effortLevel);

  if (scenario && !resources.some(resource => resource.scenarioTags.includes(scenario))) wanted.add(`场景:${scenario}`);
  if (familyStage && !resources.some(resource => resource.familyStageTags.includes(familyStage))) wanted.add(`阶段:${familyStage}`);
  if (cityLevel && !resources.some(resource => resource.cityLevelTags.includes(cityLevel))) wanted.add(`城市:${cityLevel}`);
  for (const tag of categoryMix) {
    if (!resources.some(resource => resource.categoryTags.includes(tag))) wanted.add(`类别:${tag}`);
  }
  if (holidayPlayScale && !resources.some(resource => resource.holidayPlayScales?.includes(holidayPlayScale as HolidayPlayScale))) wanted.add(`玩法规模:${holidayPlayScale}`);
  if (holidayPlayMode && !resources.some(resource => resource.holidayPlayModes?.includes(holidayPlayMode as HolidayPlayMode))) wanted.add(`玩法类型:${holidayPlayMode}`);
  if (caregiverLoad && !resources.some(resource => resource.caregiverLoadTags?.includes(caregiverLoad as HolidayCaregiverLoad))) wanted.add(`陪伴:${caregiverLoad}`);
  if (budgetLevel && !resources.some(resource => resource.budgetLevelTags?.includes(budgetLevel as HolidayBudgetLevel))) wanted.add(`预算:${budgetLevel}`);
  if (effortLevel && !resources.some(resource => resource.effortLevelTags?.includes(effortLevel as HolidayEffortLevel))) wanted.add(`省心:${effortLevel}`);

  return Array.from(wanted);
}

function dedupeOpsInsights(insights: CommercialResourceOpsInsight[]): CommercialResourceOpsInsight[] {
  const seen = new Set<string>();
  return insights.filter(insight => {
    if (seen.has(insight.id)) return false;
    seen.add(insight.id);
    return true;
  });
}

function insightRank(severity: CommercialResourceOpsInsight['severity']): number {
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}

export function scoreFeedback(feedback: RecommendationFunnelItem): number {
  const positive = feedback.conversions * 24 + feedback.clicks * 10 + feedback.impressions * 1;
  const negative = feedback.dismisses * 14;
  const rateBonus = Math.round(feedback.clickThroughRate * 12 + feedback.conversionRate * 18);
  return positive + rateBonus - negative;
}

function inferHolidayPlayScale(text: string): HolidayPlayScale {
  if (/大玩|长途|出国|跨省|一周|十天|度假|邮轮|海外|big/i.test(text)) return 'big_play';
  if (/中玩|周边|短途|两三天|三天|小长假|营地|研学|medium/i.test(text)) return 'medium_play';
  return 'small_play';
}

function inferHolidayPlayMode(text: string): HolidayPlayMode {
  if (/科学|博物馆|科技馆|研学|自然|探索|实验|知识|science/i.test(text)) return 'science_fun';
  if (/兴趣|乐器|绘画|运动|编程|英语|培养|特长|interest/i.test(text)) return 'interest_development';
  return 'pure_fun';
}

function inferCaregiverLoad(text: string): HolidayCaregiverLoad {
  if (/全程陪|深度陪|亲自|陪伴多|high/i.test(text)) return 'high';
  if (/少陪|托管|营地|省心|家长忙|low/i.test(text)) return 'low';
  return 'medium';
}

function inferBudgetLevel(text: string): HolidayBudgetLevel {
  if (/高预算|预算高|贵一点|度假|出国|海外|high/i.test(text)) return 'high';
  if (/低预算|便宜|少花钱|免费|公园|低成本|low/i.test(text)) return 'low';
  return 'medium';
}

function inferEffortLevel(text: string): HolidayEffortLevel {
  if (/省心|省力|不用操心|托管|一站式|easy/i.test(text)) return 'easy';
  if (/自己安排|亲自|深度陪|一起做|hands/i.test(text)) return 'hands_on';
  return 'balanced';
}

function priorityScore(priority: RecommendationCandidate['priority']): number {
  if (priority === 'high') return 22;
  if (priority === 'medium') return 12;
  return 5;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function categoryLabel(category: RecommendationCategory): string {
  if (category === 'education') return '教育';
  if (category === 'travel') return '旅行';
  return '健康';
}

function scenarioLabel(scenario: string): string {
  const labels: Record<string, string> = {
    school_day: '上学日',
    weekend: '周末',
    holiday: '假期',
    winter_break: '寒假',
    summer_break: '暑假',
    travel: '旅行',
    medical: '就医',
    custom: '自定义',
  };
  return labels[scenario] || scenario;
}

function holidayPlayScaleLabel(scale: HolidayPlayScale): string {
  if (scale === 'small_play') return '小玩';
  if (scale === 'medium_play') return '中玩';
  return '大玩';
}

function holidayPlayModeLabel(mode: HolidayPlayMode): string {
  if (mode === 'pure_fun') return '纯玩';
  if (mode === 'science_fun') return '科学地玩';
  return '兴趣培养型玩法';
}

function loadLabel(load: HolidayCaregiverLoad): string {
  if (load === 'low') return '低';
  if (load === 'medium') return '中';
  return '高';
}

function levelLabel(level: HolidayBudgetLevel): string {
  if (level === 'low') return '低';
  if (level === 'medium') return '中';
  return '高';
}
