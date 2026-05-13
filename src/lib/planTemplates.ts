/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  FamilySchedulePlan,
  PlanningScenario,
  ScheduleSlot,
} from '../domain/familyPlanning';

// 计划场景类型
export type PlanSceneType = 'weekday' | 'holiday' | 'exchange' | 'custom';

// 时段定义
export interface TimeSlot {
  label: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  description: string;
  icon: string;      // emoji
}

// 每日日程模板
export interface DailyScheduleTemplate {
  wakeTime: string;       // 起床时间
  bedTime: string;        // 就寝时间
  napTime?: string;       // 午休时间
  mealTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
  slots: TimeSlot[];      // 时段列表
}

// 计划场景模板
export interface PlanSceneTemplate {
  type: PlanSceneType;
  name: string;
  emoji: string;
  description: string;
  // 日程配置
  weekdaySchedule: DailyScheduleTemplate;
  weekendSchedule?: DailyScheduleTemplate; // 可选，节假日可能有不同的周末日程
  // 建议默认任务
  suggestedTasks?: string[];
  // 适用时间段说明
  timeRangeHint: string;
}

// 计划问询问卷配置
export interface PlanWizardConfig {
  scenes: PlanSceneTemplate[];
}

// 平日计划 - 默认日程（上学日）
const weekdayDefault: DailyScheduleTemplate = {
  wakeTime: '07:00',
  bedTime: '21:00',
  napTime: undefined,
  mealTimes: {
    breakfast: '07:30',
    lunch: '12:00',
    dinner: '18:30',
  },
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

// 假日计划 - 默认日程（假期在家）
const holidayDefault: DailyScheduleTemplate = {
  wakeTime: '08:00',
  bedTime: '22:00',
  napTime: '13:00-14:00',
  mealTimes: {
    breakfast: '08:30',
    lunch: '12:00',
    dinner: '18:30',
  },
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

// 交换留学 - 不同时区的日程示例（以美国东部为例，UTC-5）
const exchangeDefault: DailyScheduleTemplate = {
  wakeTime: '07:00',
  bedTime: '22:00',
  napTime: undefined,
  mealTimes: {
    breakfast: '07:30',
    lunch: '12:00',
    dinner: '18:00',
  },
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

// 所有计划场景模板
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

// 创建空日程（用于自定义）
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

// 根据时区调整日程（用于交换留学）
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

// 常见留学目的地时区
export const EXCHANGE_TIMEZONES = [
  { label: '美国东部 (纽约/波士顿)', offset: -13, emoji: '🗽' },   // UTC-5, 比北京晚13h
  { label: '美国西部 (洛杉矶/旧金山)', offset: -16, emoji: '🌉' }, // UTC-8, 比北京晚16h
  { label: '英国 (伦敦)', offset: -7, emoji: '🇬🇧' },              // UTC+0, 比北京晚8h(夏令时-7)
  { label: '澳大利亚 (悉尼)', offset: 2, emoji: '🇦🇺' },            // UTC+10, 比北京早2h
  { label: '新西兰 (奥克兰)', offset: 4, emoji: '🇳🇿' },            // UTC+12, 比北京早4h
  { label: '日本 (东京)', offset: 1, emoji: '🇯🇵' },                // UTC+9, 比北京早1h
  { label: '新加坡', offset: 0, emoji: '🇸🇬' },                     // UTC+8, 与北京相同
  { label: '欧洲 (巴黎/柏林)', offset: -6, emoji: '🇪🇺' },          // UTC+1/UTC+2, 比北京晚6h
  { label: '加拿大 (多伦多)', offset: -13, emoji: '🇨🇦' },          // UTC-5, 比北京晚13h
];

// 获取默认任务建议
export function getDefaultTasksForScene(type: PlanSceneType): string[] {
  const scene = PLAN_SCENES.find(s => s.type === type);
  return scene?.suggestedTasks || [];
}

// ==================== 领域模型转换 ====================

function sceneTypeToPlanningScenario(type: PlanSceneType): PlanningScenario {
  switch (type) {
    case 'weekday':
      return 'school_day';
    case 'holiday':
      return 'holiday';
    case 'exchange':
      return 'travel';
    case 'custom':
    default:
      return 'custom';
  }
}

function inferTemplateSlotCategory(label: string, description: string): ScheduleSlot['category'] {
  const text = `${label} ${description}`;
  if (/家庭|亲子|家人|视频|聊天|故事/.test(text)) return 'family';
  if (/作业|学习|阅读|课程|预习|复习|晨读|书法|练字/.test(text)) return 'study';
  if (/运动|体育|户外|足球|篮球|游泳|跑步|活动/.test(text)) return 'exercise';
  if (/兴趣|钢琴|舞蹈|绘画|音乐|社团|课外/.test(text)) return 'interest';
  if (/早餐|午餐|晚餐|洗漱|起床|就寝|睡觉|整理|上学|放学|回家/.test(text)) return 'life';
  if (/休息|自由|午休|玩乐|放松/.test(text)) return 'rest';
  return 'other';
}

function estimateTemplateRewardStars(category: ScheduleSlot['category']): number {
  switch (category) {
    case 'study':
      return 6;
    case 'exercise':
    case 'interest':
      return 5;
    case 'life':
      return 2;
    default:
      return 0;
  }
}

function templateSlotToScheduleSlot(slot: TimeSlot, index: number, childIds: string[]): ScheduleSlot {
  const category = inferTemplateSlotCategory(slot.label, slot.description);

  return {
    id: `template-slot-${index + 1}`,
    title: slot.label,
    startTime: slot.startTime,
    endTime: slot.endTime,
    category,
    childIds,
    caregiverRequired: category === 'family' || /亲子|家人|陪|视频/.test(slot.description),
    description: slot.description,
    rewardStars: estimateTemplateRewardStars(category),
    icon: slot.icon,
  };
}

export function dailyScheduleTemplateToFamilyPlan(
  schedule: DailyScheduleTemplate,
  options: {
    title: string;
    sceneType?: PlanSceneType;
    familyId?: string;
    childIds?: string[];
    startDate?: string;
    endDate?: string;
    summary?: string;
  }
): FamilySchedulePlan {
  const sceneType = options.sceneType || 'custom';
  const childIds = options.childIds || [];

  return {
    familyId: options.familyId,
    title: options.title,
    scenario: sceneTypeToPlanningScenario(sceneType),
    source: 'template',
    startDate: options.startDate,
    endDate: options.endDate,
    summary: options.summary,
    slots: schedule.slots.map((slot, index) => templateSlotToScheduleSlot(slot, index, childIds)),
    parentTips: [
      `建议起床时间 ${schedule.wakeTime}，就寝时间 ${schedule.bedTime}`,
      `三餐时间：早餐 ${schedule.mealTimes.breakfast}，午餐 ${schedule.mealTimes.lunch}，晚餐 ${schedule.mealTimes.dinner}`,
    ],
    assumptions: [
      schedule.napTime ? `包含午休安排：${schedule.napTime}` : '',
      `来源场景：${sceneType}`,
    ].filter(Boolean),
  };
}

export function planSceneTemplateToFamilyPlan(
  scene: PlanSceneTemplate,
  options: {
    familyId?: string;
    childIds?: string[];
    startDate?: string;
    endDate?: string;
    title?: string;
  } = {}
): FamilySchedulePlan {
  const title = options.title || scene.name;

  return dailyScheduleTemplateToFamilyPlan(scene.weekdaySchedule, {
    title,
    sceneType: scene.type,
    familyId: options.familyId,
    childIds: options.childIds,
    startDate: options.startDate,
    endDate: options.endDate,
    summary: scene.description,
  });
}
