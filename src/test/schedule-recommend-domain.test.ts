import { describe, expect, it } from 'vitest';
import {
  childProfileToFamilyPlanningProfile,
  applyRecommendationConsent,
  scheduleRecommendationToDailyScheduleTemplate,
  scheduleRecommendationToFamilyPlan,
  type ChildProfile,
  type ScheduleRecommendation,
} from '../lib/scheduleRecommendAI';
import { schedulePlanToTaskDrafts } from '../domain/familyPlanning';

const childProfile: ChildProfile = {
  gender: 'girl',
  age: 8,
  grade: '三年级',
  city: '上海',
  schoolType: '公立',
  strongSubjects: ['语文'],
  weakSubjects: ['数学'],
  existingInterests: ['游泳'],
  existingSchedules: ['周三 18:00-19:00 游泳'],
  personality: ['专注力好'],
  personalityOther: '',
  homeworkDuration: 60,
  freeTimePerDay: 2,
  parentExpectation: ['打好学科基础'],
  expectationOther: '',
  budget: 3000,
  screenTime: '每天不超过30分钟',
  healthNotes: '轻微过敏',
  otherNotes: '希望周末多户外',
};

const recommendation: ScheduleRecommendation = {
  summary: '建议保持稳定作息，兼顾数学基础和户外运动。',
  weekdaySchedule: [
    {
      time: '17:30-18:30',
      duration: '60分钟',
      activity: '完成数学作业',
      notes: '先做基础题，再整理错题',
      icon: 'BookOpen',
    },
    {
      time: '19:30-20:00',
      duration: '30分钟',
      activity: '亲子阅读',
      notes: '家长陪伴讨论故事内容',
      icon: 'Book',
    },
  ],
  weekendSchedule: [
    {
      time: '09:00-10:00',
      duration: '60分钟',
      activity: '户外运动',
      notes: '优先选择公园散步或跳绳',
      icon: 'Dumbbell',
    },
  ],
  recommendedActivities: [],
  avoidActivities: [],
  parentTips: ['把数学练习拆成更小任务', '周末保留户外时间'],
  subjectAdvice: [],
  developmentPath: [],
};

describe('AI日程推荐领域转换', () => {
  it('可以把孩子画像转换为家庭规划画像', () => {
    const profile = childProfileToFamilyPlanningProfile(childProfile, 'child-a');

    expect(profile.city).toBe('上海');
    expect(profile.children[0]).toMatchObject({
      id: 'child-a',
      gender: 'girl',
      grade: '三年级',
      homeworkMinutes: 60,
    });
    expect(profile.constraints).toContain('周三 18:00-19:00 游泳');
    expect(profile.constraints).toContain('健康注意: 轻微过敏');
  });

  it('可以把AI推荐转换为标准家庭日程方案', () => {
    const plan = scheduleRecommendationToFamilyPlan(recommendation, childProfile, {
      childId: 'child-a',
      includeWeekend: true,
    });

    expect(plan.source).toBe('ai');
    expect(plan.scenario).toBe('school_day');
    expect(plan.summary).toContain('稳定作息');
    expect(plan.slots).toHaveLength(3);
    expect(plan.slots[0]).toMatchObject({
      id: 'weekday-1',
      title: '完成数学作业',
      startTime: '17:30',
      endTime: '18:30',
      category: 'study',
      childIds: ['child-a'],
      rewardStars: 8,
    });
    expect(plan.slots[1].caregiverRequired).toBe(true);
    expect(plan.parentTips).toContain('周末保留户外时间');
  });

  it('转换后的标准日程可以继续拆成任务草稿', () => {
    const plan = scheduleRecommendationToFamilyPlan(recommendation, childProfile, {
      childId: 'child-a',
    });

    const drafts = schedulePlanToTaskDrafts(plan);

    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      title: '完成数学作业',
      assigneeIds: ['child-a'],
      rewardStars: 8,
      type: 'study',
    });
  });

  it('可以把AI推荐转换为计划详情页可识别的日程模板', () => {
    const schedule = scheduleRecommendationToDailyScheduleTemplate(recommendation, 'weekday');

    expect(schedule.wakeTime).toBe('17:30');
    expect(schedule.bedTime).toBe('20:00');
    expect(schedule.mealTimes.dinner).toBe('18:30');
    expect(schedule.slots[0]).toMatchObject({
      label: '完成数学作业',
      startTime: '17:30',
      endTime: '18:30',
      description: '先做基础题，再整理错题',
    });
  });

  it('免费商业模式下保留兴趣班和学习资源推荐，同时仍走安全过滤边界', () => {
    const source: ScheduleRecommendation = {
      ...recommendation,
      recommendedActivities: [
        {
          name: '数学思维课',
          category: '思维',
          reason: '匹配数学薄弱项',
          weeklyHours: 2,
          recommendedAge: '8-10岁',
          priority: '推荐',
        },
      ],
      subjectAdvice: [
        {
          subject: '数学',
          status: '薄弱',
          strategy: '先巩固计算，再做应用题',
          resources: ['本地数学课程'],
        },
      ],
    };

    const result = applyRecommendationConsent(source, {
      version: 'recommendation_consent_v1',
      updatedAt: '',
      categories: {
        education: false,
        travel: false,
        healthcare: false,
      },
    });

    expect(result.recommendation.weekdaySchedule).toHaveLength(2);
    expect(result.recommendation.recommendedActivities).toHaveLength(1);
    expect(result.recommendation.subjectAdvice[0].resources).toHaveLength(1);
    expect(result.hiddenSections).toHaveLength(0);
  });
});
