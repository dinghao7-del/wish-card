import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Brain, CalendarCheck, CheckCircle2, ChevronRight, Grid2X2, ListChecks, Sparkles, Target, WandSparkles, X } from 'lucide-react';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { showToastGlobal } from '../components/Toast';
import { useFamily } from '../context/FamilyContext';
import {
  buildRecommendationFeedbackState,
  getRecommendationEvents,
  getRecommendationFunnelItems,
  recordRecommendationEvent,
} from '../lib/recommendationEvents';
import {
  applyCommercialProfileToCandidates,
  buildCandidatesFromFamilyBehavior,
  buildCandidatesFromRecommendationEvents,
  buildCommercialRecommendationProfile,
  buildDefaultRecommendationCandidates,
  buildRecommendationGateway,
  dedupeRecommendationCandidates,
  type RecommendationCandidate,
  type RecommendationGatewayCard,
} from '../lib/recommendationGateway';
import { loadCommercialResources, matchCommercialResources, type ResourceMatchResult } from '../lib/recommendationInventory';
import { toCityLevel } from '../lib/communityShare';
import { getStoredPublicCalendarRegion, loadPublicCalendarSignalBundle } from '../lib/publicCalendarSources';

const analysisItems = [
  {
    title: 'AI 智能建档',
    desc: '通过家庭画像、孩子年龄、作息和关注重点，生成初始任务、习惯和心愿建议。',
    icon: Brain,
    action: '开始建档',
    to: '/onboarding',
    tone: 'primary',
  },
  {
    title: '计划执行',
    desc: '把作息型、周期型、目标型计划拆成孩子能直接完成的每日任务。',
    icon: CalendarCheck,
    action: '进入计划',
    to: '/plans',
    tone: 'primary',
  },
  {
    title: '四象限取舍',
    desc: '按今天、本周或本月检查家庭事项，帮助家长判断先做什么、什么可以后移。',
    icon: Grid2X2,
    action: '开始分析',
    to: '/quadrant?range=week',
    tone: 'secondary',
  },
  {
    title: '家庭复盘',
    desc: '自动汇总本周、本月、学期里的任务完成、好习惯、惩罚纠正、心愿兑现和下周期提醒。',
    icon: BarChart3,
    action: '查看复盘',
    to: '/reports?period=week',
    tone: 'secondary',
  },
];

export function AIAnalysisHub() {
  const navigate = useNavigate();
  const { tasks, rewards, members, familyId, currentUser, syncStatus, guestMode } = useFamily();
  const [recommendationCards, setRecommendationCards] = useState<RecommendationGatewayCard[]>([]);
  const [resourceMatches, setResourceMatches] = useState<ResourceMatchResult[]>([]);
  const [dismissedResourceIds, setDismissedResourceIds] = useState<string[]>([]);
  const [interestedResourceIds, setInterestedResourceIds] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const impressedResourceIdsRef = useRef<Set<string>>(new Set());
  const pendingTasks = tasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length;
  const reviewingTasks = tasks.filter(task => task.status === 'reviewing').length;
  const familyPromiseTasks = tasks.filter(task => /兑现|心愿|承诺|周末|出游|游玩|礼物/.test(`${task.title} ${task.description}`)).length;
  const redeemedWishes = rewards.filter(reward => reward.status === 'redeemed' || reward.status === 'pending_approval').length;
  const childCount = members.filter(member => member.role === 'child').length;
  const recommendationHeadline = useMemo(() => {
    if (recommendationCards.length === 0) return '正在根据家庭行为形成推荐方向';
    return `已形成 ${recommendationCards.length} 条家庭推荐方向`;
  }, [recommendationCards.length]);
  const visibleResourceMatches = useMemo(
    () => resourceMatches.filter(match => !dismissedResourceIds.includes(match.resource.id)),
    [dismissedResourceIds, resourceMatches],
  );

  useEffect(() => {
    let active = true;
    async function loadRecommendationCards() {
      const [events, region] = await Promise.all([
        getRecommendationEvents(),
        getStoredPublicCalendarRegion(),
      ]);
      const calendarBundle = await loadPublicCalendarSignalBundle({
        year: new Date().getFullYear(),
        region,
        includeRemote: syncStatus.isOnline && !guestMode,
      });
      const familyBehaviorCandidates = buildCandidatesFromFamilyBehavior({
        tasks,
        publicCalendarSignals: calendarBundle.signals,
        cityLevel: toCityLevel(region),
      });
      const behaviorCandidates = buildCandidatesFromRecommendationEvents(events);
      const fallbackCandidates = behaviorCandidates.length > 0 || familyBehaviorCandidates.length > 0 ? [] : buildDefaultRecommendationCandidates();
      const profile = buildCommercialRecommendationProfile({
        tasks,
        events,
        publicCalendarSignals: calendarBundle.signals,
        cityLevel: toCityLevel(region),
      });
      const sourceCandidates: RecommendationCandidate[] = applyCommercialProfileToCandidates(
        [...familyBehaviorCandidates, ...behaviorCandidates, ...fallbackCandidates],
        profile,
      );
      const displayCandidates = dedupeRecommendationCandidates(sourceCandidates);
      const [resources, funnelItems] = await Promise.all([
        loadCommercialResources({ online: syncStatus.isOnline && !guestMode }),
        getRecommendationFunnelItems(),
      ]);
      const gateway = buildRecommendationGateway(displayCandidates);
      const resourceResults = matchCommercialResources(sourceCandidates, resources, 3, funnelItems);
      const feedbackState = buildRecommendationFeedbackState(funnelItems);
      if (!active) return;
      setRecommendationCards(gateway.visible.slice(0, 3));
      setResourceMatches(resourceResults);
      setDismissedResourceIds(feedbackState.dismissedItemIds);
      setInterestedResourceIds(feedbackState.interestedItemIds);
    }
    loadRecommendationCards();
    return () => { active = false; };
  }, [guestMode, reloadKey, syncStatus.isOnline, tasks]);

  const handleRecommendationClick = (card: RecommendationGatewayCard) => {
    recordRecommendationEvent({
      category: card.category,
      eventType: 'click',
      itemId: card.id,
      familyId: familyId || undefined,
      memberId: currentUser?.id,
      context: {
        ...card.safeContext,
        source: card.source,
        recommendationReason: card.reason,
      },
    }).catch(() => {});
    navigate(card.destination);
  };

  const handleResourceClick = (match: ResourceMatchResult) => {
    recordRecommendationEvent({
      category: match.resource.category,
      eventType: 'click',
      itemId: match.resource.id,
      familyId: familyId || undefined,
      memberId: currentUser?.id,
      context: buildResourceEventContext(match, `resource_match_${match.resource.kind}_${Math.round(match.score)}`),
    }).catch(() => {});
    navigate(match.resource.destination);
  };

  const handleResourceDismiss = (match: ResourceMatchResult) => {
    setDismissedResourceIds(prev => Array.from(new Set([...prev, match.resource.id])));
    recordRecommendationEvent({
      category: match.resource.category,
      eventType: 'dismiss',
      itemId: match.resource.id,
      familyId: familyId || undefined,
      memberId: currentUser?.id,
      context: buildResourceEventContext(match, `resource_dismiss_${match.resource.kind}`),
    }).then(() => {
      setReloadKey(key => key + 1);
      showToastGlobal('已减少这类推荐', 'success');
    }).catch(() => {});
  };

  const handleResourceConversion = (match: ResourceMatchResult) => {
    setInterestedResourceIds(prev => Array.from(new Set([...prev, match.resource.id])));
    recordRecommendationEvent({
      category: match.resource.category,
      eventType: 'conversion',
      itemId: match.resource.id,
      familyId: familyId || undefined,
      memberId: currentUser?.id,
      context: buildResourceEventContext(match, `resource_conversion_${match.resource.kind}`),
    }).then(() => {
      setReloadKey(key => key + 1);
      showToastGlobal('已记录兴趣，后续推荐会更偏向这类资源', 'success');
    }).catch(() => {});
  };

  useEffect(() => {
    visibleResourceMatches.forEach(match => {
      if (impressedResourceIdsRef.current.has(match.resource.id)) return;
      impressedResourceIdsRef.current.add(match.resource.id);
      recordRecommendationEvent({
        category: match.resource.category,
        eventType: 'impression',
          itemId: match.resource.id,
          familyId: familyId || undefined,
          memberId: currentUser?.id,
        context: buildResourceEventContext(match, `resource_impression_${match.resource.kind}`),
      }).catch(() => {});
    });
  }, [currentUser?.id, familyId, visibleResourceMatches]);

  return (
    <div className="ui-ai-page min-h-screen bg-background pb-28 animate-in fade-in duration-500">
      <TopAppBar title="AI 分析" />

      <div className="px-4 sm:px-6 py-4 space-y-4">
        <section className="ui-ai-hero rounded-3xl bg-primary-container border border-primary/10 p-4 sm:p-5 shadow-sm overflow-hidden relative">
          <div className="relative flex items-start gap-3 sm:gap-4">
            <div className="ui-ai-icon w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-surface/80 flex items-center justify-center text-primary shadow-sm shrink-0">
              <WandSparkles size={24} strokeWidth={2.6} />
            </div>
            <div className="min-w-0 max-w-full">
              <h1 className="text-safe text-xl sm:text-2xl font-black text-primary-text tracking-tight">家庭 AI 分析中心</h1>
              <p className="text-safe max-w-[30rem] text-xs sm:text-sm font-bold text-primary-text/70 leading-relaxed mt-1.5">
                这里是家庭管家的工作台：先建档，再把计划落到每日任务，用四象限做取舍，最后自动复盘。
              </p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatusTile label="孩子档案" value={childCount > 0 ? `${childCount} 位` : '待补充'} />
          <StatusTile label="待执行" value={`${pendingTasks} 项`} />
          <StatusTile label="待审核" value={`${reviewingTasks} 项`} />
          <StatusTile label="兑现提醒" value={`${Math.max(familyPromiseTasks, redeemedWishes)} 项`} />
        </section>

        <section className="ui-ai-panel rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="ui-ai-icon w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ListChecks size={20} strokeWidth={2.6} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-on-surface">建议今天按这个顺序推进</h2>
              <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                家庭画像不完整时先建档；已有计划时先进入执行；事项变多时用四象限取舍；周末或月底看复盘。
              </p>
            </div>
          </div>
        </section>

        <section className="ui-ai-panel rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="ui-ai-icon w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Target size={20} strokeWidth={2.6} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-on-surface">智能匹配推荐</h2>
              <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                {recommendationHeadline}，只使用行为标签和场景特征，不展示家庭隐私原文。
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {recommendationCards.map(card => (
              <button
                key={card.id}
                type="button"
                onClick={() => handleRecommendationClick(card)}
                className="ui-ai-recommendation-card w-full rounded-2xl bg-surface-container-low p-3 text-left active:scale-[0.99] transition-all flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0">
                  <Sparkles size={16} strokeWidth={2.6} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-on-surface leading-snug">{card.title}</p>
                  <p className="text-[11px] font-bold text-on-surface-variant/55 leading-relaxed mt-1">{card.reason}</p>
                  <p className="text-[11px] font-black text-primary mt-2 flex items-center gap-1">
                    {card.actionLabel}
                    <ChevronRight size={13} />
                  </p>
                </div>
              </button>
            ))}
          </div>
          {visibleResourceMatches.length > 0 && (
            <div className="mt-4 pt-4 border-t border-outline-variant/10">
              <p className="text-[11px] font-black text-on-surface-variant/45 mb-2">可匹配资源池</p>
              <div className="space-y-2">
                {visibleResourceMatches.map(match => (
                  <div
                    key={match.resource.id}
                    className="ui-ai-resource-card w-full rounded-2xl bg-primary/5 p-3 text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-on-surface">{match.resource.title}</p>
                        <p className="text-[11px] font-bold text-on-surface-variant/55 mt-1 leading-relaxed">
                          {match.resource.sellingPoint}
                        </p>
                        <p className="text-[10px] font-black text-primary mt-2">
                          {match.reasons.slice(0, 3).join(' · ')}
                        </p>
                        {interestedResourceIds.includes(match.resource.id) && (
                          <p className="text-[10px] font-black text-primary mt-2">
                            已记录兴趣，后续会提高类似资源权重
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-surface px-2 py-1 text-[10px] font-black text-primary">
                        {Math.round(match.score)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleResourceClick(match)}
                        className="flex-1 rounded-xl bg-primary text-white py-2 text-[11px] font-black active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                      >
                        {match.resource.actionLabel}
                        <ChevronRight size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResourceConversion(match)}
                        disabled={interestedResourceIds.includes(match.resource.id)}
                        className="rounded-xl bg-surface px-3 py-2 text-[11px] font-black text-primary active:scale-[0.98] transition-all flex items-center gap-1 disabled:text-primary disabled:bg-primary-container/20"
                      >
                        <CheckCircle2 size={13} />
                        {interestedResourceIds.includes(match.resource.id) ? '已感兴趣' : '感兴趣'}
                      </button>
                      <button
                        type="button"
                        aria-label="暂不感兴趣"
                        onClick={() => handleResourceDismiss(match)}
                        className="w-8 h-8 rounded-xl bg-surface text-on-surface-variant/55 flex items-center justify-center active:scale-95 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3">
          {analysisItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                type="button"
                onClick={() => navigate(item.to)}
                className="ui-ai-action-card w-full bg-surface dark:bg-surface-container-low rounded-3xl p-4 border border-outline-variant/10 shadow-sm active:scale-[0.98] transition-all text-left flex items-start gap-3 sm:gap-4"
              >
                <div className="ui-ai-icon w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                  <Icon size={23} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-safe text-base font-black text-on-surface">{item.title}</h2>
                    {item.title === '家庭复盘' && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">自动</span>
                    )}
                  </div>
                  <p className="text-safe text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">{item.desc}</p>
                  <p className="text-[11px] font-black text-primary mt-3 flex items-center gap-1">
                    {item.action}
                    <ChevronRight size={14} />
                  </p>
                </div>
              </button>
            );
          })}
        </section>

        <section className="ui-ai-note rounded-3xl bg-surface-container-low border border-outline-variant/10 p-4 flex items-start gap-3">
          <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
          <p className="text-safe text-xs font-bold text-on-surface-variant leading-relaxed">
            周报、月报、学期报和年度报不需要家长手动设置。系统会自动整理，让孩子看到努力带来的变化，也让家长提前看到下周期重点。
          </p>
        </section>
      </div>
    </div>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-ai-status-tile rounded-2xl bg-surface border border-outline-variant/10 p-3 shadow-sm min-w-0">
      <p className="text-[10px] font-black text-on-surface-variant/45">{label}</p>
      <p className="text-base font-black text-on-surface mt-1 truncate">{value}</p>
    </div>
  );
}

function buildResourceEventContext(match: ResourceMatchResult, recommendationReason: string): Record<string, unknown> {
  return {
    ...match.candidate.safeContext,
    source: match.candidate.source,
    resourceKind: match.resource.kind,
    matchScore: Math.round(match.score),
    recommendationReason,
  };
}
