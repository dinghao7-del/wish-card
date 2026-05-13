import { getStorageAdapter, STORAGE_KEYS, storageGet, storageSet } from './StorageAdapter';
import type { StoredSharedScheduleTemplateDraft } from './communityShare';
import { recordRecommendationEvent } from './recommendationEvents';
import type { RecommendationCategory } from './recommendationConsent';

export interface CommunityTemplateUseRecord {
  templateId: string;
  title: string;
  source: 'local' | 'cloud';
  scenario: string;
  usedAt: string;
}

export interface CommunityTemplateLibraryState {
  favoriteTemplateIds: string[];
  recentUses: CommunityTemplateUseRecord[];
  updatedAt: string;
}

export interface CommunityTemplateLibraryInsight {
  preferredScenarios: Array<{ scenario: string; count: number }>;
  preferredSources: Array<{ source: CommunityTemplateUseRecord['source']; count: number }>;
  favoriteMatchedTemplates: StoredSharedScheduleTemplateDraft[];
  recommendedTemplates: StoredSharedScheduleTemplateDraft[];
  guidance: string;
}

export interface CommunityTemplateRecommendationSignal {
  category: RecommendationCategory;
  eventType: 'impression' | 'click';
  itemId: string;
  context: Record<string, unknown>;
}

const MAX_RECENT_USES = 30;

export async function getCommunityTemplateLibraryState(): Promise<CommunityTemplateLibraryState> {
  const stored = await storageGet<CommunityTemplateLibraryState | null>(
    getStorageAdapter(),
    STORAGE_KEYS.COMMUNITY_TEMPLATE_LIBRARY,
    null,
  );

  return {
    favoriteTemplateIds: stored?.favoriteTemplateIds || [],
    recentUses: stored?.recentUses || [],
    updatedAt: stored?.updatedAt || '',
  };
}

export async function setCommunityTemplateFavorite(
  templateId: string,
  favorite: boolean,
): Promise<CommunityTemplateLibraryState> {
  const state = await getCommunityTemplateLibraryState();
  const favoriteTemplateIds = favorite
    ? Array.from(new Set([templateId, ...state.favoriteTemplateIds]))
    : state.favoriteTemplateIds.filter(id => id !== templateId);

  return saveCommunityTemplateLibraryState({
    ...state,
    favoriteTemplateIds,
  });
}

export async function toggleCommunityTemplateFavorite(
  templateId: string,
): Promise<CommunityTemplateLibraryState> {
  const state = await getCommunityTemplateLibraryState();
  return setCommunityTemplateFavorite(templateId, !state.favoriteTemplateIds.includes(templateId));
}

export async function recordCommunityTemplateUse(
  template: StoredSharedScheduleTemplateDraft,
  source: CommunityTemplateUseRecord['source'],
): Promise<CommunityTemplateLibraryState> {
  const state = await getCommunityTemplateLibraryState();
  const nextRecord: CommunityTemplateUseRecord = {
    templateId: template.id,
    title: template.draft.title,
    source,
    scenario: template.draft.scenario,
    usedAt: new Date().toISOString(),
  };
  const recentUses = [
    nextRecord,
    ...state.recentUses.filter(item => item.templateId !== template.id),
  ].slice(0, MAX_RECENT_USES);

  return saveCommunityTemplateLibraryState({
    ...state,
    recentUses,
  });
}

export function summarizeCommunityTemplateLibrary(
  state: CommunityTemplateLibraryState,
): { favoriteCount: number; recentUseCount: number; lastUsedAt: string } {
  return {
    favoriteCount: state.favoriteTemplateIds.length,
    recentUseCount: state.recentUses.length,
    lastUsedAt: state.recentUses[0]?.usedAt || '',
  };
}

export function buildCommunityTemplateLibraryInsight(
  state: CommunityTemplateLibraryState,
  templates: StoredSharedScheduleTemplateDraft[],
): CommunityTemplateLibraryInsight {
  const preferredScenarios = countBy(state.recentUses.map(item => item.scenario));
  const preferredSources = countSources(state.recentUses.map(item => item.source));
  const favoriteIds = new Set(state.favoriteTemplateIds);
  const usedIds = new Set(state.recentUses.map(item => item.templateId));
  const favoriteMatchedTemplates = templates.filter(item => favoriteIds.has(item.id));
  const topScenario = preferredScenarios[0]?.scenario;
  const recommendedTemplates = templates
    .filter(item => !usedIds.has(item.id))
    .filter(item => !topScenario || item.draft.scenario === topScenario || favoriteIds.has(item.id))
    .sort((a, b) => {
      const favoriteScore = Number(favoriteIds.has(b.id)) - Number(favoriteIds.has(a.id));
      if (favoriteScore !== 0) return favoriteScore;
      return (b.asset?.qualityScore || 0) - (a.asset?.qualityScore || 0);
    })
    .slice(0, 4);

  return {
    preferredScenarios,
    preferredSources,
    favoriteMatchedTemplates,
    recommendedTemplates,
    guidance: buildLibraryGuidance(state, preferredScenarios, recommendedTemplates),
  };
}

export function buildCommunityTemplateRecommendationSignals(
  state: CommunityTemplateLibraryState,
  templates: StoredSharedScheduleTemplateDraft[],
): CommunityTemplateRecommendationSignal[] {
  const insight = buildCommunityTemplateLibraryInsight(state, templates);
  const preferredScenario = insight.preferredScenarios[0]?.scenario;
  const preferredSource = insight.preferredSources[0]?.source;
  const favoriteCount = state.favoriteTemplateIds.length;
  const recentUseCount = state.recentUses.length;
  const categoryCounts = templates.reduce<Record<RecommendationCategory, number>>((counts, template) => {
    if (!state.favoriteTemplateIds.includes(template.id) && !state.recentUses.some(use => use.templateId === template.id)) {
      return counts;
    }
    for (const signal of template.asset?.profileSignal?.commercialSignals || []) {
      counts[signal.category] += 1;
    }
    return counts;
  }, { education: 0, travel: 0, healthcare: 0 });

  return (Object.entries(categoryCounts) as Array<[RecommendationCategory, number]>)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({
      category,
      eventType: 'impression',
      itemId: `community-library-${category}`,
      context: {
        source: 'community_template_library',
        preferredScenario,
        preferredSource,
        favoriteCount,
        recentUseCount,
        recommendationReason: `community_template_${category}_${count}`,
      },
    }));
}

export async function recordCommunityTemplateRecommendationSignals(
  state: CommunityTemplateLibraryState,
  templates: StoredSharedScheduleTemplateDraft[],
  options: { familyId?: string; memberId?: string } = {},
): Promise<number> {
  const signals = buildCommunityTemplateRecommendationSignals(state, templates);
  const results = await Promise.all(signals.map(signal => recordRecommendationEvent({
    category: signal.category,
    eventType: signal.eventType,
    itemId: signal.itemId,
    familyId: options.familyId,
    memberId: options.memberId,
    context: signal.context,
  })));

  return results.filter(Boolean).length;
}

function buildLibraryGuidance(
  state: CommunityTemplateLibraryState,
  preferredScenarios: CommunityTemplateLibraryInsight['preferredScenarios'],
  recommendedTemplates: StoredSharedScheduleTemplateDraft[],
): string {
  if (state.favoriteTemplateIds.length === 0 && state.recentUses.length === 0) {
    return '可以先收藏或复用几份模板，系统会逐步记住你家更常用的场景。';
  }
  const topScenario = preferredScenarios[0]?.scenario;
  if (topScenario && recommendedTemplates.length > 0) {
    return `你最近更关注${scenarioLabel(topScenario)}，可以优先看相同场景下质量更高的模板。`;
  }
  if (state.favoriteTemplateIds.length > 0) {
    return '已收藏的模板会优先沉淀到家庭经验库，后续适合做相似模板推荐。';
  }
  return '复用记录已经保存，后续可以用来减少重复筛选。';
}

function countBy(values: string[]): Array<{ scenario: string; count: number }> {
  const map = values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
  return Object.entries(map)
    .map(([scenario, count]) => ({ scenario, count }))
    .sort((a, b) => b.count - a.count);
}

function countSources(values: CommunityTemplateUseRecord['source'][]): Array<{ source: CommunityTemplateUseRecord['source']; count: number }> {
  const map = values.reduce<Record<CommunityTemplateUseRecord['source'], number>>((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, { local: 0, cloud: 0 });
  return (Object.entries(map) as Array<[CommunityTemplateUseRecord['source'], number]>)
    .map(([source, count]) => ({ source, count }))
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

function scenarioLabel(scenario: string): string {
  const labels: Record<string, string> = {
    school_day: '上学日',
    weekend: '周末',
    holiday: '假期',
    winter_break: '寒假',
    summer_break: '暑假',
    travel: '旅行',
    medical: '就医',
    custom: '自定义',
  };
  return labels[scenario] || scenario;
}

async function saveCommunityTemplateLibraryState(
  state: CommunityTemplateLibraryState,
): Promise<CommunityTemplateLibraryState> {
  const next = {
    ...state,
    favoriteTemplateIds: Array.from(new Set(state.favoriteTemplateIds)),
    recentUses: state.recentUses.slice(0, MAX_RECENT_USES),
    updatedAt: new Date().toISOString(),
  };
  await storageSet(getStorageAdapter(), STORAGE_KEYS.COMMUNITY_TEMPLATE_LIBRARY, next);
  return next;
}
