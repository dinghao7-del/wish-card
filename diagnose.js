#!/usr/bin/env node
/**
 * Forest Family - React 多副本问题诊断脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname);

console.log('=== Forest Family 诊断脚本 ===\n');

// 1. 检查 Node.js 版本
console.log('1. Node.js 版本:');
console.log(`   ${process.version}`);
if (process.version.startsWith('v25') || process.version.startsWith('v24')) {
  console.log('   ⚠️  警告：Node.js 版本过高，建议使用 v20 LTS\n');
} else {
  console.log('   ✅ 版本正常\n');
}

// 2. 检查 React 安装情况
console.log('2. 检查 React 安装:');
const reactPaths = [
  path.join(root, 'node_modules/react/package.json'),
  path.join(root, 'node_modules/react-dom/package.json'),
  path.join(root, 'node_modules/framer-motion/package.json'),
];

for (const p of reactPaths) {
  if (fs.existsSync(p)) {
    const pkg = JSON.parse(fs.readFileSync(p, 'utf-8'));
    console.log(`   ${pkg.name}: ${pkg.version}`);
  } else {
    console.log(`   ❌ 未找到: ${p}`);
  }
}
console.log();

// 3. 检查重复的 React（嵌套 node_modules）
console.log('3. 检查嵌套的 React 副本:');
const nodeModules = path.join(root, 'node_modules');

function findReactIn(dir, depth = 0) {
  if (depth > 3) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'react' && entry.isDirectory()) {
        const pkgPath = path.join(dir, entry.name, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
          console.log(`   ⚠️  发现 React 副本: ${path.relative(root, path.join(dir, entry.name))} (v${pkg.version})`);
        }
      }
      if (entry.name === 'node_modules' && entry.isDirectory() && depth < 3) {
        findReactIn(path.join(dir, entry.name), depth + 1);
      }
    }
  } catch (e) {
    // 忽略权限错误
  }
}

// 只检查顶级依赖的 node_modules
const topDeps = fs.readdirSync(nodeModules).filter(f => !f.startsWith('.'));
for (const dep of topDeps) {
  const depNodeModules = path.join(nodeModules, dep, 'node_modules');
  if (fs.existsSync(depNodeModules)) {
    findReactIn(depNodeModules, 1);
  }
}
console.log('   （检查完成）\n');

// 4. 检查 vite.config.ts
console.log('4. 检查 Vite 配置:');
const viteConfig = path.join(root, 'vite.config.ts');
if (fs.existsSync(viteConfig)) {
  const content = fs.readFileSync(viteConfig, 'utf-8');
  if (content.includes('optimizeDeps')) {
    console.log('   ⚠️  vite.config.ts 包含 optimizeDeps 配置，可能导致预构建问题');
  } else {
    console.log('   ✅ vite.config.ts 配置正常');
  }
}
console.log();

// 5. 建议
console.log('=== 建议 ===');
if (process.version.startsWith('v25') || process.version.startsWith('v24') || process.version.startsWith('v23')) {
  console.log('❗ 强烈建议降级 Node.js 到 v20 LTS:');
  console.log('   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash');
  console.log('   nvm install 20');
  console.log('   nvm use 20');
  console.log('   rm -rf node_modules package-lock.json');
  console.log('   npm install');
  console.log('   npm run dev\n');
} else {
  console.log('尝试以下命令:');
  console.log('   rm -rf node_modules/.vite dist');
  console.log('   npm run dev\n');
}
