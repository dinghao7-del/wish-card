import React, { useState, useEffect, useRef } from 'react';
import { Settings, Star, PlusCircle, Calendar, Trophy, CheckCircle2, Sparkles, Edit2, Clock, Mic } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { TaskCard } from '../components/TaskCard';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { QuadrantAnalysisView } from '../components/QuadrantAnalysis';
import { TextAvatar } from '../components/TextAvatar';

function AnimatedNumber({ value }: { value: number }) {
  // Simply display the formatted number - animation is handled by parent's motion.div
  // This avoids potential infinite loop issues with useSpring + useEffect dependency
  return <motion.span>{value.toLocaleString()}</motion.span>;
}

export function Home() {
  const { currentUser, members, tasks, stars, history, completeTask, approveTask, setIsUserSelectorOpen } = useFamily();
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
    <div className="px-4 sm:px-6 pb-24 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background/50 min-h-screen">
      <header className="flex justify-between items-center py-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40 -mx-4 sm:-mx-6 px-4 sm:px-6">
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
            <Star size={14} className="sm:size-[18px] text-secondary fill-current" />
            <span className="font-black text-on-surface text-sm sm:text-base">{stars.toLocaleString()}</span>
          </div>
          <button 
            onClick={() => navigate('/settings/family')}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container transition-colors"
          >
            <Settings size={20} className="sm:w-[22px] sm:h-[22px]" strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* Voice Assistant integration */}
      <VoiceAssistant 
        isOpen={isAiDialogOpen} 
        onClose={() => setIsAiDialogOpen(false)}
        onOpenCalendarSync={() => navigate('/calendar-sync')}
      />

      {/* Balance Card */}
      <section>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative bg-gradient-to-br from-primary-surface via-primary-container to-primary-text rounded-[3rem] py-8 sm:py-10 px-6 sm:px-10 text-white shadow-[0_20px_50px_-10px_rgba(46,125,50,0.4)] overflow-hidden"
        >
          {/* Floating cute elements */}
          <motion.div 
            animate={{ 
              y: [0, -15, 0],
              x: [0, 5, 0],
              rotate: [0, 10, 0],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-6 left-6 opacity-20 pointer-events-none"
          >
            <Star size={32} className="fill-current text-[#FBC02D]" />
          </motion.div>
          
          <motion.div 
            animate={{ 
              y: [0, 15, 0],
              x: [0, -8, 0],
              rotate: [0, -15, 0],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-10 right-10 opacity-30 pointer-events-none"
          >
            <Sparkles size={48} className="text-[#FBC02D]" />
          </motion.div>

          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute top-1/2 left-1/4 -translate-y-1/2"
          >
            <div className="w-2 h-2 bg-white rounded-full blur-[1px]" />
          </motion.div>

          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 mb-4 bg-white/20 backdrop-blur-xl px-4 py-1.5 rounded-full border border-white/30 shadow-inner"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={14} className="text-[#FBC02D]" />
              </motion.div>
              <span className="text-[11px] sm:text-[13px] font-black tracking-widest uppercase text-white drop-shadow-sm">
                {t('home.energy_title', { defaultValue: '今日成长能量' })}
              </span>
            </motion.div>
            
            <div className="flex items-center gap-3 mb-2">
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-6xl sm:text-7xl font-black tracking-tight tabular-nums flex items-center gap-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.2)]"
              >
                <AnimatedNumber value={todayEarnedStars} />
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Star size={36} className="text-[#FBC02D] fill-current drop-shadow-lg" />
                </motion.div>
              </motion.div>
            </div>
            
            <div className="mt-4 px-6 py-2 bg-black/10 rounded-2xl backdrop-blur-sm border border-white/5">
              <p className="text-white/90 text-xs sm:text-sm font-bold tracking-wide italic">
                {t('home.energy_subtitle', { defaultValue: '加油！离下一个愿望更近了' })}
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Quick Actions */}
      <section className="grid grid-cols-4 gap-2 sm:gap-3">
        <QuickActionButton 
          icon={PlusCircle} 
          label={t('home.actions.create_task', { defaultValue: '创建任务' })} 
          color="bg-[#FFF9C4] text-[#FBC02D]" 
          onClick={() => navigate('/tasks/new')}
        />
        <QuickActionButton 
          icon={Edit2} 
          label={t('home.actions.make_wish', { defaultValue: '许下心愿' })} 
          color="bg-[#FFE0B2] text-[#F57C00]" 
          onClick={() => navigate('/rewards/new')}
        />
        <QuickActionButton 
          icon={Calendar} 
          label={t('home.actions.calendar', { defaultValue: '日历' })}
          color="bg-[#E1BEE7] text-[#7B1FA2]" 
          onClick={() => navigate('/tasks', { state: { mode: 'calendar' } })} 
        />
        <QuickActionButton 
          icon={Clock} 
          label={t('home.actions.pomodoro', { defaultValue: 'pomodoro' })} 
          color="bg-[#C8E6C9] text-[#2E7D32]" 
          onClick={() => navigate('/pomodoro')}
        />
      </section>

      {/* Today's Tasks */}
      <section className="space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-xl sm:text-2xl flex items-center gap-2 sm:gap-2.5 text-on-surface">
            {t('home.today_tasks', { defaultValue: '今日任务' })}
            <span className="bg-[#FFF9C4] text-[#FBC02D] text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-black">
              {todayTasks.length}
            </span>
          </h3>
          <button onClick={() => navigate('/tasks')} className="text-[#2E7D32] text-xs sm:text-sm font-black">{t('common.view_all', { defaultValue: 'view all' })}</button>
        </div>

        <div className="space-y-4 sm:space-y-5">
          {todayTasks.map((task, idx) => (
            <TaskCard 
              key={task.id}
              task={task}
              idx={idx}
              onClick={() => navigate('/tasks', { state: { selectedTaskId: task.id } })}
              onCheckIn={(id) => navigate(`/check-in/${id}`)}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </section>

      {/* Leaderboard / Quadrant Tabs */}
      <section className="bg-surface-container-low/50 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 pb-8 sm:pb-12 relative overflow-hidden">
        {/* Tab Switcher */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
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
            <Sparkles size={16} className="text-[#FBC02D]" />
          )}
        </div>

        {/* Leaderboard View */}
        {bottomTab === 'leaderboard' && (
          <div className="flex justify-center items-end gap-2 sm:gap-3 h-40 sm:h-52 relative">
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
          <div className="min-h-[200px] flex flex-col items-center justify-center py-20 px-4">
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

function QuickActionButton({ icon: Icon, label, color, onClick }: { icon: any, label: string, color: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="bg-surface rounded-2xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm dark:shadow-none hover:shadow-md transition-all group active:scale-95 border border-outline-variant/10"
    >
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-transform", color)}>
        <Icon size={24} />
      </div>
      <span className="text-[10px] font-bold text-on-surface-variant whitespace-nowrap">{label}</span>
    </button>
  );
}

function PodiumItem({ member, rank, onMemberClick }: { member: any; rank: number; onMemberClick: () => void; key?: any }) {
  const isFirst = rank === 1;
  const height = isFirst ? "h-24" : rank === 2 ? "h-16" : "h-12";
  
  return (
    <div className="flex flex-col items-center gap-2 relative w-20">
      {/* Rank Badge */}
      <div className={cn(
        "w-6 h-6 rounded-full text-[10px] font-black flex items-center justify-center shadow-md absolute -top-4 z-20 border-2 border-surface dark:border-surface",
        isFirst ? "bg-[#FBC02D] text-white" : "bg-[#BDBDBD] text-white dark:text-black"
      )}>
        {rank}
      </div>

      {/* Avatar */}
      <motion.div 
        whileHover={{ scale: 1.1, y: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onMemberClick()}
        className={cn(
          "w-16 h-16 rounded-full overflow-hidden border-4 cursor-pointer shadow-lg z-10 transition-shadow", 
          isFirst ? "border-[#FBC02D]" : "border-surface"
        )}
      >
        <TextAvatar src={member.avatar} name={member.name} size={64} />
      </motion.div>

      {/* Pedestal */}
      <div className={cn(
        "w-full rounded-t-2xl flex flex-col items-center justify-center transition-all duration-1000 shadow-sm relative",
        height,
        isFirst ? "bg-primary" : "bg-surface-container-high"
      )}>
        <span className={cn("text-[10px] font-bold mb-1 truncate px-1", isFirst ? "text-white/60" : "text-black/30 dark:text-white/30")}>
          {member.name}
        </span>
        <span className={cn("text-lg font-black leading-none", isFirst ? "text-white" : "text-on-surface")}>
          {member.stars.toLocaleString()}
        </span>
        
        {/* Decorative shine for first place */}
        {isFirst && (
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-t-2xl pointer-events-none" />
        )}
      </div>
    </div>
  );
}
