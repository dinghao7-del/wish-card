#!/bin/bash

# 模板库种子数据导入脚本
# 使用 Docker 运行 psql 来执行 SQL 种子数据

echo "=========================================="
echo "  模板库种子数据导入工具"
echo "=========================================="
echo ""

# 检查是否提供了数据库密码
if [ -z "$SUPABASE_DB_PASSWORD" ]; then
    echo "❌ 错误：未设置数据库密码"
    echo ""
    echo "请先设置环境变量 SUPABASE_DB_PASSWORD："
    echo "  export SUPABASE_DB_PASSWORD='your-db-password'"
    echo ""
    echo "或者在命令行中提供密码："
    echo "  SUPABASE_DB_PASSWORD='your-password' ./run-seed.sh"
    echo ""
    exit 1
fi

# 数据库配置
DB_HOST="db.qdiuufuoleharmjfarzr.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"

echo "✅ 数据库配置："
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""

# 种子数据文件
SEED_FILE="supabase-task-templates-FIXED.sql"
if [ ! -f "$SEED_FILE" ]; then
    echo "❌ 错误：种子数据文件不存在: $SEED_FILE"
    exit 1
fi

echo "✅ 找到种子数据文件: $SEED_FILE"
echo ""

# 使用 Docker 运行 psql
echo "🚀 开始导入种子数据..."
echo ""

docker run --rm \
  -e PGPASSWORD="$SUPABASE_DB_PASSWORD" \
  -v "$(pwd)/$SEED_FILE:/seeds/$SEED_FILE" \
  postgres:15-alpine \
  psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "/seeds/$SEED_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 种子数据导入成功！"
    echo ""
    echo "验证数据："
    echo "  docker run --rm -e PGPASSWORD='$SUPABASE_DB_PASSWORD' postgres:15-alpine psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c \"SELECT type, COUNT(*) FROM templates GROUP BY type;\""
else
    echo ""
    echo "❌ 种子数据导入失败，请检查错误信息"
    exit 1
fi
