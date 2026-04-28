# Forest Family - AI Studio 代码生成完整指南

## 📋 项目概述

**项目名称**: Forest Family（森林家庭）
**主题风格**: 清新森林版 🌲
**技术栈**: Flutter + GetX + SQLite

---

## 🎨 设计系统规范

### 颜色配置

```dart
// 主色系 - 森林绿
primaryColor: Color(0xFF2E7D32)        // 主绿色
primaryLight: Color(0xFF4CAF50)       // 浅绿色
primaryDark: Color(0xFF1B5E20)        // 深绿色

// 强调色 - 阳光黄
accentColor: Color(0xFFFFD54F)        // 星星/积分色
accentOrange: Color(0xFFFF9800)        // 橙色强调

// 中性色
backgroundColor: Color(0xFFF5F5F0)     // 米白背景
cardColor: Colors.white               // 卡片白色
textPrimary: Color(0xFF333333)        // 主文字
textSecondary: Color(0xFF757575)       // 次要文字
textHint: Color(0xFFBDBDBD)           // 提示文字

// 状态色
successColor: Color(0xFF4CAF50)       // 成功绿
warningColor: Color(0xFFFF9800)       // 警告橙
errorColor: Color(0xFFF44336)         // 错误红
```

### 尺寸规范

```dart
// 圆角
borderRadiusSmall: 8.0               // 小按钮/输入框
borderRadiusMedium: 12.0              // 卡片
borderRadiusLarge: 16.0               // 大卡片
borderRadiusRound: 24.0                // 圆角按钮
borderRadiusCircle: 100.0              // 圆形

// 间距
spacingXS: 4.0
spacingS: 8.0
spacingM: 12.0
spacingL: 16.0
spacingXL: 24.0
spacingXXL: 32.0

// 字体大小
fontSizeXS: 10.0
fontSizeS: 12.0
fontSizeM: 14.0
fontSizeL: 16.0
fontSizeXL: 18.0
fontSizeXXL: 24.0
fontSizeTitle: 28.0
```

---

## 📁 项目结构

```
lib/
├── main.dart                          # 入口文件
├── app/
│   ├── routes/                        # 路由配置
│   │   ├── app_pages.dart
│   │   └── app_routes.dart
│   ├── theme/                         # 主题配置
│   │   └── app_theme.dart
│   ├── bindings/                      # GetX 依赖注入
│   │   └── initial_binding.dart
│   └── translations/                  # 国际化
│       └── app_translations.dart
├── pages/                             # 页面
│   ├── home/                          # 首页
│   ├── calendar/                      # 日历
│   ├── task_list/                     # 任务列表
│   ├── task_detail/                   # 任务详情
│   ├── publish_task/                  # 发布任务
│   ├── check_in/                      # 打卡
│   ├── stars/                         # 星星积分
│   ├── shop/                          # 奖励商店
│   ├── exchange_success/              # 兑换成功
│   ├── meal_plan/                     # 餐食规划
│   ├── family_album/                  # 家庭相册
│   ├── profile/                       # 个人中心
│   └── user_switch/                   # 切换用户
├── widgets/                           # 公共组件
│   ├── app_bottom_nav.dart
│   ├── app_card.dart
│   ├── app_button.dart
│   ├── app_dialog.dart
│   ├── star_animator.dart
│   └── confetti_animation.dart
├── controllers/                       # GetX 控制器
│   ├── user_controller.dart
│   ├── task_controller.dart
│   ├── star_controller.dart
│   └── audio_controller.dart
└── services/                          # 服务层
    ├── database_service.dart
    ├── speech_service.dart
    └── notification_service.dart
```

---

## 🤖 AI Studio 完整 Prompt

### 核心 Prompt（复制到 Claude Code 使用）

---

```
# Forest Family - Flutter 代码生成任务

## 项目背景

生成一个名为 "Forest Family" 的儿童任务管理 App，使用清新森林主题。App 让小朋友通过完成任务获得星星积分，用积分兑换奖励。

## 设计规范

### 颜色系统
- 主色：森林绿 #2E7D32
- 强调色：阳光黄 #FFD54F
- 背景：米白 #F5F5F0
- 卡片：纯白 #FFFFFF
- 成功：#4CAF50
- 圆角：8px/12px/16px/24px

### 技术栈
- Flutter 3.x
- GetX（状态管理 + 路由）
- SQLite（本地数据库）
- 语音播报（Ollama + Whisper）

---

## 需要生成的页面（共13个）

请按以下顺序生成每个页面：

### 1. 首页/仪表盘 (首页 - 仪表盘 (清新森林版))

**布局结构：**
- 顶部：用户头像 + 用户名 + 星星数量徽章
- 今日概览卡片（打卡数量、待完成任务、已获星星）
- 快捷操作入口（发布任务、我的任务、打卡）
- 今日打卡列表（最多显示3个）
- 底部导航栏

**核心组件：**
- UserHeader: 用户信息头部
- TodayOverviewCard: 今日概览卡片
- QuickActionGrid: 快捷操作网格
- TodayTaskList: 今日任务列表
- BottomNavBar: 底部导航

---

### 2. 日历页 (日历页 (清新森林版))

**布局结构：**
- 顶部：月份切换（< 2026年4月 >）
- 月视图网格（7列 x 6行）
- 有任务的日期显示小圆点标记
- 选中日期展开显示任务列表
- 底部：日/周视图切换Tab

**核心组件：**
- CalendarHeader: 月份导航
- CalendarGrid: 日历网格
- CalendarDayCell: 日期单元格
- DayTaskList: 当日任务列表
- ViewSwitchTab: 视图切换

---

### 3. 任务列表页 (任务列表页 (清新森林版))

**布局结构：**
- 顶部：标题 + 筛选按钮
- Tab切换：全部 / 待打卡 / 已完成 / 已超时
- 任务卡片列表（支持滑动操作）
- 右滑删除、左滑标记完成
- 悬浮添加按钮

**核心组件：**
- TaskFilterTabs: 任务状态Tab
- TaskCard: 任务卡片
- TaskSwipeActions: 滑动操作
- FloatingAddButton: 悬浮添加按钮

---

### 4. 任务详情页 (任务详情页 (清新森林版))

**布局结构：**
- 顶部：返回按钮 + 任务标题 + 编辑按钮
- 任务状态标签（待完成/进行中/已完成）
- 任务描述卡片
- 任务图片（如果有）
- 相关时间（开始时间、截止时间）
- 执行人头像列表
- 关联打卡记录列表
- 底部操作栏（打卡/放弃/重新开始）

**核心组件：**
- TaskStatusBadge: 状态徽章
- TaskDescriptionCard: 任务描述
- TaskImageGallery: 图片展示
- TaskTimeline: 任务时间线
- AssigneeAvatars: 执行人头像
- CheckInRecordList: 打卡记录
- TaskActionBar: 操作栏

---

### 5. 发布任务页 (发布任务页 (清新森林版))

**布局结构：**
- 顶部：取消 + 发布任务标题 + 发布按钮
- 任务名称输入框
- 任务描述输入框（多行）
- 任务类型选择（日常/学习/奖励/自定义）
- 预计时长选择
- 开始时间选择
- 截止时间选择
- 执行人选择（多选家庭成员）
- 关联奖励选择
- 添加图片按钮
- 底部：保存草稿 / 立即发布

**核心组件：**
- TaskNameInput: 任务名称输入
- TaskTypeSelector: 任务类型选择器
- TimeRangePicker: 时间范围选择
- MemberSelector: 成员选择器
- RewardPicker: 奖励选择
- ImageUploader: 图片上传

---

### 6. 打卡操作页 (打卡操作页 (清新森林版))

**布局结构：**
- 顶部：返回 + 打卡标题
- 任务信息卡片（名称、描述、执行人）
- 打卡方式选择（拍照/语音/文字）
- 拍照打卡：相机预览 + 拍照按钮
- 语音打卡：录音按钮 + 波形动画
- 文字打卡：打卡内容输入框
- 提交按钮 + 取消按钮

**核心组件：**
- TaskInfoCard: 任务信息卡片
- CheckInMethodSelector: 打卡方式选择
- CameraPreview: 相机预览
- VoiceRecorder: 语音录制
- TextCheckInInput: 文字打卡输入
- CheckInSubmitButton: 提交按钮

---

### 7. 星星积分页 (星星积分页 (清新森林版))

**布局结构：**
- 顶部：我的星星（大数字显示）+ 总排行榜入口
- 本周获取星星图表
- 星星获取记录列表（时间线样式）
- 收支明细Tab切换（收入/支出）

**核心组件：**
- StarBalanceCard: 星星余额卡片
- StarChart: 星星统计图表
- StarHistoryList: 星星历史记录
- StarIncomeExpense: 收支明细

---

### 8. 奖励商店页 (奖励商店页 (清新森林版))

**布局结构：**
- 顶部：奖励商店标题 + 我的星星余额
- 分类Tab：全部 / 玩具 / 游戏 / 特权 / 美食
- 奖励卡片网格（2列）
- 每个卡片：图片 + 名称 + 所需星星 + 立即兑换按钮
- 底部：已兑换记录入口

**核心组件：**
- RewardGrid: 奖励网格
- RewardCard: 奖励卡片
- CategoryTabs: 分类Tab
- ExchangeButton: 兑换按钮

---

### 9. 兑换成功页 (兑换成功页 (清新森林版))

**布局结构：**
- 全屏庆祝动画（纸屑/烟花效果）
- 大图标：✓ 成功
- 主标题：恭喜兑换成功！
- 副标题：奖励已添加到您的账户
- 奖励信息卡片
- 继续探索按钮
- 查看我的奖励按钮

**核心组件：**
- ConfettiAnimation: 彩纸动画
- SuccessIcon: 成功图标动画
- RewardInfoCard: 奖励信息卡片
- ActionButtons: 操作按钮组

---

### 10. 餐食规划页 (餐食规划页 (清新森林版))

**布局结构：**
- 顶部：餐食规划标题
- 周视图Tab（周一 ~ 周日）
- 每日三餐规划（早餐/午餐/晚餐）
- 每个餐食槽：图标 + 名称 + 添加按钮
- 营养小贴士卡片
- 底部：保存本周计划按钮

**核心组件：**
- WeekDayTabs: 星期Tab
- MealSlot: 餐食槽
- MealTypeSelector: 餐食类型
- NutritionTipCard: 营养提示
- SavePlanButton: 保存按钮

---

### 11. 家庭相册页 (家庭相册页 (清新森林版))

**布局结构：**
- 顶部：家庭相册标题 + 添加按钮
- 相册分类Tab：全部 / 任务打卡 / 奖励时刻 / 日常记录
- 照片网格瀑布流布局
- 点击照片进入查看详情
- 查看详情：大图 + 时间 + 描述 + 点赞 + 评论

**核心组件：**
- PhotoGrid: 照片网格
- PhotoCategoryTabs: 分类Tab
- PhotoCard: 照片卡片
- PhotoDetailView: 照片详情
- AddPhotoButton: 添加照片

---

### 12. 个人中心页 (个人中心页 (清新森林版))

**布局结构：**
- 顶部：用户头像（可编辑）+ 用户名 + 星星徽章
- 功能菜单列表：
  - 我的资料
  - 家庭成员管理
  - 语音设置
  - 消息通知
  - 隐私设置
  - 关于我们
  - 退出登录
- 底部：版本号

**核心组件：**
- ProfileHeader: 个人资料头部
- MenuList: 功能菜单列表
- MenuItem: 菜单项
- SettingsGroup: 设置分组

---

### 13. 切换用户页 (切换用户页 (清新森林版))

**布局结构：**
- 顶部：关闭按钮 + 切换用户标题
- 当前用户大卡片（居中显示）
- 其他家庭成员横向排列
- 添加新成员按钮
- 切换确认按钮
- 儿童模式/家长模式提示

**核心组件：**
- CurrentUserCard: 当前用户卡片
- FamilyMemberList: 家庭成员列表
- MemberAvatar: 成员头像
- AddMemberButton: 添加成员按钮
- ModeIndicator: 模式指示器

---

## 底部导航栏（共5个Tab）

```
┌─────┬─────┬─────┬─────┬─────┐
│ 首页 │ 任务 │ 打卡 │ 奖励 │ 我的 │
│ 🏠  │ 📋  │ ✅  │ ⭐  │ 👤  │
└─────┴─────┴─────┴─────┴─────┘
```

**导航配置：**
```dart
bottomNavItems: [
  BottomNavItem(page: HomePage, icon: Icons.home, label: '首页'),
  BottomNavItem(page: TaskListPage, icon: Icons.checklist, label: '任务'),
  BottomNavItem(page: CheckInPage, icon: Icons.check_circle, label: '打卡'),
  BottomNavItem(page: ShopPage, icon: Icons.star, label: '奖励'),
  BottomNavItem(page: ProfilePage, icon: Icons.person, label: '我的'),
]
```

---

## 数据模型

### User
```dart
class User {
  String id;
  String name;
  String avatar;
  int starBalance;
  String role; // 'parent' | 'child'
}
```

### Task
```dart
class Task {
  String id;
  String title;
  String description;
  String type; // 'daily' | 'study' | 'reward' | 'custom'
  DateTime startTime;
  DateTime deadline;
  List<String> assigneeIds;
  int rewardStars;
  String status; // 'pending' | 'in_progress' | 'completed' | 'expired'
  List<String> images;
}
```

### CheckIn
```dart
class CheckIn {
  String id;
  String taskId;
  String userId;
  String type; // 'photo' | 'voice' | 'text'
  String content;
  DateTime timestamp;
}
```

### Reward
```dart
class Reward {
  String id;
  String name;
  String image;
  int starCost;
  String category; // 'toy' | 'game' | 'privilege' | 'food'
  String description;
}
```

---

## 输出要求

1. 每个页面生成独立的 Dart 文件
2. 使用 GetX Controller 管理状态
3. 代码包含中文注释
4. 支持响应式布局
5. 包含页面路由配置
6. 动画效果使用 Flutter 内置动画
7. 导出所有必要的组件和控制器
```

---

## 🔧 使用方法

### Step 1：打开 Claude Code

在项目目录下打开终端：
```bash
cd ~/projects/forest_family
claude
```

### Step 2：复制 Prompt

复制上述完整 Prompt，粘贴到 Claude Code 输入框

### Step 3：分批生成

建议分 3 批生成：
- **第一批**：基础框架 + 首页 + 导航
- **第二批**：核心页面（任务相关）
- **第三批**：功能页面（商店、相册等）

### Step 4：组装验证

生成完成后，在 Flutter 项目中组装并运行：
```bash
flutter pub get
flutter run
```

---

## ⚠️ 注意事项

1. **图片资源**：代码中的图片使用占位符，需要替换为实际图片
2. **语音功能**：语音打卡需要配置 Ollama + Whisper
3. **数据库**：使用 SQLite，需要初始化数据库表
4. **动画**：部分复杂动画需要调整参数

---

## 📞 遇到问题？

如果生成过程中有问题，请告诉我：
1. 哪个页面出错
2. 错误信息截图
3. 具体的修改需求

我会帮你调整 Prompt 或直接修复代码。
