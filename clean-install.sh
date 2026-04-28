#!/bin/bash
set -e
echo "=== 彻底清理 node_modules 和 lock 文件 ==="
rm -rf node_modules package-lock.json
rm -rf /Users/zerone/WorkBuddy/20260420104543/node_modules
rm -f /Users/zerone/WorkBuddy/20260420104543/package-lock.json

echo "=== 清理 npm 缓存 ==="
npm cache clean --force

echo "=== 重新安装依赖 ==="
npm install

echo "=== 检查 React 是否有重复 ==="
npm ls react 2>&1 || true
npm ls react-dom 2>&1 || true

echo ""
echo "=== ✅ 完成！现在运行: npm run dev ==="
