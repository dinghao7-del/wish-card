import { beforeEach, describe, expect, it } from 'vitest';
import {
  RECOMMENDATION_CATEGORY_DEFINITIONS,
  buildRecommendationTransparencySummary,
  getRecommendationConsent,
  hasRecommendationConsent,
  saveRecommendationConsent,
} from '../lib/recommendationConsent';
import {
  buildRecommendationFeedbackState,
  getRecommendationEventCounts,
  getRecommendationBusinessSummary,
  getRecommendationFunnelItems,
  getRecommendationEventTypeCounts,
  getRecommendationEvents,
  recordRecommendationEvent,
  removeAllRecommendationEvents,
  sanitizeRecommendationEventContext,
} from '../lib/recommendationEvents';
import { STORAGE_KEYS } from '../lib/StorageAdapter';

describe('recommendation consent', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEYS.RECOMMENDATION_CONSENT);
    localStorage.removeItem(STORAGE_KEYS.RECOMMENDATION_EVENTS);
  });

  it('defaults commercial recommendation categories to on for the free business model', async () => {
    const consent = await getRecommendationConsent();

    expect(consent.categories.education).toBe(true);
    expect(consent.categories.travel).toBe(true);
    expect(consent.categories.healthcare).toBe(true);
  });

  it('stores category-level opt-in choices', async () => {
    const consent = await saveRecommendationConsent({
      education: true,
      travel: false,
      healthcare: true,
    });

    expect(consent.categories.education).toBe(true);
    expect(consent.categories.travel).toBe(false);
    expect(hasRecommendationConsent(consent, 'travel')).toBe(true);
    expect(consent.version).toBe('recommendation_consent_v1');
    expect(consent.updatedAt).toBeTruthy();
  });

  it('builds a transparent summary of enabled recommendation scopes', async () => {
    const consent = await saveRecommendationConsent({
      education: true,
      travel: false,
      healthcare: true,
    });
    const summary = buildRecommendationTransparencySummary(consent);

    expect(summary).toMatchObject({
      enabledCount: 2,
      totalCount: 3,
      enabledCategories: ['education', 'healthcare'],
      disabledCategories: ['travel'],
    });
    expect(summary.riskNotes.join('\n')).toContain('不能做诊断');
    expect(RECOMMENDATION_CATEGORY_DEFINITIONS.healthcare.requiresExtraCare).toBe(true);
  });

  it('records recommendation events by default while keeping context sanitized', async () => {
    const event = await recordRecommendationEvent({
      category: 'education',
      eventType: 'impression',
      itemId: 'course-1',
      context: { childName: '小明', source: 'schedule_recommend' },
    });

    const events = await getRecommendationEvents();
    expect(event?.category).toBe('education');
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events[0].context)).not.toContain('小明');
  });

  it('records recommendation events after category opt-in', async () => {
    await saveRecommendationConsent({
      education: true,
      travel: false,
      healthcare: false,
    });

    const event = await recordRecommendationEvent({
      category: 'education',
      eventType: 'click',
      itemId: 'course-1',
      context: { source: 'schedule_recommend' },
    });
    const events = await getRecommendationEvents();

    expect(event?.eventType).toBe('click');
    expect(events).toHaveLength(1);
    expect(events[0].consentVersion).toBe('recommendation_consent_v1');
  });

  it('keeps recommendation contexts coarse and removes private fields', async () => {
    const context = sanitizeRecommendationEventContext({
      source: 'community_template',
      scenario: 'summer_break',
      ageRange: '8岁',
      favoriteCount: 2,
      recentUseCount: 3,
      preferredScenario: 'summer_break',
      preferredSource: 'cloud',
      childName: '小明',
      schoolName: '某某学校',
      phone: '13812345678',
      address: '复兴路校区',
      categoryMix: ['study', 'interest', 'medical'],
      slotCount: 6,
      nested: { unsafe: true },
    });

    expect(context).toEqual({
      source: 'community_template',
      scenario: 'summer_break',
      ageRange: '8岁',
      favoriteCount: 2,
      recentUseCount: 3,
      preferredScenario: 'summer_break',
      preferredSource: 'cloud',
      categoryMix: ['study', 'interest', 'medical'],
      slotCount: 6,
    });
    expect(JSON.stringify(context)).not.toContain('小明');
    expect(JSON.stringify(context)).not.toContain('13812345678');
  });

  it('removes local events when a category consent is turned off', async () => {
    await saveRecommendationConsent({
      education: true,
      travel: true,
      healthcare: false,
    });
    await recordRecommendationEvent({ category: 'education', eventType: 'click', itemId: 'course-1' });
    await recordRecommendationEvent({ category: 'travel', eventType: 'click', itemId: 'camp-1' });

    await saveRecommendationConsent({
      education: false,
      travel: true,
      healthcare: false,
    });

    const events = await getRecommendationEvents();
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe('travel');
  });

  it('counts and clears local recommendation events', async () => {
    await saveRecommendationConsent({
      education: true,
      travel: true,
      healthcare: false,
    });
    await recordRecommendationEvent({ category: 'education', eventType: 'impression' });
    await recordRecommendationEvent({ category: 'education', eventType: 'click' });
    await recordRecommendationEvent({ category: 'travel', eventType: 'click' });

    const counts = await getRecommendationEventCounts();
    const typeCounts = await getRecommendationEventTypeCounts();
    const removedCount = await removeAllRecommendationEvents();

    expect(counts.education).toBe(2);
    expect(counts.travel).toBe(1);
    expect(typeCounts.impression).toBe(1);
    expect(typeCounts.click).toBe(2);
    expect(removedCount).toBe(3);
    expect(await getRecommendationEvents()).toHaveLength(0);
  });

  it('builds a commercial recommendation funnel by item', async () => {
    await recordRecommendationEvent({
      category: 'education',
      eventType: 'impression',
      itemId: 'course-1',
      context: { source: 'behavior_signal', resourceKind: 'course', matchScore: 88 },
    });
    await recordRecommendationEvent({
      category: 'education',
      eventType: 'click',
      itemId: 'course-1',
      context: { source: 'behavior_signal', resourceKind: 'course', matchScore: 88 },
    });
    await recordRecommendationEvent({
      category: 'education',
      eventType: 'conversion',
      itemId: 'course-1',
      context: { source: 'behavior_signal', resourceKind: 'course', matchScore: 88 },
    });
    await recordRecommendationEvent({
      category: 'travel',
      eventType: 'dismiss',
      itemId: 'camp-1',
      context: { source: 'behavior_signal', resourceKind: 'camp' },
    });

    const funnel = await getRecommendationFunnelItems();

    expect(funnel[0]).toMatchObject({
      itemId: 'course-1',
      category: 'education',
      impressions: 1,
      clicks: 1,
      conversions: 1,
      clickThroughRate: 1,
      conversionRate: 1,
    });
    expect(funnel.find(item => item.itemId === 'camp-1')?.dismisses).toBe(1);
  });

  it('summarizes commercial recommendation performance for operations', async () => {
    await recordRecommendationEvent({ category: 'education', eventType: 'impression', itemId: 'course-1' });
    await recordRecommendationEvent({ category: 'education', eventType: 'click', itemId: 'course-1' });
    await recordRecommendationEvent({ category: 'travel', eventType: 'impression', itemId: 'camp-1' });
    await recordRecommendationEvent({ category: 'travel', eventType: 'dismiss', itemId: 'camp-1' });

    const summary = await getRecommendationBusinessSummary();

    expect(summary.totals).toMatchObject({
      impression: 2,
      click: 1,
      dismiss: 1,
      conversion: 0,
    });
    expect(summary.categoryBreakdown.education.clickThroughRate).toBe(1);
    expect(summary.topItems[0].itemId).toBe('course-1');
    expect(summary.suggestions.join('\n')).toContain('资源');
  });

  it('builds user-facing feedback state from funnel events', async () => {
    await recordRecommendationEvent({ category: 'education', eventType: 'conversion', itemId: 'course-1' });
    await recordRecommendationEvent({ category: 'travel', eventType: 'impression', itemId: 'camp-1' });
    await recordRecommendationEvent({ category: 'travel', eventType: 'dismiss', itemId: 'camp-1' });
    await recordRecommendationEvent({ category: 'healthcare', eventType: 'dismiss', itemId: 'clinic-1' });
    await recordRecommendationEvent({ category: 'healthcare', eventType: 'click', itemId: 'clinic-1' });

    const state = buildRecommendationFeedbackState(await getRecommendationFunnelItems());

    expect(state.interestedItemIds).toContain('course-1');
    expect(state.dismissedItemIds).toContain('camp-1');
    expect(state.dismissedItemIds).not.toContain('clinic-1');
  });
});
