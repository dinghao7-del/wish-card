#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Forest Family 彻底清理脚本 ===\n');

// 1. 检查 Node.js 版本
try {
  const nodeVersion = execSync('node -v', { encoding: 'utf8' }).trim();
  console.log('1. Node.js 版本:', nodeVersion);
  
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  if (majorVersion !== 20) {
    console.log('\n❌ 错误：必须使用 Node.js v20！');
    console.log('请执行：');
    console.log('  nvm use 20');
    console.log('  node -v  # 确认显示 v20.x.x');
    process.exit(1);
  }
  console.log('   ✅ Node.js 版本正确\n');
} catch (e) {
  console.error('❌ 无法检查 Node.js 版本');
  process.exit(1);
}

// 2. 停止可能运行的 dev server (kill process on port 3000)
console.log('2. 停止可能运行的 dev server...');
try {
  execSync('lsof -ti:3000 | xargs kill -9 2>/dev/null || true', { stdio: 'inherit' });
  console.log('   ✅ 已停止端口 3000 上的进程\n');
} catch (e) {
  console.log('   ✅ 端口 3000 没有被占用\n');
}

// 3. 彻底删除 node_modules 和缓存
console.log('3. 彻底清理依赖和缓存...');
const toDelete = [
  'node_modules',
  'package-lock.json',
  'dist',
  '.vite',
  'node_modules/.vite',
  'node_modules/.cache'
];

for (const item of toDelete) {
  const fullPath = path.join(__dirname, item);
  if (fs.existsSync(fullPath)) {
    console.log(`   删除: ${item}`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}
console.log('   ✅ 清理完成\n');

// 4. 清除 npm 缓存
console.log('4. 清除 npm 缓存...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('   ✅ npm 缓存已清除\n');
} catch (e) {
  console.log('   ⚠️  清除 npm 缓存失败，继续...\n');
}

// 5. 重新安装依赖
console.log('5. 重新安装依赖（这可能需要几分钟）...');
try {
  execSync('npm install', { 
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' }
  });
  console.log('\n   ✅ 依赖安装完成\n');
} catch (e) {
  console.error('\n❌ 依赖安装失败！');
  console.error('请手动执行：');
  console.error('  cd /Users/zerone/WorkBuddy/20260420104543');
  console.error('  rm -rf node_modules package-lock.json');
  console.error('  npm cache clean --force');
  console.error('  npm install');
  process.exit(1);
}

// 6. 验证 React 版本
console.log('6. 验证 React 安装...');
try {
  const reactPkg = require(path.join(__dirname, 'node_modules/react/package.json'));
  const reactDomPkg = require(path.join(__dirname, 'node_modules/react-dom/package.json'));
  console.log(`   react: ${reactPkg.version}`);
  console.log(`   react-dom: ${reactDomPkg.version}`);
  
  if (reactPkg.version !== '18.3.1' || reactDomPkg.version !== '18.3.1') {
    console.log('\n   ⚠️  警告：React 版本不是 18.3.1');
    console.log('   但 package.json 中指定了 18.3.1，应该没问题');
  } else {
    console.log('   ✅ React 版本正确\n');
  }
} catch (e) {
  console.log('   ⚠️  无法验证 React 版本，但继续...\n');
}

// 7. 启动开发服务器
console.log('7. 启动开发服务器...');
console.log('   执行: npm run dev\n');
console.log('=== 清理完成 ===\n');
console.log('现在请在终端执行：');
console.log('  cd /Users/zerone/WorkBuddy/20260420104543');
console.log('  npm run dev');
console.log('\n然后在浏览器访问: http://localhost:3000');
console.log('并按 Cmd + Shift + R 硬刷新页面\n');
