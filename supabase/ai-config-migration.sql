-- AI助手配置数据库迁移脚本
-- 在 Supabase Dashboard → SQL Editor 中执行
-- 可单独执行（不影响其他功能）

-- ==================== 1. 添加category字段 ====================
ALTER TABLE app_config ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- ==================== 2. 插入AI助手默认配置 ====================
INSERT INTO app_config (key, value, description, category) VALUES
  ('ai_enabled', 'true', '是否启用AI语音助手功能', 'ai'),
  ('ai_provider', 'minimax', 'AI服务提供商: gemini/openai/claude/minimax/custom', 'ai'),
  ('ai_model', 'MiniMax-M2.7', '使用的AI模型名称', 'ai'),
  ('ai_api_key', '', 'AI服务的API密钥（敏感信息）', 'ai'),
  ('ai_api_endpoint', 'https://api.minimax.chat', 'API端点', 'ai'),
  ('ai_temperature', '0.9', 'AI回复的随机性参数（0-1）', 'ai'),
  ('ai_max_tokens', '2048', 'AI回复的最大Token数量', 'ai')
ON CONFLICT (key) DO NOTHING;

-- ==================== 3. 更新MiniMax配置（如果已存在旧配置）====================
UPDATE app_config SET 
  description = 'AI服务提供商: gemini/openai/claude/minimax/custom',
  value = CASE 
    WHEN key = 'ai_provider' AND value NOT IN ('gemini', 'openai', 'claude', 'minimax', 'custom') THEN 'minimax'
    WHEN key = 'ai_model' AND value = 'gemini-2.0-flash' THEN 'MiniMax-M2.7'
    WHEN key = 'ai_api_endpoint' AND (value = '' OR value IS NULL) THEN 'https://api.minimax.chat'
    ELSE value
  END
WHERE category = 'ai';

-- ==================== 4. 验证配置 ====================
SELECT key, value, description, category FROM app_config WHERE category = 'ai' ORDER BY key;
