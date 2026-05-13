import { getStorageAdapter, STORAGE_KEYS, storageGet, storageSet } from './StorageAdapter';

export type RecommendationCategory = 'education' | 'travel' | 'healthcare';

export interface RecommendationCategoryDefinition {
  id: RecommendationCategory;
  label: string;
  shortLabel: string;
  allowedUse: string;
  examples: string[];
  sensitiveBoundary: string;
  requiresExtraCare: boolean;
}

export interface RecommendationConsentState {
  version: 'recommendation_consent_v1';
  updatedAt: string;
  categories: Record<RecommendationCategory, boolean>;
}

export const COMMERCIAL_RECOMMENDATIONS_ENABLED_BY_MODEL = true;

export const DEFAULT_RECOMMENDATION_CONSENT: RecommendationConsentState = {
  version: 'recommendation_consent_v1',
  updatedAt: '',
  categories: {
    education: true,
    travel: true,
    healthcare: true,
  },
};

export const RECOMMENDATION_CATEGORY_DEFINITIONS: Record<RecommendationCategory, RecommendationCategoryDefinition> = {
  education: {
    id: 'education',
    label: '教育产品与活动',
    shortLabel: '教育',
    allowedUse: '用于匹配课程、学习工具、兴趣活动和营地类资源。',
    examples: ['课程', '训练营', '学习工具', '亲子活动'],
    sensitiveBoundary: '不应公开孩子姓名、学校班级、详细学习弱点或家庭联系方式。',
    requiresExtraCare: false,
  },
  travel: {
    id: 'travel',
    label: '假期旅行与营地',
    shortLabel: '旅行',
    allowedUse: '用于匹配寒暑假路线、亲子游、冬夏令营和研学安排。',
    examples: ['亲子游', '研学', '冬夏令营', '假期路线'],
    sensitiveBoundary: '不应暴露家庭住址、精确行程、出发日期、住宿地点等安全信息。',
    requiresExtraCare: false,
  },
  healthcare: {
    id: 'healthcare',
    label: '健康与就医建议',
    shortLabel: '健康',
    allowedUse: '仅用于就医流程、复诊提醒、护理清单和日程辅助。',
    examples: ['就医路径', '复诊提醒', '资料清单', '护理安排'],
    sensitiveBoundary: '不能做诊断、治疗承诺或使用可识别的具体病历信息做商业推荐。',
    requiresExtraCare: true,
  },
};

export interface RecommendationTransparencySummary {
  enabledCount: number;
  totalCount: number;
  enabledCategories: RecommendationCategory[];
  disabledCategories: RecommendationCategory[];
  riskNotes: string[];
}

export function buildRecommendationTransparencySummary(
  consent: RecommendationConsentState,
): RecommendationTransparencySummary {
  const categories = Object.keys(DEFAULT_RECOMMENDATION_CONSENT.categories) as RecommendationCategory[];
  const enabledCategories = categories.filter(category => consent.categories[category]);
  const disabledCategories = categories.filter(category => !consent.categories[category]);
  const riskNotes = enabledCategories.map(category => RECOMMENDATION_CATEGORY_DEFINITIONS[category].sensitiveBoundary);

  return {
    enabledCount: enabledCategories.length,
    totalCount: categories.length,
    enabledCategories,
    disabledCategories,
    riskNotes,
  };
}

async function removeLocalEventsByCategory(category: RecommendationCategory): Promise<void> {
  const events = await storageGet<Array<{ category?: RecommendationCategory }>>(
    getStorageAdapter(),
    STORAGE_KEYS.RECOMMENDATION_EVENTS,
    [],
  );
  await storageSet(
    getStorageAdapter(),
    STORAGE_KEYS.RECOMMENDATION_EVENTS,
    events.filter(event => event.category !== category),
  );
}

export async function getRecommendationConsent(): Promise<RecommendationConsentState> {
  const stored = await storageGet<RecommendationConsentState | null>(
    getStorageAdapter(),
    STORAGE_KEYS.RECOMMENDATION_CONSENT,
    null,
  );

  if (!stored) return DEFAULT_RECOMMENDATION_CONSENT;
  return {
    ...DEFAULT_RECOMMENDATION_CONSENT,
    ...stored,
    categories: {
      ...DEFAULT_RECOMMENDATION_CONSENT.categories,
      ...stored.categories,
    },
  };
}

export async function saveRecommendationConsent(
  categories: Record<RecommendationCategory, boolean>,
): Promise<RecommendationConsentState> {
  const previous = await getRecommendationConsent();
  const disabledCategories = (Object.keys(categories) as RecommendationCategory[])
    .filter(category => previous.categories[category] && !categories[category]);

  const next: RecommendationConsentState = {
    version: 'recommendation_consent_v1',
    updatedAt: new Date().toISOString(),
    categories,
  };
  await storageSet(getStorageAdapter(), STORAGE_KEYS.RECOMMENDATION_CONSENT, next);

  await Promise.all(disabledCategories.map(category => removeLocalEventsByCategory(category)));

  return next;
}

export function hasRecommendationConsent(
  consent: RecommendationConsentState,
  category: RecommendationCategory,
): boolean {
  if (COMMERCIAL_RECOMMENDATIONS_ENABLED_BY_MODEL) return true;
  return Boolean(consent.categories[category]);
}
