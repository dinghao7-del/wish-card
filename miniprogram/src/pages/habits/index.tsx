import { View, Text, Image, Input, ScrollView, Textarea } from '@tarojs/components';
import { useState, useEffect, useMemo } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { resolveAvatarPath, TASK_CATEGORIES, getTaskTemplatesByCategory } from '@/lib/templates';
import type { TaskTemplate } from '@/lib/templates';
import { getHabitSelectableChildIds, resolveHabitTargetChildId } from '@/lib/habitTargeting';
import Icon from '@/components/Icon';
import './index.scss';

interface Habit {
  id: string;
  title: string;
  description?: string;
  type?: string;
  reward_stars: number;
  star_amount?: number;
  icon?: string;
  current_count?: number;
  target_count?: number;
  status?: string;
  is_habit?: boolean;
  assignee_ids?: string[];
  creator_id?: string;
}

interface Member {
  id: string;
  name: string;
  role: 'parent' | 'child';
  stars: number;
}

const HABIT_REVIEW_MARKER = '奖惩来源ID:';
const PARENT_FEEDBACK_MARKER = '亲子反馈卡';

function habitReviewMarker(habitId: string) {
  return `${HABIT_REVIEW_MARKER}${habitId}`;
}

export default function Habits() {
  useDidShow(() => {
    Taro.eventCenter.trigger('tabBarUpdate');
  });
  const [activeTab, setActiveTab] = useState<'reward' | 'penalty' | 'feedback'>('reward');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState('');
  const [familyId, setFamilyId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [feedbackTitle, setFeedbackTitle] = useState('希望你多听我说');
  const [feedbackDetail, setFeedbackDetail] = useState('');
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
          if (localUser.family_id) await fetchMembers(localUser.family_id);
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
          fetchMembers(data?.family_id || '');
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
        .eq('family_id', familyId);

      const { data } = await query;
      setHabits(Array.isArray(data) ? data.map((item: any) => ({
        ...item,
        reward_stars: item.reward_stars ?? item.star_amount ?? 0,
      })) : []);
    } catch (err) {
      console.error('fetchHabits error:', err);
      setHabits([]);
    }
  };

  const fetchMembers = async (fid: string) => {
    try {
      const { data } = await supabase
        .from('members')
        .select('id,name,role,stars')
        .eq('family_id', fid)
        .eq('is_active', true);
      const nextMembers = Array.isArray(data) ? data as Member[] : [];
      setMembers(nextMembers);
      const firstChild = nextMembers.find(m => m.role === 'child');
      if (firstChild && !selectedChildId) setSelectedChildId(firstChild.id);
    } catch (err) {
      console.error('fetchMembers error:', err);
    }
  };

  const visibleHabits = (habits || []).filter(h => h.is_habit !== false);
  const filteredHabits = visibleHabits.filter(h =>
    activeTab === 'reward' ? (h.reward_stars || h.star_amount || 0) > 0 : (h.reward_stars || h.star_amount || 0) < 0
  );
  const childMembers = members.filter(m => m.role === 'child');
  const parentMembers = members.filter(m => m.role === 'parent');
  const feedbackTasks = habits.filter(h =>
    h.type === 'parent_feedback'
    || h.description?.includes(PARENT_FEEDBACK_MARKER)
  );
  const visibleFeedbackTasks = feedbackTasks.filter(task =>
    userRole === 'parent'
      ? task.assignee_ids?.includes(userId || '') && task.status !== 'completed'
      : task.creator_id === userId
  );

  useEffect(() => {
    if (selectedParentId || userRole !== 'child') return;
    const firstParent = parentMembers[0];
    if (firstParent) setSelectedParentId(firstParent.id);
  }, [parentMembers, selectedParentId, userRole]);

  useEffect(() => {
    if (!selectedHabit || userRole !== 'parent') return;
    setSelectedChildId(resolveHabitTargetChildId(selectedHabit, childMembers, selectedChildId));
  }, [childMembers, selectedChildId, selectedHabit, userRole]);

  const pendingReviewsForHabit = (habitId: string) =>
    habits.filter(h => h.status === 'reviewing' && h.description?.includes(habitReviewMarker(habitId)));

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
    const targetMemberId = userRole === 'parent'
      ? resolveHabitTargetChildId(habit, childMembers, selectedChildId)
      : userId || '';
    if (!targetMemberId) {
      Taro.showToast({ title: '请选择孩子', icon: 'none' });
      return;
    }
    if (userRole !== 'parent') {
      await submitHabitReview(habit, targetMemberId);
      return;
    }
    setIsCheckInSuccess(true);
    setTimeout(async () => {
      try {
        await applyHabitStars(habit, targetMemberId);
        fetchHabits(familyId, userId || '', userRole);
        fetchMembers(familyId);
        setShowDetail(false);
      } catch (err) {
        console.error('checkIn error:', err);
        Taro.showToast({ title: '打卡失败', icon: 'none' });
      }
      setIsCheckInSuccess(false);
    }, 1500);
  };

  const submitHabitReview = async (habit: Habit, targetMemberId: string) => {
    const hasPending = pendingReviewsForHabit(habit.id).some(task => task.assignee_ids?.includes(targetMemberId));
    if (hasPending) {
      Taro.showToast({ title: '已提交，等待家长审核', icon: 'none' });
      return;
    }
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('tasks').insert({
        family_id: familyId,
        title: `${(habit.reward_stars || 0) < 0 ? '扣分待审核' : '打卡待审核'}：${habit.title}`,
        description: [habit.description || '', habitReviewMarker(habit.id)].filter(Boolean).join('\n'),
        star_amount: habit.reward_stars || 0,
        assignee_ids: [targetMemberId],
        creator_id: userId,
        status: 'reviewing',
        is_habit: false,
        target_count: 1,
        current_count: 0,
        icon: habit.icon || 'Star',
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      Taro.showToast({ title: '已提交给家长审核', icon: 'success' });
      setShowDetail(false);
      fetchHabits(familyId, userId || '', userRole);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  };

  const applyHabitStars = async (habit: Habit, targetMemberId: string) => {
    const newCount = (habit.current_count || 0) + 1;
    const nextStatus = newCount >= (habit.target_count || 1) ? 'completed' : (habit.status || 'pending');
    const member = members.find(m => m.id === targetMemberId);
    const amount = habit.reward_stars || 0;
    await supabase
      .from('tasks')
      .update({ current_count: newCount, status: nextStatus })
      .eq('id', habit.id);
    if (member) {
      await supabase
        .from('members')
        .update({ stars: (member.stars || 0) + amount })
        .eq('id', targetMemberId);
    }
    await supabase.from('star_transactions').insert({
      family_id: familyId,
      member_id: targetMemberId,
      amount,
      type: amount > 0 ? 'earn' : 'spend',
      reason: `${amount < 0 ? '奖惩扣分' : '奖惩打卡'}: ${habit.title}`,
      related_habit_id: habit.id,
    });
  };

  const approveHabitReview = async (reviewTask: Habit) => {
    const sourceId = reviewTask.description?.match(/奖惩来源ID:([^\s\n]+)/)?.[1];
    const sourceHabit = habits.find(h => h.id === sourceId);
    const targetMemberId = reviewTask.assignee_ids?.[0];
    if (!sourceHabit || !targetMemberId) return;
    try {
      await applyHabitStars(sourceHabit, targetMemberId);
      await supabase.from('tasks').update({ status: 'completed' }).eq('id', reviewTask.id);
      Taro.showToast({ title: '审核通过', icon: 'success' });
      fetchHabits(familyId, userId || '', userRole);
      fetchMembers(familyId);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '审核失败', icon: 'none' });
    }
  };

  const buildParentFeedbackTask = (): Habit | null => {
    if (!selectedParentId || !feedbackTitle.trim() || !userId) return null;
    return {
      id: `parent-feedback-${userId}-${selectedParentId}-${Date.now()}`,
      title: `亲子反馈：${feedbackTitle.trim()}`,
      description: [
        PARENT_FEEDBACK_MARKER,
        `孩子:${user?.name || '孩子'}`,
        feedbackDetail.trim(),
      ].filter(Boolean).join('\n'),
      type: 'parent_feedback',
      reward_stars: 0,
      star_amount: 0,
      icon: 'Heart',
      current_count: 0,
      target_count: 1,
      status: 'reviewing',
      is_habit: false,
      assignee_ids: [selectedParentId],
      creator_id: userId,
    };
  };

  const submitParentFeedback = async () => {
    if (userRole !== 'child') return;
    const feedbackTask = buildParentFeedbackTask();
    if (!feedbackTask) {
      Taro.showToast({ title: '请选择家长并填写反馈', icon: 'none' });
      return;
    }
    const now = new Date().toISOString();
    if (!familyId || familyId === 'guest-family' || familyId === 'demo-family') {
      setHabits(prev => [feedbackTask, ...prev]);
      setFeedbackTitle('希望你多听我说');
      setFeedbackDetail('');
      Taro.showToast({ title: '反馈卡已发送', icon: 'success' });
      return;
    }
    try {
      const { error } = await supabase.from('tasks').insert({
        family_id: familyId,
        title: feedbackTask.title,
        description: feedbackTask.description || '',
        type: feedbackTask.type,
        star_amount: 0,
        assignee_ids: feedbackTask.assignee_ids,
        creator_id: feedbackTask.creator_id,
        status: 'reviewing',
        is_habit: false,
        target_count: 1,
        current_count: 0,
        icon: 'Heart',
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
      setFeedbackTitle('希望你多听我说');
      setFeedbackDetail('');
      Taro.showToast({ title: '反馈卡已发送', icon: 'success' });
      fetchHabits(familyId, userId || '', userRole);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '发送失败', icon: 'none' });
    }
  };

  const respondParentFeedback = async (feedbackTask: Habit, mode: 'acknowledge' | 'promise') => {
    if (userRole !== 'parent' || !userId) return;
    const cleanTitle = feedbackTask.title.replace(/^亲子反馈：/, '');
    const now = new Date().toISOString();
    const promiseTask: Habit = {
      id: `parent-promise-${feedbackTask.id}-${Date.now()}`,
      title: `家长承诺：回应「${cleanTitle}」`,
      description: ['这是一条由孩子反馈生成的家长承诺任务。', feedbackTask.description || ''].join('\n'),
      type: 'parent_promise',
      reward_stars: 0,
      star_amount: 0,
      icon: 'HeartHandshake',
      current_count: 0,
      target_count: 1,
      status: 'pending',
      is_habit: false,
      assignee_ids: [userId],
      creator_id: feedbackTask.creator_id || userId,
    };

    if (!familyId || familyId === 'guest-family' || familyId === 'demo-family') {
      setHabits(prev => [
        ...(mode === 'promise' ? [promiseTask] : []),
        ...prev.map(task => task.id === feedbackTask.id ? { ...task, status: 'completed' } : task),
      ]);
      Taro.showToast({ title: mode === 'promise' ? '已生成承诺任务' : '已回应反馈', icon: 'success' });
      return;
    }

    try {
      await supabase.from('tasks').update({ status: 'completed', updated_at: now }).eq('id', feedbackTask.id);
      if (mode === 'promise') {
        const { error } = await supabase.from('tasks').insert({
          family_id: familyId,
          title: promiseTask.title,
          description: promiseTask.description || '',
          type: promiseTask.type,
          star_amount: 0,
          assignee_ids: promiseTask.assignee_ids,
          creator_id: promiseTask.creator_id,
          status: 'pending',
          is_habit: false,
          target_count: 1,
          current_count: 0,
          icon: 'HeartHandshake',
          created_at: now,
          updated_at: now,
        });
        if (error) throw error;
      }
      Taro.showToast({ title: mode === 'promise' ? '已生成承诺任务' : '已回应反馈', icon: 'success' });
      fetchHabits(familyId, userId || '', userRole);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '回应失败', icon: 'none' });
    }
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
          <View
            className={`hp-swtich-tab ${activeTab === 'feedback' ? 'active feedback' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <Text>反馈</Text>
          </View>
        </View>
        {activeTab !== 'feedback' && (
          <View className="hp-add-btn" onClick={handleAddHabit}>
            <Icon name="plusCircle" size={40} color="#ffffff" />
          </View>
        )}
      </View>

      {/* ===== 习惯列表 - 双列网格 ===== */}
      {activeTab === 'feedback' ? (
        <View className="hp-feedback-list">
          {userRole === 'child' && (
            <View className="hp-feedback-card">
              <View className="hp-feedback-head">
                <View className="hp-feedback-icon">
                  <Text>💬</Text>
                </View>
                <View>
                  <Text className="hp-feedback-title">给爸爸妈妈一张反馈卡</Text>
                  <Text className="hp-feedback-subtitle">说出感受，让家人更懂你</Text>
                </View>
              </View>
              <View className="hp-parent-chips">
                {parentMembers.map(parent => (
                  <View
                    key={parent.id}
                    className={`hp-parent-chip ${selectedParentId === parent.id ? 'active' : ''}`}
                    onClick={() => setSelectedParentId(parent.id)}
                  >
                    <Text>{parent.name}</Text>
                  </View>
                ))}
              </View>
              <View className="hp-feedback-options">
                {['希望你多听我说', '答应我的事没有兑现', '今天我觉得被忽视了', '谢谢你陪我完成一件事'].map(item => (
                  <View
                    key={item}
                    className={`hp-feedback-option ${feedbackTitle === item ? 'active' : ''}`}
                    onClick={() => setFeedbackTitle(item)}
                  >
                    <Text>{item}</Text>
                  </View>
                ))}
              </View>
              <Textarea
                className="hp-feedback-textarea"
                value={feedbackDetail}
                placeholder="也可以补充一句你真正想说的话"
                onInput={(event) => setFeedbackDetail(event.detail.value)}
              />
              <View className="hp-feedback-submit" onClick={submitParentFeedback}>
                <Text>发送给家长</Text>
              </View>
            </View>
          )}

          {visibleFeedbackTasks.length > 0 ? visibleFeedbackTasks.map(task => {
            const child = members.find(member => member.id === task.creator_id);
            return (
              <View key={task.id} className="hp-feedback-item">
                <View className="hp-feedback-item-head">
                  <Text className="hp-feedback-item-icon">🤝</Text>
                  <View className="hp-feedback-item-copy">
                    <Text className="hp-feedback-item-title">{task.title.replace('亲子反馈：', '')}</Text>
                    <Text className="hp-feedback-item-desc">{(task.description || '').replace('亲子反馈卡\n', '')}</Text>
                    <Text className="hp-feedback-item-meta">{child?.name || '孩子'} 的反馈 · {task.status === 'completed' ? '已回应' : '待回应'}</Text>
                  </View>
                </View>
                {userRole === 'parent' && task.status !== 'completed' && (
                  <View className="hp-feedback-actions">
                    <View className="hp-feedback-secondary" onClick={() => respondParentFeedback(task, 'acknowledge')}>
                      <Text>已认真看见</Text>
                    </View>
                    <View className="hp-feedback-primary" onClick={() => respondParentFeedback(task, 'promise')}>
                      <Text>生成承诺任务</Text>
                    </View>
                  </View>
                )}
              </View>
            );
          }) : (
            <View className="hp-empty">
              <Icon name="heart" size={80} color="#becab9" />
              <Text className="hp-empty-text">{userRole === 'parent' ? '还没有待回应的亲子反馈' : '还没有发出反馈卡'}</Text>
            </View>
          )}
        </View>
      ) : (
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
      )}

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

              {userRole === 'parent' && childMembers.length > 0 && (
                <View style={{ width: '100%', marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: 800, color: '#64715f' }}>指定孩子</Text>
                  <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {childMembers
                      .filter(child => getHabitSelectableChildIds(selectedHabit, childMembers).includes(child.id))
                      .map(child => (
                        <View
                          key={child.id}
                          onClick={() => setSelectedChildId(child.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: 14,
                            background: selectedChildId === child.id ? '#006e1c' : '#eef3eb',
                            color: selectedChildId === child.id ? '#fff' : '#1c211b',
                            fontWeight: 800,
                          }}
                        >
                          <Text>{child.name} · {child.stars}</Text>
                        </View>
                      ))}
                  </View>
                </View>
              )}

              {pendingReviewsForHabit(selectedHabit.id).length > 0 && (
                <View style={{ width: '100%', marginBottom: 16, padding: 12, borderRadius: 16, background: '#fff6d8' }}>
                  <Text style={{ fontSize: 12, fontWeight: 900, color: '#8a5a00' }}>待家长审核</Text>
                  {pendingReviewsForHabit(selectedHabit.id).map(reviewTask => {
                    const child = members.find(member => reviewTask.assignee_ids?.includes(member.id));
                    return (
                      <View key={reviewTask.id} style={{ marginTop: 8, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: 700 }}>{child?.name || '孩子'} 已提交</Text>
                        {userRole === 'parent' && (
                          <View
                            onClick={() => approveHabitReview(reviewTask)}
                            style={{ padding: '6px 12px', borderRadius: 999, background: '#006e1c', color: '#fff' }}
                          >
                            <Text style={{ color: '#fff', fontWeight: 800 }}>通过</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* 操作按钮 */}
              <View className="hp-detail-actions">
                <View className="hp-btn-back" onClick={() => setShowDetail(false)}>
                  <Text>返回</Text>
                </View>
                {userRole === 'parent' && (
                  <View
                    className="hp-btn-delete"
                    onClick={handleDeleteHabit}
                  >
                    <Icon name="trash2" size={24} color="#e53935" />
                    <Text>删除</Text>
                  </View>
                )}
                <View
                  className="hp-btn-checkin"
                  onClick={() => handleCheckIn(selectedHabit!)}
                >
                  <Icon name="plus" size={28} color="#ffffff" />
                  <Text>
                    {userRole === 'parent'
                      ? ((selectedHabit.reward_stars || 0) < 0 ? '扣分' : '打卡')
                      : pendingReviewsForHabit(selectedHabit.id).some(task => task.assignee_ids?.includes(userId || ''))
                        ? '待审核'
                        : ((selectedHabit.reward_stars || 0) < 0 ? '提交扣分' : '提交打卡')}
                  </Text>
                </View>
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
