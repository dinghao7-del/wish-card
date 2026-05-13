import type { FamilySchedulePlan, PlanningScenario, ScheduleSlot } from '../domain/familyPlanning';
import { getStorageAdapter, STORAGE_KEYS, storageGet, storageSet } from './StorageAdapter';
import type { RecommendationCategory } from './recommendationConsent';

export interface SharedScheduleTemplateDraft {
  title: string;
  scenario: PlanningScenario;
  sourcePlanId?: string;
  ageRange: string | null;
  gradeBand: string | null;
  cityLevel: string | null;
  content: {
    summary?: string;
    slots: Array<Omit<ScheduleSlot, 'childIds'> & { childIds?: never }>;
    assumptions: string[];
  };
  tips: string[];
  redactions: string[];
}

export interface ShareSanitizationContext {
  sourcePlanId?: string;
  childAges?: number[];
  grade?: string;
  city?: string;
  memberNames?: string[];
  sensitiveTerms?: string[];
}

export interface StoredSharedScheduleTemplateDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'ready_to_publish';
  draft: SharedScheduleTemplateDraft;
  asset: SharedScheduleTemplateAsset;
  consent?: CommunityShareConsent;
}

export interface SharedScheduleTemplateAsset {
  tags: string[];
  slotCount: number;
  categoryMix: string[];
  privacyRiskLevel: 'low' | 'medium' | 'high';
  qualityScore: number;
  qualityLevel: 'excellent' | 'good' | 'needs_work';
  qualityReasons: string[];
  publishBlockers: string[];
  profileSignal: CommunityShareProfileSignal;
  reuseHint: string;
}

export interface CommunityShareProfileSignal {
  scenario: PlanningScenario;
  familyStage: string | null;
  cityLevel: string | null;
  slotCount: number;
  categoryMix: string[];
  caregiverRequiredSlots: number;
  timeCoverage: 'full_day' | 'partial_day' | 'lightweight';
  commercialSignals: Array<{
    category: RecommendationCategory;
    strength: 'strong' | 'medium' | 'weak';
    reason: string;
  }>;
}

export interface CommunityShareConsent {
  privacyReviewed: boolean;
  communityUseAgreed: boolean;
  agreedAt: string;
  version: 'community_share_v1';
}

export interface CommunityShareTemplateQuery {
  keyword?: string;
  status?: StoredSharedScheduleTemplateDraft['status'] | 'all';
  scenario?: PlanningScenario | 'all';
  quality?: SharedScheduleTemplateAsset['qualityLevel'] | 'all';
  recommendationCategory?: RecommendationCategory | 'all';
  sortBy?: 'updated_desc' | 'quality_desc' | 'slot_count_desc';
}

const ADDRESS_PATTERN = /[\u4e00-\u9fa5A-Za-z0-9]{2,}(小区|校区|学校|幼儿园|医院|门诊|路|街|弄|号楼|单元|室)/g;
const PHONE_PATTERN = /\b1[3-9]\d{9}\b/g;
const MAX_STORED_DRAFTS = 20;

function createDraftId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `share-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeText(value: string | undefined, context: ShareSanitizationContext, redactions: Set<string>): string | undefined {
  if (!value) return value;
  let next = value;

  for (const name of context.memberNames || []) {
    if (name && next.includes(name)) {
      next = next.split(name).join('孩子');
      redactions.add('member_name');
    }
  }

  for (const term of context.sensitiveTerms || []) {
    if (term && next.includes(term)) {
      next = next.split(term).join('[已脱敏]');
      redactions.add('custom_sensitive_term');
    }
  }

  if (next.match(PHONE_PATTERN)) {
    next = next.replace(PHONE_PATTERN, '[电话已脱敏]');
    redactions.add('phone');
  }

  if (next.match(ADDRESS_PATTERN)) {
    next = next.replace(ADDRESS_PATTERN, '[地点已脱敏]');
    redactions.add('specific_place');
  }

  return next;
}

export function toAgeRange(ages: number[] | undefined): string | null {
  if (!ages?.length) return null;
  const min = Math.min(...ages);
  const max = Math.max(...ages);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min === max) return `${min}岁`;
  return `${min}-${max}岁`;
}

export function toGradeBand(grade: string | undefined): string | null {
  if (!grade) return null;
  if (/幼儿|托班|小班|中班|大班/.test(grade)) return '幼儿园';
  if (/一|二|1|2/.test(grade)) return '小学低年级';
  if (/三|四|3|4/.test(grade)) return '小学中年级';
  if (/五|六|5|6/.test(grade)) return '小学高年级';
  if (/初|七|八|九|7|8|9/.test(grade)) return '初中';
  if (/高|10|11|12/.test(grade)) return '高中';
  return grade;
}

export function toCityLevel(city: string | undefined): string | null {
  if (!city) return null;
  if (/北京|上海|广州|深圳/.test(city)) return '一线城市';
  if (/杭州|南京|苏州|成都|重庆|武汉|西安|天津|青岛|长沙|郑州|宁波|佛山|东莞/.test(city)) return '新一线/强二线城市';
  return '其他城市';
}

export function createSharedScheduleTemplateDraft(
  plan: FamilySchedulePlan,
  context: ShareSanitizationContext = {},
): SharedScheduleTemplateDraft {
  const redactions = new Set<string>();
  const slots = plan.slots.map((slot) => {
    const { childIds, ...safeSlot } = slot;
    void childIds;
    return {
      ...safeSlot,
      title: sanitizeText(safeSlot.title, context, redactions) || safeSlot.title,
      description: sanitizeText(safeSlot.description, context, redactions),
    };
  });

  return {
    title: sanitizeText(plan.title, context, redactions) || plan.title,
    scenario: plan.scenario,
    sourcePlanId: context.sourcePlanId || plan.id,
    ageRange: toAgeRange(context.childAges),
    gradeBand: toGradeBand(context.grade),
    cityLevel: toCityLevel(context.city),
    content: {
      summary: sanitizeText(plan.summary, context, redactions),
      slots,
      assumptions: plan.assumptions
        .map(item => sanitizeText(item, context, redactions))
        .filter((item): item is string => Boolean(item)),
    },
    tips: plan.parentTips
      .map(tip => sanitizeText(tip, context, redactions))
      .filter((tip): tip is string => Boolean(tip)),
    redactions: Array.from(redactions).sort(),
  };
}

export function getScenarioLabel(scenario: PlanningScenario): string {
  const labels: Record<PlanningScenario, string> = {
    school_day: '上学日',
    weekend: '周末',
    holiday: '假期',
    winter_break: '寒假',
    summer_break: '暑假',
    travel: '旅行',
    medical: '就医',
    custom: '自定义',
  };
  return labels[scenario] || '自定义';
}

export function buildSharedScheduleTemplateAsset(draft: SharedScheduleTemplateDraft): SharedScheduleTemplateAsset {
  const categoryMix = Array.from(new Set(draft.content.slots.map(slot => slot.category).filter(Boolean)));
  const tags = [
    getScenarioLabel(draft.scenario),
    draft.ageRange,
    draft.gradeBand,
    draft.cityLevel,
    ...categoryMix.slice(0, 3),
  ].filter((tag): tag is string => Boolean(tag));
  const privacyRiskLevel = draft.redactions.length >= 3
    ? 'high'
    : draft.redactions.length > 0
      ? 'medium'
      : 'low';
  const quality = buildCommunityTemplateQuality(draft, categoryMix, privacyRiskLevel);

  return {
    tags: Array.from(new Set(tags)).slice(0, 8),
    slotCount: draft.content.slots.length,
    categoryMix,
    privacyRiskLevel,
    ...quality,
    profileSignal: buildCommunityShareProfileSignal(draft, categoryMix),
    reuseHint: buildReuseHint(draft, categoryMix),
  };
}

export function buildCommunityTemplateQuality(
  draft: SharedScheduleTemplateDraft,
  categoryMix: string[] = Array.from(new Set(draft.content.slots.map(slot => slot.category).filter(Boolean))),
  privacyRiskLevel: SharedScheduleTemplateAsset['privacyRiskLevel'] = draft.redactions.length >= 3
    ? 'high'
    : draft.redactions.length > 0
      ? 'medium'
      : 'low',
): Pick<SharedScheduleTemplateAsset, 'qualityScore' | 'qualityLevel' | 'qualityReasons' | 'publishBlockers'> {
  const reasons: string[] = [];
  const blockers: string[] = [];
  let score = 35;

  if (draft.title.trim().length < 4) blockers.push('标题太短，其他家庭难以理解用途');
  if (draft.content.slots.length === 0) blockers.push('还没有可复用的日程时段');
  if (draft.content.slots.some(slot => !slot.title?.trim() || !slot.startTime || !slot.endTime)) {
    blockers.push('存在缺少标题或时间的日程时段');
  }

  if (draft.content.slots.length >= 8) {
    score += 25;
    reasons.push('覆盖了较完整的一天');
  } else if (draft.content.slots.length >= 4) {
    score += 18;
    reasons.push('包含多个可参考时段');
  } else if (draft.content.slots.length > 0) {
    score += 8;
    reasons.push('已有基础日程结构');
  }

  if (categoryMix.length >= 4) {
    score += 14;
    reasons.push('学习、生活或运动等类别较均衡');
  } else if (categoryMix.length >= 2) {
    score += 8;
    reasons.push('包含不止一种安排类型');
  }

  if (draft.ageRange || draft.gradeBand) {
    score += 10;
    reasons.push('有年龄或学段标签，便于相似家庭匹配');
  }
  if (draft.cityLevel) {
    score += 5;
    reasons.push('有城市层级标签，便于判断通勤和资源密度');
  }
  if (draft.content.summary || draft.tips.length > 0) {
    score += 10;
    reasons.push('保留了家长复用时需要看的说明');
  }
  if (draft.content.assumptions.length > 0) {
    score += 6;
    reasons.push('说明了适用前提，减少误用');
  }

  if (privacyRiskLevel === 'medium') score -= 8;
  if (privacyRiskLevel === 'high') {
    score -= 18;
    reasons.push('脱敏痕迹较多，发布前需要再检查文字');
  }
  if (blockers.length > 0) score = Math.min(score, 55);

  const qualityScore = Math.max(0, Math.min(100, score));
  const qualityLevel = qualityScore >= 82
    ? 'excellent'
    : qualityScore >= 62
      ? 'good'
      : 'needs_work';

  return {
    qualityScore,
    qualityLevel,
    qualityReasons: reasons.slice(0, 5),
    publishBlockers: blockers,
  };
}

export function buildCommunityShareProfileSignal(
  draft: SharedScheduleTemplateDraft,
  categoryMix: string[] = Array.from(new Set(draft.content.slots.map(slot => slot.category).filter(Boolean))),
): CommunityShareProfileSignal {
  const caregiverRequiredSlots = draft.content.slots.filter(slot => slot.caregiverRequired).length;
  const slotCount = draft.content.slots.length;
  const timeCoverage = slotCount >= 8 ? 'full_day' : slotCount >= 4 ? 'partial_day' : 'lightweight';

  return {
    scenario: draft.scenario,
    familyStage: draft.gradeBand || draft.ageRange,
    cityLevel: draft.cityLevel,
    slotCount,
    categoryMix,
    caregiverRequiredSlots,
    timeCoverage,
    commercialSignals: buildCommunityCommercialSignals(draft, categoryMix),
  };
}

function buildCommunityCommercialSignals(
  draft: SharedScheduleTemplateDraft,
  categoryMix: string[],
): CommunityShareProfileSignal['commercialSignals'] {
  const signals: CommunityShareProfileSignal['commercialSignals'] = [];
  const text = [
    draft.title,
    draft.content.summary,
    ...draft.content.slots.map(slot => `${slot.title} ${slot.description || ''} ${slot.category}`),
    ...draft.tips,
    ...draft.content.assumptions,
  ].join(' ');

  const hasEducation = categoryMix.some(category => ['study', 'interest', 'exercise'].includes(category))
    || /课程|课外班|学习|作业|阅读|英语|乐器|钢琴|小提琴|绘画|运动|训练|考级/.test(text);
  const hasTravel = ['holiday', 'winter_break', 'summer_break', 'travel'].includes(draft.scenario)
    || /旅行|出游|营地|研学|夏令营|冬令营|假期路线/.test(text);
  const hasHealthcare = draft.scenario === 'medical' || /就医|复诊|康复|护理|医院|门诊|体检/.test(text);

  if (hasEducation) {
    signals.push({
      category: 'education',
      strength: categoryMix.includes('study') || categoryMix.includes('interest') ? 'strong' : 'medium',
      reason: '日程中出现学习、兴趣或训练安排，可用于匹配教育资源',
    });
  }
  if (hasTravel) {
    signals.push({
      category: 'travel',
      strength: draft.scenario === 'travel' || draft.scenario === 'summer_break' || draft.scenario === 'winter_break' ? 'strong' : 'medium',
      reason: '日程属于假期或旅行场景，可用于匹配亲子游、营地或研学资源',
    });
  }
  if (hasHealthcare) {
    signals.push({
      category: 'healthcare',
      strength: draft.scenario === 'medical' ? 'strong' : 'weak',
      reason: '日程中出现就医或护理场景，只能用于流程提醒和资源辅助',
    });
  }

  return signals;
}

function buildReuseHint(draft: SharedScheduleTemplateDraft, categoryMix: string[]): string {
  const scenarioLabel = getScenarioLabel(draft.scenario);
  const target = [draft.gradeBand, draft.ageRange].filter(Boolean).join(' · ') || '类似家庭';
  const categoryText = categoryMix.length > 0 ? `，重点包含${categoryMix.slice(0, 3).join('、')}` : '';
  return `适合${target}参考的${scenarioLabel}日程${categoryText}。复用前建议按自家作息和父母陪伴时间微调。`;
}

export async function getCommunityShareDrafts(): Promise<StoredSharedScheduleTemplateDraft[]> {
  const storage = getStorageAdapter();
  return storageGet<StoredSharedScheduleTemplateDraft[]>(storage, STORAGE_KEYS.COMMUNITY_SHARE_DRAFTS, []);
}

export async function queryCommunityShareDrafts(
  query: CommunityShareTemplateQuery = {},
): Promise<StoredSharedScheduleTemplateDraft[]> {
  const drafts = await getCommunityShareDrafts();
  return filterCommunityShareDrafts(drafts, query);
}

export function filterCommunityShareDrafts(
  drafts: StoredSharedScheduleTemplateDraft[],
  query: CommunityShareTemplateQuery = {},
): StoredSharedScheduleTemplateDraft[] {
  const keyword = query.keyword?.trim().toLowerCase();
  const filtered = drafts.filter(item => {
    if (query.status && query.status !== 'all' && item.status !== query.status) return false;
    if (query.scenario && query.scenario !== 'all' && item.draft.scenario !== query.scenario) return false;
    if (query.quality && query.quality !== 'all' && item.asset?.qualityLevel !== query.quality) return false;
    if (query.recommendationCategory && query.recommendationCategory !== 'all') {
      const hasCategory = item.asset?.profileSignal?.commercialSignals?.some(signal => signal.category === query.recommendationCategory);
      if (!hasCategory) return false;
    }
    if (!keyword) return true;

    const searchable = [
      item.draft.title,
      item.draft.content.summary,
      item.asset?.reuseHint,
      item.draft.ageRange,
      item.draft.gradeBand,
      item.draft.cityLevel,
      ...(item.asset?.tags || []),
      ...(item.asset?.categoryMix || []),
    ].filter(Boolean).join(' ').toLowerCase();
    return searchable.includes(keyword);
  });

  return filtered.sort((a, b) => {
    if (query.sortBy === 'slot_count_desc') {
      return (b.asset?.slotCount || 0) - (a.asset?.slotCount || 0);
    }
    if (query.sortBy === 'quality_desc') {
      return (b.asset?.qualityScore || 0) - (a.asset?.qualityScore || 0);
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getReadyCommunityShareDrafts(): Promise<StoredSharedScheduleTemplateDraft[]> {
  const drafts = await getCommunityShareDrafts();
  return drafts.filter(item => item.status === 'ready_to_publish');
}

export async function getCommunityShareDraft(id: string): Promise<StoredSharedScheduleTemplateDraft | null> {
  const drafts = await getCommunityShareDrafts();
  return drafts.find(item => item.id === id) || null;
}

export async function saveCommunityShareDraft(draft: SharedScheduleTemplateDraft): Promise<StoredSharedScheduleTemplateDraft> {
  const drafts = await getCommunityShareDrafts();
  const now = new Date().toISOString();
  const stored: StoredSharedScheduleTemplateDraft = {
    id: createDraftId(),
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    draft,
    asset: buildSharedScheduleTemplateAsset(draft),
  };

  await storageSet(
    getStorageAdapter(),
    STORAGE_KEYS.COMMUNITY_SHARE_DRAFTS,
    [stored, ...drafts].slice(0, MAX_STORED_DRAFTS),
  );

  return stored;
}

export async function updateCommunityShareDraft(
  id: string,
  draft: SharedScheduleTemplateDraft,
  status: StoredSharedScheduleTemplateDraft['status'] = 'draft',
  consent?: CommunityShareConsent,
): Promise<StoredSharedScheduleTemplateDraft | null> {
  const drafts = await getCommunityShareDrafts();
  const existing = drafts.find(item => item.id === id);
  if (!existing) return null;

  const updated: StoredSharedScheduleTemplateDraft = {
    ...existing,
    updatedAt: new Date().toISOString(),
    status,
    draft,
    asset: buildSharedScheduleTemplateAsset(draft),
    consent: consent || existing.consent,
  };

  await storageSet(
    getStorageAdapter(),
    STORAGE_KEYS.COMMUNITY_SHARE_DRAFTS,
    drafts.map(item => item.id === id ? updated : item),
  );

  return updated;
}
