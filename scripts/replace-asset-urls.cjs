/**
 * 批量替换 templates.ts 中的本地路径为 Supabase 云端 URL
 * 用法: node scripts/replace-asset-urls.cjs
 */
const fs = require('fs');
const path = require('path');

const TEMPLATES_FILE = path.join(__dirname, '../miniprogram/src/lib/templates.ts');
const MAP_FILE = path.join(__dirname, 'asset-url-map.json');
const SUPABASE_BASE = 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/';

// 读取映射表
const urlMap = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));

console.log(`=== 替换模板文件 ===\n`);
console.log(`映射条目: ${Object.keys(urlMap).length}`);
console.log(`目标文件: ${TEMPLATES_FILE}\n`);

let content = fs.readFileSync(TEMPLATES_FILE, 'utf8');
const originalContent = content;

// 统计替换次数
let replaceCount = 0;

// 方式1: 直接使用映射表精确替换
for (const [localPath, cloudUrl] of Object.entries(urlMap)) {
  // 匹配 src='/assets/xxx' 或 src: '/assets/xxx' 格式
  const patterns = [
    // /assets/avatars/...
    `'${localPath}'`,
    `"${localPath}"`,
  ];
  
  for (const pattern of patterns) {
    if (content.includes(pattern)) {
      content = content.replaceAll(pattern, `'${cloudUrl}'`);
      replaceCount++;
    }
  }
}

// 方式2: 替换所有剩余的 /assets/ 开头路径为云端 URL（通用规则）
// 处理 /assets/task-icons/xxx, /assets/reward-icons/xxx, /assets/avatars/xxx
content = content.replace(/['"]\/assets\/(task-icons|reward-icons|avatars|icons)\/([^'"]+)['"]/g, (match) => {
  // 提取相对路径
  const relPath = match.replace(/^['"]\/|['"]$/g, '');
  const cloudUrl = `${SUPABASE_BASE}${relPath}`;
  replaceCount++;
  return `'${cloudUrl}'`;
});

// 方式3: 替换 /static/reward-icons 和 /static/task-icons 等路径
content = content.replace(/['"]\/static\/(task-icons|reward-icons|avatars)\/([^'"]+)['"]/g, (match) => {
  const relPath = match.replace(/^['"]\/static\//, '').replace(/['"]$/, '');
  const cloudUrl = `${SUPABASE_BASE}${relPath}`;
  replaceCount++;
  return `'${cloudUrl}'`;
});

if (content !== originalContent) {
  fs.writeFileSync(TEMPLATES_FILE, content);
  console.log(`✅ 完成！共替换 ${replaceCount} 处`);
} else {
  console.log('⚠️ 无需替换（文件可能已更新）');
}
