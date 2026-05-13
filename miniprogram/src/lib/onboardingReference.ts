/**
 * AI 新手引导 - 本地参考数据库
 * 基于网络搜索整理的各年龄段日程表、习惯培养、兴趣班推荐等数据
 */

// ==================== 年龄段定义 ====================
export type AgeGroup = 'kindergarten' | 'primary' | 'middle' | 'high';
export type Gender = 'boy' | 'girl' | 'unknown';
export type Priority = 'study' | 'health' | 'chores' | 'social' | 'creativity';

// ==================== 幼儿园阶段 (3-6岁) ====================
export const kindergartenSchedule = {
  ageRange: '3-6岁',
  dailyRoutine: {
    '07:00-07:30': '起床、洗漱',
    '07:30-08:00': '早餐',
    '08:00-08:30': '入园准备、整理物品',
    '08:30-09:00': '晨间活动、早操',
    '09:00-09:30': '点心时间',
    '09:30-10:30': '学习活动（集体/小组）',
    '10:30-11:30': '户外活动、体育锻炼',
    '11:30-12:00': '午餐准备、洗手',
    '12:00-12:30': '午餐',
    '12:30-14:30': '午睡',
    '14:30-15:00': '起床整理、点心',
    '15:00-16:00': '游戏活动/区域活动',
    '16:00-17:00': '户外活动',
    '17:00-17:30': '离园准备',
    '17:30-18:00': '晚餐',
    '18:00-19:00': '自由活动/亲子阅读',
    '19:00-20:00': '洗漱、睡前准备',
    '20:00-20:30': '亲子互动/讲故事',
    '20:30-21:00': '入睡',
  },
  recommendedTasks: [
    {
      category: '自理能力',
      tasks: [
        { name: '自己穿衣服', frequency: 'daily', points: 2, description: '独立穿脱衣物，整理衣服' },
        { name: '自己吃饭', frequency: 'daily', points: 2, description: '独立用餐，不挑食' },
        { name: '自己洗手', frequency: 'daily', points: 1, description: '饭前便后洗手' },
        { name: '整理玩具', frequency: 'daily', points: 2, description: '玩完玩具放回原处' },
        { name: '自己刷牙', frequency: 'daily', points: 2, description: '早晚刷牙，保持口腔卫生' },
        { name: '自己上厕所', frequency: 'daily', points: 1, description: '独立如厕，会擦屁股' },
      ],
    },
    {
      category: '生活习惯',
      tasks: [
        { name: '按时起床', frequency: 'daily', points: 2, description: '早上7点前起床' },
        { name: '按时睡觉', frequency: 'daily', points: 2, description: '晚上9点前入睡' },
        { name: '喝水', frequency: 'daily', points: 1, description: '主动喝水，保持水分' },
        { name: '收拾书包', frequency: 'daily', points: 2, description: '整理入园物品' },
      ],
    },
    {
      category: '社交礼仪',
      tasks: [
        { name: '主动问好', frequency: 'daily', points: 1, description: '见到长辈老师主动问好' },
        { name: '分享玩具', frequency: 'weekly', points: 3, description: '和小朋友分享玩具' },
        { name: '说谢谢', frequency: 'daily', points: 1, description: '得到帮助时说谢谢' },
      ],
    },
  ],
  ageSpecificTasks: {
    '3-4': { focus: '基础自理能力', tasks: ['自己吃饭', '自己上厕所', '收拾玩具', '主动问好'] },
    '4-5': { focus: '社交与规则', tasks: ['自己穿衣服', '自己刷牙', '分享玩具', '整理书包'] },
    '5-6': { focus: '入学准备', tasks: ['自己整理物品', '按时完成作业', '阅读绘本', '写字练习'] },
  },
};

// ==================== 小学阶段 (7-12岁) ====================
export const primarySchedule = {
  ageRange: '7-12岁',
  dailyRoutine: {
    weekday: {
      '06:30-06:45': '起床、洗漱',
      '06:45-07:00': '晨读（语文/英语）',
      '07:00-07:20': '早餐',
      '07:20-07:40': '上学准备',
      '07:40-08:00': '到校',
      '08:00-11:30': '上午课程',
      '11:30-12:00': '午餐',
      '12:00-13:30': '午休/午练',
      '13:30-16:00': '下午课程',
      '16:00-17:00': '课后服务/社团活动',
      '17:00-17:30': '放学回家',
      '17:30-18:00': '休息/点心',
      '18:00-19:00': '完成作业',
      '19:00-19:30': '晚餐',
      '19:30-20:30': '复习预习/阅读',
      '20:30-21:00': '自由活动',
      '21:00-21:30': '洗漱、准备睡觉',
      '21:30': '入睡',
    },
    weekend: {
      '07:30-08:00': '起床',
      '08:00-08:30': '早餐',
      '08:30-09:30': '晨读/朗读',
      '09:30-11:00': '完成作业',
      '11:00-12:00': '兴趣活动/课外班',
      '12:00-14:00': '午餐、午休',
      '14:00-16:00': '户外活动/运动',
      '16:00-17:00': '阅读/兴趣时间',
      '17:00-18:00': '自由时间',
      '18:00-19:00': '晚餐',
      '19:00-20:00': '家庭时间/亲子活动',
      '20:00-21:00': '洗漱、睡前阅读',
      '21:30': '入睡',
    },
  },
  recommendedTasks: [
    {
      category: '学习习惯',
      tasks: [
        { name: '按时完成作业', frequency: 'daily', points: 5, description: '每天按时完成学校作业' },
        { name: '预习新课', frequency: 'daily', points: 3, description: '预习第二天课程内容' },
        { name: '复习当天', frequency: 'daily', points: 3, description: '复习当天所学知识' },
        { name: '阅读30分钟', frequency: 'daily', points: 3, description: '每天阅读课外书籍' },
        { name: '整理书包', frequency: 'daily', points: 2, description: '睡前整理第二天书包' },
        { name: '练字', frequency: 'daily', points: 2, description: '每天练字15-20分钟' },
      ],
    },
    {
      category: '生活习惯',
      tasks: [
        { name: '按时起床', frequency: 'daily', points: 2, description: '早上6:30-7:00起床' },
        { name: '自己整理房间', frequency: 'daily', points: 3, description: '保持房间整洁' },
        { name: '帮忙做家务', frequency: 'daily', points: 3, description: '做力所能及的家务' },
        { name: '按时睡觉', frequency: 'daily', points: 2, description: '晚上9:30前入睡' },
        { name: '自己准备衣物', frequency: 'daily', points: 2, description: '自己准备第二天衣物' },
      ],
    },
    {
      category: '健康运动',
      tasks: [
        { name: '户外运动', frequency: 'daily', points: 3, description: '每天户外活动1小时' },
        { name: '眼保健操', frequency: 'daily', points: 1, description: '认真做眼保健操' },
        { name: '喝水8杯', frequency: 'daily', points: 2, description: '每天喝足够的水' },
      ],
    },
  ],
  gradeSpecific: {
    '1-2': { focus: '适应小学、培养习惯', tasks: ['按时完成作业', '整理书包', '阅读绘本', '按时起床睡觉'], studyTime: '每天学习1-1.5小时' },
    '3-4': { focus: '巩固基础、拓展阅读', tasks: ['预习复习', '阅读30分钟', '练字', '户外运动'], studyTime: '每天学习1.5-2小时' },
    '5-6': { focus: '小升初准备、自主学习', tasks: ['自主完成作业', '系统复习', '错题整理', '时间管理'], studyTime: '每天学习2-2.5小时' },
  },
};

// ==================== 初中阶段 (13-15岁) ====================
export const middleSchoolSchedule = {
  ageRange: '13-15岁',
  dailyRoutine: {
    weekday: {
      '06:00-06:20': '起床、洗漱',
      '06:20-06:40': '晨读/背诵',
      '06:40-07:00': '早餐',
      '07:00-07:30': '上学',
      '07:30-12:00': '上午课程',
      '12:00-12:30': '午餐',
      '12:30-13:30': '午休/自习',
      '13:30-17:30': '下午课程',
      '17:30-18:30': '晚餐、休息',
      '18:30-21:30': '晚自习/作业时间',
      '21:30-22:00': '洗漱、准备睡觉',
      '22:00-22:30': '睡前阅读/放松',
      '22:30': '入睡',
    },
    weekend: {
      '07:30-08:00': '起床',
      '08:00-08:30': '早餐',
      '08:30-10:00': '薄弱科目学习',
      '10:00-12:00': '作业/复习',
      '12:00-14:00': '午餐、午休',
      '14:00-16:00': '专项练习/课外班',
      '16:00-17:30': '运动/兴趣活动',
      '17:30-18:30': '晚餐',
      '18:30-20:30': '自主学习/阅读',
      '20:30-21:30': '自由时间',
      '21:30-22:00': '洗漱',
      '22:30': '入睡',
    },
  },
  recommendedTasks: [
    {
      category: '学习习惯',
      tasks: [
        { name: '制定学习计划', frequency: 'daily', points: 3, description: '每天制定学习任务清单' },
        { name: '课堂笔记', frequency: 'daily', points: 3, description: '认真记录课堂笔记' },
        { name: '错题整理', frequency: 'weekly', points: 5, description: '整理错题本，分析错误' },
        { name: '预习复习', frequency: 'daily', points: 4, description: '课前预习，课后复习' },
        { name: '独立思考', frequency: 'daily', points: 4, description: '先独立思考再求助' },
      ],
    },
    {
      category: '自我管理',
      tasks: [
        { name: '时间管理', frequency: 'daily', points: 3, description: '合理安排学习与休息' },
        { name: '电子产品管理', frequency: 'daily', points: 4, description: '控制手机使用时间' },
        { name: '房间整理', frequency: 'weekly', points: 3, description: '保持学习环境整洁' },
        { name: '作息规律', frequency: 'daily', points: 3, description: '按时作息，保证睡眠' },
      ],
    },
    {
      category: '身心健康',
      tasks: [
        { name: '每日运动', frequency: 'daily', points: 3, description: '每天运动30-60分钟' },
        { name: '眼保健操', frequency: 'daily', points: 1, description: '保护视力' },
        { name: '情绪管理', frequency: 'daily', points: 3, description: '学会调节情绪' },
      ],
    },
  ],
};

// ==================== 高中阶段 (16-18岁) ====================
export const highSchoolSchedule = {
  ageRange: '16-18岁',
  dailyRoutine: {
    weekday: {
      '05:50-06:10': '起床、洗漱',
      '06:10-06:40': '晨读/早自习',
      '06:40-07:10': '早餐',
      '07:10-07:40': '到校准备',
      '07:40-12:00': '上午课程',
      '12:00-12:30': '午餐',
      '12:30-13:30': '午休/自习',
      '13:30-17:30': '下午课程',
      '17:30-18:30': '晚餐、休息',
      '18:30-22:30': '晚自习',
      '22:30-23:00': '回宿舍/回家',
      '23:00-23:30': '洗漱、准备睡觉',
      '23:30': '入睡',
    },
    weekend: {
      '07:00-07:30': '起床',
      '07:30-08:00': '早餐',
      '08:00-12:00': '自主学习/补习',
      '12:00-14:00': '午餐、午休',
      '14:00-17:30': '专项突破/模拟测试',
      '17:30-18:30': '晚餐',
      '18:30-21:30': '复习总结',
      '21:30-22:00': '运动/放松',
      '22:00-22:30': '洗漱',
      '23:00': '入睡',
    },
  },
  recommendedTasks: [
    {
      category: '学习策略',
      tasks: [
        { name: '制定周计划', frequency: 'weekly', points: 5, description: '每周制定学习目标' },
        { name: '知识梳理', frequency: 'daily', points: 4, description: '构建知识体系框架' },
        { name: '真题练习', frequency: 'weekly', points: 5, description: '定期做真题模拟' },
        { name: '查漏补缺', frequency: 'daily', points: 4, description: '针对薄弱环节强化' },
        { name: '总结反思', frequency: 'daily', points: 3, description: '每日学习总结' },
      ],
    },
    {
      category: '自主管理',
      tasks: [
        { name: '时间规划', frequency: 'daily', points: 4, description: '精细化时间管理' },
        { name: '压力调节', frequency: 'daily', points: 4, description: '学会释放学习压力' },
        { name: '目标管理', frequency: 'weekly', points: 5, description: '明确阶段目标' },
        { name: '作息自律', frequency: 'daily', points: 3, description: '保持规律作息' },
      ],
    },
  ],
};

// ==================== 兴趣班推荐（区分男女） ====================
export const extracurricularActivities = {
  sports: {
    common: [
      { name: '游泳', age: '4岁+', benefit: '全身运动，生存技能', gender: 'both' },
      { name: '篮球', age: '6岁+', benefit: '团队协作，身高发育', gender: 'both' },
      { name: '羽毛球', age: '6岁+', benefit: '反应速度，视力保护', gender: 'both' },
      { name: '乒乓球', age: '5岁+', benefit: '专注力，反应力', gender: 'both' },
    ],
    boyRecommended: [
      { name: '足球', age: '5岁+', benefit: '团队意识，体能锻炼' },
      { name: '跆拳道', age: '5岁+', benefit: '自信心，自我保护' },
      { name: '武术', age: '5岁+', benefit: '传统文化，身体素质' },
    ],
    girlRecommended: [
      { name: '舞蹈', age: '4岁+', benefit: '形体气质，艺术修养' },
      { name: '体操', age: '5岁+', benefit: '柔韧性，协调性' },
      { name: '花样滑冰', age: '5岁+', benefit: '优雅气质，平衡感' },
    ],
  },
  arts: {
    common: [
      { name: '绘画', age: '3岁+', benefit: '创造力，审美能力', gender: 'both' },
      { name: '书法', age: '6岁+', benefit: '专注力，传统文化', gender: 'both' },
    ],
    boyRecommended: [
      { name: '素描', age: '8岁+', benefit: '空间思维，观察力' },
      { name: '乐高/机器人', age: '5岁+', benefit: '逻辑思维，动手能力' },
    ],
    girlRecommended: [
      { name: '芭蕾', age: '4岁+', benefit: '形体训练，气质培养' },
      { name: '钢琴', age: '4岁+', benefit: '音乐素养，左右脑开发' },
      { name: '手工/陶艺', age: '4岁+', benefit: '精细动作，创造力' },
    ],
  },
  stem: {
    common: [
      { name: '编程', age: '6岁+', benefit: '逻辑思维，未来技能', gender: 'both' },
      { name: '科学实验', age: '5岁+', benefit: '探索精神，科学思维', gender: 'both' },
      { name: '棋类', age: '5岁+', benefit: '策略思维，专注力', gender: 'both' },
    ],
    boyRecommended: [
      { name: '机器人', age: '7岁+', benefit: '工程思维，动手能力' },
      { name: '围棋', age: '6岁+', benefit: '战略思维，耐心' },
    ],
    girlRecommended: [
      { name: '逻辑思维', age: '5岁+', benefit: '数学思维，推理能力' },
    ],
  },
  language: {
    common: [
      { name: '英语', age: '3岁+', benefit: '语言能力，国际视野', gender: 'both' },
      { name: '口才/演讲', age: '5岁+', benefit: '表达能力，自信心', gender: 'both' },
    ],
    boyRecommended: [
      { name: '讲故事', age: '4岁+', benefit: '语言表达，想象力' },
    ],
    girlRecommended: [
      { name: '主持', age: '6岁+', benefit: '台风气质，表达力' },
      { name: '朗诵', age: '5岁+', benefit: '语感培养，情感表达' },
    ],
  },
};

// ==================== 基于优先级的推荐权重 ====================
export const priorityWeights = {
  study: {
    name: '学习优先',
    description: '侧重学业成绩和学习习惯培养',
    taskMultiplier: { '学习习惯': 1.5, '生活习惯': 1.0, '健康运动': 0.8, '社交礼仪': 0.7 },
    recommendedActivities: ['阅读', '练字', '预习复习', '错题整理'],
  },
  health: {
    name: '健康优先',
    description: '侧重身体健康和运动习惯',
    taskMultiplier: { '健康运动': 1.5, '生活习惯': 1.2, '学习习惯': 1.0, '社交礼仪': 0.8 },
    recommendedActivities: ['游泳', '篮球', '户外运动', '规律作息'],
  },
  chores: {
    name: '家务优先',
    description: '侧重生活自理和责任感培养',
    taskMultiplier: { '生活习惯': 1.5, '自理能力': 1.3, '学习习惯': 1.0, '健康运动': 0.9 },
    recommendedActivities: ['整理房间', '帮忙做饭', '洗碗', '洗衣服'],
  },
  social: {
    name: '社交优先',
    description: '侧重社交能力和情商培养',
    taskMultiplier: { '社交礼仪': 1.5, '生活习惯': 1.0, '学习习惯': 1.0, '健康运动': 1.0 },
    recommendedActivities: ['团队运动', '口才', '集体活动', '志愿服务'],
  },
  creativity: {
    name: '创造力优先',
    description: '侧重要创造力和艺术修养',
    taskMultiplier: { '学习习惯': 1.0, '生活习惯': 1.0, '健康运动': 0.9, '社交礼仪': 1.0 },
    recommendedActivities: ['绘画', '音乐', '手工', '编程', '科学实验'],
  },
};

// ==================== 家庭类型推荐 ====================
export const familyTypeRecommendations = {
  nuclear: { name: '核心家庭', description: '父母+孩子', characteristics: '关注度高，时间相对充裕', focusAreas: ['亲子陪伴', '习惯养成', '全面发展'] },
  extended: { name: '大家庭', description: '三代同堂或多子女', characteristics: '需要协调多代人教育理念', focusAreas: ['代际沟通', '兄弟姐妹关系', '独立能力'] },
  singleParent: { name: '单亲家庭', description: '单亲抚养', characteristics: '时间精力有限，需要高效管理', focusAreas: ['时间管理', '孩子独立性', '情感支持'] },
};

// ==================== 辅助函数 ====================

/** 根据年龄获取年级 */
export function getGradeFromAge(age: number): string {
  if (age <= 3) return '幼儿园小班';
  if (age === 4) return '幼儿园中班';
  if (age === 5) return '幼儿园大班';
  if (age === 6) return '小学一年级';
  const map: Record<number, string> = { 7: '小学二年级', 8: '小学三年级', 9: '小学四年级', 10: '小学五年级', 11: '小学六年级', 12: '初中一年级', 13: '初中二年级', 14: '初中三年级', 15: '高中一年级', 16: '高中二年级', 17: '高中三年级' };
  return map[age] || '高中三年级';
}

/** 获取年龄段 */
export function getAgeGroup(age: number): AgeGroup {
  if (age <= 6) return 'kindergarten';
  if (age <= 12) return 'primary';
  if (age <= 15) return 'middle';
  return 'high';
}

/** 根据年龄段获取日程 */
export function getScheduleByAgeGroup(ageGroup: AgeGroup) {
  switch (ageGroup) {
    case 'kindergarten': return kindergartenSchedule.dailyRoutine;
    case 'primary': return primarySchedule.dailyRoutine;
    case 'middle': return middleSchoolSchedule.dailyRoutine;
    case 'high': return highSchoolSchedule.dailyRoutine;
  }
}

/** 根据年龄段获取任务 */
export function getTasksByAgeGroup(ageGroup: AgeGroup) {
  switch (ageGroup) {
    case 'kindergarten': return kindergartenSchedule.recommendedTasks;
    case 'primary': return primarySchedule.recommendedTasks;
    case 'middle': return middleSchoolSchedule.recommendedTasks;
    case 'high': return highSchoolSchedule.recommendedTasks;
  }
}

// ==================== 导出所有数据 ====================
export const onboardingReferenceData = {
  kindergarten: kindergartenSchedule,
  primary: primarySchedule,
  middle: middleSchoolSchedule,
  high: highSchoolSchedule,
  activities: extracurricularActivities,
  priorities: priorityWeights,
  familyTypes: familyTypeRecommendations,
};

export default onboardingReferenceData;
