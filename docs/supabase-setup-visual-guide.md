# 🎯 Supabase 可视化设置指南（超详细版）

> **适用对象**: 第一次使用 Supabase 的用户  
> **预计时间**: 10 分钟  
> **前提条件**: 已注册并登录 Supabase

---

## 🌐 步骤 0: 打开正确的网址

### 正确的 Supabase 网址

**请使用以下网址之一**（任选一个）：

1. **推荐**: https://supabase.com/dashboard
2. **备用**: https://app.supabase.com

如果以上网址都无法打开，请尝试：
1. 检查网络连接
2. 关闭 VPN（如果正在使用）
3. 尝试使用 Chrome 浏览器
4. 清除浏览器缓存

---

## 🚀 步骤 1: 创建新项目（预计 2 分钟）

### 1.1 进入 Dashboard

**操作**:
1. 打开 https://supabase.com/dashboard
2. 使用你的 GitHub 账号登录（推荐）或 Email 登录

**截图位置**:
- 页面顶部应该显示 "Supabase" Logo
- 中间区域显示 "New Project" 按钮

---

### 1.2 点击 "New Project"

**操作**:
1. 点击页面中间的 "**New Project**" 按钮（蓝色大按钮）

**截图位置**:
- 按钮在页面正中央
- 按钮颜色：蓝色
- 按钮文字：New Project

---

### 1.3 填写项目信息

**操作**:
1. **Project name**: 输入 `forest-family`
2. **Database Password**: 点击 "Generate a password" 或手动输入强密码
   - ⚠️ **重要**: 请务必保存这个密码！后续需要时无法再次查看！
   - 建议: 使用密码管理器保存，或写在纸上
3. **Region**: 选择 `Northeast Asia (Tokyo)` （东京节点，离中国最近）
4. **Pricing Plan**: 选择 `Free` （免费计划）

**截图位置**:
- **Project name** 输入框: 页面顶部
- **Database Password** 输入框: 页面中部
- **Region** 下拉框: 页面中下部
- **Pricing Plan** 选项: 页面底部

**填写示例**:
```
Project name: forest-family
Database Password: Abc123!@# (请使用你自己的强密码)
Region: Northeast Asia (Tokyo)
Pricing Plan: Free
```

---

### 1.4 创建项目

**操作**:
1. 勾选 "I agree to the Terms of Service"
2. 点击 "**Create new project**" 按钮

**等待时间**: 约 1-2 分钟

**进度提示**:
- 页面会显示 "Creating project..."
- 进度条会逐步填充
- **不要关闭页面！**

**截图位置**:
- 进度条在页面中央
- 显示 "Setting up your project..." 

---

## 🔑 步骤 2: 获取 API 密钥（预计 2 分钟）

### 2.1 进入项目 Dashboard

**操作**:
1. 项目创建完成后，会自动跳转到项目 Dashboard
2. 如果没有跳转，点击项目名称进入

**截图位置**:
- 左侧边栏显示多个图标（数据库、认证、存储等）
- 顶部显示项目名称 "forest-family"

---

### 2.2 打开 Settings 页面

**操作**:
1. 点击左侧边栏最下方的 **"Settings"** 图标（齿轮形状 ⚙️）
2. 在展开的子菜单中，点击 **"API"**

**截图位置**:
- **Settings 图标**: 左侧边栏最底部
- **API 选项**: Settings 展开后的第二个选项

---

### 2.3 复制 API 密钥

**操作**:
1. 找到 "**Project URL**" 部分
   - 点击右侧的 "Copy" 按钮
   - 保存这个值（稍后用到）

2. 找到 "**Project API keys**" 部分
   - 找到 "**anon**" / "**public**" 这一行
   - 点击右侧的 "Copy" 按钮
   - 保存这个值（稍后用到）

**截图位置**:
- **Project URL**: 页面上半部分
- **anon public key**: 页面下半部分，标记为 "anon" 和 "public"

**保存的值**:
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxx
```

⚠️ **注意**: 不要复制 "service_role" key！那个是私密密钥，不要暴露！

---

## 📊 步骤 3: 创建数据库表（预计 5 分钟）

### 3.1 打开 SQL Editor

**操作**:
1. 点击左侧边栏的 **"SQL Editor"** 图标（像一个终端 🖥️）
2. 点击 "**New query**" 按钮

**截图位置**:
- **SQL Editor 图标**: 左侧边栏，在 "Table Editor" 下方
- **New query 按钮**: 页面右上角，蓝色按钮

---

### 3.2 复制 SQL 代码

**操作**:
1. 打开项目根目录的 `supabase-schema.sql` 文件
2. **全选** 文件内容（Cmd+A 或 Ctrl+A）
3. **复制** 选中的内容（Cmd+C 或 Ctrl+C）

**文件路径**:
```
/Users/zerone/WorkBuddy/20260420104543/supabase-schema.sql
```

**文件内容概览** (252 行代码):
- 创建 7 张数据表
- 设置行级安全策略 (RLS)
- 创建索引和触发器
- 创建自动更新函数

---

### 3.3 粘贴并运行 SQL

**操作**:
1. 回到 Supabase 的 SQL Editor 页面
2. 在代码编辑器中 **粘贴** SQL 代码（Cmd+V 或 Ctrl+V）
3. 点击编辑器右上角的 "**Run**" 按钮（绿色按钮）

**等待时间**: 约 5-10 秒

**成功标志**:
- 页面底部显示 "✅ Success. No return values."
- 或者显示 "✅ Forest Family 数据库 Schema 创建成功！"

**截图位置**:
- **代码编辑器**: 页面中央，大片空白区域
- **Run 按钮**: 编辑器右上角，绿色按钮

---

### 3.4 检查运行结果

**操作**:
1. 查看页面底部的信息区域
2. 确认显示 "Success" 或 "✅" 成功标志
3. 如果没有成功，查看错误信息并截图发给我

**可能的错误**:
- ❌ "relation already exists": 表已经存在，不用担心
- ❌ "permission denied": 权限问题，检查是否使用了正确的账号
- ❌ "syntax error": SQL 语法错误，截图发给我

---

## 🔍 步骤 4: 验证数据表（预计 1 分钟）

### 4.1 打开 Table Editor

**操作**:
1. 点击左侧边栏的 **"Table Editor"** 图标（像一个表格 📊）
2. 查看左侧边栏是否显示 7 张表

**应该看到的表**:
1. ✅ `analytics_events`
2. ✅ `families`
3. ✅ `habits`
4. ✅ `members`
5. ✅ `rewards`
6. ✅ `star_transactions`
7. ✅ `tasks`

**截图位置**:
- **Table Editor 图标**: 左侧边栏，顶部第二个图标
- **表列表**: 页面左侧边栏，显示所有表名

---

### 4.2 检查表结构

**操作**:
1. 点击任意一张表（例如 `families`）
2. 查看右侧是否显示表的列信息
3. 确认列名和数据类型正确

**示例 - families 表**:
| 列名 | 数据类型 | 说明 |
|------|----------|------|
| id | uuid | 主键 |
| name | text | 家庭名称 |
| invite_code | text | 邀请码 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

---

## ⚙️ 步骤 5: 配置环境变量（预计 2 分钟）

### 5.1 创建 .env 文件

**操作**:
1. 打开终端（Terminal）
2. 执行以下命令：

```bash
cd /Users/zerone/WorkBuddy/20260420104543
cp .env.example .env
```

---

### 5.2 编辑 .env 文件

**操作**:
1. 使用任意文本编辑器打开 `.env` 文件
2. 填入你在 **步骤 2.3** 中复制的值

**文件内容示例**:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxx
```

**⚠️ 注意**:
- 不要添加引号（除非值本身包含空格）
- 不要添加空格在 `=` 两侧
- `VITE_` 前缀不能省略

---

## 🚀 步骤 6: 启动应用（预计 1 分钟）

### 6.1 安装依赖

**操作**:
1. 打开终端
2. 执行以下命令：

```bash
cd /Users/zerone/WorkBuddy/20260420104543
npm install
```

**等待时间**: 约 1-2 分钟

---

### 6.2 启动开发服务器

**操作**:
1. 执行以下命令：

```bash
npm run dev
```

**成功标志**:
- 终端显示 "Local: http://localhost:3000"
- 终端显示 "ready in xxx ms"

---

### 6.3 打开应用

**操作**:
1. 打开浏览器
2. 访问 http://localhost:3000
3. 应该看到 Forest Family 的欢迎页面

**截图位置**:
- 页面顶部显示 "🌲 Forest Family"
- 显示 "创建新家庭" 和 "加入家庭" 两个按钮

---

## ✅ 完成检查清单

完成所有步骤后，请确认：

- [ ] 已创建 Supabase 项目 (`forest-family`)
- [ ] 已复制 Project URL 和 Anon Key
- [ ] 已在 Supabase SQL Editor 中运行 `supabase-schema.sql`
- [ ] 已在 Table Editor 中看到 7 张表
- [ ] 已创建 `.env` 文件并填入正确的值
- [ ] 已运行 `npm install` 安装依赖
- [ ] 已运行 `npm run dev` 启动服务器
- [ ] 浏览器访问 http://localhost:3000 显示欢迎页面

**如果以上所有项都打勾了，恭喜你！🎉 项目已成功配置！**

---

## 🐛 常见问题排查

### 问题 1: 无法打开 Supabase 网站

**解决方案**:
1. 检查网络连接
2. 尝试使用手机热点
3. 关闭 VPN 或代理
4. 尝试不同的浏览器（推荐 Chrome）

---

### 问题 2: 创建项目时卡住

**解决方案**:
1. 等待至少 5 分钟
2. 刷新页面，查看项目是否已创建
3. 如果失败，删除项目并重新创建

---

### 问题 3: SQL 运行失败

**错误信息**: `relation "families" already exists`

**解决方案**:
- 这是正常的！表示表已经存在
- 可以跳过，或直接进入 Table Editor 验证

**错误信息**: `permission denied`

**解决方案**:
1. 确认你已登录正确的账号
2. 确认你在正确的项目中
3. 尝试刷新页面重新登录

---

### 问题 4: 应用无法启动

**错误信息**: `VITE_SUPABASE_URL` is not defined

**解决方案**:
1. 检查 `.env` 文件是否存在
2. 检查 `.env` 文件中的变量名是否正确（必须有 `VITE_` 前缀）
3. 重启开发服务器（`Ctrl+C` 然后重新运行 `npm run dev`）

---

### 问题 5: 页面显示错误

**操作步骤**:
1. 打开浏览器开发者工具（`F12` 或 `Cmd+Option+I`）
2. 切换到 "Console" 标签页
3. 查看红色错误信息
4. 截图发给我

---

## 📞 需要帮助？

如果你在任意步骤遇到问题：

1. **截图** 当前页面
2. **复制** 错误信息（如果有）
3. **描述** 你正在进行的操作
4. 发给我，我会帮你解决！

---

## 🎯 下一步

配置完成后，你可以：

1. **测试应用功能**
   - 创建家庭
   - 添加家庭成员
   - 创建任务
   - 创建习惯
   - 创建奖励

2. **查看数据库**
   - 在 Supabase Table Editor 中查看数据
   - 确认数据正确写入

3. **开始开发**
   - 根据 `docs/week1-progress-summary.md` 继续开发
   - 或根据 `README.md` 了解项目结构

---

**祝配置顺利！🚀**
