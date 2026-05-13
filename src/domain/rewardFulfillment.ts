import type { Member, Reward, Task } from '../types';

export function buildRewardFulfillmentTask(params: {
  reward: Reward;
  redeemer?: Member | null;
  parents: Member[];
  approver: Member;
  redeemedAt: string;
}): Task {
  const parentAssigneeIds = params.parents.length > 0
    ? params.parents.map(parent => parent.id)
    : [params.approver.id];
  const redeemerName = params.redeemer?.name || '孩子';
  const deadline = suggestRewardFulfillmentDeadline(params.reward, params.redeemedAt);

  return {
    id: `fulfill-${params.reward.id}`,
    title: `兑现心愿：${params.reward.name}`,
    description: [
      `${redeemerName}已经用 ${params.reward.cost} 颗星星兑换了这个心愿，请家长安排时间兑现。`,
      params.reward.description ? `心愿说明：${params.reward.description}` : '',
      `心愿ID:${params.reward.id}`,
    ].filter(Boolean).join('\n'),
    type: 'family_promise',
    startTime: params.redeemedAt,
    deadline,
    assigneeIds: parentAssigneeIds,
    creatorId: params.approver.id,
    planId: params.reward.planId,
    rewardStars: 0,
    status: 'pending',
    icon: 'Gift',
    isHabit: false,
  };
}

export function hasRewardFulfillmentTask(tasks: Array<Pick<Task, 'title' | 'description'>>, rewardId: string): boolean {
  return tasks.some(task =>
    task.description?.includes(`心愿ID:${rewardId}`)
  );
}

export function isRewardFulfillmentTask(task: Pick<Task, 'type' | 'title' | 'description'>): boolean {
  return task.type === 'family_promise'
    || task.title.startsWith('兑现心愿：')
    || task.description?.includes('心愿ID:') === true;
}

export function suggestRewardFulfillmentDeadline(reward: Reward, redeemedAt: string): string {
  const base = new Date(redeemedAt);
  const text = `${reward.name} ${reward.description} ${reward.category}`.toLowerCase();

  if (/(周末|星期六|星期日|weekend|科技馆|游乐场|公园|看电影)/.test(text)) {
    return endOfNextSunday(base).toISOString();
  }

  if (/(暑假|夏令营|夏天|summer)/.test(text)) {
    const year = base.getMonth() >= 8 ? base.getFullYear() + 1 : base.getFullYear();
    return new Date(year, 7, 31, 23, 59, 59, 999).toISOString();
  }

  if (/(寒假|冬令营|春节|winter)/.test(text)) {
    const year = base.getMonth() >= 2 ? base.getFullYear() + 1 : base.getFullYear();
    return new Date(year, 1, 28, 23, 59, 59, 999).toISOString();
  }

  const defaultDeadline = new Date(base);
  defaultDeadline.setDate(defaultDeadline.getDate() + 14);
  defaultDeadline.setHours(23, 59, 59, 999);
  return defaultDeadline.toISOString();
}

function endOfNextSunday(base: Date): Date {
  const result = new Date(base);
  const day = result.getDay();
  const daysUntilSunday = day === 0 ? 7 : 7 - day;
  result.setDate(result.getDate() + daysUntilSunday);
  result.setHours(23, 59, 59, 999);
  return result;
}
