#!/usr/bin/env node

/**
 * Supabase 数据库迁移自动化工具
 * 使用 Supabase Management API 执行 SQL
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置
const PROJECT_REF = 'qdiuufuoleharmjfarzr';
const SUPABASE_URL = 'https://qdiuufuoleharmjfarzr.supabase.co';

/**
 * 执行 SQL 通过 Supabase Management API
 */
async function executeSQLViaManagementAPI(personalAccessToken, sql, description) {
  console.log(`\n📝 ${description}...`);
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${personalAccessToken}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${description} - 成功`);
          resolve(data);
        } else {
          console.error(`❌ ${description} - 失败 (${res.statusCode}):`, data);
          reject(new Error(data));
        }
      });
    });
    
    req.on('error', (e) => {
      console.error(`❌ ${description} - 错误:`, e.message);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * 使用 Service Role Key 直接连接数据库
 */
async function executeSQLWithServiceRole(sqlFile) {
  console.log('\n🚀 使用 Docker + psql 执行 SQL...');
  
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  // 检查是否有数据库密码
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  
  if (!dbPassword) {
    console.error('❌ 错误：未设置 SUPABASE_DB_PASSWORD 环境变量');
    console.log('\n请按以下步骤获取数据库密码：');
    console.log('1. 访问 https://supabase.com/dashboard/project/qdiuufuoleharmjfarzr/settings/database');
    console.log('2. 在 "Database Password" 部分点击 "Copy"');
    console.log('3. 设置环境变量：');
    console.log('   export SUPABASE_DB_PASSWORD=\'你的密码\'');
    console.log('4. 重新运行此脚本\n');
    process.exit(1);
  }
  
  // 使用 Docker 运行 psql
  const { execSync } = require('child_process');
  
  try {
    const result = execSync(
      `docker run --rm -e PGPASSWORD="${dbPassword}" -v "${path.resolve(sqlFile)}:/sql/migration.sql" postgres:15-alpine psql -h db.qdiuufuoleharmjfarzr.supabase.co -p 5432 -U postgres -d postgres -f /sql/migration.sql`,
      { encoding: 'utf8', stdio: 'inherit' }
    );
    console.log('✅ SQL 执行成功！');
    return true;
  } catch (error) {
    console.error('❌ SQL 执行失败:', error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  Supabase 数据库迁移自动化工具');
  console.log('========================================');
  console.log('');
  
  // 检查参数
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('用法: node migrate.js <sql-file-path>');
    console.error('示例: node migrate.js supabase-templates-migration-CLEAN.sql');
    process.exit(1);
  }
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ SQL 文件不存在: ${sqlFile}`);
    process.exit(1);
  }
  
  console.log(`📖 SQL 文件: ${sqlFile}`);
  console.log('');
  
  // 方法1：尝试使用 Management API
  const personalAccessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  if (personalAccessToken) {
    console.log('✅ 找到 SUPABASE_ACCESS_TOKEN，使用 Management API...');
    
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📊 找到 ${statements.length} 条 SQL 语句`);
    
    let successCount = 0;
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const shortDesc = statement.substring(0, 50).replace(/\n/g, ' ');
      
      try {
        await executeSQLViaManagementAPI(
          personalAccessToken,
          statement,
          `语句 ${i + 1}/${statements.length}`
        );
        successCount++;
      } catch (error) {
        console.error(`   错误: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 执行完成: ${successCount}/${statements.length} 成功`);
    
  } else {
    // 方法2：使用 Docker + psql
    console.log('⚠️  未找到 SUPABASE_ACCESS_TOKEN');
    console.log('   使用 Docker + psql 方法...\n');
    
    await executeSQLWithServiceRole(sqlFile);
  }
}

main().catch(console.error);
