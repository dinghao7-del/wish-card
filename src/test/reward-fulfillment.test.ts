import { describe, expect, it } from 'vitest';
import { buildRewardFulfillmentTask, hasRewardFulfillmentTask, suggestRewardFulfillmentDeadline } from '../domain/rewardFulfillment';
import type { Member, Reward } from '../types';

describe('心愿兑现任务', () => {
  const parent: Member = {
    id: 'parent-1',
    name: '妈妈',
    avatar: '',
    stars: 0,
    role: 'parent',
  };
  const child: Member = {
    id: 'child-1',
    name: '小明',
    avatar: '',
    stars: 80,
    role: 'child',
  };
  const reward: Reward = {
    id: 'reward-trip',
    name: '周末去科技馆',
    description: '希望爸爸妈妈周末带我去一次科技馆',
    cost: 50,
    icon: 'Gift',
    image: '',
    category: 'experience',
  };

  it('孩子兑换亲子权益后生成分配给父母的兑现任务', () => {
    const task = buildRewardFulfillmentTask({
      reward,
      redeemer: child,
      parents: [parent],
      approver: parent,
      redeemedAt: '2026-05-13T10:00:00.000Z',
    });

    expect(task).toMatchObject({
      title: '兑现心愿：周末去科技馆',
      type: 'family_promise',
      assigneeIds: ['parent-1'],
      creatorId: 'parent-1',
      rewardStars: 0,
      status: 'pending',
    });
    expect(task.deadline).toBe('2026-05-17T15:59:59.999Z');
    expect(task.description).toContain('小明已经用 50 颗星星兑换了这个心愿');
    expect(task.description).toContain('心愿ID:reward-trip');
  });

  it('能识别同一个心愿是否已经生成过兑现任务', () => {
    expect(hasRewardFulfillmentTask([
      {
        title: '兑现心愿：周末去科技馆',
        description: '心愿ID:reward-trip',
      },
    ], 'reward-trip')).toBe(true);
    expect(hasRewardFulfillmentTask([], 'reward-trip')).toBe(false);
  });

  it('为不同类型的亲子权益给出轻量兑现提醒时间', () => {
    expect(suggestRewardFulfillmentDeadline(reward, '2026-05-13T10:00:00.000Z')).toBe('2026-05-17T15:59:59.999Z');
    expect(suggestRewardFulfillmentDeadline({
      ...reward,
      name: '暑假去海边玩',
      description: '暑假全家旅行',
    }, '2026-05-13T10:00:00.000Z')).toBe('2026-08-31T15:59:59.999Z');
  });
});
