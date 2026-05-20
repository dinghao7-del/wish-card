/**
 * Core domain model for the Family AI Butler loop.
 *
 * This file is intentionally UI-free. Pages, AI prompts, Supabase adapters, and
 * mobile clients should gradually converge on these shapes instead of creating
 * one-off schedule/profile/task contracts.
 */

export type PlanningScenario =
  | 'school_day'
  | 'weekend'
  | 'holiday'
  | 'winter_break'
  | 'summer_break'
  | 'travel'
  | 'medical'
  | 'custom';

export type PlanningSource = 'ai' | 'template' | 'community' | 'manual';

export type PlanKind =
  | 'routine'   // 日常/作息型：工作日、周末、寒暑假作息，重点是节奏安排
  | 'cycle'     // 周期型：一段时间内反复执行的活动安排，重点是持续性
  | 'goal'      // 目标型：钢琴考级、读完一本书、比赛备考，重点是里程碑和验收
  | 'container';// 容器型：学期计划、假期总计划，可包含子计划

export type ChildGender = 'boy' | 'girl' | 'unspecified';

export type CaregiverAvailability = 'unavailable' | 'remote' | 'partial' | 'available';

export type FamilyMemberRole = 'owner' | 'admin' | 'parent' | 'child' | 'viewer';

export type HolidayPlayScale = 'small_play' | 'medium_play' | 'big_play';
export type HolidayPlayMode = 'pure_fun' | 'science_fun' | 'interest_development';
export type HolidayCaregiverLoad = 'low' | 'medium' | 'high';
export type HolidayBudgetLevel = 'low' | 'medium' | 'high';
export type HolidayEffortLevel = 'easy' | 'balanced' | 'hands_on';

export interface HolidayPlayProfile {
  scale: HolidayPlayScale;
  mode: HolidayPlayMode;
  caregiverLoad: HolidayCaregiverLoad;
  budgetLevel: HolidayBudgetLevel;
  effortLevel: HolidayEffortLevel;
}

export interface FamilyAccount {
  id: string;
  familyId: string;
  authProvider: 'email' | 'phone' | 'oauth' | 'unknown';
  displayName?: string;
}

export interface FamilyMemberIdentity {
  id: string;
  familyId: string;
  name: string;
  role: FamilyMemberRole;
  avatar?: string;
  pinEnabled?: boolean;
  passwordEnabled?: boolean;
  active: boolean;
}

export function canManageFamily(member: Pick<FamilyMemberIdentity, 'role'> | null | undefined): boolean {
  return member?.role === 'owner' || member?.role === 'admin' || member?.role === 'parent';
}

export function canApproveTasks(member: Pick<FamilyMemberIdentity, 'role'> | null | undefined): boolean {
  return canManageFamily(member);
}

export function canManageRewards(member: Pick<FamilyMemberIdentity, 'role'> | null | undefined): boolean {
  return canManageFamily(member);
}

export function canApproveRewards(member: Pick<FamilyMemberIdentity, 'role'> | null | undefined): boolean {
  return canManageRewards(member);
}

export function canManageMembers(member: Pick<FamilyMemberIdentity, 'role'> | null | undefined): boolean {
  return canManageFamily(member);
}

export interface CaregiverWorkWindow {
  caregiverId?: string;
  label: string;
  startTime: string;
  endTime: string;
  availability: CaregiverAvailability;
}

export interface ChildPlanningProfile {
  id?: string;
  name?: string;
  gender: ChildGender;
  age?: number;
  grade?: string;
  city?: string;
  schoolType?: string;
  strengths: string[];
  challenges: string[];
  interests: string[];
  personality: string[];
  healthNotes?: string;
  homeworkMinutes?: number;
  screenTimeRule?: string;
}

export interface FamilyPlanningProfile {
  familyId?: string;
  city?: string;
  timezone?: string;
  children: ChildPlanningProfile[];
  caregiverWorkWindows: CaregiverWorkWindow[];
  monthlyBudget?: number;
  educationGoals: string[];
  constraints: string[];
  notes?: string;
}

export interface ScheduleSlot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  category: 'study' | 'life' | 'exercise' | 'interest' | 'family' | 'rest' | 'medical' | 'travel' | 'other';
  childIds: string[];
  caregiverRequired: boolean;
  description?: string;
  rewardStars?: number;
  icon?: string;
}

export interface FamilySchedulePlan {
  id?: string;
  familyId?: string;
  title: string;
  kind?: PlanKind;
  parentPlanId?: string;
  scenario: PlanningScenario;
  source: PlanningSource;
  startDate?: string;
  endDate?: string;
  summary?: string;
  slots: ScheduleSlot[];
  parentTips: string[];
  assumptions: string[];
}

export interface PlanDefinition {
  kind: PlanKind;
  label: string;
  usesOutcomeProgress: boolean;
  description: string;
  examples: string[];
  guidance: string;
}

export const PLAN_KIND_DEFINITIONS: Record<PlanKind, PlanDefinition> = {
  routine: {
    kind: 'routine',
    label: '作息型计划',
    usesOutcomeProgress: false,
    description: '用于安排工作日、周末、假期等日常节奏，重点是时间结构和执行参考。',
    examples: ['工作日作息', '暑假每日安排', '周末时间表'],
    guidance: '适合反复执行的日程，不建议用完成百分比评价。',
  },
  cycle: {
    kind: 'cycle',
    label: '周期型计划',
    usesOutcomeProgress: false,
    description: '用于安排一段时间内反复发生的活动，重点是频率、持续和调整。',
    examples: ['每周练琴', '一周三次游泳', '假期阅读习惯'],
    guidance: '适合看持续情况和频率，不一定有最终验收点。',
  },
  goal: {
    kind: 'goal',
    label: '目标型计划',
    usesOutcomeProgress: true,
    description: '用于完成有明确验收结果的事情，适合里程碑、阶段和进度表。',
    examples: ['钢琴考级', '完成一本教材', '期末数学提升'],
    guidance: '适合设置复盘周期、里程碑和验收标准。',
  },
  container: {
    kind: 'container',
    label: '容器型计划',
    usesOutcomeProgress: false,
    description: '用于承载多个子计划，例如学期总计划、假期总计划。',
    examples: ['暑假总计划', '学期总计划', '家庭年度计划'],
    guidance: '适合套住作息型、周期型、目标型子计划。',
  },
};

export function inferPlanKind(input: { kind?: string; type?: string; name?: string }): PlanKind {
  if (input.kind && input.kind in PLAN_KIND_DEFINITIONS) return input.kind as PlanKind;
  const text = `${input.type || ''} ${input.name || ''}`;
  if (/考级|考试|比赛|达标|完成|读完|掌握|提升|备考|目标/.test(text)) return 'goal';
  if (/总计划|组合|合集|学期计划|假期总/.test(text)) return 'container';
  if (/习惯|训练|练习|每周|每月|周期/.test(text)) return 'cycle';
  return 'routine';
}

export function planKindUsesOutcomeProgress(kind: PlanKind): boolean {
  return PLAN_KIND_DEFINITIONS[kind].usesOutcomeProgress;
}

export interface TaskDraftFromSchedule {
  title: string;
  description: string;
  startTime: string;
  deadline?: string;
  assigneeIds: string[];
  rewardStars: number;
  icon: string;
  type: string;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';
}

export interface PlanExecutionDraftInput {
  planName: string;
  planType?: string;
  kind: PlanKind;
  childIds: string[];
  schedulePlan?: FamilySchedulePlan;
  goalPlan?: GoalPlanMetadata;
}

export interface GoalPlanMilestone {
  title: string;
  targetPercent: number;
}

export interface GoalPlanMetadata {
  finalGoal: string;
  targetDate?: string;
  practiceFrequency: string;
  practiceMinutes: number;
  practiceTime?: string;
  milestones: GoalPlanMilestone[];
  optimizationHint?: string;
}

export function scheduleSlotToTaskDraft(slot: ScheduleSlot): TaskDraftFromSchedule {
  return {
    title: slot.title,
    description: slot.description || '',
    startTime: slot.startTime,
    deadline: slot.endTime,
    assigneeIds: slot.childIds,
    rewardStars: slot.rewardStars ?? 0,
    icon: slot.icon || 'Calendar',
    type: slot.category,
    frequency: 'daily',
  };
}

export function schedulePlanToTaskDrafts(plan: FamilySchedulePlan): TaskDraftFromSchedule[] {
  return plan.slots.map(scheduleSlotToTaskDraft);
}

export function scheduleTaskDuplicateKey(task: Pick<TaskDraftFromSchedule, 'title' | 'startTime'>): string {
  const time = task.startTime || '';
  const normalizedTime = /^\d{2}:\d{2}$/.test(time)
    ? time
    : (() => {
      const parsed = new Date(time);
      return Number.isNaN(parsed.getTime())
        ? time
        : parsed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    })();
  return `${task.title.trim()}::${normalizedTime}`;
}

export function filterNewTaskDrafts(
  drafts: TaskDraftFromSchedule[],
  existingTasks: Array<Pick<TaskDraftFromSchedule, 'title' | 'startTime'>>,
): TaskDraftFromSchedule[] {
  const existingKeys = new Set(existingTasks.map(scheduleTaskDuplicateKey));
  return drafts.filter(draft => !existingKeys.has(scheduleTaskDuplicateKey(draft)));
}

function defaultAssignees(childIds: string[]): string[] {
  return childIds.length > 0 ? childIds : [];
}

function planTask(
  input: {
    title: string;
    description: string;
    startTime: string;
    deadline?: string;
    rewardStars: number;
    icon: string;
    type: string;
    frequency?: TaskDraftFromSchedule['frequency'];
  },
  childIds: string[],
): TaskDraftFromSchedule {
  return {
    ...input,
    assigneeIds: defaultAssignees(childIds),
  };
}

export function buildPlanExecutionDrafts(input: PlanExecutionDraftInput): TaskDraftFromSchedule[] {
  const childIds = defaultAssignees(input.childIds);

  if (input.schedulePlan) {
    const fromSchedule = schedulePlanToTaskDrafts(input.schedulePlan)
      .filter(draft => draft.rewardStars > 0 || ['study', 'life', 'exercise', 'interest'].includes(draft.type));

    if (fromSchedule.length > 0) return fromSchedule;
  }

  if (input.kind === 'goal') {
    if (input.goalPlan) {
      const practiceTime = input.goalPlan.practiceTime || '19:00';
      const practiceEndTime = addMinutesToTime(practiceTime, input.goalPlan.practiceMinutes);
      const milestoneDrafts = input.goalPlan.milestones.slice(0, 5).map((milestone, index) => planTask({
        title: `${input.planName}：${milestone.title}`,
        description: `阶段目标：${input.goalPlan?.finalGoal || input.planName}。完成这个里程碑后，计划进度约到 ${milestone.targetPercent}%。`,
        startTime: index === 0 ? '19:30' : '20:00',
        deadline: index === 0 ? '20:00' : '20:30',
        rewardStars: 6 + index,
        icon: 'Flag',
        type: 'study',
        frequency: 'once',
      }, childIds));

      return [
        planTask({
          title: `${input.planName}：固定练习 ${input.goalPlan.practiceMinutes} 分钟`,
          description: `${input.goalPlan.practiceFrequency}，穿插到日常行程中。目标：${input.goalPlan.finalGoal}`,
          startTime: practiceTime,
          deadline: practiceEndTime,
          rewardStars: 5,
          icon: 'Music',
          type: 'interest',
          frequency: 'weekly',
        }, childIds),
        ...milestoneDrafts,
        planTask({
          title: `${input.planName}：阶段复盘与调整`,
          description: input.goalPlan.optimizationHint || '根据完成质量调整练习频率、难度和家长陪伴方式。',
          startTime: '20:30',
          deadline: '20:45',
          rewardStars: 4,
          icon: 'ClipboardCheck',
          type: 'family',
          frequency: 'weekly',
        }, childIds),
      ];
    }

    return [
      planTask({
        title: `${input.planName}：确定验收目标`,
        description: '和孩子一起说清楚最终要达到什么结果，避免计划变成模糊压力。',
        startTime: '19:30',
        deadline: '20:00',
        rewardStars: 3,
        icon: 'Target',
        type: 'study',
        frequency: 'once',
      }, childIds),
      planTask({
        title: `${input.planName}：完成第一个小里程碑`,
        description: '把大目标拆成孩子本周能完成的一小步，完成后及时鼓励。',
        startTime: '18:30',
        deadline: '19:00',
        rewardStars: 8,
        icon: 'Flag',
        type: 'study',
        frequency: 'weekly',
      }, childIds),
      planTask({
        title: `${input.planName}：家庭复盘 5 分钟`,
        description: '看这一阶段哪里做得好，哪里需要减负或换方法。',
        startTime: '20:30',
        deadline: '20:40',
        rewardStars: 4,
        icon: 'MessageCircleHeart',
        type: 'family',
        frequency: 'weekly',
      }, childIds),
    ];
  }

  if (input.kind === 'cycle') {
    return [
      planTask({
        title: `${input.planName}：本周第 1 次`,
        description: '周期型计划先保证持续发生，不用一开始追求完美。',
        startTime: '18:30',
        deadline: '19:00',
        rewardStars: 5,
        icon: 'Repeat',
        type: 'interest',
        frequency: 'weekly',
      }, childIds),
      planTask({
        title: `${input.planName}：本周第 2 次`,
        description: '保持节奏，完成后记录孩子的状态和兴趣变化。',
        startTime: '18:30',
        deadline: '19:00',
        rewardStars: 5,
        icon: 'Repeat2',
        type: 'interest',
        frequency: 'weekly',
      }, childIds),
      planTask({
        title: `${input.planName}：周末轻复盘`,
        description: '家长和孩子一起确认下周继续、减少还是调整时间。',
        startTime: '20:00',
        deadline: '20:10',
        rewardStars: 3,
        icon: 'ClipboardCheck',
        type: 'family',
        frequency: 'weekly',
      }, childIds),
    ];
  }

  if (input.kind === 'container') {
    return [
      planTask({
        title: `${input.planName}：列出子计划`,
        description: '把总计划拆成作息、兴趣、学习目标、家庭活动几个部分。',
        startTime: '20:00',
        deadline: '20:20',
        rewardStars: 3,
        icon: 'ListTree',
        type: 'family',
        frequency: 'once',
      }, childIds),
      planTask({
        title: `${input.planName}：确认本周重点`,
        description: '只选 1-3 个真正重要的事项，避免总计划变成负担。',
        startTime: '20:20',
        deadline: '20:35',
        rewardStars: 3,
        icon: 'LayoutGrid',
        type: 'family',
        frequency: 'weekly',
      }, childIds),
    ];
  }

  return [
    planTask({
      title: `${input.planName}：今日关键安排`,
      description: '从这份作息计划里选出今天最值得稳定执行的一件事。',
      startTime: '18:30',
      deadline: '19:00',
      rewardStars: 5,
      icon: 'CalendarCheck',
      type: 'life',
      frequency: 'daily',
    }, childIds),
    planTask({
      title: `${input.planName}：睡前整理`,
      description: '整理书包、衣物或明天要用的物品，让家庭节奏更稳。',
      startTime: '20:30',
      deadline: '20:45',
      rewardStars: 3,
      icon: 'Backpack',
      type: 'life',
      frequency: 'daily',
    }, childIds),
  ];
}

function addMinutesToTime(time: string, minutes: number): string {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  const total = Number(match[1]) * 60 + Number(match[2]) + minutes;
  const hour = Math.floor(total / 60) % 24;
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export interface PlanTaskProgressInput {
  status: 'pending' | 'in_progress' | 'reviewing' | 'completed' | 'expired' | string;
  rewardStars?: number;
}

export interface PlanRewardProgressInput {
  status?: 'available' | 'pending_approval' | 'redeemed' | string;
  cost?: number;
}

export interface PlanProgressSummary {
  totalTasks: number;
  completedTasks: number;
  reviewingTasks: number;
  pendingTasks: number;
  progressPercent: number;
  totalRewardStars: number;
  totalWishes: number;
  redeemedWishes: number;
  totalWishCost: number;
}

export interface PlanDisplaySummary {
  kind: PlanKind;
  label: string;
  showOutcomeProgress: boolean;
  primaryLabel: string;
  primaryValue: string;
  secondaryLabel: string;
  secondaryValue: string;
  narrative: string;
}

export interface PlanHierarchyInput {
  id: string;
  name: string;
  type?: string;
  kind?: string;
  parentPlanId?: string;
}

export interface PlanHierarchySummary {
  planId: string;
  childPlanCount: number;
  childKindCounts: Record<PlanKind, number>;
  childNames: string[];
  narrative: string;
}

export type PlanExperienceCategory =
  | 'onboarding'
  | 'holiday'
  | 'goal'
  | 'cycle'
  | 'routine'
  | 'container';

export interface PlanExperienceInput {
  id?: string;
  name: string;
  type?: string;
  kind: PlanKind;
  metadata?: Record<string, unknown>;
  progress: PlanProgressSummary;
  hierarchySummary?: PlanHierarchySummary;
}

export interface PlanExperienceSummary {
  category: PlanExperienceCategory;
  categoryLabel: string;
  headline: string;
  nextActionLabel: string;
  nextActionHint: string;
  primaryMetricLabel: string;
  primaryMetricValue: string;
  secondaryMetricLabel: string;
  secondaryMetricValue: string;
  accent: 'primary' | 'green' | 'amber' | 'blue' | 'purple';
}

export interface PlanCenterOverview {
  totalPlans: number;
  onboardingPlans: number;
  holidayPlans: number;
  goalPlans: number;
  runningPlans: number;
  nextFocus: string;
}

export interface PlanDetailActionInput {
  kind: PlanKind;
  experience: PlanExperienceSummary;
  progress: PlanProgressSummary;
  childPlanCount?: number;
  habitCount?: number;
  hasSchedule?: boolean;
}

export interface PlanDetailActionItem {
  id: 'generate_tasks' | 'complete_class_times' | 'review_progress' | 'manage_children' | 'weekly_report' | 'quadrant';
  label: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface PlanDecompositionInput {
  parentPlanName: string;
  parentPlanType?: string;
  parentKind: PlanKind;
  metadata?: Record<string, unknown>;
  existingChildNames?: string[];
}

export interface PlanDecompositionDraft {
  name: string;
  type: string;
  kind: PlanKind;
  reason: string;
}

export function calculatePlanProgress(
  tasks: PlanTaskProgressInput[],
  rewards: PlanRewardProgressInput[],
): PlanProgressSummary {
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const reviewingTasks = tasks.filter(task => task.status === 'reviewing').length;
  const pendingTasks = tasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length;

  return {
    totalTasks: tasks.length,
    completedTasks,
    reviewingTasks,
    pendingTasks,
    progressPercent: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
    totalRewardStars: tasks.reduce((sum, task) => sum + (task.rewardStars || 0), 0),
    totalWishes: rewards.length,
    redeemedWishes: rewards.filter(reward => reward.status === 'redeemed').length,
    totalWishCost: rewards.reduce((sum, reward) => sum + (reward.cost || 0), 0),
  };
}

export function buildPlanDisplaySummary(
  kind: PlanKind,
  progress: PlanProgressSummary,
): PlanDisplaySummary {
  const definition = PLAN_KIND_DEFINITIONS[kind];

  if (definition.usesOutcomeProgress) {
    return {
      kind,
      label: definition.label,
      showOutcomeProgress: true,
      primaryLabel: '目标进度',
      primaryValue: `${progress.progressPercent}%`,
      secondaryLabel: '里程碑/任务',
      secondaryValue: `${progress.completedTasks}/${progress.totalTasks}`,
      narrative: progress.totalTasks > 0
        ? '这是有明确结果的计划，适合用里程碑和完成度来复盘。'
        : '这是目标型计划，建议下一步补充可验收的里程碑或阶段任务。',
    };
  }

  if (kind === 'cycle') {
    return {
      kind,
      label: definition.label,
      showOutcomeProgress: false,
      primaryLabel: '本周期记录',
      primaryValue: `${progress.completedTasks} 次`,
      secondaryLabel: '待继续',
      secondaryValue: `${progress.pendingTasks + progress.reviewingTasks} 项`,
      narrative: '这是反复执行的周期安排，重点看是否持续发生，而不是用一个终点百分比评价。',
    };
  }

  if (kind === 'container') {
    return {
      kind,
      label: definition.label,
      showOutcomeProgress: false,
      primaryLabel: '包含事项',
      primaryValue: `${progress.totalTasks} 项`,
      secondaryLabel: '心愿',
      secondaryValue: `${progress.totalWishes} 个`,
      narrative: '这是承载多个安排的总计划，适合查看包含内容和下级计划，不适合直接评判完成度。',
    };
  }

  return {
    kind,
    label: definition.label,
    showOutcomeProgress: false,
    primaryLabel: '执行记录',
    primaryValue: `${progress.completedTasks} 项`,
    secondaryLabel: '今日/近期安排',
    secondaryValue: `${progress.pendingTasks + progress.reviewingTasks} 项`,
    narrative: '这是时间节奏类计划，重点是让家庭日程稳定运转，不需要被进度条追着走。',
  };
}

export function getPlanParentId(plan: { parentPlanId?: string; metadata?: Record<string, unknown> }): string | undefined {
  const metadataParentId = plan.metadata?.parentPlanId;
  return typeof metadataParentId === 'string' && metadataParentId.trim()
    ? metadataParentId
    : plan.parentPlanId;
}

export function buildPlanHierarchySummary(
  planId: string,
  plans: PlanHierarchyInput[],
): PlanHierarchySummary {
  const children = plans.filter(plan => plan.parentPlanId === planId);
  const childKindCounts = children.reduce<Record<PlanKind, number>>((counts, child) => {
    const kind = inferPlanKind({ kind: child.kind, type: child.type, name: child.name });
    counts[kind] += 1;
    return counts;
  }, {
    routine: 0,
    cycle: 0,
    goal: 0,
    container: 0,
  });

  return {
    planId,
    childPlanCount: children.length,
    childKindCounts,
    childNames: children.map(child => child.name),
    narrative: buildPlanHierarchyNarrative(children.length, childKindCounts),
  };
}

function buildPlanHierarchyNarrative(childPlanCount: number, counts: Record<PlanKind, number>): string {
  if (childPlanCount === 0) return '当前还没有子计划。总计划可以继续拆成作息安排、周期练习和目标型计划。';
  const parts = [
    counts.routine > 0 ? `${counts.routine}个作息安排` : '',
    counts.cycle > 0 ? `${counts.cycle}个周期练习` : '',
    counts.goal > 0 ? `${counts.goal}个目标计划` : '',
    counts.container > 0 ? `${counts.container}个下级总计划` : '',
  ].filter(Boolean);
  return `当前包含${parts.join('、')}，适合从总计划看全局，再到子计划里看具体执行。`;
}

export function buildPlanExperienceSummary(input: PlanExperienceInput): PlanExperienceSummary {
  const nameText = `${input.name} ${input.type || ''}`.toLowerCase();
  const metadataKind = typeof input.metadata?.kind === 'string' ? input.metadata.kind : '';
  const isOnboarding = metadataKind === 'onboarding_profile' || input.metadata?.source === 'ai_onboarding';
  const isHoliday = /假|暑|寒|holiday|summer|winter|旅行|旅游|游学/.test(nameText);
  const fixedClassSetupCount = readNumber(input.metadata?.fixedClassSetupCount);
  const habitCount = readNumber(input.metadata?.habitCount);
  const childCount = readNumber(input.metadata?.childCount);

  if (isOnboarding) {
    const nextActionHint = fixedClassSetupCount > 0
      ? `还有 ${fixedClassSetupCount} 个课外班时间需要补全，补完后日程会更准。`
      : habitCount > 0
        ? '先观察 7 天习惯打卡，周报会自动给全家复盘。'
        : '可以进入计划详情，把建议继续拆成家庭可执行安排。';
    return {
      category: 'onboarding',
      categoryLabel: 'AI建档方案',
      headline: childCount > 0 ? `已为 ${childCount} 个孩子生成初始家庭画像` : '已生成家庭初始画像',
      nextActionLabel: fixedClassSetupCount > 0 ? '补全课外班时间' : '查看建档结果',
      nextActionHint,
      primaryMetricLabel: '已生成事项',
      primaryMetricValue: `${input.progress.totalTasks} 项`,
      secondaryMetricLabel: '习惯/心愿',
      secondaryMetricValue: `${habitCount || input.progress.completedTasks} / ${input.progress.totalWishes}`,
      accent: 'green',
    };
  }

  if (isHoliday) {
    return {
      category: 'holiday',
      categoryLabel: '假期/特殊时间',
      headline: '适合结合公共假期、陪伴时间和预算做动态安排',
      nextActionLabel: '检查假期安排',
      nextActionHint: '后续会叠加所在地放假、开学和公共事件提示，自动给出调整建议。',
      primaryMetricLabel: '安排事项',
      primaryMetricValue: `${input.progress.totalTasks} 项`,
      secondaryMetricLabel: '子计划',
      secondaryMetricValue: `${input.hierarchySummary?.childPlanCount || 0} 个`,
      accent: 'amber',
    };
  }

  if (input.kind === 'goal') {
    return {
      category: 'goal',
      categoryLabel: '目标型计划',
      headline: '用里程碑和验收结果复盘，不用日常进度条绑住所有计划',
      nextActionLabel: input.progress.totalTasks > 0 ? '查看里程碑' : '补充里程碑',
      nextActionHint: input.progress.totalTasks > 0
        ? `当前完成 ${input.progress.completedTasks}/${input.progress.totalTasks} 个阶段任务。`
        : '建议补一个可验收目标，再让 AI 拆成每周执行动作。',
      primaryMetricLabel: '目标进度',
      primaryMetricValue: `${input.progress.progressPercent}%`,
      secondaryMetricLabel: '里程碑',
      secondaryMetricValue: `${input.progress.completedTasks}/${input.progress.totalTasks}`,
      accent: 'purple',
    };
  }

  if (input.kind === 'container') {
    return {
      category: 'container',
      categoryLabel: '总计划',
      headline: '承载多个子计划，适合从全局看家庭安排是否均衡',
      nextActionLabel: '管理子计划',
      nextActionHint: input.hierarchySummary?.narrative || '可以继续拆成作息、周期练习和目标型计划。',
      primaryMetricLabel: '子计划',
      primaryMetricValue: `${input.hierarchySummary?.childPlanCount || 0} 个`,
      secondaryMetricLabel: '事项/心愿',
      secondaryMetricValue: `${input.progress.totalTasks}/${input.progress.totalWishes}`,
      accent: 'blue',
    };
  }

  if (input.kind === 'cycle') {
    return {
      category: 'cycle',
      categoryLabel: '周期练习',
      headline: '关注持续发生的节奏，适合课外班、兴趣练习和习惯养成',
      nextActionLabel: '查看执行节奏',
      nextActionHint: `本周期已有 ${input.progress.completedTasks} 次完成记录，待继续 ${input.progress.pendingTasks + input.progress.reviewingTasks} 项。`,
      primaryMetricLabel: '本周期记录',
      primaryMetricValue: `${input.progress.completedTasks} 次`,
      secondaryMetricLabel: '待继续',
      secondaryMetricValue: `${input.progress.pendingTasks + input.progress.reviewingTasks} 项`,
      accent: 'primary',
    };
  }

  return {
    category: 'routine',
    categoryLabel: '日常作息',
    headline: '重点是让家庭每天稳定运转，而不是追求一个终点百分比',
    nextActionLabel: '查看日程落地',
    nextActionHint: `当前有 ${input.progress.pendingTasks + input.progress.reviewingTasks} 个近期安排需要继续推进。`,
    primaryMetricLabel: '执行记录',
    primaryMetricValue: `${input.progress.completedTasks} 项`,
    secondaryMetricLabel: '近期安排',
    secondaryMetricValue: `${input.progress.pendingTasks + input.progress.reviewingTasks} 项`,
    accent: 'primary',
  };
}

export function buildPlanCenterOverview(experiences: PlanExperienceSummary[]): PlanCenterOverview {
  const onboardingPlans = experiences.filter(item => item.category === 'onboarding').length;
  const holidayPlans = experiences.filter(item => item.category === 'holiday').length;
  const goalPlans = experiences.filter(item => item.category === 'goal').length;
  const runningPlans = experiences.filter(item => item.category === 'routine' || item.category === 'cycle').length;

  return {
    totalPlans: experiences.length,
    onboardingPlans,
    holidayPlans,
    goalPlans,
    runningPlans,
    nextFocus: buildPlanCenterNextFocus({ onboardingPlans, holidayPlans, goalPlans, runningPlans, totalPlans: experiences.length }),
  };
}

export function buildPlanDetailActionItems(input: PlanDetailActionInput): PlanDetailActionItem[] {
  const actions: PlanDetailActionItem[] = [];

  if (input.progress.totalTasks === 0) {
    actions.push({
      id: 'generate_tasks',
      label: '一键进入执行',
      description: input.hasSchedule
        ? '把日程时段拆成孩子能看到的每日任务。'
        : '先生成基础执行任务，再逐步补充细节。',
      priority: 'high',
    });
  }

  if (input.experience.category === 'onboarding' && /课外班/.test(input.experience.nextActionHint)) {
    actions.push({
      id: 'complete_class_times',
      label: '补全课外班时间',
      description: '把每周固定上课时间补准，后面的日程冲突判断才可靠。',
      priority: 'high',
    });
  }

  if (input.kind === 'container' || (input.childPlanCount || 0) > 0) {
    actions.push({
      id: 'manage_children',
      label: '管理子计划',
      description: '从总计划进入子计划，把作息、周期练习和目标拆开管理。',
      priority: input.progress.totalTasks === 0 ? 'medium' : 'high',
    });
  }

  if (input.kind === 'goal') {
    actions.push({
      id: 'review_progress',
      label: input.progress.totalTasks > 0 ? '复盘目标进度' : '补充里程碑',
      description: input.progress.totalTasks > 0
        ? '目标型计划适合按阶段验收，定期看完成质量。'
        : '先补一个可验收目标，再拆每周行动。',
      priority: 'high',
    });
  }

  if ((input.habitCount || 0) > 0 || input.kind === 'cycle') {
    actions.push({
      id: 'weekly_report',
      label: '查看周复盘',
      description: '习惯和周期练习更适合看连续记录，而不是看终点百分比。',
      priority: 'medium',
    });
  }

  if (input.progress.pendingTasks + input.progress.reviewingTasks > 0) {
    actions.push({
      id: 'quadrant',
      label: '本周四象限',
      description: '有冲突或时间不够时，先用四象限判断轻重缓急。',
      priority: 'medium',
    });
  }

  return dedupePlanDetailActions(actions).slice(0, 4);
}

export function buildPlanDecompositionDrafts(input: PlanDecompositionInput): PlanDecompositionDraft[] {
  const text = `${input.parentPlanName} ${input.parentPlanType || ''}`;
  const metadataKind = typeof input.metadata?.kind === 'string' ? input.metadata.kind : '';
  const existing = new Set((input.existingChildNames || []).map(name => normalizePlanName(name)));
  const drafts: PlanDecompositionDraft[] = [];

  if (metadataKind === 'onboarding_profile' || input.metadata?.source === 'ai_onboarding') {
    drafts.push(
      {
        name: '工作日每日作息',
        type: '工作日作息',
        kind: 'routine',
        reason: '把 AI 建档结果落到平日早晚的固定节奏里。',
      },
      {
        name: '课外班固定安排',
        type: '课外活动',
        kind: 'cycle',
        reason: '把每周课外班和兴趣班作为周期事件管理。',
      },
      {
        name: '习惯养成观察',
        type: '习惯计划',
        kind: 'cycle',
        reason: '用连续记录看习惯是否稳定发生。',
      },
    );
  } else if (/假|暑|寒|holiday|summer|winter|旅行|旅游|游学/i.test(text)) {
    drafts.push(
      {
        name: '假期每日作息',
        type: '假期作息',
        kind: 'routine',
        reason: '先稳住起床、学习、运动和睡眠的大节奏。',
      },
      {
        name: '兴趣练习安排',
        type: '兴趣练习',
        kind: 'cycle',
        reason: '把跳绳、练琴、绘画、英语等高频练习单独管理。',
      },
      {
        name: '假期目标里程碑',
        type: '目标计划',
        kind: 'goal',
        reason: '读完一本书、考级准备、能力提升这类目标需要验收。',
      },
      {
        name: '亲子游玩安排',
        type: '亲子活动',
        kind: 'cycle',
        reason: '把小玩、中玩、大玩的陪伴时间和预算单独沉淀。',
      },
    );
  } else if (/学期|年级|semester|term/i.test(text)) {
    drafts.push(
      {
        name: '工作日每日作息',
        type: '工作日作息',
        kind: 'routine',
        reason: '学期总计划先落到可持续的上学日节奏。',
      },
      {
        name: '课后学习巩固',
        type: '学习计划',
        kind: 'cycle',
        reason: '作业、阅读、英语、计算等内容适合按周持续。',
      },
      {
        name: '阶段目标计划',
        type: '目标计划',
        kind: 'goal',
        reason: '期中、期末、考级等明确结果要拆成里程碑。',
      },
    );
  } else if (input.parentKind === 'container') {
    drafts.push(
      {
        name: `${input.parentPlanName}作息安排`,
        type: '作息安排',
        kind: 'routine',
        reason: '先定义每天或每周什么时候做。',
      },
      {
        name: `${input.parentPlanName}周期练习`,
        type: '周期练习',
        kind: 'cycle',
        reason: '把需要持续发生的内容单独追踪。',
      },
      {
        name: `${input.parentPlanName}目标里程碑`,
        type: '目标计划',
        kind: 'goal',
        reason: '把明确结果拆成可验收的小阶段。',
      },
    );
  }

  return drafts.filter(draft => !existing.has(normalizePlanName(draft.name)));
}

function normalizePlanName(name: string): string {
  return name.trim().replace(/\s+/g, '').toLowerCase();
}

function dedupePlanDetailActions(actions: PlanDetailActionItem[]): PlanDetailActionItem[] {
  const seen = new Set<string>();
  return actions.filter(action => {
    if (seen.has(action.id)) return false;
    seen.add(action.id);
    return true;
  }).sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
}

function priorityRank(priority: PlanDetailActionItem['priority']): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function buildPlanCenterNextFocus(counts: Omit<PlanCenterOverview, 'nextFocus'>): string {
  if (counts.onboardingPlans > 0) return '优先把 AI 建档方案落到真实日程和习惯打卡里。';
  if (counts.holidayPlans > 0) return '优先检查假期安排是否匹配家长陪伴时间和公共放假变化。';
  if (counts.goalPlans > 0) return '优先把目标型计划拆成可验收里程碑。';
  if (counts.runningPlans > 0) return '优先保持日常作息和周期练习稳定执行。';
  return '先创建一个工作日或假期总计划，再让 AI 帮你拆解。';
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
