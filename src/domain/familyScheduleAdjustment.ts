import type { Task } from '../types';
import type { FamilyReportPeriodRange } from './familyReports';
import { isRewardFulfillmentTask } from './rewardFulfillment';
import { buildPublicCalendarAdjustments, type PublicCalendarAdjustment, type PublicCalendarSignal } from './publicCalendarIntelligence';

export interface FamilyScheduleSuggestion {
  id: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionTarget: 'quadrant' | 'tasks' | 'rewards';
}

export interface FamilyScheduleAdjustment {
  headline: string;
  pressureLevel: 'light' | 'balanced' | 'busy';
  suggestions: FamilyScheduleSuggestion[];
  actionPlan: FamilyScheduleAction[];
  publicCalendar?: {
    headline: string;
    adjustments: PublicCalendarAdjustment[];
  };
}

export interface FamilyScheduleAction {
  id: string;
  type: 'keep' | 'reduce' | 'defer' | 'confirm';
  title: string;
  message: string;
  taskIds: string[];
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
  actionTarget: 'quadrant' | 'tasks' | 'rewards';
}

export function buildNextPeriodScheduleAdjustment(
  tasks: Task[],
  period: FamilyReportPeriodRange,
  options: {
    region?: string;
    publicCalendarSignals?: PublicCalendarSignal[];
  } = {},
): FamilyScheduleAdjustment {
  const nextTasks = tasks.filter(task =>
    task.status !== 'completed'
    && !task.isHabit
    && isWithinPeriod(task.deadline || task.startTime || task.createdAt, period)
  );
  const promiseTasks = nextTasks.filter(isRewardFulfillmentTask);
  const importantTasks = nextTasks.filter(task => Math.abs(task.rewardStars) >= 8 || isRewardFulfillmentTask(task));
  const reviewingTasks = nextTasks.filter(task => task.status === 'reviewing');
  const pressureLevel = nextTasks.length >= 8 || importantTasks.length >= 4
    ? 'busy'
    : nextTasks.length >= 4 || importantTasks.length >= 2
      ? 'balanced'
      : 'light';

  const suggestions: FamilyScheduleSuggestion[] = [];

  if (promiseTasks.length > 0) {
    suggestions.push({
      id: 'family-promises',
      title: `先安排 ${promiseTasks.length} 个孩子心愿`,
      message: '这些是孩子用努力换来的家庭约定，建议提前定时间，避免临近周末才想起来。',
      priority: 'high',
      actionLabel: '看兑现待办',
      actionTarget: 'tasks',
    });
  }

  if (importantTasks.length > 0) {
    suggestions.push({
      id: 'important-first',
      title: `先守住 ${importantTasks.length} 个重要事项`,
      message: '下个周期不要追求全做完，先把重要任务放进家庭节奏里，再处理零碎事项。',
      priority: importantTasks.length >= 3 ? 'high' : 'medium',
      actionLabel: '看四象限',
      actionTarget: 'quadrant',
    });
  }

  if (reviewingTasks.length > 0) {
    suggestions.push({
      id: 'review-before-new',
      title: `先确认 ${reviewingTasks.length} 个待审核任务`,
      message: '先完成确认和反馈，再开启新的安排，孩子会更清楚哪些努力已经被看见。',
      priority: 'medium',
      actionLabel: '去任务页',
      actionTarget: 'tasks',
    });
  }

  if (pressureLevel === 'busy') {
    suggestions.push({
      id: 'reduce-load',
      title: '下个周期需要做减法',
      message: '任务量偏多，建议家长主动延后低价值事项，给孩子保留休息和兑现心愿的空间。',
      priority: 'high',
      actionLabel: '看四象限',
      actionTarget: 'quadrant',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: 'keep-rhythm',
      title: '保持轻松节奏',
      message: '下个周期压力不高，可以安排一个稳定好习惯，再留一点亲子时间。',
      priority: 'low',
      actionLabel: '去任务页',
      actionTarget: 'tasks',
    });
  }

  const publicCalendar = buildPublicCalendarAdjustments(options.publicCalendarSignals || [], tasks, {
    region: options.region,
    rangeStart: period.start,
    rangeEnd: period.end,
  });

  if (publicCalendar.adjustments.length > 0) {
    const topAdjustment = publicCalendar.adjustments[0];
    suggestions.unshift({
      id: `public-calendar-${topAdjustment.id}`,
      title: topAdjustment.title,
      message: topAdjustment.message,
      priority: topAdjustment.priority,
      actionLabel: topAdjustment.action === 'switch_to_holiday_schedule' ? '看假期安排' : '检查日程',
      actionTarget: topAdjustment.action === 'avoid_travel' || topAdjustment.action === 'reduce_load' ? 'quadrant' : 'tasks',
    });
  }
  const actionPlan = buildActionPlan({
    nextTasks,
    promiseTasks,
    importantTasks,
    reviewingTasks,
    pressureLevel,
    publicCalendarAdjustments: publicCalendar.adjustments,
  });

  return {
    headline: buildHeadline(pressureLevel, nextTasks.length, promiseTasks.length),
    pressureLevel,
    suggestions,
    actionPlan,
    publicCalendar: {
      headline: publicCalendar.headline,
      adjustments: publicCalendar.adjustments,
    },
  };
}

function buildActionPlan(input: {
  nextTasks: Task[];
  promiseTasks: Task[];
  importantTasks: Task[];
  reviewingTasks: Task[];
  pressureLevel: FamilyScheduleAdjustment['pressureLevel'];
  publicCalendarAdjustments: PublicCalendarAdjustment[];
}): FamilyScheduleAction[] {
  const actions: FamilyScheduleAction[] = [];

  if (input.promiseTasks.length > 0) {
    actions.push({
      id: 'confirm-family-promises',
      type: 'confirm',
      title: '确认孩子心愿兑现时间',
      message: '先把孩子已经兑换的愿望放进父母日程，保护积分系统的信任感。',
      taskIds: input.promiseTasks.map(task => task.id),
      priority: 'high',
      actionLabel: '去确认',
      actionTarget: 'tasks',
    });
  }

  if (input.importantTasks.length > 0) {
    actions.push({
      id: 'keep-important',
      type: 'keep',
      title: '保留下周期重要事项',
      message: `先保留 ${input.importantTasks.length} 个高价值任务，再安排零碎事项。`,
      taskIds: input.importantTasks.map(task => task.id),
      priority: input.importantTasks.length >= 3 ? 'high' : 'medium',
      actionLabel: '看四象限',
      actionTarget: 'quadrant',
    });
  }

  if (input.reviewingTasks.length > 0) {
    actions.push({
      id: 'confirm-reviewing',
      type: 'confirm',
      title: '先处理待审核',
      message: '先把已完成的努力确认掉，再开启新的安排。',
      taskIds: input.reviewingTasks.map(task => task.id),
      priority: 'medium',
      actionLabel: '去任务页',
      actionTarget: 'tasks',
    });
  }

  if (input.pressureLevel === 'busy') {
    const lowValueTasks = input.nextTasks
      .filter(task => Math.abs(task.rewardStars) < 5 && !isRewardFulfillmentTask(task))
      .slice(0, 5);
    actions.push({
      id: 'reduce-low-value',
      type: 'reduce',
      title: '减少低价值事项',
      message: lowValueTasks.length > 0
        ? `建议先减少或后移 ${lowValueTasks.length} 个低价值事项，给休息和重要任务留空间。`
        : '任务量偏满，建议用四象限主动做减法。',
      taskIds: lowValueTasks.map(task => task.id),
      priority: 'high',
      actionLabel: '做取舍',
      actionTarget: 'quadrant',
    });
  }

  for (const item of input.publicCalendarAdjustments.slice(0, 2)) {
    actions.push({
      id: `public-${item.id}`,
      type: item.action === 'switch_to_holiday_schedule' ? 'defer' : item.action === 'confirm_school_notice' ? 'confirm' : 'reduce',
      title: item.title,
      message: item.message,
      taskIds: item.affectedTaskIds,
      priority: item.priority,
      actionLabel: item.action === 'confirm_school_notice' ? '核对通知' : '调整安排',
      actionTarget: item.action === 'reduce_load' || item.action === 'avoid_travel' ? 'quadrant' : 'tasks',
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'keep-rhythm-action',
      type: 'keep',
      title: '保留一个稳定习惯',
      message: '下周期压力不高，先保留一个最容易坚持的小习惯。',
      taskIds: [],
      priority: 'low',
      actionLabel: '去任务页',
      actionTarget: 'tasks',
    });
  }

  return actions;
}

function buildHeadline(pressureLevel: FamilyScheduleAdjustment['pressureLevel'], taskCount: number, promiseCount: number): string {
  if (promiseCount > 0) {
    return `下个周期先把 ${promiseCount} 个孩子心愿安排进家庭节奏`;
  }
  if (pressureLevel === 'busy') {
    return `下个周期有 ${taskCount} 个待办，建议先做减法再执行`;
  }
  if (pressureLevel === 'balanced') {
    return `下个周期节奏适中，先排重要事项会更稳`;
  }
  return '下个周期压力不高，适合稳住习惯和亲子陪伴';
}

function isWithinPeriod(value: string | null | undefined, period: FamilyReportPeriodRange): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  const start = new Date(period.start).getTime();
  const end = new Date(period.end).getTime();
  return Number.isFinite(time) && Number.isFinite(start) && Number.isFinite(end) && time >= start && time <= end;
}
