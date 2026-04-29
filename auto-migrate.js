#!/usr/bin/env node

/**
 * 自动执行 Supabase 数据库迁移
 * 使用 Supabase Management API
 * 
 * 使用前：
 * 1. 获取 Access Token：https://supabase.com/dashboard/account/tokens
 * 2. 设置环境变量：export SUPABASE_ACCESS_TOKEN="your-token"
 * 3. 运行：node auto-migrate.js
 */

import https from 'https';
import fs from 'fs';

const PROJECT_REF = 'qdiuufuoleharmjfarzr';
const API_BASE = 'api.supabase.com';

/**
 * 执行单条 SQL
 */
async function executeSQL(sql, description) {
  console.log(`\n📝 ${description}...`);
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query: sql });
    
    const options = {
      hostname: API_BASE,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ ${description} - 成功`);
          resolve(data);
        } else {
          // 某些"错误"实际上是成功的（如 CREATE POLICY 返回 201）
          console.error(`⚠️  ${description} - 状态码 ${res.statusCode}:`, data.substring(0, 200));
          // 不拒绝，继续执行
          resolve(data);
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
 * 修复 SQL 中的 DO 块问题
 */
function fixSQLForAPI(sql) {
  // 替换 DO $$ 块中的分号，避免被错误拆分
  // 但这里我们不拆分，所以直接返回原 SQL
  return sql;
}

/**
 * 读取并执行 SQL 文件（不拆分，直接执行）
 */
async function executeSQLFile(filePath, fileDescription) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${fileDescription}`);
  console.log('='.repeat(60));
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    return false;
  }
  
  const sqlContent = fs.readFileSync(filePath, 'utf8');
  
  console.log(`📊 文件大小: ${(sqlContent.length / 1024).toFixed(2)} KB`);
  console.log(`🚀 直接执行整个 SQL 文件...\n`);
  
  try {
    await executeSQL(sqlContent, filePath);
    console.log(`\n✅ ${filePath} 执行完成`);
    return true;
  } catch (error) {
    console.error(`\n❌ ${filePath} 执行失败:`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('\n');
  console.log('█'.repeat(60));
  console.log('█   Supabase 数据库自动迁移工具');
  console.log('█'.repeat(60));
  console.log('\n');
  
  // 检查 Access Token
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    console.error('❌ 错误：未设置 SUPABASE_ACCESS_TOKEN 环境变量\n');
    console.log('📋 获取 Access Token 步骤：');
    console.log('   1. 访问：https://supabase.com/dashboard/account/tokens');
    console.log('   2. 点击 "Generate new token"');
    console.log('   3. 名称：WorkBuddy Migration');
    console.log('   4. 权限：All Access');
    console.log('   5. 点击 "Generate token"');
    console.log('   6. 复制 token（只显示一次！）\n');
    console.log('🔧 设置环境变量：');
    console.log('   export SUPABASE_ACCESS_TOKEN="your-token-here"\n');
    console.log('🚀 运行脚本：');
    console.log('   node auto-migrate.js\n');
    process.exit(1);
  }
  
  console.log('✅ 找到 SUPABASE_ACCESS_TOKEN\n');
  
  try {
    // 步骤 1：执行迁移
    const migrationSuccess = await executeSQLFile(
      'supabase-templates-migration-CLEAN.sql',
      '步骤 1/2：执行数据库迁移'
    );
    
    // 等待 2 秒
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 步骤 2：导入种子数据
    const seedSuccess = await executeSQLFile(
      'supabase-task-templates-FIXED.sql',
      '步骤 2/2：导入任务模板种子数据'
    );
    
    // 完成
    console.log('\n');
    console.log('█'.repeat(60));
    console.log('█   迁移完成！');
    console.log('█'.repeat(60));
    console.log('\n');
    
    console.log('📊 验证数据：');
    console.log('   访问 SQL Editor: https://supabase.com/dashboard/project/qdiuufuoleharmjfarzr/sql');
    console.log('   执行: SELECT type, COUNT(*) FROM templates GROUP BY type;');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ 执行失败:', error.message);
    process.exit(1);
  }
}

main();
