/**
 * 游客模式展示数据
 * 纯前端本地数据，不需要数据库连接
 * 让新用户在注册前就能体验完整功能
 *
 * 家庭设定：
 * - 小明：小学三年级男生，9岁
 * - 小红：初中一年级女生，13岁
 */
import { Task, Member, Reward, HistoryRecord } from '../types';

const now = new Date();
const today = now.toISOString().split('T')[0];
const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
const nextWeek = new Date(now.getTime() + 86400000 * 7).toISOString().split('T')[0];

// ========== 游客家庭成员 ==========
export const GUEST_MEMBERS: Member[] = [
  {
    id: 'guest-mom',
    name: '妈妈',
    avatar: '/avatars/parent/Cute_cartoon_avatar_of_a_young_2026-04-27T18-33-05.png',
    stars: 320,
    role: 'parent',
    pin: '1234',
  },
  {
    id: 'guest-dad',
    name: '爸爸',
    avatar: '/avatars/parent/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-33-03.png',
    stars: 180,
    role: 'parent',
    pin: '1234',
  },
  {
    id: 'guest-son',
    name: '小明',
    avatar: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-10.png',
    stars: 186,
    role: 'child',
    pin: '1234',
  },
  {
    id: 'guest-daughter',
    name: '小红',
    avatar: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-54.png',
    stars: 254,
    role: 'child',
    pin: '1234',
  },
];

// ========== 游客任务 ==========
// 状态说明：
//   pending   - 待完成（进行中）
//   reviewing - 已提交，待家长审核
//   completed - 已完成（已审核通过）
//   overdue  - 已逾期

export const GUEST_TASKS: Task[] = [
  // ==================== 小明（小学三年级）的任务 ====================

  // Q1 - 紧急重要：明天截止，必须今天完成
  {
    id: 'guest-t1',
    title: '数学作业：两位数乘法',
    description: '完成课本第35页全部练习题，明天上课要交',
    type: 'once',
    startTime: today + 'T09:00:00.000Z',
    endTime: tomorrow + 'T08:00:00.000Z',
    assigneeIds: ['guest-son'],
    creatorId: 'guest-mom',
    rewardStars: 30,
    status: 'pending',
    icon: '/task-icons/study/Cute_flat_kawaii_doing_homewor_2026-04-27T20-18-31.png',
    isHabit: false,
  },
  {
    id: 'guest-t2',
    title: '书法练习：抄写古诗三首',
    description: '用笔抄写《静夜思》《春晓》《悯农》，字迹工整',
    type: 'once',
    startTime: today + 'T14:00:00.000Z',
    endTime: tomorrow + 'T08:00:00.000Z',
    assigneeIds: ['guest-son'],
    creatorId: 'guest-mom',
    rewardStars: 25,
    status: 'pending',
    icon: '/task-icons/study/Cute_flat_kawaii_calligraphy_w_2026-04-27T20-18-14.png',
    isHabit: false,
  },
  // Q1 - 紧急重要：已提交待审核（家长需尽快处理）
  {
    id: 'guest-t3',
    title: '语文阅读理解练习',
    description: '完成练习册第12-13页',
    type: 'once',
    startTime: yesterday + 'T15:00:00.000Z',
    assigneeIds: ['guest-son'],
    creatorId: 'guest-mom',
    rewardStars: 20,
    status: 'reviewing',
    icon: '/task-icons/study/Cute_flat_kawaii_icon_of_readi_2026-04-27T20-17-45.png',
    isHabit: false,
  },

  // Q2 - 不紧急重要：长期习惯，需要坚持
  {
    id: 'guest-t4',
    title: '每日阅读30分钟',
    description: '选择喜欢的课外书，培养阅读习惯',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T19:00:00.000Z',
    assigneeIds: ['guest-son'],
    creatorId: 'guest-mom',
    rewardStars: 15,
    status: 'pending',
    icon: '/task-icons/study/Cute_flat_kawaii_icon_of_readi_2026-04-27T20-17-45.png',
    isHabit: true,
    targetCount: 7,
    currentCount: 4,
  },
  {
    id: 'guest-t5',
    title: '跳绳锻炼10分钟',
    description: '每天坚持跳绳，增强体质',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T17:00:00.000Z',
    assigneeIds: ['guest-son', 'guest-daughter'],
    creatorId: 'guest-dad',
    rewardStars: 10,
    status: 'pending',
    icon: '/task-icons/life/Cute_flat_kawaii_sports_jump__2026-04-27T20-19-45.png',
    isHabit: true,
    targetCount: 7,
    currentCount: 5,
  },
  {
    id: 'guest-t6',
    title: '准备下月朗诵比赛',
    description: '选一首诗，每天练习10分钟朗诵技巧',
    type: 'once',
    startTime: today + 'T20:00:00.000Z',
    endTime: nextWeek + 'T23:59:59.000Z',
    assigneeIds: ['guest-son'],
    creatorId: 'guest-mom',
    rewardStars: 50,
    status: 'pending',
    icon: '/task-icons/hobby/Cute_flat_kawaii_microphone_s_2026-04-27T20-21-05.png',
    isHabit: false,
  },

  // Q3 - 紧急不重要：同学临时约玩，可推迟
  {
    id: 'guest-t7',
    title: '整理玩具（小明主动说今天要做）',
    description: '把乐高和玩具车归位，但优先级不高',
    type: 'once',
    startTime: today + 'T16:00:00.000Z',
    assigneeIds: ['guest-son'],
    creatorId: 'guest-son',
    rewardStars: 10,
    status: 'pending',
    icon: '/task-icons/independent/Cute_flat_kawaii_packing_schoo_2026-04-27T20-22-27.png',
    isHabit: false,
  },

  // Q4 - 不紧急不重要：玩游戏、看动画片
  {
    id: 'guest-t8',
    title: '看动画片（周末奖励）',
    description: '完成作业后才可以看，每次不超过30分钟',
    type: 'once',
    startTime: tomorrow + 'T18:00:00.000Z',
    assigneeIds: ['guest-son'],
    creatorId: 'guest-mom',
    rewardStars: 0,
    status: 'pending',
    icon: '/task-icons/life/Cute_flat_kawaii_watching_TV__2026-04-27T20-20-10.png',
    isHabit: false,
  },

  // ==================== 小红（初中一年级）的任务 ====================

  // Q1 - 紧急重要：考试复习、截止作业
  {
    id: 'guest-t9',
    title: '数学期中考试复习',
    description: '复习前三章内容，明天上午考试',
    type: 'once',
    startTime: today + 'T19:00:00.000Z',
    endTime: tomorrow + 'T10:00:00.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: 50,
    status: 'pending',
    icon: '/task-icons/study/Cute_flat_kawaii_doing_homewor_2026-04-27T20-18-31.png',
    isHabit: false,
  },
  {
    id: 'guest-t10',
    title: '英语作文：My Dream Job',
    description: '不少于120词，后天上课交',
    type: 'once',
    startTime: today + 'T15:00:00.000Z',
    endTime: tomorrow + 'T23:59:59.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: 40,
    status: 'pending',
    icon: '/task-icons/study/Cute_flat_kawaii_writing_essay_2026-04-27T20-18-50.png',
    isHabit: false,
  },
  {
    id: 'guest-t11',
    title: '科学实验报告（已提交待审核）',
    description: '种子发芽观察实验，记录7天数据',
    type: 'once',
    startTime: yesterday + 'T16:00:00.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-daughter',
    rewardStars: 35,
    status: 'reviewing',
    icon: '/task-icons/study/Cute_flat_kawaii_science_exper_2026-04-27T20-19-20.png',
    isHabit: false,
  },

  // Q2 - 不紧急重要：长期积累
  {
    id: 'guest-t12',
    title: '英语单词背诵20个',
    description: '每天背诵并默写，长期积累很重要',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T07:00:00.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: 20,
    status: 'pending',
    icon: '/task-icons/study/Cute_flat_kawaii_English_vocab_2026-04-27T20-17-50.png',
    isHabit: true,
    targetCount: 30,
    currentCount: 12,
  },
  {
    id: 'guest-t13',
    title: '练习小提琴30分钟',
    description: '坚持练习音阶和练习曲',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T18:00:00.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-dad',
    rewardStars: 30,
    status: 'pending',
    icon: '/task-icons/hobby/Cute_flat_kawai_piano_playing__2026-04-27T20-21-20.png',
    isHabit: true,
    targetCount: 7,
    currentCount: 3,
  },
  {
    id: 'guest-t14',
    title: '跑步锻炼20分钟',
    description: '中考体育要考800米，平时多练习',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T06:30:00.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-dad',
    rewardStars: 15,
    status: 'pending',
    icon: '/task-icons/life/Cute_flat_kawaii_sports_runni_2026-04-27T20-19-45.png',
    isHabit: true,
    targetCount: 5,
    currentCount: 2,
  },
  {
    id: 'guest-t15',
    title: '课外阅读：《朝花夕拾》',
    description: '本周读完前两章，写100字读后感',
    type: 'once',
    startTime: today + 'T20:00:00.000Z',
    endTime: nextWeek + 'T23:59:59.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: 40,
    status: 'pending',
    icon: '/task-icons/study/Cute_flat_kawaii_reading_book__2026-04-27T20-17-30.png',
    isHabit: false,
  },

  // Q3 - 紧急不重要：社交干扰
  {
    id: 'guest-t16',
    title: '回复同学群消息',
    description: '讨论周末聚会安排，可稍后处理',
    type: 'once',
    startTime: today + 'T12:00:00.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-daughter',
    rewardStars: 0,
    status: 'pending',
    icon: '/task-icons/life/Cute_flat_kawaii_chatting_with_2026-04-27T20-20-50.png',
    isHabit: false,
  },

  // Q4 - 不紧急不重要：刷短视频、追剧
  {
    id: 'guest-t17',
    title: '刷短视频（限时15分钟）',
    description: '完成作业后可以适当放松，注意控制时间',
    type: 'once',
    startTime: tomorrow + 'T21:00:00.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-daughter',
    rewardStars: -5,
    status: 'pending',
    icon: '/task-icons/life/Cute_flat_kawaii_watching_TV__2026-04-27T20-20-10.png',
    isHabit: false,
  },

  // ==================== 已完成的任务（历史） ====================
  {
    id: 'guest-t18',
    title: '收拾书包（已完成）',
    description: '把明天的课本和文具整理好',
    type: 'daily',
    frequency: 'daily',
    startTime: yesterday + 'T20:00:00.000Z',
    assigneeIds: ['guest-son', 'guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: 10,
    status: 'completed',
    icon: '/task-icons/independent/Cute_flat_kawaii_packing_schoo_2026-04-27T20-22-27.png',
    isHabit: false,
  },
];

// ========== 游客习惯（奖惩卡片） ==========
export const GUEST_HABITS: Task[] = [
  // 积极习惯
  {
    id: 'guest-h1',
    title: '每日早起（7:00前）',
    description: '不迟到，养成良好作息习惯',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T07:00:00.000Z',
    assigneeIds: ['guest-son', 'guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: 10,
    status: 'pending',
    icon: '/task-icons/life/Cute_flat_kawaii_waking_up_ear_2026-04-27T20-20-31.png',
    isHabit: true,
    targetCount: 7,
    currentCount: 5,
  },
  {
    id: 'guest-h2',
    title: '每天喝水8杯',
    description: '保持健康饮水习惯',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T08:00:00.000Z',
    assigneeIds: ['guest-son', 'guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: 5,
    status: 'pending',
    icon: '/task-icons/life/Cute_flat_kawaii_drinking_wate_2026-04-27T20-19-03.png',
    isHabit: true,
    targetCount: 8,
    currentCount: 4,
  },
  {
    id: 'guest-h3',
    title: '老师表扬',
    description: '在学校表现好，得到老师表扬',
    type: 'once',
    startTime: today + 'T10:00:00.000Z',
    assigneeIds: ['guest-son', 'guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: 50,
    status: 'pending',
    icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_teach_2026-04-27T20-11-28.png',
    isHabit: true,
    targetCount: 1,
    currentCount: 0,
  },
  // 消极习惯（惩罚）
  {
    id: 'guest-h4',
    title: '晚睡（超过22:00）',
    description: '早睡早起身体好，晚睡要扣星星',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T22:00:00.000Z',
    assigneeIds: ['guest-son', 'guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: -15,
    status: 'pending',
    icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_stayi_2026-04-27T20-09-38.png',
    isHabit: true,
    targetCount: 1,
    currentCount: 0,
  },
  {
    id: 'guest-h5',
    title: '挑食',
    description: '不挑食才能长高高、长壮壮',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T12:00:00.000Z',
    assigneeIds: ['guest-son'],
    creatorId: 'guest-mom',
    rewardStars: -10,
    status: 'pending',
    icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_picky_2026-04-27T20-09-54.png',
    isHabit: true,
    targetCount: 1,
    currentCount: 0,
  },
  {
    id: 'guest-h6',
    title: '玩手机超时',
    description: '每天使用手机不超过30分钟',
    type: 'daily',
    frequency: 'daily',
    startTime: today + 'T21:00:00.000Z',
    assigneeIds: ['guest-daughter'],
    creatorId: 'guest-mom',
    rewardStars: -20,
    status: 'pending',
    icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_using__2026-04-27T20-10-10.png',
    isHabit: true,
    targetCount: 1,
    currentCount: 0,
  },
];

// ========== 游客心愿/奖励 ==========
export const GUEST_REWARDS: Reward[] = [
  {
    id: 'guest-r1',
    name: '看电视',
    description: '自由观看一小时喜欢的电视节目',
    cost: 30,
    icon: '/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-31.png',
    image: '',
    category: '常用',
  },
  {
    id: 'guest-r2',
    name: '冰淇淋',
    description: '享用一个大号冰淇淋',
    cost: 40,
    icon: '/reward-icons/privilege/Cute_flat_kawaii_ice_cream_con_2026-04-27T19-45-45.png',
    image: '',
    category: '特权',
  },
  {
    id: 'guest-r3',
    name: '玩游戏',
    description: '畅玩电子游戏一小时',
    cost: 50,
    icon: '/reward-icons/prize/Cute_flat_kawaii_video_game_co_2026-04-27T19-44-07.png',
    image: '',
    category: '奖品',
  },
  {
    id: 'guest-r4',
    name: '家庭电影夜',
    description: '全家一起看电影，配爆米花和饮料',
    cost: 200,
    icon: '/reward-icons/experience/A_cute_flat_design_kawaii_styl_2026-04-27T19-42-17.png',
    image: '',
    category: '体验',
  },
  {
    id: 'guest-r5',
    name: '乐高套装',
    description: '购买一套乐高积木玩具',
    cost: 400,
    icon: '/reward-icons/activity/Cute_flat_kawaii_LEGO_building_2026-04-27T19-48-32.png',
    image: '',
    category: '活动',
  },
  {
    id: 'guest-r6',
    name: '储零花钱',
    description: '获得一笔可以自由支配的零花钱',
    cost: 100,
    icon: '/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-28.png',
    image: '',
    category: '常用',
  },
  {
    id: 'guest-r7',
    name: '游乐园',
    description: '去游乐园玩一整天！',
    cost: 1000,
    icon: '/reward-icons/experience/Cute_flat_kawaii_amusement_par_2026-04-27T19-43-16.png',
    image: '',
    category: '体验',
  },
  {
    id: 'guest-r8',
    name: '北京环球影城',
    description: '去北京环球影城畅玩一天！',
    cost: 3000,
    icon: '/reward-icons/activity/Cute_flat_kawaii_Universal_Stu_2026-04-27T19-47-50.png',
    image: '',
    category: '活动',
    stock: 2,
  },
  {
    id: 'guest-r9',
    name: '骑行郊游',
    description: '全家一起去骑自行车郊游',
    cost: 100,
    icon: '/reward-icons/growth/Cute_flat_kawaii_cycling_bike__2026-04-27T19-46-53.png',
    image: '',
    category: '成长',
  },
  {
    id: 'guest-r10',
    name: '肯德基全家桶',
    description: '享用一次肯德基全家桶套餐',
    cost: 150,
    icon: '/reward-icons/privilege/Cute_flat_kawaii_KFC_fried_chi_2026-04-27T19-44-47.png',
    image: '',
    category: '特权',
  },
];

// ========== 游客历史记录 ==========
export const GUEST_HISTORY: HistoryRecord[] = [
  {
    id: 'guest-hist1',
    userId: 'guest-son',
    title: '完成习惯: 每日早起',
    type: 'task',
    stars: 10,
    timestamp: today + 'T07:15:00.000Z',
    icon: 'Sun',
  },
  {
    id: 'guest-hist2',
    userId: 'guest-son',
    title: '完成任务: 收拾书包',
    type: 'task',
    stars: 10,
    timestamp: yesterday + 'T20:30:00.000Z',
    icon: 'CheckCircle',
  },
  {
    id: 'guest-hist3',
    userId: 'guest-daughter',
    title: '完成习惯: 练习小提琴',
    type: 'task',
    stars: 30,
    timestamp: yesterday + 'T18:30:00.000Z',
    icon: 'Music',
  },
  {
    id: 'guest-hist4',
    userId: 'guest-daughter',
    title: '完成任务: 英语单词背诵',
    type: 'task',
    stars: 20,
    timestamp: yesterday + 'T07:30:00.000Z',
    icon: 'Languages',
  },
  {
    id: 'guest-hist5',
    userId: 'guest-son',
    title: '完成习惯: 每天喝水8杯',
    type: 'task',
    stars: 5,
    timestamp: yesterday + 'T18:00:00.000Z',
    icon: 'Droplets',
  },
  {
    id: 'guest-hist6',
    userId: 'guest-son',
    title: '老师表扬: 课堂积极发言',
    type: 'task',
    stars: 50,
    timestamp: yesterday + 'T10:30:00.000Z',
    icon: 'Award',
  },
  {
    id: 'guest-hist7',
    userId: 'guest-daughter',
    title: '兑换心愿: 看电视',
    type: 'redeem',
    stars: -30,
    timestamp: yesterday + 'T19:00:00.000Z',
    icon: 'Gift',
  },
  {
    id: 'guest-hist8',
    userId: 'guest-son',
    title: '完成任务: 数学作业',
    type: 'task',
    stars: 30,
    timestamp: yesterday + 'T16:00:00.000Z',
    icon: 'BookOpen',
  },
  {
    id: 'guest-hist9',
    userId: 'guest-daughter',
    title: '惩罚: 玩手机超时',
    type: 'penalty',
    stars: -20,
    timestamp: yesterday + 'T22:30:00.000Z',
    icon: 'Smartphone',
  },
];

type GuestLocale = 'zh-CN' | 'en-US' | 'ja-JP' | 'ko-KR' | 'es-ES' | 'fr-FR';

const MEMBER_NAMES_BY_LOCALE: Record<GuestLocale, Record<string, string>> = {
  'zh-CN': {
    'guest-mom': '妈妈',
    'guest-dad': '爸爸',
    'guest-son': '小明',
    'guest-daughter': '小红',
  },
  'en-US': {
    'guest-mom': 'Mom',
    'guest-dad': 'Dad',
    'guest-son': 'Alex',
    'guest-daughter': 'Lily',
  },
  'ja-JP': {
    'guest-mom': 'ママ',
    'guest-dad': 'パパ',
    'guest-son': 'ハル',
    'guest-daughter': 'ユイ',
  },
  'ko-KR': {
    'guest-mom': '엄마',
    'guest-dad': '아빠',
    'guest-son': '준',
    'guest-daughter': '하나',
  },
  'es-ES': {
    'guest-mom': 'Mamá',
    'guest-dad': 'Papá',
    'guest-son': 'Álex',
    'guest-daughter': 'Lía',
  },
  'fr-FR': {
    'guest-mom': 'Maman',
    'guest-dad': 'Papa',
    'guest-son': 'Alex',
    'guest-daughter': 'Lina',
  },
};

const EN_MEMBER_NAMES = MEMBER_NAMES_BY_LOCALE['en-US'];

const EN_TASK_COPY: Record<string, Pick<Task, 'title' | 'description'>> = {
  'guest-t1': { title: 'Math Homework: Two-Digit Multiplication', description: 'Finish all exercises on page 35. Due tomorrow.' },
  'guest-t2': { title: 'Calligraphy Practice: Copy 3 Poems', description: 'Copy three short poems neatly by hand.' },
  'guest-t3': { title: 'Chinese Reading Comprehension', description: 'Finish pages 12-13 in the workbook.' },
  'guest-t4': { title: 'Read for 30 Minutes', description: 'Pick a book you enjoy and build a steady reading habit.' },
  'guest-t5': { title: 'Jump Rope for 10 Minutes', description: 'Keep jumping rope every day to build fitness.' },
  'guest-t6': { title: 'Prepare for Next Month’s Recitation', description: 'Choose a poem and practice reciting for 10 minutes each day.' },
  'guest-t7': { title: 'Tidy Toys', description: 'Put building blocks and toy cars back in place.' },
  'guest-t8': { title: 'Watch Cartoons', description: 'Watch for up to 30 minutes after homework is done.' },
  'guest-t9': { title: 'Review for Math Midterm', description: 'Review the first three chapters before tomorrow’s exam.' },
  'guest-t10': { title: 'English Essay: My Dream Job', description: 'Write at least 120 words. Due soon.' },
  'guest-t11': { title: 'Science Lab Report', description: 'Submit the 7-day seed sprouting observation report.' },
  'guest-t12': { title: 'Memorize 20 English Words', description: 'Memorize and write them from memory every day.' },
  'guest-t13': { title: 'Practice Violin for 30 Minutes', description: 'Practice scales and short etudes consistently.' },
  'guest-t14': { title: 'Run for 20 Minutes', description: 'Build stamina with regular running practice.' },
  'guest-t15': { title: 'Extra Reading: Morning Blossoms', description: 'Read the first two chapters this week and write a short reflection.' },
  'guest-t16': { title: 'Reply to Class Group Messages', description: 'Discuss weekend plans, but it can wait.' },
  'guest-t17': { title: 'Short Video Time Limit', description: 'Relax after homework, but keep it under 15 minutes.' },
  'guest-t18': { title: 'Pack Schoolbag', description: 'Prepare tomorrow’s books and stationery.' },
  'guest-h1': { title: 'Wake Up Before 7:00', description: 'Build a healthy routine and avoid being late.' },
  'guest-h2': { title: 'Drink 8 Cups of Water', description: 'Keep a healthy hydration habit.' },
  'guest-h3': { title: 'Teacher Praise', description: 'Earned praise for good school behavior.' },
  'guest-h4': { title: 'Late Bedtime After 22:00', description: 'Early sleep matters. Late bedtime deducts stars.' },
  'guest-h5': { title: 'Picky Eating', description: 'Try more foods to grow strong and healthy.' },
  'guest-h6': { title: 'Too Much Phone Time', description: 'Keep phone use within 30 minutes a day.' },
};

const TASK_COPY_BY_LOCALE: Partial<Record<GuestLocale, Record<string, Pick<Task, 'title' | 'description'>>>> = {
  'en-US': EN_TASK_COPY,
  'ja-JP': {
    'guest-t1': { title: '算数の宿題：2けたのかけ算', description: '教科書35ページの練習問題を終える。明日提出。' },
    'guest-t2': { title: '書写練習：短い詩を3つ写す', description: '3つの短い詩をていねいに手書きする。' },
    'guest-t3': { title: '国語の読解練習', description: 'ワークブック12-13ページを終える。' },
    'guest-t4': { title: '30分読書', description: '好きな本を選んで、読書習慣を育てる。' },
    'guest-t5': { title: '10分なわとび', description: '毎日なわとびを続けて体力をつける。' },
    'guest-t6': { title: '来月の朗読発表の準備', description: '詩を1つ選び、毎日10分朗読を練習する。' },
    'guest-t7': { title: 'おもちゃを片づける', description: 'ブロックとミニカーを元の場所へ戻す。' },
    'guest-t8': { title: 'アニメを見る', description: '宿題が終わったあと、30分以内で見る。' },
    'guest-t9': { title: '算数テストの復習', description: '明日のテスト前に最初の3章を復習する。' },
    'guest-t10': { title: '英作文：将来の仕事', description: '120語以上で書く。近日提出。' },
    'guest-t11': { title: '理科実験レポート', description: '種の発芽を7日間観察した記録を提出する。' },
    'guest-t12': { title: '英単語を20個覚える', description: '毎日覚えて、見ないで書けるようにする。' },
    'guest-t13': { title: 'バイオリンを30分練習', description: '音階と短い練習曲を続けて練習する。' },
    'guest-t14': { title: '20分ランニング', description: '定期的に走って体力をつける。' },
    'guest-t15': { title: '読書：朝花夕拾', description: '今週は最初の2章を読み、短い感想を書く。' },
    'guest-t16': { title: 'クラス連絡に返信', description: '週末の予定を確認する。急がなくてもよい。' },
    'guest-t17': { title: '短い動画は15分まで', description: '宿題後の休憩として、15分以内にする。' },
    'guest-t18': { title: 'ランドセルを準備', description: '明日の教科書と文房具を用意する。' },
    'guest-h1': { title: '7時前に起きる', description: '健康的な生活リズムを作り、遅刻を防ぐ。' },
    'guest-h2': { title: '水を8杯飲む', description: 'こまめに水分をとる習慣を続ける。' },
    'guest-h3': { title: '先生にほめられた', description: '学校でよい行動をしてほめられた。' },
    'guest-h4': { title: '22時以降に寝た', description: '早寝は大切。遅く寝た日はポイントを減らす。' },
    'guest-h5': { title: '好き嫌いをした', description: 'いろいろな食べ物に挑戦して元気に育つ。' },
    'guest-h6': { title: 'スマホ時間が長すぎた', description: 'スマホは1日30分以内を目標にする。' },
  },
  'ko-KR': {
    'guest-t1': { title: '수학 숙제: 두 자리 곱셈', description: '교과서 35쪽 연습 문제를 모두 끝내기. 내일 제출.' },
    'guest-t2': { title: '글씨 연습: 짧은 시 3편 쓰기', description: '짧은 시 3편을 또박또박 손으로 쓰기.' },
    'guest-t3': { title: '국어 독해 연습', description: '문제집 12-13쪽을 끝내기.' },
    'guest-t4': { title: '30분 독서', description: '좋아하는 책을 골라 꾸준한 독서 습관 만들기.' },
    'guest-t5': { title: '줄넘기 10분', description: '매일 줄넘기를 하며 체력을 기르기.' },
    'guest-t6': { title: '다음 달 낭독 발표 준비', description: '시 한 편을 골라 매일 10분씩 낭독 연습하기.' },
    'guest-t7': { title: '장난감 정리', description: '블록과 장난감 자동차를 제자리에 두기.' },
    'guest-t8': { title: '만화 보기', description: '숙제를 끝낸 뒤 30분 안에서 보기.' },
    'guest-t9': { title: '수학 중간고사 복습', description: '내일 시험 전 첫 세 단원을 복습하기.' },
    'guest-t10': { title: '영어 작문: 나의 꿈의 직업', description: '120단어 이상으로 쓰기. 곧 제출.' },
    'guest-t11': { title: '과학 실험 보고서', description: '씨앗 발아를 7일간 관찰한 기록 제출.' },
    'guest-t12': { title: '영단어 20개 외우기', description: '매일 외우고 보지 않고 써보기.' },
    'guest-t13': { title: '바이올린 30분 연습', description: '음계와 짧은 연습곡을 꾸준히 연습하기.' },
    'guest-t14': { title: '20분 달리기', description: '규칙적으로 달리며 지구력 기르기.' },
    'guest-t15': { title: '추가 독서: 아침 꽃을 줍다', description: '이번 주 첫 두 장을 읽고 짧은 감상 쓰기.' },
    'guest-t16': { title: '반 단체 메시지 답장', description: '주말 계획을 이야기하되 급하지 않다.' },
    'guest-t17': { title: '짧은 영상 15분 제한', description: '숙제 후 쉬는 시간으로 15분 안에서 보기.' },
    'guest-t18': { title: '가방 챙기기', description: '내일 책과 필기구를 준비하기.' },
    'guest-h1': { title: '7시 전에 일어나기', description: '건강한 생활 리듬을 만들고 지각을 줄이기.' },
    'guest-h2': { title: '물 8잔 마시기', description: '건강한 수분 섭취 습관 유지하기.' },
    'guest-h3': { title: '선생님 칭찬', description: '학교에서 좋은 태도로 칭찬을 받음.' },
    'guest-h4': { title: '22시 이후 취침', description: '일찍 자는 것이 중요하므로 늦게 자면 감점.' },
    'guest-h5': { title: '편식하기', description: '더 다양한 음식을 먹어 건강하게 성장하기.' },
    'guest-h6': { title: '휴대폰 시간이 너무 김', description: '하루 휴대폰 사용을 30분 안으로 유지하기.' },
  },
  'es-ES': {
    'guest-t1': { title: 'Deberes de matemáticas: multiplicación', description: 'Terminar los ejercicios de la página 35. Se entrega mañana.' },
    'guest-t2': { title: 'Caligrafía: copiar 3 poemas', description: 'Copiar tres poemas cortos con buena letra.' },
    'guest-t3': { title: 'Comprensión lectora', description: 'Terminar las páginas 12-13 del cuaderno.' },
    'guest-t4': { title: 'Leer 30 minutos', description: 'Elegir un libro y crear un hábito de lectura.' },
    'guest-t5': { title: 'Saltar la cuerda 10 minutos', description: 'Saltar la cuerda cada día para mejorar la forma física.' },
    'guest-t6': { title: 'Preparar la recitación del mes próximo', description: 'Elegir un poema y practicar 10 minutos al día.' },
    'guest-t7': { title: 'Ordenar juguetes', description: 'Guardar bloques y coches de juguete en su sitio.' },
    'guest-t8': { title: 'Ver dibujos animados', description: 'Ver hasta 30 minutos después de terminar los deberes.' },
    'guest-t9': { title: 'Repasar para el examen de matemáticas', description: 'Repasar los tres primeros capítulos antes del examen de mañana.' },
    'guest-t10': { title: 'Redacción en inglés: My Dream Job', description: 'Escribir al menos 120 palabras. Entrega próxima.' },
    'guest-t11': { title: 'Informe de experimento de ciencias', description: 'Entregar el registro de 7 días sobre germinación de semillas.' },
    'guest-t12': { title: 'Memorizar 20 palabras en inglés', description: 'Memorizar y escribirlas cada día.' },
    'guest-t13': { title: 'Practicar violín 30 minutos', description: 'Practicar escalas y estudios cortos con constancia.' },
    'guest-t14': { title: 'Correr 20 minutos', description: 'Mejorar la resistencia con práctica regular.' },
    'guest-t15': { title: 'Lectura extra: Morning Blossoms', description: 'Leer los dos primeros capítulos esta semana y escribir una nota.' },
    'guest-t16': { title: 'Responder al grupo de clase', description: 'Hablar de planes del fin de semana, pero puede esperar.' },
    'guest-t17': { title: 'Límite de videos cortos', description: 'Descansar tras los deberes, máximo 15 minutos.' },
    'guest-t18': { title: 'Preparar la mochila', description: 'Preparar libros y útiles para mañana.' },
    'guest-h1': { title: 'Levantarse antes de las 7:00', description: 'Crear una rutina sana y evitar llegar tarde.' },
    'guest-h2': { title: 'Beber 8 vasos de agua', description: 'Mantener una hidratación saludable.' },
    'guest-h3': { title: 'Elogio del profesor', description: 'Recibió elogios por buen comportamiento en clase.' },
    'guest-h4': { title: 'Acostarse después de las 22:00', description: 'Dormir temprano importa. Acostarse tarde resta puntos.' },
    'guest-h5': { title: 'Comer con manías', description: 'Probar más alimentos para crecer sano.' },
    'guest-h6': { title: 'Demasiado tiempo con el móvil', description: 'Mantener el móvil dentro de 30 minutos al día.' },
  },
  'fr-FR': {
    'guest-t1': { title: 'Devoirs de maths : multiplication', description: 'Terminer les exercices de la page 35. À rendre demain.' },
    'guest-t2': { title: 'Écriture : copier 3 poèmes', description: 'Copier trois courts poèmes avec soin.' },
    'guest-t3': { title: 'Compréhension écrite', description: 'Terminer les pages 12-13 du cahier.' },
    'guest-t4': { title: 'Lire 30 minutes', description: 'Choisir un livre et construire une habitude de lecture.' },
    'guest-t5': { title: 'Corde à sauter 10 minutes', description: 'Faire de la corde chaque jour pour rester en forme.' },
    'guest-t6': { title: 'Préparer la récitation du mois prochain', description: 'Choisir un poème et pratiquer 10 minutes par jour.' },
    'guest-t7': { title: 'Ranger les jouets', description: 'Remettre les briques et petites voitures à leur place.' },
    'guest-t8': { title: 'Regarder un dessin animé', description: 'Jusqu’à 30 minutes après les devoirs.' },
    'guest-t9': { title: 'Réviser le contrôle de maths', description: 'Revoir les trois premiers chapitres avant le contrôle de demain.' },
    'guest-t10': { title: 'Rédaction en anglais : My Dream Job', description: 'Écrire au moins 120 mots. À rendre bientôt.' },
    'guest-t11': { title: 'Rapport d’expérience scientifique', description: 'Rendre le suivi de 7 jours sur la germination.' },
    'guest-t12': { title: 'Mémoriser 20 mots anglais', description: 'Les mémoriser et les écrire chaque jour.' },
    'guest-t13': { title: 'Violonner 30 minutes', description: 'Travailler les gammes et de courts exercices régulièrement.' },
    'guest-t14': { title: 'Courir 20 minutes', description: 'Développer l’endurance par une pratique régulière.' },
    'guest-t15': { title: 'Lecture extra : Morning Blossoms', description: 'Lire les deux premiers chapitres cette semaine et écrire une note.' },
    'guest-t16': { title: 'Répondre au groupe de classe', description: 'Discuter du week-end, mais cela peut attendre.' },
    'guest-t17': { title: 'Limiter les vidéos courtes', description: 'Pause après les devoirs, maximum 15 minutes.' },
    'guest-t18': { title: 'Préparer le cartable', description: 'Préparer les livres et fournitures pour demain.' },
    'guest-h1': { title: 'Se lever avant 7 h', description: 'Installer une routine saine et éviter les retards.' },
    'guest-h2': { title: 'Boire 8 verres d’eau', description: 'Garder une bonne habitude d’hydratation.' },
    'guest-h3': { title: 'Compliment du professeur', description: 'A été félicité pour son bon comportement en classe.' },
    'guest-h4': { title: 'Coucher après 22 h', description: 'Se coucher tôt compte. Un coucher tardif enlève des points.' },
    'guest-h5': { title: 'Faire le difficile à table', description: 'Essayer plus d’aliments pour bien grandir.' },
    'guest-h6': { title: 'Trop de temps sur le téléphone', description: 'Limiter le téléphone à 30 minutes par jour.' },
  },
};

const EN_REWARD_COPY: Record<string, Pick<Reward, 'name' | 'description' | 'category'>> = {
  'guest-r1': { name: 'Watch TV', description: 'Watch a favorite show for one hour.', category: 'common' },
  'guest-r2': { name: 'Ice Cream', description: 'Enjoy one large ice cream.', category: 'privilege' },
  'guest-r3': { name: 'Play Games', description: 'Play video games for one hour.', category: 'prize' },
  'guest-r4': { name: 'Family Movie Night', description: 'Watch a movie together with snacks and drinks.', category: 'experience' },
  'guest-r5': { name: 'LEGO Set', description: 'Get a new LEGO building set.', category: 'activity' },
  'guest-r6': { name: 'Pocket Money Jar', description: 'Save up flexible pocket money.', category: 'common' },
  'guest-r7': { name: 'Amusement Park', description: 'Spend a full day at an amusement park.', category: 'experience' },
  'guest-r8': { name: 'Universal Studios Beijing', description: 'Enjoy a full day at Universal Studios Beijing.', category: 'activity' },
  'guest-r9': { name: 'Family Bike Outing', description: 'Go on a family bike trip outdoors.', category: 'growth' },
  'guest-r10': { name: 'KFC Family Bucket', description: 'Enjoy a KFC family bucket meal.', category: 'privilege' },
};

const REWARD_COPY_BY_LOCALE: Partial<Record<GuestLocale, Record<string, Pick<Reward, 'name' | 'description' | 'category'>>>> = {
  'en-US': EN_REWARD_COPY,
  'ja-JP': {
    'guest-r1': { name: 'テレビを見る', description: '好きな番組を1時間見る。', category: 'common' },
    'guest-r2': { name: 'アイスクリーム', description: '大きなアイスを1つ楽しむ。', category: 'privilege' },
    'guest-r3': { name: 'ゲーム時間', description: 'ゲームを1時間遊ぶ。', category: 'prize' },
    'guest-r4': { name: '家族映画ナイト', description: '家族でおやつを食べながら映画を見る。', category: 'experience' },
    'guest-r5': { name: 'レゴセット', description: '新しいレゴのセットをもらう。', category: 'activity' },
    'guest-r6': { name: 'おこづかい貯金', description: '自由に使えるおこづかいをためる。', category: 'common' },
    'guest-r7': { name: '遊園地', description: '遊園地で一日遊ぶ。', category: 'experience' },
    'guest-r8': { name: 'ユニバーサル・スタジオ北京', description: 'ユニバーサル・スタジオ北京で一日楽しむ。', category: 'activity' },
    'guest-r9': { name: '家族サイクリング', description: '家族で外へサイクリングに行く。', category: 'growth' },
    'guest-r10': { name: 'KFCファミリーバケット', description: 'KFCのファミリーセットを楽しむ。', category: 'privilege' },
  },
  'ko-KR': {
    'guest-r1': { name: 'TV 보기', description: '좋아하는 프로그램을 한 시간 보기.', category: 'common' },
    'guest-r2': { name: '아이스크림', description: '큰 아이스크림 하나 먹기.', category: 'privilege' },
    'guest-r3': { name: '게임하기', description: '비디오 게임 한 시간 하기.', category: 'prize' },
    'guest-r4': { name: '가족 영화의 밤', description: '간식과 함께 가족이 영화를 보기.', category: 'experience' },
    'guest-r5': { name: '레고 세트', description: '새 레고 조립 세트 받기.', category: 'activity' },
    'guest-r6': { name: '용돈 저금통', description: '자유롭게 쓸 용돈을 모으기.', category: 'common' },
    'guest-r7': { name: '놀이공원', description: '놀이공원에서 하루 보내기.', category: 'experience' },
    'guest-r8': { name: '유니버설 스튜디오 베이징', description: '유니버설 스튜디오 베이징에서 하루 즐기기.', category: 'activity' },
    'guest-r9': { name: '가족 자전거 나들이', description: '가족과 야외 자전거 여행 가기.', category: 'growth' },
    'guest-r10': { name: 'KFC 패밀리 버킷', description: 'KFC 패밀리 세트를 함께 먹기.', category: 'privilege' },
  },
  'es-ES': {
    'guest-r1': { name: 'Ver televisión', description: 'Ver un programa favorito durante una hora.', category: 'common' },
    'guest-r2': { name: 'Helado', description: 'Disfrutar un helado grande.', category: 'privilege' },
    'guest-r3': { name: 'Jugar videojuegos', description: 'Jugar videojuegos durante una hora.', category: 'prize' },
    'guest-r4': { name: 'Noche de cine familiar', description: 'Ver una película juntos con snacks.', category: 'experience' },
    'guest-r5': { name: 'Set de LEGO', description: 'Recibir un nuevo set de construcción LEGO.', category: 'activity' },
    'guest-r6': { name: 'Bote de ahorro', description: 'Ahorrar dinero flexible para pequeños deseos.', category: 'common' },
    'guest-r7': { name: 'Parque de atracciones', description: 'Pasar un día completo en un parque de atracciones.', category: 'experience' },
    'guest-r8': { name: 'Universal Studios Beijing', description: 'Disfrutar un día completo en Universal Studios Beijing.', category: 'activity' },
    'guest-r9': { name: 'Paseo familiar en bici', description: 'Salir en bicicleta al aire libre en familia.', category: 'growth' },
    'guest-r10': { name: 'Bucket familiar KFC', description: 'Disfrutar una comida familiar de KFC.', category: 'privilege' },
  },
  'fr-FR': {
    'guest-r1': { name: 'Regarder la télé', description: 'Regarder une émission préférée pendant une heure.', category: 'common' },
    'guest-r2': { name: 'Glace', description: 'Profiter d’une grande glace.', category: 'privilege' },
    'guest-r3': { name: 'Jouer aux jeux vidéo', description: 'Jouer aux jeux vidéo pendant une heure.', category: 'prize' },
    'guest-r4': { name: 'Soirée cinéma en famille', description: 'Regarder un film ensemble avec des snacks.', category: 'experience' },
    'guest-r5': { name: 'Set LEGO', description: 'Recevoir un nouveau set LEGO.', category: 'activity' },
    'guest-r6': { name: 'Tirelire', description: 'Mettre de côté un petit budget libre.', category: 'common' },
    'guest-r7': { name: 'Parc d’attractions', description: 'Passer une journée dans un parc d’attractions.', category: 'experience' },
    'guest-r8': { name: 'Universal Studios Beijing', description: 'Profiter d’une journée à Universal Studios Beijing.', category: 'activity' },
    'guest-r9': { name: 'Sortie vélo en famille', description: 'Faire une balade à vélo dehors en famille.', category: 'growth' },
    'guest-r10': { name: 'Menu familial KFC', description: 'Partager un menu familial KFC.', category: 'privilege' },
  },
};

const EN_HISTORY_TITLES: Record<string, string> = {
  'guest-hist1': 'Completed Habit: Wake Up Early',
  'guest-hist2': 'Completed Task: Pack Schoolbag',
  'guest-hist3': 'Completed Habit: Violin Practice',
  'guest-hist4': 'Completed Task: English Words',
  'guest-hist5': 'Completed Habit: Drink Water',
  'guest-hist6': 'Teacher Praise: Active in Class',
  'guest-hist7': 'Redeemed Wish: Watch TV',
  'guest-hist8': 'Completed Task: Math Homework',
  'guest-hist9': 'Penalty: Too Much Phone Time',
};

const EN_DEFAULT_TASK_TITLE_COPY: Record<string, string> = {
  '起床洗漱': 'Morning Wash-up',
  '睡前流程': 'Bedtime Routine',
  '练字': 'Handwriting Practice',
  '阅读/练字': 'Reading / Handwriting',
  '练琴/练字': 'Music / Handwriting Practice',
};

const EN_DEFAULT_TASK_DESCRIPTION_COPY: Record<string, string> = {
  '穿衣、刷牙、洗脸': 'Get dressed, brush teeth, and wash face.',
  '适应当地时间': 'Adjust to the local daily rhythm.',
  '保持固定起床节奏': 'Keep a steady wake-up rhythm.',
  '洗漱、收玩具、安静入睡': 'Wash up, tidy toys, and settle down quietly.',
};

function getTaskCopy(locale: GuestLocale, id: string) {
  return TASK_COPY_BY_LOCALE[locale]?.[id] || EN_TASK_COPY[id];
}

function getRewardCopy(locale: GuestLocale, id: string) {
  return REWARD_COPY_BY_LOCALE[locale]?.[id] || EN_REWARD_COPY[id];
}

const ZH_DEFAULT_TASK_TITLE_COPY = Object.fromEntries(
  Object.entries(EN_DEFAULT_TASK_TITLE_COPY).map(([zh, en]) => [en, zh]),
) as Record<string, string>;

const ZH_DEFAULT_TASK_DESCRIPTION_COPY = Object.fromEntries(
  Object.entries(EN_DEFAULT_TASK_DESCRIPTION_COPY).map(([zh, en]) => [en, zh]),
) as Record<string, string>;

function resolveGuestLocale(locale?: string): GuestLocale {
  const explicit = locale || (typeof window !== 'undefined' ? window.localStorage.getItem('i18nextLng') || navigator.language : '');
  const normalized = explicit?.toLowerCase() || '';
  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('ja')) return 'ja-JP';
  if (normalized.startsWith('ko')) return 'ko-KR';
  if (normalized.startsWith('es')) return 'es-ES';
  if (normalized.startsWith('fr')) return 'fr-FR';
  return 'en-US';
}

function localizeGuestMemberName(member: Member, locale: GuestLocale) {
  const targetName = MEMBER_NAMES_BY_LOCALE[locale][member.id];
  if (!targetName) return member.name;
  const knownNames = Object.values(MEMBER_NAMES_BY_LOCALE).flatMap(names => Object.values(names));
  return knownNames.includes(member.name) ? targetName : member.name;
}

function localizeDefaultTask(task: Task, locale: GuestLocale): Task {
  const zhTask = [...GUEST_TASKS, ...GUEST_HABITS].find(item => item.id === task.id);
  const localeTask = getTaskCopy(locale, task.id);
  const allKnownTaskCopies = Object.values(TASK_COPY_BY_LOCALE)
    .map(copy => copy?.[task.id])
    .filter(Boolean) as Pick<Task, 'title' | 'description'>[];

  if (locale !== 'zh-CN') {
    return {
      ...task,
      title: zhTask && localeTask && task.title === zhTask.title
        ? localeTask.title
        : EN_DEFAULT_TASK_TITLE_COPY[task.title] || task.title,
      description: zhTask && localeTask && task.description === zhTask.description
        ? localeTask.description
        : EN_DEFAULT_TASK_DESCRIPTION_COPY[task.description] || task.description,
    };
  }

  return {
    ...task,
    title: zhTask && allKnownTaskCopies.some(copy => task.title === copy.title)
      ? zhTask.title
      : ZH_DEFAULT_TASK_TITLE_COPY[task.title] || task.title,
    description: zhTask && allKnownTaskCopies.some(copy => task.description === copy.description)
      ? zhTask.description
      : ZH_DEFAULT_TASK_DESCRIPTION_COPY[task.description] || task.description,
  };
}

function localizeDefaultReward(reward: Reward, locale: GuestLocale): Reward {
  const zhReward = GUEST_REWARDS.find(item => item.id === reward.id);
  const localeReward = getRewardCopy(locale, reward.id);
  const allKnownRewardCopies = Object.values(REWARD_COPY_BY_LOCALE)
    .map(copy => copy?.[reward.id])
    .filter(Boolean) as Pick<Reward, 'name' | 'description' | 'category'>[];
  if (!zhReward || !localeReward) return reward;

  if (locale !== 'zh-CN') {
    return {
      ...reward,
      name: reward.name === zhReward.name ? localeReward.name : reward.name,
      description: reward.description === zhReward.description ? localeReward.description : reward.description,
      category: reward.category === zhReward.category ? localeReward.category : reward.category,
    };
  }

  return {
    ...reward,
    name: allKnownRewardCopies.some(copy => reward.name === copy.name) ? zhReward.name : reward.name,
    description: allKnownRewardCopies.some(copy => reward.description === copy.description) ? zhReward.description : reward.description,
    category: allKnownRewardCopies.some(copy => reward.category === copy.category) ? zhReward.category : reward.category,
  };
}

export function localizeGuestDataForLocale(data: {
  members: Member[];
  tasks: Task[];
  rewards: Reward[];
  history: HistoryRecord[];
}, locale?: string) {
  const guestLocale = resolveGuestLocale(locale);
  return {
    members: data.members.map(member => {
      const zhMember = GUEST_MEMBERS.find(item => item.id === member.id);
      if (!zhMember) return member;
      return {
        ...member,
        name: localizeGuestMemberName(member, guestLocale),
      };
    }),
    tasks: data.tasks.map(task => localizeDefaultTask(task, guestLocale)),
    rewards: data.rewards.map(reward => localizeDefaultReward(reward, guestLocale)),
    history: data.history.map(record => {
      const zhRecord = GUEST_HISTORY.find(item => item.id === record.id);
      const enTitle = EN_HISTORY_TITLES[record.id];
      if (!zhRecord || !enTitle) return record;
      return {
        ...record,
        title: guestLocale !== 'zh-CN'
          ? (record.title === zhRecord.title ? enTitle : record.title)
          : (record.title === enTitle ? zhRecord.title : record.title),
      };
    }),
  };
}

/** 获取所有游客展示数据 */
export function getGuestData(locale?: string) {
  const guestLocale = resolveGuestLocale(locale);
  if (guestLocale !== 'zh-CN') {
    return {
      members: GUEST_MEMBERS.map(member => ({
        ...member,
        name: MEMBER_NAMES_BY_LOCALE[guestLocale][member.id] || member.name,
      })),
      tasks: [...GUEST_TASKS, ...GUEST_HABITS].map(task => ({
        ...task,
        ...(getTaskCopy(guestLocale, task.id) || {}),
      })),
      rewards: GUEST_REWARDS.map(reward => ({
        ...reward,
        ...(getRewardCopy(guestLocale, reward.id) || {}),
      })),
      history: GUEST_HISTORY.map(record => ({
        ...record,
        title: EN_HISTORY_TITLES[record.id] || record.title,
      })),
    };
  }
  return {
    members: GUEST_MEMBERS,
    tasks: [...GUEST_TASKS, ...GUEST_HABITS],
    rewards: GUEST_REWARDS,
    history: GUEST_HISTORY,
  };
}
