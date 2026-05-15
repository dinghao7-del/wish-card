import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, LayoutGrid, Trash2, Star, Target, Bot, Users, Sparkles, CalendarDays, ClipboardCheck, Flag, Layers, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { AppModal } from '../components/AppModal';
import { getDataLayer } from '../lib/DataLayer';
import { buildPlanCenterOverview, buildPlanDisplaySummary, buildPlanExperienceSummary, buildPlanHierarchySummary, calculatePlanProgress, getPlanParentId, inferPlanKind, PLAN_KIND_DEFINITIONS, type PlanCenterOverview, type PlanDisplaySummary, type PlanExperienceCategory, type PlanExperienceSummary, type PlanHierarchySummary, type PlanKind, type PlanProgressSummary } from '../domain/familyPlanning';
import { deleteGuestPlan, getGuestPlans, saveGuestPlan } from '../lib/guestPlans';

interface PlanItem {
  id: string;
  name: string;
  type: string;
  targetCount: number;
  wishCount: number;
  progress: PlanProgressSummary;
  displaySummary: PlanDisplaySummary;
  hierarchySummary: PlanHierarchySummary;
  kind: PlanKind;
  kindLabel: string;
  usesOutcomeProgress: boolean;
  parentPlanId?: string;
  metadata?: Record<string, unknown>;
  experience: PlanExperienceSummary;
}

const PLAN_PRESETS = [
  '寒假计划', '暑假计划',
  '一年级上学期', '一年级下学期',
  '二年级上学期', '二年级下学期',
  '三年级上学期', '三年级下学期',
  '四年级上学期', '四年级下学期',
  '五年级上学期', '五年级下学期',
  '六年级上学期', '六年级下学期',
];

const PLAN_KIND_OPTIONS: PlanKind[] = ['routine', 'cycle', 'goal', 'container'];

type PlanFilterKey = 'all' | PlanExperienceCategory;

const PLAN_FILTERS: Array<{ key: PlanFilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'onboarding', label: 'AI建档' },
  { key: 'holiday', label: '假期' },
  { key: 'goal', label: '目标' },
  { key: 'routine', label: '日常' },
  { key: 'cycle', label: '周期' },
  { key: 'container', label: '总计划' },
];

const PLAN_ACCENT_CLASS: Record<PlanExperienceSummary['accent'], string> = {
  primary: 'bg-primary/5 text-primary border-primary/10',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  blue: 'bg-sky-50 text-sky-700 border-sky-100',
  purple: 'bg-violet-50 text-violet-700 border-violet-100',
};

const PLAN_ACCENT_BAR_CLASS: Record<PlanExperienceSummary['accent'], string> = {
  primary: 'bg-primary',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  blue: 'bg-sky-500',
  purple: 'bg-violet-500',
};

function PlanCenterSummary({ overview }: { overview: PlanCenterOverview }) {
  const stats = [
    { label: 'AI建档', value: overview.onboardingPlans, icon: Sparkles, tone: 'green' as const },
    { label: '假期', value: overview.holidayPlans, icon: CalendarDays, tone: 'amber' as const },
    { label: '目标', value: overview.goalPlans, icon: Flag, tone: 'purple' as const },
    { label: '运行中', value: overview.runningPlans, icon: ClipboardCheck, tone: 'primary' as const },
  ];

  return (
    <section className="ui-ai-subpage-panel rounded-3xl bg-white p-4 shadow-sm border border-outline-variant/10">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Layers size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/35">家庭方案中心</p>
              <h2 className="mt-1 text-lg font-black text-on-surface">把计划变成可执行安排</h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-primary leading-none">{overview.totalPlans}</p>
              <p className="mt-1 text-[10px] font-bold text-on-surface-variant/40">个方案</p>
            </div>
          </div>
          <p className="mt-2 text-xs font-bold leading-relaxed text-on-surface-variant/60">
            {overview.nextFocus}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn('rounded-2xl border p-2', PLAN_ACCENT_CLASS[stat.tone])}>
              <div className="flex items-center justify-between">
                <Icon size={14} />
                <span className="text-sm font-black">{stat.value}</span>
              </div>
              <div className={cn('my-2 h-1 rounded-full', PLAN_ACCENT_BAR_CLASS[stat.tone])} />
              <p className="text-[10px] font-black">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Plans() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { familyId, guestMode, tasks, rewards } = useFamily();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanKind, setNewPlanKind] = useState<PlanKind>('routine');
  const [newParentPlanId, setNewParentPlanId] = useState('');
  const [planKindManuallySelected, setPlanKindManuallySelected] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PlanFilterKey>('all');
  const [separateWishes, setSeparateWishes] = useState(false);
  const containerPlans = plans.filter(plan => !plan.parentPlanId && plan.kind === 'container');
  const overview = buildPlanCenterOverview(plans.map(plan => plan.experience));
  const visiblePlans = activeFilter === 'all'
    ? plans
    : plans.filter(plan => plan.experience.category === activeFilter);

  useEffect(() => {
    if (familyId) {
      loadPlans();
    }
  }, [familyId, tasks, rewards]);

  async function loadPlans() {
    setLoading(true);
    const mapPlan = (
      p: { id: string; name: string; type: string; metadata?: Record<string, unknown> },
      hierarchyInputs: Array<{ id: string; name: string; type?: string; kind?: string; parentPlanId?: string }> = [],
    ) => {
      const planTasks = tasks.filter(task => task.planId === p.id);
      const planRewards = rewards.filter(reward => reward.planId === p.id);
      const planKind = inferPlanKind({
        kind: p.metadata?.kind as string | undefined,
        type: p.type,
        name: p.name,
      });
      const progress = calculatePlanProgress(planTasks, planRewards);
      const displaySummary = buildPlanDisplaySummary(planKind, progress);
      const hierarchySummary = buildPlanHierarchySummary(p.id, hierarchyInputs);
      const experience = buildPlanExperienceSummary({
        id: p.id,
        name: p.name,
        type: p.type,
        kind: planKind,
        metadata: p.metadata,
        progress,
        hierarchySummary,
      });
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        targetCount: planTasks.length,
        wishCount: planRewards.length,
        progress,
        displaySummary,
        hierarchySummary,
        kind: planKind,
        kindLabel: experience.categoryLabel,
        usesOutcomeProgress: PLAN_KIND_DEFINITIONS[planKind].usesOutcomeProgress,
        parentPlanId: getPlanParentId(p as any),
        metadata: p.metadata,
        experience,
      };
    };
    if (guestMode) {
      const guestPlans = getGuestPlans();
      const hierarchyInputs = guestPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        kind: plan.metadata?.kind as string | undefined,
        parentPlanId: getPlanParentId(plan),
      }));
      setPlans(guestPlans.map((p) => mapPlan(p, hierarchyInputs)));
      setLoading(false);
      return;
    }
    const dataLayer = getDataLayer();
    const localPlans = await dataLayer.getPlans();
    const hierarchyInputs = localPlans.map(plan => ({
      id: plan.id,
      name: plan.name,
      type: plan.type,
      kind: plan.metadata?.kind as string | undefined,
      parentPlanId: getPlanParentId(plan),
    }));
    setPlans(localPlans.map((p) => mapPlan(p, hierarchyInputs)));
    setLoading(false);
  }

  async function handleAddPlan() {
    if (!newPlanName.trim() || !familyId) return;
    
    if (guestMode) {
      // 游客模式：不走数据库，保存到本机计划库
      const planName = newPlanName.trim();
      const planType = PLAN_PRESETS.includes(planName) ? planName : '自定义';
      const planId = `guest-${Date.now()}`;
      saveGuestPlan({
        id: planId,
        name: planName,
        type: planType,
        metadata: {
          kind: newPlanKind,
          ...(newParentPlanId ? { parentPlanId: newParentPlanId } : {}),
        },
        sortOrder: Date.now(),
      });
      setNewPlanName('');
      setNewPlanKind('routine');
      setNewParentPlanId('');
      setPlanKindManuallySelected(false);
      setShowAddDialog(false);
      await loadPlans();
      navigate(`/plans/${planId}`);
      return;
    }
    
    const data = await getDataLayer().addPlan({
      name: newPlanName.trim(),
      type: PLAN_PRESETS.includes(newPlanName.trim()) ? newPlanName.trim() : '自定义',
      metadata: {
        kind: newPlanKind,
        ...(newParentPlanId ? { parentPlanId: newParentPlanId } : {}),
      },
      sortOrder: plans.length,
    });
    
    setNewPlanName('');
    setNewPlanKind('routine');
    setNewParentPlanId('');
    setPlanKindManuallySelected(false);
    setShowAddDialog(false);
    navigate(`/plans/${data.id}`);
  }

  async function handleDeletePlan(id: string) {
    if (guestMode) {
      deleteGuestPlan(id);
      setPlans(prev => prev.filter(plan => plan.id !== id));
      return;
    }
    await getDataLayer().deletePlan(id);
    loadPlans();
  }

  return (
    <div className="ui-ai-subpage min-h-screen bg-surface-container-low">
      {/* Header */}
      <TopAppBar
        title={t('plans.title', '计划')}
        rightContent={
          <button
            onClick={() => setShowAddDialog(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shadow-md active:scale-95 transition-all"
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        }
      />

      <div className="p-4 space-y-3">
        {!loading && (
          <PlanCenterSummary overview={overview} />
        )}

        {!loading && plans.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {PLAN_FILTERS.map(filter => {
              const active = activeFilter === filter.key;
              const count = filter.key === 'all'
                ? plans.length
                : plans.filter(plan => plan.experience.category === filter.key).length;
              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-2 text-xs font-black transition-all',
                    active
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-outline-variant/10 bg-white text-on-surface-variant/55'
                  )}
                >
                  {filter.label}
                  <span className={cn('ml-1 text-[10px]', active ? 'text-white/80' : 'text-on-surface-variant/35')}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visiblePlans.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="ui-ai-subpage-card bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10 active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => navigate(`/plans/${plan.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-black text-base text-on-surface">{plan.name}</h3>
                    <span className={cn(
                      'mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black',
                      PLAN_ACCENT_CLASS[plan.experience.accent]
                    )}>
                      {plan.kindLabel}
                    </span>
                    {plan.parentPlanId && (
                      <span className="ml-1 mt-1 inline-flex rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-black text-on-surface-variant/50">
                        子计划
                      </span>
                    )}
                    <p className="mt-2 text-xs font-bold leading-relaxed text-on-surface-variant/60">
                      {plan.experience.headline}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Target size={14} className="text-primary" />
                        <span className="text-xs font-bold text-on-surface-variant/60">
                          {plan.targetCount} {t('plans.targets', '个事项')}
                        </span>
                      </div>
                      {(separateWishes || plan.wishCount > 0) && (
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber-500" />
                          <span className="text-xs font-bold text-on-surface-variant/60">
                            {plan.wishCount} {t('plans.wishes', '个心愿')}
                          </span>
                        </div>
                      )}
                    </div>
                    {plan.displaySummary.showOutcomeProgress ? (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-on-surface-variant/40">
                            {plan.displaySummary.primaryLabel} {plan.displaySummary.secondaryValue}
                          </span>
                          <span className="text-[10px] font-black text-primary">
                            {plan.displaySummary.primaryValue}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${plan.progress.progressPercent}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl bg-surface-container-low p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-on-surface-variant/40 block">{plan.experience.primaryMetricLabel}</span>
                            <span className="text-sm font-black text-on-surface">{plan.experience.primaryMetricValue}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-on-surface-variant/40 block">{plan.experience.secondaryMetricLabel}</span>
                            <span className="text-sm font-black text-on-surface">{plan.experience.secondaryMetricValue}</span>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-on-surface-variant/50 leading-relaxed mt-2">
                          {plan.experience.nextActionHint}
                        </p>
                      </div>
                    )}
                    <div className={cn(
                      'mt-2 flex items-center justify-between rounded-2xl border px-3 py-2',
                      PLAN_ACCENT_CLASS[plan.experience.accent]
                    )}>
                      <span className="text-[10px] font-black">{plan.experience.nextActionLabel}</span>
                      <ChevronRight size={14} />
                    </div>
                    {plan.hierarchySummary.childPlanCount > 0 && (
                      <div className="mt-2 rounded-2xl bg-primary/5 p-3">
                        <p className="text-[10px] font-black text-primary">
                          包含 {plan.hierarchySummary.childPlanCount} 个子计划
                        </p>
                        <p className="text-[10px] font-bold text-primary/70 leading-relaxed mt-1">
                          {plan.hierarchySummary.childNames.slice(0, 3).join('、')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                      className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-400 active:scale-90 transition-transform"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 active:scale-90 transition-transform">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {visiblePlans.length === 0 && plans.length > 0 && !loading && (
          <div className="text-center py-10 rounded-3xl bg-white border border-outline-variant/10">
            <LayoutGrid size={40} className="mx-auto text-outline-variant/30 mb-3" />
            <p className="text-sm font-bold text-on-surface-variant/45">当前分类下还没有计划</p>
          </div>
        )}

        {plans.length === 0 && !loading && (
          <div className="text-center py-12">
            <LayoutGrid size={48} className="mx-auto text-outline-variant/30 mb-3" />
            <p className="text-sm font-bold text-on-surface-variant/40">{t('plans.no_plans', '暂无计划，点击下方按钮创建')}</p>
          </div>
        )}

        {/* AI 智能创建 */}
        <button
          onClick={() => navigate('/plans/wizard')}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary/90 to-primary-text flex items-center justify-center gap-2 text-white font-black text-sm active:scale-[0.98] transition-all shadow-lg shadow-primary/20 mb-3"
        >
          <Bot size={18} />
          <span>智能创建计划</span>
          <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">New</span>
        </button>

        <button
          onClick={() => navigate('/community/templates')}
          className="w-full py-3.5 rounded-2xl bg-white border border-outline-variant/10 flex items-center justify-center gap-2 text-primary font-black text-sm active:scale-[0.98] transition-all shadow-sm"
        >
          <Users size={18} />
          <span>社区模板</span>
        </button>

        {/* Add button */}
        <button
          onClick={() => setShowAddDialog(true)}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-outline-variant/20 flex items-center justify-center gap-2 text-primary font-black active:scale-[0.98] transition-transform"
        >
          <Plus size={20} strokeWidth={3} />
          <span>{t('plans.add_plan', '添加计划')}</span>
        </button>
      </div>

      {/* Add plan modal */}
      <AnimatePresence>
        {showAddDialog && (
          <AppModal
            open={showAddDialog}
            onClose={() => setShowAddDialog(false)}
            title={t('plans.add_plan_title', '添加计划')}
            surface="sheet"
            zIndexClass="z-[120]"
            className="max-h-[86svh]"
            bodyClassName="px-6 py-5"
          >
              <input
                autoFocus
                value={newPlanName}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setNewPlanName(nextName);
                  if (!planKindManuallySelected) {
                    setNewPlanKind(inferPlanKind({ name: nextName }));
                  }
                }}
                placeholder={t('plans.plan_name_placeholder', '请输入计划名称')}
                className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors mb-4"
              />

              {/* Preset types */}
              <div className="flex flex-wrap gap-2 mb-6">
                {PLAN_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setNewPlanName(preset);
                      if (!planKindManuallySelected) {
                        setNewPlanKind(inferPlanKind({ name: preset, type: preset }));
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-black transition-all border-2",
                      newPlanName === preset
                        ? "bg-primary border-primary text-white"
                        : "bg-white border-outline-variant/10 text-on-surface-variant/60"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <p className="text-[10px] font-black text-on-surface-variant/40 mb-2 uppercase tracking-widest">计划类型</p>
                <div className="rounded-2xl bg-surface-container-low p-3 mb-3">
                  <p className="text-xs font-bold text-on-surface-variant/70 leading-relaxed">
                    先判断这个计划是在安排“时间节奏”，还是要完成“一个明确结果”。只有目标型计划才适合做里程碑和完成度复盘。
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PLAN_KIND_OPTIONS.map((kind) => {
                    const definition = PLAN_KIND_DEFINITIONS[kind];
                    return (
                      <button
                        key={kind}
                        onClick={() => {
                          setNewPlanKind(kind);
                          setPlanKindManuallySelected(true);
                        }}
                        className={cn(
                          "rounded-2xl border-2 p-3 text-left transition-all",
                          newPlanKind === kind
                            ? "border-primary bg-primary/5"
                            : "border-outline-variant/10 bg-white"
                        )}
                      >
                        <span className="text-xs font-black text-on-surface block">{definition.label}</span>
                        <span className="text-[10px] font-bold text-on-surface-variant/45 leading-relaxed block mt-1">
                          {definition.guidance}
                        </span>
                        <span className="text-[9px] font-bold text-primary/60 leading-relaxed block mt-1">
                          例：{definition.examples.slice(0, 2).join('、')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {newPlanKind !== 'container' && containerPlans.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-black text-on-surface-variant/40 mb-2 uppercase tracking-widest">归属总计划</p>
                  <select
                    value={newParentPlanId}
                    onChange={event => setNewParentPlanId(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                  >
                    <option value="">不归属总计划</option>
                    {containerPlans.map(parent => (
                      <option key={parent.id} value={parent.id}>{parent.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] font-bold text-on-surface-variant/45 leading-relaxed mt-2">
                    例如把“练琴每周计划”放进“暑假总计划”，总计划看全局，子计划看执行。
                  </p>
                </div>
              )}

              <button
                onClick={handleAddPlan}
                disabled={!newPlanName.trim()}
                className="mt-2 w-full py-3.5 rounded-2xl bg-primary text-white font-black text-sm active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {t('plans.add', '添加')}
              </button>
          </AppModal>
        )}
      </AnimatePresence>
    </div>
  );
}
