import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

// 阶段配色 —— 使用应用主题 CSS 变量，跟随整体风格
const PHASE_COLORS = {
  work:       'var(--color-primary, #006e1c)',
  shortBreak: 'var(--color-secondary, #686000)',
  longBreak:  'var(--color-tertiary, #7a5649)',
} as const;

// 番茄钟阶段定义
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';
interface PhaseConfig {
  key: PomodoroPhase;
  labelKey: string;
  duration: number;
  color: string;
  messageKey: string;
}

const PHASE_CONFIG: PhaseConfig[] = [
  {
    key: 'work',
    labelKey: 'pomodoro.focus_work',
    duration: 25,
    color: PHASE_COLORS.work,
    messageKey: 'pomodoro.stay_focused'
  },
  {
    key: 'shortBreak',
    labelKey: 'pomodoro.short_break',
    duration: 5,
    color: PHASE_COLORS.shortBreak,
    messageKey: 'pomodoro.relax'
  },
  {
    key: 'longBreak',
    labelKey: 'pomodoro.long_break',
    duration: 15,
    color: PHASE_COLORS.longBreak,
    messageKey: 'pomodoro.rest_well'
  }
];

export function PomodoroTimer() {
  const navigate = useNavigate();
  const { tasks } = useFamily();
  const { t } = useTranslation();
  
  // 核心状态
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [progress, setProgress] = useState(100);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  
  // 完成庆祝
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Modal states
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
  const [isDurationSelectorOpen, setIsDurationSelectorOpen] = useState(false);
  const [tempDuration, setTempDuration] = useState(25);

  const durationList = Array.from({ length: 60 }, (_, i) => i + 1);
  
  // 音频引用
  const audioContextRef = useRef<AudioContext | null>(null);

  // 获取当前阶段配置
  const currentConfig = PHASE_CONFIG.find(p => p.key === currentPhase) || PHASE_CONFIG[0];
  const totalSeconds = currentConfig.duration * 60;

  // 计时器逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const newTime = prev - 1;
          setProgress((newTime / totalSeconds) * 100);
          
          // 播放滴答声（最后10秒）
          if (newTime <= 10 && newTime > 0) {
            playTickSound();
          }
          
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0 && status === 'running') {
      // 计时结束
      handlePhaseComplete();
    }
    
    return () => clearInterval(interval);
  }, [status, timeLeft, totalSeconds]);

  // 播放滴答声
  const playTickSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // 音效播放失败，忽略
    }
  };

  // 播放完成音效
  const playCompletionSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // 播放上升音调
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        
        const startTime = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        osc.start(startTime);
        osc.stop(startTime + 0.3);
      });
    } catch (e) {
      // 音效播放失败，忽略
    }
  };

  // 阶段完成处理
  const handlePhaseComplete = () => {
    setStatus('idle');
    playCompletionSound();
    
    if (currentPhase === 'work') {
      // 工作阶段完成
      const newCount = completedPomodoros + 1;
      setCompletedPomodoros(newCount);
      setShowCelebration(true);
      
      // 每4个番茄钟长休息，否则短休息
      if (newCount % 4 === 0) {
        setCurrentPhase('longBreak');
        setTimeLeft(15 * 60);
      } else {
        setCurrentPhase('shortBreak');
        setTimeLeft(5 * 60);
      }
    } else {
      // 休息结束，回到工作
      setCurrentPhase('work');
      setTimeLeft(25 * 60);
    }
    
    setProgress(100);
    
    // 3秒后关闭庆祝动画
    setTimeout(() => setShowCelebration(false), 3000);
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 操作按钮
  const handleStart = () => setStatus('running');
  const handlePause = () => setStatus('paused');
  const handleResume = () => setStatus('running');
  const handleTerminate = () => {
    setStatus('idle');
    setTimeLeft(currentConfig.duration * 60);
    setProgress(100);
  };
  const handleReset = () => {
    handleTerminate();
    setCurrentPhase('work');
    setCompletedPomodoros(0);
  };

  // 手动切换阶段
  const handlePhaseChange = (phase: PomodoroPhase) => {
    setCurrentPhase(phase);
    setTimeLeft(PHASE_CONFIG.find(p => p.key === phase)!.duration * 60);
    setProgress(100);
    setStatus('idle');
  };

  // 确认时长设置
  const handleConfirmDuration = () => {
    const config = PHASE_CONFIG.find(p => p.key === currentPhase);
    if (config) {
      config.duration = tempDuration;
      setTimeLeft(tempDuration * 60);
      setProgress(100);
    }
    setIsDurationSelectorOpen(false);
  };

  // SVG 圆形进度环
  const RING_RADIUS = 80;
  const RING_STROKE = 3;
  const circumference = RING_RADIUS * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[var(--color-background,#fbf9f5)] transition-colors duration-700">
      {/* 庆祝动画 */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <div className="text-center">
              <motion.div
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 1, times: [0, 0.5, 1], repeat: 2 }}
                className="w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center"
                style={{ backgroundColor: currentConfig.color }}
              >
                <CheckCircle2 size={64} className="text-white" strokeWidth={2.5} />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-black"
                style={{ color: 'var(--color-on-surface, #1b1c1a)' }}
              >
                {t('pomodoro.completed_one', { defaultValue: '完成一个番茄钟！🎉' })}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => setIsHelpOpen(true)}
          className="text-sm font-medium tracking-wide transition-colors"
          style={{ color: 'var(--color-on-surface-variant, #3f4a3c)' }}
        >
          {t('pomodoro.help', { defaultValue: '使用说明' })}
        </button>
        <span className="text-xs font-light tracking-[0.2em]" style={{ color: 'var(--color-on-surface-variant, #3f4a3c)' }}>
          {t('pomodoro.technique', { defaultValue: '番茄工作法' })}
        </span>
        <div className="w-16" />
      </header>

      {/* 阶段指示器 */}
      <div className="flex justify-center gap-6 px-6 mb-3">
        {PHASE_CONFIG.map((phase) => (
          <button
            key={phase.key}
            onClick={() => status === 'idle' && handlePhaseChange(phase.key)}
            disabled={status !== 'idle'}
            className={cn(
              "pb-1.5 text-xs tracking-widest font-light transition-all border-b-2",
              currentPhase === phase.key
                ? "text-[var(--color-on-surface,#1b1c1a)]"
                : "border-transparent hover:text-[var(--color-on-surface,#1b1c1a)]",
              status !== 'idle' && "opacity-40 cursor-not-allowed"
            )}
            style={currentPhase === phase.key
              ? { borderColor: 'var(--color-primary, #006e1c)', color: 'var(--color-on-surface, #1b1c1a)' }
              : { color: 'var(--color-on-surface-variant, #3f4a3c)' }
            }
          >
            {t(phase.labelKey)}
          </button>
        ))}
      </div>

      {/* Task Selector */}
      {currentPhase === 'work' && (
        <div className="flex justify-center mb-3">
          <button
            onClick={() => setIsTaskSelectorOpen(true)}
            className="text-sm font-light transition-colors tracking-wide"
            style={{ color: 'var(--color-on-surface-variant, #3f4a3c)' }}
          >
            {selectedTask || t('pomodoro.task_selector_title', { defaultValue: '选择任务' })}
            <span className="ml-1" style={{ opacity: 0.4 }}>▾</span>
          </button>
        </div>
      )}

      {/* Timer Circle */}
      <div className="flex-1 flex items-center justify-center relative py-2">
        <div className="relative w-44 h-44 flex items-center justify-center">
          {/* SVG 进度环 */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            {/* 背景环 */}
            <circle
              cx="50%"
              cy="50%"
              r={RING_RADIUS}
              fill="transparent"
              stroke="var(--color-outline-variant, #becab9)"
              strokeWidth={RING_STROKE}
            />
            {/* 进度环 */}
            <motion.circle
              cx="50%"
              cy="50%"
              r={RING_RADIUS}
              fill="transparent"
              stroke={currentConfig.color}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.5, ease: "linear" }}
            />
          </svg>

          {/* 时间显示 */}
          <motion.button
            onClick={() => status === 'idle' && setIsDurationSelectorOpen(true)}
            disabled={status !== 'idle'}
            className={cn(
              "relative z-10 font-light tracking-wider transition-all",
              status !== 'idle' ? "cursor-default" : "cursor-pointer hover:opacity-70"
            )}
            style={{ color: 'var(--color-on-surface, #1b1c1a)', fontSize: '2.5rem' }}
            animate={{
              scale: status === 'running' ? [1, 1.01, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: status === 'running' ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            {formatTime(timeLeft)}
          </motion.button>
        </div>
      </div>

      {/* Actions - 正常按钮尺寸 */}
      <div className="flex flex-col items-center gap-4 pb-28" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
        <AnimatePresence mode="wait">
          {status === 'idle' ? (
            <motion.button
              key="start"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={handleStart}
              className="px-10 py-3 rounded-full font-light text-base tracking-[0.15em] text-white transition-all hover:opacity-90 active:scale-98"
              style={{ backgroundColor: currentConfig.color }}
            >
              {t('pomodoro.start', { defaultValue: '开始' })}
            </motion.button>
          ) : status === 'running' ? (
            <motion.button
              key="pause"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={handlePause}
              className="px-10 py-3 rounded-full font-light text-base tracking-[0.15em] text-white transition-all hover:opacity-90 active:scale-98"
              style={{ backgroundColor: currentConfig.color }}
            >
              {t('pomodoro.pause', { defaultValue: '暂停' })}
            </motion.button>
          ) : (
            <motion.div
              key="paused-actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-4"
            >
              <button
                onClick={handleResume}
                className="px-8 py-3 rounded-full font-light text-base tracking-[0.1em] text-white transition-all hover:opacity-90 active:scale-98"
                style={{ backgroundColor: currentConfig.color }}
              >
                {t('pomodoro.continue', { defaultValue: '继续' })}
              </button>
              <button
                onClick={handleTerminate}
                className="px-6 py-3 rounded-full font-light text-xs tracking-widest transition-colors border"
                style={{
                  color: 'var(--color-on-surface-variant, #3f4a3c)',
                  borderColor: 'var(--color-outline-variant, #becab9)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--color-on-surface, #1b1c1a)';
                  e.currentTarget.style.borderColor = 'var(--color-on-surface-variant, #3f4a3c)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-on-surface-variant, #3f4a3c)';
                  e.currentTarget.style.borderColor = 'var(--color-outline-variant, #becab9)';
                }}
              >
                {t('pomodoro.terminate', { defaultValue: '结束' })}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 重置按钮 */}
        <button
          onClick={handleReset}
          className="text-xs font-light tracking-widest transition-colors"
          style={{ color: 'var(--color-on-surface-variant, #3f4a3c)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-on-surface, #1b1c1a)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-on-surface-variant, #3f4a3c)' }}
        >
          {t('pomodoro.reset', { defaultValue: '重置' })}
        </button>
      </div>

      {/* Modals */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <TaskSelectorModal
        isOpen={isTaskSelectorOpen}
        onClose={() => setIsTaskSelectorOpen(false)}
        onSelect={(taskName) => setSelectedTask(taskName)}
        tasks={tasks}
        onNewTask={() => { setIsTaskSelectorOpen(false); navigate('/tasks/new'); }}
      />
      <DurationSelectorModal
        isOpen={isDurationSelectorOpen}
        onClose={() => setIsDurationSelectorOpen(false)}
        durationList={durationList}
        tempValue={tempDuration}
        onValueChange={setTempDuration}
        onConfirm={handleConfirmDuration}
      />

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-surface,#fbf9f5)]/95 backdrop-blur-sm border-t flex items-center justify-around px-4 z-50"
        style={{ borderColor: 'var(--color-outline-variant, #becab9)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <NavItem label={t('pomodoro.tab_list', { defaultValue: '清单' })} active={false} onClick={() => {}} />
        <NavItem label={t('pomodoro.tab_calendar', { defaultValue: '日历' })} active={false} onClick={() => {}} />
        <NavItem label={t('pomodoro.tab_timer', { defaultValue: '计时' })} active={true} onClick={() => {}} />
        <NavItem label={t('pomodoro.tab_notes', { defaultValue: '笔记' })} active={false} onClick={() => {}} />
        <NavItem label={t('pomodoro.tab_more', { defaultValue: '更多' })} active={false} onClick={() => {}} />
      </nav>
    </div>
  );
}

function HelpModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20" onClick={onClose}>
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-lg bg-white rounded-t-3xl p-8 space-y-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-light tracking-wide text-[#3A3A3A]">{t('pomodoro.technique', { defaultValue: '番茄工作法' })}</h3>
              <button onClick={onClose} className="p-2 text-[#9B9184] hover:text-[#3A3A3A] transition-colors">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-5 text-[#3A3A3A] font-light leading-relaxed text-sm">
              <p>{t('pomodoro.help_intro', { defaultValue: '番茄工作法是一种时间管理方法，帮助你更高效地完成工作。' })}</p>

              {/* 由来 */}
              <div className="bg-[#F7F5F0] rounded-xl p-4 text-xs text-[#5C5C5C] leading-relaxed space-y-2">
                <p className="font-medium text-[#3A3A3A]">{t('pomodoro.help_origin_title', { defaultValue: '—— 方法由来' })}</p>
                <p>{t('pomodoro.help_origin_detail', {
                  defaultValue: '番茄工作法由意大利大学生弗朗西斯科·齐里洛（Francesco Cirillo）于20世纪80年代末发明。他使用厨房定时器（形状像番茄）来追踪学习时间，因此得名"番茄工作法"（Pomodoro 是意大利语"番茄"的意思）。该方法于1992年正式发表，至今已被全球数百万人们使用。'
                })}</p>
              </div>

              <div className="space-y-3 pl-4 border-l-2 border-[#C4B6A6]">
                <p className="text-xs text-[#9B9184]">01. {t('pomodoro.help_step1', { defaultValue: '选择一个任务' })}</p>
                <p className="text-xs text-[#9B9184]">02. {t('pomodoro.help_step2', { defaultValue: '将番茄钟设为25分钟' })}</p>
                <p className="text-xs text-[#9B9184]">03. {t('pomodoro.help_step3', { defaultValue: '专注于工作，直到番茄钟响铃' })}</p>
                <p className="text-xs text-[#9B9184]">04. {t('pomodoro.help_step4', { defaultValue: '休息5分钟，然后继续下一个番茄钟' })}</p>
                <p className="text-xs text-[#9B9184]">05. {t('pomodoro.help_step5', { defaultValue: '每4个番茄钟后，休息更长时间（15-30分钟）' })}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#8B7355] text-white font-light tracking-widest text-sm rounded-full hover:opacity-90 transition-opacity"
            >
              {t('pomodoro.help_got_it', { defaultValue: '明白了' })}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function TaskSelectorModal({ isOpen, onClose, onSelect, tasks, onNewTask }: { isOpen: boolean, onClose: () => void, onSelect: (name: string) => void, tasks: any[], onNewTask: () => void }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20" onClick={onClose}>
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full bg-white rounded-t-3xl overflow-hidden flex flex-col h-[65vh] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[#E8E0D8]">
              <h3 className="text-base font-light tracking-wide text-[#3A3A3A]">{t('pomodoro.task_selector_title', { defaultValue: '选择任务' })}</h3>
              <button
                onClick={onClose}
                className="p-1 text-[#9B9184] hover:text-[#3A3A3A] transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-[#9B9184] gap-3 py-12">
                  <div className="text-4xl opacity-20">📝</div>
                  <p className="text-sm font-light">{t('pomodoro.task_selector_no_tasks', { defaultValue: '暂无任务' })}</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => { onSelect(task.title); onClose(); }}
                    className="w-full p-4 text-left text-sm font-light text-[#3A3A3A] hover:bg-[#F7F5F0] rounded-xl transition-colors"
                  >
                    {task.title}
                  </button>
                ))
              )}
            </div>

            <div className="p-6 border-t border-[#E8E0D8]">
              <button onClick={onNewTask} className="w-full py-3 text-sm font-light tracking-wide text-[#8B7355] hover:opacity-70 transition-opacity">
                + {t('pomodoro.task_selector_create', { defaultValue: '创建新任务' })}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function DurationSelectorModal({ isOpen, onClose, durationList, tempValue, onValueChange, onConfirm }: {
  isOpen: boolean,
  onClose: () => void,
  durationList: number[],
  tempValue: number,
  onValueChange: (v: number) => void,
  onConfirm: () => void
}) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20" onClick={onClose}>
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-sm bg-white rounded-t-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-6 pt-6 pb-4">
              <button onClick={onClose} className="text-sm font-light text-[#9B9184]">{t('common.cancel', { defaultValue: '取消' })}</button>
              <span className="text-xs font-light text-[#9B9184] tracking-widest">{t('pomodoro.minutes', { defaultValue: '分钟' })}</span>
              <button onClick={onConfirm} className="text-sm font-light text-[#8B7355]">{t('common.confirm', { defaultValue: '确认' })}</button>
            </div>

            <div className="h-56 overflow-y-auto snap-y snap-mandatory py-20 no-scrollbar">
              {durationList.map((num) => (
                <div
                  key={num}
                  onClick={() => onValueChange(num)}
                  className={cn(
                    "h-12 flex items-center justify-center snap-center text-lg font-light transition-all cursor-pointer",
                    tempValue === num ? "text-[#3A3A3A] bg-[#F7F5F0] rounded-lg mx-8" : "text-[#9B9184]/30"
                  )}
                >
                  {num}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function NavItem({ label, active, onClick }: { label: string, active?: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[60px] py-2 transition-colors"
      style={{ color: active ? 'var(--color-primary, #006e1c)' : 'var(--color-on-surface-variant, #3f4a3c)' }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full transition-all"
        style={{ backgroundColor: active ? 'var(--color-primary, #006e1c)' : 'transparent' }}
      />
      <span className="text-[10px] font-light tracking-wide">{label}</span>
    </button>
  );
}

