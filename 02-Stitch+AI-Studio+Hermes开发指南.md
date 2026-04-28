# Stitch + AI Studio + Hermes 全流程开发指南

> **比乐时积分打卡应用 · AI 驱动开发实践**
>
> 文档版本：v1.0
> 创建时间：2026-04-20
> 适用项目：家庭协作类应用（Flutter/Web 跨平台）

---

## 一、工具定位与角色分工

### 1.1 三剑客职责矩阵

| 工具 | 核心职责 | 擅长领域 | 输入 | 输出 |
|:----|:--------|:---------|:-----|:-----|
| **Stitch** | AI 设计助手 | 快速原型、UI 生成、设计系统提取 | 自然语言描述 + 参考图 | 设计稿 + HTML/CSS 代码 |
| **AI Studio** | 设计到代码桥梁 | 设计规范落地、组件生成、代码工程化 | Stitch 导出的设计 | Flutter/React 组件代码 |
| **Hermes** | 项目工程化 + 全栈开发 | 架构设计、业务逻辑、后端 API、自动测试 | 设计文档 + 需求描述 | 完整可运行项目 |

### 1.2 工作流架构图

```
需求输入 → PHASE 1: Stitch设计 → PHASE 2: AI Studio工程化 → PHASE 3: Hermes开发
```

---

## 二、Phase 1 - Stitch AI 设计阶段

### 2.1 Stitch 设计步骤（比乐时场景）

#### Step 1.2: 首页设计 Prompt

```
📝 Stitch Prompt 1 - 首页/仪表盘

"设计一个家庭协作日程应用的首页界面：
- 顶部导航栏：显示家庭名称、成员头像入口
- 中间核心区域：
  - 今日任务卡片：展示今天待完成的任务列表
  - 星星余额展示：大数字显示 + 趋势箭头
  - 快捷操作按钮：发布任务、查看日历、兑换奖励
- 底部 Tab 导航：首页、日历、任务、奖励、我的
- 设计风格：温暖明亮，卡通风格，适合有6-12岁孩子的家庭
- 配色：主色天空蓝 #4A90D9，辅色暖橙 #FF9F43，星星金色 #FFD700
- 底部固定一个大的圆形打卡按钮，带 ⭐ 星星图标"
```

#### Step 1.3: 日历页面设计 Prompt

```
📝 Stitch Prompt 2 - 日历页面

"设计家庭日历页面：
- 月视图为主，支持周/月/日切换
- 日历格子中显示任务图标和标题
- 不同成员的任务用不同颜色区分（爸爸蓝、妈妈绿、孩子橙）
- 顶部显示月份切换和今日按钮
- 选中日期下方展开当日详情
- 支持侧滑切换月份
- 底部可添加新事件按钮"
```

#### Step 1.4: 任务系统设计 Prompt

```
📝 Stitch Prompt 3 - 任务发布与打卡

"设计任务发布和打卡页面：

页面A - 发布任务：
- 顶部：返回按钮 + 页面标题"发布任务"
- 表单区域：
  - 任务名称输入框（带 emoji 选择器）
  - 任务描述输入框
  - 时间选择器：日期 + 开始/结束时间
  - 循环设置：一次性/每天/每周/每月
  - 执行成员：多选头像
  - 星星奖励：数字输入 + 加减按钮
  - 逾期设置：开关（逾期完成仍可获得星星）
- 底部：发布按钮

页面B - 任务打卡：
- 任务卡片：大图标 + 标题 + 时间 + 成员头像
- 完成按钮：点击后星星飞出动画
- 完成后状态：打勾 + 显示获得星星数"
```

#### Step 1.5: 奖励系统设计 Prompt

```
📝 Stitch Prompt 4 - 奖励兑换

"设计星星奖励和兑换页面：

页面A - 奖励首页：
- 顶部：我的星星余额（⭐ 128）
- 星星历史记录列表
- 排行榜：家庭成员星星数量排名

页面B - 兑换商店：
- 可兑换物品网格布局
- 每个物品卡片：emoji/图片图标、物品名称、所需星星数、兑换按钮
- 预设奖励：游戏时间、动画时间、外出游玩、零食特权
- 支持自定义添加奖励

页面C - 兑换成功：
- 大星星动画飞入
- 庆祝动效（撒花/礼花）
- 显示剩余星星数"
```

### 2.3 Stitch 设计系统提取

```markdown
📋 比乐时设计系统文档

## 色彩系统
- Primary: #4A90D9 (天空蓝)
- Secondary: #FF9F43 (暖橙)
- Star Gold: #FFD700
- Success: #2ED573
- Background: #F8FAFC

## 字体
- 主字体：系统默认
- 标题：18-24px，Semi-bold
- 正文：14-16px，Regular

## 组件间距
- 页面边距：16px
- 卡片间距：12px
- 内部间距：12px

## 圆角
- 按钮：24px (全圆角)
- 卡片：16px
- 输入框：12px
```

---

## 三、Phase 2 - AI Studio 工程化阶段

### 3.2 AI Studio Prompt 模板（通用版）

```markdown
# Flutter 项目生成 Prompt

## 角色定义
你是一位资深 Flutter 开发工程师，专注于移动端 UI 实现。

## 任务
将以下 Stitch 导出的设计稿转换为生产级 Flutter 代码。

## 设计稿信息
- 页面类型：[首页/日历/任务/奖励/餐食/相册]
- 目标平台：iOS + Android
- 设计风格：[温暖明亮/简约现代/卡通风格]

## 技术要求

### 框架版本
- Flutter SDK: >=3.0.0
- Dart: >=3.0.0

### 依赖包
```yaml
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.6
  google_fonts: ^6.1.0
  flutter_svg: ^2.0.9
  cached_network_image: ^3.3.1
  table_calendar: ^3.0.9
  flutter_animate: ^4.3.0
  get: ^4.6.6
  intl: ^0.19.0
```

### 代码规范
1. 使用 Flutter 3.x 新特性（late, ?.操作符）
2. 组件拆分：每个页面拆分为独立的 widgets/
3. 状态管理：使用 GetX（轻量且适合快速开发）
4. 国际化：预留中文支持
5. 主题管理：使用 ThemeData 统一管理颜色
```

---

## 四、Phase 3 - Hermes Agent 开发阶段

### 4.1 Hermes 核心能力

| 能力 | 说明 |
|:-----|:-----|
| **记忆系统** | 三层记忆（对话/项目/长期）自动管理 |
| **技能系统** | 将成功工作流固化为可复用 Skill |
| **定时任务** | 支持 Cron 表达式自动化 |
| **多工具调用** | 终端/文件/浏览器/代码执行 |
| **自我进化** | 越用越懂你的习惯 |

### 4.2 Hermes 项目初始化 Prompt

```
📝 Hermes 项目初始化 Prompt

/plan 为比乐时积分打卡应用创建完整的 Flutter + 后端项目结构

要求：
1. Flutter 前端：
   - 目标平台：iOS + Android + Web
   - 状态管理：GetX
   - 路由：GetX Router
   - 本地存储：Hive
   - HTTP：Dio
   - 日历：table_calendar

2. 后端（NestJS）：
   - 数据库：PostgreSQL + TypeORM
   - 缓存：Redis
   - 实时：WebSocket
   - 认证：JWT

3. 数据库设计：
   - users / families / family_members
   - calendar_events / event_participants
   - tasks / task_assignments / task_templates
   - star_transactions / reward_items / reward_redemptions
   - recipes / meal_plans
   - albums / photos / photo_comments
```

### 4.3 Hermes 分模块开发 Prompts

#### 4.3.1 用户认证模块

```markdown
## 用户认证 Prompt

/hermes

实现比乐时的用户认证系统：

### 功能需求
1. 用户注册（邮箱+密码）
2. 用户登录（返回 JWT）
3. 刷新令牌
4. 退出登录

### API 接口
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout

### 关键提示
- 密码使用 bcrypt 加密
- JWT 访问令牌 1 小时有效期
- 刷新令牌 7 天有效期
- 首次登录引导创建或加入家庭
```

#### 4.3.2 任务与积分模块

```markdown
## 任务与积分 Prompt

/hermes

实现比乐时任务系统和星星积分：

### 功能需求
1. 任务发布（支持 emoji 图标）
2. 任务分配给成员
3. 完成任务打卡
4. 星星自动增减
5. 任务历史记录
6. 任务模板库

### 星星计算
- 完成任务：+N 星星
- 手动奖励：+N 星星
- 兑换奖励：-N 星星
- 撤销兑换：+N 星星（限24小时内）
```

### 4.4 Hermes 常用命令速查

| 命令 | 作用 | 示例 |
|:-----|:-----|:-----|
| `/plan <需求>` | 先生成计划不执行 | `/plan 实现任务完成接口` |
| `/compress` | 压缩对话上下文 | token 不足时 |
| `/model claude` | 切换模型 | 复杂任务切强模型 |
| `/title 我的任务` | 命名当前会话 | 方便恢复 |
| `/bg <prompt>` | 后台执行任务 | 不阻塞 |
| `/rollback [n]` | 文件回滚 | Agent 改坏了 |
| `/usage` | 查看 token 消耗 | 控制成本 |

### 4.5 Hermes Skill 模板

```markdown
---
name: bilesi-flutter
description: 比乐时 Flutter 开发专用工作流
version: 1.0.0
platforms: [macos, linux]
---

# 比乐时 Flutter 开发工作流

## When to Use
- 开发新的 Flutter 页面
- 添加新的功能模块
- 修复 Flutter 相关 Bug

## Procedure

### 1. 创建页面
1. 在 lib/app/modules/ 下创建页面目录
2. 创建 page.dart、controller.dart、binding.dart
3. 添加路由配置

### 2. 创建组件
1. 在 lib/app/components/ 下创建
2. 优先使用共用组件

### 3. 状态管理
1. 使用 GetX Controller
2. 定义 Obs 变量
3. 在 onInit 中初始化
4. 在 onClose 中清理

### 4. API 调用
1. 在 api/ 目录创建接口文件
2. 使用 Dio 封装
3. 在 Controller 中调用
4. 处理 Loading/Error/Success
```

---

## 五、完整开发流程文档模板

### 5.1 项目启动文档模板

```markdown
# 比乐时积分打卡应用 - 项目启动文档

## 项目信息
- 项目名称：比乐时 (BileShi)
- 项目类型：家庭协作日程管理 App
- 目标平台：iOS + Android + Web
- 技术栈：Flutter + NestJS + PostgreSQL

## 开发阶段

### Phase 1: 设计阶段（1-2天）
- [ ] Stitch 首页设计
- [ ] Stitch 日历页面设计
- [ ] Stitch 任务页面设计
- [ ] Stitch 奖励页面设计
- [ ] 提取设计系统文档

### Phase 2: 工程化阶段（2-3天）
- [ ] AI Studio 生成 Flutter 骨架
- [ ] 搭建项目目录结构
- [ ] 配置 pubspec.yaml
- [ ] 生成所有页面代码

### Phase 3: 后端开发阶段（5-7天）
- [ ] NestJS 项目初始化
- [ ] 用户认证模块
- [ ] 任务系统模块
- [ ] 星星积分模块
- [ ] 奖励兑换模块

### Phase 4: 前后端联调（2-3天）
- [ ] API 接口对接
- [ ] 状态管理对接

### Phase 5: 测试与优化（2-3天）
- [ ] 功能测试
- [ ] UI 验收
- [ ] Bug 修复
```

---

## 六、关键提示词速查表

### 6.1 Stitch Prompts

| 场景 | Prompt 关键词 |
|:-----|:-------------|
| 首页设计 | "温暖明亮、卡通风格、家庭协作、星星积分" |
| 日历设计 | "月视图、成员颜色区分、任务图标、侧滑切换" |
| 任务设计 | "emoji图标、星星奖励、完成动画、循环规则" |
| 奖励设计 | "金色星星、兑换商店、礼花动画、排行榜" |

### 6.2 Hermes Prompts

| 场景 | Prompt 关键词 |
|:-----|:-------------|
| 项目初始化 | "/plan 创建完整项目结构、Flutter + NestJS" |
| 模块开发 | "实现 XXX 模块、API + 前端 + 测试" |
| Bug 修复 | "修复 XXX Bug、原因分析、复现步骤" |

---

## 七、版本历史

| 版本 | 日期 | 修改内容 |
|:-----|:-----|:---------|
| v1.0 | 2026-04-20 | 初稿完成 |

---

*本文档由 AI 辅助生成，用于指导 Stitch + AI Studio + Hermes 工作流的实践*
