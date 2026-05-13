#!/bin/bash
# Forest Family App - 全平台同步更新脚本
# 同步更新 Web、iOS、Android 和小程序

set -e

PROJECT_ROOT="/Users/zerone/WorkBuddy/20260420104543"

echo "🌲 Forest Family App - 全平台同步更新"
echo "======================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. 构建 Web
echo -e "${BLUE}[1/5] 构建 Web 资源...${NC}"
cd "$PROJECT_ROOT"
npm run build
echo -e "${GREEN}✓ Web 构建完成${NC}"

# 2. 同步 iOS 和 Android
echo -e "${BLUE}[2/5] 同步 iOS 和 Android...${NC}"
npx cap sync
echo -e "${GREEN}✓ iOS 和 Android 同步完成${NC}"

# 3. 构建小程序
echo -e "${BLUE}[3/5] 构建微信小程序...${NC}"
cd "$PROJECT_ROOT/miniprogram"
npm run build:weapp
echo -e "${GREEN}✓ 小程序构建完成${NC}"

# 4. 部署 Web（Vercel + Cloudflare）
echo -e "${BLUE}[4/5] 部署 Web 到 Vercel...${NC}"
cd "$PROJECT_ROOT"
: "${VERCEL_TOKEN:?请先在环境变量中设置 VERCEL_TOKEN}"
vercel deploy --prebuilt --prod
echo -e "${GREEN}✓ Vercel 部署完成${NC}"

echo -e "${BLUE}[5/5] 部署 Web 到 Cloudflare...${NC}"
: "${CLOUDFLARE_API_TOKEN:?请先在环境变量中设置 CLOUDFLARE_API_TOKEN}"
wrangler pages deploy dist --project-name=wish-card-backup --branch production --commit-dirty=true
echo -e "${GREEN}✓ Cloudflare 部署完成${NC}"

echo ""
echo -e "${GREEN}🎉 全平台同步更新完成！${NC}"
echo ""
echo "部署地址："
echo "  Web (Vercel):    https://wish-card-dinghao7-7273s-projects.vercel.app"
echo "  Web (Cloudflare): https://5c4b53ee.wish-card-backup.pages.dev"
echo ""
echo "原生应用："
echo "  iOS:     打开 ios/App/App.xcworkspace 编译运行"
echo "  Android: 打开 android 项目编译运行"
echo ""
echo "小程序："
echo "  使用微信开发者工具打开 miniprogram/dist 目录"
