#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取 admin/.env 文件获取凭证
const envPath = path.join(__dirname, 'admin', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const serviceKeyMatch = envContent.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.+)/);

if (!urlMatch || !serviceKeyMatch) {
  console.error('❌ 无法从 admin/.env 读取 Supabase 凭证');
  process.exit(1);
}

const SUPABASE_URL = urlMatch[1].trim();
const SERVICE_ROLE_KEY = serviceKeyMatch[1].trim();

console.log('✅ 已读取 Supabase 凭证');
console.log('URL:', SUPABASE_URL);

// 执行 SQL 的函数
async function executeSQL(sql, description) {
  console.log(`\n📝 ${description}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/pg/v1/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ApiKey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    const result = await response.text();
    
    if (!response.ok) {
      console.error(`❌ 执行失败 (${response.status}):`, result);
      return false;
    }
    
    console.log(`✅ ${description} - 成功`);
    return true;
  } catch (error) {
    console.error(`❌ 执行出错:`, error.message);
    return false;
  }
}

// 主函数
async function main() {
  const sqlFile = process.argv[2];
  
  if (!sqlFile) {
    console.error('用法: node execute-sql.js <sql-file-path>');
    process.exit(1);
  }
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ SQL 文件不存在: ${sqlFile}`);
    process.exit(1);
  }
  
  console.log(`\n📖 读取 SQL 文件: ${sqlFile}`);
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  // 将 SQL 按分号分割成多条语句
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
    .map(s => s + ';');
  
  console.log(`📊 找到 ${statements.length} 条 SQL 语句`);
  
  // 逐条执行
  let successCount = 0;
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const shortDesc = statement.substring(0, 50).replace(/\n/g, ' ');
    
    const success = await executeSQL(statement, `语句 ${i + 1}/${statements.length}: ${shortDesc}...`);
    if (success) {
      successCount++;
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 执行完成: ${successCount}/${statements.length} 成功`);
  
  if (successCount < statements.length) {
    process.exit(1);
  }
}

main().catch(console.error);
