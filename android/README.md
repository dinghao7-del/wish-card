# Forest Family Android App

家庭任务管理应用的 Android 原生客户端

## 项目概述

Forest Family 是一款面向家庭的任务管理应用，帮助家庭成员通过任务、习惯和奖励系统培养孩子的责任感和好习惯。

## 技术栈

- **语言**: Kotlin 1.9+
- **UI框架**: Jetpack Compose (Material 3)
- **架构**: MVVM + Clean Architecture
- **依赖注入**: Hilt
- **网络层**: Supabase Kotlin SDK
- **状态管理**: StateFlow / Compose State
- **导航**: Compose Navigation
- **本地存储**: DataStore Preferences

## 项目结构

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/com/forestfamily/app/
│   │   │   ├── data/
│   │   │   │   ├── model/          # 数据模型 (Family, Member, Task, Habit, Reward)
│   │   │   │   ├── remote/          # Supabase 客户端
│   │   │   │   └── repository/      # Repository (Family, Task, Reward)
│   │   │   ├── di/                  # Hilt 依赖注入模块
│   │   │   ├── ui/
│   │   │   │   ├── theme/           # Compose 主题 (颜色、字体)
│   │   │   │   ├── components/      # 通用组件
│   │   │   │   ├── navigation/      # 导航定义和 NavHost
│   │   │   │   ├── auth/            # 认证模块 (欢迎页、登录、创建/加入家庭)
│   │   │   │   ├── home/            # 首页 (今日概览、四象限分析)
│   │   │   │   ├── tasks/           # 任务模块 (列表、创建、详情)
│   │   │   │   ├── habits/          # 习惯模块 (打卡、创建)
│   │   │   │   ├── rewards/         # 奖励模块 (商店、兑换)
│   │   │   │   └── profile/         # 个人中心
│   │   │   └── MainActivity.kt
│   │   └── res/
│   └── build.gradle.kts
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
└── gradlew
```

## 核心功能

### 1. 用户认证
- 家庭创建/加入
- 成员切换（家长/孩子模式）
- PIN 码保护

### 2. 任务管理
- 创建/编辑/删除任务
- 任务分配给家庭成员
- 四象限优先级分类
- 星星奖励系统

### 3. 习惯打卡
- 创建每日/每周习惯
- 打卡记录
- 目标追踪

### 4. 奖励兑换
- 创建奖励物品
- 用星星兑换奖励
- 家长审批流程

### 5. 实时同步
- Supabase 实时订阅
- 多设备数据同步

## 数据模型 (对应 Supabase 表)

| 表名 | 说明 |
|------|------|
| families | 家庭信息 |
| members | 家庭成员 |
| tasks | 任务 |
| habits | 习惯 |
| rewards | 奖励 |
| star_transactions | 星星流水 |

## 环境配置

创建 `app/src/main/res/values/secrets.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="supabase_url">YOUR_SUPABASE_URL</string>
    <string name="supabase_anon_key">YOUR_SUPABASE_ANON_KEY</string>
</resources>
```

## 开发指南

### 运行项目
```bash
# 使用 Android Studio 打开项目
# 或使用命令行
./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

### 代码规范
- 使用 Kotlin Coroutines 处理异步操作
- ViewModel 管理 UI 状态
- Repository 模式封装数据访问
- Compose 函数尽量保持简洁

## 参考文档

- [Supabase Kotlin SDK](https://github.com/supabase-community/supabase-kt)
- [Jetpack Compose 文档](https://developer.android.com/compose)
- [Hilt 依赖注入](https://developer.android.com/training/dependency-injection/hilt-android)

## License

Proprietary - All rights reserved
