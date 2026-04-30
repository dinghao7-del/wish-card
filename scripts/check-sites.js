#!/usr/bin/env node
/**
 * 站点版本一致性检查脚本
 * 
 * 用法:
 *   npm run check-sites        # 检查两个站点的 JS 版本
 *   npm run check-sites:full  # 完整检查（包含构建和部署）
 * 
 * 在 package.json 中配置 pre-push hook:
 *   "prepare": "node scripts/check-sites.js"
 */

const https = require('https');
const http = require('http');

const SITES = [
  { name: 'Vercel', url: 'https://wish-card-self.vercel.app/' },
  { name: 'Cloudflare', url: 'https://a764d2d4.wish-card-backup.pages.dev/' }
];

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractJsHash(html) {
  const match = html.match(/index-([a-zA-Z0-9]+)\.js/);
  return match ? `index-${match[1]}.js` : null;
}

async function main() {
  console.log('🔍 站点版本检查\n');
  console.log('='.repeat(50));
  
  const results = [];
  
  for (const site of SITES) {
    try {
      console.log(`📡 检查 ${site.name}...`);
      const html = await fetchHtml(site.url);
      const jsHash = extractJsHash(html);
      
      if (jsHash) {
        console.log(`   ✅ JS: ${jsHash}`);
        results.push({ name: site.name, hash: jsHash, ok: true });
      } else {
        console.log(`   ❌ 无法获取 JS 版本`);
        results.push({ name: site.name, hash: null, ok: false });
      }
    } catch (err) {
      console.log(`   ❌ 错误: ${err.message}`);
      results.push({ name: site.name, hash: null, ok: false, error: err.message });
    }
    console.log('');
  }
  
  console.log('='.repeat(50));
  console.log('\n📊 检查结果:\n');
  
  const successful = results.filter(r => r.ok);
  
  if (successful.length < 2) {
    console.log('⚠️  部分站点无法访问，跳过版本比较\n');
    process.exit(0);
  }
  
  if (successful[0].hash === successful[1].hash) {
    console.log('✅ 两个站点版本一致!\n');
    console.log(`   Vercel:     ${successful[0].hash}`);
    console.log(`   Cloudflare: ${successful[1].hash}`);
    console.log('\n🎉 所有站点已同步，可以安全推送代码。\n');
    process.exit(0);
  } else {
    console.log('⚠️  版本不一致!\n');
    console.log(`   Vercel:     ${successful[0].hash}`);
    console.log(`   Cloudflare: ${successful[1].hash}`);
    console.log('\n📝 可能原因:');
    console.log('   1. Cloudflare Pages 部署仍在进行中');
    console.log('   2. 需要手动触发 Cloudflare Pages 重新部署');
    console.log('   3. Vercel 使用了不同的构建版本');
    console.log('\n🔧 解决方案:');
    console.log('   1. 等待 1-2 分钟后再试');
    console.log('   2. 登录 Cloudflare Dashboard 手动触发部署');
    console.log('   3. 或运行: npm run deploy:cf\n');
    process.exit(1);
  }
}

main().catch(console.error);
