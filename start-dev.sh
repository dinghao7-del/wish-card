#!/bin/bash
# 杀掉占用 3000 端口的进程，然后重启 Vite 开发服务器

echo "🔍 检查端口 3000..."
PID=$(lsof -ti:3000 2>/dev/null)

if [ -n "$PID" ]; then
  echo "⚠️  端口 3000 被进程 $PID 占用，正在杀掉..."
  kill -9 $PID 2>/dev/null
  sleep 1
fi

echo "🚀 启动 Vite 开发服务器..."
cd "/Users/zerone/WorkBuddy/20260420104543"
npm run dev
