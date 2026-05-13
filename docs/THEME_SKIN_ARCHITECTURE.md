# 主题皮肤推进原则

## 当前结论

星愿卡需要保留“绿色简约漫画风”的默认视觉，同时为未来换肤留出空间。项目中已有未完成的新 UI 包和多个设计实验目录，它们不应直接混入主应用页面，而应沉淀为可切换的主题皮肤资产。

## 皮肤分层

1. **产品结构层**
   - 路由、数据模型、离线同步、任务/心愿/计划/复盘流程保持稳定。
   - 皮肤切换不能改变核心业务逻辑。

2. **设计令牌层**
   - 颜色、圆角、阴影、字体、间距、插画风格先抽象为 token。
   - 默认皮肤命名为 `forest-comic`。
   - 新版简约平面漫画风暂定为 `flat-comic`。

3. **组件外观层**
   - 卡片、按钮、导航、任务卡、奖励卡、报告卡通过 token 变化换肤。
   - 不为每个皮肤复制一套业务组件，避免后期维护失控。

4. **插画资产层**
   - 欢迎页、空状态、成就弹窗、心愿兑换等插画按皮肤目录管理。
   - 例如：
     - `public/skins/forest-comic/welcome-comic.svg`
     - `public/skins/flat-comic/welcome-comic.svg`

## 当前工程落点

- 主题配置入口：`src/lib/themeSkins.ts`
- 当前默认皮肤：`forest-comic`
- 欢迎页默认插画：`public/skins/forest-comic/welcome-comic.svg`
- 皮肤选择缓存键：`wishcard-theme-skin`
- 皮肤设置入口：`我的` → `主题皮肤`
- 页面路由：`/settings/appearance`
- CSS 扩展钩子：`document.documentElement.dataset.themeSkin`

## 下一步建议

- 先稳定默认皮肤和主流程，主题入口只展示可用/规划中状态。
- 新 UI 包先做审计：拆出可复用的色彩、插画、组件样式，不直接覆盖现有页面。
- 等家庭主循环稳定后，再逐步开放更多皮肤：
  - 默认：绿色漫画风，当前可用
  - 候选：简约平面漫画风，当前规划中
  - 后续：节日皮肤、寒暑假皮肤、孩子偏好皮肤

## 禁止事项

- 不在业务页面里硬编码第二套 UI。
- 不为了换肤复制任务页、奖励页、首页等完整页面。
- 不让皮肤决定数据结构或权限规则。

## 皮肤模板验收清单

每个未来皮肤模板都必须先过这份清单，再进入页面接入：

- **令牌完整**：必须声明主色、辅助色、背景、表面层级、文字、描边、奖励色、圆角和触控尺寸，不能在业务页面里新增散落颜色。
- **平台一致**：Web、微信小程序、Android、iOS 都必须映射同一组语义 token；皮肤可以改变表达，但不能改变导航结构、页面流程和权限规则。
- **安全区不变**：顶部栏、底部导航、底部操作区必须继续使用安全区规则，包括 `env(safe-area-inset-top)`、`env(safe-area-inset-bottom)`、Android display cutout 和 iOS safe area。
- **触控下限**：Web / Android / iOS 可点击目标不得小于 44px；小程序对应目标不得小于 88rpx。
- **组件边界**：皮肤只能覆盖卡片、按钮、输入框、状态标签、空状态、插画和动效 token，不允许复制首页、任务页、奖励页等业务页面。
- **可访问性**：默认要求 WCAG-AA 对比度；动效必须支持 reduced motion，不能依赖动画表达关键状态。
- **资源结构**：欢迎页、空状态、成就、奖励等图片资源必须放在 `public/skins/<skin-id>/` 或小程序镜像目录，并使用相同逻辑命名。
- **新增样式守门**：不得新增固定 Tailwind 状态色、硬白底卡片、旧式 `vh` 弹层高度或低层级 `z-50` 弹窗；这些会被 `npm run test:ui-standard` 拦截。

## 端侧 UI 标准落点

- Web / Capacitor：`src/index.css` 提供 `ui-*` 组件类，`src/styles/android-adaptive.css` 只处理 Android WebView 的安全区、滚动、输入和性能适配。
- 微信小程序：`miniprogram/src/app.scss` 提供全局 mixin，`miniprogram/src/components/TopAppBar` 提供统一二级页顶部栏。
- Android 原生壳：`android/app/src/main/res/values/colors.xml` 映射语义色，`styles.xml` 保持沉浸式和刘海屏支持。
- iOS 原生壳：`ios/App/App/Extensions/UIColor+DesignTokens.swift` 映射 UIKit / SwiftUI token，原生页面不得另起一套颜色。
- 验证入口：`npm run test:ui-standard` 同时检查硬编码颜色、皮肤契约、端侧 UI 标准和新增 UI 反模式。

## 100% 验收入口

每次完成全局 UI、皮肤模板、Web、小程序或 Android / iOS 壳层相关改动后，统一运行：

```bash
npm run test:ui-final
```

这个入口覆盖：

- Web TypeScript / lint。
- 设计 token、皮肤契约、端侧 UI 标准。
- 小程序 TypeScript 类型检查。
- 单元测试和集成测试。
- 生产构建。
- 移动端 Web 冒烟：欢迎页皮肤资源、体验模式、底部导航、主题皮肤页、计划页和智能推荐页。

如果当前机器没有可用的无头浏览器，只允许临时用 `SKIP_BROWSER_SMOKE=1 npm run test:ui-final` 跳过移动端冒烟；正式合入前必须补跑完整命令。
