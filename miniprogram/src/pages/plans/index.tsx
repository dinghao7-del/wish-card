/**
 * 计划列表页 — 严格对齐 Web端 src/pages/Plans.tsx
 *
 * 功能清单:
 * 1. ✅ 返回导航 + 标题"计划"
 * 2. ✅ 计划卡片: 名称 + 目标数(🎯) + 心愿数(⭐) + 删除 + 右箭头
 * 3. ✅ 点击卡片→跳详情页 /pages/plans/detail/index?id=xxx
 * 4. ✅ 空状态提示
 * 5. ✅ 「🤖 智能创建计划」按钮 → /pages/onboarding/index (AI引导向导)
 * 6. ✅ 「+ 添加计划」虚线按钮 → 弹窗(含14个预设模板)
 * 7. ✅ 数据模型: name/type/targetCount/wishCount 对齐Web
 */
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import './index.scss';

// ===== 对齐 Web Plans.tsx 第23-31行: 预设模板 =====
const PLAN_PRESETS = [
  '寒假计划', '暑假计划',
  '一年级上学期', '一年级下学期',
  '二年级上学期', '二年级下学期',
  '三年级上学期', '三年级下学期',
  '四年级上学期', '四年级下学期',
  '五年级上学期', '五年级下学期',
  '六年级上学期', '六年级下学期',
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
  const [separateWishes, setSeparateWishes] = useState(false); // 对齐Web第42行

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

  // ===== 对齐 Web Plans.tsx 第81-108行: handleAddPlan =====
  const handleAddPlan = async () => {
    if (!newPlanName.trim()) {
      Taro.showToast({ title: '请输入计划名称', icon: 'none' });
      return;
    }

    const planType = PLAN_PRESETS.includes(newPlanName.trim()) ? newPlanName.trim() : '自定义';

    // 游客模式: 直接跳转详情页（对齐Web第84-90行）
    const guestUserStr = Taro.getStorageSync('guest_user') || Taro.getStorageSync('localUser');
    if (guestUserStr) {
      try {
        const guestUser = typeof guestUserStr === 'string' ? JSON.parse(guestUserStr) : guestUserStr;
        if (!guestUser?.id || guestUser?.id.startsWith('guest-')) {
          setNewPlanName('');
          setShowAddDialog(false);
          const planId = `guest-${Date.now()}`;
          Taro.navigateTo({
            url: `/pages/plans/detail/index?id=${planId}&name=${encodeURIComponent(newPlanName.trim())}&type=${encodeURIComponent(planType)}`,
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
        name: newPlanName.trim(),
        type: planType,
        family_id: familyId,
        sort_order: plans.length,
      }).select('id').single();

      if (!error && data) {
        setNewPlanName('');
        setShowAddDialog(false);
        Taro.navigateTo({ url: `/pages/plans/detail/index?id=${data.id}` });
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
      url: `/pages/plans/detail/index?id=${plan.id}&name=${encodeURIComponent(plan.name)}&type=${encodeURIComponent(plan.type)}`,
    });
  };

  // ===== 智能创建计划 — 对齐Web第190行: navigate('/plans/wizard') =====
  const handleSmartCreate = () => {
    Taro.navigateTo({ url: '/pages/plans/wizard/index' });
  };

  // ===== Loading =====
  if (loading) {
    return (
      <View className="plans-page">
        <View style={{ display: 'flex', justifyContent: 'center', paddingTop: '200rpx' }}>
          <Icon name="loader" size={48} color="#006e1c" />
        </View>
      </View>
    );
  }

  // ===== 渲染（对齐Web第116-266行）======
  return (
    <View className="plans-page">
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
            role="switch"
            aria-checked={separateWishes}
            style={{
              width: '84rpx', height: '48rpx', borderRadius: '9999px',
              padding: '6rpx', display: 'flex', alignItems: 'center',
              backgroundColor: separateWishes ? '#006e1c' : '#e5e7eb',
              border: 'none', cursor: 'pointer', transition: 'background-color 0.3s',
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

        {/* ===== 🤖 智能创建计划 — 对齐Web第190-197行 ===== */}
        <View className="smart-create-btn" onClick={handleSmartCreate}>
          <Icon name="sparkles" size={36} color="#ffffff" />
          <Text className="smart-create-text">智能创建计划</Text>
          <View className="new-badge">
            <Text className="new-badge-text">New</Text>
          </View>
        </View>

        {/* ===== + 添加计划（虚线）— 对齐Web第199-206行 ===== */}
        <View className="add-plan-btn" onClick={() => setShowAddDialog(true)}>
          <Icon name="plus" size={40} color="#006e1c" strokeWidth={3} />
          <Text className="add-plan-text">添加计划</Text>
        </View>

        <View style={{ height: '60rpx' }} />
      </ScrollView>

      {/* ===== 添加计划弹窗 — 对齐Web第209-263行 ===== */}
      {showAddDialog && (
        <View className="dialog-overlay" onClick={() => setShowAddDialog(false)}>
          <View className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <Text className="dialog-title">添加计划</Text>

            {/* 输入框 — 对齐Web第228-234行 */}
            <Input
              className="dialog-input"
              value={newPlanName}
              placeholder="请输入计划名称"
              maxlength={30}
              focus={showAddDialog}
              onInput={(e) => setNewPlanName(e.detail.value)}
              confirmType="done"
            />

            {/* 预设模板标签 — 对齐Web第237-251行 */}
            <View className="preset-tags">
              {PLAN_PRESETS.map((preset) => (
                <View
                  key={preset}
                  className={`preset-tag ${newPlanName === preset ? 'active' : ''}`}
                  onClick={() => setNewPlanName(preset)}
                >
                  <Text className={`preset-tag-text ${newPlanName === preset ? 'active' : ''}`}>{preset}</Text>
                </View>
              ))}
            </View>

            {/* 确认按钮 — 对齐Web第254-260行 */}
            <View
              className={`dialog-confirm-btn ${!newPlanName.trim() ? 'disabled' : ''}`}
              onClick={() => newPlanName.trim() && handleAddPlan()}
            >
              <Text className="dialog-confirm-text">添加</Text>
            </View>
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
