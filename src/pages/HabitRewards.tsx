import React, { useState } from 'react';
import { Star, ChevronLeft, MoreHorizontal, Plus, ChevronRight, Trophy, Ban, Globe, Edit, Trash2, CheckCircle2, Clock, AlertCircle, XCircle, Mic, Settings } from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { TaskCard } from '../components/TaskCard';
import { AISmartTaskDialog } from '../components/AISmartTaskDialog';
import { TextAvatar } from '../components/TextAvatar';

export function HabitRewards() {
  const { tasks, currentUser, members, updateTask, addTask, deleteTask, stars, setIsUserSelectorOpen } = useFamily();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'reward' | 'penalty'>('reward');
  const [selectedHabit, setSelectedHabit] = useState<any>(null);
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitStars, setNewHabitStars] = useState(10);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);

  const [isDetailSettingsOpen, setIsDetailSettingsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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

  const getTaskIcon = (iconName: string, size = 32) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (IconComponent) return <IconComponent size={size} />;
    
    // Fallback based on typical habit types
    if (iconName === 'Star' && activeTab === 'penalty') return <LucideIcons.AlertCircle size={size} />;
    
    return <LucideIcons.Trophy size={size} />;
  };

  const [isCheckInSuccess, setIsCheckInSuccess] = useState(false);

  const handleIncrement = (habit: any) => {
    if (currentUser?.role !== 'parent') return;
    
    const newCount = (habit.currentCount || 0) + 1;
    updateTask({
      ...habit,
      currentCount: newCount,
      status: newCount >= (habit.targetCount || 1) ? 'completed' : habit.status
    });

    // Success animation sequence
    setIsCheckInSuccess(true);
    setTimeout(() => {
      setIsCheckInSuccess(false);
      setSelectedHabit(null);
    }, 1500);
  };

  const handleAddHabit = () => {
    if (!newHabitTitle.trim()) return;

    const newHabit: any = {
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
      <header className="flex justify-between items-center py-4 sticky top-0 bg-background/80 backdrop-blur-xl z-40 -mx-6 px-6">
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={() => setIsUserSelectorOpen(true)}
          >
            <TextAvatar src={currentUser?.avatar} name={currentUser?.name || '?'} size={40} className="border-2 border-surface dark:border-surface shadow-sm group-hover:shadow-md transition-all" />
          </div>
          
          <button 
            onClick={() => setIsAiDialogOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full border-2 border-primary/20 text-[#2E7D32] hover:bg-primary/5 active:scale-95 transition-all"
          >
            <Mic size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div 
            onClick={() => navigate('/history')}
            className="bg-surface-container-low backdrop-blur-sm py-1 sm:py-1.5 px-3 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 shadow-sm border border-outline-variant/10 cursor-pointer hover:bg-surface-container transition-colors active:scale-95"
          >
            <Star size={14} className="sm:size-[18px] text-[#FBC02D] fill-current" />
            <span className="font-black text-on-surface text-sm sm:text-base">{stars.toLocaleString()}</span>
          </div>
          <button 
            onClick={() => navigate('/settings/family')}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-primary hover:bg-surface-container transition-colors"
          >
            <Settings size={20} sm:size={22} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <AISmartTaskDialog 
        isOpen={isAiDialogOpen} 
        onClose={() => setIsAiDialogOpen(false)} 
      />

      {/* Tab Switcher and Add Button */}
      <div className="py-2 flex items-center justify-center gap-4">
          <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/10 w-full max-w-[240px]">
            <button 
              onClick={() => setActiveTab('reward')}
              className={cn(
                "flex-1 py-1.5 rounded-full text-xs font-black transition-all",
                activeTab === 'reward' ? "bg-surface text-on-surface shadow-sm" : "text-on-surface-variant/40"
              )}
            >
              奖励
            </button>
            <button 
              onClick={() => setActiveTab('penalty')}
              className={cn(
                "flex-1 py-1.5 rounded-full text-xs font-black transition-all",
                activeTab === 'penalty' ? "bg-surface text-red-500 shadow-sm" : "text-on-surface-variant/40"
              )}
            >
              惩罚
            </button>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/tasks/templates', { state: { fromMode: 'habit' } })}
            className="w-10 h-10 bg-[#006E1B] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all flex-shrink-0"
          >
            <Plus size={24} strokeWidth={3} />
          </motion.button>
        </div>

      {/* Habit List */}
      <div className="px-4 space-y-3 mt-6 max-w-[340px] mx-auto pb-4">
        {filteredHabits.length > 0 ? (
          <>
            {filteredHabits.map((habit, idx) => (
              <TaskCard 
                key={habit.id}
                task={habit}
                idx={idx}
                onClick={() => setSelectedHabit(habit)}
                isAdmin={currentUser?.role === 'parent'}
                isHabit={true}
              />
            ))}

          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant font-bold text-center">
            <Trophy size={64} className="mb-4 opacity-10" />
            <p className="text-on-surface/40">还没有{activeTab === 'reward' ? '积极习惯' : '消极习惯'}记录哦 🌱</p>
          </div>
        )}
      </div>

      {/* Habit Detail Modal */}
      <AnimatePresence>
        {selectedHabit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-background border border-outline-variant/10 rounded-[3rem] p-8 shadow-2xl relative"
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
                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#E8E7E0] z-40 py-1.5 overflow-hidden"
                      >
                        <button
                          onClick={() => {
                            setIsDetailSettingsOpen(false);
                            navigate(`/tasks/edit/${selectedHabit.id}`);
                          }}
                          className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-surface-container/50 transition-colors text-on-surface font-black text-sm text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Edit size={16} />
                          </div>
                          编辑任务
                        </button>
                        <button
                          onClick={() => {
                            setIsDeleteConfirmOpen(true);
                            setIsDetailSettingsOpen(false);
                          }}
                          className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-red-500 font-black text-sm text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
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
                      <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={32} />
                      </div>
                      <h3 className="text-xl font-black text-on-surface mb-2">确定删除吗？</h3>
                      <p className="text-on-surface-variant/60 text-sm font-bold mb-8">删除后历史记录将无法找回哦 🌱</p>
                      
                      <div className="flex flex-col gap-3">
                        <button 
                          onClick={handleDeleteHabit}
                          className="w-full py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-500/20 active:scale-95 transition-all text-center"
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

              <div className="flex flex-col items-center text-center mt-4">
                <AnimatePresence mode="wait">
                  {!isCheckInSuccess ? (
                    <motion.div
                      key="detail-content"
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="w-full flex flex-col items-center"
                    >
                      <div className="w-24 h-24 rounded-[2rem] bg-surface-container flex items-center justify-center text-primary mb-6 shadow-inner border-4 border-surface dark:border-surface">
                        {getTaskIcon(selectedHabit.icon, 48)}
                      </div>
                      
                      <h2 className="text-2xl font-black text-on-surface mb-2">{selectedHabit.title}</h2>
                      <p className="text-on-surface-variant/60 font-bold mb-8 px-4 leading-relaxed text-sm">
                        {selectedHabit.description || '保持良好的生活习惯，让每一天都充满活力和正能量。'}
                      </p>

                      <div className="grid grid-cols-2 gap-4 w-full mb-10">
                        <div className="bg-surface-container-low rounded-3xl p-4 border border-outline-variant/10 shadow-sm">
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">
                            {selectedHabit.rewardStars >= 0 ? '完成奖励' : '惩罚扣除'}
                          </p>
                          <div className={cn(
                            "flex items-center justify-center gap-2 font-black text-2xl",
                            selectedHabit.rewardStars >= 0 ? "text-primary" : "text-red-500"
                          )}>
                            <Star size={20} className="fill-current" />
                            <span>{Math.abs(selectedHabit.rewardStars)}</span>
                          </div>
                        </div>
                        <div className="bg-surface-container-low rounded-3xl p-4 border border-outline-variant/10 shadow-sm">
                          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1">当前次数</p>
                          <div className="text-on-surface font-black text-2xl">
                            {selectedHabit.currentCount || 0}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-4 w-full">
                        <button 
                          onClick={() => {
                            if (!isCheckInSuccess) setSelectedHabit(null);
                          }}
                          className="flex-1 py-4 px-6 rounded-[1.5rem] bg-surface-container font-black text-on-surface-variant active:scale-95 transition-transform whitespace-nowrap"
                        >
                          返回
                        </button>
                        {currentUser?.role === 'parent' && (
                          <button 
                            onClick={() => handleIncrement(selectedHabit)}
                            className="flex-[2] py-4 px-6 rounded-[1.5rem] bg-primary text-white font-black shadow-lg shadow-primary/20 hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            <Plus size={20} strokeWidth={3} />
                            打卡
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="success-content"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full flex flex-col items-center py-6"
                    >
                      <div className="relative">
                        {selectedHabit.rewardStars >= 0 ? (
                          <div className="w-32 h-32 bg-[#2E7D32] rounded-full flex items-center justify-center text-white shadow-xl">
                             <CheckCircle2 size={64} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center text-white shadow-xl">
                             <AlertCircle size={64} strokeWidth={3} />
                          </div>
                        )}
                        
                        {/* Confetti */}
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, opacity: 1, x: 0, y: 0 }}
                            animate={{ 
                              scale: [0, 1, 0.5, 0], 
                              opacity: [1, 1, 0.8, 0],
                              x: Math.cos(i * 30 * Math.PI / 180) * (selectedHabit.rewardStars >= 0 ? 100 : 80),
                              y: selectedHabit.rewardStars >= 0 
                                ? Math.sin(i * 30 * Math.PI / 180) * 100 
                                : Math.abs(Math.sin(i * 30 * Math.PI / 180)) * 150, // Fall down for punishment
                            }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="absolute top-1/2 left-1/2 -mt-2 -ml-2"
                          >
                            <Star 
                              className={cn(
                                "fill-current",
                                selectedHabit.rewardStars >= 0 ? "text-[#FBC02D]" : "text-red-400"
                              )} 
                              size={i % 2 === 0 ? 16 : 12} 
                            />
                          </motion.div>
                        ))}
                      </div>
                      <h3 className={cn(
                        "text-2xl font-black mt-8",
                        selectedHabit.rewardStars >= 0 ? "text-[#2E7D32]" : "text-red-500"
                      )}>
                        {selectedHabit.rewardStars >= 0 ? '打卡成功！' : '扣除警告！'}
                      </h3>
                      <p className="text-on-surface-variant font-bold mt-2">
                        {selectedHabit.rewardStars >= 0 ? '太棒了，继续保持 🌱' : '下次一定不要再犯了哦 ⚠️'}
                      </p>
                    </motion.div>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-background border border-outline-variant/10 rounded-[3rem] p-8 shadow-2xl"
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
                    <Star size={20} className="text-[#FBC02D] fill-current" />
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
                  className="flex-[2] py-4 px-6 rounded-2xl bg-[#2E7D32] text-white font-black shadow-lg"
                >
                  确认添加
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Spacer */}
      <div className="h-12" />
    </div>
  );
}
