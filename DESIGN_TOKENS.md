# Forest Family - 跨平台统一设计令牌 (Design Tokens)

> **基准版本**: Web (Tailwind CSS)
> **目标**: 小程序、Android、iOS 三端完全统一

## 🎨 颜色系统 (Color Palette)

### 主色 (Primary)
| 用途 | Web (Tailwind) | 小程序 (SCSS) | Android (Compose) | iOS (Swift) |
|------|----------------|----------------|-------------------|-------------|
| Primary | `#006e1c` | `#006e1c` | `0xFF006e1c` | `#006e1c` |
| Primary Container | `#4caf50` | `#4caf50` | `0xFF4caf50` | `#4caf50` |

### 辅助色 (Secondary)
| 用途 | Web (Tailwind) | 小程序 (SCSS) | Android (Compose) | iOS (Swift) |
|------|----------------|----------------|-------------------|-------------|
| Secondary | `#686000` | `#686000` | `0xFF686000` | `#686000` |
| Secondary Container | `#f0e269` | `#f0e269` | `0xFFf0e269` | `#f0e269` |

### 背景与表面 (Background & Surface)
| 用途 | Light Mode | Dark Mode |
|------|------------|-----------|
| Background | `#fbf9f5` | `#1b1c1a` |
| Surface | `#fbf9f5` | `#1b1c1a` |
| Surface Container Low | `#f5f3ef` | `#242522` |
| Surface Container | `#efeeea` | `#2b2c29` |
| Surface Container High | `#eae8e4` | `#31322f` |
| Surface Container Highest | `#e4e2de` | `#373834` |

### 文字颜色 (Text Colors)
| 用途 | Light Mode | Dark Mode |
|------|------------|-----------|
| On Surface (Primary Text) | `#1b1c1a` | `#e4e2de` |
| On Surface Variant (Secondary Text) | `#3f4a3c` | `#becab9` |

### 边框与轮廓 (Outline)
| 用途 | Light Mode | Dark Mode |
|------|------------|-----------|
| Outline | `#6f7a6b` | `#6f7a6b` |
| Outline Variant | `#becab9` | `#becab9` |

### 四象限颜色 (Quadrant Colors)
| 象限 | 颜色 | 说明 |
|------|------|------|
| Q1 (重要且紧急) | `#E57373` | 红色 |
| Q2 (重要不紧急) | `#64B5F6` | 蓝色 |
| Q3 (不重要但紧急) | `#FFD54F` | 黄色 |
| Q4 (不重要不紧急) | `#90A4AE` | 灰色 |

### 状态颜色 (Status Colors)
| 状态 | 颜色 |
|------|------|
| Pending (待处理) | `#FFB74D` |
| In Progress (进行中) | `#4FC3F7` |
| Reviewing (审核中) | `#BA68C8` |
| Completed (已完成) | `#81C784` |

---

## 📝 字体系统 (Typography)

### 字体族 (Font Families)
| 用途 | 字体名称 | 回退字体 |
|------|----------|----------|
| Sans (正文) | "Inter", "Plus Jakarta Sans" | ui-sans-serif, system-ui |
| Display (标题) | "Plus Jakarta Sans" | sans-serif |
| Handwritten (手写) | "Long Cang" | cursive |
| Artistic (艺术) | "ZCOOL XiaoWei" | serif |

### 字号规范 (Font Sizes)
| 级别 | 大小 (Web) | 大小 (小程序/rpx) | 大小 (Android/sp) | 大小 (iOS/pt) |
|------|------------|-------------------|-------------------|----------------|
| H1 | 36px | 72rpx | 36sp | 36pt |
| H2 | 30px | 60rpx | 30sp | 30pt |
| H3 | 24px | 48rpx | 24sp | 24pt |
| H4 | 20px | 40rpx | 20sp | 20pt |
| Body Large | 18px | 36rpx | 18sp | 18pt |
| Body Medium | 16px | 32rpx | 16sp | 16pt |
| Body Small | 14px | 28rpx | 14sp | 14pt |
| Caption | 12px | 24rpx | 12sp | 12pt |

### 字重 (Font Weights)
| 用途 | 字重 |
|------|------|
| Regular | 400 |
| Medium | 500 |
| Semibold | 600 |
| Bold | 700 |

---

## 📏 间距系统 (Spacing)

| Token | Web (Tailwind) | 小程序 (rpx) | Android (dp) | iOS (pt) |
|-------|----------------|---------------|---------------|----------|
| spacing-1 | 4px | 8rpx | 4dp | 4pt |
| spacing-2 | 8px | 16rpx | 8dp | 8pt |
| spacing-3 | 12px | 24rpx | 12dp | 12pt |
| spacing-4 | 16px | 32rpx | 16dp | 16pt |
| spacing-5 | 20px | 40rpx | 20dp | 20pt |
| spacing-6 | 24px | 48rpx | 24dp | 24pt |
| spacing-8 | 32px | 64rpx | 32dp | 32pt |
| spacing-10 | 40px | 80rpx | 40dp | 40pt |
| spacing-12 | 48px | 96rpx | 48dp | 48pt |
| spacing-16 | 64px | 128rpx | 64dp | 64pt |

---

## 🔲 圆角系统 (Border Radius)

| Token | Web (Tailwind) | 小程序 (rpx) | Android (dp) | iOS (pt) |
|-------|----------------|---------------|---------------|----------|
| radius-sm | 4px | 8rpx | 4dp | 4pt |
| radius-md | 8px | 16rpx | 8dp | 8pt |
| radius-lg | 12px | 24rpx | 12dp | 12pt |
| radius-xl | 16px | 32rpx | 16dp | 16pt |
| radius-2xl | 24px | 48rpx | 24dp | 24pt |
| radius-full | 9999px | 9999rpx | 9999dp | 9999pt |

---

## 🃏 阴影系统 (Shadows)

### Light Mode
```
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1)
```

### Dark Mode
```
shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3)
shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.4)
shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.5)
```

---

## 📱 断点与布局 (Breakpoints & Layout)

| 断点 | 宽度 | 说明 |
|------|------|------|
| sm | 640px | 平板竖屏 |
| md | 768px | 平板横屏 |
| lg | 1024px | 桌面小屏 |
| xl | 1280px | 桌面标准 |
| 2xl | 1536px | 桌面大屏 |

### 安全区域 (Safe Area)
- Top: 44px (iOS Status Bar)
- Bottom: 34px (iOS Home Indicator)
- Horizontal: 16px (Mobile), 24px (Tablet), 32px (Desktop)

---

## 🔧 组件规范 (Component Specifications)

### 按钮 (Buttons)

#### Primary Button
```scss
// Web (Tailwind)
@apply bg-primary text-white rounded-full px-6 py-3 font-semibold;

// 小程序
background: $primary-color;
color: white;
border-radius: 48rpx;
padding: 20rpx 40rpx;
font-size: 32rpx;
font-weight: 600;

// Android (Compose)
Button(
    colors = ButtonDefaults.buttonColors(containerColor = ForestGreen),
    shape = RoundedCornerShape(24.dp)
) { ... }

// iOS (SwiftUI)
Button(action: {}) {
    Text("Button")
        .padding(.horizontal, 24)
        .padding(.vertical, 12)
}
.background(Color.primary)
.clipShape(Capsule())
```

#### Secondary Button
```scss
// Web (Tailwind)
@apply bg-transparent text-primary border-2 border-primary rounded-full px-6 py-3 font-semibold;

// 小程序
background: transparent;
color: $primary-color;
border: 2rpx solid $primary-color;
border-radius: 48rpx;
```

### 卡片 (Cards)
```scss
// Web (Tailwind)
@apply bg-surface-container-low rounded-2xl p-6 shadow-sm;

// 小程序
background: $card-bg;
border-radius: 24rpx;
padding: 24rpx;
box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
```

### 输入框 (Text Fields)
```scss
// Web (Tailwind)
@apply border-2 border-outline-variant rounded-lg px-4 py-3 focus:border-primary;

// 小程序
border: 2rpx solid $border-color;
border-radius: 16rpx;
padding: 16rpx 24rpx;
```

---

## 🌗 深色模式 (Dark Mode) 适配清单

### 自动适配原则
1. 所有颜色必须使用语义化 Token，禁止硬编码色值
2. 图片资源需要提供 Light/Dark 两套版本
3. 阴影在深色模式下需要加深

### 各端实现方式
- **Web**: `class="dark:bg-background"`
- **小程序**: `data-theme="{{theme}}"` + CSS 变量切换
- **Android**: `ui.theme.Theme.kt` + `isSystemInDarkTheme()`
- **iOS**: `UITraitCollection` + `userInterfaceStyle`

---

## ✅ 一致性检查清单

### 颜色
- [ ] 所有硬编码颜色已替换为 Design Token
- [ ] 三端主色完全一致 (`#006e1c`)
- [ ] 深色模式颜色正确映射

### 字体
- [ ] 字体族一致
- [ ] 字号阶梯一致
- [ ] 行高一致 (1.5)

### 间距
- [ ] 所有 margin/padding 使用间距 Token
- [ ] 三端间距视觉效果一致

### 圆角
- [ ] 按钮圆角一致 (48rpx / 24dp / 24pt)
- [ ] 卡片圆角一致 (24rpx / 12dp / 12pt)

### 组件
- [ ] 按钮样式一致
- [ ] 卡片样式一致
- [ ] 输入框样式一致
- [ ] 列表项样式一致

---

## 🚀 实施计划

### Phase 1: 设计 Token 同步 (第1天)
- [ ] 更新小程序 SCSS 变量
- [ ] 更新 Android Color.kt
- [ ] 创建 iOS Color Extension
- [ ] 更新 Web index.css (已完成)

### Phase 2: 组件库统一 (第2-3天)
- [ ] 创建跨平台组件规范文档
- [ ] 小程序组件重构
- [ ] Android Composable 重构
- [ ] iOS SwiftUI View 重构

### Phase 3: 页面级一致性 (第4-5天)
- [ ] Welcome 页面三端一致
- [ ] Home 页面三端一致
- [ ] Tasks 页面三端一致
- [ ] Profile 页面三端一致

### Phase 4: 测试与验收 (第6天)
- [ ] 视觉回归测试
- [ ] 跨平台截图对比
- [ ] 签字确认

---

**创建时间**: 2026-04-30
**负责人**: AI Agent (多Agent协作)
**状态**: 🚧 进行中
