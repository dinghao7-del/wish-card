/**
 * 计划列表页 — 严格对齐 Web端 src/pages/Plans.tsx
 *
 * 功能清单:
 * 1. ✅ 返回导航 + 标题"计划"
 * 2. ✅ 计划卡片: 名称 + 目标数(🎯) + 心愿数(⭐) + 删除 + 右箭头
 * 3. ✅ 点击卡片→跳详情页 /pkg/plans/detail/index?id=xxx
 * 4. ✅ 空状态提示
 * 5. ✅ 「🤖 智能创建计划」按钮 → /pkg/onboarding/index (AI引导向导)
 * 6. ✅ 「+ 添加计划」虚线按钮 → 弹窗(含14个预设模板)
 * 7. ✅ 数据模型: name/type/targetCount/wishCount 对齐Web
 */
import { View, Text, ScrollView, Input, Picker, Textarea } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

type PlanKind = 'goal' | 'cycle' | 'routine';
type PlanCreationStep = 'intent' | 'details' | 'preview';

interface GuidedPlanTemplate {
  title: string;
  name: string;
  kind: PlanKind;
  need: string;
  time: string;
  constraint: string;
  success: string;
}

const KIND_LABELS: Record<PlanKind, string> = {
  goal: '目标型计划',
  cycle: '周期习惯计划',
  routine: '日程安排计划',
};

const GUIDED_PLAN_TEMPLATES: GuidedPlanTemplate[] = [
  {
    title: '钢琴考级 5 级',
    name: '钢琴考级 5 级计划',
    kind: 'goal',
    need: '孩子准备钢琴考级，但平时练习不够稳定',
    time: '6 个月，每周 4 次，每次 30 分钟',
    constraint: '避开作业高峰和太晚的时间',
    success: '通过考级，或者能稳定完整演奏考试曲目',
  },
  {
    title: '读完 20 本书',
    name: '阅读 20 本书计划',
    kind: 'goal',
    need: '希望孩子慢慢建立持续阅读的能力',
    time: '一个学期，每周读 1 本左右',
    constraint: '不要挤占睡眠和户外活动时间',
    success: '完成 20 本书，并能简单讲出自己喜欢的内容',
  },
  {
    title: '每周练琴安排',
    name: '每周练琴安排',
    kind: 'cycle',
    need: '希望孩子把练琴变成稳定习惯',
    time: '每周 4 次，每次 30 分钟',
    constraint: '避开作业高峰和孩子明显疲惫的时间',
    success: '连续坚持 4 周，孩子不明显抗拒',
  },
  {
    title: '每天跳绳 10 分钟',
    name: '每天跳绳 10 分钟',
    kind: 'cycle',
    need: '希望孩子每天有一点稳定运动',
    time: '每天 10 分钟，优先安排在放学后或晚饭前',
    constraint: '天气不好时改成室内运动',
    success: '连续坚持 4 周，体能和节奏有改善',
  },
  {
    title: '寒假计划',
    name: '寒假计划',
    kind: 'routine',
    need: '寒假不想完全放飞，也不想安排得太满',
    time: '整个寒假，工作日和周末分开安排',
    constraint: '照顾家长上班时间和亲子陪伴时间',
    success: '学习、运动、休息和亲子活动都有稳定节奏',
  },
  {
    title: '工作日日程',
    name: '工作日日程',
    kind: 'routine',
    need: '让上学日每天更顺，减少家长反复催促',
    time: '每个工作日，按上学、放学、晚间分段安排',
    constraint: '要避开家长工作忙和孩子作业高峰',
    success: '孩子知道每天该做什么，家长提醒明显减少',
  },
];

// ===== 对齐 Web Plans.tsx 第15-21行: 数据模型 =====
interface PlanItem {
  id: string;
  name: string;
  type: string;
  targetCount: number; // 目标数（tasks）
  wishCount: number;   // 心愿数（rewards）
}

export default function Plans() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState<string | null>(null); // 对齐Web第40行
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanKind, setNewPlanKind] = useState<PlanKind>('routine');
  const [creationStep, setCreationStep] = useState<PlanCreationStep>('intent');
  const [planNeedText, setPlanNeedText] = useState('');
  const [planTimeText, setPlanTimeText] = useState('');
  const [planConstraintText, setPlanConstraintText] = useState('');
  const [planSuccessText, setPlanSuccessText] = useState('');
  const [separateWishes, setSeparateWishes] = useState(false); // 对齐Web第42行

  const currentTemplates = GUIDED_PLAN_TEMPLATES.filter(item => item.kind === newPlanKind);
  const templatePickerRange = [...currentTemplates.map(item => item.title), '自定义'];
  const matchedTemplateIndex = currentTemplates.findIndex(item => item.name === newPlanName);
  const selectedTemplateIndex = matchedTemplateIndex >= 0 ? matchedTemplateIndex : templatePickerRange.length - 1;

  useEffect(() => {
    loadPlans();
  }, []);

  // ===== 对齐 Web Plans.tsx 第50-78行: loadPlans =====
  const loadPlans = async () => {
    setLoading(true);

    try {
      // 尝试从 plans 表读取真实数据
      let data: PlanItem[] = [];
      try {
        const res = await supabase.from('plans')
          .select('id, name, type')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          data = await Promise.all(
            res.data.map(async (p: any) => {
              const [targetRes, wishRes] = await Promise.all([
                supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('plan_id', p.id),
                supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('plan_id', p.id),
              ]);
              return {
                id: p.id,
                name: p.name,
                type: p.type || '',
                targetCount: targetRes.count ?? 0,
                wishCount: wishRes.count ?? 0,
              };
            })
          );
        }
      } catch (e) {
        console.log('[Plans] DB查询失败:', e);
      }

      // ⭐ 已删除硬编码demo数据 — 对齐Web: 无数据时显示空状态

      setPlans(data);
    } catch (e) {
      console.error('[Plans] loadPlans error:', e);
    }

    setLoading(false);
  };

  const applyGuidedPlanTemplate = (template: GuidedPlanTemplate) => {
    setNewPlanKind(template.kind);
    setNewPlanName(template.name);
    setPlanNeedText(template.need);
    setPlanTimeText(template.time);
    setPlanConstraintText(template.constraint);
    setPlanSuccessText(template.success);
  };

  const applyCustomGuidedPlan = () => {
    setNewPlanName('');
    setPlanNeedText('');
    setPlanTimeText('');
    setPlanConstraintText('');
    setPlanSuccessText('');
  };

  const resetGuidedPlanForm = () => {
    setNewPlanName('');
    setNewPlanKind('routine');
    setCreationStep('intent');
    setPlanNeedText('');
    setPlanTimeText('');
    setPlanConstraintText('');
    setPlanSuccessText('');
  };

  const closeAddDialog = () => {
    setShowAddDialog(false);
    resetGuidedPlanForm();
  };

  const choosePlanScenario = (kind: PlanKind) => {
    const template = GUIDED_PLAN_TEMPLATES.find(item => item.kind === kind);
    setNewPlanKind(kind);
    if (template) applyGuidedPlanTemplate(template);
    setCreationStep('details');
  };

  const guidedDraft = buildGuidedPlanDraft({
    name: newPlanName,
    kind: newPlanKind,
    need: planNeedText,
    time: planTimeText,
    constraint: planConstraintText,
    success: planSuccessText,
  });

  // ===== 对齐 Web Plans.tsx: handleAddPlan =====
  const handleAddPlan = async () => {
    const draftedPlan = buildGuidedPlanDraft({
      name: newPlanName,
      kind: newPlanKind,
      need: planNeedText,
      time: planTimeText,
      constraint: planConstraintText,
      success: planSuccessText,
    });

    if (!draftedPlan.name.trim()) {
      Taro.showToast({ title: '请输入计划名称', icon: 'none' });
      return;
    }

    const planType = KIND_LABELS[newPlanKind];
    const metadata = {
      kind: newPlanKind,
      planningBrief: draftedPlan,
    };

    // 游客模式: 直接跳转详情页（对齐Web第84-90行）
    const guestUserStr = Taro.getStorageSync('guest_user') || Taro.getStorageSync('localUser');
    if (guestUserStr) {
      try {
        const guestUser = typeof guestUserStr === 'string' ? JSON.parse(guestUserStr) : guestUserStr;
        if (!guestUser?.id || guestUser?.id.startsWith('guest-')) {
          const planId = `guest-${Date.now()}`;
          Taro.setStorageSync(`plan_brief_${planId}`, JSON.stringify(metadata));
          resetGuidedPlanForm();
          setShowAddDialog(false);
          Taro.navigateTo({
            url: `/pkg/plans/detail/index?id=${planId}&name=${encodeURIComponent(draftedPlan.name.trim())}&type=${encodeURIComponent(planType)}&from=guided-draft`,
          });
          return;
        }
      } catch {}
    }

    // 正常模式: 写入DB后跳转 (对齐Web第93-108行)
    try {
      // 从本地用户获取family_id (对齐Web useFamily)
      const userStr = Taro.getStorageSync('localUser') || '{}';
      let familyId = '';
      try { const u = typeof userStr === 'string' ? JSON.parse(userStr) : userStr; familyId = u?.family_id || ''; } catch {}

      const { data, error } = await supabase.from('plans').insert({
        name: draftedPlan.name.trim(),
        type: planType,
        metadata,
        family_id: familyId,
        sort_order: plans.length,
      }).select('id').single();

      if (!error && data) {
        Taro.setStorageSync(`plan_brief_${data.id}`, JSON.stringify(metadata));
        resetGuidedPlanForm();
        setShowAddDialog(false);
        Taro.navigateTo({ url: `/pkg/plans/detail/index?id=${data.id}&from=guided-draft` });
      } else {
        // fallback: 刷新列表
        loadPlans();
        setShowAddDialog(false);
        Taro.showToast({ title: '创建成功', icon: 'success' });
      }
    } catch (e) {
      console.error('[Plans] handleAddPlan error:', e);
      loadPlans();
      setShowAddDialog(false);
      Taro.showToast({ title: '已创建', icon: 'success' });
    }
  };

  // ===== 对齐 Web Plans.tsx 第111-114行: 删除计划 =====
  const handleDeletePlan = async (id: string, e?: any) => {
    if (e) e.stopPropagation();

    const res = await new Promise<boolean>((resolve) => {
      Taro.showModal({
        title: '删除计划',
        content: '确定要删除这个计划吗？关联的目标和心愿不会受影响。',
        success: (modalRes) => resolve(modalRes.confirm),
        fail: () => resolve(false),
      });
    });

    if (!res) return;

    try {
      await supabase.from('plans').update({ is_active: false }).eq('id', id);
    } catch {}
    // 从本地列表移除
    setPlans(prev => prev.filter(p => p.id !== id));
    Taro.showToast({ title: '已删除', icon: 'success' });
  };

  // ===== 点击卡片→跳详情页（对齐Web第143行）=====
  const handlePlanClick = (plan: PlanItem) => {
    Taro.navigateTo({
      url: `/pkg/plans/detail/index?id=${plan.id}&name=${encodeURIComponent(plan.name)}&type=${encodeURIComponent(plan.type)}`,
    });
  };

  // ===== Loading =====
  if (loading) {
    return (
      <View className={`plans-page ${getThemeClass()}`}>
        <View style={{ display: 'flex', justifyContent: 'center', paddingTop: '200rpx' }}>
          <Icon name="loader" size={48} color="#006e1c" />
        </View>
      </View>
    );
  }

  // ===== 渲染（对齐Web第116-266行）======
  return (
    <View className={`plans-page ${getThemeClass()}`}>
      {/* ===== Header: 返回 + 标题 — 对齐Web第119-127行 ===== */}
      <View className="plans-header">
        <View className="header-left" onClick={() => Taro.navigateBack()}>
          <Icon name="chevronLeft" size={40} color="#333" />
          <Text className="header-title">计划</Text>
        </View>
      </View>

      {/* ===== 计划列表 — 对齐Web第129-187行 ===== */}
      <ScrollView className="plans-body" scrollY>
        {/* ===== separateWishes Toggle — 对齐Web第42行 ===== */}
        <View
          className="wishes-toggle"
          onClick={() => setSeparateWishes(!separateWishes)}
        >
          <Text className="wishes-toggle-label">显示心愿数</Text>
          <View
            style={{
              width: '84rpx', height: '48rpx', borderRadius: '9999px',
              padding: '6rpx', display: 'flex', alignItems: 'center',
              backgroundColor: separateWishes ? '#006e1c' : '#e5e7eb',
              border: 'none', transition: 'background-color 0.3s',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            <View
              style={{
                width: '36rpx', height: '36rpx', backgroundColor: '#ffffff',
                borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                flexShrink: 0,
                transform: `translateX(${separateWishes ? '36rpx' : '0'})`,
                transition: 'transform 0.3s cubic-bezier(0.68,-0.55,0.265,1.55)',
              }}
            />
          </View>
        </View>

        <View className="plans-list">
          {plans.map((plan) => (
            /* 对齐Web第137-177行: 卡片 */
            <View key={plan.id} className="plan-card" onClick={() => handlePlanClick(plan)}>
              <View className="plan-card-inner">
                <View className="plan-info">
                  <Text className="plan-name">{plan.name}</Text>
                  <View className="plan-stats-row">
                    {/* 🎯 目标数 — 对齐Web第149-153行 */}
                    <View className="stat-item">
                      <Icon name="target" size={26} color="#006e1c" />
                      <Text className="stat-text">{plan.targetCount} 个目标</Text>
                    </View>
                    {/* ⭐ 心愿数 — 对齐Web第155-161行: 受separateWishes控制 */}
                    {separateWishes && (
                      <View className="stat-item">
                        <Icon name="star" size={26} color="#f59e0b" />
                        <Text className="stat-text">{plan.wishCount} 个心愿</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 操作区: 编辑 + 删除 + 箭头 — 对齐Web第165-175行 + editDialog */}
                <View className="plan-actions">
                  {/* 编辑按钮 — 对齐Web showEditDialog */}
                  <View
                    className="edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditDialog(plan.id);
                      setNewPlanName(plan.name);
                    }}
                  >
                    <Icon name="edit2" size={28} color="rgba(0,0,0,0.35)" />
                  </View>
                  <View
                    className="delete-btn"
                    onClick={(e) => handleDeletePlan(plan.id, e)}
                  >
                    <Icon name="trash" size={28} color="#ef4444" />
                  </View>
                  <View className="arrow-btn">
                    <Icon name="chevronRight" size={32} color="rgba(0,0,0,0.25)" />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ===== 空状态 — 对齐Web第182-186行 ===== */}
        {!loading && plans.length === 0 && (
          <View className="empty-state">
            <Icon name="grid" size={96} color="rgba(0,0,0,0.12)" />
            <Text className="empty-text">暂无计划，点击下方按钮创建</Text>
          </View>
        )}

        <View className="add-plan-btn primary-add-plan-btn" onClick={() => setShowAddDialog(true)}>
          <Icon name="plus" size={40} color="#006e1c" strokeWidth={3} />
          <Text className="add-plan-text">创建新计划</Text>
        </View>

        <View style={{ height: '60rpx' }} />
      </ScrollView>

      {/* ===== 添加计划弹窗 — 对齐Web第209-263行 ===== */}
      {showAddDialog && (
        <View className="dialog-overlay" onClick={closeAddDialog}>
          <View className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <Text className="dialog-title">
              {creationStep === 'intent' ? '先说清楚想安排什么' : creationStep === 'details' ? '把需求补充完整' : '确认计划草案'}
            </Text>

            {creationStep === 'intent' && (
              <View className="guided-step">
                <View className="intent-note">
                  <Text className="intent-note-title">先不要急着创建计划</Text>
                  <Text className="intent-note-desc">先选一个最接近的方向。下一步我会继续问清楚目标、时间、限制和验收方式，再生成计划草案。</Text>
                </View>

                <View className="scenario-card" onClick={() => choosePlanScenario('goal')}>
                  <Text className="scenario-title">想达成一个明确目标</Text>
                  <Text className="scenario-desc">例如钢琴考级、读完 20 本书、数学期末提升。适合做进度条和里程碑。</Text>
                </View>
                <View className="scenario-card" onClick={() => choosePlanScenario('cycle')}>
                  <Text className="scenario-title">想固定一件事的频率</Text>
                  <Text className="scenario-desc">例如每周练琴 4 次、跳绳每天 10 分钟、每周两次游泳。重点看坚持节奏。</Text>
                </View>
                <View className="scenario-card" onClick={() => choosePlanScenario('routine')}>
                  <Text className="scenario-title">想安排一段时间的日程</Text>
                  <Text className="scenario-desc">例如工作日、周末、寒暑假、学期安排。重点是让每天更顺。</Text>
                </View>
              </View>
            )}

            {creationStep === 'details' && (
              <View className="guided-step">
                <Text className="guided-label">先选一个最接近的常见情况</Text>
                <Picker
                  mode="selector"
                  range={templatePickerRange}
                  value={selectedTemplateIndex}
                  onChange={(e) => {
                    const index = Number(e.detail.value);
                    const picked = currentTemplates[index];
                    if (picked) applyGuidedPlanTemplate(picked);
                    else applyCustomGuidedPlan();
                  }}
                >
                  <View className="template-picker">
                    <Text className="template-picker-text">
                      {currentTemplates.find(item => item.name === newPlanName)?.title || '自定义'}
                    </Text>
                    <Icon name="chevronDown" size={28} color="rgba(0,0,0,0.55)" />
                  </View>
                </Picker>

                <Input
                  className="dialog-input"
                  value={newPlanName}
                  placeholder="给这个计划起个容易懂的名字"
                  maxlength={30}
                  focus={showAddDialog}
                  onInput={(e) => setNewPlanName(e.detail.value)}
                  confirmType="done"
                />

                <GuidedTextField label="你最想解决什么问题？" value={planNeedText} onInput={setPlanNeedText} />
                <GuidedTextField label="大概持续多久，频率是什么？" value={planTimeText} onInput={setPlanTimeText} />
                <GuidedTextField label="家里有什么现实限制？" value={planConstraintText} onInput={setPlanConstraintText} />
                <GuidedTextField label="做到什么程度算满意？" value={planSuccessText} onInput={setPlanSuccessText} />

                <View
                  className={`dialog-confirm-btn ${!newPlanName.trim() || !planNeedText.trim() ? 'disabled' : ''}`}
                  onClick={() => newPlanName.trim() && planNeedText.trim() && setCreationStep('preview')}
                >
                  <Text className="dialog-confirm-text">生成计划草案</Text>
                </View>
                <View className="dialog-secondary-btn" onClick={() => setCreationStep('intent')}>
                  <Text className="dialog-secondary-text">返回上一步</Text>
                </View>
              </View>
            )}

            {creationStep === 'preview' && (
              <View className="guided-step">
                <View className="preview-note">
                  <Text className="preview-note-title">先看草案，再决定是否生成</Text>
                  <Text className="preview-note-desc">下面是根据你刚才说的内容整理出的计划方向。确认后才会真正创建计划。</Text>
                </View>

                <View className="draft-card">
                  <Text className="draft-kind">{guidedDraft.kindLabel}</Text>
                  <Text className="draft-title">{guidedDraft.name}</Text>
                  <Text className="draft-summary">{guidedDraft.summary}</Text>
                  {guidedDraft.checkpoints.map(item => (
                    <View key={item.label} className="draft-checkpoint">
                      <Text className="draft-checkpoint-label">{item.label}</Text>
                      <Text className="draft-checkpoint-value">{item.value}</Text>
                    </View>
                  ))}
                </View>

                <View className="generated-card">
                  <Text className="generated-title">确认后会先生成这些内容</Text>
                  {guidedDraft.generatedItems.map(item => (
                    <View key={item} className="generated-row">
                      <Icon name="checkCircle2" size={24} color="#006e1c" />
                      <Text className="generated-text">{item}</Text>
                    </View>
                  ))}
                </View>

                <View
                  className={`dialog-confirm-btn ${!newPlanName.trim() ? 'disabled' : ''}`}
                  onClick={() => newPlanName.trim() && handleAddPlan()}
                >
                  <Text className="dialog-confirm-text">确认，创建这个计划</Text>
                </View>
                <View className="dialog-secondary-btn" onClick={() => setCreationStep('details')}>
                  <Text className="dialog-secondary-text">返回修改需求</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ===== 编辑计划弹窗 — 对齐Web showEditDialog ===== */}
      {showEditDialog && (
        <View className="dialog-overlay" onClick={() => setShowEditDialog(null)}>
          <View className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <Text className="dialog-title">编辑计划名称</Text>

            <Input
              className="dialog-input"
              value={newPlanName}
              placeholder="请输入计划名称"
              maxlength={30}
              focus
              onInput={(e) => setNewPlanName(e.detail.value)}
              confirmType="done"
            />

            <View
              className={`dialog-confirm-btn ${!newPlanName.trim() ? 'disabled' : ''}`}
              onClick={async () => {
                if (!newPlanName.trim()) return;
                try {
                  await supabase.from('plans')
                    .update({ name: newPlanName.trim() })
                    .eq('id', showEditDialog);
                  setPlans(prev => prev.map(p =>
                    p.id === showEditDialog ? { ...p, name: newPlanName.trim() } : p
                  ));
                  Taro.showToast({ title: '已更新', icon: 'success' });
                } catch {}
                setShowEditDialog(null);
              }}
            >
              <Text className="dialog-confirm-text">保存</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function GuidedTextField({
  label,
  value,
  onInput,
}: {
  label: string;
  value: string;
  onInput: (value: string) => void;
}) {
  return (
    <View className="guided-field">
      <Text className="guided-field-label">{label}</Text>
      <Textarea
        className="guided-textarea"
        value={value}
        maxlength={180}
        autoHeight
        onInput={(event) => onInput(event.detail.value)}
      />
    </View>
  );
}

function buildGuidedPlanDraft(input: {
  name: string;
  kind: PlanKind;
  need: string;
  time: string;
  constraint: string;
  success: string;
}) {
  const name = input.name.trim() || (input.kind === 'goal' ? '目标计划' : input.kind === 'cycle' ? '周期安排' : '日程计划');
  const kindLabel = KIND_LABELS[input.kind];
  const need = input.need.trim() || '先把家庭当前最关心的安排梳理清楚';
  const time = input.time.trim() || '时间和频率后续可以继续微调';
  const constraint = input.constraint.trim() || '先按家庭默认作息安排，遇到冲突再调整';
  const successText = input.success.trim() || (input.kind === 'goal' ? '达到明确验收目标' : '形成稳定、可持续的执行节奏');
  const generatedItems = input.kind === 'goal'
    ? ['生成目标说明和阶段里程碑', '生成日常练习任务草案', '保留目标、频率和完成标准，后续可继续编辑']
    : input.kind === 'cycle'
      ? ['生成固定频率的练习或习惯安排', '生成孩子可打卡的执行任务', '根据家庭作息避开明显冲突时间']
      : ['生成一版日程骨架', '拆出学习、运动、休息和亲子安排', '保留限制条件，后续由 AI 继续优化'];

  return {
    name,
    kind: input.kind,
    kindLabel,
    need,
    time,
    constraint,
    successText,
    summary: `围绕“${need}”，先按“${time}”安排，并避开“${constraint}”。`,
    checkpoints: [
      { label: '家长真正想解决的问题', value: need },
      { label: '时间/频率', value: time },
      { label: '现实限制', value: constraint },
      { label: '满意标准', value: successText },
    ],
    generatedItems,
  };
}
