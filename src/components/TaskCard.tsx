import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ListTodo, Star, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { Task as TaskType } from '../types';
import { useFamily } from '../context/FamilyContext';
import * as LucideIcons from 'lucide-react';

interface TaskCardProps {
  task: TaskType;
  idx: number;
  onClick: () => void;
  onCheckIn?: (id: string) => void;
  isAdmin: boolean;
  isHabit?: boolean;
}

const getTaskIcon = (iconName: string, size = 24) => {
  if (!iconName) return <ListTodo size={size} />;
  // 支持本地 PNG 文件路径（如 /task-icons/study/xxx.png）
  if (iconName.startsWith('/') || iconName.startsWith('http')) {
    return <img src={iconName} alt="" className="object-contain" style={{ width: size, height: size }} />;
  }
  const IconComponent = (LucideIcons as any)[iconName];
  if (IconComponent) return <IconComponent size={size} />;
  return <ListTodo size={size} />;
};

export const TaskCard: React.FC<TaskCardProps> = ({ task, idx, onClick, onCheckIn, isAdmin, isHabit }) => {
  const { members } = useFamily();
  const assigneeNames = task.assigneeIds.map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(', ');

  const isPenalty = task.rewardStars < 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      onClick={onClick}
      className={cn(
        "rounded-3xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden group cursor-pointer border border-outline-variant/10 hover:border-primary/20 transition-all",
        task.status === 'completed' && !isHabit ? "bg-surface-container-low" : "bg-surface"
      )}
    >
      <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1.5",
          isPenalty ? 'bg-red-500' :
          task.status === 'reviewing' ? 'bg-orange-500' :
          task.type === 'daily' ? 'bg-primary' : task.type === 'study' ? 'bg-tertiary' : 'bg-secondary'
      )} />
      <div className="flex items-center gap-4 pl-2 flex-1 min-w-0">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center transition-colors shadow-sm",
          task.status === 'completed' && !isPenalty ? 'bg-primary/10 text-primary' : 
          task.status === 'reviewing' ? 'bg-orange-500/10 text-orange-500' :
          isPenalty ? 'bg-red-500/10 text-red-500' :
          'bg-surface-container text-on-surface-variant/40'
        )}>
           {task.status === 'completed' && !isPenalty ? <CheckCircle2 size={24} /> : 
            task.status === 'reviewing' ? <Clock size={24} /> :
            getTaskIcon(task.icon || 'ListTodo', 24)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn(
            "font-black text-base truncate",
            task.status === 'completed' && !isHabit && "text-on-surface-variant line-through opacity-60",
            task.status === 'reviewing' && "text-orange-500 dark:text-orange-400"
          )}>{task.title}</h4>
          <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider truncate">
            <span className="flex items-center gap-1 flex-shrink-0">
              <Clock size={10} /> 
              {isHabit ? (isPenalty ? '行为纠正' : '积极奖励') : (task.reminderTime || '08:00 AM')}
            </span>
            <span className="flex-shrink-0">•</span>
            <span className="flex items-center gap-1 truncate">
              <User size={10} className="flex-shrink-0" /> 
              <span className="truncate">{assigneeNames || '所有人'}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-4">
        {!isHabit && task.status === 'reviewing' ? (
           <button 
             onClick={(e) => {
               e.stopPropagation();
               if (isAdmin && onCheckIn) {
                 onCheckIn(task.id);
               } else {
                 onClick(); 
               }
             }}
             className={cn(
               "px-3 py-1.5 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5",
               (isAdmin && onCheckIn)
                ? "bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-none hover:scale-105 active:scale-95" 
                : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/10 animate-pulse"
             )}
           >
             {(isAdmin && onCheckIn) ? (
               <>
                 <CheckCircle2 size={12} />
                 核实
               </>
             ) : (
               <>
                 <Clock size={12} />
                 待确认
               </>
             )}
           </button>
        ) : !isHabit && task.status === 'pending' ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onCheckIn) onCheckIn(task.id);
            }}
            className="px-5 py-2.5 rounded-full bg-[#2E7D32] text-white text-[11px] font-black shadow-lg shadow-[#2E7D32]/20 hover:scale-105 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <CheckCircle2 size={13} strokeWidth={3} />
            打卡
          </button>
        ) : (
          <div className={cn(
            "px-3 py-1 rounded-full flex items-center gap-1 shadow-sm",
            task.status === 'completed' && !isHabit ? "bg-surface-container text-on-surface-variant/40" : 
            isPenalty ? "bg-red-500/10 text-red-500 border border-red-500/10" :
            "bg-primary/10 text-primary border border-primary/10"
          )}>
            <Star size={10} className={cn("fill-current", task.status === 'completed' && !isHabit ? "opacity-30" : "")} />
            <span className="text-[10px] font-black">{isPenalty ? '' : '+'}{task.rewardStars}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
