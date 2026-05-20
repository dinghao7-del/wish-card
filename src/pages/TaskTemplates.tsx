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

const EN_TASK_TEMPLATES: TaskTemplate[] = [
  { id: 'en-read-20', title: 'Read for 20 minutes', description: 'Build a steady daily reading rhythm.', category: 'Study', stars: 3, icon: 'book', frequency: 'daily' },
  { id: 'en-math-practice', title: 'Math practice', description: 'Finish one small math practice set.', category: 'Study', stars: 3, icon: 'pencil', frequency: 'daily' },
  { id: 'en-english-words', title: 'English words', description: 'Review or memorize a small word list.', category: 'Study', stars: 4, icon: 'book', frequency: 'daily' },
  { id: 'en-drink-water', title: 'Drink water', description: 'Drink enough water during the day.', category: 'Life', stars: 1, icon: 'cup', frequency: 'daily' },
  { id: 'en-brush-teeth', title: 'Brush teeth', description: 'Finish morning or bedtime brushing.', category: 'Life', stars: 1, icon: 'sparkles', frequency: 'daily' },
  { id: 'en-pack-schoolbag', title: 'Pack schoolbag', description: 'Prepare school items before bedtime.', category: 'Independence', stars: 2, icon: 'bag', frequency: 'daily' },
  { id: 'en-tidy-toys', title: 'Tidy toys', description: 'Put toys back after play time.', category: 'Independence', stars: 2, icon: 'home', frequency: 'daily' },
  { id: 'en-practice-piano', title: 'Practice piano', description: 'Practice an instrument for the planned time.', category: 'Interest', stars: 5, icon: 'music', frequency: 'daily' },
  { id: 'en-jump-rope', title: 'Jump rope', description: 'Do a short exercise session.', category: 'Interest', stars: 3, icon: 'sport', frequency: 'daily' },
  { id: 'en-teacher-praise', title: 'Teacher praise', description: 'Record meaningful praise or progress from school.', category: 'Praise', stars: 5, icon: 'trophy', frequency: 'weekly' },
  { id: 'en-keep-promise', title: 'Keep a promise', description: 'Follow through on a family agreement.', category: 'Praise', stars: 5, icon: 'heart', frequency: 'weekly' },
  { id: 'en-late-bedtime', title: 'Late bedtime correction', description: 'Use a small correction when bedtime is missed.', category: 'Correction', stars: -2, icon: 'moon', frequency: 'daily' },
  { id: 'en-screen-time', title: 'Screen time correction', description: 'Use a small correction when screen rules are broken.', category: 'Correction', stars: -3, icon: 'phone', frequency: 'daily' },
];

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
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(t('task_templates.all', '全部'));

  const isEnglish = i18n.language?.startsWith('en');
  const displayTemplates = isEnglish ? EN_TASK_TEMPLATES : TEMPLATE_DATA;
  const categories = [t('task_templates.all', '全部'), ...Array.from(new Set(displayTemplates.map(tpl => tpl.category)))];

  const filteredTemplates = displayTemplates.filter(template => {
    const keyword = searchQuery.trim().toLowerCase();
    const matchesSearch = !keyword || `${template.title} ${template.description} ${template.category}`.toLowerCase().includes(keyword);
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
      <header className="ui-create-header sticky top-0 z-50 bg-surface/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/50 text-on-surface-variant transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black tracking-tight">{t('task_templates.title', '任务模版库')}</h1>
        <div className="w-10" />
      </header>

      <div className="px-4 space-y-4">
        {/* Search & Custom Add */}
        <div className="flex items-center gap-3 mt-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input
              type="text"
              placeholder={t('task_templates.search_placeholder', '搜索任务')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border-none rounded-xl pl-10 pr-3 py-2.5 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
            />
          </div>
          <button 
            onClick={() => navigate(getCustomCreationRoute('task', {
              planId: searchParams.get('planId'),
              planName: searchParams.get('planName'),
            }), { state: { fromMode: searchParams.get('fromMode') || location.state?.fromMode || 'target' } })}
            className="ui-create-add-button px-3 py-2.5 bg-white rounded-xl shadow-sm border border-outline-variant/10 flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
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
                "px-4 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all border snap-start shrink-0",
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
        <div className="grid gap-3">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template, idx) => (
              <motion.div 
                key={`${template.title}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx, 8) * 0.025 }}
                onClick={() => handleSelect(template)}
                className="ui-template-card bg-white rounded-2xl p-3 shadow-sm border border-outline-variant/10 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
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
