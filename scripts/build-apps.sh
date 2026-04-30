#!/bin/bash

# 快速构建脚本 - iOS 和 Android App
# 用途：自动化构建 iOS 和 Android App
# 作者：AI Agent
# 日期：2026-04-30

set -e  # 遇到错误立即退出

echo "🚀 开始构建愿望卡 App..."
echo ""

# 检查是否在项目根目录
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本！"
    exit 1
fi

# 步骤 1：构建 Web 项目
echo "📦 步骤 1/5：构建 Web 项目..."
npm run build
echo "✅ Web 项目构建完成！"
echo ""

# 步骤 2：同步 Capacitor
echo "🔄 步骤 2/5：同步 Capacitor 项目..."
npx cap sync
echo "✅ Capacitor 同步完成！"
echo ""

# 步骤 3：构建 Android App
echo "📱 步骤 3/5：构建 Android App..."
cd android

# 构建调试版
echo "  - 构建调试版 APK..."
./gradlew assembleDebug
echo "  ✅ 调试版 APK 已生成："
echo "     android/app/build/outputs/apk/debug/app-debug.apk"

# 构建发布版（需要签名）
echo "  - 构建发布版 APK..."
./gradlew assembleRelease
echo "  ✅ 发布版 APK 已生成："
echo "     android/app/build/outputs/apk/release/app-release.apk"

# 构建 AAB（推荐上传到 Google Play）
echo "  - 构建 Android App Bundle (AAB)..."
./gradlew bundleRelease
echo "  ✅ AAB 已生成："
echo "     android/app/build/outputs/bundle/release/app-release.aab"

cd ..
echo "✅ Android App 构建完成！"
echo ""

# 步骤 4：提示构建 iOS App（需要手动操作）
echo "🍎 步骤 4/5：构建 iOS App..."
echo "  ⚠️  由于 iOS 构建需要在 macOS 上使用 Xcode，请手动操作："
echo ""
echo "  方法 1：使用 Xcode（推荐）"
echo "    1. 打开 Xcode："
echo "       open ios/App/App.xcworkspace"
echo "    2. 选择目标设备（iPhone Simulator 或真机）"
echo "    3. 点击 ▶️ 按钮运行（调试）"
echo "    4. 发布到 App Store："
echo "       - 点击 Product → Archive"
echo "       - 在 Organizer 中点击 Distribute App"
echo ""
echo "  方法 2：使用命令行"
echo "    cd ios/App"
echo "    xcodebuild -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 15' build"
echo ""
read -p "  📝 是否要现在打开 Xcode？(y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    open ios/App/App.xcworkspace
    echo "  ✅ Xcode 已打开！请按照上述说明操作。"
else
    echo "  ⏭️  跳过 Xcode 打开，你可以稍后手动打开。"
fi
echo ""

# 步骤 5：生成构建报告
echo "📊 步骤 5/5：生成构建报告..."
echo ""

REPORT_FILE="BUILD_REPORT_$(date +%Y%m%d_%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# 构建报告

**构建时间**: $(date "+%Y-%m-%d %H:%M:%S")  
**构建版本**: $(node -p "require('./package.json').version")  
**Git Commit**: $(git rev-parse --short HEAD 2>/dev/null || echo "N/A")

---

## 构建产物

### Android
- **调试版 APK**: \`android/app/build/outputs/apk/debug/app-debug.apk\`
- **发布版 APK**: \`android/app/build/outputs/apk/release/app-release.apk\`
- **AAB (推荐)**: \`android/app/build/outputs/bundle/release/app-release.aab\`

### iOS
- **Xcode 项目**: \`ios/App/App.xcworkspace\`
- **构建方法**: 在 Xcode 中点击 Product → Archive

---

## 签名配置

### Android
- **密钥库**: \`android/wish-card-release-key.keystore\`
- **别名**: \`wish-card-key\`
- **密钥库密码**: \`wishcard123\`
- **密钥密码**: \`wishcard123\`
- **有效期**: 10000 天（约 27 年）

### iOS
- **Bundle ID**: \`com.forestfamily.app\`
- **签名**: 需要在 Xcode 中配置（Signing & Capabilities）

---

## 下一步

### Android
1. **测试 APK**：
   \`\`\`bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   \`\`\`

2. **上传到 Google Play**：
   - 登录 [Google Play Console](https://play.google.com/console)
   - 上传 \`app-release.aab\`
   - 填写应用信息和截图
   - 提交审核

### iOS
1. **在 Xcode 中归档**：
   - 打开 \`ios/App/App.xcworkspace\`
   - 选择 \`Product\` → \`Archive\`
   - 在 Organizer 中点击 \`Distribute App\`

2. **上传到 App Store**：
   - 登录 [App Store Connect](https://appstoreconnect.apple.com)
   - 填写应用信息和截图
   - 提交审核

---

## 文件完整性检查

\`\`\`bash
# Android APK 是否存在
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
ls -lh android/app/build/outputs/apk/release/app-release.apk

# Android AAB 是否存在
ls -lh android/app/build/outputs/bundle/release/app-release.aab

# iOS 项目是否存在
ls -d ios/App/App.xcworkspace
\`\`\`

---

**构建完成时间**: $(date "+%Y-%m-%d %H:%M:%S")
EOF

echo "✅ 构建报告已生成：$REPORT_FILE"
echo ""

# 完成
echo "🎉 构建完成！"
echo ""
echo "📂 构建产物位置："
echo "  Android APK:  android/app/build/outputs/apk/"
echo "  Android AAB:  android/app/build/outputs/bundle/release/"
echo "  iOS:          ios/App/App.xcworkspace (在 Xcode 中打开)"
echo ""
echo "📄 构建报告："
echo "  $REPORT_FILE"
echo ""
echo "📚 详细文档："
echo "  - Android 配置: ANDROID_SETUP_GUIDE.md"
echo "  - iOS 配置:    IOS_SETUP_GUIDE.md"
echo ""
echo "🚀 下一步："
echo "  1. 测试应用（安装到真机或模拟器）"
echo "  2. 准备应用截图和元数据"
echo "  3. 上传到应用商店"
echo ""
echo "祝你好运！🎊"
