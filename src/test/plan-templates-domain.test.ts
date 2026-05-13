import { describe, expect, it } from 'vitest';
import {
  dailyScheduleTemplateToFamilyPlan,
  planSceneTemplateToFamilyPlan,
  PLAN_SCENES,
  type DailyScheduleTemplate,
} from '../lib/planTemplates';
import { schedulePlanToTaskDrafts } from '../domain/familyPlanning';

const schedule: DailyScheduleTemplate = {
  wakeTime: '07:00',
  bedTime: '21:00',
  mealTimes: {
    breakfast: '07:30',
    lunch: '12:00',
    dinner: '18:30',
  },
  slots: [
    {
      label: '作业时间',
      startTime: '17:30',
      endTime: '18:30',
      description: '完成学校作业',
      icon: 'BookOpen',
    },
    {
      label: '家庭时间',
      startTime: '19:15',
      endTime: '20:00',
      description: '亲子活动、阅读',
      icon: 'Users',
    },
  ],
};

describe('计划模板领域转换', () => {
  it('可以把日程模板转换为标准家庭日程方案', () => {
    const plan = dailyScheduleTemplateToFamilyPlan(schedule, {
      title: '工作日模板',
      sceneType: 'weekday',
      familyId: 'family-1',
      childIds: ['child-1'],
      startDate: '2026-05-13',
      endDate: '2026-06-13',
    });

    expect(plan).toMatchObject({
      title: '工作日模板',
      familyId: 'family-1',
      scenario: 'school_day',
      source: 'template',
      startDate: '2026-05-13',
      endDate: '2026-06-13',
    });
    expect(plan.slots).toHaveLength(2);
    expect(plan.slots[0]).toMatchObject({
      title: '作业时间',
      category: 'study',
      rewardStars: 6,
      childIds: ['child-1'],
    });
    expect(plan.slots[1]).toMatchObject({
      title: '家庭时间',
      category: 'family',
      caregiverRequired: true,
    });
  });

  it('可以把内置计划场景转换为标准家庭日程方案', () => {
    const holidayScene = PLAN_SCENES.find(scene => scene.type === 'holiday');
    expect(holidayScene).toBeTruthy();

    const plan = planSceneTemplateToFamilyPlan(holidayScene!, {
      childIds: ['child-1', 'child-2'],
    });

    expect(plan.title).toBe('假期计划');
    expect(plan.scenario).toBe('holiday');
    expect(plan.source).toBe('template');
    expect(plan.summary).toContain('寒暑假');
    expect(plan.slots.length).toBeGreaterThan(0);
    expect(plan.slots[0].childIds).toEqual(['child-1', 'child-2']);
  });

  it('模板日程转换后可以继续拆成任务草稿', () => {
    const plan = dailyScheduleTemplateToFamilyPlan(schedule, {
      title: '工作日模板',
      sceneType: 'weekday',
      childIds: ['child-1'],
    });

    const drafts = schedulePlanToTaskDrafts(plan);

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      title: '作业时间',
      assigneeIds: ['child-1'],
      rewardStars: 6,
      type: 'study',
    });
  });
});
