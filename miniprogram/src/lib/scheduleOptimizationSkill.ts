import type { ChildProfile, ScheduleRecommendation, SubjectAdvice } from './scheduleRecommendAI';

export type ScheduleStageKey = 'preschool' | 'lower_primary' | 'middle_primary' | 'upper_primary' | 'junior_middle' | 'senior_high';

export interface ScheduleOptimizationStage {
  key: ScheduleStageKey;
  label: string;
  shortLabel: string;
  ageRange: string;
  sleepTarget: string;
  coreFocus: string[];
}

export interface ScheduleOptimizationSkill {
  stage: ScheduleOptimizationStage;
  profile: ChildProfile;
  academicStepTitle: string;
  academicStepDescription: string;
  strengthLabel: string;
  challengeLabel: string;
  homeworkLabel: string;
  homeworkPlaceholder: string;
  freeTimeLabel: string;
  freeTimePlaceholder: string;
  subjectOptions: string[];
  interestOptions: { all: string[]; boy: string[]; girl: string[] };
  parentExpectationOptions: string[];
  aiRules: string[];
  sourceNotes: string[];
  commercialRecommendationAngles: string[];
}

const STAGES: Record<ScheduleStageKey, ScheduleOptimizationStage> = {
  preschool: { key: 'preschool', label: '幼儿园阶段', shortLabel: '幼儿园', ageRange: '3-6岁', sleepTarget: '10-13小时', coreFocus: ['规律作息', '生活自理', '语言表达', '同伴交往', '户外运动'] },
  lower_primary: { key: 'lower_primary', label: '小学低年级', shortLabel: '低年级', ageRange: '6-8岁', sleepTarget: '10小时左右', coreFocus: ['学习习惯', '阅读书写', '计算基础', '整理能力', '运动习惯'] },
  middle_primary: { key: 'middle_primary', label: '小学中年级', shortLabel: '中年级', ageRange: '9-10岁', sleepTarget: '9-10小时', coreFocus: ['独立作业', '错题复盘', '阅读写作', '兴趣筛选'] },
  upper_primary: { key: 'upper_primary', label: '小学高年级', shortLabel: '高年级', ageRange: '11-12岁', sleepTarget: '9小时左右', coreFocus: ['自主学习', '小升初衔接', '时间管理', '兴趣聚焦'] },
  junior_middle: { key: 'junior_middle', label: '初中阶段', shortLabel: '初中', ageRange: '12-15岁', sleepTarget: '8-9小时', coreFocus: ['多科平衡', '弱科突破', '错题体系', '运动减压'] },
  senior_high: { key: 'senior_high', label: '高中阶段', shortLabel: '高中', ageRange: '15-18岁', sleepTarget: '8小时左右', coreFocus: ['升学目标', '选科策略', '高效复盘', '压力管理'] },
};

const PRESCHOOL_SUBJECTS = ['语言表达', '生活自理', '同伴交往', '户外运动', '精细动作', '专注等待', '情绪表达', '亲子阅读', '艺术感受', '自然观察', '数学启蒙'];
const LOWER_PRIMARY_SUBJECTS = ['阅读表达', '书写习惯', '计算基础', '英语听说', '专注完成', '整理书包', '运动习惯', '科学探索'];
const MIDDLE_PRIMARY_SUBJECTS = ['语文', '数学', '英语', '科学', '阅读写作', '计算应用', '错题复盘', '运动体能'];
const UPPER_PRIMARY_SUBJECTS = ['语文', '数学', '英语', '科学', '阅读写作', '应用题', '预习复习', '自主学习'];
const JUNIOR_SUBJECTS = ['语文', '数学', '英语', '道法', '历史', '地理', '生物', '物理', '化学', '体育'];
const SENIOR_SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '体育'];
const ADVANCED_SUBJECTS = ['物理', '化学', '生物', '历史', '地理', '政治', '道法'];
const PRESCHOOL_FORBIDDEN = ['语文', '数学', '英语', ...ADVANCED_SUBJECTS, '编程'];

const PRESCHOOL_INTERESTS = ['体能游戏', '游泳启蒙', '创意美术', '音乐律动', '绘本阅读', '乐高拼搭', '自然观察', '平衡车', '亲子运动', '表达小剧场', '生活自理小游戏', '手工黏土'];
const LOWER_PRIMARY_INTERESTS = ['跳绳', '游泳', '篮球启蒙', '足球启蒙', '武术/跆拳道', '绘画', '钢琴启蒙', '合唱/声乐', '硬笔启蒙', '围棋', '乐高/机器人', '英语听说', '演讲口才', '科学实验'];
const BOY_INTERESTS = ['篮球', '足球', '游泳', '武术/跆拳道', '编程', '围棋/象棋', '乐高/机器人', '架子鼓', '街舞', '画画', '轮滑', '科学实验', '演讲口才', '英语', '书法', '乒乓球', '羽毛球', '网球', '天文', '航模', '吉他'];
const GIRL_INTERESTS = ['中国舞/芭蕾', '钢琴', '画画', '游泳', '英语', '演讲口才', '书法', '羽毛球', '声乐', '陶艺/手工', '小提琴', '围棋', '编程', '中国舞/拉丁', '溜冰/轮滑', '乒乓球', '科学实验', '花样滑冰', '古筝', '瑜伽'];

function uniq(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function inferAgeFromGrade(grade: string): number | null {
  const map: Record<string, number> = { 幼儿园小班: 3, 幼儿园中班: 4, 幼儿园大班: 5, 一年级: 6, 二年级: 7, 三年级: 8, 四年级: 9, 五年级: 10, 六年级: 11, 初一: 12, 初二: 13, 初三: 14, 高一: 15, 高二: 16, 高三: 17 };
  return map[grade] ?? null;
}

export function inferScheduleOptimizationStage(profile: Pick<ChildProfile, 'age' | 'grade'>): ScheduleOptimizationStage {
  const age = profile.age ?? inferAgeFromGrade(profile.grade);
  const grade = profile.grade || '';
  if (/幼儿|托班|小班|中班|大班/.test(grade) || (age !== null && age <= 5)) return STAGES.preschool;
  if (/一年级|二年级/.test(grade) || (age !== null && age <= 8)) return STAGES.lower_primary;
  if (/三年级|四年级/.test(grade) || (age !== null && age <= 10)) return STAGES.middle_primary;
  if (/五年级|六年级/.test(grade) || (age !== null && age <= 12)) return STAGES.upper_primary;
  if (/初|七|八|九/.test(grade) || (age !== null && age <= 15)) return STAGES.junior_middle;
  return STAGES.senior_high;
}

function getSubjectOptions(stage: ScheduleOptimizationStage): string[] {
  if (stage.key === 'preschool') return PRESCHOOL_SUBJECTS;
  if (stage.key === 'lower_primary') return LOWER_PRIMARY_SUBJECTS;
  if (stage.key === 'middle_primary') return MIDDLE_PRIMARY_SUBJECTS;
  if (stage.key === 'upper_primary') return UPPER_PRIMARY_SUBJECTS;
  if (stage.key === 'junior_middle') return JUNIOR_SUBJECTS;
  return SENIOR_SUBJECTS;
}

function getForbiddenSubjects(stage: ScheduleOptimizationStage): string[] {
  if (stage.key === 'preschool') return PRESCHOOL_FORBIDDEN;
  if (stage.key === 'lower_primary') return ADVANCED_SUBJECTS;
  if (stage.key === 'middle_primary' || stage.key === 'upper_primary') return ['物理', '化学', '生物', '历史', '地理', '政治', '道法'];
  return [];
}

function isAllowedSubject(stage: ScheduleOptimizationStage, subject: string): boolean {
  return getSubjectOptions(stage).includes(subject) || !getForbiddenSubjects(stage).includes(subject);
}

function getInterestOptions(stage: ScheduleOptimizationStage) {
  if (stage.key === 'preschool') return { all: PRESCHOOL_INTERESTS, boy: PRESCHOOL_INTERESTS, girl: PRESCHOOL_INTERESTS };
  if (stage.key === 'lower_primary') return { all: LOWER_PRIMARY_INTERESTS, boy: uniq([...LOWER_PRIMARY_INTERESTS, '篮球启蒙', '足球启蒙']), girl: uniq([...LOWER_PRIMARY_INTERESTS, '中国舞启蒙', '创意美术']) };
  return { all: uniq([...BOY_INTERESTS, ...GIRL_INTERESTS]), boy: BOY_INTERESTS, girl: GIRL_INTERESTS };
}

function getParentExpectationOptions(stage: ScheduleOptimizationStage): string[] {
  if (stage.key === 'preschool') return ['规律作息', '生活自理', '语言表达', '同伴交往', '户外运动', '情绪稳定', '亲子陪伴', '兴趣启蒙'];
  if (stage.key === 'lower_primary') return ['学习习惯', '阅读书写', '计算基础', '整理能力', '运动习惯', '自信表达', '减少磨蹭', '兴趣探索'];
  if (stage.key === 'middle_primary' || stage.key === 'upper_primary') return ['提升学习效率', '查漏补缺', '阅读写作', '数学思维', '兴趣聚焦', '运动健康', '自主安排', '小升初衔接'];
  return ['升学规划', '弱科突破', '时间管理', '运动减压', '自主学习', '心理韧性', '选科方向', '竞赛/特长'];
}

function getSourceNotes(stage: ScheduleOptimizationStage): string[] {
  if (stage.key === 'preschool') {
    return [
      '参考3-6岁儿童学习与发展指南：健康、语言、社会、科学、艺术是幼儿发展主线。',
      '参考知乎/小红书类家长社区经验：幼儿阶段优先解决睡眠、户外、生活自理、亲子阅读、情绪稳定和低压兴趣体验。',
    ];
  }
  if (stage.key === 'lower_primary') {
    return [
      '参考中小学生睡眠和作业管理要求：低年级要控制作业负担，优先建立学习习惯。',
      '参考知乎/小红书类家长社区经验：一二年级重点不是刷难题，而是阅读、书写、计算、整理、跳绳运动和专注完成。',
    ];
  }
  return [
    '参考中小学阶段作业、睡眠和体育健康要求：学习效率不能牺牲睡眠和运动。',
    '参考知乎/小红书类家长社区经验：越到高年级越需要聚焦弱项和可持续复盘，而不是简单堆课。',
  ];
}

function getCommercialAngles(stage: ScheduleOptimizationStage): string[] {
  if (stage.key === 'preschool') return ['体能/感统', '绘本阅读', '创意美术', '生活自理工具', '亲子活动', '自然探索'];
  if (stage.key === 'lower_primary') return ['阅读分级', '书写习惯', '计算基础', '运动启蒙', '英语听说', '学习桌面管理'];
  if (stage.key === 'middle_primary' || stage.key === 'upper_primary') return ['错题复盘', '阅读写作', '数学思维', '科学实验', '运动训练', '小升初规划'];
  return ['弱科诊断', '考试规划', '选科咨询', '心理减压', '体育健康', '高效学习工具'];
}

function buildAiRules(stage: ScheduleOptimizationStage): string[] {
  const base = [`先判断孩子处于${stage.label}，所有问题、日程、商业推荐都必须服从这个年龄阶段。`, '输出要结合年龄、年级、城市、学校类型、已有课外班、家庭预算、性格、屏幕时间和家长期望，不套固定模板。'];
  if (stage.key === 'preschool') return [...base, '禁止把幼儿园孩子包装成学科补习模型；不能出现物理、化学、历史、地理、政治、生物等学科强化建议。', '推荐以体能游戏、绘本共读、生活自理、表达小剧场、自然观察、创意美术为主。'];
  if (stage.key === 'lower_primary') return [...base, '小学低年级只做基础学习能力和习惯建模，避免初高中学科提前化。'];
  if (stage.key === 'middle_primary' || stage.key === 'upper_primary') return [...base, '小学中高年级可以讨论语数英科学，但不能引入物理化学等初中学科。'];
  return [...base, '初高中可以进入多学科时间管理，但仍要结合具体年级。'];
}

export function sanitizeChildProfileForScheduleStage(profile: ChildProfile): ChildProfile {
  const stage = inferScheduleOptimizationStage(profile);
  const filter = (items: string[]) => uniq(items).filter(item => isAllowedSubject(stage, item));
  return { ...profile, strongSubjects: filter(profile.strongSubjects), weakSubjects: filter(profile.weakSubjects) };
}

export function buildScheduleOptimizationSkill(profile: ChildProfile): ScheduleOptimizationSkill {
  const stage = inferScheduleOptimizationStage(profile);
  const isPreschool = stage.key === 'preschool';
  const isLowerPrimary = stage.key === 'lower_primary';
  return {
    stage,
    profile: sanitizeChildProfileForScheduleStage(profile),
    academicStepTitle: isPreschool ? '发展重点与陪伴时间' : isLowerPrimary ? '学习习惯与时间' : '学业与时间',
    academicStepDescription: isPreschool ? '了解生活能力、表达、运动和亲子陪伴时间。' : isLowerPrimary ? '先看基础学习习惯、作业节奏和放学后的可用时间。' : '了解当前学科状态、作业时长和可调整的课后时间。',
    strengthLabel: isPreschool ? '已经表现不错的方向' : isLowerPrimary ? '已经比较稳定的能力' : '强项科目',
    challengeLabel: isPreschool ? '希望慢慢加强的能力' : isLowerPrimary ? '希望建立的学习习惯' : '需要提升的科目',
    homeworkLabel: isPreschool ? '每天适合安排多久亲子陪伴/游戏化练习？' : isLowerPrimary ? '每天完成作业和整理大约需要多久？' : '每天完成学校作业大约需要多久？',
    homeworkPlaceholder: isPreschool ? '例如：20' : isLowerPrimary ? '例如：40' : '例如：60',
    freeTimeLabel: isPreschool ? '每天可用于户外、自由玩和亲子陪伴的时间？' : '放学后每天大约有多少可自由支配的时间？',
    freeTimePlaceholder: isPreschool ? '例如：3' : '例如：2',
    subjectOptions: getSubjectOptions(stage),
    interestOptions: getInterestOptions(stage),
    parentExpectationOptions: getParentExpectationOptions(stage),
    aiRules: buildAiRules(stage),
    sourceNotes: getSourceNotes(stage),
    commercialRecommendationAngles: getCommercialAngles(stage),
  };
}

export function buildScheduleOptimizationSkillPrompt(profile: ChildProfile): string {
  const skill = buildScheduleOptimizationSkill(profile);
  return [
    `## 专用技能：智能日程优化 - ${skill.stage.label}`,
    `核心目标：${skill.stage.coreFocus.join('、')}`,
    `睡眠兜底：${skill.stage.sleepTarget}`,
    `可询问/分析方向：${skill.subjectOptions.join('、')}`,
    `商业推荐方向：${skill.commercialRecommendationAngles.join('、')}`,
    ...skill.aiRules.map(rule => `- ${rule}`),
    ...skill.sourceNotes.map(note => `- ${note}`),
  ].join('\n');
}

export function sanitizeScheduleRecommendationForStage(recommendation: ScheduleRecommendation, profile: ChildProfile): ScheduleRecommendation {
  const skill = buildScheduleOptimizationSkill(profile);
  const subjectAdvice: SubjectAdvice[] = recommendation.subjectAdvice.filter(item => isAllowedSubject(skill.stage, item.subject));
  return {
    ...recommendation,
    subjectAdvice,
    avoidActivities: uniq([...recommendation.avoidActivities, ...(skill.stage.key === 'preschool' ? ['提前学科补习', '长时间刷题', '睡前使用屏幕'] : [])]),
  };
}
