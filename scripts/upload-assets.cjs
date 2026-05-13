/**
 * 批量上传小程序 assets 到 Supabase Storage
 * 用法: node scripts/upload-assets.cjs
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://qdiuufuoleharmjfarzr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaXV1ZnVvbGVoYXJtamZhcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQyNDMsImV4cCI6MjA5MjgxMDI0M30.THu9_M-69tEDUaK_Zjiz0p4rZmclvFt6HvQWIxtepbk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = 'assets';
const ASSETS_DIR = path.join(__dirname, '../miniprogram/src/assets');

async function uploadFile(localPath, bucketPath) {
  const buf = fs.readFileSync(localPath);
  const ext = path.extname(bucketPath).toLowerCase();
  
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(bucketPath, buf, {
      contentType: ext === '.png' ? 'image/png' : 'image/jpeg',
      upsert: true,
    });
  
  if (error) {
    console.error(`  ✗ ${error.message}`);
    return null;
  }
  
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(bucketPath);
  return urlData.publicUrl;
}

function walkDir(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (/\.(png|jpg|jpeg|webp)$/i.test(entry.name)) {
      const rel = path.relative(ASSETS_DIR, full).replace(/\\/g, '/');
      results.push({ local: full, bucket: rel });
    }
  }
  return results;
}

async function main() {
  console.log('=== 上传 assets 到 Supabase Storage ===\n');
  console.log(`Bucket: ${BUCKET} (public)`);
  
  const files = walkDir(ASSETS_DIR);
  console.log(`图片总数: ${files.length}\n`);
  
  let ok = 0, fail = 0;
  const map = {};
  
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    process.stdout.write(`[${i+1}/${files.length}] ${f.bucket}... `);
    
    const url = await uploadFile(f.local, f.bucket);
    if (url) {
      ok++;
      console.log('✓');
      map[f.bucket] = url;
    } else {
      fail++;
    }
  }
  
  // 保存映射表
  const mapFile = path.join(__dirname, 'asset-url-map.json');
  fs.writeFileSync(mapFile, JSON.stringify(map, null, 2));
  
  console.log(`\n=== 完成: ${ok} 成功, ${fail} 失败 ===`);
  console.log(`映射表: ${mapFile}`);
}

main().catch(e => { console.error('致命错误:', e.message); process.exit(1); });
