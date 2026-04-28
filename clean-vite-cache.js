#!/usr/bin/env node
import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const projectRoot = new URL('.', import.meta.url).pathname;
const viteCachePath = join(projectRoot, 'node_modules/.vite');
const esbuildCachePath = join(projectRoot, 'node_modules/.cache');

console.log('Node.js 版本:', process.version);
console.log('项目根目录:', projectRoot);

// 清理 Vite 缓存
if (existsSync(viteCachePath)) {
  console.log('删除 Vite 缓存:', viteCachePath);
  rmSync(viteCachePath, { recursive: true, force: true });
} else {
  console.log('Vite 缓存目录不存在，跳过');
}

// 清理 esbuild 缓存
if (existsSync(esbuildCachePath)) {
  console.log('删除 esbuild 缓存:', esbuildCachePath);
  rmSync(esbuildCachePath, { recursive: true, force: true });
}

console.log('缓存清理完成！');
console.log('');
console.log('现在请手动运行：');
console.log('  cd /Users/zerone/WorkBuddy/20260420104543');
console.log('  npm run dev');
