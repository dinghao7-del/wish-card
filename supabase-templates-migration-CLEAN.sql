-- ============================================
-- 模板库增强迁移：支持三套独立模板库
-- 任务模板、心愿模板、习惯模板
-- ============================================

-- 1. 增强 templates 表（添加新字段）
ALTER TABLE templates 
ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS detailed_description TEXT,
ADD COLUMN IF NOT EXISTS usage_suggestions TEXT,
ADD COLUMN IF NOT EXISTS age_range VARCHAR(50),
ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(50),
ADD COLUMN IF NOT EXISTS materials_needed TEXT[],
ADD COLUMN IF NOT EXISTS learning_outcomes TEXT[],
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- 2. 创建模板分类表
CREATE TABLE IF NOT EXISTS template_categories (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('task', 'reward', 'habit')),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  icon VARCHAR(10),
  image_url TEXT,
  description TEXT,
  parent_id INTEGER REFERENCES template_categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(type, name)
);

-- 3. 创建模板使用统计表
CREATE TABLE IF NOT EXISTS template_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id),
  member_id UUID REFERENCES members(id),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_templates_type_category ON templates(type, category);
CREATE INDEX IF NOT EXISTS idx_templates_is_featured ON templates(is_featured);
CREATE INDEX IF NOT EXISTS idx_templates_usage_count ON templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_template_categories_type ON template_categories(type);
CREATE INDEX IF NOT EXISTS idx_template_categories_parent ON template_categories(parent_id);

-- 5. 启用 RLS
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage_stats ENABLE ROW LEVEL SECURITY;

-- 6. 创建访问策略（先删除再创建，避免冲突）
DROP POLICY IF EXISTS "允许公开读取模板分类" ON template_categories;
CREATE POLICY "允许公开读取模板分类" ON template_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "允许公开读取模板使用统计" ON template_usage_stats;
CREATE POLICY "允许公开读取模板使用统计" ON template_usage_stats FOR SELECT USING (true);

-- 7. 插入分类数据 - 任务模板
INSERT INTO template_categories (type, name, name_en, icon, description, sort_order) VALUES
('task', '家务责任', 'Chores', '🏠', '培养孩子的家庭责任感，学习生活技能', 1),
('task', '自我管理', 'Self-Management', '🎯', '帮助孩子建立自我管理能力', 2),
('task', '性格养成', 'Character Building', '💪', '塑造积极性格和良好品格', 3),
('task', '运动健康', 'Health & Sports', '⚽', '促进身体健康和运动习惯', 4),
('task', '学习成长', 'Learning & Growth', '📚', '培养学习兴趣和认知能力', 5),
('task', '社交技能', 'Social Skills', '👥', '提升社交能力和情商', 6),
('task', '创意表达', 'Creativity', '🎨', '激发创造力和艺术天赋', 7)
ON CONFLICT (type, name) DO NOTHING;

-- 家务责任子分类
INSERT INTO template_categories (type, name, name_en, icon, description, parent_id, sort_order) VALUES
('task', '日常清洁', 'Daily Cleaning', '🧹', '日常清洁任务', (SELECT id FROM template_categories WHERE type='task' AND name='家务责任'), 1),
('task', '衣物整理', 'Clothing', '👕', '衣物相关任务', (SELECT id FROM template_categories WHERE type='task' AND name='家务责任'), 2),
('task', '餐食协助', 'Meal Help', '🍽️', '餐食准备和清理', (SELECT id FROM template_categories WHERE type='task' AND name='家务责任'), 3),
('task', '宠物植物', 'Pets & Plants', '🌱', '照顾宠物和植物', (SELECT id FROM template_categories WHERE type='task' AND name='家务责任'), 4)
ON CONFLICT (type, name) DO NOTHING;

-- 自我管理子分类
INSERT INTO template_categories (type, name, name_en, icon, description, parent_id, sort_order) VALUES
('task', '时间管理', 'Time Management', '⏰', '学会管理时间', (SELECT id FROM template_categories WHERE type='task' AND name='自我管理'), 1),
('task', '财务管理', 'Money Management', '💰', '学习理财知识', (SELECT id FROM template_categories WHERE type='task' AND name='自我管理'), 2),
('task', '情绪管理', 'Emotion Management', '😊', '认识和调节情绪', (SELECT id FROM template_categories WHERE type='task' AND name='自我管理'), 3)
ON CONFLICT (type, name) DO NOTHING;

-- 心愿模板分类
INSERT INTO template_categories (type, name, name_en, icon, description, sort_order) VALUES
('reward', '娱乐时光', 'Entertainment', '🎮', '游戏、看电视等娱乐活动', 1),
('reward', '美食享受', 'Food & Snacks', '🍦', '美食、零食、特色餐饮', 2),
('reward', '户外探索', 'Outdoor Activities', '🏞️', '户外活动、游玩', 3),
('reward', '创意手工', 'Crafts & DIY', '✂️', '手工、绘画、创作', 4),
('reward', '社交聚会', 'Social & Parties', '🎉', '朋友聚会、派对', 5),
('reward', '购物消费', 'Shopping', '🛍️', '购买玩具、书籍等', 6),
('reward', '特殊特权', 'Special Privileges', '⭐', '特殊权限或豁免权', 7)
ON CONFLICT (type, name) DO NOTHING;

-- 习惯模板分类
INSERT INTO template_categories (type, name, name_en, icon, description, sort_order) VALUES
('habit', '生活习惯', 'Daily Habits', '🌅', '日常作息和生活习惯', 1),
('habit', '学习习惯', 'Study Habits', '📖', '学习相关习惯养成', 2),
('habit', '运动习惯', 'Exercise Habits', '🏃', '运动和体能训练', 3),
('habit', '阅读习惯', 'Reading Habits', '📚', '培养阅读兴趣', 4),
('habit', '社交习惯', 'Social Habits', '🤝', '社交礼仪和沟通', 5),
('habit', '创意习惯', 'Creative Habits', '🎨', '创造力培养', 6)
ON CONFLICT (type, name) DO NOTHING;

-- 生活习惯子分类
INSERT INTO template_categories (type, name, name_en, icon, description, parent_id, sort_order) VALUES
('habit', '晨间routine', 'Morning Routine', '🌤️', '早晨固定习惯', (SELECT id FROM template_categories WHERE type='habit' AND name='生活习惯'), 1),
('habit', '晚间routine', 'Evening Routine', '🌙', '晚间固定习惯', (SELECT id FROM template_categories WHERE type='habit' AND name='生活习惯'), 2),
('habit', '个人卫生', 'Personal Hygiene', '🚿', '卫生清洁习惯', (SELECT id FROM template_categories WHERE type='habit' AND name='生活习惯'), 3)
ON CONFLICT (type, name) DO NOTHING;

-- 8. 创建存储桶（使用函数避免冲突）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'template-images') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('template-images', 'template-images', true);
  END IF;
END $$;

-- 9. 设置存储策略（先删除再创建）
DROP POLICY IF EXISTS "模板图片公开读取" ON storage.objects;
CREATE POLICY "模板图片公开读取" ON storage.objects FOR SELECT USING (bucket_id = 'template-images');

DROP POLICY IF EXISTS "管理员可上传模板图片" ON storage.objects;
CREATE POLICY "管理员可上传模板图片" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'template-images');

DROP POLICY IF EXISTS "管理员可更新模板图片" ON storage.objects;
CREATE POLICY "管理员可更新模板图片" ON storage.objects FOR UPDATE USING (bucket_id = 'template-images');

-- 完成提示
SELECT '模板库增强迁移完成！' as result;
