import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useFamily } from '../context/FamilyContext';
import { showToastGlobal } from '../components/Toast';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
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
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { Task, TaskStatus } from '../types';
import { cn } from '../lib/utils';
import { TextAvatar } from '../components/TextAvatar';
import { TaskTemplateSelector } from '../components/TaskTemplateSelector';
import { AppModal } from '../components/AppModal';
import { getRegisteredTaskIcon } from '../lib/lucideIconRegistry';
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function PublishTask() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const planIdFromQuery = searchParams.get('planId') || undefined;
  const { addTask, updateTask, members, currentUser, tasks, familyId, guestMode } = useFamily();
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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

  // Plan Selection State
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planList, setPlanList] = useState<Array<{ id: string; name: string; type: string }>>([]);

  const _rawDurations: any = (t as any)('publish_task.durations', ['30分钟', '1小时', '2小时', '3小时', '4小时', '5小时', '6小时']);
  const durations: string[] = Array.isArray(_rawDurations) ? _rawDurations : ['30分钟', '1小时', '2小时', '3小时', '4小时', '5小时', '6小时'];
  const durationValues = [30, 60, 120, 180, 240, 300, 360];

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    planId: planIdFromQuery,
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
          frequency: templateData.frequency || (mode === 'habit' ? 'daily' : 'once'),
          icon: typeof templateData.icon === 'string' ? templateData.icon : 'ListTodo',
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
          icon: safeTemplate.icon,
        }));

        if (safeTemplate.description) setShowDescInput(true);
        setIsRepeatEnabled(safeTemplate.frequency !== 'once' || mode === 'habit');
      }
    } catch (err) {
      console.error("Critical error in template initialization:", err);
    }
  }, [location.state]); // Only depend on state for trigger

  // Load plans from Supabase
  useEffect(() => {
    async function loadPlans() {
      if (familyId && !guestMode && UUID_PATTERN.test(familyId)) {
        const { data } = await supabase
          .from('plans')
          .select('id, name, type')
          .eq('family_id', familyId)
          .eq('is_active', true)
          .order('sort_order');
        setPlanList(data || []);
        return;
      }
      setPlanList([]);
    }
    loadPlans();
  }, [familyId, guestMode]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      if ('preventDefault' in e) e.preventDefault();
      if ('stopPropagation' in e) e.stopPropagation();
    }

    if (!formData.title?.trim()) return;

    setIsSaving(true);
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
        await updateTask({
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

        await addTask({
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
    } catch (error: any) {
      console.error('Failed to save task:', error);
      showToastGlobal(error.message || '保存失败，请重试', 'error');
    } finally {
      setIsSaving(false);
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
    const IconComponent = getRegisteredTaskIcon(name);
    if (IconComponent) return <IconComponent size={size} className={className} />;
    return <ListTodo size={size} className={className} />;
  };

  const renderSwitch = (checked: boolean, onToggle: () => void, label: string) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative flex h-11 min-h-11 w-16 min-w-16 items-center rounded-full p-2 transition-colors shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/25",
        checked ? "bg-primary" : "bg-surface-container"
      )}
    >
      <span
        className={cn(
          "h-7 w-7 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );

  const _rawDayNames: any = (t as any)('publish_task.weekday_labels', ['周一', '周二', '周三', '周四', '周五', '周六', '周日']);
  const dayNames: string[] = Array.isArray(_rawDayNames) ? _rawDayNames : ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const _rawWeekHeaders: any = (t as any)('publish_task.week_headers', ['一', '二', '三', '四', '五', '六', '日']);
  const weekHeaders: string[] = Array.isArray(_rawWeekHeaders) ? _rawWeekHeaders : ['一', '二', '三', '四', '五', '六', '日'];
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
    <div className="ui-create-page min-h-screen bg-surface pb-32">
      <header className="ui-create-header flex justify-between items-center px-4 sm:px-6 py-4 bg-surface/80 backdrop-blur-xl sticky top-[var(--app-sticky-top,0px)] z-50">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/50 text-on-surface-variant transition-colors hover:bg-surface-container active:scale-95">
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
              className="flex items-center gap-1 px-3 sm:px-4 py-2 bg-primary-surface/20 rounded-full text-primary-text text-xs sm:text-sm font-black transition-all active:scale-95 shrink-0"
            >
              {t('publish_task.import', '导入')} <ChevronRight size={14} strokeWidth={3} />
            </button>
          )}

        </div>
      </header>

      <form onSubmit={handleSave} className="ui-create-form px-4 sm:px-6 space-y-3 mt-2 pb-safe">
        {viewMode === 'target' ? (
          <>
            {/* Title and Category Card */}
            <div className="ui-create-card bg-white rounded-[2rem] p-4 sm:p-5 shadow-sm border border-outline-variant/5">
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
                    className="flex-1 min-h-11 border-none bg-transparent px-0 py-2 text-xl font-black placeholder:text-on-surface-variant/10 focus:ring-0 min-w-0"
                  />
                </div>
              </div>

              <div className="h-[1px] bg-outline-variant/5 -mx-4 sm:-mx-5 mb-2" />

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
            <div className="ui-create-card bg-white rounded-[2rem] overflow-hidden shadow-sm border border-outline-variant/5">
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
                      {renderSwitch(isRepeatEnabled, () => setIsRepeatEnabled(!isRepeatEnabled), t('publish_task.repeat', '重复'))}
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
                    {renderSwitch(isTimeEnabled, () => setIsTimeEnabled(!isTimeEnabled), t('publish_task.time_slot', '时段'))}
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
              <div
                onClick={() => setShowPlanModal(true)}
                className="flex items-center justify-between p-3.5 px-4 sm:p-4 sm:px-5 active:bg-surface-container/30 transition-all cursor-pointer"
              >
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
                    {selectedPlanId ? (
                      <>
                        <span className="bg-primary text-white px-1.5 py-0.5 rounded text-[9px] font-black">{t('publish_task.selected_badge', '选')}</span>
                        <span className="text-sm font-bold text-on-surface">{planList.find(p => p.id === selectedPlanId)?.name || t('publish_task.vacation_plan', '假期计划')}</span>
                      </>
                    ) : (
                      <>
                        <span className="bg-amber-500 text-white px-1 py-0.5 rounded text-[8px] font-black">{t('publish_task.vacation_badge', '假')}</span>
                        <span className="text-sm font-bold text-on-surface">{t('publish_task.select_plan', '选择计划')}</span>
                      </>
                    )}
                    <ChevronRight size={14} className="text-on-surface-variant/20 ml-1" />
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Habit Mode Layout (Screenshot Inspired) */
          <div className="space-y-3">
            {/* Title Card */}
             <div className="ui-create-card bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                   <span className="text-sm font-black text-on-surface-variant/40">{t('publish_task.habit_title', '标题')}</span>
                </div>
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => navigate('/tasks/templates', { state: { fromMode: viewMode } })}
                    className="flex items-center gap-1 px-3 py-1 bg-primary-surface/10 rounded-full text-primary-text text-xs font-black transition-all active:scale-95"
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

            {/* Image Selection Card (Local File Picker) */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="ui-create-card bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-outline-variant/5 cursor-pointer active:bg-surface-container transition-colors ring-offset-2 focus:ring-2 focus:ring-primary/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setSelectedImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <div className="flex items-center gap-3">
                <ImageIcon size={20} className="text-on-surface-variant/30" />
                <span className="text-sm font-bold text-on-surface-variant/40">{t('publish_task.select_image', '选择图片 (可选)')}</span>
              </div>
              <div className="flex items-center gap-2">
                {selectedImage ? (
                  <img src={selectedImage} alt="" className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
                    <RenderIcon name={formData.icon || 'Sparkles'} size={24} />
                  </div>
                )}
                <ChevronRight size={18} className="text-on-surface-variant/20" />
              </div>
            </div>

            {/* Reset Toggle Card */}
            <div className="ui-create-card bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-outline-variant/5">
              <div className="flex items-center gap-3">
                <RefreshCw size={20} className="text-on-surface-variant/30" />
                <span className="text-sm font-bold text-on-surface">{t('publish_task.multi_checkin', '日内可以多次打卡')}</span>
              </div>
              {renderSwitch(resetAfterClaim, () => setResetAfterClaim(!resetAfterClaim), t('publish_task.multi_checkin', '日内可以多次打卡'))}
            </div>

            {/* Stars Card */}
            <div className="ui-create-card bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-outline-variant/5">
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
            <div className="ui-create-card bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-outline-variant/5">
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
            <div className="ui-create-card bg-white rounded-2xl p-4 space-y-4 shadow-sm border border-outline-variant/5">
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
          <div className="bg-white rounded-[2rem] p-4 sm:p-5 shadow-sm space-y-4 border border-outline-variant/5">
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
                     className="h-11 min-h-11 w-11 min-w-11 bg-transparent border-none text-center font-black text-base sm:text-lg text-on-surface focus:ring-0 p-0"
                   />
                   <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, rewardStars: (prev.rewardStars || 0) + 1 }))}
                      className="w-8 h-8 flex items-center justify-center text-on-surface-variant/40 hover:text-primary transition-colors text-xl font-bold"
                   >
                     +
                   </button>
                   <div className="ml-2 w-6 h-6 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Star size={12} className="text-secondary fill-current" />
                   </div>
                </div>
             </div>

             <div className="h-[1px] bg-outline-variant/5 -mx-4 sm:-mx-5" />

             <div className="min-w-0 overflow-hidden">
                <label className="text-safe text-[10px] font-black text-on-surface-variant/30 pl-1 uppercase tracking-normal sm:tracking-widest block mb-3">{t('publish_task.parent_publisher', '发布家长 (家长选项)')}</label>
                <div className="flex flex-wrap gap-4 mb-5">
                  {safeMembers.filter(m => m.role === 'parent').map(parent => (
                    <button
                      key={parent.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, creatorId: parent.id })}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-full p-0.5 transition-all relative",
                        formData.creatorId === parent.id ? "ring-2 ring-primary" : ""
                      )}>
                        <TextAvatar src={parent.avatar} name={parent.name} size={52} />
                        {formData.creatorId === parent.id && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                            <Check size={12} strokeWidth={4} />
                          </div>
                        )}
                      </div>
                      <span className={cn("text-xs font-bold", formData.creatorId === parent.id ? "text-primary-text" : "text-on-surface-variant")}>
                         {parent.name}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="h-[1px] bg-outline-variant/5 mb-4" />

                <label className="text-safe text-[10px] font-black text-on-surface-variant/30 pl-1 uppercase tracking-normal sm:tracking-widest block mb-3">{t('publish_task.child_executor', '执行的小朋友')}</label>
                <div className="flex flex-wrap gap-4">
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
                      className="flex flex-col items-center gap-2"
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-full p-0.5 transition-all relative",
                        formData.assigneeIds?.includes(kid.id) ? "ring-2 ring-primary" : ""
                      )}>
                        <TextAvatar src={kid.avatar} name={kid.name} size={52} />
                        {formData.assigneeIds?.includes(kid.id) && (
                          <div className="absolute -bottom-0.5 -right-0.5 bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                            <Check size={12} strokeWidth={4} />
                          </div>
                        )}
                      </div>
                      <span className={cn("text-xs font-bold", formData.assigneeIds?.includes(kid.id) ? "text-primary-text" : "text-on-surface-variant")}>
                         {kid.name}
                      </span>
                    </button>
                  ))}
                </div>
             </div>
          </div>
        )}

        {/* Submit Button Block (Shared but logic varies) */}
        <div className="pt-2 pb-6">
          <button
            type="submit"
            disabled={isSaving}
            className="ui-create-submit w-full min-h-14 bg-primary text-white font-black text-base sm:text-lg rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-40 pointer-events-none" />
            {!isSaving && !isEdit && <Plus size={20} strokeWidth={3} className="inline-block mr-2 align-[-3px]" />}
            {isSaving
              ? t('publish_task.saving', '保存中...')
              : isEdit
                ? t('common.save', '保存修改')
                : t('publish_task.submit_add', '确认添加')
            }
          </button>
        </div>
      </form>

      <div className="h-4" />

      {/* Category Modal */}
      {showCategoryModal && (
        <AppModal
          open={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          title={t('publish_task.select_category', '请选择')}
          surface="sheet"
          zIndexClass="z-[100]"
          headerAction={
            <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, type: tempCategory as any });
                  setShowCategoryModal(false);
                }}
                className="w-10 h-10 flex items-center justify-center text-primary-surface"
              >
                <Check size={28} strokeWidth={3} />
              </button>
          }
        >
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
        </AppModal>
      )}

      {/* Time Selector Modal */}
      <AnimatePresence>
        {showTimeModal && (
          <AppModal
          open={showTimeModal}
          onClose={() => setShowTimeModal(false)}
          title={t('publish_task.time_period', '时段')}
            surface="sheet"
            zIndexClass="z-[120]"
            bodyClassName="px-6 py-6"
            headerAction={
              <button
                  type="button"
                  onClick={() => setShowTimeModal(false)}
                  className="w-10 h-10 flex items-center justify-center text-primary-surface"
                >
                  <Check size={28} strokeWidth={3} />
                </button>
            }
          >
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

              <div className="mb-8 pl-4 border-l-2 border-primary-surface/30">
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
                      isReminderOn ? "bg-primary-surface" : "bg-outline-variant/30"
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
          </AppModal>
        )}
      </AnimatePresence>

      {/* Tag Management Modal */}
      <AnimatePresence>
        {showTagManagementModal && (
          <AppModal
            open={showTagManagementModal}
            onClose={() => setShowTagManagementModal(false)}
            title={t('publish_task.tag_management', '标签管理')}
            surface="fullscreen"
            zIndexClass="z-[140]"
            bodyClassName="px-0 py-0"
            headerAction={
              <button
                onClick={() => setIsAddingTag(true)}
                className="ui-task-add-button w-10 h-10 flex items-center justify-center rounded-xl text-on-surface"
                aria-label={t('publish_task.add_tag', '添加')}
              >
                <Plus size={24} />
              </button>
            }
            footer={
              <p className="text-center text-xs font-bold text-on-surface-variant/60 leading-relaxed italic">
                {t('publish_task.tag_hint', '提示：你可以随心所欲增删属于你的探险标签 🍃')}
              </p>
            }
          >
            <div className="min-h-full bg-background">
              {isAddingTag && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="px-6 py-6 bg-surface-container/30 border-b border-outline-variant/10"
                >
                  <div className="flex gap-4">
                    <input
                      autoFocus
                      type="text"
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      placeholder={t('publish_task.tag_name_placeholder', '输入标签名称')}
                      className="flex-1 bg-surface border border-outline-variant/10 rounded-xl px-4 py-3 font-bold text-on-surface focus:ring-2 focus:ring-primary/20 shadow-sm"
                      onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-6 py-3 bg-primary text-on-primary rounded-xl font-black text-sm shadow-sm"
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

              <div className="divide-y divide-outline-variant/10">
                {pickerCategories.map((cat) => (
                  <div key={cat} className="flex items-center px-6 py-6 group bg-surface active:bg-surface-container/50 transition-colors">
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
          </AppModal>
        )}
      </AnimatePresence>

      {/* Repeat Selector Modal */}
      <AnimatePresence>
        {showRepeatModal && (
          <AppModal
            open={showRepeatModal}
            onClose={() => setShowRepeatModal(false)}
            title={t('publish_task.repeat_rule', '重复规则')}
            surface="sheet"
            zIndexClass="z-[120]"
            className="max-h-[90svh]"
            bodyClassName="px-6 py-5"
            headerAction={
              <button
                onClick={() => setShowRepeatModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full text-primary-surface"
              >
                <Check size={30} strokeWidth={3} />
              </button>
            }
          >
              <div className="mb-8 flex justify-center">
                 <div className="flex gap-8 overflow-x-auto no-scrollbar">
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
                              className="absolute bottom-0 left-0 right-0 h-1 bg-primary-surface rounded-full"
                           />
                         )}
                      </button>
                    ))}
                 </div>
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
                              ? "bg-primary-surface/10 border-primary-surface text-primary-text"
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
                              ? "bg-primary-surface/10 border-primary-surface text-primary-text"
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
                        <span key={d} className="text-sm font-bold text-on-surface-variant/40">{t('publish_task.week_prefix', '周')}{weekHeaders[i]}</span>
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
                              isSelected ? "bg-primary-surface text-primary-text" : "text-on-surface",
                              isToday(day) && !isSelected && "border-2 border-primary-surface/50"
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
          </AppModal>
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

      {/* Plan Selection Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <AppModal
            open={showPlanModal}
            onClose={() => setShowPlanModal(false)}
            title={t('publish_task.plan_selector_title', '选择计划')}
            surface="sheet"
            zIndexClass="z-[120]"
          >
              <div className="space-y-2.5 mb-8">
                {/* 不选择计划 option */}
                <button
                  onClick={() => { setSelectedPlanId(null); setShowPlanModal(false); }}
                  className={cn(
                    "w-full p-4 rounded-2xl flex items-center justify-between transition-all border-2",
                    !selectedPlanId
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/10 bg-white active:bg-surface-container/50"
                  )}
                >
                  <span className={cn("font-bold text-base", !selectedPlanId ? "text-primary" : "text-on-surface")}>
                    {t('publish_task.no_plan', '不选择计划')}
                  </span>
                </button>

                {planList.length === 0 ? (
                  <div className="py-8 text-center text-on-surface-variant/40">
                    <p className="text-sm font-bold">
                      {t('publish_task.no_plan_hint', '暂无计划，可前往计划页面创建')}
                    </p>
                  </div>
                ) : (
                  planList.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => { setSelectedPlanId(plan.id); setShowPlanModal(false); }}
                      className={cn(
                        "w-full p-4 rounded-2xl flex items-center justify-between transition-all border-2",
                        selectedPlanId === plan.id
                          ? "border-primary bg-primary/5"
                          : "border-outline-variant/10 bg-white active:bg-surface-container/50"
                      )}
                    >
                      <span className={cn("font-bold text-base", selectedPlanId === plan.id ? "text-primary" : "text-on-surface")}>
                        {plan.name}
                      </span>
                      {selectedPlanId === plan.id && (
                        <CheckCircle2 size={20} className="text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
          </AppModal>
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
