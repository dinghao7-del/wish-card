# Forest Family - 长期记忆

## 头像系统（2026-04-28 第二次更新）

- 头像采用 **AI 生成的本地 PNG 亚洲风卡通头像**，共 40 个
- 目录结构：`public/avatars/boy/`（10个）、`girl/`（10个）、`parent/`（10个）、`grandparent/`（10个）
- `templates.ts` 定义 4 组头像数组：
  - `BOY_AVATARS`（男孩 10）+ `GIRL_AVATARS`（女孩 10）
  - `PARENT_AVATARS`（父母 10：妈妈5 + 爸爸5）
  - `GRANDPARENT_AVATARS`（爷爷奶奶 10：奶奶5 + 爷爷5）
  - 兼容别名：`CHILD_AVATARS = BOY + GIRL`、`ADULT_AVATARS = PARENT + GRANDPARENT`
- `AvatarSelector.tsx` 弹窗有 4 个 Tab（男孩/女孩/父母/爷爷奶奶），每页显示 5 列网格
- `EditProfile.tsx` 有**自己独立的内嵌头像选择器**（之前遗漏的根因），已同步更新为 4 分类
- `FamilyContext.tsx` 默认成员头像已更新为 PNG 路径
- `AddMember.tsx` 默认头像函数已更新
- `Member.avatar` 字段存储本地路径字符串（如 `/avatars/boy/xxx.png`）

## 已知 P0 Bug
- ~~欢迎页无法关闭~~ ✅ 已修复（2026-04-28）：根因是 `setCurrentUser` 异步更新后立即 `navigate('/')`，Layout 在 currentUser 未更新的瞬间Redirect 回 /welcome。用 useEffect 监听 currentUser 变化后才执行导航解决。

## 任务模板库（TaskTemplateSelector）（2026-04-28 新建）
- **6 大分类**：学习(9) | 生活(9) | 兴趣(8) | 独立(8) | 表扬(30) | 批评(23)
- **共 87 个任务模板条目**，定义在 `src/lib/templates.ts`
- 图标目录：`public/task-icons/{study,life,hobby,independent,praise,critique}/`
- 全部使用 AI 生成的扁平化 kawaii 风格本地 PNG，100% 离线
- 数据结构：`HabitTemplate` 接口（id/title/description/category/stars/icon）
- 导出：`TASK_CATEGORIES`、`ALL_TASK_TEMPLATES`、各分类独立数组
- `TaskTemplateSelector.tsx` 已完全重写为使用本地图标 + 87 条数据
- 批评类 stars 为负数（扣分），表扬/学习等类 stars 为正数（奖励）
- React + TypeScript + Vite
- 状态管理：React Context + localStorage 持久化
- UI：Tailwind CSS + Lucide React 图标 + Framer Motion (motion/react)
- 运行端口：3000

## 心愿库系统（2026-04-28 新建）
- **6 大分类**：常用(4) | 体验(7) | 奖品(6) | 特权(5) | 成长(4) | 活动(23)
- **共 49 个心愿模板条目**，定义在 `src/lib/templates.ts`
- 图标目录：`public/reward-icons/{common,experience,prize,privilege,growth,activity}/`
- 全部使用 **AI 生成的扁平化 kawaii 风格本地 PNG**，100% 离线
- 数据结构：`RewardTemplate` 接口（id/name/description/cost/category/icon）
- 导出：`REWARD_CATEGORIES`、`ALL_REWARD_TEMPLATES`、各分类独立数组
- `EditReward.tsx` 心愿库弹窗已改造为：4列网格 + 6分类Tab切换
- `Rewards.tsx` 分类 Tab 已扩展为 7 个（全部+6分类）

## 用户偏好
- 以中文交流，要求深度技术分析
- 设计还原要求 100% 忠实原版
- 优先处理 P0 问题
- 控制台错误信息由用户主动提供
