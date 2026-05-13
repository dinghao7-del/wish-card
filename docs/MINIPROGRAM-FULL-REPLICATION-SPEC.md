# 小程序 100% 复刻完整规范

> 基于对 `/src/pages/` 下全部 30 个 .tsx 页面的逐行源码分析
> 生成日期：2026-05-07
> 目标：小程序与 Web 端功能和交互体验 **100% 对齐**

---

## 一、原项目完整页面功能清单（Web端 30 个页面）

### 核心页面（TabBar 级别）

#### 1. Home.tsx — 首页（377行）
**UI布局：**
| 区域 | 组件 | 功能 |
|------|------|------|
| Header | 用户头像(可点击切换) + AI麦克风按钮 + 星星余额胶囊 + 设置按钮 | 固定顶部，毛玻璃背景 |
| 能量卡 | 渐变背景卡片(绿→primary) + 浮动动画元素(Sparkles/Star) + 今日获得星星数(大号动态数字) + 副标题 | Framer Motion 动画 |
| 快捷操作 | 4列网格：创建任务/许下心愿/日历/Pomodoro | 每项 icon+label，跳转对应路由 |
| 今日任务 | 标题+数量badge + TaskCard列表(最多4条) | 点击→任务详情或打卡页 |
| 底部区域 | 排行榜/四象限 Tab 切换 + 领奖台(3人Podium+头像+星星数) 或 四象限入口按钮 | 切换视图 |

**交互功能：**
- [x] 用户切换器打开 (`setIsUserSelectorOpen`)
- [x] AI语音助手弹窗 (`VoiceAssistant` 组件)
- [x] 星星变化时触发闪光动画 (`showSparkles`)
- [x] 今日获得星星实时计算（从 history 数据按今日过滤）
- [x] 排行榜：按 stars 排序取 Top3，2nd/1st/3rd 领奖台布局
- [x] 四象限 Tab → 跳转 `/quadrant`

**关键依赖：**
```tsx
TaskCard, VoiceAssistant, QuadrantAnalysisView, TextAvatar, useFamily, useTranslation, framer-motion
```

---

#### 2. Tasks.tsx — 任务中心（623行）
**UI布局：**
| 区域 | 组件 | 功能 |
|------|------|------|
| Header | 用户头像 + AI麦克风 + 视图切换(List/Calendar) + 星星余额 | 毛玻璃固定顶 |
| 日历模式 | 月份导航器(←/→) + 星期头 + 日历网格(7列) + 选中日任务列表 | date-fns 生成，有任务显示圆点 |
| 列表模式 | 筛选Pill(全部/待完成/已完成) + 分组(待审核/待完成/已完成) + 新建FAB | 滚动区域 |
| 任务详情面板 | 全屏右侧滑入：大图标(渐变背景+模糊光晕) + 标题 + 时间 + 创建者信息卡 + 描述区 + 奖励卡(星星大号) + 参与者列表(头像+状态) | AnimatePresence 动画 |
| 操作栏(固定底) | 待处理→"确认打卡"(绿色大按钮) / 审核中→"审核通过"(蓝色) / 已完成→灰显"已发放" | 三态 |

**交互功能：**
- [x] 双视图模式切换 (list/calendar)
- [x] 日历月份前后导航 + 日期选择高亮 + 今天特殊标记
- [x] 筛选：all/pending/completed 三态
- [x] 任务点击→全屏详情面板（右滑入）
- [x] 详情内设置菜单：编辑(→/tasks/edit/:id) / 删除(二次确认弹窗)
- [x] 删除确认 Modal（红色主题）
- [x] 三态操作按钮根据 status 和 isAdmin 动态显示

**关键状态机：**
```
pending → reviewing(孩子提交) → completed(家长审核)
in_progress → reviewing → completed
```

---

#### 3. Rewards.tsx — 奖励商店（303行）
**UI布局：**
| 区域 | 组件 | 功能 |
|------|------|------|
| Header | 用户头像 + AI麦克风 + 星星余额 + 设置按钮 | 标准 header |
| 标题栏 | 大标题 "奖励商店" | 家长显示新建FAB(+图标) |
| 分类Tab | 横向滚动：全部/日常/体验/奖品/特权/成长/活动 | 7个分类 pill |
| 奖励网格 | 2列卡片：图片区(渐变背景/实际图+标题悬浮底部) + 编辑按钮(家长) + 底部操作栏(星星成本+兑换按钮/进度条) | AnimatePresence layout |
| 兑换详情Modal | 底部弹出：大图(4:3) + 名称 + 分类tag + 成本 + 描述 + 取消/确认按钮 | 兑换不足时禁用 |
| 庆祝动画 | CelebrationAnimation 组件 | 兑换成功后展示 |

**交互功能：**
- [x] 7分类筛选（all/common/experience/prize/privilege/growth/activity）
- [x] 奖励卡片点击→详情 Modal
- [x] 家长可编辑奖励（跳转 `/rewards/edit/:id`）
- [x] 兑换：余额检查 → 成功动画 → `redeemReward()` → 扣减星星
- [x] 余额不足时显示进度条 + 百分比
- [x] 兑换成功后 `CelebrationAnimation`（type="reward"）

---

#### 4. Profile.tsx — 个人中心（462行）
**UI布局：**
| 区域 | 组件 | 功能 |
|------|------|------|
| Header | 头像 + 标题 "我的" + 通知铃铛 | 标准 |
| Hero | 大头像(144px) + 编辑按钮(悬浮右下) + 昵称 | 可点击跳转编辑 |
| 导入导出弹窗 | 内容选择(任务/奖励) + 分享链接(复制) + 备份下载/上传 + URL导入预览 | 全屏 Modal |
| 家庭成员 | 横向滚动卡片：头像 + 名字 + 星星 + 当前用户高亮 | 可点击进入成员详情 |
| 菜单组1 | 安全 / 分享备份 / 日历同步 / 通知 / 反馈 | 图标+文字+箭头 |
| 菜单组2 | 深色模式(Toggle) / 基础设置 | Toggle 用 motion.div |
| 底部 | 退出登录按钮(红色) | 居中 |

**交互功能：**
- [x] 导出 JSON 备份文件（Blob下载）
- [x] 导入：文件上传 / URL导入 / 粘贴链接导入
- [x] 分享链接生成（Base64编码 data → URL）
- [x] 深色模式 Toggle（`toggleDarkMode`）
- [x] 家庭成员横向列表 + 高亮当前用户
- [x] 退出登录确认 + 跳转 Welcome

---

### 二级重要页面

#### 5. PublishTask.tsx — 创建/编辑任务（1403行）⭐ 最复杂页面
**双模式：target（目标） / habit（习惯）**

**Target 模式 UI：**
| 区域 | 组件 |
|------|------|
| Header | 返回 + 模式切换(target/habit) + 导入模板按钮 / 保存按钮 |
| 标题卡 | 标题输入(label:"请输入目标名称") + 分类选择器 + 添加描述(展开) |
| 设置组合卡 | 重复开关(Toggle) + 显示标签 / 时段开关(Toggle) + 显示标签 / 计划入口(假期计划badge) |
| 奖励卡 | 星星积分调节器(-/input/+) | 
| 人员卡 | 发布家长选择(2列网格-头像+名字) + 执行小朋友选择(多选) |
| 底部提交 | 大号绿色渐变按钮 "确认添加" / shimmer动画 | fixed 定位 |

**Habit 模式 UI：**
| 区域 | 组件 |
|------|------|
| 标题卡 | 标题输入 |
| 图片选择 | 选择图片（可选）→ IconPicker |
| 多次打卡 | ResetAfterClaim Toggle |
| 星星 | 数字输入 |
| 次数限制 | 目标次数输入 |
| 选择成员 | 孩子头像多选 + 添加按钮 |
| 类型 | 奖励/惩罚 Segmented Control |
| 描述 | 文本域 |

**Modal 弹窗（6个）：**
1. **Category Modal** - 分类选择（支持标签管理入口）
2. **Time Selector Modal** - 时段选择器（3列滚轮：时/分/时长）+ 提醒Toggle
3. **Repeat Selector Modal** - 重复设置（周/月/日历三Tab）+ 快捷按钮（工作日/周末/单双日/艾宾浩斯/21天习惯）
4. **Tag Management Modal** - 标签增删（独立页面滑入）
5. **Icon Picker / Template Selector** - 图标/模板选择器组件

**交互功能：**
- [x] target/habit 双模式完整表单
- [x] 自动选中所有孩子作为执行者
- [x] 编辑模式从 taskToEdit 回填数据
- [x] 模板导入（支持 sessionStorage fallback）
- [x] 重复设置：每周(星期多选)/每月(日期多选)/日历(日历选择)
- [x] 时段设置：小时(0-23) + 分钟(0/5步进) + 时长(30min-6h)
- [x] 标签自定义管理（增删）
- [x] 图标从 Lucide Icons 动态渲染

---

#### 6. CheckIn.tsx — 打卡页（217行）
**UI布局：**
| 阶段 | 组件 |
|------|------|
| 表单阶段 | Header(返回+标题) + 任务概览卡(图标+标题+打卡人) + **超大圆形打卡按钮**(288px,渐变+环动画) + 星星预览 + 励志文案 |
| 成功阶段 | 成功图标(大绿圆形+Check) + 彩色粒子散射(12个) + "打卡成功"大字 + 详情卡(星星数) + "太棒了"按钮 |

**交互功能：**
- [x] 区分打卡模式 vs 审核模式（根据 task.status == 'reviewing' 和 isAdmin）
- [x] 打卡按钮脉冲动画 (animate-ping)
- [x] 成功后粒子庆祝动画（12个粒子向四周散射）
- [x] 星星奖励展示
- [x] 无任务时的空状态引导回首页

---

#### 7. History.tsx — 星星足迹（101行）
**UI布局：**
| 区域 | 组件 |
|------|------|
| Header | 返回 + "星星足迹" |
| 余额卡 | 渐变背景(primary-container) + Star图标 + 当前余额(超大字号) + "当前余额"label |
| 变更记录 | 列表：图标(正/负不同色) + 标题 + 时间 + 变化数值(绿色+/红色-) | 入场动画 |
| 空状态 | Trophy图标 + "还没有星星记录哦" | 

---

#### 8. PomodoroTimer.tsx — 番茄钟（663行）
**UI布局：**
| 区域 | 组件 |
|------|------|
| Header | "使用说明" + "番茄工作法" 标题 | 
| 阶段指示 | 工作聚焦 / 短休息 / 长休息 三个 Tab | 当前阶段高亮下划线 |
| 任务选择 | "选择任务" 下拉（仅工作阶段显示） | → 任务选择Modal |
| 计时器 | SVG 圆形进度环(strokeDasharray) + 大号时间显示(可点击改时长) | 颜色随阶段变化 |
| 操作区 | 开始 / 暂停(继续+结束) / 重置 按钮 | 阶段颜色 |
| 底部导航 | 清单/日历/计时/笔记/更多 | 5个 NavItem |

**Modal 弹窗：**
1. **Help Modal** - 使用说明（由来/5步骤/明白了按钮）- 底部滑出
2. **Task Selector Modal** - 任务列表 + 创建新任务入口 - 底部滑出 65vh
3. **Duration Selector Modal** - 时长选择（1-60分钟滚轮）- 底部滑出

**交互功能：**
- [x] 三阶段计时：工作(25min) → 短休(5min) or 长休(15min) → 循环
- [x] 每4个番茄钟自动长休息
- [x] 开始/暂停/终止/重置 完整控制
- [x] SVG 圆形进度动画（strokeDashoffset）
- [x] 最后10秒滴答音效 + 完成上升音效
- [x] 任务关联（选择任务进行计时）
- [x] 自定义时长（1-60分钟）
- [x] 完成庆祝动画

---

### 功能增强页面

#### 9. ScheduleRecommend.tsx — AI智能日程推荐（1099行）⭐ AI密集型
**6步流程：**

| 步骤 | 内容 | 组件 |
|------|------|------|
| Step 0 | 基本信息 | 性别(男孩/女孩大卡片) + 年级(ChipSelect 15选项) + 年龄 + 城市 + 学校类型 |
| Step 1 | 学业与时间 | 强项科目(ChipSelect) + 薄弱科目 + 作业时长 + 可自由支配时间 |
| Step 2 | 兴趣与特长 | 已有兴趣班(ChipSelect，性别差异化选项) + 固定日程输入 + 电子设备使用 + 屏幕时间 |
| Step 3 | 性格与期望 | 性格特点(17选项) + 家长期望(7选项) + 月预算 + 健康注意 + 其他补充 |
| Step 4 | 生成中 | Sparkles旋转 + "AI 正在分析..." + 3步进度指示器 | 加载态 |
| Step 5 | 推荐结果 | AI摘要 + 4Tab(平日/周末/推荐活动/学习策略) + 反馈修订输入 + 家长建议 + 发展路径 + 保存为计划/重新开始 |

**交互功能：**
- [x] 多步表单收集儿童画像（性别/年级/兴趣/性格/预算等20+字段）
- [x] AI 生成个性化日程推荐 (`generateScheduleRecommendation`)
- [x] 结果展示：时间轴格式（睡眠/用餐特殊着色）
- [x] 反馈修订：输入意见 → AI 调整方案 (`refineScheduleRecommendation`)
- [x] 推荐活动带优先级/类别/时长/年龄建议/理由
- [x] 各科学习策略建议 + 资源推荐
- [x] 分阶段发展路径 timeline
- [x] 保存为计划（跳转 Plans）

---

#### 10. QuadrantAnalysisPage.tsx — 四象限分析看板（380行）
**UI布局：**
| 区域 | 组件 |
|------|------|
| Header | 返回 + "任务四象限看板" + AI麦克风 | 
| 日期筛选 | Dropdown：全部/今天/未来3天/未来7天/本周/本月/未来30天/今年 | 8个范围 |
| 2×2四象限网格 | 紧急且重要(绿) / 重要不紧急(黄) / 紧急不重要(红) / 不紧急不重要(灰) | 每格：图标+标题+最多3个任务+原因 |
| AI建议卡 | Sparkles图标 + AI建议文本 + 建议列表(箭头前缀) | 
| 底部导航 | 清单/日历/复盘/笔记/更多 | 5 tab |

**交互功能：**
- [x] 调用 AI 分析 (`analyzeQuadrant`) 将任务分类到四象限
- [x] 8种日期范围筛选
- [x] 每象限最多显示3个任务（超出显示"还有N个"）
- [x] AI 建议和改进建议
- [x] AI 语音助手集成
- [x] 加载态/错误态/重试

---

#### 11. CalendarSync.tsx — 日历同步（729行）
**UI布局：**
| 区域 | 组件 |
|------|------|
| Header | 返回 + "日历同步" + 副标题 | 
| 设备检测卡 | 设备图标 + 品牌 + 平台 + "查看引导"按钮 + 导出ICS/导入ICS 双按钮 | 自动检测UA |
| 订阅管理 | 订阅列表（名称+状态+复制链接+删除） + 新建按钮 | 支持多个订阅 |
| 所有品牌网格 | 8品牌卡片(苹果/华为/荣耀/小米/OPPO/vivo三星/通用) 2列 | 点击打开引导 |
| 引导弹窗(底部滑出) | 方法1:订阅链接(一键订阅/复制) + 方法2:导出ICS + 步骤列表 + 温馨提示 | 按品牌定制步骤 |
| 导入弹窗 | 文件导入/URL导入 切换 + 文件选择或URL输入 | 

**交互功能：**
- [x] UA 自动设备检测（Apple/Huawei/Xiaomi/OPPO/vivo/Samsung等）
- [x] ICS 文件导出（`generateICSFile` + downloadICS）
- [x] ICS 文件导入（解析 ICS → 批量创建任务）
- [x] 日历订阅创建/删除/复制链接
- [x] iOS 一键订阅（webcal:// 协议）
- [x] 8品牌的定制引导步骤（`getCalendarSyncGuide`）

---

#### 12. HabitRewards.tsx — 好习惯奖励/惩罚（530行）
**UI布局：**
| 区域 | 组件 |
|------|------|
| Header | 用户头像 + AI麦克风 + 星星 + 设置 | 标准 |
| Tab | 奖励 / 惩罚 | 切换 habit.rewardStars >= 0 / < 0 |
| 习惯网格 | 2列卡片：大图标背景装饰 + 标题 + 星星数 | 绿色=奖励/红色=惩罚 |
| 详情Modal | 大图标 + 标题 + 描述 + 奖励/惩罚星星 + 当前次数 + 返回/打卡按钮 | CelebrationAnimation |
| 添加Modal | 习惯名称 + 星星输入 + 取消/确认 | 

**交互功能：**
- [x] 奖励/惩罚双 Tab 过滤（基于 rewardStars 正负）
- [x] 习惯详情查看
- [x] 打卡：增加 currentCount，达到 targetCount 自动 completed
- [x] 打卡成功庆祝动画
- [x] 快速添加简单习惯
- [x] 设置菜单（编辑/删除 + 删除确认）

---

#### 13. MemberDetail.tsx — 成员详情（433行）
**UI布局：**
| 区域 | 组件 |
|------|------|
| Header | 返回 + "成员详情" | 
| Hero | 头像(128px) + 编辑按钮 + 名字 + 角色Badge(parent/child) | 
| 统计卡(2列) | 当前星星(可点击编辑) / 已完成任务数(可点击查看) | 
| 快捷操作(家长) | "+加星" / "-扣星" 两个大按钮 | 
| 近期任务 | 最近3个任务卡片(标题+状态) + 查看全部 | 
| 删除按钮(家长) | 红色 "删除成员" | 

**Modal 弹窗：**
1. **星星编辑** - 数值调节(-10/+10) + 汇总表(成员/变更前/变更后) + 备注 + 确认
2. **任务查看** - 已完成任务列表（带星星奖励）
3. **删除确认** - 二次确认

**交互功能：**
- [x] 星星手动加减（带汇总预览和备注）
- [x] 已完成任务列表查看
- [x] 成员删除（带旋转加载动画）
- [x] 权限控制：仅家长可编辑星星/删除

---

#### 14. Welcome.tsx — 登录注册欢迎页（799行）
**4步流程：Step = intro | register | login | verify | otp**

| 步骤 | UI |
|------|-----|
| intro | Popsy插画 + "星愿卡"艺术字 + 副标题 + 注册/登录/先逛逛 3按钮 + 跳过(右上角) | 动画背景blob |
| register | 昵称 +邮箱 + 密码 + 确认密码 + 发送验证码 + 去登录链接 | 密码显示切换 |
| login | 账号(邮箱/昵称) + 密码 + 登录 + 忘记密码 + 去注册 | 
| verify | 验证码输入(大号居中) + 验证 + 重发 | 

**交互功能：**
- [x] 邮箱 OTP 注册流程（Supabase Auth）
- [x] 邮箱+密码 / 昵称+密码 双模式登录
- [x] 忘记密码（发送重置邮件）
- [x] 访客/游客模式跳过登录（`loadGuestDemoData`）
- [x] 自动创建家庭和成员记录（新用户首次验证后）
- [x] 错误处理（网络错误/密码错误/用户不存在等详细提示）
- [x] 密码显示/隐藏切换

---

## 三、辅助/工具页面（简要清单）

| 页面 | 行数 | 核心功能 |
|------|------|----------|
| **EditProfile.tsx** | 733行 | 头像/昵称/角色编辑 + AvatarSelector组件 |
| **EditReward.tsx** | 667行 | 奖励创建/编辑：名称/描述/成本/分类/图片/图标 |
| **AddMember.tsx** | 342行 | 添加家庭成员：昵称/角色/头像选择 |
| **SwitchProfile.tsx** | 258行 | 切换用户账户：成员列表选择 |
| **ContactUs.tsx** | 132行 | 联系我们 |
| **Feedback.tsx** | 266行 | 意见反馈表单 |
| **Import.tsx** | 166行 | 数据导入（从分享链接/文件） |
| **OnboardingGuide.tsx** | 10459行 | 新手引导流程（多步骤引导） |
| **Plans.tsx** | 363行 | 计划列表 |
| **PlanDetail.tsx** | 381行 | 计划详情 |
| **PlanWizard.tsx** | 939行 | 计划创建向导 |
| **TaskTemplates.tsx** | 349行 | 任务模板选择器 |
| **AdminInviteCodes.tsx** | 573行 | 管理员邀请码管理 |
| **SettingsSubPage.tsx** | 503行 | 设置子页面（基础/安全/通知等） |
| **History.tsx** | 101行 | 已在上面详述 |
| **AuthCallback.tsx** | 179行 | OAuth回调处理 |

---

## 四、小程序当前状态 vs Web端差距对照表

| # | Web端页面 | 小程序现状 | 差距等级 | 优先级 |
|---|-----------|-----------|---------|--------|
| 1 | Home（完整能量卡+排行榜+快捷操作+AI助手） | 有基础版但缺排行榜动画/快捷操作跳转/AI助手 | **中等** | P0 |
| 2 | Tasks（双视图+日历+三态详情面板+6个Modal） | 较完整但缺部分Modal/日历交互 | **小** | P0 |
| 3 | Rewards（7分类+兑换流程+庆祝动画） | 有基础版缺分类/庆祝动画 | **中等** | P0 |
| 4 | Profile（导入导出+深色模式+菜单组） | 有基础版缺导入导出/深色模式 | **中等** | P1 |
| 5 | PublishTask（双模式+6个Modal+模板+重复设置） | **严重不足** | **巨大** | P0 |
| 6 | CheckIn（超大打卡按钮+粒子庆祝） | 有基础版缺粒子动画/视觉冲击力 | **中等** | P0 |
| 7 | History（余额卡+变更记录列表） | 缺失或极简 | **大** | P1 |
| 8 | PomodoroTimer（三阶段+SVG进度环+音效） | 缺失或极简 | **大** | P2 |
| 9 | ScheduleRecommend（AI 6步表单+结果展示） | 缺失 | **大** | P2 |
| 10 | QuadrantAnalysis（2×2网格+AI分析+日期筛选） | 有基础版 | **小** | P1 |
| 11 | CalendarSync（设备检测+ICS导入导出+8品牌引导） | 缺失 | **大** | P2 |
| 12 | HabitRewards（奖励/惩罚双Tab+习惯打卡+庆祝） | 缺失 | **大** | P1 |
| 13 | MemberDetail（星星编辑+任务列表+删除） | 缺失或极简 | **大** | P1 |
| 14 | Welcome（OTP注册+双模式登录+游客模式） | 有基础版 | **小** | P0 |
| 15 | EditProfile | 缺失 | **中** | P1 |
| 16 | EditReward | 缺失 | **中** | P1 |
| 17 | AddMember | 缺失 | **中** | P1 |
| 18 | SwitchProfile | 缺失 | **中** | P1 |
| 19 | OnboardingGuide | 缺失 | **低** | P2 |
| 20 | Plans/PlanDetail/PlanWizard | 缺失 | **中** | P2 |
| 21 | TaskTemplates | 缺失 | **中** | P0 |
| 22 | AdminInviteCodes | 缺失 | **低** | P2 |
| 23 | Feedback | 缺失 | **小** | P2 |
| 24 | ContactUs | 缺失 | **小** | P2 |
| 25 | Import | 缺失 | **中** | P1 |
| 26 | SettingsSubPages | 部分 | **中** | P1 |

---

## 五、100%复刻执行路线图

### Phase 1：核心闭环（P0 — 必须完成）
**目标：** 用户可完成完整的 注册→创建任务→打卡→兑换奖励 流程

1. **Welcome 页面升级** — 补齐 OTP 验证/忘记密码/错误提示细节
2. **PublishTask 全面重建** — 双模式(target/habit) + 重复设置Modal + 时段选择器 + 分类/标签管理 + 图标选择器 + 模板选择器
3. **Home 页面补全** — 能量卡动画/排行榜(3人领奖台)/快捷操作正确跳转/AI麦克风入口
4. **Tasks 页面完善** — 日历视图完整交互/任务详情面板三态操作/删除确认Modal
5. **CheckIn 视觉升级** — 超大打卡按钮(288px)/粒子庆祝动画/任务概览卡优化
6. **Rewards 分类系统** — 7个分类Tab/兑换流程/庆祝动画/余额不足进度条
7. **TaskTemplates 模板选择器** — 从 PublishTask 中抽离的独立页面

### Phase 2：用户体验增强（P1）
8. **History 星星足迹** — 余额卡 + 变更记录列表 + 图标映射
9. **Profile 个人中心** — 导入导出功能/深色模式Toggle/家庭成员管理
10. **MemberDetail 成员详情** — 星星加减/任务列表/删除
11. **HabitRewards 好习惯** — 奖励/惩罚双Tab + 习惯打卡 + 庆祝
12. **EditProfile/EditReward/AddMember** — CRUD 表单页
13. **SwitchProfile** — 用户切换
14. **QuadrantAnalysis** — 完善 AI 分析展示
15. **Import 数据导入** — 分享链接/文件导入

### Phase 3：高级功能（P2）
16. **PomodoroTimer 番茄钟** — 完整三阶段计时/SVG进度/音效
17. **ScheduleRecommend AI推荐** — 6步表单 + AI 生成 + 结果展示
18. **CalendarSync 日历同步** — ICS 导入导出/设备检测/品牌引导
19. **Plans/PlanWizard 计划系统** — 计划创建向导
20. **OnboardingGuide** — 新手引导
21. **AdminInviteCodes/Fedback/ContactUs** — 管理/反馈/联系

---

## 六、关键技术实现要求

### 1. 共享组件库（必须提取）
```typescript
// 小程序需要复刻的 Web 组件：
- TaskCard        // 任务卡片（统一的视觉样式）
- TextAvatar      // 文字/图片头像
- CelebrationAnimation // 庆祝动画（打卡/兑换/习惯完成）
- VoiceAssistant   // AI 语音助手弹窗
- ConfirmDialog    // 二次确认弹窗
- Toast           // 全局 Toast 提示
```

### 2. 状态管理（FamilyContext 对齐）
```typescript
// 必须与 Web 端保持一致的 state 结构：
interface FamilyContextType {
  currentUser, members, tasks, rewards, history, stars, familyId
  // 操作方法：
  addTask, updateTask, deleteTask, completeTask, approveTask
  redeemReward, addMember, deleteMember, updateMember
  setIsUserSelectorOpen, logout, toggleDarkMode
}
```

### 3. 设计系统一致性
- 配色完全跟随 Material Design 3 的 token system（--color-primary 等）
- 圆角规范：大卡 `[2-2.5rem]` / 按钮 `rounded-full` / Modal `rounded-[2.5rem]`
- 字体：标题 `font-black` / 正文 `font-bold` / 标签 `font-black text-[10px]`
- 动画：Framer Motion → Taro 内置动画 API / CSS transition
- 毛玻璃效果：`backdrop-blur-xl bg-surface/80`

### 4. i18n 国际化
- 使用 `useTranslation` hook
- 所有用户可见文本必须走 `t('key', {defaultValue})`
- 支持 zh-CN / en 切换

### 5. API 层对齐
- Supabase client 复用（已封装在 `utils/supabase.ts`）
- RPC 函数：`increment_stars`, `decrement_stars`
- 批量导入：`bulkImport`
- 日历订阅：`getCalendarSubscriptions`, `createCalendarSubscription`, `deleteCalendarSubscription`

---

## 七、验收标准

每个页面完成后必须满足：

1. **功能对齐度**：与 Web 端功能点逐一对照，无缺失
2. **视觉还原度**：截图对比，布局/配色/间距/字体一致
3. **交互完整性**：所有按钮/输入/Modal/跳转正常工作
4. **数据流正确性**：API调用参数正确、state 更新及时、错误处理完善
5. **边界情况**：空状态/加载态/错误态/网络异常均有处理
6. **性能**：首屏加载 < 3s、操作响应 < 200ms、无明显卡顿

---

*文档结束。下一步应针对 Phase 1 的每个页面逐一实现。*
