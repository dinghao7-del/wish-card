/**
 * Forest Family - 模板库
 * 使用本地 PNG 卡通头像，100% 本地，无需网络
 * AI 生成的亚洲风格卡通头像
 */

// ========== 图标名称（对应 Lucide React 图标）==========

export const TASK_ICONS = [
  'Home', 'Book', 'Brush', 'Gamepad2', 'Music',
  'Dumbbell', 'Apple', 'Heart', 'Star', 'Zap',
  'Clock', 'Bell', 'CheckCircle', 'Smile', 'Ban',
  'Globe', 'PenTool', 'Calculator', 'Flask', 'Palette',
  'Bike', 'Moon', 'Sun', 'Cloud', 'Flower',
];

// ========== 头像库（本地 PNG 卡通头像 - 亚洲风格）==========

export interface AvatarOption {
  id: string;
  name: string;       // 显示名称
  src: string;        // 头像图片路径（本地）
}

// 男孩头像（10个）
export const BOY_AVATARS: AvatarOption[] = [
  { id: 'b1',  name: '男孩1', src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-10.png' },
  { id: 'b2',  name: '男孩2', src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-12.png' },
  { id: 'b3',  name: '男孩3', src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-25.png' },
  { id: 'b4',  name: '男孩4', src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-36.png' },
  { id: 'b5',  name: '男孩5', src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-29-14.png' },
  { id: 'b6',  name: '男孩6', src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-29-16.png' },
  { id: 'b7',  name: '男孩7', src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-29-20.png' },
  { id: 'b8',  name: '男孩8', src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-29-32.png' },
  { id: 'b9',  name: '男孩9', src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-10.png' },
  { id: 'b10', name: '男孩10',src: '/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-11.png' },
];

// 女孩头像（10个）
export const GIRL_AVATARS: AvatarOption[] = [
  { id: 'g1',  name: '女孩1', src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-54.png' },
  { id: 'g2',  name: '女孩2', src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-55.png' },
  { id: 'g3',  name: '女孩3', src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-56.png' },
  { id: 'g4',  name: '女孩4', src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-30-59.png' },
  { id: 'g5',  name: '女孩5', src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-31-33.png' },
  { id: 'g6',  name: '女孩6', src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-31-36.png' },
  { id: 'g7',  name: '女孩7', src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-31-40.png' },
  { id: 'g8',  name: '女孩8', src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-32-15.png' },
  { id: 'g9',  name: '女孩9', src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-32-24.png' },
  { id: 'g10', name: '女孩10',src: '/avatars/girl/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-40-54.png' },
];

// 父母头像（10个：妈妈+爸爸）
export const PARENT_AVATARS: AvatarOption[] = [
  { id: 'p1',  name: '妈妈1', src: '/avatars/parent/Cute_cartoon_avatar_of_a_young_2026-04-27T18-33-05.png' },
  { id: 'p2',  name: '妈妈2', src: '/avatars/parent/Cute_cartoon_avatar_of_a_young_2026-04-27T18-33-08.png' },
  { id: 'p3',  name: '爸爸1', src: '/avatars/parent/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-33-03.png' },
  { id: 'p4',  name: '爸爸2', src: '/avatars/parent/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-33-09.png' },
  { id: 'p5',  name: '妈妈3', src: '/avatars/parent/Cute_cartoon_avatar_of_a_young_2026-04-27T18-33-32.png' },
  { id: 'p6',  name: '爸爸3', src: '/avatars/parent/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-33-34.png' },
  { id: 'p7',  name: '妈妈4', src: '/avatars/parent/Cute_cartoon_avatar_of_a_young_2026-04-27T18-33-38.png' },
  { id: 'p8',  name: '爸爸4', src: '/avatars/parent/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-33-33.png' },
  { id: 'p9',  name: '妈妈5', src: '/avatars/parent/Cute_cartoon_avatar_of_a_young_2026-04-27T18-34-15.png' },
  { id: 'p10', name: '爸爸5', src: '/avatars/parent/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-34-42.png' },
];

// 爷爷奶奶头像（10个）
export const GRANDPARENT_AVATARS: AvatarOption[] = [
  { id: 'gp1',  name: '奶奶1', src: '/avatars/grandparent/Cute_cartoon_avatar_of_an_elde_2026-04-27T18-35-12.png' },
  { id: 'gp2',  name: '爷爷1', src: '/avatars/grandparent/Cute_cartoon_avatar_of_an_elde_2026-04-27T18-35-10.png' },
  { id: 'gp3',  name: '奶奶2', src: '/avatars/grandparent/Cute_cartoon_avatar_of_an_elde_2026-04-27T18-35-14.png' },
  { id: 'gp4',  name: '爷爷2', src: '/avatars/grandparent/Cute_cartoon_avatar_of_a_happy_2026-04-27T18-35-41.png' },
  { id: 'gp5',  name: '奶奶3', src: '/avatars/grandparent/Cute_cartoon_avatar_of_an_elde_2026-04-27T18-36-09.png' },
  { id: 'gp6',  name: '爷爷3', src: '/avatars/grandparent/Cute_cartoon_avatar_of_a_happy_2026-04-27T18-36-09.png' },
  { id: 'gp7',  name: '奶奶4', src: '/avatars/grandparent/Cute_cartoon_avatar_of_an_elde_2026-04-27T18-36-11.png' },
  { id: 'gp8',  name: '爷爷4', src: '/avatars/grandparent/Cute_kawaii_cartoon_illustrati_2026-04-27T18-36-46.png' },
  { id: 'gp9',  name: '奶奶5', src: '/avatars/grandparent/Cute_cartoon_avatar_of_an_elde_2026-04-27T18-37-09.png' },
  { id: 'gp10', name: '爷爷5', src: '/avatars/grandparent/Cute_kawaii_cartoon_illustrati_2026-04-27T18-37-17.png' },
];

// 兼容旧代码的别名
export const CHILD_AVATARS = [...BOY_AVATARS, ...GIRL_AVATARS];
export const ADULT_AVATARS = [...PARENT_AVATARS, ...GRANDPARENT_AVATARS];

// ========== 心愿库（Wish Library / Reward Templates）==========
// 扁平化统一风格图标，100% 本地 PNG，AI 生成
// 分类体系：常用 | 体验 | 奖品 | 特权 | 成长 | 活动

/** 单个心愿模板条目 */
export interface RewardTemplate {
  id: string;           // 唯一标识
  name: string;         // 心愿名称
  description: string;  // 描述
  cost: number;         // 星星花费（正数=奖励，负数=特权类）
  category: string;     // 所属分类
  icon: string;         // 本地图标路径
}

// ─── 分类1：常用（日常高频使用的心愿）──┐
export const REWARD_COMMON: RewardTemplate[] = [
  { id: 'c01', name: '食堂卡',      description: '在学校食堂自由选择一顿美味午餐',           cost: 50,   category: '常用', icon: '/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-21.png' },
  { id: 'c02', name: '储零花钱',    description: '获得一笔可以自由支配的零花钱',               cost: 100,  category: '常用', icon: '/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-28.png' },
  { id: 'c03', name: '看电视',      description: '自由观看一小时喜欢的电视节目',                 cost: 30,   category: '常用', icon: '/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-31.png' },
  { id: 'c04', name: '玩具',        description: '挑选一个心仪的小玩具作为奖励',                 cost: 200,  category: '常用', icon: '/reward-icons/common/Cute_flat_kawaii_children_toys_2026-04-27T19-53-03.png' },
];

// ─── 分类2：体验（特殊活动体验类心愿）──┤
export const REWARD_EXPERIENCE: RewardTemplate[] = [
  { id: 'e01', name: '定制礼物',    description: '定制一份专属你的特别礼物',                   cost: 500,  category: '体验', icon: '/reward-icons/experience/A_cute_flat_design_kawaii_styl_2026-04-27T19-42-05.png' },
  { id: 'e02', name: '万能卡',      description: '万能兑换券，可抵扣任意心愿的一半星星',       cost: 800,  category: '体验', icon: '/reward-icons/experience/A_cute_flat_design_kawaii_styl_2026-04-27T19-42-18.png' },
  { id: 'e03', name: '家庭电影',    description: '全家一起看电影，配爆米花和饮料',             cost: 200,  category: '体验', icon: '/reward-icons/experience/A_cute_flat_design_kawaii_styl_2026-04-27T19-42-17.png' },
  { id: 'e04', name: '游乐园',      description: '去游乐园玩一整天！',                           cost: 1000, category: '体验', icon: '/reward-icons/experience/Cute_flat_kawaii_amusement_par_2026-04-27T19-43-16.png' },
  { id: 'e05', name: '免费卡',      description: '免除一次家务任务的免费通行卡',             cost: 150,  category: '体验', icon: '/reward-icons/experience/Cute_flat_kawaii_free_pass_tic_2026-04-27T19-43-17.png' },
  { id: 'e06', name: '特权卡',      description: 'VIP特权：挑选今晚的晚餐菜单',                cost: 300,  category: '体验', icon: '/reward-icons/experience/Cute_flat_kawaii_privilege_VIP_2026-04-27T19-43-15.png' },
  { id: 'e07', name: '超级卡',      description: '终极愿望卡：实现一个合理的任何愿望',          cost: 2000, category: '体验', icon: '/reward-icons/experience/Cute_flat_kawaii_super_premium_2026-04-27T19-43-34.png' },
];

// ─── 分类3：奖品（实物/数字奖品）─────────┤
export const REWARD_PRIZE: RewardTemplate[] = [
  { id: 'p01', name: '玩游戏',      description: '畅玩电子游戏一小时',                          cost: 50,   category: '奖品', icon: '/reward-icons/prize/Cute_flat_kawaii_video_game_co_2026-04-27T19-44-07.png' },
  { id: 'p02', name: '玩平板',      description: '使用平板电脑玩游戏或看视频30分钟',            cost: 40,   category: '奖品', icon: '/reward-icons/prize/Cute_flat_kawaii_tablet_comput_2026-04-27T19-43-57.png' },
  { id: 'p03', name: '玩手机',      description: '使用手机自由浏览或游戏20分钟',                cost: 30,   category: '奖品', icon: '/reward-icons/prize/Cute_flat_kawaii_smartphone_ic_2026-04-27T19-44-05.png' },
  { id: 'p04', name: '零食',        description: '任选一种零食大礼包',                           cost: 80,   category: '奖品', icon: '/reward-icons/prize/Cute_flat_kawaii_snacks_food_i_2026-04-27T19-44-18.png' },
  { id: 'p05', name: '学习用品',    description: '挑选一套新的文具套装',                       cost: 150,  category: '奖品', icon: '/reward-icons/prize/Cute_flat_kawaii_school_suppli_2026-04-27T19-45-10.png' },
  { id: 'p06', name: '书籍',        description: '选购一本你喜欢的书',                         cost: 120,  category: '奖品', icon: '/reward-icons/prize/Cute_flat_kawaii_stack_of_book_2026-04-27T19-44-48.png' },
];

// ─── 分类4：特权（美食/特殊待遇类）──────┤
export const REWARD_PRIVILEGE: RewardTemplate[] = [
  { id: 'v01', name: '肯德基',      description: '享用一次肯德基套餐',                         cost: 150,  category: '特权', icon: '/reward-icons/privilege/Cute_flat_kawaii_KFC_fried_chi_2026-04-27T19-44-47.png' },
  { id: 'v02', name: '宠物',        description: '去宠物店和小动物亲密接触',                     cost: 200,  category: '特权', icon: '/reward-icons/privilege/Cute_flat_kawaii_pet_cat_and_d_2026-04-27T19-44-48.png' },
  { id: 'v03', name: '冰淇淋',     description: '享用一个大号冰淇淋',                         cost: 40,   category: '特权', icon: '/reward-icons/privilege/Cute_flat_kawaii_ice_cream_con_2026-04-27T19-45-45.png' },
  { id: 'v04', name: '喝奶茶',      description: '一杯全糖加料的奶茶',                           cost: 35,   category: '特权', icon: '/reward-icons/privilege/Cute_flat_kawaii_bubble_tea_bo_2026-04-27T19-45-49.png' },
  { id: 'v05', name: '盲盒',        description: '拆开一个神秘盲盒惊喜',                        cost: 60,   category: '特权', icon: '/reward-icons/privilege/Cute_flat_kawaii_mystery_blind_2026-04-27T19-46-08.png' },
];

// ─── 分类5：成长（个人成长/体验类）──────┤
export const REWARD_GROWTH: RewardTemplate[] = [
  { id: 'g01', name: '赖床30分钟',   description: '周末可以多睡半小时懒觉',                    cost: 50,   category: '成长', icon: '/reward-icons/growth/Cute_flat_kawaii_sleeping_in_b_2026-04-27T19-46-48.png' },
  { id: 'g02', name: '旅游',         description: '一次短途旅行或周边游',                      cost: 2000, category: '成长', icon: '/reward-icons/growth/Cute_flat_kawaii_travel_vacati_2026-04-27T19-46-51.png' },
  { id: 'g03', name: '骑行',         description: '全家一起去骑自行车郊游',                    cost: 100,  category: '成长', icon: '/reward-icons/growth/Cute_flat_kawaii_cycling_bike__2026-04-27T19-46-53.png' },
  { id: 'g04', name: '兑换卡',       description: '通用兑换券，可用于兑换任意小礼品',            cost: 200,  category: '成长', icon: '/reward-icons/growth/Cute_flat_kawaii_exchange_coup_2026-04-27T19-47-07.png' },
];

// ─── 分类6：活动（兴趣爱好/户外活动）────┘
export const REWARD_ACTIVITY: RewardTemplate[] = [
  { id: 'a01', name: '养小鸡',       description: '在农场体验喂养小鸡的乐趣',                    cost: 100,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_baby_chick_ch_2026-04-27T19-47-52.png' },
  { id: 'a02', name: '养仓鼠',       description: '领养一只可爱的小仓鼠回家',                    cost: 300,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_hamster_pet_i_2026-04-27T19-47-45.png' },
  { id: 'a03', name: '北京环球影城',description: '去北京环球影城畅玩一天！',                  cost: 3000, category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_Universal_Stu_2026-04-27T19-47-50.png' },
  { id: 'a04', name: '不做作业',     description: '免做一次作业（需提前和老师沟通）',            cost: 500,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_no_homework_f_2026-04-27T19-47-58.png' },
  { id: 'a05', name: '乐高',         description: '购买一套乐高积木玩具',                       cost: 400,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_LEGO_building_2026-04-27T19-48-32.png' },
  { id: 'a06', name: '玩水',         description: '去水上乐园或者游泳池玩耍',                    cost: 150,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_water_play_sw_2026-04-27T19-48-30.png' },
  { id: 'a07', name: '打羽毛球',     description: '和家人来一场羽毛球对决',                     cost: 50,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_badminton_rac_2026-04-27T19-48-32.png' },
  { id: 'a08', name: '拼图',         description: '完成一幅大型拼图作品',                       cost: 80,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_jigsaw_puzzle_2026-04-27T19-48-34.png' },
  { id: 'a09', name: '养猫',         description: '收养一只可爱的猫咪伙伴',                     cost: 500,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_pet_cat_icon__2026-04-27T19-49-11.png' },
  { id: 'a10', name: '麦当劳',       description: '享用麦当劳开心儿童餐',                       cost: 80,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_McDonalds_fas_2026-04-27T19-49-02.png' },
  { id: 'a11', name: '优清内裤',     description: '妈妈帮忙清洗内裤一天（偷懒券）',              cost: 20,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_laundry_under_2026-04-27T19-49-01.png' },
  { id: 'a12', name: '优清袜子',     description: '妈妈帮忙洗袜子一周',                         cost: 15,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_socks_laundry_2026-04-27T19-49-05.png' },
  { id: 'a13', name: '轮滑',         description: '去滑轮场玩轮滑运动',                         cost: 60,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_roller_skatin_2026-04-27T19-49-57.png' },
  { id: 'a14', name: '游戏币',       description: '获得10枚游戏厅代币',                         cost: 50,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_arcade_game_c_2026-04-27T19-49-45.png' },
  { id: 'a15', name: '北京故宫',     description: '参观北京故宫博物院',                         cost: 100,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_Beijing_Forbi_2026-04-27T19-50-35.png' },
  { id: 'a16', name: '电话手表',     description: '获得一块儿童智能电话手表',                   cost: 5000, category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_smartwatch_ph_2026-04-27T19-50-04.png' },
  { id: 'a17', name: '露营露营',     description: '全家一起去户外露营过夜',                     cost: 800,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_camping_tent__2026-04-27T19-50-52.png' },
  { id: 'a18', name: '动物园',       description: '去动物园看各种动物朋友',                     cost: 200,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_zoo_animals_i_2026-04-27T19-50-44.png' },
  { id: 'a19', name: '小马宝莉卡',   description: '收藏版小马宝莉交换卡片',                     cost: 30,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_My_Little_Pon_2026-04-27T19-51-29.png' },
  { id: 'a20', name: '熊猫公仔',     description: '一只超萌的大熊猫毛绒公仔',                     cost: 250,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_panda_bear_ic_2026-04-27T19-51-40.png' },
  { id: 'a21', name: '电系精灵卡',   description: '稀有的电系精灵收藏卡',                       cost: 100,  category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_yellow_electr_2026-04-27T19-52-16.png' },
  { id: 'a22', name: '闪卡',         description: '一张稀有全息闪卡收藏品',                     cost: 80,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_collectible_t_2026-04-27T19-51-48.png' },
  { id: 'a23', name: '养鱼',         description: '在家里养一条金鱼宠物',                       cost: 80,   category: '活动', icon: '/reward-icons/activity/Cute_flat_kawaii_fish_bowl_aqu_2026-04-27T19-51-00.png' },
];

// ========== 心愿库汇总 ==========

/** 所有分类标签（按显示顺序） */
export const REWARD_CATEGORIES = [
  { id: '常用',   label: '常用', templates: REWARD_COMMON },
  { id: '体验',   label: '体验', templates: REWARD_EXPERIENCE },
  { id: '奖品',   label: '奖品', templates: REWARD_PRIZE },
  { id: '特权',   label: '特权', templates: REWARD_PRIVILEGE },
  { id: '成长',   label: '成长', templates: REWARD_GROWTH },
  { id: '活动',   label: '活动', templates: REWARD_ACTIVITY },
] as const;

/** 全部心愿模板合并数组（方便遍历） */
export const ALL_REWARD_TEMPLATES: RewardTemplate[] = [
  ...REWARD_COMMON,
  ...REWARD_EXPERIENCE,
  ...REWARD_PRIZE,
  ...REWARD_PRIVILEGE,
  ...REWARD_GROWTH,
  ...REWARD_ACTIVITY,
];

// ========== 任务模板库（Task Template Library / 选择模板）==========
// 扁平化统一风格图标，100% 本地 PNG，AI 生成
// 对应 TaskTemplateSelector.tsx 的「选择模板」弹窗
// 分类体系：学习 | 生活 | 兴趣 | 独立 | 表扬 | 批评

/** 单个任务模板条目 */
export interface HabitTemplate {
  id: string;           // 唯一标识
  title: string;        // 模板标题
  description?: string; // 可选描述
  category: string;     // 所属分类
  stars: number;        // 星星值（正数=奖励，负数=扣分）
  icon: string;         // 本地图标路径
}

// ─── 分类1：学习（学业相关习惯）──┐
export const TASK_STUDY: HabitTemplate[] = [
  { id: 's01', title: '练字',       category: '学习', stars: 30,  icon: '/task-icons/study/Cute_flat_kawaii_calligraphy_w_2026-04-27T20-18-14.png' },
  { id: 's02', title: '计算',       category: '学习', stars: 30,  icon: '/task-icons/study/Cute_flat_kawaii_icon_of_math__2026-04-27T20-17-41.png' },
  { id: 's03', title: '阅读',       category: '学习', stars: 40,  icon: '/task-icons/study/Cute_flat_kawaii_icon_of_readi_2026-04-27T20-17-45.png' },
  { id: 's04', title: '听写',       category: '学习', stars: 30,  icon: '/task-icons/study/Cute_flat_kawaii_dictation_spe_2026-04-27T20-18-18.png' },
  { id: 's05', title: '做作业',     category: '学习', stars: 50,  icon: '/task-icons/study/Cute_flat_kawaii_doing_homewor_2026-04-27T20-18-31.png' },
  { id: 's06', title: '背单词',     category: '学习', stars: 40,  icon: '/task-icons/study/Cute_flat_kawaii_memorizing_En_2026-04-27T20-18-16.png' },
  { id: 's07', title: '口算',       category: '学习', stars: 20,  icon: '/task-icons/study/Cute_flat_kawaii_mental_arithm_2026-04-27T20-19-01.png' },
  { id: 's08', title: '古诗',       category: '学习', stars: 30,  icon: '/task-icons/study/Cute_flat_kawei_reciting_ancie_2026-04-27T20-19-17.png' },
  { id: 's09', title: '英语',       category: '学习', stars: 40,  icon: '/task-icons/study/Cute_flat_kawaii_English_learn_2026-04-27T20-19-13.png' },
];

// ─── 分类2：生活（日常生活好习惯）────┤
export const TASK_LIFE: HabitTemplate[] = [
  { id: 'l01', title: '多喝水',     category: '生活', stars: 10,  icon: '/task-icons/life/Cute_flat_kawaii_drinking_wate_2026-04-27T20-19-03.png' },
  { id: 'l02', title: '吃水果',     category: '生活', stars: 10,  icon: '/task-icons/life/Cute_flat_kawaii_eating_fresh__2026-04-27T20-19-50.png' },
  { id: 'l03', title: '吃蔬菜',     category: '生活', stars: 10,  icon: '/task-icons/life/Cute_flat_kawaii_eating_vegeta_2026-04-27T20-19-51.png' },
  { id: 'l04', title: '喝牛奶',     category: '生活', stars: 10,  icon: '/task-icons/life/Cute_flat_kawaii_drinking_milk_2026-04-27T20-19-53.png' },
  { id: 'l05', title: '吃鸡蛋',     category: '生活', stars: 10,  icon: '/task-icons/life/Cute_flat_kawaii_eating_eggs_p_2026-04-27T20-19-59.png' },
  { id: 'l06', title: '每日早起',   category: '生活', stars: 20,  icon: '/task-icons/life/Cute_flat_kawaii_waking_up_ear_2026-04-27T20-20-31.png' },
  { id: 'l07', title: '睡午觉',     category: '生活', stars: 20,  icon: '/task-icons/life/Cute_flat_kawaii_taking_aftern_2026-04-27T20-20-39.png' },
  { id: 'l08', title: '刷牙',       category: '生活', stars: 10,  icon: '/task-icons/life/Cute_flat_kawaii_brushing_teet_2026-04-27T20-20-31.png' },
  { id: 'l09', title: '洗脸',       category: '生活', stars: 10,  icon: '/task-icons/life/Cute_flat_kawaii_washing_face__2026-04-27T20-20-33.png' },
];

// ─── 分类3：兴趣（兴趣爱好类）────────┤
export const TASK_HOBBY: HabitTemplate[] = [
  { id: 'h01', title: '做手工',     category: '兴趣', stars: 30,  icon: '/task-icons/hobby/Cute_flat_kawaii_arts_and_craf_2026-04-27T20-21-09.png' },
  { id: 'h02', title: '弹钢琴',     category: '兴趣', stars: 50,  icon: '/task-icons/hobby/Cute_flat_kawai_piano_playing__2026-04-27T20-21-20.png' },
  { id: 'h03', title: '跳绳',       category: '兴趣', stars: 30,  icon: '/task-icons/hobby/Cute_flat_kawaii_jump_rope_exe_2026-04-27T20-21-23.png' },
  { id: 'h04', title: '打球',       category: '兴趣', stars: 50,  icon: '/task-icons/hobby/Cute_flat_kawaii_playing_ball__2026-04-27T20-21-21.png' },
  { id: 'h05', title: '编程',       category: '兴趣', stars: 100, icon: '/task-icons/hobby/Cute_flat_kawaii_coding_progra_2026-04-27T20-21-47.png' },
  { id: 'h06', title: '绘画',       category: '兴趣', stars: 40,  icon: '/task-icons/hobby/Cute_flat_kawaii_painting_draw_2026-04-27T20-22-01.png' },
  { id: 'h07', title: '运动',       category: '兴趣', stars: 40,  icon: '/task-icons/hobby/Cute_flat_kawaii_sports_exerci_2026-04-27T20-21-52.png' },
  { id: 'h08', title: '自行车',     category: '兴趣', stars: 40,  icon: '/task-icons/hobby/Cute_flat_kawaii_riding_bicycl_2026-04-27T20-21-54.png' },
];

// ─── 分类4：独立（自理能力培养）────────┤
export const TASK_INDEPENDENT: HabitTemplate[] = [
  { id: 'i01', title: '收拾书包',   category: '独立', stars: 20,  icon: '/task-icons/independent/Cute_flat_kawaii_packing_schoo_2026-04-27T20-22-27.png' },
  { id: 'i02', title: '整理玩具',   category: '独立', stars: 30,  icon: '/task-icons/independent/Cute_flat_kawai_organizing_toy_2026-04-27T20-22-27.png' },
  { id: 'i03', title: '自己上学',   category: '独立', stars: 50,  icon: '/task-icons/independent/Cute_flat_kawaii_going_to_scho_2026-04-27T20-22-35.png' },
  { id: 'i04', title: '按时吃饭',   category: '独立', stars: 20,  icon: '/task-icons/independent/Cute_flat_kawaii_eating_meals__2026-04-27T20-22-48.png' },
  { id: 'i05', title: '漱口',       category: '独立', stars: 10,  icon: '/task-icons/independent/Cute_flat_kawaii_mouth_rinsing_2026-04-27T20-23-20.png' },
  { id: 'i06', title: '穿衣服',     category: '独立', stars: 20,  icon: '/task-icons/independent/Cute_flat_kawaii_getting_dress_2026-04-27T20-23-19.png' },
  { id: 'i07', title: '检查作业',   category: '独立', stars: 30,  icon: '/task-icons/independent/Cute_flat_kawai_checking_homew_2026-04-27T20-23-21.png' },
  { id: 'i08', title: '自己睡觉',   category: '独立', stars: 40,  icon: '/task-icons/independent/Cute_flat_kawaii_going_to_slee_2026-04-27T20-23-27.png' },
];

// ─── 分类5：表扬（正向行为奖励）────────┤
export const TASK_PRAISE: HabitTemplate[] = [
  { id: 'p01', title: '老师表扬',   category: '表扬', stars: 50,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_teach_2026-04-27T20-11-28.png' },
  { id: 'p02', title: '考试进步',   category: '表扬', stars: 80,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_exam__2026-04-27T20-11-30.png' },
  { id: 'p03', title: '获得奖项',   category: '表扬', stars: 100, icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_winni_2026-04-27T20-11-39.png' },
  { id: 'p04', title: '爱分享',     category: '表扬', stars: 20,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_shari_2026-04-27T20-11-36.png' },
  { id: 'p05', title: '讲礼貌',     category: '表扬', stars: 20,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_being_2026-04-27T20-12-04.png' },
  { id: 'p06', title: '爱关心',     category: '表扬', stars: 30,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_carin_2026-04-27T20-12-09.png' },
  { id: 'p07', title: '照顾弟妹',   category: '表扬', stars: 50,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_takin_2026-04-27T20-12-11.png' },
  { id: 'p08', title: '爱护玩具',   category: '表扬', stars: 20,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_carin_2026-04-27T20-12-15.png' },
  { id: 'p09', title: '乐于助人',   category: '表扬', stars: 20,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_helpi_2026-04-27T20-12-41.png' },
  { id: 'p10', title: '拾金不昧',   category: '表扬', stars: 50,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_retur_2026-04-27T20-12-51.png' },
  { id: 'p11', title: '战胜困难',   category: '表扬', stars: 50,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_overc_2026-04-27T20-12-50.png' },
  { id: 'p12', title: '克服恐惧',   category: '表扬', stars: 50,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_conqu_2026-04-27T20-12-56.png' },
  { id: 'p13', title: '学会赞美',   category: '表扬', stars: 20,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_learn_2026-04-27T20-13-21.png' },
  { id: 'p14', title: '坚持不懈',   category: '表扬', stars: 50,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_persi_2026-04-27T20-13-32.png' },
  { id: 'p15', title: '反省自己',   category: '表扬', stars: 30,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_self__2026-04-27T20-13-29.png' },
  { id: 'p16', title: '承认错误',   category: '表扬', stars: 50,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_admit_2026-04-27T20-13-36.png' },
  { id: 'p17', title: '打招呼',     category: '表扬', stars: 20,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_greet_2026-04-27T20-14-08.png' },
  { id: 'p18', title: '自己事自己做', category: '表扬', stars: 30,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_doing_2026-04-27T20-14-08.png' },
  { id: 'p19', title: '光盘行动',   category: '表扬', stars: 20,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_clean_2026-04-27T20-14-05.png' },
  { id: 'p20', title: '100分',       category: '表扬', stars: 100, icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_perfe_2026-04-27T20-14-10.png' },
  { id: 'p21', title: '95分',       category: '表扬', stars: 90,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_95_po_2026-04-27T20-14-51.png' },
  { id: 'p22', title: '90分',       category: '表扬', stars: 80,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_90_po_2026-04-27T20-14-57.png' },
  { id: 'p23', title: 'A',           category: '表扬', stars: 85,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_A_gra_2026-04-27T20-14-47.png' },
  { id: 'p24', title: '奖状',       category: '表扬', stars: 100, icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_award_2026-04-27T20-14-57.png' },
  { id: 'p25', title: 'A+',          category: '表扬', stars: 95,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_A_plu_2026-04-27T20-16-10.png' },
  { id: 'p26', title: '满分',       category: '表扬', stars: 100, icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_full__2026-04-27T20-15-39.png' },
  { id: 'p27', title: '举手',       category: '表扬', stars: 15,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_raisi_2026-04-27T20-15-34.png' },
  { id: 'p28', title: '不吃零食',   category: '表扬', stars: 20,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_refus_2026-04-27T20-15-30.png' },
  { id: 'p29', title: 'A++',         category: '表扬', stars: 98,  icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_A_plu_2026-04-27T20-15-25.png' },
  { id: 'p30', title: '学霸',       category: '表扬', stars: 100, icon: '/task-icons/praise/Cute_flat_kawaii_icon_of_top_s_2026-04-27T20-16-28.png' },
];

// ─── 分类6：批评（负向行为扣分）────────┘
export const TASK_CRITIQUE: HabitTemplate[] = [
  { id: 'c01', title: '撒谎欺骗',   category: '批评', stars: -50, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_a_chi_2026-04-27T20-06-50.png' },
  { id: 'c02', title: '顶撞父母',   category: '批评', stars: -50, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_an_an_2026-04-27T20-06-45.png' },
  { id: 'c03', title: '乱扔垃圾',   category: '批评', stars: -10, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_litte_2026-04-27T20-06-46.png' },
  { id: 'c04', title: '说脏话',     category: '批评', stars: -30, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_a_chi_2026-04-27T20-07-02.png' },
  { id: 'c05', title: '拖拖拉拉',   category: '批评', stars: -20, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_procr_2026-04-27T20-07-43.png' },
  { id: 'c06', title: '打人骂人',   category: '批评', stars: -50, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_hitti_2026-04-27T20-07-45.png' },
  { id: 'c07', title: '不文明',     category: '批评', stars: -20, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_unciv_2026-04-27T20-07-48.png' },
  { id: 'c08', title: '生气哭闹',   category: '批评', stars: -30, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_a_cry_2026-04-27T20-07-45.png' },
  { id: 'c09', title: '赖床',       category: '批评', stars: -20, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_a_chi_2026-04-27T20-08-18.png' },
  { id: 'c10', title: '不守时',     category: '批评', stars: -20, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_being_2026-04-27T20-08-26.png' },
  { id: 'c11', title: '丢三落四',   category: '批评', stars: -20, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_losin_2026-04-27T20-08-27.png' },
  { id: 'c12', title: '偷玩手机',   category: '批评', stars: -30, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_secre_2026-04-27T20-08-37.png' },
  { id: 'c13', title: '浪费粮食',   category: '批评', stars: -10, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_wasti_2026-04-27T20-09-02.png' },
  { id: 'c14', title: '驼背',       category: '批评', stars: -15, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_bad_p_2026-04-27T20-09-07.png' },
  { id: 'c15', title: '不穿鞋',     category: '批评', stars: -10, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_not_w_2026-04-27T20-09-08.png' },
  { id: 'c16', title: '吃手指',     category: '批评', stars: -10, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_thumb_2026-04-27T20-09-08.png' },
  { id: 'c17', title: '晚睡',       category: '批评', stars: -20, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_stayi_2026-04-27T20-09-38.png' },
  { id: 'c18', title: '吵架',       category: '批评', stars: -40, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_quarr_2026-04-27T20-09-39.png' },
  { id: 'c19', title: '粗心大意',   category: '批评', stars: -15, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_being_2026-04-27T20-09-44.png' },
  { id: 'c20', title: '挑食',       category: '批评', stars: -10, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_picky_2026-04-27T20-09-54.png' },
  { id: 'c21', title: '调皮捣蛋',   category: '批评', stars: -20, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_misch_2026-04-27T20-10-30.png' },
  { id: 'c22', title: '迟到',       category: '批评', stars: -20, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_being_2026-04-27T20-10-30.png' },
  { id: 'c23', title: '走神',       category: '批评', stars: -15, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_zonin_2026-04-27T20-10-36.png' },
  { id: 'c24', title: '尿床',       category: '批评', stars: -30, icon: '/task-icons/critique/Cute_flat_kawaii_icon_of_bedwe_2026-04-27T20-10-35.png' },
];

// ========== 任务模板库汇总 ==========

/** 所有任务分类标签（按显示顺序，匹配截图 Tab 排序） */
export const TASK_CATEGORIES = [
  { id: '学习', label: '学习', templates: TASK_STUDY },
  { id: '生活', label: '生活', templates: TASK_LIFE },
  { id: '兴趣', label: '兴趣', templates: TASK_HOBBY },
  { id: '独立', label: '独立', templates: TASK_INDEPENDENT },
  { id: '表扬', label: '表扬', templates: TASK_PRAISE },
  { id: '批评', label: '批评', templates: TASK_CRITIQUE },
] as const;

/** 全部任务模板合并数组（方便遍历搜索） */
export const ALL_TASK_TEMPLATES: HabitTemplate[] = [
  ...TASK_STUDY,
  ...TASK_LIFE,
  ...TASK_HOBBY,
  ...TASK_INDEPENDENT,
  ...TASK_PRAISE,
  ...TASK_CRITIQUE,
];
