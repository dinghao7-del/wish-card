import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, TrendingUp, Star, Gift, Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TemplateItem {
  id?: string;
  title: string;
  description: string;
  category: string;
  stars: number;
  usage_count?: number;
  icon: string;
  source: 'system' | 'community';
}

interface PopularTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'task' | 'habit' | 'reward';
  onSelect: (template: TemplateItem) => void;
}

export function PopularTemplates({ isOpen, onClose, type, onSelect }: PopularTemplatesProps) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [activeTab, setActiveTab] = useState<'hot' | 'community'>('hot');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) loadTemplates();
  }, [isOpen, type, activeTab]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { getTemplates } = await import('../lib/templateApi', { defaultValue: '/lib/template api' });
      const result = await getTemplates({
        type,
        source: activeTab === 'community' ? 'community' : undefined,
        limit: 30,
      });
      setTemplates(result.templates.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        category: t.category,
        stars: t.stars,
        usage_count: t.usage_count,
        icon: t.icon || (type === 'reward' ? '🎁' : '📝'),
        source: t.source,
      })));
    } catch {
      // 降级到本地模板
      const { ALL_TASK_TEMPLATES, ALL_REWARD_TEMPLATES } = await import('../lib/templates', { defaultValue: '/lib/templates' });
      const localTemplates = type === 'reward'
        ? ALL_REWARD_TEMPLATES.map(r => ({
            title: r.name, description: r.description, category: r.category,
            stars: r.cost, icon: r.icon, source: 'system' as const,
          }))
        : ALL_TASK_TEMPLATES.map(t => ({
            title: t.title, description: t.description || '', category: t.category,
            stars: t.stars, icon: t.icon, source: 'system' as const,
          }));
      setTemplates(localTemplates.slice(0, 30));
    } finally {
      setLoading(false);
    }
  };

  const typeLabel = type === 'reward' ? t('rewards.title', '心愿') : type === 'habit' ? t('habit.title', '习惯') : t('tasks.title', '任务');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl z-50 max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <Flame size={20} className="text-orange-500" />
                <h3 className="font-bold text-on-surface text-lg">{typeLabel}模板库</h3>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-full">
                <X size={20} className="text-on-surface-variant" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-5 pt-3 gap-2">
              <button
                onClick={() => setActiveTab('hot')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'hot' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="flex items-center gap-1">
                  <Flame size={14} /> 热门推荐
                </span>
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeTab === 'community' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} /> 社区热门
                </span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant">
                  <Sparkles size={32} className="mx-auto opacity-30 mb-2" />
                  <p className="text-sm">暂无{activeTab === 'community' ? '社区' : ''}模板</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {templates.map((tmpl, idx) => (
                    <motion.button
                      key={`${tmpl.title}-${idx}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => { onSelect(tmpl); onClose(); }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 transition-all active:scale-95"
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-lg">
                        {tmpl.icon}
                      </div>
                      <p className="text-xs font-bold text-on-surface truncate w-full text-center">{tmpl.title}</p>
                      <div className="flex items-center gap-1">
                        <Star size={10} className="text-secondary fill-current" />
                        <span className="text-[10px] font-bold text-on-surface-variant">{tmpl.stars}</span>
                      </div>
                      {tmpl.source === 'community' && tmpl.usage_count && (
                        <span className="text-[9px] text-on-surface-variant/60 flex items-center gap-0.5">
                          <TrendingUp size={8} /> {tmpl.usage_count}家庭
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
