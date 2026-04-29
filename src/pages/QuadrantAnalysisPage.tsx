import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, AlertTriangle, Target, Clock, Coffee,
  Sparkles, Loader2, Mic,
  ListChecks, Calendar, ClipboardCheck, FileText, MoreHorizontal,
} from 'lucide-react';
import { analyzeQuadrant, type QuadrantAnalysis, type QuadrantItem, type AppContext } from '../lib/voiceAssistant';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import { VoiceAssistant } from '../components/VoiceAssistant';

// 四象限配置 —— 与项目主题一致
const QUADRANT_CONFIG = [
  {
    key: 'urgentImportant' as const,
    titleKey: 'quadrant.urgent_important',
    defaultTitle: '紧急且重要',
    icon: AlertTriangle,
    color: 'var(--color-primary, #006e1c)',
    bgAlpha: 'rgba(0, 110, 28, 0.10)',
  },
  {
    key: 'notUrgentImportant' as const,
    titleKey: 'quadrant.not_urgent_important',
    defaultTitle: '重要不紧急',
    icon: Target,
    color: 'var(--color-secondary, #686000)',
    bgAlpha: 'rgba(104, 96, 0, 0.10)',
  },
  {
    key: 'urgentNotImportant' as const,
    titleKey: 'quadrant.urgent_not_important',
    defaultTitle: '紧急不重要',
    icon: Clock,
    color: '#C4534D',
    bgAlpha: 'rgba(196, 83, 77, 0.10)',
  },
  {
    key: 'notUrgentNotImportant' as const,
    titleKey: 'quadrant.not_urgent_not_important',
    defaultTitle: '不紧急不重要',
    icon: Coffee,
    color: 'var(--color-on-surface-variant, #3f4a3c)',
    bgAlpha: 'rgba(63, 74, 60, 0.10)',
  },
];

const DATE_RANGE_OPTIONS = [
  { key: 'all',            labelKey: 'date_range.all',            defaultLabel: '全部' },
  { key: 'today',         labelKey: 'date_range.today',         defaultLabel: '今天' },
  { key: 'next3days',    labelKey: 'date_range.next_3_days',  defaultLabel: '未来3天' },
  { key: 'next7days',    labelKey: 'date_range.next_7_days',  defaultLabel: '未来7天' },
  { key: 'week',          labelKey: 'date_range.this_week',    defaultLabel: '本周' },
  { key: 'month',         labelKey: 'date_range.this_month',   defaultLabel: '本月' },
  { key: 'next30days',   labelKey: 'date_range.next_30_days', defaultLabel: '未来30天' },
  { key: 'year',          labelKey: 'date_range.this_year',    defaultLabel: '今年' },
] as const;

export function QuadrantAnalysisPage() {
  const { tasks, members, rewards, currentUser, familyId } = useFamily();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<QuadrantAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<string>('all');
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  useEffect(() => {
    runAnalysis();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

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
      const result = await analyzeQuadrant(context, dateRange as any);
      setAnalysis(result);
    } catch (err: any) {
      console.error('四象限分析失败:', err);
      setError(`分析失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background,#fbf9f5)] transition-colors duration-700">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--color-surface,#fbf9f5)]/95 backdrop-blur-lg border-b border-[var(--color-outline-variant,#becab9)]/20 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-surface-container-high,#eae8e4)] transition-colors"
            >
              <ArrowLeft size={20} style={{ color: 'var(--color-on-surface-variant, #3f4a3c)' }} />
            </button>
            <h1
              className="font-black text-lg"
              style={{ color: 'var(--color-on-surface, #1b1c1a)' }}
            >
              任务四象限看板
            </h1>
          </div>

          {/* 麦克风 → 打开 AI 助手 */}
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--color-primary, #006e1c)' }}
          >
            <Mic size={20} className="text-white" />
          </button>
        </div>

        {/* 日期范围 → 标准下拉选择 */}
        <div className="relative">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full appearance-none text-sm font-bold py-2.5 px-4 pr-10 rounded-2xl border transition-all focus:outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--color-surface-container, #f0ede8)',
              color: 'var(--color-on-surface, #1b1c1a)',
              borderColor: 'var(--color-outline-variant, #becab9)',
            }}
          >
            {DATE_RANGE_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>
                {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
              </option>
            ))}
          </select>
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-on-surface-variant, #3f4a3c)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--color-primary, #006e1c)' }} />
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--color-on-surface-variant, #3f4a3c)' }}
            >
              正在分析任务...
            </p>
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              backgroundColor: 'rgba(196, 83, 77, 0.08)',
              border: '1px solid rgba(196, 83, 77, 0.2)',
            }}
          >
            <p className="text-sm font-bold mb-4" style={{ color: '#C4534D' }}>{error}</p>
            <button
              onClick={runAnalysis}
              className="text-white px-6 py-2.5 rounded-2xl font-bold text-sm active:scale-95 transition-all"
              style={{ backgroundColor: '#C4534D' }}
            >
              重试
            </button>
          </div>
        )}

        {analysis && !isLoading && (
          <>
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
                    className="rounded-3xl p-4 shadow-sm"
                    style={{
                      backgroundColor: 'var(--color-surface, #fbf9f5)',
                      border: '1px solid var(--color-outline-variant, #becab9)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: config.bgAlpha }}
                      >
                        <Icon size={16} style={{ color: config.color }} />
                      </div>
                      <h3
                        className="font-black text-sm"
                        style={{ color: 'var(--color-on-surface, #1b1c1a)' }}
                      >
                        {t(config.titleKey, { defaultValue: config.defaultTitle })}
                      </h3>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {items.length > 0 ? items.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl p-3"
                          style={{ backgroundColor: 'var(--color-surface-container-low, #f5f2ed)' }}
                        >
                          <p
                            className="text-xs font-bold mb-1"
                            style={{ color: 'var(--color-on-surface, #1b1c1a)' }}
                          >
                            {item.task.title}
                          </p>
                          <p
                            className="text-[10px]"
                            style={{ color: 'var(--color-on-surface-variant, #3f4a3c)' }}
                          >
                            {item.reason}
                          </p>
                        </div>
                      )) : (
                        <p
                          className="text-xs text-center py-4"
                          style={{ color: 'var(--color-on-surface-variant, #3f4a3c)', opacity: 0.5 }}
                        >
                          暂无任务
                        </p>
                      )}
                    </div>

                    {items.length > 3 && (
                      <p
                        className="text-[10px] text-center mt-2"
                        style={{ color: 'var(--color-on-surface-variant, #3f4a3c)', opacity: 0.6 }}
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
              className="rounded-3xl p-5 shadow-sm"
              style={{
                backgroundColor: 'var(--color-surface, #fbf9f5)',
                border: '1px solid var(--color-outline-variant, #becab9)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={20} style={{ color: 'var(--color-primary, #006e1c)' }} />
                <h3
                  className="font-black text-sm"
                  style={{ color: 'var(--color-on-surface, #1b1c1a)' }}
                >
                  AI 建议
                </h3>
              </div>
              <p
                className="text-sm font-bold leading-relaxed mb-4"
                style={{ color: 'var(--color-on-surface-variant, #3f4a3c)' }}
              >
                {analysis.summary || '暂无建议'}
              </p>

              {analysis.suggestions.length > 0 && (
                <div className="space-y-2">
                  {analysis.suggestions.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <ArrowLeft size={14} className="mt-0.5 shrink-0 rotate-180" style={{ color: 'var(--color-primary, #006e1c)' }} />
                      <p
                        className="text-xs font-bold"
                        style={{ color: 'var(--color-on-surface, #1b1c1a)' }}
                      >
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

      {/* Bottom Navigation —— 与项目 BottomNav 一致 */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 backdrop-blur-lg"
        style={{
          backgroundColor: 'var(--color-surface, #fbf9f5)',
          borderTop: '1px solid var(--color-outline-variant, #becab9)',
          borderColor: 'var(--color-outline-variant, #becab9)',
        }}
      >
        <div className="flex justify-around items-center max-w-lg mx-auto h-20">
          <NavItem icon={ListChecks} label="清单" active />
          <NavItem icon={Calendar} label="日历" />
          <NavItem icon={ClipboardCheck} label="复盘" />
          <NavItem icon={FileText} label="笔记" />
          <NavItem icon={MoreHorizontal} label="更多" />
        </div>
      </nav>

      {/* 底部占位 */}
      <div style={{ height: 'calc(5rem + env(safe-area-inset-bottom))' }} />

      {/* AI 语音助手弹窗 */}
      <VoiceAssistant
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
      />
    </div>
  );
}

function NavItem({ icon: Icon, label, active = false }: { icon: any; label: string; active?: boolean }) {
  return (
    <div
      className="flex flex-col items-center justify-end h-full px-3 sm:px-5 pb-2.5 rounded-2xl transition-all duration-300 min-w-[64px]"
      style={{
        backgroundColor: active ? 'var(--color-primary, #006e1c)10' : 'transparent',
      }}
    >
      <Icon
        size={24}
        strokeWidth={active ? 2.5 : 2}
        style={{
          color: active
            ? 'var(--color-primary, #006e1c)'
            : 'var(--color-on-surface-variant, #3f4a3c)',
          opacity: active ? 1 : 0.6,
        }}
        className="mb-1 transition-all"
      />
      <span
        className="text-[11px] font-bold tracking-tight"
        style={{ color: active ? 'var(--color-primary, #006e1c)' : 'var(--color-on-surface-variant, #3f4a3c)', opacity: active ? 1 : 0.6 }}
      >
        {label}
      </span>
    </div>
  );
}
