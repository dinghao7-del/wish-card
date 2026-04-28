-- ==========================================
-- Forest Family - 禁用 RLS 策略
-- ==========================================
-- 由于应用不使用 Supabase Auth，而是自己管理用户
-- 需要禁用 Row Level Security 或设置公开访问策略
-- 
-- 在 Supabase Dashboard > SQL Editor 中执行此脚本
-- ==========================================

-- 方案 1：完全禁用 RLS（开发环境推荐）
-- 这样所有请求都可以访问，适合内部工具

ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE star_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events DISABLE ROW LEVEL SECURITY;

-- 确认执行成功
SELECT 'RLS 已禁用，所有表均可公开访问' as status;


-- ==========================================
-- 方案 2：启用 RLS 但允许公开访问（更安全的选项）
-- 如果需要更严格的控制，使用这个方案
-- ==========================================

/*
-- 先启用 RLS
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 创建策略：允许公开访问（使用 anon key 即可）
CREATE POLICY "允许公开访问" ON families FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许公开访问" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许公开访问" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许公开访问" ON habits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许公开访问" ON rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许公开访问" ON star_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "允许公开访问" ON analytics_events FOR ALL USING (true) WITH CHECK (true);
*/
