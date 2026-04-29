#!/bin/bash

# iOS 构建脚本
# 使用方式: 从项目根目录运行 ./ios/build.sh

set -e

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 获取项目根目录（脚本的上级目录）
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🚀 开始构建 iOS 应用..."
echo "📁 项目目录: $PROJECT_ROOT"

# 进入项目目录
cd "$PROJECT_ROOT"

# 1. 构建 Web 应用
echo "📦 构建 Web 应用..."
npm run build

# 2. 同步 Capacitor
echo "🔄 同步 Capacitor 配置..."
npx cap sync ios

# 3. 安装 CocoaPods 依赖
echo "📥 安装 CocoaPods 依赖..."
cd "$PROJECT_ROOT/ios/App"
pod install --repo-update

# 4. 打开 Xcode
echo "✅ 完成！正在打开 Xcode..."
cd "$PROJECT_ROOT"
npx cap open ios

echo ""
echo "📝 后续步骤："
echo "1. 在 Xcode 中选择你的 Development Team"
echo "2. 配置签名证书"
echo "3. 选择目标设备或模拟器"
echo "4. 点击 Run 按钮运行"
