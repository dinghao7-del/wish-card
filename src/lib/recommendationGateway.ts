import type { CommunityShareProfileSignal } from './communityShare';
import type { RecommendationEvent } from './recommendationEvents';
import type { PublicCalendarSignal } from '../domain/publicCalendarIntelligence';
import type { HolidayBudgetLevel, HolidayCaregiverLoad, HolidayEffortLevel, HolidayPlayMode, HolidayPlayScale } from '../domain/familyPlanning';
import type { Task } from '../types';
import {
  DEFAULT_RECOMMENDATION_CONSENT,
  RECOMMENDATION_CATEGORY_DEFINITIONS,
  hasRecommendationConsent,
  type RecommendationCategory,
  type RecommendationConsentState,
} from './recommendationConsent';

export interface RecommendationCandidate {
  id: string;
  category: RecommendationCategory;
  title: string;
  reason: string;
  source: 'schedule_recommend' | 'community_template' | 'family_report' | 'manual' | 'behavior_signal' | 'family_behavior';
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  destination: string;
  safeContext: Record<string, unknown>;
}

export interface FamilyBehaviorRecommendationInput {
  tasks: Array<Pick<Task, 'id' | 'title' | 'description' | 'type' | 'startTime' | 'deadline' | 'rewardStars' | 'status' | 'isHabit'>>;
  publicCalendarSignals?: PublicCalendarSignal[];
  cityLevel?: string | null;
  now?: Date;
}

export interface CommercialRecommendationProfileInput extends FamilyBehaviorRecommendationInput {
  events?: RecommendationEvent[];
}

export interface CommercialRecommendationProfile {
  categoryScores: Record<RecommendationCategory, number>;
  dominantScenario?: string;
  cityLevel?: string;
  categoryMix: string[];
  holidayPlayScale?: HolidayPlayScale;
  holidayPlayMode?: HolidayPlayMode;
  caregiverLoad?: HolidayCaregiverLoad;
  budgetLevel?: HolidayBudgetLevel;
  effortLevel?: HolidayEffortLevel;
  publicSignalCount: number;
  profileStrength: 'weak' | 'medium' | 'strong';
}

export interface RecommendationGatewayCard extends RecommendationCandidate {
  locked: boolean;
  gateLabel: string;
}

export interface RecommendationGatewayResult {
  headline: string;
  visible: RecommendationGatewayCard[];
  locked: RecommendationGatewayCard[];
  enabledCategories: RecommendationCategory[];
  disabledCategories: RecommendationCategory[];
  safetyNotes: string[];
}

const CATEGORY_DEFAULT_DESTINATION: Record<RecommendationCategory, string> = {
  education: '/schedule-recommend',
  travel: '/school-calendar',
  healthcare: '/school-calendar',
};

const CATEGORY_ACTION_LABEL: Record<RecommendationCategory, string> = {
  education: '查看学习与活动建议',
  travel: '查看假期安排建议',
  healthcare: '查看就医日程建议',
};

export function buildRecommendationGateway(
  candidates: RecommendationCandidate[],
  consent: RecommendationConsentState = DEFAULT_RECOMMENDATION_CONSENT,
): RecommendationGatewayResult {
  const enabledCategories = (Object.keys(DEFAULT_RECOMMENDATION_CONSENT.categories) as RecommendationCategory[])
    .filter(category => hasRecommendationConsent(consent, category));
  const disabledCategories = (Object.keys(DEFAULT_RECOMMENDATION_CONSENT.categories) as RecommendationCategory[])
    .filter(category => !hasRecommendationConsent(consent, category));

  const cards = candidates
    .map(candidate => {
      const locked = !hasRecommendationConsent(consent, candidate.category);
      return {
        ...candidate,
        locked,
        gateLabel: locked
          ? `${RECOMMENDATION_CATEGORY_DEFINITIONS[candidate.category].shortLabel}推荐未开启`
          : `${RECOMMENDATION_CATEGORY_DEFINITIONS[candidate.category].shortLabel}推荐可用`,
      };
    })
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));

  const visible = cards.filter(card => !card.locked);
  const locked = cards.filter(card => card.locked);

  return {
    headline: visible.length > 0
      ? `已根据家庭行为生成 ${visible.length} 条智能推荐`
      : locked.length > 0
        ? '这些建议需要家长授权后才会展示'
        : '暂时没有需要展示的商业推荐',
    visible,
    locked,
    enabledCategories,
    disabledCategories,
    safetyNotes: enabledCategories.map(category => RECOMMENDATION_CATEGORY_DEFINITIONS[category].sensitiveBoundary),
  };
}

export function buildCandidatesFromRecommendationEvents(
  events: RecommendationEvent[],
): RecommendationCandidate[] {
  const recentEvents = events.slice(0, 60);
  const grouped = recentEvents.reduce<Record<RecommendationCategory, RecommendationEvent[]>>((groups, event) => {
    groups[event.category].push(event);
    return groups;
  }, {
    education: [],
    travel: [],
    healthcare: [],
  });

  return (Object.entries(grouped) as Array<[RecommendationCategory, RecommendationEvent[]]>)
    .filter(([, categoryEvents]) => categoryEvents.length > 0)
    .map(([category, categoryEvents]) => {
      const topScenario = topStringValue(categoryEvents.map(event => event.context.scenario || event.context.preferredScenario));
      const topSource = topStringValue(categoryEvents.map(event => event.context.source));
      const clickWeight = categoryEvents.filter(event => event.eventType === 'click' || event.eventType === 'conversion').length;
      const impressionWeight = categoryEvents.filter(event => event.eventType === 'impression').length;
      const priority = clickWeight > 0 || categoryEvents.length >= 4 ? 'high' : impressionWeight >= 2 ? 'medium' : 'low';

      return {
        id: `behavior-${category}-${topScenario || 'general'}`,
        category,
        title: buildBehaviorTitle(category, topScenario),
        reason: buildBehaviorReason(category, categoryEvents.length, topScenario, topSource),
        source: 'behavior_signal',
        priority,
        actionLabel: CATEGORY_ACTION_LABEL[category],
        destination: CATEGORY_DEFAULT_DESTINATION[category],
        safeContext: {
          source: 'behavior_signal',
          scenario: topScenario,
          recommendationReason: `behavior_${category}_${categoryEvents.length}`,
          slotCount: numericContextSum(categoryEvents, 'slotCount') || undefined,
          favoriteCount: numericContextSum(categoryEvents, 'favoriteCount') || undefined,
          recentUseCount: numericContextSum(categoryEvents, 'recentUseCount') || undefined,
        },
      } satisfies RecommendationCandidate;
    })
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
}

export function buildCandidatesFromFamilyBehavior(input: FamilyBehaviorRecommendationInput): RecommendationCandidate[] {
  const now = input.now || new Date();
  const tasks = input.tasks.filter(task => task.status !== 'completed' && task.status !== 'expired');
  const groups: Record<RecommendationCategory, typeof tasks> = {
    education: tasks.filter(task => EDUCATION_TASK_PATTERN.test(taskText(task))),
    travel: tasks.filter(task => TRAVEL_TASK_PATTERN.test(taskText(task)) || task.type === 'family_promise'),
    healthcare: tasks.filter(task => HEALTHCARE_TASK_PATTERN.test(taskText(task))),
  };

  const candidates = (Object.entries(groups) as Array<[RecommendationCategory, typeof tasks]>)
    .filter(([, items]) => items.length > 0)
    .map(([category, items]) => {
      const scenario = inferFamilyBehaviorScenario(category, items, input.publicCalendarSignals || [], now);
      const categoryMix = inferCategoryMix(category, items);
      return {
        id: `family-behavior-${category}-${scenario}`,
        category,
        title: buildFamilyBehaviorTitle(category, scenario),
        reason: buildFamilyBehaviorReason(category, items.length, scenario),
        source: 'family_behavior',
        priority: inferFamilyBehaviorPriority(category, items),
        actionLabel: CATEGORY_ACTION_LABEL[category],
        destination: CATEGORY_DEFAULT_DESTINATION[category],
        safeContext: {
          source: 'family_behavior',
          scenario,
          cityLevel: input.cityLevel || undefined,
          slotCount: items.length,
          categoryMix,
          recommendationReason: `family_behavior_${category}_${items.length}`,
        },
      } satisfies RecommendationCandidate;
    });

  const holidaySignals = (input.publicCalendarSignals || []).filter(signal =>
    (signal.type === 'national_holiday' || signal.type === 'school_break')
    && signalStartsWithinDays(signal, now, 120)
  );
  if (holidaySignals.length > 0 && !candidates.some(candidate => candidate.category === 'travel')) {
    candidates.push({
      id: 'family-behavior-travel-public-calendar',
      category: 'travel',
      title: '基于即将到来的假期推荐亲子安排',
      reason: '检测到节假日或学校假期信号，适合提前展示亲子游、营地或本地活动推荐。',
      source: 'family_behavior',
      priority: 'medium',
      actionLabel: CATEGORY_ACTION_LABEL.travel,
      destination: CATEGORY_DEFAULT_DESTINATION.travel,
      safeContext: {
        source: 'family_behavior',
        scenario: holidaySignals.some(signal => /暑假|summer/i.test(signal.title)) ? 'summer_break' : 'holiday',
        cityLevel: input.cityLevel || undefined,
        slotCount: holidaySignals.length,
        categoryMix: ['travel', 'family'],
        recommendationReason: `family_behavior_public_calendar_${holidaySignals.length}`,
      },
    });
  }

  return candidates.sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority));
}

export function buildCommercialRecommendationProfile(
  input: CommercialRecommendationProfileInput,
): CommercialRecommendationProfile {
  const now = input.now || new Date();
  const activeTasks = input.tasks.filter(task => task.status !== 'completed' && task.status !== 'expired');
  const publicSignals = input.publicCalendarSignals || [];
  const events = input.events || [];
  const educationTasks = activeTasks.filter(task => EDUCATION_TASK_PATTERN.test(taskText(task)));
  const travelTasks = activeTasks.filter(task => TRAVEL_TASK_PATTERN.test(taskText(task)) || task.type === 'family_promise');
  const healthcareTasks = activeTasks.filter(task => HEALTHCARE_TASK_PATTERN.test(taskText(task)));
  const categoryScores: Record<RecommendationCategory, number> = {
    education: educationTasks.length * 2 + events.filter(event => event.category === 'education').length,
    travel: travelTasks.length * 2 + publicSignals.filter(signal => signal.type === 'national_holiday' || signal.type === 'school_break').length + events.filter(event => event.category === 'travel').length,
    healthcare: healthcareTasks.length * 3 + events.filter(event => event.category === 'healthcare').length,
  };
  const dominantCategory = (Object.entries(categoryScores) as Array<[RecommendationCategory, number]>)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  const scenarioSources = [
    dominantCategory ? inferFamilyBehaviorScenario(dominantCategory, categoryTasksFor(dominantCategory, { educationTasks, travelTasks, healthcareTasks }), publicSignals, now) : undefined,
    ...events.map(event => event.context.scenario || event.context.preferredScenario).filter((value): value is string => typeof value === 'string'),
  ];
  const holidayProfile = inferHolidayCommercialProfile(activeTasks, events);
  const categoryMix = Array.from(new Set([
    ...inferCategoryMix('education', educationTasks),
    ...inferCategoryMix('travel', travelTasks),
    ...inferCategoryMix('healthcare', healthcareTasks),
  ])).slice(0, 8);
  const totalScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0);

  return {
    categoryScores,
    dominantScenario: topStringValue(scenarioSources),
    cityLevel: input.cityLevel || undefined,
    categoryMix,
    ...holidayProfile,
    publicSignalCount: publicSignals.length,
    profileStrength: totalScore >= 8 ? 'strong' : totalScore >= 3 ? 'medium' : 'weak',
  };
}

export function applyCommercialProfileToCandidates(
  candidates: RecommendationCandidate[],
  profile: CommercialRecommendationProfile,
): RecommendationCandidate[] {
  return candidates.map(candidate => {
    const categoryScore = profile.categoryScores[candidate.category] || 0;
    const safeContext = {
      ...candidate.safeContext,
      scenario: candidate.safeContext.scenario || profile.dominantScenario,
      cityLevel: candidate.safeContext.cityLevel || profile.cityLevel,
      categoryMix: mergeStringArrays(candidate.safeContext.categoryMix, profile.categoryMix),
      profileStrength: profile.profileStrength,
      categoryScore,
      publicSignalCount: profile.publicSignalCount || undefined,
      ...(candidate.category === 'travel' ? {
        holidayPlayScale: candidate.safeContext.holidayPlayScale || profile.holidayPlayScale,
        holidayPlayMode: candidate.safeContext.holidayPlayMode || profile.holidayPlayMode,
        caregiverLoad: candidate.safeContext.caregiverLoad || profile.caregiverLoad,
        budgetLevel: candidate.safeContext.budgetLevel || profile.budgetLevel,
        effortLevel: candidate.safeContext.effortLevel || profile.effortLevel,
      } : {}),
    };

    return {
      ...candidate,
      priority: categoryScore >= 5 && candidate.priority !== 'high' ? 'high' : categoryScore >= 2 && candidate.priority === 'low' ? 'medium' : candidate.priority,
      safeContext: compactContext(safeContext),
    };
  });
}

export function dedupeRecommendationCandidates(candidates: RecommendationCandidate[]): RecommendationCandidate[] {
  const bestByCategory = new Map<RecommendationCategory, RecommendationCandidate>();
  for (const candidate of candidates) {
    const current = bestByCategory.get(candidate.category);
    if (!current || candidateDisplayRank(candidate) > candidateDisplayRank(current)) {
      bestByCategory.set(candidate.category, candidate);
    }
  }
  return Array.from(bestByCategory.values())
    .sort((a, b) => candidateDisplayRank(b) - candidateDisplayRank(a));
}

export function buildCandidatesFromCommunitySignal(
  signal: CommunityShareProfileSignal,
  sourceId: string,
): RecommendationCandidate[] {
  return signal.commercialSignals.map(item => ({
    id: `${sourceId}-${item.category}`,
    category: item.category,
    title: buildSignalTitle(item.category, signal),
    reason: item.reason,
    source: 'community_template',
    priority: item.strength === 'strong' ? 'high' : item.strength === 'medium' ? 'medium' : 'low',
    actionLabel: CATEGORY_ACTION_LABEL[item.category],
    destination: CATEGORY_DEFAULT_DESTINATION[item.category],
    safeContext: {
      source: 'community_template',
      scenario: signal.scenario,
      familyStage: signal.familyStage || undefined,
      cityLevel: signal.cityLevel || undefined,
      slotCount: signal.slotCount,
      categoryMix: signal.categoryMix,
      caregiverRequiredSlots: signal.caregiverRequiredSlots,
      timeCoverage: signal.timeCoverage,
      recommendationReason: item.reason,
    },
  }));
}

export function buildDefaultRecommendationCandidates(): RecommendationCandidate[] {
  return [
    {
      id: 'default-education',
      category: 'education',
      title: '根据孩子年龄、学段和日常安排推荐课程或活动',
      reason: '只使用年龄段、学段、兴趣类别和时间空档，不使用孩子姓名或学校班级。',
      source: 'manual',
      priority: 'high',
      actionLabel: CATEGORY_ACTION_LABEL.education,
      destination: CATEGORY_DEFAULT_DESTINATION.education,
      safeContext: { source: 'manual', recommendationReason: 'education_preview' },
    },
    {
      id: 'default-travel',
      category: 'travel',
      title: '结合寒暑假、公共假期和家庭空档推荐亲子安排',
      reason: '只使用假期类型、城市层级和粗粒度时间段，不保存精确行程。',
      source: 'manual',
      priority: 'medium',
      actionLabel: CATEGORY_ACTION_LABEL.travel,
      destination: CATEGORY_DEFAULT_DESTINATION.travel,
      safeContext: { source: 'manual', recommendationReason: 'travel_preview' },
    },
    {
      id: 'default-healthcare',
      category: 'healthcare',
      title: '把体检、复诊、护理清单变成家庭日程提醒',
      reason: '健康类只做流程辅助和提醒，不做诊断或治疗承诺。',
      source: 'manual',
      priority: 'low',
      actionLabel: CATEGORY_ACTION_LABEL.healthcare,
      destination: CATEGORY_DEFAULT_DESTINATION.healthcare,
      safeContext: { source: 'manual', recommendationReason: 'healthcare_preview' },
    },
  ];
}

function buildSignalTitle(category: RecommendationCategory, signal: CommunityShareProfileSignal): string {
  const stage = signal.familyStage ? `${signal.familyStage}家庭` : '类似家庭';
  if (category === 'education') return `为${stage}匹配学习、兴趣或训练资源`;
  if (category === 'travel') return `为${stage}匹配假期、亲子游或营地安排`;
  return `为${stage}整理就医流程和护理提醒`;
}

function buildBehaviorTitle(category: RecommendationCategory, scenario?: string): string {
  const scene = scenario ? `${scenarioLabel(scenario)}场景` : '近期家庭安排';
  if (category === 'education') return `基于${scene}推荐学习与兴趣资源`;
  if (category === 'travel') return `基于${scene}推荐假期和亲子安排`;
  return `基于${scene}整理健康与就医辅助`;
}

function buildBehaviorReason(
  category: RecommendationCategory,
  count: number,
  scenario?: string,
  source?: string,
): string {
  const categoryName = RECOMMENDATION_CATEGORY_DEFINITIONS[category].shortLabel;
  const scene = scenario ? `，集中在${scenarioLabel(scenario)}` : '';
  const sourceText = source ? `，来源于${sourceLabel(source)}` : '';
  return `最近产生了 ${count} 条${categoryName}相关行为信号${scene}${sourceText}，适合优先展示对应服务。`;
}

const EDUCATION_TASK_PATTERN = /学习|阅读|作业|英语|语文|数学|识字|背诵|练琴|钢琴|小提琴|画画|绘画|编程|空手道|篮球|游泳|舞蹈|课外班|兴趣班|考试|考级|复习|study|class|exam/i;
const TRAVEL_TASK_PATTERN = /出游|旅行|旅游|亲子|公园|科技馆|博物馆|营地|夏令营|冬令营|酒店|机票|火车|周末玩|度假|travel|camp/i;
const HEALTHCARE_TASK_PATTERN = /医院|看病|就医|复诊|体检|疫苗|牙医|眼科|康复|护理|吃药|medical|doctor|hospital/i;

function taskText(task: Pick<Task, 'title' | 'description' | 'type'>): string {
  return `${task.title || ''} ${task.description || ''} ${task.type || ''}`;
}

function inferFamilyBehaviorScenario(
  category: RecommendationCategory,
  tasks: FamilyBehaviorRecommendationInput['tasks'],
  signals: PublicCalendarSignal[],
  now: Date,
): string {
  if (category === 'healthcare') return 'medical';
  const relevantSignals = signals.filter(signal =>
    tasks.some(task => taskOverlapsSignal(task, signal))
    || (category === 'travel' && signalStartsWithinDays(signal, now, 90))
  );
  const signalScenario = topStringValue(relevantSignals.map(signal => {
    if (signal.type === 'school_break' && /暑假|summer/i.test(signal.title)) return 'summer_break';
    if (signal.type === 'school_break' && /寒假|winter/i.test(signal.title)) return 'winter_break';
    if (signal.type === 'school_break' || signal.type === 'national_holiday') return 'holiday';
    return undefined;
  }));
  if (signalScenario) return signalScenario;

  const taskScenario = topStringValue(tasks.map(task => {
    const date = new Date(task.startTime || task.deadline || now);
    if (!Number.isFinite(date.getTime())) return undefined;
    const month = date.getMonth() + 1;
    const day = date.getDay();
    if (month === 7 || month === 8) return 'summer_break';
    if (month === 1 || month === 2) return 'winter_break';
    if (day === 0 || day === 6) return 'weekend';
    return 'school_day';
  }));
  return taskScenario || (category === 'travel' ? 'holiday' : 'school_day');
}

function taskOverlapsSignal(
  task: Pick<Task, 'startTime' | 'deadline'>,
  signal: PublicCalendarSignal,
): boolean {
  const taskStart = new Date(task.startTime || task.deadline || '').getTime();
  const taskEnd = new Date(task.deadline || task.startTime || '').getTime();
  const signalStart = new Date(signal.startDate).getTime();
  const signalEnd = new Date(signal.endDate).getTime();
  return Number.isFinite(taskStart)
    && Number.isFinite(taskEnd)
    && Number.isFinite(signalStart)
    && Number.isFinite(signalEnd)
    && taskStart <= signalEnd
    && signalStart <= taskEnd;
}

function signalStartsWithinDays(signal: PublicCalendarSignal, now: Date, days: number): boolean {
  const start = new Date(signal.startDate).getTime();
  const current = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(current)) return false;
  return start >= current && start <= current + days * 24 * 60 * 60 * 1000;
}

function inferCategoryMix(category: RecommendationCategory, tasks: FamilyBehaviorRecommendationInput['tasks']): string[] {
  const text = tasks.map(taskText).join(' ');
  const tags = new Set<string>();
  if (category === 'education') {
    if (/英语|阅读|识字|语文|背诵/i.test(text)) tags.add('language');
    if (/数学|编程|思维/i.test(text)) tags.add('thinking');
    if (/钢琴|小提琴|画画|绘画|舞蹈/i.test(text)) tags.add('art');
    if (/篮球|游泳|空手道|运动/i.test(text)) tags.add('sports');
    tags.add('study');
  }
  if (category === 'travel') {
    if (/科技馆|博物馆|研学|科学/i.test(text)) tags.add('science');
    if (/营地|夏令营|冬令营/i.test(text)) tags.add('camp');
    tags.add('travel');
    tags.add('family');
  }
  if (category === 'healthcare') {
    if (/牙医|眼科|体检|疫苗/i.test(text)) tags.add('checkup');
    tags.add('medical');
  }
  return Array.from(tags);
}

function categoryTasksFor(
  category: RecommendationCategory,
  groups: {
    educationTasks: FamilyBehaviorRecommendationInput['tasks'];
    travelTasks: FamilyBehaviorRecommendationInput['tasks'];
    healthcareTasks: FamilyBehaviorRecommendationInput['tasks'];
  },
): FamilyBehaviorRecommendationInput['tasks'] {
  if (category === 'education') return groups.educationTasks;
  if (category === 'travel') return groups.travelTasks;
  return groups.healthcareTasks;
}

function inferHolidayCommercialProfile(
  tasks: FamilyBehaviorRecommendationInput['tasks'],
  events: RecommendationEvent[],
): Partial<Pick<CommercialRecommendationProfile, 'holidayPlayScale' | 'holidayPlayMode' | 'caregiverLoad' | 'budgetLevel' | 'effortLevel'>> {
  const eventContexts = events.map(event => event.context);
  const text = tasks.map(taskText).join(' ');
  return {
    holidayPlayScale: topStringValue([
      ...eventContexts.map(context => context.holidayPlayScale),
      /大玩|长途|出国|度假|游学/.test(text) ? 'big_play' : undefined,
      /周末|半天|小玩|公园|本地/.test(text) ? 'small_play' : undefined,
    ]) as HolidayPlayScale | undefined,
    holidayPlayMode: topStringValue([
      ...eventContexts.map(context => context.holidayPlayMode),
      /科学|科技馆|博物馆|研学|兴趣/.test(text) ? 'science_fun' : undefined,
      /纯玩|度假|乐园/.test(text) ? 'pure_fun' : undefined,
    ]) as HolidayPlayMode | undefined,
    caregiverLoad: topStringValue(eventContexts.map(context => context.caregiverLoad)) as HolidayCaregiverLoad | undefined,
    budgetLevel: topStringValue([
      ...eventContexts.map(context => context.budgetLevel),
      /预算高|贵一点|高预算|出国|游学/.test(text) ? 'high' : undefined,
    ]) as HolidayBudgetLevel | undefined,
    effortLevel: topStringValue([
      ...eventContexts.map(context => context.effortLevel),
      /省心|省力|托管|营地/.test(text) ? 'easy' : undefined,
      /陪伴|亲子/.test(text) ? 'balanced' : undefined,
    ]) as HolidayEffortLevel | undefined,
  };
}

function inferFamilyBehaviorPriority(category: RecommendationCategory, tasks: FamilyBehaviorRecommendationInput['tasks']): RecommendationCandidate['priority'] {
  const text = tasks.map(taskText).join(' ');
  if (category === 'healthcare') return 'high';
  if (/考试|考级|夏令营|冬令营|旅行|出游|复诊|体检/i.test(text)) return 'high';
  if (tasks.length >= 4) return 'high';
  if (tasks.length >= 2) return 'medium';
  return 'low';
}

function buildFamilyBehaviorTitle(category: RecommendationCategory, scenario: string): string {
  const scene = scenarioLabel(scenario);
  if (category === 'education') return `基于${scene}安排推荐学习与兴趣资源`;
  if (category === 'travel') return `基于${scene}安排推荐亲子活动`;
  return '基于家庭健康事项整理就医与护理辅助';
}

function buildFamilyBehaviorReason(category: RecommendationCategory, count: number, scenario: string): string {
  const categoryName = RECOMMENDATION_CATEGORY_DEFINITIONS[category].shortLabel;
  return `家庭日程里已有 ${count} 个${categoryName}相关安排，集中在${scenarioLabel(scenario)}，适合展示对应服务。`;
}

function topStringValue(values: unknown[]): string | undefined {
  const counts = values.reduce<Record<string, number>>((result, value) => {
    if (typeof value !== 'string' || !value.trim()) return result;
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function numericContextSum(events: RecommendationEvent[], key: string): number {
  return events.reduce((sum, event) => {
    const value = event.context[key];
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
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

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    schedule_recommend: '智能日程',
    community_template: '社区模板',
    community_template_library: '经验库',
    behavior_signal: '家庭行为',
    family_behavior: '家庭日程',
    manual: '默认建议',
  };
  return labels[source] || source;
}

function priorityRank(priority: RecommendationCandidate['priority']): number {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function candidateDisplayRank(candidate: RecommendationCandidate): number {
  const sourceWeight: Record<RecommendationCandidate['source'], number> = {
    family_behavior: 14,
    behavior_signal: 12,
    community_template: 10,
    schedule_recommend: 8,
    family_report: 8,
    manual: 1,
  };
  const slotCount = typeof candidate.safeContext.slotCount === 'number' ? candidate.safeContext.slotCount : 0;
  return priorityRank(candidate.priority) * 20 + sourceWeight[candidate.source] + Math.min(slotCount, 10);
}

function mergeStringArrays(value: unknown, extra: string[]): string[] {
  const base = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  return Array.from(new Set([...base, ...extra])).slice(0, 8);
}

function compactContext(context: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(context).reduce<Record<string, unknown>>((result, [key, value]) => {
    if (value === undefined || value === null) return result;
    if (Array.isArray(value) && value.length === 0) return result;
    result[key] = value;
    return result;
  }, {});
}
