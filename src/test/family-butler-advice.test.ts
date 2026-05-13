import { describe, expect, it } from 'vitest';
import { buildFamilyButlerAdvice } from '../domain/familyButlerAdvice';

describe('家庭管家统一建议', () => {
  it('优先输出心愿兑现、待审核和四象限取舍动作', () => {
    const advice = buildFamilyButlerAdvice({
      currentStars: 50,
      tasks: [
        {
          id: 'promise-1',
          title: '兑现心愿：周末去科技馆',
          description: '心愿ID:reward-trip',
          type: 'family_promise',
          status: 'pending',
          rewardStars: 0,
          planId: 'plan-family',
        },
        {
          id: 'review-1',
          title: '数学作业',
          description: '',
          status: 'reviewing',
          rewardStars: 10,
          planId: 'plan-study',
        },
        ...Array.from({ length: 4 }, (_, index) => ({
          id: `pending-${index}`,
          title: `待办 ${index}`,
          description: '',
          status: 'pending',
          type: 'daily',
          rewardStars: 3,
        })),
      ],
      rewards: [
        { id: 'reward-1', name: '看电影', cost: 30, status: 'available' },
      ],
    });

    expect(advice.headline).toContain('信任');
    expect(advice.summary).toMatchObject({
      familyPromiseTasks: 1,
      reviewingTasks: 1,
      affordableWishes: 1,
      pressureLevel: 'busy',
    });
    expect(advice.actions.map(action => action.id)).toEqual(expect.arrayContaining([
      'confirm-family-promises',
      'confirm-reviewing',
      'open-quadrant',
      'review-affordable-wishes',
    ]));
    expect(advice.suggestions.join('\n')).toContain('孩子兑换后的心愿');
  });
});
