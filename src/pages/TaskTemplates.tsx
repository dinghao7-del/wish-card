import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, 
  Search, 
  Star,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { ALL_TASK_TEMPLATES, type HabitTemplate } from '../lib/templates';
import { getCustomCreationRoute } from '../lib/createFlowRoutes';

type TaskTemplate = HabitTemplate & {
  description: string;
  frequency: 'daily' | 'weekly';
};

const TEMPLATE_DATA: TaskTemplate[] = ALL_TASK_TEMPLATES.map(template => ({
  ...template,
  description: template.description || `${template.title}打卡任务`,
  frequency: template.frequency || 'daily',
}));

function TemplateIcon({ template }: { template: TaskTemplate }) {
  if (template.icon.startsWith('/')) {
    return <img src={template.icon} alt="" className="w-8 h-8 object-contain" loading="lazy" />;
  }
  return <span className="text-xl leading-none">{template.icon}</span>;
}

export function TaskTemplates() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(t('task_templates.all', '全部'));

  const categories = [t('task_templates.all', '全部'), ...Array.from(new Set(TEMPLATE_DATA.map(tpl => tpl.category)))];

  const filteredTemplates = TEMPLATE_DATA.filter(template => {
    const matchesSearch = template.title.includes(searchQuery) || template.description.includes(searchQuery);
    const matchesCategory = activeCategory === t('task_templates.all', '全部') || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (template: TaskTemplate) => {
    // Pick only serializable primitive fields
    const serializableTemplate = {
      title: template.title,
      description: template.description,
      category: template.category,
      frequency: template.frequency,
      stars: template.stars,
      icon: template.icon,
    };
    
    // Use sessionStorage as a temporary bridge for template data passing
    sessionStorage.setItem('pending_template_selection', JSON.stringify({
      template: serializableTemplate,
      fromMode: searchParams.get('fromMode') || location.state?.fromMode,
    }));
    
    // Navigate back to publish task
    navigate(getCustomCreationRoute('task', {
      planId: searchParams.get('planId'),
      planName: searchParams.get('planName'),
    }));
  };

  return (
    <div className="ui-template-page min-h-screen bg-surface pb-24">
      <header className="ui-create-header sticky top-0 z-50 bg-surface/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/50 text-on-surface-variant transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black tracking-tight">{t('task_templates.title', '任务模版库')}</h1>
        <div className="w-10" />
      </header>

      <div className="px-6 space-y-6">
        {/* Search & Custom Add */}
        <div className="flex items-center gap-3 mt-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input
              type="text"
              placeholder={t('task_templates.search_placeholder', '搜索任务')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-none rounded-2xl pl-11 pr-4 py-3.5 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
            />
          </div>
          <button 
            onClick={() => navigate(getCustomCreationRoute('task', {
              planId: searchParams.get('planId'),
              planName: searchParams.get('planName'),
            }), { state: { fromMode: searchParams.get('fromMode') || location.state?.fromMode || 'target' } })}
            className="ui-create-add-button px-4 py-3.5 bg-white rounded-2xl shadow-sm border border-outline-variant/10 flex items-center gap-2 active:scale-95 transition-all shrink-0"
          >
             <Plus size={18} className="text-primary" />
             <span className="text-sm font-black text-on-surface">{t('task_templates.add_custom', '添加自定义')}</span>
          </button>
        </div>

        {/* Categories — 固定宽度容器 + 左对齐，无滚动条偏移 */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 snap-x snap-mandatory">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-[18px] py-[9px] rounded-full text-xs font-black whitespace-nowrap transition-all border-[1.5px] snap-start shrink-0",
                activeCategory === cat 
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                  : "bg-white border-outline-variant/15 text-on-surface-variant/50 hover:border-outline-variant/30"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template List */}
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template, idx) => (
              <motion.div 
                key={`${template.title}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 8) * 0.025 }}
                onClick={() => handleSelect(template)}
                className="ui-template-card bg-white rounded-[1.5rem] p-4 shadow-sm border border-outline-variant/10 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <TemplateIcon template={template} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-black text-base text-on-surface truncate">{template.title}</h3>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-black",
                      template.frequency === 'daily' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    )}>
                      {template.frequency === 'daily' ? t('task_templates.daily', '每天') : t('task_templates.weekly', '每周')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface-variant/50 line-clamp-1">{template.description}</p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-surface-container/30 px-2.5 py-0.5 rounded-full border border-outline-variant/10">
                    <Star size={10} className="text-secondary fill-current" />
                    <span className="text-[10px] font-black text-on-surface/60">{template.stars}</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/5 active:scale-90 transition-transform">
                    <Plus size={20} strokeWidth={3} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
