#!/bin/bash
# 强制杀死所有 node 和 vite 进程
pkill -9 -f "node.*vite"
pkill -9 -f "npm.*dev"

sleep 3

# 重新启动开发服务器
cd /Users/zerone/WorkBuddy/20260420104543
npm run dev
