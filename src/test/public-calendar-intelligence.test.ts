import { describe, expect, it } from 'vitest';
import { buildPublicCalendarAdjustments, type PublicCalendarSignal } from '../domain/publicCalendarIntelligence';
import type { Task } from '../types';

const tasks: Task[] = [
  {
    id: 'travel-1',
    title: '周末去科技馆',
    description: '孩子兑换的亲子出游',
    type: 'family_promise',
    startTime: '2026-05-23T02:00:00.000Z',
    deadline: '2026-05-23T08:00:00.000Z',
    assigneeIds: ['parent-1'],
    creatorId: 'parent-1',
    rewardStars: 0,
    status: 'pending',
    icon: 'Gift',
  },
  {
    id: 'study-1',
    title: '阅读 30 分钟',
    description: '',
    type: 'study',
    startTime: '2026-05-22T11:00:00.000Z',
    assigneeIds: ['child-1'],
    creatorId: 'parent-1',
    rewardStars: 3,
    status: 'pending',
    icon: 'BookOpen',
  },
];

describe('公共时间情报调整建议', () => {
  it('遇到节假日或学校假期时建议切换家庭节奏', () => {
    const signals: PublicCalendarSignal[] = [
      {
        id: 'holiday-1',
        type: 'national_holiday',
        title: '端午节假期',
        region: 'national',
        startDate: '2026-05-22T00:00:00.000Z',
        endDate: '2026-05-24T23:59:59.999Z',
        severity: 'notice',
        sourceName: '国务院办公厅',
        verifiedAt: '2026-05-13T00:00:00.000Z',
        affectsSchool: true,
        affectsWork: true,
      },
    ];

    const summary = buildPublicCalendarAdjustments(signals, tasks, {
      rangeStart: '2026-05-18T00:00:00.000Z',
      rangeEnd: '2026-05-24T23:59:59.999Z',
    });

    expect(summary.headline).toContain('节假日');
    expect(summary.adjustments).toContainEqual(expect.objectContaining({
      id: 'holiday-schedule-shift',
      action: 'switch_to_holiday_schedule',
      affectedTaskIds: ['travel-1', 'study-1'],
    }));
  });

  it('遇到调休工作日时要求核对学校和父母工作安排', () => {
    const signals: PublicCalendarSignal[] = [
      {
        id: 'makeup-1',
        type: 'makeup_workday',
        title: '调休上班日',
        region: 'national',
        startDate: '2026-05-23T00:00:00.000Z',
        endDate: '2026-05-23T23:59:59.999Z',
        severity: 'warning',
        sourceName: '国务院办公厅',
        verifiedAt: '2026-05-13T00:00:00.000Z',
        affectsSchool: true,
        affectsWork: true,
      },
    ];

    const summary = buildPublicCalendarAdjustments(signals, tasks, {
      rangeStart: '2026-05-18T00:00:00.000Z',
      rangeEnd: '2026-05-24T23:59:59.999Z',
    });

    expect(summary.headline).toContain('调休');
    expect(summary.adjustments[0]).toMatchObject({
      id: 'makeup-workday-confirm',
      priority: 'high',
      action: 'confirm_school_notice',
    });
  });

  it('遇到突发事件时优先建议减负和取消非必要外出', () => {
    const signals: PublicCalendarSignal[] = [
      {
        id: 'emergency-1',
        type: 'emergency',
        title: '极端天气预警',
        region: '北京',
        startDate: '2026-05-23T00:00:00.000Z',
        endDate: '2026-05-23T23:59:59.999Z',
        severity: 'critical',
        sourceName: '应急管理部门',
        verifiedAt: '2026-05-13T00:00:00.000Z',
        affectsSchool: true,
        affectsTravel: true,
      },
    ];

    const summary = buildPublicCalendarAdjustments(signals, tasks, {
      region: '北京',
      rangeStart: '2026-05-18T00:00:00.000Z',
      rangeEnd: '2026-05-24T23:59:59.999Z',
    });

    expect(summary.highestSeverity).toBe('critical');
    expect(summary.adjustments).toContainEqual(expect.objectContaining({
      id: 'emergency-reduce-load',
      priority: 'high',
      affectedTaskIds: ['travel-1'],
    }));
  });
});
