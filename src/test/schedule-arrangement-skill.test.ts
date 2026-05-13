import { describe, expect, it } from 'vitest';
import {
  analyzeScheduleArrangementImpact,
  buildFamilyTravelBlockTask,
  buildRecurringClassTask,
  cancelScheduleTasksOnce,
  completePendingScheduleArrangement,
  filterScheduleArrangementTasksByRefinement,
  findFixedClassSetupPlaceholder,
  pauseCategoryTasks,
  parseScheduleArrangementRefinement,
  recognizeIncompleteScheduleArrangement,
  recognizeScheduleArrangementSkill,
  rescheduleTasks,
  shiftScheduleTasks,
  upgradeFixedClassSetupPlaceholder,
} from '../lib/scheduleArrangementSkill';
import { recognizeIntent } from '../lib/voiceAssistant';
import type { AppContext } from '../lib/voiceAssistant';
import type { Task } from '../types';

const context: AppContext = {
  members: [
    { id: 'parent-1', name: '妈妈', role: 'parent', avatar: '', stars: 0 },
    { id: 'child-1', name: '孩子', role: 'child', avatar: '', stars: 0 },
  ],
  tasks: [],
  rewards: [],
  currentUser: { id: 'parent-1', name: '妈妈', role: 'parent', stars: 0 },
  familyId: 'family-1',
};

describe('语音日程安排 skill', () => {
  it('识别假期玩法偏好并结构化', async () => {
    const command = await recognizeIntent('暑假家长比较忙，预算高一点，想省心大玩，主要纯玩度假', context);

    expect(command).toMatchObject({
      intent: 'holiday_play_preference',
      params: {
        holidayPlayScale: 'big_play',
        holidayPlayMode: 'pure_fun',
        caregiverLoad: 'low',
        budgetLevel: 'high',
        effortLevel: 'easy',
      },
    });
  });

  it('识别新增固定课外班', async () => {
    const command = recognizeScheduleArrangementSkill('我刚刚给孩子报了新的空手道班，每周三下午6-7点上课');

    expect(command).toMatchObject({
      operation: 'add_recurring_class',
      params: {
        activityName: '空手道',
        weekday: 3,
        startTime: '18:00',
        endTime: '19:00',
      },
    });

    const task = buildRecurringClassTask(command!, {
      childIds: ['child-1'],
      creatorId: 'parent-1',
      now: new Date('2026-05-13T09:00:00.000Z'),
    });

    expect(task).toMatchObject({
      title: '空手道课',
      type: 'interest',
      frequency: 'weekly',
      assigneeIds: ['child-1'],
      memberProgress: { 'child-1': 'pending' },
    });
  });

  it('补全建档导入的固定课外班占位，而不是新建重复课程', () => {
    const command = recognizeScheduleArrangementSkill('钢琴课每周三下午6-7点');
    const placeholder: Task = {
      id: 'setup-piano-1',
      title: '确认大宝钢琴课时间',
      description: '钢琴属于每周固定课外班，先作为日程占位。请补充每周几、几点到几点、接送人和路程缓冲。',
      type: 'interest',
      frequency: 'weekly',
      startTime: '2026-05-13T12:30:00.000Z',
      deadline: '2026-05-13T12:50:00.000Z',
      assigneeIds: ['parent-1'],
      creatorId: 'parent-1',
      memberProgress: {
        'parent-1': 'pending',
        'child-1': 'pending',
      },
      rewardStars: 0,
      status: 'pending',
      icon: 'CalendarCheck',
    };

    expect(command).toMatchObject({
      operation: 'add_recurring_class',
      params: {
        activityName: '钢琴',
        weekday: 3,
        startTime: '18:00',
        endTime: '19:00',
      },
    });
    expect(findFixedClassSetupPlaceholder([placeholder], command!)).toBe(placeholder);

    const upgraded = upgradeFixedClassSetupPlaceholder(placeholder, command!, {
      creatorId: 'parent-1',
      now: new Date('2026-05-13T09:00:00.000Z'),
    });

    expect(upgraded).toMatchObject({
      id: 'setup-piano-1',
      title: '钢琴课',
      type: 'interest',
      frequency: 'weekly',
      assigneeIds: ['child-1'],
      memberProgress: { 'child-1': 'pending' },
      rewardStars: 5,
    });
    expect(upgraded.startTime).toBe('2026-05-13T10:00:00.000Z');
    expect(upgraded.deadline).toBe('2026-05-13T11:00:00.000Z');
    expect(upgraded.description).toContain('已补全为固定课外班');
  });

  it('识别旅行导致课外班整体顺延', async () => {
    const command = recognizeScheduleArrangementSkill('下周全家去美国玩，所有课外班日程向后顺移2周');
    const tasks: Task[] = [
      {
        id: 'karate-1',
        title: '空手道课',
        description: '',
        type: 'interest',
        frequency: 'weekly',
        startTime: '2026-05-20T10:00:00.000Z',
        deadline: '2026-05-20T11:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 5,
        status: 'pending',
        icon: 'CalendarCheck',
      },
      {
        id: 'homework-1',
        title: '数学作业',
        description: '',
        type: 'study',
        startTime: '2026-05-20T12:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 5,
        status: 'pending',
        icon: 'BookOpen',
      },
    ];

    expect(command).toMatchObject({
      operation: 'shift_schedule',
      params: {
        shiftWeeks: 2,
        scope: 'extracurricular',
        travelDestination: '美国',
        travelTiming: 'next_week',
      },
    });

    const shifted = shiftScheduleTasks(tasks, command!);
    const travelTask = buildFamilyTravelBlockTask(command!, {
      memberIds: ['parent-1', 'child-1'],
      creatorId: 'parent-1',
      now: new Date('2026-05-13T09:00:00.000Z'),
    });

    expect(shifted).toHaveLength(1);
    expect(shifted[0].id).toBe('karate-1');
    expect(shifted[0].startTime).toBe('2026-06-03T10:00:00.000Z');
    expect(shifted[0].description).toContain('顺延 2 周');
    expect(travelTask).toMatchObject({
      title: '全家去美国',
      type: 'family',
      frequency: 'once',
      assigneeIds: ['parent-1', 'child-1'],
      rewardStars: 0,
    });
    expect(new Date(travelTask!.startTime).getDay()).toBe(1);
  });

  it('可以在确认前用自然语言限定顺延范围', () => {
    const refinement = parseScheduleArrangementRefinement('只顺延钢琴和空手道，不动英语');
    const tasks: Task[] = [
      {
        id: 'piano-1',
        title: '钢琴课',
        description: '',
        type: 'interest',
        startTime: '2026-05-20T10:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 5,
        status: 'pending',
        icon: 'Music',
      },
      {
        id: 'karate-1',
        title: '空手道课',
        description: '',
        type: 'interest',
        startTime: '2026-05-20T11:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 5,
        status: 'pending',
        icon: 'CalendarCheck',
      },
      {
        id: 'english-1',
        title: '英语课',
        description: '',
        type: 'interest',
        startTime: '2026-05-20T12:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 5,
        status: 'pending',
        icon: 'BookOpen',
      },
    ];

    expect(refinement).toEqual({
      includeNames: ['空手道', '钢琴'],
      excludeNames: ['英语'],
    });
    expect(filterScheduleArrangementTasksByRefinement(tasks, refinement!).map(task => task.id).sort()).toEqual(['karate-1', 'piano-1']);
  });

  it('分析日程调整后的撞车和过载影响', () => {
    const originalTasks: Task[] = [
      {
        id: 'karate-1',
        title: '空手道课',
        description: '',
        type: 'interest',
        startTime: '2026-05-20T10:00:00.000Z',
        deadline: '2026-05-20T11:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 5,
        status: 'pending',
        icon: 'CalendarCheck',
      },
      {
        id: 'english-1',
        title: '英语课',
        description: '',
        type: 'interest',
        startTime: '2026-06-03T10:30:00.000Z',
        deadline: '2026-06-03T11:30:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 8,
        status: 'pending',
        icon: 'BookOpen',
      },
      ...Array.from({ length: 5 }, (_, index): Task => ({
        id: `load-${index}`,
        title: `当天任务 ${index}`,
        description: '',
        type: 'study',
        startTime: `2026-06-03T1${index}:00:00.000Z`,
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 6,
        status: 'pending',
        icon: 'BookOpen',
      })),
    ];
    const changedTasks: Task[] = [{
      ...originalTasks[0],
      startTime: '2026-06-03T10:00:00.000Z',
      deadline: '2026-06-03T11:00:00.000Z',
    }];

    const impact = analyzeScheduleArrangementImpact(originalTasks, changedTasks);

    expect(impact.conflictCount).toBeGreaterThanOrEqual(1);
    expect(impact.busyDayCount).toBe(1);
    expect(impact.requiresUserConfirmation).toBe(true);
    expect(impact.messages.join('\n')).toContain('撞车');
    expect(impact.recommendation).toContain('四象限');
  });

  it('没有冲突和过载时不要求二次确认', () => {
    const task: Task = {
      id: 'reading-1',
      title: '阅读',
      description: '',
      type: 'study',
      startTime: '2026-05-20T10:00:00.000Z',
      assigneeIds: ['child-1'],
      creatorId: 'parent-1',
      rewardStars: 3,
      status: 'pending',
      icon: 'BookOpen',
    };

    const impact = analyzeScheduleArrangementImpact([], [task]);

    expect(impact.requiresUserConfirmation).toBe(false);
    expect(impact.messages.join('\n')).toContain('比较稳');
  });

  it('日程调整落在调休或公共事件窗口时会提示二次确认', () => {
    const task: Task = {
      id: 'karate-1',
      title: '空手道课',
      description: '',
      type: 'interest',
      startTime: '2026-05-09T10:00:00.000Z',
      deadline: '2026-05-09T11:00:00.000Z',
      assigneeIds: ['child-1'],
      creatorId: 'parent-1',
      rewardStars: 5,
      status: 'pending',
      icon: 'CalendarCheck',
    };

    const impact = analyzeScheduleArrangementImpact([], [task], {
      publicCalendarSignals: [{
        id: 'makeup-2026-0509',
        type: 'makeup_workday',
        title: '劳动节调休上班日',
        region: 'national',
        startDate: '2026-05-09T00:00:00.000Z',
        endDate: '2026-05-09T23:59:59.999Z',
        severity: 'warning',
        sourceName: '国务院办公厅',
        verifiedAt: '2026-05-13T00:00:00.000Z',
        affectsSchool: true,
        affectsWork: true,
      }],
    });

    expect(impact.publicTimeWarningCount).toBeGreaterThanOrEqual(1);
    expect(impact.requiresUserConfirmation).toBe(true);
    expect(impact.messages.join('\n')).toContain('公共时间提醒');
    expect(impact.recommendation).toContain('公共时间');
  });

  it('语音意图优先走日程安排 skill', async () => {
    const command = await recognizeIntent('每周三下午6-7点加一个空手道班', context);

    expect(command.intent).toBe('schedule_arrangement');
    expect(command.needsConfirmation).toBe(true);
    expect(command.params.operation).toBe('add_recurring_class');
  });

  it('识别取消一次课外班', () => {
    const command = recognizeScheduleArrangementSkill('这周钢琴课请假，取消一次');
    const tasks: Task[] = [
      {
        id: 'piano-1',
        title: '钢琴课',
        description: '',
        type: 'interest',
        startTime: '2026-05-20T10:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 5,
        status: 'pending',
        icon: 'Music',
      },
    ];

    expect(command?.operation).toBe('cancel_once');
    const canceled = cancelScheduleTasksOnce(tasks, command!);
    expect(canceled[0]).toMatchObject({
      id: 'piano-1',
      status: 'expired',
    });
    expect(canceled[0].description).toContain('取消本次安排');
  });

  it('识别改课时间', () => {
    const command = recognizeScheduleArrangementSkill('把周五英语课改到周六上午9-10点');
    const tasks: Task[] = [
      {
        id: 'english-1',
        title: '英语课',
        description: '',
        type: 'interest',
        startTime: '2026-05-15T10:00:00.000Z',
        deadline: '2026-05-15T11:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 5,
        status: 'pending',
        icon: 'BookOpen',
      },
    ];

    expect(command).toMatchObject({
      operation: 'reschedule_task',
      params: {
        targetName: '英语',
        weekday: 6,
        startTime: '09:00',
        endTime: '10:00',
      },
    });
    const rescheduled = rescheduleTasks(tasks, command!);
    expect(new Date(rescheduled[0].startTime).getDay()).toBe(6);
    expect(rescheduled[0].description).toContain('已调整时间');
  });

  it('不完整改课指令会追问并可用下一句补全', () => {
    const pending = recognizeIncompleteScheduleArrangement('把英语课改一下');

    expect(pending).toMatchObject({
      operation: 'reschedule_task',
      params: { targetName: '英语' },
      missing: ['weekday', 'timeRange'],
    });
    expect(pending?.prompt).toContain('改到哪天几点');

    const completed = completePendingScheduleArrangement(pending!, '周六上午9-10点');
    expect(completed).toMatchObject({
      operation: 'reschedule_task',
      params: {
        targetName: '英语',
        weekday: 6,
        startTime: '09:00',
        endTime: '10:00',
      },
    });
  });

  it('不完整新增课程指令会追问课程时间并补全', () => {
    const pending = recognizeIncompleteScheduleArrangement('我给孩子报了空手道班');

    expect(pending).toMatchObject({
      operation: 'add_recurring_class',
      params: { activityName: '空手道' },
    });
    expect(pending?.prompt).toContain('每周几');

    const completed = completePendingScheduleArrangement(pending!, '每周三下午6-7点');
    expect(completed).toMatchObject({
      operation: 'add_recurring_class',
      params: {
        activityName: '空手道',
        weekday: 3,
        startTime: '18:00',
        endTime: '19:00',
      },
    });
  });

  it('识别考试前暂停娱乐类任务', () => {
    const command = recognizeScheduleArrangementSkill('考试前两周暂停所有娱乐类任务');
    const tasks: Task[] = [
      {
        id: 'game-1',
        title: '玩平板',
        description: '',
        type: 'entertainment',
        startTime: '2026-05-20T10:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 2,
        status: 'pending',
        icon: 'Gamepad2',
      },
      {
        id: 'study-1',
        title: '阅读',
        description: '',
        type: 'study',
        startTime: '2026-05-20T10:00:00.000Z',
        assigneeIds: ['child-1'],
        creatorId: 'parent-1',
        rewardStars: 5,
        status: 'pending',
        icon: 'BookOpen',
      },
    ];

    expect(command).toMatchObject({
      operation: 'pause_category',
      params: {
        category: 'entertainment',
        pauseWeeks: 2,
      },
    });
    const paused = pauseCategoryTasks(tasks, command!);
    expect(paused).toHaveLength(1);
    expect(paused[0].id).toBe('game-1');
    expect(paused[0].startTime).toBe('2026-06-03T10:00:00.000Z');
  });
});
