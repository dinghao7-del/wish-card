import { inferPlanKind, PLAN_KIND_DEFINITIONS, type PlanKind } from './familyPlanning';

export type FamilyReportPeriod = 'week' | 'month' | 'term' | 'year';

export interface FamilyReportTaskInput {
  id: string;
  title: string;
  planId?: string;
  status: string;
  type?: string;
  description?: string;
  rewardStars: number;
  isHabit?: boolean;
  startTime?: string | null;
  deadline?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
}

export interface FamilyReportPlanInput {
  id: string;
  name: string;
  kind?: string;
}

export interface FamilyReportPeriodRange {
  type: FamilyReportPeriod;
  start: string;
  end: string;
}

export interface FamilyReportSummary {
  period: FamilyReportPeriodRange;
  completedTasks: number;
  completedGoodHabits: number;
  completedPenaltyHabits: number;
  completedFamilyPromises: number;
  earnedStars: number;
  penaltyStars: number;
  planBreakdown: Array<{
    planId: string;
    planName: string;
    kind: PlanKind;
    kindLabel: string;
    completedTasks: number;
    completedGoodHabits: number;
    completedPenaltyHabits: number;
    completedFamilyPromises: number;
    earnedStars: number;
    penaltyStars: number;
    positiveActions: number;
    reviewTone: 'milestone' | 'consistency' | 'rhythm' | 'overview';
    reviewMessage: string;
  }>;
  encouragement: {
    headline: string;
    familyMessage: string;
    childMessage: string;
    parentMessage: string;
  };
  familyWeekly: {
    title: string;
    opening: string;
    childHighlights: string[];
    parentFocus: string[];
    quadrantAdvice: {
      urgentImportant: number;
      importantNotUrgent: number;
      reduceOrDefer: number;
      message: string;
    };
  };
  nextPeriodPreview?: {
    period: FamilyReportPeriodRange;
    items: Array<{
      id: string;
      title: string;
      planId?: string;
      planName: string;
      startsAt?: string | null;
      deadline?: string | null;
      importance: 'normal' | 'important';
    }>;
    summary: string;
  };
}

function isWithinPeriod(value: string | null | undefined, period: FamilyReportPeriodRange): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  const start = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();
  if (!Number.isFinite(time) || !Number.isFinite(start) || !Number.isFinite(end)) return false;
  return time >= start && time <= end;
}

function isFamilyPromiseTask(task: Pick<FamilyReportTaskInput, 'type' | 'title' | 'description'>): boolean {
  return task.type === 'family_promise'
    || task.title.startsWith('兑现心愿：')
    || task.description?.includes('心愿ID:') === true;
}

export function buildFamilyReportSummary(
  period: FamilyReportPeriodRange,
  tasks: FamilyReportTaskInput[],
  plans: FamilyReportPlanInput[] = [],
  options: {
    nextPeriod?: FamilyReportPeriodRange;
    previewLimit?: number;
  } = {},
): FamilyReportSummary {
  const planNames = new Map(plans.map(plan => [plan.id, plan.name]));
  const planKinds = new Map(plans.map(plan => [plan.id, inferPlanKind({ kind: plan.kind, name: plan.name })]));
  const completedInPeriod = tasks.filter(task =>
    task.status === 'completed' && isWithinPeriod(task.completedAt || task.createdAt, period)
  );

  const emptyPlanSummary = (planId: string) => {
    const kind = planKinds.get(planId) || inferPlanKind({ name: planNames.get(planId) || '' });
    return {
    planId,
    planName: planNames.get(planId) || '未归属计划',
    kind,
    kindLabel: PLAN_KIND_DEFINITIONS[kind].label,
    completedTasks: 0,
    completedGoodHabits: 0,
    completedPenaltyHabits: 0,
    completedFamilyPromises: 0,
    earnedStars: 0,
    penaltyStars: 0,
    positiveActions: 0,
    reviewTone: 'rhythm' as const,
    reviewMessage: '',
  };
  };

  const planBreakdownMap = new Map<string, ReturnType<typeof emptyPlanSummary>>();

  for (const task of completedInPeriod) {
    const planId = task.planId || 'unplanned';
    const summary = planBreakdownMap.get(planId) || emptyPlanSummary(planId);
    const isPenalty = task.rewardStars < 0;
    const isGoodHabit = Boolean(task.isHabit) && !isPenalty;
    const isFamilyPromise = isFamilyPromiseTask(task);

    if (isFamilyPromise) summary.completedFamilyPromises += 1;
    else if (isGoodHabit) summary.completedGoodHabits += 1;
    else if (isPenalty) summary.completedPenaltyHabits += 1;
    else summary.completedTasks += 1;

    if (task.rewardStars >= 0) summary.earnedStars += task.rewardStars;
    else summary.penaltyStars += Math.abs(task.rewardStars);

    planBreakdownMap.set(planId, summary);
  }

  const planBreakdown = Array.from(planBreakdownMap.values()).map(enrichPlanReviewMessage);
  const completedTasks = planBreakdown.reduce((sum, plan) => sum + plan.completedTasks, 0);
  const completedGoodHabits = planBreakdown.reduce((sum, plan) => sum + plan.completedGoodHabits, 0);
  const completedPenaltyHabits = planBreakdown.reduce((sum, plan) => sum + plan.completedPenaltyHabits, 0);
  const completedFamilyPromises = planBreakdown.reduce((sum, plan) => sum + plan.completedFamilyPromises, 0);
  const earnedStars = planBreakdown.reduce((sum, plan) => sum + plan.earnedStars, 0);
  const penaltyStars = planBreakdown.reduce((sum, plan) => sum + plan.penaltyStars, 0);
  const previewLimit = options.previewLimit ?? 5;
  const nextPeriodPreview = options.nextPeriod
    ? buildNextPeriodPreview(options.nextPeriod, tasks, planNames, previewLimit)
    : undefined;
  const familyWeekly = buildFamilyWeekly({
    period,
    completedTasks,
    completedGoodHabits,
    completedPenaltyHabits,
    completedFamilyPromises,
    earnedStars,
    penaltyStars,
    tasks,
    nextPeriod: options.nextPeriod,
  });

  return {
    period,
    completedTasks,
    completedGoodHabits,
    completedPenaltyHabits,
    completedFamilyPromises,
    earnedStars,
    penaltyStars,
    planBreakdown,
    encouragement: buildEncouragement({
      completedTasks,
      completedGoodHabits,
      completedPenaltyHabits,
      completedFamilyPromises,
      earnedStars,
      penaltyStars,
    }),
    familyWeekly,
    nextPeriodPreview,
  };
}

function enrichPlanReviewMessage<T extends ReturnType<typeof buildPlanSummaryShape>>(summary: T): T {
  const positiveActions = summary.completedTasks + summary.completedGoodHabits + summary.completedFamilyPromises;
  const tone = planReviewTone(summary.kind);
  return {
    ...summary,
    positiveActions,
    reviewTone: tone,
    reviewMessage: buildPlanReviewMessage(summary.kind, summary.planName, positiveActions, summary),
  };
}

function buildPlanSummaryShape() {
  return {
    planId: '',
    planName: '',
    kind: 'routine' as PlanKind,
    kindLabel: '',
    completedTasks: 0,
    completedGoodHabits: 0,
    completedPenaltyHabits: 0,
    completedFamilyPromises: 0,
    earnedStars: 0,
    penaltyStars: 0,
    positiveActions: 0,
    reviewTone: 'rhythm' as const,
    reviewMessage: '',
  };
}

function planReviewTone(kind: PlanKind): FamilyReportSummary['planBreakdown'][number]['reviewTone'] {
  if (kind === 'goal') return 'milestone';
  if (kind === 'cycle') return 'consistency';
  if (kind === 'container') return 'overview';
  return 'rhythm';
}

function buildPlanReviewMessage(
  kind: PlanKind,
  planName: string,
  positiveActions: number,
  summary: ReturnType<typeof buildPlanSummaryShape>,
): string {
  if (kind === 'goal') {
    return positiveActions > 0
      ? `${planName}本周期推进了 ${positiveActions} 个里程碑/行动，适合和孩子确认离验收目标又近了哪一步。`
      : `${planName}是目标型计划，建议下周期先补一个小里程碑，避免目标停留在口号。`;
  }
  if (kind === 'cycle') {
    return positiveActions > 0
      ? `${planName}本周期留下了 ${positiveActions} 次坚持记录，重点是保护频率和兴趣，不急着追求完成百分比。`
      : `${planName}是周期型计划，下周期可以先恢复一次稳定发生。`;
  }
  if (kind === 'container') {
    return positiveActions > 0
      ? `${planName}本周期关联了 ${positiveActions} 个进展，适合从全局看哪些子计划需要加力或减负。`
      : `${planName}是总计划，建议先拆出 1-3 个本周真正要推进的子计划。`;
  }
  if (summary.completedFamilyPromises > 0) {
    return `${planName}里有 ${summary.completedFamilyPromises} 个心愿兑现，说明家庭承诺正在被认真执行。`;
  }
  return positiveActions > 0
    ? `${planName}本周期有 ${positiveActions} 个执行记录，重点是让日常节奏更稳定。`
    : `${planName}是作息/节奏型计划，下周期先守住一个固定时段就很好。`;
}

function buildEncouragement(summary: {
  completedTasks: number;
  completedGoodHabits: number;
  completedPenaltyHabits: number;
  completedFamilyPromises: number;
  earnedStars: number;
  penaltyStars: number;
}) {
  const totalPositiveActions = summary.completedTasks + summary.completedGoodHabits + summary.completedFamilyPromises;
  const headline = totalPositiveActions > 0
    ? `这个周期，全家一起完成了 ${totalPositiveActions} 个值得被看见的小进步`
    : '这个周期先从轻一点开始，下一步把节奏慢慢找回来';

  const familyMessage = summary.completedFamilyPromises > 0
    ? `其中有 ${summary.completedFamilyPromises} 个孩子兑换后的心愿被家长兑现了，这会让孩子感到“我的努力真的有回应”。`
    : totalPositiveActions > 0
    ? `这些完成项不是冷冰冰的数字，而是每天坚持、提醒、配合和努力留下来的痕迹。`
    : '没有关系，家庭节奏偶尔会被打乱，重要的是系统帮你们重新接住下一步。';

  const childMessage = summary.earnedStars > 0
    ? `你通过行动获得了 ${summary.earnedStars} 颗星星，说明认真做过的事情都会被记录、被看见。`
    : '这一轮先把一件小事做好就很棒，下一次星星会从第一个行动开始。';

  const parentMessage = summary.completedFamilyPromises > 0
    ? `本周期已经兑现了 ${summary.completedFamilyPromises} 个心愿，建议把这类承诺继续放进家庭日程，保护孩子对积分系统的信任。`
    : summary.completedPenaltyHabits > 0
    ? `本周期有 ${summary.completedPenaltyHabits} 次需要提醒的行为，建议下周期少讲道理，多提前安排环境和提醒点。`
    : '本周期没有明显的负向提醒，可以继续用鼓励和稳定节奏来保护孩子的动力。';

  return {
    headline,
    familyMessage,
    childMessage,
    parentMessage,
  };
}

function buildNextPeriodPreview(
  period: FamilyReportPeriodRange,
  tasks: FamilyReportTaskInput[],
  planNames: Map<string, string>,
  previewLimit: number,
) {
  const items = tasks
    .filter(task => task.status !== 'completed' && isWithinPeriod(task.deadline || task.startTime || task.createdAt, period))
    .sort((a, b) => {
      const aTime = new Date(a.deadline || a.startTime || a.createdAt || 0).getTime();
      const bTime = new Date(b.deadline || b.startTime || b.createdAt || 0).getTime();
      return aTime - bTime;
    })
    .slice(0, previewLimit)
    .map(task => ({
      id: task.id,
      title: task.title,
      planId: task.planId,
      planName: task.planId ? planNames.get(task.planId) || '未归属计划' : '未归属计划',
      startsAt: task.startTime,
      deadline: task.deadline,
      importance: Math.abs(task.rewardStars) >= 8 || isFamilyPromiseTask(task) ? 'important' as const : 'normal' as const,
    }));

  return {
    period,
    items,
    summary: items.length > 0
      ? `下个周期有 ${items.length} 个事项值得提前看一眼，系统会优先提醒重要安排。`
      : '下个周期暂时没有必须提前预告的事项，可以保持轻松节奏。',
  };
}

function buildFamilyWeekly(input: {
  period: FamilyReportPeriodRange;
  completedTasks: number;
  completedGoodHabits: number;
  completedPenaltyHabits: number;
  completedFamilyPromises: number;
  earnedStars: number;
  penaltyStars: number;
  tasks: FamilyReportTaskInput[];
  nextPeriod?: FamilyReportPeriodRange;
}) {
  const totalPositive = input.completedTasks + input.completedGoodHabits + input.completedFamilyPromises;
  const childHighlights: string[] = [];
  const parentFocus: string[] = [];

  if (input.completedTasks > 0) {
    childHighlights.push(`完成了 ${input.completedTasks} 个任务，说明每天的小行动正在积累。`);
  }
  if (input.completedGoodHabits > 0) {
    childHighlights.push(`坚持了 ${input.completedGoodHabits} 次好习惯，这是最值得被夸奖的稳定进步。`);
  }
  if (input.earnedStars > 0) {
    childHighlights.push(`通过努力获得 ${input.earnedStars} 颗星星，认真做过的事情都被记录下来了。`);
  }
  if (childHighlights.length === 0) {
    childHighlights.push('这一轮先不用追求很多，选一件最容易开始的小事做起来就很好。');
  }

  if (input.completedFamilyPromises > 0) {
    parentFocus.push(`已经兑现 ${input.completedFamilyPromises} 个心愿，孩子会更相信“努力有回应”。`);
  } else {
    parentFocus.push('下个周期可以提前安排一个小心愿兑现，让积分系统更有温度。');
  }
  if (input.completedPenaltyHabits > 0) {
    parentFocus.push(`出现 ${input.completedPenaltyHabits} 次纠正提醒，建议提前布置环境和提醒点，少临时批评。`);
  }
  if (input.penaltyStars > 0) {
    parentFocus.push(`本周期扣减 ${input.penaltyStars} 颗星星，复盘时重点讲“下次怎么做”，不要只讲扣分。`);
  }

  const nextTasks = input.nextPeriod
    ? input.tasks.filter(task => task.status !== 'completed' && isWithinPeriod(task.deadline || task.startTime || task.createdAt, input.nextPeriod!))
    : [];
  const urgentImportant = nextTasks.filter(task => Math.abs(task.rewardStars) >= 8 || isFamilyPromiseTask(task)).length;
  const importantNotUrgent = nextTasks.filter(task => task.isHabit && task.rewardStars >= 0).length;
  const reduceOrDefer = Math.max(0, nextTasks.length - urgentImportant - importantNotUrgent);
  const message = urgentImportant > 0
    ? `下个周期先处理 ${urgentImportant} 个重要事项，再安排普通任务。`
    : nextTasks.length > 6
    ? '下个周期事项偏多，建议先做减法，避免孩子只感到压力。'
    : '下个周期节奏不重，可以稳住一两个好习惯，再留出亲子时间。';

  return {
    title: `${periodLabel(input.period.type)}家庭成长复盘`,
    opening: totalPositive > 0
      ? `这一轮全家留下了 ${totalPositive} 个可见进展。复盘的重点不是比较，而是让孩子看到努力真的会被看见。`
      : '这一轮家庭节奏可能被打断了，复盘可以先帮全家重新找到下一步。',
    childHighlights,
    parentFocus,
    quadrantAdvice: {
      urgentImportant,
      importantNotUrgent,
      reduceOrDefer,
      message,
    },
  };
}

function periodLabel(period: FamilyReportPeriod): string {
  if (period === 'month') return '月度';
  if (period === 'term') return '学期';
  if (period === 'year') return '年度';
  return '本周';
}
