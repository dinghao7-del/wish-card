# 愿望卡 (WishCard) — 设计系统文档

**文档版本**: v1.0  
**基准技术栈**: React 18 + TypeScript + Tailwind CSS + Material Design 3  
**更新日期**: 2026年4月30日

---

## 目录

1. [设计原则](#一设计原则)
2. [品牌标识](#二品牌标识)
3. [色彩系统](#三色彩系统)
4. [字体系统](#四字体系统)
5. [间距系统](#五间距系统)
6. [圆角与阴影](#六圆角与阴影)
7. [图标系统](#七图标系统)
8. [组件规范](#八组件规范)
9. [布局系统](#九布局系统)
10. [动画与过渡](#十动画与过渡)
11. [深色模式](#十一深色模式)
12. [页面级规范](#十二页面级规范)
13. [无障碍规范](#十三无障碍规范)
14. [多平台适配](#十四多平台适配)

---

## 一、设计原则

愿望卡的设计以"家庭温暖感"为核心情感基调，围绕以下四项原则展开：

### 1.1 温暖而不幼稚 (Warm, Not Childish)

界面应让孩子感受到趣味与激励，同时让家长觉得专业可信。避免过度卡通化，使用柔和的自然绿色系而非饱和度极高的纯色，通过恰当的留白和圆角传递亲切感。

### 1.2 正向激励优先 (Positive Reinforcement First)

视觉设计始终强化成就感：星星、进度条、庆祝动画是核心视觉语言。惩罚类（红色/扣分）元素在视觉重量上明显低于奖励类元素，不喧宾夺主。

### 1.3 清晰的信息层级 (Clear Hierarchy)

每个页面有且只有一个主操作（Primary Action）。信息按"今日状态 → 快速操作 → 详情内容"层次呈现。数字数据（星星数、进度）用大字号突出显示。

### 1.4 流畅、不打断 (Seamless Flow)

打卡、兑换、创建任务等核心流程步骤不超过 3 步。弹窗优先采用底部滑出（Bottom Sheet）而非全屏覆盖，保留上下文感知。

---

## 二、品牌标识

### 2.1 Logo

- **图形**: 嫩芽 🌱 象征成长与希望
- **用色**: 主绿色 `#006e1c`（亮色模式）/ 浅绿色 `#4caf50`（深色模式）
- **字体**: Plus Jakarta Sans，字重 700（Bold）

### 2.2 品牌用语风格

| 场景 | 示例文案 | 原则 |
|------|----------|------|
| 空状态 | "还没有任务哦，快去创建吧 🌱" | 鼓励性，带 emoji |
| 成功反馈 | "太棒了，继续保持！" | 简短有力 |
| 错误提示 | "出了点小问题，请稍后再试" | 温和，不责怪用户 |
| 确认删除 | "删除后任务记录将无法找回哦 🌱" | 温馨提醒，不恐吓 |
| 兑换成功 | "兑换成功！期待你的美好时光 🎉" | 庆祝感 |

### 2.3 Emoji 使用规范

Emoji 是愿望卡视觉语言的重要组成部分，但需节制使用：

- ✅ 适用：成功提示、空状态插图、品牌文案、任务图标
- ❌ 避免：错误信息、数据列表中每项都加 emoji、导航标签

---

## 三、色彩系统

色彩系统基于 **Material Design 3 Dynamic Color** 规范，以自然绿为主调。

### 3.1 主色板

```
主色 (Primary)
├── #006e1c  — 按钮、选中态、强调元素
└── #4caf50  — 次级强调、图标着色、Progress Fill

辅色 (Secondary)
├── #686000  — 辅助文字、标签
└── #f0e269  — 辅助背景、徽章

第三色 (Tertiary) — 暖色点缀
├── #7a5649  — 特殊标签、多元区分
└── #bd9283  — 浅暖色背景
```

### 3.2 语义色

| Token 名称 | Light Mode | Dark Mode | 用途 |
|-----------|-----------|-----------|------|
| `background` | `#fbf9f5` | `#1b1c1a` | 全局背景 |
| `surface` | `#fbf9f5` | `#1b1c1a` | 卡片、面板背景 |
| `surface-container-low` | `#f5f3ef` | `#242522` | 次级卡片背景 |
| `surface-container` | `#efeeea` | `#2b2c29` | 输入框背景 |
| `surface-container-high` | `#eae8e4` | `#31322f` | 分割线背景 |
| `surface-container-highest` | `#e4e2de` | `#373834` | 最高层容器 |
| `on-surface` | `#1b1c1a` | `#e4e2de` | 主要文字 |
| `on-surface-variant` | `#3f4a3c` | `#becab9` | 次要文字 |
| `outline` | `#6f7a6b` | `#6f7a6b` | 边框、分割线 |
| `outline-variant` | `#becab9` | `#becab9` | 柔和边框 |

### 3.3 功能色

| 用途 | 颜色值 | 使用场景 |
|------|--------|----------|
| 成功 / 完成 | `#81C784` | 已完成任务、打卡成功 |
| 警告 / 待审核 | `#FFB74D` | 等待家长确认 |
| 信息 / 进行中 | `#4FC3F7` | 进行中任务 |
| 审核中 | `#BA68C8` | 习惯待确认 |
| 危险 / 扣分 | `#E57373` | 惩罚习惯、删除操作 |

### 3.4 四象限颜色

| 象限 | 颜色 | Tailwind 近似 | 语义 |
|------|------|----------------|------|
| Q1 重要且紧急 | `#E57373` | `red-400` | 立即执行 |
| Q2 重要不紧急 | `#64B5F6` | `blue-400` | 计划执行 |
| Q3 紧急不重要 | `#FFD54F` | `yellow-300` | 委托处理 |
| Q4 不紧急不重要 | `#90A4AE` | `slate-400` | 考虑删除 |

### 3.5 渐变

| 名称 | 值 | 用途 |
|------|-----|------|
| 主渐变 | `linear-gradient(135deg, #006e1c 0%, #4caf50 100%)` | 今日能量卡片 |
| 暖渐变 | `linear-gradient(135deg, #f0e269 0%, #FFB74D 100%)` | 奖励相关强调 |
| 庆祝渐变 | `linear-gradient(135deg, #4caf50 0%, #f0e269 50%, #FFB74D 100%)` | 庆祝动画背景 |

### 3.6 色彩使用禁忌

- ❌ 禁止直接使用纯黑 `#000000` 作为文字色
- ❌ 禁止在绿色背景上使用红色（对比度不足）
- ❌ 禁止使用超过 3 种主色调在同一张卡片上
- ✅ 惩罚类元素（红色）的视觉占比不超过奖励类（绿色）的 30%

---

## 四、字体系统

### 4.1 字体族

| 用途 | 字体 | 回退 |
|------|------|------|
| 正文 / UI | Inter, Plus Jakarta Sans | ui-sans-serif, system-ui |
| 标题 / 显示 | Plus Jakarta Sans | sans-serif |
| 手写风格 | Long Cang | cursive |
| 艺术标题 | ZCOOL XiaoWei | serif |

> **说明**: 正文首选 Inter（西文优化），中文内容自动降级为系统字体（PingFang SC / Noto Sans SC）。

### 4.2 字号阶梯

| 级别 | Token | Web | 小程序 (rpx) | Android (sp) | iOS (pt) | 用途 |
|------|-------|-----|-------------|-------------|---------|------|
| Display | — | 48px | 96rpx | 48sp | 48pt | 启动页大标题 |
| H1 | `text-4xl` | 36px | 72rpx | 36sp | 36pt | 页面主标题 |
| H2 | `text-3xl` | 30px | 60rpx | 30sp | 30pt | 区块标题 |
| H3 | `text-2xl` | 24px | 48rpx | 24sp | 24pt | 卡片标题 |
| H4 | `text-xl` | 20px | 40rpx | 20sp | 20pt | 组件标题 |
| Body Large | `text-lg` | 18px | 36rpx | 18sp | 18pt | 重要正文 |
| Body Medium | `text-base` | 16px | 32rpx | 16sp | 16pt | 默认正文 |
| Body Small | `text-sm` | 14px | 28rpx | 14sp | 14pt | 次要信息 |
| Caption | `text-xs` | 12px | 24rpx | 12sp | 12pt | 标签、时间戳 |

### 4.3 字重规范

| 场景 | 字重 | Tailwind |
|------|------|----------|
| 超大数字（星星数量）| 800 | `font-extrabold` |
| 标题 | 700 | `font-bold` |
| 强调文字、按钮 | 600 | `font-semibold` |
| 副标题 | 500 | `font-medium` |
| 正文 | 400 | `font-normal` |

### 4.4 行高

| 类型 | 行高 | Tailwind |
|------|------|----------|
| 标题类 | 1.2 | `leading-tight` |
| 正文类 | 1.5 | `leading-normal` |
| 多行说明 | 1.6 | `leading-relaxed` |

### 4.5 数字显示规范

星星数量等关键数字使用 **tabular-nums**（等宽数字）防止排版跳动：

```css
.star-count {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}
```

---

## 五、间距系统

基于 4px 基础单位的间距系统。

### 5.1 间距表

| Token | Web | 小程序 | Android | iOS | 典型用途 |
|-------|-----|--------|---------|-----|----------|
| `space-1` | 4px | 8rpx | 4dp | 4pt | 图标与文字间距 |
| `space-2` | 8px | 16rpx | 8dp | 8pt | 紧凑布局内部间距 |
| `space-3` | 12px | 24rpx | 12dp | 12pt | 列表项内部 |
| `space-4` | 16px | 32rpx | 16dp | 16pt | 卡片内边距（小） |
| `space-5` | 20px | 40rpx | 20dp | 20pt | 卡片内边距（中） |
| `space-6` | 24px | 48rpx | 24dp | 24pt | 卡片内边距（标准） |
| `space-8` | 32px | 64rpx | 32dp | 32pt | 区块间距 |
| `space-10` | 40px | 80rpx | 40dp | 40pt | 大区块间距 |
| `space-12` | 48px | 96rpx | 48dp | 48pt | 页面顶部/底部 |
| `space-16` | 64px | 128rpx | 64dp | 64pt | 特殊留白 |

### 5.2 页面边距

| 设备类型 | 水平边距 |
|----------|----------|
| 手机 (<640px) | 16px (`px-4`) |
| 平板 (640–1024px) | 24px (`px-6`) |
| 桌面 (>1024px) | 32px (`px-8`) |

### 5.3 组件内部间距规则

- **卡片**: padding `24px`（`p-6`），内部元素间距 `12px`（`gap-3`）
- **列表项**: 垂直 padding `12px`，水平 `16px`
- **按钮**: 水平 `24px`，垂直 `12px`（中等按钮）
- **底部导航栏**: 高度 `64px`，图标到文字间距 `4px`

---

## 六、圆角与阴影

### 6.1 圆角阶梯

| Token | Web | 小程序 | Android | iOS | 用途 |
|-------|-----|--------|---------|-----|------|
| `rounded-sm` | 4px | 8rpx | 4dp | 4pt | 输入框、Tag |
| `rounded-md` | 8px | 16rpx | 8dp | 8pt | 小卡片、下拉菜单 |
| `rounded-lg` | 12px | 24rpx | 12dp | 12pt | 列表项 |
| `rounded-xl` | 16px | 32rpx | 16dp | 16pt | 普通卡片 |
| `rounded-2xl` | 24px | 48rpx | 24dp | 24pt | 主卡片、弹窗 |
| `rounded-3xl` | 32px | 64rpx | 32dp | 32pt | 底部 Sheet |
| `rounded-full` | 9999px | 9999rpx | — | — | 按钮胶囊、头像、徽章 |

### 6.2 阴影系统

#### 亮色模式

```css
/* 卡片阴影 */
--shadow-card:   0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
/* 悬浮元素 */
--shadow-float:  0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
/* 弹窗 */
--shadow-modal:  0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06);
/* 浮动按钮 */
--shadow-fab:    0 6px 16px rgba(0, 110, 28, 0.30);
```

#### 深色模式

```css
--shadow-card:   0 1px 3px rgba(0, 0, 0, 0.25), 0 1px 2px rgba(0, 0, 0, 0.20);
--shadow-float:  0 4px 12px rgba(0, 0, 0, 0.35), 0 2px 4px rgba(0, 0, 0, 0.20);
--shadow-modal:  0 20px 40px rgba(0, 0, 0, 0.50), 0 8px 16px rgba(0, 0, 0, 0.30);
--shadow-fab:    0 6px 16px rgba(0, 0, 0, 0.50);
```

### 6.3 高程规则

| 层级 | 组件 | 阴影 |
|------|------|------|
| 0 | 页面背景 | 无 |
| 1 | 普通卡片 | `shadow-card` |
| 2 | 悬浮卡片、Tooltip | `shadow-float` |
| 3 | 底部导航栏、顶部导航 | `shadow-float` |
| 4 | FAB（浮动操作按钮） | `shadow-fab` |
| 5 | 模态弹窗、Bottom Sheet | `shadow-modal` |

---

## 七、图标系统

### 7.1 图标库

使用 **Lucide React** 作为主要 UI 图标库，路径类名风格，线条宽度统一为 `1.5px`。

### 7.2 图标尺寸规范

| 场景 | 尺寸 | Lucide 属性 |
|------|------|-------------|
| 底部导航 | 24px | `size={24}` |
| 列表项前缀 | 20px | `size={20}` |
| 按钮内图标 | 18px | `size={18}` |
| 卡片装饰（大） | 32px | `size={32}` |
| 任务/习惯 icon | 40px | `size={40}` |

### 7.3 Emoji 图标

任务和习惯可使用 Emoji 作为图标（参考模板库），渲染规则：

```tsx
// Emoji 图标容器
<div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-2xl">
  {icon}  {/* e.g. "📚" */}
</div>
```

### 7.4 任务图标推荐集

| 类别 | Emoji |
|------|-------|
| 学习 | 📚 ✏️ 📖 🎹 📝 🔤 🧮 📜 🇬🇧 |
| 运动 | 💪 🏃 ⚽ 🏊 🧘 |
| 生活 | 🛏️ 🍱 🌿 🪥 🧹 |
| 娱乐 | 🎨 🎮 🎵 🎬 |
| 奖励 | 🎁 🍔 🍦 🧋 🎡 |

---

## 八、组件规范

### 8.1 按钮 (Button)

#### 变体

```
Primary     → 实心绿色胶囊按钮，白色文字    —— 主操作
Secondary   → 描边绿色胶囊按钮，绿色文字    —— 次要操作
Danger      → 实心红色胶囊按钮             —— 危险操作（删除）
Ghost       → 无背景无边框                  —— 取消、返回
Icon        → 圆形图标按钮                  —— 工具栏
FAB         → 浮动大圆角按钮                —— 新建操作
```

#### 尺寸

| 尺寸 | 高度 | 字号 | 水平 padding |
|------|------|------|-------------|
| sm | 32px | 14px | 12px |
| md | 44px | 16px | 20px |
| lg | 52px | 18px | 24px |
| full | 52px | 18px | — (w-full) |

#### Tailwind 实现

```tsx
// Primary Button (Full Width)
<button className="w-full h-[52px] bg-primary text-white rounded-full text-lg font-semibold
                   active:scale-[0.98] transition-transform">
  确认打卡
</button>

// Secondary Button
<button className="h-[44px] px-5 border-2 border-primary text-primary rounded-full font-semibold
                   active:bg-primary/10 transition-colors">
  取消
</button>

// FAB
<button className="fixed bottom-24 right-4 w-14 h-14 bg-primary text-white rounded-full
                   shadow-fab flex items-center justify-center active:scale-95 transition-transform">
  <Plus size={24} />
</button>
```

#### 禁用态

```tsx
disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
```

---

### 8.2 卡片 (Card)

#### 基础卡片

```tsx
<div className="bg-surface-container-low rounded-2xl p-6 shadow-card">
  {children}
</div>
```

#### 能量卡片（今日成长能量）

```tsx
<div className="rounded-2xl p-6 text-white"
     style={{ background: 'linear-gradient(135deg, #006e1c 0%, #4caf50 100%)' }}>
  <h2 className="text-lg font-semibold opacity-90">✨ 今日成长能量 ✨</h2>
  <p className="text-5xl font-extrabold mt-3 tabular-nums">⭐ 58</p>
  <p className="text-sm mt-2 opacity-80">加油！离下一个愿望更近了 🌱</p>
</div>
```

#### 任务卡片

```tsx
<div className="bg-surface-container-low rounded-xl p-4 flex items-center gap-3 shadow-card">
  {/* 状态图标 */}
  <div className="w-5 h-5 rounded-full border-2 border-outline-variant flex-shrink-0" />
  {/* 内容区 */}
  <div className="flex-1 min-w-0">
    <p className="text-base font-medium text-on-surface truncate">{title}</p>
    <p className="text-xs text-on-surface-variant mt-0.5">{assignees}</p>
  </div>
  {/* 星星 + 操作 */}
  <div className="flex items-center gap-2 flex-shrink-0">
    <span className="text-sm font-semibold text-secondary">⭐ {stars}</span>
    <button className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">
      打卡
    </button>
  </div>
</div>
```

#### 习惯卡片（网格）

```tsx
<div className="bg-surface-container-low rounded-xl p-4 flex flex-col items-center gap-2">
  <div className="text-3xl">{icon}</div>
  <p className="text-sm font-medium text-on-surface text-center">{name}</p>
  <p className="text-xs font-semibold text-primary">⭐ +{stars}</p>
</div>
```

---

### 8.3 底部导航栏 (Bottom Navigation)

```
高度: 64px + safe-area-inset-bottom
背景: surface（亮）/ surface（暗）+ 顶部 1px outline-variant 分割线
图标: 24px Lucide icons
标签: 10px / Caption 字号
激活色: primary (#006e1c)
未激活色: on-surface-variant (#3f4a3c)
激活背景: primary/10 圆角 pill (16px 高，宽自适应)
```

```tsx
// 导航项
<button className={cn(
  "flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-colors",
  isActive ? "text-primary" : "text-on-surface-variant"
)}>
  {isActive && (
    <div className="absolute inset-0 bg-primary/10 rounded-2xl" />
  )}
  <Icon size={24} />
  <span className="text-[10px] font-medium">{label}</span>
</button>
```

---

### 8.4 底部弹窗 (Bottom Sheet)

```
圆角: 顶部 32px rounded-3xl
背景: surface
顶部 drag handle: 32px × 4px, rounded-full, outline-variant
动画: translateY 0 ↔ 100%, spring easing
遮罩: rgba(0,0,0,0.4), 点击关闭
最大高度: 90vh，内部可滚动
```

```tsx
// Framer Motion 示例
<motion.div
  initial={{ y: "100%" }}
  animate={{ y: 0 }}
  exit={{ y: "100%" }}
  transition={{ type: "spring", damping: 30, stiffness: 300 }}
  className="fixed bottom-0 inset-x-0 bg-surface rounded-t-3xl shadow-modal max-h-[90vh] overflow-y-auto"
>
  {/* Drag Handle */}
  <div className="flex justify-center pt-3 pb-2">
    <div className="w-8 h-1 rounded-full bg-outline-variant" />
  </div>
  {children}
</motion.div>
```

---

### 8.5 输入框 (Text Field)

```tsx
// 标准输入框
<div className="relative">
  <input
    className="w-full bg-surface-container rounded-xl px-4 py-3 text-base text-on-surface
               border-2 border-transparent focus:border-primary outline-none transition-colors
               placeholder:text-on-surface-variant"
    placeholder="输入任务名称"
  />
</div>

// 带图标输入框
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
  <input className="w-full bg-surface-container rounded-xl pl-10 pr-4 py-3 ..." />
</div>
```

---

### 8.6 标签 / 筛选器 (Filter Tabs)

```tsx
// 横向滚动筛选标签
<div className="flex gap-2 overflow-x-auto scrollbar-hide px-4">
  {tabs.map(tab => (
    <button
      key={tab}
      className={cn(
        "flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
        active === tab
          ? "bg-primary text-white"
          : "bg-surface-container text-on-surface-variant"
      )}
    >
      {tab}
    </button>
  ))}
</div>
```

---

### 8.7 进度条 (Progress Bar)

```tsx
// 线性进度条（习惯目标）
<div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
  <div
    className="h-full bg-primary rounded-full transition-all duration-500"
    style={{ width: `${(current / target) * 100}%` }}
  />
</div>
// 文字标注
<p className="text-xs text-on-surface-variant text-right mt-1">{current}/{target}</p>
```

---

### 8.8 用户头像 (Avatar)

```tsx
// 尺寸：sm=32px, md=40px, lg=56px, xl=80px
<div className={cn(
  "rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0",
  sizeClass
)}>
  {src ? <img src={src} alt={name} className="w-full h-full object-cover" />
       : <span className="text-primary font-bold text-sm">{name[0]}</span>}
</div>
```

---

### 8.9 星星徽章 (Star Badge)

```tsx
// 顶部导航星星余额
<div className="flex items-center gap-1 bg-secondary-container rounded-full px-3 py-1">
  <span className="text-base">⭐</span>
  <span className="text-sm font-bold text-secondary tabular-nums">{stars.toLocaleString()}</span>
</div>
```

---

### 8.10 Toast 提示

```
位置: 顶部居中，距顶 safe-area + 16px
样式: 圆角 12px, bg on-surface, text surface, 阴影 float
动画: 从上方 Y:-20px fade in → 停留 2s → fade out
图标: ✅ 成功 / ⚠️ 警告 / ❌ 错误
```

---

### 8.11 庆祝动画 (Celebration Animation)

```
触发: 任务打卡成功 / 心愿兑换 / 习惯目标达成
效果: 全屏遮罩 + 彩纸撒花（confetti） + 中央放大卡片
中央卡片: 白色圆角卡片，展示 emoji + 标题 + 星星变化
持续: 2.5 秒自动消失，可点击提前关闭
实现: Framer Motion scale(0.8→1.05→1) + opacity(0→1)
```

---

### 8.12 排行榜领奖台 (Leaderboard Podium)

```
布局: 第2名（左）| 第1名（中，高出16px）| 第3名（右）
头像尺寸: 第1名 56px，2/3名 44px
奖牌: 🥇🥈🥉
星星数: 粗体，第1名 text-lg，其余 text-base
颜色区分:
  - 金: #FFD700 accent
  - 银: #C0C0C0 accent
  - 铜: #CD7F32 accent
```

---

## 九、布局系统

### 9.1 页面结构

```
┌─────────────────────────────┐
│         TopBar (可选)        │  固定顶部，高度 56px
│         safe-area-top        │
├─────────────────────────────┤
│                             │
│         ScrollArea          │  flex-1, overflow-y-auto
│       (主内容区域)           │  padding: 16px
│                             │
├─────────────────────────────┤
│        BottomNav            │  固定底部，高度 64px
│       safe-area-bottom       │
└─────────────────────────────┘
```

### 9.2 页面顶部栏 (TopBar)

```
高度: 56px
内容: [头像/返回] + [标题居中] + [操作按钮]
背景: surface（有内容时添加底部 1px 分割线）
层级: z-40
```

### 9.3 网格布局

| 场景 | 列数 | 间距 |
|------|------|------|
| 习惯卡片 | 2列 | gap-3 |
| 心愿商城卡片 | 2列 | gap-3 |
| 任务模板 | 4列 | gap-2 |
| 快捷操作按钮 | 4列 | gap-2 |
| 家庭成员头像 | 横向滚动 | gap-3 |

### 9.4 安全区域

```css
/* iOS 安全区域适配 */
padding-top: env(safe-area-inset-top);
padding-bottom: calc(64px + env(safe-area-inset-bottom));
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);
```

### 9.5 滚动规范

- 主内容区使用 `-webkit-overflow-scrolling: touch`（Capacitor/PWA 必须）
- 水平滚动容器隐藏滚动条：`scrollbar-hide`（自定义 Tailwind 插件）
- 禁止拖拽时触发全局 overscroll：`overscroll-behavior: contain`

---

## 十、动画与过渡

### 10.1 缓动曲线

| 名称 | 曲线 | 用途 |
|------|------|------|
| Standard | `cubic-bezier(0.2, 0, 0, 1)` | 默认 UI 过渡 |
| Decelerate | `cubic-bezier(0, 0, 0.2, 1)` | 元素进入（从外滑入） |
| Accelerate | `cubic-bezier(0.3, 0, 1, 1)` | 元素退出（滑出屏幕） |
| Spring | `spring(1, 90, 20, 0)` | Framer Motion 弹性 |

### 10.2 时长规范

| 场景 | 时长 |
|------|------|
| 微交互（按钮按压、hover） | 100–150ms |
| 小组件进出（Toast、Tooltip） | 200ms |
| 底部弹窗、模态框 | 300ms |
| 页面转场 | 350ms |
| 庆祝动画 | 2500ms |

### 10.3 页面转场

| 方向 | 动画 |
|------|------|
| 进入子页面（push） | 从右侧 translateX(100%) → 0 |
| 返回上级（pop） | 当前页 translateX(0) → 100%，前页从 -30% → 0 |
| 弹窗 | 从底部 translateY(100%) → 0 |
| 模态覆盖 | opacity 0 → 1 + scale 0.96 → 1 |

### 10.4 庆祝动画实现

```tsx
// Framer Motion
<AnimatePresence>
  {showCelebration && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <motion.div
        initial={{ scale: 0.8, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 15 }}
        className="bg-white rounded-3xl p-8 text-center mx-6"
      >
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="text-2xl font-bold text-on-surface">打卡成功！</h2>
        <p className="text-on-surface-variant mt-2">太棒了，继续保持 🌱</p>
        <p className="text-2xl font-extrabold text-primary mt-4">⭐ +{stars}</p>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

### 10.5 骨架屏 (Skeleton)

```tsx
// 脉冲骨架屏
<div className="animate-pulse space-y-3">
  <div className="h-4 bg-surface-container-high rounded-full w-3/4" />
  <div className="h-4 bg-surface-container-high rounded-full w-1/2" />
</div>
```

### 10.6 减少动画模式

遵循系统 `prefers-reduced-motion`，庆祝动画退化为静态卡片：

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 十一、深色模式

### 11.1 实现方式

使用 Tailwind `dark:` 类 + HTML `class="dark"` 切换。

```tsx
// 切换函数
const toggleDarkMode = () => {
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark ? 'false' : 'true');
};
```

### 11.2 颜色映射（亮色 → 暗色）

| 用途 | 亮色 | 暗色 |
|------|------|------|
| 页面背景 | `#fbf9f5` | `#1b1c1a` |
| 卡片背景 | `#f5f3ef` | `#242522` |
| 主文字 | `#1b1c1a` | `#e4e2de` |
| 次要文字 | `#3f4a3c` | `#becab9` |
| 主色 | `#006e1c` | `#4caf50`（更亮，深背景可读） |

### 11.3 图片与插图适配

- 使用 CSS `filter: brightness(0.85)` 柔化深色模式下的图片
- Emoji 无需适配，天然跨主题
- 图标线条颜色使用 `currentColor` 跟随文字色

---

## 十二、页面级规范

### 12.1 首页 (Home)

**视觉重心**: 今日成长能量卡片（绿色渐变，占屏幕宽度 100%）  
**信息层级**:  
1. 能量数值（最大字号，`text-5xl font-extrabold`）  
2. 快捷操作按钮组（4个等宽）  
3. 今日任务列表  
4. 排行榜 / 四象限 Tab  

**顶部导航**: 左侧头像 + 麦克风，右侧星星余额 + 设置图标  
**间距**: 各区块 `gap-4`（16px），能量卡片顶部 `mt-4`

---

### 12.2 任务管理 (Tasks)

**默认视图**: 列表视图（List），可切换日历视图  
**分组展示**:

| 分组 | 颜色标识 | 图标 |
|------|----------|------|
| 待审核 | `#BA68C8` 紫色 | ⏳ |
| 待完成 | `#4FC3F7` 蓝色 | 📝 |
| 已完成 | `#81C784` 绿色 | ✅ |

**日历视图**: 月视图日历，有任务的日期显示绿点（●），选中日期下方列出当日任务

---

### 12.3 习惯养成 (Habits)

**Tab 设计**:  
- 奖励 Tab 激活态：绿色（`#006e1c`）  
- 惩罚 Tab 激活态：红色（`#E57373`）  

**卡片网格**: 2列，等高，图标居中展示  
**惩罚卡片**: 使用 `border border-red-200 bg-red-50 dark:bg-red-950/20` 区分

---

### 12.4 心愿商城 (Rewards)

**图片区域**: 固定高度 `h-32`，`object-cover`，背景兜底色 `surface-container`  
**价格显示**: 星星 emoji + 粗体数字，右对齐  
**进度条**: 星星不足时显示距目标进度，绿色 fill  
**兑换按钮**: 星星充足时 Primary 绿色，不足时 Disabled 灰色

---

### 12.5 个人中心 (Profile)

**头像区域**: 大头像居中，底部悬浮编辑图标（小圆形按钮，`bg-primary`）  
**设置列表**: `divide-y divide-outline-variant`，每项 `py-4 px-0`  
**危险操作**（退出账号/删除成员）: 独立红色区块，与普通列表有明显间距分隔

---

### 12.6 创建/编辑表单页

**布局原则**: 单列，垂直堆叠，标签 + 输入框  
**底部固定操作栏**: 固定在 `bottom-0`，高度 `80px`，`bg-surface`，顶部分割线  
**模板选择**: 底部 Sheet，优先展示常用模板，支持搜索

---

## 十三、无障碍规范

### 13.1 色彩对比度

| 对比组合 | 比率要求 | 说明 |
|----------|----------|------|
| 正文文字 / 背景 | ≥ 4.5:1 | WCAG AA |
| 大字号文字（≥18px）/ 背景 | ≥ 3:1 | WCAG AA Large |
| 图标 / 背景 | ≥ 3:1 | WCAG AA Non-text |

> **检验**: 主色 `#006e1c` 在白色背景上对比度约 7.2:1 ✅

### 13.2 交互目标尺寸

- 所有可点击元素最小触控面积：**44 × 44px**（iOS HIG 规范）
- 底部导航项宽度均等，最小 44px

### 13.3 语义化标签

```tsx
// 使用正确的 ARIA
<button aria-label="打卡确认">确认打卡</button>
<nav aria-label="主导航">...</nav>
<dialog aria-modal="true" aria-labelledby="dialog-title">...</dialog>
```

### 13.4 焦点管理

- 弹窗打开时焦点移至弹窗内第一个可聚焦元素
- 弹窗关闭时焦点返回触发元素
- Tab 顺序遵循视觉阅读顺序

---

## 十四、多平台适配

### 14.1 平台矩阵

| 平台 | 实现方案 | 状态 |
|------|----------|------|
| Web (PWA) | React + Tailwind CSS | ✅ 主平台 |
| iOS | Capacitor 封装 | ✅ |
| Android | Capacitor 封装 | ✅ |
| 微信小程序 | 独立重写 | 🚧 规划中 |

### 14.2 Capacitor 适配要点

```tsx
// 状态栏适配
import { StatusBar, Style } from '@capacitor/status-bar';
StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });

// 安全区域 CSS
.safe-top    { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

### 14.3 小程序色彩 Token（SCSS）

```scss
$primary-color:          #006e1c;
$primary-container:      #4caf50;
$secondary-color:        #686000;
$secondary-container:    #f0e269;
$background:             #fbf9f5;
$card-bg:                #f5f3ef;
$primary-text:           #1b1c1a;
$secondary-text:         #3f4a3c;
$border-color:           #becab9;
```

### 14.4 Android Design Token（Compose）

```kotlin
val PrimaryGreen     = Color(0xFF006e1c)
val PrimaryContainer = Color(0xFF4caf50)
val Secondary        = Color(0xFF686000)
val Background       = Color(0xFFfbf9f5)
val OnSurface        = Color(0xFF1b1c1a)
```

### 14.5 iOS Design Token（SwiftUI）

```swift
extension Color {
    static let primaryGreen    = Color(hex: "#006e1c")
    static let primaryContainer = Color(hex: "#4caf50")
    static let background      = Color(hex: "#fbf9f5")
    static let onSurface       = Color(hex: "#1b1c1a")
}
```

---

## 附录 A — 设计检查清单

### 新页面上线前检查

- [ ] 页面有且只有一个主操作按钮
- [ ] 文字颜色使用语义 Token（禁止硬编码）
- [ ] 空状态有友好提示（含 emoji 和引导文案）
- [ ] 加载状态有骨架屏占位
- [ ] 错误状态有重试引导
- [ ] 触控目标 ≥ 44 × 44px
- [ ] 深色模式视觉正常
- [ ] 横竖屏切换无布局错乱
- [ ] iOS 安全区域（刘海/圆角/Home 横条）适配
- [ ] 文字不被底部导航遮挡

### 新组件上线前检查

- [ ] 提供 Normal / Active / Disabled 三态
- [ ] 触控反馈（active:scale-[0.98] 或 bg 变化）
- [ ] 支持 `prefers-reduced-motion`
- [ ] 颜色满足 4.5:1 对比度

---

## 附录 B — 关联文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 产品详细文档 | `./愿望卡产品详细文档.md` | 功能原型与交互说明 |
| 设计令牌（跨平台） | `./DESIGN_TOKENS.md` | 三端统一色彩/字体/间距原始值 |
| Tailwind 配置 | `./tailwind.config.js` | Web 端色彩扩展配置 |
| 模板库说明 | `./模板库增强功能说明.md` | 任务/习惯/心愿模板数据 |

---

*文档版本: v1.0 | 生成日期: 2026-04-30 | 维护: 设计&开发团队*
