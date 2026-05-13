import { beforeEach, describe, expect, it } from 'vitest';
import {
  adjustCommercialResourcePriority,
  buildCommercialResourceOpsInsights,
  buildCommercialResourcePerformanceRows,
  buildCommercialResourceUpsertRows,
  commercialResourceFromCloudRow,
  commercialResourceToCloudRow,
  getCommercialResourceCache,
  getSeedCommercialResources,
  inferHolidayPlayPreference,
  loadCommercialResources,
  matchCommercialResources,
  saveCommercialResourceDraft,
  scoreFeedback,
  setCommercialResourceCache,
  summarizeCommercialResourceManagement,
  toggleCommercialResourceActive,
  validateCommercialResource,
} from '../lib/recommendationInventory';
import type { RecommendationCandidate } from '../lib/recommendationGateway';
import type { RecommendationFunnelItem } from '../lib/recommendationEvents';
import { STORAGE_KEYS } from '../lib/StorageAdapter';

describe('recommendation inventory', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEYS.COMMERCIAL_RESOURCE_CACHE);
  });

  it('matches commercial resources from safe recommendation candidates', () => {
    const matches = matchCommercialResources([
      candidate({
        id: 'behavior-education-summer',
        category: 'education',
        priority: 'high',
        source: 'behavior_signal',
        safeContext: {
          source: 'behavior_signal',
          scenario: 'summer_break',
          familyStage: '小学中年级',
          cityLevel: '一线城市',
          categoryMix: ['study', 'english'],
        },
      }),
      candidate({
        id: 'behavior-travel-summer',
        category: 'travel',
        priority: 'medium',
        source: 'behavior_signal',
        safeContext: {
          source: 'behavior_signal',
          scenario: 'summer_break',
          familyStage: '小学中年级',
          cityLevel: '一线城市',
          categoryMix: ['travel', 'study'],
        },
      }),
    ]);

    expect(matches.map(item => item.resource.id)).toContain('seed-summer-camp');
    expect(matches[0].score).toBeGreaterThan(matches[matches.length - 1].score);
    expect(matches.map(item => item.reasons.join('\n')).join('\n')).toContain('暑假');
    expect(JSON.stringify(matches)).not.toContain('孩子姓名');
  });

  it('does not match resources when no same category signal exists', () => {
    const matches = matchCommercialResources([
      candidate({
        id: 'behavior-healthcare-medical',
        category: 'healthcare',
        priority: 'low',
        source: 'behavior_signal',
        safeContext: { source: 'behavior_signal', scenario: 'medical' },
      }),
    ]);

    expect(matches.map(item => item.resource.category)).toEqual(['healthcare']);
  });

  it('maps commercial resources to the future cloud row shape', () => {
    const resource = getSeedCommercialResources()[0];
    const row = commercialResourceToCloudRow(resource);
    const restored = commercialResourceFromCloudRow(row);

    expect(row).toMatchObject({
      id: resource.id,
      provider_name: resource.providerName,
      scenario_tags: resource.scenarioTags,
      active: true,
    });
    expect(restored).toMatchObject({
      id: resource.id,
      providerName: resource.providerName,
      scenarioTags: resource.scenarioTags,
    });
  });

  it('uses cached commercial resources before falling back to seed resources', async () => {
    const cached = {
      ...getSeedCommercialResources()[0],
      id: 'cached-resource',
      title: '缓存课程资源',
    };

    await setCommercialResourceCache([cached]);

    const cache = await getCommercialResourceCache();
    const loaded = await loadCommercialResources({ online: false });

    expect(cache.resources).toHaveLength(1);
    expect(loaded.map(item => item.id)).toEqual(['cached-resource']);
  });

  it('validates commercial resources before management save', async () => {
    const invalid = {
      ...getSeedCommercialResources()[0],
      id: '',
      title: '',
      priorityBoost: 200,
    };

    const validation = validateCommercialResource(invalid);

    expect(validation.valid).toBe(false);
    expect(validation.errors.join('\n')).toContain('资源 ID');
    expect(validation.errors.join('\n')).toContain('权重');
    await expect(saveCommercialResourceDraft(invalid)).rejects.toThrow('资源 ID');
  });

  it('saves, toggles and reprioritizes managed commercial resources locally', async () => {
    const resource = {
      ...getSeedCommercialResources()[0],
      id: 'managed-course',
      priorityBoost: 20,
      scenarioTags: ['school_day', 'school_day', ' weekend '],
    };

    await saveCommercialResourceDraft(resource);
    await adjustCommercialResourcePriority('managed-course', 95);
    await toggleCommercialResourceActive('managed-course', false);
    const cache = await getCommercialResourceCache();

    expect(cache.resources[0]).toMatchObject({
      id: 'managed-course',
      priorityBoost: 100,
      active: false,
      scenarioTags: ['school_day', 'weekend'],
    });

    const matches = matchCommercialResources([
      candidate({
        id: 'behavior-education',
        category: 'education',
        safeContext: { source: 'behavior_signal', scenario: 'school_day' },
      }),
    ], cache.resources);
    expect(matches.map(item => item.resource.id)).not.toContain('managed-course');
  });

  it('can edit seed resources before a local resource cache exists', async () => {
    const cache = await adjustCommercialResourcePriority('seed-english-reading', 7);
    expect(cache.resources.find(item => item.id === 'seed-english-reading')?.priorityBoost).toBe(25);

    const toggled = await toggleCommercialResourceActive('seed-english-reading', false);
    expect(toggled.resources.find(item => item.id === 'seed-english-reading')?.active).toBe(false);
    expect(toggled.resources.length).toBeGreaterThan(1);
  });

  it('summarizes resource management status and builds cloud upsert rows', () => {
    const resources = [
      getSeedCommercialResources()[0],
      { ...getSeedCommercialResources()[1], active: false },
      { ...getSeedCommercialResources()[2], title: '', id: 'broken-resource' },
    ];

    const summary = summarizeCommercialResourceManagement(resources);
    const rows = buildCommercialResourceUpsertRows(resources);

    expect(summary).toMatchObject({
      total: 3,
      active: 2,
      inactive: 1,
    });
    expect(summary.byCategory.education).toBe(2);
    expect(summary.needsReviewIds).toContain('broken-resource');
    expect(rows[0]).toHaveProperty('provider_name');
    expect(rows[1].active).toBe(false);
  });

  it('feeds conversion and dismiss performance back into resource ranking', () => {
    const baseCandidate = candidate({
      id: 'behavior-travel-weekend',
      category: 'travel',
      priority: 'medium',
      source: 'behavior_signal',
      safeContext: {
        source: 'behavior_signal',
        scenario: 'summer_break',
        familyStage: '小学中年级',
        cityLevel: '一线城市',
        categoryMix: ['travel'],
      },
    });
    const resources = getSeedCommercialResources().filter(resource => resource.category === 'travel');
    const baseline = matchCommercialResources([baseCandidate], resources, 2);
    const boosted = matchCommercialResources([baseCandidate], resources, 2, [
      funnel('seed-parent-child-trip', 'travel', { impressions: 2, clicks: 2, conversions: 1 }),
      funnel('seed-summer-camp', 'travel', { impressions: 2, dismisses: 3 }),
    ]);

    expect(baseline[0].resource.id).toBe('seed-summer-camp');
    expect(boosted[0].resource.id).toBe('seed-parent-child-trip');
    expect(boosted[0].reasons.join('\n')).toContain('近期转化表现好');
    expect(scoreFeedback(funnel('seed-summer-camp', 'travel', { dismisses: 3 }))).toBeLessThan(0);
  });

  it('builds operational performance rows for resource management', () => {
    const resources = getSeedCommercialResources();
    const rows = buildCommercialResourcePerformanceRows(resources, [
      funnel('seed-english-reading', 'education', { impressions: 4, clicks: 2, conversions: 1 }),
      funnel('seed-summer-camp', 'travel', { impressions: 3, dismisses: 3 }),
    ]);

    expect(rows.find(row => row.resource.id === 'seed-english-reading')).toMatchObject({
      health: 'strong',
      recommendedAction: 'boost',
      clicks: 2,
      conversions: 1,
    });
    expect(rows.find(row => row.resource.id === 'seed-summer-camp')).toMatchObject({
      health: 'weak',
      recommendedAction: 'lower',
      dismisses: 3,
    });
  });

  it('matches holiday play scale, caregiver time, budget and play mode', () => {
    const preference = inferHolidayPlayPreference({
      text: '家长比较忙，预算高一点，想要省心的大玩，主要就是纯玩度假',
    });
    const matches = matchCommercialResources([
      candidate({
        id: 'behavior-travel-big-play',
        category: 'travel',
        priority: 'medium',
        source: 'behavior_signal',
        safeContext: {
          source: 'behavior_signal',
          scenario: 'summer_break',
          categoryMix: ['travel', 'family'],
          holidayPlayScale: preference.scale,
          holidayPlayMode: preference.mode,
          caregiverLoad: preference.caregiverLoad,
          budgetLevel: preference.budgetLevel,
          effortLevel: preference.effortLevel,
        },
      }),
    ]);

    expect(preference).toMatchObject({
      scale: 'big_play',
      mode: 'pure_fun',
      caregiverLoad: 'low',
      budgetLevel: 'high',
      effortLevel: 'easy',
    });
    expect(matches[0].resource.id).toBe('seed-family-resort-week');
    expect(matches[0].reasons.join('\n')).toContain('大玩');
    expect(matches[0].reasons.join('\n')).toContain('更省心');
  });

  it('matches small science-oriented holiday play', () => {
    const preference = inferHolidayPlayPreference({
      text: '低预算，小玩半天，想去科学馆探索一下，家长可以陪',
    });
    const matches = matchCommercialResources([
      candidate({
        id: 'behavior-travel-science-small',
        category: 'travel',
        priority: 'medium',
        source: 'behavior_signal',
        safeContext: {
          source: 'behavior_signal',
          scenario: 'holiday',
          categoryMix: ['science', 'family'],
          holidayPlayScale: preference.scale,
          holidayPlayMode: preference.mode,
          caregiverLoad: preference.caregiverLoad,
          budgetLevel: preference.budgetLevel,
          effortLevel: preference.effortLevel,
        },
      }),
    ]);

    expect(preference.mode).toBe('science_fun');
    expect(matches[0].resource.id).toBe('seed-science-museum-day');
    expect(matches[0].reasons.join('\n')).toContain('科学');
  });

  it('builds operational insights for missing resources, tags and performance actions', () => {
    const resources = [
      {
        ...getSeedCommercialResources()[0],
        categoryTags: ['study'],
      },
      {
        ...getSeedCommercialResources()[1],
        active: false,
      },
    ];
    const insights = buildCommercialResourceOpsInsights([
      candidate({
        id: 'travel-big-play',
        category: 'travel',
        priority: 'high',
        safeContext: {
          source: 'family_behavior',
          scenario: 'summer_break',
          categoryMix: ['travel', 'family'],
          holidayPlayScale: 'big_play',
          holidayPlayMode: 'pure_fun',
        },
      }),
      candidate({
        id: 'education-art',
        category: 'education',
        priority: 'medium',
        safeContext: {
          source: 'family_behavior',
          scenario: 'school_day',
          categoryMix: ['art', 'music'],
        },
      }),
    ], resources, [
      funnel('seed-english-reading', 'education', { impressions: 3, clicks: 2, conversions: 1 }),
    ]);

    expect(insights).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'missing-category-travel',
        action: 'add_resource',
        severity: 'high',
      }),
      expect.objectContaining({
        id: 'missing-tags-education',
        action: 'add_tags',
        missingTags: expect.arrayContaining(['类别:art', '类别:music']),
      }),
      expect.objectContaining({
        id: 'boost-seed-english-reading',
        action: 'boost_resource',
      }),
    ]));
  });
});

function candidate(input: Partial<RecommendationCandidate> & Pick<RecommendationCandidate, 'id' | 'category'>): RecommendationCandidate {
  return {
    title: '测试推荐',
    reason: '测试原因',
    source: 'behavior_signal',
    priority: 'medium',
    actionLabel: '查看',
    destination: '/plans',
    safeContext: {},
    ...input,
  };
}

function funnel(
  itemId: string,
  category: RecommendationFunnelItem['category'],
  input: Partial<RecommendationFunnelItem>,
): RecommendationFunnelItem {
  const impressions = input.impressions || 0;
  const clicks = input.clicks || 0;
  const conversions = input.conversions || 0;
  return {
    itemId,
    category,
    impressions,
    clicks,
    dismisses: input.dismisses || 0,
    conversions,
    clickThroughRate: impressions > 0 ? clicks / impressions : 0,
    conversionRate: clicks > 0 ? conversions / clicks : 0,
    lastEventAt: '2026-05-14T00:00:00.000Z',
  };
}
