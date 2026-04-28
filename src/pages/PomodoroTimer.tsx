import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, HelpCircle, BarChart3, ChevronDown, Play, Pause, RotateCcw, ListChecks, Calendar, FileText, ClipboardList, MoreHorizontal, X, Plus, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { cn } from '../lib/utils';

export function PomodoroTimer() {
  const navigate = useNavigate();
  const { tasks } = useFamily();
  const [status, setStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [mode, setMode] = useState<'countdown' | 'countup'>('countdown');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [progress, setProgress] = useState(100);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Modal states
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTaskSelectorOpen, setIsTaskSelectorOpen] = useState(false);
  const [isDurationSelectorOpen, setIsDurationSelectorOpen] = useState(false);
  const [tempDuration, setTempDuration] = useState(25);

  const durationList = Array.from({ length: 60 }, (_, i) => i + 1);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        setProgress((timeLeft - 1) / (durationMinutes * 60) * 100);
      }, 1000);
    } else if (timeLeft === 0) {
      setStatus('idle');
    }
    return () => clearInterval(interval);
  }, [status, timeLeft, durationMinutes]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setStatus('running');
  const handlePause = () => setStatus('paused');
  const handleResume = () => setStatus('running');
  const handleTerminate = () => {
    setStatus('idle');
    setTimeLeft(durationMinutes * 60);
    setProgress(100);
  };
  const handleReset = () => handleTerminate();

  const handleConfirmDuration = () => {
    setDurationMinutes(tempDuration);
    setTimeLeft(tempDuration * 60);
    setProgress(100);
    setIsDurationSelectorOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant/40 hover:bg-surface-container transition-colors"
          >
            <HelpCircle size={22} strokeWidth={2.5} />
          </button>
          <span className="text-xs font-black text-on-surface-variant/30 tracking-widest">番茄工作法</span>
        </div>
        <button className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant/40 hover:bg-surface-container transition-colors">
          <BarChart3 size={22} strokeWidth={2.5} />
        </button>
      </header>

      {/* Mode Switcher */}
      <div className="flex justify-center mt-2">
        <div className="bg-[#F1F1F1] p-1 rounded-full flex gap-1">
          <button 
            onClick={() => setMode('countdown')}
            className={cn(
              "px-8 py-2 rounded-full text-xs font-black transition-all",
              mode === 'countdown' ? "bg-white shadow-sm text-on-surface" : "text-on-surface-variant/30"
            )}
          >
            倒计时
          </button>
          <button 
            onClick={() => setMode('countup')}
            className={cn(
              "px-8 py-2 rounded-full text-xs font-black transition-all",
              mode === 'countup' ? "bg-white shadow-sm text-on-surface" : "text-on-surface-variant/30"
            )}
          >
            正计时
          </button>
        </div>
      </div>

      {/* Task Selector Button */}
      <div className="flex justify-center mt-4">
        <button 
          onClick={() => setIsTaskSelectorOpen(true)}
          className="flex items-center gap-2 px-6 py-2 rounded-full border border-outline-variant/10 text-on-surface-variant font-black active:scale-95 transition-all bg-white/50"
        >
          <span className="text-sm">{selectedTask || '选择任务'}</span>
          <ChevronDown size={14} className="opacity-40" />
        </button>
      </div>

      {/* Timer Circle */}
      <div className="flex-1 flex items-center justify-center relative py-2">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
          {/* Background Ring */}
          <div className="absolute inset-0 rounded-full border-[8px] sm:border-[10px] border-[#F1F1F1]" />
          
          <button 
            onClick={() => status === 'idle' && setIsDurationSelectorOpen(true)}
            disabled={status !== 'idle'}
            className={cn(
              "text-6xl sm:text-[5.5rem] font-black text-[#1D1B20] tracking-tighter transition-all active:opacity-60",
              status !== 'idle' ? "cursor-default" : "cursor-pointer"
            )}
          >
            {formatTime(timeLeft)}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="px-12 pb-24 sm:pb-28 flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          {status === 'idle' ? (
            <motion.button 
              key="start"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={handleStart}
              className="w-full max-w-[200px] py-4 rounded-full font-black text-white text-lg bg-[#76A08A] shadow-xl shadow-emerald-100 active:scale-95 transition-all"
            >
              开始
            </motion.button>
          ) : status === 'running' ? (
            <motion.button 
              key="pause"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={handlePause}
              className="w-full max-w-[200px] py-4 rounded-full font-black text-white text-lg bg-gradient-to-b from-[#FFA726] to-[#FB8C00] shadow-xl shadow-orange-500/30 active:scale-95 transition-all"
            >
              休息一下
            </motion.button>
          ) : (
            <motion.div 
              key="paused-actions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex gap-4 w-full max-w-[280px]"
            >
              <button 
                onClick={handleTerminate}
                className="flex-1 py-4 rounded-full font-black text-on-surface-variant/60 bg-surface-container-highest border border-outline-variant/10 active:scale-95 transition-all"
              >
                终止
              </button>
              <button 
                onClick={handleResume}
                className="flex-1 py-4 rounded-full font-black text-white bg-[#76A08A] shadow-xl shadow-emerald-100 active:scale-95 transition-all"
              >
                继续
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={handleReset}
          className="text-on-surface-variant/30 font-black text-xs tracking-widest flex items-center gap-1.5 active:opacity-60 transition-opacity"
        >
          <RotateCcw size={14} strokeWidth={2.5} />
          重置时钟
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

      {/* Bottom Navigation (Standard style from screenshot) */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-outline-variant/5 flex items-center justify-around px-2 z-50">
        <NavItem icon={ListChecks} label="清单" />
        <NavItem icon={Calendar} label="日历" />
        <NavItem icon={FileText} label="复盘&打印" active />
        <NavItem icon={ClipboardList} label="笔记" />
        <NavItem icon={MoreHorizontal} label="更多" />
      </nav>
    </div>
  );
}

function HelpModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-[#76A08A]">
                <Info size={24} />
                <h3 className="text-xl font-black text-on-surface">番茄工作法</h3>
              </div>
              <button onClick={onClose} className="p-2 text-on-surface-variant/40"><X size={20} /></button>
            </div>
            <div className="space-y-4 text-on-surface-variant/80 font-bold leading-relaxed text-sm">
              <p>番茄工作法是一种简单易行的管理方法：</p>
              <div className="space-y-2 pl-4 border-l-4 border-[#76A08A]/20">
                <p>1. 选择一个任务</p>
                <p>2. 设定25分钟计时器</p>
                <p>3. 专注工作，直到闹钟响起</p>
                <p>4. 休息5分钟</p>
                <p>5. 每四个番茄时间后，长时休息25分钟</p>
              </div>
              <p className="pt-2 text-xs italic">起源：弗朗西斯科·西里洛在1980年代后期发明。</p>
            </div>
            <button 
              onClick={onClose}
              className="w-full py-4 bg-[#76A08A] text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all outline-none"
            >
              我知道了
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function TaskSelectorModal({ isOpen, onClose, onSelect, tasks, onNewTask }: { isOpen: boolean, onClose: () => void, onSelect: (name: string) => void, tasks: any[], onNewTask: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-0">
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="w-full bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] sm:mb-6 sm:mx-4 max-w-lg overflow-hidden flex flex-col h-[70vh] shadow-2xl"
          >
            <div className="relative p-6 border-b border-outline-variant/10 text-center">
              <h3 className="font-black text-lg">选择任务</h3>
              <button 
                onClick={onClose}
                className="absolute right-6 top-1/2 -translate-y-1/2 p-2 text-on-surface-variant/40 hover:bg-surface-container rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
              {tasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-4">
                  <div className="w-24 h-32 bg-gradient-to-b from-[#76A08A]/10 to-transparent rounded-lg border-2 border-[#76A08A]/20 flex flex-col p-4 gap-2">
                    <div className="w-full h-2 bg-[#76A08A]/20 rounded-full" />
                    <div className="w-2/3 h-2 bg-[#76A08A]/20 rounded-full" />
                    <div className="w-full h-2 bg-[#76A08A]/20 rounded-full" />
                  </div>
                  <p className="font-bold">暂无任务清单</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <button 
                    key={task.id}
                    onClick={() => { onSelect(task.title); onClose(); }}
                    className="w-full p-5 bg-[#F1F1F1] rounded-2xl text-left font-black text-on-surface hover:bg-[#76A08A]/5 transition-colors border border-transparent active:border-[#76A08A]/20"
                  >
                    {task.title}
                  </button>
                ))
              )}
            </div>
            <div className="p-6 bg-[#FDFCF9] border-t border-outline-variant/10">
              <button onClick={onNewTask} className="w-full py-4 flex items-center justify-center gap-2 text-[#76A08A] font-black active:scale-95 transition-all">
                <Plus size={20} />
                新建任务
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
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-4 flex justify-between items-center px-8 pt-6">
              <button onClick={onClose} className="text-on-surface-variant/40 font-black">取消</button>
              <button onClick={onConfirm} className="text-[#76A08A] font-black">确定</button>
            </div>
            
            <div className="h-64 overflow-y-auto snap-y snap-mandatory py-20 px-8 no-scrollbar scroll-smooth">
              {durationList.map((num) => (
                <div 
                  key={num}
                  onClick={() => onValueChange(num)}
                  className={cn(
                    "h-12 flex items-center justify-center snap-center text-2xl font-black transition-all cursor-pointer",
                    tempValue === num ? "text-on-surface bg-[#F1F1F1] rounded-xl" : "text-on-surface-variant/20 scale-90"
                  )}
                >
                  {num}
                </div>
              ))}
            </div>
            
            <div className="p-4 text-center text-[10px] text-on-surface-variant/20 font-black pb-8 tracking-widest">
              分钟
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function NavItem({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center gap-1 min-w-[64px] transition-colors",
      active ? "text-[#76A08A]" : "text-on-surface-variant/40"
    )}>
      <Icon size={24} strokeWidth={active ? 2.5 : 2} />
      <span className="text-[10px] font-black">{label}</span>
    </div>
  );
}
