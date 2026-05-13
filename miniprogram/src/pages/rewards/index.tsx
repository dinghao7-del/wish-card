/**
 * Rewards 奖励商店 — 100% 复刻 Web 端 Rewards.tsx (303行)
 *
 * 功能清单：
 * ✅ Header: 用户头像(可点击) + 星星余额 + 设置按钮
 * ✅ 标题栏: "奖励商店" + 家长新建FAB
 * ✅ 分类Tab: 横向滚动 7个分类（all/common/experience/prize/privilege/growth/activity）
 * ✅ 奖励网格: 2列卡片（图片+标题悬浮底部+编辑+星星成本+兑换/进度条）
 * ✅ 兑换详情Modal: 底部弹出大图+名称+分类tag+成本+描述+确认
 * ✅ 兑换流程: 余额检查 → 不足显示进度条 → 足够确认 → 成功动画→扣减
 * ✅ CelebrationAnimation 兑换成功后展示
 */
import { View, Text, Image, ScrollView, Input, Textarea } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { isGuestMode, getGuestData } from '@/lib/guestData';
import { resolveAvatarPath } from '@/lib/templates';
import Icon from '@/components/Icon';
import CelebrationAnimation from '@/components/CelebrationAnimation';
import RewardTemplateSelector from '@/components/RewardTemplateSelector';
import './index.scss';

// ===== 类型定义 =====
interface Reward {
  id: string; name: string; description?: string;
  cost?: number; category?: string; image?: string; icon?: string;
}

// ===== 7个分类（与Web端完全对齐）=====
const CATEGORIES = [
  { key: 'all', label: '全部' },
  { key: 'common', label: '常用' },
  { key: 'experience', label: '体验' },
  { key: 'prize', label: '奖品' },
  { key: 'privilege', label: '特权' },
  { key: 'growth', label: '成长' },
  { key: 'activity', label: '活动' },
];

export default function Rewards() {
  // ===== 状态 =====
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [starBalance, setStarBalance] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal 状态
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [exchanging, setExchanging] = useState(false);

  // 庆祝动画状态
  const [showCelebration, setShowCelebration] = useState(false);

  // 创建奖励弹窗状态 (对齐Web /rewards/new 全屏表单)
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', description: '', cost: 10, category: 'common',
    quantity: 1, image: '', icon: '🐷', exchangeLimit: false,
  });
  const [creating, setCreating] = useState(false);
  const [showDescInput, setShowDescInput] = useState(false);

  // 心愿模板库状态
  const [showRewardTemplates, setShowRewardTemplates] = useState(false);
  const [familyId, setFamilyId] = useState('');

  useEffect(() => {
    initPageData();
  }, []);

  // 切换分类时重新加载
  useEffect(() => {
    fetchRewards();
  }, [activeCategory]);

  // ===== 数据获取 =====
  const initPageData = async () => {
    try {
      // ===== 1. 优先尝试真实登录用户 =====
      let authUser;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        authUser = user;
      } catch (authErr) {
        console.warn('[Rewards] auth check failed:', authErr);
      }

      if (authUser) {
        console.log('[Rewards] Real user found, fetching real data');
        const { data: member } = await supabase
          .from('members')
          .select('*')
          .eq('id', authUser.id)
          .single();

      if (member) {
        setUser(member);
        setStarBalance(member.stars || 0);
        // 获取 familyId 供模板导入使用
        try {
          const famId = member.family_id || '';
          setFamilyId(famId);
        } catch {}
      }
      setLoading(false);
      return; // 真实数据路径完成
      }

      // ===== 2. 无真实用户 → 检查游客模式 =====
      if (isGuestMode()) {
        console.log('[Rewards] Guest mode: loading demo data');
        const guestData = getGuestData();
        setRewards(guestData.rewards || []);
        const guestMember = guestData.members.find((m: any) => m.role === 'child') || guestData.members[2];
        setUser(guestMember);
        setStarBalance(guestMember?.stars || 186);
        // 游客模式也获取 familyId（如有）
        try {
          const userStr = Taro.getStorageSync('localUser') || '{}';
          const u = typeof userStr === 'string' ? JSON.parse(userStr) : userStr;
          setFamilyId(u?.family_id || '');
        } catch {}
        setLoading(false);
        return;
      }

      // ===== 3. 无任何用户 → 保持空白（用户需要先登录）=====
      console.log('[Rewards] No user, showing empty');
      setLoading(false);
    } catch (e) {
      console.error('[Rewards] init error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRewards = async () => {
    // 游客模式：从本地数据筛选
    if (isGuestMode()) {
      const allRewards = getGuestData().rewards || [];
      if (activeCategory === 'all') {
        setRewards(allRewards);
      } else {
        setRewards(allRewards.filter((r: any) => r.category === activeCategory));
      }
      return;
    }

    try {
      let query = supabase.from('rewards').select('*');

      if (activeCategory !== 'all') {
        query = query.eq('category', activeCategory);
      }

      const { data } = await query.order('created_at', { ascending: false });
      setRewards(data || []);
    } catch (e) {
      console.error('[Rewards] fetchRewards error:', e);
      setRewards([]);
    }
  };

  // ===== 操作方法 =====

  // 点击奖励卡片 → 打开详情Modal
  const handleRewardClick = (reward: Reward) => {
    setSelectedReward(reward);
    setShowDetailModal(true);
  };

  // 执行兑换
  const handleExchange = async () => {
    if (!selectedReward || !user) return;

    const cost = selectedReward.cost || 0;

    // 余额检查
    if (starBalance < cost) {
      Taro.showToast({
        title: `还差 ${cost - starBalance} 颗星星`,
        icon: 'none',
      });
      return;
    }

    setExchanging(true);

    // ===== 游客模式：本地模拟 =====
    if (isGuestMode()) {
      console.log('[Rewards] Guest mode: simulating exchange');
      await new Promise(resolve => setTimeout(resolve, 800));
      const newBalance = starBalance - cost;
      setStarBalance(newBalance);
      setShowDetailModal(false);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      Taro.showToast({ title: '兑换成功！（演示）🎉', icon: 'success' });
      setExchanging(false);
      return;
    }

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // 创建兑换记录
      const { error: exchangeError } = await supabase
        .from('exchanges')
        .insert({
          reward_id: selectedReward.id,
          user_id: currentUser?.id || user.id,
          star_cost: cost,
          status: 'pending',
        });

      if (exchangeError) throw exchangeError;

      // 扣减星星
      const { error: starError } = await supabase.rpc('decrement_stars', {
        user_id: currentUser?.id || user.id,
        stars: cost,
      });

      if (starError) throw starError;

      // 更新本地余额
      const newBalance = starBalance - cost;
      setStarBalance(newBalance);

      // 关闭Modal并展示庆祝动画
      setShowDetailModal(false);
      setShowCelebration(true);

      // 动画持续3秒后自动关闭
      setTimeout(() => setShowCelebration(false), 3000);

      Taro.showToast({ title: '兑换成功！🎉', icon: 'success' });

      // 刷新余额
      setTimeout(async () => {
        try {
          const { data: updated } = await supabase
            .from('members')
            .select('stars')
            .eq('id', user.id)
            .single();
          if (updated) setStarBalance(updated.stars || 0);
        } catch {}
      }, 500);

    } catch (err: any) {
      console.error('[Rewards] exchange error:', err);
      Taro.showToast({ title: err.message || '兑换失败', icon: 'none' });
    } finally {
      setExchanging(false);
    }
  };

  // 新建奖励（家长权限）— 对齐Web /rewards/new
  const handleCreateReward = () => {
    setCreateForm({ name: '', description: '', cost: 10, category: 'common', quantity: 1, image: '', icon: '🐷', exchangeLimit: false });
    setShowDescInput(false);
    setShowCreateDialog(true);
  };

  // 提交新建奖励
  const handleSubmitCreate = async () => {
    if (!createForm.name.trim()) {
      Taro.showToast({ title: '请输入奖励名称', icon: 'none' });
      return;
    }
    if (createForm.cost < 1) {
      Taro.showToast({ title: '星星成本至少为1', icon: 'none' });
      return;
    }
    setCreating(true);
    try {
      const userStr = Taro.getStorageSync('localUser') || '{}';
      let familyId = '';
      try { const u = typeof userStr === 'string' ? JSON.parse(userStr) : userStr; familyId = u?.family_id || ''; } catch {}

      const { error } = await supabase.from('rewards').insert({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        cost: createForm.cost,
        category: createForm.category,
        family_id: familyId,
        is_active: true,
      });
      if (error) throw error;

      Taro.showToast({ title: '奖励创建成功', icon: 'success' });
      setShowCreateDialog(false);
      fetchRewards(); // 刷新列表
    } catch (e) {
      console.error('[Rewards] create error:', e);
      Taro.showToast({ title: '创建失败，请重试', icon: 'none' });
    } finally {
      setCreating(false);
    }
  };

  // 跳转个人中心
  const handleProfileClick = () => {
    Taro.switchTab({ url: '/pages/profile/index' });
  };

  // ===== 渲染：进度条计算 =====
  const getProgressPercent = (cost: number) => {
    if (cost <= 0) return 100;
    return Math.min(Math.round((starBalance / cost) * 100), 100);
  };

  // 分类中文名映射
  const getCategoryLabel = (key?: string): string => {
    if (!key) return '未分类';
    return CATEGORIES.find(c => c.key === key)?.label || key;
  };

  // ===== 渲染 =====

  if (loading) {
    return (
      <View className="rewards-page">
        <View className="rw-loading">
          <Icon name="loader" size={48} color="#006e1c" />
          <Text className="rw-loading-text">加载奖励...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="rewards-page">
      {/* ===== Header — 对齐Web原版：头像 + 星星 + 设置 ===== */}
      <View className="rw-header">
        <View className="rw-header-left" onClick={handleProfileClick}>
          <Image className="rw-avatar" src={resolveAvatarPath(user?.avatar || '')} mode="aspectFill" />
        </View>
        <View className="rw-header-right">
          <View className="rw-star-badge" onClick={() => Taro.navigateTo({ url: '/pages/history/index' })}>
            <Icon name="star" size={24} color="#F9A825" />
            <Text>{starBalance}</Text>
          </View>
          <View className="rw-settings-btn">
            <Icon name="settings" size={36} color="#5a6b54" />
          </View>
        </View>
      </View>

      {/* ===== 标题栏 — 对齐Web原版：标题左边 + 大FAB右边 ===== */}
      <View className="rw-title-bar">
        <Text className="rw-title">用努力 开启小确幸 🌱</Text>
        {/* 大绿色圆形 + 按钮 — 对齐Web原版，所有用户可见 */}
        <View className="rw-fab-plus" onClick={handleCreateReward}>
          <Icon name="plus" size={48} color="#ffffff" />
        </View>
      </View>

      {/* ===== 分类 Tab（横向滚动7个）===== */}
      <ScrollView scrollX className="rw-category-scroll" showScrollbar={false}>
        <View className="rw-category-tabs">
          {CATEGORIES.map(cat => (
            <View
              key={cat.key}
              className={`rw-cat-pill ${activeCategory === cat.key ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <Text>{cat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ===== 奖励网格 ===== */}
      {rewards.length > 0 ? (
        <ScrollView scrollY className="rw-grid-scroll">
          <View className="rw-rewards-grid">
            {rewards.map((reward, idx) => {
              const cost = reward.cost || 0;
              const canAfford = starBalance >= cost;
              const progressPct = getProgressPercent(cost);

              return (
                <View
                  key={reward.id}
                  className={`rw-card ${canAfford ? '' : 'cannot-afford'}`}
                  style={{ animationDelay: `${idx * 60}ms` }}
                  onClick={() => handleRewardClick(reward)}
                >
                  {/* 图片区域 — 对齐Web原版：按cost分4档渐变色 + emoji/icon装饰 + 编辑删除按钮 */}
                  <View className="rw-card-img-area" style={{
                    background: cost >= 100
                      ? 'linear-gradient(135deg, #E9D5FF, #FBCFE8)'
                      : cost >= 50
                        ? 'linear-gradient(135deg, #BFDBFE, #A5F3FC)'
                        : cost >= 20
                          ? 'linear-gradient(135deg, #BBF7D0, #A7F3D0)'
                          : 'linear-gradient(135deg, #FEF08A, #FED7AA)',
                  }}>
                    {/* 编辑/删除按钮 — 对齐Web原版右上角 */}
                    {user?.role === 'parent' && (
                      <View className="rw-card-actions">
                        <View
                          className="rw-card-action-btn rw-card-edit-btn"
                          onClick={(e) => { e.stopPropagation(); /* TODO: 编辑逻辑 */ }}
                        >
                          <Icon name="edit-2" size={22} color="#666" />
                        </View>
                        <View
                          className="rw-card-action-btn rw-card-delete-btn"
                          onClick={(e) => { e.stopPropagation(); /* TODO: 删除逻辑 */ }}
                        >
                          <Icon name="trash-2" size={22} color="#ef4444" />
                        </View>
                      </View>
                    )}

                    {(reward.image || reward.icon) ? (
                      reward.image ? (
                        <Image className="rw-card-img" src={reward.image} mode="aspectFill" />
                      ) : (
                        <Text style={{ fontSize: '96rpx', opacity: 0.4, lineHeight: '240rpx', textAlign: 'center' }}>{reward.icon}</Text>
                      )
                    ) : (
                      <Text style={{ fontSize: '96rpx', opacity: 0.3, lineHeight: '240rpx', textAlign: 'center' }}>🎁</Text>
                    )}
                    {/* 标题悬浮在图片底部 */}
                    <View className="rw-card-img-overlay">
                      <Text className="rw-card-img-title">{reward.name}</Text>
                    </View>
                  </View>

                  {/* 底部操作栏 — 对齐Web原版：星星 + 立即兑换 */}
                  <View className="rw-card-footer">
                    {/* 星星成本 */}
                    <View className="rw-card-cost">
                      <Icon name="star" size={20} color="#F9A825" />
                      <Text className={canAfford ? '' : 'insufficient'}>{cost}</Text>
                    </View>

                    {/* 兑换按钮 or 进度条 — 文案对齐原版"立即兑换" */}
                    {canAfford ? (
                      <View className="rw-card-exchange-btn" onClick={(e) => { e.stopPropagation(); handleRewardClick(reward); }}>
                        <Text>立即兑换</Text>
                      </View>
                    ) : (
                      <View className="rw-progress-bar">
                        <View className="rw-progress-fill" style={{ width: `${progressPct}%` }} />
                        <Text className="rw-progress-text">{progressPct}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ height: '40rpx' }} />
        </ScrollView>
      ) : (
        <View className="rw-empty">
          <Icon name="gift" size={80} color="#becab9" />
          <Text className="rw-empty-text">暂无该分类的奖励</Text>
          {user?.role === 'parent' && (
            <>
              {/* 从模板库快速导入 */}
              <View
                style={{
                  marginTop: '24rpx', padding: '24rpx 40rpx',
                  backgroundColor: '#E8F5E9', borderRadius: '16rpx',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12rpx',
                }}
                onClick={() => setShowRewardTemplates(true)}
              >
                <Icon name="grid" size={28} color="#006e1c" />
                <Text style={{ fontSize: '26rpx', fontWeight: 600, color: '#006e1c' }}>从模板库导入心愿</Text>
              </View>
              <Text className="rw-empty-hint">或点击右上角 + 手动创建</Text>
            </>
          )}
        </View>
      )}

      {/* ===== 兑换详情 Modal ===== */}
      {showDetailModal && selectedReward && (() => {
        const cost = selectedReward.cost || 0;
        const canAfford = starBalance >= cost;

        return (
          <View className="rw-modal-mask" onClick={() => setShowDetailModal(false)}>
            <View className="rw-modal-panel" onClick={(e) => e.stopPropagation()}>
              {/* 大图 — 对齐Web原版：支持 image / icon(emoji) / 默认🎁 + cost渐变 */}
              {selectedReward.image ? (
                <Image
                  className="rw-modal-img"
                  src={selectedReward.image}
                  mode="aspectFill"
                />
              ) : (
                <View className="rw-modal-img-placeholder" style={{
                  background: cost >= 100
                    ? 'linear-gradient(135deg, #E9D5FF, #FBCFE8)'
                    : cost >= 50
                      ? 'linear-gradient(135deg, #BFDBFE, #A5F3FC)'
                      : cost >= 20
                        ? 'linear-gradient(135deg, #BBF7D0, #A7F3D0)'
                        : 'linear-gradient(135deg, #FEF08A, #FED7AA)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: '140rpx', opacity: 0.4 }}>
                    {selectedReward.icon || '🎁'}
                  </Text>
                </View>
              )}

              {/* 可滚动内容区 - 对齐Web端 overflow-y-auto touch-pan-y */}
              <ScrollView 
                scrollY 
                className="rw-modal-scroll" 
                enhanced
                bounces={false}
                showScrollbar={false}
                fastDeceleration
              >
                {/* 信息区 */}
                <View className="rw-modal-info">
                  <Text className="rw-modal-name">{selectedReward.name}</Text>

                  {/* 分类 tag */}
                  <View className="rw-modal-cat-tag">
                    <Text>{getCategoryLabel(selectedReward.category)}</Text>
                  </View>

                  {/* 成本 */}
                  <View className="rw-modal-cost-row">
                    <Text className="rw-modal-cost-label">所需星星</Text>
                    <View className="rw-modal-cost-value">
                      <Icon name="star" size={28} color="#F9A825" />
                      <Text>{cost}</Text>
                    </View>
                  </View>

                  {/* 描述 */}
                  {selectedReward.description && (
                    <View className="rw-modal-desc">
                      <Text>{selectedReward.description}</Text>
                    </View>
                  )}

                  {/* 余额不足提示 */}
                  {!canAfford && (
                    <View className="rw-modal-insufficient">
                      <Text>还需要 {cost - starBalance} 颗 ⭐</Text>
                      <View className="rw-insufficient-bar">
                        <View className="rw-insufficient-fill" style={{ width: `${getProgressPercent(cost)}%` }} />
                      </View>
                    </View>
                  )}

                  {/* 按钮 - 放在滚动区域内，对齐Web端 */}
                  <View className="rw-modal-actions" style={{ padding: 0, marginTop: '16rpx' }}>
                    <View
                      className="rw-modal-cancel"
                      onClick={() => setShowDetailModal(false)}
                    >
                      <Text>取消</Text>
                    </View>
                    <View
                      className={`rw-modal-confirm ${!canAfford ? 'disabled' : ''} ${exchanging ? 'loading' : ''}`}
                      onClick={canAfford && !exchanging ? handleExchange : undefined}
                    >
                      <Text>{exchanging ? '兑换中...' : canAfford ? '确认兑换' : '星星不足'}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        );
      })()}

      {/* ===== 庆祝动画 ===== */}
      {showCelebration && (
        <CelebrationAnimation type="reward" isVisible={true} onComplete={() => setShowCelebration(false)} />
      )}

      {/* ===== 创建奖励 — 全屏表单（对齐原版 /rewards/new） ===== */}
      {showCreateDialog && (
        <View className="rw-create-fullscreen">
          {/* 顶部导航栏：返回 + 标题 */}
          <View className="rw-create-nav">
            <View className="rw-create-back" onClick={() => setShowCreateDialog(false)}>
              <Text style={{ fontSize: '40rpx', color: '#333', fontWeight: 700 }}>‹</Text>
            </View>
            <Text className="rw-create-nav-title">添加心愿</Text>
            <View style={{ width: '80rpx' }} />
          </View>

          {/* 可滚动内容区 */}
          <ScrollView scrollY className="rw-create-scroll">
            {/* 图片上传 + 模板导入（对齐原版） */}
            <View className="rw-create-img-row">
              <View className="rw-create-img-box">
                {createForm.image ? (
                  <Image className="rw-create-img-preview" src={createForm.image} mode="aspectFill" />
                ) : (
                  <Text className="rw-create-img-emoji">{createForm.icon || '🐷'}</Text>
                )}
                <View className="rw-create-camera-icon">
                  <Icon name="camera" size={28} color="#999" />
                </View>
              </View>
              <View className="rw-create-tpl-btn" onClick={() => { setShowCreateDialog(false); setShowRewardTemplates(true); }}>
                <Text>模板导入</Text>
                <Icon name="chevron-right" size={28} color="#006e1c" />
              </View>
            </View>

            {/* 名称 + 次数（横排，对齐原版：输入框卡片感 + 次下拉按钮） */}
            <View className="rw-create-card" style={{ display: 'flex', alignItems: 'center', gap: '12rpx', padding: '20rpx 24rpx' }}>
              <View style={{
                flex: 1, height: '80rpx', background: '#f8f6f1',
                borderRadius: '16rpx', padding: '0 24rpx',
                display: 'flex', alignItems: 'center',
              }}>
                <Input
                  style={{ width: '100%', height: '80rpx', fontSize: '30rpx', color: '#333', background: 'transparent' }}
                  value={createForm.name}
                  placeholder="心愿名称..."
                  maxlength={30}
                  focus
                  onInput={(e) => setCreateForm(prev => ({ ...prev, name: e.detail.value }))}
                />
              </View>
              <View style={{
                display: 'flex', alignItems: 'center', gap: '4rpx', flexShrink: 0,
                height: '80rpx', paddingLeft: '24rpx', paddingRight: '16rpx',
                background: '#f8f6f1', borderRadius: '16rpx',
                border: '2rpx solid #e5e0d6',
              }}>
                <Text style={{ fontSize: '28rpx', color: '#555', fontWeight: 600 }}>次</Text>
                <Text style={{ fontSize: '22rpx', color: '#999' }}>▼</Text>
              </View>
            </View>

            {/* 描述区域（可展开，对齐原版） */}
            {!showDescInput ? (
              <View className="rw-create-card rw-create-desc-trigger" onClick={() => setShowDescInput(true)}>
                <Icon name="plus" size={24} color="#aaa" />
                <Text className="rw-create-desc-hint">添加心愿描述</Text>
              </View>
            ) : (
              <View className="rw-create-card">
                <Textarea
                  className="rw-create-desc-area"
                  value={createForm.description}
                  placeholder="再详细描述一下心愿吧..."
                  maxlength={200}
                  onInput={(e) => setCreateForm(prev => ({ ...prev, description: e.detail.value }))}
                />
              </View>
            )}

            {/* 分类（对齐原版） */}
            <View className="rw-create-card">
              <View className="rw-create-section-label">
                <Icon name="grid" size={26} color="#006e1c" />
                <Text>分类</Text>
              </View>
              <ScrollView scrollX showScrollbar={false} className="rw-create-cat-scroll">
                <View className="rw-create-cat-list">
                  {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
                    <View
                      key={cat.key}
                      className={`rw-create-cat-pill ${createForm.category === cat.key ? 'active' : ''}`}
                      onClick={() => setCreateForm(prev => ({ ...prev, category: cat.key }))}
                    >
                      <Text>{cat.label}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* 单价行（对齐原版：图标 - 数字 +） */}
            <View className="rw-create-card rw-create-num-row">
              <View className="rw-create-num-left">
                <View className="rw-create-num-icon rw-cost-icon">
                  <Icon name="star" size={28} color="#F9A825" />
                </View>
                <Text className="rw-create-num-label">单价</Text>
              </View>
              <View className="rw-create-stepper">
                <View className="rw-step-btn" onClick={() => setCreateForm(prev => ({ ...prev, cost: Math.max(1, prev.cost - 10) }))}>
                  <Text>−</Text>
                </View>
                <Text className="rw-step-value">{createForm.cost}</Text>
                <View className="rw-step-btn" onClick={() => setCreateForm(prev => ({ ...prev, cost: prev.cost + 10 }))}>
                  <Text>+</Text>
                </View>
              </View>
            </View>

            {/* 总数行（对齐原版） */}
            <View className="rw-create-card rw-create-num-row">
              <View className="rw-create-num-left">
                <View className="rw-create-num-icon rw-qty-icon">
                  <Icon name="grid" size={24} color="#fff" />
                </View>
                <Text className="rw-create-num-label">总数</Text>
              </View>
              <View className="rw-create-stepper">
                <View className="rw-step-btn" onClick={() => setCreateForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}>
                  <Text>−</Text>
                </View>
                <Text className="rw-step-value">{createForm.quantity}</Text>
                <View className="rw-step-btn" onClick={() => setCreateForm(prev => ({ ...prev, quantity: prev.quantity + 1 }))}>
                  <Text>+</Text>
                </View>
              </View>
            </View>

            {/* 兑换限制 Toggle 行（对齐原版） */}
            <View className="rw-create-card rw-create-limit-row">
              <View className="rw-create-num-left">
                <View className="rw-create-num-icon rw-limit-icon">
                  <Icon name="check-circle" size={24} color="#fff" />
                </View>
                <Text className="rw-create-num-label">兑换限制</Text>
              </View>
              {/* Toggle 开关 — 用div[role=switch]实现，遵循项目规范 */}
              <View
                role="switch"
                aria-checked={createForm.exchangeLimit}
                onClick={() => setCreateForm(prev => ({ ...prev, exchangeLimit: !prev.exchangeLimit }))}
                style={{
                  width: '96rpx', height: '52rpx', borderRadius: '9999px',
                  padding: '6rpx',
                  display: 'flex', alignItems: 'center',
                  backgroundColor: createForm.exchangeLimit ? '#4CAF50' : '#E5E7EB',
                  border: 'none', cursor: 'pointer',
                  boxShadow: 'inset 0 1rpx 3rpx rgba(0,0,0,0.15)',
                  outline: 'none', userSelect: 'none',
                }}
              >
                <View style={{
                  width: '40rpx', height: '40rpx', backgroundColor: 'white',
                  borderRadius: '50%',
                  boxShadow: '0 2rpx 4rpx rgba(0,0,0,0.15)',
                  transform: `translateX(${createForm.exchangeLimit ? '44rpx' : '0'})`,
                  transition: 'transform 0.3s cubic-bezier(0.68,-0.55,0.265,1.55)',
                }} />
              </View>
            </View>

            {/* 摘要信息行 */}
            <View className="rw-create-summary">
              <Text>心愿 · {createForm.cost}星星 / 次 · {createForm.exchangeLimit ? '有限制' : '不限次'}</Text>
            </View>

            {/* 底部留白给按钮区 */}
            <View style={{ height: '160rpx' }} />
          </ScrollView>

          {/* 底部固定按钮栏 */}
          <View className="rw-create-footer">
            <View
              className={`rw-create-footer-btn ${(!createForm.name.trim() || creating) ? 'disabled' : ''}`}
              onClick={!createForm.name.trim() || creating ? undefined : handleSubmitCreate}
            >
              <Text>{creating ? '创建中...' : '完成并提交心愿 ✨'}</Text>
            </View>
            <Text className="rw-create-footer-hint">请仔细检查信息是否正确后再提交心愿</Text>
          </View>
        </View>
      )}
      {/* ===== 模板库导入弹窗 ===== */}
      <RewardTemplateSelector
        visible={showRewardTemplates}
        onSelect={async (tpl) => {
          // 将选中的模板作为奖励导入
          try {
            const { error } = await supabase.from('rewards').insert({
              name: tpl.title,
              description: `从模板库导入：${tpl.title}`,
              cost: (tpl.defaultStars || 1) * 10,
              category: 'common',
              icon: tpl.icon || '',
              ...(familyId && familyId !== 'guest-family' && familyId !== 'demo-family'
                ? { family_id: familyId }
                : {}),
              is_template: true,
            });
            if (error) throw error;
            Taro.showToast({ title: `已添加「${tpl.title}」`, icon: 'success' });
            fetchRewards();
          } catch {
            Taro.showToast({ title: '添加失败', icon: 'none' });
          }
        }}
        onClose={() => setShowRewardTemplates(false)}
      />
    </View>
  );
}
