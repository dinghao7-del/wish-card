#!/bin/bash
# Cloudflare Pages 部署脚本

cd /Users/zerone/WorkBuddy/20260420104543

: "${CLOUDFLARE_API_TOKEN:?请先在环境变量中设置 CLOUDFLARE_API_TOKEN}"

wrangler pages deploy dist \
  --project-name=wish-card-backup \
  --commit-message="Deploy" \
  --branch=main \
  --commit-dirty=true
