export type CommunityTemplateStatus = 'featured' | 'local' | 'reviewing';

export interface CommunityScheduleSlot {
  id: string;
  time: string;
  title: string;
  description: string;
  category: string;
}

export interface CommunityTemplate {
  id: string;
  title: string;
  author: string;
  scene: string;
  ageRange: string;
  cityLevel: string;
  tags: string[];
  likes: number;
  uses: number;
  qualityScore: number;
  status: CommunityTemplateStatus;
  summary: string;
  slots: CommunityScheduleSlot[];
}

export const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
  {
    id: 'weekday-third-grade-balanced',
    title: '三年级工作日稳态安排',
    author: '北京双职工家庭',
    scene: '工作日',
    ageRange: '8-10岁',
    cityLevel: '一线城市',
    tags: ['作业节奏', '运动', '阅读'],
    likes: 128,
    uses: 46,
    qualityScore: 92,
    status: 'featured',
    summary: '适合双职工家庭，放学后先补能量，再分段完成作业和阅读，避免晚上堆积。',
    slots: [
      { id: 's1', time: '16:30-17:00', title: '回家休整和加餐', description: '先让孩子放松，补充能量后再进入任务。', category: '生活' },
      { id: 's2', time: '17:00-17:35', title: '数学或语文主作业', description: '优先处理最需要专注的科目。', category: '学习' },
      { id: 's3', time: '17:45-18:05', title: '跳绳或户外活动', description: '用短运动释放精力，保护后续专注度。', category: '运动' },
      { id: 's4', time: '20:10-20:35', title: '亲子阅读', description: '睡前做低压力输入，家长只做陪伴和鼓励。', category: '习惯' },
    ],
  },
  {
    id: 'summer-small-play-science',
    title: '小玩型科学假期计划',
    author: '杭州小学家庭',
    scene: '寒暑假',
    ageRange: '7-12岁',
    cityLevel: '新一线城市',
    tags: ['小玩', '科学启蒙', '低预算'],
    likes: 96,
    uses: 31,
    qualityScore: 88,
    status: 'featured',
    summary: '每天保留一段科学探索，不追求大投入，适合家长陪伴时间有限但希望假期有收获的家庭。',
    slots: [
      { id: 's1', time: '09:30-10:00', title: '晨间阅读和计划', description: '孩子自己选今天的小目标。', category: '计划' },
      { id: 's2', time: '10:15-11:00', title: '科学小实验或纪录片', description: '用可见结果激发好奇心。', category: '科学' },
      { id: 's3', time: '16:30-17:30', title: '公园观察或运动', description: '把户外活动和观察任务结合。', category: '运动' },
      { id: 's4', time: '20:00-20:15', title: '今天发现分享', description: '让孩子说出一个新发现。', category: '复盘' },
    ],
  },
  {
    id: 'wish-promise-weekend',
    title: '周末心愿兑现日',
    author: '上海二孩家庭',
    scene: '周末',
    ageRange: '6-13岁',
    cityLevel: '一线城市',
    tags: ['心愿兑现', '亲子沟通', '轻安排'],
    likes: 72,
    uses: 19,
    qualityScore: 84,
    status: 'local',
    summary: '孩子用星星兑换愿望后，把父母承诺也写进周末计划，避免说了却忘。',
    slots: [
      { id: 's1', time: '09:30-10:00', title: '确认今日心愿', description: '家长和孩子一起确认要兑现的内容。', category: '沟通' },
      { id: 's2', time: '10:30-12:00', title: '完成心愿活动', description: '例如电影、游戏、冰淇淋或亲子游玩。', category: '心愿' },
      { id: 's3', time: '19:30-19:45', title: '感谢和复盘', description: '孩子表达感受，家长回应承诺完成情况。', category: '复盘' },
    ],
  },
];

export function findCommunityTemplate(id?: string | null): CommunityTemplate | undefined {
  return COMMUNITY_TEMPLATES.find(item => item.id === id);
}

