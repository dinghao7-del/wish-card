#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT, 'dist');
const DEVTOOLS_CLI = process.env.WECHAT_DEVTOOLS_CLI || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli';
const mode = process.argv[2] || 'submit';

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || ROOT,
      stdio: 'inherit',
      shell: false,
      env: process.env,
    });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} 退出码 ${code}`));
    });
  });
}

async function main() {
  loadDotEnv(path.join(ROOT, '.env'));
  loadDotEnv(path.resolve(process.cwd(), '.env'));
  const version = process.env.WX_RELEASE_VERSION || JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '1.0.0';
  const desc = process.env.WX_RELEASE_DESC || '小程序分包瘦身、UI同步、AI复盘与日程链路更新';

  console.log(`准备发布微信小程序 v${version}`);
  await run('npm', ['run', 'build:weapp']);

  const infoOutput = path.join(ROOT, `upload-${version}.json`);
  await run(DEVTOOLS_CLI, [
    'upload',
    '--project',
    DIST_DIR,
    '--version',
    version,
    '--desc',
    desc,
    '--info-output',
    infoOutput,
  ]);

  if (mode === 'upload-only') {
    console.log(`代码上传完成：${infoOutput}`);
    return;
  }

  await run('node', [path.join(ROOT, 'scripts/wx-release.mjs'), mode === 'auto' ? 'auto' : 'submit']);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
