import { spawn } from 'node:child_process';
import process from 'node:process';

const baseURL = process.env.UI_ACCEPTANCE_URL || 'http://127.0.0.1:5173';
const skipBrowserSmoke = process.env.SKIP_BROWSER_SMOKE === '1';

const checks = [
  {
    name: 'TypeScript and lint gate',
    command: 'npm',
    args: ['run', 'lint'],
  },
  {
    name: 'UI token, skin, and platform standard gate',
    command: 'npm',
    args: ['run', 'test:ui-standard'],
  },
  {
    name: 'Mini program type gate',
    command: 'npx',
    args: ['tsc', '-p', 'miniprogram/tsconfig.json', '--noEmit', '--pretty', 'false'],
  },
  {
    name: 'Unit and integration tests',
    command: 'npm',
    args: ['test', '--', '--run', '--maxWorkers=1'],
  },
  {
    name: 'Production build',
    command: 'npm',
    args: ['run', 'build'],
  },
];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: process.env,
      ...options,
    });

    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with ${code}.`));
    });
  });
}

async function isReady(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(url) {
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    if (await isReady(url)) return;
    await new Promise(resolve => setTimeout(resolve, 750));
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

async function runCheck({ name, command, args }) {
  console.log(`\n==> ${name}`);
  await run(command, args);
}

async function runBrowserSmoke() {
  console.log('\n==> Mobile Web skin and navigation smoke');

  let server;
  let ownsServer = false;

  if (!(await isReady(`${baseURL}/welcome`))) {
    ownsServer = true;
    server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], {
      stdio: 'inherit',
      env: process.env,
    });

    await waitForServer(`${baseURL}/welcome`);
  }

  try {
    await run('node', ['scripts/mobile-ui-smoke.mjs'], {
      env: {
        ...process.env,
        MOBILE_SMOKE_URL: baseURL,
      },
    });
  } finally {
    if (ownsServer && server) {
      server.kill('SIGTERM');
    }
  }
}

for (const check of checks) {
  await runCheck(check);
}

if (skipBrowserSmoke) {
  console.log('\n==> Mobile Web skin and navigation smoke skipped by SKIP_BROWSER_SMOKE=1');
} else {
  await runBrowserSmoke();
}

console.log('\nFinal UI acceptance passed.');
