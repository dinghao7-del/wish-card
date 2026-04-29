import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Calendar, 
  ChevronRight, 
  HelpCircle,
  Check,
  Plus,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  Smile,
  RefreshCw,
  User as UserIcon,
  Settings2,
  ListTodo,
  Sparkles,
  Text as TextIcon,
  Heading2,
  Image as ImageIcon
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TaskStatus } from '../types';
import { cn } from '../lib/utils';
import { TextAvatar } from '../components/TextAvatar';
import { TaskTemplateSelector } from '../components/TaskTemplateSelector';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export function PublishTask() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { addTask, updateTask, members, currentUser, tasks } = useFamily();
  const { t } = useTranslation();

  // Basic consistency checks to prevent crashes
  const safeMembers = Array.isArray(members) ? members : [];
  const children = safeMembers.filter(m => m && m.role === 'child');
  const safeCurrentUser = currentUser || { id: 'm1', name: '用户' };

  const isEdit = !!id;
  const taskToEdit = id ? (tasks || []).find(t => t.id === id) : null;

  const [viewMode, setViewMode] = useState<'target' | 'habit'>('target');
  const [isModeLocked, setIsModeLocked] = useState(false);
  const [habitType, setHabitType] = useState<'reward' | 'penalty'>('reward');
  const [emoji, setEmoji] = useState('✨');
  const [resetAfterClaim, setResetAfterClaim] = useState(true);

  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showTagManagementModal, setShowTagManagementModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showDescInput, setShowDescInput] = useState(false);
  
  // Tag Management State
  const [pickerCategories, setPickerCategories] = useState(['劳动', '学习', '生活', '兴趣', '独立', '表扬', '批评']);
  const [tempCategory, setTempCategory] = useState('生活');
  const [newTagName, setNewTagName] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Time Slot State
  const [selectedHour, setSelectedHour] = useState(8);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [durationIdx, setDurationIdx] = useState(1); // Default 1 hour
  const [isReminderOn, setIsReminderOn] = useState(true);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(true);
  const [isTimeEnabled, setIsTimeEnabled] = useState(true);

  const durations: string[] = t('publish_task.durations', ['30分钟', '1小时', '2小时', '3小时', '4小时', '5小时', '6小时']);
  const durationValues = [30, 60, 120, 180, 240, 300, 360];

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    type: '生活',
    rewardStars: 5,
    assigneeIds: [],
    startTime: new Date().toISOString(),
    reminderTime: '09:00',
    frequency: 'daily',
    status: 'pending',
    icon: 'ListTodo',
    isHabit: false,
    targetCount: 10,
    currentCount: 0
  });

  // Auto-select children by default if creating a new task
  useEffect(() => {
    if (!isEdit && formData.assigneeIds?.length === 0 && children.length > 0) {
      setFormData(prev => ({ ...prev, assigneeIds: children.map(c => c.id) }));
    }
  }, [children.length, isEdit]);

  // State for repeat modal
  const [repeatTab, setRepeatTab] = useState<'weekly' | 'monthly' | 'calendar'>('weekly');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // 0-6 for weekly
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([]); // 1-31 for monthly
  const [selectedCalendarDates, setSelectedCalendarDates] = useState<Date[]>([]); // Specific dates
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const handleAddTag = () => {
    if (newTagName.trim() && !pickerCategories.includes(newTagName.trim())) {
      setPickerCategories([...pickerCategories, newTagName.trim()]);
      setNewTagName('');
      setIsAddingTag(false);
    }
  };

  const handleDeleteTag = (tag: string) => {
    if (pickerCategories.length <= 1) return;
    setPickerCategories(pickerCategories.filter(t => t !== tag));
    if (tempCategory === tag) setTempCategory(pickerCategories[pickerCategories.indexOf(tag) === 0 ? 1 : 0]);
    if (formData.type === tag) setFormData({ ...formData, type: pickerCategories[pickerCategories.indexOf(tag) === 0 ? 1 : 0] as any });
  };

  useEffect(() => {
    if (isEdit && taskToEdit) {
      setFormData({
        ...taskToEdit,
        rewardStars: Math.abs(taskToEdit.rewardStars || 0)
      });
      setViewMode(taskToEdit.isHabit ? 'habit' : 'target');
      if (taskToEdit.isHabit) {
        setHabitType((taskToEdit.rewardStars || 0) < 0 ? 'penalty' : 'reward');
      }
      if (taskToEdit.description) setShowDescInput(true);
      
      // Initialize toggles from existing task
      setIsRepeatEnabled(taskToEdit.frequency !== 'once');
      setIsTimeEnabled(!!taskToEdit.reminderTime);
    }
  }, [isEdit, taskToEdit]);

  // Cache applied template to avoid infinite loops and repeated state updates
  const hasAppliedStateRef = React.useRef(false);

  useEffect(() => {
    // Only run initialization once per component mount
    if (hasAppliedStateRef.current) return;

    try {
      const stateData = location.state;
      let templateData = stateData?.template;
      let mode = stateData?.fromMode;

      // Robust fallback to sessionStorage if history state is lost or incompatible
      if (!templateData) {
        const saved = sessionStorage.getItem('pending_template_selection');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            templateData = parsed?.template;
            mode = parsed?.fromMode;
            sessionStorage.removeItem('pending_template_selection');
          } catch (e) {
            console.error("Storage parse error:", e);
          }
        }
      }

      if (mode === 'target' || mode === 'habit') {
        setViewMode(mode);
        setIsModeLocked(true);
      }

      if (templateData && typeof templateData === 'object' && templateData.title) {
        // Mark as applied IMMEDIATELY
        hasAppliedStateRef.current = true;
        
        const safeTemplate = {
          title: String(templateData.title || ''),
          description: String(templateData.description || ''),
          stars: Number(templateData.stars ?? 5),
          category: String(templateData.category || '生活'),
          frequency: templateData.frequency || (mode === 'habit' ? 'daily' : 'once')
        };

        // Add category if missing from safe picker
        if (safeTemplate.category && !pickerCategories.includes(safeTemplate.category)) {
          setPickerCategories(prev => [...prev, safeTemplate.category]);
        }

        setFormData(prev => ({
          ...prev,
          title: safeTemplate.title,
          description: safeTemplate.description,
          rewardStars: safeTemplate.stars,
          frequency: safeTemplate.frequency,
          type: safeTemplate.category as any,
          icon: 'ListTodo'
        }));

        if (safeTemplate.description) setShowDescInput(true);
        setIsRepeatEnabled(safeTemplate.frequency !== 'once' || mode === 'habit');
      }
    } catch (err) {
      console.error("Critical error in template initialization:", err);
    }
  }, [location.state]); // Only depend on state for trigger

  const handleSave = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      if ('preventDefault' in e) e.preventDefault();
      if ('stopPropagation' in e) e.stopPropagation();
    }
    
    try {
      // Force rewardStars to be negative if it's a penalty habit
      let finalStars = formData.rewardStars || 0;
      if (viewMode === 'habit') {
        finalStars = habitType === 'reward' ? Math.abs(finalStars) : -Math.abs(finalStars);
      }

      // Finalizing form data based on toggles
      const finalFormData: Partial<Task> = {
        ...formData,
        frequency: isRepeatEnabled ? (formData.frequency === 'once' ? 'daily' : formData.frequency) : 'once',
        reminderTime: isTimeEnabled ? formData.reminderTime : undefined,
        rewardStars: finalStars,
        status: 'pending',
        isHabit: viewMode === 'habit',
        currentCount: formData.currentCount || 0
      };

      if (isEdit && taskToEdit) {
        updateTask({
          ...taskToEdit,
          ...finalFormData
        } as Task);
      } else {
        const progress: Record<string, TaskStatus> = {};
        const finalAssigneeIds = (finalFormData.assigneeIds && finalFormData.assigneeIds.length > 0) 
          ? finalFormData.assigneeIds 
          : children.map(m => m.id);
        
        finalAssigneeIds.forEach(id => {
          progress[id] = 'pending';
        });

        addTask({
          ...finalFormData,
          assigneeIds: finalAssigneeIds,
          id: `t-${Date.now()}`,
          creatorId: safeCurrentUser.id,
          memberProgress: progress,
          status: 'pending',
          icon: finalFormData.icon || 'ListTodo',
          startTime: finalFormData.startTime || new Date().toISOString()
        } as Task);
      }
      navigate(viewMode === 'habit' ? '/habits' : '/tasks');
    } catch (error) {
      console.error('Failed to save task:', error);
      navigate('/tasks');
    }
  };

  const handleSelectTemplate = (template: any) => {
    let iconName = 'ListTodo';
    if (typeof template.icon === 'string') {
      iconName = template.icon;
    } else if (template.icon && template.icon.name) {
      iconName = template.icon.name;
    } else if (template.icon && template.icon.displayName) {
      iconName = template.icon.displayName;
    }

    setFormData(prev => ({
      ...prev,
      title: template.title || '',
      rewardStars: typeof template.stars === 'number' ? template.stars : 5,
      icon: iconName
    }));
    setShowTemplateSelector(false);
    setShowIconPicker(false);
  };

  const RenderIcon = ({ name, size = 20, className = "" }: { name: string, size?: number, className?: string }) => {
    const IconComponent = (LucideIcons as any)[name];
    if (IconComponent) return <IconComponent size={size} className={className} />;
    return <ListTodo size={size} className={className} />;
  };

  const dayNames: string[] = t('publish_task.weekday_labels', ['周一', '周二', '周三', '周四', '周五', '周六', '周日']);
  const dayValues = [1, 2, 3, 4, 5, 6, 0];

  const getRepeatLabel = () => {
    try {
      if (repeatTab === 'weekly') {
        const safeDays = Array.isArray(selectedDays) ? selectedDays : [];
        if (safeDays.length === 7) return t('publish_task.everyday', '每天');
        if (safeDays.length === 0) return t('publish_task.not_set', '未设置');
        if (safeDays.length === 5 && !safeDays.includes(6) && !safeDays.includes(0)) return t('publish_task.workday', '工作日');
        if (safeDays.length === 2 && safeDays.includes(6) && safeDays.includes(0)) return t('publish_task.weekend', '周末');
        return safeDays
          .map(d => {
            const idx = dayValues.indexOf(d);
            return idx !== -1 ? dayNames[idx] : null;
          })
          .filter(Boolean)
          .join('、') || t('publish_task.not_set', '未设置');
      } else if (repeatTab === 'monthly') {
        const safeMonthDays = Array.isArray(selectedMonthDays) ? selectedMonthDays : [];
        return safeMonthDays.length > 0 ? t('publish_task.monthly_days', `每月 ${[...safeMonthDays].sort((a,b) => a-b).join('、')} 日`, { days: [...safeMonthDays].sort((a,b) => a-b).join('、') }) : t('publish_task.not_set', '未设置');
      } else {
        const safeDates = Array.isArray(selectedCalendarDates) ? selectedCalendarDates : [];
        return safeDates.length > 0 ? t('publish_task.selected_dates', `已选择 ${safeDates.length} 个日期`, { count: safeDates.length }) : t('publish_task.not_set', '未设置');
      }
    } catch (e) {
      console.error("getRepeatLabel error", e);
      return t('publish_task.not_set', '未设置');
    }
  };

  const getTimeLabel = () => {
    try {
      const start = `${(selectedHour || 0).toString().padStart(2, '0')}:${(selectedMinute || 0).toString().padStart(2, '0')}`;
      const duration = durationValues[durationIdx] || 60;
      const totalMinutes = (selectedHour || 0) * 60 + (selectedMinute || 0) + duration;
      const endHour = Math.floor(totalMinutes / 60) % 24;
      const endMinute = totalMinutes % 60;
      const end = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      return `${start} ~ ${end}`;
    } catch (e) {
      return t('publish_task.any_time', '任意时间');
    }
  };

  // Calendar generation helpers
  const getCalendarDays = () => {
    const start = startOfWeek(startOfMonth(calendarViewDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(calendarViewDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  return (
    <div className="min-h-screen bg-[#FDFCF9] pb-32">
      <header className="flex justify-between items-center px-4 sm:px-6 py-4 bg-[#FDFCF9]/80 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/50 text-on-surface-variant transition-colors">
          <ArrowLeft size={20} />
        </button>
        
        {!isEdit && !isModeLocked ? (
          <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/10">
            <button 
              type="button"
              onClick={() => setViewMode('target')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-black transition-all",
                viewMode === 'target' ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant/40"
              )}
            >
              {t('publish_task.create_target', '创建目标')}
            </button>
            <div className="w-[1px] h-3 bg-outline-variant/20 mx-0.5" />
            <button 
              type="button"
              onClick={() => setViewMode('habit')}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-black transition-all",
                viewMode === 'habit' ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant/40"
              )}
            >
              {t('publish_task.create_habit', '好习惯')}
            </button>
          </div>
        ) : (
          <h1 className="text-lg font-black text-on-surface">
            {isEdit 
              ? (viewMode === 'target' ? t('publish_task.edit_target', '编辑目标') : t('publish_task.edit_habit', '编辑好习惯')) 
              : (viewMode === 'target' ? t('publish_task.create_target', '创建目标') : t('publish_task.create_habit', '好习惯'))
            }
          </h1>
        )}

        <div className="flex items-center gap-2">
          {!isEdit && viewMode === 'target' && (
            <button 
              type="button" 
              onClick={() => navigate('/tasks/templates', { state: { fromMode: viewMode } })}
              className="flex items-center gap-1 px-3 sm:px-4 py-2 bg-[#98EE99]/20 rounded-full text-[#2E7D32] text-xs sm:text-sm font-black transition-all active:scale-95 shrink-0"
            >
              {t('publish_task.import', '导入')} <ChevronRight size={14} strokeWidth={3} />
            </button>
          )}
          {viewMode === 'habit' && (
            <button
              type="button"
              onClick={handleSave}
              className="text-[#2E7D32] text-sm font-black px-4 py-2"
            >
              {t('publish_task.save', '保存')}
            </button>
          )}
        </div>
      </header>

      <form onSubmit={handleSave} className="px-4 sm:px-6 space-y-3 mt-2">
        {viewMode === 'target' ? (
          <>
            {/* Title and Category Card */}
            <div className="bg-white rounded-[2rem] p-4 sm:p-5 shadow-sm border border-outline-variant/5">
              <div className="flex flex-col gap-0.5 mb-2">
                <label className="text-[10px] font-black text-on-surface-variant/30 pl-1 uppercase tracking-widest">
                  {t('publish_task.title_label', '请输入 {{mode}} 名称', { mode: viewMode === 'target' ? '目标' : '习惯' })}
                </label>
                <div className="flex items-center">
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder={viewMode === 'target' ? t('publish_task.title_placeholder_target', '加：完成数学作业') : t('publish_task.title_placeholder_habit', '加：坚持早起')}
                    className="flex-1 border-none bg-transparent p-0 text-xl font-black placeholder:text-on-surface-variant/10 focus:ring-0 min-w-0"
                  />
                </div>
              </div>
              
              <div className="h-[1px] bg-outline-variant/5 mx-[-24px] mb-2" />
              
              <div className="flex items-center justify-between">
                {!showDescInput ? (
                  <button 
                    type="button" 
                    onClick={() => setShowDescInput(true)}
                    className="text-sm font-black text-primary/60 flex items-center gap-1.5 py-1 px-2 hover:bg-primary/5 rounded-full transition-all"
                  >
                    <Plus size={18} strokeWidth={3} />
                    {t('publish_task.add_description', '添加描述')}
                  </button>
                ) : (
                  <span className="text-xs font-black text-on-surface-variant/20 pl-2">{t('publish_task.description_hint', '描述内容')}</span>
                )}

                <button 
                  type="button"
                  onClick={() => {
                    setTempCategory(formData.type || '生活');
                    setShowCategoryModal(true);
                  }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 bg-surface-container-low rounded-full border border-outline-variant/5 hover:bg-surface-container transition-colors"
                >
                   <span className="text-sm font-bold text-on-surface-variant">{formData.type}</span>
                   <ChevronRight size={14} className="flex-shrink-0 text-on-surface-variant/30" />
                </button>
              </div>

              {showDescInput && (
                <textarea 
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('publish_task.description_placeholder', '添加详细说明...')}
                  className="w-full border-none bg-surface-container-low/30 rounded-2xl p-4 mt-3 text-sm font-bold focus:ring-0 text-on-surface-variant placeholder:text-on-surface-variant/10 resize-none"
                />
              )}
            </div>

            {/* Combined Settings Group Card */}
            <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-outline-variant/5">
              {/* Repeat Row */}
              <div className="flex items-center justify-between p-3.5 px-4 sm:p-4 sm:px-5 border-b border-outline-variant/5 active:bg-surface-container/30 transition-all">
                <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                      isRepeatEnabled ? "bg-primary/5 text-primary" : "bg-surface-container-low text-on-surface-variant/20"
                    )}>
                      <Plus size={20} className={cn("transition-transform duration-300", isRepeatEnabled ? "rotate-45" : "rotate-0")} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-base sm:text-lg text-on-surface">{t('publish_task.repeat', '重复')}</span>
                      <button 
                        type="button"
                        onClick={() => setIsRepeatEnabled(!isRepeatEnabled)}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all flex items-center px-0.5 shadow-inner",
                          isRepeatEnabled ? "bg-[#98EE99]" : "bg-outline-variant/30"
                        )}
                      >
                        <motion.div 
                          animate={{ x: isRepeatEnabled ? 16 : 0 }}
                          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                          className="w-4 h-4 bg-white rounded-full shadow-md"
                        />
                      </button>
                    </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => isRepeatEnabled && setShowRepeatModal(true)}
                  disabled={!isRepeatEnabled}
                  className={cn("flex items-center gap-1 transition-all max-w-[50%]", !isRepeatEnabled && "opacity-20")}
                >
                  <span className="text-sm font-black text-on-surface-variant/40 truncate text-right">
                    {isRepeatEnabled ? getRepeatLabel() : t('publish_task.single_task', '单次任务')}
                  </span>
                  <ChevronRight size={16} className="text-on-surface-variant/20 shrink-0" />
                </button>
              </div>

              {/* Time Row */}
              <div className="flex items-center justify-between p-3.5 px-4 sm:p-4 sm:px-5 border-b border-outline-variant/5 active:bg-surface-container/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                    isTimeEnabled ? "bg-primary/5 text-primary" : "bg-surface-container-low text-on-surface-variant/20"
                  )}>
                      <Clock size={20} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-base sm:text-lg text-on-surface">{t('publish_task.time_slot', '时段')}</span>
                    <button 
                        type="button"
                        onClick={() => setIsTimeEnabled(!isTimeEnabled)}
                        className={cn(
                          "w-9 h-5 rounded-full transition-all flex items-center px-0.5 shadow-inner",
                          isTimeEnabled ? "bg-[#98EE99]" : "bg-outline-variant/30"
                        )}
                      >
                        <motion.div 
                          animate={{ x: isTimeEnabled ? 16 : 0 }}
                          transition={{ type: 'spring', damping: 15, stiffness: 200 }}
                          className="w-4 h-4 bg-white rounded-full shadow-md"
                        />
                      </button>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => isTimeEnabled && setShowTimeModal(true)}
                  disabled={!isTimeEnabled}
                  className={cn("flex items-center gap-1 transition-all max-w-[50%]", !isTimeEnabled && "opacity-20")}
                >
                  <span className="text-sm font-black text-on-surface-variant/40 truncate text-right">
                    {isTimeEnabled ? getTimeLabel() : t('publish_task.any_time', '任意时间')}
                  </span>
                  <ChevronRight size={16} className="text-on-surface-variant/20 shrink-0" />
                </button>
              </div>

              {/* Plan Row */}
              <div className="flex items-center justify-between p-3.5 px-4 sm:p-4 sm:px-5 active:bg-surface-container/30 transition-all cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/30 group-hover:text-primary transition-colors">
                      <Calendar size={20} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-base sm:text-lg text-on-surface">{t('publish_task.plan', '计划')}</span>
                    <HelpCircle size={14} className="text-on-surface-variant/20" />
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-surface-container-low/80 py-1.5 px-3 rounded-xl border border-outline-variant/5 shadow-sm active:scale-95 transition-all">
                    <span className="bg-[#FF9800] text-white px-1 py-0.5 rounded text-[8px] font-black">{t('publish_task.vacation_badge', '假')}</span>
                    <span className="text-sm font-bold text-on-surface">{t('publish_task.vacation_plan', '假期计划')}</span>
                    <ChevronRight size={14} className="text-on-surface-variant/20 ml-1" />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Habit Mode Layout (Screenshot Inspired) */
          <div className="space-y-3">
            {/* Title Card */}
             <div className="bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                   <span className="text-sm font-black text-on-surface-variant/40">{t('publish_task.habit_title', '标题')}</span>
                </div>
                {!isEdit && (
                  <button 
                    type="button" 
                    onClick={() => navigate('/tasks/templates', { state: { fromMode: viewMode } })}
                    className="flex items-center gap-1 px-3 py-1 bg-[#98EE99]/10 rounded-full text-[#2E7D32] text-xs font-black transition-all active:scale-95"
                  >
                    {t('publish_task.import', '导入')} <ChevronRight size={12} strokeWidth={3} />
                  </button>
                )}
              </div>
              <input
                required
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('publish_task.habit_title_placeholder', '请输入标题')}
                className="w-full border-none bg-transparent p-0 text-base font-black placeholder:text-on-surface-variant/10 focus:ring-0 min-w-0"
              />
            </div>

            {/* Image Selection Card (Formerly Emoji) */}
            <div 
              onClick={() => setShowIconPicker(true)}
              className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-outline-variant/5 cursor-pointer active:bg-surface-container transition-colors ring-offset-2 focus:ring-2 focus:ring-primary/20"
            >
              <div className="flex items-center gap-3">
                <ImageIcon size={20} className="text-on-surface-variant/30" />
                <span className="text-sm font-bold text-on-surface-variant/40">{t('publish_task.select_image', '选择图片 (可选)')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                  <RenderIcon name={formData.icon || 'Sparkles'} size={24} />
                </div>
                <ChevronRight size={18} className="text-on-surface-variant/20" />
              </div>
            </div>

            {/* Reset Toggle Card */}
            <div className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-outline-variant/5">
              <div className="flex items-center gap-3">
                <RefreshCw size={20} className="text-on-surface-variant/30" />
                <span className="text-sm font-bold text-on-surface">{t('publish_task.multi_checkin', '日内可以多次打卡')}</span>
              </div>
              <button 
                type="button"
                onClick={() => setResetAfterClaim(!resetAfterClaim)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all flex items-center px-1 shadow-inner",
                  resetAfterClaim ? "bg-blue-500" : "bg-outline-variant/30"
                )}
              >
                <motion.div 
                  animate={{ x: resetAfterClaim ? 24 : 0 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="w-4 h-4 bg-white rounded-full shadow-md"
                />
              </button>
            </div>

            {/* Stars Card */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-outline-variant/5">
              <Star size={20} className="text-on-surface-variant/30" />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                   <span className="text-red-500 text-sm">*</span>
                   <span className="text-sm font-bold text-on-surface-variant/40">{t('publish_task.stars', '星星')}</span>
                </div>
                <input 
                  required
                  type="number" 
                  value={formData.rewardStars}
                  onChange={e => setFormData({ ...formData, rewardStars: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full border-none bg-transparent p-0 text-base font-black placeholder:text-on-surface-variant/10 focus:ring-0 min-w-0"
                />
              </div>
            </div>

            {/* Target Count Card (Screenshot Inspired) */}
            <div className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-outline-variant/5">
              <RefreshCw size={20} className="text-on-surface-variant/30" />
              <div className="flex-1">
                <div className="flex items-center gap-1">
                   <span className="text-red-500 text-sm">*</span>
                   <span className="text-sm font-bold text-on-surface-variant/40">{t('publish_task.count_limit', '次数限制')}</span>
                </div>
                <input 
                  required
                  type="number" 
                  value={formData.targetCount}
                  onChange={e => setFormData({ ...formData, targetCount: parseInt(e.target.value) || 1 })}
                  placeholder="10"
                  className="w-full border-none bg-transparent p-0 text-base font-black placeholder:text-on-surface-variant/10 focus:ring-0 min-w-0"
                />
              </div>
            </div>

            {/* Select Members Card */}
            <div className="bg-white rounded-2xl p-4 space-y-4 shadow-sm border border-outline-variant/5">
              <div className="flex items-center gap-3">
                <UserIcon size={20} className="text-on-surface-variant/30" />
                <div className="flex items-center gap-1">
                   <span className="text-red-500 text-sm">*</span>
                   <span className="text-sm font-bold text-on-surface-variant/40">{t('publish_task.select_members', '选择成员')}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 px-1">
                {children.map(kid => (
                  <div key={kid.id} className="flex flex-col items-center gap-1">
                    <button 
                      type="button"
                      onClick={() => {
                        const current = formData.assigneeIds || [];
                        setFormData({
                          ...formData,
                          assigneeIds: current.includes(kid.id) ? current.filter(id => id !== kid.id) : [...current, kid.id]
                        });
                      }}
                      className={cn(
                        "w-12 h-12 rounded-full border-2 p-0.5 transition-all relative",
                        formData.assigneeIds?.includes(kid.id) ? "border-primary" : "border-transparent bg-surface-container-low"
                      )}
                    >
                      <TextAvatar src={kid.avatar} name={kid.name} size={48} />
                      {formData.assigneeIds?.includes(kid.id) && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                          <Check size={12} strokeWidth={4} />
                        </div>
                      )}
                    </button>
                    <span className="text-[10px] font-bold text-on-surface-variant">{kid.name}</span>
                  </div>
                ))}
                <button type="button" className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-full bg-surface-container-low border-2 border-dashed border-outline-variant/20 flex items-center justify-center text-on-surface-variant/40">
                    <Plus size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant">添加</span>
                </button>
              </div>
            </div>

            {/* Type Card */}
            <div className="bg-white rounded-2xl p-4 space-y-4 shadow-sm border border-outline-variant/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings2 size={20} className="text-on-surface-variant/30" />
                  <div className="flex items-center gap-1">
                    <span className="text-red-500 text-sm">*</span>
                    <span className="text-sm font-bold text-on-surface-variant/40">{t('publish_task.type', '类型')}</span>
                  </div>
                </div>
                <HelpCircle size={18} className="text-on-surface-variant/20" />
              </div>
              <div className="flex p-1 bg-surface-container-low rounded-xl">
                 <button 
                  type="button" 
                  onClick={() => setHabitType('reward')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-black transition-all",
                    habitType === 'reward' ? "bg-blue-500 text-white shadow-md" : "text-on-surface-variant/40"
                  )}
                 >
                   {t('publish_task.reward', '奖励')}
                 </button>
                 <button
                  type="button"
                  onClick={() => setHabitType('penalty')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-black transition-all",
                    habitType === 'penalty' ? "bg-red-500 text-white shadow-md text-white" : "text-on-surface-variant/40"
                  )}
                 >
                   {t('publish_task.penalty', '惩罚')}
                 </button>
              </div>
            </div>

            {/* Description Card */}
            <div className="bg-white rounded-2xl p-4 flex items-start gap-3 shadow-sm border border-outline-variant/5">
              <TextIcon size={20} className="text-on-surface-variant/30 mt-1" />
              <div className="flex-1">
                <span className="text-sm font-bold text-on-surface-variant/40">{t('publish_task.description', '描述')}</span>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('publish_task.description_placeholder', '请输入描述内容')}
                  className="w-full border-none bg-transparent p-0 text-sm font-bold focus:ring-0 text-on-surface-variant placeholder:text-on-surface-variant/10 resize-none min-h-[60px]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Reward and Assignees Card (Only for Target mode) */}
        {viewMode === 'target' && (
          <div className="bg-white rounded-[2rem] p-4 sm:p-5 shadow-sm space-y-4 border border-outline-variant/5 mb-24">
             <div className="flex items-center justify-between">
                <label className="text-sm sm:text-base font-black text-on-surface">{t('publish_task.star_reward', '星星积分奖励')}</label>
                <div className="flex items-center bg-surface-container-low/50 p-1 px-3 rounded-full border border-outline-variant/5">
                   <button 
                     type="button"
                     onClick={() => setFormData(prev => ({ ...prev, rewardStars: Math.max(0, (prev.rewardStars || 0) - 1) }))}
                     className="w-8 h-8 flex items-center justify-center text-on-surface-variant/40 hover:text-primary transition-colors text-xl font-bold"
                   >
                     -
                   </button>
                   <input 
                     type="number"
                     value={formData.rewardStars}
                     onChange={e => setFormData({ ...formData, rewardStars: parseInt(e.target.value) || 0 })}
                     className="w-8 sm:w-10 bg-transparent border-none text-center font-black text-base sm:text-lg text-on-surface focus:ring-0 p-0"
                   />
                   <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, rewardStars: (prev.rewardStars || 0) + 1 }))}
                      className="w-8 h-8 flex items-center justify-center text-on-surface-variant/40 hover:text-primary transition-colors text-xl font-bold"
                   >
                     +
                   </button>
                   <div className="ml-2 w-6 h-6 rounded-full bg-[#FBC02D]/10 flex items-center justify-center">
                      <Star size={12} className="text-[#FBC02D] fill-current" />
                   </div>
                </div>
             </div>
             
             <div className="h-[1px] bg-outline-variant/5 mx-[-24px]" />

             <div>
                <label className="text-[10px] font-black text-on-surface-variant/30 pl-1 uppercase tracking-widest block mb-2">{t('publish_task.parent_publisher', '发布家长 (家长选项)')}</label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                  {safeMembers.filter(m => m.role === 'parent').map(parent => (
                    <button 
                      key={parent.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, creatorId: parent.id })}
                      className={cn(
                        "flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-left",
                        formData.creatorId === parent.id 
                          ? "border-[#98EE99] bg-[#98EE99]/5 shadow-sm" 
                          : "border-outline-variant/5 bg-surface-container-low/30"
                      )}
                    >
                      <TextAvatar src={parent.avatar} name={parent.name} size={40} className="shadow-sm bg-white" />
                      <span className={cn("font-bold text-xs sm:text-sm", formData.creatorId === parent.id ? "text-[#2E7D32]" : "text-on-surface-variant")}>
                         {parent.name}
                      </span>
                    </button>
                  ))}
                </div>
                
                <div className="h-[1px] bg-outline-variant/5 mx-[-24px] mb-4" />

                <label className="text-[10px] font-black text-on-surface-variant/30 pl-1 uppercase tracking-widest block mb-2">{t('publish_task.child_executor', '执行的小朋友')}</label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {children.map(kid => (
                    <button 
                      key={kid.id}
                      type="button"
                      onClick={() => {
                        const current = formData.assigneeIds || [];
                        const updated = current.includes(kid.id) 
                          ? current.filter(id => id !== kid.id) 
                          : [...current, kid.id];
                        setFormData({
                          ...formData,
                          assigneeIds: updated
                        });
                      }}
                      className={cn(
                        "flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl border-2 transition-all text-left",
                        formData.assigneeIds?.includes(kid.id) 
                          ? "border-[#98EE99] bg-[#98EE99]/5 shadow-sm" 
                          : "border-outline-variant/5 bg-surface-container-low/30"
                      )}
                    >
                      <TextAvatar src={kid.avatar} name={kid.name} size={40} className="shadow-sm bg-white" />
                      <span className={cn("font-bold text-xs sm:text-sm", formData.assigneeIds?.includes(kid.id) ? "text-[#2E7D32]" : "text-on-surface-variant")}>
                         {kid.name}
                      </span>
                    </button>
                  ))}
                </div>
             </div>
          </div>
        )}

        {/* Submit Button Block (Shared but logic varies) */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 sm:p-6 bg-gradient-to-t from-[#FDFCF9] via-[#FDFCF9] to-transparent">
          <div className="max-w-md mx-auto">
            <button 
              type="submit"
              className="w-full py-4 sm:py-5 bg-[#98EE99] text-[#2E7D32] font-black text-lg sm:text-xl rounded-full shadow-[0_12px_40px_-5px_rgba(152,238,153,0.4)] border-4 border-white active:scale-[0.98] transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full animate-[shimmer_3s_infinite]" />
              {isEdit ? t('common.save', '保存修改') : t('publish_task.submit_add', '确认添加')}
            </button>
          </div>
        </div>
      </form>

      <div className="h-4" />

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCategoryModal(false)}
          />
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-sm overflow-hidden relative z-10 animate-in fade-in zoom-in duration-300">
            <header className="flex justify-between items-center mb-8">
              <button 
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="w-10 h-10 flex items-center justify-center text-on-surface-variant/40"
              >
                <Plus size={28} className="rotate-45" />
              </button>
              <h3 className="text-xl font-black">{t('publish_task.select_category', '请选择')}</h3>
              <button 
                type="button"
                onClick={() => {
                  setFormData({ ...formData, type: tempCategory as any });
                  setShowCategoryModal(false);
                }}
                className="w-10 h-10 flex items-center justify-center text-[#98EE99]"
              >
                <Check size={28} strokeWidth={3} />
              </button>
            </header>

            <div className="space-y-1 mb-8 max-h-[40vh] overflow-y-auto no-scrollbar py-2">
              {pickerCategories.map((cat) => (
                <button 
                  key={cat}
                  type="button"
                  onClick={() => setTempCategory(cat)}
                  className={cn(
                    "w-full py-4 rounded-2xl text-lg font-bold transition-all text-center",
                    tempCategory === cat ? "bg-surface-container text-on-surface" : "text-on-surface-variant/20 hover:text-on-surface-variant"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="pt-6 border-t border-dashed border-outline-variant/10 text-center">
              <button 
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setShowTagManagementModal(true);
                }}
                className="text-xl font-black text-on-surface hover:opacity-70 transition-opacity"
              >
                {t('publish_task.tag_management', '标签管理')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Selector Modal */}
      <AnimatePresence>
        {showTimeModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowTimeModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full max-w-sm overflow-hidden relative z-10"
            >
              <header className="flex justify-between items-center mb-10">
                <button 
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="w-10 h-10 flex items-center justify-center text-on-surface-variant/40"
                >
                  <Plus size={28} className="rotate-45" />
                </button>
                <h3 className="text-xl font-black">{t('publish_task.time_period', '时段')}</h3>
                <button 
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="w-10 h-10 flex items-center justify-center text-[#98EE99]"
                >
                  <Check size={28} strokeWidth={3} />
                </button>
              </header>

              <div className="relative flex justify-between h-48 mb-6">
                {/* Column Selection Highlights */}
                <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-12 bg-surface-container-low rounded-2xl z-0 pointer-events-none" />
                
                {/* Hours */}
                <div className="flex-1 overflow-y-auto no-scrollbar snap-y snap-mandatory z-10 py-16">
                  {[...Array(24)].map((_, i) => (
                    <button 
                      key={i} 
                      onClick={() => setSelectedHour(i)}
                      className={cn(
                        "w-full h-12 flex items-center justify-center snap-center text-lg font-bold transition-all",
                        selectedHour === i ? "text-on-surface scale-110" : "text-on-surface-variant/20 scale-90"
                      )}
                    >
                      {i.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>

                {/* Minutes */}
                <div className="flex-1 overflow-y-auto no-scrollbar snap-y snap-mandatory z-10 py-16">
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <button 
                      key={m} 
                      onClick={() => setSelectedMinute(m)}
                      className={cn(
                        "w-full h-12 flex items-center justify-center snap-center text-lg font-bold transition-all",
                        selectedMinute === m ? "text-on-surface scale-110" : "text-on-surface-variant/20 scale-90"
                      )}
                    >
                      {m.toString().padStart(2, '0')}
                    </button>
                  ))}
                </div>

                {/* Durations */}
                <div className="flex-1 overflow-y-auto no-scrollbar snap-y snap-mandatory z-10 py-16">
                  {durations.map((d, i) => (
                    <button 
                      key={d} 
                      onClick={() => setDurationIdx(i)}
                      className={cn(
                        "w-full h-12 flex items-center justify-center snap-center text-sm font-bold transition-all",
                        durationIdx === i ? "text-on-surface scale-110" : "text-on-surface-variant/20 scale-90"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8 pl-4 border-l-2 border-[#98EE99]/30">
                <p className="text-sm font-black text-on-surface-variant/40">
                   {t('publish_task.time_execution', '该目标执行时段：{{time}}', { time: getTimeLabel() })}
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t border-dashed border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 group-hover:text-primary transition-colors">
                      <Clock size={24} className={cn(isTimeEnabled && "text-primary")} />
                    </div>
                    <span className="text-lg font-bold">{t('publish_task.reminder', '提醒')}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsReminderOn(!isReminderOn)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all flex items-center px-1",
                      isReminderOn ? "bg-[#98EE99]" : "bg-outline-variant/30"
                    )}
                  >
                    <motion.div 
                      layout
                      className="w-4 h-4 bg-white rounded-full shadow-sm"
                      style={{ marginLeft: isReminderOn ? 'auto' : '0' }}
                    />
                  </button>
                </div>
                <p className="text-xs font-bold text-on-surface-variant/40 leading-relaxed italic">
                  {t('publish_task.reminder_hint', '开启后在任务开始前5分钟响铃（App需后台运行）')}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tag Management Modal */}
      <AnimatePresence>
        {showTagManagementModal && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[120] bg-white flex flex-col"
          >
            <header className="flex justify-between items-center px-6 py-4 border-b border-outline-variant/5">
              <button 
                onClick={() => setShowTagManagementModal(false)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/50 text-on-surface-variant"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="text-xl font-black text-on-surface">{t('publish_task.tag_management', '标签管理')}</h2>
              <button 
                onClick={() => setIsAddingTag(true)}
                className="w-10 h-10 flex items-center justify-center text-on-surface"
              >
                <Plus size={24} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {isAddingTag && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-6 py-6 bg-surface-container/30 border-b border-outline-variant/5"
                >
                  <div className="flex gap-4">
                    <input 
                      autoFocus
                      type="text"
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      placeholder={t('publish_task.tag_name_placeholder', '输入标签名称')}
                      className="flex-1 bg-white border-none rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary/20 shadow-sm"
                      onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                    />
                    <button 
                      onClick={handleAddTag}
                      className="px-6 py-3 bg-[#98EE99] text-primary rounded-xl font-black text-sm shadow-sm"
                    >
                      {t('publish_task.add_tag', '添加')}
                    </button>
                    <button
                      onClick={() => setIsAddingTag(false)}
                      className="px-4 py-3 text-on-surface-variant/60 font-bold text-sm"
                    >
                      {t('publish_task.cancel_tag', '取消')}
                    </button>
                  </div>
                </motion.div>
              )}
              
              <div className="divide-y divide-outline-variant/5">
                {pickerCategories.map((cat) => (
                  <div key={cat} className="flex items-center px-6 py-6 group bg-white active:bg-surface-container/50 transition-colors">
                    <div className="w-8 flex items-center justify-center text-on-surface-variant/10 mr-4">
                       <div className="grid grid-cols-2 gap-1 px-1">
                          {[...Array(6)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-current" />)}
                       </div>
                    </div>
                    <span className="flex-1 font-bold text-lg">{cat}</span>
                    <button 
                       onClick={() => handleDeleteTag(cat)}
                       className="w-10 h-10 flex items-center justify-center text-red-500 opacity-20 hover:opacity-100 transition-opacity"
                    >
                      <Plus size={20} className="rotate-45" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-8 pb-12 bg-surface-container-lowest border-t border-outline-variant/5 text-center">
               <p className="text-xs font-bold text-on-surface-variant/40 leading-relaxed italic">
                 {t('publish_task.tag_hint', '提示：你可以随心所欲增删属于你的探险标签 🍃')}
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Repeat Selector Modal */}
      <AnimatePresence>
        {showRepeatModal && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowRepeatModal(false)}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white rounded-t-[3.5rem] p-8 pb-12 shadow-2xl w-full max-h-[90vh] overflow-y-auto no-scrollbar relative z-10"
            >
              <div className="flex justify-between items-center mb-8">
                 <div className="flex gap-8">
                    {['weekly', 'monthly', 'calendar'].map((tab) => (
                      <button 
                         key={tab}
                         onClick={() => setRepeatTab(tab as any)}
                         className="relative py-2"
                      >
                         <span className={cn(
                           "text-xl font-black transition-colors",
                           repeatTab === tab ? "text-on-surface" : "text-on-surface-variant/30"
                         )}>
                            {tab === 'weekly' ? t('publish_task.weekly', '每周') : tab === 'monthly' ? t('publish_task.monthly', '每月') : t('publish_task.calendar', '日历')}
                         </span>
                         {repeatTab === tab && (
                           <motion.div 
                              layoutId="tab-underline"
                              className="absolute bottom-0 left-0 right-0 h-1 bg-[#98EE99] rounded-full"
                           />
                         )}
                      </button>
                    ))}
                 </div>
                 <button 
                    onClick={() => setShowRepeatModal(false)}
                    className="w-12 h-12 flex items-center justify-center rounded-full text-[#98EE99]"
                 >
                    <Check size={32} strokeWidth={3} />
                 </button>
              </div>

              {repeatTab === 'weekly' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="grid grid-cols-5 gap-3">
                      {dayNames.map((name, i) => (
                        <button 
                          key={name}
                          onClick={() => {
                             const val = dayValues[i];
                             setSelectedDays(prev => 
                               prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
                             );
                          }}
                          className={cn(
                            "aspect-square rounded-full flex items-center justify-center text-sm font-black transition-all border-2",
                            selectedDays.includes(dayValues[i]) 
                              ? "bg-[#98EE99]/10 border-[#98EE99] text-[#2E7D32]" 
                              : "bg-surface-container-low border-transparent text-on-surface-variant/40"
                          )}
                        >
                          {name}
                        </button>
                      ))}
                   </div>
                </div>
              )}

              {repeatTab === 'monthly' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                      {[...Array(31)].map((_, i) => (
                        <button 
                          key={i+1}
                          onClick={() => {
                            const day = i + 1;
                            setSelectedMonthDays(prev => 
                              prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                            );
                          }}
                          className={cn(
                            "aspect-square rounded-full flex items-center justify-center text-sm font-black transition-all border-2",
                            selectedMonthDays.includes(i + 1)
                              ? "bg-[#98EE99]/10 border-[#98EE99] text-[#2E7D32]"
                              : "bg-surface-container-low border-transparent text-on-surface-variant/40"
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                   </div>
                </div>
              )}

              {repeatTab === 'calendar' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                   <div className="flex justify-between items-center px-4">
                      <button onClick={() => setCalendarViewDate(subMonths(calendarViewDate, 1))} className="p-2 text-on-surface-variant">
                         <ChevronLeft size={24} />
                      </button>
                      <h2 className="text-xl font-black text-on-surface">
                         {format(calendarViewDate, 'yyyy年MM月', { locale: zhCN })}
                      </h2>
                      <button onClick={() => setCalendarViewDate(addMonths(calendarViewDate, 1))} className="p-2 text-on-surface-variant">
                         <ChevronRight size={24} />
                      </button>
                   </div>

                   <div className="grid grid-cols-7 text-center mb-2">
                      {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
                        <span key={d} className="text-sm font-bold text-on-surface-variant/40">{t('publish_task.week_prefix', '周')}{(t('publish_task.week_headers', ['一', '二', '三', '四', '五', '六', '日']) as string[])[i]}</span>
                      ))}
                   </div>

                   <div className="grid grid-cols-7 gap-y-2">
                      {getCalendarDays().map((day, i) => {
                        const isSelected = selectedCalendarDates.some(d => isSameDay(d, day));
                        const isCurrentMonth = format(day, 'MM') === format(calendarViewDate, 'MM');
                        
                        return (
                          <button 
                            key={i}
                            onClick={() => {
                              setSelectedCalendarDates(prev => 
                                prev.some(d => isSameDay(d, day)) 
                                  ? prev.filter(d => !isSameDay(d, day)) 
                                  : [...prev, day]
                              );
                            }}
                            className={cn(
                              "aspect-square flex flex-col items-center justify-center relative",
                              !isCurrentMonth && "opacity-20 pointer-events-none text-on-surface-variant/20"
                            )}
                          >
                            <span className={cn(
                              "w-10 h-10 flex items-center justify-center rounded-full text-base font-black transition-all",
                              isSelected ? "bg-[#98EE99] text-[#2E7D32]" : "text-on-surface",
                              isToday(day) && !isSelected && "border-2 border-[#98EE99]/50"
                            )}>
                              {format(day, 'd')}
                            </span>
                          </button>
                        );
                      })}
                   </div>
                </div>
              )}

              {/* Shared Quick-Select Buttons */}
              <div className="mt-12 grid grid-cols-4 gap-3">
                {[
                  { label: t('publish_task.quick_workday', '工作日'), action: () => { setRepeatTab('weekly'); setSelectedDays([1, 2, 3, 4, 5]); } },
                  { label: t('publish_task.quick_weekend', '周末'), action: () => { setRepeatTab('weekly'); setSelectedDays([6, 0]); } },
                  { label: t('publish_task.quick_odd_days', '每月单日'), action: () => { setRepeatTab('monthly'); setSelectedMonthDays([...Array(31)].map((_,i)=>i+1).filter(d => d % 2 !== 0)); } },
                  { label: t('publish_task.quick_even_days', '每月双日'), action: () => { setRepeatTab('monthly'); setSelectedMonthDays([...Array(31)].map((_,i)=>i+1).filter(d => d % 2 === 0)); } },
                  { label: t('publish_task.quick_ebbinghaus', '艾宾浩斯'), action: () => { 
                    // Ebbinghaus pattern: Day 1, 2, 4, 7, 15, 30 from today
                    const today = new Date();
                    const dates = [1, 2, 4, 7, 15, 30].map(offset => {
                      const d = new Date(today);
                      d.setDate(d.getDate() + offset);
                      return d;
                    });
                    setRepeatTab('calendar');
                    setSelectedCalendarDates(dates);
                  }},
                  { label: t('publish_task.quick_21day', '21天习惯'), action: () => {
                    const today = new Date();
                    const dates = [...Array(21)].map((_, i) => {
                      const d = new Date(today);
                      d.setDate(d.getDate() + i);
                      return d;
                    });
                    setRepeatTab('calendar');
                    setSelectedCalendarDates(dates);
                  }},
                ].map(btn => (
                  <button 
                    key={btn.label}
                    onClick={btn.action}
                    className="py-3 px-2 bg-surface-container-low/60 rounded-full text-[10px] font-black text-on-surface-variant transition-all hover:bg-surface-container active:scale-95"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-dashed border-outline-variant/10">
                <p className="text-sm font-black text-on-surface-variant/40 leading-relaxed italic">
                   {repeatTab === 'weekly' ? t('publish_task.weekly_score', '每周可评分') : repeatTab === 'monthly' ? t('publish_task.monthly_score', '每月固定日期可评分') : t('publish_task.calendar_score', '指定日期可评分')}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Template Selector Modal */}
      <AnimatePresence>
        {(showTemplateSelector || showIconPicker) && (
          <div className="fixed inset-0 z-[200]">
            <TaskTemplateSelector 
              onSelect={handleSelectTemplate}
              onClose={() => {
                setShowTemplateSelector(false);
                setShowIconPicker(false);
              }}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingItem({ icon, label, value, onClick }: { 
  icon?: React.ReactNode, 
  label: string, 
  value: string, 
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="w-full flex items-center justify-between p-5 py-6 active:bg-surface-container hover:bg-surface-container/30 transition-colors text-left group">
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 group-hover:text-primary transition-colors">
            {icon}
          </div>
        ) : null}
        <span className="font-bold text-lg text-on-surface">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-base font-bold text-on-surface-variant/40">{value}</span>
        <ChevronRight size={18} className="text-on-surface-variant/20" />
      </div>
    </button>
  );
}
