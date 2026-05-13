import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const requiredMajor = 20;
const currentMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);
const node20 = path.join(homedir(), '.nvm/versions/node/v20.20.2/bin/node');

if (currentMajor !== requiredMajor) {
  if (!existsSync(node20)) {
    console.error(`微信小程序构建需要 Node ${requiredMajor}.x。当前版本是 ${process.version}，且未找到 ${node20}`);
    process.exit(1);
  }

  const result = spawnSync(node20, [new URL(import.meta.url).pathname], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `${path.dirname(node20)}:${process.env.PATH ?? ''}`,
    },
  });

  process.exit(result.status ?? 1);
}

const taroBin = path.resolve('node_modules/.bin/taro');
const result = spawnSync(taroBin, ['build', '--type', 'weapp', '--no-check'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PATH: `${path.dirname(process.execPath)}:${process.env.PATH ?? ''}`,
  },
});

process.exit(result.status ?? 1);
