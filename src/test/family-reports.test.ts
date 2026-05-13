import { describe, expect, it } from 'vitest';
import { buildFamilyReportSummary } from '../domain/familyReports';

describe('家庭自动复盘报告', () => {
  it('按时间段自动汇总任务、好习惯、惩罚项和计划拆分', () => {
    const report = buildFamilyReportSummary(
      {
        type: 'week',
        start: '2026-05-11T00:00:00.000Z',
        end: '2026-05-17T23:59:59.999Z',
      },
      [
        {
          id: 'task-1',
          title: '完成数学作业',
          planId: 'plan-study',
          status: 'completed',
          rewardStars: 8,
          completedAt: '2026-05-12T10:00:00.000Z',
        },
        {
          id: 'habit-1',
          title: '练琴',
          planId: 'plan-violin',
          status: 'completed',
          rewardStars: 5,
          isHabit: true,
          completedAt: '2026-05-13T10:00:00.000Z',
        },
        {
          id: 'penalty-1',
          title: '拖延作业',
          planId: 'plan-study',
          status: 'completed',
          rewardStars: -3,
          isHabit: true,
          completedAt: '2026-05-14T10:00:00.000Z',
        },
        {
          id: 'promise-1',
          title: '兑现心愿：周末去科技馆',
          description: '心愿ID:reward-trip',
          planId: 'plan-family',
          status: 'completed',
          type: 'family_promise',
          rewardStars: 0,
          completedAt: '2026-05-15T10:00:00.000Z',
        },
        {
          id: 'old-task',
          title: '上周任务',
          status: 'completed',
          rewardStars: 2,
          completedAt: '2026-05-01T10:00:00.000Z',
        },
        {
          id: 'next-task',
          title: '准备下周英语演讲',
          planId: 'plan-study',
          status: 'pending',
          rewardStars: 10,
          deadline: '2026-05-19T10:00:00.000Z',
        },
        {
          id: 'next-promise',
          title: '兑现心愿：周末看电影',
          description: '心愿ID:reward-movie',
          status: 'pending',
          type: 'family_promise',
          rewardStars: 0,
          deadline: '2026-05-20T10:00:00.000Z',
        },
      ],
      [
        { id: 'plan-study', name: '学习计划', kind: 'goal' },
        { id: 'plan-violin', name: '小提琴练习', kind: 'cycle' },
        { id: 'plan-family', name: '家庭陪伴', kind: 'routine' },
      ],
      {
        nextPeriod: {
          type: 'week',
          start: '2026-05-18T00:00:00.000Z',
          end: '2026-05-24T23:59:59.999Z',
        },
      },
    );

    expect(report.completedTasks).toBe(1);
    expect(report.completedGoodHabits).toBe(1);
    expect(report.completedPenaltyHabits).toBe(1);
    expect(report.completedFamilyPromises).toBe(1);
    expect(report.earnedStars).toBe(13);
    expect(report.penaltyStars).toBe(3);
    expect(report.planBreakdown.find(item => item.planId === 'plan-study')).toMatchObject({
      planName: '学习计划',
      kind: 'goal',
      kindLabel: '目标型计划',
      completedTasks: 1,
      completedPenaltyHabits: 1,
      positiveActions: 1,
      reviewTone: 'milestone',
    });
    expect(report.planBreakdown.find(item => item.planId === 'plan-study')?.reviewMessage).toContain('里程碑');
    expect(report.planBreakdown.find(item => item.planId === 'plan-violin')).toMatchObject({
      kind: 'cycle',
      reviewTone: 'consistency',
    });
    expect(report.planBreakdown.find(item => item.planId === 'plan-violin')?.reviewMessage).toContain('坚持记录');
    expect(report.encouragement.headline).toContain('值得被看见的小进步');
    expect(report.encouragement.familyMessage).toContain('孩子兑换后的心愿被家长兑现');
    expect(report.encouragement.childMessage).toContain('13 颗星星');
    expect(report.familyWeekly.title).toContain('家庭成长复盘');
    expect(report.familyWeekly.childHighlights.join('\n')).toContain('好习惯');
    expect(report.familyWeekly.parentFocus.join('\n')).toContain('兑现');
    expect(report.familyWeekly.quadrantAdvice.urgentImportant).toBe(2);
    expect(report.familyWeekly.quadrantAdvice.message).toContain('重要事项');
    expect(report.nextPeriodPreview?.items).toContainEqual(expect.objectContaining({
      title: '准备下周英语演讲',
      planName: '学习计划',
      importance: 'important',
    }));
    expect(report.nextPeriodPreview?.items).toContainEqual(expect.objectContaining({
      title: '兑现心愿：周末看电影',
      importance: 'important',
    }));
  });
});
