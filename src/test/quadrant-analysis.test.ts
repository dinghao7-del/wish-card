import { describe, expect, it } from 'vitest';
import {
  buildFamilyButlerContextSummary,
  buildFamilyButlerSuggestions,
  filterQuadrantTasksByDateRange,
  extractPlanNameFromText,
  getQuadrantDateRange,
  isFamilyPromiseTask,
  parsePlanSceneFromText,
  parsePublicCalendarDirectionFromText,
  parsePublicCalendarRangeFromText,
  parseQuadrantDateRangeFromText,
  parseReportPeriodFromText,
  recognizeIntent,
  type AppContext,
} from '../lib/voiceAssistant';

describe('AI 四象限周期筛选', () => {
  const now = new Date('2026-05-13T10:00:00.000Z');
  const tasks = [
    { id: 'today', title: '今天任务', status: 'pending', startTime: '2026-05-13T08:00:00.000Z' },
    { id: 'this-week', title: '本周任务', status: 'pending', deadline: '2026-05-15T08:00:00.000Z' },
    { id: 'this-month', title: '本月任务', status: 'pending', deadline: '2026-05-28T08:00:00.000Z' },
    { id: 'completed', title: '已完成任务', status: 'completed', startTime: '2026-05-13T08:00:00.000Z' },
    { id: 'next-month', title: '下月任务', status: 'pending', startTime: '2026-06-02T08:00:00.000Z' },
  ];

  it('默认家庭入口只需要稳定支持今天、本周、本月三个视角', () => {
    expect(filterQuadrantTasksByDateRange(tasks, 'today', now).map(task => task.id)).toEqual(['today']);
    expect(filterQuadrantTasksByDateRange(tasks, 'week', now).map(task => task.id)).toEqual(['today', 'this-week']);
    expect(filterQuadrantTasksByDateRange(tasks, 'month', now).map(task => task.id)).toEqual(['today', 'this-week', 'this-month']);
  });

  it('本周视角按周一到周日计算', () => {
    const range = getQuadrantDateRange('week', now);
    expect(range?.label).toBe('本周');
    expect(range?.start.toISOString()).toBe('2026-05-10T16:00:00.000Z');
    expect(range?.end.toISOString()).toBe('2026-05-17T15:59:59.999Z');
  });

  it('能从自然语言中识别四象限周期', () => {
    expect(parseQuadrantDateRangeFromText('帮我看今天四象限')).toBe('today');
    expect(parseQuadrantDateRangeFromText('看看本周轻重缓急')).toBe('week');
    expect(parseQuadrantDateRangeFromText('这个月压力大不大')).toBe('month');
  });

  it('四象限语音意图有本地兜底，不依赖云端 AI 配置', async () => {
    const context: AppContext = {
      members: [],
      tasks: [],
      rewards: [],
      currentUser: null,
      familyId: null,
    };

    const command = await recognizeIntent('帮我看本周四象限', context);
    expect(command).toMatchObject({
      intent: 'quadrant_analysis',
      params: { dateRange: 'week' },
      needsConfirmation: false,
    });
  });

  it('家庭复盘和下周期安排建议也有本地语音兜底', async () => {
    const context: AppContext = {
      members: [],
      tasks: [],
      rewards: [],
      currentUser: null,
      familyId: null,
    };

    expect(parseReportPeriodFromText('生成这个月家庭月报')).toBe('month');
    const command = await recognizeIntent('帮我看看下周怎么安排', context);
    expect(command).toMatchObject({
      intent: 'weekly_report',
      params: { period: 'week', focus: 'next_period' },
      needsConfirmation: false,
    });
  });

  it('公共时间变化查询有本地语音兜底', async () => {
    const context: AppContext = {
      members: [],
      tasks: [],
      rewards: [],
      currentUser: null,
      familyId: null,
    };

    expect(parsePublicCalendarRangeFromText('下周有没有调休会影响安排')).toBe('week');
    expect(parsePublicCalendarDirectionFromText('下周有没有调休会影响安排')).toBe('next');
    const command = await recognizeIntent('下周有没有调休或学校变化会影响安排', context);
    expect(command).toMatchObject({
      intent: 'public_calendar_query',
      params: { range: 'week', direction: 'next' },
      needsConfirmation: false,
    });
  });

  it('创建家庭计划有本地语音兜底并识别计划场景', async () => {
    const context: AppContext = {
      members: [],
      tasks: [],
      rewards: [],
      currentUser: null,
      familyId: null,
    };

    expect(parsePlanSceneFromText('帮我制定一个暑假计划')).toBe('holiday');
    expect(extractPlanNameFromText('帮我制定一个暑假计划')).toBe('暑假计划');
    const command = await recognizeIntent('帮我制定一个暑假计划', context);
    expect(command).toMatchObject({
      intent: 'create_plan',
      params: { scene: 'holiday', name: '暑假计划' },
      needsConfirmation: false,
    });
  });

  it('家庭管家建议有离线可用的本地兜底', async () => {
    const context: AppContext = {
      members: [
        { id: 'parent-1', name: '妈妈', role: 'parent', avatar: '', stars: 0 },
        { id: 'child-1', name: '孩子', role: 'child', avatar: '', stars: 50 },
      ],
      tasks: [
        {
          id: 'promise-1',
          title: '兑现心愿：周末去科技馆',
          description: '心愿ID:reward-trip',
          type: 'family_promise',
          status: 'pending',
          rewardStars: 0,
          assigneeIds: ['parent-1'],
          creatorId: 'parent-1',
          icon: 'HeartHandshake',
          startTime: '2026-05-16T08:00:00.000Z',
          planId: 'plan-family',
        },
        {
          id: 'review-1',
          title: '数学作业',
          description: '',
          status: 'reviewing',
          rewardStars: 10,
          assigneeIds: ['child-1'],
          creatorId: 'parent-1',
          icon: 'Book',
          startTime: '2026-05-13T08:00:00.000Z',
          planId: 'plan-study',
        },
      ],
      rewards: [
        { id: 'reward-1', name: '看电影', cost: 30, category: '体验', status: 'available' },
      ],
      currentUser: { id: 'child-1', name: '孩子', role: 'child', stars: 50 },
      familyId: 'family-1',
    };

    const command = await recognizeIntent('给我一些智能建议', context);
    expect(command).toMatchObject({
      intent: 'smart_suggestion',
      needsConfirmation: false,
    });
    expect(buildFamilyButlerContextSummary(context)).toMatchObject({
      pendingTasks: 1,
      reviewingTasks: 1,
      familyPromiseTasks: 1,
      affordableWishes: 1,
      activePlanCount: 2,
      pressureLevel: 'balanced',
    });
    expect(buildFamilyButlerSuggestions(context).join('\n')).toContain('孩子兑换后的心愿');
    expect(buildFamilyButlerSuggestions(context).join('\n')).toContain('待审核打卡');
  });

  it('把父母兑现心愿识别为家庭承诺任务', () => {
    expect(isFamilyPromiseTask({
      title: '兑现心愿：周末去科技馆',
      description: '心愿ID:reward-trip',
      type: 'family_promise',
    })).toBe(true);
    expect(isFamilyPromiseTask({
      title: '整理书包',
      description: '',
      type: 'daily',
    })).toBe(false);
  });
});
