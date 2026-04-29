#!/bin/bash

# 模板库迁移自动化脚本
# 使用 Docker 运行 psql 来执行 SQL 迁移

echo "=========================================="
echo "  模板库数据库迁移工具"
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
    echo "  SUPABASE_DB_PASSWORD='your-password' ./run-migration.sh"
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

# 检查 SQL 文件是否存在
SQL_FILE="supabase-templates-migration-CLEAN.sql"
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ 错误：SQL 文件不存在: $SQL_FILE"
    exit 1
fi

echo "✅ 找到 SQL 文件: $SQL_FILE"
echo ""

# 使用 Docker 运行 psql
echo "🚀 开始执行数据库迁移..."
echo ""

docker run --rm \
  -e PGPASSWORD="$SUPABASE_DB_PASSWORD" \
  -v "$(pwd)/$SQL_FILE:/migrations/$SQL_FILE" \
  postgres:15-alpine \
  psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "/migrations/$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 迁移执行成功！"
    echo ""
    echo "下一步：导入种子数据"
    echo "  SUPABASE_DB_PASSWORD='your-password' ./run-seed.sh"
else
    echo ""
    echo "❌ 迁移执行失败，请检查错误信息"
    exit 1
fi
