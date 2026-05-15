import React, { useState, useMemo } from 'react';
import { X, Search, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { TASK_CATEGORIES, type HabitTemplate } from '../lib/templates';
import { TemplatePickerShell } from './AppModal';

interface TaskTemplateSelectorProps {
  onSelect: (template: { title: string; icon: string | object; stars: number }) => void;
  onClose: () => void;
}

export function TaskTemplateSelector({ onSelect, onClose }: TaskTemplateSelectorProps) {
  // 默认选中第一个分类（学习）
  const [activeTab, setActiveTab] = useState<string>(TASK_CATEGORIES[0]?.id || '学习');
  const [searchQuery, setSearchQuery] = useState('');

  // 获取当前选中分类的模板
  const currentTemplates = useMemo(() => {
    const cat = TASK_CATEGORIES.find(c => c.id === activeTab);
    return cat?.templates || [];
  }, [activeTab]);

  // 搜索过滤：支持跨分类搜索
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return currentTemplates;
    const q = searchQuery.toLowerCase();
    // 当前分类内搜索优先；如果没有结果则跨分类搜索
    let results = currentTemplates.filter(t => t.title.includes(q));
    if (results.length === 0) {
      // 跨所有分类搜索
      results = TASK_CATEGORIES.flatMap(c => c.templates).filter(t => t.title.includes(q));
    }
    return results;
  }, [currentTemplates, searchQuery]);

  // 处理选择
  const handleSelect = (template: HabitTemplate) => {
    onSelect({
      title: template.title,
      icon: template.icon,
      stars: template.stars,
    });
  };

  return (
    <TemplatePickerShell
      title="选择模板"
      onClose={onClose}
      search={
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
          <input 
            type="text" 
            placeholder="搜索模型"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>
      }
      tabs={!searchQuery.trim() && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {TASK_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border-2 shrink-0",
                  activeTab === cat.id
                    ? "bg-primary-surface border-primary-surface/80 text-primary-text shadow-md"
                    : "bg-surface border-surface text-on-surface-variant/40"
                )}
              >
                {cat.label}
              </button>
            ))}
        </div>
      )}
      footer={
        <button 
          onClick={onClose}
          className="w-full bg-primary-surface/20 text-primary-text font-bold py-4 rounded-2xl active:scale-95 transition-transform"
        >
          自定义添加
        </button>
      }
    >
        <div className="grid grid-cols-4 gap-y-5 gap-x-3 pb-4">
          {filteredTemplates.map((template) => (
            <motion.div
              key={template.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(template)}
              className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform"
            >
              {/* 图标（圆角方形裁切 + 本地PNG） */}
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface-container-low shadow-sm border border-outline-variant/10 mb-1.5 p-1 group-hover:border-primary/30 transition-colors">
                <img 
                  src={template.icon} 
                  alt={template.title} 
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
              {/* 名称 */}
              <span className="text-[11px] font-black text-on-surface text-center leading-tight line-clamp-1 w-full">
                {template.title}
              </span>
              {/* 星星值（正数显示金色，负数显示红色扣分） */}
              <div className="flex items-center gap-0.5 mt-0.5">
                <Star size={9} className={template.stars >= 0 ? "text-secondary fill-current" : "text-danger fill-current"} />
                <span className={`text-[9px] font-bold ${template.stars >= 0 ? 'text-on-surface-variant' : 'text-danger'}`}>
                  {template.stars > 0 ? `+${template.stars}` : template.stars}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
    </TemplatePickerShell>
  );
}
