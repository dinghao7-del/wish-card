#!/bin/bash
# 清除所有缓存并重新构建
echo "1. 清除 Vite 缓存..."
rm -rf node_modules/.vite
rm -rf dist

echo "2. 清除浏览器缓存（如果需要）..."
# 这个需要用户在浏览器中手动清除

echo "3. 重新构建项目..."
npm run build

echo "4. 启动开发服务器..."
npm run dev
