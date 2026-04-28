import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ListTodo, 
  Star, 
  User, 
  Clock, 
  CheckCircle2, 
  ClipboardList, 
  Plus,
  Brush,
  Book,
  Home as HomeIcon,
  Flower2,
  ArrowLeft,
  CircleDashed,
  Mic,
  Settings,
  Edit,
  Trash2
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';
import { motion, AnimatePresence } from 'framer-motion';
import { TextAvatar } from '../components/TextAvatar';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Task as TaskType } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { TaskCard } from '../components/TaskCard';
import { AISmartTaskDialog } from '../components/AISmartTaskDialog';

const getTaskIcon = (iconName: string, size = 24) => {
  switch (iconName) {
    case 'Brush': return <Brush size={size} />;
    case 'Book': return <Book size={size} />;
    case 'Home': return <HomeIcon size={size} />;
    case 'Flower2': return <Flower2 size={size} />;
    default: return <ClipboardList size={size} />;
  }
};

export function Tasks() {
  const { tasks, members, completeTask, approveTask, currentUser, setIsUserSelectorOpen, deleteTask, stars } = useFamily();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(location.state?.mode || 'list');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(() => {
    if (location.state?.selectedTaskId) {
      return tasks.find(t => t.id === location.state.selectedTaskId) || null;
    }
    return null;
  });
  const [isDetailSettingsOpen, setIsDetailSettingsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const isAdmin = currentUser?.role === 'parent';

  // Use i18n for days
  const days = [
    t('common.days.sun', { defaultValue: '日' }),
    t('common.days.mon', { defaultValue: '一' }),
    t('common.days.tue', { defaultValue: '二' }),
    t('common.days.wed', { defaultValue: '三' }),
    t('common.days.thu', { defaultValue: '四' }),
    t('common.days.fri', { defaultValue: '五' }),
    t('common.days.sat', { defaultValue: '六' })
  ];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredTasks = viewMode === 'calendar' 
    ? tasks.filter(t => isSameDay(new Date(t.startTime), selectedDate) && !t.isHabit)
    : tasks.filter(t => !t.isHabit);

  const handleTaskClick = (task: TaskType) => {
    setSelectedTask(task);
  };

  const handleDeleteTask = () => {
    if (selectedTask) {
      deleteTask(selectedTask.id);
      setSelectedTask(null);
      setIsDeleteConfirmOpen(false);
      setIsDetailSettingsOpen(false);
    }
  };

  const handleComplete = (taskId: string) => {
    completeTask(taskId);
    setSelectedTask(null);
  };

  const handleApprove = (taskId: string) => {
    approveTask(taskId);
    setSelectedTask(null);
  };

  return (
    <div className="px-6 pb-24 animate-in fade-in slide-in-from-right-4 duration-500">
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

        <div className="flex bg-surface-container-high rounded-full p-1 shadow-inner">
          <button 
            onClick={() => setViewMode('list')}
            className={cn("p-1.5 rounded-full transition-all", viewMode === 'list' ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant/40")}
          >
            <ListTodo size={18} />
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={cn("p-1.5 rounded-full transition-all", viewMode === 'calendar' ? "bg-surface shadow-sm text-primary" : "text-on-surface-variant/40")}
          >
            <CalendarIcon size={18} />
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
        </div>
      </header>

      <AISmartTaskDialog 
        isOpen={isAiDialogOpen} 
        onClose={() => setIsAiDialogOpen(false)} 
      />

      {viewMode === 'calendar' ? (
        <section className="space-y-6">
          {/* Month Selector */}
          <div className="flex items-center justify-between px-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors">
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-bold tracking-tight">
              {format(currentMonth, i18n.language === 'zh-CN' ? 'yyyy年M月' : 'MMMM yyyy', { locale: i18n.language === 'zh-CN' ? zhCN : undefined })}
            </h2>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors">
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="bg-surface rounded-[2.5rem] p-6 shadow-sm border border-outline-variant/10">
            <div className="grid grid-cols-7 text-center mb-4 text-on-surface-variant/40 font-bold text-[10px] uppercase tracking-widest">
              {days.map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-4 gap-x-2">
              {calendarDays.map((day, idx) => (
                <button 
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 relative text-sm font-bold transition-all rounded-full h-10 w-10 mx-auto",
                    isSameDay(day, selectedDate) ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-surface-container",
                    isToday(day) && !isSameDay(day, selectedDate) && "text-primary font-black"
                  )}
                >
                  <span className="z-10">{format(day, 'd')}</span>
                  {tasks.some(t => isSameDay(new Date(t.startTime), day)) && (
                    <div className={cn("w-1 h-1 rounded-full absolute bottom-1", isSameDay(day, selectedDate) ? "bg-white" : "bg-primary")} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Day View */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold px-2">
              {format(selectedDate, i18n.language === 'zh-CN' ? 'M月d日 EEEE' : 'EEEE, MMMM d', { locale: i18n.language === 'zh-CN' ? zhCN : undefined })}
            </h3>
            <div className="space-y-3">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task, idx) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        idx={idx} 
                        onClick={() => handleTaskClick(task)} 
                        onCheckIn={(id) => navigate(`/check-in/${id}`)}
                        isAdmin={isAdmin}
                      />
                    ))
                  ) : (
                <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/40">
                  <ClipboardList size={40} className="mb-2 opacity-20" />
                  <p className="text-sm italic">{t('tasks.calendar.empty')}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-8">
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              <button 
                onClick={() => setFilter('all')}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                  filter === 'all' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-surface text-on-surface-variant shadow-sm"
                )}
              >
                {t('tasks.filter.all')}
              </button>
              <button 
                onClick={() => setFilter('pending')}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                  filter === 'pending' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-surface text-on-surface-variant shadow-sm"
                )}
              >
                {t('tasks.filter.pending')}
              </button>
              <button 
                onClick={() => setFilter('completed')}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                  filter === 'completed' ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-surface text-on-surface-variant shadow-sm"
                )}
              >
                {t('tasks.filter.completed')}
              </button>
            </div>

            <div className="space-y-8">
                {(filter === 'all' || filter === 'pending') && filteredTasks.some(t => t.status === 'reviewing') && (
                  <div>
                    <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                        <Clock size={20} className="text-orange-500" />
                        {t('tasks.status.reviewing')}
                    </h2>
                    <div className="space-y-3">
                        {filteredTasks.filter(t => t.status === 'reviewing').map((t, i) => (
                          <TaskCard 
                            key={t.id} 
                            task={t} 
                            idx={i} 
                            onClick={() => handleTaskClick(t)} 
                            onCheckIn={(id) => navigate(`/check-in/${id}`)}
                            isAdmin={isAdmin}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {(filter === 'all' || filter === 'pending') && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-black flex items-center gap-2">
                          <Clock size={20} className="text-primary" />
                          {t('tasks.status.pending')}
                      </h2>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => navigate('/tasks/templates')}
                        className="w-10 h-10 bg-[#006E1B] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all mr-1"
                      >
                        <Plus size={24} strokeWidth={3} />
                      </motion.button>
                    </div>
                    <div className="space-y-3">
                        {filteredTasks.filter(t => t.status === 'pending').map((t, i) => (
                        <TaskCard 
                          key={t.id} 
                          task={t} 
                          idx={i} 
                          onClick={() => handleTaskClick(t)} 
                          onCheckIn={(id) => navigate(`/check-in/${id}`)}
                          isAdmin={isAdmin}
                        />
                        ))}
                        {(filter === 'pending' && filteredTasks.filter(t => t.status === 'pending' || t.status === 'reviewing').length === 0) && (
                           <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/40">
                              <ClipboardList size={40} className="mb-2 opacity-20" />
                              <p className="text-sm italic">{t('tasks.list.empty_pending')}</p>
                           </div>
                        )}
                    </div>
                  </div>
                )}

                {(filter === 'all' || filter === 'completed') && (
                  <div>
                    <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                        <CheckCircle2 size={20} className="text-secondary" />
                        {t('tasks.status.completed')}
                    </h2>
                    <div className="space-y-3">
                        {filteredTasks.filter(t => t.status === 'completed').map((t, i) => (
                          <TaskCard 
                            key={t.id} 
                            task={t} 
                            idx={i} 
                            onClick={() => handleTaskClick(t)} 
                            onCheckIn={(id) => navigate(`/check-in/${id}`)}
                            isAdmin={isAdmin}
                          />
                        ))}
                        {filteredTasks.filter(t => t.status === 'completed').length === 0 && (filter === 'completed' || filter === 'all') && (
                           <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/40">
                              <ClipboardList size={40} className="mb-2 opacity-20" />
                              <p className="text-sm italic">{t('tasks.list.empty_completed')}</p>
                           </div>
                        )}
                    </div>
                  </div>
                )}
            </div>
        </section>
      )}

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
          >
            <header className="flex items-center px-6 py-4 bg-background/80 backdrop-blur-xl shrink-0 z-20 border-b border-outline-variant/10">
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface hover:bg-surface-container/50 transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-on-surface">{t('tasks.detail.title')}</h1>
                {isAdmin ? (
                  <div className="relative">
                    <button 
                      onClick={() => setIsDetailSettingsOpen(!isDetailSettingsOpen)}
                      className="w-10 h-10 flex items-center justify-center rounded-full text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Settings size={20} />
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
                            className="absolute right-0 mt-2 w-48 bg-surface rounded-2xl shadow-xl border border-outline-variant/10 z-40 py-1.5 overflow-hidden"
                          >
                            <button
                              onClick={() => {
                                setIsDetailSettingsOpen(false);
                                navigate(`/tasks/edit/${selectedTask.id}`);
                              }}
                              className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-surface-container/50 transition-colors text-on-surface font-black text-sm"
                            >
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Edit size={16} />
                              </div>
                              {t('tasks.detail.edit')}
                            </button>
                            <button
                              onClick={() => {
                                setIsDeleteConfirmOpen(true);
                                setIsDetailSettingsOpen(false);
                              }}
                              className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-red-500/10 transition-colors text-red-500 font-black text-sm"
                            >
                              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                <Trash2 size={16} />
                              </div>
                              {t('tasks.detail.delete')}
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>

                    {/* Delete Confirmation Modal */}
                    <AnimatePresence>
                      {isDeleteConfirmOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
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
                            className="bg-white rounded-[2rem] p-8 w-full max-w-xs relative z-10 shadow-2xl text-center"
                          >
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                              <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-black text-on-surface mb-2">{t('tasks.delete.confirm_title')}</h3>
                            <p className="text-on-surface-variant/60 text-sm font-bold mb-8">{t('tasks.delete.confirm_desc')}</p>
                            
                            <div className="flex flex-col gap-3">
                              <button 
                                onClick={handleDeleteTask}
                                className="w-full py-4 bg-red-500 text-white font-black rounded-2xl shadow-lg shadow-red-200 active:scale-95 transition-all"
                              >
                                {t('common.confirm_delete')}
                              </button>
                              <button 
                                onClick={() => setIsDeleteConfirmOpen(false)}
                                className="w-full py-4 bg-surface-container-low text-on-surface-variant/60 font-black rounded-2xl active:scale-95 transition-all"
                              >
                                {t('common.rethink')}
                              </button>
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="w-10" />
                )}
              </header>

              <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-40">
                <div className="flex flex-col items-center">
                {/* Large Icon Container */}
                <div className="mt-8 mb-8 relative">
                   <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-[#2E8B57] to-[#1B5E20] text-white flex items-center justify-center shadow-[0_20px_50px_rgba(46,139,87,0.3)] relative z-10">
                      {getTaskIcon(selectedTask.icon, 48)}
                   </div>
                   <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-[2.5rem] -z-10 animate-pulse" />
                </div>

                <h2 className="text-3xl font-black mb-4 text-on-surface tracking-tight">{selectedTask.title}</h2>
                
                <div className="flex items-center gap-2 bg-surface-container-lowest px-5 py-2.5 rounded-full mb-10 shadow-sm border border-outline-variant/5">
                   <Clock size={16} className="text-on-surface-variant/70" />
                   <span className="text-sm font-bold text-on-surface-variant font-mono">
                      {selectedTask.reminderTime || '09:00 - 12:00'}
                   </span>
                </div>

                {/* Assigner Section */}
                <div className="w-full bg-surface rounded-[2.5rem] p-5 flex items-center gap-4 mb-10 shadow-sm border border-outline-variant/10">
                   <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-outline-variant/10">
                     <img 
                       src={members.find(m => m.id === selectedTask.creatorId)?.avatar || 'https://picsum.photos/seed/mother/100/100'} 
                       alt="Assigner" 
                       className="w-full h-full object-cover" 
                     />
                   </div>
                   <div className="flex-1">
                     <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest leading-none mb-1">{t('tasks.detail.creator')}</p>
                     <p className="font-black text-xl text-on-surface leading-none items-center">
                        {members.find(m => m.id === selectedTask.creatorId)?.name || '妈妈'}
                     </p>
                   </div>
                   <div className="bg-[#FFF9C4] dark:bg-yellow-500/20 text-[#F9A825] dark:text-yellow-400 px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm border border-yellow-200 dark:border-yellow-500/20 uppercase tracking-wider">
                     {t('tasks.detail.tag')}
                   </div>
                </div>

                {/* Description Section */}
                <div className="w-full space-y-4 mb-10">
                  <h3 className="text-xl font-black text-on-surface pl-1">{t('tasks.detail.description')}</h3>
                  <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 shadow-inner border border-outline-variant/10 relative overflow-hidden">
                    <p className="text-on-surface/80 font-medium leading-relaxed whitespace-pre-line text-sm relative z-10">
                      {selectedTask.description}
                    </p>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10" />
                  </div>
                </div>

                {/* Reward Card */}
                <div className="w-full bg-gradient-to-br from-[#FFF59D] to-[#FBC02D] rounded-[2.5rem] p-8 flex items-center gap-6 mb-12 shadow-[0_15px_35px_rgba(251,192,45,0.2)] relative overflow-hidden group">
                   <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center shadow-md relative z-10 group-hover:scale-110 transition-transform duration-500">
                      <Star size={40} className="text-[#FBC02D] fill-current" />
                   </div>
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-[#827717]/60 uppercase tracking-widest mb-1">{t('tasks.detail.reward')}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-[#33691E] tracking-tighter">{selectedTask.rewardStars}</span>
                        <div className="flex flex-col gap-0.5">
                           <Star size={10} className="fill-[#33691E] text-[#33691E]" />
                           <Star size={8} className="fill-[#33691E] text-[#33691E] opacity-60" />
                        </div>
                      </div>
                   </div>
                   <Star size={120} className="absolute right-[-20px] bottom-[-20px] text-white opacity-20 rotate-12" />
                </div>

                {/* Participants Section */}
                <div className="w-full space-y-4 mb-10">
                  <h3 className="text-xl font-black text-on-surface pl-1">{t('tasks.detail.participants')}</h3>
                  <div className="space-y-4">
                     {selectedTask.assigneeIds.map((mid) => {
                       const member = members.find(m => m.id === mid);
                       if (!member) return null;
                       const status = selectedTask.memberProgress?.[mid] || (selectedTask.status === 'completed' ? 'completed' : 'pending');
                       
                       return (
                         <div key={mid} className="bg-surface rounded-[2rem] p-4 flex items-center justify-between shadow-sm border border-outline-variant/10 hover:border-primary/20 transition-all group">
                           <div className="flex items-center gap-4">
                             <div className="relative">
                                <img 
                                  src={member.avatar} 
                                  alt={member.name} 
                                  className="w-14 h-14 rounded-[1.25rem] object-cover border-2 border-surface dark:border-surface shadow-sm group-hover:scale-105 transition-transform" 
                                />
                                {status === 'completed' && (
                                  <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1 border-2 border-surface dark:border-surface shadow-sm">
                                    <CheckCircle2 size={10} />
                                  </div>
                                )}
                             </div>
                             <span className="font-black text-lg text-on-surface">{member.name}</span>
                           </div>
                           
                           <div className={cn(
                             "px-5 py-2.5 rounded-full flex items-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all",
                             status === 'completed' 
                               ? "bg-primary/10 text-primary border border-primary/10" 
                               : "bg-surface-container-low text-on-surface-variant/50 border border-transparent"
                           )}>
                             {status === 'completed' ? (
                               <><CheckCircle2 size={14} className="text-primary" /> {t('tasks.status.completed')}</>
                             ) : (
                               <><CircleDashed size={14} className="animate-spin opacity-50" /> {t('tasks.filter.pending')}</>
                             )}
                           </div>
                         </div>
                       );
                     })}
                  </div>
                </div>
              </div>
            </div>

            {/* Action FAB Area */}
            <div className="shrink-0 p-6 bg-background border-t border-outline-variant/10 shadow-[0_-15px_40px_rgba(0,0,0,0.05)] z-30 select-none">
               {(selectedTask.status === 'pending' || selectedTask.status === 'in_progress') && (
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     navigate(`/check-in/${selectedTask.id}`);
                   }}
                   className="w-full py-5 rounded-[2.5rem] bg-primary text-white font-black text-lg shadow-[0_15px_30px_rgba(0,110,28,0.2)] flex items-center justify-center gap-3 active:scale-[0.97] transition-all hover:bg-primary-container hover:shadow-lg"
                 >
                   <CheckCircle2 size={24} />
                   {t('tasks.detail.check_in')}
                 </button>
               )}
               {selectedTask.status === 'reviewing' && isAdmin && (
                 <button 
                   onClick={(e) => {
                     e.stopPropagation();
                     navigate(`/check-in/${selectedTask.id}`);
                   }}
                   className="w-full py-5 rounded-[2.5rem] bg-[#0070D3] text-white font-black text-lg shadow-[0_15px_30px_rgba(0,112,211,0.3)] flex items-center justify-center gap-3 active:scale-[0.97] transition-all hover:bg-[#005bb2]"
                 >
                   <CheckCircle2 size={24} />
                   {t('tasks.detail.approve')}
                 </button>
               )}
               {selectedTask.status === 'reviewing' && !isAdmin && (
                 <div className="w-full py-5 rounded-[2.5rem] bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-lg flex items-center justify-center gap-3 border border-orange-500/10 italic">
                    <Clock size={24} className="animate-pulse" />
                    {t('tasks.detail.waiting_approval')}
                 </div>
               )}
               {selectedTask.status === 'completed' && (
                 <div className="w-full py-5 rounded-[2.5rem] bg-surface-container-low text-on-surface-variant font-black text-lg flex items-center justify-center gap-3 shadow-inner">
                    <CheckCircle2 size={24} className="text-primary opacity-60" />
                    {t('tasks.detail.reward_distributed')}
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
