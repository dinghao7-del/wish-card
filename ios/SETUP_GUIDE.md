# iOS / iPad 版本完整搭建指南

## 已完成的工作

✅ Capacitor 配置 (`capacitor.config.ts`)
✅ iOS 原生代码 (Swift)
✅ iPad 响应式适配 (CSS + React Hooks)
✅ 原生功能封装 (相机、定位、推送)
✅ Xcode 项目配置

## 环境要求

- macOS 12.0 或更高版本
- Xcode 14.0 或更高版本
- CocoaPods 1.12 或更高版本
- Node.js 18 或更高版本

## 安装步骤

### 1. 安装 CocoaPods

```bash
# 使用 Homebrew 安装（推荐）
brew install cocoapods

# 或使用 Ruby Gems
sudo gem install cocoapods
```

### 2. 初始化 iOS 项目

```bash
# 进入项目目录
cd /Users/zerone/WorkBuddy/20260420104543

# 运行构建脚本
./ios/build.sh
```

或手动执行：

```bash
# 1. 构建 Web 应用
npm run build

# 2. 同步 Capacitor
npx cap sync ios

# 3. 安装 Pods 依赖
cd ios/App
pod install

# 4. 打开 Xcode
cd ..
npx cap open ios
```

### 3. Xcode 配置

1. **选择 Development Team**
   - 在 Xcode 左侧选择项目
   - 选择 Targets → App → Signing & Capabilities
   - 选择你的 Apple ID 作为 Team

2. **配置 Bundle Identifier**
   - 默认: `com.forestfamily.app`
   - 如需修改，确保与 `capacitor.config.ts` 中的 `appId` 一致

3. **启用功能 (Capabilities)**
   - Push Notifications（推送通知）
   - Background Modes（后台模式）
     - ✅ Background fetch
     - ✅ Remote notifications

### 4. 配置推送通知

1. 登录 [Apple Developer Portal](https://developer.apple.com)
2. 创建 App ID 并启用 Push Notifications
3. 创建推送证书（Development 和 Production）
4. 下载并安装证书

### 5. 构建和运行

```bash
# 开发构建（模拟器）
npx cap run ios

# 开发构建（真机）
npx cap run ios --target="你的设备"

# 生产构建
npx cap build ios --release
```

## 项目结构

```
ios/
├── App/                          # iOS 原生项目
│   ├── App/
│   │   ├── AppDelegate.swift     # 应用委托
│   │   ├── SceneDelegate.swift   # 场景委托（多窗口支持）
│   │   ├── Info.plist           # 应用配置
│   │   ├── Main.storyboard      # 主界面
│   │   ├── LaunchScreen.storyboard  # 启动屏
│   │   ├── Assets.xcassets/     # 图标和启动图
│   │   ├── config.xml           # Cordova 配置
│   │   └── capacitor.config.json # Capacitor 配置
│   ├── App.xcodeproj/           # Xcode 项目
│   ├── Podfile                  # CocoaPods 依赖
│   └── public/                  # Web 构建输出（自动生成）
├── build.sh                     # 构建脚本
└── README.md                    # 说明文档
```

## iPad 特有功能

### 多窗口支持
- ✅ 支持同时打开多个窗口
- ✅ 分屏模式 (Split View)
- ✅ Slide Over 浮窗

### 响应式布局
- 竖屏：底部导航栏
- 横屏：侧边栏导航
- 分屏：自动适配紧凑布局

### 键盘快捷键
可在 `AppDelegate.swift` 中添加键盘快捷键支持：

```swift
// 在 AppDelegate.swift 中添加
override func buildMenu(with builder: UIMenuBuilder) {
    super.buildMenu(with: builder)
    // 添加自定义菜单和快捷键
}
```

## 原生功能使用

### 相机

```typescript
import { useNativeFeatures } from './hooks/useNativeFeatures';

function MyComponent() {
  const { takePhoto } = useNativeFeatures();
  
  const handleTakePhoto = async () => {
    const photo = await takePhoto({ source: 'camera' });
    // photo 是 base64 图片数据
  };
}
```

### 定位

```typescript
import { useNativeFeatures } from './hooks/useNativeFeatures';

function MyComponent() {
  const { getCurrentLocation } = useNativeFeatures();
  
  const handleGetLocation = async () => {
    const location = await getCurrentLocation();
    // location: { latitude, longitude, accuracy }
  };
}
```

### 推送通知

```typescript
import { useNativeFeatures } from './hooks/useNativeFeatures';

function MyComponent() {
  const { registerPushNotifications } = useNativeFeatures();
  
  useEffect(() => {
    registerPushNotifications().then(token => {
      // 将 token 发送到服务器
    });
  }, []);
}
```

## 设备检测

```typescript
import { useDeviceDetection } from './hooks/useDeviceDetection';

function MyComponent() {
  const { isIPad, isIPhone, isIOS, orientation, isMultiWindow } = useDeviceDetection();
  
  // 根据设备类型渲染不同 UI
  if (isIPad && orientation === 'landscape') {
    return <SidebarLayout />;
  }
  
  return <BottomNavLayout />;
}
```

## 常见问题

### 1. CocoaPods 安装失败

```bash
# 更新 Ruby Gems
sudo gem update --system

# 重新安装
sudo gem install cocoapods

# 设置仓库
pod setup
```

### 2. 构建失败：找不到 Capacitor

```bash
# 重新安装依赖
npm install

# 重新同步
cd ios/App
pod deintegrate
pod install
```

### 3. 推送通知不工作

- 检查证书是否正确配置
- 确保在真机上测试（模拟器不支持推送）
- 检查 Info.plist 中的权限描述

### 4. 相机/定位权限弹窗不显示

- 检查 Info.plist 中的权限描述是否完整
- 确保在真机上测试
- 检查 iOS 设置中的权限状态

## 发布到 App Store

### 1. 准备材料

- App 图标（1024x1024）
- 截图（iPhone 和 iPad 各 5 张）
- 应用描述
- 隐私政策 URL
- 支持 URL

### 2. 归档构建

```bash
# 在 Xcode 中
# Product → Archive
```

### 3. 上传到 App Store Connect

```bash
# 或使用命令行
xcrun altool --upload-app --type ios --file "path/to/app.ipa" --apiKey "xxx" --apiIssuer "xxx"
```

### 4. 提交审核

- 登录 [App Store Connect](https://appstoreconnect.apple.com)
- 填写应用信息
- 提交审核

## 技术支持

- [Capacitor iOS 文档](https://capacitorjs.com/docs/ios)
- [Apple Developer 文档](https://developer.apple.com/documentation)
- [CocoaPods 指南](https://guides.cocoapods.org)
