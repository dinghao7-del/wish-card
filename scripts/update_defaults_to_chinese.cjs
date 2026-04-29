#!/usr/bin/env node

/**
 * 将 t() 调用的默认值从英文改为中文
 * 使用 chinese_mapping.js 中的映射表
 */

const fs = require('fs');
const path = require('path');

// 导入中文映射表
const chineseMapping = require("./chinese_mapping.cjs");

// 将驼峰命名转换为可读文本
function camelToText(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .toLowerCase()
    .trim();
}

// 获取中文默认值
function getChineseDefault(key) {
  // 先检查完整键名是否在映射表中
  if (chineseMapping[key]) {
    return chineseMapping[key];
  }
  
  // 检查键的最后一部分
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  if (chineseMapping[lastPart]) {
    return chineseMapping[lastPart];
  }
  
  // 如果没有映射，生成默认文本
  return camelToText(lastPart);
}

// 处理单个文件
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // 匹配 t('key', { defaultValue: 'value' }) 模式
  const regex = /t\(['"]([^'"]+)['"]\s*,\s*\{\s*defaultValue:\s*['"]([^'"]*)['"]\s*\}\)/g;
  
  const newContent = content.replace(regex, (match, key, currentDefault) => {
    const chineseDefault = getChineseDefault(key);
    
    // 如果当前默认值不是中文，则替换
    if (currentDefault && !isChinese(currentDefault)) {
      modified = true;
      return `t('${key}', { defaultValue: '${chineseDefault}' })`;
    }
    
    return match;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`已更新: ${filePath}`);
    return true;
  }
  
  return false;
}

// 检查字符串是否包含中文
function isChinese(str) {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(str);
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
  
  console.log('开始将默认值更新为中文...');
  const count = processDirectory(srcDir);
  console.log(`\n完成！共更新了 ${count} 个文件`);
  console.log('现在默认值应该显示为中文');
}

main();
