import { beforeEach, describe, expect, it } from 'vitest';
import { createSharedScheduleTemplateDraft, buildSharedScheduleTemplateAsset, type StoredSharedScheduleTemplateDraft } from '../lib/communityShare';
import {
  buildCommunityTemplateLibraryInsight,
  buildCommunityTemplateRecommendationSignals,
  getCommunityTemplateLibraryState,
  recordCommunityTemplateUse,
  summarizeCommunityTemplateLibrary,
  toggleCommunityTemplateFavorite,
} from '../lib/communityTemplateLibrary';
import { STORAGE_KEYS } from '../lib/StorageAdapter';

function template(id: string, title = '暑假阅读模板'): StoredSharedScheduleTemplateDraft {
  const draft = createSharedScheduleTemplateDraft({
    title,
    scenario: 'summer_break',
    source: 'community',
    slots: [
      {
        id: 'slot-1',
        title: '阅读',
        startTime: '09:00',
        endTime: '09:30',
        category: 'study',
        childIds: ['child-1'],
        caregiverRequired: false,
      },
    ],
    parentTips: [],
    assumptions: [],
  });

  return {
    id,
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T00:00:00.000Z',
    status: 'ready_to_publish',
    draft,
    asset: buildSharedScheduleTemplateAsset(draft),
  };
}

describe('community template library', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEYS.COMMUNITY_TEMPLATE_LIBRARY);
  });

  it('toggles favorite template ids locally', async () => {
    let state = await toggleCommunityTemplateFavorite('template-1');
    expect(state.favoriteTemplateIds).toEqual(['template-1']);

    state = await toggleCommunityTemplateFavorite('template-1');
    expect(state.favoriteTemplateIds).toEqual([]);
  });

  it('records recent template uses without duplicating the same template', async () => {
    await recordCommunityTemplateUse(template('template-1'), 'cloud');
    await recordCommunityTemplateUse(template('template-2', '周末作息模板'), 'local');
    const state = await recordCommunityTemplateUse(template('template-1'), 'cloud');

    expect(state.recentUses).toHaveLength(2);
    expect(state.recentUses[0]).toMatchObject({
      templateId: 'template-1',
      title: '暑假阅读模板',
      source: 'cloud',
      scenario: 'summer_break',
    });
  });

  it('summarizes favorite and recent use counts', async () => {
    await toggleCommunityTemplateFavorite('template-1');
    await recordCommunityTemplateUse(template('template-1'), 'cloud');

    const summary = summarizeCommunityTemplateLibrary(await getCommunityTemplateLibraryState());

    expect(summary.favoriteCount).toBe(1);
    expect(summary.recentUseCount).toBe(1);
    expect(summary.lastUsedAt).toBeTruthy();
  });

  it('builds personalized library insight from favorites and recent uses', async () => {
    const summer = template('template-1', '暑假阅读模板');
    const weekend = {
      ...template('template-2', '周末作息模板'),
      draft: {
        ...template('template-2', '周末作息模板').draft,
        scenario: 'weekend' as const,
      },
    };
    await toggleCommunityTemplateFavorite('template-2');
    await recordCommunityTemplateUse(summer, 'cloud');

    const insight = buildCommunityTemplateLibraryInsight(
      await getCommunityTemplateLibraryState(),
      [summer, weekend],
    );

    expect(insight.preferredScenarios[0]).toMatchObject({ scenario: 'summer_break', count: 1 });
    expect(insight.preferredSources[0]).toMatchObject({ source: 'cloud', count: 1 });
    expect(insight.favoriteMatchedTemplates.map(item => item.id)).toEqual(['template-2']);
    expect(insight.guidance).toContain('暑假');
  });

  it('builds coarse recommendation signals from community library preferences', async () => {
    const summer = template('template-1', '暑假阅读模板');
    await toggleCommunityTemplateFavorite('template-1');
    await recordCommunityTemplateUse(summer, 'cloud');

    const signals = buildCommunityTemplateRecommendationSignals(
      await getCommunityTemplateLibraryState(),
      [summer],
    );

    expect(signals.map(item => item.category)).toEqual(expect.arrayContaining(['education', 'travel']));
    expect(signals[0].context).toMatchObject({
      source: 'community_template_library',
      preferredScenario: 'summer_break',
      preferredSource: 'cloud',
      favoriteCount: 1,
      recentUseCount: 1,
    });
    expect(JSON.stringify(signals)).not.toContain('暑假阅读模板');
  });
});
