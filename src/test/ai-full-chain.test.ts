import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppContext } from '../lib/voiceAssistant';
import type { ChildProfile, ScheduleRecommendation } from '../lib/scheduleRecommendAI';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../lib/supabase', () => {
  const supabase = {
    from: mocks.from,
    functions: {
      invoke: mocks.invoke,
    },
  };
  return {
    default: supabase,
    supabase,
  };
});

function mockAIConfig() {
  mocks.from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      like: vi.fn().mockResolvedValue({
        data: [
          { key: 'ai_enabled', value: 'true' },
          { key: 'ai_provider', value: 'minimax' },
          { key: 'ai_model', value: 'MiniMax-M2.7' },
          { key: 'ai_temperature', value: '0.7' },
          { key: 'ai_max_tokens', value: '8192' },
        ],
        error: null,
      }),
    }),
  });
}

const recommendation: ScheduleRecommendation = {
  summary: '建议用稳定作息承接课后学习和运动。',
  weekdaySchedule: [
    {
      time: '17:30-18:10',
      duration: '40分钟',
      activity: '完成数学作业',
      notes: '先做基础题',
      icon: 'BookOpen',
    },
    {
      time: '18:30-19:00',
      duration: '30分钟',
      activity: '跳绳运动',
      notes: '保持轻运动',
      icon: 'Dumbbell',
    },
  ],
  weekendSchedule: [
    {
      time: '09:00-10:00',
      duration: '60分钟',
      activity: '亲子阅读',
      notes: '家长陪伴讨论',
      icon: 'Book',
    },
  ],
  recommendedActivities: [
    {
      name: '游泳',
      category: '运动',
      reason: '兼顾体能和安全技能',
      weeklyHours: 2,
      recommendedAge: '6岁+',
      priority: '推荐',
    },
  ],
  avoidActivities: ['高强度连轴课程'],
  parentTips: ['每天只保留一到两个重点'],
  subjectAdvice: [
    {
      subject: '数学',
      status: '中等',
      strategy: '保持短时高频练习',
      resources: ['口算练习'],
    },
  ],
  developmentPath: [
    {
      phase: '当前阶段',
      timeRange: '1个月',
      focus: ['规律作息'],
      description: '先让家庭节奏稳定下来',
    },
  ],
};

describe('AI 全链路核心能力', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockAIConfig();
    const { clearAIConfigCache } = await import('../lib/voiceAssistant');
    clearAIConfigCache();
  });

  it('通过 ai-chat Edge Function 调用结构化 JSON，并能容忍代码块包裹', async () => {
    mocks.invoke.mockResolvedValue({
      data: { content: '```json\n{"intent":"chat","params":{"response":"你好"},"confidence":0.9}\n```' },
      error: null,
    });

    const { callAIJson } = await import('../lib/voiceAssistant');
    const result = await callAIJson<{ intent: string; params: { response: string } }>('你好', '只返回JSON');

    expect(result).toEqual({
      intent: 'chat',
      params: { response: '你好' },
      confidence: 0.9,
    });
    expect(mocks.invoke).toHaveBeenCalledWith('ai-chat', expect.objectContaining({
      body: expect.objectContaining({
        provider: 'minimax',
        model: 'MiniMax-M2.7',
        response_format: 'json',
      }),
    }));
  });

  it('AI 日程推荐结果可以继续转换为计划和任务草稿', async () => {
    mocks.invoke.mockResolvedValue({
      data: { content: JSON.stringify(recommendation) },
      error: null,
    });

    const {
      generateScheduleRecommendation,
      scheduleRecommendationToFamilyPlan,
    } = await import('../lib/scheduleRecommendAI');
    const { schedulePlanToTaskDrafts } = await import('../domain/familyPlanning');

    const profile: ChildProfile = {
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
      parentExpectation: ['打好基础'],
      expectationOther: '',
      budget: 2000,
      screenTime: '每天不超过30分钟',
      healthNotes: '',
      otherNotes: '',
    };

    const result = await generateScheduleRecommendation(profile);
    const plan = scheduleRecommendationToFamilyPlan(result, profile, { childId: 'child-1' });
    const drafts = schedulePlanToTaskDrafts(plan);

    expect(result.summary).toContain('稳定作息');
    expect(plan.source).toBe('ai');
    expect(plan.slots).toHaveLength(2);
    expect(drafts.map(draft => draft.title)).toEqual(['完成数学作业', '跳绳运动']);
    expect(drafts[0]).toMatchObject({
      assigneeIds: ['child-1'],
      rewardStars: 8,
      type: 'study',
    });
  });

  it('真实 AI 返回失败时，日程推荐仍能本地生成并继续保存为任务草稿', async () => {
    mocks.invoke.mockResolvedValue({
      data: { error: 'Missing server AI secret' },
      error: null,
    });

    const {
      generateScheduleRecommendation,
      scheduleRecommendationToFamilyPlan,
    } = await import('../lib/scheduleRecommendAI');
    const { schedulePlanToTaskDrafts } = await import('../domain/familyPlanning');

    const profile: ChildProfile = {
      gender: 'boy',
      age: 7,
      grade: '一年级',
      city: '北京',
      schoolType: '公立',
      strongSubjects: ['数学'],
      weakSubjects: ['英语'],
      existingInterests: ['空手道', '跳绳'],
      existingSchedules: ['周三 18:00-19:00 空手道'],
      personality: ['好动坐不住'],
      personalityOther: '',
      homeworkDuration: 45,
      freeTimePerDay: 2,
      parentExpectation: ['增强体能'],
      expectationOther: '',
      budget: 1500,
      screenTime: '每天不超过20分钟',
      healthNotes: '',
      otherNotes: '',
    };

    const result = await generateScheduleRecommendation(profile);
    const plan = scheduleRecommendationToFamilyPlan(result, profile, { childId: 'child-1' });
    const drafts = schedulePlanToTaskDrafts(plan);

    expect(result.summary).toContain('本地智能规则');
    expect(result.weekdaySchedule.length).toBeGreaterThan(0);
    expect(result.recommendedActivities.map(item => item.name).join('、')).toContain('空手道');
    expect(drafts.length).toBeGreaterThan(0);
  });

  it('真实 AI 不可用时，本地语音 skill 仍能识别关键日程操作', async () => {
    mocks.invoke.mockRejectedValue(new Error('network unavailable'));

    const { recognizeIntent } = await import('../lib/voiceAssistant');
    const context: AppContext = {
      members: [
        { id: 'parent-1', name: '妈妈', role: 'parent', avatar: '', stars: 0 },
        { id: 'child-1', name: '孩子', role: 'child', avatar: '', stars: 0 },
      ],
      tasks: [],
      rewards: [],
      currentUser: { id: 'parent-1', name: '妈妈', role: 'parent', stars: 0 },
      familyId: 'family-1',
    };

    const addClass = await recognizeIntent('我刚刚给孩子报了新的空手道班，每周三下午6-7点上课', context);
    const report = await recognizeIntent('帮我生成这个月家庭月报', context);

    expect(addClass).toMatchObject({
      intent: 'schedule_arrangement',
      needsConfirmation: true,
      params: {
        operation: 'add_recurring_class',
        params: {
          activityName: '空手道',
          weekday: 3,
          startTime: '18:00',
          endTime: '19:00',
        },
      },
    });
    expect(report).toMatchObject({
      intent: 'weekly_report',
      params: { period: 'month' },
    });
  });
});
