import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Target, Clock, Coffee, ArrowLeft,
  Sparkles, Loader2, Mic,
} from 'lucide-react';
import { analyzeQuadrant, type QuadrantAnalysis, type QuadrantDateRange, type QuadrantItem, type AppContext } from '../lib/voiceAssistant';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { BottomNav } from '../components/BottomNav';

// 四象限配置 —— 与项目主题一致
const QUADRANT_CONFIG = [
  {
    key: 'urgentImportant' as const,
    titleKey: 'quadrant.urgent_important',
    defaultTitle: '紧急且重要',
    icon: AlertTriangle,
    color: 'var(--color-primary)',
    bgAlpha: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
  },
  {
    key: 'notUrgentImportant' as const,
    titleKey: 'quadrant.not_urgent_important',
    defaultTitle: '重要不紧急',
    icon: Target,
    color: 'var(--color-secondary)',
    bgAlpha: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)',
  },
  {
    key: 'urgentNotImportant' as const,
    titleKey: 'quadrant.urgent_not_important',
    defaultTitle: '紧急不重要',
    icon: Clock,
    color: 'var(--color-danger)',
    bgAlpha: 'color-mix(in srgb, var(--color-danger) 10%, transparent)',
  },
  {
    key: 'notUrgentNotImportant' as const,
    titleKey: 'quadrant.not_urgent_not_important',
    defaultTitle: '不紧急不重要',
    icon: Coffee,
    color: 'var(--color-on-surface-variant)',
    bgAlpha: 'color-mix(in srgb, var(--color-on-surface-variant) 10%, transparent)',
  },
];

const DATE_RANGE_OPTIONS = [
  { key: 'today',         labelKey: 'date_range.today',         defaultLabel: '今天' },
  { key: 'week',          labelKey: 'date_range.this_week',    defaultLabel: '本周' },
  { key: 'month',         labelKey: 'date_range.this_month',   defaultLabel: '本月' },
] as const;

export function QuadrantAnalysisPage() {
  const { tasks, members, rewards, currentUser, familyId } = useFamily();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [analysis, setAnalysis] = useState<QuadrantAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const initialRange = searchParams.get('range') as QuadrantDateRange | null;
  const [dateRange, setDateRange] = useState<QuadrantDateRange>(
    initialRange === 'week' || initialRange === 'month' ? initialRange : 'today'
  );
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  useEffect(() => {
    runAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const changeDateRange = (nextRange: QuadrantDateRange) => {
    setDateRange(nextRange);
    setSearchParams({ range: nextRange });
  };

  const runAnalysis = async () => {
    setIsLoading(true);
    setError('');

    if (!tasks || !Array.isArray(tasks)) {
      setError(t('quadrant_analysis.error', { defaultValue: '任务数据无效' }));
      setIsLoading(false);
      return;
    }
    if (!members || !Array.isArray(members)) {
      setError(t('quadrant_analysis.error', { defaultValue: '成员数据无效' }));
      setIsLoading(false);
      return;
    }

    try {
      const context: AppContext = { tasks, members, rewards, currentUser, familyId };
      const result = await analyzeQuadrant(context, dateRange);
      setAnalysis(result);
    } catch (err: any) {
      console.error('四象限分析失败:', err);
      setError(`分析失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ui-ai-subpage min-h-screen bg-background transition-colors duration-700">
      {/* Header */}
      <TopAppBar
        title="任务四象限看板"
        rightContent={
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary transition-all hover:opacity-90 active:scale-95"
          >
            <Mic size={20} className="text-white" />
          </button>
        }
      />

      {/* 日期范围筛选 */}
      <div className="px-4 py-3 border-b border-outline-variant/20">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface-container p-1">
          {DATE_RANGE_OPTIONS.map(opt => {
            const active = dateRange === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => changeDateRange(opt.key)}
                className={cn(
                  "h-10 rounded-xl text-sm font-black transition-all active:scale-95",
                  active ? "bg-primary text-white shadow-sm" : "text-on-surface-variant"
                )}
              >
                {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={48} className="animate-spin text-primary" />
            <p className="text-sm font-bold text-on-surface-variant">
              正在分析任务...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-danger/20 bg-danger-container/30 p-6 text-center">
            <p className="text-sm font-bold mb-4 text-danger">{error}</p>
            <button
              onClick={runAnalysis}
              className="bg-danger text-white px-6 py-2.5 rounded-2xl font-bold text-sm active:scale-95 transition-all"
            >
              重试
            </button>
          </div>
        )}

        {analysis && !isLoading && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-outline-variant bg-surface p-5 mb-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10"
                >
                  <Sparkles size={20} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black mb-1 text-primary">
                    {analysis.periodLabel}先看这一句
                  </p>
                  <p className="text-base font-black leading-snug text-on-surface">
                    {analysis.summary || '系统正在帮你们判断先做什么。'}
                  </p>
                  <p className="text-xs font-bold leading-relaxed mt-2 text-on-surface-variant">
                    {analysis.parentAction}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-3xl border border-primary/15 bg-primary-container p-4 mb-4 shadow-sm"
            >
              <p className="text-[11px] font-black mb-1 text-primary">
                可以对孩子这样说
              </p>
              <p className="text-sm font-black leading-relaxed text-primary-text">
                {analysis.childEncouragement}
              </p>
            </motion.div>

            {/* 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {QUADRANT_CONFIG.map((config, idx) => {
                const items = analysis[config.key] as QuadrantItem[];
                const Icon = config.icon;

                return (
                  <motion.div
                    key={config.key}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="rounded-3xl border border-outline-variant bg-surface p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: config.bgAlpha }}
                      >
                        <Icon size={16} style={{ color: config.color }} />
                      </div>
                      <h3 className="font-black text-sm text-on-surface">
                        {t(config.titleKey, { defaultValue: config.defaultTitle })}
                      </h3>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {items.length > 0 ? items.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-surface-container-low p-3"
                        >
                          <p className="text-xs font-bold mb-1 text-on-surface">
                            {item.task.title}
                          </p>
                          <p className="text-[10px] text-on-surface-variant">
                            {item.reason}
                          </p>
                        </div>
                      )) : (
                        <p
                          className="text-xs text-center py-4 text-on-surface-variant/50"
                        >
                          暂无任务
                        </p>
                      )}
                    </div>

                    {items.length > 3 && (
                      <p
                        className="text-[10px] text-center mt-2 text-on-surface-variant/60"
                      >
                        还有 {items.length - 3} 个任务
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* AI 建议卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-3xl border border-outline-variant bg-surface p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={20} className="text-primary" />
                <h3 className="font-black text-sm text-on-surface">
                  {analysis.periodLabel} AI 权衡建议
                </h3>
              </div>
            <p className="text-sm font-bold leading-relaxed mb-4 text-on-surface-variant">
                {analysis.coachingSummary || analysis.summary || '暂无建议'}
              </p>

              <div className="grid grid-cols-1 gap-2 mb-4">
                <div className="rounded-2xl bg-surface-container-low p-3">
                  <p className="text-[10px] font-black mb-1 text-primary">
                    给孩子
                  </p>
                  <p className="text-xs font-bold leading-relaxed text-on-surface">
                    {analysis.childEncouragement}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-container-low p-3">
                  <p className="text-[10px] font-black mb-1 text-primary">
                    给家长
                  </p>
                  <p className="text-xs font-bold leading-relaxed text-on-surface">
                    {analysis.parentAction}
                  </p>
                </div>
              </div>

              {analysis.suggestions.length > 0 && (
                <div className="space-y-2">
                  {analysis.suggestions.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <ArrowLeft size={14} className="mt-0.5 shrink-0 rotate-180 text-primary" />
                      <p className="text-xs font-bold text-on-surface">
                        {s}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>

      <BottomNav />

      {/* AI 语音助手弹窗 */}
      <VoiceAssistant
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onOpenQuadrant={(range = 'today') => changeDateRange(range)}
      />
    </div>
  );
}
