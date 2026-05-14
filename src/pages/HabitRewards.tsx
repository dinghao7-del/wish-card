import React, { useEffect, useState } from 'react';
import { Star, ChevronLeft, MoreHorizontal, Plus, ChevronRight, Trophy, Ban, Globe, Edit, Trash2, CheckCircle2, Clock, AlertCircle, XCircle, Mic, X, Zap } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Task } from '../types';
import { TaskCard } from '../components/TaskCard';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { TextAvatar } from '../components/TextAvatar';
import { CelebrationAnimation } from '../components/CelebrationAnimation';
import { NotificationBell } from '../components/NotificationCenter';
import { getRegisteredTaskIcon } from '../lib/lucideIconRegistry';

const HabitIconImage: React.FC<{ src: string; size: number }> = ({ src, size }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <Trophy size={size} />;
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="object-contain"
      style={{ width: size, height: size }}
      onError={() => setHasError(true)}
    />
  );
};

export function HabitRewards() {
  const { t } = useTranslation();
  const { tasks, currentUser, members, addTask, deleteTask, approveTask, requestHabitCheckIn, approveHabitCheckIn, stars, setIsUserSelectorOpen, guestMode } = useFamily();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'reward' | 'penalty'>('reward');
  const [selectedHabit, setSelectedHabit] = useState<Task | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitStars, setNewHabitStars] = useState(10);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');

  const [isDetailSettingsOpen, setIsDetailSettingsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [activeTplCategory, setActiveTplCategory] = useState('生活');

  // 习惯模板数据 - 使用本地 public/task-icons/ 下 kawaii 风格 PNG 图标
  const habitTemplates: { id: string; title: string; iconPath: string; stars: number; category: string }[] = [
    // 生活 life/
    { id: 'water', title: '多喝水', iconPath: '/task-icons/life/Cute_flat_kawaii_drinking_wate_2026-04-27T20-19-03.png', stars: 10, category: '生活' },
    { id: 'fruit', title: '吃水果', iconPath: '/task-icons/life/Cute_flat_kawaii_eating_fresh__2026-04-27T20-19-50.png', stars: 10, category: '生活' },
    { id: 'vegetable', title: '吃蔬菜', iconPath: '/task-icons/life/Cute_flat_kawaii_eating_vegeta_2026-04-27T20-19-51.png', stars: 10, category: '生活' },
    { id: 'milk', title: '喝牛奶', iconPath: '/task-icons/life/Cute_flat_kawaii_drinking_milk_2026-04-27T20-19-53.png', stars: 10, category: '生活' },
    { id: 'egg', title: '吃鸡蛋', iconPath: '/task-icons/life/Cute_flat_kawaii_eating_eggs_p_2026-04-27T20-19-59.png', stars: 10, category: '生活' },
    { id: 'brush', title: '刷牙', iconPath: '/task-icons/life/Cute_flat_kawaii_brushing_teet_2026-04-27T20-20-31.png', stars: 10, category: '生活' },
    { id: 'washface', title: '洗脸', iconPath: '/task-icons/life/Cute_flat_kawaii_washing_face__2026-04-27T20-20-33.png', stars: 10, category: '生活' },
    { id: 'early', title: '每日早起', iconPath: '/task-icons/life/Cute_flat_kawaii_waking_up_ear_2026-04-27T20-20-31.png', stars: 20, category: '生活' },
    { id: 'nap', title: '睡午觉', iconPath: '/task-icons/life/Cute_flat_kawaii_taking_aftern_2026-04-27T20-20-39.png', stars: 20, category: '生活' },
    // 独立 independent/
    { id: 'homework', title: '检查作业', iconPath: '/task-icons/independent/Cute_flat_kawai_checking_homew_2026-04-27T20-23-21.png', stars: 20, category: '独立' },
    { id: 'tidytoys', title: '整理玩具', iconPath: '/task-icons/independent/Cute_flat_kawai_organizing_toy_2026-04-27T20-22-27.png', stars: 15, category: '独立' },
    { id: 'eatmeal', title: '自己吃饭', iconPath: '/task-icons/independent/Cute_flat_kawaii_eating_meals__2026-04-27T20-22-48.png', stars: 15, category: '独立' },
    { id: 'dress', title: '自己穿衣', iconPath: '/task-icons/independent/Cute_flat_kawaii_getting_dress_2026-04-27T20-23-19.png', stars: 15, category: '独立' },
    { id: 'school', title: '自己上学', iconPath: '/task-icons/independent/Cute_flat_kawaii_going_to_scho_2026-04-27T20-22-35.png', stars: 20, category: '独立' },
    { id: 'packbag', title: '收拾书包', iconPath: '/task-icons/independent/Cute_flat_kawaii_packing_schoo_2026-04-27T20-22-27.png', stars: 15, category: '独立' },
    // 表扬 praise/
    { id: 'greet', title: '主动问好', iconPath: '/task-icons/praise/Cute_flat_kawaii_icon_of_greet_2026-04-27T20-14-08.png', stars: 15, category: '表扬' },
    { id: 'share', title: '懂得分享', iconPath: '/task-icons/praise/Cute_flat_kawaii_icon_of_shari_2026-04-27T20-11-36.png', stars: 15, category: '表扬' },
    { id: 'help', title: '帮助他人', iconPath: '/task-icons/praise/Cute_flat_kawaii_icon_of_helpi_2026-04-27T20-12-41.png', stars: 20, category: '表扬' },
    { id: 'honest', title: '诚实守信', iconPath: '/task-icons/praise/Cute_flat_kawaii_icon_of_admit_2026-04-27T20-13-36.png', stars: 20, category: '表扬' },
    { id: 'clean', title: '爱整洁', iconPath: '/task-icons/praise/Cute_flat_kawaii_icon_of_clean_2026-04-27T20-14-05.png', stars: 15, category: '表扬' },
    { id: 'learn', title: '热爱学习', iconPath: '/task-icons/praise/Cute_flat_kawaii_icon_of_learn_2026-04-27T20-13-21.png', stars: 20, category: '表扬' },
    { id: 'persist', title: '坚持不懈', iconPath: '/task-icons/praise/Cute_flat_kawaii_icon_of_persi_2026-04-27T20-13-32.png', stars: 25, category: '表扬' },
    { id: 'polite', title: '有礼貌', iconPath: '/task-icons/praise/Cute_flat_kawaii_icon_of_refus_2026-04-27T20-15-30.png', stars: 15, category: '表扬' },
    // 批评 critique/
    { id: 'lazy', title: '偷懒', iconPath: '/task-icons/critique/Cute_flat_kawaii_icon_of_procr_2026-04-27T20-07-43.png', stars: -15, category: '批评' },
    { id: 'waste', title: '浪费', iconPath: '/task-icons/critique/Cute_flat_kawaii_icon_of_wasti_2026-04-27T20-09-02.png', stars: -15, category: '批评' },
    { id: 'quarrel', title: '吵架', iconPath: '/task-icons/critique/Cute_flat_kawaii_icon_of_quarr_2026-04-27T20-09-39.png', stars: -20, category: '批评' },
    { id: 'lie', title: '说谎', iconPath: '/task-icons/critique/Cute_flat_kawaii_icon_of_secre_2026-04-27T20-08-37.png', stars: -20, category: '批评' },
    { id: 'rude', title: '没礼貌', iconPath: '/task-icons/critique/Cute_flat_kawaii_icon_of_unciv_2026-04-27T20-07-48.png', stars: -15, category: '批评' },
    { id: 'picky', title: '挑食', iconPath: '/task-icons/critique/Cute_flat_kawaii_icon_of_picky_2026-04-27T20-09-54.png', stars: -10, category: '批评' },
    { id: 'bedwet', title: '尿床', iconPath: '/task-icons/critique/Cute_flat_kawaii_icon_of_bedwe_2026-04-27T20-10-35.png', stars: -20, category: '批评' },
    { id: 'zoneout', title: '发呆走神', iconPath: '/task-icons/critique/Cute_flat_kawaii_icon_of_zonin_2026-04-27T20-10-36.png', stars: -10, category: '批评' },
  ];

  const tplCategories = ['生活', '独立', '表扬', '批评'];
  const filteredTemplates = habitTemplates.filter(t => t.category === activeTplCategory);

  // 点击模板直接创建习惯
  const handleSelectTemplate = (tpl: typeof habitTemplates[0]) => {
    const newHabit: Task = {
      id: `habit_${Date.now()}`,
      title: tpl.title,
      description: '',
      type: tpl.category,
      icon: 'Trophy',
      rewardStars: activeTab === 'penalty' || tpl.stars < 0 ? -Math.abs(tpl.stars) : Math.abs(tpl.stars),
      isHabit: true,
      creatorId: currentUser?.id || '',
      assigneeIds: currentUser?.role === 'parent'
        ? members.filter(m => m.role === 'child').map(m => m.id)
        : [currentUser?.id || ''],
      status: 'pending',
      frequency: 'daily',
      startTime: new Date().toISOString(),
      resetAfterClaim: false,
      currentCount: 0,
      targetCount: 1,
      createdAt: new Date().toISOString(),
    };
    addTask(newHabit);
    setShowTemplatePicker(false);
  };

  const handleDeleteHabit = () => {
    if (selectedHabit) {
      deleteTask(selectedHabit.id);
      setSelectedHabit(null);
      setIsDeleteConfirmOpen(false);
      setIsDetailSettingsOpen(false);
    }
  };

  // Filter habits for the current user and active tab
  const habits = tasks.filter(t => t.isHabit && (t.assigneeIds.includes(currentUser?.id || '') || currentUser?.role === 'parent'));
  const filteredHabits = habits.filter(h => activeTab === 'reward' ? h.rewardStars >= 0 : h.rewardStars < 0);
  const rewardHabits = habits.filter(h => h.rewardStars >= 0);
  const penaltyHabits = habits.filter(h => h.rewardStars < 0);
  const childMembers = members.filter(m => m.role === 'child');
  const streakDays = Math.max(0, ...habits.map(h => h.currentCount || 0));
  const nextRewardHabit = rewardHabits.find(h => (h.currentCount || 0) < (h.targetCount || 5)) || rewardHabits[0];

  useEffect(() => {
    if (!selectedHabit || currentUser?.role !== 'parent') return;
    const firstAssignedChild = childMembers.find(child => selectedHabit.assigneeIds.includes(child.id));
    setSelectedChildId(firstAssignedChild?.id || childMembers[0]?.id || '');
  }, [childMembers, currentUser?.role, selectedHabit]);

  const getTaskIcon = (iconName: string, size = 32) => {
    if (!iconName) return <Trophy size={size} />;
    // 支持本地 PNG 文件路径
    if (iconName.startsWith('/') || iconName.startsWith('http')) {
      return <HabitIconImage src={iconName} size={size} />;
    }
    const IconComponent = getRegisteredTaskIcon(iconName);
    if (IconComponent) return <IconComponent size={size} />;

    // Fallback based on typical habit types
    if (iconName === 'Star' && activeTab === 'penalty') return <AlertCircle size={size} />;

    return <Trophy size={size} />;
  };

  // 将任务图标映射到 Popsy Illustrations 名称
  const getPopsyIllustration = (iconName: string): string => {
    const iconMap: Record<string, string> = {
      // 学习相关
      'BookOpen': 'book',
      'Book': 'book',
      'PenTool': 'writing',
      'Pencil': 'writing',
      'GraduationCap': 'graduation',

      // 运动相关
      'Dumbbell': 'exercise',
      'Run': 'run',
      'Bike': 'bike',
      'Swim': 'swim',
      'Yoga': 'yoga',
      'Football': 'football',
      'Basketball': 'basketball',
      'Tennis': 'tennis',

      // 音乐艺术
      'Music': 'music',
      'Guitar': 'guitar',
      'Piano': 'piano',
      'Brush': 'painting',

      // 生活技能
      'ChefHat': 'cooking',
      'Utensils': 'cooking',
      'Dance': 'dance',

      // 其他
      'Star': 'trophy',
      'Trophy': 'trophy',
      'Heart': 'meditation',
      'Medal': 'medal',
    };

    return iconMap[iconName] || 'trophy'; // 默认返回奖杯
  };

  const [isCheckInSuccess, setIsCheckInSuccess] = useState(false);

  const handleHabitAction = async (habit: Task) => {
    if (!currentUser) return;
    if (currentUser.role === 'parent') {
      const targetMemberId = selectedChildId || childMembers.find(child => habit.assigneeIds.includes(child.id))?.id;
      if (!targetMemberId) return;
      await approveHabitCheckIn(habit.id, targetMemberId);
      setIsCheckInSuccess(true);
      return;
    }
    await requestHabitCheckIn(habit.id, currentUser.id);
    setSelectedHabit(null);
  };

  const handleCelebrationComplete = () => {
    setIsCheckInSuccess(false);
    setSelectedHabit(null);
  };

  const handleAddHabit = () => {
    if (!newHabitTitle.trim()) return;

    const newHabit: Task = {
      id: `h-${Date.now()}`,
      title: newHabitTitle,
      description: '保持良好的生活习惯，让每一天都充满活力和正能量。',
      type: 'daily',
      startTime: new Date().toISOString(),
      assigneeIds: members.filter(m => m.role === 'child').map(m => m.id), // Assign to all children
      creatorId: currentUser?.id || 'm1',
      rewardStars: newHabitStars,
      status: 'pending',
      icon: 'Star', // Default icon
      isHabit: true,
      targetCount: 1, // Default for simple habits
      currentCount: 0
    };

    addTask(newHabit);
    setIsAddingHabit(false);
    setNewHabitTitle('');
    setNewHabitStars(10);
  };

  return (
    <div className="min-h-screen bg-background pb-40 animate-in fade-in duration-500 text-on-surface px-6">
      {/* Header */}
      <header className="ui-habit-header flex justify-between items-center py-4 sticky top-[var(--app-sticky-top,0px)] bg-background/80 backdrop-blur-xl z-40 -mx-6 px-6">
        <div className="flex items-center gap-3">
          <Zap size={22} className="ui-habit-flash text-primary" strokeWidth={3} />
          <h1 className="text-xl font-black text-on-surface">心愿清单</h1>
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={() => setIsUserSelectorOpen(true)}
          >
            <TextAvatar src={currentUser?.avatar} name={currentUser?.name || '?'} size={40} className="border-2 border-surface dark:border-surface shadow-sm group-hover:shadow-md transition-all" />
          </div>

          <button
            onClick={() => setIsAiDialogOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-primary/20 text-primary-text hover:bg-primary/5 active:scale-95 transition-all"
          >
            <Mic size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            onClick={() => navigate('/history')}
            className="ui-home-stars-pill bg-surface-container-low backdrop-blur-sm py-1 sm:py-1.5 px-3 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-sm border border-outline-variant/10 cursor-pointer hover:bg-surface-container transition-colors active:scale-95"
          >
            <Star size={14} className="sm:size-[18px] text-reward-display fill-current" />
            <span className="font-black text-on-surface text-sm sm:text-base">{stars.toLocaleString()}</span>
          </div>
          <NotificationBell />
        </div>
      </header>

      <VoiceAssistant
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        onOpenQuadrant={(range = 'today') => navigate(`/quadrant?range=${range}`)}
        onOpenCalendarSync={() => navigate('/calendar-sync')}
      />

      <section className="ui-habit-summary mt-5 rounded-[2rem] bg-surface p-5">
        <div>
          <p className="text-xs font-black text-on-surface-variant">当前连续</p>
          <p className="mt-1 text-4xl font-black leading-none">{streakDays || 0} 天</p>
        </div>
        <div className="ui-habit-score-pill">
          <Star size={13} className="fill-current" />
          <span>{stars.toLocaleString()} 积分</span>
        </div>
      </section>

      {/* Tab Switcher and Add Button */}
      <div className="py-5 flex items-center justify-center gap-4">
          <div className="ui-habit-tabs flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/10 w-full max-w-[240px]">
            <button
              onClick={() => setActiveTab('reward')}
              className={cn(
                "flex-1 py-1.5 rounded-full text-xs font-black transition-all",
                activeTab === 'reward' ? "bg-surface text-on-surface shadow-sm" : "text-on-surface-variant/40"
              )}
            >
              奖励
              <span className="ml-1 text-[10px]">{rewardHabits.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('penalty')}
              className={cn(
                "flex-1 py-1.5 rounded-full text-xs font-black transition-all",
                activeTab === 'penalty' ? "bg-surface text-red-500 shadow-sm" : "text-on-surface-variant/40"
              )}
            >
              惩罚
              <span className="ml-1 text-[10px]">{penaltyHabits.length}</span>
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowTemplatePicker(true)}
            aria-label="添加奖惩"
            className="ui-habit-add-button w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all flex-shrink-0"
          >
            <Plus size={24} strokeWidth={3} className="text-white" />
          </motion.button>
        </div>

      {/* Habit List - 双列网格新设计 */}
      <div className="ui-habit-grid px-2 grid grid-cols-2 gap-3 mt-1 pb-4">
        {filteredHabits.length > 0 ? (
          <>
            {filteredHabits.map((habit, idx) => (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                onClick={() => setSelectedHabit(habit)}
                className={cn(
                  "ui-habit-card rounded-2xl p-3 shadow-sm active:scale-[0.97] transition-all cursor-pointer relative overflow-hidden",
                  habit.rewardStars >= 0
                    ? "ui-habit-card-reward bg-green-50 dark:bg-green-500/10 border-2 border-green-200 dark:border-green-500/20"
                    : "ui-habit-card-penalty bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/20"
                )}
              >
                {/* 大号图标背景装饰 - 使用React组件，无需外部请求 */}
                <div className={cn(
                  "absolute -right-2 -top-2 opacity-[0.12] pointer-events-none scale-150",
                  habit.rewardStars >= 0 ? "text-green-600" : "text-red-500"
                )}>
                  {getTaskIcon(habit.icon, 64)}
                </div>

                {/* 信息区域 */}
                <div className="relative z-10 flex min-h-[8.5rem] flex-col">
                  <div className="ui-habit-icon-box mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                    {getTaskIcon(habit.icon, 24)}
                  </div>
                  <span className="ui-habit-type-badge">
                    {habit.rewardStars >= 0 ? '奖励' : '惩罚'}
                  </span>
                  <h4 className="text-xl font-black text-on-surface mb-1.5 leading-tight">{habit.title}</h4>
                  <div className="flex items-center gap-1.5">
                    <Star size={14} className={habit.rewardStars >= 0 ? "text-reward-display fill-current" : "text-red-400 fill-current"} />
                    <span className={cn(
                      "text-base font-black",
                      habit.rewardStars >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                    )}>
                      {habit.rewardStars >= 0 ? '+' : ''}{habit.rewardStars}
                    </span>
                  </div>
                  <div className="ui-habit-dot-row mt-auto">
                    {Array.from({ length: 5 }).map((_, dotIdx) => (
                      <span
                        key={dotIdx}
                        className={dotIdx < Math.min(5, habit.currentCount || 0) ? 'is-filled' : ''}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}

          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant font-bold text-center">
            <Trophy size={64} className="mb-4 opacity-10" />
            <p className="text-on-surface/40">还没有{activeTab === 'reward' ? '积极习惯' : '消极习惯'}记录哦 🌱</p>
          </div>
        )}
      </div>

      {nextRewardHabit && (
        <section className="ui-habit-next-reward mt-6 rounded-[2rem] bg-primary p-5">
          <div className="flex items-center gap-4">
            <div className="ui-habit-next-icon flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface">
              {getTaskIcon(nextRewardHabit.icon, 42)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black">下一个奖励</p>
              <h3 className="mt-1 truncate text-2xl font-black">{nextRewardHabit.title}</h3>
              <div className="mt-2 flex items-center gap-2">
                <div className="ui-habit-next-progress">
                  <span style={{ width: `${Math.min(100, ((nextRewardHabit.currentCount || 0) / (nextRewardHabit.targetCount || 5)) * 100)}%` }} />
                </div>
                <span className="text-xs font-black">
                  {Math.round(Math.min(100, ((nextRewardHabit.currentCount || 0) / (nextRewardHabit.targetCount || 5)) * 100))}%
                </span>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setSelectedHabit(nextRewardHabit)}>
            满 {nextRewardHabit.targetCount || 5} 次领取
          </button>
        </section>
      )}

      {/* Habit Detail Modal */}
      <AnimatePresence>
        {selectedHabit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm max-h-[calc(100svh-2rem)] overflow-y-auto bg-background border border-outline-variant/10 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-2xl relative"
            >
              <div className="absolute top-6 right-6 z-20">
                <button
                  onClick={() => setIsDetailSettingsOpen(!isDetailSettingsOpen)}
                  className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  <MoreHorizontal size={20} />
                </button>

                <AnimatePresence>
                  {isDetailSettingsOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-30"
                        onClick={() => setIsDetailSettingsOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 mt-2 w-48 bg-surface rounded-2xl shadow-xl border border-outline-variant z-40 py-1.5 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setIsDetailSettingsOpen(false);
                            navigate(`/tasks/edit/${selectedHabit.id}`);
                          }}
                          className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-surface-container/50 transition-colors text-on-surface font-black text-sm text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Edit size={16} />
                          </div>
                          编辑任务
                        </button>
                        <button
                          onClick={() => {
                            setIsDeleteConfirmOpen(true);
                            setIsDetailSettingsOpen(false);
                          }}
                          className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-danger-container/40 transition-colors text-danger font-black text-sm text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-danger-container flex items-center justify-center text-danger">
                            <Trash2 size={16} />
                          </div>
                          删除任务
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Delete Confirmation Modal */}
              <AnimatePresence>
                {isDeleteConfirmOpen && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center px-6">
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                      onClick={() => setIsDeleteConfirmOpen(false)}
                    />
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      className="bg-surface rounded-[2rem] p-8 w-full max-w-xs relative z-10 shadow-2xl text-center border border-outline-variant/10"
                    >
                      <div className="w-16 h-16 bg-danger-container text-danger rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={32} />
                      </div>
                      <h3 className="text-xl font-black text-on-surface mb-2">确定删除吗？</h3>
                      <p className="text-on-surface-variant/60 text-sm font-bold mb-8">删除后历史记录将无法找回哦 🌱</p>

                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleDeleteHabit}
                          className="w-full py-4 bg-danger text-white font-black rounded-2xl shadow-lg shadow-danger/20 active:scale-95 transition-all text-center"
                        >
                          确定删除
                        </button>
                        <button
                          onClick={() => setIsDeleteConfirmOpen(false)}
                          className="w-full py-4 bg-surface-container-low text-on-surface-variant/60 font-black rounded-2xl active:scale-95 transition-all text-center"
                        >
                          我再想想
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Main Content with Animation */}
              <div className="flex flex-col items-center text-center mt-4">
                <AnimatePresence mode="wait">
                  {!isCheckInSuccess && selectedHabit ? (
                    (() => {
                      // 使用局部变量让TypeScript正确推断类型
                      const habit = selectedHabit;
                      const pendingReviews = tasks.filter(task =>
                        task.status === 'reviewing'
                        && task.description.includes(`奖惩来源ID:${habit.id}`)
                      );
                      const currentUserPending = pendingReviews.some(task => task.assigneeIds.includes(currentUser?.id || ''));
                      const targetChild = childMembers.find(child => child.id === selectedChildId);
                      return (
                        <motion.div
                          key="detail-content"
                          initial={{ opacity: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="w-full flex flex-col items-center"
                        >
                          <div className="w-24 h-24 rounded-[2rem] bg-surface-container flex items-center justify-center text-primary mb-6 shadow-inner border-4 border-surface dark:border-surface">
                            {getTaskIcon(habit.icon, 48)}
                          </div>

                          <h2 className="text-2xl font-black text-on-surface mb-2">{habit.title}</h2>
                          <p className="text-on-surface-variant/60 font-bold mb-8 px-4 leading-relaxed text-sm">
                            {habit.description || '保持良好的生活习惯，让每一天都充满活力和正能量。'}
                          </p>

                          <div className="grid grid-cols-2 gap-4 w-full mb-10">
                            <div className="bg-surface-container-low rounded-3xl p-4 border border-outline-variant/10 shadow-sm">
                              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">
                                {habit.rewardStars >= 0 ? '完成奖励' : '惩罚扣除'}
                              </p>
                              <div className={cn(
                                "flex items-center justify-center gap-2 font-black text-2xl",
                                habit.rewardStars >= 0 ? "text-primary" : "text-red-500"
                              )}>
                                <Star size={20} className="fill-current text-reward-display" />
                                <span>{Math.abs(habit.rewardStars)}</span>
                              </div>
                            </div>
                            <div className="bg-surface-container-low rounded-3xl p-4 border border-outline-variant/10 shadow-sm">
                              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">当前次数</p>
                              <div className="text-on-surface font-black text-2xl">
                                {habit.currentCount || 0}
                              </div>
                            </div>
                          </div>

                          {currentUser?.role === 'parent' && childMembers.length > 0 && (
                            <div className="w-full mb-5 text-left">
                              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-2">指定孩子</p>
                              <div className="grid grid-cols-2 gap-2">
                                {childMembers
                                  .filter(child => habit.assigneeIds.includes(child.id))
                                  .map(child => (
                                    <button
                                      key={child.id}
                                      onClick={() => setSelectedChildId(child.id)}
                                      className={cn(
                                        "rounded-2xl px-3 py-2 text-sm font-black border transition-all text-left",
                                        selectedChildId === child.id
                                          ? "bg-primary text-white border-primary"
                                          : "bg-surface-container-low text-on-surface border-outline-variant/10"
                                      )}
                                    >
                                      {child.name}
                                      <span className="block text-[10px] opacity-70">{child.stars} 积分</span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}

                          {pendingReviews.length > 0 && (
                            <div className="w-full mb-5 rounded-2xl bg-warning-container/50 px-4 py-3 text-left">
                              <p className="text-xs font-black text-warning mb-2">待家长审核</p>
                              <div className="space-y-2">
                                {pendingReviews.map(task => {
                                  const child = members.find(member => task.assigneeIds.includes(member.id));
                                  return (
                                    <div key={task.id} className="flex items-center justify-between gap-2 text-sm">
                                      <span className="font-bold text-on-surface">{child?.name || '孩子'} 已提交</span>
                                      {currentUser?.role === 'parent' && (
                                        <button
                                          onClick={() => approveTask(task.id)}
                                          className="rounded-full bg-primary px-3 py-1 text-xs font-black text-white"
                                        >
                                          通过
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-4 w-full">
                            <button
                              onClick={() => setSelectedHabit(null)}
                              className="flex-1 py-4 px-6 rounded-[1.5rem] bg-surface-container font-black text-on-surface-variant active:scale-95 transition-transform whitespace-nowrap"
                            >
                              返回
                            </button>
                            <button
                              onClick={() => {
                                if (!isCheckInSuccess) handleHabitAction(habit);
                              }}
                              disabled={isCheckInSuccess || (currentUser?.role !== 'parent' && currentUserPending)}
                              className={cn(
                                "flex-[2] py-4 px-6 rounded-[1.5rem] text-white font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50",
                                habit.rewardStars < 0 ? "bg-red-500 shadow-red-500/20" : "bg-primary shadow-primary/20 hover:bg-primary-container"
                              )}
                            >
                              <Plus size={20} strokeWidth={3} />
                              {currentUser?.role === 'parent'
                                ? `${targetChild ? `给${targetChild.name}` : '指定孩子'}${habit.rewardStars < 0 ? '扣分' : '打卡'}`
                                : currentUserPending
                                  ? '等待家长审核'
                                  : `${habit.rewardStars < 0 ? '提交扣分' : t('habits.check_in', '打卡')}`}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })()
                  ) : (
                    /* 成功动画由 CelebrationAnimation 组件在页面层级显示 */
                    <motion.div
                      key="empty"
                      className="w-full h-32"
                    />
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Habit Modal */}
      <AnimatePresence>
        {isAddingHabit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm max-h-[calc(100svh-2rem)] overflow-y-auto bg-background border border-outline-variant/10 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-on-surface mb-6 text-center">添加好习惯</h2>

              <div className="space-y-4">
                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/5">
                  <p className="text-[10px] font-black text-on-surface-variant/40 uppercase mb-2">习惯名称</p>
                  <input
                    type="text"
                    placeholder="例如：每天刷牙"
                    className="w-full bg-transparent border-none outline-none font-bold text-on-surface text-lg placeholder:opacity-20"
                    value={newHabitTitle}
                    onChange={(e) => setNewHabitTitle(e.target.value)}
                  />
                </div>

                <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/5">
                  <p className="text-[10px] font-black text-on-surface-variant/40 uppercase mb-2">单次奖励 (星星)</p>
                  <div className="flex items-center gap-4">
                    <Star size={20} className="text-reward-display fill-current" />
                    <input
                      type="number"
                      className="w-full bg-transparent border-none outline-none font-bold text-on-surface text-xl"
                      value={newHabitStars}
                      onChange={(e) => setNewHabitStars(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setIsAddingHabit(false)}
                  className="flex-1 py-4 px-6 rounded-2xl bg-surface-container font-black text-on-surface-variant"
                >
                  取消
                </button>
                <button
                  onClick={handleAddHabit}
                  className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-on-primary font-black shadow-lg"
                >
                  确认添加
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 习惯模板选择器 - 全屏弹窗 */}
      <AnimatePresence>
        {showTemplatePicker && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-white">
            {/* Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/5"
            >
              <button
                onClick={() => setShowTemplatePicker(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant transition-colors"
              >
                <X size={24} />
              </button>
              <h1 className="text-lg font-black tracking-tight">选择模板</h1>
              <div className="w-10" />
            </motion.div>

            {/* 搜索 + 自定义添加 */}
            <div className="px-6 pt-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/5 text-base">🔍</span>
                  <input
                    type="text"
                    placeholder="搜索模板"
                    className="w-full bg-surface-container-low border-none rounded-2xl pl-11 pr-4 py-3.5 shadow-sm font-bold text-sm placeholder:text-on-surface-variant/30"
                  />
                </div>
                <button
                  onClick={() => { setShowTemplatePicker(false); navigate('/tasks/new', { state: { fromMode: 'habit' } }); }}
                  className="px-4 py-3.5 bg-primary text-white rounded-2xl shadow-sm font-bold text-sm active:scale-95 transition-all shrink-0"
                >
                  自定义添加
                </button>
              </div>
            </div>

            {/* 分类标签 */}
            <div className="px-6 py-3">
              <div className="flex gap-3">
                {tplCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveTplCategory(cat)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                      activeTplCategory === cat
                        ? "bg-primary text-white"
                        : "bg-surface-container-low text-on-surface-variant"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Popsy 图标网格 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto px-6 pt-2 pb-8"
            >
              <div className="grid grid-cols-4 gap-x-4 gap-y-5">
                {filteredTemplates.map((tpl, idx) => (
                  <motion.button
                    key={tpl.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="flex flex-col items-center gap-1 p-1 rounded-2xl active:bg-surface-container transition-colors"
                  >
                    {/* 本地 kawaii 风格 PNG 图标 */}
                    <img
                      src={tpl.iconPath}
                      alt=""
                      className="w-[56px] h-[56px] object-contain rounded-xl"
                    />
                    <span className="text-xs font-bold text-on-surface text-center leading-tight">{tpl.title}</span>
                    <div className="flex items-center gap-0.5">
                      <Star size={11} className="text-reward-display fill-current" />
                      <span className="text-xs font-bold text-secondary">+{tpl.stars}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Spacer */}
      <div className="h-12" />

      {/* 打卡成功动画 */}
      <CelebrationAnimation
        isVisible={isCheckInSuccess}
        onComplete={handleCelebrationComplete}
        type={selectedHabit && selectedHabit.rewardStars >= 0 ? 'habit' : 'penalty'}
        title={selectedHabit && selectedHabit.rewardStars >= 0 ? t('habits.check_in_success', '打卡成功！') : t('habits.deduct_warning', '扣除警告！')}
        subtitle={selectedHabit && selectedHabit.rewardStars >= 0 ? '太棒了，继续保持 🌱' : '下次一定不要再犯了哦 ⚠️'}
        stars={selectedHabit ? Math.abs(selectedHabit.rewardStars) : 0}
      />
    </div>
  );
}
