export interface FamilyButlerAdviceInput {
  tasks: Array<{
    id: string;
    title?: string;
    description?: string;
    status: string;
    rewardStars?: number;
    isHabit?: boolean;
    type?: string;
    planId?: string;
  }>;
  rewards: Array<{
    id: string;
    name?: string;
    cost: number;
    status?: string;
  }>;
  currentStars?: number;
}

export interface FamilyButlerContextSummary {
  pendingTasks: number;
  reviewingTasks: number;
  completedTasks: number;
  habitTasks: number;
  familyPromiseTasks: number;
  availableWishes: number;
  affordableWishes: number;
  activePlanCount: number;
  pressureLevel: 'light' | 'balanced' | 'busy';
}

export interface FamilyButlerAction {
  id: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  actionTarget: 'quadrant' | 'tasks' | 'rewards' | 'reports';
  actionLabel: string;
}

export interface FamilyButlerAdvice {
  summary: FamilyButlerContextSummary;
  suggestions: string[];
  actions: FamilyButlerAction[];
  headline: string;
}

export function isFamilyPromiseLike(task: { title?: string; description?: string; type?: string }): boolean {
  return task.type === 'family_promise'
    || task.title?.startsWith('兑现心愿：') === true
    || task.description?.includes('心愿ID:') === true;
}

export function buildFamilyButlerContextSummary(input: FamilyButlerAdviceInput): FamilyButlerContextSummary {
  const activeTasks = input.tasks.filter(task => task.status !== 'completed');
  const pendingTasks = input.tasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length;
  const reviewingTasks = input.tasks.filter(task => task.status === 'reviewing').length;
  const completedTasks = input.tasks.filter(task => task.status === 'completed').length;
  const habitTasks = activeTasks.filter(task => task.isHabit).length;
  const familyPromiseTasks = activeTasks.filter(isFamilyPromiseLike).length;
  const availableWishes = input.rewards.filter(reward => reward.status !== 'redeemed').length;
  const affordableWishes = input.rewards.filter(reward => reward.status !== 'redeemed' && reward.cost <= (input.currentStars || 0)).length;
  const activePlanCount = new Set(activeTasks.map(task => task.planId).filter(Boolean)).size;
  const pressureScore = pendingTasks + reviewingTasks * 2 + familyPromiseTasks * 2;
  const pressureLevel = pressureScore >= 8 ? 'busy' : pressureScore >= 4 ? 'balanced' : 'light';

  return {
    pendingTasks,
    reviewingTasks,
    completedTasks,
    habitTasks,
    familyPromiseTasks,
    availableWishes,
    affordableWishes,
    activePlanCount,
    pressureLevel,
  };
}

export function buildFamilyButlerAdvice(input: FamilyButlerAdviceInput): FamilyButlerAdvice {
  const summary = buildFamilyButlerContextSummary(input);
  const actions = buildFamilyButlerActions(summary);
  const suggestions = buildFamilyButlerSuggestionsFromSummary(summary, actions);

  return {
    summary,
    actions,
    suggestions,
    headline: buildHeadline(summary),
  };
}

function buildFamilyButlerActions(summary: FamilyButlerContextSummary): FamilyButlerAction[] {
  const actions: FamilyButlerAction[] = [];

  if (summary.familyPromiseTasks > 0) {
    actions.push({
      id: 'confirm-family-promises',
      title: '先安排孩子心愿',
      message: `有 ${summary.familyPromiseTasks} 个孩子兑换后的心愿需要父母安排兑现。`,
      priority: 'high',
      actionTarget: 'tasks',
      actionLabel: '去确认',
    });
  }
  if (summary.reviewingTasks > 0) {
    actions.push({
      id: 'confirm-reviewing',
      title: '确认待审核打卡',
      message: `先确认 ${summary.reviewingTasks} 个待审核打卡，让孩子看到努力已经被看见。`,
      priority: 'medium',
      actionTarget: 'tasks',
      actionLabel: '去任务页',
    });
  }
  if (summary.pressureLevel === 'busy') {
    actions.push({
      id: 'open-quadrant',
      title: '本周先做取舍',
      message: '当前家庭待办偏满，建议打开四象限，先保住重要事项，再主动延后低价值安排。',
      priority: 'high',
      actionTarget: 'quadrant',
      actionLabel: '看四象限',
    });
  }
  if (summary.affordableWishes > 0) {
    actions.push({
      id: 'review-affordable-wishes',
      title: '让努力看到回报',
      message: `当前已有 ${summary.affordableWishes} 个可兑换心愿，可以安排一次正向反馈。`,
      priority: 'medium',
      actionTarget: 'rewards',
      actionLabel: '看心愿',
    });
  }
  if (actions.length === 0) {
    actions.push({
      id: 'keep-small-rhythm',
      title: '保留一个小节奏',
      message: '现在节奏比较轻，可以先建立一个小计划或一个好习惯。',
      priority: 'low',
      actionTarget: 'tasks',
      actionLabel: '去任务页',
    });
  }

  return actions;
}

function buildFamilyButlerSuggestionsFromSummary(summary: FamilyButlerContextSummary, actions: FamilyButlerAction[]): string[] {
  const suggestions = actions.map(action => action.message);
  if (summary.pendingTasks > 0 && summary.pressureLevel !== 'busy') {
    suggestions.push(`今天不用追求全部完成，先选 ${Math.min(summary.pendingTasks, 2)} 个最清楚的行动做起来。`);
  }
  if (summary.habitTasks > 0) {
    suggestions.push(`有 ${summary.habitTasks} 个习惯类事项，适合用稳定提醒和鼓励来维持，不建议临时加压。`);
  }
  if (summary.activePlanCount > 0) {
    suggestions.push(`现在有 ${summary.activePlanCount} 个计划正在承载任务，周报/月报会自动把这些进展整理给全家看。`);
  }
  return suggestions.slice(0, 5);
}

function buildHeadline(summary: FamilyButlerContextSummary): string {
  if (summary.familyPromiseTasks > 0) return '先保护孩子对积分和心愿的信任';
  if (summary.pressureLevel === 'busy') return '当前家庭待办偏满，先做取舍';
  if (summary.reviewingTasks > 0) return '先确认孩子已经完成的努力';
  if (summary.pendingTasks > 0) return '今天先守住一两个清楚行动';
  return '当前节奏较轻，适合建立一个稳定小习惯';
}
