#!/bin/bash
# Forest Family - 清理并重启开发服务器

set -e

echo "=== Forest Family 清理重启脚本 ==="
echo ""

# 检查 Node.js 版本
echo "1. 检查 Node.js 版本..."
NODE_VERSION=$(node -v)
echo "   Node.js: $NODE_VERSION"

if [[ "$NODE_VERSION" =~ ^v2[45] ]]; then
  echo "   ⚠️  警告：Node.js 版本过高 ($NODE_VERSION)"
  echo "   请运行: nvm use 20"
  exit 1
fi
echo "   ✅ 版本正常"
echo ""

# 清理缓存
echo "2. 清理缓存..."
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite
echo "   ✅ 缓存已清理"
echo ""

# 检查依赖
echo "3. 检查依赖..."
if [ ! -d "node_modules" ]; then
  echo "   ⚠️  node_modules 不存在，重新安装..."
  npm install
else
  echo "   ✅ node_modules 存在"
fi
echo ""

# 启动开发服务器
echo "4. 启动开发服务器..."
echo "   按 Ctrl+C 停止服务器"
echo ""
npm run dev
