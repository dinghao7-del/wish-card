-- ============================================
-- 心愿模板库种子数据（修正版）
-- ============================================

-- 1. 娱乐时光
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '额外游戏时间', '获得30分钟额外游戏/平板时间',
'孩子可以使用游戏机、平板电脑或手机玩喜欢的游戏30分钟。这是最受欢迎的奖励之一，能有效激励孩子完成任务。建议设定明确的游戏内容范围，避免暴力或不适合年龄的游戏。',
'娱乐时光', NULL, '🎮', 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
10, 'weekly', '5-14岁', 'easy', ARRAY['游戏', '娱乐', '屏幕时间'],
'建议将游戏时间作为"限时特权"，而非日常权利。可以制作"游戏时间券"，让孩子自主安排使用时间。同时鼓励孩子尝试不同类型的游戏（益智类、运动类、创造类），而非仅仅动作游戏。',
'30分钟', NULL, ARRAY['娱乐放松', '手眼协调', '问题解决'],
'system', true, 1, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '看一集动画片', '观看一集喜欢的动画片',
'孩子可以选择并观看一集自己喜欢的动画片（约20-25分钟）。这是低星星数的常用奖励，适合日常激励。',
'娱乐时光', NULL, '📺', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=400',
5, 'daily', '3-10岁', 'easy', ARRAY['动画', '放松', '娱乐'],
'建议家长提前审核动画片内容，确保其教育价值和适宜性。可以和孩子一起观看，观看后简单讨论剧情或学到的道理，将被动观看转变为主动学习。',
'25分钟', NULL, ARRAY['放松娱乐', '故事理解', '亲子互动'],
'system', false, 2, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '家庭电影夜', '和家人一起看一场电影',
'周末晚上，孩子可以选择一部电影，全家一起观看，准备爆米花和零食。这是增进亲子关系的高质量奖励。',
'娱乐时光', NULL, '🎬', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
15, 'monthly', '3-14岁', 'easy', ARRAY['电影', '家庭时间', '亲子'],
'让孩子参与电影选择（在家长审核的片单中），负责制作"电影票"和准备零食。这不仅是奖励，还能培养孩子的策划能力和家庭责任感。',
'2小时', ARRAY['电影', '爆米花', '零食', '毯子'], ARRAY['亲子bonding', '审美体验', '策划能力'],
'system', true, 3, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '选择周末活动', '由孩子决定周末的一项家庭活动',
'孩子可以成为"周末活动策划师"，选择一项全家参与的活动（如去公园、博物馆、游泳、爬山等）。这能培养孩子的决策能力和家庭参与感。',
'娱乐时光', NULL, '🎯', 'https://images.unsplash.com/photo-1526976668912-1a811878dd37?w=400',
20, 'monthly', '5-14岁', 'medium', ARRAY['决策', '家庭活动', '策划'],
'提前和孩子讨论可选的活 动清单，考虑预算和时间。活动当天让孩子担任"导游"，负责查看地图、时间安排等，培养领导能力。',
'半天-全天', ARRAY['活动门票', '交通', '野餐食物（如适用）'], ARRAY['决策能力', '领导力', '家庭归属感'],
'system', false, 4, true);

-- 2. 美食享受
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '冰淇淋/甜品', '获得一份喜欢的冰淇淋或甜品',
'孩子可以选择自己喜欢的冰淇淋口味或甜品（如蛋糕、布丁、巧克力等）。美食奖励要适度，避免将食物作为唯一的奖励方式。',
'美食享受', NULL, '🍦', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
8, 'weekly', '3-14岁', 'easy', ARRAY['美食', '甜品', '享受'],
'建议关注孩子的整体糖分摄入，可以选择水果冰淇淋、酸奶冰棒等相对健康的选项。也可以将此作为"亲子DIY机会"，一起制作健康甜品。',
'15分钟', ARRAY['冰淇淋/甜品'], ARRAY['享受生活', '自主选择'],
'system', false, 5, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '选择晚餐菜单', '决定一天的家庭晚餐菜单',
'孩子可以为全家设计一顿晚餐的菜单，家长协助准备。这能培养孩子的营养知识、计划能力和"为他人着想"的意识。',
'美食享受', NULL, '🍕', 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
12, 'monthly', '6-14岁', 'medium', ARRAY['美食', '计划', '营养'],
'引导孩子考虑营养均衡（蛋白质、蔬菜、主食的搭配），而非仅仅选择垃圾食品。可以允许一顿"放纵餐"，但平时还是要以营养为先。一起逛菜市场/超市选购食材，也是很好的教育机会。',
'1-2小时', ARRAY['食材', '菜谱', '围裙'], ARRAY['营养知识', '计划能力', '烹饪兴趣'],
'system', true, 6, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '野餐聚会', '在公园或后院举办野餐',
'准备美食篮和野餐垫，在户外享受美食和阳光。可以邀请朋友参加，增进社交能力。',
'美食享受', NULL, '🧺', 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
15, 'seasonal', '4-12岁', 'medium', ARRAY['户外', '美食', '社交'],
'让孩子参与野餐食物的准备（如制作三明治、水果串、小饼干等），这能将美食奖励转变为生活技能学习机会。选择天气晴朗的日子，带上飞盘、泡泡机等户外玩具。',
'2-3小时', ARRAY['野餐垫', '美食篮', '食物', '户外玩具'], ARRAY['户外乐趣', '社交能力', '生活技能'],
'system', false, 7, true);

-- 3. 户外探索
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '去游乐园', '前往游乐园玩一天',
'孩子可以选择去游乐园、主题公园或嘉年华，享受刺激和欢乐。这是高星星数的"大奖励"，适合作为长期目标的激励。',
'户外探索', NULL, '🎢', 'https://images.unsplash.com/photo-156925007acclaimed8-5c65c0e72128?w=400',
50, 'quarterly', '4-14岁', 'easy', ARRAY['游乐园', '冒险', '大奖励'],
'提前和孩子一起规划行程（选择哪些项目、合理安排休息时间），培养孩子的规划能力。设定"勇敢挑战目标"（如尝试一个之前不敢玩的项目），但绝不强迫。',
'全天', ARRAY['门票', '防晒用品', '水', '零食'], ARRAY['冒险精神', '规划能力', '亲子回忆'],
'system', true, 8, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '动物园/水族馆之旅', '参观动物园或水族馆',
'近距离观察动物和海洋生物，增长知识，培养对自然和生命的热爱。',
'户外探索', NULL, '🦁', 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=400',
20, 'quarterly', '3-12岁', 'easy', ARRAY['动物', '学习', '探索'],
'提前和孩子阅读相关动物书籍，列出"最想看到的10种动物"。参观时鼓励孩子观察动物的特征、习性，回家后可以一起查阅更多资料，深化学习。',
'半天-全天', ARRAY['门票', '相机', '动物图鉴（可选）'], ARRAY['自然认知', '好奇心', '生命教育'],
'system', false, 9, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '露营体验', '在backyard或营地露营一晚',
'体验露营的乐趣，学习搭帐篷、生火（安全前提下）、观星等技能。这是培养独立性和户外技能的绝佳机会。',
'户外探索', NULL, '⛺', 'https://images.unsplash.com/photo-1504851149312-7a075b496cc7?w=400',
30, 'seasonal', '6-14岁', 'hard', ARRAY['露营', '户外技能', '冒险'],
'如果是第一次露营，可以在自家后院或客厅"试睡"。教孩子基本的露营技能（搭帐篷、整理睡袋、安全注意事项）。晚上可以玩"星空识别"或讲鬼故事（适合年龄的）。',
'过夜', ARRAY['帐篷', '睡袋', '手电筒', '防蚊液', '零食'], ARRAY['户外技能', '独立性', '冒险精神'],
'system', true, 10, true);

-- 4. 创意手工
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', 'DIY手工材料包', '获得一个DIY手工材料包（如模型、绘画、手工套件）',
'孩子可以选择自己喜欢的手工材料包，自由创作。这能培养创造力、专注力和精细动作能力。',
'创意手工', NULL, '✂️', 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
15, 'monthly', '4-14岁', 'medium', ARRAY['手工', '创造力', '专注'],
'根据孩子的年龄和兴趣选择适合的材料包（如乐高、绘画套装、手工编织、科学实验套件等）。家长可以和孩子一起完成，但尽量让孩子主导，培养独立创作能力。',
'1-3小时', ARRAY['手工材料包', '工具（如剪刀、胶水）'], ARRAY['创造力', '专注力', '精细动作'],
'system', false, 11, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '艺术工作坊', '参加一次艺术课程（如绘画、陶艺、音乐）',
'孩子可以选择参加一次兴趣班或工作坊，探索不同的艺术形式，发现天赋和兴趣。',
'创意手工', NULL, '🎨', 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400',
25, 'quarterly', '5-14岁', 'medium', ARRAY['艺术', '探索', '天赋'],
'让孩子尝试不同的艺术形式（绘画、雕塑、音乐、舞蹈、戏剧等），找到真正的热爱。不要强迫孩子坚持某个不感兴趣的项目，重点是"探索"和"享受过程"。',
'1-2小时', ARRAY['课程费用', '材料费（如适用）'], ARRAY['艺术素养', '自我表达', '自信心'],
'system', true, 12, true);

-- 5. 社交聚会
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '邀请朋友来玩', '邀请好朋友到家里玩一个下午',
'孩子可以邀请1-2位好朋友到家里玩，准备零食和游戏。这能培养社交能力、招待礼仪和规划能力。',
'社交聚会', NULL, '🎉', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400',
15, 'monthly', '5-12岁', 'medium', ARRAY['社交', '友谊', '招待'],
'帮孩子提前规划"朋友来访活动"（如准备游戏、零食、电影等），但不要过度干预。教孩子基本的招待礼仪（如"欢迎来到我家""要吃零食吗？"）。活动后和孩子一起回顾"今天最开心的事情"。',
'2-3小时', ARRAY['零食', '游戏道具', '电影（可选）'], ARRAY['社交技能', '招待能力', '友谊'],
'system', false, 13, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '举办主题派对', '举办一次小型主题派对（生日、节日等）',
'孩子可以策划并举办一次小型派对，邀请朋友参加。这是培养领导力、组织能力和创造力的"大项目"。',
'社交聚会', NULL, '🎈', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400',
40, 'yearly', '7-14岁', 'hard', ARRAY['派对', '策划', '领导力'],
'让孩子主导策划（主题、邀请名单、食物、游戏、装饰等），家长提供支持和建议。这不仅是奖励，更是一次宝贵的学习经历。拍照记录，制作"派对纪念册"。',
'半天', ARRAY['装饰', '食物', '蛋糕', '礼物袋', '游戏道具'], ARRAY['组织能力', '领导力', '创造力', '社交技能'],
'system', true, 14, true);

-- 6. 购物消费
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '玩具店购物', '获得一次玩具店购物机会（设定预算）',
'孩子可以在预算范围内选择自己喜欢的玩具。这能培养金钱概念、决策能力和延迟满足能力。',
'购物消费', NULL, '🧸', 'https://images.unsplash.com/photo-1558060370-d644479cb468?w=400',
30, 'quarterly', '4-12岁', 'medium', ARRAY['购物', '决策', '金钱管理'],
'提前和孩子讨论"购物策略"（如"是要买一个贵的，还是两个便宜的？""这个玩具能玩多久？"）。鼓励孩子在店内仔细比较、思考，而非冲动购买。回家后可以一起为新玩具制作"身份证"或"介绍卡"。',
'1-2小时', ARRAY['预算', '购物清单'], ARRAY['金钱概念', '决策能力', '延迟满足'],
'system', false, 15, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '书店购书', '选择喜欢的书带回家',
'孩子可以在书店或图书馆选择喜欢的书带回家。这能将奖励与阅读兴趣结合，培养终身学习习惯。',
'购物消费', NULL, '📚', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400',
15, 'monthly', '4-14岁', 'easy', ARRAY['书籍', '阅读', '学习'],
'家长可以和孩子各自选择一本书，然后互相推荐。建立"家庭读书俱乐部"，定期分享读书心得。这能将购物奖励升华为精神财富。',
'1小时', ARRAY['购书预算'], ARRAY['阅读兴趣', '选择能力', '知识渴望'],
'system', true, 16, true);

-- 7. 特殊特权
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '晚睡30分钟', '今晚可以晚睡30分钟',
'特殊的"时间特权"，孩子可以在睡前多玩30分钟或做自己喜欢的事情。这是低成本的奖励，但对孩子很有吸引力。',
'特殊特权', NULL, '🌙', 'https://images.unsplash.com/photo-1488441770600-cadcc8f17664?w=400',
5, 'weekly', '4-12岁', 'easy', ARRAY['特权', '时间', '灵活性'],
'设定清晰的边界：晚睡不等于"随意玩"，可以和孩子约定晚睡时间做什么（如阅读、拼图、听故事）。确保不影响第二天的精神状态和作息规律。',
'30分钟', NULL, ARRAY['享受特权', '自主安排'],
'system', false, 17, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '决定家庭周末活动', '由孩子决定本周末的家庭活动',
'孩子成为"周末活动总监"，全权决定家庭周末活动的内容。这能极大提升孩子的自信心和家庭归属感。',
'特殊特权', NULL, '🏆', 'https://images.unsplash.com/photo-1526976668912-1a811878dd37?w=400',
20, 'monthly', '6-14岁', 'medium', ARRAY['决策', '领导力', '家庭'],
'提前一周和孩子讨论想法，帮助他们权衡可行性和成本。活动当天让孩子担任"领队"，负责时间管理和活动流程。这不仅是奖励，更是能力培养。',
'半天', ARRAY['活动所需物品'], ARRAY['决策能力', '领导力', '家庭归属感'],
'system', true, 18, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '豁免一次家务', '获得一次家务豁免券',
'孩子可以获得一张"豁免券"，在遇到不想做家务的时刻使用。这是很受欢迎的"特权奖励"，但要谨慎使用，避免孩子过度依赖。',
'特殊特权', NULL, '🎫', 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=400',
10, 'monthly', '5-14岁', 'easy', ARRAY['特权', '豁免', '灵活性'],
'建议限制使用次数（如每月最多1次），且仅适用于"非关键家务"（如整理房间，但不包括照顾宠物或倒垃圾等责任性任务）。制作精美的"豁免券"，让孩子有仪式感地使用和保存。',
'一次', ARRAY['豁免券（自制）'], ARRAY['享受特权', '责任感（适度）'],
'system', false, 19, true);

INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('reward', '选择全家晚餐餐厅', '由孩子选择一家餐厅外出就餐',
'孩子可以选择一家喜欢的餐厅（在预算和饮食习惯范围内），全家一起外出就餐。这能培养孩子的选择能力、礼仪知识和家庭参与感。',
'特殊特权', NULL, '🍽️', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
25, 'quarterly', '6-14岁', 'medium', ARRAY['餐厅', '选择', '礼仪'],
'提前和孩子研究餐厅菜单，讨论饮食习惯和预算。就餐时鼓励孩子练习餐厅礼仪（如礼貌点餐、适当音量交谈、感谢服务员等）。这能将外出就餐转变为社交礼仪学习机会。',
'2小时', ARRAY['餐费预算'], ARRAY['选择能力', '社交礼仪', '家庭时光'],
'system', true, 20, true);

-- 完成任务提示
SELECT '心愿模板种子数据插入完成！共插入 ' || COUNT(*) || ' 条记录' as result 
FROM templates WHERE type = 'reward';
