import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Target, Clock, Coffee, Sparkles, Loader2, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeQuadrant, type QuadrantAnalysis, type QuadrantItem, type AppContext } from '../lib/voiceAssistant';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

interface QuadrantAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  dateRange?: 'today' | 'week' | 'month';
  inline?: boolean;  // 内联模式，不显示弹窗外壳
}

const QUADRANT_CONFIG = [
  {
    key: 'urgentImportant' as const,
    titleKey: 'quadrant_analysis.q1_title',
    subtitleKey: 'quadrant_analysis.q1_subtitle',
    icon: AlertTriangle,
    bgColor: 'bg-red-50 dark:bg-red-500/10',
    borderColor: 'border-red-200 dark:border-red-500/20',
    iconColor: 'text-red-500',
    badgeColor: 'bg-red-500',
    label: 'Q1',
  },
  {
    key: 'notUrgentImportant' as const,
    titleKey: 'quadrant_analysis.q2_title',
    subtitleKey: 'quadrant_analysis.q2_subtitle',
    icon: Target,
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    borderColor: 'border-blue-200 dark:border-blue-500/20',
    iconColor: 'text-blue-500',
    badgeColor: 'bg-blue-500',
    label: 'Q2',
  },
  {
    key: 'urgentNotImportant' as const,
    titleKey: 'quadrant_analysis.q3_title',
    subtitleKey: 'quadrant_analysis.q3_subtitle',
    icon: Clock,
    bgColor: 'bg-orange-50 dark:bg-orange-500/10',
    borderColor: 'border-orange-200 dark:border-orange-500/20',
    iconColor: 'text-orange-500',
    badgeColor: 'bg-orange-500',
    label: 'Q3',
  },
  {
    key: 'notUrgentNotImportant' as const,
    titleKey: 'quadrant_analysis.q4_title',
    subtitleKey: 'quadrant_analysis.q4_subtitle',
    icon: Coffee,
    bgColor: 'bg-gray-50 dark:bg-gray-500/10',
    borderColor: 'border-gray-200 dark:border-gray-500/20',
    iconColor: 'text-gray-500',
    badgeColor: 'bg-gray-400',
    label: 'Q4',
  },
];

export function QuadrantAnalysisView({ isOpen, onClose, dateRange = 'today', inline = false }: QuadrantAnalysisProps) {
  const { tasks, members, rewards, currentUser, familyId } = useFamily();
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<QuadrantAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedQuadrants, setExpandedQuadrants] = useState<Set<string>>(new Set(['urgentImportant']));

  useEffect(() => {
    if (isOpen && !analysis && !isLoading) {
      runAnalysis();
    }
  }, [isOpen]);

  const runAnalysis = async () => {
    setIsLoading(true);
    setError('');
    try {
      const context: AppContext = { tasks, members, rewards, currentUser, familyId };
      const result = await analyzeQuadrant(context, dateRange);
      setAnalysis(result);
    } catch (err: any) {
      console.error('四象限分析失败:', err);
      setError(t('quadrant_analysis.error', { defaultValue: '错误' }));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuadrant = (key: string) => {
    setExpandedQuadrants(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const dateLabel = dateRange === 'today' ? t('quadrant_analysis.today', { defaultValue: '今天' }) : dateRange === 'week' ? t('quadrant_analysis.week', { defaultValue: '周' }) : t('quadrant_analysis.month', { defaultValue: '月' });

  // 内联模式：直接渲染内容，不包弹窗外壳
  if (inline) {
    return (
      <div className="space-y-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={40} className="animate-spin text-primary" />
            <p className="text-sm font-bold text-on-surface-variant">{t('quadrant_analysis.loading', { defaultValue: '加载中...' })}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-6 text-center">
            <p className="text-sm font-bold text-red-500 mb-4">{error}</p>
            <button
              onClick={runAnalysis}
              className="bg-red-500 text-white px-6 py-2.5 rounded-2xl font-bold text-sm active:scale-95 transition-all"
            >
              {t('quadrant_analysis.retry', { defaultValue: '重试' })}
            </button>
          </div>
        )}

        {analysis && !isLoading && (
          <>
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/10">
              <p className="text-sm font-bold text-on-surface leading-relaxed">{analysis.summary}</p>
            </div>

            <div className="space-y-3">
              {QUADRANT_CONFIG.map((config) => {
                const items = analysis[config.key] as QuadrantItem[];
                const isExpanded = expandedQuadrants.has(config.key);
                const Icon = config.icon;

                return (
                  <motion.div
                    key={config.key}
                    layout
                    className={cn(
                      "rounded-2xl border-2 overflow-hidden transition-all",
                      config.bgColor, config.borderColor
                    )}
                  >
                    <button
                      onClick={() => toggleQuadrant(config.key)}
                      className="w-full p-4 flex items-center gap-3"
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black", config.badgeColor)}>
                        {config.label}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className={config.iconColor} />
                          <span className="font-black text-on-surface text-sm">{t(config.titleKey)}</span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant font-bold mt-0.5">
                          {t(config.subtitleKey)} · {t('quadrant_analysis.items_count', { count: items.length })}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={18} className="text-on-surface-variant/40" /> : <ChevronDown size={18} className="text-on-surface-variant/40" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-2">
                            {items.length > 0 ? items.map((item, idx) => (
                              <div key={idx} className="bg-white/60 dark:bg-surface/60 rounded-xl p-3 backdrop-blur-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-on-surface text-sm">{item.task.title}</span>
                                  <span className="text-xs font-bold text-on-surface-variant/60">{item.task.rewardStars}★</span>
                                </div>
                                <p className="text-[10px] text-on-surface-variant/70 font-bold mt-1">{item.reason}</p>
                              </div>
                            )) : (
                              <p className="text-xs text-on-surface-variant/40 font-bold italic py-2">{t('quadrant_analysis.no_tasks', { defaultValue: '暂无任务' })}</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {analysis.suggestions.length > 0 && (
              <div className="bg-[#FFF9C4]/50 dark:bg-yellow-500/10 rounded-2xl p-5 border border-[#FBC02D]/20">
                <h4 className="font-black text-[#F9A825] dark:text-yellow-400 text-sm mb-3 flex items-center gap-2">
                  <Sparkles size={16} />
                  {t('quadrant_analysis.suggestions', { defaultValue: '建议' })}
                </h4>
                <div className="space-y-2">
                  {analysis.suggestions.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <ArrowRight size={12} className="text-[#F9A825] dark:text-yellow-400 mt-1 shrink-0" />
                      <p className="text-xs font-bold text-on-surface leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full max-w-lg bg-background rounded-t-[2.5rem] sm:rounded-[2.5rem] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-outline-variant/10"
          >
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/10 bg-white dark:bg-surface-container shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-on-surface">{t('quadrant_analysis.title', { date: dateLabel })}</h3>
                    <p className="text-[10px] text-on-surface-variant font-bold">{t('quadrant_analysis.subtitle', { defaultValue: '副标题' })}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <Loader2 size={40} className="animate-spin text-primary" />
                  <p className="text-sm font-bold text-on-surface-variant">{t('quadrant_analysis.loading', { defaultValue: '加载中...' })}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 rounded-2xl p-6 text-center">
                  <p className="text-sm font-bold text-red-500 mb-4">{error}</p>
                  <button
                    onClick={runAnalysis}
                    className="bg-red-500 text-white px-6 py-2.5 rounded-2xl font-bold text-sm active:scale-95 transition-all"
                  >
                    {t('quadrant_analysis.retry', { defaultValue: '重试' })}
                  </button>
                </div>
              )}

              {analysis && !isLoading && (
                <>
                  {/* Summary */}
                  <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-5 border border-primary/10">
                    <p className="text-sm font-bold text-on-surface leading-relaxed">{analysis.summary}</p>
                  </div>

                  {/* Quadrant Grid */}
                  <div className="space-y-3">
                    {QUADRANT_CONFIG.map((config) => {
                      const items = analysis[config.key] as QuadrantItem[];
                      const isExpanded = expandedQuadrants.has(config.key);
                      const Icon = config.icon;

                      return (
                        <motion.div
                          key={config.key}
                          layout
                          className={cn(
                            "rounded-2xl border-2 overflow-hidden transition-all",
                            config.bgColor, config.borderColor
                          )}
                        >
                          <button
                            onClick={() => toggleQuadrant(config.key)}
                            className="w-full p-4 flex items-center gap-3"
                          >
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black", config.badgeColor)}>
                              {config.label}
                            </div>
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <Icon size={16} className={config.iconColor} />
                                <span className="font-black text-on-surface text-sm">{t(config.titleKey)}</span>
                              </div>
                              <p className="text-[10px] text-on-surface-variant font-bold mt-0.5">
                                {t(config.subtitleKey)} · {t('quadrant_analysis.items_count', { count: items.length })}
                              </p>
                            </div>
                            {isExpanded ? <ChevronUp size={18} className="text-on-surface-variant/40" /> : <ChevronDown size={18} className="text-on-surface-variant/40" />}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 space-y-2">
                                  {items.length > 0 ? items.map((item, idx) => (
                                    <div key={idx} className="bg-white/60 dark:bg-surface/60 rounded-xl p-3 backdrop-blur-sm">
                                      <div className="flex items-center justify-between">
                                        <span className="font-black text-on-surface text-sm">{item.task.title}</span>
                                        <span className="text-xs font-bold text-on-surface-variant/60">{item.task.rewardStars}★</span>
                                      </div>
                                      <p className="text-[10px] text-on-surface-variant/70 font-bold mt-1">{item.reason}</p>
                                    </div>
                                  )) : (
                                    <p className="text-xs text-on-surface-variant/40 font-bold italic py-2">{t('quadrant_analysis.no_tasks', { defaultValue: '暂无任务' })}</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Suggestions */}
                  {analysis.suggestions.length > 0 && (
                    <div className="bg-[#FFF9C4]/50 dark:bg-yellow-500/10 rounded-2xl p-5 border border-[#FBC02D]/20">
                      <h4 className="font-black text-[#F9A825] dark:text-yellow-400 text-sm mb-3 flex items-center gap-2">
                        <Sparkles size={16} />
                        {t('quadrant_analysis.suggestions', { defaultValue: '建议' })}
                      </h4>
                      <div className="space-y-2">
                        {analysis.suggestions.map((s, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <ArrowRight size={12} className="text-[#F9A825] dark:text-yellow-400 mt-1 shrink-0" />
                            <p className="text-xs font-bold text-on-surface leading-relaxed">{s}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
