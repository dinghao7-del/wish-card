import { describe, expect, it } from 'vitest';
import { createSharedScheduleTemplateDraft, buildSharedScheduleTemplateAsset, type StoredSharedScheduleTemplateDraft } from '../lib/communityShare';
import {
  buildAdaptationNotes,
  buildCommunityTemplateReusePreview,
  communityDraftToDailyScheduleTemplate,
  planningScenarioToSceneType,
} from '../lib/communityTemplateReuse';

describe('community template reuse', () => {
  it('converts shared schedule drafts into plan wizard schedules', () => {
    const draft = createSharedScheduleTemplateDraft({
      title: '孩子暑假作息',
      scenario: 'summer_break',
      source: 'community',
      slots: [
        {
          id: 'slot-1',
          title: '起床洗漱',
          startTime: '08:00',
          endTime: '08:20',
          category: 'life',
          childIds: ['child-1'],
          caregiverRequired: false,
        },
        {
          id: 'slot-2',
          title: '早餐',
          startTime: '08:20',
          endTime: '08:45',
          category: 'life',
          childIds: ['child-1'],
          caregiverRequired: false,
        },
        {
          id: 'slot-3',
          title: '英语阅读',
          startTime: '09:00',
          endTime: '09:40',
          category: 'study',
          childIds: ['child-1'],
          caregiverRequired: true,
        },
      ],
      parentTips: [],
      assumptions: [],
    }, {
      childAges: [8],
      grade: '三年级',
      city: '上海',
    });

    const schedule = communityDraftToDailyScheduleTemplate(draft);

    expect(schedule.wakeTime).toBe('08:00');
    expect(schedule.mealTimes.breakfast).toBe('08:20');
    expect(schedule.slots[2]).toMatchObject({
      label: '英语阅读',
      startTime: '09:00',
      endTime: '09:40',
      icon: '📚',
    });
  });

  it('builds adaptation notes before reusing a community template', () => {
    const draft = createSharedScheduleTemplateDraft({
      title: '周末安排',
      scenario: 'weekend',
      source: 'community',
      slots: [
        {
          id: 'slot-1',
          title: '亲子阅读',
          startTime: '20:00',
          endTime: '20:30',
          category: 'family',
          childIds: ['child-1'],
          caregiverRequired: true,
        },
      ],
      parentTips: [],
      assumptions: [],
    });
    const stored: StoredSharedScheduleTemplateDraft = {
      id: 'share-1',
      createdAt: '2026-05-13T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      status: 'ready_to_publish',
      draft,
      asset: buildSharedScheduleTemplateAsset(draft),
    };

    const preview = buildCommunityTemplateReusePreview(stored);
    const notes = buildAdaptationNotes(stored);

    expect(preview.scene).toBe('custom');
    expect(preview.title).toContain('复用');
    expect(notes.join('\n')).toContain('缺少年龄或学段标签');
    expect(notes.join('\n')).toContain('家长陪伴');
    expect(notes.join('\n')).toContain('不是完整全天模板');
  });

  it('maps planning scenarios into wizard scene types', () => {
    expect(planningScenarioToSceneType('school_day')).toBe('weekday');
    expect(planningScenarioToSceneType('summer_break')).toBe('holiday');
    expect(planningScenarioToSceneType('travel')).toBe('exchange');
    expect(planningScenarioToSceneType('medical')).toBe('custom');
  });
});
