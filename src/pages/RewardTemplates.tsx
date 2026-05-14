import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { ALL_REWARD_TEMPLATES, REWARD_CATEGORIES, type RewardTemplate } from '../lib/templates';
import { getCustomCreationRoute } from '../lib/createFlowRoutes';

export function RewardTemplates() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>(t('reward_templates.all', '全部'));

  const categories = [t('reward_templates.all', '全部'), ...REWARD_CATEGORIES.map(category => category.label)];
  const filteredTemplates = ALL_REWARD_TEMPLATES.filter(template => {
    const keyword = searchQuery.trim();
    const matchesSearch = !keyword
      || `${template.name} ${template.description} ${template.category} ${(template.tags || []).join(' ')}`
        .toLowerCase()
        .includes(keyword.toLowerCase());
    const matchesCategory = activeCategory === t('reward_templates.all', '全部') || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const customRoute = getCustomCreationRoute('reward', {
    planId: searchParams.get('planId'),
    planName: searchParams.get('planName'),
  });

  const handleSelect = (template: RewardTemplate) => {
    sessionStorage.setItem('pending_reward_template_selection', JSON.stringify({
      template: {
        name: template.name,
        description: template.description,
        cost: template.cost,
        category: template.category,
        image: template.icon,
        icon: template.id,
      },
    }));
    navigate(customRoute);
  };

  return (
    <div className="ui-template-page min-h-screen bg-surface pb-24">
      <header className="ui-create-header sticky top-0 z-50 bg-surface/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-surface-container/50 text-on-surface-variant transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black tracking-tight">{t('reward_templates.title', '心愿模板库')}</h1>
        <div className="w-10" />
      </header>

      <div className="px-6 space-y-6">
        <div className="flex items-center gap-3 mt-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input
              type="text"
              placeholder={t('reward_templates.search_placeholder', '搜索心愿')}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full bg-white border-none rounded-2xl pl-11 pr-4 py-3.5 shadow-sm focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
            />
          </div>
          <button
            onClick={() => navigate(customRoute)}
            className="ui-create-add-button px-4 py-3.5 bg-white rounded-2xl shadow-sm border border-outline-variant/10 flex items-center gap-2 active:scale-95 transition-all shrink-0"
          >
            <Plus size={18} className="text-primary" />
            <span className="text-sm font-black text-on-surface">{t('reward_templates.add_custom', '自定义添加')}</span>
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 snap-x snap-mandatory">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-[18px] py-[9px] rounded-full text-xs font-black whitespace-nowrap transition-all border-[1.5px] snap-start shrink-0",
                activeCategory === category
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                  : "bg-white border-outline-variant/15 text-on-surface-variant/50 hover:border-outline-variant/30"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {filteredTemplates.map((template, index) => (
              <motion.button
                key={template.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 8) * 0.025 }}
                onClick={() => handleSelect(template)}
                className="ui-template-card bg-white rounded-[1.5rem] p-4 shadow-sm border border-outline-variant/10 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-all text-left"
              >
                <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center shrink-0 overflow-hidden">
                  <img src={template.icon} alt="" className="h-10 w-10 object-contain" loading="lazy" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-black text-base text-on-surface truncate">{template.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-warning-container/50 text-warning">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface-variant/50 line-clamp-2">{template.description}</p>
                </div>

                <div className="flex items-center gap-1 rounded-full bg-secondary-container/40 px-2.5 py-1.5 text-secondary shrink-0">
                  <Star size={12} className="fill-current" />
                  <span className="text-xs font-black">{template.cost}</span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
