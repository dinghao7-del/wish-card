#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

const srcDir = new URL('.', import.meta.url).pathname + 'src';

function walkDir(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.error('读取目录失败:', dir, err.message);
  }
  return files;
}

const files = walkDir(srcDir);
let fixedCount = 0;

for (const file of files) {
  try {
    let content = readFileSync(file, 'utf-8');
    if (content.includes("from 'motion/react'") || content.includes('from "motion/react"')) {
      const newContent = content.replace(/from\s+['"]motion\/react['"]/g, "from 'framer-motion'");
      writeFileSync(file, newContent, 'utf-8');
      console.log('已修复:', file.replace(srcDir, 'src'));
      fixedCount++;
    }
  } catch (err) {
    console.error('处理文件失败:', file, err.message);
  }
}

console.log(`\n完成！共修复 ${fixedCount} 个文件。`);
