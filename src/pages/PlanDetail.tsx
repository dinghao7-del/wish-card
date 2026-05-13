import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Target, Star, Sparkles, LayoutGrid, Clock, Sun, Moon, Globe, Users, Share2, Brain, Lightbulb, BookOpen, CheckCircle2, ListChecks, ArrowRight, ListTree } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { DailyScheduleTemplate, PLAN_SCENES, dailyScheduleTemplateToFamilyPlan, type PlanSceneType } from '../lib/planTemplates';
import { buildPlanDecompositionDrafts, buildPlanDetailActionItems, buildPlanDisplaySummary, buildPlanExecutionDrafts, buildPlanExperienceSummary, buildPlanHierarchySummary, calculatePlanProgress, filterNewTaskDrafts, getPlanParentId, inferPlanKind, PLAN_KIND_DEFINITIONS, type PlanDecompositionDraft, type PlanDetailActionItem } from '../domain/familyPlanning';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { showToastGlobal } from '../components/Toast';
import type { Task } from '../types';
import { getDataLayer } from '../lib/DataLayer';
import { createSharedScheduleTemplateDraft, saveCommunityShareDraft } from '../lib/communityShare';
import { buildUiTaskFromDraft } from '../lib/planExecutionTasks';
import type { ChildProfile, ScheduleRecommendation } from '../lib/scheduleRecommendAI';
import { getGuestPlan, getGuestPlans, saveGuestPlan } from '../lib/guestPlans';

interface PlanData {
  id: string;
  name: string;
  type: string;
  metadata?: Record<string, unknown>;
  parentPlanId?: string;
}

export function PlanDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
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
  const detailActions = planExperience ? buildPlanDetailActionItems({
    kind: planKind,
    experience: planExperience,
    progress: planProgress,
    childPlanCount: planHierarchySummary?.childPlanCount,
    habitCount: planHabits.length,
    hasSchedule: Boolean(schedule),
  }) : [];
  const decompositionDrafts = plan ? buildPlanDecompositionDrafts({
    parentPlanName: plan.name,
    parentPlanType: plan.type,
    parentKind: planKind,
    metadata: plan.metadata,
    existingChildNames: childPlans.map(child => child.name),
  }) : [];
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
  const handleDetailAction = (action: PlanDetailActionItem) => {
    if (action.id === 'generate_tasks') {
      handleGenerateTasksFromPlan();
      return;
    }
    if (action.id === 'quadrant') {
      navigate('/quadrant?range=week');
      return;
    }
    if (action.id === 'weekly_report' || action.id === 'review_progress') {
      navigate('/reports?period=week');
      return;
    }
    if (action.id === 'manage_children') {
      const firstChildPlan = childPlans[0];
      if (firstChildPlan) navigate(`/plans/${firstChildPlan.id}`);
      else setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('suggest', 'children');
        return next;
      }, { replace: true });
      return;
    }
    if (action.id === 'complete_class_times') {
      navigate('/tasks');
    }
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
        title={`${t('plan_detail.title', '编辑计划')} ${sceneEmoji()}`}
        backTo="/plans"
      />

      <div className="p-4 space-y-4">
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
                <p className="text-[10px] font-black text-primary">习惯打卡</p>
                <p className="text-xs font-bold text-primary/70 mt-0.5">习惯看连续记录，不按目标进度条评价。</p>
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
                  属于：{parentPlan.name}
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
                <span className="text-[10px] font-bold text-on-surface-variant/40 block">待完成</span>
                <span className="text-sm font-black text-on-surface">{planProgress.pendingTasks}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant/40 block">待审核</span>
                <span className="text-sm font-black text-on-surface">{planProgress.reviewingTasks}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant/40 block">已完成</span>
                <span className="text-sm font-black text-on-surface">{planProgress.completedTasks}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/10 flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold text-on-surface-variant/50">
                可获得 {planProgress.totalRewardStars} 星
              </span>
              <span className="text-[10px] font-bold text-on-surface-variant/50">
                心愿 {planProgress.redeemedWishes}/{planProgress.totalWishes} · 需 {planProgress.totalWishCost} 星
              </span>
            </div>
            {planHierarchySummary && planHierarchySummary.childPlanCount > 0 && (
              <div className="mt-3 pt-3 border-t border-outline-variant/10">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[10px] font-black text-primary">下级计划 {planHierarchySummary.childPlanCount}</span>
                  <span className="text-[10px] font-bold text-on-surface-variant/40">
                    目标 {planHierarchySummary.childKindCounts.goal} · 周期 {planHierarchySummary.childKindCounts.cycle} · 作息 {planHierarchySummary.childKindCounts.routine}
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

        {/* 落地工作台 */}
        {planExperience && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-primary/10">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles size={19} />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-on-surface">落地工作台</h3>
                <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                  {planExperience.nextActionHint}
                </p>
              </div>
            </div>

            {detailActions.length > 0 ? (
              <div className="grid grid-cols-1 gap-2">
                {detailActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleDetailAction(action)}
                    disabled={action.id === 'generate_tasks' && isGeneratingTasks}
                    className="w-full rounded-2xl bg-surface-container-low p-3 text-left flex items-center gap-3 active:scale-[0.99] transition-transform disabled:opacity-50"
                  >
                    <div className={action.priority === 'high'
                      ? 'w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0'
                      : 'w-9 h-9 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0'}
                    >
                      {action.id === 'generate_tasks' ? <ListChecks size={17} /> : action.id === 'quadrant' ? <LayoutGrid size={17} /> : <ArrowRight size={17} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-on-surface">{action.id === 'generate_tasks' && isGeneratingTasks ? '生成中...' : action.label}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant/50 leading-relaxed mt-0.5">{action.description}</p>
                    </div>
                    <ArrowRight size={15} className="text-on-surface-variant/30 shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-container-low p-3">
                <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed">
                  当前计划已经有基础内容，可以继续在下方维护事项、习惯和心愿。
                </p>
              </div>
            )}
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
                  <h3 className="font-black text-sm text-on-surface">子计划拆解</h3>
                  <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                    总计划负责看全局，子计划分别承接作息、周期练习、目标里程碑和亲子活动。
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
                <p className="text-[11px] font-black text-primary mb-2">建议一键生成</p>
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
                  {isCreatingChildPlans ? '生成中...' : `生成 ${decompositionDrafts.length} 个子计划`}
                </button>
              </div>
            ) : childPlans.length === 0 ? (
              <div className="rounded-2xl bg-surface-container-low p-3 text-center">
                <p className="text-xs font-bold text-on-surface-variant/55">当前计划暂时不需要自动拆解。</p>
              </div>
            ) : null}
          </div>
        )}

        {/* AI 方案摘要 */}
        {isAiPlan && aiRecommendation && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Brain size={20} />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-sm text-on-surface">AI 方案摘要</h3>
                {aiProfile && (
                  <p className="text-[10px] font-bold text-on-surface-variant/45 mt-0.5">
                    {[aiProfile.grade, aiProfile.age ? `${aiProfile.age}岁` : '', aiProfile.city].filter(Boolean).join(' · ') || '家庭画像'}
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
                  <Lightbulb size={13} /> 家长建议
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
                  <BookOpen size={13} /> 学习策略
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
                <Clock size={14} /> 每日作息
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleGenerateTasksFromPlan}
                  disabled={isGeneratingTasks}
                  className="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-black active:scale-95 transition-all disabled:opacity-50"
                >
                  {isGeneratingTasks ? '生成中...' : '一键进入执行'}
                </button>
                <button
                  onClick={handleCopySharedTemplate}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-low text-primary text-[11px] font-black active:scale-95 transition-all flex items-center gap-1"
                >
                  <Share2 size={12} /> 脱敏分享
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5 bg-warning-container/50 rounded-xl px-3 py-2">
                <Sun size={14} className="text-warning" />
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant/40 block">起床</span>
                  <span className="text-sm font-black text-on-surface">{schedule.wakeTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-tertiary-container/20 rounded-xl px-3 py-2">
                <Moon size={14} className="text-tertiary" />
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant/40 block">就寝</span>
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
              <span className="text-[10px] font-bold text-on-surface-variant/40 block mb-1.5">用餐时间</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold">早餐 {schedule.mealTimes.breakfast}</span>
                <span className="text-outline-variant/30">|</span>
                <span className="text-xs font-bold">午餐 {schedule.mealTimes.lunch}</span>
                <span className="text-outline-variant/30">|</span>
                <span className="text-xs font-bold">晚餐 {schedule.mealTimes.dinner}</span>
              </div>
            </div>
          </div>
        )}

        {/* 每周固定活动 */}
        {weeklyActivities.length > 0 && (
          <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
            <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
              <Users size={14} /> 每周固定活动
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
              onClick={() => navigate(`/tasks/new?planId=${id}&planName=${encodeURIComponent(plan?.name || '')}`)}
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
                  查看全部 {planTasks.length} 个目标
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
              onClick={() => navigate(`/rewards/new?planId=${id}&planName=${encodeURIComponent(plan?.name || '')}`)}
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
                      {reward.category || '心愿'} · {rewardStatusLabel(reward.status)}
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
                  查看全部 {planRewards.length} 个心愿
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
