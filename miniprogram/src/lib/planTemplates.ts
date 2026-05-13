/**
 * 计划场景模板 — 对齐Web端 src/lib/planTemplates.ts
 */

// ===== 对齐Web第7行 =====
export type PlanSceneType = 'weekday' | 'holiday' | 'exchange' | 'custom';

// ===== 对齐Web第10-16行 =====
export interface TimeSlot {
  label: string;
  startTime: string;
  endTime: string;
  description: string;
  icon: string; // emoji
}

// ===== 对齐Web第19-29行 =====
export interface DailyScheduleTemplate {
  wakeTime: string;
  bedTime: string;
  napTime?: string;
  mealTimes: { breakfast: string; lunch: string; dinner: string };
  slots: TimeSlot[];
}

// ===== 对齐Web第32-44行 =====
export interface PlanSceneTemplate {
  type: PlanSceneType;
  name: string;
  emoji: string;
  description: string;
  weekdaySchedule: DailyScheduleTemplate;
  suggestedTasks?: string[];
  timeRangeHint: string;
}

// ===== 对齐Web第52-76行：平日默认日程 =====
const weekdayDefault: DailyScheduleTemplate = {
  wakeTime: '07:00',
  bedTime: '21:00',
  mealTimes: { breakfast: '07:30', lunch: '12:00', dinner: '18:30' },
  slots: [
    { label: '起床洗漱', startTime: '07:00', endTime: '07:20', description: '穿衣、刷牙、洗脸', icon: '🌅' },
    { label: '早餐时间', startTime: '07:20', endTime: '07:45', description: '营养早餐、晨间交流', icon: '🥣' },
    { label: '上学', startTime: '07:45', endTime: '08:00', description: '出发去学校', icon: '🎒' },
    { label: '上午课程', startTime: '08:00', endTime: '12:00', description: '学校正常上课', icon: '📚' },
    { label: '午餐&午休', startTime: '12:00', endTime: '13:30', description: '学校午餐、课间休息', icon: '🍱' },
    { label: '下午课程', startTime: '13:30', endTime: '16:00', description: '下午课程', icon: '✏️' },
    { label: '放学回家', startTime: '16:00', endTime: '16:30', description: '放学回家路上', icon: '🏠' },
    { label: '休息&玩乐', startTime: '16:30', endTime: '17:30', description: '自由活动、吃点心', icon: '🎮' },
    { label: '作业时间', startTime: '17:30', endTime: '18:30', description: '完成学校作业', icon: '📝' },
    { label: '晚餐时间', startTime: '18:30', endTime: '19:15', description: '全家共进晚餐', icon: '🍲' },
    { label: '家庭时间', startTime: '19:15', endTime: '20:00', description: '亲子活动、阅读', icon: '👨‍👩‍👧‍👦' },
    { label: '洗漱准备', startTime: '20:00', endTime: '20:30', description: '洗澡、刷牙', icon: '🛁' },
    { label: '睡前故事', startTime: '20:30', endTime: '21:00', description: '阅读/听故事', icon: '📖' },
  ],
};

// ===== 对齐Web第78-102行：假期默认日程 =====
const holidayDefault: DailyScheduleTemplate = {
  wakeTime: '08:00',
  bedTime: '22:00',
  napTime: '13:00-14:00',  // ⭐ 对齐Web第82行: 假期有午休
  mealTimes: { breakfast: '08:30', lunch: '12:00', dinner: '18:30' },
  slots: [
    { label: '起床洗漱', startTime: '08:00', endTime: '08:20', description: '穿衣、刷牙、洗脸', icon: '🌅' },
    { label: '早餐时间', startTime: '08:20', endTime: '08:50', description: '悠闲早餐', icon: '🥞' },
    { label: '晨间学习', startTime: '09:00', endTime: '10:30', description: '黄金学习时间', icon: '📚' },
    { label: '自由活动', startTime: '10:30', endTime: '11:30', description: '户外玩耍、兴趣活动', icon: '🎨' },
    { label: '午餐&午休', startTime: '12:00', endTime: '14:00', description: '午餐、午睡', icon: '😴' },
    { label: '午后学习', startTime: '14:00', endTime: '15:30', description: '暑期作业/课外阅读', icon: '📝' },
    { label: '下午活动', startTime: '15:30', endTime: '17:00', description: '体育运动/户外活动', icon: '⚽' },
    { label: '自由时间', startTime: '17:00', endTime: '18:00', description: '看动画片/玩游戏', icon: '📺' },
    { label: '晚餐时间', startTime: '18:00', endTime: '19:00', description: '全家共进晚餐', icon: '🍲' },
    { label: '家庭活动', startTime: '19:00', endTime: '20:30', description: '桌游/散步/聊天', icon: '🎯' },
    { label: '洗漱准备', startTime: '20:30', endTime: '21:00', description: '洗澡、刷牙', icon: '🛁' },
    { label: '晚间阅读', startTime: '21:00', endTime: '22:00', description: '自由阅读/听音频', icon: '📖' },
  ],
};

// ===== 对齐Web第104-127行：交换留学默认日程 =====
const exchangeDefault: DailyScheduleTemplate = {
  wakeTime: '07:00',
  bedTime: '22:00',
  mealTimes: { breakfast: '07:30', lunch: '12:00', dinner: '18:00' },
  slots: [
    { label: '起床洗漱', startTime: '07:00', endTime: '07:20', description: '适应当地时间', icon: '🌅' },
    { label: '早餐', startTime: '07:20', endTime: '07:50', description: '早餐并与家人视频', icon: '🥣' },
    { label: '上学', startTime: '08:00', endTime: '15:00', description: '当地学校上课', icon: '🏫' },
    { label: '课外活动', startTime: '15:00', endTime: '16:30', description: '社团/体育/兴趣班', icon: '🎯' },
    { label: '回家&休息', startTime: '16:30', endTime: '17:30', description: '回家、吃点心', icon: '🏠' },
    { label: '作业时间', startTime: '17:30', endTime: '18:30', description: '完成学校作业', icon: '📝' },
    { label: '晚餐时间', startTime: '18:00', endTime: '19:00', description: '晚餐并与家人视频', icon: '🍲' },
    { label: '自由时间', startTime: '19:00', endTime: '20:00', description: '自由活动', icon: '🎮' },
    { label: '洗漱准备', startTime: '20:00', endTime: '20:30', description: '洗漱', icon: '🛁' },
    { label: '睡前学习', startTime: '20:30', endTime: '21:30', description: '中文学习/阅读', icon: '📖' },
    { label: '就寝', startTime: '21:30', endTime: '22:00', description: '准备睡觉', icon: '😴' },
  ],
};

// ===== 对齐Web第130-167行: 所有场景模板 =====
export const PLAN_SCENES: PlanSceneTemplate[] = [
  {
    type: 'weekday',
    name: '平日计划',
    emoji: '📚',
    description: '上学期间的日常作息，包含上课、作业、活动安排',
    weekdaySchedule: weekdayDefault,
    suggestedTasks: ['完成学校作业', '课外阅读30分钟', '练琴/练字', '整理书包'],
    timeRangeHint: '适合学期中的周一至周五',
  },
  {
    type: 'holiday',
    name: '假期计划',
    emoji: '🌴',
    description: '寒暑假、小长假等居家时段的作息安排，更灵活自由',
    weekdaySchedule: holidayDefault,
    suggestedTasks: ['暑假作业/寒假作业', '阅读打卡', '体育运动', '家务劳动'],
    timeRangeHint: '适合寒假、暑假、国庆等长假期间',
  },
  {
    type: 'exchange',
    name: '交换留学',
    emoji: '✈️',
    description: '海外交换、留学期间作息，需要处理时差和远程沟通',
    weekdaySchedule: exchangeDefault,
    suggestedTasks: ['当地学校课程', '中文学习/文化阅读', '与家人视频通话', '适应时差作息'],
    timeRangeHint: '适合短期交换、长期留学等跨时区场景',
  },
  {
    type: 'custom',
    name: '自定义',
    emoji: '✨',
    description: '根据你的家庭需求自由创建日程模板',
    weekdaySchedule: weekdayDefault,
    suggestedTasks: [],
    timeRangeHint: '可以根据需要自由定制',
  },
];

// ===== 对齐Web第212-222行: 留学时区（⭐补齐9个，对齐Web）=====
export const EXCHANGE_TIMEZONES = [
  { label: '美国东部 (纽约/波士顿)', offset: -13, emoji: '🗽' },
  { label: '美国西部 (洛杉矶/旧金山)', offset: -16, emoji: '🌉' },
  { label: '英国 (伦敦)', offset: -7, emoji: '🇬🇧' },
  { label: '澳大利亚 (悉尼)', offset: 2, emoji: '🇦🇺' },
  { label: '新西兰 (奥克兰)', offset: 4, emoji: '🇳🇿' },
  { label: '日本 (东京)', offset: 1, emoji: '🇯🇵' },
  { label: '新加坡', offset: 0, emoji: '🇸🇬' },
  { label: '欧洲 (巴黎/柏林)', offset: -6, emoji: '🇪🇺' },   // ⭐ 对齐Web第220行
  { label: '加拿大 (多伦多)', offset: -13, emoji: '🇨🇦' },      // ⭐ 对齐Web第221行
];

// ===== 对齐Web第30行 =====
export const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三'];

// ===== 对齐Web第29行 =====
export const DAYS_OF_WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// ⭐ 对齐Web第170-183行: 创建空日程（用于自定义场景）
export function createEmptySchedule(): DailyScheduleTemplate {
  return {
    wakeTime: '07:00',
    bedTime: '21:00',
    mealTimes: { breakfast: '07:30', lunch: '12:00', dinner: '18:30' },
    slots: [
      { label: '起床', startTime: '07:00', endTime: '07:30', description: '', icon: '🌅' },
      { label: '上午', startTime: '08:00', endTime: '12:00', description: '', icon: '📚' },
      { label: '午休', startTime: '12:00', endTime: '14:00', description: '', icon: '😴' },
      { label: '下午', startTime: '14:00', endTime: '17:00', description: '', icon: '🎨' },
      { label: '晚间', startTime: '19:00', endTime: '21:00', description: '', icon: '🏠' },
    ],
  };
}

// ⭐ 对齐Web第186-209行: 根据时区调整日程（留学场景核心逻辑）
export function adjustScheduleByTimezone(schedule: DailyScheduleTemplate, timezoneOffset: number): DailyScheduleTemplate {
  // timezoneOffset: 目标时区相对于UTC+8的小时数（如美国东部=UTC-5 → -13）
  const adjustTime = (time: string, offset: number): string => {
    const [h, m] = time.split(':').map(Number);
    let newH = (h + offset + 24) % 24;
    return `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return {
    ...schedule,
    wakeTime: adjustTime(schedule.wakeTime, timezoneOffset),
    bedTime: adjustTime(schedule.bedTime, timezoneOffset),
    mealTimes: {
      breakfast: adjustTime(schedule.mealTimes.breakfast, timezoneOffset),
      lunch: adjustTime(schedule.mealTimes.lunch, timezoneOffset),
      dinner: adjustTime(schedule.mealTimes.dinner, timezoneOffset),
    },
    slots: schedule.slots.map(slot => ({
      ...slot,
      startTime: adjustTime(slot.startTime, timezoneOffset),
      endTime: adjustTime(slot.endTime, timezoneOffset),
    })),
  };
}

// ⭐ 对齐Web第225-228行: 获取默认任务建议
export function getDefaultTasksForScene(type: PlanSceneType): string[] {
  const scene = PLAN_SCENES.find(s => s.type === type);
  return scene?.suggestedTasks || [];
}
