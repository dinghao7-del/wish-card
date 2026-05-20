import { describe, expect, it } from 'vitest';
import {
  buildScheduleOptimizationSkill,
  sanitizeScheduleRecommendationForStage,
  type ScheduleRecommendation,
} from '../lib/scheduleRecommendAI';

describe('智能日程优化阶段技能', () => {
  it('幼儿园中班画像不进入学科强化模型', () => {
    const skill = buildScheduleOptimizationSkill({
      gender: 'girl',
      age: 4,
      grade: '幼儿园中班',
      city: '上海',
      schoolType: '私立',
      strongSubjects: [],
      weakSubjects: [],
      existingInterests: [],
      existingSchedules: [],
      personality: [],
      personalityOther: '',
      homeworkDuration: null,
      freeTimePerDay: null,
      parentExpectation: [],
      expectationOther: '',
      budget: null,
      screenTime: '',
      healthNotes: '',
      otherNotes: '',
    });

    expect(skill.stage.key).toBe('preschool');
    expect(skill.academicStepTitle).toBe('发展重点与陪伴时间');
    expect(skill.strengthLabel).toBe('已经表现不错的方向');
    expect(skill.challengeLabel).toBe('希望慢慢加强的能力');
    expect(skill.homeworkLabel).toBe('每天适合安排多久亲子陪伴/游戏化练习？');
    expect(skill.freeTimeLabel).toBe('每天可用于户外、自由玩和亲子陪伴的时间？');
    expect(skill.subjectOptions).not.toEqual(expect.arrayContaining(['物理', '化学', '生物', '历史', '地理', '政治']));
    expect(skill.subjectOptions).toEqual(expect.arrayContaining(['语言表达', '生活自理', '同伴交往', '户外运动']));
    expect(skill.aiRules.join('\n')).toContain('禁止把幼儿园孩子包装成学科补习模型');
    expect(skill.sourceNotes.join('\n')).toContain('知乎/小红书');
    expect(skill.commercialRecommendationAngles).toEqual(expect.arrayContaining(['体能/感统', '绘本阅读', '亲子活动']));
  });

  it('小学低年级只问基础学习能力，不提前引入初高中学科', () => {
    const skill = buildScheduleOptimizationSkill({
      gender: 'boy',
      age: 7,
      grade: '一年级',
      city: '北京',
      schoolType: '公立',
      strongSubjects: ['物理'],
      weakSubjects: ['化学'],
      existingInterests: [],
      existingSchedules: [],
      personality: [],
      personalityOther: '',
      homeworkDuration: 40,
      freeTimePerDay: 2,
      parentExpectation: [],
      expectationOther: '',
      budget: null,
      screenTime: '',
      healthNotes: '',
      otherNotes: '',
    });

    expect(skill.stage.key).toBe('lower_primary');
    expect(skill.subjectOptions).toEqual(expect.arrayContaining(['阅读表达', '书写习惯', '计算基础', '英语听说']));
    expect(skill.subjectOptions).not.toEqual(expect.arrayContaining(['物理', '化学', '生物', '历史', '地理', '政治']));
    expect(skill.profile.strongSubjects).toEqual([]);
    expect(skill.profile.weakSubjects).toEqual([]);
  });

  it('过滤 AI 返回中不符合年龄阶段的学科建议', () => {
    const source: ScheduleRecommendation = {
      summary: '给幼儿园孩子做日程优化。',
      weekdaySchedule: [],
      weekendSchedule: [],
      recommendedActivities: [],
      avoidActivities: [],
      parentTips: [],
      subjectAdvice: [
        { subject: '物理', status: '强项', strategy: '提前学习力学', resources: ['物理启蒙课'] },
        { subject: '语言表达', status: '中等', strategy: '用亲子阅读和复述表达做练习', resources: ['绘本共读'] },
      ],
      developmentPath: [],
    };

    const filtered = sanitizeScheduleRecommendationForStage(source, {
      gender: 'girl',
      age: 4,
      grade: '幼儿园中班',
      city: '',
      schoolType: '',
      strongSubjects: [],
      weakSubjects: [],
      existingInterests: [],
      existingSchedules: [],
      personality: [],
      personalityOther: '',
      homeworkDuration: null,
      freeTimePerDay: null,
      parentExpectation: [],
      expectationOther: '',
      budget: null,
      screenTime: '',
      healthNotes: '',
      otherNotes: '',
    });

    expect(filtered.subjectAdvice.map(item => item.subject)).toEqual(['语言表达']);
  });
});
