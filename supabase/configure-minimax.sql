-- MiniMax AI助手配置更新
-- 直接在 Supabase Dashboard → SQL Editor 中执行

-- ==================== 1. 确保category字段存在 ====================
ALTER TABLE app_config ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- ==================== 2. 更新MiniMax配置 ====================

-- 启用AI助手
INSERT INTO app_config (key, value, description, category) 
VALUES ('ai_enabled', 'true', '是否启用AI语音助手功能', 'ai')
ON CONFLICT (key) DO UPDATE SET value = 'true';

-- 设置服务商为MiniMax
INSERT INTO app_config (key, value, description, category) 
VALUES ('ai_provider', 'minimax', 'AI服务提供商', 'ai')
ON CONFLICT (key) DO UPDATE SET value = 'minimax';

-- 设置模型
INSERT INTO app_config (key, value, description, category) 
VALUES ('ai_model', 'MiniMax-M2.7', 'AI模型名称', 'ai')
ON CONFLICT (key) DO UPDATE SET value = 'MiniMax-M2.7';

-- 设置API端点
INSERT INTO app_config (key, value, description, category) 
VALUES ('ai_api_endpoint', 'https://api.minimax.chat/v1/text/chatcompletion_v2', 'API端点，仅作后台展示；真实调用以Edge Function Secret为准', 'ai')
ON CONFLICT (key) DO UPDATE SET value = 'https://api.minimax.chat/v1/text/chatcompletion_v2';

-- API密钥不再写入数据库，统一放在 Supabase Edge Function Secret 中：
-- supabase secrets set MINIMAX_API_KEY=你的密钥
INSERT INTO app_config (key, value, description, category) 
VALUES ('ai_api_key', '', '已废弃：API密钥存放在Edge Function Secret，不进入数据库和前端', 'ai')
ON CONFLICT (key) DO UPDATE SET value = '';

-- 设置温度参数
INSERT INTO app_config (key, value, description, category) 
VALUES ('ai_temperature', '0.9', '温度参数', 'ai')
ON CONFLICT (key) DO UPDATE SET value = '0.9';

-- 设置最大Token
INSERT INTO app_config (key, value, description, category) 
VALUES ('ai_max_tokens', '8192', '最大Token数', 'ai')
ON CONFLICT (key) DO UPDATE SET value = '8192';

-- ==================== 3. 验证配置 ====================
SELECT key, value FROM app_config WHERE category = 'ai' OR key LIKE 'ai_%';
