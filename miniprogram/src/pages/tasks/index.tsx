import { View, Text, Image, ScrollView } from '@tarojs/components';
import { useState, useEffect, useMemo } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { getLocalUser } from '@/utils/localUser';
import { resolveIconPath, resolveAvatarPath } from '@/lib/templates';
import { isGuestMode, getGuestData, updateGuestData } from '@/lib/guestData';
import { MINI_UI_COLORS } from '@/utils/uiTokens';
import Icon from '@/components/Icon';
import VoiceAssistant from '@/components/VoiceAssistant';
import { NotificationBell } from '@/components/NotificationCenter';
import './index.scss';

type ViewMode = 'list' | 'calendar';
type TaskStatus = 'pending' | 'reviewing' | 'completed';

interface TaskItem {
  id: string; title: string; description?: string; start_time: string;
  status: TaskStatus; reward_stars: number; star_amount?: number; icon?: string; family_id?: string;
  assignee_id?: string; assignee_ids?: string[]; creator_id?: string; is_habit?: boolean;
  type?: string; reminder_time?: string; end_time?: string; deadline?: string; assignee_name?: string;
}

export default function Tasks() {
  useDidShow(() => Taro.eventCenter.trigger('tabBarUpdate'));

  // DESIGN.md 3.3.1: "任务页采用月视图日历为主界面"
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'completed'>('all');
  const [user, setUser] = useState<any>(null);
  const [familyId, setFamilyId] = useState('');
  const [userId, setUserId] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  // 日历状态
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 任务详情
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { fetchUser(); }, []);

  const fetchUser = async () => {
    const localUser = getLocalUser();
    if (localUser) {
      setUser(localUser); setUserId(localUser.id); setFamilyId(localUser.family_id || '');
      setMembers([
        { id: '1', name: '妈妈', role: 'parent' }, { id: '2', name: '爸爸', role: 'parent' }, { id: '3', name: '宝宝', role: 'child' },
      ]);
      fetchTasksData(localUser.family_id || '');
      return;
    }
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUserId(authUser.id);
        const { data: profile } = await supabase.from('members').select('*').eq('id', authUser.id).single();
        if (profile) {
          setUser(profile); setFamilyId(profile.family_id);
          const { data: fam } = await supabase.from('members').select('id, name, role, avatar').eq('family_id', profile.family_id);
          setMembers(fam || []);
          fetchTasksData(profile.family_id);
        }
      }
    } catch {}
  };

  const fetchTasksData = async (fid: string) => {
    // 游客模式：加载本地演示数据
    if (!fid || fid === 'guest-family' || fid === 'demo-family' || isGuestMode()) {
      console.log('[Tasks] 游客模式：加载演示任务数据');
      const guestData = getGuestData();
      setTasks(guestData.tasks || []);
      // 同时设置家庭成员（用于显示执行人）
      if (guestData.members && guestData.members.length > 0) {
        setMembers(guestData.members);
      }
      return;
    }
    try {
      const { data } = await supabase.from('tasks').select('*').eq('family_id', fid).order('start_time', { ascending: false });
      // 修复数据库中的旧格式图标路径
      const fixed = (data || []).map((t: any) => ({ ...t, icon: resolveIconPath(t.icon) }));
      setTasks(fixed);
    } catch { setTasks([]); }
  };

  // ===== 三态流转：pending → reviewing → completed =====
  // 孩子打卡提交审核
  const submitForReview = async (taskId: string) => {
    // 游客模式：本地模拟状态变更
    if (isGuestMode()) {
      updateGuestData((draft) => {
        draft.tasks = (draft.tasks || []).map((task: any) =>
          task.id === taskId ? { ...task, status: 'reviewing' } : task
        );
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'reviewing' as TaskStatus } : t));
      Taro.showToast({ title: '已提交审核（演示）', icon: 'success' });
      return;
    }
    try {
      const { error } = await supabase.from('tasks').update({ status: 'reviewing' }).eq('id', taskId);
      if (error) throw error;
      Taro.showToast({ title: '已提交审核', icon: 'success' });
      fetchTasksData(familyId);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '提交失败', icon: 'none' });
    }
  };

  // 家长审核通过
  const approveTask = async (taskId: string) => {
    // 游客模式：本地模拟
    if (isGuestMode()) {
      const approvedTask = tasks.find(t => t.id === taskId);
      const rewardAmount = approvedTask ? Math.abs(approvedTask.star_amount ?? approvedTask.reward_stars ?? 0) : 0;
      const assigneeIds = approvedTask?.assignee_ids?.length
        ? approvedTask.assignee_ids
        : approvedTask?.assignee_id
          ? [approvedTask.assignee_id]
          : [];
      const nextData = updateGuestData((draft) => {
        draft.tasks = (draft.tasks || []).map((task: any) =>
          task.id === taskId ? { ...task, status: 'completed' } : task
        );
        if (rewardAmount > 0 && assigneeIds.length > 0) {
          draft.members = (draft.members || []).map((member: any) =>
            assigneeIds.includes(member.id) ? { ...member, stars: (member.stars || 0) + rewardAmount } : member
          );
          draft.history = [
            ...assigneeIds.map((memberId: string) => ({
              id: `guest-task-approved-${taskId}-${memberId}-${Date.now()}`,
              user_id: memberId,
              title: `完成任务: ${approvedTask?.title || '任务'}`,
              type: 'task',
              stars: rewardAmount,
              timestamp: new Date().toISOString(),
              icon: 'CheckCircle',
            })),
            ...(draft.history || []),
          ];
        }
      });
      setTasks(nextData.tasks || []);
      setMembers(nextData.members || members);
      Taro.showToast({ title: '审核通过！（演示）', icon: 'success' });
      setShowDetail(false);
      return;
    }
    try {
      const { error } = await supabase.from('tasks').update({ status: 'completed' }).eq('id', taskId);
      if (error) throw error;
      Taro.showToast({ title: '审核通过，星星已发放', icon: 'success' });
      setShowDetail(false);
      fetchTasksData(familyId);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  };

  // 驳回审核（退回 pending）
  const rejectTask = async (taskId: string) => {
    // 游客模式：本地模拟
    if (isGuestMode()) {
      updateGuestData((draft) => {
        draft.tasks = (draft.tasks || []).map((task: any) =>
          task.id === taskId ? { ...task, status: 'pending' } : task
        );
      });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'pending' as TaskStatus } : t));
      Taro.showToast({ title: '已退回（演示）', icon: 'none' });
      return;
    }
    try {
      const { error } = await supabase.from('tasks').update({ status: 'pending' }).eq('id', taskId);
      if (error) throw error;
      Taro.showToast({ title: '已退回待完成', icon: 'none' });
      fetchTasksData(familyId);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  };

  // 兼容旧接口：根据当前状态和用户角色自动选择操作
  const handleTaskAction = (taskId: string, currentStatus: TaskStatus) => {
    const isParent = user?.role === 'parent';
    if (currentStatus === 'pending') {
      // 孩子打卡 → 提交审核
      submitForReview(taskId);
    } else if (currentStatus === 'reviewing') {
      if (isParent) {
        // 家长 → 审核通过
        approveTask(taskId);
      }
    } else if (currentStatus === 'completed') {
      // 已完成可回退（仅管理员）
      if (isParent) {
        if (isGuestMode()) {
          updateGuestData((draft) => {
            draft.tasks = (draft.tasks || []).map((task: any) =>
              task.id === taskId ? { ...task, status: 'pending' } : task
            );
          });
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'pending' as TaskStatus } : t));
          return;
        }
        supabase.from('tasks').update({ status: 'pending' }).eq('id', taskId).then(() => fetchTasksData(familyId));
      }
    }
  };

  // 列表筛选
  const filteredListTasks = useMemo(() => {
    const taskList = tasks || [];
    let list = taskList.filter(t => !t.is_habit);
    if (filter === 'pending') list = list.filter(t => t.status === 'pending');
    if (filter === 'reviewing') list = list.filter(t => t.status === 'reviewing');
    if (filter === 'completed') list = list.filter(t => t.status === 'completed');
    return list.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [tasks, filter]);

  // 日历数据
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  }, [currentMonth]);

  const dayTasks = useMemo(() => {
    return (tasks || []).filter(t => {
      const d = new Date(t.start_time);
      return d.getFullYear() === selectedDate.getFullYear() &&
             d.getMonth() === selectedDate.getMonth() &&
             d.getDate() === selectedDate.getDate();
    });
  }, [tasks, selectedDate]);

  const hasTaskOnDay = (date: Date) => (tasks || []).some(t => {
    const d = new Date(t.start_time);
    return d.getFullYear() === date.getFullYear() &&
           d.getMonth() === date.getMonth() &&
           d.getDate() === date.getDate();
  });

  const isToday = (date: Date) => {
    const t = new Date();
    return date.getFullYear() === t.getFullYear() &&
           date.getMonth() === t.getMonth() &&
           date.getDate() === t.getDate();
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // 任务详情 - 成员完成状态
  const getAssigneeStatus = (task: TaskItem) => {
    return (task.assignee_ids || []).map(id => ({
      member: members.find(m => m.id === id),
      completed: task.status === 'completed',
    }));
  };

  // 任务类型 → emoji 映射（对齐 Web 版 getTaskIcon 的回退逻辑）
  const TASK_TYPE_EMOJI: Record<string, string> = {
    // study 学习类
    'homework': '✏️', 'doing_homework': '✏️', 'math': '🔢', 'icon_of_math': '🔢',
    'writing': '📝', 'essay': '📝', 'writing_essay': '📝',
    'english': '🔤', 'english_learning': '🔤', 'memorizing_english': '🧠',
    'read': '📖', 'reading': '📖', 'icon_of_reading': '📖',
    'recite': '📜', 'reciting_ancient': '📜',
    'calligraphy': '✍️', 'dictation': '🎤',
    'mental_arithmetic': '🧮', 'mental_arithm': '🧮',
    'science': '🔬', 'science_experiment': '🔬',
    'chinese': '📕',
    // life 生活类
    'sports': '🏃', 'sports_running': '🏃', 'sports_runn': '🏃', 'sports_exercise': '🏋️', 'sports_exerci': '🏋️',
    'jump': '⬆️', 'jump_rope': '🤸', 'rope': '🤸',
    'run': '🏃', 'wake': '☀️', 'waking_up': '☀️', 'waking_up_ea': '☀️',
    'brushing_teeth': '🪥', 'brush': '🪥',
    'drink_milk': '🥛', 'drinking_milk': '🥛', 'milk': '🥛',
    'drinking_water': '💧', 'water': '💧',
    'eating_fresh': '🥗', 'eating_fresh_fruit': '🍎', 'eat': '🥗',
    'eating_vegetable': '🥬', 'vegetable': '🥬',
    'eating_eggs': '🥚', 'egg': '🥚',
    'taking_afternoon_nap': '😴', 'nap': '😴', 'sleep': '😴',
    'washing_face': '🧼', 'wash': '🛁', 'face': '😊',
    // independent 独立类
    'checking_homework': '📋', 'check': '📋', 'organizing_toys': '🧸', 'toy': '🧸',
    'eating_meals': '🍽️', 'meal': '🍽️',
    'getting_dressed': '👕', 'dressed': '👕',
    'going_to_school': '🏫', 'school': '🎒',
    'going_to_sleep': '🌙', 'mouth_rinsing': '👄', 'rinse': '👄',
    'packing_schoolbag': '🎒', 'pack': '🎒', 'schoolbag': '🎒',
    // hobby 爱好类
    'piano_playing': '🎹', 'piano': '🎹',
    'arts_and_crafts': '🎨', 'craft': '🎨', 'art': '🎨',
    'coding_programming': '💻', 'coding': '💻', 'program': '💻',
    'painting_drawing': '🖼️', 'painting': '🖼️', 'draw': '🎨',
    'riding_bicycle': '🚲', 'bike': '🚲',
    'playing_ball': '⚽', 'ball': '⚽',
    'music': '🎵', 'violin': '🎻', 'dance': '💃', 'swim': '🏊',
    // praise / critique 表扬/批评类（一般不在任务图标中使用）
    'teach': '🏆', 'praise': '⭐',
    'stay_up_late': '📱', 'phone': '📱', 'using_phone': '📱', 'playing_phone': '📱',
  };

  // 从 icon 路径或 title 推断 emoji
  const inferEmoji = (icon: string | undefined, title: string | undefined): string => {
    const key = (icon || '').toLowerCase() + ' ' + (title || '').toLowerCase();
    for (const [k, emoji] of Object.entries(TASK_TYPE_EMOJI)) {
      if (key.includes(k)) return emoji;
    }
    return '📝'; // 默认
  };

  // 判断 icon 是否为有意义的显示文本（过滤 kawai_xxx 等原始标识符）
  const isMeaningfulDisplayText = (icon: string | undefined): boolean => {
    if (!icon) return false;
    const str = icon.trim();
    // 过滤掉原始图标标识符、文件名、长字符串等
    if (/^(kawi|icon_|img_|asset_|file_|http|\/assets)/i.test(str)) return false;
    if (str.length > 20) return false;  // 超长的标识符不显示
    if (str.includes('_') && !/^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(str)) return false;  // 含下划线且非纯文字
    return true;
  };

  // 渲染任务图标（带 onError 回退）
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const renderTaskIcon = (icon: string | undefined, size: 'sm' | 'md' | 'lg' = 'sm', title?: string) => {
    const resolvedIcon = resolveIconPath(icon);
    const isPng = resolvedIcon && resolvedIcon.startsWith('/assets/');
    if (!isPng) {
      // SVG icon name → 使用 Icon 组件
      const svgIcons: Record<string, boolean> = { listTodo: true, checkCircle: true, star: true, clock: true };
      if (icon && svgIcons[icon]) {
        return <Icon name={icon} size={size === 'lg' ? 120 : size === 'md' ? 28 : 36} color={MINI_UI_COLORS.primary} />;
      }
      // 过滤无意义标识符（kawai_xxx 等），使用推断的 emoji
      if (!icon || !isMeaningfulDisplayText(icon)) {
        return <Text className={size === 'lg' ? 'tp-detail-big-icon' : 'tp-task-emoji'}>{inferEmoji(icon, title)}</Text>;
      }
      return <Text className={size === 'lg' ? 'tp-detail-big-icon' : 'tp-task-emoji'}>{icon || '📝'}</Text>;
    }

    // PNG 路径 — 尝试用 Image 加载，失败则回退 emoji
    if (imgErrors[resolvedIcon]) {
      return <Text className={size === 'lg' ? 'tp-detail-big-icon' : 'tp-task-emoji'}>{inferEmoji(icon, title)}</Text>;
    }

    const imgClass = size === 'lg' ? 'tp-detail-icon-img' : size === 'md' ? 'tp-day-task-icon-img' : 'tp-task-icon-img';
    const imgSize = size === 'lg' ? 200 : size === 'md' ? 40 : 52;
    return (
      <Image
        className={imgClass}
        src={resolvedIcon}
        mode="aspectFit"
        style={{ width: imgSize, height: imgSize }}
        onError={() => setImgErrors(prev => ({ ...prev, [resolvedIcon]: true }))}
      />
    );
  };

  // 渲染任务卡片 — 完全对齐首页 (home/index.tsx) 卡片结构
  const renderTaskCard = (task: TaskItem, idx?: number) => {
    const isCompleted = task.status === 'completed';
    const isReviewing = task.status === 'reviewing';
    const isPending = task.status === 'pending';
    const isPenalty = (task.star_amount ?? task.reward_stars ?? 0) < 0;
    const stars = Math.abs(task.star_amount ?? task.reward_stars ?? 0);
    const assigneeNames = (task.assignee_ids || [])
      .map((id: string) => members.find((m: any) => m.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    // 左侧颜色条 — 对齐首页
    const barColor = isPenalty ? MINI_UI_COLORS.penalty
      : isReviewing ? MINI_UI_COLORS.reviewing
      : task.type === 'daily' ? MINI_UI_COLORS.primary
      : task.type === 'study' ? MINI_UI_COLORS.secondary
      : MINI_UI_COLORS.primaryContainer;

    return (
      <View key={task.id} className={`task-card ${isCompleted ? 'completed' : ''}`} style={{ animationDelay: `${(idx ?? 0) * 50}ms` }}>
        {/* 左侧颜色条 */}
        <View className="task-color-bar" style={{ backgroundColor: barColor }} />

        {/* 主体：图标 + 标题信息 */}
        <View className="task-body" onClick={() => { setSelectedTask(task); setShowDetail(true); }}>
          {/* 图标区域 */}
          <View className={`task-icon-box ${isCompleted && !isPenalty ? 'done' : isReviewing ? 'reviewing' : isPenalty ? 'penalty' : ''}`}>
            {isCompleted && !isPenalty ? (
              <Icon name="checkCircle" size={36} color={MINI_UI_COLORS.primaryContainer} />
            ) : isReviewing ? (
              <Icon name="clock" size={36} color={MINI_UI_COLORS.reviewing} />
            ) : (
              renderTaskIcon(task.icon, 'sm', task.title)
            )}
          </View>

          {/* 文字信息 */}
          <View className="task-info">
            <Text className={`task-title ${isCompleted ? 'done' : ''} ${isReviewing ? 'reviewing' : ''}`}>
              {task.title}
            </Text>
            <View className="task-meta-row">
              <Icon name="clock" size={22} color={MINI_UI_COLORS.outlineVariant} />
              <Text className="task-meta-text">
                {task.reminder_time || (task.start_time ? new Date(task.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--')}
              </Text>
              <Text className="task-meta-dot">•</Text>
              <Icon name="user" size={22} color={MINI_UI_COLORS.outlineVariant} style={{ marginLeft: '8rpx' }} />
              <Text className="task-meta-text">{assigneeNames || '所有人'}</Text>
            </View>
          </View>
        </View>

        {/* 右侧操作区 — 统一三态：已完成(灰) / 审核中(核实) / 其他(打卡) */}
        <View className="task-action">
          {isCompleted ? (
            /* 已完成 → 灰色已完成标签 */
            <View className="task-btn task-btn-done">
              <Icon name="checkCircle" size={24} color={MINI_UI_COLORS.onPrimary} />
              <Text className="task-btn-text">已完成</Text>
            </View>
          ) : isReviewing ? (
            /* 审核中 → 橫色"核实"按钮 → 点击打开详情面板 */
            <View
              className="task-btn task-btn-review"
              onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setShowDetail(true); }}
            >
              <Icon name="checkCircle" size={24} color={MINI_UI_COLORS.onPrimary} />
              <Text className="task-btn-text">核实</Text>
            </View>
          ) : (
            /* 所有其他状态（含习惯任务）→ 绿色"打卡"按钮 → 跳转打卡页面 */
            <View
              className="task-btn task-btn-checkin"
              onClick={(e) => {
                e.stopPropagation();
                Taro.navigateTo({ url: `/pages/check-in/index?taskId=${task.id}` });
              }}
            >
              <Icon name="checkCircle" size={26} color={MINI_UI_COLORS.onPrimary} />
              <Text className="task-btn-text">打卡</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    if (isGuestMode()) {
      const nextData = updateGuestData((draft) => {
        draft.tasks = (draft.tasks || []).filter((task: any) => task.id !== selectedTask.id);
      });
      setTasks(nextData.tasks || []);
      Taro.showToast({ title: '已删除（演示）', icon: 'success' });
      setShowDeleteConfirm(false);
      setShowDetail(false);
      setSelectedTask(null);
      return;
    }
    await supabase.from('tasks').delete().eq('id', selectedTask.id);
    Taro.showToast({ title: '已删除', icon: 'success' });
    setShowDeleteConfirm(false);
    setShowDetail(false);
    setSelectedTask(null);
    fetchTasksData(familyId);
  };

  return (
    <View className="tp-page">
      {/* ===== 顶部栏：对齐 Web 端头像 + AI + 视图切换 + 星星 + 通知 ===== */}
      <View className="tp-header">
        <View className="tp-header-left">
          <View className="tp-avatar-btn" onClick={() => Taro.navigateTo({ url: '/pages/switch-profile/index' })}>
            <Image className="tp-avatar" src={resolveAvatarPath(user?.avatar || '')} mode="aspectFill" />
          </View>
          <View className="tp-mic-btn" onClick={() => setIsAiDialogOpen(true)}>
            <Icon name="microphone" size={38} color={MINI_UI_COLORS.primary} />
          </View>
        </View>

        <View className="tp-view-toggle">
          <View className={`tp-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            <Icon name="list" size={28} color={viewMode === 'list' ? MINI_UI_COLORS.onPrimary : MINI_UI_COLORS.primary} />
          </View>
          <View className={`tp-view-btn ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}>
            <Icon name="calendar" size={28} color={viewMode === 'calendar' ? MINI_UI_COLORS.onPrimary : MINI_UI_COLORS.primary} />
          </View>
        </View>

        <View className="tp-header-right">
          <View className="tp-star-badge" onClick={() => Taro.navigateTo({ url: '/pages/history/index' })}>
            <Icon name="star" size={24} color="#F9A825" />
            <Text className="tp-star-text">{(user?.stars || 0).toLocaleString()}</Text>
          </View>
          <NotificationBell onClick={() => Taro.navigateTo({ url: '/pages/settings/notifications/index' })} />
          <View className="tp-add-btn" onClick={() => Taro.navigateTo({ url: '/pages/templates/index' })}>
            <Icon name="plus" size={36} color={MINI_UI_COLORS.onPrimary} />
          </View>
        </View>
      </View>

      <VoiceAssistant
        visible={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        userId={userId}
        familyId={familyId}
      />

      {/* ===== 列表模式 ===== */}
      {viewMode === 'list' && (
        <>
          {/* 筛选按钮 */}
          <View className="tp-filter-row">
            {(['all', 'pending', 'reviewing', 'completed'] as const).map(f => (
              <View key={f} className={`tp-filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                <Text>{f === 'all' ? '全部' : f === 'pending' ? '待完成' : f === 'reviewing' ? '待审核' : '已完成'}</Text>
              </View>
            ))}
          </View>

          <ScrollView className="tp-list" scrollY>
            {filteredListTasks.length > 0 ? filteredListTasks.map((t, i) => renderTaskCard(t, i)) : (
              <View className="tp-empty">
                <Icon name="checkCircle" size={64} color={MINI_UI_COLORS.outlineVariant} />
                <Text className="tp-empty-text">暂无任务</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* ===== 日历模式（对齐 Web 版） ===== */}
      {viewMode === 'calendar' && (
        <View className="tp-calendar">
          {/* 月份选择器 */}
          <View className="tp-month-nav">
            <View className="tp-month-arrow" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
              <Icon name="arrowRight" size={32} color={MINI_UI_COLORS.onSurfaceVariant} style={{ transform: 'rotate(180deg)' }} />
            </View>
            <Text className="tp-month-title">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </Text>
            <View className="tp-month-arrow" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
              <Icon name="arrowRight" size={32} color={MINI_UI_COLORS.onSurfaceVariant} />
            </View>
          </View>

          {/* 日历卡片容器 — 对齐 Web: rounded-[2.5rem] 大圆角 + 阴影 + 边框 */}
          <View className="tp-cal-card">
            {/* 星期头 */}
            <View className="tp-week-header">
              {weekDays.map(d => <Text key={d} className="tp-week-day">{d}</Text>)}
            </View>

            {/* 日期网格 — 圆形日期格子 */}
            <View className="tp-days-grid">
              {daysInMonth.map((date, i) => (
                <View key={i} className={`tp-day-cell ${!date ? 'empty' : ''} ${date && isToday(date) ? 'today' : ''} ${date && isSameDay(date, selectedDate) ? 'selected' : ''}`}
                  onClick={() => date && setSelectedDate(date)}>
                  {date && (
                    <>
                      <View className="tp-day-circle">
                        <Text className={`tp-day-num ${date && isToday(date) ? 'today-txt' : ''} ${date && isSameDay(date, selectedDate) ? 'selected-txt' : ''}`}>{date.getDate()}</Text>
                      </View>
                      {hasTaskOnDay(date) && <View className="tp-day-dot" />}
                    </>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* 选中日期任务列表 — 使用完整 TaskCard 对齐 Web */}
          <View className="tp-day-tasks">
            <Text className="tp-day-tasks-title">
              {(() => {
                const d = selectedDate;
                const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
                return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
              })()}
            </Text>
            {dayTasks.length > 0 ? dayTasks.map((t, i) => renderTaskCard(t, i)) : (
              <View className="tp-empty">
                <Icon name="checkCircle" size={64} color={MINI_UI_COLORS.outlineVariant} />
                <Text className="tp-empty-text">今天暂无任务</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ===== 任务详情面板 — 完全对齐 /pages/tasks/detail/index ===== */}
      {showDetail && selectedTask && (() => {
        const task = selectedTask;
        const stars = Math.abs(task.star_amount ?? task.reward_stars ?? 0);
        const startTime = task.start_time ? new Date(task.start_time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const endTime = task.end_time || task.deadline;
        const endTimeStr = endTime ? new Date(endTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        const statusMap: Record<string, { label: string; color: string }> = {
          pending: { label: '待完成', color: MINI_UI_COLORS.primary },
          in_progress: { label: '进行中', color: MINI_UI_COLORS.info },
          reviewing: { label: '待审核', color: MINI_UI_COLORS.reviewing },
          completed: { label: '已完成', color: MINI_UI_COLORS.primaryContainer },
          rejected: { label: '已退回', color: MINI_UI_COLORS.penalty },
        };
        const sInfo = task?.status ? statusMap[task.status] : statusMap.pending;

        return (
        <View className="tp-detail-mask" onClick={() => { if (!showSettings) setShowDetail(false); }}>
          <View className="tp-detail-panel" onClick={(e) => e.stopPropagation()}>
            {/* ===== Header（对齐 detail/index）===== */}
            <View className="td-header">
              <View className="td-back-btn" onClick={() => setShowDetail(false)}>
                <Icon name="arrowLeft" size={36} color={MINI_UI_COLORS.onSurface} />
              </View>
              <Text className="td-header-title">任务详情</Text>
              {user?.role === 'parent' && (
                <View className="td-menu-btn" onClick={() => setShowSettings(!showSettings)}>
                  <Icon name="settings" size={36} color={MINI_UI_COLORS.subtle} />
                </View>
              )}
              {!user?.role || user?.role !== 'parent' ? <View style={{ width: '80rpx' }} /> : null}

              {/* 弹出菜单 */}
              {showSettings && (
                <View className="td-menu-popup">
                  <View className="td-menu-mask" onClick={() => setShowSettings(false)} />
                  <View className="td-menu-list">
                    <View className="td-menu-item" onClick={() => { Taro.navigateTo({ url: `/pages/tasks/edit/index?id=${task.id}` }); setShowSettings(false); }}>
                      <Icon name="edit" size={28} color={MINI_UI_COLORS.primary} />
                      <Text className="td-menu-item-text">编辑任务</Text>
                    </View>
                    <View className="td-menu-item danger" onClick={() => { setShowDeleteConfirm(true); setShowSettings(false); }}>
                      <Icon name="trash" size={28} color={MINI_UI_COLORS.penalty} />
                      <Text className="td-menu-item-text danger">删除任务</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* ===== 内容区（对齐 detail/index）===== */}
            <ScrollView className="td-content" scrollY>
              <View className="td-body">
                {/* 大图标容器 — 对齐 detail */}
                <View className="td-hero-icon-block">
                  <View className="td-hero-icon-wrap">
                    {(() => {
                      const resolvedIcon = resolveIconPath(task.icon);
                      const isPng = resolvedIcon.startsWith('/assets/');
                      if (isPng) {
                        return <Image className="td-hero-icon-img" src={resolvedIcon} mode="aspectFit" />;
                      }
                      const svgIcons: Record<string, boolean> = { listTodo: true, star: true, checkCircle: true };
                      if (task.icon && svgIcons[task.icon]) {
                        return <Icon name={task.icon} size={56} color={MINI_UI_COLORS.onPrimary} />;
                      }
                      // 过滤无意义标识符，显示推断 emoji
                      return (
                        <Text style={{ fontSize: '80rpx' }}>
                          {isMeaningfulDisplayText(task.icon) ? task.icon : inferEmoji(task.icon, task.title)}
                        </Text>
                      );
                    })()}
                  </View>
                  <View className="td-hero-icon-glow" />
                </View>

                {/* 标题 */}
                <Text className="td-hero-title">{task.title}</Text>

                {/* 时间行 */}
                {(startTime || endTime) && (
                  <View className="td-time-pill">
                    <Icon name="clock" size={28} color={MINI_UI_COLORS.muted} />
                    <Text className="td-time-text">{startTime}{endTime && ` — ${endTimeStr}`}</Text>
                  </View>
                )}

                {/* 创建者信息卡片 — 对齐 detail/index */}
                {user?.role === 'parent' ? (
                  <View className="td-creator-card">
                    <Image className="td-creator-avatar" src={resolveAvatarPath(user?.avatar || '')} />
                    <View className="td-creator-info">
                      <Text className="td-creator-label">创建者</Text>
                      <Text className="td-creator-name">{user?.name || '家长'}</Text>
                    </View>
                    <View className="td-creator-role-tag"><Text>发布人</Text></View>
                  </View>
                ) : null}

                {/* 参与者卡片 */}
                {(task.assignee_ids || []).length > 0 ? (
                  <View className="td-assignee-card">
                    <Image className="td-assignee-avatar"
                      src={resolveAvatarPath(members.find(m => m.id === task.assignee_ids[0])?.avatar || '')}
                    />
                    <View className="td-assignee-info">
                      <Text className="td-assignee-label">执行人</Text>
                      <Text className="td-assignee-name">
                        {members.find(m => m.id === task.assignee_ids[0])?.name || task.assignee_name || '未分配'}
                      </Text>
                    </View>
                    <View className="td-assignee-tag"><Text>家庭协作</Text></View>
                  </View>
                ) : null}

                {/* 描述区域 */}
                <View className="td-section">
                  <Text className="td-section-title">描述</Text>
                  <View className="td-desc-box">
                    <View className="td-desc-deco" />
                    <Text className="td-desc-text">{task.description || '暂无描述'}</Text>
                  </View>
                </View>

                {/* 完成奖励 */}
                {stars > 0 && (
                  <View className={`td-reward-card ${sInfo.label === '已完成' ? 'completed' : ''}`}>
                    <View className="td-reward-icon-wrap">
                      <Icon name="star" size={40} color={MINI_UI_COLORS.reward} />
                    </View>
                    <View className="td-reward-right">
                      <Text className="td-reward-label">奖励</Text>
                      <View className="td-reward-num-row">
                        <Text className="td-reward-num">{stars}</Text>
                        <View className="td-reward-mini-stars">
                          <Icon name="star" size={10} color={MINI_UI_COLORS.rewardDeep} />
                          <Icon name="star" size={8} color={MINI_UI_COLORS.rewardDeep} style={{ opacity: 0.6 }} />
                        </View>
                      </View>
                    </View>
                    <View className="td-reward-deco-star"><Icon name="star" size={120} color={MINI_UI_COLORS.onPrimaryOverlay} /></View>
                  </View>
                )}

                {/* 状态标签行 */}
                <View className="td-status-row">
                  <View className="td-status-dot" style={{ backgroundColor: sInfo.color }} />
                  <Text className="td-status-label" style={{ color: sInfo.color }}>{sInfo.label}</Text>
                  {task.is_habit && <Text className="td-habit-tag">习惯任务</Text>}
                </View>
              </View>

              {/* 底部占位 */}
              <View style={{ height: '160rpx' }} />
            </ScrollView>

            {/* 底部操作按钮 - 三态流转（保留原有逻辑） */}
            <View className="tp-detail-actions">
              {(task.status === 'pending' || !task.status) && (
                <View className="tp-action-btn primary" onClick={() => submitForReview(task.id)}>
                  <Icon name="check" size={28} color={MINI_UI_COLORS.onPrimary} />
                  <Text>打卡签到</Text>
                </View>
              )}
              {task.status === 'reviewing' && (
                <>
                  {user?.role === 'parent' ? (
                    <>
                      <View className="tp-action-btn warning" onClick={() => rejectTask(task.id)}>
                        <Icon name="rotateCcw" size={28} color={MINI_UI_COLORS.onPrimary} />
                        <Text>退回</Text>
                      </View>
                      <View className="tp-action-btn primary" onClick={() => approveTask(task.id)}>
                        <Icon name="checkCircle" size={28} color={MINI_UI_COLORS.onPrimary} />
                        <Text>审核通过</Text>
                      </View>
                    </>
                  ) : (
                    <View className="tp-action-btn waiting">
                      <Icon name="clock" size={28} color={MINI_UI_COLORS.warning} />
                      <Text>等待家长审核...</Text>
                    </View>
                  )}
                </>
              )}
              {task.status === 'completed' && (
                <View className="tp-action-btn disabled">
                  <Icon name="checkCircle" size={28} color={MINI_UI_COLORS.onPrimary} />
                  <Text>奖励已发放</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        );
      })()}

      {/* ===== 删除确认弹窗 ===== */}
      {showDeleteConfirm && (
        <View className="tp-confirm-mask" onClick={() => setShowDeleteConfirm(false)}>
          <View className="tp-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <Icon name="trash" size={56} color={MINI_UI_COLORS.danger} />
            <Text className="tp-confirm-title">确认删除</Text>
            <Text className="tp-confirm-desc">删除后无法恢复，确定要删除这个任务吗？</Text>
            <View className="tp-confirm-actions">
              <View className="tp-confirm-btn cancel" onClick={() => setShowDeleteConfirm(false)}>再想想</View>
              <View className="tp-confirm-btn danger" onClick={handleDeleteTask}>确认删除</View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
