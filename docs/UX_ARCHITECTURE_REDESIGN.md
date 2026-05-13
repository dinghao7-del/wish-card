# 愿望卡 (WishCard) — 用户体验架构重塑方案

> **ArchitectUX Agent** | 版本 v2.0 | 2026-05-12  
> 基于对现有代码库、路由结构、组件层次和状态管理的深入审计

---

## 目录

1. [诊断：当前 UX 断点全景](#1-诊断当前-ux-断点全景)
2. [用户画像与核心旅程](#2-用户画像与核心旅程)
3. [导航架构重塑](#3-导航架构重塑)
4. [核心用户流程设计](#4-核心用户流程设计)
5. [信息架构与内容层级](#5-信息架构与内容层级)
6. [组件架构重组](#6-组件架构重组)
7. [状态管理架构](#7-状态管理架构)
8. [错误恢复与弹性架构](#8-错误恢复与弹性架构)
9. [响应式与跨平台一致性](#9-响应式与跨平台一致性)
10. [实施路线图](#10-实施路线图)

---

## 1. 诊断：当前 UX 断点全景

### 1.1 断点分类矩阵

| 严重度 | 类别 | 断点数量 | 影响范围 |
|--------|------|---------|---------|
| 🔴 严重 | 导航混乱 | 3 | 所有用户，每次使用 |
| 🔴 严重 | 状态管理 | 2 | 开发者 + 用户数据一致性 |
| 🟠 警告 | 用户流程 | 4 | 特定场景下的体验断裂 |
| 🟠 警告 | 错误处理 | 3 | 网络异常时用户困惑 |
| 🟡 优化 | 视觉一致性 | 3 | 品牌感知与专业度 |

### 1.2 关键断点详解

#### 🔴 断点 #1：底部导航标签-路由错位

```
当前状态：
  [首页 /]  [任务 /tasks]  [🌟奖励 /habits]  [心愿单 /rewards]  [我的 /profile]

问题：
  - "/habits" 标签显示"奖励"，但实际是习惯养成页
  - "/rewards" 标签显示"心愿单"，但才是真正的奖励兑换页
  - 突出按钮指向习惯页，但用户心理模型期望是"奖励中心"
  
影响：
  - 新用户认知负担：每次都需要记忆"奖励≠奖励页"
  - 核心转化路径断裂：用户想兑换奖励时容易点错
```

#### 🔴 断点 #2：深层页面无返回导航

```
当前状态：
  /profile/members/add          ← 只能浏览器后退
  /profile/members/edit/:id     ← 只能浏览器后退
  /settings/:type               ← 只能浏览器后退
  /plans/smart-recommend        ← 只能浏览器后退
  /check-in/:taskId             ← 只能浏览器后退

问题：
  - 没有顶部返回按钮 (back button)
  - 没有面包屑导航
  - 用户迷失在深层页面中
  
影响：
  - 用户需要多次点击浏览器后退才能回到首页
  - 在 Capacitor 原生应用中，系统返回键行为不一致
```

#### 🔴 断点 #3：单体重状态管理

```
当前状态：
  FamilyContext (500+ 行) 同时管理：
    ├── members, tasks, rewards, history  (4 个数据域)
    ├── currentUser, stars               (用户状态)
    ├── isDarkMode, guestMode            (UI 状态)
    ├── isUserSelectorOpen               (交互状态)
    └── 所有 CRUD 操作                   (15+ 个方法)

问题：
  - 任何数据变更 → 整个组件树重渲染
  - 难以独立测试某个数据域
  - 新增功能时继续加在这个巨型 Context 上
  
影响：
  - 性能退化（不必要的重渲染）
  - 开发效率降低（合并冲突、难以定位 bug）
```

#### 🟠 断点 #4：首页功能过载

```
当前首页布局：
  [头像+星数] [通知铃铛] [AI语音]
  [能量卡片：今日星星 + 增长趋势]
  [5个快捷操作按钮：grid-cols-5]
  [今日待办任务列表 (最多4条)]
  [排行榜 / 四象限分析 (Tab切换)]
  [底部导航栏]

问题：
  - 5个快捷按钮在手机上非常紧凑
  - 排行榜与四象限的 Tab 切换缺乏视觉引导
  - 信息密度过高，缺乏呼吸感
```

#### 🟠 断点 #5：alert() 阻塞式反馈

```
当前代码中：
  FamilyContext.tsx → redeemReward() → alert('兑换成功！')

问题：
  - alert() 阻塞整个 UI 线程
  - 不符合现代移动端设计规范
  - 无法自定义样式，与整体设计语言冲突
  
应改为：
  - Toast 通知系统（已存在 ToastProvider，未全面使用）
  - 庆祝动画（已存在 CelebrationAnimation，未接入所有场景）
```

#### 🟠 断点 #6：日历视图内嵌不可复用

```
当前：Tasks.tsx 内部自建日历逻辑
  - 月份导航
  - 日期网格渲染
  - 任务点指示器
  - 全部内联在 Tasks 组件中 (~400+ 行)

问题：
  - 日历逻辑无法在首页、计划页等其他场景复用
  - PlanWizard 中需要日期选择时无法共享逻辑
```

#### 🟠 断点 #7：管理后台与主应用设计断裂

```
主应用：暖绿 Material Design 3 风格
管理后台：传统灰色侧边栏 + Recharts

问题：
  - 品牌认知不统一
  - 管理员在两个系统间切换时体验跳跃
  - 设计 Token 完全独立，维护成本翻倍
```

---

## 2. 用户画像与核心旅程

### 2.1 用户画像

```
┌─────────────────────────────────────────────────────────┐
│  画像 A：管理员家长 (Admin Parent)                        │
│  ─────────────────────────────────────────────────────  │
│  • 身份：妈妈/爸爸，30-42岁                               │
│  • 核心需求：高效管理家庭任务、追踪孩子表现                  │
│  • 使用频率：每天 2-3 次                                  │
│  • 技术能力：中等，熟悉微信、抖音等主流 App                 │
│  • 关键场景：早晨布置任务 → 晚上检查完成情况               │
│  • 痛点：任务多了管不过来、孩子不主动完成任务               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  画像 B：执行者孩子 (Child Executor)                       │
│  ─────────────────────────────────────────────────────  │
│  • 身份：6-12岁孩子                                       │
│  • 核心需求：完成任务获得星星→兑换奖励                      │
│  • 使用频率：每天 1-2 次                                  │
│  • 技术能力：基础，需要直观的视觉引导                       │
│  • 关键场景：查看任务 → 打卡完成 → 兑换心仪奖励            │
│  • 痛点：不知道今天该做什么、兑换流程复杂                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  画像 C：体验访客 (Guest Explorer)                        │
│  ─────────────────────────────────────────────────────  │
│  • 身份：潜在用户                                          │
│  • 核心需求：体验核心功能，决定是否注册                     │
│  • 使用频率：1-2 次，每次 5-15 分钟                       │
│  • 关键场景：下载 App → 浏览功能 → 体验 → 决定注册         │
│  • 痛点：不清楚产品价值、担心数据丢失                       │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心用户旅程地图

#### 旅程 1：家长的一天

```
┌──────────────────────────────────────────────────────────────────┐
│  阶段      │ 早晨 7:30       │ 上午 10:00     │ 下午 4:30      │ 晚上 8:00       │
│────────────┼─────────────────┼────────────────┼────────────────┼─────────────────┤
│  用户行为   │ 打开App          │ 语音创建任务    │ 查看进度         │ 检查完成情况     │
│            │ 查看今日任务      │ "帮坦坦加一个   │ 看到谁还没做     │ 审批待确认任务   │
│            │ 快速布置新任务    │  练琴30分钟"    │ 推送提醒         │ 给孩子加星      │
│────────────┼─────────────────┼────────────────┼────────────────┼─────────────────┤
│  接触点    │ 首页 → 快捷发布   │ AI 语音助手     │ 首页能量卡片     │ 首页 → 任务审批  │
│            │                 │                │ → 排行榜        │                 │
│────────────┼─────────────────┼────────────────┼────────────────┼─────────────────┤
│  情绪曲线   │ 😊 高效          │ 😄 方便        │ 😐 需要查看     │ 😊 满意         │
│────────────┼─────────────────┼────────────────┼────────────────┼─────────────────┤
│  当前断点   │ 快捷按钮太挤      │ ✅ 无          │ 排行榜入口不明显 │ 审批流程需优化   │
│            │ 不够直观          │               │                │                 │
└──────────────────────────────────────────────────────────────────┘
```

#### 旅程 2：孩子的一天

```
┌──────────────────────────────────────────────────────────────────┐
│  阶段      │ 放学后 4:00     │ 4:15-5:30      │ 5:30           │ 周末            │
│────────────┼─────────────────┼────────────────┼────────────────┼─────────────────┤
│  用户行为   │ 打开App          │ 逐一完成任务    │ 查看星星数       │ 浏览心愿单       │
│            │ 看有哪些任务      │ 点击打卡        │ 兑换小奖励       │ 规划想要的奖励   │
│────────────┼─────────────────┼────────────────┼────────────────┼─────────────────┤
│  接触点    │ 首页 → 任务列表   │ 打卡页          │ 首页能量卡片     │ 心愿单页         │
│            │                 │ → 庆祝动画      │ → 兑换弹窗      │                 │
│────────────┼─────────────────┼────────────────┼────────────────┼─────────────────┤
│  情绪曲线   │ 😊 清楚知道      │ 🎉 成就感       │ 😍 期待         │ 🤩 憧憬         │
│            │ 该做什么          │               │                │                 │
│────────────┼─────────────────┼────────────────┼────────────────┼─────────────────┤
│  当前断点   │ 任务卡片信息      │ 打卡成功反馈    │ 兑换流程        │ 心愿单与奖励      │
│            │ 不够儿童友好      │ 不够突出        │ 用alert阻断     │ 导航混淆         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. 导航架构重塑

### 3.1 修复方案：底部导航重构

```
修复前：
  [首页 /]  [任务 /tasks]  [🌟奖励 /habits]  [心愿单 /rewards]  [我的 /profile]
                                    ↑                    ↑
                              标签说"奖励"           标签说"心愿单"
                              但路由是 habits        但路由是 rewards
                              功能是习惯养成          功能才是奖励兑换

修复后：
  [首页 /]  [任务 /tasks]  [🌟习惯 /habits]  [奖励 /rewards]  [我的 /profile]
                                    ↑                    ↑
                              标签说"习惯"           标签说"奖励"
                              路由是 habits          路由是 rewards
                              功能是习惯养成          功能是奖励商城
                              突出按钮保留            正常按钮
```

**设计理由**：
- "习惯"页面使用 `Sparkles` 突出按钮，强调正向行为养成
- "奖励"页面使用 `Trophy` 图标，直观表达奖励/兑换
- 突出按钮从令人困惑的"奖励→习惯"变为有意义的"习惯养成"
- 形成清晰的心智模型：**做任务 → 养习惯 → 赚星星 → 换奖励**

### 3.2 新导航结构：页面层级树

```
愿望卡 App
│
├── 📱 一级页面 (底部导航，5个Tab)
│   ├── 首页 /                    ← 能量仪表盘 + 今日焦点
│   ├── 任务 /tasks               ← 任务列表 + 日历视图
│   ├── 习惯 /habits              ← 习惯养成追踪 (突出按钮)
│   ├── 奖励 /rewards             ← 奖励商城 + 兑换
│   └── 我的 /profile             ← 个人中心 + 设置
│
├── 📄 二级页面 (从一级深入，含返回按钮)
│   ├── 任务 → /tasks/new              ← 创建任务
│   ├── 任务 → /tasks/edit/:id         ← 编辑任务
│   ├── 任务 → /tasks/templates        ← 任务模板库
│   ├── 任务 → /check-in/:taskId       ← 打卡完成
│   ├── 奖励 → /rewards/new            ← 创建奖励
│   ├── 奖励 → /rewards/edit/:id       ← 编辑奖励
│   ├── 我的 → /profile/edit           ← 编辑资料
│   ├── 我的 → /profile/members/:id    ← 成员详情
│   ├── 我的 → /profile/members/add    ← 添加成员
│   ├── 我的 → /profile/members/edit/:id ← 编辑成员
│   ├── 我的 → /settings/:type         ← 设置子页
│   ├── 我的 → /switch-profile         ← 切换用户
│   └── 我的 → /history                ← 星星历史
│
├── 🔧 工具页面 (从首页快捷入口)
│   ├── /pomodoro                 ← 番茄钟
│   ├── /quadrant                 ← 四象限分析
│   ├── /plans                    ← 计划管理
│   ├── /plans/wizard             ← 计划向导
│   ├── /plans/:id                ← 计划详情
│   ├── /plans/smart-recommend    ← AI 智能推荐
│   └── /calendar-sync            ← 日历同步
│
├── 🚪 入口/出口页面
│   ├── /welcome                  ← 欢迎引导页
│   ├── /onboarding               ← 新手引导
│   ├── /sign-in                  ← 登录
│   ├── /sign-up                  ← 注册
│   ├── /auth/callback            ← OAuth 回调
│   └── /import                   ← 数据导入
│
└── 💬 支持页面
    ├── /support/contact          ← 联系客服
    └── /support/feedback         ← 意见反馈
```

### 3.3 导航组件规范

#### 顶部导航栏 (TopAppBar) — 新增组件

```tsx
// 所有二级/工具页面必须包含此组件
interface TopAppBarProps {
  title: string;              // 页面标题
  showBack?: boolean;         // 显示返回按钮 (默认 true)
  backTo?: string;            // 自定义返回路径
  rightAction?: ReactNode;    // 右侧操作按钮
  onBack?: () => void;        // 自定义返回回调
}

// 使用示例
<TopAppBar 
  title="创建任务" 
  backTo="/tasks"
  rightAction={<NotificationBell />}
/>
```

#### 返回行为规范

```
┌─────────────────────────────────────────────────────┐
│  当前页面                    │  返回目标              │
│─────────────────────────────┼────────────────────────│
│  /tasks/new                 │  /tasks               │
│  /tasks/edit/:id            │  /tasks               │
│  /check-in/:taskId          │  /tasks 或 上一个页面   │
│  /rewards/new               │  /rewards             │
│  /rewards/edit/:id          │  /rewards             │
│  /profile/members/:id       │  /profile             │
│  /profile/members/add       │  /profile             │
│  /profile/edit              │  /profile             │
│  /settings/:type            │  /profile             │
│  /plans/:id                 │  /plans               │
│  /plans/wizard              │  /plans               │
│  /plans/smart-recommend     │  /plans               │
│  /pomodoro                  │  /  (首页)            │
│  /quadrant                  │  /  (首页)            │
│  /history                   │  /profile             │
└─────────────────────────────────────────────────────┘
```

---

## 4. 核心用户流程设计

### 4.1 流程 1：任务完成闭环 (Task → Check-in → Reward)

```
                    ┌──────────────────────────────────────┐
                    │           任务完成闭环                 │
                    └──────────────────────────────────────┘

  ┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
  │         │     │              │     │             │     │              │
  │ 查看任务  │────▶│  点击打卡按钮  │────▶│  打卡确认页   │────▶│  庆祝动画     │
  │ (首页/   │     │  (TaskCard)  │     │  (CheckIn)  │     │ (Celebration)│
  │  任务页)  │     │              │     │             │     │              │
  │         │     │  ■ 按钮足够大  │     │ ■ 展示任务详情 │     │ ■ 星星飘落    │
  │         │     │  ■ 触摸区域   │     │ ■ 确认打卡    │     │ ■ 音效反馈    │
  │         │     │    44x44pt   │     │ ■ 可选备注    │     │ ■ 2-3秒自动  │
  │         │     │              │     │             │     │   返回上一页  │
  └─────────┘     └──────────────┘     └─────────────┘     └──────────────┘
                                                                  │
                                                                  ▼
                                                          ┌──────────────┐
                                                          │  自动跳转     │
                                                          │  首页         │
                                                          │  (能量卡片    │
                                                          │   更新星数)   │
                                                          └──────────────┘

  关键改进：
  ✅ 打卡按钮最小触摸区域 44x44pt (符合 Apple HIG)
  ✅ 打卡确认页展示完整任务信息，避免误操作
  ✅ 庆祝动画后自动返回，减少操作步骤
  ✅ 星数变化立即反映在首页能量卡片
```

### 4.2 流程 2：奖励兑换闭环 (Star → Browse → Redeem)

```
                    ┌──────────────────────────────────────┐
                    │           奖励兑换闭环                 │
                    └──────────────────────────────────────┘

  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │          │    │              │    │              │    │              │
  │ 奖励商城  │───▶│  奖励详情页    │───▶│  兑换确认弹窗  │───▶│  兑换成功页   │
  │(/rewards)│    │(底部弹出)     │    │(Bottom Sheet)│    │(结果反馈)    │
  │          │    │              │    │              │    │              │
  │ ■ 网格布局 │    │ ■ 奖励图片    │    │ ■ 当前星数    │    │ ■ ✅ 图标    │
  │ ■ 星数价格 │    │ ■ 详细描述    │    │ ■ 需要星数    │    │ ■ 扣除后余额  │
  │ ■ 分类筛选 │    │ ■ 兑换按钮    │    │ ■ 确认/取消   │    │ ■ 返回/继续逛 │
  │          │    │              │    │              │    │              │
  └──────────┘    └──────────────┘    └──────────────┘    └──────────────┘

  关键改进：
  ✅ 替换 alert() 为自定义 Bottom Sheet 确认
  ✅ 兑换后展示"剩余星数"动画递减效果
  ✅ 余额不足时禁用兑换按钮 + 显示差距提示
  ✅ 兑换成功后保留在奖励页，不打断浏览
```

### 4.3 流程 3：AI 语音创建任务

```
                    ┌──────────────────────────────────────┐
                    │         AI 语音创建任务流程            │
                    └──────────────────────────────────────┘

  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │          │    │              │    │              │    │              │
  │ 点击麦克风 │───▶│  语音录音     │───▶│  AI 解析结果  │───▶│  确认并发布   │
  │ (首页/    │    │  (VoiceAsst) │    │  (预览卡片)  │    │  (一键创建)  │
  │  任务页)   │    │              │    │              │    │              │
  │          │    │ ■ 录音动画    │    │ ■ 任务名称    │    │ ■ Toast 成功 │
  │          │    │ ■ 波形可视化  │    │ ■ 分配对象    │    │ ■ 自动返回    │
  │          │    │ ■ 点击结束    │    │ ■ 星数奖励    │    │   任务列表    │
  │          │    │              │    │ ■ 可编辑修改  │    │              │
  └──────────┘    └──────────────┘    └──────────────┘    └──────────────┘

  关键改进：
  ✅ 录音时展示实时波形（视觉反馈降低焦虑）
  ✅ AI 解析后允许用户编辑（AI 辅助，非 AI 主导）
  ✅ 支持重新录音按钮（出错时无需返回）
  ✅ 语音识别错误时提供手动输入降级方案
```

### 4.4 流程 4：新手引导 (Onboarding)

```
                    ┌──────────────────────────────────────┐
                    │           新手引导流程                 │
                    └──────────────────────────────────────┘

  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
  │          │    │              │    │              │    │              │
  │ 欢迎页    │───▶│  创建家庭     │───▶│  添加成员     │───▶│  创建首个任务 │
  │(/welcome)│    │  (Step 1)    │    │  (Step 2)    │    │  (Step 3)    │
  │          │    │              │    │              │    │              │
  │ ■ 品牌展示 │    │ ■ 家庭名称    │    │ ■ 孩子姓名    │    │ ■ AI 推荐    │
  │ ■ 价值主张 │    │ ■ 选择角色    │    │ ■ 选择头像    │    │   任务模板    │
  │ ■ 开始按钮 │    │              │    │ ■ 可添加多个  │    │ ■ 一键创建    │
  │          │    │              │    │              │    │              │
  └──────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                  │
                                                                  ▼
                                                          ┌──────────────┐
                                                          │  完成！       │
                                                          │  进入首页     │
                                                          │  (Step 4)    │
                                                          │              │
                                                          │ ■ 🎉 庆祝    │
                                                          │ ■ 快速指引    │
                                                          │   关键操作    │
                                                          └──────────────┘

  关键改进：
  ✅ 分步引导，每步只做一件事（降低认知负担）
  ✅ 进度指示器 (Step 1/4) 给用户明确预期
  ✅ AI 推荐首个任务模板，减少空白页焦虑
  ✅ 完成后提供"快速上手"工具提示
```

---

## 5. 信息架构与内容层级

### 5.1 首页内容优先级重组

```
┌────────────────────────────────────────────────────────────┐
│  首页 (/）信息架构 — 从上到下按重要性排列                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  顶部栏                                               │  │
│  │  [用户头像+姓名 ▼]  ⭐ 1,250  [🔔]  [🎤 AI语音]        │  │
│  │  点击头像 → 切换用户 (UserSelector)                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  能量卡片 (EnergyCard)                    ← 最高优先级  │  │
│  │  ┌────────────────────────────────────┐               │  │
│  │  │  今日星星  ⭐ +15                   │               │  │
│  │  │  本周趋势  ████░░░░  (4/7天打卡)    │               │  │
│  │  │  连续打卡  🔥 12天                  │               │  │
│  │  │  距离目标  🎯 还差85⭐解锁新奖励     │               │  │
│  │  └────────────────────────────────────┘               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  快捷操作 (3个核心 + 展开更多)          ← 简化版        │  │
│  │  [📝 创建任务]  [🎯 番茄钟]  [📊 分析]  [··· 更多]    │  │
│  │  grid-cols-3 替代 grid-cols-5，更宽松                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  今日待办 (TodayTasks)                                │  │
│  │  ┌──────────────────────────────────────┐            │  │
│  │  │  📖 阅读30分钟           ⭐5    [打卡] │            │  │
│  │  │  🎹 练钢琴               ⭐10   [打卡] │            │  │
│  │  │  📝 完成作业             ⭐8    [打卡] │            │  │
│  │  │  🧹 整理房间             ⭐3    [打卡] │            │  │
│  │  └──────────────────────────────────────┘            │  │
│  │  查看全部 4/8 已完成 →                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  家庭动态 (FamilyFeed) — Tab 切换                      │  │
│  │  [🏆排行榜]  [📊 四象限]                              │  │
│  │  ┌──────────────────────────────────────┐            │  │
│  │  │  内容区域                             │            │  │
│  │  └──────────────────────────────────────┘            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  底部导航栏 (5个Tab)                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘

内容层级规则：
  H0 (最重要) → 能量卡片：用户每天必看，展示核心激励数据
  H1 (次重要) → 今日待办：可执行的操作列表，引导用户行动
  H2 (参考)   → 快捷操作：工具入口，辅助功能
  H3 (补充)   → 家庭动态：社交激励，非必须但有价值
```

### 5.2 页面内容层级规范

所有页面遵循统一的内容层级协议：

```
┌──────────────────────────────────────────────────┐
│  L0: TopAppBar (返回 + 标题 + 操作)               │  ← 固定
├──────────────────────────────────────────────────┤
│  L1: 页面主要内容 (Hero/核心功能)                  │  ← 滚动
│      - 最重要的信息/操作放在这里                   │
├──────────────────────────────────────────────────┤
│  L2: 辅助内容 (详情/列表/图表)                     │  ← 滚动
│      - 详细信息和扩展功能                          │
├──────────────────────────────────────────────────┤
│  L3: 操作区 (固定底部按钮/悬浮操作)                │  ← 固定
│      - 主要 CTA 按钮                              │
└──────────────────────────────────────────────────┘

底部安全距离：pb-safe (env(safe-area-inset-bottom))
底部导航遮挡补偿：L3 页面的内容区底部 padding = 底部操作栏高度 + safe-area
```

---

## 6. 组件架构重组

### 6.1 新增共享组件

```
src/components/
├── navigation/
│   ├── TopAppBar.tsx          ← 新增：统一顶部导航栏
│   ├── BottomNav.tsx          ← 修改：修正标签文本
│   └── BackButton.tsx         ← 新增：返回按钮组件
│
├── layout/
│   ├── PageContainer.tsx      ← 新增：页面容器 (含安全区处理)
│   ├── ContentSection.tsx     ← 新增：内容分区组件
│   ├── FixedBottomBar.tsx     ← 新增：固定底部操作栏
│   └── EmptyState.tsx         ← 新增：空状态通用组件
│
├── feedback/
│   ├── SkeletonLoader.tsx     ← 新增：骨架屏加载
│   ├── ErrorRetry.tsx         ← 新增：错误+重试组件
│   ├── SuccessFeedback.tsx    ← 新增：成功反馈组件
│   ├── Toast.tsx              ← 已有：增强使用覆盖面
│   └── CelebrationAnimation.tsx ← 已有：接入所有奖励场景
│
├── calendar/
│   ├── CalendarView.tsx       ← 新增：独立日历组件 (从 Tasks 提取)
│   ├── CalendarDay.tsx        ← 新增：单日单元格
│   └── CalendarMonthNav.tsx   ← 新增：月份导航
│
├── cards/
│   ├── TaskCard.tsx           ← 已有：增大触摸区域
│   ├── RewardCard.tsx         ← 新增：奖励卡片
│   ├── EnergyCard.tsx         ← 新增：能量卡片 (从 Home 提取)
│   └── MemberCard.tsx         ← 新增：成员卡片
│
└── sheets/
    ├── BottomSheet.tsx        ← 新增：通用底部弹出
    ├── ConfirmSheet.tsx       ← 新增：确认弹窗 (替代 alert)
    └── UserSelector.tsx       ← 已有：保持不变
```

### 6.2 组件接口规范

#### TopAppBar 组件

```tsx
interface TopAppBarProps {
  /** 页面标题 */
  title: string;
  /** 是否显示返回按钮，默认 true */
  showBack?: boolean;
  /** 自定义返回路径，不传则使用 router.go(-1) */
  backTo?: string;
  /** 返回前的回调（如保存草稿） */
  onBeforeBack?: () => Promise<boolean>;
  /** 右侧操作区 */
  rightContent?: React.ReactNode;
  /** 是否透明背景（用于 Hero 图场景） */
  transparent?: boolean;
  /** 额外的 CSS 类 */
  className?: string;
}
```

#### PageContainer 组件

```tsx
interface PageContainerProps {
  /** 子内容 */
  children: React.ReactNode;
  /** 是否有底部固定操作栏 */
  hasBottomBar?: boolean;
  /** 底部操作栏高度 (默认 72px) */
  bottomBarHeight?: number;
  /** 是否全屏页面 (隐藏底部导航) */
  isFullPage?: boolean;
  /** 加载状态 */
  loading?: boolean;
  /** 错误信息 */
  error?: string | null;
  /** 重试回调 */
  onRetry?: () => void;
  /** 空状态配置 */
  emptyState?: {
    icon: string;
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
  };
}
```

#### BottomSheet 组件

```tsx
interface BottomSheetProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 标题 */
  title?: string;
  /** 内容 */
  children: React.ReactNode;
  /** 高度预设: 'auto' | 'half' | 'full' */
  height?: 'auto' | 'half' | 'full';
  /** 底部操作按钮 */
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
  }[];
  /** 显示关闭拖拽手柄 */
  showDragHandle?: boolean;
}
```

### 6.3 页面模板模式

所有页面遵循以下三种标准模板之一：

#### 模板 A：标准列表页

```tsx
// 示例：任务列表、奖励商城、历史记录
function StandardListPage() {
  return (
    <PageContainer loading={loading} error={error} onRetry={refetch}
      emptyState={{ icon: '📋', title: '还没有任务', description: '点击下方按钮创建第一个任务' }}
    >
      <TopAppBar title="任务" rightContent={<NotificationBell />} />
      <ContentSection title="进行中">
        {tasks.map(task => <TaskCard key={task.id} task={task} />)}
      </ContentSection>
    </PageContainer>
  );
}
```

#### 模板 B：表单页

```tsx
// 示例：创建/编辑任务、创建/编辑奖励
function FormPage() {
  return (
    <PageContainer isFullPage hasBottomBar>
      <TopAppBar title="创建任务" backTo="/tasks" />
      {/* 表单内容 */}
      <FixedBottomBar>
        <Button variant="primary" fullWidth>保存</Button>
      </FixedBottomBar>
    </PageContainer>
  );
}
```

#### 模板 C：详情/操作页

```tsx
// 示例：打卡检查、奖励兑换
function ActionPage() {
  return (
    <PageContainer hasBottomBar>
      <TopAppBar title="打卡确认" backTo="/tasks" />
      {/* 详情内容 */}
      <FixedBottomBar>
        <Button variant="primary" fullWidth size="large">
          确认打卡，获得 ⭐5
        </Button>
      </FixedBottomBar>
    </PageContainer>
  );
}
```

---

## 7. 状态管理架构

### 7.1 从单体到领域驱动

```
修复前：
  FamilyContext (500+ 行)
  ├── 所有状态
  └── 所有方法

修复后：领域上下文拆分
  AppProvider (根)
  ├── AuthContext        ← 认证状态 (Clerk/Supabase)
  ├── FamilyContext      ← 家庭数据 (members)
  ├── TaskContext        ← 任务数据 (tasks + CRUD)
  ├── RewardContext      ← 奖励数据 (rewards + 兑换)
  ├── HistoryContext     ← 历史数据 (star_transactions)
  ├── HabitContext       ← 习惯数据 (habits)
  ├── UIStore           ← UI 状态 (darkMode, selectors, sheets)
  └── ToastContext       ← 通知 (已有)
```

### 7.2 新状态管理结构

```typescript
// src/context/index.ts — 统一导出
export { AuthProvider, useAuth } from './AuthContext';
export { FamilyProvider, useFamily } from './FamilyContext';
export { TaskProvider, useTasks } from './TaskContext';
export { RewardProvider, useRewards } from './RewardContext';
export { HistoryProvider, useHistory } from './HistoryContext';
export { HabitProvider, useHabits } from './HabitContext';
export { UIProvider, useUI } from './UIContext';

// src/App.tsx — 嵌套提供者
<AuthProvider>
  <UIProvider>
    <FamilyProvider>
      <TaskProvider>
        <RewardProvider>
          <HistoryProvider>
            <HabitProvider>
              <ToastProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </ToastProvider>
            </HabitProvider>
          </HistoryProvider>
        </RewardProvider>
      </TaskProvider>
    </FamilyProvider>
  </UIProvider>
</AuthProvider>
```

### 7.3 各 Context 职责边界

```
┌─────────────────────────────────────────────────────────────┐
│  AuthContext                                                 │
│  ─────────                                                  │
│  状态：user, session, isAuthenticated, isLoading             │
│  方法：signIn, signUp, signOut, refreshSession               │
│  依赖：Clerk SDK + Supabase Auth                             │
├─────────────────────────────────────────────────────────────┤
│  FamilyContext                                               │
│  ─────────                                                   │
│  状态：familyId, members, currentUser                       │
│  方法：addMember, updateMember, deleteMember,               │
│         setCurrentUser, switchMember                        │
│  依赖：Supabase (families, members)                          │
├─────────────────────────────────────────────────────────────┤
│  TaskContext                                                 │
│  ─────────                                                   │
│  状态：tasks, isLoading, error                              │
│  方法：addTask, updateTask, deleteTask,                     │
│         completeTask, approveTask                           │
│  依赖：Supabase (tasks) + HistoryContext (记录星星)          │
├─────────────────────────────────────────────────────────────┤
│  RewardContext                                               │
│  ─────────                                                   │
│  状态：rewards, isLoading, error                            │
│  方法：addReward, updateReward, deleteReward,               │
│         redeemReward                                        │
│  依赖：Supabase (rewards) + HistoryContext + currentUser     │
├─────────────────────────────────────────────────────────────┤
│  HistoryContext                                              │
│  ─────────                                                   │
│  状态：history, todayStars, weeklyTrend                    │
│  方法：addTransaction (内部使用), fetchHistory              │
│  依赖：Supabase (star_transactions)                          │
├─────────────────────────────────────────────────────────────┤
│  HabitContext                                                │
│  ─────────                                                   │
│  状态：habits, streaks                                     │
│  方法：addHabit, checkHabit, getStreak                     │
│  依赖：Supabase (tasks where is_habit=true)                  │
├─────────────────────────────────────────────────────────────┤
│  UIContext                                                   │
│  ─────────                                                   │
│  状态：isDarkMode, isUserSelectorOpen, activeSheet,         │
│         guestMode, onboardingStep                           │
│  方法：toggleDarkMode, openSheet, closeSheet,               │
│         setGuestMode, advanceOnboarding                     │
│  依赖：无外部依赖，纯本地状态                                 │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 跨 Context 通信模式

```typescript
// 场景：兑换奖励需要扣减星星 → RewardContext 需要通知 FamilyContext 更新星数

// ❌ 旧方案：在一个大 Context 里直接操作
// ✅ 新方案：通过回调/事件总线

// 方案 A：Provider 级别组合
function RewardProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, updateMember } = useFamily();
  const { addTransaction } = useHistory();

  const redeemReward = async (rewardId: string) => {
    // 1. 更新奖励状态
    // 2. 记录星星交易
    await addTransaction({ ... });
    // 3. 扣减用户星数
    await updateMember({ ...currentUser, stars: currentUser.stars - cost });
  };

  return <RewardContext.Provider value={{ ... }}>{children}</RewardContext.Provider>;
}

// 方案 B：简单事件总线 (用于解耦的场景)
const useEventBus = () => {
  // 轻量级 pub/sub，避免过度工程化
};
```

---

## 8. 错误恢复与弹性架构

### 8.1 加载-空-错误-成功 四态协议

每个数据驱动的页面/组件必须覆盖以下四种状态：

```
┌────────────────────────────────────────────────────────────────┐
│  状态        │  触发条件        │  展示内容                     │
│──────────────┼──────────────────┼───────────────────────────────│
│  LOADING     │  数据正在获取     │  SkeletonLoader (骨架屏)      │
│              │  (首次加载)       │  带动画占位符                 │
│──────────────┼──────────────────┼───────────────────────────────│
│  EMPTY       │  数据为空         │  EmptyState 组件              │
│              │  (列表无内容)      │  图标 + 文案 + 引导操作       │
│──────────────┼──────────────────┼───────────────────────────────│
│  ERROR       │  请求失败         │  ErrorRetry 组件              │
│              │  (网络/权限/服务)  │  错误信息 + 重试按钮           │
│──────────────┼──────────────────┼───────────────────────────────│
│  SUCCESS     │  数据获取成功     │  正常内容渲染                  │
│              │                  │                               │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 组件实现规范

#### SkeletonLoader

```tsx
interface SkeletonProps {
  /** 骨架类型 */
  variant: 'card' | 'list' | 'detail' | 'energy-card';
  /** 骨架数量 */
  count?: number;
}

// 使用示例
{loading ? (
  <SkeletonLoader variant="card" count={4} />
) : (
  tasks.map(task => <TaskCard key={task.id} task={task} />)
)}
```

#### EmptyState

```tsx
interface EmptyStateProps {
  icon: string;           // emoji 或图标名
  title: string;          // "还没有任务"
  description: string;    // "创建第一个任务开始赚星星吧！"
  action?: {
    label: string;        // "创建任务"
    onClick: () => void;  // navigate('/tasks/new')
  };
}

// 预设映射表 (每个页面定义自己的空状态)
const EMPTY_STATES = {
  tasks: {
    icon: '📋',
    title: '还没有任务',
    description: '创建第一个任务，开始家庭协作吧！',
    action: { label: '创建任务', to: '/tasks/new' }
  },
  rewards: {
    icon: '🎁',
    title: '还没有奖励',
    description: '添加奖励激励孩子完成任务！',
    action: { label: '添加奖励', to: '/rewards/new' }
  },
  habits: {
    icon: '🌟',
    title: '还没有习惯',
    description: '添加一个好习惯，每天坚持打卡！',
    action: { label: '添加习惯', to: '/tasks/new?type=habit' }
  },
  history: {
    icon: '⭐',
    title: '还没有星星记录',
    description: '完成第一个任务即可获得星星！',
  },
};
```

#### ErrorRetry

```tsx
interface ErrorRetryProps {
  /** 错误信息 */
  message?: string;
  /** 重试回调 */
  onRetry: () => void;
  /** 是否全屏显示 (默认嵌入) */
  fullPage?: boolean;
}

// 使用示例
{error ? (
  <ErrorRetry 
    message="加载失败，请检查网络连接"
    onRetry={refetch} 
  />
) : (
  <ContentList />
)}
```

### 8.3 网络弹性策略

```
┌─────────────────────────────────────────────────────────────┐
│  网络状态        │  用户操作          │  系统行为              │
│─────────────────┼───────────────────┼────────────────────────│
│  在线 (正常)     │  正常操作          │  直接请求服务器         │
│─────────────────┼───────────────────┼────────────────────────│
│  在线 (慢速)     │  正常操作          │  显示骨架屏             │
│                 │                   │  10秒超时 → 显示重试    │
│─────────────────┼───────────────────┼────────────────────────│
│  离线            │  查看已有数据      │  读取本地缓存           │
│                 │                   │  顶部显示离线横幅        │
│                 │                   │  写操作加入队列          │
│─────────────────┼───────────────────┼────────────────────────│
│  恢复在线        │  继续使用          │  静默同步队列           │
│                 │                   │  Toast 提示同步完成     │
└─────────────────────────────────────────────────────────────┘

离线横幅组件：
┌──────────────────────────────────────────────────┐
│  ⚠️ 当前离线 · 数据将在恢复网络后自动同步          │
└──────────────────────────────────────────────────┘
```

---

## 9. 响应式与跨平台一致性

### 9.1 断点策略

```css
/* 设计系统断点 */
:root {
  --breakpoint-mobile:  0px;      /* 手机端 — 默认 */
  --breakpoint-tablet:  768px;    /* 平板竖屏 */
  --breakpoint-desktop: 1024px;   /* 桌面端 */
  --breakpoint-wide:    1280px;   /* 宽屏 */
}

/* 布局容器 */
.container-app {
  width: 100%;
  max-width: var(--container-app);  /* 默认 448px (手机) */
  margin: 0 auto;
}

@media (min-width: 768px) {
  .container-app {
    max-width: 640px;  /* 平板 */
  }
}

@media (min-width: 1024px) {
  .container-app {
    max-width: 960px;  /* 桌面双栏 */
    display: grid;
    grid-template-columns: 2fr 1fr;  /* 主内容 + 侧边栏 */
    gap: var(--space-8);
  }
}

@media (min-width: 1280px) {
  .container-app {
    max-width: 1120px;
  }
}
```

### 9.2 管理后台设计统一

```
管理后台改造方案：
  ✅ 共享设计 Token (CSS 变量)
  ✅ 统一色彩体系 (暖绿 MD3)
  ✅ 统一字体系统 (Inter + Jakarta Sans)
  ✅ 统一间距系统 (4px 基础网格)
  ✅ 统一圆角系统 (MD3 规范)
  ✅ 管理后台特有：
     - 深色侧边栏 (与主应用区分)
     - 数据可视化增强 (保留 Recharts，统一配色)
     - 更紧凑的布局 (管理场景信息密度更高)
```

### 9.3 跨平台适配清单

```
平台            │  适配要点
───────────────┼──────────────────────────────────────
iOS            │  safe-area-inset-* 安全区
               │  状态栏样式 (light/dark content)
               │  原生回退手势兼容
───────────────┼──────────────────────────────────────
Android        │  系统返回键处理
               │  Material You 动态取色 (可选)
               │  底部导航栏高度适配
───────────────┼──────────────────────────────────────
Web (PWA)      │  Service Worker 离线缓存
               │  Add to Home Screen 提示
               │  浏览器地址栏显示/隐藏适配
───────────────┼──────────────────────────────────────
微信小程序      │  导航栏定制 (原生 vs 自定义)
(规划中)        │  底部 TabBar 适配
               │  分享功能接入
               │  订阅消息通知
───────────────┼──────────────────────────────────────
平板 (iPad)    │  双栏布局 (已有 iPadLayout 基础)
               │  横竖屏切换
               │  Split View / Slide Over
```

---

## 10. 实施路线图

### 10.1 实施优先级矩阵

```
影响 × 成本 矩阵：

  高影响  │  P0: 立即执行          │  P1: 短期规划
         │  • 导航标签修正         │  • 状态管理拆分
         │  • 二级页返回按钮       │  • 骨架屏系统
         │  • alert() 替换         │  • 错误恢复组件
         │  • 日历组件提取         │  • 空状态系统
  ────────┼───────────────────────┼───────────────────────
  低影响  │  P2: 中期优化          │  P3: 长期规划
         │  • 首页内容重组         │  • 管理后台统一
         │  • 打开确认弹窗         │  • 离线队列同步
         │  • 底部导航微交互       │  • 平板适配
         │                        │  • 微信小程序
         └───────────────────────┴───────────────────────
           低成本                    高成本
```

### 10.2 分阶段实施计划

#### Phase 1：止血修复 (Week 1-2)

```
优先级 P0 — 解决最影响用户的断点

□ 1.1 修复底部导航标签文本
      - BottomNav.tsx: habits → "习惯", rewards → "奖励"
      - 更新 i18n 翻译键

□ 1.2 新增 TopAppBar 组件
      - 创建 src/components/navigation/TopAppBar.tsx
      - 在所有二级页面集成

□ 1.3 替换所有 alert() 调用
      - FamilyContext.tsx: redeemReward → Toast
      - 所有 alert → ConfirmSheet 或 Toast

□ 1.4 提取 CalendarView 组件
      - 从 Tasks.tsx 提取日历逻辑
      - 创建 src/components/calendar/CalendarView.tsx
```

#### Phase 2：架构加固 (Week 3-4)

```
优先级 P1 — 建立稳健的架构基础

□ 2.1 状态管理拆分
      - 创建 AuthContext, TaskContext, RewardContext 等
      - 渐进式迁移（先新建，再逐模块替换）
      - 保持向后兼容的过渡期

□ 2.2 骨架屏系统
      - 创建 SkeletonLoader 组件
      - 预设 card/list/detail/energy-card 变体
      - 在首页、任务列表页接入

□ 2.3 错误恢复组件
      - 创建 ErrorRetry 组件
      - 在数据获取层统一接入

□ 2.4 空状态系统
      - 创建 EmptyState 组件
      - 定义各页面空状态预设
```

#### Phase 3：体验优化 (Week 5-6)

```
优先级 P2 — 打磨用户体验

□ 3.1 首页内容重组
      - 快捷操作从 5 个缩减到 3+1
      - 能量卡片视觉增强
      - 家庭动态 Tab 优化

□ 3.2 奖励兑换体验升级
      - 实现 BottomSheet 确认流程
      - 加入星数递减动画
      - 余额不足引导

□ 3.3 底部导航微交互
      - 切换动画优化
      - 激活状态指示器

□ 3.4 新手引导优化
      - 分步引导流程
      - AI 推荐任务模板
      - 快速上手工具提示
```

#### Phase 4：平台一致 (Week 7-8+)

```
优先级 P3 — 跨平台体验统一

□ 4.1 管理后台设计统一
      - 导入主应用设计 Token
      - 统一配色和字体

□ 4.2 离线增强
      - 离线队列同步
      - 乐观更新

□ 4.3 平板适配
      - 双栏/三栏布局
      - 横竖屏切换
```

### 10.3 风险控制

```
┌─────────────────────────────────────────────────────────────┐
│  风险                    │  缓解措施                          │
│─────────────────────────┼────────────────────────────────────│
│  状态管理拆分引入 bug     │  渐进迁移 + 保留旧 Context 共存    │
│                         │  每个领域独立测试                   │
│─────────────────────────┼────────────────────────────────────│
│  新增组件集成兼容性       │  保持现有的 Layout 结构不变         │
│                         │  新组件作为增强层叠加               │
│─────────────────────────┼────────────────────────────────────│
│  日历提取影响功能         │  先复制再提取，保留旧实现验证       │
│─────────────────────────┼────────────────────────────────────│
│  导航标签修改影响 SEO     │  PWA 内部应用，SEO 影响可控        │
│                         │  保留旧路由作为重定向               │
└─────────────────────────────────────────────────────────────┘
```

---

## 附录 A：文件结构建议

```
src/
├── App.tsx                          ← 修改：使用新 Provider 嵌套
├── context/
│   ├── index.ts                     ← 新增：统一导出
│   ├── AuthContext.tsx              ← 新增：认证状态
│   ├── FamilyContext.tsx            ← 精简：仅保留 members/currentUser
│   ├── TaskContext.tsx              ← 新增：任务状态
│   ├── RewardContext.tsx            ← 新增：奖励状态
│   ├── HistoryContext.tsx           ← 新增：历史状态
│   ├── HabitContext.tsx             ← 新增：习惯状态
│   └── UIContext.tsx                ← 新增：UI 状态
├── components/
│   ├── navigation/
│   │   ├── TopAppBar.tsx            ← 新增
│   │   ├── BottomNav.tsx            ← 修改：标签文本
│   │   └── BackButton.tsx           ← 新增
│   ├── layout/
│   │   ├── Layout.tsx               ← 修改：集成 TopAppBar 逻辑
│   │   ├── PageContainer.tsx        ← 新增
│   │   ├── ContentSection.tsx       ← 新增
│   │   ├── FixedBottomBar.tsx       ← 新增
│   │   └── EmptyState.tsx           ← 新增
│   ├── feedback/
│   │   ├── SkeletonLoader.tsx       ← 新增
│   │   ├── ErrorRetry.tsx           ← 新增
│   │   ├── SuccessFeedback.tsx      ← 新增
│   │   ├── Toast.tsx                ← 已有
│   │   └── CelebrationAnimation.tsx ← 已有
│   ├── calendar/
│   │   ├── CalendarView.tsx         ← 新增（从 Tasks 提取）
│   │   ├── CalendarDay.tsx          ← 新增
│   │   └── CalendarMonthNav.tsx     ← 新增
│   ├── cards/
│   │   ├── TaskCard.tsx             ← 修改：增大触摸区域
│   │   ├── RewardCard.tsx           ← 新增
│   │   ├── EnergyCard.tsx           ← 新增（从 Home 提取）
│   │   └── MemberCard.tsx           ← 新增
│   └── sheets/
│       ├── BottomSheet.tsx          ← 新增
│       ├── ConfirmSheet.tsx         ← 新增
│       └── UserSelector.tsx         ← 已有
└── pages/
    ├── Home.tsx                     ← 修改：使用新组件
    ├── Tasks.tsx                    ← 修改：使用 CalendarView
    ├── Rewards.tsx                  ← 修改：使用 BottomSheet
    ├── HabitRewards.tsx             ← 不变
    ├── Profile.tsx                  ← 修改：集成 TopAppBar
    ├── CheckIn.tsx                  ← 修改：使用 FixedBottomBar
    ├── ... (其他页面逐步迁移)
    └── templates/
        ├── StandardListPage.tsx     ← 新增：模板参考
        ├── FormPage.tsx             ← 新增：模板参考
        └── ActionPage.tsx           ← 新增：模板参考
```

---

## 附录 B：验收清单

实施完成后，逐项验证：

### 导航体验
- [ ] 底部导航 5 个标签文本与功能一致
- [ ] 所有二级页面显示返回按钮
- [ ] 返回按钮回到正确的上级页面
- [ ] Capacitor 原生返回键行为一致

### 用户流程
- [ ] 任务打卡 → 庆祝动画 → 自动返回首页，流程流畅
- [ ] 奖励兑换使用 Bottom Sheet 确认，不再出现 alert()
- [ ] AI 语音创建任务支持编辑和重新录音
- [ ] 新手引导分步完成，不会出现空白页

### 组件状态
- [ ] 所有列表页展示骨架屏加载状态
- [ ] 所有列表页有空状态引导
- [ ] 网络错误时显示重试按钮
- [ ] 离线时显示横幅提示

### 性能
- [ ] 状态拆分后，页面渲染性能无退化
- [ ] 日历组件可独立使用
- [ ] 首页滚动帧率 ≥ 60fps

### 跨平台
- [ ] iOS 安全区适配正确
- [ ] Android 返回键处理正确
- [ ] 平板布局正常显示
- [ ] 管理后台设计风格与主应用统一

---

> **ArchitectUX Agent**: ArchitectUX  
> **文档版本**: v2.0  
> **创建日期**: 2026-05-12  
> **适用产品**: 愿望卡 (WishCard / Forest Family)  
> **下一步**: 进入 Phase 1 止血修复实施阶段
