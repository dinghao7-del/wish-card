import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, Brain, CalendarCheck, CheckCircle2, ChevronRight, Grid2X2, Sparkles, Target, X, type LucideIcon } from 'lucide-react';
import { AppModal } from '../components/AppModal';
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
import type { Member, Reward, Task } from '../types';

const analysisItems = [
  {
    titleKey: 'ai_analysis.review_title',
    descKey: 'ai_analysis.review_desc',
    icon: BarChart3,
    actionKey: 'ai_analysis.review_action',
    to: '/reports?period=week',
    tone: 'secondary',
  },
  {
    titleKey: 'ai_analysis.quadrant_title',
    descKey: 'ai_analysis.quadrant_desc',
    icon: Grid2X2,
    actionKey: 'ai_analysis.quadrant_action',
    to: '/quadrant?range=week',
    tone: 'secondary',
  },
];

type StatusPanelKey = 'children' | 'pending' | 'reviewing' | 'promises';

export function AIAnalysisHub() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isZh = (i18n.language || '').toLowerCase().startsWith('zh');
  const od = (zh: string, en: string) => (isZh ? zh : en);
  const { tasks, rewards, members, familyId, currentUser, syncStatus, guestMode } = useFamily();
  const [recommendationCards, setRecommendationCards] = useState<RecommendationGatewayCard[]>([]);
  const [resourceMatches, setResourceMatches] = useState<ResourceMatchResult[]>([]);
  const [dismissedResourceIds, setDismissedResourceIds] = useState<string[]>([]);
  const [interestedResourceIds, setInterestedResourceIds] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [profileCardExpanded, setProfileCardExpanded] = useState(false);
  const [activeStatusPanel, setActiveStatusPanel] = useState<StatusPanelKey | null>(null);
  const impressedResourceIdsRef = useRef<Set<string>>(new Set());
  const childMembers = members.filter(member => member.role === 'child');
  const pendingTaskItems = tasks.filter(task => task.status === 'pending' || task.status === 'in_progress');
  const reviewingTaskItems = tasks.filter(task => task.status === 'reviewing');
  const promiseTaskItems = tasks.filter(task => /兑现|心愿|承诺|周末|出游|游玩|礼物/.test(`${task.title} ${task.description}`));
  const redeemedWishItems = rewards.filter(reward => reward.status === 'redeemed' || reward.status === 'pending_approval');
  const pendingTasks = tasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length;
  const reviewingTasks = tasks.filter(task => task.status === 'reviewing').length;
  const familyPromiseTasks = promiseTaskItems.length;
  const redeemedWishes = redeemedWishItems.length;
  const childCount = childMembers.length;
  const hasStartedFamilyProfile = childCount > 0 || tasks.length > 0 || rewards.length > 0;
  const recommendationHeadline = useMemo(() => {
    if (recommendationCards.length === 0) return t('ai_analysis.recommendation_forming', { defaultValue: od('正在根据家庭行为形成推荐方向', 'Building recommendation directions from family behavior') });
    return t('ai_analysis.recommendation_count', { defaultValue: od('已形成 {{count}} 条家庭推荐方向', '{{count}} recommendation directions formed'), count: recommendationCards.length });
  }, [od, recommendationCards.length, t]);
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
      const realResourceResults = resourceResults.filter(match => !isPlaceholderCommercialResource(match));
      const feedbackState = buildRecommendationFeedbackState(funnelItems);
      if (!active) return;
      setRecommendationCards(gateway.visible.slice(0, 3));
      setResourceMatches(realResourceResults);
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
    navigate(normalizeRecommendationDestination(card.destination));
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
    navigate(normalizeRecommendationDestination(match.resource.destination));
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
      showToastGlobal(t('ai_analysis.resource_dismissed_toast', { defaultValue: od('已减少这类推荐', 'Reduced similar recommendations') }), 'success');
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
      showToastGlobal(t('ai_analysis.resource_interest_toast', { defaultValue: od('已记录兴趣，后续推荐会更偏向这类资源', 'Interest saved. Future recommendations will prefer similar resources.') }), 'success');
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

  useEffect(() => {
    setProfileCardExpanded(!hasStartedFamilyProfile);
  }, [hasStartedFamilyProfile]);

  return (
    <div className="ui-ai-page min-h-screen bg-background pb-28 animate-in fade-in duration-500">
      <TopAppBar title={t('ai_analysis.title', { defaultValue: '家庭管家' })} />

      <div className="px-4 sm:px-6 py-4 space-y-4">
        {!hasStartedFamilyProfile && (
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="w-full rounded-3xl bg-primary text-white p-4 shadow-sm text-left active:scale-[0.99] transition-all flex items-center gap-3"
          >
            <span className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles size={22} strokeWidth={2.7} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-black">{t('ai_analysis.complete_profile', { defaultValue: '先完成家庭建档' })}</span>
              <span className="block text-xs font-bold text-white/75 leading-relaxed mt-1">
                {t('ai_analysis.complete_profile_desc', { defaultValue: '用一次对话把孩子、作息和课外班说清楚，AI 才能生成更准的日程建议。' })}
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0" />
          </button>
        )}

        <section
          className="rounded-3xl bg-surface border border-primary/15 p-4 shadow-sm active:scale-[0.99] transition-all"
          onClick={() => hasStartedFamilyProfile && setProfileCardExpanded(expanded => !expanded)}
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="ui-ai-icon w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0">
              <Brain size={24} strokeWidth={2.7} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-safe text-base sm:text-lg font-black text-on-surface">
                      {hasStartedFamilyProfile
                        ? t('ai_analysis.profile_title_ready', { defaultValue: '家庭建档' })
                        : t('ai_analysis.profile_title_new', { defaultValue: '新用户第一步：引导式家庭建档' })}
                    </h2>
                    <span className="rounded-full bg-primary-container/25 px-2 py-0.5 text-[10px] font-black text-primary">
                      {t('ai_analysis.core_flow', { defaultValue: '核心流程' })}
                    </span>
                  </div>
                  <p className="text-safe text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                    {hasStartedFamilyProfile
                      ? t('ai_analysis.profile_summary', {
                        defaultValue: '{{count}}位孩子 · {{tasks}}项任务 · 点击展开家庭画像',
                        count: childCount || t('ai_analysis.profile_summary_unknown', { defaultValue: '已' }),
                        tasks: tasks.length,
                      })
                      : t('ai_analysis.profile_summary_new', { defaultValue: '先把家庭画像、作息和孩子安排一次说清楚。' })}
                  </p>
                </div>
                {hasStartedFamilyProfile && (
                  <span className="shrink-0 rounded-full bg-surface-container-low px-2 py-1 text-[10px] font-black text-primary flex items-center gap-1">
                    {profileCardExpanded
                      ? t('ai_analysis.collapse', { defaultValue: '收起' })
                      : t('ai_analysis.expand', { defaultValue: '展开' })}
                    <ChevronRight size={13} className={profileCardExpanded ? 'rotate-90 transition-transform' : 'transition-transform'} />
                  </span>
                )}
              </div>
              {profileCardExpanded && (
                <>
                  <p className="text-safe text-xs sm:text-sm font-bold text-on-surface-variant/65 leading-relaxed mt-3">
                    {hasStartedFamilyProfile
                      ? t('ai_analysis.profile_desc_ready', { defaultValue: '家庭基础画像已经建立。后续重点是基于现有孩子、任务、心愿和公共时间信息，持续给出日程优化、复盘和取舍建议。' })
                      : t('ai_analysis.profile_desc_new', { defaultValue: 'AI 会用最少问题带家长梳理孩子年龄、上学时间、课外班频率、日常练习、父母工作约束和奖励偏好，最后直接生成任务、习惯、计划和心愿草稿。' })}
                  </p>
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {((t('ai_analysis.chips', { returnObjects: true, defaultValue: ['家庭成员', '作息约束', '课外班/兴趣', '奖励与心愿'] }) as string[]) || []).map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (hasStartedFamilyProfile) {
                            setActiveStatusPanel(index === 0 ? 'children' : index === 3 ? 'promises' : 'pending');
                            return;
                          }
                          navigate('/onboarding');
                        }}
                        className="rounded-2xl bg-surface-container-low px-3 py-2 text-center text-[11px] font-black text-on-surface-variant active:scale-95 transition-all"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-2">
                    {!hasStartedFamilyProfile && (
                      <ProfileActionRow
                        icon={Brain}
                        title={t('ai_analysis.start_profile', { defaultValue: '开始智能建档' })}
                        desc={t('ai_analysis.start_profile_desc', { defaultValue: '用一次引导式对话补充家庭成员、作息、课外班、日常练习和奖励偏好。' })}
                        action={t('ai_analysis.start_profile_action', { defaultValue: '开始建档' })}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate('/onboarding');
                        }}
                      />
                    )}
                    <ProfileActionRow
                      icon={CalendarCheck}
                      title={hasStartedFamilyProfile
                        ? t('ai_analysis.optimize_title_ready', { defaultValue: '基于现有画像优化日程' })
                        : t('ai_analysis.optimize_title', { defaultValue: '日程优化' })}
                      desc={t('ai_analysis.optimize_desc', { defaultValue: '基于画像、任务、心愿兑现和公共时间情报，生成本周或假期调整建议。' })}
                      action={t('ai_analysis.optimize_action', { defaultValue: '优化日程' })}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate('/plans/smart-recommend');
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatusTile label={t('ai_analysis.status_children', { defaultValue: '孩子档案' })} value={childCount > 0 ? t('ai_analysis.unit_children', { defaultValue: '{{count}} 位', count: childCount }) : t('ai_analysis.status_children_empty', { defaultValue: '待补充' })} onClick={() => setActiveStatusPanel('children')} />
          <StatusTile label={t('ai_analysis.status_pending', { defaultValue: '待执行' })} value={t('ai_analysis.unit_items', { defaultValue: '{{count}} 项', count: pendingTasks })} onClick={() => setActiveStatusPanel('pending')} />
          <StatusTile label={t('ai_analysis.status_reviewing', { defaultValue: '待审核' })} value={t('ai_analysis.unit_items', { defaultValue: '{{count}} 项', count: reviewingTasks })} onClick={() => setActiveStatusPanel('reviewing')} />
          <StatusTile label={t('ai_analysis.status_promises', { defaultValue: '兑现提醒' })} value={t('ai_analysis.unit_items', { defaultValue: '{{count}} 项', count: Math.max(familyPromiseTasks, redeemedWishes) })} onClick={() => setActiveStatusPanel('promises')} />
        </section>

        {visibleResourceMatches.length > 0 && (
        <section className="ui-ai-panel rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <div className="ui-ai-icon w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Target size={20} strokeWidth={2.6} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-on-surface">{t('ai_analysis.real_resource_recommendations', { defaultValue: od('真实资源推荐', 'Real resource recommendations') })}</h2>
              <p className="text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                {t('ai_analysis.real_resource_recommendations_desc', { defaultValue: od('{{headline}}，已匹配到可查看资源，只使用行为标签和场景特征，不展示家庭隐私原文。', '{{headline}}. Viewable resources are matched using behavior tags and scenario features only, without showing private family text.'), headline: recommendationHeadline })}
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
              <p className="text-[11px] font-black text-on-surface-variant/45 mb-2">{t('ai_analysis.matchable_resource_pool', { defaultValue: od('可匹配资源池', 'Matchable resource pool') })}</p>
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
                            {t('ai_analysis.resource_interest_recorded', { defaultValue: od('已记录兴趣，后续会提高类似资源权重', 'Interest saved. Similar resources will be weighted higher.') })}
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
                        {interestedResourceIds.includes(match.resource.id)
                          ? t('ai_analysis.resource_interested_done', { defaultValue: '已感兴趣' })
                          : t('ai_analysis.resource_interested', { defaultValue: '感兴趣' })}
                      </button>
                      <button
                        type="button"
                        aria-label={t('ai_analysis.resource_dismiss', { defaultValue: '暂不感兴趣' })}
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
        )}

        <section className="space-y-3">
          {analysisItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.titleKey}
                type="button"
                onClick={() => navigate(item.to)}
                className="ui-ai-action-card w-full bg-surface dark:bg-surface-container-low rounded-3xl p-4 border border-outline-variant/10 shadow-sm active:scale-[0.98] transition-all text-left flex items-start gap-3 sm:gap-4"
              >
                <div className="ui-ai-icon w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary shrink-0">
                  <Icon size={23} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h2 className="text-safe text-base font-black text-on-surface">{t(item.titleKey)}</h2>
                    {item.titleKey === 'ai_analysis.review_title' && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">{t('ai_analysis.auto', { defaultValue: '自动' })}</span>
                    )}
                  </div>
                  <p className="text-safe text-xs font-bold text-on-surface-variant/60 leading-relaxed mt-1">{t(item.descKey)}</p>
                  <p className="text-[11px] font-black text-primary mt-3 flex items-center gap-1">
                    {t(item.actionKey)}
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
            {t('ai_analysis.note', { defaultValue: '周报、月报、学期报和年度报不需要家长手动设置。系统会自动整理，让孩子看到努力带来的变化，也让家长提前看到下周期重点。' })}
          </p>
        </section>
      </div>

      <StatusDetailModal
        activePanel={activeStatusPanel}
        childMembers={childMembers}
        pendingTasks={pendingTaskItems}
        reviewingTasks={reviewingTaskItems}
        promiseTasks={promiseTaskItems}
        redeemedWishes={redeemedWishItems}
        onClose={() => setActiveStatusPanel(null)}
        onNavigate={(to) => {
          setActiveStatusPanel(null);
          navigate(to);
        }}
      />
    </div>
  );
}

function ProfileActionRow({
  icon: Icon,
  title,
  desc,
  action,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  action: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl bg-surface-container-low px-3 py-3 text-left active:scale-[0.98] transition-all flex items-start gap-3"
    >
      <span className="w-9 h-9 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0">
        <Icon size={18} strokeWidth={2.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-on-surface">{title}</span>
        <span className="block text-[11px] font-bold text-on-surface-variant/60 leading-relaxed mt-1">{desc}</span>
        <span className="mt-2 text-[11px] font-black text-primary flex items-center gap-1">
          {action}
          <ChevronRight size={13} />
        </span>
      </span>
    </button>
  );
}

function StatusDetailModal({
  activePanel,
  childMembers,
  pendingTasks,
  reviewingTasks,
  promiseTasks,
  redeemedWishes,
  onClose,
  onNavigate,
}: {
  activePanel: StatusPanelKey | null;
  childMembers: Member[];
  pendingTasks: Task[];
  reviewingTasks: Task[];
  promiseTasks: Task[];
  redeemedWishes: Reward[];
  onClose: () => void;
  onNavigate: (to: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const isZh = (i18n.language || '').toLowerCase().startsWith('zh');
  const od = (zh: string, en: string) => (isZh ? zh : en);
  const config = getStatusPanelConfig(activePanel, t, od);
  if (!config) return null;

  const items = activePanel === 'children'
    ? childMembers.map(member => ({ id: member.id, title: member.name, meta: t('ai_analysis.current_stars', { defaultValue: od('当前星星 {{count}}', '{{count}} stars now'), count: member.stars }) }))
    : activePanel === 'pending'
      ? pendingTasks.map(task => ({ id: task.id, title: task.title, meta: task.deadline ? formatShortDate(task.deadline, i18n.language) : task.isHabit ? t('common.habit', { defaultValue: od('习惯', 'Habit') }) : t('common.task', { defaultValue: od('任务', 'Task') }) }))
      : activePanel === 'reviewing'
        ? reviewingTasks.map(task => ({ id: task.id, title: task.title, meta: task.rewardStars >= 0 ? t('ai_analysis.pending_reward', { defaultValue: od('待奖励 +{{count}}', 'Reward pending +{{count}}'), count: task.rewardStars }) : t('ai_analysis.pending_penalty', { defaultValue: od('待扣分 {{count}}', 'Penalty pending {{count}}'), count: task.rewardStars }) }))
        : [
          ...promiseTasks.map(task => ({ id: task.id, title: task.title, meta: t('ai_analysis.parent_promise_pending', { defaultValue: od('父母待兑现', 'Parent promise pending') }) })),
          ...redeemedWishes.map(reward => ({ id: reward.id, title: reward.name, meta: reward.status === 'pending_approval' ? t('ai_analysis.wish_pending_confirm', { defaultValue: od('心愿待确认', 'Wish awaiting confirmation') }) : t('ai_analysis.wish_redeemed_pending', { defaultValue: od('已兑换待兑现', 'Redeemed, waiting to fulfill') }) })),
        ];

  return (
    <AppModal
      open
      title={config.title}
      onClose={onClose}
      surface="sheet"
      footer={(
        <button
          type="button"
          onClick={() => onNavigate(config.to)}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-black text-white active:scale-[0.98] transition-all"
        >
          {t('ai_analysis.enter_panel_page', { defaultValue: od('进入{{title}}页面', 'Open {{title}} page'), title: config.title })}
        </button>
      )}
    >
      <div className="space-y-3">
        <p className="text-xs font-bold text-on-surface-variant/65 leading-relaxed">{config.desc}</p>
        {items.length > 0 ? (
          items.slice(0, 8).map(item => (
            <div key={item.id} className="rounded-2xl bg-surface-container-low px-4 py-3">
              <p className="text-sm font-black text-on-surface">{item.title}</p>
              <p className="mt-1 text-[11px] font-bold text-on-surface-variant/55">{item.meta}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-surface-container-low px-4 py-6 text-center">
            <p className="text-sm font-black text-on-surface">{config.empty}</p>
          </div>
        )}
        {items.length > 8 && (
          <p className="text-center text-[11px] font-bold text-on-surface-variant/50">
            {t('ai_analysis.more_items_hint', { defaultValue: od('还有 {{count}} 项，进入页面查看完整内容', '{{count}} more items. Open the page to view all details.'), count: items.length - 8 })}
          </p>
        )}
      </div>
    </AppModal>
  );
}

function getStatusPanelConfig(
  activePanel: StatusPanelKey | null,
  t: ReturnType<typeof useTranslation>['t'],
  od: (zh: string, en: string) => string,
): { title: string; desc: string; empty: string; to: string } | null {
  if (activePanel === 'children') {
    return {
      title: t('ai_analysis.status_children', { defaultValue: od('孩子档案', 'Child profiles') }),
      desc: t('ai_analysis.status_children_desc', { defaultValue: od('这里先展示家庭里已建档的孩子，确认后再进入成员页面做详细编辑。', 'This shows children already added to the family. Open members for detailed edits.') }),
      empty: t('ai_analysis.status_children_empty_detail', { defaultValue: od('还没有孩子档案', 'No child profiles yet') }),
      to: '/profile',
    };
  }
  if (activePanel === 'pending') {
    return {
      title: t('ai_analysis.status_pending', { defaultValue: od('待执行', 'Pending') }),
      desc: t('ai_analysis.status_pending_desc', { defaultValue: od('这里先展示当前需要推进的任务和习惯，家长确认后再进入任务页处理。', 'This shows tasks and habits that need action now. Open Tasks to handle them.') }),
      empty: t('ai_analysis.status_pending_empty_detail', { defaultValue: od('当前没有待执行事项', 'No pending items now') }),
      to: '/tasks',
    };
  }
  if (activePanel === 'reviewing') {
    return {
      title: t('ai_analysis.status_reviewing', { defaultValue: od('待审核', 'Reviewing') }),
      desc: t('ai_analysis.status_reviewing_desc', { defaultValue: od('这里先展示孩子提交后等待家长确认的项目。', 'This shows child submissions waiting for parent confirmation.') }),
      empty: t('ai_analysis.status_reviewing_empty_detail', { defaultValue: od('当前没有待审核事项', 'No items waiting for review') }),
      to: '/tasks',
    };
  }
  if (activePanel === 'promises') {
    return {
      title: t('ai_analysis.status_promises', { defaultValue: od('兑现提醒', 'Fulfillment reminders') }),
      desc: t('ai_analysis.status_promises_desc', { defaultValue: od('这里先展示孩子心愿和父母承诺，避免兑换之后没有真正落地。', 'This shows wishes and parent promises so redeemed rewards are actually fulfilled.') }),
      empty: t('ai_analysis.status_promises_empty_detail', { defaultValue: od('当前没有待兑现提醒', 'No fulfillment reminders now') }),
      to: '/rewards',
    };
  }
  return null;
}

function formatShortDate(value: string, language = 'zh-CN'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return language.toLowerCase().startsWith('zh') ? '待安排时间' : 'Time TBD';
  return date.toLocaleDateString(language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
}

function StatusTile({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-ai-status-tile rounded-2xl bg-surface border border-outline-variant/10 p-3 shadow-sm min-w-0 text-left active:scale-[0.98] transition-all"
    >
      <p className="text-[10px] font-black text-on-surface-variant/45">{label}</p>
      <p className="text-base font-black text-on-surface mt-1 truncate flex items-center justify-between gap-1">
        <span className="truncate">{value}</span>
        <ChevronRight size={13} className="text-on-surface-variant/35 shrink-0" />
      </p>
    </button>
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

function isPlaceholderCommercialResource(match: ResourceMatchResult): boolean {
  return match.resource.id.startsWith('seed-') || match.resource.providerName.includes('精选');
}

function normalizeRecommendationDestination(destination: string): string {
  if (destination === '/school-calendar' || destination === '/schedule-recommend') {
    return '/plans/smart-recommend';
  }
  return destination;
}
