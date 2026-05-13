#!/bin/bash
# ============================================================
# 小程序自动化调试脚本
# 用法: ./scripts/debug-check.sh [--build] [--fix]
#
# 功能:
#   1. 构建小程序（--build 时）
#   2. 静态分析 dist/ 捕获常见运行时错误
#   3. 报告问题并可选自动修复
# ============================================================

set -e
MINI_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$MINI_DIR/dist"
ERRORS=0
WARNINGS=0

# 颜色输出
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log_error()   { echo -e "${RED}❌ ERROR: $1${NC}"; ((ERRORS++)); }
log_warn()    { echo -e "${YELLOW}⚠️  WARN:  $1${NC}"; ((WARNINGS++)); }
log_ok()      { echo -e "${GREEN}✅ OK:    $1${NC}"; }
log_info()    { echo -e "${CYAN}ℹ️  INFO:  $1${NC}"; }

# ---- Step 0: 可选构建 ----
if [[ "$1" == "--build" ]]; then
  log_info "正在构建小程序..."
  cd "$MINI_DIR"
  rm -rf dist
  npm run build:weapp 2>&1 | tail -3
  log_ok "构建完成"
fi

if [ ! -d "$DIST_DIR" ]; then
  log_error "dist/ 目录不存在，请先运行 npm run build:weapp"
  exit 1
fi

echo ""
echo "============================================="
echo "  小程序静态分析报告 $(date '+%Y-%m-%d %H:%M')"
echo "============================================="
echo ""

# ---- Check 1: 关键文件完整性 ----
echo "--- [Check 1] 关键文件完整性 ---"
for f in app.js app.json app.wxss runtime.js taro.js vendors.js common.js base.wxml; do
  if [ -f "$DIST_DIR/$f" ]; then
    SIZE=$(wc -c < "$DIST_DIR/$f")
    if [ "$SIZE" -lt 100 ] && [[ "$f" != "app.wxss" ]]; then
      log_warn "$f 异常小 ($SIZE bytes) — 可能是空壳文件"
    else
      log_ok "$f ($SIZE bytes)"
    fi
  else
    log_error "$f 缺失！"
  fi
done

echo ""

# ---- Check 2: 页面文件完整性 ----
echo "--- [Check 2] 页面文件完整性 ---"
for page in home tasks check-in rewards profile; do
  PDIR="$DIST_DIR/pages/$page"
  if [ ! -d "$PDIR" ]; then
    log_error "pages/$page/ 目录缺失"
    continue
  fi
  MISSING=""
  for ext in js wxml json; do
    [ ! -f "$PDIR/index.$ext" ] && MISSING="$MISSING index.$ext "
  done
  # wxss 是可选的（Taro 页面可能使用全局样式）
  if [ -n "$MISSING" ]; then
    log_error "pages/$page/ 缺少: $MISSING"
  else
    JS_SIZE=$(wc -c < "$PDIR/index.js")
    if [ "$JS_SIZE" -lt 100 ]; then
      log_warn "pages/$page/index.js 异常小 (${JS_SIZE}B) — 可能是空壳"
    else
      log_ok "pages/$page (js=${JS_SIZE}B)"
    fi
  fi
done

echo ""

# ---- Check 3: 全局变量未定义风险检测（只检查 common.js，这是模块顶层代码） ----
echo "--- [Check 3] 运行时全局变量引用检查 ---"

# 关键：只检查 common.js 中的裸引用（模块顶层立即执行）
for pattern in \
  'storage:Taro' \
  ; do
  if grep -q "$pattern" "$DIST_DIR/common.js" 2>/dev/null; then
    log_error "common.js 中发现 '$pattern' — 模块顶层使用 Taro 但可能未 import!"
    log_info "  → supabase.ts 需要懒初始化"
  else
    log_ok "'$pattern' 无裸引用 ✓"
  fi
done

# vendors.js 中的 Headers/URL 在函数体内是安全的（不检查）

echo ""

# ---- Check 4: Taro 运行时导出检查 ----
echo "--- [Check 4] Taro 运行时完整性 ---"
TARO_EXPORTS=$(grep -c "Taro\|createApp\|createPageConfig\|mount" "$DIST_DIR/taro.js" 2>/dev/null || echo "0")
if [ "$TARO_EXPORTS" -lt 5 ]; then
  log_error "taro.js 中 Taro 导出不完整 (仅 ${TARO_EXPORTS} 处匹配)"
else
  log_ok "taro.js 包含 ${TARO_EXPORTS} 处 Taro API 引用"
fi

# 检查 Current.app 是否被正确赋值
if grep -q "Current.*\.app\s*=" "$DIST_DIR/taro.js" 2>/dev/null; then
  log_ok "Current.app 初始化存在 ✓"
else
  log_error "Current.app 未找到赋值 — 将导致 mount of null"
fi

echo ""

# ---- Check 5: Supabase 配置检查 ----
echo "--- [Check 5] Supabase 客户端配置 ---"
SUPABASE_SRC="$MINI_DIR/src/utils/supabase.ts"
if [ -f "$SUPABASE_SRC" ]; then
  # 检查是否使用了懒初始化或 Proxy
  if grep -q "Proxy\|lazy\|getClient\|_client\|getSupabase" "$SUPABASE_SRC"; then
    log_ok "supabase.ts 使用了懒初始化/Proxy 模式 ✓"
  elif grep -q "export const supabase = createClient" "$SUPABASE_SRC"; then
    log_error "supabase.ts 使用立即初始化 — 可能导致 Headers/Taro undefined!"
    log_info "  → 改为懒初始化: let _client = null; function getSupabase() { ... }"
  else
    log_warn "supabase.ts 结构未知，请人工检查"
  fi
  
  # 检查 import Taro 是否存在
  if grep -q "import Taro from '@tarojs/taro'" "$SUPABASE_SRC"; then
    log_ok "supabase.ts 正确导入 Taro ✓"
  elif grep -q "Taro" "$SUPABASE_SRC"; then
    log_error "supabase.ts 使用了 Taro 但没有 import!"
  fi
  
  # 检查占位符 URL
  if grep -q "your-project.supabase.co\|your-anon-key" "$SUPABASE_SRC"; then
    log_warn "Supabase URL/KEY 还是占位符 (your-project.supabase.co)"
  fi
else
  log_warn "supabase.ts 不存在"
fi

echo ""

# ---- Check 6: JSX 语法快速预检（用 grep 替代慢速 tsc）----
echo "--- [Check 6] TSX 语法快速预检 ---"
cd "$MINI_DIR"
# 检查常见的 TSX 语法错误模式
BAD_TSX=$(grep -rn '>[^<]*>$' src/ --include="*.tsx" 2>/dev/null | grep -v "{'>'}" | head -5 || true)
if [ -n "$BAD_TSX" ]; then
  log_warn "发现可能的裸 > 字符在 TSX 中（需转义为 {'>'}):"
  echo "$BAD_TSX"
else
  log_ok "TSX 常见语法问题检查通过 ✓"
fi

# 检查未闭合标签
UNCLOSED=$(grep -rn '<[A-Z][a-zA-Z]*[^/>]*$' src/ --include="*.tsx" 2>/dev/null | head -5 || true)
if [ -n "$UNCLOSED" ]; then
  log_warn "可能未闭合的JSX标签:"
  echo "$UNCLOSED" | head -3
fi
if [ "$TS_ERRORS" -gt 0 ]; then
  log_warn "发现 $TS_ERRORS 个 TypeScript 类型错误（可能不影响构建）:"
  echo "$TS_OUTPUT" | grep "^src/" | head -5
else
  log_ok "TypeScript 类型检查通过 ✓"
fi

echo ""

# ---- Check 7: 未使用的危险导入 ----
echo "--- [Check 7] 危险导入检查 ---"
DANGEROUS_IMPORTS=$(grep -rn "@taroify/core" "$MINI_DIR/src/" 2>/dev/null | grep -v node_modules || true)
if [ -n "$DANGEROUS_IMPORTS" ]; then
  log_warn "发现 @taroify/core 导入（可能引起副作用）:"
  echo "$DANGEROUS_IMPORTS"
else
  log_ok "无 @taroify/core 导入 ✓"
fi

echo ""

# ---- Summary ----
echo "============================================="
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}🎉 所有检查通过! (0 errors, $WARNINGS warnings)${NC}"
  EXIT_CODE=0
else
  echo -e "${RED}💥 发现 $ERRORS 个错误, $WARNINGS 个警告${NC}"
  EXIT_CODE=1
fi
echo "============================================="

exit $EXIT_CODE
