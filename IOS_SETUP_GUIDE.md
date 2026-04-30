# iOS App 配置指南

## 概述

本文档指导如何配置 iOS App（Xcode 项目），使其可以成功构建和发布到 App Store。

**项目**：愿望卡 (Wish Card)  
**Bundle ID**：`com.forestfamily.app`  
**Xcode 项目路径**：`ios/App/App.xcworkspace`

---

## 步骤 1：打开 Xcode 项目

```bash
cd /Users/zerone/WorkBuddy/20260420104543
open ios/App/App.xcworkspace
```

---

## 步骤 2：配置 Signing & Capabilities

### 2.1 选择 Target
1. 在 Xcode 中，点击左侧导航栏的 `App` 项目
2. 选择 `TARGETS` → `App`
3. 点击 `Signing & Capabilities` 标签

### 2.2 配置签名
1. **Team**：选择你的 Apple Developer 账号
   - 如果没有，点击 `Add Account` 登录

2. **Bundle Identifier**：`com.forestfamily.app`
   - ✅ 应该已经自动填充

3. **Provisioning Profile**：
   - 选择 `Automatic` (推荐)
   - 或手动选择 Provisioning Profile

4. **Signing Certificate**：
   - 开发证书：`Apple Development`
   - 发布证书：`Apple Distribution`

### 2.3 启用必要功能
在 `Signing & Capabilities` 标签中，点击 `+ Capability` 添加：

1. **Push Notifications** (推送通知)
2. **Background Modes** → 勾选：
   - `Remote notifications`
   - `Background fetch`

---

## 步骤 3：配置 Info.plist

### 3.1 隐私权限说明
在 `Info.plist` 中添加以下键值（如果没有）：

| Key | Value | 说明 |
|-----|-------|------|
| `NSCameraUsageDescription` | "需要访问相机以拍摄照片" | 相机权限 |
| `NSPhotoLibraryUsageDescription` | "需要访问相册以选择照片" | 相册权限 |
| `NSLocationWhenInUseUsageDescription` | "需要访问位置以提供本地化服务" | 定位权限 |
| `NSMicrophoneUsageDescription` | "需要访问麦克风以录制语音" | 麦克风权限 |

### 3.2 配置方法
1. 在 Xcode 中点击 `Info.plist`
2. 点击 `+` 添加键值对
3. 或右键 `Info.plist` → `Open As` → `Source Code` 直接编辑

---

## 步骤 4：配置 App 图标和启动屏幕

### 4.1 App 图标
1. 点击 `Assets.xcassets`
2. 选择 `AppIcon`
3. 拖拽对应尺寸的图片到每个槽位：
   - iPhone App：60pt × 2 (@2x, @3x)
   - iPad App：76pt × 2 (@1x, @2x)
   - App Store：1024pt × 1 (@1x)

**图标位置**：`ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### 4.2 启动屏幕（Launch Screen）
1. 点击 `LaunchScreen.storyboard`
2. 使用 Interface Builder 设计启动屏幕
3. 或直接使用默认的 Capacitor 启动屏幕

---

## 步骤 5：构建和运行

### 5.1 选择目标设备
1. 在 Xcode 顶部工具栏，点击设备选择器
2. 选择：
   - **模拟器**：`iPhone 15 Simulator` (或其他型号)
   - **真机**：连接的 iPhone/iPad

### 5.2 运行（调试）
- 点击 ▶️ 按钮或按 `Cmd + R`
- 应用会在设备或模拟器上启动

### 5.3 构建（发布）
1. 点击菜单 `Product` → `Archive`
2. 等待构建完成
3. 在 `Organizer` 窗口中，点击 `Distribute App`
4. 选择分发方式：
   - `App Store Connect` (发布到 App Store)
   - `Ad Hoc` (内部分发)
   - `Enterprise` (企业分发)

---

## 步骤 6：发布到 App Store

### 6.1 准备元数据
在 [App Store Connect](https://appstoreconnect.apple.com) 中：
1. 创建新的 App 记录
2. 填写 App 信息：
   - 名称：愿望卡
   - 副标题：家庭愿望管理与奖励系统
   - 类别：生活助手
   - 描述：（详细的功能介绍）
   - 关键词：愿望卡,家庭,任务,奖励,Pomodoro

3. 上传截图：
   - iPhone：6.5 英寸 (iPhone 14 Pro Max)
   - iPad（如果需要）

### 6.2 上传二进制文件
在 Xcode Organizer 中：
1. 点击 `Distribute App`
2. 选择 `App Store Connect`
3. 选择 `Upload`
4. 等待上传完成

### 6.3 提交审核
在 App Store Connect 中：
1. 选择构建版本
2. 填写审核信息
3. 点击 `提交以供审核`

---

## 常见问题

### 问题 1：签名失败
**错误信息**：
```
Failed to register bundle identifier
```

**解决方案**：
1. 检查 Bundle ID 是否唯一
2. 在 Apple Developer 网站创建 App ID
3. 确保 Provisioning Profile 包含当前设备

---

### 问题 2：Capacitor 插件编译失败
**错误信息**：
```
ld: framework not found Capacitor
```

**解决方案**：
```bash
cd /Users/zerone/WorkBuddy/20260420104543/ios/App
pod install
```

---

### 问题 3：无法连接到设备
**错误信息**：
```
Device is busy
```

**解决方案**：
1. 解锁设备屏幕
2. 信任该电脑（设备弹出提示时点击"信任"）
3. 重启 Xcode 和設備

---

## 自动化脚本（可选）

### 使用命令行构建

#### 1. 构建模拟器版本
```bash
cd /Users/zerone/WorkBuddy/20260420104543/ios/App
xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build
```

#### 2. 归档（Archive）发布版本
```bash
xcodebuild \
  -workspace App.xcworkspace \
  -scheme App \
  -archivePath build/App.xcarchive \
  archive
```

#### 3. 导出 IPA 文件
```bash
xcodebuild \
  -exportArchive \
  -archivePath build/App.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/
```

**ExportOptions.plist** 示例：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
</dict>
</plist>
```

---

## 下一步

✅ 完成配置后：
1. 在模拟器或真机上测试所有功能
2. 修复任何 bug
3. 准备 App 截图和元数据
4. 提交到 App Store 审核

---

**配置完成时间**：2026-04-30  
**文档版本**：1.0  
**维护者**：AI Agent
