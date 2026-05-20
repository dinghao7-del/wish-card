import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, HelpCircle, BarChart3, RotateCcw, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { BottomNav } from '../components/BottomNav';
import { getCreationTemplateRoute } from '../lib/createFlowRoutes';

// ===== 线上正确版本精确参数 =====
const RING_RADIUS = 149;          // 圆环半径
const RING_STROKE = 8;            // 环粗细
const VIEWBOX_SIZE = 400;         // SVG viewBox 尺寸
const CENTER = VIEWBOX_SIZE / 2;  // 圆心坐标
const BG_STROKE_COLOR = 'var(--color-surface-container-high)';
const FG_STROKE_COLOR = 'var(--color-primary)';
const TIME_FONT_SIZE = '96px';    // 时间字号（固定px，不被rem覆盖）

export function PomodoroTimer() {
  const navigate = useNavigate();
  const { tasks } = useFamily();
  const { t } = useTranslation();

  // 核心状态
  const [countMode, setCountMode] = useState<'countdown' | 'countup'>('countdown');
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0); // 正计时用（秒）
  const [progress, setProgress] = useState(100);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [initialTotalSeconds, setInitialTotalSeconds] = useState(25 * 60); // 启动时锁定的总秒数

  // Modal states
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);

  // 音频引用
  const tickAudioRef = useRef<AudioContext | null>(null);
  const completeAudioRef = useRef<AudioContext | null>(null);

  // 计算常量（使用锁定的初始总秒数）
  const circumference = RING_RADIUS * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // 计时器逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'running') {
      interval = setInterval(() => {
        if (countMode === 'countdown') {
          setSeconds(prev => {
            if (prev > 0) return prev - 1;
            // 秒数归零，处理分钟
            setMinutes(mins => {
              if (mins > 0) {
                setSeconds(59);
                return mins - 1;
              }
              // 完全归零
              handleComplete();
              return 0;
            });
            return 0;
          });
        } else {
          setElapsedTime(prev => prev + 1);
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [status, countMode]);

  // 进度更新（使用锁定的初始总秒数）
  useEffect(() => {
    if (countMode === 'countdown') {
      const current = minutes * 60 + seconds;
      setProgress((current / initialTotalSeconds) * 100);
    } else {
      setProgress(100);
    }
  }, [minutes, seconds, countMode, initialTotalSeconds]);

  // 最后10秒滴答声
  useEffect(() => {
    if (status === 'running' && countMode === 'countdown' && minutes === 0 && seconds <= 10 && seconds > 0) {
      playTickSound();
    }
  }, [seconds, status, countMode, minutes]);

  // 播放滴答声
  const playTickSound = () => {
    try {
      if (!tickAudioRef.current) {
        tickAudioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = tickAudioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) { /* ignore */ }
  };

  // 播放完成音效
  const playCompletionSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    } catch (e) { /* ignore */ }
  };

  // 完成
  const handleComplete = () => {
    setStatus('idle');
    playCompletionSound();
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  // 格式化时间
  const formatTime = () => {
    if (countMode === 'countdown') {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    // 正计时
    const hrs = Math.floor(elapsedTime / 3600);
    const mins = Math.floor((elapsedTime % 3600) / 60);
    const secs = elapsedTime % 60;
    return hrs > 0
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 是否已完成（倒计时模式且时间为0）
  const isCompleted = countMode === 'countdown' && minutes === 0 && seconds === 0 && status === 'idle';

  // 操作
  const handleStart = () => {
    if (countMode === 'countdown' && minutes === 0 && seconds === 0) return;
    // 启动时锁定初始总秒数，防止倒计时中 totalSeconds 随 minutes 变化
    setInitialTotalSeconds(minutes * 60);
    setStatus('running');
  };
  const handlePause = () => setStatus('paused');
  const handleResume = () => setStatus('running');
  const handleTerminate = () => {
    setStatus('idle');
    setMinutes(25);
    setSeconds(0);
    setElapsedTime(0);
    setProgress(100);
    setInitialTotalSeconds(25 * 60); // 重置总秒数
  };
  const handleReset = () => {
    handleTerminate();
    setSelectedTask(null);
  };
  const handleModeChange = (mode: 'countdown' | 'countup') => {
    if (status !== 'idle') return;
    setCountMode(mode);
    setMinutes(25);
    setSeconds(0);
    setElapsedTime(0);
    setProgress(100);
    setInitialTotalSeconds(25 * 60);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* ===== 庆祝动画 ===== */}
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
                animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                transition={{ duration: 1, times: [0, 0.5, 1], repeat: 2 }}
                className="w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center bg-primary"
              >
                <CheckCircle2 size={64} className="text-white" strokeWidth={2.5} />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-black text-on-surface"
              >
                {t('pomodoro.completed_one', { defaultValue: '完成一个番茄钟！🎉' })}
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== TopAppBar：返回按钮 + 番茄工作法 + 帮助/图表 ===== */}
      <TopAppBar
        title={t('pomodoro.technique', { defaultValue: '番茄工作法' })}
        showBack
        backTo="/"
        rightContent={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <HelpCircle size={20} strokeWidth={1.5} />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface transition-colors">
              <BarChart3 size={20} strokeWidth={1.5} />
            </button>
          </div>
        }
      />

      {/* ===== 倒计时/正计时 切换器 ===== */}
      <div className="flex justify-center px-5 mb-3">
        <div className="inline-flex items-center gap-0.5">
          <button
            onClick={() => handleModeChange('countdown')}
            className={cn(
              "px-7 py-1.5 rounded-full text-[13px] font-normal transition-all tracking-wider",
              countMode === 'countdown'
                ? "bg-white text-on-surface shadow-sm"
                : "text-on-surface-variant/45 hover:text-on-surface"
            )}
          >
            {t('pomodoro.countdown', { defaultValue: '倒计时' })}
          </button>
          <button
            onClick={() => handleModeChange('countup')}
            className={cn(
              "px-7 py-1.5 rounded-full text-[13px] font-normal transition-all tracking-wider",
              countMode === 'countup'
                ? "bg-white text-on-surface shadow-sm"
                : "text-on-surface-variant/45 hover:text-on-surface"
            )}
          >
            {t('pomodoro.countup', { defaultValue: '正计时' })}
          </button>
        </div>
      </div>

      {/* ===== 选择任务 ===== */}
      <button
        onClick={() => status === 'idle' && setIsTaskSelectorOpen(true)}
        disabled={status !== 'idle'}
        className={cn(
          "flex items-center gap-1 text-[13px] font-normal transition-all pb-0.5 mx-auto",
          selectedTask ? "text-primary" : "text-on-surface-variant",
          status !== 'idle' && "opacity-40"
        )}
      >
        {selectedTask || t('pomodoro.select_task', { defaultValue: '选择任务' })}
        <ChevronDown size={12} strokeWidth={1.5} className={cn("opacity-50")} />
      </button>

      {/* ===== 大圆环 + 时间显示 ===== */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div style={{ width: VIEWBOX_SIZE, height: VIEWBOX_SIZE, maxWidth: '100%', maxHeight: '100%' }}>
          <svg
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          >
            {/* 背景环 - 浅灰色粗环 */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RING_RADIUS}
              fill="transparent"
              stroke={BG_STROKE_COLOR}
              strokeWidth={RING_STROKE}
            />
            {/* 进度环 - 主题绿色，随时间收缩消失 */}
            {status !== 'idle' && (
              <motion.circle
                cx={CENTER}
                cy={CENTER}
                r={RING_RADIUS}
                fill="transparent"
                stroke={FG_STROKE_COLOR}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </svg>

          {/* 时间文字 - 超大粗体，绝对居中覆盖在圆环上 */}
          <div
            className="relative z-10 font-black tabular-nums select-none flex items-center justify-center"
            id="pomodoro-time"
            style={{
              color: 'var(--color-on-surface)',
              lineHeight: 1,
              letterSpacing: 'normal',
              marginTop: `-${VIEWBOX_SIZE}px`,
              height: VIEWBOX_SIZE,
            }}
          >
            <style>{`
              #pomodoro-time {
                font-size: 96px !important;
              }
            `}</style>
            {formatTime()}
          </div>
        </div>
      </div>

      {/* ===== 底部操作区 ===== */}
      <div
        className="flex flex-col items-center gap-3 pb-6 px-8"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <AnimatePresence mode="wait">
          {status === 'idle' ? (
            /* ----- 待机：开始按钮 ----- */
            <motion.button
              key="start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={handleStart}
              disabled={isCompleted}
              className={cn(
                "px-14 py-3.5 rounded-full text-white font-semibold text-base tracking-widest transition-all active:scale-97",
                isCompleted ? "bg-surface-container-high text-on-surface-variant/50" : "bg-primary"
              )}
            >
              {t('pomodoro.start', { defaultValue: '开始' })}
            </motion.button>
          ) : (
            /* ----- 运行中/暂停：结束 + 继续并排 ----- */
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              {/* 结束按钮 - 灰色填充 */}
              <button
                onClick={handleTerminate}
                className="px-8 py-2.5 rounded-full text-base font-medium transition-all active:scale-97 bg-surface-container text-on-surface-variant"
              >
                {t('pomodoro.end', { defaultValue: '结束' })}
              </button>
              {/* 继续/暂停按钮 - 绿色填充 */}
              <button
                onClick={status === 'paused' ? handleResume : handlePause}
                className="px-10 py-3 rounded-full text-white font-semibold text-base tracking-wide transition-all active:scale-97 bg-primary"
              >
                {status === 'paused'
                  ? t('pomodoro.continue', { defaultValue: '继续' })
                  : t('pomodoro.continue', { defaultValue: '继续' })
                }
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 重置链接 */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs font-light tracking-widest text-on-surface-variant/35 hover:text-on-surface-variant transition-colors mt-1"
        >
          <RotateCcw size={13} strokeWidth={1.5} />
          {t('pomodoro.reset', { defaultValue: '重置' })}
        </button>
      </div>

      {/* ===== Modals ===== */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <TaskSelectorModal
        isOpen={isTaskSelectorOpen}
        onClose={() => setIsTaskSelectorOpen(false)}
        onSelect={(taskName: string) => setSelectedTask(taskName)}
        tasks={tasks}
        onNewTask={() => { setIsTaskSelectorOpen(false); navigate(getCreationTemplateRoute('task')); }}
      />

      {/* ===== Bottom Navigation ===== */}
      <BottomNav />
    </div>
  );
}

/* ===== Help Modal ===== */
function HelpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-lg bg-surface rounded-t-3xl p-8 pb-[max(3rem,env(safe-area-inset-bottom,0px))] space-y-6 shadow-2xl max-h-[85svh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black tracking-wide text-on-surface">{t('pomodoro.technique', { defaultValue: '番茄工作法' })}</h3>
              <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-5 text-on-surface font-semibold leading-relaxed text-sm">
              <p>{t('pomodoro.help_intro', { defaultValue: '番茄工作法是一种时间管理方法。' })}</p>
              <div className="bg-surface-container-low rounded-xl p-4 text-xs text-on-surface-variant leading-relaxed space-y-2">
                <p className="font-black text-on-surface">{t('pomodoro.help_origin_title', { defaultValue: '—— 方法由来' })}</p>
                <p>{t('pomodoro.help_origin_detail', { defaultValue: '由意大利大学生弗朗西斯科·齐里洛于20世纪80年代末发明。' })}</p>
              </div>
              <div className="space-y-3 pl-4 border-l-2 border-outline-variant">
                <p className="text-xs text-on-surface-variant">01. {t('pomodoro.help_step1', { defaultValue: '选择一个任务' })}</p>
                <p className="text-xs text-on-surface-variant">02. {t('pomodoro.help_step2', { defaultValue: '设定25分钟' })}</p>
                <p className="text-xs text-on-surface-variant">03. {t('pomodoro.help_step3', { defaultValue: '专注工作' })}</p>
                <p className="text-xs text-on-surface-variant">04. {t('pomodoro.help_step4', { defaultValue: '休息5分钟' })}</p>
                <p className="text-xs text-on-surface-variant">05. {t('pomodoro.help_step5', { defaultValue: '每4个番茄钟长休息' })}</p>
              </div>
            </div>
            <button onClick={onClose} className="ui-primary-button w-full rounded-full tracking-widest">{t('pomodoro.got_it', { defaultValue: '明白了' })}</button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ===== Task Selector Modal ===== */
function TaskSelectorModal({ isOpen, onClose, onSelect, tasks, onNewTask }: {
  isOpen: boolean; onClose: () => void; onSelect: (name: string) => void; tasks: any[]; onNewTask: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-lg bg-surface rounded-t-3xl overflow-hidden flex flex-col h-[65svh] max-h-[85svh] shadow-2xl pb-[env(safe-area-inset-bottom,0px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <h3 className="text-base font-black tracking-wide text-on-surface">{t('pomodoro.select_task', { defaultValue: '选择任务' })}</h3>
              <button onClick={onClose} className="p-1 text-on-surface-variant"><X size={18} strokeWidth={1.5} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant gap-3 py-12">
                  <div className="text-4xl opacity-20">📝</div>
                  <p className="text-sm font-bold">{t('pomodoro.task_selector_no_tasks', { defaultValue: '暂无任务' })}</p>
                </div>
              ) : tasks.map((task: any) => (
                <button key={task.id} onClick={() => { onSelect(task.title); onClose(); }} className="w-full p-4 text-left text-sm font-bold text-on-surface hover:bg-surface-container-low rounded-xl">
                  {task.title}
                </button>
              ))}
            </div>
            <div className="p-6 border-t border-outline-variant/20">
              <button onClick={onNewTask} className="w-full py-3 text-sm font-black text-primary">+ {t('pomodoro.create_task', { defaultValue: '创建新任务' })}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
