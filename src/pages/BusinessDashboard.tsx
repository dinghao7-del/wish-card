import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronRight, LineChart, Settings2, Sparkles, TrendingUp } from 'lucide-react';
import { TopAppBar } from '../components/navigation/TopAppBar';
import {
  getRecommendationBusinessSummary,
  type RecommendationBusinessSummary,
} from '../lib/recommendationEvents';
import type { RecommendationCategory } from '../lib/recommendationConsent';
import { getSeedCommercialResources, loadCommercialResources, type CommercialResourceItem } from '../lib/recommendationInventory';

const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  education: '教育',
  travel: '旅行',
  healthcare: '健康',
};

export function BusinessDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<RecommendationBusinessSummary | null>(null);
  const [resources, setResources] = useState<CommercialResourceItem[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      getRecommendationBusinessSummary(),
      loadCommercialResources({ online: typeof navigator !== 'undefined' ? navigator.onLine : false }),
    ]).then(([result, loadedResources]) => {
      if (!active) return;
      setSummary(result);
      setResources(loadedResources.length > 0 ? loadedResources : getSeedCommercialResources());
    });
    return () => { active = false; };
  }, []);

  if (!summary) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 animate-in fade-in duration-500">
      <TopAppBar title="商业数据" onBack={() => navigate('/ai-analysis')} />

      <div className="px-4 sm:px-6 py-4 space-y-4">
        <section className="rounded-3xl bg-primary-container border border-primary/10 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/80 text-primary flex items-center justify-center shrink-0">
              <LineChart size={23} strokeWidth={2.6} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black text-primary-text">推荐商业化漏斗</h1>
              <p className="text-xs font-bold text-primary-text/70 leading-relaxed mt-1">
                用于内部观察资源展示、点击、关闭和转化，不进入普通家庭主流程。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/internal/resources')}
            className="mt-4 w-full rounded-2xl bg-primary text-white py-3 text-sm font-black active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Settings2 size={16} />
            管理商业资源
          </button>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricTile label="展示" value={summary.totals.impression} />
          <MetricTile label="点击" value={summary.totals.click} />
          <MetricTile label="关闭" value={summary.totals.dismiss} />
          <MetricTile label="转化" value={summary.totals.conversion} />
        </section>

        <section className="rounded-3xl bg-white border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={18} className="text-primary" />
            <h2 className="text-sm font-black text-on-surface">分类表现</h2>
          </div>
          <div className="space-y-2">
            {(Object.entries(summary.categoryBreakdown) as Array<[RecommendationCategory, RecommendationBusinessSummary['categoryBreakdown'][RecommendationCategory]]>).map(([category, item]) => (
              <div key={category} className="rounded-2xl bg-surface-container-low p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-on-surface">{CATEGORY_LABELS[category]}</p>
                  <p className="text-[11px] font-black text-primary">
                    CTR {formatPercent(item.clickThroughRate)} · CVR {formatPercent(item.conversionRate)}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <MiniMetric label="展" value={item.impressions} />
                  <MiniMetric label="点" value={item.clicks} />
                  <MiniMetric label="关" value={item.dismisses} />
                  <MiniMetric label="转" value={item.conversions} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="text-sm font-black text-on-surface">资源排行</h2>
          </div>
          <div className="space-y-2">
            {summary.topItems.length === 0 ? (
              <p className="text-xs font-bold text-on-surface-variant/55">暂无推荐行为数据。</p>
            ) : summary.topItems.map(item => (
              <div key={`${item.category}-${item.itemId}`} className="rounded-2xl bg-surface-container-low p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-on-surface truncate">{resourceTitle(item.itemId, resources)}</p>
                    <p className="text-[11px] font-bold text-on-surface-variant/55 mt-1">
                      {CATEGORY_LABELS[item.category]} · {resourceProvider(item.itemId, resources)} · CTR {formatPercent(item.clickThroughRate)} · CVR {formatPercent(item.conversionRate)}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-on-surface-variant/35 shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-surface-container-low border border-outline-variant/10 p-4">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              {summary.suggestions.map(suggestion => (
                <p key={suggestion} className="text-xs font-bold text-on-surface-variant leading-relaxed">
                  {suggestion}
                </p>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white border border-outline-variant/10 p-3 shadow-sm">
      <p className="text-[10px] font-black text-on-surface-variant/45">{label}</p>
      <p className="text-xl font-black text-on-surface mt-1">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white px-2 py-1.5 text-center">
      <p className="text-[9px] font-black text-on-surface-variant/35">{label}</p>
      <p className="text-xs font-black text-on-surface">{value}</p>
    </div>
  );
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function resourceTitle(itemId: string, resources: CommercialResourceItem[]): string {
  return resources.find(resource => resource.id === itemId)?.title || itemId;
}

function resourceProvider(itemId: string, resources: CommercialResourceItem[]): string {
  return resources.find(resource => resource.id === itemId)?.providerName || '资源池';
}
