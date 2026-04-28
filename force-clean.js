const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = __dirname;
const nm = path.join(root, 'node_modules');
const lock = path.join(root, 'package-lock.json');

console.log('=== 开始清理 ===');

// 删除 node_modules
if (fs.existsSync(nm)) {
  console.log('删除 node_modules...');
  fs.rmSync(nm, { recursive: true, force: true });
  console.log('✅ node_modules 已删除');
} else {
  console.log('ℹ️  node_modules 不存在，跳过');
}

// 删除 package-lock.json
if (fs.existsSync(lock)) {
  console.log('删除 package-lock.json...');
  fs.unlinkSync(lock);
  console.log('✅ package-lock.json 已删除');
} else {
  console.log('ℹ️  package-lock.json 不存在，跳过');
}

console.log('');
console.log('=== 重新安装依赖 ===');
try {
  execSync('npm install', { cwd: root, stdio: 'inherit', shell: false });
  console.log('✅ npm install 完成');
} catch (e) {
  console.error('❌ npm install 失败:', e.message);
  process.exit(1);
}

console.log('');
console.log('=== 检查 React 版本 ===');
try {
  const out = execSync('npm ls react react-dom --depth=0', { cwd: root, encoding: 'utf8', shell: false });
  console.log(out);
} catch (e) {
  console.log(e.stdout || e.message);
}

console.log('');
console.log('✅ 全部完成！现在运行: npm run dev');
