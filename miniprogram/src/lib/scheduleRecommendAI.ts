/**
 * 智能日程推荐引擎
 *
 * 核心流程：
 * 1. 收集用户信息（年龄/年级、性别、学科强弱、已有兴趣等）
 * 2. 以知识库作为 AI prompt 参考
 * 3. 调用 AI 生成个性化日程推荐
 * 4. 支持用户反馈和迭代优化
 */

import { sendToAI } from './aiEngine';

// ==================== 类型定义 ====================

export interface ChildProfile {
  gender: 'boy' | 'girl' | '';
  age: number | null;
  grade: string;
  city: string;
  schoolType: '公立' | '私立' | '国际' | '';
  strongSubjects: string[];
  weakSubjects: string[];
  existingInterests: string[];
  existingSchedules: string[];
  personality: string[];
  personalityOther: string;
  homeworkDuration: number | null;
  freeTimePerDay: number | null;
  parentExpectation: string[];
  expectationOther: string;
  budget: number | null;
  screenTime: string;
  healthNotes: string;
  otherNotes: string;
}

export interface ScheduleRecommendation {
  summary: string;
  weekdaySchedule: TimeSlot[];
  weekendSchedule: TimeSlot[];
  recommendedActivities: RecommendedActivity[];
  avoidActivities: string[];
  parentTips: string[];
  subjectAdvice: SubjectAdvice[];
  developmentPath: DevelopmentPhase[];
}

export interface TimeSlot {
  time: string;
  duration: string;
  activity: string;
  notes?: string;
  icon?: string;
}

export interface RecommendedActivity {
  name: string;
  category: '运动' | '艺术' | '思维' | '语言' | '动手' | '自然探索' | '其他';
  reason: string;
  weeklyHours: number;
  recommendedAge: string;
  priority: '强烈推荐' | '推荐' | '可选';
}

export interface SubjectAdvice {
  subject: string;
  status: '强项' | '薄弱' | '中等';
  strategy: string;
  resources: string[];
}

export interface DevelopmentPhase {
  phase: string;
  timeRange: string;
  focus: string[];
  description: string;
}

// ==================== 参考知识库 ====================

function getScheduleKnowledgeBase(): string {
  return `## 智能日程推荐知识库

### 一、各年龄段核心目标
| 年龄段 | 核心目标 |
|--------|----------|
| 3-6岁(幼儿园) | 规律作息、兴趣启蒙、以玩为主 |
| 6-9岁(小学1-3年级) | 养成学习习惯、广撒网尝试兴趣 |
| 9-12岁(小学4-6年级) | 提升自学能力、收缩聚焦兴趣 |
| 12-15岁(初中) | 时间管理、攻克弱科、中考导向 |
| 15-18岁(高中) | 高效学习、查漏补缺、升学导向 |

### 二、男女兴趣偏好差异
男孩普遍偏好：篮球、足球、游泳、武术、编程、围棋、乐高、架子鼓、街舞
女孩普遍偏好：中国舞/芭蕾、钢琴、绘画、声乐、游泳、演讲口才、书法、陶艺

### 三、兴趣班最小入门年龄
- 2岁+: 体能课、创意美术
- 3岁+: 幼儿舞蹈、乐高拼搭
- 4岁+: 轮滑、篮球(启蒙)、跆拳道、游泳(技能)、编程(Scratch)、演讲口才
- 5岁+: 围棋、科创
- 6岁+: 足球、网球、钢琴、硬笔书法、架子鼓、舞蹈(技术)
- 7岁+: 小提琴、大提琴、声乐

### 四、推荐组合原则
1. 动静结合：1项运动类 + 1项静态类（艺术/思维）
2. 主次分明：1项长期"主修"(3年+) + 1-2项"辅修"
3. 年龄适配：遵循最小入门年龄
4. 课业平衡：低年级2-3项，高年级收缩至1-2项
5. 尊重意愿：体验课试听后决定

### 五、各年级作息参考框架
幼儿园：07:00起床 → 08:30入园 → 11:30午餐 → 12:30午休 → 15:00兴趣 → 20:30睡前故事
小学低年级：16:00放学 → 16:30运动 → 17:30作业 → 19:00晚餐 → 19:30阅读 → 21:00睡觉
小学高年级：16:30回家 → 17:00作业 → 18:00晚餐 → 18:30拓展 → 20:00预习 → 21:30睡觉
初中：06:30晨读 → 学校课程 → 17:30作业 → 18:30晚餐 → 19:30弱科突破 → 22:00睡觉
高中：06:00晨记 → 学校课程 → 18:30晚读 → 19:00-22:00晚自习 → 23:00就寝`;
}

// ==================== 推荐引擎 ====================

/**
 * 生成个性化日程推荐
 */
export async function generateScheduleRecommendation(profile: ChildProfile): Promise<ScheduleRecommendation> {
  const systemInstruction = getScheduleKnowledgeBase() + `\n\n
你是一位拥有20年经验的家庭教育顾问和儿童时间管理专家。
请根据用户提供的孩子信息，结合知识库中的各年龄阶段特点、性别差异数据、兴趣班推荐原则和作息框架，
生成一份个性化、可执行的日程推荐方案。

**输出格式要求：返回严格JSON格式**
- summary: 综合整体评价（150字以内）
- weekdaySchedule: 周一到周五的作息数组 [{time,duration,activity,notes?,icon?}]
- weekendSchedule: 周末作息数组
- recommendedActivities: 推荐兴趣班 [{name,category,reason,weeklyHours,recommendedAge,priority}]
- avoidActivities: 不推荐的兴趣方向数组
- parentTips: 给家长的实用建议数组（3-5条）
- subjectAdvice: 各科学习策略 [{subject,status,strategy,resources}]
- developmentPath: 分阶段发展路径 [{phase,timeRange,focus,description}]

关键要求：
1. 严格根据孩子的年龄/年级选择对应的作息框架
2. 区分性别差异，但考虑用户填写的已有兴趣和性格特点
3. 作息表中要预留充足的睡眠时间（幼儿园10-12h，小学生9-11h，初中8-10h，高中7-8h）
4. 所有内容用中文输出`;

  const userInfo = buildUserInfoPrompt(profile);

  try {
    // 使用 aiEngine 的 sendToAI 函数
    const resultText = await sendToAI(userInfo, {});
    
    try {
      // 尝试解析 JSON
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('无法从响应中提取JSON');
    } catch (parseErr) {
      console.error('[ScheduleRecommend] JSON parse failed:', parseErr);
      // 返回本地生成的推荐
      return generateLocalRecommendation(profile);
    }
  } catch (err) {
    console.error('[ScheduleRecommend] AI generation failed:', err);
    // Fallback 到本地推荐
    return generateLocalRecommendation(profile);
  }
}

/**
 * 本地备选方案（当AI不可用时）
 */
function generateLocalRecommendation(profile: ChildProfile): ScheduleRecommendation {
  const age = profile.age || 8;
  const gender = profile.gender || 'boy';
  const grade = profile.grade || getGradeFromAge(age);
  
  // 基础作息模板
  const baseWeekday: TimeSlot[] = [
    { time: '06:30-07:00', duration: '30min', activity: '起床、洗漱', icon: '🌅' },
    { time: '07:00-07:30', duration: '30min', activity: '早餐', icon: '🍳' },
    { time: '07:30-08:00', duration: '30min', activity: '上学准备', icon: '🎒' },
    { time: '08:00-11:30', duration: '3.5h', activity: '上午课程', icon: '📚' },
    { time: '11:30-12:30', duration: '1h', activity: '午餐、休息', icon: '🍱' },
    { time: '12:30-13:30', duration: '1h', activity: '午休/阅读', icon: '😴' },
    { time: '13:30-16:00', duration: '2.5h', activity: '下午课程', icon: '📖' },
    { time: '16:00-17:00', duration: '1h', activity: '课后活动/社团', icon: '⚽' },
    { time: '17:00-17:30', duration: '30min', activity: '放学回家', icon: '🏠' },
    { time: '17:30-18:00', duration: '30min', activity: '休息、点心', icon: '🥤' },
    { time: '18:00-19:00', duration: '1h', activity: '完成学校作业', icon: '✏️' },
    { time: '19:00-19:30', duration: '30min', activity: '晚餐', icon: '🍽️' },
    { time: '19:30-20:30', duration: '1h', activity: age <= 12 ? '阅读/练字' : '复习预习', icon: '📕' },
    { time: '20:30-21:00', duration: '30min', activity: '自由活动', icon: '🎮' },
    { time: '21:00-21:30', duration: '30min', activity: '洗漱、准备睡觉', icon: '🛁' },
    { time: '21:30', duration: '', activity: '入睡', icon: '😴' },
  ];

  const baseWeekend: TimeSlot[] = [
    { time: '07:30-08:00', duration: '30min', activity: '起床', icon: '🌅' },
    { time: '08:00-08:30', duration: '30min', activity: '早餐', icon: '🍳' },
    { time: '08:30-09:30', duration: '1h', activity: '晨读/朗读', icon: '📖' },
    { time: '09:30-11:00', duration: '1.5h', activity: '完成作业', icon: '✏️' },
    { time: '11:00-12:00', duration: '1h', activity: '兴趣活动', icon: '🎨' },
    { time: '12:00-14:00', duration: '2h', activity: '午餐、午休', icon: '😴' },
    { time: '14:00-16:00', duration: '2h', activity: '户外运动', icon: '⚽' },
    { time: '16:00-17:00', duration: '1h', activity: '阅读/兴趣', icon: '📕' },
    { time: '17:00-18:00', duration: '1h', activity: '自由时间', icon: '🎮' },
    { time: '18:00-19:00', duration: '1h', activity: '晚餐', icon: '🍽️' },
    { time: '19:00-20:00', duration: '1h', activity: '家庭时间/亲子活动', icon: '👨‍👩‍👧' },
    { time: '20:00-21:00', duration: '1h', activity: '洗漱、睡前阅读', icon: '📕' },
    { time: '21:30', duration: '', activity: '入睡', icon: '😴' },
  ];

  // 推荐活动
  const activities: RecommendedActivity[] = [];
  if (gender === 'boy') {
    activities.push(
      { name: '篮球', category: '运动', reason: '团队协作+身体发育', weeklyHours: 3, recommendedAge: '6岁+', priority: '强烈推荐' },
      { name: '编程', category: '思维', reason: '逻辑思维+未来技能', weeklyHours: 2, recommendedAge: '6岁+', priority: '推荐' },
      { name: age <= 10 ? '乐高/机器人' : '科学实验', category: '动手', reason: '动手能力+创造力', weeklyHours: 2, recommendedAge: '5岁+', priority: '推荐' },
    );
  } else {
    activities.push(
      { name: '舞蹈', category: '艺术', reason: '形体气质+协调性', weeklyHours: 3, recommendedAge: '4岁+', priority: '强烈推荐' },
      { name: '绘画', category: '艺术', reason: '审美能力+创造力', weeklyHours: 2, recommendedAge: '3岁+', priority: '推荐' },
      { name: '游泳', category: '运动', reason: '全身运动+生存技能', weeklyHours: 2, recommendedAge: '4岁+', priority: '强烈推荐' },
    );
  }

  // 学科建议
  const subjects: SubjectAdvice[] = [
    { subject: '语文', status: '中等', strategy: '注重阅读积累和写作训练', resources: ['课外阅读', '日记写作'] },
    { subject: '数学', status: '中等', strategy: '重视计算基础和逻辑思维', resources: ['练习册', '思维训练'] },
    { subject: '英语', status: '中等', strategy: '多听多说培养语感', resources: ['英文动画', '绘本'] },
  ];

  return {
    summary: `${gender === 'boy' ? '他' : '她'}今年${age}岁${grade ? `，上${grade}` : ''}。根据${age}岁儿童的发展特点，建议重点关注${age <= 10 ? '习惯养成和兴趣启蒙' : '学业效率和自主管理'}。保持充足睡眠(${age <= 6 ? '10-12小时' : age <= 12 ? '9-10小时' : '8-9小时'})是高效学习和健康成长的基础。`,
    weekdaySchedule: baseWeekday,
    weekendSchedule: baseWeekend,
    recommendedActivities: activities,
    avoidActivities: [],
    parentTips: [
      '保证充足的睡眠时间是提高学习效率的基础',
      '每天至少1小时的户外活动有助于身心健康',
      '建立固定的学习时间和地点有助于养成好习惯',
      '电子产品使用应限制在合理范围内',
      '多鼓励少批评，关注过程而非只看结果',
    ],
    subjectAdvice: subjects,
    developmentPath: [
      { phase: '当前阶段', timeRange: '当前-1年内', focus: [age <= 10 ? '习惯养成' : '效率提升'], description: '打好基础，建立良好习惯' },
      { phase: '中期目标', timeRange: '1-2年后', focus: ['能力提升', '兴趣深化'], description: '在已有基础上稳步提升' },
      { phase: '长期发展', timeRange: '2-3年后', focus: ['全面发展'], description: '形成自己的学习方法和节奏' },
    ],
  };
}

function getGradeFromAge(age: number): string {
  if (age <= 3) return '幼儿园小班';
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
  return '高三';
}

export async function refineScheduleRecommendation(
  current: ScheduleRecommendation,
  feedback: string,
): Promise<ScheduleRecommendation> {
  if (!feedback.trim()) return current;
  const prompt = `请根据以下反馈微调日程方案，保持原 JSON 结构。反馈：${feedback}\n原方案：${JSON.stringify(current)}`;
  try {
    const resultText = await sendToAI(prompt, {});
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : current;
  } catch {
    return current;
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
  parts.push(`每天可自由支配时间: ${profile.freeTimePerDay ?? '未说明'}小时`);

  parts.push('\n=== 性格特点 ===');
  parts.push(`性格描述: ${profile.personality.length > 0 ? profile.personality.join('、') : '未说明'}`);

  parts.push('\n=== 家长期望 ===');
  parts.push(`期望方向: ${profile.parentExpectation.length > 0 ? profile.parentExpectation.join('、') : '未说明'}`);
  parts.push(`月预算: ${profile.budget ?? '未说明'}元`);

  parts.push('\n=== 其他信息 ===');
  parts.push(`电子设备使用: ${profile.screenTime || '未说明'}`);
  parts.push(`健康注意事项: ${profile.healthNotes || '无'}`);

  return parts.join('\n');
}

/** 获取默认的孩子信息模板 */
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

/** 年级→年龄映射 */
export function getAgeFromGrade(grade: string): number {
  const map: Record<string, number> = {
    '幼儿园小班': 3, '幼儿园中班': 4, '幼儿园大班': 5,
    '一年级': 6, '二年级': 7, '三年级': 8,
    '四年级': 9, '五年级': 10, '六年级': 11,
    '初一': 12, '初二': 13, '初三': 14,
    '高一': 15, '高二': 16, '高三': 17,
  };
  return map[grade] || 8;
}
