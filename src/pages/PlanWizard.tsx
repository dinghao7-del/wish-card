import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, ChevronRight, Clock, Sun, Moon, Globe, Users, Plus, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { PLAN_SCENES, EXCHANGE_TIMEZONES, type PlanSceneType, type DailyScheduleTemplate, adjustScheduleByTimezone, createEmptySchedule } from '../lib/planTemplates';
import { useFamily } from '../context/FamilyContext';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { getDataLayer } from '../lib/DataLayer';
import { getCommunityShareDraft } from '../lib/communityShare';
import { buildCommunityTemplateReusePreview, type CommunityTemplateReusePreview } from '../lib/communityTemplateReuse';
import { buildPlanExecutionTaskBundle, findPlanExecutionConflicts } from '../lib/planExecutionTasks';

type WizardStep = 'scene' | 'info' | 'schedule' | 'activities' | 'confirm';

interface WizardForm {
  sceneId: string;
  scene: PlanSceneType;
  name: string;
  startDate: string;
  endDate: string;
  grade: string;
  timezone: { label: string; offset: number; emoji: string } | null;
  schedule: DailyScheduleTemplate;
  weeklyActivities: { day: string; activity: string; time: string }[];
  children: string[]; // 参与的成员
}

const DAYS_OF_WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三'];

function findScene(sceneIdOrType: string | null) {
  return PLAN_SCENES.find(scene => scene.id === sceneIdOrType)
    || PLAN_SCENES.find(scene => scene.type === sceneIdOrType)
    || PLAN_SCENES[0];
}

function getPlanTypeLabel(type: PlanSceneType, sceneName?: string) {
  if (type === 'weekday') return sceneName || '平日计划';
  if (type === 'holiday') return '假期计划';
  if (type === 'exchange') return '留学交换';
  return '自定义';
}

function getDefaultDateRange(type: PlanSceneType): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  if (type === 'holiday') {
    // 假设最近的一个假期
    const month = now.getMonth();
    if (month >= 1 && month <= 6) {
      return { start: fmt(now), end: fmt(new Date(now.getFullYear(), 8, 1)) }; // 到9月
    }
    return { start: fmt(now), end: fmt(new Date(now.getFullYear() + 1, 1, 15)) };
  }
  if (type === 'exchange') {
    return { start: fmt(now), end: fmt(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())) };
  }
  // 平日或自定义：默认一个月
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);
  return { start: fmt(now), end: fmt(end) };
}

export function PlanWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { familyId, guestMode, members, currentUser, tasks } = useFamily();
  const [loading, setLoading] = useState(false);
  const [reusePreview, setReusePreview] = useState<CommunityTemplateReusePreview | null>(null);
  const [reuseSourceId, setReuseSourceId] = useState('');
  const [conflictsConfirmed, setConflictsConfirmed] = useState(false);

  const children = members.filter(m => m.role === 'child');
  const initialSceneTemplate = findScene(searchParams.get('scene'));
  const initialScene = initialSceneTemplate.type;
  const initialName = searchParams.get('name') || initialSceneTemplate.name;
  const defaultRange = getDefaultDateRange(initialScene);
  const [step, setStep] = useState<WizardStep>(searchParams.has('scene') ? 'info' : 'scene');

  const [form, setForm] = useState<WizardForm>({
    sceneId: initialSceneTemplate.id,
    scene: initialScene,
    name: initialName,
    startDate: defaultRange.start,
    endDate: defaultRange.end,
    grade: '',
    timezone: initialScene === 'exchange' ? EXCHANGE_TIMEZONES[0] : null,
    schedule: initialSceneTemplate.weekdaySchedule,
    weeklyActivities: [],
    children: children.map(c => c.id),
  });

  useEffect(() => {
    let active = true;
    async function loadCommunityTemplate() {
      const payload = sessionStorage.getItem('pending_community_template_reuse_payload');
      if (payload) {
        try {
          const storedDraft = JSON.parse(payload);
          const preview = buildCommunityTemplateReusePreview(storedDraft);
          const range = getDefaultDateRange(preview.scene);
          const scene = findScene(preview.scene);
          if (!active) return;
          setReusePreview(preview);
          setReuseSourceId(storedDraft.id);
          setForm(prev => ({
            ...prev,
            sceneId: scene.id,
            scene: preview.scene,
            name: preview.title,
            schedule: preview.schedule,
            startDate: range.start,
            endDate: range.end,
          }));
          setStep('info');
        } catch {
          // Ignore malformed handoff payloads and fall back to id based loading.
        } finally {
          sessionStorage.removeItem('pending_community_template_reuse_payload');
        }
        return;
      }

      const draftId = searchParams.get('communityDraftId') || sessionStorage.getItem('pending_community_template_reuse');
      if (!draftId) return;
      const storedDraft = await getCommunityShareDraft(draftId);
      if (!active || !storedDraft) return;

      const preview = buildCommunityTemplateReusePreview(storedDraft);
      const range = getDefaultDateRange(preview.scene);
      const scene = findScene(preview.scene);
      setReusePreview(preview);
      setReuseSourceId(storedDraft.id);
      setForm(prev => ({
        ...prev,
        sceneId: scene.id,
        scene: preview.scene,
        name: preview.title,
        schedule: preview.schedule,
        startDate: range.start,
        endDate: range.end,
      }));
      setStep('info');
      sessionStorage.removeItem('pending_community_template_reuse');
    }
    loadCommunityTemplate();
    return () => { active = false; };
  }, [searchParams]);

  const updateForm = (partial: Partial<WizardForm>) => {
    setConflictsConfirmed(false);
    setForm(prev => ({ ...prev, ...partial }));
  };

  const selectedScene = findScene(form.sceneId);

  const previewTaskBundle = useMemo(() => {
    if (!currentUser) return null;
    return buildPlanExecutionTaskBundle({
      planId: 'preview-plan',
      planName: form.name.trim() || '新计划',
      planType: getPlanTypeLabel(form.scene, selectedScene?.name),
      planKind: 'routine',
      creatorId: currentUser.id,
      familyId: familyId || undefined,
      childIds: form.children,
      schedule: form.schedule,
      sceneType: form.scene,
    });
  }, [currentUser, familyId, form.children, form.name, form.scene, form.schedule, selectedScene?.name]);

  const executionConflicts = useMemo(() => {
    if (!previewTaskBundle) return [];
    return findPlanExecutionConflicts(previewTaskBundle.drafts, tasks);
  }, [previewTaskBundle, tasks]);

  const handleSelectScene = (sceneId: string) => {
    const scene = findScene(sceneId);
    const range = getDefaultDateRange(scene.type);
    updateForm({
      sceneId: scene.id,
      scene: scene.type,
      name: scene.name,
      schedule: scene.weekdaySchedule,
      startDate: range.start,
      endDate: range.end,
      timezone: scene.type === 'exchange' ? EXCHANGE_TIMEZONES[0] : null,
    });
    setStep('info');
  };

  const canGoNext = (): boolean => {
    switch (step) {
      case 'info': return form.name.trim().length > 0;
      case 'schedule': return true;
      case 'activities': return true;
      default: return true;
    }
  };

  const handleCreate = async () => {
    if (executionConflicts.length > 0 && !conflictsConfirmed) {
      setStep('confirm');
      return;
    }
    setLoading(true);
    const planName = form.name.trim();
    const planType = getPlanTypeLabel(form.scene, selectedScene?.name);

    const metadata = {
      ...form.schedule,
      timezone: form.timezone,
      weeklyActivities: form.weeklyActivities,
      grade: form.grade,
      kind: 'routine',
      ...(reusePreview ? {
        source: 'community',
        communityTemplateId: reuseSourceId,
        communityTemplateSummary: reusePreview.sourceSummary,
        adaptationNotes: reusePreview.adaptationNotes,
      } : {}),
    };
    const scheduleData = JSON.stringify(metadata);

    if (guestMode) {
      const planId = `guest-${Date.now()}`;
      navigate(`/plans/${planId}?name=${encodeURIComponent(planName)}&type=${encodeURIComponent(planType)}&kind=routine&schedule=${encodeURIComponent(scheduleData)}&from=wizard&suggest=tasks`);
      return;
    }

    if (!familyId) {
      setLoading(false);
      return;
    }

    const data = await getDataLayer().addPlan({
      name: planName,
      type: planType,
      metadata,
      sortOrder: 0,
    });

    const taskBundle = currentUser ? buildPlanExecutionTaskBundle({
      planId: data.id,
      planName,
      planType,
      planKind: 'routine',
      creatorId: currentUser.id,
      familyId: familyId || undefined,
      childIds: form.children,
      schedule: form.schedule,
      sceneType: form.scene,
    }) : null;

    if (taskBundle && taskBundle.tasks.length > 0) {
      for (const task of taskBundle.tasks) {
        await getDataLayer().addTask(task);
      }
      await getDataLayer().updatePlan(data.id, {
        metadata: {
          ...metadata,
          executionTaskCount: taskBundle.tasks.length,
          executionTasksGeneratedAt: new Date().toISOString(),
        },
      });
    }

    navigate(`/plans/${data.id}?from=wizard-created${taskBundle?.tasks.length ? `&generatedTasks=${taskBundle.tasks.length}` : ''}`);
    setLoading(false);
  };

  const renderStepIndicator = () => {
    const steps: { key: WizardStep; label: string }[] = [
      { key: 'scene', label: '场景' },
      { key: 'info', label: '基础信息' },
      { key: 'schedule', label: '日程' },
      { key: 'activities', label: '活动' },
      { key: 'confirm', label: '确认' },
    ];

    const currentIdx = steps.findIndex(s => s.key === step);
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-outline-variant/10">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
              i < currentIdx ? "bg-primary text-white" :
              i === currentIdx ? "bg-primary text-white scale-110" :
              "bg-surface-container-low text-on-surface-variant/40"
            )}>
              {i < currentIdx ? <Check size={12} /> : i + 1}
            </div>
            <span className={cn(
              "text-[10px] font-bold hidden sm:inline",
              i === currentIdx ? "text-primary" : "text-on-surface-variant/40"
            )}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="w-3 h-[1px] bg-outline-variant/20" />}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* Header */}
      <TopAppBar
        title="智能创建计划"
        onBack={() => {
          if (step !== 'scene') {
            setStep('scene');
          } else {
            navigate('/plans');
          }
        }}
      />
      {step !== 'scene' && renderStepIndicator()}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-4"
        >
          {/* Step 1: 选择场景 */}
          {step === 'scene' && (
            <div className="space-y-3">
              <p className="text-sm font-bold text-on-surface-variant/50 mb-1">选择最适合你的计划类型</p>
              {PLAN_SCENES.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => handleSelectScene(scene.id)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10 active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary-container/30 flex items-center justify-center text-2xl">
                      {scene.emoji}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-base text-on-surface">{scene.name}</h3>
                      <p className="text-xs font-bold text-on-surface-variant/50 mt-0.5">{scene.description}</p>
                    </div>
                    <ChevronRight size={20} className="text-outline-variant/40" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: 基础信息 */}
          {step === 'info' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-4">
                <h3 className="font-black text-sm text-on-surface">计划名称</h3>
                {reusePreview && (
                  <div className="rounded-2xl bg-primary/5 p-3 border border-primary/10">
                    <p className="text-xs font-black text-primary">已带入社区模板</p>
                    <p className="text-[10px] font-bold text-primary/70 mt-1 leading-relaxed">
                      {reusePreview.sourceSummary}。下面可以直接改名称、日期和参与成员。
                    </p>
                  </div>
                )}
                <input
                  autoFocus
                  value={form.name}
                  onChange={e => updateForm({ name: e.target.value })}
                  placeholder="例如：2026年暑假"
                  className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors"
                />
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-4">
                <h3 className="font-black text-sm text-on-surface">时间范围</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-on-surface-variant/50 mb-1">开始日期</label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={e => updateForm({ startDate: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                    />
                  </div>
                  <span className="text-on-surface-variant/30 mt-5">→</span>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-on-surface-variant/50 mb-1">结束日期</label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={e => updateForm({ endDate: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant/50 mb-1">年级</label>
                  <div className="flex flex-wrap gap-2">
                    {GRADES.map(g => (
                      <button
                        key={g}
                        onClick={() => updateForm({ grade: g })}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2",
                          form.grade === g
                            ? "bg-primary border-primary text-white"
                            : "bg-white border-outline-variant/10 text-on-surface-variant/60"
                        )}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 交换留学的时区选择 */}
              {form.scene === 'exchange' && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-3">
                  <h3 className="font-black text-sm text-on-surface flex items-center gap-2">
                    <Globe size={16} className="text-primary" />
                    留学目的地时区
                  </h3>
                  <div className="space-y-2">
                    {EXCHANGE_TIMEZONES.map(tz => (
                      <button
                        key={tz.label}
                        onClick={() => {
                          updateForm({ timezone: tz });
                          // 根据时区调整日程
                          const adjusted = adjustScheduleByTimezone(form.schedule, tz.offset);
                          updateForm({ schedule: adjusted });
                        }}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-2xl transition-all font-bold text-sm flex items-center gap-3 border-2",
                          form.timezone?.label === tz.label
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-surface-container-low border-transparent text-on-surface-variant/60"
                        )}
                      >
                        <span className="text-lg">{tz.emoji}</span>
                        <div className="flex-1">
                          <span className="text-sm">{tz.label}</span>
                          <span className="text-[10px] text-on-surface-variant/40 block">
                            北京时间 {tz.offset > 0 ? '+' : ''}{tz.offset}h
                          </span>
                        </div>
                        {form.timezone?.label === tz.label && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 参与的成员 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-3">
                <h3 className="font-black text-sm text-on-surface flex items-center gap-2">
                  <Users size={16} className="text-primary" />
                  参与成员
                </h3>
                <div className="flex flex-wrap gap-2">
                  {children.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        const newChildren = form.children.includes(c.id)
                          ? form.children.filter(id => id !== c.id)
                          : [...form.children, c.id];
                        updateForm({ children: newChildren });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2",
                        form.children.includes(c.id)
                          ? "bg-primary border-primary text-white"
                          : "bg-white border-outline-variant/10 text-on-surface-variant/60"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              {reusePreview && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-3">
                  <h3 className="font-black text-sm text-on-surface flex items-center gap-2">
                    <Sparkles size={16} className="text-primary" />
                    复用前建议调整
                  </h3>
                  <div className="space-y-2">
                    {reusePreview.adaptationNotes.map(note => (
                      <p key={note} className="rounded-2xl bg-surface-container-low px-3 py-2 text-[11px] font-bold text-on-surface-variant/65 leading-relaxed">
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: 日程调整 */}
          {step === 'schedule' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-1">每日作息</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/40 mb-4">
                  {form.scene === 'exchange' && form.timezone
                    ? `已根据 ${form.timezone.label} 时区调整`
                    : '你可以调整各个时段的时间'}
                </p>

                {/* 起床 & 就寝 */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 bg-amber-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun size={14} className="text-amber-500" />
                      <span className="text-xs font-bold text-on-surface-variant/50">起床</span>
                    </div>
                    <input
                      type="time"
                      value={form.schedule.wakeTime}
                      onChange={e => updateForm({ schedule: { ...form.schedule, wakeTime: e.target.value } })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white text-sm font-black text-on-surface outline-none"
                    />
                  </div>
                  <div className="flex-1 bg-indigo-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon size={14} className="text-indigo-500" />
                      <span className="text-xs font-bold text-on-surface-variant/50">就寝</span>
                    </div>
                    <input
                      type="time"
                      value={form.schedule.bedTime}
                      onChange={e => updateForm({ schedule: { ...form.schedule, bedTime: e.target.value } })}
                      className="w-full px-2 py-1.5 rounded-lg bg-white text-sm font-black text-on-surface outline-none"
                    />
                  </div>
                </div>

                {/* 三餐时间 */}
                <div className="mb-4">
                  <span className="text-xs font-bold text-on-surface-variant/50 block mb-2">用餐时间</span>
                  <div className="flex items-center gap-2">
                    {(['breakfast', 'lunch', 'dinner'] as const).map(meal => (
                      <div key={meal} className="flex-1">
                        <label className="block text-[10px] text-on-surface-variant/30 mb-1">
                          {meal === 'breakfast' ? '早餐' : meal === 'lunch' ? '午餐' : '晚餐'}
                        </label>
                        <input
                          type="time"
                          value={form.schedule.mealTimes[meal]}
                          onChange={e => updateForm({
                            schedule: {
                              ...form.schedule,
                              mealTimes: { ...form.schedule.mealTimes, [meal]: e.target.value }
                            }
                          })}
                          className="w-full px-2 py-1.5 rounded-lg bg-surface-container-low text-xs font-bold text-on-surface outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 时段列表 */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-on-surface-variant/50 block mb-2">时段安排</span>
                  {form.schedule.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-container-low rounded-xl p-2.5">
                      <span className="text-lg w-8 text-center">{slot.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-on-surface">{slot.label}</p>
                        <p className="text-[10px] text-on-surface-variant/40 truncate">{slot.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="time"
                          value={slot.startTime}
                          onChange={e => {
                            const newSlots = [...form.schedule.slots];
                            newSlots[idx] = { ...newSlots[idx], startTime: e.target.value };
                            updateForm({ schedule: { ...form.schedule, slots: newSlots } });
                          }}
                          className="w-16 px-1 py-1 rounded text-[10px] font-bold bg-white outline-none text-center"
                        />
                        <span className="text-[10px] text-on-surface-variant/30">-</span>
                        <input
                          type="time"
                          value={slot.endTime}
                          onChange={e => {
                            const newSlots = [...form.schedule.slots];
                            newSlots[idx] = { ...newSlots[idx], endTime: e.target.value };
                            updateForm({ schedule: { ...form.schedule, slots: newSlots } });
                          }}
                          className="w-16 px-1 py-1 rounded text-[10px] font-bold bg-white outline-none text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: 每周固定活动 */}
          {step === 'activities' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-1">每周固定活动</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/40 mb-4">记录每周固定的课外活动安排</p>

                {form.weeklyActivities.length === 0 && (
                  <div className="text-center py-6">
                    <Plus size={32} className="mx-auto text-outline-variant/30 mb-2" />
                    <p className="text-xs font-bold text-on-surface-variant/40 mb-3">
                      后续可以在计划详情中添加，或现在添加
                    </p>
                  </div>
                )}

                <div className="space-y-2 mb-4">
                  {form.weeklyActivities.map((act, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-surface-container-low rounded-xl p-2.5">
                      <button
                        onClick={() => updateForm({ weeklyActivities: form.weeklyActivities.filter((_, i) => i !== idx) })}
                        className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-red-400 shrink-0"
                      >
                        <span className="text-xs font-black">×</span>
                      </button>
                      <span className="text-xs font-bold text-on-surface-variant/60 w-12">{act.day}</span>
                      <span className="text-xs font-black text-on-surface flex-1">{act.activity}</span>
                      <span className="text-[10px] font-bold text-on-surface-variant/40">{act.time}</span>
                    </div>
                  ))}
                </div>

                {/* 添加活动 */}
                <ActivityAdder
                  onAdd={(day, activity, time) => {
                    updateForm({ weeklyActivities: [...form.weeklyActivities, { day, activity, time }] });
                  }}
                />
              </div>

              {/* 场景默认任务建议 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-3">建议任务</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedScene?.suggestedTasks?.map((task: string) => (
                    <span key={task} className="px-3 py-1.5 rounded-full bg-primary-container/30 text-primary text-xs font-bold">
                      {task}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-on-surface-variant/40 mt-3">
                  创建计划后可在详情中为每个建议任务添加具体目标
                </p>
              </div>
            </div>
          )}

          {/* Step 5: 确认页面 */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-5 text-white">
                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest">即将创建</p>
                <h2 className="text-2xl font-black mt-1">{form.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                    {selectedScene?.emoji} {selectedScene?.name}
                  </span>
                  {form.grade && (
                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                      {form.grade}
                    </span>
                  )}
                </div>
              </div>

              {/* 日程摘要 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
                  <Clock size={14} /> 每日作息
                </h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1">
                    <Sun size={12} className="text-amber-500" />
                    <span className="text-xs font-bold">起床 {form.schedule.wakeTime}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Moon size={12} className="text-indigo-500" />
                    <span className="text-xs font-bold">就寝 {form.schedule.bedTime}</span>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {form.schedule.slots.map((slot, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-center">{slot.icon}</span>
                      <span className="font-bold text-on-surface-variant/60">{slot.startTime}-{slot.endTime}</span>
                      <span className="text-on-surface-variant/40">{slot.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={executionConflicts.length > 0
                ? 'bg-amber-50 rounded-2xl p-5 shadow-sm border border-amber-200'
                : 'bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10'}
              >
                <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
                  {executionConflicts.length > 0 ? <AlertTriangle size={15} className="text-amber-600" /> : <Check size={15} className="text-primary" />}
                  执行前检查
                </h3>
                {executionConflicts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-amber-800 leading-relaxed">
                      发现 {executionConflicts.length} 个可能冲突的时段。你可以返回调整时间，也可以确认后继续创建。
                    </p>
                    <div className="space-y-2">
                      {executionConflicts.slice(0, 4).map((conflict, index) => (
                        <div key={`${conflict.draftTitle}-${conflict.existingTitle}-${index}`} className="rounded-2xl bg-white/75 p-3">
                          <p className="text-xs font-black text-on-surface">{conflict.draftTitle}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant/55 mt-1 leading-relaxed">
                            {conflict.startTime}{conflict.endTime ? `-${conflict.endTime}` : ''} 可能和“{conflict.existingTitle}”重叠
                          </p>
                        </div>
                      ))}
                    </div>
                    <label className="flex items-start gap-3 rounded-2xl bg-white/80 p-3 active:scale-[0.99] transition-transform">
                      <input
                        type="checkbox"
                        checked={conflictsConfirmed}
                        onChange={(event) => setConflictsConfirmed(event.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-primary shrink-0"
                      />
                      <span className="text-xs font-bold leading-relaxed text-on-surface-variant">
                        我已看到这些冲突，仍然先创建计划和任务，后续再手动调整。
                      </span>
                    </label>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed">
                    暂未发现和当前家庭任务明显重叠的时段，创建后会自动生成 {previewTaskBundle?.tasks.length || 0} 个执行任务。
                  </p>
                )}
              </div>

              {/* 固定活动 */}
              {form.weeklyActivities.length > 0 && (
                <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                  <h3 className="font-black text-sm text-on-surface mb-3">每周固定活动</h3>
                  <div className="space-y-1">
                    {form.weeklyActivities.map((act, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-primary">{act.day}</span>
                        <span className="text-on-surface-variant/60">{act.time}</span>
                        <span className="text-on-surface">{act.activity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 参与成员 */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
                  <Users size={14} /> 参与成员
                </h3>
                <div className="flex flex-wrap gap-1">
                  {form.children.map(cId => {
                    const member = members.find(m => m.id === cId);
                    return member ? (
                      <span key={cId} className="px-2.5 py-1 rounded-full bg-primary-container/30 text-primary text-xs font-bold">
                        {member.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              {reusePreview && (
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-outline-variant/10">
                  <h3 className="font-black text-sm text-on-surface mb-3 flex items-center gap-2">
                    <Sparkles size={14} /> AI 适配提醒
                  </h3>
                  <div className="space-y-2">
                    {reusePreview.adaptationNotes.slice(0, 4).map(note => (
                      <p key={note} className="text-[11px] font-bold text-on-surface-variant/60 leading-relaxed">
                        {note}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-surface border-t border-outline-variant/10 max-w-md mx-auto">
        <div className="flex items-center gap-3">
          {step !== 'scene' && step !== 'confirm' && (
            <button
              onClick={() => {
                const steps: WizardStep[] = ['scene', 'info', 'schedule', 'activities', 'confirm'];
                const idx = steps.indexOf(step);
                if (idx > 0) setStep(steps[idx - 1]);
              }}
              className="flex-1 py-3 rounded-2xl bg-surface-container-low text-on-surface-variant font-black text-sm"
            >
              上一步
            </button>
          )}
          {step !== 'confirm' ? (
            <button
              onClick={() => {
                if (step === 'scene') return;
                const steps: WizardStep[] = ['scene', 'info', 'schedule', 'activities', 'confirm'];
                const idx = steps.indexOf(step);
                if (idx < steps.length - 1 && canGoNext()) {
                  setStep(steps[idx + 1]);
                }
              }}
              disabled={!canGoNext()}
              className={cn(
                "flex-1 py-3 rounded-2xl font-black text-sm transition-all",
                step === 'scene' ? "hidden" :
                "bg-primary text-white disabled:opacity-40"
              )}
            >
              下一步
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading || (executionConflicts.length > 0 && !conflictsConfirmed)}
              className="flex-1 py-3.5 rounded-2xl bg-primary text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Sparkles size={16} /> 创建计划</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 底部安全区 */}
      <div className="h-24" />
    </div>
  );
}

// 活动添加组件
function ActivityAdder({ onAdd }: { onAdd: (day: string, activity: string, time: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [day, setDay] = useState('周一');
  const [activity, setActivity] = useState('');
  const [time, setTime] = useState('16:00');

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="w-full py-2.5 rounded-2xl border-2 border-dashed border-outline-variant/20 flex items-center justify-center gap-1 text-primary text-sm font-black"
      >
        <Plus size={16} strokeWidth={3} />
        添加固定活动
      </button>
    );
  }

  return (
    <div className="bg-surface-container-low rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={day}
          onChange={e => setDay(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-white text-xs font-bold outline-none"
        >
          {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <input
          type="time"
          value={time}
          onChange={e => setTime(e.target.value)}
          className="px-2 py-1.5 rounded-lg bg-white text-xs font-bold outline-none"
        />
        <input
          autoFocus
          value={activity}
          onChange={e => setActivity(e.target.value)}
          placeholder="活动名称"
          className="flex-1 px-2 py-1.5 rounded-lg bg-white text-xs font-bold outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { if (activity.trim()) { onAdd(day, activity.trim(), time); setActivity(''); setEditing(false); } }}
          disabled={!activity.trim()}
          className="flex-1 py-1.5 rounded-xl bg-primary text-white text-xs font-black disabled:opacity-40"
        >
          添加
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-4 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-black"
        >
          取消
        </button>
      </div>
    </div>
  );
}
