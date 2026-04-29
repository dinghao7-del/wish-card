# Supabase 数据库迁移指南

## 自动化迁移步骤

### 方法一：使用 Supabase Access Token（推荐，完全自动化）

1. **获取 Supabase Access Token**
   - 访问：https://supabase.com/dashboard/account/tokens
   - 点击 "Generate new token"
   - 名称：WorkBuddy Migration
   - 权限：All Access
   - 点击 "Generate token"
   - **复制并保存 token**（只显示一次）

2. **设置环境变量并执行迁移**
   ```bash
   # 设置 Access Token
   export SUPABASE_ACCESS_TOKEN='your-token-here'
   
   # 执行迁移
   cd /Users/zerone/WorkBuddy/20260420104543
   node migrate.js supabase-templates-migration-CLEAN.sql
   
   # 导入种子数据
   node migrate.js supabase-task-templates-FIXED.sql
   ```

### 方法二：使用数据库密码

1. **获取数据库密码**
   - 访问：https://supabase.com/dashboard/project/qdiuufuoleharmjfarzr/settings/database
   - 在 "Database Password" 部分点击 "Copy"

2. **执行迁移**
   ```bash
   # 设置数据库密码
   export SUPABASE_DB_PASSWORD='your-db-password'
   
   # 执行迁移
   cd /Users/zerone/WorkBuddy/20260420104543
   ./run-migration.sh
   
   # 导入种子数据
   ./run-seed.sh
   ```

### 方法三：手动执行（最简单）

1. 打开 Supabase SQL Editor：
   https://supabase.com/dashboard/project/qdiuufuoleharmjfarzr/sql

2. 复制迁移 SQL（`supabase-templates-migration-CLEAN.sql` 的内容）

3. 粘贴到 SQL Editor 并点击 "Run"

4. 复制种子数据 SQL（`supabase-task-templates-FIXED.sql` 的内容）

5. 粘贴到 SQL Editor 并点击 "Run"

## 验证迁移

执行以下 SQL 验证迁移是否成功：

```sql
-- 检查 template_categories 表
SELECT type, COUNT(*) as count 
FROM template_categories 
GROUP BY type;

-- 检查 templates 表的新字段
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'templates' 
ORDER BY ordinal_position;

-- 检查任务模板数量
SELECT COUNT(*) as task_templates 
FROM templates 
WHERE type = 'task';
```

## 当前状态

- ✅ `template_categories` 表已创建（30 条分类记录）
- ✅ `template_usage_stats` 表已创建
- ❌ `templates` 表缺少增强字段（需要执行迁移）
- ❌ 种子数据未导入（需要先完成迁移）
