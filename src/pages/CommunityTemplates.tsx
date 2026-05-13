import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronRight, Clock, Cloud, Eye, Heart, Search, ShieldCheck, SlidersHorizontal, Users, WandSparkles } from 'lucide-react';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { showToastGlobal } from '../components/Toast';
import { useFamily } from '../context/FamilyContext';
import {
  filterCommunityShareDrafts,
  getCommunityShareDrafts,
  type CommunityShareTemplateQuery,
  type StoredSharedScheduleTemplateDraft,
} from '../lib/communityShare';
import {
  buildCommunityShareSyncPreview,
  fetchApprovedCommunityTemplates,
  getCommunityCloudTemplateCache,
  incrementSharedScheduleTemplateUsage,
  syncReadyCommunityShareDrafts,
} from '../lib/communityShareSync';
import {
  getCommunityTemplateLibraryState,
  buildCommunityTemplateLibraryInsight,
  recordCommunityTemplateUse,
  recordCommunityTemplateRecommendationSignals,
  summarizeCommunityTemplateLibrary,
  toggleCommunityTemplateFavorite,
  type CommunityTemplateLibraryState,
} from '../lib/communityTemplateLibrary';
import type { PlanningScenario } from '../domain/familyPlanning';
import type { RecommendationCategory } from '../lib/recommendationConsent';

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function CommunityTemplates() {
  const navigate = useNavigate();
  const { currentUser, familyId, guestMode, syncStatus } = useFamily();
  const [drafts, setDrafts] = useState<StoredSharedScheduleTemplateDraft[]>([]);
  const [cloudTemplates, setCloudTemplates] = useState<StoredSharedScheduleTemplateDraft[]>([]);
  const [cloudCacheTime, setCloudCacheTime] = useState('');
  const [libraryState, setLibraryState] = useState<CommunityTemplateLibraryState>({
    favoriteTemplateIds: [],
    recentUses: [],
    updatedAt: '',
  });
  const [loading, setLoading] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommunityShareTemplateQuery['status']>('all');
  const [scenarioFilter, setScenarioFilter] = useState<PlanningScenario | 'all'>('all');
  const [recommendationFilter, setRecommendationFilter] = useState<RecommendationCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<CommunityShareTemplateQuery['sortBy']>('quality_desc');
  const lastRecommendationSignalKeyRef = useRef('');

  useEffect(() => {
    let active = true;
    async function loadDrafts() {
      const [localResult, cloudResult, libraryResult] = await Promise.all([
        getCommunityShareDrafts(),
        loadCloudTemplates(),
        getCommunityTemplateLibraryState(),
      ]);
      if (!active) return;
      setDrafts(localResult);
      setCloudTemplates(cloudResult);
      setLibraryState(libraryResult);
      setLoading(false);
    }
    loadDrafts();
    return () => { active = false; };
  }, [guestMode, syncStatus.isOnline]);

  async function loadCloudTemplates(): Promise<StoredSharedScheduleTemplateDraft[]> {
    const cache = await getCommunityCloudTemplateCache();
    setCloudCacheTime(cache.updatedAt);
    if (guestMode || !syncStatus.isOnline) return cache.templates;
    setCloudLoading(true);
    try {
      const templates = await fetchApprovedCommunityTemplates({ limit: 30 });
      setCloudCacheTime(new Date().toISOString());
      return templates;
    } catch {
      return cache.templates;
    } finally {
      setCloudLoading(false);
    }
  }

  const readyDrafts = drafts.filter(item => item.status === 'ready_to_publish');
  const editingDrafts = drafts.filter(item => item.status !== 'ready_to_publish');
  const allTemplates = useMemo(() => dedupeTemplates([...drafts, ...cloudTemplates]), [cloudTemplates, drafts]);
  const cloudIds = useMemo(() => new Set(cloudTemplates.map(item => item.id)), [cloudTemplates]);
  const signalCount = allTemplates.reduce((count, item) => count + (item.asset?.profileSignal?.commercialSignals?.length || 0), 0);
  const scenarioOptions = useMemo(
    () => Array.from(new Set(allTemplates.map(item => item.draft.scenario))).sort(),
    [allTemplates],
  );
  const visibleDrafts = useMemo(() => filterCommunityShareDrafts(allTemplates, {
    keyword,
    status: statusFilter,
    scenario: scenarioFilter,
    recommendationCategory: recommendationFilter,
    sortBy,
  }), [allTemplates, keyword, recommendationFilter, scenarioFilter, sortBy, statusFilter]);
  const syncPreview = useMemo(() => buildCommunityShareSyncPreview(drafts, {
    familyId,
    authorMemberId: currentUser?.id,
  }), [currentUser?.id, drafts, familyId]);
  const librarySummary = useMemo(() => summarizeCommunityTemplateLibrary(libraryState), [libraryState]);
  const libraryInsight = useMemo(
    () => buildCommunityTemplateLibraryInsight(libraryState, allTemplates),
    [allTemplates, libraryState],
  );
  const favoriteIds = useMemo(() => new Set(libraryState.favoriteTemplateIds), [libraryState.favoriteTemplateIds]);

  const handleSyncReadyDrafts = async () => {
    if (guestMode) {
      showToastGlobal('游客模式下模板只保存在本机，不会同步到云端', 'info');
      return;
    }
    if (!syncStatus.isOnline) {
      showToastGlobal('当前离线，模板已保存在本机，联网后再同步', 'warning');
      return;
    }
    if (syncPreview.rowCount === 0) {
      showToastGlobal('暂无满足发布条件的模板', 'info');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncReadyCommunityShareDrafts({
        familyId,
        authorMemberId: currentUser?.id,
      });
      const message = `已提交 ${result.syncedRows} 份模板，${result.blockedRows} 份仍需完善`;
      setSyncMessage(message);
      showToastGlobal(message, 'success');
    } catch {
      setSyncMessage('本机模板已保留，云端提交稍后重试');
      showToastGlobal('云端提交失败，本机数据不受影响', 'warning');
    } finally {
      setSyncing(false);
    }
  };

  const handleUseTemplate = async (item: StoredSharedScheduleTemplateDraft) => {
    if (cloudIds.has(item.id)) {
      incrementSharedScheduleTemplateUsage(item.id).catch(() => {});
    }
    recordCommunityTemplateUse(item, cloudIds.has(item.id) ? 'cloud' : 'local')
      .then(setLibraryState)
      .catch(() => {});
    sessionStorage.setItem('pending_community_template_reuse_payload', JSON.stringify(item));
    navigate('/plans/wizard?communitySource=cloud');
  };

  useEffect(() => {
    if (allTemplates.length === 0 || libraryState.recentUses.length + libraryState.favoriteTemplateIds.length === 0) return;
    const signalKey = [
      libraryState.favoriteTemplateIds.join(','),
      libraryState.recentUses.map(item => `${item.templateId}:${item.usedAt}`).join(','),
      allTemplates.map(item => item.id).join(','),
    ].join('|');
    if (lastRecommendationSignalKeyRef.current === signalKey) return;
    lastRecommendationSignalKeyRef.current = signalKey;
    recordCommunityTemplateRecommendationSignals(libraryState, allTemplates, {
      familyId: familyId || undefined,
      memberId: currentUser?.id,
    }).catch(() => {});
  }, [allTemplates, currentUser?.id, familyId, libraryState]);

  const handleToggleFavorite = async (item: StoredSharedScheduleTemplateDraft) => {
    try {
      const next = await toggleCommunityTemplateFavorite(item.id);
      setLibraryState(next);
      showToastGlobal(next.favoriteTemplateIds.includes(item.id) ? '已收藏模板' : '已取消收藏', 'success');
    } catch {
      showToastGlobal('收藏失败，请稍后重试', 'warning');
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low pb-28">
      <TopAppBar title="社区模板" onBack={() => { navigate('/plans'); }} />

      <div className="p-4 space-y-4">
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-on-surface">家庭日程经验库</h2>
              <p className="text-xs font-bold text-on-surface-variant/60 mt-1 leading-relaxed">
                这里先收纳本机确认过的分享模板，后续会接入云端发布、审核和搜索。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">可发布</span>
              <span className="text-xl font-black text-on-surface">{readyDrafts.length}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">待确认</span>
              <span className="text-xl font-black text-on-surface">{editingDrafts.length}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3 col-span-2">
              <span className="text-[10px] font-black text-on-surface-variant/40 flex items-center gap-1">
                <BarChart3 size={11} /> 可沉淀画像信号
              </span>
              <span className="text-xl font-black text-on-surface">{signalCount}</span>
              <p className="text-[10px] font-bold text-on-surface-variant/45 mt-0.5">
                只保留粗粒度场景、阶段和类别，用于未来社区搜索与授权推荐。
              </p>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3 col-span-2">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">云端精选</span>
              <span className="text-xl font-black text-on-surface">{cloudTemplates.length}</span>
              <p className="text-[10px] font-bold text-on-surface-variant/45 mt-0.5">
                {guestMode
                  ? '游客模式下会使用本机缓存。'
                  : syncStatus.isOnline
                    ? '已合并审核通过的社区模板。'
                    : cloudTemplates.length > 0
                      ? '当前离线，正在使用上次缓存的云端精选。'
                      : '当前离线，仅显示本机模板。'}
              </p>
              {cloudCacheTime && cloudTemplates.length > 0 && (
                <p className="text-[10px] font-bold text-on-surface-variant/35 mt-1">
                  缓存时间：{formatTime(cloudCacheTime)}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3 col-span-2">
              <span className="text-[10px] font-black text-on-surface-variant/40 flex items-center gap-1">
                <Heart size={11} /> 我的经验库
              </span>
              <span className="text-xl font-black text-on-surface">{librarySummary.favoriteCount}</span>
              <p className="text-[10px] font-bold text-on-surface-variant/45 mt-0.5">
                已复用 {librarySummary.recentUseCount} 份模板{librarySummary.lastUsedAt ? `，最近 ${formatTime(librarySummary.lastUsedAt)}` : ''}。
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <WandSparkles size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-on-surface">家庭经验推荐</h3>
              <p className="text-xs font-bold text-on-surface-variant/55 mt-1 leading-relaxed">
                {libraryInsight.guidance}
              </p>
            </div>
          </div>
          {libraryInsight.preferredScenarios.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {libraryInsight.preferredScenarios.slice(0, 3).map(item => (
                <span key={item.scenario} className="rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-black text-primary">
                  {item.scenario} × {item.count}
                </span>
              ))}
            </div>
          )}
          {libraryInsight.recommendedTemplates.length > 0 && (
            <div className="mt-4 space-y-2">
              {libraryInsight.recommendedTemplates.slice(0, 2).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleUseTemplate(item)}
                  className="w-full rounded-2xl bg-surface-container-low p-3 text-left active:scale-[0.99] transition-transform"
                >
                  <p className="text-xs font-black text-on-surface truncate">{item.draft.title}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant/50 mt-1 line-clamp-1">
                    {item.asset?.reuseHint || '适合相似家庭复用'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Cloud size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-on-surface">云端发布准备</h3>
              <p className="text-xs font-bold text-on-surface-variant/55 mt-1 leading-relaxed">
                只会提交已授权、已脱敏、没有质量阻断的模板。提交后进入审核，不会直接公开。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">可提交审核</span>
              <span className="text-xl font-black text-on-surface">{syncPreview.rowCount}</span>
            </div>
            <div className="rounded-2xl bg-surface-container-low p-3">
              <span className="text-[10px] font-black text-on-surface-variant/40 block">需完善</span>
              <span className="text-xl font-black text-on-surface">{syncPreview.blockedCount}</span>
            </div>
          </div>
          {syncPreview.blockedDrafts.length > 0 && (
            <div className="mt-3 space-y-2">
              {syncPreview.blockedDrafts.slice(0, 2).map(item => (
                <div key={item.id} className="rounded-2xl bg-warning-container/50 px-3 py-2">
                  <p className="text-[11px] font-black text-warning truncate">{item.title}</p>
                  <p className="text-[10px] font-bold text-warning/70 mt-0.5 line-clamp-1">{item.reasons.join('；')}</p>
                </div>
              ))}
            </div>
          )}
          {syncMessage && (
            <p className="text-[10px] font-black text-primary/70 mt-3">{syncMessage}</p>
          )}
          <button
            onClick={handleSyncReadyDrafts}
            disabled={syncing || syncPreview.rowCount === 0}
            className="mt-4 w-full py-3 rounded-2xl bg-primary text-white text-sm font-black active:scale-[0.98] transition-all disabled:opacity-45"
          >
            {syncing ? '提交中...' : guestMode ? '游客模式仅本机保存' : '提交可发布模板'}
          </button>
        </div>

        <div className="bg-surface rounded-2xl p-4 shadow-sm border border-outline-variant/10 space-y-3">
          <div className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-3 py-2.5">
            <Search size={16} className="text-on-surface-variant/40 shrink-0" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索暑假、阅读、运动、学段..."
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-on-surface outline-none placeholder:text-on-surface-variant/35"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 text-[10px] font-black text-on-surface-variant/35 flex items-center gap-1">
              <SlidersHorizontal size={12} /> 筛选
            </span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as CommunityShareTemplateQuery['status'])}
              className="shrink-0 rounded-xl bg-surface-container-low px-2.5 py-1.5 text-[11px] font-black text-on-surface outline-none"
            >
              <option value="all">全部状态</option>
              <option value="ready_to_publish">可发布</option>
              <option value="draft">待确认</option>
            </select>
            <select
              value={scenarioFilter}
              onChange={(event) => setScenarioFilter(event.target.value as PlanningScenario | 'all')}
              className="shrink-0 rounded-xl bg-surface-container-low px-2.5 py-1.5 text-[11px] font-black text-on-surface outline-none"
            >
              <option value="all">全部场景</option>
              {scenarioOptions.map(scenario => (
                <option key={scenario} value={scenario}>{scenario}</option>
              ))}
            </select>
            <select
              value={recommendationFilter}
              onChange={(event) => setRecommendationFilter(event.target.value as RecommendationCategory | 'all')}
              className="shrink-0 rounded-xl bg-surface-container-low px-2.5 py-1.5 text-[11px] font-black text-on-surface outline-none"
            >
              <option value="all">全部信号</option>
              <option value="education">教育</option>
              <option value="travel">旅行</option>
              <option value="healthcare">健康</option>
            </select>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as CommunityShareTemplateQuery['sortBy'])}
              className="shrink-0 rounded-xl bg-surface-container-low px-2.5 py-1.5 text-[11px] font-black text-on-surface outline-none"
            >
              <option value="quality_desc">质量优先</option>
              <option value="updated_desc">最近更新</option>
              <option value="slot_count_desc">时段最多</option>
            </select>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant/40">
            当前显示 {visibleDrafts.length} / {allTemplates.length} 份模板{cloudLoading ? '，正在读取云端精选' : ''}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : allTemplates.length === 0 ? (
          <div className="text-center py-12">
            <ShieldCheck size={48} className="mx-auto text-outline-variant/30 mb-3" />
            <p className="text-sm font-bold text-on-surface-variant/50">还没有分享模板</p>
            <p className="text-xs font-bold text-on-surface-variant/35 mt-1">可以从计划详情里的“脱敏分享”开始</p>
          </div>
        ) : visibleDrafts.length === 0 ? (
          <div className="text-center py-12">
            <Search size={48} className="mx-auto text-outline-variant/30 mb-3" />
            <p className="text-sm font-bold text-on-surface-variant/50">没有匹配的模板</p>
            <p className="text-xs font-bold text-on-surface-variant/35 mt-1">可以换个关键词或放宽筛选条件</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleDrafts.map(item => {
              const isCloud = cloudIds.has(item.id);
              const isFavorite = favoriteIds.has(item.id);
              return (
              <div
                key={item.id}
                className="w-full bg-surface rounded-2xl p-4 shadow-sm border border-outline-variant/10 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={isCloud
                        ? 'px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black'
                        : item.status === 'ready_to_publish'
                        ? 'px-2 py-0.5 rounded-full bg-primary-container/20 text-primary text-[10px] font-black'
                        : 'px-2 py-0.5 rounded-full bg-warning-container/50 text-warning text-[10px] font-black'}
                      >
                        {isCloud ? '云端精选' : item.status === 'ready_to_publish' ? '可发布' : '待确认'}
                      </span>
                      <span className="text-[10px] font-black text-on-surface-variant/40 flex items-center gap-1">
                        <Clock size={11} /> {formatTime(item.updatedAt)}
                      </span>
                    </div>
                    <h3 className="font-black text-sm text-on-surface truncate">{item.draft.title}</h3>
                    <p className="text-xs font-bold text-on-surface-variant/50 mt-1 line-clamp-1">
                      {item.asset?.reuseHint || [item.draft.ageRange, item.draft.gradeBand, item.draft.cityLevel].filter(Boolean).join(' · ') || '未填写匹配标签'}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={item.asset?.qualityLevel === 'excellent'
                        ? 'rounded-full bg-primary-container/20 px-2 py-0.5 text-[9px] font-black text-primary'
                        : item.asset?.qualityLevel === 'good'
                          ? 'rounded-full bg-primary-container/20 px-2 py-0.5 text-[9px] font-black text-primary'
                          : 'rounded-full bg-warning-container/50 px-2 py-0.5 text-[9px] font-black text-warning'}
                      >
                        模板质量 {item.asset?.qualityScore ?? 0}
                      </span>
                      {(item.asset?.profileSignal?.commercialSignals || []).slice(0, 2).map(signal => (
                        <span key={signal.category} className="rounded-full bg-surface-container-low px-2 py-0.5 text-[9px] font-black text-on-surface-variant/50">
                          {signal.category === 'education' ? '教育' : signal.category === 'travel' ? '旅行' : '健康'}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(item.asset?.tags || []).slice(0, 4).map(tag => (
                        <span key={tag} className="rounded-full bg-primary/5 px-2 py-0.5 text-[9px] font-black text-primary">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-primary shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(item)}
                      className={isFavorite
                        ? 'w-8 h-8 rounded-full bg-danger-container text-danger flex items-center justify-center active:scale-95 transition-transform'
                        : 'w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant/45 flex items-center justify-center active:scale-95 transition-transform'}
                    >
                      <Heart size={15} className={isFavorite ? 'fill-current' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={() => isCloud ? handleUseTemplate(item) : navigate(`/community/share-review/${item.id}`)}
                      className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      {isCloud ? <WandSparkles size={15} /> : <Eye size={16} />}
                    </button>
                    {!isCloud && (
                      <button
                        type="button"
                        onClick={() => navigate(`/community/share-review/${item.id}`)}
                        className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

function dedupeTemplates(templates: StoredSharedScheduleTemplateDraft[]): StoredSharedScheduleTemplateDraft[] {
  const seen = new Set<string>();
  const result: StoredSharedScheduleTemplateDraft[] = [];
  for (const item of templates) {
    const key = item.id || `${item.draft.title}-${item.draft.scenario}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}
