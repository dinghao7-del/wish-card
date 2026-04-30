package com.forestfamily.app.ui.theme

import androidx.compose.ui.graphics.Color

// Forest Family - 跨平台统一设计Token
// 与Web (Tailwind CSS)、微信小程序、iOS 保持完全一致

// Primary Colors - 与Web `--color-primary` 一致
val Primary = Color(0xFF006e1c)
val PrimaryLight = Color(0xFF4caf50)  // Primary Container
val PrimaryDark = Color(0xFF005a15)

// Secondary Colors - 与Web `--color-secondary` 一致
val Secondary = Color(0xFF686000)
val SecondaryLight = Color(0xFFf0e269)  // Secondary Container
val SecondaryDark = Color(0xFF4a4400)

// Background & Surface Colors - Light Mode
val BackgroundLight = Color(0xFFfbf9f5)  // --color-background
val SurfaceLight = Color(0xFFfbf9f5)     // --color-surface
val SurfaceContainerLow = Color(0xFFf5f3ef)
val SurfaceContainer = Color(0xFFefeeea)
val SurfaceContainerHigh = Color(0xFFeae8e4)
val SurfaceContainerHighest = Color(0xFFe4e2de)

// Background & Surface Colors - Dark Mode
val BackgroundDark = Color(0xFF1b1c1a)
val SurfaceDark = Color(0xFF1b1c1a)
val SurfaceContainerLowDark = Color(0xFF242522)
val SurfaceContainerDark = Color(0xFF2b2c29)
val SurfaceContainerHighDark = Color(0xFF31322f)
val SurfaceContainerHighestDark = Color(0xFF373834)

// Text Colors
val TextPrimary = Color(0xFF1b1c1a)      // --color-on-surface (Light)
val TextPrimaryDark = Color(0xFFe4e2de)  // --color-on-surface (Dark)
val TextSecondary = Color(0xFF3f4a3c)     // --color-on-surface-variant (Light)
val TextSecondaryDark = Color(0xFFbecab9) // --color-on-surface-variant (Dark)
val TextOnPrimary = Color(0xFFFFFFFF)

// Outline Colors
val Outline = Color(0xFF6f7a6b)
val OutlineVariant = Color(0xFFbecab9)

// Quadrant Colors (保持不变)
val Q1Red = Color(0xFFE57373)       // 重要且紧急
val Q2Blue = Color(0xFF64B5F6)       // 重要不紧急
val Q3Yellow = Color(0xFFFFD54F)     // 不重要但紧急
val Q4Gray = Color(0xFF90A4AE)       // 不重要不紧急

// Status Colors (保持不变)
val StatusPending = Color(0xFFFFB74D)
val StatusInProgress = Color(0xFF4FC3F7)
val StatusReviewing = Color(0xFFBA68C8)
val StatusCompleted = Color(0xFF81C784)

// Role Colors (保持不变)
val ParentColor = Color(0xFF5C6BC0)
val ChildColor = Color(0xFF26A69A)

// Quick Action Colors (保持不变)
val QuickActionYellow = Color(0xFFFFF9C4)  // 创建任务
val QuickActionOrange = Color(0xFFFFE0B2)  // 许愿
val QuickActionPurple = Color(0xFFE1BEE7)  // 日历
val QuickActionGreen = Color(0xFFC8E6C9)   // 番茄钟

// ============================================
// 向后兼容别名 (Backward Compatibility Aliases)
// 确保现有代码引用 ForestGreen 等旧名称时不会编译错误
// ============================================
val ForestGreen = Primary
val ForestGreenLight = PrimaryLight
val ForestGreenDark = PrimaryDark
val StarGold = Secondary
val StarGoldLight = SecondaryLight
val StarGoldDark = SecondaryDark
