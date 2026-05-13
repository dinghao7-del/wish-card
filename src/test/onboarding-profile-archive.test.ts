import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildOnboardingScheduleSummary,
  buildFixedClassSetupSuggestions,
  buildOnboardingImportSummary,
  clearOnboardingProfileArchives,
  getOnboardingProfileArchives,
  saveOnboardingProfileArchive,
  suggestOnboardingTaskSchedule,
} from '../lib/onboardingProfileArchive';

describe('智能建档存档', () => {
  beforeEach(async () => {
    await clearOnboardingProfileArchives();
  });

  it('为家庭画像生成和日程安排相关的摘要', () => {
    const summary = buildOnboardingScheduleSummary({
      careStructure: 'one-parent-main',
      priorities: ['study', 'health'],
      hasHolidaySchedule: true,
      specialRequests: '希望先把放学后到睡前安排清楚',
      children: [{
        name: '大宝',
        age: 8,
        grade: '小学三年级',
        schoolTime: { start: '08:00', end: '16:00' },
        afterSchoolActivities: ['钢琴', '英语'],
        customActivities: ['空手道'],
        dailyPractices: ['阅读', '跳绳'],
        customPractices: ['口算', '练字'],
      }],
    });

    expect(summary).toMatchObject({
      childrenCount: 1,
      schoolWindowCount: 1,
      weeklyClassCount: 3,
      dailyPracticeCount: 4,
      holidayMode: true,
      focusLabels: ['学习习惯', '健康生活'],
    });
    expect(summary.riskHints.join('\n')).toContain('晚间安排');
    expect(summary.riskHints.join('\n')).toContain('日常练习项目较多');
  });

  it('把假期玩法偏好纳入建档摘要', () => {
    const summary = buildOnboardingScheduleSummary({
      hasHolidaySchedule: true,
      holidayPlayPreferenceText: '暑假家长比较忙，预算高一点，想省心大玩，主要纯玩度假',
      children: [{ name: '大宝', age: 8, grade: '小学三年级' }],
    });

    expect(summary.holidayPlayLabel).toContain('大玩');
    expect(summary.holidayPlayLabel).toContain('纯玩');
    expect(summary.holidayPlayLabel).toContain('预算高');
    expect(summary.holidayPlayLabel).toContain('省心');
    expect(summary.riskHints.join('\n')).toContain('假期玩法偏好');
  });

  it('保存最近 5 次建档记录，供二次微调', async () => {
    for (let index = 0; index < 6; index += 1) {
      await saveOnboardingProfileArchive({
        now: new Date(`2026-05-${10 + index}T10:00:00.000Z`),
        profile: {
          children: [{ name: `孩子${index}`, age: 8, grade: '小学三年级' }],
          priorities: ['study'],
        },
        recommendations: [{ id: `task-${index}` }],
        selectedIds: [`task-${index}`],
      });
    }

    const archives = await getOnboardingProfileArchives();
    expect(archives).toHaveLength(5);
    expect(archives[0].profile.children?.[0].name).toBe('孩子5');
    expect(archives[4].profile.children?.[0].name).toBe('孩子1');
    expect(archives[0].title).toContain('孩子5');
  });

  it('根据建档画像为导入任务推断初始日程时间', () => {
    const profile = {
      children: [{
        name: '大宝',
        age: 8,
        grade: '小学三年级',
        schoolTime: { start: '08:00', end: '16:00' },
      }],
    };

    const explicit = suggestOnboardingTaskSchedule(profile, {
      title: '阅读',
      type: 'daily',
      suggestedTime: '睡前',
      assigneeChildNames: ['大宝'],
    }, new Date('2026-05-13T08:00:00.000Z'));
    expect(explicit.startTime).toBe('2026-05-13T12:00:00.000Z');
    expect(explicit.note).toContain('睡前');

    const afterSchool = suggestOnboardingTaskSchedule(profile, {
      title: '口算',
      type: 'daily',
      assigneeChildNames: ['大宝'],
    }, new Date('2026-05-13T08:00:00.000Z'));
    expect(afterSchool.startTime).toBe('2026-05-13T09:00:00.000Z');
    expect(afterSchool.note).toContain('放学后');

    const weekly = suggestOnboardingTaskSchedule(profile, {
      title: '整理书桌',
      type: 'weekly',
    }, new Date('2026-05-13T08:00:00.000Z'));
    expect(weekly.startTime).toBe('2026-05-16T02:00:00.000Z');
    expect(weekly.deadline).toBe('2026-05-16T03:30:00.000Z');
  });

  it('把固定课外班转换成待补全的日程占位', () => {
    const suggestions = buildFixedClassSetupSuggestions({
      children: [{
        name: '大宝',
        age: 8,
        grade: '小学三年级',
        afterSchoolActivities: ['钢琴', '英语'],
        customActivities: ['钢琴', '空手道'],
        dailyPractices: ['阅读'],
      }],
    }, new Date('2026-05-13T08:00:00.000Z'));

    expect(suggestions.map(item => item.activityName)).toEqual(['钢琴', '英语', '空手道']);
    expect(suggestions[0]).toMatchObject({
      title: '确认大宝钢琴课时间',
      childName: '大宝',
    });
    expect(suggestions[0].description).toContain('每周固定课外班');
    expect(suggestions[0].description).toContain('冲突检查');
  });

  it('为建档导入生成计划级摘要和下一步提示', () => {
    const summary = buildOnboardingImportSummary({
      priorities: ['study'],
      children: [{
        name: '大宝',
        age: 8,
        grade: '小学三年级',
        afterSchoolActivities: ['钢琴', '英语'],
        dailyPractices: ['阅读'],
      }],
    }, [
      { type: 'daily' },
      { type: 'weekly' },
      { type: 'habit' },
    ]);

    expect(summary).toMatchObject({
      planName: '大宝AI建档方案',
      taskCount: 2,
      habitCount: 1,
      fixedClassSetupCount: 2,
      rewardCount: 3,
      focusLabels: ['学习习惯'],
    });
    expect(summary.nextStepHints.join('\n')).toContain('课外班');
    expect(summary.nextStepHints.join('\n')).toContain('计划页');
  });
});
