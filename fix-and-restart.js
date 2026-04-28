#!/usr/bin/env node
/**
 * Forest Family - 最终修复脚本
 * 解决 "AnimatePresence is not defined" 错误
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname);

console.log('=== Forest Family 最终修复 ===\n');

// 1. 检查 Node.js 版本
const nodeVersion = process.version;
console.log(`1. Node.js 版本: ${nodeVersion}`);
if (!nodeVersion.startsWith('v20')) {
  console.log('   ❌ 错误：必须使用 Node.js v20！');
  console.log('   请运行: nvm use 20');
  process.exit(1);
}
console.log('   ✅ 版本正确\n');

// 2. 检查 framer-motion 安装
console.log('2. 检查 framer-motion 安装:');
const fmPkg = path.join(root, 'node_modules/framer-motion/package.json');
if (!fs.existsSync(fmPkg)) {
  console.log('   ❌ framer-motion 未安装，正在安装...');
  execSync('npm install framer-motion@^12.38.0', { cwd: root, stdio: 'inherit' });
} else {
  const pkg = JSON.parse(fs.readFileSync(fmPkg, 'utf-8'));
  console.log(`   ✅ framer-motion v${pkg.version} 已安装`);
}
console.log();

// 3. 清理 Vite 缓存
console.log('3. 清理 Vite 缓存:');
const cacheDirs = [
  path.join(root, 'node_modules/.vite'),
  path.join(root, 'dist'),
  path.join(root, '.vite'),
];
for (const dir of cacheDirs) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`   ✅ 已删除: ${path.relative(root, dir)}`);
  }
}
console.log('   ✅ 缓存清理完成\n');

// 4. 检查 Welcome.tsx 导入
console.log('4. 检查 Welcome.tsx 导入:');
const welcomePath = path.join(root, 'src/pages/Welcome.tsx');
if (fs.existsSync(welcomePath)) {
  let content = fs.readFileSync(welcomePath, 'utf-8');
  const lines = content.split('\n');
  
  // 找到 import framer-motion 的行
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes("from 'framer-motion'")) {
      console.log(`   第 ${i + 1} 行: ${lines[i].trim()}`);
    }
  }
  
  // 确保导入正确
  if (!content.includes("import { AnimatePresence } from 'framer-motion'")) {
    console.log('   ⚠️  缺少 AnimatePresence 导入，正在修复...');
    // 找到 motion 导入行，添加 AnimatePresence
    content = content.replace(
      /import\s+\{\s*motion\s*\}\s+from\s+['"]framer-motion['"]/,
      "import { motion, AnimatePresence } from 'framer-motion'"
    );
    fs.writeFileSync(welcomePath, content, 'utf-8');
    console.log('   ✅ 已修复 Welcome.tsx 导入');
  } else {
    console.log('   ✅ Welcome.tsx 导入正确');
  }
}
console.log();

// 5. 启动开发服务器
console.log('5. 启动开发服务器...');
console.log('   请在新终端运行:');
console.log('   cd /Users/zerone/WorkBuddy/20260420104543');
console.log('   npm run dev');
console.log();
console.log('   然后在浏览器按 Cmd+Shift+R 硬刷新');
console.log();

// 尝试自动启动
try {
  console.log('   尝试自动启动...');
  execSync('npm run dev', { cwd: root, stdio: 'inherit' });
} catch (e) {
  console.log('   请手动运行上述命令');
}
