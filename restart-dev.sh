#!/bin/bash
# 杀死所有 vite 进程
pkill -f "vite" 2>/dev/null
sleep 2
# 重新启动开发服务器
cd /Users/zerone/WorkBuddy/20260420104543
npm run dev
