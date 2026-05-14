/**
 * Forest Family 小程序 - 游客模式展示数据
 * 与 Web 版 src/lib/guestData.ts 完全对齐（v3 — 路径修复+数据补齐）
 *
 * 家庭设定：
 * - 妈妈：管理员，320⭐
 * - 爸爸：家长角色，180⭐
 * - 小明：小学三年级男生，9岁，186⭐
 * - 小红：初中一年级女生，13岁，254⭐
 */
import Taro from '@tarojs/taro';

const now = new Date();
const today = now.toISOString().split('T')[0];
const tomorrow = new Date(now.getTime() + 86400000).toISOString().split('T')[0];
const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

// ========== 游客家庭成员（对齐 Web 版 + 补充 pin/password 字段）==========
export const GUEST_MEMBERS = [
  {
    id: 'guest-mom',
    name: '妈妈',
    avatar: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/avatars/parent/Cute_cartoon_avatar_of_a_young_2026-04-27T18-33-05.png',
    stars: 320,
    role: 'parent' as const,
    family_id: 'guest-family',
    // 管理员无 PIN（可直接切换）
  },
  {
    id: 'guest-dad',
    name: '爸爸',
    avatar: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/avatars/parent/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-33-03.png',
    stars: 180,
    role: 'parent' as const,
    family_id: 'guest-family',
    // 管理员无 PIN（可直接切换）
  },
  {
    id: 'guest-son',
    name: '小明',
    avatar: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-10.png',
    stars: 186,
    role: 'child' as const,
    family_id: 'guest-family',
    pin: '1234',        // 孩子账号有 PIN 码保护
    password: 'child123', // 孩子登录密码
  },
  {
    id: 'guest-daughter',
    name: '小红',
    avatar: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-54.png',
    stars: 254,
    role: 'child' as const,
    family_id: 'guest-family',
    pin: '5678',        // 孩子账号有 PIN 码保护
    password: 'girl123', // 孩子登录密码
  },
];

// ========== 游客任务（对齐Web版 18个任务）==========
export const GUEST_TASKS = [
  // ==================== 小明（小学三年级）的任务 ====================

  // Q1 紧急重要：明天截止
  {
    id: 'guest-t1',
    title: '数学作业：两位数乘法',
    description: '完成课本第35页全部练习题，明天上课要交',
    type: 'once' as const,
    start_time: today + 'T09:00:00.000Z',
    end_time: tomorrow + 'T08:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 30,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawaii_doing_homewor_2026-04-27T20-18-31.png',
    is_habit: false,
  },
  // Q1 紧急重要
  {
    id: 'guest-t2',
    title: '书法练习：抄写古诗三首',
    description: '用笔抄写《静夜思》《春晓》《悯农》，字迹工整',
    type: 'once' as const,
    start_time: today + 'T14:00:00.000Z',
    end_time: tomorrow + 'T08:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 25,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawaii_calligraphy_w_2026-04-27T20-18-14.png',
    is_habit: false,
  },
  // Q1 已提交待审核
  {
    id: 'guest-t3',
    title: '语文阅读理解练习',
    description: '完成练习册第12-13页（已提交待审核）',
    type: 'once' as const,
    start_time: yesterday + 'T15:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 20,
    status: 'reviewing' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawaii_icon_of_readi_2026-04-27T20-17-45.png',
    is_habit: false,
  },
  // Q2 重要不紧急：习惯养成
  {
    id: 'guest-t4',
    title: '每日阅读30分钟',
    description: '选择喜欢的课外书，培养阅读习惯',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T19:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 15,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawaii_icon_of_readi_2026-04-27T20-17-45.png',
    is_habit: true,
    target_count: 7,
    current_count: 4,
  },
  {
    id: 'guest-t5',
    title: '跳绳锻炼10分钟',
    description: '每天坚持跳绳，增强体质',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T17:00:00.000Z',
    assignee_id: 'guest-son',
    assignee_ids: ['guest-son', 'guest-daughter'],
    creator_id: 'guest-dad',
    reward_stars: 10,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/life/Cute_flat_kawai_jump_rope_exe_2026-04-27T20-21-23.png',
    is_habit: true,
    target_count: 7,
    current_count: 5,
  },
  // 【新增】Q1 准备下月朗诵比赛
  {
    id: 'guest-t6',
    title: '准备下月朗诵比赛',
    description: '背诵《将进酒》，注意抑扬顿挫和情感表达',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T16:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-dad',
    reward_stars: 50,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawei_reciting_ancie_2026-04-27T20-19-17.png',
    is_habit: false,
  },
  // 【新增】整理玩具
  {
    id: 'guest-t7',
    title: '整理玩具',
    description: '把散落在房间各处的玩具分类收纳到箱子里',
    type: 'once' as const,
    start_time: today + 'T10:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 10,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/independent/Cute_flat_kawai_organizing_toy_2026-04-27T20-22-27.png',
    is_habit: false,
  },

  // ==================== 小红（初中一年级）的任务 ====================

  // Q1 紧急重要：明早考试
  {
    id: 'guest-t9',
    title: '数学期中考试复习',
    description: '复习前三章内容，明天上午考试',
    type: 'once' as const,
    start_time: today + 'T19:00:00.000Z',
    end_time: tomorrow + 'T10:00:00.000Z',
    assignee_id: 'guest-daughter',
    creator_id: 'guest-mom',
    reward_stars: 50,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawaii_doing_homewor_2026-04-27T20-18-31.png',
    is_habit: false,
  },
  // Q2 重要不紧急
  {
    id: 'guest-t10',
    title: '英语作文：My Dream Job',
    description: '不少于120词，后天上课交',
    type: 'once' as const,
    start_time: today + 'T15:00:00.000Z',
    end_time: tomorrow + 'T23:59:59.000Z',
    assignee_id: 'guest-daughter',
    creator_id: 'guest-mom',
    reward_stars: 40,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawaii_English_learn_2026-04-27T20-19-13.png',
    is_habit: false,
  },
  // 已提交待审核
  {
    id: 'guest-t11',
    title: '科学实验报告（已提交待审核）',
    description: '种子发芽观察实验，记录7天数据',
    type: 'once' as const,
    start_time: yesterday + 'T16:00:00.000Z',
    assignee_id: 'guest-daughter',
    creator_id: 'guest-daughter',
    reward_stars: 35,
    status: 'reviewing' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawaii_science_exper_2026-04-27T20-19-20.png',
    is_habit: false,
  },
  // 习惯
  {
    id: 'guest-t12',
    title: '英语单词背诵20个',
    description: '每天背诵并默写，长期积累很重要',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T07:00:00.000Z',
    assignee_id: 'guest-daughter',
    creator_id: 'guest-mom',
    reward_stars: 20,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawei_reciting_ancie_2026-04-27T20-19-17.png',
    is_habit: true,
    target_count: 30,
    current_count: 12,
  },
  {
    id: 'guest-t14',
    title: '跑步锻炼20分钟',
    description: '中考体育要考800米，平时多练习',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T06:30:00.000Z',
    assignee_id: 'guest-daughter',
    creator_id: 'guest-dad',
    reward_stars: 15,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/life/Cute_flat_kawai_sports_exerci_2026-04-27T20-21-52.png',
    is_habit: true,
    target_count: 5,
    current_count: 2,
  },
  // 【新增】练习小提琴
  {
    id: 'guest-t15',
    title: '练习小提琴',
    description: '每天练琴30分钟，准备下周的独奏演出',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T18:00:00.000Z',
    assignee_id: 'guest-daughter',
    creator_id: 'guest-daughter',
    reward_stars: 30,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/hobby/Cute_flat_kawai_piano_playing__2026-04-27T20-21-20.png',
    is_habit: false,
  },
  // 【新增】课外阅读朝花夕拾
  {
    id: 'guest-t16',
    title: '课外阅读：朝花夕拾',
    description: '每周读一篇并写200字读后感',
    type: 'weekly' as const,
    frequency: 'weekly',
    start_time: today + 'T20:00:00.000Z',
    assignee_id: 'guest-daughter',
    creator_id: 'guest-mom',
    reward_stars: 40,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/study/Cute_flat_kawaii_icon_of_readi_2026-04-27T20-17-45.png',
    is_habit: false,
  },

  // ==================== 奖励类（周末奖励）====================

  // 【新增】看动画片周末奖励
  {
    id: 'guest-t17a',
    title: '看动画片周末奖励',
    description: '周六下午可以自由选择喜欢的动画片观看',
    type: 'reward' as const,
    start_time: today + 'T14:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 0,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/praise/Cute_flat_kawaii_icon_of_winni_2026-04-27T20-11-39.png',
    is_habit: false,
  },
  // 【新增】回复同学群消息
  {
    id: 'guest-t17b',
    title: '回复同学群消息',
    description: '及时回复班级群里的通知和讨论',
    type: 'reward' as const,
    start_time: today + 'T12:00:00.000Z',
    assignee_id: 'guest-daughter',
    creator_id: 'guest-daughter',
    reward_stars: 0,
    status: 'completed' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/hobby/Cute_flat_kawai_coding_progra_2026-04-27T20-21-47.png',
    is_habit: false,
  },

  // ==================== 已完成的任务（历史）====================
  {
    id: 'guest-t18',
    title: '收拾书包（已完成）',
    description: '把明天的课本和文具整理好',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: yesterday + 'T20:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 10,
    status: 'completed' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/independent/Cute_flat_kawai_packing_schoo_2026-04-27T20-22-27.png',
    is_habit: false,
  },

  // ==================== 惩罚类 ====================
  // 【新增】刷短视频超时惩罚
  {
    id: 'guest-t19',
    title: '刷短视频超时',
    description: '今天刷短视频超过30分钟了',
    type: 'penalty' as const,
    start_time: today + 'T22:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: -5,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/critique/Cute_flat_kawaii_icon_of_wasti_2026-04-27T20-09-02.png',
    is_habit: false,
  },
];

// ========== 游客习惯（奖惩卡片）==========
export const GUEST_HABITS = [
  // 积极习惯
  {
    id: 'guest-h1',
    title: '每日早起（7:00前）',
    description: '不迟到，养成良好作息习惯',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T07:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 10,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/life/Cute_flat_kawaii_waking_up_ear_2026-04-27T20-20-31.png',
    is_habit: true,
    target_count: 7,
    current_count: 5,
  },
  {
    id: 'guest-h2',
    title: '每天喝水8杯',
    description: '保持健康饮水习惯',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T08:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 5,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/life/Cute_flat_kawaii_drinking_milk_2026-04-27T20-19-53.png',
    is_habit: true,
    target_count: 8,
    current_count: 4,
  },
  {
    id: 'guest-h3',
    title: '老师表扬',
    description: '在学校表现好，得到老师表扬',
    type: 'once' as const,
    start_time: today + 'T10:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: 50,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/praise/Cute_flat_kawaii_icon_of_teach_2026-04-27T20-11-28.png',
    is_habit: true,
    target_count: 1,
    current_count: 0,
  },

  // 消极习惯（惩罚）
  {
    id: 'guest-h4',
    title: '晚睡（超过22:00）',
    description: '早睡早起身体好，晚睡要扣星星',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T22:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: -15,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/critique/Cute_flat_kawaii_icon_of_stayi_2026-04-27T20-09-38.png',
    is_habit: true,
    target_count: 1,
    current_count: 0,
  },
  {
    id: 'guest-h5',
    title: '挑食',
    description: '好好吃饭不挑食，营养均衡才健康',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T12:00:00.000Z',
    assignee_id: 'guest-son',
    creator_id: 'guest-mom',
    reward_stars: -10,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/critique/Cute_flat_kawaii_icon_of_picky_2026-04-27T20-09-54.png',
    is_habit: true,
    target_count: 1,
    current_count: 0,
  },
  {
    id: 'guest-h6',
    title: '玩手机超时',
    description: '每天使用手机不超过30分钟',
    type: 'daily' as const,
    frequency: 'daily',
    start_time: today + 'T21:00:00.000Z',
    assignee_id: 'guest-daughter',
    creator_id: 'guest-mom',
    reward_stars: -20,
    status: 'pending' as const,
    icon: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/task-icons/critique/Cute_flat_kawaii_icon_of_using__2026-04-27T20-10-10.png',
    is_habit: true,
    target_count: 1,
    current_count: 0,
  },
];

// ========== 游客心愿/奖励（对齐Web版 + 模板库真实图片）==========
// 图片路径来自 static/reward-icons/（Taro copy 配置会复制到 dist/static/）
// category 与 rewards/index.tsx 中 CATEGORIES 的 key 对齐（英文）
export const GUEST_REWARDS = [
  { id: 'guest-r1', name: '看电视', description: '看30分钟动画片', cost: 30, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-21.png', category: 'common' },
  { id: 'guest-r2', name: '冰淇淋', description: '一个美味冰淇淋', cost: 40, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-28.png', category: 'common' },
  { id: 'guest-r3', name: '玩游戏', description: '玩30分钟电子游戏', cost: 50, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-31.png', category: 'common' },
  { id: 'guest-r4', name: '家庭电影夜', description: '全家一起看电影，配爆米花和饮料', cost: 200, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/experience/Cute_flat_kawaii_amusement_par_2026-04-27T19-43-16.png', category: 'experience' },
  { id: 'guest-r5', name: '乐高套装', description: '购买一套乐高积木玩具', cost: 400, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/prize/Cute_flat_kawaii_LEGO_building_2026-04-27T19-48-32.png', category: 'experience' },
  { id: 'guest-r6', name: '储零花钱', description: '获得一笔可以自由支配的零花钱', cost: 100, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/experience/Cute_flat_kawaii_free_pass_tic_2026-04-27T19-43-17.png', category: 'common' },
  { id: 'guest-r7', name: '游乐园', description: '去游乐园玩一整天！', cost: 500, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/experience/A_cute_flat_design_kawaii_styl_2026-04-27T19-42-05.png', category: 'experience' },
  { id: 'guest-r8', name: '北京环球影城', description: '全家一起去北京环球影城游玩两天', cost: 3000, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/activity/Cute_flat_kawaii_Universal_Stu_2026-04-27T19-47-50.png', category: 'experience', stock: 2 },
  { id: 'guest-r9', name: '骑行郊游', description: '全家一起去骑自行车郊游', cost: 100, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/growth/Cute_flat_kawaii_cycling_bike__2026-04-27T19-46-53.png', category: 'growth' },
  { id: 'guest-r10', name: '肯德基全家桶', description: '享用一次肯德基全家桶套餐', cost: 150, icon: '', image: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/reward-icons/activity/Cute_flat_kawaii_McDonalds_fas_2026-04-27T19-49-02.png', category: 'activity' },
];

// ========== 游客历史记录（对齐Web版 9条）==========
export const GUEST_HISTORY = [
  { id: 'guest-hist1', user_id: 'guest-son', title: '完成习惯: 每日早起', type: 'task', stars: 10, timestamp: today + 'T07:15:00.000Z', icon: 'Sun' },
  { id: 'guest-hist2', user_id: 'guest-son', title: '完成任务: 收拾书包', type: 'task', stars: 10, timestamp: yesterday + 'T20:30:00.000Z', icon: 'CheckCircle' },
  { id: 'guest-hist3', user_id: 'guest-daughter', title: '完成任务: 练习小提琴', type: 'task', stars: 30, timestamp: yesterday + 'T18:30:00.000Z', icon: 'Music' },
  { id: 'guest-hist4', user_id: 'guest-daughter', title: '完成任务: 英语单词背诵', type: 'task', stars: 20, timestamp: yesterday + 'T07:30:00.000Z', icon: 'Languages' },
  { id: 'guest-hist5', user_id: 'guest-son', title: '完成习惯: 每天喝水8杯', type: 'task', stars: 5, timestamp: yesterday + 'T18:00:00.000Z', icon: 'Droplets' },
  { id: 'guest-hist6', user_id: 'guest-son', title: '老师表扬: 课堂积极发言', type: 'task', stars: 50, timestamp: yesterday + 'T10:30:00.000Z', icon: 'Award' },
  { id: 'guest-hist7', user_id: 'guest-daughter', title: '兑换心愿: 看电视', type: 'redeem', stars: -30, timestamp: yesterday + 'T19:00:00.000Z', icon: 'Gift' },
  { id: 'guest-hist8', user_id: 'guest-son', title: '完成任务: 数学作业', type: 'task', stars: 30, timestamp: yesterday + 'T16:00:00.000Z', icon: 'BookOpen' },
  { id: 'guest-hist9', user_id: 'guest-daughter', title: '惩罚: 玩手机超时', type: 'penalty', stars: -20, timestamp: yesterday + 'T22:30:00.000Z', icon: 'Smartphone' },
];

/** 获取所有游客展示数据 */
export function getGuestData() {
  return {
    currentUser: GUEST_MEMBERS[2],
    members: GUEST_MEMBERS,
    tasks: [...GUEST_TASKS, ...GUEST_HABITS],
    rewards: GUEST_REWARDS,
    history: GUEST_HISTORY,
  };
}

/** 判断当前是否为游客模式 */
export function isGuestMode(): boolean {
  try {
    return Taro.getStorageSync('wishcard_guest_mode') === 'true';
  } catch {
    return false;
  }
}

/** 设置游客模式 */
export function setGuestMode(enabled: boolean): void {
  Taro.setStorageSync('wishcard_guest_mode', String(enabled));
}
