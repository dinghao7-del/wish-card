import { beforeEach, describe, expect, it } from 'vitest';
import { buildSharedScheduleTemplateAsset, createSharedScheduleTemplateDraft, type StoredSharedScheduleTemplateDraft } from '../lib/communityShare';
import {
  buildCommunityShareSyncPreview,
  buildSharedScheduleTemplateCloudRow,
  cloudRowToStoredCommunityTemplate,
  getCommunityCloudTemplateCache,
  mergeCommunityCloudTemplateCache,
  saveCommunityCloudTemplateCache,
} from '../lib/communityShareSync';
import { STORAGE_KEYS } from '../lib/StorageAdapter';

function readyDraft(overrides: Partial<StoredSharedScheduleTemplateDraft> = {}): StoredSharedScheduleTemplateDraft {
  const draft = createSharedScheduleTemplateDraft({
    id: 'plan-local',
    title: '暑假阅读安排',
    scenario: 'summer_break',
    source: 'community',
    slots: [
      {
        id: 'slot-1',
        title: '英语阅读',
        startTime: '09:00',
        endTime: '09:30',
        category: 'study',
        childIds: ['child-1'],
        caregiverRequired: true,
      },
      {
        id: 'slot-2',
        title: '跳绳',
        startTime: '17:00',
        endTime: '17:20',
        category: 'exercise',
        childIds: ['child-1'],
        caregiverRequired: false,
      },
    ],
    parentTips: ['先按自家作息微调'],
    assumptions: ['适合假期'],
  }, {
    childAges: [9],
    grade: '四年级',
    city: '上海',
  });

  return {
    id: 'local-share-1',
    createdAt: '2026-05-13T00:00:00.000Z',
    updatedAt: '2026-05-13T01:00:00.000Z',
    status: 'ready_to_publish',
    draft,
    asset: buildSharedScheduleTemplateAsset(draft),
    consent: {
      privacyReviewed: true,
      communityUseAgreed: true,
      agreedAt: '2026-05-13T01:00:00.000Z',
      version: 'community_share_v1',
    },
    ...overrides,
  };
}

describe('community share cloud sync mapping', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEYS.COMMUNITY_CLOUD_TEMPLATE_CACHE);
  });

  it('maps ready and consented local drafts into cloud rows', () => {
    const row = buildSharedScheduleTemplateCloudRow(readyDraft(), {
      familyId: '11111111-1111-4111-8111-111111111111',
      authorMemberId: '22222222-2222-4222-8222-222222222222',
    });

    expect(row).toMatchObject({
      source_family_id: '11111111-1111-4111-8111-111111111111',
      author_member_id: '22222222-2222-4222-8222-222222222222',
      title: '暑假阅读安排',
      scenario: 'summer_break',
      grade_band: '小学中年级',
      city_level: '一线城市',
      visibility: 'public',
      moderation_status: 'pending',
    });
    expect(row?.id).toBeUndefined();
    expect(row?.content.asset).toMatchObject({
      qualityLevel: expect.any(String),
      slotCount: 2,
    });
    expect(JSON.stringify(row)).not.toContain('child-1');
  });

  it('blocks drafts without explicit privacy and community consent', () => {
    const draft = readyDraft({ consent: undefined });
    const row = buildSharedScheduleTemplateCloudRow(draft);
    const preview = buildCommunityShareSyncPreview([draft]);

    expect(row).toBeNull();
    expect(preview).toMatchObject({
      rowCount: 0,
      blockedCount: 1,
    });
    expect(preview.blockedDrafts[0].reasons.join('\n')).toContain('隐私检查');
  });

  it('blocks drafts with publishing quality blockers', () => {
    const draft = readyDraft();
    draft.asset = {
      ...draft.asset,
      publishBlockers: ['还没有可复用的日程时段'],
    };

    const preview = buildCommunityShareSyncPreview([draft]);

    expect(preview.rowCount).toBe(0);
    expect(preview.blockedDrafts[0].reasons).toContain('还没有可复用的日程时段');
  });

  it('maps approved cloud rows back into reusable local community templates', () => {
    const row = buildSharedScheduleTemplateCloudRow(readyDraft(), {
      familyId: '11111111-1111-4111-8111-111111111111',
      authorMemberId: '22222222-2222-4222-8222-222222222222',
    });
    const template = cloudRowToStoredCommunityTemplate({
      ...row!,
      id: '33333333-3333-4333-8333-333333333333',
      moderation_status: 'approved',
      usage_count: 12,
    });

    expect(template).toMatchObject({
      id: '33333333-3333-4333-8333-333333333333',
      status: 'ready_to_publish',
      draft: {
        title: '暑假阅读安排',
        scenario: 'summer_break',
        gradeBand: '小学中年级',
      },
      consent: {
        privacyReviewed: true,
        communityUseAgreed: true,
      },
    });
    expect(template.draft.content.slots[0]).not.toHaveProperty('childIds');
    expect(template.asset.profileSignal.commercialSignals[0].category).toBe('education');
  });

  it('sanitizes malformed cloud slot content before reuse', () => {
    const template = cloudRowToStoredCommunityTemplate({
      source_family_id: null,
      source_plan_id: null,
      author_member_id: null,
      title: '云端模板',
      scenario: 'unknown',
      age_range: null,
      grade_band: null,
      city_level: null,
      content: {
        slots: [{ title: '未知安排', category: 'bad-category' }],
      },
      tips: [],
      visibility: 'public',
      moderation_status: 'approved',
      usage_count: 0,
      created_at: '2026-05-13T00:00:00.000Z',
      updated_at: '2026-05-13T00:00:00.000Z',
    });

    expect(template.draft.scenario).toBe('custom');
    expect(template.draft.content.slots[0]).toMatchObject({
      title: '未知安排',
      startTime: '09:00',
      endTime: '09:30',
      category: 'other',
    });
  });

  it('stores approved cloud templates in a local offline cache', async () => {
    const row = buildSharedScheduleTemplateCloudRow(readyDraft())!;
    const template = cloudRowToStoredCommunityTemplate({
      ...row,
      id: '33333333-3333-4333-8333-333333333333',
      moderation_status: 'approved',
      usage_count: 4,
    });

    await saveCommunityCloudTemplateCache([template]);
    const cache = await getCommunityCloudTemplateCache();

    expect(cache.updatedAt).toBeTruthy();
    expect(cache.templates).toHaveLength(1);
    expect(cache.templates[0].draft.title).toBe('暑假阅读安排');
  });

  it('deduplicates cloud template cache when merging refreshed results', async () => {
    const row = buildSharedScheduleTemplateCloudRow(readyDraft())!;
    const template = cloudRowToStoredCommunityTemplate({
      ...row,
      id: '33333333-3333-4333-8333-333333333333',
      moderation_status: 'approved',
      usage_count: 4,
    });

    await saveCommunityCloudTemplateCache([template]);
    const cache = await mergeCommunityCloudTemplateCache([template]);

    expect(cache.templates).toHaveLength(1);
    expect(cache.templates[0].id).toBe('33333333-3333-4333-8333-333333333333');
  });
});
