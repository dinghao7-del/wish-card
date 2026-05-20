import React, { useEffect, useState } from 'react';
import { Star, ChevronLeft, MoreHorizontal, Plus, ChevronRight, Trophy, Ban, Globe, Edit, Trash2, CheckCircle2, Clock, AlertCircle, XCircle, Mic, X, Zap, MessageCircle, HeartHandshake, Flame } from 'lucide-react';
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
import { TASK_CATEGORIES, type HabitTemplate } from '../lib/templates';
import { getRewardStarPreset, normalizeTaskRewardStars, normalizeTemplateStars } from '../lib/starEconomy';
import { AppModal, TemplatePickerShell } from '../components/AppModal';
import { getHabitSelectableChildIds, resolveHabitTargetChildId } from '../lib/habitTargeting';
import { getCustomCreationRoute } from '../lib/createFlowRoutes';
import { OptionHelp } from '../components/OptionHelp';
import { showToastGlobal } from '../components/Toast';

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
  const { tasks, currentUser, members, history, addTask, deleteTask, approveTask, requestHabitCheckIn, approveHabitCheckIn, submitParentFeedback, respondParentFeedback, stars, setIsUserSelectorOpen, guestMode } = useFamily();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'reward' | 'penalty' | 'feedback'>('reward');
  const [selectedHabit, setSelectedHabit] = useState<Task | null>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitStars, setNewHabitStars] = useState(getRewardStarPreset('study'));
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [feedbackTitle, setFeedbackTitle] = useState(t('habits.feedback_card.options.listen', { defaultValue: '希望你多听我说' }));
  const [feedbackDetail, setFeedbackDetail] = useState('');

  const [isDetailSettingsOpen, setIsDetailSettingsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [activeTplCategory, setActiveTplCategory] = useState('生活');
  const [habitTemplateSearch, setHabitTemplateSearch] = useState('');

  const tplCategories = TASK_CATEGORIES;
  const feedbackOptions = [
    t('habits.feedback_card.options.listen', { defaultValue: '希望你多听我说' }),
    t('habits.feedback_card.options.promise', { defaultValue: '答应我的事没有兑现' }),
    t('habits.feedback_card.options.ignored', { defaultValue: '今天我觉得被忽视了' }),
    t('habits.feedback_card.options.thanks', { defaultValue: '谢谢你陪我完成一件事' }),
  ];
  const allHabitTemplates = TASK_CATEGORIES.flatMap(category => category.templates);
  const filteredTemplates = habitTemplateSearch.trim()
    ? allHabitTemplates.filter(template => {
        const keyword = habitTemplateSearch.trim().toLowerCase();
        return `${template.title} ${template.description || ''} ${template.category} ${template.ageGroup || ''} ${(template.tags || []).join(' ')}`
          .toLowerCase()
          .includes(keyword);
      })
    : (TASK_CATEGORIES.find(category => category.id === activeTplCategory)?.templates || []);

  // 点击模板直接创建习惯
  const handleSelectTemplate = (tpl: HabitTemplate) => {
    const newHabit: Task = {
      id: `habit_${Date.now()}`,
      title: tpl.title,
      description: tpl.description || '',
      type: tpl.category,
      icon: tpl.icon,
      rewardStars: activeTab === 'penalty' || tpl.stars < 0
        ? -Math.abs(normalizeTemplateStars(tpl.stars, tpl.category))
        : Math.abs(normalizeTemplateStars(tpl.stars, tpl.category)),
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
  const parentMembers = members.filter(m => m.role === 'parent');
  const feedbackTasks = tasks.filter(task =>
    task.type === 'parent_feedback'
    || task.description.includes('亲子反馈卡')
  );
  const visibleFeedbackTasks = feedbackTasks.filter(task =>
    currentUser?.role === 'parent'
      ? task.assigneeIds.includes(currentUser.id) && task.status !== 'completed'
      : task.creatorId === currentUser?.id
  );
  const longestGoodStreakHabit = rewardHabits.reduce<Task | null>((best, habit) => {
    if (!best) return habit;
    return (habit.currentCount || 0) > (best.currentCount || 0) ? habit : best;
  }, null);
  const longestGoodStreak = longestGoodStreakHabit?.currentCount || 0;
  const streakOwnerId = longestGoodStreakHabit?.assigneeIds?.[0] || childMembers[0]?.id || currentUser?.id || '';
  const streakOwner = members.find(member => member.id === streakOwnerId);
  const streakWindowDays = Math.max(1, Math.min(30, longestGoodStreak));
  const streakWindowStart = Date.now() - streakWindowDays * 24 * 60 * 60 * 1000;
  const recentPenaltyCount = history.filter(record =>
    record.type === 'penalty'
    && (record.userId === streakOwnerId || !streakOwnerId)
    && new Date(record.timestamp).getTime() >= streakWindowStart
  ).length;
  const streakMilestones = [
    { days: 3, bonus: 3 },
    { days: 7, bonus: 10 },
    { days: 14, bonus: 25 },
    { days: 30, bonus: 60 },
  ];
  const achievedMilestone = [...streakMilestones].reverse().find(item => longestGoodStreak >= item.days);
  const nextMilestone = streakMilestones.find(item => longestGoodStreak < item.days) || streakMilestones[streakMilestones.length - 1];
  const bonusTaskTitle = achievedMilestone ? t('habits.streak.bonus_title', { defaultValue: '连续好习惯{{days}}天加成', days: achievedMilestone.days }) : '';
  const hasBonusTask = bonusTaskTitle
    ? tasks.some(task => task.title === bonusTaskTitle && task.assigneeIds.includes(streakOwnerId))
    : false;
  const canCreateStreakBonus = Boolean(achievedMilestone && recentPenaltyCount === 0 && !hasBonusTask && streakOwnerId);
  const streakBonusText = recentPenaltyCount > 0
    ? t('habits.streak.paused', { defaultValue: '暂停 · {{count}}次扣分', count: recentPenaltyCount })
    : achievedMilestone
      ? t('habits.streak.claimable', { defaultValue: '可领 +{{count}}', count: achievedMilestone.bonus })
      : t('habits.streak.days_left', { defaultValue: '差 {{count}} 天', count: Math.max(0, nextMilestone.days - longestGoodStreak) });
  const streakStatusLabel = recentPenaltyCount > 0
    ? t('habits.streak.paused', { defaultValue: '暂停 · {{count}}次扣分', count: recentPenaltyCount })
    : canCreateStreakBonus
      ? t('habits.streak.claimable', { defaultValue: '可领 +{{count}}', count: achievedMilestone?.bonus || 0 })
      : t('habits.streak.days_left', { defaultValue: '差 {{count}} 天', count: Math.max(0, nextMilestone.days - longestGoodStreak) });

  const handleCreateStreakBonus = async () => {
    if (!achievedMilestone || !streakOwnerId || !longestGoodStreakHabit) return;
    const bonusTask: Task = {
      id: `streak_bonus_${Date.now()}`,
      title: bonusTaskTitle,
      description: t('habits.streak.bonus_desc', { defaultValue: '连续完成好习惯「{{name}}」{{days}}天，且期间没有扣分，给予额外加成奖励。', name: longestGoodStreakHabit.title, days: achievedMilestone.days }),
      type: 'streak_bonus',
      startTime: new Date().toISOString(),
      assigneeIds: [streakOwnerId],
      creatorId: currentUser?.id || streakOwnerId,
      rewardStars: achievedMilestone.bonus,
      status: 'reviewing',
      icon: 'Flame',
      isHabit: false,
      createdAt: new Date().toISOString(),
    };
    await addTask(bonusTask);
    showToastGlobal(t('habits.streak.created', { defaultValue: '已生成连续好习惯加成，家长确认后发放' }), 'success');
  };

  useEffect(() => {
    if (selectedParentId || currentUser?.role !== 'child') return;
    const firstParent = parentMembers[0];
    if (firstParent) setSelectedParentId(firstParent.id);
  }, [currentUser?.role, parentMembers, selectedParentId]);

  useEffect(() => {
    if (!selectedHabit || currentUser?.role !== 'parent') return;
    setSelectedChildId(resolveHabitTargetChildId(selectedHabit, childMembers, selectedChildId));
  }, [childMembers, currentUser?.role, selectedChildId, selectedHabit]);

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
      const targetMemberId = resolveHabitTargetChildId(habit, childMembers, selectedChildId);
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
      description: t('habits.default_description', { defaultValue: '保持良好的生活习惯，让每一天都充满活力和正能量。' }),
      type: 'daily',
      startTime: new Date().toISOString(),
      assigneeIds: members.filter(m => m.role === 'child').map(m => m.id), // Assign to all children
      creatorId: currentUser?.id || 'm1',
      rewardStars: normalizeTaskRewardStars(newHabitStars, { category: '习惯养成' }),
      status: 'pending',
      icon: 'Star', // Default icon
      isHabit: true,
      targetCount: 1, // Default for simple habits
      currentCount: 0
    };

    addTask(newHabit);
    setIsAddingHabit(false);
    setNewHabitTitle('');
    setNewHabitStars(getRewardStarPreset('study'));
  };

  const handleSubmitFeedback = async () => {
    await submitParentFeedback(selectedParentId, feedbackTitle, feedbackDetail);
    setFeedbackDetail('');
    setFeedbackTitle(t('habits.feedback_card.options.listen', { defaultValue: '希望你多听我说' }));
  };

  return (
    <div className="min-h-screen bg-background pb-40 animate-in fade-in duration-500 text-on-surface px-5">
      {/* Header */}
      <header className="ui-habit-header flex justify-between items-center py-3 sticky top-[var(--app-sticky-top,0px)] bg-background/80 backdrop-blur-xl z-40 -mx-5 px-5">
        <div className="flex items-center gap-3">
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

      <section className="ui-habit-summary relative mt-3 overflow-hidden rounded-2xl bg-surface px-3 py-3 shadow-sm border border-outline-variant/5">
        <div className={cn(
          "pointer-events-none absolute -right-3 -top-4 opacity-[0.08]",
          recentPenaltyCount > 0 ? "text-red-500" : "text-primary"
        )}>
          <Flame size={78} strokeWidth={2.4} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="truncate text-base font-black leading-none text-on-surface">{t('habits.streak.title', { defaultValue: '连续好习惯' })}</p>
              <OptionHelp title={t('habits.streak.help_title', { defaultValue: '连续加成怎么计算' })}>
                {streakOwner?.name ? `${streakOwner.name} ` : ''}
                {t('habits.streak.help_body', { defaultValue: '连续完成奖励型好习惯，并且这段时间没有被扣分，就可以在 3/7/14/30 天节点获得额外星星加成。{{detail}}', detail: streakBonusText })}
              </OptionHelp>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-base font-black leading-none text-on-surface">{t('habits.streak.days', { defaultValue: '{{count}}天', count: longestGoodStreak })}</span>
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-black",
                recentPenaltyCount > 0 ? "bg-red-50 text-red-500" : "bg-primary/10 text-primary"
              )}>
                {streakStatusLabel}
              </span>
            </div>
          </div>
            {canCreateStreakBonus ? (
              <button
                type="button"
                onClick={handleCreateStreakBonus}
                className="shrink-0 rounded-xl bg-primary px-3 py-2 text-[11px] font-black text-white shadow-md shadow-primary/15 active:scale-95"
              >
                {t('habits.streak.claim', { defaultValue: '领取' })}
              </button>
            ) : (
              <div className="w-14 shrink-0 text-right">
                <p className="text-[9px] font-black text-on-surface-variant/45">{t('habits.streak.next', { defaultValue: '下一档' })}</p>
                <p className="text-sm font-black text-primary">+{nextMilestone.bonus}</p>
              </div>
            )}
          </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-low">
          <div
            className={cn("h-full rounded-full", recentPenaltyCount > 0 ? "bg-red-400" : "bg-primary")}
            style={{ width: `${Math.min(100, (longestGoodStreak / nextMilestone.days) * 100)}%` }}
          />
        </div>
        </div>
      </section>

      {/* Tab Switcher and Add Button */}
      <div className="py-4 flex items-center justify-center gap-3">
          <div className="ui-habit-tabs flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/10 w-full max-w-[320px]">
            <button
              onClick={() => setActiveTab('reward')}
              className={cn(
                "flex-1 py-1.5 rounded-full text-xs font-black transition-all",
                activeTab === 'reward' ? "bg-surface text-on-surface shadow-sm" : "text-on-surface-variant/40"
              )}
            >
              <span className="inline-flex items-center justify-center gap-1">
                <span>{t('habits.tabs.reward', { defaultValue: '奖励' })}</span>
                <span className="text-[10px]">{rewardHabits.length}</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('penalty')}
              className={cn(
                "flex-1 py-1.5 rounded-full text-xs font-black transition-all",
                activeTab === 'penalty' ? "bg-surface text-red-500 shadow-sm" : "text-on-surface-variant/40"
              )}
            >
              <span className="inline-flex items-center justify-center gap-1">
                <span>{t('habits.tabs.penalty', { defaultValue: '惩罚' })}</span>
                <span className="text-[10px]">{penaltyHabits.length}</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={cn(
                "flex-1 py-1.5 rounded-full text-xs font-black transition-all",
                activeTab === 'feedback' ? "bg-surface text-primary shadow-sm" : "text-on-surface-variant/40"
              )}
            >
              <span className="inline-flex items-center justify-center gap-1">
                <span>{t('habits.tabs.feedback', { defaultValue: '反馈' })}</span>
                <span className="text-[10px]">{visibleFeedbackTasks.length}</span>
              </span>
            </button>
          </div>

          {activeTab !== 'feedback' && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowTemplatePicker(true)}
              aria-label={t('habits.add', { defaultValue: '添加奖惩' })}
              className="ui-habit-add-button w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all flex-shrink-0"
            >
              <Plus size={22} strokeWidth={3} className="text-white" />
            </motion.button>
          )}
        </div>

      {/* Habit List - 双列网格新设计 */}
      {activeTab === 'feedback' ? (
        <section className="px-2 space-y-4 pb-4">
          {currentUser?.role === 'child' && (
            <div className="rounded-[2rem] bg-surface p-5 border border-outline-variant/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <h3 className="font-black text-on-surface">{t('habits.feedback_card.title', { defaultValue: '给爸爸妈妈一张反馈卡' })}</h3>
                  <p className="text-xs font-bold text-on-surface-variant/60">{t('habits.feedback_card.desc', { defaultValue: '表达感受，不是扣分，是让家人更懂你。' })}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {parentMembers.map(parent => (
                  <button
                    key={parent.id}
                    onClick={() => setSelectedParentId(parent.id)}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-left text-sm font-black border",
                      selectedParentId === parent.id
                        ? "bg-primary text-white border-primary"
                        : "bg-surface-container-low text-on-surface border-outline-variant/10"
                    )}
                  >
                    {parent.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 mb-3">
                {feedbackOptions.map(item => (
                  <button
                    key={item}
                    onClick={() => setFeedbackTitle(item)}
                    className={cn(
                      "rounded-2xl px-4 py-3 text-left text-sm font-black border",
                      feedbackTitle === item
                        ? "bg-primary-container text-primary-text border-primary/30"
                        : "bg-surface-container-low text-on-surface border-outline-variant/10"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackDetail}
                onChange={(event) => setFeedbackDetail(event.target.value)}
                placeholder={t('habits.feedback_card.placeholder', { defaultValue: '也可以补充一句你真正想说的话' })}
                className="w-full min-h-[5rem] rounded-2xl bg-surface-container-low border border-outline-variant/10 p-3 text-sm font-bold outline-none"
              />
              <button
                onClick={handleSubmitFeedback}
                className="mt-3 w-full rounded-2xl bg-primary text-white py-4 font-black active:scale-95 transition-transform"
              >
                {t('habits.feedback_card.send', { defaultValue: '发送给家长' })}
              </button>
            </div>
          )}

          <div className="space-y-3">
            {visibleFeedbackTasks.length > 0 ? visibleFeedbackTasks.map(task => {
              const child = members.find(member => member.id === task.creatorId);
              return (
                <div key={task.id} className="rounded-[1.5rem] bg-surface p-4 border border-outline-variant/10 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <HeartHandshake size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-on-surface">{task.title.replace('亲子反馈：', '')}</p>
                      <p className="mt-1 text-xs font-bold text-on-surface-variant/60 whitespace-pre-line">{task.description.replace('亲子反馈卡\n', '')}</p>
                      <p className="mt-2 text-[10px] font-black text-on-surface-variant/40">
                        {child
                          ? t('habits.feedback_card.child_feedback', { defaultValue: '{{name}} 的反馈', name: child.name })
                          : t('habits.feedback_card.family_feedback', { defaultValue: '家庭反馈' })}
                        {' · '}
                        {task.status === 'completed'
                          ? t('habits.feedback_card.responded', { defaultValue: '已回应' })
                          : t('habits.feedback_card.waiting', { defaultValue: '待回应' })}
                      </p>
                    </div>
                  </div>
                  {currentUser?.role === 'parent' && task.status !== 'completed' && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => respondParentFeedback(task.id, 'acknowledge')}
                        className="rounded-2xl bg-surface-container-low py-3 text-sm font-black text-on-surface"
                      >
                        {t('habits.feedback_card.acknowledge', { defaultValue: '已认真看见' })}
                      </button>
                      <button
                        onClick={() => respondParentFeedback(task.id, 'promise')}
                        className="rounded-2xl bg-primary py-3 text-sm font-black text-white"
                      >
                        {t('habits.feedback_card.create_promise', { defaultValue: '生成承诺任务' })}
                      </button>
                    </div>
                  )}
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant font-bold text-center">
                <MessageCircle size={56} className="mb-4 opacity-20" />
                <p className="text-on-surface/40">
                  {currentUser?.role === 'parent'
                    ? t('habits.feedback_card.empty_parent', { defaultValue: '还没有待回应的亲子反馈' })
                    : t('habits.feedback_card.empty_child', { defaultValue: '还没有发出反馈卡' })}
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
      <div className="ui-habit-grid px-1 grid grid-cols-2 gap-2.5 mt-0 pb-4">
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
                  "ui-habit-watermark-card min-h-[5.85rem] rounded-2xl px-3 py-2.5 active:scale-[0.97] transition-all cursor-pointer relative overflow-hidden bg-green-50/90 border-2 border-green-200 shadow-sm",
                  habit.rewardStars >= 0
                    ? "ui-habit-card-reward text-green-700 dark:bg-green-500/10 dark:border-green-500/20"
                    : "ui-habit-card-penalty bg-red-50/90 border-red-200 text-red-600 dark:bg-red-500/10 dark:border-red-500/20"
                )}
              >
                <div className={cn(
                  "pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 opacity-[0.075]",
                  habit.rewardStars >= 0 ? "text-green-700" : "text-red-600"
                )}>
                  {getTaskIcon(habit.icon, 78)}
                </div>
                <div className="relative z-10 flex h-full min-w-0 flex-col items-start justify-between">
                  <div className="min-w-0 pr-8">
                    <h4 className="line-clamp-2 text-[0.95rem] font-black leading-[1.18] text-on-surface">{habit.title}</h4>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <Star size={13} className={habit.rewardStars >= 0 ? "text-reward-display fill-current" : "text-red-400 fill-current"} />
                    <span className={cn(
                      "text-base font-black",
                      habit.rewardStars >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
                    )}>
                      {habit.rewardStars >= 0 ? '+' : ''}{habit.rewardStars}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

          </>
        ) : (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 text-on-surface-variant font-bold text-center">
            <Trophy size={64} className="mb-4 opacity-10" />
            <p className="text-on-surface/40">{t('habits.empty', { defaultValue: '还没有{{type}}记录哦 🌱', type: activeTab === 'reward' ? t('habits.positive', { defaultValue: '积极习惯' }) : t('habits.negative', { defaultValue: '消极习惯' }) })}</p>
          </div>
        )}
      </div>
      )}

      {/* Habit Detail Modal */}
      <AnimatePresence>
        {selectedHabit && (
          <div className="ui-detail-overlay fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedHabit(null)}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="ui-detail-sheet w-full max-w-lg max-h-[88svh] overflow-hidden bg-background rounded-t-[2rem] shadow-2xl relative flex flex-col"
              data-bottom-sheet="true"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="ui-detail-sheet-header flex items-center px-6 py-4 bg-background/80 backdrop-blur-xl shrink-0 z-20 border-b border-outline-variant/10">
                <button
                  onClick={() => setSelectedHabit(null)}
                  className="ui-detail-sheet-close w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container/50 transition-colors"
                  aria-label={t('common.close', { defaultValue: '关闭' })}
                >
                  <Plus size={24} className="rotate-45" />
                </button>
                <h2 className="flex-1 text-center text-lg font-bold text-on-surface">{t('habits.detail_title', { defaultValue: '奖惩详情' })}</h2>
                <div className="relative">
                  <button
                    onClick={() => setIsDetailSettingsOpen(!isDetailSettingsOpen)}
                    className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    aria-label={t('common.more_actions', { defaultValue: '更多操作' })}
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
                            {t('common.edit_task', { defaultValue: '编辑任务' })}
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
                            {t('common.delete_task', { defaultValue: '删除任务' })}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </header>

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
                      <h3 className="text-xl font-black text-on-surface mb-2">{t('common.confirm_delete_title', { defaultValue: '确定删除吗？' })}</h3>
                      <p className="text-on-surface-variant/60 text-sm font-bold mb-8">{t('common.confirm_delete_desc', { defaultValue: '删除后历史记录将无法找回。' })}</p>

                      <div className="flex flex-col gap-3">
                        <button
                          onClick={handleDeleteHabit}
                          className="w-full py-4 bg-danger text-white font-black rounded-2xl shadow-lg shadow-danger/20 active:scale-95 transition-all text-center"
                        >
                          {t('common.confirm_delete', { defaultValue: '确定删除' })}
                        </button>
                        <button
                          onClick={() => setIsDeleteConfirmOpen(false)}
                          className="w-full py-4 bg-surface-container-low text-on-surface-variant/60 font-black rounded-2xl active:scale-95 transition-all text-center"
                        >
                          {t('common.cancel_delete', { defaultValue: '我再想想' })}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Main Content with Animation */}
              <div className="ui-detail-scroll flex-1 overflow-y-auto px-6 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-col items-center text-center">
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
                      const targetMemberId = resolveHabitTargetChildId(habit, childMembers, selectedChildId);
                      const targetChild = childMembers.find(child => child.id === targetMemberId);
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
                            {habit.description || t('habits.default_description', { defaultValue: '保持良好的生活习惯，让每一天都充满活力和正能量。' })}
                          </p>

                          <div className="grid grid-cols-2 gap-4 w-full mb-10">
                            <div className="bg-surface-container-low rounded-3xl p-4 border border-outline-variant/10 shadow-sm">
                              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">
                                {habit.rewardStars >= 0 ? t('habits.detail.reward_label', { defaultValue: '完成奖励' }) : t('habits.detail.penalty_label', { defaultValue: '惩罚扣除' })}
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
                              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">{t('habits.detail.current_count', { defaultValue: '当前次数' })}</p>
                              <div className="text-on-surface font-black text-2xl">
                                {habit.currentCount || 0}
                              </div>
                            </div>
                          </div>

                          {currentUser?.role === 'parent' && childMembers.length > 0 && (
                            <div className="w-full mb-5 text-left">
                              <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-2">{t('habits.detail.target_child', { defaultValue: '指定孩子' })}</p>
                              <div className="grid grid-cols-2 gap-2">
                                {childMembers
                                  .filter(child => getHabitSelectableChildIds(habit, childMembers).includes(child.id))
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
                                      <span className="block text-[10px] opacity-70">{child.stars} {t('common.points', { defaultValue: '积分' })}</span>
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}

                          {pendingReviews.length > 0 && (
                            <div className="w-full mb-5 rounded-2xl bg-warning-container/50 px-4 py-3 text-left">
                              <p className="text-xs font-black text-warning mb-2">{t('habits.detail.pending_review', { defaultValue: '待家长审核' })}</p>
                              <div className="space-y-2">
                                {pendingReviews.map(task => {
                                  const child = members.find(member => task.assigneeIds.includes(member.id));
                                  return (
                                    <div key={task.id} className="flex items-center justify-between gap-2 text-sm">
                                      <span className="font-bold text-on-surface">{t('habits.detail.child_submitted', { defaultValue: '{{name}} 已提交', name: child?.name || t('common.child', { defaultValue: '孩子' }) })}</span>
                                      {currentUser?.role === 'parent' && (
                                        <button
                                          onClick={() => approveTask(task.id)}
                                          className="rounded-full bg-primary px-3 py-1 text-xs font-black text-white"
                                        >
                                          {t('common.approve', { defaultValue: '通过' })}
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
                              {t('habits.back', { defaultValue: '返回' })}
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
                                ? (targetChild
                                  ? t('habits.parent_action_for_child', { defaultValue: '给{{name}}{{action}}', name: targetChild.name, action: habit.rewardStars < 0 ? t('habits.deduct', { defaultValue: '扣分' }) : t('habits.check_in', { defaultValue: '打卡' }) })
                                  : t('habits.select_child_action', { defaultValue: '指定孩子{{action}}', action: habit.rewardStars < 0 ? t('habits.deduct', { defaultValue: '扣分' }) : t('habits.check_in', { defaultValue: '打卡' }) }))
                                : currentUserPending
                                  ? t('habits.waiting_parent_review', { defaultValue: '等待家长审核' })
                                  : (habit.rewardStars < 0 ? t('habits.submit_deduct', { defaultValue: '提交扣分' }) : t('habits.check_in', { defaultValue: '打卡' }))}
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Habit Modal */}
      <AnimatePresence>
        {isAddingHabit && (
          <AppModal
            open={isAddingHabit}
            onClose={() => setIsAddingHabit(false)}
            title={t('habits.add_modal.title', { defaultValue: '添加好习惯' })}
            surface="sheet"
            zIndexClass="z-[120]"
            bodyClassName="px-5 py-4"
            footer={
              <div className="flex gap-3">
                <button
                  onClick={() => setIsAddingHabit(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-surface-container font-black text-on-surface-variant"
                >
                  {t('habits.add_modal.cancel', { defaultValue: '取消' })}
                </button>
                <button
                  onClick={handleAddHabit}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-primary text-on-primary font-black shadow-md shadow-primary/15"
                >
                  {t('habits.add_modal.confirm', { defaultValue: '确认添加' })}
                </button>
              </div>
            }
          >
              <div className="space-y-3">
                <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/5">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase text-on-surface-variant/40">{t('habits.add_modal.name_label', { defaultValue: '习惯名称' })}</p>
                    <OptionHelp title={t('habits.add_modal.name_help_title', { defaultValue: '习惯名称怎么写' })}>
                      {t('habits.add_modal.name_help_body', { defaultValue: '写成孩子每天或每周能直接执行的动作，不要写成抽象目标。比如“每天跳绳 10 分钟”比“增强体质”更容易打卡。' })}
                    </OptionHelp>
                  </div>
                  <input
                    type="text"
                    placeholder={t('habits.add_modal.name_placeholder', { defaultValue: '例如：每天刷牙' })}
                    className="w-full bg-transparent border-none outline-none font-bold text-on-surface text-base placeholder:opacity-20"
                    value={newHabitTitle}
                    onChange={(e) => setNewHabitTitle(e.target.value)}
                  />
                </div>

                <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/5">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase text-on-surface-variant/40">{t('habits.add_modal.stars_label', { defaultValue: '单次奖励 (星星)' })}</p>
                    <OptionHelp title={t('habits.add_modal.stars_help_title', { defaultValue: '习惯奖励怎么定' })}>
                      {t('habits.add_modal.stars_help_body', { defaultValue: '高频习惯不要给太多星星。生活小习惯建议 1-2 星，学习或运动坚持建议 3-5 星，特别难坚持的阶段性挑战再给更高奖励。' })}
                    </OptionHelp>
                  </div>
                  <div className="flex items-center gap-4">
                    <Star size={20} className="text-reward-display fill-current" />
                    <input
                      type="number"
                      className="w-full bg-transparent border-none outline-none font-bold text-on-surface text-lg"
                      value={newHabitStars}
                      onChange={(e) => setNewHabitStars(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
          </AppModal>
        )}
      </AnimatePresence>

      {/* 习惯模板选择器 - 全屏弹窗 */}
      <AnimatePresence>
        {showTemplatePicker && (
          <TemplatePickerShell
            title={t('habits.template.title', { defaultValue: '选择模板' })}
            onClose={() => setShowTemplatePicker(false)}
            search={
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/5 text-base">🔍</span>
                  <input
                    type="text"
                    placeholder={t('habits.template.search', { defaultValue: '搜索模板' })}
                    value={habitTemplateSearch}
                    onChange={(event) => setHabitTemplateSearch(event.target.value)}
                    className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-3 py-2.5 shadow-sm font-bold text-sm placeholder:text-on-surface-variant/30"
                  />
                </div>
                <button
                  onClick={() => { setShowTemplatePicker(false); navigate(getCustomCreationRoute('habit'), { state: { fromMode: 'habit' } }); }}
                  className="px-3 py-2.5 bg-primary text-white rounded-xl shadow-sm font-bold text-sm active:scale-95 transition-all shrink-0"
                >
                  {t('habits.template.custom', { defaultValue: '自定义添加' })}
                </button>
              </div>
            }
            tabs={
              <div className="flex gap-3 overflow-x-auto no-scrollbar">
                {tplCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveTplCategory(cat.id);
                      setHabitTemplateSearch('');
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all shrink-0",
                      activeTplCategory === cat.id
                        ? "bg-primary text-white"
                        : "bg-surface-container-low text-on-surface-variant"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            }
          >
              <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                {filteredTemplates.map((tpl, idx) => (
                  <motion.button
                    key={tpl.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx, 8) * 0.025 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="flex flex-col items-center gap-1 p-1 rounded-xl active:bg-surface-container transition-colors"
                  >
                    {/* 本地 kawaii 风格 PNG 图标 */}
                    <img
                      src={tpl.icon}
                      alt=""
                      className="w-12 h-12 object-contain rounded-xl"
                    />
                    <span className="text-xs font-bold text-on-surface text-center leading-tight">{tpl.title}</span>
                    <div className="flex items-center gap-0.5">
                      <Star size={11} className="text-reward-display fill-current" />
                      <span className={cn("text-xs font-bold", tpl.stars >= 0 ? "text-secondary" : "text-danger")}>
                        {tpl.stars > 0 ? `+${tpl.stars}` : tpl.stars}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
          </TemplatePickerShell>
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
        subtitle={selectedHabit && selectedHabit.rewardStars >= 0
          ? t('habits.bonus_success_subtitle', { defaultValue: '太棒了，继续保持 🌱' })
          : t('habits.penalty_success_subtitle', { defaultValue: '下次一定不要再犯了哦 ⚠️' })}
        stars={selectedHabit ? Math.abs(selectedHabit.rewardStars) : 0}
      />
    </div>
  );
}
