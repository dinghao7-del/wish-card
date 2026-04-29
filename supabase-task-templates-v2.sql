-- ============================================
-- 任务模板种子数据（修复版）
-- 先删除已存在记录，再重新插入
-- ============================================

-- 删除已存在的任务模板
DELETE FROM templates WHERE source = 'system' AND type = 'task';

-- 1. 整理玩具
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '整理玩具', '把玩具收拾到指定位置且分类', 
'培养孩子养成玩耍后整理玩具的好习惯。',
'家务责任', '日常清洁', '🧸', 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400', 
2, 'daily', '3-8岁', 'easy', ARRAY['整理', '分类', '责任感'],
'建议家长先示范如何分类整理。',
'15-20分钟', ARRAY['收纳箱'], ARRAY['分类能力', '责任感'],
'system', true, 1, true);

-- 2. 整理书架
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '整理书架', '把图书放回书架上',
'鼓励孩子读完书后将其放回书架指定位置。',
'家务责任', '日常清洁', '📚', 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400',
2, 'daily', '4-10岁', 'easy', ARRAY['阅读', '整理'],
'为孩子准备一个专属书架。',
'10-15分钟', ARRAY['书架'], ARRAY['秩序感', '整理能力'],
'system', false, 2, true);

-- 3. 倒垃圾
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '倒垃圾', '负责倒自己房间/客厅的垃圾桶',
'教孩子识别垃圾桶满载的信号。',
'家务责任', '日常清洁', '🗑️', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
1, 'daily', '5-12岁', 'easy', ARRAY['环保', '责任'],
'开始时家长可以陪同。',
'5-10分钟', ARRAY['垃圾袋'], ARRAY['环保意识', '责任感'],
'system', false, 3, true);

-- 4. 扫地拖地
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '扫地拖地', '负责扫地或拖地（适合区域）',
'学习使用扫帚和拖把清洁地面。',
'家务责任', '日常清洁', '🧹', 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400',
3, 'weekly', '6-12岁', 'medium', ARRAY['清洁', '大动作'],
'为孩子准备适合身高的扫帚。',
'20-30分钟', ARRAY['扫帚', '拖把'], ARRAY['大肌肉发展', '责任感'],
'system', true, 4, true);

-- 5. 整理脏衣服
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '整理脏衣服', '把脏衣服放进洗衣篮',
'培养及时清理脏衣服的习惯。',
'家务责任', '衣物整理', '👕', 'https://images.unsplash.com/photo-1545173168-9f1947c17513?w=400',
1, 'daily', '3-8岁', 'easy', ARRAY['衣物', '整理'],
'在孩子的房间放置一个专属洗衣篮。',
'5分钟', ARRAY['洗衣篮'], ARRAY['生活习惯', '整洁意识'],
'system', false, 5, true);

-- 6. 叠衣服
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '叠衣服', '折叠衣物并分类收纳',
'学习正确的叠衣服方法。',
'家务责任', '衣物整理', '👔', 'https://images.unsplash.com/photo-1489274499089-2bBufferf5635?w=400',
2, 'weekly', '5-10岁', 'medium', ARRAY['精细动作', '组织能力'],
'家长先示范"金牌叠衣法"。',
'15-25分钟', ARRAY['叠衣板'], ARRAY['精细动作', '组织能力'],
'system', false, 6, true);

-- 7. 洗衣服
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '洗衣服', '学会使用洗衣机洗自己的简单衣物',
'在家长监督下，学习操作洗衣机。',
'家务责任', '衣物整理', '🫧', 'https://images.unsplash.com/photo-1545173168-9f1947c17513?w=400',
3, 'weekly', '8-14岁', 'medium', ARRAY['生活技能', '自理'],
'首次操作需要家长全程陪同。',
'30-40分钟', ARRAY['洗衣机', '洗衣液'], ARRAY['生活技能', '独立性'],
'system', true, 7, true);

-- 8. 餐具整理
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '餐具整理', '帮忙摆碗筷/饭后收拾餐桌',
'餐前帮忙摆放餐具，餐后协助收拾。',
'家务责任', '餐食协助', '🍽️', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
2, 'daily', '4-10岁', 'easy', ARRAY['餐桌礼仪', '协助'],
'可以让孩子参与制定"餐具摆放规则"。',
'10-15分钟', ARRAY['餐具', '围裙'], ARRAY['餐桌礼仪', '家庭归属感'],
'system', false, 8, true);

-- 9. 学会做饭
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '学会做饭', '学习做一道简单的菜/准备简单早餐',
'从最简单的料理开始。',
'家务责任', '餐食协助', '🍳', 'https://images.unsplash.com/photo-1504754524776-2f8f13f55cd?w=400',
5, 'weekly', '8-14岁', 'hard', ARRAY['生活技能', '营养'],
'从"免火料理"开始。',
'30-60分钟', ARRAY['食材', '烹饪工具'], ARRAY['生活技能', '营养知识'],
'system', true, 9, true);

-- 10. 参与采购
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '参与采购', '参与家庭采购清单制作/帮忙提东西',
'和孩子一起列购物清单。',
'家务责任', '餐食协助', '🛒', 'https://images.unsplash.com/photo-1578916171728-46686eac446d?w=400',
3, 'weekly', '6-12岁', 'medium', ARRAY['计划', '金钱概念'],
'出行前让孩子参与制作购物清单。',
'45-90分钟', ARRAY['购物清单', '购物袋'], ARRAY['计划能力', '金钱概念'],
'system', false, 10, true);

-- 11. 制作每日计划
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '制作每日计划', '规划当天要做的事情',
'教孩子使用可视化工具规划一天的活动。',
'自我管理', '时间管理', '📋', 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400',
3, 'daily', '7-14岁', 'medium', ARRAY['计划', '时间管理'],
'为孩子准备一个可爱的计划本。',
'15-20分钟', ARRAY['计划本', '彩色笔'], ARRAY['时间管理', '自律'],
'system', true, 11, true);

-- 12. 准时完成任务
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '准时完成任务', '在约定时间内完成任务',
'设定计时器，要求孩子在规定时间内完成任务。',
'自我管理', '时间管理', '⏰', 'https://images.unsplash.com/photo-1523289333742-b09b23de7ca0?w=400',
2, 'daily', '6-12岁', 'medium', ARRAY['时间感', '效率'],
'使用可视化计时器。',
'按任务而定', ARRAY['计时器'], ARRAY['时间感', '效率意识'],
'system', false, 12, true);

-- 13. 情绪日记
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '情绪日记', '记录每天的情绪变化和原因',
'通过绘画或简单文字记录每天的情绪。',
'自我管理', '情绪管理', '📝', 'https://images.unsplash.com/photo-1517841627044-5e9634899c10?w=400',
2, 'daily', '5-12岁', 'medium', ARRAY['情绪认知', '表达'],
'为孩子准备专门的"情绪日记本"。',
'10-15分钟', ARRAY['日记本', '彩色笔'], ARRAY['情绪认知', '表达能力'],
'system', true, 13, true);

-- 14. 深呼吸练习
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '深呼吸练习', '生气或焦虑时做深呼吸放松',
'教孩子简单的深呼吸技巧。',
'自我管理', '情绪管理', '🧘', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400',
2, 'daily', '4-12岁', 'easy', ARRAY['放松', '自我调节'],
'制作"呼吸练习卡"。',
'5-10分钟', ARRAY['呼吸练习卡'], ARRAY['自我调节', '情绪管理'],
'system', false, 14, true);

-- 15. 讲礼貌
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '讲礼貌', '尊敬长辈，主动和认识的人打招呼',
'培养基本的社交礼仪。',
'性格养成', NULL, '🙏', 'https://images.unsplash.com/photo-1526674231531-c6227db76b6e?w=400',
2, 'daily', '3-10岁', 'easy', ARRAY['礼貌', '社交'],
'家长要以身作则。',
'全天渗透', ARRAY['礼貌用语卡片'], ARRAY['社交礼仪', '自信心'],
'system', true, 15, true);

-- 16. 主动认错
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '主动认错', '做错事主动承认错误，自我反思',
'培养孩子的责任感和诚实品格。',
'性格养成', NULL, '💖', 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400',
5, 'daily', '4-12岁', 'medium', ARRAY['诚实', '责任感'],
'家长要以开放、接纳的态度。',
'适时进行', NULL, ARRAY['诚实品格', '责任感'],
'system', false, 16, true);

-- 17. 迎难而上
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '迎难而上', '遇到困难主要想办法解决，不半途而废',
'培养孩子的抗挫力和成长思维。',
'性格养成', NULL, '💪', 'https://images.unsplash.com/photo-1529391409745-4e9042af2176?w=400',
5, 'daily', '6-14岁', 'hard', ARRAY['抗挫力', '成长思维'],
'当孩子遇到困难想放弃时。',
'按任务而定', NULL, ARRAY['抗挫力', '成长思维'],
'system', true, 17, true);

-- 18. 户外散步
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '户外散步', '去户外看看花/摸摸树叶',
'每天至少30分钟的户外活动时间。',
'运动健康', NULL, '🌳', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
2, 'daily', '3-10岁', 'easy', ARRAY['户外', '自然'],
'把散步变成"自然探索之旅"。',
'30-45分钟', ARRAY['放大镜'], ARRAY['观察力', '自然认知'],
'system', false, 18, true);

-- 19. 运动锻炼
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '运动锻炼', '户外活动/运动30分钟',
'每天至少30分钟的中等强度运动。',
'运动健康', NULL, '⚽', 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400',
3, 'daily', '4-14岁', 'medium', ARRAY['运动', '健康'],
'让孩子选择自己喜欢的运动项目。',
'30-60分钟', ARRAY['运动装备'], ARRAY['体能发展', '健康习惯'],
'system', true, 19, true);

-- 20. 保护视力
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '保护视力', '做眼保健操、眺望远方10分钟',
'每次用眼30分钟后，休息眼睛。',
'运动健康', NULL, '👁️', 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400',
2, 'daily', '5-14岁', 'easy', ARRAY['视力保护', '健康'],
'设置"用眼定时器"。',
'10分钟', ARRAY['定时器'], ARRAY['视力保护', '健康习惯'],
'system', false, 20, true);

-- 21. 阅读时间
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '阅读时间', '每天阅读至少20分钟',
'培养每日阅读习惯。',
'学习成长', NULL, '📖', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
3, 'daily', '4-14岁', 'medium', ARRAY['阅读', '专注'],
'为孩子打造一个舒适的"阅读角"。',
'20-40分钟', ARRAY['书籍', '阅读角'], ARRAY['阅读兴趣', '语言能力'],
'system', true, 21, true);

-- 22. 写日记/周记
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '写日记/周记', '记录每日的想法、感受或学到的新知识',
'通过写作表达自己的想法和感受。',
'学习成长', NULL, '✍️', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
2, 'daily', '7-14岁', 'medium', ARRAY['写作', '反思'],
'不要过分强调语法和拼写。',
'15-20分钟', ARRAY['日记本', '彩色笔'], ARRAY['写作能力', '反思能力'],
'system', false, 22, true);

-- 23. 分享玩具
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '分享玩具', '和朋友/兄弟姐妹分享自己的玩具',
'学习分享和轮流玩的概念。',
'社交技能', NULL, '🤝', 'https://images.unsplash.com/photo-1503454537195-1dcabb73fc20?w=400',
2, 'daily', '3-8岁', 'easy', ARRAY['分享', '合作'],
'家长可以示范分享行为。',
'在玩耍中实践', NULL, ARRAY['同理心', '合作精神'],
'system', false, 23, true);

-- 24. 帮助他人
INSERT INTO templates (type, title, description, detailed_description, category, subcategory, icon, image_url, stars, frequency, age_range, difficulty, tags, usage_suggestions, estimated_time, materials_needed, learning_outcomes, source, is_featured, sort_order, is_active) VALUES
('task', '帮助他人', '主动帮助家人或朋友做一件事',
'培养助人为乐的品格。',
'社交技能', NULL, '💝', 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400',
3, 'weekly', '4-12岁', 'medium', ARRAY['帮助', '同理心'],
'家长可以故意"示弱"。',
'适时进行', NULL, ARRAY['同理心', '助人精神'],
'system', true, 24, true);

-- 完成任务提示
SELECT '任务模板种子数据插入完成！共插入 ' || COUNT(*) || ' 条记录' as result 
FROM templates WHERE type = 'task';
