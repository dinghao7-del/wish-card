# 📱 ForestFamily 移动端同步工作流

> **版本**: 1.0  
> **更新日期**: 2026-05-01  
> **适用范围**: iOS & Android App 版本更新

---

## 🎯 工作流概述

本文档定义了 ForestFamily Web 应用与移动端（iOS/Android）的同步更新流程。每次 Web 版本更新后，按照此流程同步更新移动端 App。

---

## 📋 前置条件

### 必需环境

| 工具 | 版本 | 检查命令 |
|------|------|---------|
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |
| Java | 21 | `java -version` |
| Android SDK | API 36 | `sdkmanager --list` |
| Xcode | 15+ | `xcodebuild -version` |
| CocoaPods | 最新 | `pod --version` |

### 项目路径

```bash
PROJECT_ROOT=/Users/zerone/WorkBuddy/20260420104543
cd $PROJECT_ROOT
```

---

## 🔄 完整同步流程

### 步骤 1: 构建 Web 项目

```bash
# 1.1 进入项目目录
cd /Users/zerone/WorkBuddy/20260420104543

# 1.2 清理旧构建
rm -rf dist

# 1.3 安装依赖（如有更新）
npm install

# 1.4 构建生产版本
npm run build

# 1.5 验证构建产物
ls -la dist/
# 应包含: index.html, assets/, 静态资源
```

**✅ 成功标志**: `dist/` 目录包含 `index.html` 和 `assets/`

---

### 步骤 2: 同步到移动端项目

```bash
# 2.1 同步到 Android
npx cap sync android

# 2.2 同步到 iOS
npx cap sync ios

# 2.3 验证同步结果
# Android: 检查 android/app/src/main/assets/public/
ls android/app/src/main/assets/public/

# iOS: 检查 ios/App/App/public/
ls ios/App/App/public/
```

**✅ 成功标志**: 
- Android: `android/app/src/main/assets/public/index.html` 存在
- iOS: `ios/App/App/public/index.html` 存在

---

### 步骤 3: Android 构建

#### 3.1 环境检查

```bash
# 检查 Java 版本（必须为 21）
java -version

# 设置 Java 环境（如需要）
export JAVA_HOME=/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
```

#### 3.2 构建调试版 APK

```bash
cd /Users/zerone/WorkBuddy/20260420104543/android

# 清理旧构建
./gradlew clean --no-daemon

# 构建调试版
./gradlew assembleDebug --no-daemon

# 验证构建产物
ls -lh app/build/outputs/apk/debug/app-debug.apk
```

**✅ 成功标志**: `BUILD SUCCESSFUL` + `app-debug.apk` (约 60MB)

#### 3.3 构建发布版 AAB（上传 Google Play）

```bash
# 构建 AAB（Android App Bundle）
./gradlew bundleRelease --no-daemon

# 验证构建产物
ls -lh app/build/outputs/bundle/release/app-release.aab
```

**✅ 成功标志**: `BUILD SUCCESSFUL` + `app-release.aab`

#### 3.4 安装到设备测试

```bash
# 连接设备或启动模拟器
/Users/zerone/Library/Android/sdk/platform-tools/adb devices

# 安装调试版
/Users/zerone/Library/Android/sdk/platform-tools/adb install \
  app/build/outputs/apk/debug/app-debug.apk

# 启动 App
/Users/zerone/Library/Android/sdk/platform-tools/adb shell am start \
  -n com.forestfamily.app/.MainActivity
```

---

### 步骤 4: iOS 构建

#### 4.1 环境检查

```bash
# 检查 Xcode 版本
xcodebuild -version

# 检查 CocoaPods
pod --version
```

#### 4.2 安装依赖

```bash
cd /Users/zerone/WorkBuddy/20260420104543/ios/App

# 安装/更新 Pods
pod install

# 或清理后重新安装
rm -rf Pods Podfile.lock
pod install
```

**✅ 成功标志**: `Pod installation complete!`

#### 4.3 打开 Xcode 项目

```bash
# 打开 Xcode 工作区
open /Users/zerone/WorkBuddy/20260420104543/ios/App/App.xcworkspace
```

#### 4.4 Xcode 中构建

在 Xcode 中执行：

1. **选择目标设备**: 真机或模拟器
2. **选择 Scheme**: `App` → `Any iOS Device` (归档) 或具体设备
3. **构建**: `Cmd + B` (Build)
4. **运行**: `Cmd + R` (Run)

#### 4.5 归档并导出（发布到 App Store）

```bash
# 命令行方式归档
cd /Users/zerone/WorkBuddy/20260420104543/ios/App

xcodebuild archive \
  -workspace App.xcworkspace \
  -scheme App \
  -archivePath build/App.xcarchive

# 导出 IPA
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportOptionsPlist exportOptions.plist \
  -exportPath build/Exported
```

---

### 步骤 5: 版本验证

#### 5.1 Web 版本验证

```bash
# 检查线上版本
curl -s https://dist-taupe-nu.vercel.app/index.html | grep -o 'index-[^"]*\.js' | head -1

# 检查本地构建版本
ls /Users/zerone/WorkBuddy/20260420104543/dist/assets/index-*.js
```

#### 5.2 Android 版本验证

```bash
# 检查 APK 中的 Web 资源
unzip -l app/build/outputs/apk/debug/app-debug.apk | grep "index.html"

# 检查版本号
cat android/app/build.gradle | grep "versionCode\|versionName"
```

#### 5.3 iOS 版本验证

```bash
# 检查 Info.plist 版本
cat ios/App/App/Info.plist | grep -A1 "CFBundleShortVersionString"
```

---

## 📁 构建产物清单

### Android

| 文件 | 路径 | 用途 |
|------|------|------|
| 调试版 APK | `android/app/build/outputs/apk/debug/app-debug.apk` | 开发测试 |
| 发布版 APK | `android/app/build/outputs/apk/release/app-release.apk` | 内测分发 |
| 发布版 AAB | `android/app/build/outputs/bundle/release/app-release.aab` | Google Play |

### iOS

| 文件 | 路径 | 用途 |
|------|------|------|
| 归档文件 | `ios/App/build/App.xcarchive` | Xcode 归档 |
| 导出 IPA | `ios/App/build/Exported/*.ipa` | 分发/上传 |

---

## 🚀 快速命令参考

### 一键构建脚本

```bash
#!/bin/bash
# save as: scripts/build-mobile.sh

set -e

echo "🚀 ForestFamily 移动端构建脚本"
echo "================================"

# 1. 构建 Web
echo "📦 步骤 1: 构建 Web 项目..."
cd /Users/zerone/WorkBuddy/20260420104543
npm run build

# 2. 同步到移动端
echo "📱 步骤 2: 同步到移动端..."
npx cap sync android
npx cap sync ios

# 3. 构建 Android
echo "🤖 步骤 3: 构建 Android..."
cd android
./gradlew assembleDebug --no-daemon
echo "✅ Android 调试版: app/build/outputs/apk/debug/app-debug.apk"

# 4. 构建 iOS（命令行方式）
echo "🍎 步骤 4: 构建 iOS..."
cd ../ios/App
pod install
xcodebuild build -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 15'
echo "✅ iOS 构建完成"

echo ""
echo "🎉 所有构建完成！"
```

### 常用检查命令

```bash
# 检查 Android 设备
adb devices

# 安装 Android APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 查看 Android 日志
adb logcat | grep "ForestFamily\|Capacitor"

# 启动 iOS 模拟器
open -a Simulator

# iOS 设备列表
xcrun simctl list devices
```

---

## ⚠️ 常见问题

### Android

| 问题 | 解决方案 |
|------|---------|
| `minSdkVersion 23` 错误 | 升级到 `minSdkVersion = 24` in `variables.gradle` |
| `compileSdk 35` 不支持 | 升级到 `compileSdkVersion = 36` |
| AGP 版本过低 | 升级 `build.gradle` 中 `classpath 'com.android.tools.build:gradle:8.9.1'` |
| TLS 握手失败 | 检查网络，稍后重试 |
| Java 版本不匹配 | 安装 Java 21: `brew install openjdk@21` |

### iOS

| 问题 | 解决方案 |
|------|---------|
| Pod 安装失败 | `rm -rf Pods Podfile.lock && pod install` |
| 签名错误 | Xcode → Signing & Capabilities → 选择 Team |
| 构建失败 | Product → Clean Build Folder → 重新构建 |
| 找不到模块 | `npx cap sync ios` 后重新打开 Xcode |

---

## 📋 发布检查清单

### 发布前检查

- [ ] Web 版本已部署到生产环境
- [ ] `npm run build` 成功
- [ ] `npx cap sync` 成功
- [ ] Android 调试版安装测试通过
- [ ] iOS 模拟器测试通过
- [ ] 真机测试通过（如有条件）
- [ ] 版本号已更新
- [ ] 更新日志已准备

### Android 发布

- [ ] `app-release.aab` 构建成功
- [ ] 在 Google Play Console 上传 AAB
- [ ] 填写应用信息、截图、隐私政策
- [ ] 提交审核

### iOS 发布

- [ ] Xcode Archive 成功
- [ ] 上传到 App Store Connect
- [ ] 填写应用信息、截图
- [ ] 提交审核

---

## 🔗 相关文档

- [Capacitor 官方文档](https://capacitorjs.com/docs)
- [Android 开发者指南](https://developer.android.com/studio/publish)
- [App Store 发布指南](https://developer.apple.com/documentation/xcode/distributing-your-app)

---

## 📝 更新记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-05-01 | 1.0 | 初始版本，Android 同步流程验证通过 |

---

**注意**: 每次 Web 版本更新后，务必执行此工作流同步到移动端，确保 App 与线上版本一致！
