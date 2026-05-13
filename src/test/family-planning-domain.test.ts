import { describe, expect, it } from 'vitest';
import {
  canApproveTasks,
  canApproveRewards,
  canManageFamily,
  canManageMembers,
  canManageRewards,
  buildPlanDecompositionDrafts,
  buildPlanDetailActionItems,
  buildPlanDisplaySummary,
  buildPlanCenterOverview,
  buildPlanExperienceSummary,
  buildPlanExecutionDrafts,
  buildPlanHierarchySummary,
  calculatePlanProgress,
  filterNewTaskDrafts,
  getPlanParentId,
  inferPlanKind,
  planKindUsesOutcomeProgress,
  schedulePlanToTaskDrafts,
  scheduleSlotToTaskDraft,
  type FamilyMemberIdentity,
  type FamilySchedulePlan,
  type ScheduleSlot,
} from '../domain/familyPlanning';

describe('家庭规划领域模型', () => {
  it('区分家庭主账号下的成员权限', () => {
    const parent: FamilyMemberIdentity = {
      id: 'member-parent',
      familyId: 'family-1',
      name: '妈妈',
      role: 'parent',
      active: true,
      pinEnabled: true,
    };
    const child: FamilyMemberIdentity = {
      id: 'member-child',
      familyId: 'family-1',
      name: '孩子',
      role: 'child',
      active: true,
      pinEnabled: true,
    };

    expect(canManageFamily(parent)).toBe(true);
    expect(canApproveTasks(parent)).toBe(true);
    expect(canManageRewards(parent)).toBe(true);
    expect(canApproveRewards(parent)).toBe(true);
    expect(canManageMembers(parent)).toBe(true);
    expect(canManageFamily(child)).toBe(false);
    expect(canApproveTasks(child)).toBe(false);
    expect(canManageRewards(child)).toBe(false);
    expect(canApproveRewards(child)).toBe(false);
    expect(canManageMembers(child)).toBe(false);
  });

  it('可以把单个日程时段转换为任务草稿', () => {
    const slot: ScheduleSlot = {
      id: 'slot-homework',
      title: '完成数学作业',
      startTime: '17:30',
      endTime: '18:20',
      category: 'study',
      childIds: ['child-1'],
      caregiverRequired: false,
      description: '先完成学校作业，再整理错题',
      rewardStars: 8,
      icon: 'BookOpen',
    };

    expect(scheduleSlotToTaskDraft(slot)).toEqual({
      title: '完成数学作业',
      description: '先完成学校作业，再整理错题',
      startTime: '17:30',
      deadline: '18:20',
      assigneeIds: ['child-1'],
      rewardStars: 8,
      icon: 'BookOpen',
      type: 'study',
      frequency: 'daily',
    });
  });

  it('可以把家庭日程方案转换为任务草稿列表', () => {
    const plan: FamilySchedulePlan = {
      title: '工作日晚间安排',
      scenario: 'school_day',
      source: 'ai',
      slots: [
        {
          id: 'slot-reading',
          title: '阅读 20 分钟',
          startTime: '20:00',
          endTime: '20:20',
          category: 'study',
          childIds: ['child-1'],
          caregiverRequired: true,
        },
        {
          id: 'slot-bag',
          title: '整理明天书包',
          startTime: '20:20',
          endTime: '20:30',
          category: 'life',
          childIds: ['child-1'],
          caregiverRequired: false,
          rewardStars: 3,
        },
      ],
      parentTips: [],
      assumptions: [],
    };

    const drafts = schedulePlanToTaskDrafts(plan);

    expect(drafts).toHaveLength(2);
    expect(drafts[0].title).toBe('阅读 20 分钟');
    expect(drafts[0].rewardStars).toBe(0);
    expect(drafts[0].frequency).toBe('daily');
    expect(drafts[1].type).toBe('life');
    expect(drafts[1].rewardStars).toBe(3);
  });

  it('可以过滤已经从同一日程生成过的任务草稿', () => {
    const existingDate = new Date();
    existingDate.setHours(17, 30, 0, 0);
    const drafts = [
      {
        title: '完成数学作业',
        description: '',
        startTime: '17:30',
        deadline: '18:30',
        assigneeIds: ['child-1'],
        rewardStars: 8,
        icon: 'BookOpen',
        type: 'study',
      },
      {
        title: '整理书包',
        description: '',
        startTime: '20:00',
        deadline: '20:10',
        assigneeIds: ['child-1'],
        rewardStars: 3,
        icon: 'Backpack',
        type: 'life',
      },
    ];

    const nextDrafts = filterNewTaskDrafts(drafts, [
      { title: '完成数学作业', startTime: existingDate.toISOString() },
    ]);

    expect(nextDrafts).toHaveLength(1);
    expect(nextDrafts[0].title).toBe('整理书包');
  });

  it('可以按计划类型生成可执行任务草稿', () => {
    const goalDrafts = buildPlanExecutionDrafts({
      planName: '钢琴考级计划',
      kind: 'goal',
      childIds: ['child-1'],
    });
    expect(goalDrafts.map(draft => draft.title).join('\n')).toContain('确定验收目标');
    expect(goalDrafts.map(draft => draft.title).join('\n')).toContain('第一个小里程碑');
    expect(goalDrafts.map(draft => draft.frequency)).toEqual(['once', 'weekly', 'weekly']);

    const cycleDrafts = buildPlanExecutionDrafts({
      planName: '跳绳练习',
      kind: 'cycle',
      childIds: ['child-1'],
    });
    expect(cycleDrafts).toHaveLength(3);
    expect(cycleDrafts[0].title).toContain('本周第 1 次');
    expect(cycleDrafts.every(draft => draft.frequency === 'weekly')).toBe(true);

    const containerDrafts = buildPlanExecutionDrafts({
      planName: '暑假总计划',
      kind: 'container',
      childIds: ['child-1'],
    });
    expect(containerDrafts[0].title).toContain('列出子计划');
    expect(containerDrafts.map(draft => draft.frequency)).toEqual(['once', 'weekly']);
  });

  it('可以计算计划任务与心愿的整体进度', () => {
    const summary = calculatePlanProgress(
      [
        { status: 'completed', rewardStars: 8 },
        { status: 'reviewing', rewardStars: 6 },
        { status: 'pending', rewardStars: 3 },
        { status: 'in_progress', rewardStars: 2 },
      ],
      [
        { status: 'available', cost: 30 },
        { status: 'redeemed', cost: 50 },
      ],
    );

    expect(summary).toMatchObject({
      totalTasks: 4,
      completedTasks: 1,
      reviewingTasks: 1,
      pendingTasks: 2,
      progressPercent: 25,
      totalRewardStars: 19,
      totalWishes: 2,
      redeemedWishes: 1,
      totalWishCost: 80,
    });
  });

  it('可以区分作息型、周期型、目标型和容器型计划', () => {
    expect(inferPlanKind({ type: '工作日作息' })).toBe('routine');
    expect(inferPlanKind({ name: '小提琴每周练习' })).toBe('cycle');
    expect(inferPlanKind({ name: '钢琴考级计划' })).toBe('goal');
    expect(inferPlanKind({ name: '暑假总计划' })).toBe('container');
    expect(planKindUsesOutcomeProgress('goal')).toBe(true);
    expect(planKindUsesOutcomeProgress('routine')).toBe(false);
  });

  it('只有目标型计划使用结果进度条，其他计划展示执行记录', () => {
    const progress = calculatePlanProgress(
      [
        { status: 'completed', rewardStars: 5 },
        { status: 'pending', rewardStars: 5 },
      ],
      [{ status: 'available', cost: 30 }],
    );

    expect(buildPlanDisplaySummary('goal', progress)).toMatchObject({
      showOutcomeProgress: true,
      primaryLabel: '目标进度',
      primaryValue: '50%',
      secondaryValue: '1/2',
    });
    expect(buildPlanDisplaySummary('routine', progress)).toMatchObject({
      showOutcomeProgress: false,
      primaryLabel: '执行记录',
      primaryValue: '1 项',
    });
    expect(buildPlanDisplaySummary('cycle', progress)).toMatchObject({
      showOutcomeProgress: false,
      primaryLabel: '本周期记录',
      primaryValue: '1 次',
    });
    expect(buildPlanDisplaySummary('container', progress)).toMatchObject({
      showOutcomeProgress: false,
      primaryLabel: '包含事项',
      primaryValue: '2 项',
      secondaryValue: '1 个',
    });
  });

  it('容器型计划可以汇总子计划结构，而不是直接套用完成进度', () => {
    const hierarchy = buildPlanHierarchySummary('summer-plan', [
      { id: 'summer-plan', name: '暑假总计划', kind: 'container' },
      { id: 'routine-1', name: '暑假每日作息', kind: 'routine', parentPlanId: 'summer-plan' },
      { id: 'cycle-1', name: '小提琴每周练习', kind: 'cycle', parentPlanId: 'summer-plan' },
      { id: 'goal-1', name: '钢琴考级计划', kind: 'goal', parentPlanId: 'summer-plan' },
      { id: 'other', name: '无关计划', kind: 'routine' },
    ]);

    expect(hierarchy).toMatchObject({
      planId: 'summer-plan',
      childPlanCount: 3,
      childKindCounts: {
        routine: 1,
        cycle: 1,
        goal: 1,
        container: 0,
      },
      childNames: ['暑假每日作息', '小提琴每周练习', '钢琴考级计划'],
    });
    expect(hierarchy.narrative).toContain('作息安排');
    expect(hierarchy.narrative).toContain('目标计划');
  });

  it('可以从计划 metadata 中读取父计划关系', () => {
    expect(getPlanParentId({ metadata: { parentPlanId: 'parent-1' } })).toBe('parent-1');
    expect(getPlanParentId({ parentPlanId: 'parent-2', metadata: {} })).toBe('parent-2');
  });

  it('可以把 AI 建档、假期和目标计划归入不同体验入口', () => {
    const emptyProgress = calculatePlanProgress([], []);
    const onboarding = buildPlanExperienceSummary({
      name: 'AI建档方案',
      type: 'AI智能建档',
      kind: 'routine',
      metadata: {
        kind: 'onboarding_profile',
        source: 'ai_onboarding',
        childCount: 2,
        habitCount: 3,
        fixedClassSetupCount: 1,
      },
      progress: calculatePlanProgress([{ status: 'pending' }, { status: 'completed' }], [{ status: 'available', cost: 20 }]),
    });
    const holiday = buildPlanExperienceSummary({
      name: '暑假总计划',
      type: '暑假计划',
      kind: 'container',
      progress: emptyProgress,
      hierarchySummary: buildPlanHierarchySummary('summer-plan', [
        { id: 'daily', name: '暑假每日作息', parentPlanId: 'summer-plan', kind: 'routine' },
      ]),
    });
    const goal = buildPlanExperienceSummary({
      name: '钢琴考级计划',
      type: '自定义',
      kind: 'goal',
      progress: calculatePlanProgress([{ status: 'completed' }, { status: 'pending' }], []),
    });

    expect(onboarding).toMatchObject({
      category: 'onboarding',
      categoryLabel: 'AI建档方案',
      nextActionLabel: '补全课外班时间',
      primaryMetricValue: '2 项',
    });
    expect(holiday).toMatchObject({
      category: 'holiday',
      categoryLabel: '假期/特殊时间',
      secondaryMetricValue: '1 个',
    });
    expect(goal).toMatchObject({
      category: 'goal',
      primaryMetricValue: '50%',
    });
  });

  it('可以为计划中心生成总览和下一步焦点', () => {
    const overview = buildPlanCenterOverview([
      buildPlanExperienceSummary({
        name: 'AI建档方案',
        type: 'AI智能建档',
        kind: 'routine',
        metadata: { kind: 'onboarding_profile' },
        progress: calculatePlanProgress([], []),
      }),
      buildPlanExperienceSummary({
        name: '钢琴考级计划',
        type: '自定义',
        kind: 'goal',
        progress: calculatePlanProgress([{ status: 'completed' }], []),
      }),
    ]);

    expect(overview).toMatchObject({
      totalPlans: 2,
      onboardingPlans: 1,
      goalPlans: 1,
      holidayPlans: 0,
    });
    expect(overview.nextFocus).toContain('AI 建档方案');
  });

  it('可以为计划详情生成落地动作建议', () => {
    const progress = calculatePlanProgress([], []);
    const onboardingExperience = buildPlanExperienceSummary({
      name: 'AI建档方案',
      type: 'AI智能建档',
      kind: 'routine',
      metadata: { kind: 'onboarding_profile', fixedClassSetupCount: 2 },
      progress,
    });

    const actions = buildPlanDetailActionItems({
      kind: 'routine',
      experience: onboardingExperience,
      progress,
      habitCount: 2,
      hasSchedule: true,
    });

    expect(actions.map(action => action.id)).toContain('generate_tasks');
    expect(actions.map(action => action.id)).toContain('complete_class_times');
    expect(actions[0].priority).toBe('high');
  });

  it('可以为假期总计划生成子计划拆解草稿并避开重复项', () => {
    const drafts = buildPlanDecompositionDrafts({
      parentPlanName: '暑假总计划',
      parentPlanType: '暑假计划',
      parentKind: 'container',
      existingChildNames: ['假期每日作息'],
    });

    expect(drafts.map(draft => draft.name)).not.toContain('假期每日作息');
    expect(drafts).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '兴趣练习安排', kind: 'cycle' }),
      expect.objectContaining({ name: '假期目标里程碑', kind: 'goal' }),
      expect.objectContaining({ name: '亲子游玩安排', kind: 'cycle' }),
    ]));
  });
});
