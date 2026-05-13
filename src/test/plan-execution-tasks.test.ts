import { describe, expect, it } from 'vitest';
import { buildPlanExecutionTaskBundle, buildTaskDateTime, findPlanExecutionConflicts } from '../lib/planExecutionTasks';

describe('plan execution task bundle', () => {
  it('creates data layer tasks from a schedule plan', () => {
    const bundle = buildPlanExecutionTaskBundle({
      planId: 'plan-1',
      planName: '社区暑假模板',
      planType: '假期计划',
      planKind: 'routine',
      creatorId: 'parent-1',
      familyId: 'family-1',
      childIds: ['child-1'],
      sceneType: 'holiday',
      schedule: {
        wakeTime: '08:00',
        bedTime: '21:30',
        mealTimes: {
          breakfast: '08:20',
          lunch: '12:00',
          dinner: '18:30',
        },
        slots: [
          {
            label: '英语阅读',
            startTime: '09:00',
            endTime: '09:30',
            description: '阅读分级读物',
            icon: '📚',
          },
          {
            label: '自由休息',
            startTime: '10:00',
            endTime: '10:30',
            description: '放松',
            icon: '😴',
          },
        ],
      },
    });

    expect(bundle.drafts.map(draft => draft.title)).toContain('英语阅读');
    expect(bundle.tasks[0]).toMatchObject({
      planId: 'plan-1',
      title: '英语阅读',
      creatorId: 'parent-1',
      assigneeIds: ['child-1'],
      status: 'pending',
      completed: false,
    });
    expect(bundle.tasks[0].startTime).toContain('T');
  });

  it('falls back to creator when no child is selected', () => {
    const bundle = buildPlanExecutionTaskBundle({
      planId: 'plan-2',
      planName: '钢琴考级',
      planKind: 'goal',
      creatorId: 'parent-1',
      childIds: [],
    });

    expect(bundle.tasks[0].assigneeIds).toEqual(['parent-1']);
    expect(bundle.tasks[0].title).toContain('确定验收目标');
  });

  it('normalizes HH:mm into an ISO timestamp', () => {
    const timestamp = buildTaskDateTime('18:45');
    const date = new Date(timestamp);

    expect(date.getHours()).toBe(18);
    expect(date.getMinutes()).toBe(45);
  });

  it('detects overlapping execution tasks for the same child', () => {
    const bundle = buildPlanExecutionTaskBundle({
      planId: 'plan-3',
      planName: '晚间计划',
      planKind: 'routine',
      creatorId: 'parent-1',
      childIds: ['child-1'],
      schedule: {
        wakeTime: '07:00',
        bedTime: '21:00',
        mealTimes: {
          breakfast: '07:30',
          lunch: '12:00',
          dinner: '18:30',
        },
        slots: [
          {
            label: '钢琴练习',
            startTime: '19:00',
            endTime: '19:30',
            description: '日常练习',
            icon: '🎹',
          },
        ],
      },
    });

    const conflicts = findPlanExecutionConflicts(bundle.drafts, [
      {
        title: '英语课',
        startTime: new Date(2026, 4, 13, 19, 10).toISOString(),
        deadline: new Date(2026, 4, 13, 19, 50).toISOString(),
        assigneeIds: ['child-1'],
        status: 'pending',
      },
      {
        title: '妈妈会议',
        startTime: new Date(2026, 4, 13, 19, 10).toISOString(),
        deadline: new Date(2026, 4, 13, 19, 50).toISOString(),
        assigneeIds: ['parent-1'],
        status: 'pending',
      },
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      draftTitle: '钢琴练习',
      existingTitle: '英语课',
      assigneeIds: ['child-1'],
    });
  });

  it('ignores completed tasks when checking execution conflicts', () => {
    const conflicts = findPlanExecutionConflicts([
      {
        title: '阅读',
        description: '',
        startTime: '20:00',
        deadline: '20:30',
        assigneeIds: ['child-1'],
        rewardStars: 3,
        icon: 'BookOpen',
        type: 'study',
      },
    ], [
      {
        title: '已完成的阅读',
        startTime: new Date(2026, 4, 13, 20, 10).toISOString(),
        deadline: new Date(2026, 4, 13, 20, 40).toISOString(),
        assigneeIds: ['child-1'],
        status: 'completed',
      },
    ]);

    expect(conflicts).toHaveLength(0);
  });
});
