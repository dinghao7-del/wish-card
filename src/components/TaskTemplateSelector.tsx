import React, { useState, useMemo } from 'react';
import { X, Search, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { TASK_CATEGORIES, type HabitTemplate } from '../lib/templates';

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
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-white flex flex-col pt-safe"
    >
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-outline-variant/10">
        <button 
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <X size={24} />
        </button>
        <h2 className="text-lg font-bold">选择模板</h2>
        <button 
          className="text-primary font-bold px-4 py-2 hover:bg-primary/5 rounded-xl transition-colors"
          onClick={onClose}
        >
          导入
        </button>
      </header>

      <div className="p-4 space-y-4 flex-1 flex flex-col">
        {/* 搜索框 */}
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

        {/* 分类 Tab 切换栏（学习 | 生活 | 兴趣 | 独立 | 表扬 | 批评） */}
        {!searchQuery.trim() && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {TASK_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border-2 shrink-0",
                  activeTab === cat.id
                    ? "bg-[#D4E157] border-[#C5D34C] text-[#2E7D32] shadow-md"
                    : "bg-white border-white text-on-surface-variant/40"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* 模板网格（4列，匹配截图布局） */}
        <div className="grid grid-cols-4 gap-y-5 gap-x-3 overflow-y-auto pt-2 pb-20 no-scrollbar">
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
                <Star size={9} className={template.stars >= 0 ? "text-[#FBC02D] fill-current" : "text-red-500 fill-current"} />
                <span className={`text-[9px] font-bold ${template.stars >= 0 ? 'text-on-surface-variant' : 'text-red-500'}`}>
                  {template.stars > 0 ? `+${template.stars}` : template.stars}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 底部「自定义添加」按钮 */}
      <div className="p-6 border-t border-outline-variant/10 bg-white">
        <button 
          onClick={onClose}
          className="w-full bg-[#98EE99]/20 text-[#2E7D32] font-bold py-4 rounded-2xl active:scale-95 transition-transform"
        >
          自定义添加
        </button>
      </div>
    </motion.div>
  );
}
