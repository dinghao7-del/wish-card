import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowDown, ArrowUp, Cloud, Eye, EyeOff, Settings2 } from 'lucide-react';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { showToastGlobal } from '../components/Toast';
import { useFamily } from '../context/FamilyContext';
import {
  adjustCommercialResourcePriority,
  buildCommercialResourceOpsInsights,
  buildCommercialResourcePerformanceRows,
  getCommercialResourceCache,
  getSeedCommercialResources,
  loadCommercialResources,
  summarizeCommercialResourceManagement,
  syncCommercialResourcesToCloud,
  toggleCommercialResourceActive,
  type CommercialResourceItem,
  type CommercialResourceOpsInsight,
  type CommercialResourcePerformanceRow,
} from '../lib/recommendationInventory';
import { getRecommendationFunnelItems } from '../lib/recommendationEvents';
import { buildCandidatesFromRecommendationEvents, buildDefaultRecommendationCandidates, type RecommendationCandidate } from '../lib/recommendationGateway';
import { getRecommendationEvents } from '../lib/recommendationEvents';
import type { RecommendationCategory } from '../lib/recommendationConsent';

const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  education: '教育',
  travel: '旅行',
  healthcare: '健康',
};

export function CommercialResourcesAdmin() {
  const navigate = useNavigate();
  const { syncStatus } = useFamily();
  const [resources, setResources] = useState<CommercialResourceItem[]>([]);
  const [performanceRows, setPerformanceRows] = useState<CommercialResourcePerformanceRow[]>([]);
  const [opsInsights, setOpsInsights] = useState<CommercialResourceOpsInsight[]>([]);
  const [opsCandidates, setOpsCandidates] = useState<RecommendationCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const summary = useMemo(() => summarizeCommercialResourceManagement(resources), [resources]);

  useEffect(() => {
    let active = true;
    async function load() {
      const cache = await getCommercialResourceCache();
      const loaded = cache.resources.length > 0
        ? cache.resources
        : await loadCommercialResources({ online: syncStatus.isOnline });
      const funnelItems = await getRecommendationFunnelItems();
      const events = await getRecommendationEvents();
      const nextResources = loaded.length > 0 ? loaded : getSeedCommercialResources();
      const candidates = buildCandidatesFromRecommendationEvents(events);
      const nextCandidates = candidates.length > 0 ? candidates : buildDefaultRecommendationCandidates();
      if (!active) return;
      setResources(nextResources);
      setOpsCandidates(nextCandidates);
      setPerformanceRows(buildCommercialResourcePerformanceRows(nextResources, funnelItems));
      setOpsInsights(buildCommercialResourceOpsInsights(nextCandidates, nextResources, funnelItems));
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [syncStatus.isOnline]);

  const handleToggle = async (resource: CommercialResourceItem) => {
    const cache = await toggleCommercialResourceActive(resource.id, resource.active === false);
    const funnelItems = await getRecommendationFunnelItems();
    setResources(cache.resources);
    setPerformanceRows(buildCommercialResourcePerformanceRows(cache.resources, funnelItems));
    setOpsInsights(buildCommercialResourceOpsInsights(opsCandidates, cache.resources, funnelItems));
  };

  const handleAdjust = async (resource: CommercialResourceItem, delta: number) => {
    const cache = await adjustCommercialResourcePriority(resource.id, delta);
    const funnelItems = await getRecommendationFunnelItems();
    setResources(cache.resources);
    setPerformanceRows(buildCommercialResourcePerformanceRows(cache.resources, funnelItems));
    setOpsInsights(buildCommercialResourceOpsInsights(opsCandidates, cache.resources, funnelItems));
  };

  const handleSync = async () => {
    if (!syncStatus.isOnline) {
      showToastGlobal('当前离线，资源配置先保存在本机', 'warning');
      return;
    }
    setSyncing(true);
    try {
      const result = await syncCommercialResourcesToCloud(resources);
      showToastGlobal(`已同步 ${result.rowCount} 条资源配置`, 'success');
    } catch {
      showToastGlobal('云端同步失败，本机配置已保留', 'warning');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 animate-in fade-in duration-500">
      <TopAppBar title="资源管理" onBack={() => navigate('/internal/business')} />

      <div className="px-4 sm:px-6 py-4 space-y-4">
        <section className="rounded-3xl bg-primary-container border border-primary/10 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-surface/80 text-primary flex items-center justify-center shrink-0">
              <Settings2 size={23} strokeWidth={2.6} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black text-primary-text">商业资源配置</h1>
              <p className="text-xs font-bold text-primary-text/70 leading-relaxed mt-1">
                内部维护资源上下线、推荐权重和标签质量，后续可接正式运营后台。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="mt-4 w-full rounded-2xl bg-primary text-white py-3 text-sm font-black active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Cloud size={16} />
            {syncing ? '同步中...' : '同步到云端资源库'}
          </button>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MetricTile label="总资源" value={summary.total} />
          <MetricTile label="上线" value={summary.active} />
          <MetricTile label="下线" value={summary.inactive} />
          <MetricTile label="待修正" value={summary.needsReviewIds.length} />
        </section>

        <section className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={18} className="text-primary" />
            <h2 className="text-sm font-black text-on-surface">分类资源</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(summary.byCategory) as Array<[RecommendationCategory, number]>).map(([category, count]) => (
              <div key={category} className="rounded-2xl bg-surface-container-low p-3 text-center">
                <p className="text-[10px] font-black text-on-surface-variant/45">{CATEGORY_LABELS[category]}</p>
                <p className="text-lg font-black text-on-surface mt-1">{count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={18} className="text-primary" />
            <h2 className="text-sm font-black text-on-surface">运营诊断</h2>
          </div>
          <div className="space-y-2">
            {opsInsights.slice(0, 5).map(insight => (
              <div key={insight.id} className="rounded-2xl bg-surface-container-low p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-on-surface">{insight.title}</p>
                    <p className="text-[11px] font-bold text-on-surface-variant/55 leading-relaxed mt-1">
                      {insight.description}
                    </p>
                    {insight.missingTags && insight.missingTags.length > 0 && (
                      <p className="text-[10px] font-black text-primary/70 mt-2">
                        缺口：{insight.missingTags.slice(0, 4).join('、')}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-black text-primary">
                    {insightLabel(insight)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={18} className="text-primary" />
            <h2 className="text-sm font-black text-on-surface">资源表现建议</h2>
          </div>
          <div className="space-y-2">
            {performanceRows.slice(0, 4).map(row => (
              <div key={row.resource.id} className="rounded-2xl bg-surface-container-low p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-on-surface truncate">{row.resource.title}</p>
                    <p className="text-[11px] font-bold text-on-surface-variant/55 mt-1">
                      展 {row.impressions} · 点 {row.clicks} · 关 {row.dismisses} · 转 {row.conversions}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-black text-primary">
                    {performanceLabel(row)}
                  </span>
                </div>
                <p className="text-[11px] font-bold text-on-surface-variant/55 mt-2">
                  建议：{actionLabel(row)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          {resources.map(resource => (
            <div key={resource.id} className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-on-surface">{resource.title}</h3>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                      {CATEGORY_LABELS[resource.category]}
                    </span>
                    {resource.active === false && (
                      <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-black text-on-surface-variant/55">
                        已下线
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-on-surface-variant/55 mt-1 leading-relaxed">
                    {resource.providerName} · {resource.sellingPoint}
                  </p>
                  <p className="text-[10px] font-black text-on-surface-variant/40 mt-2">
                    权重 {resource.priorityBoost} · {resource.kind}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjust(resource, 5)}
                  className="flex-1 rounded-xl bg-primary/10 text-primary py-2 text-[11px] font-black active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                >
                  <ArrowUp size={13} /> 加权
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjust(resource, -5)}
                  className="flex-1 rounded-xl bg-surface-container-low text-on-surface-variant py-2 text-[11px] font-black active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                >
                  <ArrowDown size={13} /> 降权
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(resource)}
                  className="rounded-xl bg-surface-container-low px-3 py-2 text-[11px] font-black text-on-surface-variant active:scale-[0.98] transition-all flex items-center gap-1"
                >
                  {resource.active === false ? <Eye size={13} /> : <EyeOff size={13} />}
                  {resource.active === false ? '上线' : '下线'}
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function performanceLabel(row: CommercialResourcePerformanceRow): string {
  if (row.health === 'strong') return '强';
  if (row.health === 'weak') return '弱';
  if (row.health === 'new') return '新';
  return '观察';
}

function actionLabel(row: CommercialResourcePerformanceRow): string {
  if (row.recommendedAction === 'boost') return '提高权重，扩大曝光';
  if (row.recommendedAction === 'lower') return '降低权重，减少干扰';
  if (row.recommendedAction === 'rewrite') return '优化卖点或标签后再观察';
  if (row.recommendedAction === 'observe') return '继续积累展示数据';
  return '保持当前策略';
}

function insightLabel(insight: CommercialResourceOpsInsight): string {
  if (insight.action === 'add_resource') return '补资源';
  if (insight.action === 'add_tags') return '补标签';
  if (insight.action === 'boost_resource') return '提权';
  if (insight.action === 'lower_resource') return '降权';
  return '观察';
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-surface border border-outline-variant/10 p-3 shadow-sm">
      <p className="text-[10px] font-black text-on-surface-variant/45">{label}</p>
      <p className="text-xl font-black text-on-surface mt-1">{value}</p>
    </div>
  );
}
