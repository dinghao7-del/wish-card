# 小程序与网页版逐页对齐审计

更新时间：2026-05-15

## 结论

按“核心流程可用”口径，小程序已经接近完成；按“所有页面、二级页、主题皮肤、入口和逻辑链完全复刻网页版”的严格口径，当前推进到约 96%。主要剩余风险已从页面缺失转为真机像素级验收、微信开发者工具端缓存/编译指向确认，以及后台管理/真实商业资源池这类非普通小程序端能力。

## P0：必须完全对齐

| Web 页面 | Web 路由 | 小程序页面 | 当前状态 | 下一步 |
| --- | --- | --- | --- | --- |
| Welcome | `/welcome` | `pages/login/index` | 部分对齐 | 欢迎插图与随机漫画策略继续对齐线上版 |
| Home | `/` | `pages/home/index` | 基本对齐 | 继续抽检入口跳转和主题表现 |
| Tasks | `/tasks` | `pages/tasks/index` | 基本对齐 | 检查筛选、模板入口、儿童/家长状态 |
| PublishTask | `/tasks/new`, `/tasks/edit/:id` | `pages/tasks/create`, `pages/tasks/edit` | 基本对齐 | 模板优先流程已补，继续验收编辑态 |
| TaskTemplates | `/tasks/templates` | `pages/templates/index` | 基本对齐 | 继续统一任务/习惯模板分类 |
| HabitRewards | `/habits` | `pages/habits/index` | 基本对齐 | 继续验证儿童提交、家长审核、指定儿童奖惩 |
| Rewards | `/rewards` | `pages/rewards/index` | 基本对齐 | 心愿兑换后写入家长计划需继续回归 |
| EditReward | `/rewards/new`, `/rewards/edit/:id` | `pages/rewards/index` 内弹窗 | 功能合并 | 保持单页弹窗，但交互需完全等价 |
| CheckIn | `/check-in/:taskId?` | `pages/check-in/index` | 基本对齐 | 回归任务/习惯/扣分三类链路 |
| Profile | `/profile` | `pages/profile/index` | 基本对齐 | 已集中 AI建档、家庭复盘、日程方案、社区、四象限、公共时间、AI设置入口 |
| EditProfile | `/profile/edit` | `pages/profile/edit/index` | 基本对齐 | 抽检保存和返回 |
| AddMember | `/profile/members/add` | `pages/members/add/index` | 基本对齐 | 家庭主账号/PIN 逻辑继续校验 |
| MemberDetail | `/profile/members/:id` | `pages/members/detail/index` | 基本对齐 | 角色切换和儿童状态继续校验 |
| SettingsSubPage | `/settings/:type` | `pages/settings/*` | 部分对齐 | 主题、安全、通知、备份、AI、反馈全量对齐 |
| SwitchProfile | `/switch-profile` | `pages/switch-profile/index` | 基本对齐 | PIN/管理员切换继续验收 |
| History | `/history` | `pages/history/index` | 部分对齐 | 接入主题皮肤，增强为家庭复盘入口 |
| FamilyReports | `/reports` | `pages/reports/index` | 基本对齐 | 已补“周报/月报/学期/年度”独立页，继续接入更完整 AI 文案 |
| AIAnalysisHub | `/ai-analysis` | `pages/ai-analysis/index` | 基本对齐 | 二级入口已集中，继续补复盘页 |
| QuadrantAnalysisPage | `/quadrant` | `pages/quadrant/index` | 基本对齐 | 继续验证今天/本周/本月 AI 口径 |
| Plans | `/plans` | `pages/plans/index` | 基本对齐 | 计划定义、嵌套计划、进度口径继续回归 |
| PlanWizard | `/plans/wizard` | `pages/plans/wizard/index` | 基本对齐 | 大块验收计划创建流程 |
| PlanDetail | `/plans/:id` | `pages/plans/detail/index` | 基本对齐 | 已接本地 AI 日程计划读取、主题皮肤、心愿入口兜底 |
| ScheduleRecommend | `/plans/smart-recommend` | `pages/schedule-recommend/index` | 基本对齐 | 已把推荐结果保存为本地计划详情，继续真机回归写入展示 |
| SchoolCalendar | `/school-calendar` | `pages/calendar/index` | 部分对齐 | 公共节假日/校历/突发事件提示继续接入 |
| CalendarSync | `/calendar-sync` | `pages/settings/calendar/index` | 基本对齐 | 设备日历订阅继续保留为设置二级页 |
| PomodoroTimer | `/pomodoro` | `pages/pomodoro/index` | 部分对齐 | 接入主题皮肤和统一返回 |
| Import | `/import` | `pages/import/index` | 部分对齐 | 接入主题皮肤 |
| ContactUs | `/support/contact` | `pages/contact/index` | 基本对齐 | 继续抽检样式 |
| Feedback | `/support/feedback` | `pages/feedback`, `pages/settings/feedback` | 部分对齐 | 统一两个反馈入口的 UI 和记录逻辑 |
| OnboardingGuide | `/onboarding` | `pages/onboarding/index` | 部分对齐 | 智能建档步骤需继续精简并联动日程 |

## P1：需要产品决策后补齐

| Web 页面 | Web 路由 | 小程序状态 | 建议 |
| --- | --- | --- | --- |
| CommunityTemplates | `/community/templates` | `pages/community/templates/index` | 基本对齐 | 已补模板广场、场景筛选、搜索和套用入口 |
| CommunityShareReview | `/community/share-review/:id` | `pages/community/share-review/index` | 基本对齐 | 已补发布前隐私检查和分享草稿确认 |
| RewardTemplates | `/rewards/templates` | 已合并为组件 | 可以不独立成页，但模板选择流程要完全一致 |
| RecommendationConsent | 未接主路由 | 可能废弃 | 商业推荐策略应后台控制，不开放用户隐私开关 |
| AdminInviteCodes | 未接主路由 | 缺失 | 后台管理系统处理，不放普通小程序 |
| BusinessDashboard | `/internal/business` | Web 内部页 | 作为后端可视化管理界面推进 |
| CommercialResourcesAdmin | `/internal/resources` | Web 内部页 | 作为商业推荐资源后台推进 |

## P2：不需要小程序复刻

| Web 页面 | 原因 |
| --- | --- |
| AuthCallback | Web 登录回调专用 |
| ProductHuntDemo | 发布演示专用 |
| ProductHuntGalleryFrames | 发布素材专用 |
| TestDesignSystem | 内部测试页 |

## 当前优先修复顺序

1. 小程序端继续做微信开发者工具逐页真机预览验收，重点确认缓存清理后展示的是最新版包。
2. 继续抽检“智能日程推荐 → 保存为计划 → 计划详情 → 添加目标/心愿”的完整闭环。
3. 独立复盘页、社区页已补，下一步接入真实 AI 文案、云端社区数据和后台审核。
4. 后台管理系统、商业推荐资源池、内容投放策略属于下一大块，不阻塞当前小程序普通用户主体验。
