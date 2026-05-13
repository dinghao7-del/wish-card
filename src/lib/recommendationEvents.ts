import { getStorageAdapter, STORAGE_KEYS, storageGet, storageSet } from './StorageAdapter';
import { getRecommendationConsent, hasRecommendationConsent, type RecommendationCategory } from './recommendationConsent';

export type RecommendationEventType = 'impression' | 'click' | 'dismiss' | 'conversion';

export interface RecommendationEvent {
  id: string;
  category: RecommendationCategory;
  eventType: RecommendationEventType;
  itemId?: string;
  familyId?: string;
  memberId?: string;
  consentVersion: 'recommendation_consent_v1';
  context: Record<string, unknown>;
  createdAt: string;
}

export interface RecommendationEventInput {
  category: RecommendationCategory;
  eventType: RecommendationEventType;
  itemId?: string;
  familyId?: string;
  memberId?: string;
  context?: Record<string, unknown>;
}

const MAX_LOCAL_RECOMMENDATION_EVENTS = 100;
const SAFE_CONTEXT_KEYS = new Set([
  'source',
  'scenario',
  'ageRange',
  'gradeBand',
  'cityLevel',
  'familyStage',
  'categoryMix',
  'slotCount',
  'timeCoverage',
  'caregiverRequiredSlots',
  'templateQualityScore',
  'favoriteCount',
  'recentUseCount',
  'preferredScenario',
  'preferredSource',
  'resourceKind',
  'matchScore',
  'holidayPlayScale',
  'holidayPlayMode',
  'caregiverLoad',
  'budgetLevel',
  'effortLevel',
  'profileStrength',
  'categoryScore',
  'publicSignalCount',
  'recommendationReason',
]);
const UNSAFE_CONTEXT_KEY_PATTERN = /name|phone|mobile|address|school|class|contact|location|medicalRecord|diagnosis|姓名|电话|手机|地址|学校|班级|住址|病历|诊断/i;
const PHONE_PATTERN = /\b1[3-9]\d{9}\b/g;
const ADDRESS_PATTERN = /[\u4e00-\u9fa5A-Za-z0-9]{2,}(小区|校区|学校|幼儿园|医院|门诊|路|街|弄|号楼|单元|室)/g;

function createEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `rec-event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getRecommendationEvents(): Promise<RecommendationEvent[]> {
  return storageGet<RecommendationEvent[]>(
    getStorageAdapter(),
    STORAGE_KEYS.RECOMMENDATION_EVENTS,
    [],
  );
}

export async function removeRecommendationEventsByCategory(
  category: RecommendationCategory,
): Promise<number> {
  const events = await getRecommendationEvents();
  const nextEvents = events.filter(event => event.category !== category);
  await storageSet(getStorageAdapter(), STORAGE_KEYS.RECOMMENDATION_EVENTS, nextEvents);
  return events.length - nextEvents.length;
}

export async function removeAllRecommendationEvents(): Promise<number> {
  const events = await getRecommendationEvents();
  await storageSet(getStorageAdapter(), STORAGE_KEYS.RECOMMENDATION_EVENTS, []);
  return events.length;
}

export async function getRecommendationEventCounts(): Promise<Record<RecommendationCategory, number>> {
  const events = await getRecommendationEvents();
  return events.reduce<Record<RecommendationCategory, number>>((counts, event) => {
    counts[event.category] += 1;
    return counts;
  }, {
    education: 0,
    travel: 0,
    healthcare: 0,
  });
}

export async function getRecommendationEventTypeCounts(): Promise<Record<RecommendationEventType, number>> {
  const events = await getRecommendationEvents();
  return events.reduce<Record<RecommendationEventType, number>>((counts, event) => {
    counts[event.eventType] += 1;
    return counts;
  }, {
    impression: 0,
    click: 0,
    dismiss: 0,
    conversion: 0,
  });
}

export interface RecommendationFunnelItem {
  itemId: string;
  category: RecommendationCategory;
  impressions: number;
  clicks: number;
  dismisses: number;
  conversions: number;
  clickThroughRate: number;
  conversionRate: number;
  lastEventAt: string;
}

export interface RecommendationBusinessSummary {
  totals: Record<RecommendationEventType, number>;
  categoryBreakdown: Record<RecommendationCategory, {
    impressions: number;
    clicks: number;
    dismisses: number;
    conversions: number;
    clickThroughRate: number;
    conversionRate: number;
  }>;
  topItems: RecommendationFunnelItem[];
  suggestions: string[];
}

export interface RecommendationFeedbackState {
  interestedItemIds: string[];
  dismissedItemIds: string[];
}

export async function getRecommendationFunnelItems(): Promise<RecommendationFunnelItem[]> {
  const events = await getRecommendationEvents();
  const grouped = events.reduce<Record<string, RecommendationFunnelItem>>((items, event) => {
    const itemId = event.itemId || `${event.category}-unknown`;
    const key = `${event.category}:${itemId}`;
    const current = items[key] || {
      itemId,
      category: event.category,
      impressions: 0,
      clicks: 0,
      dismisses: 0,
      conversions: 0,
      clickThroughRate: 0,
      conversionRate: 0,
      lastEventAt: event.createdAt,
    };

    if (event.eventType === 'impression') current.impressions += 1;
    if (event.eventType === 'click') current.clicks += 1;
    if (event.eventType === 'dismiss') current.dismisses += 1;
    if (event.eventType === 'conversion') current.conversions += 1;
    if (event.createdAt > current.lastEventAt) current.lastEventAt = event.createdAt;
    items[key] = current;
    return items;
  }, {});

  return Object.values(grouped)
    .map(item => ({
      ...item,
      clickThroughRate: item.impressions > 0 ? item.clicks / item.impressions : 0,
      conversionRate: item.clicks > 0 ? item.conversions / item.clicks : 0,
    }))
    .sort((a, b) => b.conversions - a.conversions || b.clicks - a.clicks || b.impressions - a.impressions);
}

export function buildRecommendationFeedbackState(
  funnelItems: RecommendationFunnelItem[],
): RecommendationFeedbackState {
  return funnelItems.reduce<RecommendationFeedbackState>((state, item) => {
    if (item.conversions > 0) {
      state.interestedItemIds.push(item.itemId);
      return state;
    }
    if (item.dismisses > item.clicks && item.dismisses >= Math.max(1, item.impressions)) {
      state.dismissedItemIds.push(item.itemId);
    }
    return state;
  }, {
    interestedItemIds: [],
    dismissedItemIds: [],
  });
}

export async function getRecommendationBusinessSummary(): Promise<RecommendationBusinessSummary> {
  const events = await getRecommendationEvents();
  const topItems = await getRecommendationFunnelItems();
  const totals = events.reduce<Record<RecommendationEventType, number>>((counts, event) => {
    counts[event.eventType] += 1;
    return counts;
  }, {
    impression: 0,
    click: 0,
    dismiss: 0,
    conversion: 0,
  });
  const categoryBreakdown = events.reduce<RecommendationBusinessSummary['categoryBreakdown']>((breakdown, event) => {
    const current = breakdown[event.category];
    if (event.eventType === 'impression') current.impressions += 1;
    if (event.eventType === 'click') current.clicks += 1;
    if (event.eventType === 'dismiss') current.dismisses += 1;
    if (event.eventType === 'conversion') current.conversions += 1;
    return breakdown;
  }, createEmptyCategoryBreakdown());

  for (const item of Object.values(categoryBreakdown)) {
    item.clickThroughRate = item.impressions > 0 ? item.clicks / item.impressions : 0;
    item.conversionRate = item.clicks > 0 ? item.conversions / item.clicks : 0;
  }

  return {
    totals,
    categoryBreakdown,
    topItems: topItems.slice(0, 5),
    suggestions: buildBusinessSuggestions(topItems, categoryBreakdown),
  };
}

function createEmptyCategoryBreakdown(): RecommendationBusinessSummary['categoryBreakdown'] {
  return {
    education: { impressions: 0, clicks: 0, dismisses: 0, conversions: 0, clickThroughRate: 0, conversionRate: 0 },
    travel: { impressions: 0, clicks: 0, dismisses: 0, conversions: 0, clickThroughRate: 0, conversionRate: 0 },
    healthcare: { impressions: 0, clicks: 0, dismisses: 0, conversions: 0, clickThroughRate: 0, conversionRate: 0 },
  };
}

function buildBusinessSuggestions(
  topItems: RecommendationFunnelItem[],
  breakdown: RecommendationBusinessSummary['categoryBreakdown'],
): string[] {
  const suggestions: string[] = [];
  const bestItem = topItems.find(item => item.conversions > 0 || item.clicks > 0);
  if (bestItem) {
    suggestions.push(`${categoryLabel(bestItem.category)}资源 ${bestItem.itemId} 表现最好，可以提高同类资源权重。`);
  }
  const highDismissCategory = (Object.entries(breakdown) as Array<[RecommendationCategory, RecommendationBusinessSummary['categoryBreakdown'][RecommendationCategory]]>)
    .find(([, item]) => item.dismisses > item.clicks && item.dismisses > 0);
  if (highDismissCategory) {
    suggestions.push(`${categoryLabel(highDismissCategory[0])}资源关闭多于点击，建议降低重复曝光或优化文案。`);
  }
  const noConversionCategory = (Object.entries(breakdown) as Array<[RecommendationCategory, RecommendationBusinessSummary['categoryBreakdown'][RecommendationCategory]]>)
    .find(([, item]) => item.clicks > 0 && item.conversions === 0);
  if (noConversionCategory) {
    suggestions.push(`${categoryLabel(noConversionCategory[0])}资源有点击但未转化，建议检查落地页或权益表达。`);
  }
  if (suggestions.length === 0) {
    suggestions.push('推荐数据还在积累中，优先观察展示到点击的变化。');
  }
  return suggestions.slice(0, 3);
}

function categoryLabel(category: RecommendationCategory): string {
  if (category === 'education') return '教育';
  if (category === 'travel') return '旅行';
  return '健康';
}

export function sanitizeRecommendationEventContext(
  context: Record<string, unknown> = {},
): Record<string, unknown> {
  return Object.entries(context).reduce<Record<string, unknown>>((safeContext, [key, value]) => {
    if (!SAFE_CONTEXT_KEYS.has(key) || UNSAFE_CONTEXT_KEY_PATTERN.test(key)) return safeContext;

    const safeValue = sanitizeContextValue(value);
    if (safeValue !== undefined) {
      safeContext[key] = safeValue;
    }
    return safeContext;
  }, {});
}

function sanitizeContextValue(value: unknown): string | number | boolean | string[] | number[] | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const sanitized = value
      .replace(PHONE_PATTERN, '[已脱敏]')
      .replace(ADDRESS_PATTERN, '[已脱敏]')
      .trim()
      .slice(0, 80);
    return sanitized || undefined;
  }
  if (Array.isArray(value)) {
    const safeItems = value
      .filter(item => typeof item === 'string' || typeof item === 'number')
      .slice(0, 8)
      .map(item => typeof item === 'string'
        ? item.replace(PHONE_PATTERN, '[已脱敏]').replace(ADDRESS_PATTERN, '[已脱敏]').trim().slice(0, 40)
        : item)
      .filter(item => item !== '');
    if (safeItems.every(item => typeof item === 'number')) return safeItems as number[];
    if (safeItems.every(item => typeof item === 'string')) return safeItems as string[];
  }
  return undefined;
}

export async function recordRecommendationEvent(
  input: RecommendationEventInput,
): Promise<RecommendationEvent | null> {
  const consent = await getRecommendationConsent();
  if (!hasRecommendationConsent(consent, input.category)) {
    return null;
  }

  const event: RecommendationEvent = {
    id: createEventId(),
    category: input.category,
    eventType: input.eventType,
    itemId: input.itemId,
    familyId: input.familyId,
    memberId: input.memberId,
    consentVersion: consent.version,
    context: sanitizeRecommendationEventContext(input.context),
    createdAt: new Date().toISOString(),
  };

  const events = await getRecommendationEvents();
  await storageSet(
    getStorageAdapter(),
    STORAGE_KEYS.RECOMMENDATION_EVENTS,
    [event, ...events].slice(0, MAX_LOCAL_RECOMMENDATION_EVENTS),
  );

  return event;
}
