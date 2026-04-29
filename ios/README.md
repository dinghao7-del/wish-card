# iOS / iPad 版本开发指南

## 环境要求

- macOS 12.0+
- Xcode 14.0+
- CocoaPods 1.12+
- Node.js 18+

## 安装 CocoaPods

```bash
# 使用 Homebrew 安装
brew install cocoapods

# 或使用 Ruby Gems
sudo gem install cocoapods
```

## 项目初始化

```bash
# 1. 确保 Web 构建已完成
npm run build

# 2. 添加 iOS 平台
npx cap add ios

# 3. 同步配置和插件
npx cap sync ios

# 4. 打开 Xcode 项目
npx cap open ios
```

## 项目结构

```
ios/
├── App/                          # iOS 原生代码
│   ├── App/
│   │   ├── AppDelegate.swift     # 应用委托
│   │   ├── Info.plist           # 应用配置
│   │   ├── Main.storyboard      # 启动界面
│   │   └── Assets.xcassets/     # 图标和启动图
│   └── Podfile                  # 依赖管理
└── README.md
```

## 功能配置

### 1. 推送通知
- 在 Apple Developer 创建 App ID 并启用 Push Notifications
- 创建并下载推送证书
- 在 Xcode 中配置 Signing & Capabilities

### 2. 相机/相册权限
- 在 `Info.plist` 中添加权限描述
- 使用 `@capacitor/camera` 插件

### 3. 定位权限
- 在 `Info.plist` 中添加定位权限描述
- 使用 `@capacitor/geolocation` 插件

## iPad 适配

- 支持多窗口 (Multi-Window)
- 支持分屏模式 (Split View)
- 支持 Slide Over
- 适配横竖屏旋转

## 构建发布

```bash
# 开发构建
npx cap run ios

# 生产构建
npx cap build ios --release
```
