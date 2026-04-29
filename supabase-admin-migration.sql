-- 愿望卡后台管理系统 - 数据库迁移脚本
-- 在 Supabase Dashboard → SQL Editor 中执行
-- 可重复执行（幂等设计）

-- ==================== 1. 管理员表 ====================
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('super_admin', 'operator', 'support')),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 管理员可查看
DROP POLICY IF EXISTS "Admin can view admin_users" ON admin_users;
CREATE POLICY "Admin can view admin_users" ON admin_users
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

-- 超级管理员可管理
DROP POLICY IF EXISTS "Super admin can manage admin_users" ON admin_users;
CREATE POLICY "Super admin can manage admin_users" ON admin_users
  FOR ALL USING (
    auth.jwt() -> 'app_metadata' ->> 'admin_role' = 'super_admin'
  );

-- ==================== 2. 应用配置表 ====================
CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  category text DEFAULT 'general',  -- 配置分类：general, ai, etc.
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 所有人可读
DROP POLICY IF EXISTS "Anyone can read app_config" ON app_config;
CREATE POLICY "Anyone can read app_config" ON app_config
  FOR SELECT USING (true);

-- 仅管理员可写
DROP POLICY IF EXISTS "Admin can write app_config" ON app_config;
CREATE POLICY "Admin can write app_config" ON app_config
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

-- 插入默认配置
INSERT INTO app_config (key, value, description, category) VALUES
  ('require_invite_code', 'true', '注册是否需要邀请码', 'general'),
  ('require_email_verification', 'false', '是否强制邮箱验证', 'general'),
  ('allow_guest_mode', 'true', '是否允许游客模式', 'general'),
  ('max_family_members', '10', '单个家庭最大成员数', 'general'),
  ('max_tasks_per_family', '100', '单个家庭最大任务数', 'general'),
  ('max_rewards_per_family', '50', '单个家庭最大奖励数', 'general'),
  ('maintenance_mode', 'false', '维护模式开关', 'general'),
  ('min_app_version', '1.0.0', '最低版本号', 'general'),
  ('show_announcement', 'false', '是否显示系统公告', 'general')
ON CONFLICT (key) DO NOTHING;

-- 插入AI助手默认配置
INSERT INTO app_config (key, value, description, category) VALUES
  ('ai_enabled', 'true', '是否启用AI语音助手功能', 'ai'),
  ('ai_provider', 'gemini', 'AI服务提供商: gemini/openai/claude/custom', 'ai'),
  ('ai_model', 'gemini-2.0-flash', '使用的AI模型名称', 'ai'),
  ('ai_api_key', '', 'AI服务的API密钥（敏感信息）', 'ai'),
  ('ai_api_endpoint', '', '自定义API端点（可选，用于代理或自建服务）', 'ai'),
  ('ai_temperature', '0.9', 'AI回复的随机性参数（0-1）', 'ai'),
  ('ai_max_tokens', '2048', 'AI回复的最大Token数量', 'ai')
ON CONFLICT (key) DO NOTHING;

-- ==================== 3. 邀请码使用记录表 ====================
CREATE TABLE IF NOT EXISTS invite_code_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id uuid REFERENCES invite_codes(id) ON DELETE CASCADE,
  user_email text,
  used_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE invite_code_usages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can view invite_code_usages" ON invite_code_usages;
CREATE POLICY "Admin can view invite_code_usages" ON invite_code_usages
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

DROP POLICY IF EXISTS "System can insert invite_code_usages" ON invite_code_usages;
CREATE POLICY "System can insert invite_code_usages" ON invite_code_usages
  FOR INSERT WITH CHECK (true);

-- ==================== 4. 设置管理员账号 ====================
-- 请将下方 'ding7@126.com' 替换为你的管理员邮箱

-- 第一步：设置 admin claim
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object(
    'admin', true,
    'admin_role', 'super_admin'
  )
WHERE email = 'ding7@126.com';

-- 第二步：添加到 admin_users 表
INSERT INTO admin_users (user_id, role)
SELECT id, 'super_admin' FROM auth.users WHERE email = 'ding7@126.com'
ON CONFLICT (user_id) DO NOTHING;

-- ==================== 5. 修改 invite_codes 的 RLS 策略 ====================

DROP POLICY IF EXISTS "Admin can manage all invite_codes" ON invite_codes;
CREATE POLICY "Admin can manage all invite_codes" ON invite_codes
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

-- ==================== 6. 添加管理员读取所有数据的权限 ====================

DROP POLICY IF EXISTS "Admin can view all members" ON members;
CREATE POLICY "Admin can view all members" ON members
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

DROP POLICY IF EXISTS "Admin can view all families" ON families;
CREATE POLICY "Admin can view all families" ON families
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

DROP POLICY IF EXISTS "Admin can view all tasks" ON tasks;
CREATE POLICY "Admin can view all tasks" ON tasks
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

DROP POLICY IF EXISTS "Admin can view all star_transactions" ON star_transactions;
CREATE POLICY "Admin can view all star_transactions" ON star_transactions
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

-- 管理员可更新成员状态（封禁/解封）
DROP POLICY IF EXISTS "Admin can update members" ON members;
CREATE POLICY "Admin can update members" ON members
  FOR UPDATE USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

-- ==================== 7. 管理员 TOTP 二次验证 ====================
-- 添加 totp_secret 列（存储 Google Authenticator 密钥）
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret text;
-- 标记是否已启用 2FA
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false;
-- 独立管理员密码（不依赖 Supabase Auth 密码）
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash text;

-- ==================== 8. 管理员登录验证码表 ====================
CREATE TABLE IF NOT EXISTS admin_login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 索引：快速查找未过期的验证码
CREATE INDEX IF NOT EXISTS idx_admin_login_codes_email ON admin_login_codes(email, expires_at);

-- RLS：允许插入（发验证码时），管理员可查看
ALTER TABLE admin_login_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert login codes" ON admin_login_codes;
CREATE POLICY "Allow insert login codes" ON admin_login_codes
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin can manage login codes" ON admin_login_codes;
CREATE POLICY "Admin can manage login codes" ON admin_login_codes
  FOR ALL USING (
    (auth.jwt() -> 'app_metadata' ->> 'admin')::boolean = true
  );

-- 设置初始管理员密码（bcrypt hash of 'admin123'，请登录后立即修改）
-- bcrypt hash for 'admin123': $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
UPDATE admin_users SET password_hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'
WHERE password_hash IS NULL;
