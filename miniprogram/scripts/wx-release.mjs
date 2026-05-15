#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST_DIR = path.join(ROOT, 'dist');
const APP_CONFIG = path.join(DIST_DIR, 'app.json');
const PROJECT_CONFIG = path.join(DIST_DIR, 'project.config.json');

const AUDIT_STATUS = {
  0: '审核成功',
  1: '审核被拒绝',
  2: '审核中',
  3: '已撤回',
  4: '审核延后',
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

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

function assertDist() {
  if (!fs.existsSync(APP_CONFIG) || !fs.existsSync(PROJECT_CONFIG)) {
    throw new Error('未找到 miniprogram/dist/app.json，请先运行 npm --prefix miniprogram run build:weapp');
  }
}

function getAppId() {
  if (process.env.WX_APPID) return process.env.WX_APPID;
  const project = readJson(PROJECT_CONFIG);
  if (!project.appid) throw new Error('缺少 WX_APPID，且 dist/project.config.json 里没有 appid');
  return project.appid;
}

function getVersion() {
  return process.env.WX_RELEASE_VERSION || readJson(path.join(ROOT, 'package.json')).version || '1.0.0';
}

function getAuditItems() {
  if (process.env.WX_AUDIT_ITEM_LIST) {
    const parsed = JSON.parse(process.env.WX_AUDIT_ITEM_LIST);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('WX_AUDIT_ITEM_LIST 必须是非空 JSON 数组');
    return parsed;
  }

  const app = readJson(APP_CONFIG);
  const address = process.env.WX_AUDIT_ADDRESS || app.pages?.[0];
  const title = process.env.WX_AUDIT_TITLE || 'WishCard 家庭管家';
  const tag = process.env.WX_AUDIT_TAG || '家庭,日程,习惯,教育';
  const firstClass = process.env.WX_AUDIT_FIRST_CLASS;
  const secondClass = process.env.WX_AUDIT_SECOND_CLASS;
  const thirdClass = process.env.WX_AUDIT_THIRD_CLASS || '';
  const firstId = process.env.WX_AUDIT_FIRST_ID;
  const secondId = process.env.WX_AUDIT_SECOND_ID;
  const thirdId = process.env.WX_AUDIT_THIRD_ID || 0;

  if (!address || !firstClass || !secondClass || !firstId || !secondId) {
    throw new Error([
      '缺少审核类目配置。请先运行 npm --prefix miniprogram run wx:release:info 查看可提交页面和后台类目，',
      '然后在 miniprogram/.env 中配置 WX_AUDIT_FIRST_CLASS / WX_AUDIT_SECOND_CLASS / WX_AUDIT_FIRST_ID / WX_AUDIT_SECOND_ID，',
      '或直接配置 WX_AUDIT_ITEM_LIST JSON。',
    ].join(''));
  }

  return [{
    address,
    title,
    tag,
    first_class: firstClass,
    second_class: secondClass,
    third_class: thirdClass,
    first_id: Number(firstId),
    second_id: Number(secondId),
    third_id: Number(thirdId),
  }];
}

async function parseWxResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`微信接口返回非 JSON：HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  if (!res.ok) throw new Error(`微信接口 HTTP ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function wxGet(pathname, params = {}) {
  const url = new URL(`https://api.weixin.qq.com${pathname}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return parseWxResponse(await fetch(url));
}

async function wxPost(pathname, token, body = {}) {
  const url = new URL(`https://api.weixin.qq.com${pathname}`);
  url.searchParams.set('access_token', token);
  return parseWxResponse(await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
}

async function getAccessToken() {
  const appid = getAppId();
  const secret = process.env.WX_APP_SECRET || process.env.WX_APPSECRET;
  if (!secret) throw new Error('缺少 WX_APP_SECRET。请放在 miniprogram/.env 或当前 shell 环境变量中，不要提交到仓库。');
  const data = await wxGet('/cgi-bin/token', { grant_type: 'client_credential', appid, secret });
  if (data.errcode) throw new Error(`获取 access_token 失败：${JSON.stringify(data)}`);
  return data.access_token;
}

async function printInfo(token) {
  assertDist();
  const app = readJson(APP_CONFIG);
  console.log(`appid: ${getAppId()}`);
  console.log(`version: ${getVersion()}`);
  console.log('pages:');
  for (const page of app.pages || []) console.log(`  - ${page}`);
  for (const pack of app.subPackages || app.subpackages || []) {
    for (const page of pack.pages || []) console.log(`  - ${pack.root}/${page}`);
  }

  const category = await wxPost('/wxa/get_category', token, {});
  if (category.errcode && category.errcode !== 0) throw new Error(`获取类目失败：${JSON.stringify(category)}`);
  console.log('categories:');
  for (const item of category.category_list || []) {
    const third = item.third_class ? ` / ${item.third_class}` : '';
    const thirdId = item.third_id ? ` / ${item.third_id}` : '';
    console.log(`  - ${item.first_class} / ${item.second_class}${third}  (${item.first_id} / ${item.second_id}${thirdId})`);
  }
}

async function submitAudit(token) {
  assertDist();
  const data = await wxPost('/wxa/submit_audit', token, {
    item_list: getAuditItems(),
    feedback_info: process.env.WX_AUDIT_FEEDBACK || `版本 ${getVersion()}：家庭日程、习惯奖惩、AI 复盘与计划管理功能更新。`,
  });
  if (data.errcode && data.errcode !== 0) throw new Error(`提交审核失败：${JSON.stringify(data)}`);
  console.log(`提交审核成功，auditid: ${data.auditid}`);
  return data.auditid;
}

async function getLatestAuditStatus(token) {
  const data = await wxPost('/wxa/get_latest_auditstatus', token, {});
  if (data.errcode && data.errcode !== 0) throw new Error(`查询审核状态失败：${JSON.stringify(data)}`);
  console.log(`审核状态：${AUDIT_STATUS[data.status] || `未知状态 ${data.status}`}`);
  if (data.reason) console.log(`原因：${data.reason}`);
  if (data.auditid) console.log(`auditid: ${data.auditid}`);
  return data;
}

async function publishRelease(token) {
  const data = await wxPost('/wxa/release', token, {});
  if (data.errcode && data.errcode !== 0) throw new Error(`发布失败：${JSON.stringify(data)}`);
  console.log('发布成功。');
}

async function autoRelease(token) {
  await submitAudit(token);
  const intervalMs = Number(process.env.WX_AUDIT_POLL_INTERVAL_MS || 60_000);
  const timeoutMs = Number(process.env.WX_AUDIT_TIMEOUT_MS || 2 * 60 * 60 * 1000);
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    const status = await getLatestAuditStatus(token);
    if (status.status === 0) {
      await publishRelease(token);
      return;
    }
    if (status.status === 1 || status.status === 3 || status.status === 4) {
      throw new Error(`审核未通过发布条件：${AUDIT_STATUS[status.status] || status.status}`);
    }
  }
  throw new Error('等待审核超时。审核可能仍在进行，可稍后运行 npm --prefix miniprogram run wx:release:status 查询。');
}

async function main() {
  loadDotEnv(path.join(ROOT, '.env'));
  loadDotEnv(path.resolve(process.cwd(), '.env'));
  const command = process.argv[2] || 'info';
  const token = await getAccessToken();

  if (command === 'info') return printInfo(token);
  if (command === 'submit') return submitAudit(token);
  if (command === 'status') return getLatestAuditStatus(token);
  if (command === 'publish' || command === 'release') return publishRelease(token);
  if (command === 'auto') return autoRelease(token);
  throw new Error(`未知命令：${command}。可用命令：info / submit / status / publish / auto`);
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
