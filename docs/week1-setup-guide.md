# 🚀 Week 1 实施指南 - Supabase 后端搭建

> 本指南将带你完成 Forest Family 后端的基础搭建，预计耗时 1-2 小时

## 📋 准备工作

### 1. 安装依赖包

首先在项目中安装 Supabase JS 客户端：

```bash
cd /Users/zerone/WorkBuddy/20260420104543
npm install @supabase/supabase-js
```

### 2. 注册 Supabase 账号

1. 访问 https://supabase.com
2. 点击右上角 **"Start your project"**
3. 使用 GitHub 或 Email 注册账号（推荐 GitHub，更方便）
4. 验证邮箱（如果选择 Email 注册）

---

## 🛠️ 创建 Supabase 项目

### 步骤 1：新建项目

1. 登录后，点击 **"New Project"**
2. 填写项目信息：
   - **Organization**: 选择个人组织（默认）
   - **Project name**: `forest-family`（或你喜欢的名字）
   - **Database Password**: 设置一个强密码（**务必保存好！**）
   - **Region**: 选择 **Northeast Asia (Tokyo)** 或 **Singapore**（离中国最近）
   - **Pricing Plan**: 选择 **Free**（免费版足够开发使用）

3. 点击 **"Create new project"**
4. **等待 1-2 分钟**，项目初始化需要时间

### 步骤 2：获取 API 密钥

项目创建完成后：

1. 在左侧边栏，点击 **"Settings"** (齿轮图标)
2. 点击 **"API"**
3. 复制以下两个值到 `.env` 文件：

```bash
# .env 文件内容
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxx
```

> ⚠️ 注意：`anon key` 是公开的，可以放在前端代码中；`service_role key` 是保密的，永远不要放在前端！

### 步骤 3：创建数据库表

1. 在左侧边栏，点击 **"SQL Editor"** (SQL 图标)
2. 点击 **"New query"**
3. 打开项目根目录下的 `supabase-schema.sql` 文件
4. 复制 **全部内容** 粘贴到 SQL Editor
5. 点击 **"Run"** 按钮执行
6. 看到 `✅ Forest Family 数据库 Schema 创建成功！` 表示成功

### 步骤 4：验证数据表

1. 在左侧边栏，点击 **"Table Editor"** (表格图标)
2. 你应该能看到以下数据表：
   - ✅ `families` - 家庭表
   - ✅ `members` - 成员表
   - ✅ `tasks` - 任务表
   - ✅ `habits` - 习惯表
   - ✅ `rewards` - 奖励表
   - ✅ `star_transactions` - 星星流水表
   - ✅ `analytics_events` - 行为日志表

---

## 🔧 配置环境变量

### 步骤 1：创建 `.env` 文件

在项目根目录创建 `.env` 文件：

```bash
cp .env.example .env
```

然后编辑 `.env` 文件，填入你在 **步骤 2** 获取的值。

### 步骤 2：验证 Vite 配置

确保 `vite.config.ts` 允许环境变量：

```typescript
// vite.config.ts
export default defineConfig({
  // ... 其他配置
  envPrefix: 'VITE_', // 确保这行存在
});
```

---

## ✅ 测试连接

### 创建测试脚本

创建一个简单的测试文件来验证连接：

```typescript
// src/test-supabase.ts
import supabase from './lib/supabase';

async function testConnection() {
  console.log('🧪 测试 Supabase 连接...');

  try {
    // 测试 1：查询家庭表
    const { data, error } = await supabase
      .from('families')
      .select('*')
      .limit(1);

    if (error) throw error;

    console.log('✅ Supabase 连接成功！');
    console.log('📊 当前家庭数量:', data?.length || 0);

    // 测试 2：创建测试家庭
    const { data: newFamily, error: insertError } = await supabase
      .from('families')
      .insert({ name: '测试家庭' })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('✅ 测试家庭创建成功！');
    console.log('🏠 家庭 ID:', newFamily.id);
    console.log('🔑 邀请码:', newFamily.invite_code);

    // 测试 3：删除测试数据
    await supabase.from('families').delete().eq('id', newFamily.id);
    console.log('🧹 测试数据已清理');

  } catch (err: any) {
    console.error('❌ 连接失败:', err.message);
    console.error('请检查：');
    console.error('  1. .env 文件中的 URL 和 ANON_KEY 是否正确');
    console.error('  2. Supabase 项目是否正常运行');
    console.error('  3. 数据库表是否已创建');
  }
}

testConnection();
```

运行测试：

```bash
npx tsx src/test-supabase.ts
```

---

## 📱 集成到前端

### 修改 `FamilyContext.tsx`

将现有的 localStorage 逻辑改为使用 Supabase API：

```typescript
// src/context/FamilyContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import * as api from '../lib/api';

// ... 类型定义 ...

interface FamilyContextType {
  // ... 方法定义 ...
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [currentUser, setCurrentUser] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  // 初始化：从 localStorage 恢复会话
  useEffect(() => {
    const savedFamily = localStorage.getItem('ff_family');
    const savedUser = localStorage.getItem('ff_user');

    if (savedFamily && savedUser) {
      setCurrentFamily(JSON.parse(savedFamily));
      setCurrentUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  // 加载家庭数据
  useEffect(() => {
    if (currentFamily) {
      loadFamilyData(currentFamily.id);
    }
  }, [currentFamily]);

  const loadFamilyData = async (familyId: string) => {
    try {
      const [membersRes, tasksRes, habitsRes, rewardsRes] = await Promise.all([
        api.getMembersByFamilyId(familyId),
        api.getTasksByFamilyId(familyId),
        api.getHabitsByFamilyId(familyId),
        api.getRewardsByFamilyId(familyId),
      ]);

      setMembers(membersRes);
      setTasks(tasksRes);
      setHabits(habitsRes);
      setRewards(rewardsRes);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // ... 其他方法（createFamily, joinFamily, addMember, etc.）...

  return (
    <FamilyContext.Provider value={{ /* 提供值 */ }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}
```

---

## 🎯 Week 1 完成清单

- [ ] 安装 `@supabase/supabase-js` 依赖
- [ ] 注册 Supabase 账号
- [ ] 创建 Supabase 项目
- [ ] 获取 API URL 和 Anon Key
- [ ] 创建 `.env` 文件并填入密钥
- [ ] 在 Supabase SQL Editor 中运行 `supabase-schema.sql`
- [ ] 验证数据表已创建（7 张表）
- [ ] 运行测试脚本验证连接
- [ ] 开始修改前端代码集成 Supabase API

---

## 🚨 常见问题

### Q1: 运行 SQL 时报错 `policy already exists`

**A**: 删除现有的 policy 重新创建：

```sql
DROP POLICY IF EXISTS "家庭成员可查看家庭信息" ON families;
-- 然后重新运行 CREATE POLICY
```

### Q2: 前端报错 `Missing Supabase environment variables`

**A**: 确保：
1. `.env` 文件在项目根目录
2. 变量名以 `VITE_` 开头
3. 重启开发服务器（`npm run dev`）

### Q3: Supabase 免费版有哪些限制？

**A**:
- 数据库存储空间：500 MB
- 每月 API 请求：50,000 次
- 实时连接：100 个并发
- 存储空间：1 GB

对于 Forest Family 这样的小项目，免费版完全够用！

---

## 📚 下一步

完成 Week 1 后，你将具备：
- ✅ 可用的 Supabase 后端
- ✅ 完整的数据库结构
- ✅ 前端连接能力

**Week 2 预告**：
- 完善用户注册/登录流程
- 实现家庭创建和加入功能
- 完善任务、习惯、奖励的 CRUD 操作
- 添加实时订阅功能

---

**需要帮助？**
- Supabase 文档：https://supabase.com/docs
- 本项目管理：https://github.com/你的用户名/forest-family
