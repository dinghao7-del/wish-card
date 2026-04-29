#!/usr/bin/env node

/**
 * 为缺失的翻译键添加中文默认值到 zh-CN
 */

const fs = require('fs');
const path = require('path');

// 读取 i18n 配置文件
const i18nFilePath = path.join(__dirname, '..', 'src', 'i18n', 'index.ts');
let content = fs.readFileSync(i18nFilePath, 'utf8');

// 从代码中提取所有有效的翻译键
function extractKeysFromCode() {
  const srcDir = path.join(__dirname, '..', 'src');
  const files = getAllFiles(srcDir, ['.tsx', '.ts']);
  
  const keys = new Set();
  
  files.forEach(file => {
    const fileContent = fs.readFileSync(file, 'utf8');
    // 匹配 t('key') 或 t("key")
    const matches = fileContent.matchAll(/t\(['"]([^'"]+)['"]\)/g);
    for (const match of matches) {
      const key = match[1];
      // 只保留有效的键（包含点号，且不包含特殊字符）
      if (key.includes('.') && !key.includes(' ') && !key.includes('{')) {
        keys.add(key);
      }
    }
  });
  
  return Array.from(keys).sort();
}

// 递归获取所有文件
function getAllFiles(dir, extensions) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      
      if (stat && stat.isDirectory()) {
        if (file !== 'node_modules' && file !== 'build' && file !== 'dist') {
          results = results.concat(getAllFiles(filePath, extensions));
        }
      } else {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          results.push(filePath);
        }
      }
    } catch (e) {
      // 忽略权限错误等
    }
  });
  
  return results;
}

// 解析现有的 zh-CN 翻译键（从 translation 对象中）
function parseExistingKeys(content) {
  const keys = new Set();
  
  // 找到 zh-CN 的 translation 部分
  const zhMatch = content.match(/'zh-CN':\s*\{[\s\S]*?translation:\s*\{([\s\S]*?)\}\s*\}/);
  if (!zhMatch) {
    console.log('未找到 zh-CN 翻译部分');
    return keys;
  }
  
  // 简单提取所有键（这只适用于扁平结构，但我们的翻译是嵌套的）
  // 让我改用更简单的方法：直接检查键是否存在于内容中
  return keys;
}

// 检查键是否已经在翻译文件中存在
function keyExistsInFile(content, key) {
  // 将键按点分割，检查嵌套结构是否存在
  const parts = key.split('.');
  
  // 简单检查：键的第一部分是否在第一层对象中
  const firstPart = parts[0];
  const regex = new RegExp(`['"]?${firstPart}['"]?\\s*:\\s*\\{`);
  
  if (!regex.test(content)) {
    return false;
  }
  
  // 如果存在第一部分，检查第二部分
  if (parts.length >= 2) {
    const secondPart = parts[1];
    // 检查在第二层对象中是否存在这个键
    const sectionRegex = new RegExp(`['"]?${firstPart}['"]?\\s*:\\s*\\{[\\s\\S]*?['"]?${secondPart}['"]?\\s*:`);
    return sectionRegex.test(content);
  }
  
  return true;
}

// 生成中文默认值
function generateDefaultValue(key) {
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // 将 camelCase 转换为可读的文本
  let text = lastPart
    .replace(/([A-Z])/g, ' $1') // 在大写字母前加空格
    .toLowerCase()
    .trim();
  
  // 首字母大写
  text = text.charAt(0).toUpperCase() + text.slice(1);
  
  return text;
}

// 主函数
function main() {
  console.log('开始提取翻译键...');
  const allKeys = extractKeysFromCode();
  console.log(`从代码中提取了 ${allKeys.length} 个翻译键`);
  
  // 找出缺失的键
  const missingKeys = allKeys.filter(key => !keyExistsInFile(content, key));
  console.log(`缺失的翻译键: ${missingKeys.length} 个`);
  
  if (missingKeys.length === 0) {
    console.log('所有翻译键都已存在！');
    return;
  }
  
  // 为缺失的键生成默认值
  console.log('\n缺失的键和默认值:');
  missingKeys.forEach(key => {
    const defaultValue = generateDefaultValue(key);
    console.log(`  ${key} = "${defaultValue}"`);
  });
  
  console.log('\n请手动将这些键添加到 src/i18n/index.ts 的 zh-CN 部分');
  console.log('或者运行完整脚本自动添加（需要更复杂的解析）');
}

main();
