import { describe, expect, it } from 'vitest';
import { buildNextPeriodScheduleAdjustment } from '../domain/familyScheduleAdjustment';
import type { Task } from '../types';

describe('下周期家庭安排建议', () => {
  const period = {
    type: 'week' as const,
    start: '2026-05-18T00:00:00.000Z',
    end: '2026-05-24T23:59:59.999Z',
  };

  it('优先把孩子兑换后的心愿安排进父母计划', () => {
    const tasks: Task[] = [
      {
        id: 'promise-1',
        title: '兑现心愿：周末去科技馆',
        description: '心愿ID:reward-trip',
        type: 'family_promise',
        startTime: '2026-05-18T10:00:00.000Z',
        deadline: '2026-05-20T10:00:00.000Z',
        assigneeIds: ['parent-1'],
        creatorId: 'parent-1',
        rewardStars: 0,
        status: 'pending',
        icon: 'Gift',
      },
      {
        id: 'study-1',
        title: '准备英语演讲',
        description: '',
        type: 'study',
        startTime: '2026-05-19T10:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 10,
        status: 'pending',
        icon: 'Book',
      },
    ];

    const adjustment = buildNextPeriodScheduleAdjustment(tasks, period);

    expect(adjustment.headline).toContain('孩子心愿');
    expect(adjustment.suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'family-promises',
        priority: 'high',
        actionTarget: 'tasks',
      }),
      expect.objectContaining({
        id: 'important-first',
        actionTarget: 'quadrant',
      }),
    ]));
    expect(adjustment.actionPlan).toContainEqual(expect.objectContaining({
      id: 'confirm-family-promises',
      type: 'confirm',
      priority: 'high',
      taskIds: ['promise-1'],
    }));
    expect(adjustment.actionPlan).toContainEqual(expect.objectContaining({
      id: 'keep-important',
      type: 'keep',
    }));
  });

  it('任务压力过高时主动建议减法', () => {
    const tasks = Array.from({ length: 8 }, (_, index): Task => ({
      id: `task-${index}`,
      title: `任务 ${index}`,
      description: '',
      type: 'daily',
      startTime: '2026-05-19T10:00:00.000Z',
      assigneeIds: ['child-1'],
      creatorId: 'parent-1',
      rewardStars: 3,
      status: 'pending',
      icon: 'ListTodo',
    }));

    const adjustment = buildNextPeriodScheduleAdjustment(tasks, period);

    expect(adjustment.pressureLevel).toBe('busy');
    expect(adjustment.suggestions).toContainEqual(expect.objectContaining({
      id: 'reduce-load',
      priority: 'high',
    }));
    expect(adjustment.actionPlan).toContainEqual(expect.objectContaining({
      id: 'reduce-low-value',
      type: 'reduce',
      priority: 'high',
    }));
  });

  it('结合公共节假日和突发事件给出下周期调整提醒', () => {
    const tasks: Task[] = [
      {
        id: 'travel-1',
        title: '兑现心愿：周末去科技馆',
        description: '心愿ID:reward-trip',
        type: 'family_promise',
        startTime: '2026-05-23T10:00:00.000Z',
        assigneeIds: ['parent-1'],
        creatorId: 'parent-1',
        rewardStars: 0,
        status: 'pending',
        icon: 'Gift',
      },
    ];

    const adjustment = buildNextPeriodScheduleAdjustment(tasks, period, {
      region: '北京',
      publicCalendarSignals: [
        {
          id: 'emergency-1',
          type: 'emergency',
          title: '极端天气预警',
          region: '北京',
          startDate: '2026-05-23T00:00:00.000Z',
          endDate: '2026-05-23T23:59:59.999Z',
          severity: 'critical',
          sourceName: '应急管理部门',
          verifiedAt: '2026-05-13T00:00:00.000Z',
          affectsTravel: true,
        },
      ],
    });

    expect(adjustment.publicCalendar?.headline).toContain('突发公共事件');
    expect(adjustment.suggestions[0]).toMatchObject({
      id: 'public-calendar-emergency-reduce-load',
      priority: 'high',
      actionTarget: 'quadrant',
    });
    expect(adjustment.actionPlan).toContainEqual(expect.objectContaining({
      id: 'public-emergency-reduce-load',
      type: 'reduce',
      priority: 'high',
    }));
  });
});
