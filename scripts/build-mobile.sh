#!/bin/bash
# ForestFamily 移动端构建脚本
# 使用方法: ./scripts/build-mobile.sh [android|ios|all]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_ROOT="/Users/zerone/WorkBuddy/20260420104543"
cd "$PROJECT_ROOT"

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}📌 $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# 检查环境
check_environment() {
    print_step "检查环境"
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装"
        exit 1
    fi
    print_success "Node.js: $(node -v)"
    
    # 检查 Java
    if ! command -v java &> /dev/null; then
        print_error "Java 未安装"
        exit 1
    fi
    print_success "Java: $(java -version 2>&1 | head -1)"
    
    # 检查 Android SDK
    if [ -d "$HOME/Library/Android/sdk" ]; then
        print_success "Android SDK 已安装"
    else
        print_warning "Android SDK 未找到"
    fi
}

# 构建 Web
build_web() {
    print_step "步骤 1: 构建 Web 项目"
    
    print_info "清理旧构建..."
    rm -rf dist
    
    print_info "安装依赖..."
    npm install
    
    print_info "构建生产版本..."
    npm run build
    
    if [ -f "dist/index.html" ]; then
        print_success "Web 构建成功"
        ls -lh dist/index.html
    else
        print_error "Web 构建失败"
        exit 1
    fi
}

# 同步到移动端
sync_mobile() {
    print_step "步骤 2: 同步到移动端"
    
    print_info "同步到 Android..."
    npx cap sync android
    
    print_info "同步到 iOS..."
    npx cap sync ios
    
    print_success "同步完成"
}

# 构建 Android
build_android() {
    print_step "步骤 3: 构建 Android"
    
    cd "$PROJECT_ROOT/android"
    
    # 设置 Java 21
    export JAVA_HOME=/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
    
    print_info "清理旧构建..."
    ./gradlew clean --no-daemon
    
    print_info "构建调试版 APK..."
    ./gradlew assembleDebug --no-daemon
    
    if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
        print_success "Android 调试版构建成功"
        ls -lh app/build/outputs/apk/debug/app-debug.apk
    else
        print_error "Android 调试版构建失败"
        exit 1
    fi
    
    # 询问是否构建发布版
    read -p "是否构建发布版 AAB? (y/n): " build_release
    if [ "$build_release" = "y" ]; then
        print_info "构建发布版 AAB..."
        ./gradlew bundleRelease --no-daemon
        
        if [ -f "app/build/outputs/bundle/release/app-release.aab" ]; then
            print_success "Android 发布版构建成功"
            ls -lh app/build/outputs/bundle/release/app-release.aab
        else
            print_error "Android 发布版构建失败"
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

# 构建 iOS
build_ios() {
    print_step "步骤 4: 构建 iOS"
    
    cd "$PROJECT_ROOT/ios/App"
    
    print_info "安装 CocoaPods 依赖..."
    pod install
    
    print_info "构建 iOS 项目..."
    xcodebuild build \
        -workspace App.xcworkspace \
        -scheme App \
        -destination 'platform=iOS Simulator,name=iPhone 15' \
        -quiet
    
    if [ $? -eq 0 ]; then
        print_success "iOS 构建成功"
    else
        print_error "iOS 构建失败"
        print_info "请在 Xcode 中手动构建: open App.xcworkspace"
    fi
    
    cd "$PROJECT_ROOT"
}

# 安装到设备
install_to_device() {
    print_step "安装到设备"
    
    # 检查 Android 设备
    devices=$(/Users/zerone/Library/Android/sdk/platform-tools/adb devices | grep -v "List" | grep "device" | wc -l)
    
    if [ "$devices" -gt 0 ]; then
        print_info "发现 $devices 个 Android 设备"
        print_info "安装调试版 APK..."
        
        /Users/zerone/Library/Android/sdk/platform-tools/adb install \
            "$PROJECT_ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
        
        if [ $? -eq 0 ]; then
            print_success "APK 安装成功"
            print_info "启动 App..."
            /Users/zerone/Library/Android/sdk/platform-tools/adb shell am start \
                -n com.forestfamily.app/.MainActivity
        else
            print_error "APK 安装失败"
        fi
    else
        print_warning "未找到 Android 设备"
        print_info "请连接设备或启动模拟器"
    fi
}

# 显示帮助
show_help() {
    echo "ForestFamily 移动端构建脚本"
    echo ""
    echo "用法: ./scripts/build-mobile.sh [选项]"
    echo ""
    echo "选项:"
    echo "  android     仅构建 Android"
    echo "  ios         仅构建 iOS"
    echo "  all         构建 Android 和 iOS (默认)"
    echo "  web         仅构建 Web"
    echo "  sync        仅同步到移动端"
    echo "  install     安装到设备"
    echo "  help        显示帮助"
    echo ""
    echo "示例:"
    echo "  ./scripts/build-mobile.sh           # 构建全部"
    echo "  ./scripts/build-mobile.sh android   # 仅构建 Android"
    echo "  ./scripts/build-mobile.sh ios       # 仅构建 iOS"
}

# 主函数
main() {
    echo "🚀 ForestFamily 移动端构建脚本"
    echo "================================"
    
    # 检查参数
    TARGET="${1:-all}"
    
    case "$TARGET" in
        "help"|"-h"|"--help")
            show_help
            exit 0
            ;;
        "web")
            check_environment
            build_web
            ;;
        "sync")
            sync_mobile
            ;;
        "android")
            check_environment
            build_web
            sync_mobile
            build_android
            install_to_device
            ;;
        "ios")
            check_environment
            build_web
            sync_mobile
            build_ios
            ;;
        "install")
            install_to_device
            ;;
        "all"|"")
            check_environment
            build_web
            sync_mobile
            build_android
            build_ios
            print_step "构建完成"
            print_success "Android: android/app/build/outputs/apk/debug/app-debug.apk"
            print_success "iOS: 请在 Xcode 中归档并导出"
            ;;
        *)
            print_error "未知选项: $TARGET"
            show_help
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}🎉 完成!${NC}"
}

# 执行主函数
main "$@"
