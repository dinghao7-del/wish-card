#!/bin/bash

# Xcode 和 iOS 开发环境安装脚本
# 愿望卡 iOS 版本

set -e

echo "🚀 愿望卡 iOS 开发环境安装脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Xcode 是否已安装
check_xcode() {
    echo "📱 检查 Xcode 安装状态..."
    
    if [ -d "/Applications/Xcode.app" ]; then
        echo -e "${GREEN}✓ Xcode 已安装${NC}"
        
        # 检查版本
        XCODE_VERSION=$(/usr/bin/xcodebuild -version 2>/dev/null | head -n 1 || echo "未知")
        echo "  版本: $XCODE_VERSION"
        
        # 检查命令行工具路径
        CURRENT_PATH=$(xcode-select -p 2>/dev/null || echo "未设置")
        echo "  当前路径: $CURRENT_PATH"
        
        if [[ "$CURRENT_PATH" == *"CommandLineTools"* ]]; then
            echo -e "${YELLOW}⚠ 需要切换到 Xcode 路径${NC}"
            return 1
        fi
        return 0
    else
        echo -e "${RED}✗ Xcode 未安装${NC}"
        echo ""
        echo "请从以下方式安装 Xcode："
        echo "  1. Mac App Store: https://apps.apple.com/cn/app/xcode/id497799835"
        echo "  2. Apple 开发者网站: https://developer.apple.com/download/all/"
        echo ""
        echo "安装完成后重新运行此脚本"
        return 1
    fi
}

# 配置 Xcode 命令行工具
setup_xcode_cli() {
    echo ""
    echo "🔧 配置 Xcode 命令行工具..."
    
    if [ -d "/Applications/Xcode.app" ]; then
        echo "设置 Xcode 为默认开发目录..."
        sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
        
        echo "同意许可协议..."
        sudo xcodebuild -license accept 2>/dev/null || true
        
        echo -e "${GREEN}✓ Xcode 命令行工具配置完成${NC}"
    fi
}

# 检查并安装 CocoaPods
check_cocoapods() {
    echo ""
    echo "📦 检查 CocoaPods..."
    
    if command -v pod &> /dev/null; then
        POD_VERSION=$(pod --version)
        echo -e "${GREEN}✓ CocoaPods 已安装 (版本 $POD_VERSION)${NC}"
    else
        echo "CocoaPods 未安装，正在安装..."
        
        if command -v brew &> /dev/null; then
            brew install cocoapods
            echo -e "${GREEN}✓ CocoaPods 安装完成${NC}"
        else
            echo -e "${RED}✗ 请先安装 Homebrew: https://brew.sh${NC}"
            exit 1
        fi
    fi
}

# 检查 Node.js 和 npm
check_node() {
    echo ""
    echo "🟢 检查 Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓ Node.js 已安装 ($NODE_VERSION)${NC}"
    else
        echo -e "${RED}✗ Node.js 未安装${NC}"
        echo "请安装 Node.js: https://nodejs.org"
        exit 1
    fi
}

# 同步 Capacitor iOS 项目
sync_capacitor() {
    echo ""
    echo "🔄 同步 Capacitor iOS 项目..."
    
    cd "$(dirname "$0")/.."
    
    echo "安装 npm 依赖..."
    npm install
    
    echo "构建 Web 应用..."
    npm run build
    
    echo "同步 iOS 项目..."
    npx cap sync ios
    
    echo -e "${GREEN}✓ Capacitor 同步完成${NC}"
}

# 安装 Pods 依赖
install_pods() {
    echo ""
    echo "📲 安装 iOS Pods 依赖..."
    
    cd "$(dirname "$0")/App"
    
    if [ -f "Podfile" ]; then
        pod install
        echo -e "${GREEN}✓ Pods 安装完成${NC}"
    else
        echo -e "${YELLOW}⚠ 未找到 Podfile${NC}"
    fi
}

# 打开 Xcode
open_xcode() {
    echo ""
    echo "🎯 打开 Xcode 项目..."
    
    cd "$(dirname "$0")/.."
    npx cap open ios
}

# 主流程
main() {
    echo "开始检查开发环境..."
    echo ""
    
    # 检查 Xcode
    if ! check_xcode; then
        setup_xcode_cli
    fi
    
    # 检查其他依赖
    check_node
    check_cocoapods
    
    # 询问是否同步项目
    echo ""
    read -p "是否同步 Capacitor iOS 项目? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sync_capacitor
        install_pods
        
        # 询问是否打开 Xcode
        echo ""
        read -p "是否打开 Xcode? (y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open_xcode
        fi
    fi
    
    echo ""
    echo "================================"
    echo -e "${GREEN}✓ 环境设置完成！${NC}"
    echo ""
    echo "后续步骤:"
    echo "  1. 在 Xcode 中选择你的 Development Team"
    echo "  2. 配置签名证书"
    echo "  3. 连接 iPhone/iPad 或选择模拟器"
    echo "  4. 点击 Run 按钮运行应用"
    echo ""
}

# 运行主流程
main
