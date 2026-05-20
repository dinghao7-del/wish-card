import { spawn } from 'node:child_process';

const baseUrl = process.env.WATCH_RELEASE_BASE_URL || 'http://127.0.0.1:3000';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...options,
    });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with ${code}`));
      }
    });
  });
}

function startDevServer() {
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  child.stdout.on('data', chunk => process.stdout.write(chunk));
  child.stderr.on('data', chunk => process.stderr.write(chunk));

  return child;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const started = Date.now();
  let lastError = '';

  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      if (response.ok && text.includes('root')) return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  throw new Error(`Timed out waiting for ${url}. ${lastError}`);
}

async function main() {
  console.log('Starting Xiaotiancai watch release preflight...');
  const server = startDevServer();

  try {
    await waitForServer(baseUrl);
    await run('npm', ['run', 'watch:release:screenshots'], {
      env: { ...process.env, WATCH_RELEASE_BASE_URL: baseUrl },
    });
    await run('npm', ['run', 'watch:release:verify']);
    await run('npm', ['run', 'test', '--', 'src/test/watch-client-domain.test.ts']);
    await run('npm', ['run', 'lint']);
    console.log('Xiaotiancai watch release preflight passed.');
  } finally {
    server.kill('SIGINT');
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
