import { describe, expect, it } from 'vitest';
import { buildCommunityShareProfileSignal, createSharedScheduleTemplateDraft } from '../lib/communityShare';
import {
  applyCommercialProfileToCandidates,
  buildCandidatesFromFamilyBehavior,
  buildCandidatesFromRecommendationEvents,
  buildCandidatesFromCommunitySignal,
  buildCommercialRecommendationProfile,
  buildDefaultRecommendationCandidates,
  buildRecommendationGateway,
  dedupeRecommendationCandidates,
} from '../lib/recommendationGateway';
import type { RecommendationCandidate } from '../lib/recommendationGateway';
import type { RecommendationEvent } from '../lib/recommendationEvents';
import type { Task } from '../types';

describe('recommendation gateway', () => {
  it('keeps candidates visible under the free recommendation business model', () => {
    const result = buildRecommendationGateway(buildDefaultRecommendationCandidates(), {
      version: 'recommendation_consent_v1',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: {
        education: true,
        travel: false,
        healthcare: false,
      },
    });

    expect(result.visible.map(item => item.category)).toEqual(['education', 'travel', 'healthcare']);
    expect(result.locked).toHaveLength(0);
    expect(result.headline).toContain('智能推荐');
    expect(result.safetyNotes.join('\n')).toContain('孩子姓名');
  });

  it('turns community profile signals into gated recommendation candidates', () => {
    const draft = createSharedScheduleTemplateDraft({
      title: '暑假学习和营地安排',
      scenario: 'summer_break',
      source: 'community',
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
      ],
      parentTips: ['可以考虑研学营地'],
      assumptions: [],
    }, {
      childAges: [9],
      grade: '四年级',
      city: '上海',
    });
    const signal = buildCommunityShareProfileSignal(draft);
    const candidates = buildCandidatesFromCommunitySignal(signal, 'share-1');

    expect(candidates.map(item => item.category)).toEqual(['education', 'travel']);
    expect(candidates[0].safeContext).toMatchObject({
      source: 'community_template',
      scenario: 'summer_break',
      familyStage: '小学中年级',
      cityLevel: '一线城市',
    });

    const result = buildRecommendationGateway(candidates, {
      version: 'recommendation_consent_v1',
      updatedAt: '',
      categories: {
        education: false,
        travel: true,
        healthcare: false,
      },
    });

    expect(result.visible.map(item => item.category)).toEqual(['education', 'travel']);
    expect(result.locked).toHaveLength(0);
  });

  it('aggregates behavior events into commercial recommendation candidates', () => {
    const events: RecommendationEvent[] = [
      event('education', 'impression', {
        source: 'community_template_library',
        preferredScenario: 'summer_break',
        favoriteCount: 2,
        recentUseCount: 1,
      }),
      event('education', 'click', {
        source: 'schedule_recommend',
        scenario: 'summer_break',
        slotCount: 4,
      }),
      event('travel', 'impression', {
        source: 'community_template',
        scenario: 'summer_break',
      }),
    ];

    const candidates = buildCandidatesFromRecommendationEvents(events);

    expect(candidates.map(item => item.category)).toEqual(['education', 'travel']);
    expect(candidates[0]).toMatchObject({
      category: 'education',
      priority: 'high',
      source: 'behavior_signal',
      safeContext: {
        source: 'behavior_signal',
        scenario: 'summer_break',
        favoriteCount: 2,
        recentUseCount: 1,
      },
    });
    expect(candidates[0].reason).toContain('2 条');
  });

  it('turns local family schedule into safe commercial behavior candidates', () => {
    const candidates = buildCandidatesFromFamilyBehavior({
      now: new Date('2026-05-14T00:00:00.000Z'),
      cityLevel: '一线城市',
      publicCalendarSignals: [
        {
          id: 'summer-break',
          type: 'school_break',
          title: '暑假',
          region: '北京',
          startDate: '2026-07-01T00:00:00.000+08:00',
          endDate: '2026-08-31T23:59:59.999+08:00',
          severity: 'notice',
          sourceName: '家庭手动校历',
          verifiedAt: '2026-05-14T00:00:00.000Z',
          affectsSchool: true,
          affectsTravel: true,
        },
      ],
      tasks: [
        task('t1', '英语阅读 30 分钟', 'study', '2026-05-15T10:00:00.000Z'),
        task('t2', '钢琴考级复习', 'interest', '2026-05-16T10:00:00.000Z'),
        task('t3', '暑假亲子旅行准备', 'family_promise', '2026-07-10T10:00:00.000Z'),
        task('t4', '儿童牙医复诊', 'health', '2026-05-18T10:00:00.000Z'),
      ],
    });

    expect(candidates.map(item => item.category)).toEqual(['education', 'travel', 'healthcare']);
    expect(candidates[0].safeContext).toMatchObject({
      source: 'family_behavior',
      cityLevel: '一线城市',
    });
    expect(JSON.stringify(candidates)).not.toContain('儿童牙医复诊');
    expect(candidates.find(item => item.category === 'education')?.safeContext).toMatchObject({
      scenario: 'school_day',
    });
    expect(candidates.find(item => item.category === 'travel')?.safeContext).toMatchObject({
      scenario: 'summer_break',
    });
  });

  it('dedupes display candidates by category while keeping the strongest signal', () => {
    const candidates = dedupeRecommendationCandidates([
      candidate({
        id: 'event-education',
        category: 'education',
        priority: 'high',
        source: 'behavior_signal',
        safeContext: { source: 'behavior_signal', slotCount: 2 },
      }),
      candidate({
        id: 'family-education',
        category: 'education',
        priority: 'high',
        source: 'family_behavior',
        safeContext: { source: 'family_behavior', slotCount: 8 },
      }),
      candidate({
        id: 'event-travel',
        category: 'travel',
        priority: 'medium',
        source: 'behavior_signal',
        safeContext: { source: 'behavior_signal', slotCount: 1 },
      }),
    ]);

    expect(candidates.map(item => item.id)).toEqual(['family-education', 'event-travel']);
  });

  it('builds a safe commercial profile and enriches resource matching context', () => {
    const events: RecommendationEvent[] = [
      event('travel', 'click', {
        scenario: 'summer_break',
        holidayPlayScale: 'big_play',
        holidayPlayMode: 'science_fun',
        caregiverLoad: 'low',
        budgetLevel: 'high',
        effortLevel: 'easy',
        source: 'holiday_preference',
      }),
    ];
    const profile = buildCommercialRecommendationProfile({
      now: new Date('2026-05-14T00:00:00.000Z'),
      cityLevel: '一线城市',
      events,
      publicCalendarSignals: [{
        id: 'summer-break',
        type: 'school_break',
        title: '暑假',
        region: '北京',
        startDate: '2026-07-01T00:00:00.000+08:00',
        endDate: '2026-08-31T23:59:59.999+08:00',
        severity: 'notice',
        sourceName: '家庭手动校历',
        verifiedAt: '2026-05-14T00:00:00.000Z',
        affectsSchool: true,
        affectsTravel: true,
      }],
      tasks: [
        task('t1', '暑假亲子研学营准备', 'family_promise', '2026-07-10T10:00:00.000Z'),
        task('t2', '钢琴考级复习', 'interest', '2026-05-16T10:00:00.000Z'),
      ],
    });
    const enriched = applyCommercialProfileToCandidates([
      candidate({
        id: 'travel-candidate',
        category: 'travel',
        priority: 'low',
        safeContext: { source: 'family_behavior' },
      }),
    ], profile);

    expect(profile).toMatchObject({
      dominantScenario: 'summer_break',
      cityLevel: '一线城市',
      holidayPlayScale: 'big_play',
      holidayPlayMode: 'science_fun',
      caregiverLoad: 'low',
      budgetLevel: 'high',
      effortLevel: 'easy',
      profileStrength: 'medium',
    });
    expect(enriched[0]).toMatchObject({
      priority: 'medium',
      safeContext: {
        scenario: 'summer_break',
        cityLevel: '一线城市',
        holidayPlayScale: 'big_play',
        holidayPlayMode: 'science_fun',
        profileStrength: 'medium',
      },
    });
    expect(JSON.stringify(profile)).not.toContain('钢琴考级复习');
  });
});

function event(
  category: RecommendationEvent['category'],
  eventType: RecommendationEvent['eventType'],
  context: RecommendationEvent['context'],
): RecommendationEvent {
  return {
    id: `${category}-${eventType}-${Math.random()}`,
    category,
    eventType,
    context,
    consentVersion: 'recommendation_consent_v1',
    createdAt: '2026-05-13T00:00:00.000Z',
  };
}

function task(id: string, title: string, type: string, startTime: string): Task {
  return {
    id,
    title,
    description: '',
    type,
    startTime,
    assigneeIds: ['child-1'],
    creatorId: 'parent-1',
    rewardStars: 3,
    status: 'pending',
    icon: 'Circle',
  };
}

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
