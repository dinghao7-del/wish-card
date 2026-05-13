import type { Task } from '../types';
import { buildPublicCalendarAdjustments, type PublicCalendarSignal } from '../domain/publicCalendarIntelligence';

export type ScheduleArrangementOperation =
  | 'add_recurring_class'
  | 'shift_schedule'
  | 'cancel_once'
  | 'reschedule_task'
  | 'pause_category';

export interface ScheduleArrangementCommand {
  operation: ScheduleArrangementOperation;
  confidence: number;
  summary: string;
  params: {
    activityName?: string;
    weekday?: number;
    startTime?: string;
    endTime?: string;
    frequency?: 'weekly';
    shiftWeeks?: number;
    scope?: 'extracurricular' | 'all';
    reason?: string;
    travelDestination?: string;
    travelTiming?: 'this_week' | 'next_week' | 'next_month' | 'unspecified';
    targetName?: string;
    category?: 'entertainment' | 'extracurricular' | 'study' | 'all';
    pauseWeeks?: number;
  };
}

export interface ScheduleArrangementImpact {
  changedCount: number;
  conflictCount: number;
  busyDayCount: number;
  importantChangedCount: number;
  publicTimeWarningCount: number;
  requiresUserConfirmation: boolean;
  messages: string[];
  recommendation: string;
}

export interface PendingScheduleArrangement {
  operation: 'add_recurring_class' | 'reschedule_task';
  originalInput: string;
  params: {
    activityName?: string;
    targetName?: string;
  };
  missing: Array<'activityName' | 'targetName' | 'weekday' | 'timeRange'>;
  prompt: string;
}

export interface ScheduleArrangementRefinement {
  includeNames: string[];
  excludeNames: string[];
}

const WEEKDAY_MAP: Array<[RegExp, number]> = [
  [/周一|星期一|礼拜一/, 1],
  [/周二|星期二|礼拜二/, 2],
  [/周三|星期三|礼拜三/, 3],
  [/周四|星期四|礼拜四/, 4],
  [/周五|星期五|礼拜五/, 5],
  [/周六|星期六|礼拜六/, 6],
  [/周日|周天|星期日|星期天|礼拜日|礼拜天/, 0],
];

const EXTRACURRICULAR_KEYWORDS = /课外班|兴趣班|培训班|空手道|跆拳道|钢琴|小提琴|舞蹈|画画|绘画|游泳|篮球|足球|英语班|编程|乐高|围棋|象棋|书法|合唱/;
const ENTERTAINMENT_KEYWORDS = /娱乐|游戏|电视|动画|玩手机|平板|游玩|看电影|乐园|玩具|自由玩|自由活动/;
const KNOWN_ACTIVITY_NAMES = ['空手道', '跆拳道', '钢琴', '小提琴', '舞蹈', '画画', '绘画', '游泳', '篮球', '足球', '英语', '英语班', '编程', '乐高', '围棋', '象棋', '书法', '合唱'];

export function recognizeScheduleArrangementSkill(input: string): ScheduleArrangementCommand | null {
  const text = input.trim();
  const pause = parsePauseCategory(text);
  if (pause) return pause;
  const reschedule = parseRescheduleTask(text);
  if (reschedule) return reschedule;
  const cancel = parseCancelOnce(text);
  if (cancel) return cancel;
  const shift = parseShiftSchedule(text);
  if (shift) return shift;
  const addClass = parseRecurringClass(text);
  if (addClass) return addClass;
  return null;
}

export function recognizeIncompleteScheduleArrangement(input: string): PendingScheduleArrangement | null {
  const text = input.trim();

  if (/(改一下|改时间|调整一下|换个时间|挪一下)/.test(text)) {
    const targetName = parseTargetName(text) || parseLooseTargetName(text);
    if (!targetName) {
      return {
        operation: 'reschedule_task',
        originalInput: text,
        params: {},
        missing: ['targetName', 'weekday', 'timeRange'],
        prompt: '你想调整哪一个日程？可以说“英语课，改到周六上午9-10点”。',
      };
    }
    return {
      operation: 'reschedule_task',
      originalInput: text,
      params: { targetName },
      missing: ['weekday', 'timeRange'],
      prompt: `${targetName}想改到哪天几点？例如“周六上午9-10点”。`,
    };
  }

  if (/(报了|报名|新增|添加|加一个|安排).{0,12}(课|班|课外班|兴趣班)/.test(text)) {
    const activityName = parseActivityName(text);
    const missing: PendingScheduleArrangement['missing'] = [];
    if (!activityName) missing.push('activityName');
    if (parseWeekday(text) === null) missing.push('weekday');
    if (!parseTimeRange(text)) missing.push('timeRange');
    if (missing.length === 0) return null;
    return {
      operation: 'add_recurring_class',
      originalInput: text,
      params: { activityName: activityName || undefined },
      missing,
      prompt: activityName
        ? `${activityName}课是每周几、几点到几点？例如“每周三下午6-7点”。`
        : '这是什么课程？每周几、几点到几点？例如“空手道，每周三下午6-7点”。',
    };
  }

  return null;
}

export function completePendingScheduleArrangement(
  pending: PendingScheduleArrangement,
  input: string,
): ScheduleArrangementCommand | null {
  const text = input.trim();
  if (pending.operation === 'reschedule_task') {
    const targetName = pending.params.targetName || parseLooseTargetName(text);
    if (!targetName) return null;
    return recognizeScheduleArrangementSkill(`把${targetName}改到${text}`);
  }
  const activityName = pending.params.activityName || parseActivityName(text) || parseLooseTargetName(text);
  if (!activityName) return null;
  return recognizeScheduleArrangementSkill(`新增${activityName}课 ${text}`);
}

export function cancelScheduleTasksOnce(
  tasks: Task[],
  command: ScheduleArrangementCommand,
): Task[] {
  const targetName = command.params.targetName || command.params.activityName || '';
  return tasks
    .filter(task => matchesTargetName(task, targetName))
    .slice(0, 1)
    .map(task => ({
      ...task,
      status: 'expired' as const,
      description: appendActionNote(task.description, `AI 语音助手已取消本次安排${command.params.reason ? `，原因：${command.params.reason}` : ''}`),
    }));
}

export function rescheduleTasks(
  tasks: Task[],
  command: ScheduleArrangementCommand,
): Task[] {
  const targetName = command.params.targetName || command.params.activityName || '';
  return tasks
    .filter(task => matchesTargetName(task, targetName))
    .slice(0, 1)
    .map(task => {
      const base = command.params.weekday !== undefined
        ? nextWeekdayDate(command.params.weekday, command.params.startTime || '09:00', new Date(task.startTime))
        : withTime(new Date(task.startTime), command.params.startTime || '09:00');
      const end = command.params.endTime ? withTime(base, command.params.endTime) : undefined;
      return {
        ...task,
        startTime: base.toISOString(),
        deadline: end?.toISOString() || task.deadline,
        description: appendActionNote(task.description, `AI 语音助手已调整时间：${command.summary}`),
      };
    });
}

export function pauseCategoryTasks(
  tasks: Task[],
  command: ScheduleArrangementCommand,
): Task[] {
  const weeks = command.params.pauseWeeks || 2;
  return tasks
    .filter(task => matchesPauseCategory(task, command.params.category || 'entertainment'))
    .map(task => ({
      ...task,
      startTime: shiftIsoDate(task.startTime, weeks * 7),
      deadline: task.deadline ? shiftIsoDate(task.deadline, weeks * 7) : task.deadline,
      description: appendActionNote(task.description, `AI 语音助手已暂停/后移 ${weeks} 周${command.params.reason ? `，原因：${command.params.reason}` : ''}`),
    }));
}

export function parseScheduleArrangementRefinement(input: string): ScheduleArrangementRefinement | null {
  const text = input.trim();
  if (!/(只|仅|就|不动|不改|不要|别动|除了)/.test(text)) return null;
  const negativeParts = text.split(/不动|不改|不要|别动|除了/);
  const includeSource = /只|仅|就/.test(text) ? negativeParts[0] : '';
  const excludeSource = negativeParts.length > 1 ? negativeParts.slice(1).join('，') : '';
  const includeNames = uniqueNames(extractActivityNames(includeSource));
  const excludeNames = uniqueNames(extractActivityNames(excludeSource));
  if (includeNames.length === 0 && excludeNames.length === 0) return null;
  return { includeNames, excludeNames };
}

export function filterScheduleArrangementTasksByRefinement(
  tasks: Task[],
  refinement: ScheduleArrangementRefinement,
): Task[] {
  return tasks.filter(task => {
    const text = `${task.title} ${task.description || ''}`;
    const included = refinement.includeNames.length === 0
      || refinement.includeNames.some(name => text.includes(name));
    const excluded = refinement.excludeNames.some(name => text.includes(name));
    return included && !excluded;
  });
}

export function buildRecurringClassTask(
  command: ScheduleArrangementCommand,
  options: {
    childIds: string[];
    creatorId: string;
    now?: Date;
  },
): Task {
  const now = options.now || new Date();
  const start = nextWeekdayDate(command.params.weekday ?? now.getDay(), command.params.startTime || '18:00', now);
  const end = withTime(start, command.params.endTime || command.params.startTime || '19:00');
  const activityName = command.params.activityName || '课外班';

  return {
    id: `schedule-class-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: `${activityName}课`,
    description: `AI 语音助手添加的固定课外班：每周${weekdayLabel(command.params.weekday ?? start.getDay())} ${command.params.startTime || '18:00'}-${command.params.endTime || '19:00'}`,
    type: 'interest',
    frequency: 'weekly',
    startTime: start.toISOString(),
    deadline: end.toISOString(),
    assigneeIds: options.childIds,
    creatorId: options.creatorId,
    memberProgress: options.childIds.reduce<Record<string, Task['status']>>((progress, id) => {
      progress[id] = 'pending';
      return progress;
    }, {}),
    rewardStars: 5,
    status: 'pending',
    icon: 'CalendarCheck',
  };
}

export function buildFamilyTravelBlockTask(
  command: ScheduleArrangementCommand,
  options: {
    memberIds: string[];
    creatorId: string;
    now?: Date;
  },
): Task | null {
  const destination = command.params.travelDestination;
  const reason = command.params.reason || '';
  if (!destination && !/旅行|旅游|出国|全家|去.+玩/.test(reason)) return null;

  const now = options.now || new Date();
  const start = inferTravelStartDate(command.params.travelTiming || 'unspecified', now);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(22, 0, 0, 0);
  const title = destination ? `全家去${destination}` : '全家外出安排';

  return {
    id: `schedule-travel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    description: `AI 语音助手根据“${command.summary}”生成的家庭外出日程锚点。相关课外班顺延后，周报和冲突检查会把这段时间一起考虑。`,
    type: 'family',
    frequency: 'once',
    startTime: start.toISOString(),
    deadline: end.toISOString(),
    assigneeIds: options.memberIds,
    creatorId: options.creatorId,
    memberProgress: options.memberIds.reduce<Record<string, Task['status']>>((progress, id) => {
      progress[id] = 'pending';
      return progress;
    }, {}),
    rewardStars: 0,
    status: 'pending',
    icon: 'MapPin',
  };
}

export function findFixedClassSetupPlaceholder(
  tasks: Task[],
  command: ScheduleArrangementCommand,
): Task | null {
  const activityName = command.params.activityName || command.params.targetName || '';
  if (!activityName) return null;
  return tasks.find(task => isFixedClassSetupPlaceholder(task, activityName)) || null;
}

export function upgradeFixedClassSetupPlaceholder(
  placeholder: Task,
  command: ScheduleArrangementCommand,
  options: {
    creatorId: string;
    now?: Date;
  },
): Task {
  const now = options.now || new Date();
  const activityName = command.params.activityName || command.params.targetName || '课外班';
  const start = nextWeekdayDate(command.params.weekday ?? now.getDay(), command.params.startTime || '18:00', now);
  const end = withTime(start, command.params.endTime || command.params.startTime || '19:00');
  const inferredChildIds = Object.keys(placeholder.memberProgress || {})
    .filter(id => id !== options.creatorId);
  const assigneeIds = inferredChildIds.length > 0
    ? inferredChildIds
    : placeholder.assigneeIds.filter(id => id !== options.creatorId);
  const finalAssigneeIds = assigneeIds.length > 0 ? assigneeIds : placeholder.assigneeIds;

  return {
    ...placeholder,
    title: `${activityName}课`,
    description: appendActionNote(
      placeholder.description,
      `已补全为固定课外班：每周${weekdayLabel(command.params.weekday ?? start.getDay())} ${command.params.startTime || '18:00'}-${command.params.endTime || '19:00'}。后续会参与冲突检查、顺延和复盘。`,
    ),
    type: 'interest',
    frequency: 'weekly',
    startTime: start.toISOString(),
    deadline: end.toISOString(),
    assigneeIds: finalAssigneeIds,
    creatorId: placeholder.creatorId || options.creatorId,
    memberProgress: finalAssigneeIds.reduce<Record<string, Task['status']>>((progress, id) => {
      progress[id] = 'pending';
      return progress;
    }, {}),
    rewardStars: placeholder.rewardStars || 5,
    status: 'pending',
    icon: 'CalendarCheck',
  };
}

export function shiftScheduleTasks(
  tasks: Task[],
  command: ScheduleArrangementCommand,
): Task[] {
  const weeks = command.params.shiftWeeks || 0;
  if (weeks <= 0) return tasks;
  const days = weeks * 7;
  return tasks
    .filter(task => matchesShiftScope(task, command.params.scope || 'extracurricular'))
    .map(task => ({
      ...task,
      startTime: shiftIsoDate(task.startTime, days),
      deadline: task.deadline ? shiftIsoDate(task.deadline, days) : task.deadline,
      description: appendShiftNote(task.description, weeks, command.params.reason),
    }));
}

export function matchesShiftScope(task: Pick<Task, 'title' | 'description' | 'type' | 'isHabit'>, scope: 'extracurricular' | 'all'): boolean {
  if (scope === 'all') return true;
  const text = `${task.title} ${task.description || ''} ${task.type || ''}`;
  return task.type === 'interest' || EXTRACURRICULAR_KEYWORDS.test(text);
}

export function analyzeScheduleArrangementImpact(
  originalTasks: Task[],
  changedTasks: Task[],
  options: {
    publicCalendarSignals?: PublicCalendarSignal[];
    region?: string;
  } = {},
): ScheduleArrangementImpact {
  const changedIds = new Set(changedTasks.map(task => task.id));
  const mergedTasks = originalTasks.map(task => changedIds.has(task.id) ? changedTasks.find(changed => changed.id === task.id)! : task);
  const conflicts = findTimeConflicts(changedTasks, mergedTasks);
  const busyDays = findBusyDays(changedTasks, mergedTasks);
  const importantChangedCount = changedTasks.filter(task => task.rewardStars >= 8 || /兑现心愿|心愿ID|考试|考级/.test(`${task.title} ${task.description || ''}`)).length;
  const publicCalendar = buildChangedTaskPublicCalendarSummary(changedTasks, options.publicCalendarSignals || [], options.region);
  const messages: string[] = [];

  if (conflicts.length > 0) {
    messages.push(`发现 ${conflicts.length} 个可能撞车的时间段，建议打开四象限再做一次取舍。`);
  }
  if (busyDays.length > 0) {
    messages.push(`${busyDays.length} 天安排偏满，建议给孩子保留休息和路上缓冲。`);
  }
  if (importantChangedCount > 0) {
    messages.push(`其中 ${importantChangedCount} 个是高价值或家庭承诺相关事项，建议家长再确认一次。`);
  }
  if (publicCalendar.adjustments.length > 0) {
    messages.push(`公共时间提醒：${publicCalendar.headline}。${publicCalendar.adjustments[0].message}`);
  }
  if (messages.length === 0) {
    messages.push('暂未发现明显撞车或过载，调整后节奏看起来比较稳。');
  }

  const hasPublicRisk = publicCalendar.adjustments.some(item => item.priority === 'high')
    || publicCalendar.highestSeverity === 'warning'
    || publicCalendar.highestSeverity === 'critical';

  return {
    changedCount: changedTasks.length,
    conflictCount: conflicts.length,
    busyDayCount: busyDays.length,
    importantChangedCount,
    publicTimeWarningCount: publicCalendar.adjustments.length,
    requiresUserConfirmation: conflicts.length > 0 || busyDays.length > 0 || importantChangedCount > 0 || hasPublicRisk,
    messages,
    recommendation: hasPublicRisk
      ? '建议先核对公共时间变化，再执行这次调整。'
      : conflicts.length > 0 || busyDays.length > 0
      ? '建议调整后打开本周四象限，先保住重要事项。'
      : '可以直接执行，并在周报里观察孩子适应情况。',
  };
}

function buildChangedTaskPublicCalendarSummary(
  changedTasks: Task[],
  signals: PublicCalendarSignal[],
  region?: string,
) {
  const ranges = changedTasks.map(task => taskRange(task)).filter(Boolean) as Array<{ start: number; end: number }>;
  if (signals.length === 0 || ranges.length === 0) {
    return buildPublicCalendarAdjustments([], changedTasks, {
      region,
      rangeStart: new Date().toISOString(),
      rangeEnd: new Date().toISOString(),
    });
  }

  const minStart = Math.min(...ranges.map(range => range.start));
  const maxEnd = Math.max(...ranges.map(range => range.end));
  return buildPublicCalendarAdjustments(signals, changedTasks, {
    region,
    rangeStart: new Date(minStart).toISOString(),
    rangeEnd: new Date(maxEnd).toISOString(),
  });
}

function findTimeConflicts(changedTasks: Task[], allTasks: Task[]): Array<{ changedId: string; conflictId: string }> {
  const conflicts: Array<{ changedId: string; conflictId: string }> = [];
  for (const changed of changedTasks) {
    const changedRange = taskRange(changed);
    if (!changedRange) continue;
    for (const other of allTasks) {
      if (other.id === changed.id || other.status === 'completed' || other.status === 'expired') continue;
      const otherRange = taskRange(other);
      if (!otherRange) continue;
      const sharesAssignee = changed.assigneeIds.some(id => other.assigneeIds.includes(id));
      if (sharesAssignee && changedRange.start < otherRange.end && otherRange.start < changedRange.end) {
        conflicts.push({ changedId: changed.id, conflictId: other.id });
      }
    }
  }
  return conflicts;
}

function findBusyDays(changedTasks: Task[], allTasks: Task[]): string[] {
  const touchedDays = new Set(changedTasks.map(task => dayKey(task.startTime)).filter(Boolean) as string[]);
  const busyDays: string[] = [];
  for (const day of touchedDays) {
    const dayTasks = allTasks.filter(task => task.status !== 'completed' && task.status !== 'expired' && dayKey(task.startTime) === day);
    const rewardLoad = dayTasks.reduce((sum, task) => sum + Math.max(0, task.rewardStars || 0), 0);
    if (dayTasks.length >= 6 || rewardLoad >= 35) busyDays.push(day);
  }
  return busyDays;
}

function taskRange(task: Task): { start: number; end: number } | null {
  const start = new Date(task.startTime).getTime();
  const end = new Date(task.deadline || task.endTime || task.startTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return {
    start,
    end: end > start ? end : start + 60 * 60 * 1000,
  };
}

function dayKey(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseRecurringClass(text: string): ScheduleArrangementCommand | null {
  const hasExplicitAddIntent = /(报了|报名|新增|加一个|安排|添加|上课|课外班|兴趣班|培训班)/.test(text);
  const hasWeeklyClassPattern = /每周|周一|周二|周三|周四|周五|周六|周日|周天|星期|礼拜/.test(text) && /课|班/.test(text);
  if (!hasExplicitAddIntent && !hasWeeklyClassPattern) return null;
  const weekday = parseWeekday(text);
  const timeRange = parseTimeRange(text);
  const activityName = parseActivityName(text);

  if (weekday === null || !timeRange || !activityName) return null;

  return {
    operation: 'add_recurring_class',
    confidence: 0.92,
    summary: `新增每周${weekdayLabel(weekday)} ${timeRange.startTime}-${timeRange.endTime} 的${activityName}课`,
    params: {
      activityName,
      weekday,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
      frequency: 'weekly',
    },
  };
}

function parseShiftSchedule(text: string): ScheduleArrangementCommand | null {
  const asksShift = /(顺移|后移|往后挪|延期|推迟|顺延)/.test(text);
  if (!asksShift) return null;
  const weekMatch = text.match(/(\d+|一|两|二|三|四|五|六|七|八|九|十)\s*周/);
  const shiftWeeks = weekMatch ? parseChineseNumber(weekMatch[1]) : 1;
  const scope = /所有|全部|全体|所有课外班|全部课外班/.test(text) ? 'extracurricular' : 'extracurricular';
  const reason = parseShiftReason(text);
  const travel = parseTravelContext(text);

  return {
    operation: 'shift_schedule',
    confidence: 0.9,
    summary: `将${scope === 'extracurricular' ? '课外班' : '全部'}日程向后顺延 ${shiftWeeks} 周`,
    params: {
      shiftWeeks,
      scope,
      reason,
      travelDestination: travel.destination,
      travelTiming: travel.timing,
    },
  };
}

function parseCancelOnce(text: string): ScheduleArrangementCommand | null {
  if (!/(取消|停一次|暂停一次|请假|不上了|不去了)/.test(text)) return null;
  const targetName = parseTargetName(text);
  if (!targetName) return null;
  return {
    operation: 'cancel_once',
    confidence: 0.86,
    summary: `取消一次${targetName}安排`,
    params: {
      targetName,
      reason: parseShiftReason(text),
    },
  };
}

function parseRescheduleTask(text: string): ScheduleArrangementCommand | null {
  if (!/(改到|改成|调整到|换到|挪到)/.test(text)) return null;
  const targetName = parseTargetName(text);
  const weekday = parseDestinationWeekday(text) ?? parseWeekday(text);
  const timeRange = parseTimeRange(text);
  if (!targetName || !timeRange) return null;
  return {
    operation: 'reschedule_task',
    confidence: 0.86,
    summary: `把${targetName}调整到${weekday !== null ? `周${weekdayLabel(weekday)}` : ''} ${timeRange.startTime}-${timeRange.endTime}`,
    params: {
      targetName,
      weekday: weekday ?? undefined,
      startTime: timeRange.startTime,
      endTime: timeRange.endTime,
    },
  };
}

function parsePauseCategory(text: string): ScheduleArrangementCommand | null {
  if (!/(暂停|停掉|先停|后移|推迟).{0,12}(娱乐|游戏|电视|平板|课外班|兴趣班|娱乐类)/.test(text)) return null;
  const weekMatch = text.match(/(\d+|一|两|二|三|四|五|六|七|八|九|十)\s*周/);
  const pauseWeeks = weekMatch ? parseChineseNumber(weekMatch[1]) : 2;
  const category = /课外班|兴趣班/.test(text) ? 'extracurricular' : 'entertainment';
  return {
    operation: 'pause_category',
    confidence: 0.84,
    summary: `暂停或后移${category === 'entertainment' ? '娱乐类' : '课外班'}任务 ${pauseWeeks} 周`,
    params: {
      category,
      pauseWeeks,
      reason: /考试|考级|备考/.test(text) ? '考试/考级前需要减负' : parseShiftReason(text),
    },
  };
}

function parseWeekday(text: string): number | null {
  for (const [pattern, day] of WEEKDAY_MAP) {
    if (pattern.test(text)) return day;
  }
  return null;
}

function parseDestinationWeekday(text: string): number | null {
  const destination = text.split(/改到|改成|调整到|换到|挪到/).pop() || '';
  return parseWeekday(destination);
}

function parseTimeRange(text: string): { startTime: string; endTime: string } | null {
  const match = text.match(/(?:下午|晚上|上午|早上)?\s*(\d{1,2})(?::|点|：)?(\d{0,2})\s*(?:-|到|至|—|~)\s*(?:下午|晚上|上午|早上)?\s*(\d{1,2})(?::|点|：)?(\d{0,2})/);
  if (!match) return null;
  const isAfternoon = /下午|晚上/.test(text);
  const startHour = normalizeHour(Number(match[1]), isAfternoon);
  const startMinute = match[2] ? Number(match[2]) : 0;
  const endHour = normalizeHour(Number(match[3]), isAfternoon || Number(match[3]) < Number(match[1]));
  const endMinute = match[4] ? Number(match[4]) : 0;
  return {
    startTime: formatTime(startHour, startMinute),
    endTime: formatTime(endHour, endMinute),
  };
}

function parseActivityName(text: string): string {
  const direct = text.match(/(?:报了|报名|新增|添加|安排)(?:新的|一个|一门|了)?([^，。,.、“”"]{2,12}?)(?:班|课)/);
  if (direct?.[1]) return direct[1].replace(/给孩子|孩子|新的/g, '').trim();
  const known = text.match(EXTRACURRICULAR_KEYWORDS);
  return known?.[0]?.replace(/课外班|兴趣班|培训班/g, '') || '';
}

function extractActivityNames(text: string): string[] {
  return KNOWN_ACTIVITY_NAMES
    .filter(name => text.includes(name))
    .map(name => name === '英语班' ? '英语' : name);
}

function uniqueNames(names: string[]): string[] {
  return Array.from(new Set(names));
}

function parseTargetName(text: string): string {
  const known = text.match(EXTRACURRICULAR_KEYWORDS) || text.match(ENTERTAINMENT_KEYWORDS);
  if (known?.[0]) return known[0].replace(/课外班|兴趣班|培训班/g, '');
  const direct = text.match(/(?:把|将|取消|暂停|停一次|改到|改成|调整到|换到|挪到)([^，。,.]{2,12}?)(?:课|班|任务|安排)?(?:取消|暂停|停一次|改到|改成|调整到|换到|挪到)/);
  return direct?.[1]?.replace(/周一|周二|周三|周四|周五|周六|周日|周天|星期一|星期二|星期三|星期四|星期五|星期六|星期日|星期天/g, '').trim() || '';
}

function parseLooseTargetName(text: string): string {
  const known = text.match(EXTRACURRICULAR_KEYWORDS) || text.match(ENTERTAINMENT_KEYWORDS);
  if (known?.[0]) return known[0].replace(/课外班|兴趣班|培训班/g, '');
  const cleaned = text
    .replace(/把|将|帮我|给孩子|孩子|这个|那个|改一下|改时间|调整一下|换个时间|挪一下|课程|日程|安排|课|班/g, '')
    .replace(/[，。,.]/g, '')
    .trim();
  return cleaned.length >= 2 && cleaned.length <= 12 ? cleaned : '';
}

function parseShiftReason(text: string): string | undefined {
  const travel = text.match(/(?:下周|这周|本周|下个月)?.{0,8}(?:全家|我们|孩子)?.{0,8}(去[^，。,.]+?玩|去[^，。,.]+?旅行|出国|旅游)/);
  return travel?.[0]?.trim();
}

function parseTravelContext(text: string): { destination?: string; timing?: ScheduleArrangementCommand['params']['travelTiming'] } {
  const timing: ScheduleArrangementCommand['params']['travelTiming'] = /下个月/.test(text)
    ? 'next_month'
    : /下周/.test(text)
      ? 'next_week'
      : /本周|这周/.test(text)
        ? 'this_week'
        : undefined;
  const destinationMatch = text.match(/去([^，。,.]+?)(?:玩|旅行|旅游|游学|度假)/);
  const destination = destinationMatch?.[1]?.replace(/全家|我们|孩子/g, '').trim()
    || (/出国/.test(text) ? '国外' : undefined);
  return { destination, timing };
}

function parseChineseNumber(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);
  const map: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  return map[value] || 1;
}

function normalizeHour(hour: number, usePm: boolean): number {
  if (usePm && hour < 12) return hour + 12;
  return hour;
}

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function nextWeekdayDate(weekday: number, time: string, now: Date): Date {
  const [hour, minute] = time.split(':').map(Number);
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  const diff = (weekday - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + diff);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 7);
  return next;
}

function inferTravelStartDate(timing: NonNullable<ScheduleArrangementCommand['params']['travelTiming']>, now: Date): Date {
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);

  if (timing === 'next_month') {
    start.setMonth(start.getMonth() + 1, 1);
    return start;
  }

  if (timing === 'next_week') {
    const day = start.getDay();
    const daysUntilNextMonday = ((1 - day + 7) % 7) || 7;
    start.setDate(start.getDate() + daysUntilNextMonday);
    return start;
  }

  if (timing === 'this_week') return start;

  start.setDate(start.getDate() + 1);
  return start;
}

function withTime(source: Date, time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const next = new Date(source);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function shiftIsoDate(value: string, days: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function appendShiftNote(description: string | undefined, weeks: number, reason?: string): string {
  const note = `AI 语音助手已顺延 ${weeks} 周${reason ? `，原因：${reason}` : ''}`;
  return appendActionNote(description, note);
}

function appendActionNote(description: string | undefined, note: string): string {
  return description ? `${description}\n${note}` : note;
}

function weekdayLabel(weekday: number): string {
  return ['日', '一', '二', '三', '四', '五', '六'][weekday] || '';
}

function matchesTargetName(task: Pick<Task, 'title' | 'description' | 'type'>, targetName: string): boolean {
  if (!targetName) return false;
  const text = `${task.title} ${task.description || ''} ${task.type || ''}`;
  return text.includes(targetName);
}

function isFixedClassSetupPlaceholder(task: Pick<Task, 'title' | 'description' | 'type'>, activityName: string): boolean {
  const text = `${task.title} ${task.description || ''} ${task.type || ''}`;
  return task.type === 'interest'
    && text.includes(activityName)
    && (/确认.*课时间/.test(task.title) || /日程占位|请补充每周几/.test(task.description || ''));
}

function matchesPauseCategory(task: Pick<Task, 'title' | 'description' | 'type'>, category: NonNullable<ScheduleArrangementCommand['params']['category']>): boolean {
  if (category === 'all') return true;
  const text = `${task.title} ${task.description || ''} ${task.type || ''}`;
  if (category === 'extracurricular') return task.type === 'interest' || EXTRACURRICULAR_KEYWORDS.test(text);
  if (category === 'entertainment') return task.type === 'fun' || task.type === 'entertainment' || ENTERTAINMENT_KEYWORDS.test(text);
  if (category === 'study') return task.type === 'study';
  return false;
}
