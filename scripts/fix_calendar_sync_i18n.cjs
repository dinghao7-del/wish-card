/**
 * 修复 CalendarSync.tsx 中所有英文 defaultValue
 * 将英文 defaultValue 替换为中文
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || 'src/pages/CalendarSync.tsx';
const fullPath = path.resolve(__dirname, '..', filePath);

let content = fs.readFileSync(fullPath, 'utf-8');

// 映射表：英文 defaultValue -> 中文
const replacements = [
  // 标题/副标题
  [/\{\s*defaultValue:\s*'标题'\s*\}/g, "{ defaultValue: '日历同步' }"],
  [/\{\s*defaultValue:\s*'副标题'\s*\}/g, "{ defaultValue: '与手机日历无缝同步' }"],
  
  // 设备检测
  [/\{\s*defaultValue:\s*'detected device'\s*\}\s*\|\|/g, "{ defaultValue: '检测到您的设备' } ||"],
  [/defaultValue:\s*'view guide'/g, "defaultValue: '查看引导'"],
  [/defaultValue:\s*'exporting'/g, "defaultValue: '导出中...'"],
  [/defaultValue:\s*'export ics'/g, "defaultValue: '导出ICS'"],
  [/defaultValue:\s*'import ics'/g, "defaultValue: '导入ICS'"],
  
  // 订阅管理
  [/defaultValue:\s*'subscriptions'\s*\}\s*(\|\|)/g, "defaultValue: '订阅管理' } $1"],
  [/defaultValue:\s*'no subscriptions'/g, "defaultValue: '暂无订阅'"],
  [/defaultValue:\s*'create subscription hint'/g, "defaultValue: '点击 + 创建订阅链接，可同步到手机日历'"],
  [/defaultValue:\s*'copy link'/g, "defaultValue: '复制链接'"],
  [/defaultValue:\s*'copied'/g, "defaultValue: '已复制'"],
  [/defaultValue:\s*'last accessed'/g, "defaultValue: '最后访问'"],
  
  // 品牌选择
  [/defaultValue:\s*'all brands'/g, "defaultValue: '所有品牌'"],
  [/defaultValue:\s*'brand hint'/g, "defaultValue: '选择您的手机品牌，查看详细的日历同步步骤'"],
  [/defaultValue:\s*'selected'/g, "defaultValue: '已选择'"],
  [/defaultValue:\s*'brand tap'/g, "defaultValue: '点击查看步骤'"],
  
  // 方法
  [/defaultValue:\s*'method title'/g, "defaultValue: '同步方式'"],
  [/defaultValue:\s*'method subscribe'/g, "defaultValue: '方法一：订阅链接（推荐）'"],
  [/defaultValue:\s*'method subscribe desc'/g, "defaultValue: '自动同步，无需手动导入'"],
  [/defaultValue:\s*'method export'/g, "defaultValue: '方法二：导出文件'"],
  [/defaultValue:\s*'method export desc'/g, "defaultValue: '手动导入，适合一次性同步'"],
  [/defaultValue:\s*'one click subscribe'/g, "defaultValue: '一键订阅'"],
  [/defaultValue:\s*'copy subscribe link'/g, "defaultValue: '复制订阅链接'"],
  [/defaultValue:\s*'export .ics 文件'/g, "defaultValue: '导出 .ics 文件'"],
  
  // 步骤
  [/defaultValue:\s*'steps title'/g, "defaultValue: '导入步骤'"],
  
  // 提示
  [/defaultValue:\s*'tips title'/g, "defaultValue: '温馨提示'"],
  
  // 其他
  [/defaultValue:\s*'supported'/g, "defaultValue: '支持同步'"],
  [/defaultValue:\s*'limited'/g, "defaultValue: '有限支持'"],
  [/defaultValue:\s*'closing'/g, "defaultValue: '关闭'"],
  [/defaultValue:\s*'import file'/g, "defaultValue: '文件导入'"],
  [/defaultValue:\s*'import url'/g, "defaultValue: '链接导入'"],
  [/defaultValue:\s*'select file'/g, "defaultValue: '选择 .ics 文件'"],
  [/defaultValue:\s*'importing'/g, "defaultValue: '导入中...'"],
  [/defaultValue:\s*'import file hint'/g, "defaultValue: '支持 .ics、.ical 格式'"],
  [/defaultValue:\s*'import url placeholder'/g, "defaultValue: '粘贴日历订阅链接...'"],
  [/defaultValue:\s*'coming soon'/g, "defaultValue: '即将推出'"],
  [/defaultValue:\s*'import from url'/g, "defaultValue: '从链接导入'"],
  
  // 警报消息
  [/alert\(`导出失败，请重试`,\s*\{defaultValue:\s*'导出失败，请重试'\}\)/g, 
   "alert(t('calendar_sync.export_fail', { defaultValue: '导出失败，请重试' })"],
  [/defaultValue:\s*'no events'/g, "defaultValue: '未找到可导入的事件'"],
  [/defaultValue:\s*'import confirm'/g, "defaultValue: '导入确认'"],
  [/defaultValue:\s*'events found'/g, "defaultValue: '个事件，是否导入为任务？'"],
  [/defaultValue:\s*'import success'/g, "defaultValue: '成功导入'"],
  [/defaultValue:\s*'events'/g, "defaultValue: '个事件'"],
  
  // copied_then_open_calendar
  [/defaultValue:\s*'copied then open calendar'/g, "defaultValue: '链接已复制！请在手机日历App中粘贴此链接'"],
];

let changed = 0;
for (const [pattern, replacement] of replacements) {
  const before = content;
  content = content.replace(pattern, replacement);
  if (content !== before) changed++;
}

if (changed > 0) {
  fs.writeFileSync(fullPath, content, 'utf-8');
  console.log(`✅ 修复了 ${changed} 处英文 defaultValue`);
} else {
  console.log('⚠️ 没有找到需要修复的内容');
}

// 显示所有 still 英文的 defaultValue
const stillEnglish = content.match(/defaultValue:\s*'(?![\u4e00-\u9fa5])[^']+'/g);
if (stillEnglish && stillEnglish.length > 0) {
  console.log('\n⚠️ 仍可能存在的英文 defaultValue:');
  stillEnglish.forEach(m => console.log('  -', m));
}
