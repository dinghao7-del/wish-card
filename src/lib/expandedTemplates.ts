import type { HabitTemplate, RewardTemplate } from './templates';

const ICONS = {
  question: '/task-icons/praise/Cute_flat_kawaii_icon_of_raisi_2026-04-27T20-15-34.png',
  mistake: '/task-icons/study/Cute_flat_kawaii_icon_of_math__2026-04-27T20-17-41.png',
  homework: '/task-icons/study/Cute_flat_kawaii_doing_homewor_2026-04-27T20-18-31.png',
  reading: '/task-icons/study/Cute_flat_kawaii_icon_of_readi_2026-04-27T20-17-45.png',
  words: '/task-icons/study/Cute_flat_kawaii_memorizing_En_2026-04-27T20-18-16.png',
  calligraphy: '/task-icons/study/Cute_flat_kawaii_calligraphy_w_2026-04-27T20-18-14.png',
  bag: '/task-icons/independent/Cute_flat_kawaii_packing_schoo_2026-04-27T20-22-27.png',
  toys: '/task-icons/independent/Cute_flat_kawai_organizing_toy_2026-04-27T20-22-27.png',
  dress: '/task-icons/independent/Cute_flat_kawaii_getting_dress_2026-04-27T20-23-19.png',
  sleep: '/task-icons/independent/Cute_flat_kawaii_going_to_slee_2026-04-27T20-23-27.png',
  teeth: '/task-icons/life/Cute_flat_kawaii_brushing_teet_2026-04-27T20-20-31.png',
  wash: '/task-icons/life/Cute_flat_kawaii_washing_face__2026-04-27T20-20-33.png',
  water: '/task-icons/life/Cute_flat_kawaii_drinking_wate_2026-04-27T20-19-03.png',
  food: '/task-icons/independent/Cute_flat_kawaii_eating_meals__2026-04-27T20-22-48.png',
  sport: '/task-icons/hobby/Cute_flat_kawaii_sports_exerci_2026-04-27T20-21-52.png',
  rope: '/task-icons/hobby/Cute_flat_kawaii_jump_rope_exe_2026-04-27T20-21-23.png',
  bike: '/task-icons/hobby/Cute_flat_kawaii_riding_bicycl_2026-04-27T20-21-54.png',
  art: '/task-icons/hobby/Cute_flat_kawaii_painting_draw_2026-04-27T20-22-01.png',
  craft: '/task-icons/hobby/Cute_flat_kawaii_arts_and_craf_2026-04-27T20-21-09.png',
  puzzle: '/reward-icons/activity/Cute_flat_kawaii_jigsaw_puzzle_2026-04-27T19-48-34.png',
  music: '/task-icons/hobby/Cute_flat_kawai_piano_playing__2026-04-27T20-21-20.png',
  kindness: '/task-icons/praise/Cute_flat_kawaii_icon_of_helpi_2026-04-27T20-12-41.png',
  emotion: '/task-icons/praise/Cute_flat_kawaii_icon_of_self__2026-04-27T20-13-29.png',
  greet: '/task-icons/praise/Cute_flat_kawaii_icon_of_greet_2026-04-27T20-14-08.png',
  clean: '/task-icons/praise/Cute_flat_kawaii_icon_of_clean_2026-04-27T20-14-05.png',
  award: '/task-icons/praise/Cute_flat_kawaii_icon_of_award_2026-04-27T20-14-57.png',
  focus: '/task-icons/praise/Cute_flat_kawaii_icon_of_persi_2026-04-27T20-13-32.png',
  delay: '/task-icons/critique/Cute_flat_kawaii_icon_of_procr_2026-04-27T20-07-43.png',
  phone: '/task-icons/critique/Cute_flat_kawaii_icon_of_secre_2026-04-27T20-08-37.png',
  snack: '/task-icons/praise/Cute_flat_kawaii_icon_of_refus_2026-04-27T20-15-30.png',
} as const;

const REWARD_ICONS = {
  shop: '/reward-icons/common/A_cute_flat_design_kawaii_styl_2026-04-27T19-41-28.png',
  toy: '/reward-icons/common/Cute_flat_kawaii_children_toys_2026-04-27T19-53-03.png',
  movie: '/reward-icons/experience/A_cute_flat_design_kawaii_styl_2026-04-27T19-42-17.png',
  ticket: '/reward-icons/experience/Cute_flat_kawaii_free_pass_tic_2026-04-27T19-43-17.png',
  vip: '/reward-icons/experience/Cute_flat_kawaii_privilege_VIP_2026-04-27T19-43-15.png',
  game: '/reward-icons/prize/Cute_flat_kawaii_video_game_co_2026-04-27T19-44-07.png',
  book: '/reward-icons/prize/Cute_flat_kawaii_stack_of_book_2026-04-27T19-44-48.png',
  snack: '/reward-icons/prize/Cute_flat_kawaii_snacks_food_i_2026-04-27T19-44-18.png',
  ice: '/reward-icons/privilege/Cute_flat_kawaii_ice_cream_con_2026-04-27T19-45-45.png',
  travel: '/reward-icons/growth/Cute_flat_kawaii_travel_vacati_2026-04-27T19-46-51.png',
  bike: '/reward-icons/growth/Cute_flat_kawaii_cycling_bike__2026-04-27T19-46-53.png',
  lego: '/reward-icons/activity/Cute_flat_kawaii_LEGO_building_2026-04-27T19-48-32.png',
  puzzle: '/reward-icons/activity/Cute_flat_kawaii_jigsaw_puzzle_2026-04-27T19-48-34.png',
  camp: '/reward-icons/activity/Cute_flat_kawaii_camping_tent__2026-04-27T19-50-52.png',
} as const;

type ExpandedTaskSeed = {
  title: string;
  description: string;
  ageGroup: string;
  category: string;
  stars: number;
  icon: keyof typeof ICONS;
  frequency?: 'daily' | 'weekly';
  tags?: string[];
};

const sourceHint = '公开儿童发展/运动睡眠建议 + 家长社区常见作息/打卡需求 + 比乐时积分学习法的即时反馈机制';

const AGE_TASKS: ExpandedTaskSeed[] = [
  // 2-3岁：启蒙和陪伴
  { title: '小手洗洗勇者', description: '饭前便后在大人陪伴下完成洗手流程。', ageGroup: '2-3岁', category: '2-3岁启蒙', stars: 5, icon: 'wash', tags: ['卫生', '自理'] },
  { title: '玩具回巢员', description: '把玩过的玩具放回固定篮子。', ageGroup: '2-3岁', category: '2-3岁启蒙', stars: 5, icon: 'toys', tags: ['收纳'] },
  { title: '小牙刷骑士', description: '配合刷牙，不抢牙刷不逃跑。', ageGroup: '2-3岁', category: '2-3岁启蒙', stars: 5, icon: 'teeth', tags: ['卫生'] },
  { title: '睡衣变身官', description: '睡前配合换睡衣，知道要进入晚间流程。', ageGroup: '2-3岁', category: '2-3岁启蒙', stars: 5, icon: 'dress', tags: ['睡眠'] },
  { title: '餐桌小坐垫', description: '吃饭时坐在座位上完成主要进餐。', ageGroup: '2-3岁', category: '2-3岁启蒙', stars: 6, icon: 'food', tags: ['饮食'] },
  { title: '晚安小火车', description: '睡前听完一本绘本或一个故事后关灯。', ageGroup: '2-3岁', category: '2-3岁启蒙', stars: 6, icon: 'reading', tags: ['阅读', '睡眠'] },
  { title: '情绪天气员', description: '用开心、生气、害怕等词表达当前感受。', ageGroup: '2-3岁', category: '2-3岁启蒙', stars: 8, icon: 'emotion', tags: ['情绪'] },
  { title: '水杯补给兵', description: '主动喝水或接受大人提醒喝水。', ageGroup: '2-3岁', category: '2-3岁启蒙', stars: 5, icon: 'water', tags: ['健康'] },

  // 3-4岁：幼儿园适应
  { title: '鞋子归队长', description: '回家后把鞋子摆到鞋架。', ageGroup: '3-4岁', category: '3-4岁幼儿园', stars: 8, icon: 'dress', tags: ['收纳'] },
  { title: '幼儿园情报员', description: '回家说出今天幼儿园发生的一件事。', ageGroup: '3-4岁', category: '3-4岁幼儿园', stars: 10, icon: 'greet', tags: ['表达'] },
  { title: '排队小卫士', description: '出门、入园、游玩时能跟着队伍等待。', ageGroup: '3-4岁', category: '3-4岁幼儿园', stars: 10, icon: 'focus', tags: ['规则'] },
  { title: '分享小饼干', description: '愿意轮流玩玩具或分享一次物品。', ageGroup: '3-4岁', category: '3-4岁幼儿园', stars: 12, icon: 'kindness', tags: ['社交'] },
  { title: '小马桶胜利', description: '按约定尝试如厕并完成清洁提醒。', ageGroup: '3-4岁', category: '3-4岁幼儿园', stars: 10, icon: 'clean', tags: ['自理'] },
  { title: '午睡小云朵', description: '午睡时安静躺好，不打扰别人。', ageGroup: '3-4岁', category: '3-4岁幼儿园', stars: 8, icon: 'sleep', tags: ['睡眠'] },
  { title: '小碗光盘侠', description: '尽量吃完自己碗里的主食和蔬菜。', ageGroup: '3-4岁', category: '3-4岁幼儿园', stars: 8, icon: 'food', tags: ['饮食'] },
  { title: '滑梯规则星', description: '户外活动时遵守轮流和安全规则。', ageGroup: '3-4岁', category: '3-4岁幼儿园', stars: 10, icon: 'sport', tags: ['运动', '安全'] },

  // 4-5岁：规则与表达
  { title: '积木收纳大师', description: '搭完积木后按颜色或形状收纳。', ageGroup: '4-5岁', category: '4-5岁规则感', stars: 12, icon: 'toys', tags: ['收纳'] },
  { title: '情绪翻译官', description: '生气前先说“我不开心，因为……”。', ageGroup: '4-5岁', category: '4-5岁规则感', stars: 15, icon: 'emotion', tags: ['情绪'] },
  { title: '绘本小讲师', description: '讲出一本绘本里最喜欢的一页。', ageGroup: '4-5岁', category: '4-5岁规则感', stars: 15, icon: 'reading', tags: ['阅读', '表达'] },
  { title: '袜子配对员', description: '帮忙把洗好的袜子配成对。', ageGroup: '4-5岁', category: '4-5岁规则感', stars: 10, icon: 'dress', tags: ['家务'] },
  { title: '餐桌礼仪官', description: '吃饭时不跑动，能说“请、谢谢”。', ageGroup: '4-5岁', category: '4-5岁规则感', stars: 12, icon: 'greet', tags: ['礼貌'] },
  { title: '专注五分钟', description: '独立完成拼图、涂色或积木专注5分钟。', ageGroup: '4-5岁', category: '4-5岁规则感', stars: 12, icon: 'puzzle', tags: ['专注'] },
  { title: '小小路线员', description: '出门前说出目的地和要带的一样东西。', ageGroup: '4-5岁', category: '4-5岁规则感', stars: 10, icon: 'bag', tags: ['计划'] },
  { title: '运动能量包', description: '完成一次跑跳、拍球或平衡练习。', ageGroup: '4-5岁', category: '4-5岁规则感', stars: 12, icon: 'sport', tags: ['运动'] },

  // 5-6岁：幼小衔接
  { title: '书包守门员', description: '按清单检查水杯、纸巾、作业袋。', ageGroup: '5-6岁', category: '5-6岁幼小衔接', stars: 15, icon: 'bag', tags: ['幼小衔接', '自理'] },
  { title: '铅笔补给官', description: '睡前削好铅笔并整理文具盒。', ageGroup: '5-6岁', category: '5-6岁幼小衔接', stars: 15, icon: 'calligraphy', tags: ['准备'] },
  { title: '课堂举手新兵', description: '今天主动举手或尝试回答一次问题。', ageGroup: '5-6岁', category: '5-6岁幼小衔接', stars: 18, icon: 'question', tags: ['表达', '课堂'] },
  { title: '坐姿小城墙', description: '阅读或写字时保持端正坐姿10分钟。', ageGroup: '5-6岁', category: '5-6岁幼小衔接', stars: 12, icon: 'focus', tags: ['姿势'] },
  { title: '名字签收员', description: '能在作业或作品上写好自己的名字。', ageGroup: '5-6岁', category: '5-6岁幼小衔接', stars: 15, icon: 'calligraphy', tags: ['书写'] },
  { title: '铃声行动派', description: '听到提醒后3分钟内开始下一件事。', ageGroup: '5-6岁', category: '5-6岁幼小衔接', stars: 15, icon: 'focus', tags: ['时间'] },
  { title: '睡前装备台', description: '把第二天衣服、书包、水杯放到指定位置。', ageGroup: '5-6岁', category: '5-6岁幼小衔接', stars: 18, icon: 'bag', tags: ['准备'] },
  { title: '20分钟阅读岛', description: '亲子或独立阅读20分钟。', ageGroup: '5-6岁', category: '5-6岁幼小衔接', stars: 20, icon: 'reading', tags: ['阅读'] },

  // 6-8岁：小学低年级
  { title: '勇气提问者', description: '遇到不会的问题，主动问老师、同学或家长一次。', ageGroup: '6-8岁', category: '6-8岁学习启动', stars: 25, icon: 'question', tags: ['学习能力', '正向激励'] },
  { title: '错题猎人', description: '找到一道错题，说明错因并改对。', ageGroup: '6-8岁', category: '6-8岁学习启动', stars: 30, icon: 'mistake', tags: ['错题', '比乐时'] },
  { title: '口算闪电侠', description: '完成一组口算并订正错误。', ageGroup: '6-8岁', category: '6-8岁学习启动', stars: 18, icon: 'mistake', tags: ['数学'] },
  { title: '作业开局王', description: '回家后按约定时间启动作业，不拖延。', ageGroup: '6-8岁', category: '6-8岁学习启动', stars: 25, icon: 'homework', tags: ['作业'] },
  { title: '阅读打卡船长', description: '阅读20分钟并说出一个新发现。', ageGroup: '6-8岁', category: '6-8岁学习启动', stars: 22, icon: 'reading', tags: ['阅读'] },
  { title: '书包复盘员', description: '睡前自己检查明天课程所需物品。', ageGroup: '6-8岁', category: '6-8岁学习启动', stars: 18, icon: 'bag', tags: ['自理'] },
  { title: '屏幕刹车手', description: '到点主动停下电视、平板或游戏。', ageGroup: '6-8岁', category: '6-8岁学习启动', stars: 25, icon: 'phone', tags: ['屏幕'] },
  { title: '跳绳能量条', description: '完成跳绳或户外运动15分钟。', ageGroup: '6-8岁', category: '6-8岁学习启动', stars: 20, icon: 'rope', tags: ['运动'] },

  // 9-12岁：小学高年级
  { title: '番茄钟守护者', description: '独立完成一个25分钟专注学习段。', ageGroup: '9-12岁', category: '9-12岁自主成长', stars: 30, icon: 'focus', tags: ['专注'] },
  { title: '错因拆弹员', description: '把一道错题拆成“审题、知识点、步骤、粗心”四类。', ageGroup: '9-12岁', category: '9-12岁自主成长', stars: 35, icon: 'mistake', tags: ['错题'] },
  { title: '复盘侦探', description: '写下今天一个做得好和一个要调整的地方。', ageGroup: '9-12岁', category: '9-12岁自主成长', stars: 25, icon: 'emotion', tags: ['复盘'] },
  { title: '预习侦察兵', description: '提前浏览明天一课，标出一个不懂的问题。', ageGroup: '9-12岁', category: '9-12岁自主成长', stars: 28, icon: 'question', tags: ['预习'] },
  { title: '单词补给站', description: '完成一组单词记忆并自测。', ageGroup: '9-12岁', category: '9-12岁自主成长', stars: 25, icon: 'words', tags: ['英语'] },
  { title: '家务指挥官', description: '独立完成一项固定家务并检查结果。', ageGroup: '9-12岁', category: '9-12岁自主成长', stars: 28, icon: 'clean', tags: ['家务'] },
  { title: '运动60分钟', description: '当天累计完成中高强度活动或户外活动。', ageGroup: '9-12岁', category: '9-12岁自主成长', stars: 35, icon: 'sport', tags: ['运动'] },
  { title: '周计划小队长', description: '参与制定本周学习、运动和休息安排。', ageGroup: '9-12岁', category: '9-12岁自主成长', stars: 40, icon: 'focus', tags: ['计划'] },

  // 13-15岁：初中
  { title: '自主计划官', description: '自己列出今天三件最重要的事并排序。', ageGroup: '13-15岁', category: '13-15岁初中自主', stars: 35, icon: 'focus', tags: ['计划'] },
  { title: '睡眠防线', description: '按约定时间放下电子设备并准备睡觉。', ageGroup: '13-15岁', category: '13-15岁初中自主', stars: 35, icon: 'sleep', tags: ['睡眠'] },
  { title: '压力卸载员', description: '用运动、日记或沟通完成一次压力释放。', ageGroup: '13-15岁', category: '13-15岁初中自主', stars: 30, icon: 'emotion', tags: ['情绪'] },
  { title: '错题二刷者', description: '隔天重做错题，不看答案完成订正。', ageGroup: '13-15岁', category: '13-15岁初中自主', stars: 38, icon: 'mistake', tags: ['错题'] },
  { title: '课堂线索捕手', description: '课后写下今天老师强调的三个重点。', ageGroup: '13-15岁', category: '13-15岁初中自主', stars: 30, icon: 'reading', tags: ['课堂'] },
  { title: '手机契约官', description: '按家庭约定使用手机，不偷偷延长时间。', ageGroup: '13-15岁', category: '13-15岁初中自主', stars: 35, icon: 'phone', tags: ['屏幕'] },
  { title: '体能副本', description: '完成跑步、球类、力量或拉伸30分钟。', ageGroup: '13-15岁', category: '13-15岁初中自主', stars: 32, icon: 'sport', tags: ['运动'] },
  { title: '家务承包商', description: '承包一项家务，并在本周稳定完成。', ageGroup: '13-15岁', category: '13-15岁初中自主', stars: 45, icon: 'clean', frequency: 'weekly', tags: ['家务'] },
];

const GAME_TASKS: ExpandedTaskSeed[] = [
  { title: '古神的赞许', description: '收到老师、教练或长辈的具体表扬，立刻记录并奖励。', ageGroup: '6-15岁', category: '积分学习法', stars: 50, icon: 'award', tags: ['比乐时', '即时反馈'] },
  { title: '错题回炉成功', description: '把上次错题重新做对，比新题做对更值得奖励。', ageGroup: '6-15岁', category: '积分学习法', stars: 40, icon: 'mistake', tags: ['比乐时', '错题'] },
  { title: '不会就问 Buff', description: '承认不会并提出一个具体问题。', ageGroup: '6-15岁', category: '积分学习法', stars: 30, icon: 'question', tags: ['比乐时', '提问'] },
  { title: '负循环破盾', description: '遇到挫败时没有逃避，完成一次最小行动。', ageGroup: '6-15岁', category: '积分学习法', stars: 35, icon: 'focus', tags: ['正向激励'] },
  { title: '今日最小胜利', description: '只完成一个最小目标也算数，关键是重新启动。', ageGroup: '6-15岁', category: '积分学习法', stars: 20, icon: 'award', tags: ['即时反馈'] },
  { title: '提问连击 x3', description: '一周内累计主动提问3次。', ageGroup: '6-15岁', category: '积分学习法', stars: 80, icon: 'question', frequency: 'weekly', tags: ['提问'] },
  { title: '错题猎人周榜', description: '一周累计完成5道错题复盘。', ageGroup: '6-15岁', category: '积分学习法', stars: 100, icon: 'mistake', frequency: 'weekly', tags: ['错题'] },
  { title: '专注副本通关', description: '连续完成两个专注学习段，中间只休息不刷屏。', ageGroup: '9-15岁', category: '积分学习法', stars: 70, icon: 'focus', tags: ['专注'] },
  { title: '作业零逃跑', description: '今天所有作业都启动了，即使遇到难题也没有逃避。', ageGroup: '6-12岁', category: '积分学习法', stars: 45, icon: 'homework', tags: ['作业'] },
  { title: '复盘开宝箱', description: '说清楚今天一个失败点，下次怎么改。', ageGroup: '9-15岁', category: '积分学习法', stars: 35, icon: 'emotion', tags: ['复盘'] },
];

function buildTask(seed: ExpandedTaskSeed, index: number): HabitTemplate {
  return {
    id: `x${String(index + 1).padStart(3, '0')}`,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    stars: seed.stars,
    icon: ICONS[seed.icon],
    ageGroup: seed.ageGroup,
    frequency: seed.frequency ?? 'daily',
    tags: seed.tags,
    sourceHint,
    iconKeyword: seed.icon,
  };
}

export const EXPANDED_TASK_TEMPLATES: HabitTemplate[] = [...AGE_TASKS, ...GAME_TASKS].map(buildTask);

export const EXPANDED_TASK_CATEGORIES = Array.from(
  new Map(EXPANDED_TASK_TEMPLATES.map(template => [
    template.category,
    { id: template.category, label: template.category, templates: EXPANDED_TASK_TEMPLATES.filter(item => item.category === template.category) },
  ])).values()
);

export const EXPANDED_REWARD_TEMPLATES: RewardTemplate[] = [
  { id: 'xr01', name: '星愿补给箱', description: '完成一周基础任务后开启一次小惊喜。', cost: 120, category: '星愿副本', icon: REWARD_ICONS.shop, ageGroup: '3-12岁', tags: ['小奖励'], sourceHint },
  { id: 'xr02', name: '周末副本票', description: '周末选择一个亲子活动副本：公园、骑行、桌游或电影。', cost: 300, category: '星愿副本', icon: REWARD_ICONS.ticket, ageGroup: '4-15岁', tags: ['体验'], sourceHint },
  { id: 'xr03', name: '错题猎人宝箱', description: '完成错题周榜后兑换学习用品或小玩具。', cost: 250, category: '星愿副本', icon: REWARD_ICONS.toy, ageGroup: '6-12岁', tags: ['学习激励'], sourceHint },
  { id: 'xr04', name: '妈妈菜单权', description: '今晚由孩子选择一道合理菜单。', cost: 180, category: '星愿副本', icon: REWARD_ICONS.vip, ageGroup: '4-12岁', tags: ['特权'], sourceHint },
  { id: 'xr05', name: '爸爸陪玩30分', description: '指定一个家长陪玩30分钟，不看手机。', cost: 200, category: '星愿副本', icon: REWARD_ICONS.game, ageGroup: '2-10岁', tags: ['亲子'], sourceHint },
  { id: 'xr06', name: '睡前加更一章', description: '睡前故事或亲子阅读额外加一章。', cost: 80, category: '星愿副本', icon: REWARD_ICONS.book, ageGroup: '2-8岁', tags: ['阅读'], sourceHint },
  { id: 'xr07', name: '冰淇淋小胜利', description: '达成一次小目标后兑换冰淇淋。', cost: 80, category: '星愿副本', icon: REWARD_ICONS.ice, ageGroup: '3-12岁', tags: ['小奖励'], sourceHint },
  { id: 'xr08', name: '乐高建筑师', description: '兑换一套小型拼装玩具或一次拼装时间。', cost: 360, category: '星愿副本', icon: REWARD_ICONS.lego, ageGroup: '5-12岁', tags: ['创造'], sourceHint },
  { id: 'xr09', name: '电影爆米花夜', description: '全家电影夜，孩子可选择片单。', cost: 260, category: '星愿副本', icon: REWARD_ICONS.movie, ageGroup: '5-15岁', tags: ['家庭'], sourceHint },
  { id: 'xr10', name: '户外能量远征', description: '公园、骑行、露营或远足一次。', cost: 500, category: '星愿副本', icon: REWARD_ICONS.camp, ageGroup: '4-15岁', tags: ['运动'], sourceHint },
  { id: 'xr11', name: '游戏厅代币包', description: '兑换一次游戏厅或电玩城代币。', cost: 220, category: '星愿副本', icon: REWARD_ICONS.game, ageGroup: '8-15岁', tags: ['娱乐'], sourceHint },
  { id: 'xr12', name: '拼图挑战夜', description: '兑换一次家庭拼图/桌游挑战。', cost: 160, category: '星愿副本', icon: REWARD_ICONS.puzzle, ageGroup: '4-12岁', tags: ['家庭'], sourceHint },
  { id: 'xr13', name: '骑行风火轮', description: '兑换一次亲子骑行或滑板车时间。', cost: 220, category: '星愿副本', icon: REWARD_ICONS.bike, ageGroup: '5-12岁', tags: ['运动'], sourceHint },
  { id: 'xr14', name: '零食小金库', description: '在约定范围内选择一次小零食。', cost: 90, category: '星愿副本', icon: REWARD_ICONS.snack, ageGroup: '4-15岁', tags: ['小奖励'], sourceHint },
  { id: 'xr15', name: '大愿望存钱罐', description: '把积分折算成愿望基金，累积到大件心愿。', cost: 600, category: '星愿副本', icon: REWARD_ICONS.shop, ageGroup: '6-15岁', tags: ['长期目标'], sourceHint },
];
