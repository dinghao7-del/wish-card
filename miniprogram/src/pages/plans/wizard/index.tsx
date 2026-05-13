/**
 * 智能创建计划向导 — 严格对齐Web端 src/pages/PlanWizard.tsx
 *
 * 5步流程:
 *   Step 1 (scene):    选择场景（平日📚/假期🌴/留学✈️/自定义✨）
 *   Step 2 (info):     基础信息（名称/时间/年级/成员）
 *   Step 3 (schedule): 日程调整（起床/就寝/三餐/时段）
 *   Step 4 (activities): 每周固定活动 + 建议任务
 *   Step 5 (confirm):   确认摘要 → 创建 → 跳详情页
 */
import { View, Text, Input, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { PLAN_SCENES, EXCHANGE_TIMEZONES, GRADES, DAYS_OF_WEEK, type PlanSceneType, type DailyScheduleTemplate, adjustScheduleByTimezone } from '@/lib/planTemplates';
import './index.scss';

type WizardStep = 'scene' | 'info' | 'schedule' | 'activities' | 'confirm';

interface WeeklyActivity {
  day: string;
  activity: string;
  time: string;
}

interface WizardForm {
  scene: PlanSceneType;
  name: string;
  startDate: string;
  endDate: string;
  grade: string;
  timezone: { label: string; offset: number; emoji: string } | null;
  schedule: DailyScheduleTemplate;
  weeklyActivities: WeeklyActivity[];
  children: string[]; // ⭐ 对齐Web第26行: 参与的成员ID列表
}

const STEP_ORDER: WizardStep[] = ['scene', 'info', 'schedule', 'activities', 'confirm'];

function getDefaultDateRange(type: PlanSceneType) {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  if (type === 'holiday') {
    return { start: fmt(now), end: fmt(new Date(now.getFullYear(), 8, 1)) };
  }
  if (type === 'exchange') {
    return { start: fmt(now), end: fmt(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())) };
  }
  const end = new Date(now);
  end.setMonth(end.getMonth() + 1);
  return { start: fmt(now), end: fmt(end) };
}

export default function PlanWizard() {
  const [step, setStep] = useState<WizardStep>('scene');
  const [loading, setLoading] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActDay, setNewActDay] = useState('周一');
  const [newActName, setNewActName] = useState('');
  const [newActTime, setNewActTime] = useState('16:00');

  const defaultRange = getDefaultDateRange('weekday');

  // ⭐ 对齐Web第58-71行: 添加 children 字段初始化
  // 注意: 小程序端暂时用空数组，后续可从 FamilyContext/members 获取孩子列表
  const [form, setForm] = useState<WizardForm>({
    scene: 'weekday',
    name: '',
    startDate: defaultRange.start,
    endDate: defaultRange.end,
    grade: '',
    timezone: null,
    schedule: PLAN_SCENES[0].weekdaySchedule,
    weeklyActivities: [],
    children: [], // ⭐ 对齐Web第70行
  });

  const updateForm = (partial: Partial<WizardForm>) => {
    setForm(prev => ({ ...prev, ...partial }));
  };

  // ===== Step 1: 选择场景 — 对齐Web第77-90行 =====
  const handleSelectScene = (type: PlanSceneType) => {
    const scene = PLAN_SCENES.find(s => s.type === type);
    if (!scene) return;
    const range = getDefaultDateRange(type);
    updateForm({
      scene: type,
      name: scene.name,
      schedule: scene.weekdaySchedule,
      startDate: range.start,
      endDate: range.end,
      timezone: type === 'exchange' ? EXCHANGE_TIMEZONES[0] : null,
      weeklyActivities: [], // 重置
      grade: '', // 重置
      children: [], // ⭐ 对齐Web: 重置参与成员
    });
    setStep('info');
  };

  // ===== 导航逻辑 — 对齐Web第183行 / 第597-608行 =====
  const handleBack = () => {
    if (step === 'scene') {
      Taro.navigateBack(); // 返回计划列表页
    } else if (step === 'info') {
      setStep('scene');
    } else {
      const idx = STEP_ORDER.indexOf(step);
      if (idx > 0) setStep(STEP_ORDER[idx - 1]);
    }
  };

  const handleNext = () => {
    if (step === 'scene') return; // 场景选择直接跳转
    const idx = STEP_ORDER.indexOf(step);
    if (idx >= 0 && idx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[idx + 1]);
    }
  };

  const canGoNext = (): boolean => {
    if (step === 'info') return form.name.trim().length > 0;
    return true;
  };

  // ===== 创建计划 — 对齐Web第101-141行 =====
  const handleCreate = async () => {
    setLoading(true);
    const planName = form.name.trim();
    const planType =
      form.scene === 'weekday' ? '平日计划' :
      form.scene === 'holiday' ? '假期计划' :
      form.scene === 'exchange' ? '留学交换' : '自定义';

    // 序列化日程数据
    const scheduleData = JSON.stringify({
      ...form.schedule,
      timezone: form.timezone,
      weeklyActivities: form.weeklyActivities,
      grade: form.grade,
    });

    // 游客模式 — 对齐Web第116-119行
    try {
      const guestUserStr = Taro.getStorageSync('guest_user') || Taro.getStorageSync('localUser');
      if (guestUserStr) {
        const gu = typeof guestUserStr === 'string' ? JSON.parse(guestUserStr) : guestUserStr;
        if (!gu?.id || gu?.id.startsWith('guest-')) {
          const planId = `guest-${Date.now()}`;
          Taro.navigateTo({
            url: `/pages/plans/detail/index?id=${planId}&name=${encodeURIComponent(planName)}&type=${encodeURIComponent(planType)}&schedule=${encodeURIComponent(scheduleData)}`,
          });
          setLoading(false);
          return;
        }
      }
    } catch {}

    // 正常模式 — 对齐Web第127-139行
    try {
      const { supabase } = await import('@/utils/supabase');
      const { data, error } = await supabase.from('plans').insert({
        name: planName,
        type: planType,
        family_id: '',
        sort_order: 0,
      }).select('id').single();

      if (!error && data) {
        Taro.navigateTo({
          url: `/pages/plans/detail/index?id=${data.id}&name=${encodeURIComponent(planName)}&type=${encodeURIComponent(planType)}&schedule=${encodeURIComponent(scheduleData)}`,
        });
      } else {
        Taro.navigateBack();
      }
    } catch {
      Taro.navigateBack();
    }
    setLoading(false);
  };

  // ===== 添加每周活动 =====
  const handleAddActivity = () => {
    if (!newActName.trim()) return;
    updateForm({
      weeklyActivities: [...form.weeklyActivities, { day: newActDay, activity: newActName.trim(), time: newActTime }],
    });
    setNewActName('');
    setShowAddActivity(false);
  };

  const removeActivity = (idx: number) => {
    updateForm({ weeklyActivities: form.weeklyActivities.filter((_, i) => i !== idx) });
  };

  // ===== 步骤指示器 — 对齐Web第143-176行 =====
  const stepLabels = [
    { key: 'scene', label: '场景' },
    { key: 'info', label: '基础信息' },
    { key: 'schedule', label: '日程' },
    { key: 'activities', label: '活动' },
    { key: 'confirm', label: '确认' },
  ];
  const currentIdx = stepLabels.findIndex(s => s.key === step);

  // 当前选中的场景
  const currentScene = PLAN_SCENES.find(s => s.type === form.scene);

  return (
    <View className="wizard-page">
      {/* Header — 对齐Web第181-189行 */}
      <View className="wizard-header">
        <View className="header-nav">
          <View className="back-btn" onClick={handleBack}>
            <Icon name="chevronLeft" size={40} color="#333" />
          </View>
          <Text className="header-title">智能创建计划</Text>
        </View>
        {/* 步骤指示器 */}
        {step !== 'scene' && (
          <View className="step-indicator">
            {stepLabels.map((s, i) => (
              <View key={s.key} className="step-dot-wrap">
                <View className={`step-dot ${i < currentIdx || i === currentIdx ? 'active' : ''} ${i === currentIdx ? 'current' : ''}`}>
                  <Text className={`step-dot-text ${i < currentIdx || i === currentIdx ? 'active' : ''}`}>{i < currentIdx ? '✓' : i + 1}</Text>
                </View>
                {i < stepLabels.length - 1 && <View className="step-line" />}
                <Text className={`step-label ${i === currentIdx ? 'active' : ''}`}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Body Scroll */}
      <ScrollView className="wizard-body" scrollY>

        {/* ========== Step 1: 选择场景 — 对齐Web第199-222行 ========== */}
        {step === 'scene' && (
          <View className="step-section">
            <Text className="step-desc">选择最适合你的计划类型</Text>
            {PLAN_SCENES.map((scene) => (
              <View
                key={scene.type}
                className="scene-card"
                onClick={() => handleSelectScene(scene.type)}
              >
                <View className="scene-icon-wrap">
                  <Text className="scene-emoji">{scene.emoji}</Text>
                </View>
                <View className="scene-info">
                  <Text className="scene-name">{scene.name}</Text>
                  <Text className="scene-desc">{scene.description}</Text>
                </View>
                <Icon name="chevronRight" size={36} color="rgba(0,0,0,0.2)" />
              </View>
            ))}
          </View>
        )}

        {/* ========== Step 2: 基础信息 — 对齐Web第225-349行 ========== */}
        {step === 'info' && (
          <View className="step-section">
            {/* 计划名称 */}
            <View className="card">
              <Text className="card-label">计划名称</Text>
              <Input
                className="card-input"
                value={form.name}
                placeholder="例如：2026年暑假"
                maxlength={30}
                focus
                onInput={(e) => updateForm({ name: e.detail.value })}
              />
            </View>

            {/* 时间范围 */}
            <View className="card">
              <Text className="card-label">时间范围</Text>
              <View className="date-row">
                <View className="date-col">
                  <Text className="date-hint">开始日期</Text>
                  <Input
                    className="date-input"
                    value={form.startDate}
                    placeholder="2026-01-01"
                    onInput={(e) => updateForm({ startDate: e.detail.value })}
                  />
                </View>
                <Text className="date-arrow">→</Text>
                <View className="date-col">
                  <Text className="date-hint">结束日期</Text>
                  <Input
                    className="date-input"
                    value={form.endDate}
                    placeholder="2026-02-01"
                    onInput={(e) => updateForm({ endDate: e.detail.value })}
                  />
                </View>
              </View>

              {/* 年级选择 */}
              <View className="grade-row">
                <Text className="date-hint">年级</Text>
                <View className="tags-row">
                  {GRADES.map(g => (
                    <View
                      key={g}
                      className={`tag ${form.grade === g ? 'active' : ''}`}
                      onClick={() => updateForm({ grade: g })}
                    >
                      <Text className={`tag-text ${form.grade === g ? 'active' : ''}`}>{g}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* 交换留学时区 — 对齐Web第284-319行 (⭐添加时区调整逻辑) */}
            {form.scene === 'exchange' && (
              <View className="card">
                <Text className="card-label">🌍 留学目的地时区</Text>
                {EXCHANGE_TIMEZONES.map(tz => (
                  <View
                    key={tz.label}
                    className={`tz-item ${form.timezone?.label === tz.label ? 'active' : ''}`}
                    onClick={() => {
                      updateForm({ timezone: tz });
                      // ⭐ 对齐Web第296-298行: 根据时区调整日程
                      const adjusted = adjustScheduleByTimezone(form.schedule, tz.offset);
                      updateForm({ schedule: adjusted });
                    }}
                  >
                    <Text className="tz-emoji">{tz.emoji}</Text>
                    <View className="tz-info">
                      <Text className="tz-name">{tz.label}</Text>
                      <Text className="tz-offset">北京时间 {tz.offset > 0 ? '+' : ''}{tz.offset}h</Text>
                    </View>
                    {form.timezone?.label === tz.label && <Icon name="check" size={28} color="#006e1c" />}
                  </View>
                ))}
              </View>
            )}

            {/* ⭐ 参与成员 — 对齐Web第322-348行 (新增) */}
            <View className="card">
              <Text className="card-label">👥 参与成员</Text>
              <Text className="schedule-hint">选择参与此计划的家庭成员</Text>
              {/* ⚠️ 小程序端暂用演示数据，实际应从 FamilyContext/members 获取孩子列表 */}
              <View className="tags-row">
                {['孩子1', '孩子2'].map(name => (
                  <View
                    key={name}
                    className={`tag ${form.children.includes(name) ? 'active' : ''}`}
                    onClick={() => {
                      const newChildren = form.children.includes(name)
                        ? form.children.filter(n => n !== name)
                        : [...form.children, name];
                      updateForm({ children: newChildren });
                    }}
                  >
                    <Text className={`tag-text ${form.children.includes(name) ? 'active' : ''}`}>{name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ========== Step 3: 日程调整 — 对齐Web第352-454行 ========== */}
        {step === 'schedule' && (
          <View className="step-section">
            <View className="card">
              <Text className="card-label">每日作息</Text>
              <Text className="schedule-hint">{form.scene === 'exchange' && form.timezone ? `已根据 ${form.timezone.label} 时区调整` : '你可以调整各个时段的时间'}</Text>

              {/* 起床 & 就寝 */}
              <View className="wake-bed-row">
                <View className="time-box amber">
                  <Text className="time-box-label">☀️ 起床</Text>
                  <Input
                    className="time-input"
                    value={form.schedule.wakeTime}
                    onInput={(e) => updateForm({ schedule: { ...form.schedule, wakeTime: e.detail.value } })}
                  />
                </View>
                <View className="time-box indigo">
                  <Text className="time-box-label">🌙 就寝</Text>
                  <Input
                    className="time-input"
                    value={form.schedule.bedTime}
                    onInput={(e) => updateForm({ schedule: { ...form.schedule, bedTime: e.detail.value } })}
                  />
                </View>
              </View>

              {/* 三餐时间 */}
              <Text className="sub-label">用餐时间</Text>
              <View className="meals-row">
                {(['breakfast', 'lunch', 'dinner'] as const).map(meal => (
                  <View key={meal} className="meal-col">
                    <Text className="meal-label">{meal === 'breakfast' ? '早餐' : meal === 'lunch' ? '午餐' : '晚餐'}</Text>
                    <Input
                      className="meal-input"
                      value={form.schedule.mealTimes[meal]}
                      onInput={(e) => updateForm({ schedule: { ...form.schedule, mealTimes: { ...form.schedule.mealTimes, [meal]: e.detail.value } } })}
                    />
                  </View>
                ))}
              </View>

              {/* 时段列表 */}
              <Text className="sub-label">时段安排</Text>
              {form.schedule.slots.map((slot, idx) => (
                <View key={idx} className="slot-row">
                  <Text className="slot-icon">{slot.icon}</Text>
                  <View className="slot-info">
                    <Text className="slot-label">{slot.label}</Text>
                    <Text className="slot-desc">{slot.description}</Text>
                  </View>
                  <View className="slot-times">
                    <Input
                      className="slot-time-input"
                      value={slot.startTime}
                      onInput={(e) => {
                        const newSlots = [...form.schedule.slots];
                        newSlots[idx] = { ...newSlots[idx], startTime: e.detail.value };
                        updateForm({ schedule: { ...form.schedule, slots: newSlots } });
                      }}
                    />
                    <Text className="slot-sep">-</Text>
                    <Input
                      className="slot-time-input"
                      value={slot.endTime}
                      onInput={(e) => {
                        const newSlots = [...form.schedule.slots];
                        newSlots[idx] = { ...newSlots[idx], endTime: e.detail.value };
                        updateForm({ schedule: { ...form.schedule, slots: newSlots } });
                      }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ========== Step 4: 每周固定活动 — 对齐Web第456-511行 ========== */}
        {step === 'activities' && (
          <View className="step-section">
            <View className="card">
              <Text className="card-label">每周固定活动</Text>
              <Text className="schedule-hint">记录每周固定的课外活动安排</Text>

              {form.weeklyActivities.length === 0 && (
                <View className="empty-acts">
                  <Text className="empty-acts-text">后续可以在计划详情中添加，或现在添加</Text>
                </View>
              )}

              {/* 活动列表 */}
              {form.weeklyActivities.map((act, idx) => (
                <View key={idx} className="act-row">
                  <View className="act-del-btn" onClick={() => removeActivity(idx)}>
                    <Text>×</Text>
                  </View>
                  <Text className="act-day">{act.day}</Text>
                  <Text className="act-name">{act.activity}</Text>
                  <Text className="act-time">{act.time}</Text>
                </View>
              ))}

              {/* 添加活动按钮/表单 */}
              {!showAddActivity ? (
                <View className="add-act-btn" onClick={() => setShowAddActivity(true)}>
                  <Icon name="plus" size={32} color="#006e1c" strokeWidth={3} />
                  <Text className="add-act-text">添加固定活动</Text>
                </View>
              ) : (
                <View className="add-act-form">
                  <View className="act-form-row">
                    {/* 小程序用 picker 替代 select */}
                    <View className="picker-wrap">
                      <Text className="picker-value">{newActDay}</Text>
                    </View>
                    <Input
                      className="act-time-inp"
                      value={newActTime}
                      type="digit"
                      onInput={(e) => setNewActTime(e.detail.value)}
                    />
                    <Input
                      className="act-name-inp"
                      value={newActName}
                      placeholder="活动名称"
                      onInput={(e) => setNewActName(e.detail.value)}
                    />
                  </View>
                  <View className="act-form-actions">
                    <View className="act-cancel-btn" onClick={() => { setShowAddActivity(false); setNewActName(''); }}>
                      <Text>取消</Text>
                    </View>
                    <View className={`act-confirm-btn ${!newActName.trim() ? 'disabled' : ''}`} onClick={handleAddActivity}>
                      <Text>添加</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* 建议任务 — 对齐Web第497-509行 */}
            <View className="card suggested-card">
              <Text className="card-label">建议任务</Text>
              <View className="suggested-tags">
                {(currentScene?.suggestedTasks || []).map(task => (
                  <View key={task} className="suggested-tag">
                    <Text className="suggested-tag-text">{task}</Text>
                  </View>
                ))}
              </View>
              <Text className="schedule-hint">创建计划后可在详情中为每个建议任务添加具体目标</Text>
            </View>
          </View>
        )}

        {/* ========== Step 5: 确认页面 — 对齐Web第513-589行 ========== */}
        {step === 'confirm' && (
          <View className="step-section">
            {/* 标题卡片 */}
            <View className="confirm-header-card">
              <Text className="confirm-subtitle">即将创建</Text>
              <Text className="confirm-plan-name">{form.name}</Text>
              <View className="confirm-tags-row">
                <View className="confirm-tag">
                  <Text>{currentScene?.emoji} {currentScene?.name}</Text>
                </View>
                {form.grade && (
                  <View className="confirm-tag">
                    <Text>{form.grade}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* 日程摘要 */}
            <View className="card">
              <Text className="card-label">⏰ 每日作息</Text>
              <View className="confirm-schedule-summary">
                <Text className="cs-item">☀️ 起床 {form.schedule.wakeTime}</Text>
                <Text className="cs-item">🌙 就寝 {form.schedule.bedTime}</Text>
              </View>
              <View className="cs-slots">
                {form.schedule.slots.slice(0, 8).map((slot, idx) => (
                  <View key={idx} className="cs-slot-row">
                    <Text className="cs-slot-icon">{slot.icon}</Text>
                    <Text className="cs-slot-time">{slot.startTime}-{slot.endTime}</Text>
                    <Text className="cs-slot-label">{slot.label}</Text>
                  </View>
                ))}
                {form.schedule.slots.length > 8 && (
                  <Text className="cs-more">...等共{form.schedule.slots.length}个时段</Text>
                )}
              </View>
            </View>

            {/* 固定活动摘要 */}
            {form.weeklyActivities.length > 0 && (
              <View className="card">
                <Text className="card-label">每周固定活动</Text>
                {form.weeklyActivities.map((act, idx) => (
                  <View key={idx} className="cs-act-row">
                    <Text className="cs-act-day">{act.day}</Text>
                    <Text className="cs-act-time">{act.time}</Text>
                    <Text className="cs-act-name">{act.activity}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ⭐ 参与成员 — 对齐Web第574-588行 (新增) */}
            {form.children.length > 0 && (
              <View className="card">
                <Text className="card-label">👥 参与成员</Text>
                <View className="tags-row" style={{ marginTop: '16rpx' }}>
                  {form.children.map(cName => (
                    <View key={cName} className="tag active">
                      <Text className="tag-text active">{cName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 底部安全区 */}
        <View style={{ height: '180rpx' }} />
      </ScrollView>

      {/* Bottom actions — 对齐Web第594-642行 */}
      <View className="wizard-footer">
        {step !== 'scene' && step !== 'confirm' && (
          <View className="footer-btn footer-btn-back" onClick={handleBack}>
            <Text>上一步</Text>
          </View>
        )}

        {step !== 'confirm' ? (
          <View
            className={`footer-btn footer-btn-next ${step === 'scene' ? 'hidden' : ''} ${!canGoNext() ? 'disabled' : ''}`}
            onClick={() => { if (canGoNext()) handleNext(); }}
          >
            <Text>下一步</Text>
          </View>
        ) : (
          <View className={`footer-btn footer-btn-create ${loading ? 'disabled' : ''}`} onClick={() => !loading && handleCreate()}>
            {loading ? (
              <Text>创建中...</Text>
            ) : (
              <>
                <Icon name="sparkles" size={30} color="#ffffff" />
                <Text style={{ color: '#fff', fontSize: '29rpx', fontWeight: 900 }}> 创建计划</Text>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
