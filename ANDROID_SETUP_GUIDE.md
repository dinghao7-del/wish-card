# Android App 配置与构建指南

## 概述

本文档指导如何配置和构建 Android App（使用 Android Studio 或命令行）。

**项目**：愿望卡 (Wish Card)  
**包名**：`com.forestfamily.app`  
**项目路径**：`android/`  

---

## 步骤 1：打开 Android 项目

### 方法 A：使用 Android Studio (推荐)

```bash
cd /Users/zerone/WorkBuddy/20260420104543
npx cap open android
```

这会使用 Android Studio 打开项目。

### 方法 B：命令行构建

```bash
cd /Users/zerone/WorkBuddy/20260420104543/android
./gradlew assembleDebug     # 调试版（无需签名）
./gradlew assembleRelease   # 发布版（需要签名）
```

---

## 步骤 2：配置签名（发布版）

### 2.1 签名密钥已生成 ✅

**密钥信息**：
- 文件路径：`android/wish-card-release-key.keystore`
- 别名：`wish-card-key`
- 密钥库密码：`wishcard123`
- 密钥密码：`wishcard123`
- 有效期：10000 天（约 27 年）

### 2.2 签名配置已添加 ✅

**文件**：`android/app/build.gradle.kts`

已包含以下配置：
```kotlin
signingConfigs {
    create("release") {
        storeFile = file("../wish-card-release-key.keystore")
        storePassword = "wishcard123"
        keyAlias = "wish-card-key"
        keyPassword = "wishcard123"
    }
}

buildTypes {
    release {
        signingConfig = signingConfigs.getByName("release")
        // ...
    }
}
```

---

## 步骤 3：配置应用信息

### 3.1 应用名称

**文件**：`android/app/src/main/res/values/strings.xml`

```xml
<resources>
    <string name="app_name">愿望卡</string>
</resources>
```

### 3.2 应用图标

**位置**：`android/app/src/main/res/mipmap-*/`

替换以下文件：
- `ic_launcher.png` (圆形图标)
- `ic_launcher_round.png` (方形图标)

**尺寸要求**：
- `mipmap-mdpi/`：48 × 48 px
- `mipmap-hdpi/`：72 × 72 px
- `mipmap-xhdpi/`：96 × 96 px
- `mipmap-xxhdpi/`：144 × 144 px
- `mipmap-xxxhdpi/`：192 × 192 px

### 3.3 启动屏幕（Splash Screen）

**文件**：`android/app/src/main/res/drawable/launch_screen.xml`

Capacitor 已自动配置启动屏幕，如需自定义可修改此文件。

---

## 步骤 4：构建 APK/AAB

### 4.1 调试版（无需签名）

**用途**：内部测试、开发调试

```bash
cd /Users/zerone/WorkBuddy/20260420104543/android
./gradlew assembleDebug
```

**输出位置**：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**安装到设备**：
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

### 4.2 发布版（已签名）

**用途**：上传到 Google Play Store

```bash
cd /Users/zerone/WorkBuddy/20260420104543/android
./gradlew assembleRelease
```

**输出位置**：
```
android/app/build/outputs/apk/release/app-release.apk
```

---

### 4.3 Android App Bundle (AAB) - 推荐

**用途**：上传到 Google Play Store（更小的下载体积）

```bash
cd /Users/zerone/WorkBuddy/20260420104543/android
./gradlew bundleRelease
```

**输出位置**：
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 步骤 5：在 Android Studio 中构建

### 5.1 构建调试版

1. 打开 Android Studio
2. 等待 Gradle 同步完成
3. 点击菜单 `Build` → `Build Bundle(s) / APK(s)` → `Build APK(s)`
4. 选择 `debug` variant
5. 等待构建完成

**输出位置**：`android/app/build/outputs/apk/debug/`

---

### 5.2 构建发布版

1. 打开 Android Studio
2. 点击菜单 `Build` → `Generate Signed Bundle / APK`
3. 选择：
   - ☑️ Android App Bundle (推荐)
   - ☐ APK
4. 点击 `Next`
5. 选择密钥库：
   - Key store path: `../wish-card-release-key.keystore`
   - Key store password: `wishcard123`
   - Key alias: `wish-card-key`
   - Key password: `wishcard123`
6. 点击 `Next`
7. 选择 `release` build variant
8. 点击 `Finish`
9. 等待构建完成

**输出位置**：`android/app/build/outputs/bundle/release/`

---

## 步骤 6：发布到 Google Play Store

### 6.1 准备元数据

在 [Google Play Console](https://play.google.com/console) 中：

1. 创建新的应用
2. 填写应用信息：
   - **应用名称**：愿望卡
   - **简短描述**（80 字符）：家庭愿望管理与奖励系统
   - **完整描述**：（详细功能介绍）
   - **图标**：512 × 512 px (PNG)
   - **特色图片**：1024 × 500 px (JPEG/PNG)

3. 上传截图：
   - Phone：(最少 2 张，最多 8 张)
   - 7-inch tablet：(可选)
   - 10-inch tablet：(可选)

### 6.2 上传 AAB 文件

1. 在 Play Console 中，选择 `发布` → `生产`
2. 点击 `创建新发布`
3. 上传 `app-release.aab`
4. 填写版本说明
5. 点击 `查看发布`
6. 确认无误后，点击 `开始发布`

---

## 常见问题

### 问题 1：Gradle 同步失败

**错误信息**：
```
Could not resolve all dependencies
```

**解决方案**：
```bash
cd /Users/zerone/WorkBuddy/20260420104543/android
./gradlew clean
./gradlew build
```

或在 Android Studio 中：
1. 点击 `File` → `Invalidate Caches / Restart`
2. 点击 `Invalidate and Restart`

---

### 问题 2：签名失败

**错误信息**：
```
Failed to read key from keystore
```

**可能原因**：
1. 密钥库密码错误
2. 密钥密码错误
3. 密钥库文件损坏

**解决方案**：
- 检查 `build.gradle.kts` 中的密码是否正确
- 重新生成密钥库（注意备份！）

---

### 问题 3：构建失败（内存不足）

**错误信息**：
```
Java heap space
```

**解决方案**：

编辑 `android/gradle.properties`：
```properties
org.gradle.jvmargs=-Xmx4096m -Dfile.encoding=UTF-8
```

---

### 问题 4：Capacitor 同步失败

**错误信息**：
```
Unable to find node_modules/@capacitor/android
```

**解决方案**：
```bash
cd /Users/zerone/WorkBuddy/20260420104543
npm install
npx cap sync
```

---

## 自动化脚本

### 快速构建脚本

**文件**：`android/build-apk.sh`

```bash
#!/bin/bash

echo "🚀 开始构建 Android App..."

# 1. 构建 Web 项目
echo "📦 构建 Web 项目..."
cd /Users/zerone/WorkBuddy/20260420104543
npm run build

# 2. 同步 Capacitor
echo "🔄 同步 Capacitor..."
npx cap sync

# 3. 构建 APK
echo "📱 构建 APK..."
cd android
./gradlew assembleRelease

# 4. 输出位置
echo "✅ 构建完成！"
echo "📦 APK 位置："
echo "   android/app/build/outputs/apk/release/app-release.apk"
echo "📦 AAB 位置："
echo "   android/app/build/outputs/bundle/release/app-release.aab"
```

**使用方法**：
```bash
chmod +x android/build-apk.sh
./android/build-apk.sh
```

---

## 下一步

✅ 完成构建后：
1. 在真机上测试所有功能
2. 检查性能（启动速度、内存占用）
3. 验证原生功能（相机、定位、推送）
4. 准备应用截图和元数据
5. 上传到 Google Play Store

---

## 检查清单

构建前，请确认：

- [ ] ✅ `npm run build` 成功
- [ ] ✅ `npx cap sync` 成功
- [ ] ✅ 签名密钥已生成（`wish-card-release-key.keystore`）
- [ ] ✅ `build.gradle.kts` 签名配置正确
- [ ] ✅ 应用图标已替换
- [ ] ✅ 版本号已更新（`versionCode` 和 `versionName`）

---

**配置完成时间**：2026-04-30  
**文档版本**：1.0  
**维护者**：AI Agent
