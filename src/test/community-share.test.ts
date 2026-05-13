import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSharedScheduleTemplateAsset,
  buildCommunityShareProfileSignal,
  createSharedScheduleTemplateDraft,
  filterCommunityShareDrafts,
  getCommunityShareDraft,
  saveCommunityShareDraft,
  getReadyCommunityShareDrafts,
  toAgeRange,
  toCityLevel,
  toGradeBand,
  updateCommunityShareDraft,
} from '../lib/communityShare';
import type { FamilySchedulePlan } from '../domain/familyPlanning';
import { STORAGE_KEYS } from '../lib/StorageAdapter';

describe('community schedule sharing sanitization', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEYS.COMMUNITY_SHARE_DRAFTS);
  });

  it('removes family identifiers and child IDs from shared schedule templates', () => {
    const plan: FamilySchedulePlan = {
      id: 'plan-1',
      familyId: 'family-1',
      title: '小明的上海暑假计划',
      scenario: 'summer_break',
      source: 'ai',
      summary: '适合小明在上海的暑期安排',
      slots: [
        {
          id: 'slot-1',
          title: '小明去复兴路校区上课',
          startTime: '09:00',
          endTime: '10:00',
          category: 'study',
          childIds: ['child-1'],
          caregiverRequired: false,
          description: '联系 13812345678，在某某学校门口集合',
          rewardStars: 5,
        },
      ],
      parentTips: ['小明午饭后休息'],
      assumptions: ['家庭住在复兴路附近'],
    };

    const draft = createSharedScheduleTemplateDraft(plan, {
      sourcePlanId: 'plan-1',
      memberNames: ['小明'],
      childAges: [8],
      grade: '三年级',
      city: '上海',
    });

    expect(draft.title).toBe('孩子的上海暑假计划');
    expect(draft.content.slots[0]).not.toHaveProperty('childIds');
    expect(JSON.stringify(draft)).not.toContain('child-1');
    expect(JSON.stringify(draft)).not.toContain('13812345678');
    expect(draft.gradeBand).toBe('小学中年级');
    expect(draft.cityLevel).toBe('一线城市');
    expect(draft.redactions).toContain('member_name');
    expect(draft.redactions).toContain('phone');
  });

  it('coarsens profile fields for public matching', () => {
    expect(toAgeRange([7, 9])).toBe('7-9岁');
    expect(toGradeBand('一年级上学期')).toBe('小学低年级');
    expect(toCityLevel('杭州')).toBe('新一线/强二线城市');
  });

  it('stores review drafts locally before publishing', async () => {
    const draft = createSharedScheduleTemplateDraft({
      id: 'plan-2',
      familyId: 'family-2',
      title: '暑假作息',
      scenario: 'summer_break',
      source: 'ai',
      slots: [],
      parentTips: [],
      assumptions: [],
    });

    const stored = await saveCommunityShareDraft(draft);
    const loaded = await getCommunityShareDraft(stored.id);
    const updated = await updateCommunityShareDraft(
      stored.id,
      { ...draft, title: '确认后的暑假作息' },
      'ready_to_publish',
      {
        privacyReviewed: true,
        communityUseAgreed: true,
        agreedAt: '2026-05-13T00:00:00.000Z',
        version: 'community_share_v1',
      },
    );

    expect(loaded?.draft.title).toBe('暑假作息');
    expect(loaded?.asset.tags).toContain('暑假');
    expect(updated?.status).toBe('ready_to_publish');
    expect(updated?.draft.title).toBe('确认后的暑假作息');
    expect(updated?.asset.reuseHint).toContain('复用前建议');
    expect(updated?.consent?.communityUseAgreed).toBe(true);
  });

  it('turns sanitized drafts into reusable template assets', () => {
    const draft = createSharedScheduleTemplateDraft({
      title: '孩子暑假作息',
      scenario: 'summer_break',
      source: 'ai',
      slots: [
        {
          id: 'slot-study',
          title: '阅读',
          startTime: '09:00',
          endTime: '09:30',
          category: 'study',
          childIds: ['child-1'],
          caregiverRequired: true,
        },
        {
          id: 'slot-exercise',
          title: '运动',
          startTime: '17:00',
          endTime: '17:40',
          category: 'exercise',
          childIds: ['child-1'],
          caregiverRequired: false,
          description: '联系 13812345678',
        },
      ],
      parentTips: [],
      assumptions: [],
    }, {
      childAges: [8],
      grade: '三年级',
    });

    const asset = buildSharedScheduleTemplateAsset(draft);

    expect(asset).toMatchObject({
      slotCount: 2,
      categoryMix: ['study', 'exercise'],
      privacyRiskLevel: 'medium',
    });
    expect(asset.qualityScore).toBeGreaterThan(50);
    expect(asset.profileSignal.commercialSignals[0]).toMatchObject({
      category: 'education',
      strength: 'strong',
    });
    expect(asset.tags).toEqual(expect.arrayContaining(['暑假', '8岁', '小学中年级', 'study', 'exercise']));
    expect(asset.reuseHint).toContain('暑假日程');
  });

  it('builds coarse profile signals for community search and consent based recommendations', () => {
    const draft = createSharedScheduleTemplateDraft({
      title: '寒假研学和复诊安排',
      scenario: 'winter_break',
      source: 'ai',
      slots: [
        {
          id: 'slot-1',
          title: '英语阅读',
          startTime: '09:00',
          endTime: '09:40',
          category: 'study',
          childIds: ['child-1'],
          caregiverRequired: true,
        },
        {
          id: 'slot-2',
          title: '复诊资料整理',
          startTime: '15:00',
          endTime: '15:30',
          category: 'medical',
          childIds: ['child-1'],
          caregiverRequired: true,
        },
      ],
      parentTips: ['假期可安排研学'],
      assumptions: [],
    }, {
      childAges: [10],
      grade: '五年级',
      city: '杭州',
    });

    const signal = buildCommunityShareProfileSignal(draft);

    expect(signal).toMatchObject({
      familyStage: '小学高年级',
      cityLevel: '新一线/强二线城市',
      caregiverRequiredSlots: 2,
      timeCoverage: 'lightweight',
    });
    expect(signal.commercialSignals.map(item => item.category)).toEqual(['education', 'travel', 'healthcare']);
  });

  it('separates ready templates from editing drafts', async () => {
    const draft = createSharedScheduleTemplateDraft({
      id: 'plan-3',
      title: '周末作息',
      scenario: 'weekend',
      source: 'manual',
      slots: [],
      parentTips: [],
      assumptions: [],
    });
    const stored = await saveCommunityShareDraft(draft);
    await updateCommunityShareDraft(stored.id, draft, 'ready_to_publish', {
      privacyReviewed: true,
      communityUseAgreed: true,
      agreedAt: '2026-05-13T00:00:00.000Z',
      version: 'community_share_v1',
    });

    const readyDrafts = await getReadyCommunityShareDrafts();
    expect(readyDrafts.every(item => item.status === 'ready_to_publish')).toBe(true);
    expect(readyDrafts.every(item => item.consent?.communityUseAgreed)).toBe(true);
  });

  it('filters and sorts community templates for reuse discovery', () => {
    const summerDraft = createSharedScheduleTemplateDraft({
      id: 'plan-summer',
      title: '暑假阅读和运动安排',
      scenario: 'summer_break',
      source: 'community',
      slots: [
        {
          id: 'slot-study',
          title: '英语阅读',
          startTime: '09:00',
          endTime: '09:40',
          category: 'study',
          childIds: ['child-1'],
          caregiverRequired: true,
        },
        {
          id: 'slot-exercise',
          title: '跳绳',
          startTime: '17:00',
          endTime: '17:20',
          category: 'exercise',
          childIds: ['child-1'],
          caregiverRequired: false,
        },
      ],
      parentTips: ['适合假期'],
      assumptions: [],
    }, {
      childAges: [9],
      grade: '四年级',
      city: '上海',
    });
    const weekendDraft = createSharedScheduleTemplateDraft({
      id: 'plan-weekend',
      title: '周末家务安排',
      scenario: 'weekend',
      source: 'community',
      slots: [
        {
          id: 'slot-life',
          title: '整理房间',
          startTime: '10:00',
          endTime: '10:30',
          category: 'life',
          childIds: ['child-2'],
          caregiverRequired: false,
        },
      ],
      parentTips: [],
      assumptions: [],
    });
    const stored = [
      {
        id: 'summer',
        createdAt: '2026-05-12T00:00:00.000Z',
        updatedAt: '2026-05-12T00:00:00.000Z',
        status: 'ready_to_publish' as const,
        draft: summerDraft,
        asset: buildSharedScheduleTemplateAsset(summerDraft),
      },
      {
        id: 'weekend',
        createdAt: '2026-05-13T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
        status: 'draft' as const,
        draft: weekendDraft,
        asset: buildSharedScheduleTemplateAsset(weekendDraft),
      },
    ];

    expect(filterCommunityShareDrafts(stored, { keyword: '阅读' }).map(item => item.id)).toEqual(['summer']);
    expect(filterCommunityShareDrafts(stored, { status: 'ready_to_publish' }).map(item => item.id)).toEqual(['summer']);
    expect(filterCommunityShareDrafts(stored, { recommendationCategory: 'education' }).map(item => item.id)).toEqual(['summer']);
    expect(filterCommunityShareDrafts(stored, { sortBy: 'updated_desc' }).map(item => item.id)).toEqual(['weekend', 'summer']);
  });
});
