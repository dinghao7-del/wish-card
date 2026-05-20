import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Target, Star, Sparkles, LayoutGrid, Clock, Sun, Moon, Globe, Users, Share2, Brain, Lightbulb, BookOpen, CheckCircle2, ListChecks, ArrowRight, ListTree, Pencil } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { DailyScheduleTemplate, PLAN_SCENES, dailyScheduleTemplateToFamilyPlan, type PlanSceneType } from '../lib/planTemplates';
import { buildPlanDecompositionDrafts, buildPlanDisplaySummary, buildPlanExecutionDrafts, buildPlanExperienceSummary, buildPlanHierarchySummary, calculatePlanProgress, filterNewTaskDrafts, getPlanParentId, inferPlanKind, PLAN_KIND_DEFINITIONS, type GoalPlanMetadata, type PlanDecompositionDraft } from '../domain/familyPlanning';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { AppModal } from '../components/AppModal';
import { showToastGlobal } from '../components/Toast';
import type { Task } from '../types';
import { getDataLayer } from '../lib/DataLayer';
import { createSharedScheduleTemplateDraft, saveCommunityShareDraft } from '../lib/communityShare';
import { buildUiTaskFromDraft } from '../lib/planExecutionTasks';
import type { ChildProfile, ScheduleRecommendation } from '../lib/scheduleRecommendAI';
import { getGuestPlan, getGuestPlans, saveGuestPlan } from '../lib/guestPlans';
import { getCreationTemplateRoute } from '../lib/createFlowRoutes';

interface PlanData {
  id: string;
  name: string;
  type: string;
  metadata?: Record<string, unknown>;
  parentPlanId?: string;
}

interface GuidedPlanningBrief {
  name: string;
  kindLabel: string;
  summary: string;
  checkpoints: Array<{ label: string; value: string }>;
  generatedItems: string[];
}

export function PlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const isZh = (i18n.language || '').toLowerCase().startsWith('zh');
  const od = (zh: string, en: string) => (isZh ? zh : en);
  const { familyId, guestMode, members, currentUser, tasks, rewards, addTask } = useFamily();

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [allPlans, setAllPlans] = useState<PlanData[]>([]);
  const [wishCount, setWishCount] = useState(0);
  const [schedule, setSchedule] = useState<DailyScheduleTemplate | null>(null);
  const [weeklyActivities, setWeeklyActivities] = useState<{ day: string; activity: string; time: string }[]>([]);
  const [grade, setGrade] = useState<string>('');
  const [timezone, setTimezone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [isCreatingChildPlans, setIsCreatingChildPlans] = useState(false);
  const [isGoalEditOpen, setIsGoalEditOpen] = useState(false);
  const [editGoalFinalGoal, setEditGoalFinalGoal] = useState('');
  const [editGoalFrequency, setEditGoalFrequency] = useState('');
  const [editGoalMinutes, setEditGoalMinutes] = useState(30);
  const [editGoalPracticeTime, setEditGoalPracticeTime] = useState('19:00');
  const [editGoalTargetDate, setEditGoalTargetDate] = useState('');
  const [editGoalOptimizationHint, setEditGoalOptimizationHint] = useState('');
  const [forceFullDetail, setForceFullDetail] = useState(false);

  function applyPlanMetadata(metadata?: Record<string, unknown>) {
    if (!metadata) return;
    const payload = metadata as any;
    if (payload.wakeTime) setSchedule(payload);
    if (payload.weeklyActivities) setWeeklyActivities(payload.weeklyActivities);
    if (payload.grade) setGrade(payload.grade);
    if (payload.timezone?.label) setTimezone(payload.timezone.label);
  }

  useEffect(() => {
    if (!id) return;
    loadPlan();

    // 从 URL 参数读取日程数据
    const params = new URLSearchParams(window.location.search);
    const scheduleStr = params.get('schedule');
    if (scheduleStr) {
      try {
        const decoded = JSON.parse(decodeURIComponent(scheduleStr));
        if (decoded.wakeTime) setSchedule(decoded);
        if (decoded.weeklyActivities) setWeeklyActivities(decoded.weeklyActivities);
        if (decoded.grade) setGrade(decoded.grade);
        if (decoded.timezone?.label) setTimezone(decoded.timezone.label);
      } catch {}
    }
  }, [id, tasks, rewards]);

  async function loadPlan() {
    setLoading(true);
    if (!id) return;

    if (guestMode) {
      const guestPlans = getGuestPlans();
      setAllPlans(guestPlans.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        metadata: item.metadata,
        parentPlanId: getPlanParentId(item),
      })));
      const storedPlan = getGuestPlan(id);
      if (storedPlan) {
        setPlan({
          id: storedPlan.id,
          name: storedPlan.name,
          type: storedPlan.type,
          metadata: storedPlan.metadata,
          parentPlanId: getPlanParentId(storedPlan),
        });
        applyPlanMetadata(storedPlan.metadata);
        setWishCount(rewards.filter(reward => reward.planId === id).length);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const planName = params.get('name') || '计划';
      const planType = params.get('type') || '自定义';
      const planKind = params.get('kind') || undefined;
      const parentPlanId = params.get('parentPlanId') || undefined;
      const scheduleStr = params.get('schedule');
      let metadata: Record<string, unknown> | undefined = planKind ? { kind: planKind, parentPlanId } : parentPlanId ? { parentPlanId } : undefined;
      if (scheduleStr) {
        try {
          metadata = {
            ...(metadata || {}),
            ...JSON.parse(decodeURIComponent(scheduleStr)),
          };
        } catch {}
      }
      const guestPlan = saveGuestPlan({
        id,
        name: planName,
        type: planType,
        metadata: metadata || {},
        sortOrder: Date.now(),
      });
      setPlan({ id, name: planName, type: planType, metadata: guestPlan.metadata, parentPlanId });
      applyPlanMetadata(guestPlan.metadata);
      setWishCount(0);
      setLoading(false);
      return;
    }

    const planData = await getDataLayer().getPlan(id);
    const plansData = await getDataLayer().getPlans();
    setAllPlans(plansData.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      metadata: item.metadata,
      parentPlanId: getPlanParentId(item),
    })));

    if (planData) {
      setPlan({ id: planData.id, name: planData.name, type: planData.type, metadata: planData.metadata, parentPlanId: getPlanParentId(planData) });
      applyPlanMetadata(planData.metadata);
      setWishCount(rewards.filter(reward => reward.planId === id).length);
    }
    setLoading(false);
  }

  // 获取对应场景的 emoji
  const sceneEmoji = () => {
    if (!plan) return '📋';
    const scene = PLAN_SCENES.find(s => plan.type.includes(s.name) || plan.type.includes(s.type));
    return scene?.emoji || '📋';
  };

  const getPlanSceneType = (): PlanSceneType => {
    const planType = plan?.type || '';
    if (planType.includes('假期') || planType.includes('寒假') || planType.includes('暑假')) return 'holiday';
    if (planType.includes('留学') || planType.includes('交换')) return 'exchange';
    if (planType.includes('平日') || planType.includes('学期')) return 'weekday';
    return 'custom';
  };

  const handleGenerateTasksFromPlan = async () => {
    if (!plan || !id) return;
    if (!currentUser) {
      showToastGlobal('请先选择当前用户', 'warning');
      return;
    }

    const childIds = members.filter(member => member.role === 'child').map(member => member.id);
    const assigneeIds = childIds.length > 0 ? childIds : [currentUser.id];
    const familyPlan = schedule ? dailyScheduleTemplateToFamilyPlan(schedule, {
        title: plan.name,
        sceneType: getPlanSceneType(),
        familyId: familyId || undefined,
        childIds: assigneeIds,
      }) : undefined;
    const generatedDrafts = buildPlanExecutionDrafts({
      planName: plan.name,
      planType: plan.type,
      kind: planKind,
      childIds: assigneeIds,
      schedulePlan: familyPlan,
      goalPlan,
    });
    const drafts = filterNewTaskDrafts(
      generatedDrafts,
      tasks.filter(task => task.planId === id),
    );

    if (drafts.length === 0) {
      showToastGlobal('当前计划没有新的可生成任务', 'info');
      return;
    }

    setIsGeneratingTasks(true);
    try {
      for (const draft of drafts) {
        await addTask(buildUiTaskFromDraft(draft, { planId: id, creatorId: currentUser.id }));
      }

      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('suggest');
        next.delete('from');
        return next;
      }, { replace: true });
      showToastGlobal(`已生成 ${drafts.length} 个执行任务`, 'success');
    } catch (error: any) {
      showToastGlobal(`生成任务失败: ${error.message || '请稍后重试'}`, 'error');
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const handleCopySharedTemplate = async () => {
    if (!schedule || !plan) {
      showToastGlobal('当前计划还没有可分享的日程内容', 'warning');
      return;
    }

    const childMembers = members.filter(member => member.role === 'child');
    const childIds = childMembers.length > 0 ? childMembers.map(member => member.id) : [];
    const familyPlan = dailyScheduleTemplateToFamilyPlan(schedule, {
      title: plan.name,
      sceneType: getPlanSceneType(),
      familyId: familyId || undefined,
      childIds,
      summary: `${plan.name} 的脱敏日程模板`,
    });

    const sharedDraft = createSharedScheduleTemplateDraft(familyPlan, {
      sourcePlanId: plan.id,
      grade,
      memberNames: members.map(member => member.name),
    });

    try {
      const storedDraft = await saveCommunityShareDraft(sharedDraft);
      navigate(`/community/share-review/${storedDraft.id}`);
    } catch {
      showToastGlobal('生成分享草稿失败，请稍后重试', 'error');
    }
  };

  const aiRecommendation = plan?.metadata?.aiRecommendation as ScheduleRecommendation | undefined;
  const aiProfile = plan?.metadata?.aiProfile as ChildProfile | undefined;
  const goalPlan = plan?.metadata?.goalPlan as GoalPlanMetadata | undefined;
  const planningBrief = plan?.metadata?.planningBrief as GuidedPlanningBrief | undefined;
  const isAiPlan = plan?.metadata?.source === 'ai_schedule_recommend' || Boolean(aiRecommendation);
  const planKind = inferPlanKind({
    kind: plan?.metadata?.kind as string | undefined,
    type: plan?.type,
    name: plan?.name,
  });
  const planKindDefinition = PLAN_KIND_DEFINITIONS[planKind];
  const planHierarchySummary = plan ? buildPlanHierarchySummary(plan.id, allPlans.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    kind: item.metadata?.kind as string | undefined,
    parentPlanId: item.parentPlanId,
  }))) : null;
  const childPlans = plan ? allPlans.filter(item => item.parentPlanId === plan.id) : [];
  const parentPlan = plan?.parentPlanId ? allPlans.find(item => item.id === plan.parentPlanId) : undefined;
  const planTasks = tasks.filter(task => task.planId === id);
  const planRewards = rewards.filter(reward => reward.planId === id);
  const guidedPlanName = getFriendlyPlanName(plan?.name, planTasks, plan?.type);
  const planHabits = planTasks.filter(task => task.isHabit);
  const planRegularTasks = planTasks.filter(task => !task.isHabit);
  const planProgress = calculatePlanProgress(planTasks, planRewards);
  const planDisplaySummary = buildPlanDisplaySummary(planKind, planProgress);
  const planExperience = plan ? buildPlanExperienceSummary({
    id: plan.id,
    name: plan.name,
    type: plan.type,
    kind: planKind,
    metadata: plan.metadata,
    progress: planProgress,
    hierarchySummary: planHierarchySummary || undefined,
  }) : null;
  const isFreshlyCreated = searchParams.get('from') === 'create' || searchParams.get('from') === 'wizard-created';
  const decompositionDrafts = plan ? buildPlanDecompositionDrafts({
    parentPlanName: plan.name,
    parentPlanType: plan.type,
    parentKind: planKind,
    metadata: plan.metadata,
    existingChildNames: childPlans.map(child => child.name),
  }) : [];
  const shouldShowGuidedStart = Boolean(
    plan && !forceFullDetail && searchParams.get('view') !== 'detail' && (
      isFreshlyCreated
      || (planProgress.completedTasks === 0 && planProgress.totalWishes === 0)
    )
  );
  const taskStatusLabel = (status: Task['status']) => {
    if (status === 'completed') return '已完成';
    if (status === 'reviewing') return '待审核';
    if (status === 'in_progress') return '进行中';
    if (status === 'expired') return '已过期';
    return '待完成';
  };
  const rewardStatusLabel = (status?: 'available' | 'pending_approval' | 'redeemed') => {
    if (status === 'pending_approval') return '待确认';
    if (status === 'redeemed') return '已兑换';
    return '可兑换';
  };
  const clearFreshCreateMode = () => {
    setForceFullDetail(true);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('from');
      next.set('view', 'detail');
      return next;
    }, { replace: true });
  };
  const handleCreateChildPlans = async (drafts: PlanDecompositionDraft[]) => {
    if (!plan || drafts.length === 0) return;
    setIsCreatingChildPlans(true);
    try {
      const createdPlans: PlanData[] = [];
      for (const draft of drafts) {
        if (guestMode) {
          const guestPlan = saveGuestPlan({
            id: `guest-child-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: draft.name,
            type: draft.type,
            metadata: {
              kind: draft.kind,
              parentPlanId: plan.id,
              source: 'plan_decomposition',
              parentPlanName: plan.name,
              reason: draft.reason,
            },
            sortOrder: Date.now() + createdPlans.length,
          });
          createdPlans.push({
            id: guestPlan.id,
            name: guestPlan.name,
            type: guestPlan.type,
            metadata: guestPlan.metadata,
            parentPlanId: getPlanParentId(guestPlan),
          });
        } else {
          const dataPlan = await getDataLayer().addPlan({
            name: draft.name,
            type: draft.type,
            metadata: {
              kind: draft.kind,
              parentPlanId: plan.id,
              source: 'plan_decomposition',
              parentPlanName: plan.name,
              reason: draft.reason,
            },
            sortOrder: allPlans.length + createdPlans.length,
          });
          createdPlans.push({
            id: dataPlan.id,
            name: dataPlan.name,
            type: dataPlan.type,
            metadata: dataPlan.metadata,
            parentPlanId: getPlanParentId(dataPlan),
          });
        }
      }
      setAllPlans(prev => [...prev, ...createdPlans]);
      showToastGlobal(`已拆出 ${createdPlans.length} 个子计划`, 'success');
    } catch (error: any) {
      showToastGlobal(`生成子计划失败: ${error.message || '请稍后重试'}`, 'error');
    } finally {
      setIsCreatingChildPlans(false);
    }
  };

  const openGoalEdit = () => {
    setEditGoalFinalGoal(goalPlan?.finalGoal || plan?.name || '');
    setEditGoalFrequency(goalPlan?.practiceFrequency || od('每周 3 次', '3 times per week'));
    setEditGoalMinutes(goalPlan?.practiceMinutes || 30);
    setEditGoalPracticeTime(goalPlan?.practiceTime || '19:00');
    setEditGoalTargetDate(goalPlan?.targetDate || '');
    setEditGoalOptimizationHint(goalPlan?.optimizationHint || od('根据每周完成率和孩子状态调整练习频率、单次时长和家长陪伴方式。', 'Adjust practice frequency, session length, and parent support based on weekly completion and the child’s state.'));
    setIsGoalEditOpen(true);
  };

  const handleSaveGoalPlan = async () => {
    if (!plan) return;
    const nextGoalPlan: GoalPlanMetadata = {
      finalGoal: editGoalFinalGoal.trim() || plan.name,
      practiceFrequency: editGoalFrequency.trim() || od('每周 3 次', '3 times per week'),
      practiceMinutes: Math.max(5, editGoalMinutes || 30),
      practiceTime: editGoalPracticeTime || '19:00',
      targetDate: editGoalTargetDate || undefined,
      milestones: goalPlan?.milestones?.length ? goalPlan.milestones : [
        { title: od('明确目标和材料清单', 'Confirm goal and materials'), targetPercent: 20 },
        { title: od('完成第一阶段稳定练习', 'Finish the first stable practice stage'), targetPercent: 50 },
        { title: od('完成模拟验收和弱项修正', 'Run a mock check and fix weak points'), targetPercent: 80 },
        { title: od('完成最终验收', 'Complete final review'), targetPercent: 100 },
      ],
      optimizationHint: editGoalOptimizationHint.trim() || od('根据每周完成率和孩子状态调整练习频率、单次时长和家长陪伴方式。', 'Adjust practice frequency, session length, and parent support based on weekly completion and the child’s state.'),
    };
    const metadata = {
      ...(plan.metadata || {}),
      kind: 'goal',
      goalPlan: nextGoalPlan,
    };
    if (guestMode) {
      saveGuestPlan({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        metadata,
        sortOrder: Date.now(),
      });
    } else {
      await getDataLayer().updatePlan(plan.id, { metadata });
    }
    setPlan(prev => prev ? { ...prev, metadata } : prev);
    setIsGoalEditOpen(false);
    showToastGlobal('目标计划已更新', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* Header */}
      <TopAppBar
        title={shouldShowGuidedStart ? t('plans.start_this_plan', { defaultValue: od('开始这个计划', 'Start This Plan') }) : `${t('plan_detail.title', '编辑计划')} ${sceneEmoji()}`}
        backTo="/plans"
      />

      <div className="p-4 space-y-4">
        {shouldShowGuidedStart && plan && (
          <PlanStartGuide
            planName={guidedPlanName}
            planKind={planKind}
            planType={plan.type}
            isGeneratingTasks={isGeneratingTasks}
            onGenerate={handleGenerateTasksFromPlan}
            onAddTask={() => navigate(getCreationTemplateRoute('task', { planId: id, planName: plan.name || '' }))}
            onEditGoal={openGoalEdit}
            onShowDetail={clearFreshCreateMode}
            onBackToPlans={() => navigate('/plans')}
            planningBrief={planningBrief}
          />
        )}

        {!shouldShowGuidedStart && (
          <>
        {/* 统计卡片 */}
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="font-black text-base text-on-surface">{plan?.name}</h2>
              {planExperience && (
                <p className="mt-1 text-xs font-bold text-on-surface-variant/60 leading-relaxed">
                  {planExperience.headline}
                </p>
              )}
            </div>
            {planExperience && (
              <span className="shrink-0 rounded-full bg-primary/5 px-2 py-1 text-[10px] font-black text-primary">
                {planExperience.categoryLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-primary-container/30 rounded-xl p-3 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target size={18} className="text-primary" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant/50">{t('plan_detail.targets', '事项')}</span>
                <p className="text-2xl font-black text-on-surface">{planRegularTasks.length}</p>
              </div>
            </div>
            <div className="flex-1 bg-warning-container/50 rounded-xl p-3 flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-warning-container flex items-center justify-center">
                <Star size={18} className="text-warning" />
              </div>
              <div>
                <span className="text-xs font-bold text-on-surface-variant/50">{t('plan_detail.wishes', '心愿')}</span>
                <p className="text-2xl font-black text-on-surface">{wishCount}</p>
              </div>
            </div>
          </div>
          {planHabits.length > 0 && (
            <div className="mt-3 rounded-2xl bg-primary-container/20 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black text-primary">{t('plans.habit_checkins', { defaultValue: od('习惯打卡', 'Habit check-ins') })}</p>
                <p className="text-xs font-bold text-primary/70 mt-0.5">{t('plans.habit_progress_hint', { defaultValue: od('习惯看连续记录，不按目标进度条评价。', 'Habits are measured by streaks, not goal progress bars.') })}</p>
              </div>
              <span className="text-lg font-black text-primary">{planHabits.length}</span>
            </div>
          )}
          {plan?.type && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant/60 text-[10px] font-bold">
                {sceneEmoji()} {plan.type}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-bold">
                {planKindDefinition.label}
              </span>
              {grade && (
                <span className="px-2 py-0.5 rounded-full bg-primary-container/30 text-primary text-[10px] font-bold">
                  {grade}
                </span>
              )}
              {parentPlan && (
                <button
                  type="button"
                  onClick={() => navigate(`/plans/${parentPlan.id}`)}
                  className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-bold"
                >
                  {t('plans.belongs_to', { defaultValue: od('属于：{{name}}', 'Part of: {{name}}'), name: parentPlan.name })}
                </button>
              )}
              {timezone && (
                <span className="px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary text-[10px] font-bold flex items-center gap-1">
                  <Globe size={10} /> {timezone}
                </span>
              )}
            </div>
          )}
          <div className="mt-4 rounded-2xl bg-surface-container-low p-4">
            {planDisplaySummary.showOutcomeProgress ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-on-surface">
                    {planDisplaySummary.primaryLabel}
                  </span>
                  <span className="text-xs font-black text-primary">{planDisplaySummary.primaryValue}</span>
                </div>
                <div className="h-2 rounded-full bg-surface overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${planProgress.progressPercent}%` }} />
                </div>
              </>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-surface p-3">
                    <span className="text-[10px] font-bold text-on-surface-variant/40 block">{planDisplaySummary.primaryLabel}</span>
                    <span className="text-lg font-black text-on-surface">{planDisplaySummary.primaryValue}</span>
                  </div>
                  <div className="rounded-2xl bg-surface p-3">
                    <span className="text-[10px] font-bold text-on-surface-variant/40 block">{planDisplaySummary.secondaryLabel}</span>
                    <span className="text-lg font-black text-on-surface">{planDisplaySummary.secondaryValue}</span>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-on-surface-variant/60 leading-relaxed mt-3">
                  {planDisplaySummary.narrative}
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant/40 block">{t('common.pending', { defaultValue: od('待完成', 'Pending') })}</span>
                <span className="text-sm font-black text-on-surface">{planProgress.pendingTasks}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant/40 block">{t('common.reviewing', { defaultValue: od('待审核', 'Reviewing') })}</span>
                <span className="text-sm font-black text-on-surface">{planProgress.reviewingTasks}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant/40 block">{t('common.completed', { defaultValue: od('已完成', 'Completed') })}</span>
                <span className="text-sm font-black text-on-surface">{planProgress.completedTasks}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/10 flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold text-on-surface-variant/50">
                {t('plans.available_stars', { defaultValue: od('可获得 {{count}} 星', '{{count}} stars available'), count: planProgress.totalRewardStars })}
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant/50">
                {t('plans.wish_cost_summary', { defaultValue: od('心愿 {{done}}/{{total}} · 需 {{cost}} 星', 'Wishes {{done}}/{{total}} · need {{cost}} stars'), done: planProgress.redeemedWishes, total: planProgress.totalWishes, cost: planProgress.totalWishCost })}
              </span>
            </div>
            {planHierarchySummary && planHierarchySummary.childPlanCount > 0 && (
              <div className="mt-3 pt-3 border-t border-outline-variant/10">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[10px] font-black text-primary">{t('plans.child_plans_count', { defaultValue: od('下级计划 {{count}}', '{{count}} sub-plans'), count: planHierarchySummary.childPlanCount })}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant/40">
                    {t('plans.child_kind_summary', { defaultValue: od('目标 {{goal}} · 周期 {{cycle}} · 作息 {{routine}}', 'Goals {{goal}} · Routines {{cycle}} · Schedule {{routine}}'), goal: planHierarchySummary.childKindCounts.goal, cycle: planHierarchySummary.childKindCounts.cycle, routine: planHierarchySummary.childKindCounts.routine })}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-on-surface-variant/60 leading-relaxed">
                  {planHierarchySummary.narrative}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {childPlans.slice(0, 4).map(child => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => navigate(`/plans/${child.id}`)}
                      className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-black text-on-surface-variant/70"
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 目标型计划参数 */}
        {planKind === 'goal' && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-primary/10">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Target size={19} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-on-surface">{t('plans.goal_plan', { defaultValue: od('目标计划', 'Goal plan') })}</h3>
                  <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                    {goalPlan?.finalGoal || t('plans.goal_plan_default_hint', { defaultValue: od('先明确最终验收目标，再拆成日常练习和阶段里程碑。', 'Define the final outcome first, then split it into daily practice and milestones.') })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={openGoalEdit}
                className="shrink-0 rounded-full bg-surface-container-low px-3 py-2 text-[11px] font-black text-primary flex items-center gap-1 active:scale-95 transition-transform"
              >
                <Pencil size={13} />
                {t('common.edit', { defaultValue: od('编辑', 'Edit') })}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-2xl bg-surface-container-low p-3">
                <p className="text-[10px] font-bold text-on-surface-variant/40">{t('plans.practice_frequency', { defaultValue: od('练习频率', 'Practice') })}</p>
                <p className="mt-1 text-sm font-black text-on-surface">{goalPlan?.practiceFrequency || t('common.not_set', { defaultValue: od('待设置', 'Not set') })}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-low p-3">
                <p className="text-[10px] font-bold text-on-surface-variant/40">{t('plans.session_length', { defaultValue: od('单次时长', 'Length') })}</p>
                <p className="mt-1 text-sm font-black text-on-surface">{goalPlan?.practiceMinutes || 0} {t('common.minutes', { defaultValue: od('分钟', 'min') })}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-low p-3">
                <p className="text-[10px] font-bold text-on-surface-variant/40">{t('plans.target_date', { defaultValue: od('目标日期', 'Target date') })}</p>
                <p className="mt-1 text-sm font-black text-on-surface">{goalPlan?.targetDate ? formatGoalDate(goalPlan.targetDate) : t('common.tbd', { defaultValue: od('待定', 'TBD') })}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-primary/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black text-primary">{t('plans.milestone_progress', { defaultValue: od('里程碑进度', 'Milestone progress') })}</p>
                <p className="text-[11px] font-black text-primary">{planProgress.progressPercent}%</p>
              </div>
              <div className="h-2 rounded-full bg-surface overflow-hidden mb-3">
                <div className="h-full rounded-full bg-primary" style={{ width: `${planProgress.progressPercent}%` }} />
              </div>
              <div className="space-y-2">
                {(goalPlan?.milestones || []).slice(0, 5).map(milestone => (
                  <div key={milestone.title} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-on-surface-variant/70 truncate">{milestone.title}</span>
                    <span className="text-[10px] font-black text-primary">{milestone.targetPercent}%</span>
                  </div>
                ))}
                {!goalPlan?.milestones?.length && (
                  <p className="text-[11px] font-bold text-on-surface-variant/55">
                    {t('plans.no_milestone_hint', { defaultValue: od('还没有里程碑，点击编辑补充目标参数。', 'No milestones yet. Tap edit to add goal details.') })}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 rounded-2xl bg-warning-container/40 p-3">
              <p className="text-[11px] font-black text-warning mb-1">{t('plans.optimization_space', { defaultValue: od('进一步优化空间', 'Room to improve') })}</p>
              <p className="text-[11px] font-bold text-warning/80 leading-relaxed">
                {goalPlan?.optimizationHint || od('根据完成率、孩子兴趣和家庭时间，动态调整练习频率、单次时长和陪伴方式。', 'Adjust practice frequency, session length, and support based on completion, interest, and family time.')}
              </p>
            </div>
          </div>
        )}

        {/* 下一步 */}
        {planExperience && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-primary/10">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles size={19} />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-on-surface">{t('plans.next_step_title', { defaultValue: od('下一步做什么', 'What to do next') })}</h3>
                <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                  {t('plans.next_step_desc', { defaultValue: od('先选一个最容易开始的动作。计划不用一次做完，能落到今天或本周才有意义。', 'Pick the easiest first action. A plan only matters when it can land today or this week.') })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleGenerateTasksFromPlan}
                disabled={isGeneratingTasks}
                className="w-full rounded-2xl bg-primary text-white p-3 text-left flex items-center gap-3 active:scale-[0.99] transition-transform disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <ListChecks size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black">{isGeneratingTasks ? t('common.generating', { defaultValue: od('生成中...', 'Generating...') }) : t('plans.ai_generate_first_draft', { defaultValue: od('让 AI 先生成一版安排', 'Let AI draft the schedule') })}</p>
                  <p className="text-[10px] font-bold text-white/70 leading-relaxed mt-0.5">{t('plans.ai_generate_first_draft_desc', { defaultValue: od('把计划拆成孩子能看到、能打卡的任务。', 'Turn the plan into tasks the child can see and check in.') })}</p>
                </div>
                <ArrowRight size={15} className="text-white/60 shrink-0" />
              </button>
              <button
                onClick={() => navigate(getCreationTemplateRoute('task', { planId: id, planName: plan?.name || '' }))}
                className="w-full rounded-2xl bg-surface-container-low p-3 text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0">
                  <Plus size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-on-surface">{t('plans.add_one_item_manually', { defaultValue: od('自己添加一件事', 'Add one item yourself') })}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant/50 leading-relaxed mt-0.5">{t('plans.add_one_item_manually_desc', { defaultValue: od('适合你已经知道今天要做什么。', 'Use this when you already know what to do today.') })}</p>
                </div>
                <ArrowRight size={15} className="text-on-surface-variant/30 shrink-0" />
              </button>
              <button
                onClick={() => navigate('/plans')}
                className="w-full rounded-2xl bg-surface-container-low p-3 text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0">
                  <LayoutGrid size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-on-surface">{t('plans.back_to_plan_list', { defaultValue: od('回到计划列表', 'Back to plan list') })}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant/50 leading-relaxed mt-0.5">{t('plans.back_to_plan_list_desc', { defaultValue: od('先放着，之后再回来补细节。', 'Leave it for now and fill in details later.') })}</p>
                </div>
                <ArrowRight size={15} className="text-on-surface-variant/30 shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* 子计划拆解 */}
        {plan && (planKind === 'container' || planExperience?.category === 'holiday' || planExperience?.category === 'onboarding' || childPlans.length > 0) && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shrink-0">
                  <ListTree size={19} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm text-on-surface">{t('plans.sub_plan_breakdown', { defaultValue: od('子计划拆解', 'Sub-plan breakdown') })}</h3>
                  <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                    {t('plans.sub_plan_breakdown_desc', { defaultValue: od('总计划负责看全局，子计划分别承接作息、周期练习、目标里程碑和亲子活动。', 'The main plan keeps the big picture; sub-plans handle routines, recurring practice, milestones, and family activities.') })}
                  </p>
                </div>
              </div>
            </div>

            {childPlans.length > 0 && (
              <div className="space-y-2 mb-4">
                {childPlans.map(child => (
                  <button
                    key={child.id}
                    onClick={() => navigate(`/plans/${child.id}`)}
                    className="w-full rounded-2xl bg-surface-container-low p-3 text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
                  >
                    <div className="w-9 h-9 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0">
                      <ListTree size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-on-surface truncate">{child.name}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant/45 truncate">
                        {PLAN_KIND_DEFINITIONS[inferPlanKind({ kind: child.metadata?.kind as string | undefined, type: child.type, name: child.name })].label}
                      </p>
                    </div>
                    <ArrowRight size={15} className="text-on-surface-variant/30 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {decompositionDrafts.length > 0 ? (
              <div className="rounded-2xl bg-primary-container/20 p-3">
                <p className="text-[11px] font-black text-primary mb-2">{t('plans.suggest_one_click_generate', { defaultValue: od('建议一键生成', 'Suggested one-click generation') })}</p>
                <div className="space-y-2">
                  {decompositionDrafts.map(draft => (
                    <div key={draft.name} className="rounded-2xl bg-surface p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-on-surface">{draft.name}</p>
                        <span className="rounded-full bg-primary-container/20 px-2 py-0.5 text-[9px] font-black text-primary">
                          {PLAN_KIND_DEFINITIONS[draft.kind].label}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-on-surface-variant/50 leading-relaxed mt-1">{draft.reason}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleCreateChildPlans(decompositionDrafts)}
                  disabled={isCreatingChildPlans}
                  className="mt-3 w-full h-11 rounded-2xl bg-primary text-white text-xs font-black active:scale-[0.99] transition-transform disabled:opacity-50"
                >
                  {isCreatingChildPlans ? t('common.generating', { defaultValue: od('生成中...', 'Generating...') }) : t('plans.generate_sub_plans', { defaultValue: od('生成 {{count}} 个子计划', 'Generate {{count}} sub-plans'), count: decompositionDrafts.length })}
                </button>
              </div>
            ) : childPlans.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-low p-3 text-center">
                <p className="text-xs font-bold text-on-surface-variant/55">{t('plans.no_breakdown_needed', { defaultValue: od('当前计划暂时不需要自动拆解。', 'This plan does not need automatic breakdown yet.') })}</p>
              </div>
            ) : null}
          </div>
        )}

          </>
        )}

        {!shouldShowGuidedStart && (
          <>
        {/* AI 方案摘要 */}
        {isAiPlan && aiRecommendation && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Brain size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-on-surface">{t('plans.ai_summary', { defaultValue: od('AI 方案摘要', 'AI plan summary') })}</h3>
                {aiProfile && (
                  <p className="text-[10px] font-bold text-on-surface-variant/45 mt-0.5">
                    {[aiProfile.grade, aiProfile.age ? t('common.age_years', { defaultValue: od('{{age}}岁', '{{age}} years old'), age: aiProfile.age }) : '', aiProfile.city].filter(Boolean).join(' · ') || t('ai_analysis.family_profile', { defaultValue: od('家庭画像', 'Family profile') })}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs font-bold text-on-surface-variant/70 leading-relaxed">
              {aiRecommendation.summary}
            </p>

            {aiRecommendation.parentTips.length > 0 && (
              <div className="mt-4 rounded-2xl bg-warning-container/50 p-3">
                <h4 className="text-[11px] font-black text-warning mb-2 flex items-center gap-1.5">
                  <Lightbulb size={13} /> {t('plans.parent_tips', { defaultValue: od('家长建议', 'Parent tips') })}
                </h4>
                <div className="space-y-1.5">
                  {aiRecommendation.parentTips.slice(0, 3).map((tip, index) => (
                    <p key={index} className="text-[11px] font-bold text-warning/80 leading-relaxed">
                      {index + 1}. {tip}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {aiRecommendation.subjectAdvice.length > 0 && (
              <div className="mt-3 rounded-2xl bg-surface-container-low p-3">
                <h4 className="text-[11px] font-black text-on-surface mb-2 flex items-center gap-1.5">
                  <BookOpen size={13} /> {t('plans.learning_strategy', { defaultValue: od('学习策略', 'Learning strategy') })}
                </h4>
                <div className="space-y-2">
                  {aiRecommendation.subjectAdvice.slice(0, 3).map((advice, index) => (
                    <div key={`${advice.subject}-${index}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-on-surface">{advice.subject}</span>
                        <span className="text-[9px] font-black text-primary bg-primary/5 rounded-full px-2 py-0.5">
                          {advice.status}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-on-surface-variant/55 mt-0.5 leading-relaxed">
                        {advice.strategy}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 每日作息展示 */}
        {schedule && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="font-black text-sm text-on-surface flex items-center gap-2 min-w-0">
                <Clock size={14} /> {t('plans.daily_routine', { defaultValue: od('每日作息', 'Daily routine') })}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleGenerateTasksFromPlan}
                  disabled={isGeneratingTasks}
                  className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-black active:scale-95 transition-all disabled:opacity-50"
                >
                  {isGeneratingTasks ? t('common.generating', { defaultValue: od('生成中...', 'Generating...') }) : t('plans.one_click_execute', { defaultValue: od('一键进入执行', 'Start execution') })}
                </button>
                <button
                  onClick={handleCopySharedTemplate}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-low text-primary text-[11px] font-black active:scale-95 transition-all flex items-center gap-1"
                >
                <Share2 size={12} /> {t('community.anonymized_share', { defaultValue: od('脱敏分享', 'Anonymized share') })}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5 bg-warning-container/50 rounded-xl px-3 py-2">
                <Sun size={14} className="text-warning" />
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant/40 block">{t('schedule.wake_up', { defaultValue: od('起床', 'Wake up') })}</span>
                  <span className="text-sm font-black text-on-surface">{schedule.wakeTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-tertiary-container/20 rounded-xl px-3 py-2">
                <Moon size={14} className="text-tertiary" />
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant/40 block">{t('schedule.bedtime', { defaultValue: od('就寝', 'Bedtime') })}</span>
                  <span className="text-sm font-black text-on-surface">{schedule.bedTime}</span>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              {schedule.slots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-3 py-1.5 border-b border-outline-variant/5 last:border-0">
                  <span className="w-6 text-center text-sm">{slot.icon}</span>
                  <span className="text-[11px] font-bold text-primary w-24 shrink-0">
                    {slot.startTime}-{slot.endTime}
                  </span>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-on-surface">{slot.label}</span>
                    {slot.description && (
                      <span className="text-[10px] text-on-surface-variant/40 ml-1">{slot.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* 三餐信息 */}
            <div className="mt-3 pt-3 border-t border-outline-variant/10">
              <span className="text-[10px] font-bold text-on-surface-variant/40 block mb-1.5">{t('schedule.meal_times', { defaultValue: od('用餐时间', 'Meal times') })}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold">{t('schedule.breakfast_time', { defaultValue: od('早餐 {{time}}', 'Breakfast {{time}}'), time: schedule.mealTimes.breakfast })}</span>
                <span className="text-outline-variant/30">|</span>
                <span className="text-xs font-bold">{t('schedule.lunch_time', { defaultValue: od('午餐 {{time}}', 'Lunch {{time}}'), time: schedule.mealTimes.lunch })}</span>
                <span className="text-outline-variant/30">|</span>
                <span className="text-xs font-bold">{t('schedule.dinner_time', { defaultValue: od('晚餐 {{time}}', 'Dinner {{time}}'), time: schedule.mealTimes.dinner })}</span>
              </div>
            </div>
          </div>
        )}

        {/* 每周固定活动 */}
        {weeklyActivities.length > 0 && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
            <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
              <Users size={14} /> {t('plans.weekly_fixed_activities', { defaultValue: od('每周固定活动', 'Weekly fixed activities') })}
            </h3>
            <div className="space-y-1">
              {weeklyActivities.map((act, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-primary w-10">{act.day}</span>
                  <span className="text-on-surface-variant/60">{act.time}</span>
                  <span className="text-on-surface font-bold">{act.activity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 目标列表 */}
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm text-on-surface">{t('plan_detail.targets_list', '目标列表')}</h3>
            <button
              onClick={() => navigate(getCreationTemplateRoute('task', { planId: id, planName: plan?.name || '' }))}
              className="flex items-center gap-1 text-primary text-xs font-black"
            >
              <Plus size={14} strokeWidth={3} />
              <span>{t('plan_detail.add_target', '添加目标')}</span>
            </button>
          </div>
          {planTasks.length === 0 ? (
            <div className="text-center py-8">
              <LayoutGrid size={36} className="mx-auto text-outline-variant/30 mb-2" />
              <p className="text-xs font-bold text-on-surface-variant/40">{t('plan_detail.no_targets', '暂无目标，点击上方按钮添加')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {planTasks.slice(0, 8).map(task => (
                <button
                  key={task.id}
                  onClick={() => navigate(`/tasks/edit/${task.id}`)}
                  className="w-full flex items-center gap-3 rounded-2xl bg-surface-container-low p-3 text-left active:scale-[0.99] transition-transform"
                >
                  <div className={task.status === 'completed'
                    ? 'w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0'
                    : 'w-9 h-9 rounded-xl bg-surface text-on-surface-variant/50 flex items-center justify-center shrink-0'}
                  >
                    {task.status === 'completed' ? <CheckCircle2 size={17} /> : <Clock size={17} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-on-surface truncate">{task.title}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/45 truncate">
                      {task.startTime ? `${new Date(task.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} · ` : ''}
                      {taskStatusLabel(task.status)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-warning-container/50 px-2 py-1 text-warning shrink-0">
                    <Star size={11} className="fill-current" />
                    <span className="text-[10px] font-black">{task.rewardStars}</span>
                  </div>
                </button>
              ))}
              {planTasks.length > 8 && (
                <button
                  onClick={() => navigate('/tasks')}
                  className="w-full py-2 rounded-xl text-xs font-black text-primary bg-primary/5 active:scale-[0.99] transition-transform"
                >
                  {t('plans.view_all_targets', { defaultValue: od('查看全部 {{count}} 个目标', 'View all {{count}} targets'), count: planTasks.length })}
                </button>
              )}
            </div>
          )}
        </div>

        {/* 心愿列表占位 */}
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-sm text-on-surface">{t('plan_detail.wishes_list', '心愿列表')}</h3>
            <button
              onClick={() => navigate(getCreationTemplateRoute('reward', { planId: id, planName: plan?.name || '' }))}
              className="flex items-center gap-1 text-warning text-xs font-black"
            >
              <Sparkles size={14} />
              <span>{t('plan_detail.add_wish', '添加心愿')}</span>
            </button>
          </div>
          {planRewards.length === 0 ? (
            <div className="text-center py-8">
              <Star size={36} className="mx-auto text-outline-variant/30 mb-2" />
              <p className="text-xs font-bold text-on-surface-variant/40">{t('plan_detail.no_wishes', '暂无心愿，点击上方按钮添加')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {planRewards.slice(0, 8).map(reward => (
                <button
                  key={reward.id}
                  onClick={() => navigate(`/rewards/edit/${reward.id}`)}
                  className="w-full flex items-center gap-3 rounded-2xl bg-warning-container/50 p-3 text-left active:scale-[0.99] transition-transform"
                >
                  <div className={reward.status === 'redeemed'
                    ? 'w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0'
                    : 'w-9 h-9 rounded-xl bg-surface text-warning flex items-center justify-center shrink-0'}
                  >
                    {reward.status === 'redeemed' ? <CheckCircle2 size={17} /> : <Sparkles size={17} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-on-surface truncate">{reward.name}</p>
                    <p className="text-[10px] font-bold text-on-surface-variant/45 truncate">
                      {reward.category || t('rewards.wish', { defaultValue: od('心愿', 'Wish') })} · {rewardStatusLabel(reward.status)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-warning shrink-0">
                    <Star size={11} className="fill-current" />
                    <span className="text-[10px] font-black">{reward.cost}</span>
                  </div>
                </button>
              ))}
              {planRewards.length > 8 && (
                <button
                  onClick={() => navigate('/rewards')}
                  className="w-full py-2 rounded-xl text-xs font-black text-warning bg-warning-container/50 active:scale-[0.99] transition-transform"
                >
                  {t('plans.view_all_wishes', { defaultValue: od('查看全部 {{count}} 个心愿', 'View all {{count}} wishes'), count: planRewards.length })}
                </button>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </div>

      <AppModal
        open={isGoalEditOpen}
        onClose={() => setIsGoalEditOpen(false)}
        title={t('plans.edit_goal_plan', { defaultValue: od('编辑目标计划', 'Edit goal plan') })}
        surface="sheet"
      >
        <div className="space-y-3">
          <input
            value={editGoalFinalGoal}
            onChange={event => setEditGoalFinalGoal(event.target.value)}
            placeholder={t('plans.final_goal_placeholder', { defaultValue: od('最终目标', 'Final goal') })}
            className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={editGoalFrequency}
              onChange={event => setEditGoalFrequency(event.target.value)}
              placeholder={t('plans.practice_frequency_placeholder', { defaultValue: od('练习频率', 'Practice frequency') })}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
            />
            <input
              type="number"
              min={5}
              max={180}
              value={editGoalMinutes}
              onChange={event => setEditGoalMinutes(Number(event.target.value) || 30)}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={editGoalPracticeTime}
              onChange={event => setEditGoalPracticeTime(event.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
            />
            <input
              type="date"
              value={editGoalTargetDate}
              onChange={event => setEditGoalTargetDate(event.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
            />
          </div>
          <textarea
            value={editGoalOptimizationHint}
            onChange={event => setEditGoalOptimizationHint(event.target.value)}
            rows={4}
            placeholder={t('plans.optimization_hint_placeholder', { defaultValue: od('优化建议', 'Optimization suggestion') })}
            className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary resize-none"
          />
          <button
            type="button"
            onClick={handleSaveGoalPlan}
            className="w-full py-3.5 rounded-2xl bg-primary text-white font-black text-sm active:scale-[0.98] transition-transform"
          >
            {t('plans.save_goal_adjustment', { defaultValue: od('保存目标调整', 'Save goal changes') })}
          </button>
        </div>
      </AppModal>
    </div>
  );
}

function formatGoalDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getFriendlyPlanName(planName = '', planTasks: Task[], planType = ''): string {
  const trimmedName = planName.trim();
  if (trimmedName && trimmedName !== '计划' && trimmedName !== '自定义计划') return trimmedName;

  const fromTask = planTasks
    .map(task => task.title)
    .find(title => /计划[:：]/.test(title));
  const inferred = fromTask?.split(/[:：]/)[0]?.trim();
  if (inferred && inferred.length <= 12) return inferred;

  if (planType && planType !== '自定义') return planType;
  return trimmedName || '这个计划';
}

function PlanStartGuide({
  planName,
  planKind,
  planType,
  isGeneratingTasks,
  onGenerate,
  onAddTask,
  onEditGoal,
  onShowDetail,
  onBackToPlans,
  planningBrief,
}: {
  planName: string;
  planKind: ReturnType<typeof inferPlanKind>;
  planType: string;
  isGeneratingTasks: boolean;
  onGenerate: () => void;
  onAddTask: () => void;
  onEditGoal: () => void;
  onShowDetail: () => void;
  onBackToPlans: () => void;
  planningBrief?: GuidedPlanningBrief;
}) {
  const { t, i18n } = useTranslation();
  const isZh = (i18n.language || '').toLowerCase().startsWith('zh');
  const od = (zh: string, en: string) => (isZh ? zh : en);
  const guide = getPlanStartGuideCopy(planName, planKind, planType, od);
  const primaryAction = planKind === 'goal'
    ? {
      label: t('plans.confirm_goal_rhythm', { defaultValue: od('确认目标和练习节奏', 'Confirm goal and rhythm') }),
      desc: t('plans.confirm_goal_rhythm_desc', { defaultValue: od('先把目标、每周几次、一次多久定下来。', 'Set the goal, weekly frequency, and session length first.') }),
      icon: Pencil,
      onClick: onEditGoal,
    }
    : { label: guide.primaryLabel, desc: guide.primaryDesc, icon: ListChecks, onClick: onGenerate };
  const PrimaryIcon = primaryAction.icon;

  if (planningBrief) {
    return (
      <div className="space-y-3">
        <section className="rounded-3xl bg-primary text-white p-5 shadow-lg shadow-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles size={23} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-white/65">{t('plans.draft_ready', { defaultValue: od('计划草案已整理好', 'Plan draft is ready') })}</p>
              <p className="mt-1 text-xl font-black leading-tight">{planningBrief.name}</p>
              <p className="mt-2 text-sm font-bold text-white/78 leading-relaxed">{planningBrief.summary}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-surface p-5 shadow-sm border border-outline-variant/10">
          <div className="mb-4 rounded-2xl bg-primary/5 p-4">
            <p className="text-sm font-black text-on-surface">{t('plans.confirm_ai_understanding', { defaultValue: od('先确认 AI 理解得对不对', 'Confirm AI understood correctly') })}</p>
            <p className="mt-1 text-xs font-bold text-on-surface-variant/60 leading-relaxed">
              {t('plans.confirm_ai_understanding_desc', { defaultValue: od('这里保留的是刚才问清楚的家庭需求。确认无误后，再一次性生成孩子能看到、能打卡的具体事项。', 'These are the family needs we just clarified. After confirming, generate concrete items the child can see and check in.') })}
            </p>
          </div>

          <div className="grid gap-2">
            {planningBrief.checkpoints.map(item => (
              <div key={item.label} className="rounded-2xl bg-surface-container-low p-3">
                <p className="text-[10px] font-black text-on-surface-variant/45">{item.label}</p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-on-surface">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-surface p-5 shadow-sm border border-outline-variant/10">
          <p className="text-sm font-black text-on-surface">{t('plans.after_confirm_generate', { defaultValue: od('确认后会生成', 'After confirmation, it will generate') })}</p>
          <div className="mt-3 space-y-2">
            {planningBrief.generatedItems.map(item => (
              <div key={item} className="flex items-start gap-2 rounded-2xl bg-primary-container/20 p-3">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
                <p className="text-xs font-bold leading-relaxed text-on-surface">{item}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={isGeneratingTasks}
            className="mt-4 w-full rounded-2xl bg-primary p-4 text-left text-white active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center gap-3 shadow-sm"
          >
            <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <ListChecks size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">{isGeneratingTasks ? t('common.generating_now', { defaultValue: od('正在生成...', 'Generating...') }) : t('plans.confirm_generate_concrete_plan', { defaultValue: od('确认，生成具体计划', 'Confirm and generate plan') })}</span>
              <span className="block text-[11px] font-bold text-white/70 mt-0.5">{t('plans.confirm_generate_concrete_plan_desc', { defaultValue: od('把草案一次性落成任务、习惯和后续可编辑的安排。', 'Turn the draft into tasks, habits, and editable follow-up arrangements.') })}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-white/70" />
          </button>
          <button
            type="button"
            onClick={onShowDetail}
            className="mt-3 w-full rounded-2xl bg-surface-container-low py-3 text-xs font-black text-on-surface-variant active:scale-[0.98] transition-transform"
          >
            {t('plans.skip_generate_view_detail', { defaultValue: od('暂不生成，先看完整详情', 'Not now, view full details') })}
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="rounded-3xl bg-primary text-white p-5 shadow-lg shadow-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Sparkles size={23} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-white/65">{t('plans.created_successfully', { defaultValue: od('刚刚创建成功', 'Created successfully') })}</p>
            <p className="mt-1 text-xl font-black leading-tight">{guide.title}</p>
            <p className="mt-2 text-sm font-bold text-white/78 leading-relaxed">{guide.desc}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-surface p-5 shadow-sm border border-outline-variant/10">
        <div className="mb-4 rounded-2xl bg-primary/5 p-4">
          <p className="text-sm font-black text-on-surface">{t('plans.decide_how_to_start', { defaultValue: od('这一步只需要决定怎么开始', 'Just decide how to start') })}</p>
          <p className="mt-1 text-xs font-bold text-on-surface-variant/60 leading-relaxed">
            {guide.focus}
          </p>
        </div>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={primaryAction.onClick}
            disabled={planKind !== 'goal' && isGeneratingTasks}
            className="rounded-2xl bg-primary text-white p-4 text-left active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center gap-3 shadow-sm"
          >
            <span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <PrimaryIcon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">{isGeneratingTasks && planKind !== 'goal' ? t('common.generating_now', { defaultValue: od('正在生成...', 'Generating...') }) : primaryAction.label}</span>
              <span className="block text-[11px] font-bold text-white/70 mt-0.5">{primaryAction.desc}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-white/70" />
          </button>
          <button
            type="button"
            onClick={onAddTask}
            className="rounded-2xl bg-surface-container-low p-4 text-left active:scale-[0.98] transition-transform flex items-center gap-3"
          >
            <span className="w-10 h-10 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0">
              <Plus size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-on-surface">{guide.manualLabel}</span>
              <span className="block text-[11px] font-bold text-on-surface-variant/55 mt-0.5">{guide.manualDesc}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-on-surface-variant/30" />
          </button>
          <button
            type="button"
            onClick={onBackToPlans}
            className="rounded-2xl bg-surface-container-low p-4 text-left active:scale-[0.98] transition-transform flex items-center gap-3"
          >
            <span className="w-10 h-10 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0">
              <LayoutGrid size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-on-surface">{t('plans.put_back_to_list', { defaultValue: od('先放回计划列表', 'Put it back in the list') })}</span>
              <span className="block text-[11px] font-bold text-on-surface-variant/55 mt-0.5">{t('plans.put_back_to_list_desc', { defaultValue: od('不用现在完善，后面想起来再补。', 'No need to finish now. Add details later when they come to mind.') })}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-on-surface-variant/30" />
          </button>
        </div>

        <button
          type="button"
          onClick={onShowDetail}
          className="mt-4 w-full py-2 text-xs font-black text-on-surface-variant/45 active:scale-[0.98] transition-transform"
        >
          {t('plans.view_full_detail_stats', { defaultValue: od('我想看完整详情和统计', 'View full details and stats') })}
        </button>
      </section>
    </div>
  );
}

function getPlanStartGuideCopy(planName: string, planKind: ReturnType<typeof inferPlanKind>, planType: string, od: (zh: string, en: string) => string) {
  const text = `${planName} ${planType}`;
  const isHoliday = /假|暑|寒|holiday|summer|winter|旅行|旅游|游学/.test(text);

  if (planKind === 'goal') {
    return {
      title: od(`先把「${planName}」说清楚`, `Clarify "${planName}" first`),
      desc: od('它属于目标型计划。先不用看统计，也不用急着加很多任务，先确定目标和练习节奏。', 'This is a goal-based plan. Ignore stats for now and set the goal plus practice rhythm first.'),
      focus: od('家长最容易漏掉的是“目标怎么算完成”。先确认这件事，AI 才能拆出靠谱的每日练习和里程碑。', 'Parents often miss what “done” means. Confirm that first so AI can create realistic practice and milestones.'),
      primaryLabel: od('确认目标和练习频率', 'Confirm goal and practice frequency'),
      primaryDesc: od('设置最终目标、练习次数、单次时长和目标日期。', 'Set the final goal, frequency, session length, and target date.'),
      manualLabel: od('先添加一个里程碑', 'Add one milestone first'),
      manualDesc: od('例如“完成第一首曲子”“读完前 5 本书”。', 'For example, “finish the first song” or “read the first 5 books.”'),
    };
  }

  if (planKind === 'cycle') {
    return {
      title: od(`先让「${planName}」变成习惯`, `Turn "${planName}" into a habit first`),
      desc: od('它属于反复执行的安排。关键不是完成百分比，而是固定频率和舒服的时间点。', 'This repeats over time. The key is a steady frequency and comfortable timing, not a percent bar.'),
      focus: od('先让 AI 按家庭日程找一个不容易冲突的时间，再根据孩子状态慢慢调整。', 'Let AI find a low-conflict time based on the family schedule, then adjust gradually.'),
      primaryLabel: od('让 AI 排一版固定节奏', 'Let AI set a steady rhythm'),
      primaryDesc: od('自动变成孩子能看到、能打卡的安排。', 'Turn it into something the child can see and check in.'),
      manualLabel: od('先添加第一次练习', 'Add the first practice'),
      manualDesc: od('例如“周三练琴 30 分钟”。', 'For example, “practice piano for 30 minutes on Wednesday.”'),
    };
  }

  if (isHoliday) {
    return {
      title: od(`先给「${planName}」排个大框架`, `Give "${planName}" a simple framework first`),
      desc: od('假期计划最怕一上来填太细。先定每天的大节奏，再把学习、运动、出游和放松放进去。', 'Holiday plans fail when they get too detailed too early. Set the daily rhythm first, then add learning, movement, trips, and rest.'),
      focus: od('先让 AI 生成一版假期骨架，后面再补兴趣班、亲子出游、心愿兑现和临时变化。', 'Let AI create a holiday skeleton first; add classes, family outings, wishes, and changes later.'),
      primaryLabel: od('让 AI 排一版假期日程', 'Let AI draft a holiday schedule'),
      primaryDesc: od('先给出起床、学习、运动、娱乐和睡眠的大节奏。', 'Start with wake-up, learning, exercise, fun, and sleep rhythm.'),
      manualLabel: od('先添加一个假期安排', 'Add one holiday item'),
      manualDesc: od('例如“每天阅读 20 分钟”或“周末科学馆”。', 'For example, “read 20 minutes daily” or “science museum on the weekend.”'),
    };
  }

  return {
    title: od(`先让「${planName}」落到今天`, `Make "${planName}" work today first`),
    desc: od('日程类计划不是写一张漂亮表格，而是让今天或本周真的更顺一点。', 'A schedule plan is not a pretty table. It should make today or this week smoother.'),
    focus: od('如果你还没想清楚细节，就让 AI 先排草稿；如果已经知道第一件事，就直接添加。', 'If details are unclear, let AI draft first. If you know the first item, add it directly.'),
    primaryLabel: od('让 AI 排一版日程草稿', 'Let AI draft a schedule'),
    primaryDesc: od('先把时间段变成孩子能执行的任务。', 'Turn time blocks into tasks the child can do.'),
    manualLabel: od('先添加一个固定安排', 'Add one fixed arrangement'),
    manualDesc: od('例如“放学后写作业”或“睡前整理书包”。', 'For example, “homework after school” or “pack bag before bed.”'),
  };
}
