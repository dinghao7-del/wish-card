import { describe, expect, it } from 'vitest';
import {
  buildRecommendationConsentRows,
  buildRecommendationEventRows,
} from '../lib/recommendationSync';
import type { RecommendationEvent } from '../lib/recommendationEvents';

describe('recommendation cloud sync mapping', () => {
  it('maps category consent into one cloud row per recommendation scope', () => {
    const rows = buildRecommendationConsentRows('family-1', {
      version: 'recommendation_consent_v1',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: {
        education: true,
        travel: false,
        healthcare: true,
      },
    }, 'parent-1');

    expect(rows).toHaveLength(3);
    expect(rows.find(row => row.consent_scope === 'education')).toMatchObject({
      family_id: 'family-1',
      enabled: true,
      decided_by_member_id: 'parent-1',
    });
    expect(rows.find(row => row.consent_scope === 'travel')?.enabled).toBe(false);
  });

  it('maps local recommendation events into cloud event rows', () => {
    const events: RecommendationEvent[] = [
      {
        id: 'event-1',
        category: 'education',
        eventType: 'click',
        itemId: 'course-1',
        familyId: 'family-1',
        memberId: 'parent-1',
        consentVersion: 'recommendation_consent_v1',
        context: { source: 'schedule_recommend' },
        createdAt: '2026-05-13T00:00:00.000Z',
      },
    ];

    const rows = buildRecommendationEventRows(events);

    expect(rows[0]).toMatchObject({
      id: 'event-1',
      family_id: 'family-1',
      member_id: 'parent-1',
      category: 'education',
      event_type: 'click',
      item_id: 'course-1',
      created_at: '2026-05-13T00:00:00.000Z',
    });
    expect(rows[0].context.consentVersion).toBe('recommendation_consent_v1');
  });
});
