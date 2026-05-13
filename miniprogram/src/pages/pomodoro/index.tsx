import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useRef } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import Icon from '@/components/Icon';
import { getLocalUser } from '@/utils/localUser';
import { isGuestMode, getGuestData } from '@/lib/guestData';
import { getFamilyTasks } from '@/utils/supabase';
import './index.scss';

// ===== 对齐 Web PomodoroTimer.tsx (663行) 核心逻辑 =====

/** 番茄钟阶段 */
type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

/** 阶段配置 — 对齐 Web PHASE_CONFIG */
const PHASE_CONFIG: Record<PomodoroPhase, { label: string; duration: number; color: string; msg: string }> = {
  work:       { label: '工作聚焦', duration: 25, color: '#006e1c',  msg: '保持专注，你很棒！' },
  shortBreak: { label: '短休息',   duration: 5,  color: '#686000',  msg: '放松一下眼睛~' },
  longBreak:  { label: '长休息',   duration: 15, color: '#7a5649',  msg: '好好休息，走动一下吧' },
};

export default function Pomodoro() {
  const router = useRouter();

  // ===== 核心状态（对齐 Web）=====
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [progress, setProgress] = useState(100);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  // 弹窗状态（对齐 Web 3个Modal）
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
  const [isDurationSelectorOpen, setIsDurationSelectorOpen] = useState(false);
  const [tempDuration, setTempDuration] = useState(25);

  // 庆祝动画
  const [showCelebration, setShowCelebration] = useState(false);

  // 任务列表（对齐 Web FamilyContext.tasks）
  const [tasks, setTasks] = useState<any[]>([]);

  const intervalRef = useRef<any>(null);
  const durationList = Array.from({ length: 60 }, (_, i) => i + 1);

  // 获取当前阶段配置
  const currentConfig = PHASE_CONFIG[currentPhase];
  const totalSeconds = currentConfig.duration * 60;

  // ===== 任务数据加载（对齐 Web）======
  useEffect(() => {
    loadTasksForSelector();
  }, []);

  const loadTasksForSelector = async () => {
    try {
      const localUser = getLocalUser();
      if (!localUser || localUser.id?.startsWith('guest-') || localUser.id?.startsWith('demo-') || isGuestMode()) {
        const guestData = getGuestData();
        setTasks(guestData.tasks?.filter((t: any) => !t.is_habit && ['pending', 'reviewing'].includes(t.status)) || []);
        return;
      }
      if (localUser.family_id && localUser.family_id !== 'guest-family') {
        const tasksData = await getFamilyTasks(localUser.family_id);
        setTasks(tasksData.filter((t: any) => !t.is_habit && ['pending', 'reviewing'].includes(t.status)) || []);
      }
    } catch (error) {
      console.error('[Pomodoro] 加载任务失败:', error);
      setTasks([]);
    }
  };

  // ===== 计时器逻辑（对齐 Web useEffect）======
  useEffect(() => {
    if (status !== 'running') return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handlePhaseComplete();
          return 0;
        }
        const newTime = prev - 1;
        setProgress((newTime / totalSeconds) * 100);

        // 最后10秒滴答震动（对齐 Web playTickSound）
        if (newTime <= 10 && newTime > 0) {
          Taro.vibrateShort({ type: 'light' });
        }
        return newTime;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status, totalSeconds]);

  // ===== 阶段完成处理（对齐 Web：自动切换下一阶段）======
  const handlePhaseComplete = () => {
    setStatus('idle');
    playCompletionSound();
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);

    if (currentPhase === 'work') {
      // 工作 → 判断第几个番茄钟
      const newCount = completedPomodoros + 1;
      setCompletedPomodoros(newCount);
      if ((newCount % 4) === 0) {
        // 每4个番茄钟→长休息
        switchPhase('longBreak');
      } else {
        switchPhase('shortBreak');
      }
    } else {
      // 休息结束→回到工作
      switchPhase('work');
    }
  };

  /** 切换阶段 */
  const switchPhase = (phase: PomodoroPhase) => {
    setCurrentPhase(phase);
    setTimeLeft(PHASE_CONFIG[phase].duration * 60);
    setProgress(100);
    setStatus('idle');
  };

  /** 完成和弦音效 */
  const playCompletionSound = () => {
    try {
      console.log('[Pomodoro] 播放完成和弦...');
      Taro.vibrateShort({ type: 'heavy' });
      setTimeout(() => Taro.vibrateShort({ type: 'light' }), 150);
      setTimeout(() => Taro.vibrateShort({ type: 'medium' }), 300);
    } catch (_) {
      Taro.vibrateShort({ type: 'heavy' });
    }
  };

  /** 格式化显示时间 */
  const displayTime = () => {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const strokeDashoffset = 2 * Math.PI * 149 - (progress / 100) * (2 * Math.PI * 149);

  /** 开始计时 */
  const handleStart = () => {
    if (!(timeLeft === 0 && status === 'idle')) setStatus('running');
  };

  /** 自定义时长确认 */
  const confirmDuration = () => {
    // 仅在工作阶段允许自定义
    const newTotal = tempDuration * 60;
    setTimeLeft(newTotal);
    setProgress(100);
    setIsDurationSelectorOpen(false);
    // 同时更新工作阶段默认时长（不影响短休/长休）
    if (currentPhase === 'work') {
      PHASE_CONFIG.work.duration = tempDuration;
    }
  };

  return (
    <View className="po-page">
      {/* ===== 庆祝动画（对齐 Web AnimatePresence）===== */}
      {showCelebration && (
        <View className="po-celebration">
          <View className="po-celebration-icon">✓</View>
          <Text className="po-celebration-text">
            {currentPhase === 'work' ? '完成一个番茄钟！🎉' : '休息结束！💪'}
          </Text>
        </View>
      )}

      {/* ===== Header（对齐 Web：左帮助/中标题/右番茄计数）===== */}
      <View className="po-header">
        <View className="po-header-btn" onClick={() => setIsHelpOpen(true)}>
          <Icon name="helpCircle" size={40} color="#999999" />
        </View>
        <Text className="po-header-title">番茄工作法</Text>
        <View className="po-pomodoro-count">
          <Icon name="tomato" size={28} color="#e53935" />
          <Text className="po-count-text">{completedPomodoros}</Text>
        </View>
      </View>

      {/* ===== 阶段指示器（对齐 Web 三阶段Tab）===== */}
      <View className="po-phase-tabs">
        {(Object.keys(PHASE_CONFIG) as PomodoroPhase[]).map((phase) => (
          <View
            key={phase}
            className={`po-phase-tab ${currentPhase === phase ? 'active' : ''}`}
            style={{ '--phase-color': PHASE_CONFIG[phase].color } as any}
            onClick={() => status === 'idle' && switchPhase(phase)}
          >
            <Text className={`po-phase-tab-text ${currentPhase === phase ? 'active' : ''}`}>
              {PHASE_CONFIG[phase].label}
            </Text>
            {currentPhase === phase && (
              <View
                className="po-phase-indicator"
                style={{ backgroundColor: PHASE_CONFIG[phase].color }}
              />
            )}
          </View>
        ))}
      </View>

      {/* ===== 当前阶段消息 ===== */}
      <View className="po-phase-msg">
        <Text style={{ color: currentConfig.color }}>{currentConfig.msg}</Text>
      </View>

      {/* ===== 任务选择器（仅工作阶段显示，对齐 Web）===== */}
      {currentPhase === 'work' && (
        <View className="po-task-selector" onClick={() => status === 'idle' && setIsTaskSelectorOpen(true)}>
          <Text className={`po-task-text ${selectedTask ? 'selected' : ''} ${status !== 'idle' ? 'disabled' : ''}`}>
            {selectedTask || '选择任务'}
          </Text>
          <Icon name="chevronDown" size={24} color={selectedTask ? '#006e1c' : '#666666'} />
        </View>
      )}

      {/* ===== 计时器圆环（CSS conic-gradient 对齐 Web SVG circle）===== */}
      <View className="po-timer-circle-wrap" onClick={() => status === 'idle' && setIsDurationSelectorOpen(true)}>
        {/* 外层圆环背景 */}
        <View className="po-ring-bg" />
        {/* 进度圆环 — 颜色随阶段变化 */}
        <View
          className="po-ring-progress"
          style={{
            ['--ring-deg' as string]: `${(progress / 100) * 360}deg`,
            ['--ring-color' as string]: currentConfig.color,
            background: `conic-gradient(
              transparent 0deg,
              transparent calc(var(--ring-deg, 0deg)),
              ${currentConfig.color} calc(var(--ring-deg, 0deg) + 0.5deg),
              ${currentConfig.color} 360deg
            )`,
          }}
        />
        {/* 时间显示 */}
        <View className="po-timer-display">
          <Text className="po-time-text" style={{ color: progress < 20 ? currentConfig.color : '#1a1a1a' }}>
            {displayTime()}
          </Text>
          <Text className="po-time-hint" style={{ color: currentConfig.color, opacity: 0.6 }}>
            点击修改时长
          </Text>
        </View>
      </View>

      {/* ===== 操作按钮区（颜色随阶段变化）===== */}
      <View className="po-actions">
        {status === 'idle' && (
          <View
            className="po-btn-main-wrap"
            style={{ backgroundColor: currentConfig.color }}
            onClick={handleStart}
          >
            <Text className="po-btn-main-text">
              {currentPhase === 'work' ? '开始专注' : '开始休息'}
            </Text>
          </View>
        )}
        {status === 'running' && (
          <View
            className="po-btn-main-wrap running"
            style={{ backgroundColor: currentConfig.color }}
            onClick={() => setStatus('paused')}
          >
            <Text className="po-btn-main-text">暂停</Text>
          </View>
        )}
        {status === 'paused' && (
          <View className="po-btn-paused-row">
            <View className="po-btn-half terminate" onClick={() => {
              setStatus('idle');
              setTimeLeft(currentConfig.duration * 60);
              setProgress(100);
            }}>
              <Text className="po-btn-half-text">终止</Text>
            </View>
            <View
              className="po-btn-half continue"
              style={{ backgroundColor: currentConfig.color }}
              onClick={() => setStatus('running')}
            >
              <Text className="po-btn-half-text">继续</Text>
            </View>
          </View>
        )}

        {/* 重置时钟 */}
        <View className="po-reset-link" onClick={() => {
          setStatus('idle');
          setTimeLeft(currentConfig.duration * 60);
          setProgress(100);
        }}>
          <Icon name="rotate-ccw" size={28} color="#999999" />
          <Text className="po-reset-text">重置时钟</Text>
        </View>

        {/* 番茄钟计数提示 */}
        {completedPomodoros > 0 && (
          <Text className="po-stats-hint">
            已完成 {completedPomodoros} 个番茄钟 · 下次长休息还需 {4 - (completedPomodoros % 4)} 个
          </Text>
        )}
      </View>

      {/* ===== 帮助弹窗（对齐 Web HelpModal 底部滑出）===== */}
      {isHelpOpen && (
        <View className="po-modal-mask" onClick={() => setIsHelpOpen(false)}>
          <View className="po-modal-content" onClick={(e) => e.stopPropagation()}>
            <View className="po-modal-header">
              <Text className="po-modal-title">番茄工作法</Text>
              <View className="po-modal-close" onClick={() => setIsHelpOpen(false)}>
                <Icon name="x" size={40} color="#666" />
              </View>
            </View>
            <ScrollView scrollY className="po-modal-body-wrap">
              <View className="po-modal-body">
                <Text className="po-modal-intro">番茄工作法是一种时间管理方法，帮助你更高效地完成工作。</Text>
                <View className="po-modal-card">
                  <Text className="po-modal-card-title">—— 方法由来</Text>
                  <Text className="po-modal-card-detail">由意大利大学生弗朗西斯科·齐里洛于20世纪80年代末发明。使用厨房定时器（形状像番茄）来追踪学习时间，因此得名"番茄工作法"。</Text>
                </View>
                <View className="po-steps-grid">
                  <View className="po-step-card"><Text className="po-step-num">01</Text><Text className="po-step-desc">选择一个任务</Text></View>
                  <View className="po-step-card"><Text className="po-step-num">02</Text><Text className="po-step-desc">设为25分钟</Text></View>
                  <View className="po-step-card"><Text className="po-step-num">03</Text><Text className="po-step-desc">专注到响铃</Text></View>
                  <View className="po-step-card"><Text className="po-step-num">04</Text><Text className="po-step-desc">休息5分钟</Text></View>
                  <View className="po-step-card po-step-card-wide"><Text className="po-step-num">05</Text><Text className="po-step-desc">每4个番茄后长休15分钟</Text></View>
                </View>
                <View className="po-modal-card" style={{ background: 'rgba(0,110,28,0.06)' }}>
                  <Text className="po-modal-card-title">三阶段说明</Text>
                  <Text className="po-modal-card-detail">
                    {"\n"}🟢 工作聚焦 (25min)：专注完成选定任务{"\n"}
                    🟡 短休息 (5min)：放松眼睛、喝水、伸展{"\n"}
                    🟤 长休息 (15min)：每4个番茄后，走动一下
                  </Text>
                </View>
              </View>
            </ScrollView>
            <View className="po-modal-footer" onClick={() => setIsHelpOpen(false)}>
              <Text className="po-modal-footer-text">明白了</Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== 任务选择器弹窗（对齐 Web TaskSelectorModal）===== */}
      {isTaskSelectorOpen && (
        <View className="po-modal-mask" onClick={() => setIsTaskSelectorOpen(false)}>
          <View className="po-modal-content po-task-modal" onClick={(e) => e.stopPropagation()}>
            <View className="po-modal-header">
              <Text className="po-modal-title">选择任务</Text>
              <View className="po-modal-close" onClick={() => setIsTaskSelectorOpen(false)}>
                <Icon name="x" size={36} color="#666" />
              </View>
            </View>
            <ScrollView scrollY className="po-task-list">
              {tasks.length === 0 ? (
                <View className="po-task-empty">
                  <Text className="po-task-empty-icon">📝</Text>
                  <Text className="po-task-empty-text">暂无待完成任务</Text>
                </View>
              ) : (
                tasks.map((task: any) => (
                  <View
                    key={task.id}
                    className="po-task-item"
                    onClick={() => {
                      setSelectedTask(task.title);
                      setIsTaskSelectorOpen(false);
                    }}
                  >
                    <View className={`po-task-check ${selectedTask === task.title ? 'checked' : ''}`}>
                      {selectedTask === task.title && <Icon name="check" size={16} color="#fff" />}
                    </View>
                    <Text className="po-task-item-text">{task.title}</Text>
                    <Text className="po-task-stars">{task.reward_stars || 0}⭐</Text>
                  </View>
                ))
              )}
            </ScrollView>
            <View
              className="po-modal-footer po-task-footer"
              onClick={() => {
                setIsTaskSelectorOpen(false);
                Taro.navigateTo({ url: '/pages/tasks/create/index' });
              }}
            >
              <Text className="po-new-task-text">+ 创建新任务</Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== 时长选择器弹窗（新增！对齐 Web DurationSelectorModal）===== */}
      {isDurationSelectorOpen && (
        <View className="po-modal-mask" onClick={() => setIsDurationSelectorOpen(false)}>
          <View className="po-modal-content po-duration-modal" onClick={(e) => e.stopPropagation()}>
            <View className="po-modal-header">
              <Text className="po-modal-title">选择时长</Text>
              <View className="po-modal-close" onClick={() => setIsDurationSelectorOpen(false)}>
                <Icon name="x" size={36} color="#666" />
              </View>
            </View>
            <View className="po-duration-body">
              <Text className="po-duration-current">{tempDuration} 分钟</Text>
              {/* 快捷按钮 */}
              <View className="po-duration-shortcuts">
                {[15, 25, 30, 45, 60].map((d) => (
                  <View
                    key={d}
                    className={`po-sc-btn ${tempDuration === d ? 'active' : ''}`}
                    style={{ '--active-color': currentConfig.color } as any}
                    onClick={() => setTempDuration(d)}
                  >
                    <Text className={`po-sc-text ${tempDuration === d ? 'active' : ''}`}>{d}分</Text>
                  </View>
                ))}
              </View>
              {/* 滑块式数字选择（小程序替代滚轮Picker）*/}
              <View className="po-duration-slider-row">
                <View className="po-ds-btn" onClick={() => setTempDuration(Math.max(1, tempDuration - 1))}>
                  <Icon name="minus" size={28} color="#666" />
                </View>
                <View className="po-ds-display">
                  <input
                    className="po-ds-input"
                    type="number"
                    value={tempDuration}
                    onChange={(e: any) => {
                      const v = parseInt(e.detail.value) || 1;
                      setTempDuration(Math.min(60, Math.max(1, v)));
                    }}
                  />
                  <Text className="po-ds-unit">分钟</Text>
                </View>
                <View className="po-ds-btn" onClick={() => setTempDuration(Math.min(60, tempDuration + 1))}>
                  <Icon name="plus" size={28} color="#666" />
                </View>
              </View>
            </View>
            <View className="po-modal-footer po-dur-footer" onClick={confirmDuration}>
              <Text className="po-modal-footer-text" style={{ background: currentConfig.color }}>确认</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
