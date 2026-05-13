import React, { useState, useEffect, useRef } from 'react';
import { Settings, Star, PlusCircle, Calendar, Sparkles, Edit2, Clock, Mic, Brain, ListTodo, Bell } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { TaskCard } from '../components/TaskCard';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { NotificationBell } from '../components/NotificationCenter';
import { TextAvatar } from '../components/TextAvatar';
import { EnergyCard } from '../components/EnergyCard';
import { EmptyState } from '../components/EmptyState';

function AnimatedNumber({ value }: { value: number }) {
  // Simply display the formatted number - animation is handled by parent's motion.div
  // This avoids potential infinite loop issues with useSpring + useEffect dependency
  return <motion.span>{value.toLocaleString()}</motion.span>;
}

export function Home() {
  const { currentUser, members, tasks, stars, history, completeTask, approveTask, setIsUserSelectorOpen, guestMode } = useFamily();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const prevStarsRef = useRef(stars);
  const [showSparkles, setShowSparkles] = useState(false);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  useEffect(() => {
    if (stars !== prevStarsRef.current) {
      prevStarsRef.current = stars;
      setShowSparkles(true);
      const timer = setTimeout(() => setShowSparkles(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [stars]);

  const isAdmin = currentUser?.role === 'parent';
  const [bottomTab, setBottomTab] = useState<'leaderboard' | 'quadrant'>('leaderboard');
  const todayTasks = tasks.filter(t => !t.isHabit && (t.status === 'pending' || t.status === 'reviewing')).slice(0, 4);

  const today = new Date().toISOString().split('T')[0];
  const historyList = Array.isArray(history) ? history : [];
  const todayEarnedStars = historyList
    .filter(h =>
      h.userId === currentUser?.id &&
      h.timestamp.startsWith(today) &&
      h.stars > 0
    )
    .reduce((acc, curr) => acc + curr.stars, 0);

  return (
    <div className="px-4 sm:px-6 pb-8 space-y-4 sm:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background/50 min-h-screen">
      <header className="flex justify-between items-center py-4 sticky top-[var(--app-sticky-top,0px)] bg-background/80 backdrop-blur-xl z-40 -mx-4 sm:-mx-6 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={() => setIsUserSelectorOpen(true)}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 border-surface dark:border-surface shadow-sm group-hover:shadow-md transition-all">
              <TextAvatar src={currentUser?.avatar} name={currentUser?.name || '?'} size={typeof window !== 'undefined' ? (window.innerWidth >= 640 ? 40 : 32) : 32} />
            </div>
            {/* Removed "愿望卡" text as per request */}
          </div>

          {/* AI Microphone Button - Newly added */}
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
            className="bg-surface-container-low backdrop-blur-sm py-1 sm:py-1.5 px-3 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-sm border border-outline-variant/10 cursor-pointer hover:bg-surface-container transition-colors active:scale-95"
          >
            <Star size={14} className="sm:size-[18px] text-reward-display fill-current" />
            <span className="font-black text-on-surface text-sm sm:text-base">{stars.toLocaleString()}</span>
          </div>
          {!guestMode && <NotificationBell />}

        </div>
      </header>

      {/* Voice Assistant integration */}
      <VoiceAssistant
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        onOpenQuadrant={(range = 'today') => navigate(`/quadrant?range=${range}`)}
        onOpenCalendarSync={() => navigate('/calendar-sync')}
      />

      {/* Energy Card - 替代原有 Balance Card */}
      <section>
        <EnergyCard
          name={currentUser?.name || ''}
          stars={stars}
          tasksCompleted={todayTasks.filter(t => t.status === 'completed').length}
          tasksTotal={todayTasks.length}
          streakDays={0}
        />
      </section>

      {/* Quick Actions */}
      <section className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div className="grid auto-cols-[4.75rem] grid-flow-col gap-2.5 sm:grid-flow-row sm:grid-cols-5">
          <QuickActionButton
            icon={PlusCircle}
            label={t('home.actions.create_task', { defaultValue: '创建任务' })}
            onClick={() => navigate('/tasks/new')}
          />
          <QuickActionButton
            icon={Brain}
            label={t('home.actions.ai_analysis', { defaultValue: 'AI分析' })}
            highlight
            onClick={() => navigate('/ai-analysis')}
          />
          <QuickActionButton
            icon={Calendar}
            label={t('home.actions.calendar', { defaultValue: '日历' })}
            onClick={() => navigate('/tasks', { state: { mode: 'calendar' } })}
          />
          <QuickActionButton
            icon={ListTodo}
            label={t('home.actions.plans', { defaultValue: '计划' })}
            onClick={() => navigate('/plans')}
          />
          <QuickActionButton
            icon={Clock}
            label={t('home.actions.pomodoro', { defaultValue: '番茄钟' })}
            onClick={() => navigate('/pomodoro')}
          />
        </div>
      </section>

      {/* Today's Tasks */}
      <section className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-xl sm:text-2xl flex items-center gap-2 sm:gap-2.5 text-on-surface">
            {t('home.today_tasks', { defaultValue: '今日任务' })}
            <span className="bg-secondary-container text-secondary text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-black">
              {todayTasks.length}
            </span>
          </h3>
          <button onClick={() => navigate('/tasks')} className="text-primary-text text-xs sm:text-sm font-black">{t('common.view_all', { defaultValue: 'view all' })}</button>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {todayTasks.length > 0 ? todayTasks.map((task, idx) => (
            <TaskCard
              key={task.id}
              task={task}
              idx={idx}
              onClick={() => navigate('/tasks', { state: { selectedTaskId: task.id } })}
              onCheckIn={(id) => navigate(`/check-in/${id}`)}
              isAdmin={isAdmin}
            />
          )) : (
            <EmptyState
              scenario="empty_state"
              onAction={() => navigate('/tasks/new')}
              actionText="创建第一个任务"
            />
          )}
        </div>
      </section>

      {/* Leaderboard / Quadrant Tabs */}
      <section className="bg-surface-container-low/50 rounded-[1.5rem] sm:rounded-[2rem] p-3 sm:p-5 pb-2 relative overflow-hidden">
        {/* Tab Switcher */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex bg-surface-container rounded-full p-0.5">
            <button
              onClick={() => setBottomTab('leaderboard')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black transition-all",
                bottomTab === 'leaderboard' ? "bg-primary text-white shadow-sm" : "text-on-surface-variant/50"
              )}
            >
              {t('home_tabs.leaderboard', { defaultValue: '排行榜' })}
            </button>
            <button
              onClick={() => setBottomTab('quadrant')}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-black transition-all",
                bottomTab === 'quadrant' ? "bg-primary text-white shadow-sm" : "text-on-surface-variant/50"
              )}
            >
              {t('home_tabs.quadrant', { defaultValue: '四象限' })}
            </button>
          </div>
          {bottomTab === 'leaderboard' && (
            <Sparkles size={16} className="text-secondary" />
          )}
        </div>

        {/* Leaderboard View */}
        {bottomTab === 'leaderboard' && (
          <div className="flex justify-center items-end gap-2 sm:gap-4 pt-2 pb-1 relative">
            {[...members]
              .sort((a, b) => b.stars - a.stars)
              .slice(0, 3)
              .map((member, idx) => {
                const displayOrder = [1, 0, 2]; // 2nd, 1st, 3rd
                return { member, originalRank: idx + 1 };
              })
              .sort((a, b) => {
                const posA = a.originalRank === 1 ? 1 : a.originalRank === 2 ? 0 : 2;
                const posB = b.originalRank === 1 ? 1 : b.originalRank === 2 ? 0 : 2;
                return posA - posB;
              })
              .map(({ member, originalRank }) => (
                <PodiumItem
                  key={member.id}
                  member={member}
                  rank={originalRank}
                  onMemberClick={() => navigate(`/profile/members/${member.id}`)}
                />
              ))
            }
          </div>
        )}

        {/* Quadrant Analysis - 跳转到独立页面 */}
        {bottomTab === 'quadrant' && (
          <div className="min-h-[200px] flex flex-col items-center justify-center py-16 px-4 pb-32">
            <button
              onClick={() => navigate('/quadrant')}
              className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/20 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all shadow-lg"
            >
              <Sparkles size={40} className="text-primary" />
              <span className="font-black text-on-surface text-sm">{t('home_tabs.quadrant_analysis', { defaultValue: '四象限分析' })}</span>
            </button>
            <p className="text-[10px] text-on-surface-variant/60 font-bold mt-4 text-center">
              {t('home_tabs.click_for_full', { defaultValue: '点击查看完整分析' })}
            </p>
          </div>
        )}
      </section>
    </div>

  );
}

function QuickActionButton({ icon: Icon, label, onClick, highlight = false }: { icon: any; label: string; onClick?: () => void; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="ui-quick-action min-h-[5.75rem] rounded-2xl bg-surface-container-low p-2.5 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all group"
    >
      <div className={cn(
        "w-12 h-12 min-w-12 min-h-12 rounded-full flex items-center justify-center transition-colors",
        highlight ? "bg-primary text-white group-hover:bg-primary-container" : "bg-surface-container text-on-surface-variant group-hover:bg-surface-container-high"
      )}>
        <Icon size={20} />
      </div>
      <span className="text-center text-[10px] font-bold text-on-surface-variant leading-tight">{label}</span>
    </button>
  );
}

function PodiumItem({ member, rank, onMemberClick }: { member: any; rank: number; onMemberClick: () => void; key?: any }) {
  const isFirst = rank === 1;

  // 经典领奖台：中间最高，两侧递减
  const pedestalHeight = isFirst ? 80 : rank === 2 ? 52 : 36;
  const avatarSize = isFirst ? 68 : 56;

  return (
    <div
      className="flex flex-col items-center"
      style={{ width: isFirst ? 84 : 72 }}
    >
      {/* Avatar + Rank Badge */}
      <div className="relative mb-1">
        <motion.div
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onMemberClick()}
          className={cn(
            "rounded-full overflow-hidden cursor-pointer shadow-md transition-shadow",
            isFirst ? "border-[3px] border-secondary" : "border-2 border-surface"
          )}
          style={{ width: avatarSize, height: avatarSize }}
        >
          <TextAvatar src={member.avatar} name={member.name} size={avatarSize} />
        </motion.div>

        {/* Rank Badge - 右下角绝对定位 */}
        <div className={cn(
          "absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center shadow-sm border-2 z-20",
          isFirst ? "bg-secondary text-white border-white" : "bg-outline-variant text-white border-white"
        )}>
          {rank}
        </div>
      </div>

      {/* Pedestal 柱子 */}
      <div
        className={cn(
          "w-full rounded-t-xl flex flex-col items-center justify-end shadow-sm transition-all duration-500",
          isFirst ? "bg-primary" : "bg-surface-container-high"
        )}
        style={{ height: pedestalHeight }}
      >
        <span className={cn(
          "text-[10px] font-bold truncate px-0.5 leading-tight",
          isFirst ? "text-white/70" : "text-on-surface-variant/50"
        )}>
          {member.name}
        </span>
        <span className={cn(
          "text-base font-black leading-none mt-0.5",
          isFirst ? "text-white" : "text-on-surface"
        )}>
          {member.stars.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
