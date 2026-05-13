import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '../../lib/utils';

export interface CalendarTask {
  id: string;
  startTime: string;
  [key: string]: any;
}

export interface CalendarViewProps {
  /** 任务列表，用于在日期格中显示小圆点指示器 */
  tasks: CalendarTask[];
  /** 选中的日期变化回调 */
  onDateSelect?: (date: Date) => void;
  /** 初始选中的日期 */
  initialDate?: Date;
  /** 星期标题文本，默认中文 */
  dayLabels?: string[];
  /** 额外的 CSS 类 */
  className?: string;
}

/**
 * 可复用的日历视图组件
 *
 * 功能：
 * - 月份导航（上/下月）
 * - 日期网格（7列）
 * - 日期选择（单选）
 * - 任务点指示器（当天有任务显示小圆点）
 * - 今天高亮
 *
 * 使用场景：
 * - 任务列表页的日历视图
 * - 首页的迷你日历
 * - 计划页的日期选择器
 */
export function CalendarView({
  tasks = [],
  onDateSelect,
  initialDate,
  dayLabels = ['日', '一', '二', '三', '四', '五', '六'],
  className,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
    onDateSelect?.(day);
  };

  const hasTaskOnDay = (day: Date) =>
    tasks.some(t => isSameDay(new Date(t.startTime), day));

  return (
    <div className={cn('space-y-5', className)}>
      {/* 月份导航 */}
      <div className="flex items-center justify-between px-2">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
          type="button"
          aria-label="上个月"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-bold tracking-tight">
          {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
          type="button"
          aria-label="下个月"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* 日历网格 */}
      <div className="bg-surface rounded-[2rem] p-4 shadow-sm border border-outline-variant/10">
        {/* 星期标题行 */}
        <div className="grid grid-cols-7 text-center mb-4 text-on-surface-variant/40 font-bold text-[10px] uppercase tracking-widest">
          {dayLabels.map(d => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* 日期网格 */}
        <div className="grid grid-cols-7 gap-y-4 gap-x-2">
          {calendarDays.map((day, idx) => {
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);

            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                className={cn(
                  'flex flex-col items-center justify-center py-2 relative text-sm font-bold transition-all rounded-full h-10 w-10 mx-auto',
                  isSelected
                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                    : 'hover:bg-surface-container',
                  isTodayDate && !isSelected && 'text-primary font-black'
                )}
                type="button"
              >
                <span className="z-10">{format(day, 'd')}</span>
                {hasTaskOnDay(day) && (
                  <div
                    className={cn(
                      'w-1 h-1 rounded-full absolute bottom-1',
                      isSelected ? 'bg-white' : 'bg-primary'
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 获取当前 CalendarView 选中的日期格式化文本
 */
export function getSelectedDateLabel(date: Date): string {
  return format(date, 'M月d日 EEEE', { locale: zhCN });
}
