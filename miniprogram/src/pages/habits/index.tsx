import { View, Text, Image, Input, ScrollView } from '@tarojs/components';
import { useState, useEffect, useMemo } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { resolveAvatarPath, TASK_CATEGORIES, getTaskTemplatesByCategory } from '@/lib/templates';
import type { TaskTemplate } from '@/lib/templates';
import Icon from '@/components/Icon';
import './index.scss';

interface Habit {
  id: string;
  title: string;
  description?: string;
  reward_stars: number;
  icon?: string;
  current_count?: number;
  target_count?: number;
  status?: string;
  assignee_ids?: string[];
}

export default function Habits() {
  useDidShow(() => {
    Taro.eventCenter.trigger('tabBarUpdate');
  });
  const [activeTab, setActiveTab] = useState<'reward' | 'penalty'>('reward');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState('');
  const [familyId, setFamilyId] = useState<string>('');
  const [starBalance, setStarBalance] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [isCheckInSuccess, setIsCheckInSuccess] = useState(false);

  // ========== 添加习惯 → 弹出模板选择底部弹窗 ==========
  const [showTemplateSheet, setShowTemplateSheet] = useState(false);
  const [tplActiveTab, setTplActiveTab] = useState(0);
  const [tplSearchQuery, setTplSearchQuery] = useState('');
  const handleAddHabit = () => {
    setShowTemplateSheet(true);
  };

  // 使用 templates.ts 中生活/独立/表扬/批评分类（排除学习、爱好）
  const tplCategories = useMemo(() =>
    TASK_CATEGORIES.filter(c => ['life', 'independent', 'praise', 'critique'].includes(c.id)),
  []);

  const tplFilteredTemplates = useMemo(() => {
    let list: TaskTemplate[] = [];
    if (tplSearchQuery.trim()) {
      // 搜索模式：跨所有显示分类搜索
      const q = tplSearchQuery.toLowerCase();
      list = getTaskTemplatesByCategory().filter(t =>
        t.title.includes(q) && ['life', 'independent', 'praise', 'critique'].includes(t.category)
      );
    } else {
      // 正常模式：按当前选中分类
      const cat = tplCategories[tplActiveTab];
      if (cat) list = getTaskTemplatesByCategory(cat.id);
    }
    return list;
  }, [tplActiveTab, tplSearchQuery]);

  useEffect(() => { initUser(); }, []);

  const initUser = async () => {
    try {
      const stored = Taro.getStorageSync('guest_user');
      if (stored) {
        try {
          const localUser = JSON.parse(stored);
          setUser(localUser);
          setUserId(localUser.id);
          setStarBalance(localUser.stars || 0);
          setUserRole(localUser.role || '');
          setFamilyId(localUser.family_id || '');
          // 尝试从云端获取真实数据，失败时才用本地兜底
          if (localUser.family_id && localUser.family_id !== 'guest-family' && localUser.family_id !== 'demo-family') {
            await fetchHabits(localUser.family_id, localUser.id, localUser.role || '');
          } else {
            setHabits([
              { id: 'demo-reward-1', title: '阅读30分钟', reward_stars: 3, icon: 'Book', current_count: 2, target_count: 5, status: 'pending' },
              { id: 'demo-reward-2', title: '整理房间', reward_stars: 2, icon: 'Sparkles', current_count: 1, target_count: 3, status: 'pending' },
              { id: 'demo-penalty-1', title: '玩手机超时', reward_stars: -2, icon: 'Clock', current_count: 1, target_count: 3, status: 'pending' },
            ]);
          }
          return;
        } catch {}
      }
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUserId(authUser.id);
        const { data } = await supabase
          .from('members')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (data) {
          setUser(data);
          setStarBalance(data?.stars || 0);
          setUserRole(data?.role || '');
          setFamilyId(data?.family_id || '');
          fetchHabits(data?.family_id || '', authUser.id, data?.role || '');
        }
      }
    } catch (err) {
      console.error('initUser error:', err);
    }
  };

  const fetchHabits = async (familyId: string, uid: string, role: string) => {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_habit', true);

      const { data } = await query;
      setHabits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchHabits error:', err);
      setHabits([]);
    }
  };

  const filteredHabits = (habits || []).filter(h =>
    activeTab === 'reward' ? (h.reward_stars || 0) > 0 : (h.reward_stars || 0) < 0
  );

  // ========== 添加/编辑/删除习惯 ==========

  const handleDeleteHabit = async () => {
    if (!selectedHabit) return;
    Taro.showModal({
      title: '确认删除',
      content: `确定要删除「${selectedHabit.title}」吗？此操作不可恢复。`,
      success: async (res) => {
        if (res.confirm) {
          try {
            const { error } = await supabase.from('tasks').delete().eq('id', selectedHabit.id);
            if (error) throw error;
            Taro.showToast({ title: '已删除', icon: 'success' });
            setShowDetail(false);
            setSelectedHabit(null);
            fetchHabits(familyId, userId || '', userRole);
          } catch (err: any) {
            Taro.showToast({ title: err.message || '删除失败', icon: 'none' });
          }
        }
      },
    });
  };

  // ========== 打卡 ==========
  const handleCheckIn = async (habit: Habit) => {
    if (userRole !== 'parent') {
      Taro.showToast({ title: '仅家长可打卡', icon: 'none' });
      return;
    }
    setIsCheckInSuccess(true);
    setTimeout(async () => {
      try {
        const newCount = (habit.current_count || 0) + 1;
        await supabase
          .from('tasks')
          .update({
            current_count: newCount,
            status: newCount >= (habit.target_count || 1) ? 'completed' : (habit.status || 'pending'),
          })
          .eq('id', habit.id);
        fetchHabits(familyId, userId || '', userRole);
        setShowDetail(false);
      } catch (err) {
        console.error('checkIn error:', err);
        Taro.showToast({ title: '打卡失败', icon: 'none' });
      }
      setIsCheckInSuccess(false);
    }, 1500);
  };

  // 简单表情映射
  const habitEmoji = (icon?: string): string => {
    const map: Record<string, string> = {
      BookOpen: '📚', Book: '📖', PenTool: '✏️', GraduationCap: '🎓',
      Dumbbell: '💪', Run: '🏃', Bike: '🚴', Swim: '🏊', Yoga: '🧘',
      Football: '⚽', Basketball: '🏀', Tennis: '🎾',
      Music: '🎵', Guitar: '🎸', Piano: '🎹', Brush: '🎨',
      ChefHat: '👨‍🍳', Utensils: '🍽️', Dance: '💃',
      Star: '⭐', Trophy: '🏆', Heart: '❤️', Medal: '🏅',
      AlertCircle: '⚠️', Clock: '⏰',
    };
    return map[icon || ''] || '⭐';
  };

  return (
    <View className="habits-page">
      {/* ===== 头部 ===== */}
      <View className="hp-header">
        <View className="hp-header-left">
          <View className="avatar-btn" onClick={() => Taro.switchTab({ url: '/pages/profile/index' })}>
            <Image className="avatar" src={resolveAvatarPath(user?.avatar || '')} />
          </View>
          <View className="voice-btn" onClick={() => Taro.switchTab({ url: '/pages/home/index' })}>
            <Icon name="microphone" size={40} color="#006e1c" />
          </View>
        </View>
        <View className="hp-header-right">
          <View className="hp-star-badge" onClick={() => Taro.navigateTo({ url: '/pages/check-in/index' })}>
            <Icon name="star" size={34} color="#F9A825" />
            <Text className="hp-star-text">{starBalance}</Text>
          </View>
          <View className="hp-notif-btn" onClick={() => Taro.navigateTo({ url: '/pages/settings/notifications/index' })}>
            <Icon name="bell" size={40} color="#3f4a3c" />
          </View>
        </View>
      </View>

      {/* ===== 奖励/惩罚 Tab 切换 ===== */}
      <View className="hp-tab-switcher">
        <View className="hp-tab-track">
          <View
            className={`hp-swtich-tab ${activeTab === 'reward' ? 'active reward' : ''}`}
            onClick={() => setActiveTab('reward')}
          >
            <Text>奖励</Text>
          </View>
          <View
            className={`hp-swtich-tab ${activeTab === 'penalty' ? 'active penalty' : ''}`}
            onClick={() => setActiveTab('penalty')}
          >
            <Text>惩罚</Text>
          </View>
        </View>
        <View className="hp-add-btn" onClick={handleAddHabit}>
          <Icon name="plusCircle" size={40} color="#ffffff" />
        </View>
      </View>

      {/* ===== 习惯列表 - 双列网格 ===== */}
      <View className="hp-grid">
        {filteredHabits.length > 0 ? (
          filteredHabits.map(habit => (
            <View
              key={habit.id}
              className={`hp-habit-card ${(habit.reward_stars || 0) >= 0 ? 'reward' : 'penalty'}`}
              onClick={() => { setSelectedHabit(habit); setShowDetail(true); }}
            >
              {/* 大号装饰图标 */}
              <View className="hp-habit-deco-icon">
                <Text>{habitEmoji(habit.icon)}</Text>
              </View>
              <View className="hp-habit-info">
                <Text className="hp-habit-name">{habit.title}</Text>
                <View className="hp-habit-stars">
                  <Icon name="star" size={24} color={(habit.reward_stars || 0) >= 0 ? '#F9A825' : '#e53935'} />
                  <Text className={`hp-habit-star-value ${(habit.reward_stars || 0) >= 0 ? 'reward' : 'penalty'}`}>
                    {(habit.reward_stars || 0) >= 0 ? '+' : ''}{habit.reward_stars}
                  </Text>
                </View>
                {/* DESIGN.md 3.5.1: 7天打卡状态条 */}
                <View className="hp-streak-dots">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const dayOffset = 6 - i; // 今天是第7个(最右)
                    const isToday = dayOffset === 0;
                    // 模拟：基于 current_count 和 target_count 推算完成情况
                    const completed = (habit.current_count || 0) > (6 - i);
                    return (
                      <View
                        key={i}
                        className={`hp-streak-dot ${completed ? 'done' : ''} ${isToday ? 'today' : ''}`}
                      />
                    );
                  })}
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className="hp-empty">
            <Icon name="trophy" size={80} color="#becab9" />
            <Text className="hp-empty-text">
              还没有{activeTab === 'reward' ? '积极习惯' : '消极习惯'}记录哦 🌱
            </Text>
          </View>
        )}
      </View>

      {/* ===== 详情弹窗 ===== */}
      {showDetail && selectedHabit && (
        <View className="hp-mask" onClick={() => { if (!isCheckInSuccess) setShowDetail(false); }}>
          <View className="hp-detail-sheet">
            {/* 大图标 */}
            <View className="hp-detail-icon-area">
              <Text className="hp-detail-big-emoji">{habitEmoji(selectedHabit.icon)}</Text>
            </View>
            <View className="hp-detail-body">
              <Text className="hp-detail-title">{selectedHabit.title}</Text>
              <Text className="hp-detail-desc">
                {selectedHabit.description || '保持良好的生活习惯，让每一天都充满活力和正能量。'}
              </Text>

              {/* 信息卡片 */}
              <View className="hp-detail-stats">
                <View className="hp-stat-card">
                  <Text className="hp-stat-label">
                    {(selectedHabit.reward_stars || 0) >= 0 ? '完成奖励' : '惩罚扣除'}
                  </Text>
                  <View className="hp-stat-value">
                    <Icon name="star" size={28} color="#F9A825" />
                    <Text className={`hp-stat-number ${(selectedHabit.reward_stars || 0) >= 0 ? 'reward' : 'penalty'}`}>
                      {Math.abs(selectedHabit.reward_stars || 0)}
                    </Text>
                  </View>
                </View>
                <View className="hp-stat-card full-width">
                  <View className="hp-stat-header">
                    <Text className="hp-stat-label">打卡进度</Text>
                    <Text className="hp-stat-count">{selectedHabit.current_count || 0} / {selectedHabit.target_count || 5}</Text>
                  </View>
                  <View className="hp-progress-bar-track">
                    <View
                      className="hp-progress-bar-fill"
                      style={{
                        width: `${Math.min(100, ((selectedHabit.current_count || 0) / (selectedHabit.target_count || 5)) * 100)}%`,
                        backgroundColor: (selectedHabit.current_count || 0) >= (selectedHabit.target_count || 5) ? '#006e1c' : '#F9A825',
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* 操作按钮 */}
              <View className="hp-detail-actions">
                <View className="hp-btn-back" onClick={() => setShowDetail(false)}>
                  <Text>返回</Text>
                </View>
                {userRole === 'parent' && (
                  <>
                    <View
                      className="hp-btn-delete"
                      onClick={handleDeleteHabit}
                    >
                      <Icon name="trash2" size={24} color="#e53935" />
                      <Text>删除</Text>
                    </View>
                    <View
                      className="hp-btn-checkin"
                      onClick={() => handleCheckIn(selectedHabit!)}
                    >
                      <Icon name="plus" size={28} color="#ffffff" />
                      <Text>打卡</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===== 打卡成功动画 ===== */}
      {isCheckInSuccess && (
        <View className="hp-celebration">
          <View className="hp-confetti-bg" />
          <View className="hp-celeb-content">
            <Text className="hp-celeb-emoji">🎉</Text>
            <Text className="hp-celeb-title">打卡成功！</Text>
            <Text className="hp-celeb-subtitle">太棒了，继续保持 🌱</Text>
          </View>
        </View>
      )}

      {/* ===== 习惯模板选择弹窗（对齐原版截图：4列网格 + 分类标签）===== */}
      {showTemplateSheet && (
        <View className="hp-tpl-mask" onClick={() => setShowTemplateSheet(false)}>
          <View className="hp-tpl-container" onClick={(e) => e.stopPropagation()}>
            {/* Header: 选择模板 + ✕ */}
            <View className="hp-tpl-header">
              <Text className="hp-tpl-title">选择模板</Text>
              <View className="hp-tpl-close" onClick={() => setShowTemplateSheet(false)}>
                <Icon name="x" size={40} color="#3f4a3c" />
              </View>
            </View>

            {/* 搜索行：搜索框 + 自定义添加 */}
            <View className="hp-tpl-search-row">
              <View className="hp-tpl-search-box">
                <Icon name="search" size={28} color="#bbb" />
                <Input
                  className="hp-tpl-search-input"
                  placeholder="搜索模板"
                  value={tplSearchQuery}
                  onInput={(e) => setTplSearchQuery(e.detail.value)}
                />
              </View>
              <View className="hp-tpl-custom-btn" onClick={() => {
                setShowTemplateSheet(false);
                Taro.navigateTo({
                  url: '/pages/tasks/create/index?mode=habit&custom=1',
                });
              }}>
                <Text className="hp-tpl-custom-text">自定义添加</Text>
              </View>
            </View>

            {/* 分类 Tabs: 生活 / 独立 / 表扬 / 批评 */}
            {!tplSearchQuery.trim() && (
              <ScrollView className="hp-tpl-tabs-scroll" scrollX>
                <View className="hp-tpl-tabs-wrap">
                  <View className="hp-tpl-tabs">
                    {tplCategories.map((cat, idx) => (
                      <View
                        key={cat.id}
                        className={`hp-tpl-tab ${tplActiveTab === idx ? 'active' : ''}`}
                        onClick={() => setTplActiveTab(idx)}
                      >
                        <Text className="hp-tpl-tab-label">{cat.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* 4列网格 */}
            <ScrollView className="hp-tpl-grid-scroll" scrollY>
              <View className="hp-tpl-grid-wrap">
              <View className="hp-tpl-grid">
                {tplFilteredTemplates.map(tpl => (
                  <View
                    key={tpl.id}
                    className="hp-tpl-card"
                    onClick={() => {
                      setShowTemplateSheet(false);
                      Taro.navigateTo({
                        url: `/pages/tasks/create/index?mode=habit&title=${encodeURIComponent(tpl.title)}&stars=${tpl.defaultStars}`,
                      });
                    }}
                  >
                    <View className="hp-tpl-icon-area">
                      <Image
                        className="hp-tpl-icon-img"
                        src={tpl.icon}
                        mode="aspectFit"
                        onError={() => {
                          // 标记加载失败，下次渲染会走 fallback
                          (tpl as any).__imgError = true;
                        }}
                      />
                      {/* 图片加载失败时覆盖显示 emoji */}
                      {(tpl as any).__imgError && (
                        <Text className="hp-tpl-icon-emoji-fallback">📋</Text>
                      )}
                    </View>
                    <Text className="hp-tpl-name">{tpl.title}</Text>
                    <View className="hp-tpl-stars">
                      <Icon name="star" size={18} color="#F9A825" />
                      <Text className="hp-tpl-stars-num">+{(tpl.defaultStars * 10)}</Text>
                    </View>
                  </View>
                ))}
              </View>
              </View>
              {tplFilteredTemplates.length === 0 && (
                <View className="hp-tpl-empty">
                  <Icon name="searchX" size={64} color="#ccc" />
                  <Text className="hp-tpl-empty-text">未找到相关模板</Text>
                </View>
              )}
            </ScrollView>

            <View style={{ height: 'env(safe-area-inset-bottom)' }} />
          </View>
        </View>
      )}
    </View>
  );
}
