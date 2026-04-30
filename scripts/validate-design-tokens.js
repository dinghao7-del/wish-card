/**
 * 设计令牌自动化验证脚本
 * 检测所有平台代码中的硬编码颜色值
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 硬编码颜色正则表达式
const HARDCODED_COLOR_PATTERNS = [
  // Hex colors: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
  /#([0-9a-fA-F]{3,8})\b/g,
  // RGB/RGBA: rgb(255, 255, 255), rgba(255, 255, 255, 0.5)
  /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g,
  // HSL/HSLA
  /hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(?:,\s*[\d.]+\s*)?\)/g,
];

// 已知的设计令牌变量（应该使用的）
const DESIGN_TOKEN_PATTERNS = [
  /var\(--color-/,
  /\$[a-z-]+-(color|bg|surface|text|border)/,
  /Color\.(Primary|Secondary|Tertiary|Surface|Error|Success|Warning)/,
  /designTokens\./,
  /theme\.colors/,
];

// 要扫描的目录
const SCAN_DIRS = [
  { path: 'src', extensions: ['.tsx', '.ts', '.css'] },
  { path: 'miniprogram/src', extensions: ['.scss', '.tsx', '.ts'] },
  { path: 'android/app/src/main/java', extensions: ['.kt'] },
  { path: 'ios', extensions: ['.swift'] },
];

// 排除的目录/文件
const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /dist/,
  /build/,
  /\.next/,
  /coverage/,
  /test-results/,
  /playwright-report/,
  /__snapshots__/,
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    // 跳过注释行
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    
    // 跳过已经使用设计令牌的行
    const hasDesignToken = DESIGN_TOKEN_PATTERNS.some(pattern => pattern.test(line));
    if (hasDesignToken) return;

    HARDCODED_COLOR_PATTERNS.forEach(pattern => {
      const matches = [...line.matchAll(pattern)];
      matches.forEach(match => {
        if (match[0]) {
          violations.push({
            file: filePath,
            line: index + 1,
            column: match.index + 1,
            matchedText: match[0],
            severity: 'error',
            suggestion: getSuggestion(match[0]),
          });
        }
      });
    });
  });

  return violations;
}

function getSuggestion(matched) {
  // 常见颜色的映射建议
  const colorMap = {
    '#4caf50': 'var(--color-primary) 或 $primary-color',
    '#2e7d32': 'var(--color-primary-dark) 或 $primary-dark',
    '#81c784': 'var(--color-primary-light) 或 $primary-light',
    '#f9a825': 'var(--color-secondary)',
    '#ffffff': 'var(--color-surface) 或 $card-bg',
    '#000000': 'var(--color-text-primary)',
    '#757575': 'var(--color-text-secondary)',
  };

  const lower = matched.toLowerCase();
  return colorMap[lower] || '请使用设计令牌变量替代硬编码颜色';
}

function scanDirectory(dirPath, extensions) {
  const violations = [];

  function walk(currentPath) {
    const stats = fs.statSync(currentPath);
    
    if (stats.isDirectory()) {
      // 检查是否应该排除
      if (EXCLUDE_PATTERNS.some(pattern => pattern.test(currentPath))) return;
      
      const items = fs.readdirSync(currentPath);
      items.forEach(item => walk(path.join(currentPath, item)));
    } else if (stats.isFile()) {
      const ext = path.extname(currentPath);
      if (extensions.includes(ext)) {
        const fileViolations = scanFile(currentPath);
        violations.push(...fileViolations);
      }
    }
  }

  walk(dirPath);
  return violations;
}

function main() {
  console.log('🔍 开始扫描硬编码颜色...\n');
  
  const allViolations = [];

  SCAN_DIRS.forEach(({ path: dirPath, extensions }) => {
    const fullPath = path.resolve(__dirname, '../../', dirPath);
    if (fs.existsSync(fullPath)) {
      console.log(`📂 扫描目录: ${dirPath}`);
      const violations = scanDirectory(fullPath, extensions);
      allViolations.push(...violations);
    }
  });

  // 输出结果
  if (allViolations.length === 0) {
    console.log('\n✅ 恭喜！没有发现硬编码颜色值。');
    process.exit(0);
  } else {
    console.log(`\n❌ 发现 ${allViolations.length} 处硬编码颜色：\n`);
    
    allViolations.forEach(v => {
      const relPath = path.relative(process.cwd(), v.file);
      console.log(`  ${relPath}:${v.line}:${v.column}`);
      console.log(`    ❌ ${v.matchedText}`);
      console.log(`    💡 ${v.suggestion}\n`);
    });

    console.log(`\n📊 统计:`);
    console.log(`   错误: ${allViolations.filter(v => v.severity === 'error').length}`);
    console.log(`   警告: ${allViolations.filter(v => v.severity === 'warning').length}`);
    
    process.exit(1);
  }
}

main();
