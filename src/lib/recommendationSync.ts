import { supabase } from './supabase';
import {
  DEFAULT_RECOMMENDATION_CONSENT,
  type RecommendationCategory,
  type RecommendationConsentState,
} from './recommendationConsent';
import { getRecommendationEvents, type RecommendationEvent } from './recommendationEvents';

export interface RecommendationConsentCloudRow {
  family_id: string;
  consent_scope: RecommendationCategory;
  enabled: boolean;
  consent_version: RecommendationConsentState['version'];
  decided_by_member_id: string | null;
  decided_at: string;
  updated_at: string;
}

export interface RecommendationEventCloudRow {
  id: string;
  family_id: string | null;
  member_id: string | null;
  category: RecommendationCategory;
  item_id: string | null;
  event_type: RecommendationEvent['eventType'];
  context: Record<string, unknown>;
  created_at: string;
}

export function buildRecommendationConsentRows(
  familyId: string,
  consent: RecommendationConsentState,
  decidedByMemberId?: string,
): RecommendationConsentCloudRow[] {
  const decidedAt = consent.updatedAt || new Date().toISOString();
  return (Object.keys(DEFAULT_RECOMMENDATION_CONSENT.categories) as RecommendationCategory[]).map(category => ({
    family_id: familyId,
    consent_scope: category,
    enabled: Boolean(consent.categories[category]),
    consent_version: consent.version,
    decided_by_member_id: decidedByMemberId || null,
    decided_at: decidedAt,
    updated_at: decidedAt,
  }));
}

export function buildRecommendationEventRows(events: RecommendationEvent[]): RecommendationEventCloudRow[] {
  return events.map(event => ({
    id: event.id,
    family_id: event.familyId || null,
    member_id: event.memberId || null,
    category: event.category,
    item_id: event.itemId || null,
    event_type: event.eventType,
    context: {
      ...event.context,
      consentVersion: event.consentVersion,
    },
    created_at: event.createdAt,
  }));
}

export async function syncRecommendationPrivacyData(
  familyId: string,
  consent: RecommendationConsentState,
  decidedByMemberId?: string,
): Promise<{ consentRows: number; eventRows: number }> {
  const consentRows = buildRecommendationConsentRows(familyId, consent, decidedByMemberId);
  const events = await getRecommendationEvents();
  const eventRows = buildRecommendationEventRows(events);

  const consentResult = await supabase
    .from('recommendation_consents')
    .upsert(consentRows, { onConflict: 'family_id,consent_scope' });

  if (consentResult.error) {
    throw consentResult.error;
  }

  if (eventRows.length > 0) {
    const eventResult = await supabase
      .from('recommendation_events')
      .upsert(eventRows, { onConflict: 'id' });

    if (eventResult.error) {
      throw eventResult.error;
    }
  }

  return {
    consentRows: consentRows.length,
    eventRows: eventRows.length,
  };
}
