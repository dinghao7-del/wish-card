# 快速参考卡片 - 愿望卡 App 构建

## 🚀 一键构建

```bash
cd /Users/zerone/WorkBuddy/20260420104543
./scripts/build-apps.sh
```

**输出**：
- Android APK: `android/app/build/outputs/apk/`
- Android AAB: `android/app/build/outputs/bundle/release/`
- iOS: 在 Xcode 中打开 `ios/App/App.xcworkspace`

---

## 📱 Android 快速构建

### 调试版（无需签名）
```bash
cd android && ./gradlew assembleDebug
# 输出：android/app/build/outputs/apk/debug/app-debug.apk
```

### 发布版（已签名）
```bash
cd android && ./gradlew assembleRelease
# 输出：android/app/build/outputs/apk/release/app-release.apk
```

### AAB（推荐上传到 Google Play）
```bash
cd android && ./gradlew bundleRelease
# 输出：android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🍎 iOS 快速构建

### 方法 1：Xcode（推荐）
```bash
open ios/App/App.xcworkspace
```
1. 选择目标设备
2. 点击 ▶️ 运行（调试）
3. 发布：`Product` → `Archive` → `Distribute App`

### 方法 2：命令行
```bash
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 15' build
```

---

## 🔑 签名信息

### Android
- **密钥库**：`android/wish-card-release-key.keystore`
- **别名**：`wish-card-key`
- **密码**：`wishcard123`
- **有效期**：10000 天

### iOS
- **Bundle ID**：`com.forestfamily.app`
- **签名**：在 Xcode 中配置（`Signing & Capabilities`）

---

## 📦 构建产物位置

| 平台 | 类型 | 位置 |
|------|------|------|
| Android | 调试版 APK | `android/app/build/outputs/apk/debug/` |
| Android | 发布版 APK | `android/app/build/outputs/apk/release/` |
| Android | AAB（推荐） | `android/app/build/outputs/bundle/release/` |
| iOS | 模拟器 | `ios/App/build/Build/Products/Debug-iphonesimulator/` |
| iOS | 真机（Archive） | 在 Xcode Organizer 中导出 |

---

## 📋 常用命令

### Capacitor 同步
```bash
npx cap sync          # 同步 Web 资源到原生项目
npx cap open android  # 打开 Android Studio
npx cap open ios      # 打开 Xcode
```

### 测试
```bash
npm run test              # 单元测试
npm run test:e2e         # E2E 测试
npm run test:tokens       # 设计令牌验证
```

### 构建 Web 项目
```bash
npm run build            # 构建生产版本到 `dist/`
```

---

## 📚 文档位置

| 文档 | 位置 | 说明 |
|------|------|------|
| Android 配置 | `ANDROID_SETUP_GUIDE.md` | Android 详细配置指南 |
| iOS 配置 | `IOS_SETUP_GUIDE.md` | iOS 详细配置指南 |
| 测试报告 | `TEST_REPORT.md` | 测试体系和结果 |
| 构建总结 | `APP_BUILD_SUMMARY.md` | 构建流程总结 |
| 本文档 | `QUICK_REFERENCE.md` | 快速参考卡片 |

---

## ⚠️ 常见问题

### Android 构建失败
```bash
cd android && ./gradlew clean
npm run build && npx cap sync
cd android && ./gradlew assembleDebug
```

### iOS 签名失败
1. 打开 Xcode
2. 选择 `App` Target
3. `Signing & Capabilities` → 选择 Team
4. 确保 Bundle ID 唯一

### Capacitor 同步失败
```bash
npm install @capacitor/android @capacitor/ios
npx cap sync
```

---

## 📞 技术支持

- **项目路径**：`/Users/zerone/WorkBuddy/20260420104543`
- **Git 仓库**：`https://github.com/dinghao7-del/wish-card`
- **CI/CD**：GitHub Actions（已配置）

---

**最后更新**：2026-04-30 15:30  
**版本**：1.0  
**维护者**：AI Agent
