#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('=== 检查 React 副本 ===\n');

const root = __dirname;
const reactPaths = [];

// 递归查找所有 react 目录
function findReactDirs(dir, depth = 0) {
  if (depth > 4) return;
  
  const nodeModules = path.join(dir, 'node_modules');
  if (!fs.existsSync(nodeModules)) return;
  
  const reactDir = path.join(nodeModules, 'react');
  if (fs.existsSync(reactDir)) {
    try {
      const pkg = require(path.join(reactDir, 'package.json'));
      reactPaths.push({
        path: reactDir,
        version: pkg.version,
        dir: dir
      });
    } catch (e) {
      // ignore
    }
  }
  
  // 检查子目录的 node_modules
  try {
    const entries = fs.readdirSync(nodeModules, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== '.bin' && entry.name !== 'react') {
        const subNodeModules = path.join(nodeModules, entry.name, 'node_modules');
        if (fs.existsSync(subNodeModules)) {
          findReactDirs(path.join(nodeModules, entry.name), depth + 1);
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

findReactDirs(root);

console.log(`找到 ${reactPaths.length} 个 React 副本：\n`);

reactPaths.forEach((p, i) => {
  console.log(`${i + 1}. ${p.path}`);
  console.log(`   版本: ${p.version}`);
  console.log(`   父目录: ${p.dir}\n`);
});

if (reactPaths.length > 1) {
  console.log('❌ 问题确认：有多个 React 副本！');
  console.log('\n解决方案：');
  console.log('1. 删除所有嵌套的 node_modules/react');
  console.log('2. 运行 npm dedupe');
  console.log('3. 或者删除整个 node_modules 重新安装\n');
} else if (reactPaths.length === 1) {
  console.log('✅ 只有一个 React 副本，问题可能在其他地方\n');
} else {
  console.log('❌ 没有找到 React！\n');
}

// 检查 react-dom
console.log('=== 检查 react-dom ===\n');
const reactDomPaths = [];

function findReactDomDirs(dir, depth = 0) {
  if (depth > 4) return;
  
  const nodeModules = path.join(dir, 'node_modules');
  if (!fs.existsSync(nodeModules)) return;
  
  const domDir = path.join(nodeModules, 'react-dom');
  if (fs.existsSync(domDir)) {
    try {
      const pkg = require(path.join(domDir, 'package.json'));
      reactDomPaths.push({
        path: domDir,
        version: pkg.version
      });
    } catch (e) {
      // ignore
    }
  }
}

findReactDomDirs(root);
console.log(`找到 ${reactDomPaths.length} 个 react-dom 副本\n`);
reactDomPaths.forEach((p, i) => {
  console.log(`${i + 1}. ${p.path} (${p.version})`);
});

console.log('\n=== 检查完成 ===');
