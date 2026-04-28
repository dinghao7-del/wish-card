// 重启 Vite 开发服务器
const { execSync } = require('child_process');

try {
  console.log('正在杀掉旧进程...');
  execSync('pkill -f vite || true', { stdio: 'inherit' });
} catch(e) {}

setTimeout(() => {
  console.log('启动 Vite...');
  const { spawn } = require('child_process');
  const proc = spawn('npx', ['vite', '--port', '3000'], {
    cwd: '/Users/zerone/WorkBuddy/20260420104543',
    stdio: 'inherit',
    shell: true
  });
  console.log('Vite 已启动，PID:', proc.pid);
}, 2000);
