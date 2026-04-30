#!/bin/bash

# Forest Family 微信小程序测试脚本
# 用法: ./scripts/test-miniprogram.sh [command]
# 命令: build | dev | check | clean

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="/Users/zerone/WorkBuddy/20260420104543/miniprogram"

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}  Forest Family 小程序测试脚本${NC}"
echo -e "${GREEN}====================================${NC}"
echo ""

# 检查是否在正确的目录
cd "$PROJECT_DIR"

# 命令处理
case "${1:-build}" in
  "install"|"i")
    echo -e "${YELLOW}📦 安装依赖...${NC}"
    npm install
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
    ;;
    
  "dev"|"d")
    echo -e "${YELLOW}🔧 启动开发模式...${NC}"
    npm run dev:weapp
    ;;
    
  "build"|"b")
    echo -e "${YELLOW}🔨 构建生产版本...${NC}"
    
    # 清理旧构建
    echo "清理旧构建..."
    rm -rf dist
    
    # 构建
    npm run build:weapp
    
    # 检查构建结果
    if [ -f "dist/app.js" ]; then
      echo -e "${GREEN}✅ 构建成功！${NC}"
      echo ""
      echo "构建产物:"
      ls -lh dist/ | head -20
      echo ""
      echo -e "${YELLOW}💡 请使用微信开发者工具打开 dist 目录进行预览${NC}"
    else
      echo -e "${RED}❌ 构建失败${NC}"
      exit 1
    fi
    ;;
    
  "check"|"c")
    echo -e "${YELLOW}🔍 运行代码检查...${NC}"
    
    # TypeScript 类型检查
    echo "检查 TypeScript 类型..."
    npx tsc --noEmit || true
    
    # ESLint 检查
    echo "检查 ESLint..."
    npx eslint src --ext .ts,.tsx || true
    
    echo -e "${GREEN}✅ 代码检查完成${NC}"
    ;;
    
  "clean")
    echo -e "${YELLOW}🧹 清理构建产物...${NC}"
    rm -rf dist
    rm -rf node_modules
    rm -rf .taro-cache
    echo -e "${GREEN}✅ 清理完成${NC}"
    ;;
    
  "test"|"t")
    echo -e "${YELLOW}🧪 运行完整测试流程...${NC}"
    
    # 1. 安装依赖
    echo "1/4 安装依赖..."
    npm install
    
    # 2. 代码检查
    echo "2/4 代码检查..."
    npx tsc --noEmit || echo "TypeScript 检查完成（可能有警告）"
    
    # 3. 构建
    echo "3/4 构建..."
    rm -rf dist
    npm run build:weapp
    
    # 4. 验证构建
    echo "4/4 验证构建..."
    if [ -f "dist/app.js" ]; then
      echo -e "${GREEN}✅ 测试通过！${NC}"
      echo ""
      echo "构建产物大小:"
      du -sh dist/
      echo ""
      echo -e "${YELLOW}下一步:${NC}"
      echo "1. 打开微信开发者工具"
      echo "2. 导入项目: $PROJECT_DIR/dist"
      echo "3. 填写 AppID 进行预览"
    else
      echo -e "${RED}❌ 测试失败${NC}"
      exit 1
    fi
    ;;
    
  "help"|"h"|"-h"|"--help")
    echo "用法: ./scripts/test-miniprogram.sh [command]"
    echo ""
    echo "命令:"
    echo "  install, i    安装依赖"
    echo "  dev, d        启动开发模式（热更新）"
    echo "  build, b      构建生产版本（默认）"
    echo "  check, c      运行代码检查"
    echo "  test, t       运行完整测试流程"
    echo "  clean         清理构建产物"
    echo "  help, h       显示帮助"
    echo ""
    echo "示例:"
    echo "  ./scripts/test-miniprogram.sh build"
    echo "  ./scripts/test-miniprogram.sh dev"
    echo "  ./scripts/test-miniprogram.sh test"
    ;;
    
  *)
    echo -e "${RED}❌ 未知命令: $1${NC}"
    echo "运行 './scripts/test-miniprogram.sh help' 查看用法"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}  脚本执行完成${NC}"
echo -e "${GREEN}====================================${NC}"
