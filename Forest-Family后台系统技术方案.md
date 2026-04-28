# Forest Family 后台系统完整技术方案

> 本文档涵盖后台功能设计、开源方案选型、部署策略和升级路径

---

## 一、核心后台功能模块设计

### 1.1 用户认证与账号系统

| 功能 | 说明 | 优先级 |
|---|---|---|
| 手机短信注册/登录 | 验证码登录，适合移动端 | P0 |
| 邮箱注册/登录 | 传统邮箱验证 | P0 |
| 第三方登录 | 微信、Apple ID、Google | P1 |
| 家庭组管理 | 创建家庭、邀请成员、角色分配 | P0 |
| 密码重置 | 短信/邮箱重置密码 | P1 |

### 1.2 用户行为分析模块

| 功能 | 说明 | 技术方案 |
|---|---|---|
| 事件追踪 | 任务完成、奖励兑换、登录频次 | 埋点 + 数据库记录 |
| 可视化看板 | 家庭成员活跃度、星星流向 | Metabase / Grafana |
| 成长报告 | 每周/每月家庭报告生成 | 定时任务 + 邮件推送 |
| 留存分析 | 新用户 7日/30日留存 | PostHog / 自建 |

### 1.3 云端模板库管理

| 功能 | 说明 |
|---|---|
| 官方模板库 | 预设任务模板（整理房间、写作业等） |
| 用户模板发布 | 用户可创建并发布模板到公共库 |
| 模板分类标签 | 按年龄、场景、类型分类 |
| 模板搜索 | 全文搜索、热度排序 |
| 模板点赞/收藏 | 社区互动功能 |

### 1.4 用户分享模块

| 功能 | 说明 |
|---|---|
| 分享链接生成 | 长链接 + 短链接 |
| 社交平台分享 | 微信、朋友圈、微博 |
| 分享卡片预览 | OG Meta 标签配置 |
| 扫码加入家庭 | 二维码生成 + 解析 |
| 模板分享 | 分享模板到社区 |

### 1.5 管理后台功能

| 功能 | 说明 |
|---|---|
| 用户管理 | 查看、禁用、删除用户 |
| 内容审核 | 模板审核、举报处理 |
| 数据统计 | DAU、MAU、留存率 |
| 系统配置 | 功能开关、公告管理 |
| 客服系统 | 用户反馈处理 |

---

## 二、开源方案选型对比

### 方案 A：Supabase ⭐⭐⭐⭐⭐（强烈推荐）

**为什么推荐：**
- ✅ 开源（可自托管）
- ✅ 免费 Tier 非常慷慨（500MB 数据库、1GB 文件存储、50K 月活用户）
- ✅ 内置 Auth（支持短信、邮箱、第三方登录）
- ✅ 内置数据库（PostgreSQL）
- ✅ 内置实时订阅（Realtime）
- ✅ 内置存储（Storage）
- ✅ 有现成的 Dashboard（管理后台）
- ✅ 可无缝升级到付费 Plan

**架构：**
```
Forest Family App
    ↓
Supabase (Auth + DB + Realtime + Storage)
    ↓
Supabase Dashboard (管理后台)
```

**免费部署方案：**
1. **初期**：使用 Supabase Cloud 免费 Tier
2. **用户增长后**：升级到 Supabase Pro ($25/月)
3. **大规模后**：自托管 Supabase（Docker Compose 一键部署）

---

### 方案 B：Appwrite ⭐⭐⭐⭐（备选）

**特点：**
- ✅ 开源（Apache 2.0）
- ✅ 自托管友好（Docker 部署）
- ✅ 内置 Auth、数据库、存储、函数
- ⚠️ 免费 Cloud 额度较少
- ⚠️ 社区比 Supabase 小

---

### 方案 C：Directus + PostgreSQL ⭐⭐⭐（CMS 方案）

**特点：**
- ✅ 开源 Headless CMS
- ✅ 非常强大的 Admin 界面
- ✅ 支持自定义 Dashboard
- ⚠️ 需要自己处理 Auth
- ⚠️ 需要单独部署

---

## 三、推荐技术栈（基于 Supabase）

### 3.1 后端架构

```
Frontend (React) → Supabase JS Client → Supabase Backend
                                    ↓
                            (Auth / DB / Realtime / Storage)
```

### 3.2 数据库设计（核心表）

```sql
-- 家庭表
CREATE TABLE families (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用户表（Supabase Auth 自带，只需扩展 profile）
CREATE TABLE profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  family_id UUID REFERENCES families(id),
  name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('parent', 'child')),
  stars INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 任务表
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES families(id),
  title TEXT NOT NULL,
  description TEXT,
  reward_stars INTEGER,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 奖励表
CREATE TABLE rewards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES families(id),
  name TEXT NOT NULL,
  cost INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 模板表
CREATE TABLE templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 历史记录表
CREATE TABLE history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT,
  type TEXT,
  stars INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 启用行级安全策略（RLS）
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

-- 允许用户在自己的家庭中读写
CREATE POLICY "Users can view own family" ON profiles
  FOR SELECT USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));
```

---

## 四、免费部署 → 逐步升级路径

### 阶段 1：MVP 验证（0 成本）

| 服务 | 方案 | 费用 |
|---|---|---|
| 前端部署 | Vercel / Netlify 免费版 | $0 |
| 后端 API | Supabase 免费 Tier | $0 |
| 数据库 | Supabase PostgreSQL 免费 | $0 |
| 文件存储 | Supabase Storage 免费 | $0 |
| 域名 | 使用子域名或购买域名 | $10-20/年 |
| **月总成本** | | **$1-2** |

---

### 阶段 2：用户增长（低成本）

| 服务 | 方案 | 费用 |
|---|---|---|
| 前端部署 | Vercel Pro | $20/月 |
| 后端 API | Supabase Pro | $25/月 |
| 数据库 | Supabase Pro 包含 | - |
| 文件存储 | Supabase Pro 包含 | - |
| 短信服务 | 阿里云 / 腾讯云 | 按量计费 |
| **月总成本** | | **~$50** |

---

### 阶段 3：规模化（自托管）

| 服务 | 方案 | 费用 |
|---|---|---|
| 服务器 | 阿里云 / AWS EC2 | $50-200/月 |
| 数据库 | 自建 PostgreSQL / RDS | $30-100/月 |
| CDN | Cloudflare | $0-20/月 |
| 监控 | Grafana Cloud | $0-50/月 |
| **月总成本** | | **~$100-400** |

---

## 五、具体实施步骤

### 第一步：Supabase 项目初始化

```bash
# 1. 在 Supabase.com 创建项目（免费）

# 2. 安装 Supabase CLI
npm install -g supabase

# 3. 连接本地项目
cd forest-family
supabase init
supabase login
supabase link --project-ref <your-project-ref>

# 4. 推送数据库 schema
supabase db push

# 5. 获取 API 密钥
# 在 Supabase Dashboard → Settings → API 中获取
#   - URL: https://xxx.supabase.co
#   - Anon Key: eyJhbGc...
```

---

### 第二步：前端集成 Supabase

安装依赖：
```bash
npm install @supabase/supabase-js
```

创建 Supabase 客户端：
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

环境变量（`.env.local`）：
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

---

### 第三步：替换 localStorage 为 Supabase

**登录示例：**
```typescript
// 短信登录
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+8613800138000',
})

// 邮箱登录
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})
```

**读取任务：**
```typescript
const { data: tasks, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('family_id', familyId)
```

**实时订阅（多端同步）：**
```typescript
supabase
  .channel('tasks')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'tasks' }, 
    (payload) => {
      console.log('Change received!', payload)
      // 刷新任务列表
    }
  )
  .subscribe()
```

**退出登录：**
```typescript
await supabase.auth.signOut()
```

---

## 六、管理后台方案

### 选项 1：使用 Supabase Dashboard（最快）

- ✅ 零开发成本
- ✅ 功能完整（用户管理、数据库管理、API 日志）
- ⚠️ 需要给管理员分配 Supabase 账号

---

### 选项 2：自建管理后台（推荐）

使用 **React Admin**（开源）：

```bash
npm install react-admin @supabase/supabase-js
```

优势：
- ✅ 完全自定义
- ✅ 支持中文
- ✅ 丰富的组件库
- ✅ 可集成到主应用或独立部署

示例配置：
```typescript
// src/admin/App.tsx
import { Admin, Resource } from 'react-admin';
import { SupabaseDataProvider } from './dataProvider';

export const AdminApp = () => (
  <Admin dataProvider={SupabaseDataProvider}>
    <Resource name="profiles" list={UserList} edit={UserEdit} />
    <Resource name="tasks" list={TaskList} edit={TaskEdit} />
    <Resource name="templates" list={TemplateList} />
  </Admin>
);
```

---

### 选项 3：使用 Metabase（数据分析）

- ✅ 开源 BI 工具
- ✅ 零代码创建图表
- ✅ 支持自动发送报告
- ✅ 可部署在自己的服务器

```bash
# Docker 部署
docker run -d -p 3000:3000 --name metabase metabase/metabase
```

---

## 七、用户行为分析具体方案

### 方案 A：PostHog ⭐⭐⭐⭐⭐（推荐）

- ✅ 开源，可自托管
- ✅ 免费 Cloud Tier（1M 事件/月）
- ✅ 功能强大（漏斗、留存、热力图）
- ✅ 支持录屏回放

```typescript
// 安装
npm install posthog-js

// 初始化
import posthog from 'posthog-js'
posthog.init('<your-token>', { api_host: 'https://app.posthog.com' })

// 追踪事件
posthog.capture('task_completed', {
  task_id: task.id,
  reward_stars: task.rewardStars
})
```

---

### 方案 B：Mixpanel

- ✅ 免费 Tier（20M 事件/月）
- ⚠️ 不开源

---

### 方案 C：自建简易分析

```sql
-- 事件表
CREATE TABLE analytics_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  event_name TEXT,  -- 'task_completed', 'reward_redeemed'
  properties JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 查看日活
SELECT 
  DATE(created_at) AS day, 
  COUNT(DISTINCT user_id) AS dau
FROM analytics_events
GROUP BY day
ORDER BY day DESC;

-- 查看留存率（次日留存）
WITH first_seen AS (
  SELECT user_id, DATE(MIN(created_at)) AS first_day
  FROM analytics_events
  GROUP BY user_id
),
next_day AS (
  SELECT 
    fs.user_id,
    fs.first_day,
    DATE(ae.created_at) AS activity_day
  FROM first_seen fs
  JOIN analytics_events ae ON fs.user_id = ae.user_id
)
SELECT 
  first_day,
  COUNT(DISTINCT user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN activity_day = first_day + INTERVAL '1 day' 
    THEN user_id END) AS retained_day_1
FROM next_day
GROUP BY first_day
ORDER BY first_day;
```

---

## 八、模板分享功能设计

### 8.1 分享链接设计

```
# 模板分享链接
https://forest.family/template/abc123

# 家庭邀请链接（带过期时间）
https://forest.family/invite?code=xyz789&expires=1700000000
```

### 8.2 OG 分享卡片（微信预览）

```html
<!-- 在 index.html 中添加 -->
<meta property="og:title" content="【整理房间】- Forest Family 模板" />
<meta property="og:description" content="完成任务获得 20 星星，适合 5-8 岁儿童" />
<meta property="og:image" content="https://your-cdn.com/template-preview.jpg" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://forest.family/template/abc123" />
```

### 8.3 短链接生成

```typescript
// 使用 Supabase Edge Functions 生成短链接
// supabase/functions/generate-short-link/index.ts

import { serve } from 'https://deno.land/x/supabase_edge_functions/mod.ts'

serve(async (req) => {
  const { url } = await req.json()
  const shortCode = Math.random().toString(36).substring(2, 8)
  
  await supabase
    .from('short_links')
    .insert({ code: shortCode, url })
  
  return new Response(JSON.stringify({
    short_url: `https://forest.family/s/${shortCode}`
  }))
})
```

---

## 九、短信/邮箱服务集成

### 9.1 短信服务（国内）

**阿里云短信：**
```typescript
// 使用 Supabase Edge Functions 发送短信
import { Aliyun } from 'https://deno.land/x/aliyun/mod.ts'

const client = new Aliyun.Sms({
  accessKeyId: Deno.env.get('ALIYUN_ACCESS_KEY'),
  accessKeySecret: Deno.env.get('ALIYUN_SECRET'),
})

await client.sendSms({
  PhoneNumbers: phone,
  SignName: 'ForestFamily',
  TemplateCode: 'SMS_123456789',
  TemplateParam: JSON.stringify({ code: '123456' })
})
```

**腾讯云短信：**
```typescript
// 类似集成方式
```

---

### 9.2 邮箱服务

**使用 Resend（推荐，免费 3000 封/月）：**
```typescript
// supabase/functions/send-email/index.ts
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

await resend.emails.send({
  from: 'Forest Family <noreply@forest.family>',
  to: [email],
  subject: '欢迎加入 Forest Family！',
  html: '<p>点击以下链接验证邮箱...</p>'
})
```

---

## 十、总结建议

### 技术选型总结

| 模块 | 推荐方案 | 备注 |
|---|---|---|
| 后端 BaaS | Supabase | 免费 Tier 足够 MVP |
| 前端部署 | Vercel | 免费版支持完美 |
| 数据库 | Supabase PostgreSQL | 内置 Row 级安全 |
| 文件存储 | Supabase Storage | 支持图片、附件 |
| 用户分析 | PostHog | 开源可自托管 |
| 管理后台 | React Admin | 完全自定义 |
| 短信服务 | 阿里云 / 腾讯云 | 按量计费 |
| 邮箱服务 | Resend | 免费 3000 封/月 |

---

### 升级路径总结

| 阶段 | 推荐方案 | 成本 |
|---|---|---|
| **MVP 验证** | Supabase 免费 + Vercel 免费 | $0-2/月 |
| **用户增长** | Supabase Pro + Vercel Pro | ~$50/月 |
| **规模运营** | 自托管 Supabase + AWS | ~$200/月 |

---

### 下一步行动清单

- [ ] 注册 Supabase 账号，创建项目
- [ ] 设计数据库 Schema 并推送
- [ ] 前端安装 `@supabase/supabase-js`
- [ ] 修改前端代码集成 Supabase（替换 localStorage）
- [ ] 配置短信/邮箱服务
- [ ] 部署前端到 Vercel
- [ ] 配置自定义域名
- [ ] 添加 Google Analytics / PostHog 埋点
- [ ] 搭建 React Admin 管理后台
- [ ] 配置 OG Meta 标签（分享优化）

---

*文档版本：v1.0*  
*创建日期：2026-04-27*  
*作者：WorkBuddy AI*
