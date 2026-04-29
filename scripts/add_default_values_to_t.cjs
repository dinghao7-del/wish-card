#!/usr/bin/env node

/**
 * 为 t('key') 调用添加默认值参数
 * 将 t('key') 转换为 t('key', { defaultValue: '默认值' })
 */

const fs = require('fs');
const path = require('path');

// 生成默认值（基于键名）
function generateDefaultValue(key) {
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // 将 camelCase 转换为可读的文本
  let text = lastPart
    .replace(/([A-Z])/g, ' $1') // 在大写字母前加空格
    .replace(/_/g, ' ') // 将下划线替换为空格
    .toLowerCase()
    .trim();
  
  // 首字母大写
  text = text.charAt(0).toUpperCase() + text.slice(1);
  
  return text;
}

// 处理单个文件
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 匹配 t('key') 或 t("key")，但不匹配已经有默认值的情况
  const regex = /t\(['"]([^'"]+)['"]\)/g;
  
  const newContent = content.replace(regex, (match, key) => {
    // 跳过已经有 defaultValue 或默认值的情况
    if (match.includes('defaultValue') || match.includes(', {')) {
      return match;
    }
    
    const defaultValue = generateDefaultValue(key);
    modified = true;
    return `t('${key}', { defaultValue: '${defaultValue}' })`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`已更新: ${filePath}`);
    return true;
  }
  
  return false;
}

// 递归处理所有文件
function processDirectory(dir) {
  let count = 0;
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    
    try {
      const stat = fs.statSync(filePath);
      
      if (stat && stat.isDirectory()) {
        if (file !== 'node_modules' && file !== 'build' && file !== 'dist' && file !== '.git') {
          count += processDirectory(filePath);
        }
      } else {
        const ext = path.extname(file);
        if (ext === '.tsx' || ext === '.ts') {
          if (processFile(filePath)) {
            count++;
          }
        }
      }
    } catch (e) {
      // 忽略错误
    }
  });
  
  return count;
}

// 主函数
function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  
  console.log('开始为 t() 调用添加默认值...');
  const count = processDirectory(srcDir);
  console.log(`\n完成！共更新了 ${count} 个文件`);
  console.log('\n现在即使翻译缺失，也会显示默认值');
}

main();
