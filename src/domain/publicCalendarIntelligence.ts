import type { Task } from '../types';

export type PublicCalendarSignalType =
  | 'national_holiday'
  | 'makeup_workday'
  | 'school_term'
  | 'school_break'
  | 'emergency'
  | 'public_event';

export type PublicCalendarSignalSeverity = 'info' | 'notice' | 'warning' | 'critical';

export interface PublicCalendarSignal {
  id: string;
  type: PublicCalendarSignalType;
  title: string;
  region: 'national' | string;
  startDate: string;
  endDate: string;
  severity: PublicCalendarSignalSeverity;
  sourceName: string;
  sourceUrl?: string;
  verifiedAt: string;
  affectsSchool?: boolean;
  affectsWork?: boolean;
  affectsTravel?: boolean;
  recommendationHint?: string;
}

export interface PublicCalendarAdjustment {
  id: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  affectedTaskIds: string[];
  signalIds: string[];
  action: 'switch_to_holiday_schedule' | 'reduce_load' | 'confirm_school_notice' | 'avoid_travel' | 'keep_watch';
}

export interface PublicCalendarIntelligenceSummary {
  headline: string;
  highestSeverity: PublicCalendarSignalSeverity;
  adjustments: PublicCalendarAdjustment[];
}

const SEVERITY_WEIGHT: Record<PublicCalendarSignalSeverity, number> = {
  info: 0,
  notice: 1,
  warning: 2,
  critical: 3,
};

export function buildPublicCalendarAdjustments(
  signals: PublicCalendarSignal[],
  tasks: Task[],
  options: {
    region?: string;
    rangeStart: string;
    rangeEnd: string;
  },
): PublicCalendarIntelligenceSummary {
  const activeSignals = signals.filter(signal =>
    signalAppliesToRegion(signal, options.region)
    && rangesOverlap(signal.startDate, signal.endDate, options.rangeStart, options.rangeEnd)
  );

  const adjustments: PublicCalendarAdjustment[] = [];
  const holidaySignals = activeSignals.filter(signal => signal.type === 'national_holiday' || signal.type === 'school_break');
  const makeupSignals = activeSignals.filter(signal => signal.type === 'makeup_workday');
  const schoolSignals = activeSignals.filter(signal => signal.type === 'school_term' || signal.affectsSchool);
  const emergencySignals = activeSignals.filter(signal => signal.type === 'emergency' || signal.severity === 'critical');
  const publicEventSignals = activeSignals.filter(signal => signal.type === 'public_event');

  if (holidaySignals.length > 0) {
    adjustments.push({
      id: 'holiday-schedule-shift',
      title: '切换到假期节奏',
      message: '检测到节假日或学校假期，建议减少晚间学习压力，增加户外、阅读、家务和亲子兑现安排。',
      priority: holidaySignals.some(signal => signal.severity === 'warning' || signal.severity === 'critical') ? 'high' : 'medium',
      affectedTaskIds: findTasksInSignals(tasks, holidaySignals),
      signalIds: holidaySignals.map(signal => signal.id),
      action: 'switch_to_holiday_schedule',
    });
  }

  if (makeupSignals.length > 0) {
    adjustments.push({
      id: 'makeup-workday-confirm',
      title: '确认调休上课/上班',
      message: '检测到调休工作日，建议把原本周末的游玩、长练习或家庭活动提前确认，避免和上课上班冲突。',
      priority: 'high',
      affectedTaskIds: findTasksInSignals(tasks, makeupSignals),
      signalIds: makeupSignals.map(signal => signal.id),
      action: 'confirm_school_notice',
    });
  }

  if (schoolSignals.length > 0) {
    adjustments.push({
      id: 'school-calendar-check',
      title: '核对学校通知',
      message: '检测到开学、放假或学校相关变化，建议家长核对班级通知后，再确认接送、作业、课外班和睡眠时间。',
      priority: schoolSignals.some(signal => signal.severity === 'warning' || signal.severity === 'critical') ? 'high' : 'medium',
      affectedTaskIds: findTasksInSignals(tasks, schoolSignals),
      signalIds: schoolSignals.map(signal => signal.id),
      action: 'confirm_school_notice',
    });
  }

  if (emergencySignals.length > 0) {
    adjustments.push({
      id: 'emergency-reduce-load',
      title: '突发事件优先减负',
      message: '检测到灾情、极端天气或重大公共事件，建议暂停非必要外出和低优先级任务，优先保障安全、接送和家庭沟通。',
      priority: 'high',
      affectedTaskIds: findTravelOrOutdoorTasks(tasks, emergencySignals),
      signalIds: emergencySignals.map(signal => signal.id),
      action: 'reduce_load',
    });
  }

  if (publicEventSignals.length > 0) {
    adjustments.push({
      id: 'public-event-watch',
      title: '关注公共事件影响',
      message: '检测到可能影响交通、场馆或线下活动的公共事件，建议出行和课程安排提前二次确认。',
      priority: 'medium',
      affectedTaskIds: findTravelOrOutdoorTasks(tasks, publicEventSignals),
      signalIds: publicEventSignals.map(signal => signal.id),
      action: 'keep_watch',
    });
  }

  const highestSeverity = activeSignals.reduce<PublicCalendarSignalSeverity>((highest, signal) =>
    SEVERITY_WEIGHT[signal.severity] > SEVERITY_WEIGHT[highest] ? signal.severity : highest
  , 'info');

  return {
    headline: buildHeadline(activeSignals, adjustments),
    highestSeverity,
    adjustments,
  };
}

function buildHeadline(signals: PublicCalendarSignal[], adjustments: PublicCalendarAdjustment[]): string {
  if (signals.length === 0) return '暂未发现会影响下周期安排的公共时间变化';
  if (adjustments.some(item => item.id === 'emergency-reduce-load')) return '有突发公共事件影响，建议先安全减负';
  if (adjustments.some(item => item.id === 'makeup-workday-confirm')) return '有调休安排，建议先核对上课上班时间';
  if (adjustments.some(item => item.id === 'holiday-schedule-shift')) return '有节假日或假期变化，建议切换家庭节奏';
  return '发现公共时间变化，建议提前确认日程';
}

function signalAppliesToRegion(signal: PublicCalendarSignal, region?: string): boolean {
  return signal.region === 'national' || !region || signal.region === region;
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();
  return Number.isFinite(aStart) && Number.isFinite(aEnd) && Number.isFinite(bStart) && Number.isFinite(bEnd)
    && aStart <= bEnd && bStart <= aEnd;
}

function findTasksInSignals(tasks: Task[], signals: PublicCalendarSignal[]): string[] {
  return tasks
    .filter(task => signals.some(signal => rangesOverlap(task.startTime, task.deadline || task.startTime, signal.startDate, signal.endDate)))
    .map(task => task.id);
}

function findTravelOrOutdoorTasks(tasks: Task[], signals: PublicCalendarSignal[]): string[] {
  const keywords = /出游|旅行|户外|公园|科技馆|博物馆|营地|夏令营|冬令营|课外班|接送|比赛|演出|医院|看病/;
  return tasks
    .filter(task => keywords.test(`${task.title} ${task.description} ${task.type}`))
    .filter(task => signals.some(signal => rangesOverlap(task.startTime, task.deadline || task.startTime, signal.startDate, signal.endDate)))
    .map(task => task.id);
}
