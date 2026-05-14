/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 智能日程推荐引擎
 *
 * 核心流程：
 * 1. 收集用户信息（年龄/年级、性别、学科强弱、已有兴趣等）
 * 2. 以 SCHEDULE_REFERENCE.md 为参考知识库
 * 3. 调用 AI 生成个性化日程推荐
 * 4. 支持用户反馈和迭代优化
 */

import { callAI, callAIJson } from './voiceAssistant';
import type {
  ChildGender,
  FamilyPlanningProfile,
  FamilySchedulePlan,
  PlanningScenario,
  ScheduleSlot,
} from '../domain/familyPlanning';
import { hasRecommendationConsent, type RecommendationConsentState } from './recommendationConsent';
import type { DailyScheduleTemplate } from './planTemplates';

// ==================== 类型定义 ====================

/** 用户输入的孩子信息 */
export interface ChildProfile {
  /** 性别 */
  gender: 'boy' | 'girl' | '';
  /** 年龄 */
  age: number | null;
  /** 年级 */
  grade: string;
  /** 所在城市 */
  city: string;
  /** 学校类型 */
  schoolType: '公立' | '私立' | '国际' | '';
  /** 强势科目 */
  strongSubjects: string[];
  /** 薄弱科目 */
  weakSubjects: string[];
  /** 已有兴趣班 */
  existingInterests: string[];
  /** 已有兴趣班一周占用的时间段（如 "周一16-18"） */
  existingSchedules: string[];
  /** 性格特点 */
  personality: string[];
  /** 性格-其他补充 */
  personalityOther: string;
  /** 每天完成学校作业大约需要多久（分钟） */
  homeworkDuration: number | null;
  /** 每天可自由支配的课外时间（小时） */
  freeTimePerDay: number | null;
  /** 家长期望方向 */
  parentExpectation: string[];
  /** 期望-其他补充 */
  expectationOther: string;
  /** 可用预算（每月/元） */
  budget: number | null;
  /** 电子设备使用情况 */
  screenTime: string;
  /** 健康注意事项 */
  healthNotes: string;
  /** 其他说明 */
  otherNotes: string;
}

/** AI 生成的推荐结果 */
export interface ScheduleRecommendation {
  /** 综合分析 */
  summary: string;
  /** 日常作息表 (周一到周五) */
  weekdaySchedule: TimeSlot[];
  /** 周末作息表 */
  weekendSchedule: TimeSlot[];
  /** 推荐兴趣班（1-2个主推） */
  recommendedActivities: RecommendedActivity[];
  /** 不建议或需要谨慎选择的兴趣方向 */
  avoidActivities: string[];
  /** 给家长的建议 */
  parentTips: string[];
  /** 各科学习策略建议 */
  subjectAdvice: SubjectAdvice[];
  /** 分阶段发展路径 */
  developmentPath: DevelopmentPhase[];
}

/** 单个时间段 */
export interface TimeSlot {
  time: string;
  duration: string;
  activity: string;
  notes?: string;
  icon?: string;
}

/** 推荐活动/兴趣班 */
export interface RecommendedActivity {
  name: string;
  category: '运动' | '艺术' | '思维' | '语言' | '动手' | '自然探索' | '其他';
  reason: string;
  weeklyHours: number;
  recommendedAge: string;
  priority: '强烈推荐' | '推荐' | '可选';
}

/** 学科建议 */
export interface SubjectAdvice {
  subject: string;
  status: '强项' | '薄弱' | '中等';
  strategy: string;
  resources: string[];
}

/** 发展阶段 */
export interface DevelopmentPhase {
  phase: string;
  timeRange: string;
  focus: string[];
  description: string;
}

export interface RecommendationConsentFilterResult {
  recommendation: ScheduleRecommendation;
  hiddenSections: Array<'education_activities' | 'learning_resources'>;
}

/** 对话状态 */
export type ConversationPhase =
  | 'initial'           // 初始问候
  | 'collecting_basic'  // 收集基本信息
  | 'collecting_deep'   // 收集深度信息
  | 'generating'        // AI 生成中
  | 'result'            // 展示结果
  | 'refining'          // 用户提出修改
  | 'saving';           // 保存到计划

/** 会话消息 */
export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  phase?: ConversationPhase;
  recommendation?: ScheduleRecommendation;
}

// ==================== 领域模型转换 ====================

function normalizeGender(gender: ChildProfile['gender']): ChildGender {
  if (gender === 'boy' || gender === 'girl') return gender;
  return 'unspecified';
}

function normalizeTimeRange(time: string, index: number): { startTime: string; endTime: string } {
  const match = time.match(/(\d{1,2}:\d{2})\s*[-~—–至到]\s*(\d{1,2}:\d{2})/);
  if (match) {
    return { startTime: match[1], endTime: match[2] };
  }

  const singleTime = time.match(/(\d{1,2}:\d{2})/);
  if (singleTime) {
    return { startTime: singleTime[1], endTime: singleTime[1] };
  }

  const fallbackHour = String(Math.min(7 + index, 22)).padStart(2, '0');
  return { startTime: `${fallbackHour}:00`, endTime: `${fallbackHour}:30` };
}

function inferSlotCategory(activity: string): ScheduleSlot['category'] {
  if (/作业|学习|阅读|晨读|预习|复习|错题|单词|课程|学科/.test(activity)) return 'study';
  if (/运动|户外|体育|篮球|足球|游泳|跳绳|跑步/.test(activity)) return 'exercise';
  if (/兴趣|钢琴|舞蹈|画|编程|围棋|乐高|音乐|书法/.test(activity)) return 'interest';
  if (/晚餐|早餐|午餐|洗漱|整理|家务|睡觉|起床/.test(activity)) return 'life';
  if (/亲子|家庭|聊天|陪伴/.test(activity)) return 'family';
  if (/休息|自由|午休|放松/.test(activity)) return 'rest';
  return 'other';
}

function estimateRewardStars(category: ScheduleSlot['category']): number {
  switch (category) {
    case 'study':
      return 8;
    case 'exercise':
    case 'interest':
      return 6;
    case 'life':
      return 3;
    default:
      return 0;
  }
}

function timeSlotToScheduleSlot(slot: TimeSlot, index: number, childId: string, source: 'weekday' | 'weekend'): ScheduleSlot {
  const { startTime, endTime } = normalizeTimeRange(slot.time, index);
  const category = inferSlotCategory(slot.activity);

  return {
    id: `${source}-${index + 1}`,
    title: slot.activity,
    startTime,
    endTime,
    category,
    childIds: [childId],
    caregiverRequired: category === 'family' || /陪|亲子|家长/.test(slot.notes || slot.activity),
    description: slot.notes,
    rewardStars: estimateRewardStars(category),
    icon: slot.icon || 'Calendar',
  };
}

export function scheduleRecommendationToDailyScheduleTemplate(
  recommendation: ScheduleRecommendation,
  source: 'weekday' | 'weekend' = 'weekday',
): DailyScheduleTemplate {
  const sourceSlots = source === 'weekday' ? recommendation.weekdaySchedule : recommendation.weekendSchedule;
  const slots = sourceSlots.map((slot, index) => {
    const { startTime, endTime } = normalizeTimeRange(slot.time, index);
    return {
      label: slot.activity,
      startTime,
      endTime,
      description: slot.notes || slot.duration || '',
      icon: slot.icon || '📅',
    };
  });

  const firstSlot = slots[0];
  const lastSlot = slots[slots.length - 1];
  const breakfastSlot = slots.find(slot => /早餐/.test(slot.label));
  const lunchSlot = slots.find(slot => /午餐/.test(slot.label));
  const dinnerSlot = slots.find(slot => /晚餐/.test(slot.label));
  const napSlot = slots.find(slot => /午休|午睡/.test(`${slot.label}${slot.description}`));
  const sleepSlot = slots.find(slot => /睡|就寝/.test(`${slot.label}${slot.description}`));

  return {
    wakeTime: firstSlot?.startTime || '07:00',
    bedTime: sleepSlot?.endTime || lastSlot?.endTime || '21:00',
    napTime: napSlot ? `${napSlot.startTime}-${napSlot.endTime}` : undefined,
    mealTimes: {
      breakfast: breakfastSlot?.startTime || '07:30',
      lunch: lunchSlot?.startTime || '12:00',
      dinner: dinnerSlot?.startTime || '18:30',
    },
    slots,
  };
}

export function childProfileToFamilyPlanningProfile(profile: ChildProfile, childId = 'child-1'): FamilyPlanningProfile {
  return {
    city: profile.city || undefined,
    children: [
      {
        id: childId,
        gender: normalizeGender(profile.gender),
        age: profile.age ?? undefined,
        grade: profile.grade || undefined,
        city: profile.city || undefined,
        schoolType: profile.schoolType || undefined,
        strengths: profile.strongSubjects,
        challenges: profile.weakSubjects,
        interests: profile.existingInterests,
        personality: [
          ...profile.personality,
          ...(profile.personalityOther ? [profile.personalityOther] : []),
        ],
        healthNotes: profile.healthNotes || undefined,
        homeworkMinutes: profile.homeworkDuration ?? undefined,
        screenTimeRule: profile.screenTime || undefined,
      },
    ],
    caregiverWorkWindows: [],
    monthlyBudget: profile.budget ?? undefined,
    educationGoals: [
      ...profile.parentExpectation,
      ...(profile.expectationOther ? [profile.expectationOther] : []),
    ],
    constraints: [
      ...profile.existingSchedules,
      ...(profile.healthNotes ? [`健康注意: ${profile.healthNotes}`] : []),
    ],
    notes: profile.otherNotes || undefined,
  };
}

export function scheduleRecommendationToFamilyPlan(
  recommendation: ScheduleRecommendation,
  profile: ChildProfile,
  options: {
    childId?: string;
    title?: string;
    scenario?: PlanningScenario;
    includeWeekend?: boolean;
  } = {}
): FamilySchedulePlan {
  const childId = options.childId || 'child-1';
  const weekdaySlots = recommendation.weekdaySchedule.map((slot, index) =>
    timeSlotToScheduleSlot(slot, index, childId, 'weekday')
  );
  const weekendSlots = options.includeWeekend
    ? recommendation.weekendSchedule.map((slot, index) =>
      timeSlotToScheduleSlot(slot, index, childId, 'weekend')
    )
    : [];

  return {
    title: options.title || `${profile.grade || profile.age || '孩子'}智能日程方案`,
    scenario: options.scenario || 'school_day',
    source: 'ai',
    summary: recommendation.summary,
    slots: [...weekdaySlots, ...weekendSlots],
    parentTips: recommendation.parentTips || [],
    assumptions: [
      profile.age ? `孩子年龄约 ${profile.age} 岁` : '',
      profile.grade ? `当前年级为 ${profile.grade}` : '',
      profile.homeworkDuration ? `作业时长约 ${profile.homeworkDuration} 分钟` : '',
    ].filter(Boolean),
  };
}

export function applyRecommendationConsent(
  recommendation: ScheduleRecommendation,
  consent: RecommendationConsentState,
): RecommendationConsentFilterResult {
  const canUseEducationRecommendations = hasRecommendationConsent(consent, 'education');
  const hiddenSections: RecommendationConsentFilterResult['hiddenSections'] = [];

  if (canUseEducationRecommendations) {
    return { recommendation, hiddenSections };
  }

  if (recommendation.recommendedActivities.length > 0) {
    hiddenSections.push('education_activities');
  }

  const subjectAdvice = recommendation.subjectAdvice.map(advice => {
    if (advice.resources.length > 0 && !hiddenSections.includes('learning_resources')) {
      hiddenSections.push('learning_resources');
    }
    return {
      ...advice,
      resources: [],
    };
  });

  return {
    recommendation: {
      ...recommendation,
      recommendedActivities: [],
      subjectAdvice,
    },
    hiddenSections,
  };
}

// ==================== 参考知识库 ====================

/** 从 SCHEDULE_REFERENCE.md 中提取的核心知识，作为 AI prompt 的 system instruction */
function getScheduleKnowledgeBase(): string {
  return `## 智能日程推荐知识库（基于网络检索，来自小红书/知乎/搜狐教育等平台）

### 一、各年龄段核心目标

| 年龄段 | 核心目标 |
|--------|----------|
| 3-6岁(幼儿园) | 规律作息、兴趣启蒙、以玩为主 |
| 6-9岁(小学1-3年级) | 养成学习习惯、广撒网尝试兴趣 |
| 9-12岁(小学4-6年级) | 提升自学能力、收缩聚焦兴趣 |
| 12-15岁(初中) | 时间管理、攻克弱科、中考导向 |
| 15-18岁(高中) | 高效学习、查漏补缺、升学导向 |

### 二、男女兴趣偏好差异（基于家长社区反馈）

**男孩普遍偏好（优先推荐）：**
- 运动类：篮球、足球、游泳、武术、滑板
- 思维类：编程(Scratch→Python→C++)、围棋、航模机器人
- 动手类：乐高、实验、木工搭建
- 艺术类：架子鼓、街舞、沙画

**女孩普遍偏好（优先推荐）：**
- 艺术类：中国舞/芭蕾、钢琴、绘画、声乐
- 语言类：演讲口才、英语启蒙、戏剧表演
- 运动类：游泳、羽毛球、体操、花样滑冰、跳绳
- 动手类：陶艺、手工编织、手账

**注意：以上为普遍倾向，每个孩子是独特的个体，应尊重个人兴趣。**

### 三、兴趣班最小入门年龄

- 2岁+: 体能课、创意美术
- 3岁+: 幼儿舞蹈、乐高拼搭
- 4岁+: 轮滑、篮球(启蒙)、跆拳道、游泳(技能)、编程(Scratch)、演讲口才、非洲鼓
- 5岁+: 围棋、科创
- 6岁+: 足球、网球、钢琴、硬笔书法、架子鼓、舞蹈(技术)
- 7岁+: 小提琴、大提琴、声乐

### 四、推荐组合原则

1. **动静结合**：1项运动类 + 1项静态类（艺术/思维）
2. **主次分明**：1项长期"主修"(3年+) + 1-2项"辅修"
3. **年龄适配**：遵循最小入门年龄
4. **课业平衡**：低年级2-3项，高年级收缩至1-2项
5. **尊重意愿**：体验课试听后决定

### 五、各年级作息参考框架

**幼儿园（3-6岁）作息框架：**
07:00-07:30起床洗漱 → 07:30-08:00早餐+晨读 → 08:00-11:30幼儿园/活动 → 
11:30-12:00午餐 → 12:00-14:30午休 → 14:30-15:00点心 → 
15:00-16:00兴趣活动 → 16:00-17:00户外 → 20:00-20:30睡前故事

**小学低年级（1-3年级）作息框架：**
16:00-16:30放学回家 → 16:30-17:30户外运动 → 17:30-18:30作业 → 
18:30-19:00晚餐 → 19:00-19:30阅读/练字 → 19:30-20:00兴趣练习 → 
20:00-20:30自由 → 21:00睡觉

**小学高年级（4-6年级）作息框架：**
16:30-17:00回家休息 → 17:00-18:00作业(独立) → 18:00-18:30晚餐 → 
18:30-19:30课外拓展 → 19:30-20:00兴趣/阅读 → 20:00-20:30预习 → 
21:00-21:30阅读 → 21:30睡觉

**初中作息框架：**
06:30起床晨读 → 07:00早餐 → 学校课程 → 17:30-18:30作业(先复习后作业) → 
18:30-19:00晚餐 → 19:30-21:00薄弱学科突破 → 21:00-21:30错题本/预习 → 22:00睡觉

**高中作息框架：**
06:00起床晨记(单词/古诗) → 学校课程 → 18:30-19:00晚读 → 
19:00-22:00晚自习(作业+专项+回顾) → 23:00前就寝

### 六、各年级男女学科倾向（参考数据）

**初中阶段性别差异：**
- 男生：数理化兴趣较高，运动偏好高强度对抗
- 女生：语文英语兴趣较高，运动偏好有氧类
- 共同建议：初中阶段确保每周至少3-4次体育活动，每次30分钟以上

**高中阶段选科倾向（新高考"3+1+2"）：**
- 物化生(纯理)：男生占约65%
- 史政地(纯文)：女生占约70%
- 物化地/史地生：男女较为均衡
- 提醒：选科应结合成绩和兴趣，不要被性别刻板印象限制

### 七、学科策略建议

| 学科 | 建议方法 |
|------|----------|
| 语文 | 阅读积累+写作训练，低年级重识字书写 |
| 数学 | 计算基础+逻辑思维，中高年级重错题本 |
| 英语 | 听力先行+语感培养，低年级以儿歌动画为主 |
| 理科(理化) | 理解概念+实验实践，初中开始系统做题 |
| 文科(政史) | 时间线+框架图，注重理解记忆 |

### 八、给家长的核心建议

1. 先广泛尝试(体验课)→再选定方向坚持
2. 运动类兴趣班是"必选"，对身心发展都至关重要
3. 不要让孩子替家长完成童年遗憾
4. 注意"避坑"：警惕速成班、过度承诺的机构
5. 学业和兴趣要平衡，高年级可适当收缩
6. 男女生区别对待但不要刻板限制`;
}

// ==================== 推荐引擎 ====================

/**
 * 生成个性化日程推荐
 * 以收集到的孩子信息 + 知识库作为 input，调用 AI 生成结构化推荐
 */
export async function generateScheduleRecommendation(
  profile: ChildProfile
): Promise<ScheduleRecommendation> {
  const systemInstruction = getScheduleKnowledgeBase() + `\n\n
你是一位拥有20年经验的家庭教育顾问和儿童时间管理专家。
请根据用户提供的孩子信息，结合知识库中的各年龄阶段特点、性别差异数据、兴趣班推荐原则和作息框架，
生成一份个性化、可执行的日程推荐方案。

**输出格式要求：返回严格JSON格式，包含以下字段：**
- summary: 综合整体评价（150字以内，理性分析不煽情）
- weekdaySchedule: 周一到周五的作息数组，每个元素包含 time(时间), duration(时长), activity(活动), notes(备注,可选), icon(表情图标,可选)
- weekendSchedule: 周末作息数组，格式同上
- recommendedActivities: 推荐兴趣班/活动的数组，每个元素包含 name, category(运动/艺术/思维/语言/动手/自然探索/其他), reason(推荐理由), weeklyHours(每周建议小时数), recommendedAge(建议年龄), priority(强烈推荐/推荐/可选)
- avoidActivities: 不推荐的兴趣方向数组
- parentTips: 给家长的实用建议数组（3-5条）
- subjectAdvice: 各科学习策略数组，每个元素包含 subject(科目名), status(强项/薄弱/中等), strategy(策略), resources(推荐资源数组)
- developmentPath: 分阶段发展路径数组，每个元素包含 phase(阶段名如"当前阶段"或"1-2年后"), timeRange(时间范围), focus(重点方向数组), description(描述)

**关键要求：**
1. 严格根据孩子的年龄/年级选择对应的作息框架
2. 严格区分性别差异，男孩方案推荐篮球/足球/编程/架子鼓等，女孩方案推荐舞蹈/绘画/游泳/演讲等
3. 但也要考虑用户填写的已有兴趣和性格特点，避免刻板推荐
4. reasoning 要具体有理有据
5. 作息表中要预留充足的睡眠时间（幼儿园10-12h，小学生9-11h，初中生8-10h，高中生7-8h）
6. 知识库中的年龄和时间只是参考框架，要根据用户实际情况灵活调整
7. 推荐活动时要考虑合理的时间经济预算
8. 所有内容用中文输出`;

  const userInfo = buildUserInfoPrompt(profile);

  try {
    const result = await callAIJson<ScheduleRecommendation>(
      userInfo,
      systemInstruction
    );
    return result;
  } catch (err) {
    console.warn('[ScheduleRecommend] AI generation failed, using local fallback:', err);
    return generateLocalScheduleRecommendation(profile);
  }
}

/**
 * 根据用户输入的信息，生成修订后的推荐
 */
export async function refineScheduleRecommendation(
  originalRecommendation: ScheduleRecommendation,
  feedback: string
): Promise<ScheduleRecommendation> {
  const systemInstruction = `你是一位家庭教育顾问。用户对之前的推荐方案提出了修改意见，请根据反馈调整方案。
保持JSON格式不变。用户反馈：${feedback}

原方案：
${JSON.stringify(originalRecommendation, null, 2)}

请根据反馈生成修订后的新方案JSON。`;

  try {
    const result = await callAIJson<ScheduleRecommendation>(
      '请根据以上反馈修改日程推荐方案。',
      systemInstruction
    );
    return result;
  } catch (err) {
    console.warn('[ScheduleRecommend] Refine failed, using local fallback:', err);
    return {
      ...originalRecommendation,
      summary: `${originalRecommendation.summary} 已根据“${feedback.slice(0, 24)}”做本地微调，建议家长再确认具体时间。`,
      parentTips: [
        `已记录修改方向：${feedback}`,
        ...originalRecommendation.parentTips,
      ].slice(0, 5),
    };
  }
}

// ==================== 辅助函数 ====================

function buildUserInfoPrompt(profile: ChildProfile): string {
  const parts: string[] = [];

  parts.push('=== 孩子基本信息 ===');
  parts.push(`性别: ${profile.gender === 'boy' ? '男孩♂️' : profile.gender === 'girl' ? '女孩♀️' : '未说明'}`);
  parts.push(`年龄: ${profile.age ?? '未说明'}岁`);
  parts.push(`年级: ${profile.grade || '未说明'}`);
  parts.push(`所在城市: ${profile.city || '未说明'}`);
  parts.push(`学校类型: ${profile.schoolType || '未说明'}`);

  parts.push('\n=== 学业情况 ===');
  parts.push(`强项科目: ${profile.strongSubjects.length > 0 ? profile.strongSubjects.join('、') : '未说明'}`);
  parts.push(`薄弱科目: ${profile.weakSubjects.length > 0 ? profile.weakSubjects.join('、') : '未说明'}`);
  parts.push(`每天作业时长: ${profile.homeworkDuration ?? '未说明'}分钟`);

  parts.push('\n=== 已有兴趣/课外安排 ===');
  parts.push(`已有兴趣班: ${profile.existingInterests.length > 0 ? profile.existingInterests.join('、') : '无'}`);
  parts.push(`已有固定日程: ${profile.existingSchedules.length > 0 ? profile.existingSchedules.join('、') : '无'}`);
  parts.push(`每天可自由支配时间: ${profile.freeTimePerDay ?? '未说明'}小时`);

  parts.push('\n=== 性格特点 ===');
  parts.push(`性格描述: ${profile.personality.length > 0 ? profile.personality.join('、') : '未说明'}${profile.personalityOther ? '；其他：' + profile.personalityOther : ''}`);

  parts.push('\n=== 家长期望 ===');
  parts.push(`期望方向: ${profile.parentExpectation.length > 0 ? profile.parentExpectation.join('、') : '未说明'}${profile.expectationOther ? '；其他：' + profile.expectationOther : ''}`);
  parts.push(`月预算: ${profile.budget ?? '未说明'}元`);

  parts.push('\n=== 其他信息 ===');
  parts.push(`电子设备使用: ${profile.screenTime || '未说明'}`);
  parts.push(`健康注意事项: ${profile.healthNotes || '无'}`);
  parts.push(`其他补充: ${profile.otherNotes || '无'}`);

  return parts.join('\n');
}

function generateLocalScheduleRecommendation(profile: ChildProfile): ScheduleRecommendation {
  const age = profile.age ?? gradeToAge(profile.grade) ?? 8;
  const isTeen = age >= 12;
  const isPreschool = age <= 6;
  const homeworkMinutes = profile.homeworkDuration ?? (isTeen ? 90 : isPreschool ? 20 : 60);
  const sleepTime = isTeen ? '22:00' : isPreschool ? '20:30' : '21:00';
  const exerciseName = profile.existingInterests.find(item => /游泳|篮球|足球|跳绳|武术|跆拳道|空手道|运动/.test(item)) || '户外运动';
  const practiceName = profile.existingInterests.find(item => /钢琴|小提琴|绘画|画画|英语|识字|书法|编程|乐高|围棋/.test(item)) || '阅读练习';
  const weakSubject = profile.weakSubjects[0] || '薄弱科目';
  const interestLoadNote = profile.existingSchedules.length > 0
    ? `已考虑已有固定安排：${profile.existingSchedules.slice(0, 2).join('、')}`
    : '暂无固定课外班，建议先少量尝试，再稳定保留。';

  const weekdaySchedule: TimeSlot[] = isPreschool
    ? [
        { time: '07:00-07:30', duration: '30分钟', activity: '起床洗漱', notes: '保持固定起床节奏', icon: 'Sun' },
        { time: '16:30-17:20', duration: '50分钟', activity: exerciseName, notes: '以游戏化运动为主', icon: 'Dumbbell' },
        { time: '19:30-20:00', duration: '30分钟', activity: '亲子阅读', notes: '家长陪伴表达和复述', icon: 'Book' },
        { time: `${sleepTime}-20:45`, duration: '15分钟', activity: '睡前流程', notes: '洗漱、收玩具、安静入睡', icon: 'Moon' },
      ]
    : [
        { time: '16:30-17:00', duration: '30分钟', activity: '放学缓冲', notes: '先吃点心、喝水，降低情绪消耗', icon: 'Home' },
        { time: `17:00-${homeworkMinutes > 70 ? '18:20' : '18:00'}`, duration: `${homeworkMinutes}分钟`, activity: '完成学校作业', notes: '先完成最确定的任务，再处理难题', icon: 'BookOpen' },
        { time: '18:30-19:00', duration: '30分钟', activity: '晚餐与休息', notes: '不把学习任务塞进吃饭时间', icon: 'Utensils' },
        { time: '19:10-19:40', duration: '30分钟', activity: `${weakSubject}巩固`, notes: '短时高频，不做题海', icon: 'Target' },
        { time: '19:45-20:15', duration: '30分钟', activity: practiceName, notes: interestLoadNote, icon: 'Sparkles' },
        { time: `${sleepTime === '22:00' ? '21:30' : '20:30'}-${sleepTime}`, duration: '30分钟', activity: '睡前整理', notes: '整理书包、确认明日重点', icon: 'Moon' },
      ];

  const weekendSchedule: TimeSlot[] = [
    { time: '09:00-10:00', duration: '60分钟', activity: exerciseName, notes: '优先安排户外或体能活动', icon: 'Dumbbell' },
    { time: '10:30-11:10', duration: '40分钟', activity: `${weakSubject}轻复盘`, notes: '只复盘一类问题，避免周末过载', icon: 'BookOpen' },
    { time: '15:00-16:30', duration: '90分钟', activity: '家庭自由活动', notes: '保留亲子陪伴和孩子自主选择', icon: 'Heart' },
  ];

  const recommendedActivities: RecommendedActivity[] = [
    {
      name: exerciseName === '户外运动' ? (profile.gender === 'girl' ? '游泳' : '篮球') : exerciseName,
      category: '运动',
      reason: '运动类活动对专注力、睡眠和情绪稳定都有兜底价值，适合作为长期保留项。',
      weeklyHours: 2,
      recommendedAge: `${Math.max(4, Math.min(age, 18))}岁+`,
      priority: '推荐',
    },
    {
      name: practiceName === '阅读练习' ? '阅读表达' : practiceName,
      category: /编程|乐高|围棋/.test(practiceName) ? '思维' : /英语|阅读|识字/.test(practiceName) ? '语言' : '艺术',
      reason: '适合放在平日晚间短时练习，重点是稳定出现，而不是一次练很久。',
      weeklyHours: 2,
      recommendedAge: `${Math.max(5, Math.min(age, 18))}岁+`,
      priority: '可选',
    },
  ];

  return {
    summary: `已用本地智能规则生成方案：重点是稳定作息、控制晚间密度，并把${weakSubject}和${practiceName}拆成短时可坚持动作。`,
    weekdaySchedule,
    weekendSchedule,
    recommendedActivities,
    avoidActivities: ['同一天叠加过多课外班', '睡前安排高强度学习', '没有复盘的长期打卡'],
    parentTips: [
      '每天只抓一到两个关键动作，减少临时催促。',
      '固定课外班要优先确认接送、路程和课前准备。',
      '兴趣爱好适合短时高频，先让孩子形成稳定感。',
      '周末保留家庭共同活动，别把复盘做成检查。',
    ],
    subjectAdvice: [
      {
        subject: weakSubject,
        status: profile.weakSubjects.length > 0 ? '薄弱' : '中等',
        strategy: '每天安排20-30分钟短时巩固，先解决一类典型问题。',
        resources: ['错题复盘', '口头讲题', '基础练习'],
      },
    ],
    developmentPath: [
      {
        phase: '当前阶段',
        timeRange: '未来2-4周',
        focus: ['稳定作息', '减少冲突', '形成每日小闭环'],
        description: '先让家庭节奏跑顺，再逐步增加目标型计划。',
      },
      {
        phase: '进阶阶段',
        timeRange: '1个学期',
        focus: ['固定兴趣方向', '建立复盘', '优化奖励机制'],
        description: '观察孩子真实反馈，保留最有长期价值的安排。',
      },
    ],
  };
}

/**
 * 获取默认的孩子信息模板
 */
export function getDefaultChildProfile(): ChildProfile {
  return {
    gender: '',
    age: null,
    grade: '',
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
  };
}

/**
 * 年级 → 年龄映射辅助
 */
export function gradeToAge(grade: string): number | null {
  const map: Record<string, number> = {
    '幼儿园小班': 3, '幼儿园中班': 4, '幼儿园大班': 5,
    '一年级': 6, '二年级': 7, '三年级': 8,
    '四年级': 9, '五年级': 10, '六年级': 11,
    '初一': 12, '初二': 13, '初三': 14,
    '高一': 15, '高二': 16, '高三': 17,
  };
  return map[grade] ?? null;
}

/**
 * 年龄 → 年级映射辅助
 */
export function ageToGrade(age: number): string {
  if (age < 3) return '未到学龄';
  if (age === 3) return '幼儿园小班';
  if (age === 4) return '幼儿园中班';
  if (age === 5) return '幼儿园大班';
  if (age === 6) return '一年级';
  if (age === 7) return '二年级';
  if (age === 8) return '三年级';
  if (age === 9) return '四年级';
  if (age === 10) return '五年级';
  if (age === 11) return '六年级';
  if (age === 12) return '初一';
  if (age === 13) return '初二';
  if (age === 14) return '初三';
  if (age === 15) return '高一';
  if (age === 16) return '高二';
  if (age === 17) return '高三';
  return '高中毕业';
}
