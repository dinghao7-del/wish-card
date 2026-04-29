/**
 * 修复所有 t() 调用中英文 defaultValue，替换为中文
 * 直接修改源代码文件
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// 精确的 key -> 中文 映射表（从实际 defaultValue 英文反推）
const fixMap = {
  'no tasks': '暂无任务',
  'suggestions': '建议',
  'subtitle': '副标题',
  'greeting': '你好！我是你的语音助手',
  'listening': '正在听...',
  'listening failed': '启动失败',
  'missing task name': '请告诉我任务名称',
  'executor': '执行人',
  'reward stars': '奖励星星',
  'confirm create': '确认创建任务',
  'missing task for complete': '请告诉我哪个任务',
  'confirm complete task': '确认完成任务',
  'confirm complete': '确认完成',
  'task completed': '任务已完成',
  'missing task for approve': '请告诉我哪个打卡',
  'confirm approve task': '确认通过打卡',
  'confirm approve': '确认通过',
  'task approved': '打卡已通过',
  'missing task for delete': '请告诉我哪个任务',
  'confirm delete task': '确认删除任务',
  'confirm delete': '确认删除',
  'task deleted': '任务已删除',
  'task overview': '任务概览',
  'reviewing tasks': '待审核任务',
  'pending tasks': '进行中任务',
  'more tasks': '更多任务',
  'completed tasks count': '已完成 {{count}} 个',
  'missing wish name': '请告诉我心愿名称',
  'confirm create wish': '确认创建心愿',
  'wish created': '心愿已创建',
  'wish not found': '未找到该心愿',
  'insufficient stars': '星星不足',
  'confirm redeem wish': '确认兑换心愿',
  'confirm redeem': '确认兑换',
  'redeem success': '兑换成功',
  'enjoy wish': '享受你的心愿吧',
  'affordable wishes': '可兑换的心愿',
  'your stars': '你的星星',
  'star count': '星星数量',
  'star history': '星星历史',
  'quadrant ready': '四象限分析已就绪',
  'quick cmds.quadrant': '四象限',
  'encouragement continue': '继续加油',
  'encouragement great': '太棒了',
  'today summary': '今日总结',
  'suggestion reviewing': '有任务待审核',
  'suggestion affordable': '有可兑换的心愿',
  'suggestion many pending': '有很多进行中的任务',
  'suggestion all good': '一切都很棒',
  'smart': '智能助手',
  '加载中': '加载中...',
  '错误': '错误',
  '副标题': '副标题',
  '标题': '标题',
};

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  const lines = content.split('\n');
  const newLines = [];

  for (let line of lines) {
    // 匹配 t('key', { defaultValue: 'english value' })
    const regex = /(t\(['"][^'"]+['"]\s*,\s*\{\s*defaultValue\s*:\s*['"](.*?)['"]\s*\}\s*\))/g;
    let newLine = line;
    let match;
    
    // 重置正则的 lastIndex
    const regex2 = /defaultValue\s*:\s*['"](.*?)['"]/g;
    while ((match = regex2.exec(line)) !== null) {
      const currentDefault = match[1];
      if (fixMap[currentDefault]) {
        const oldStr = `defaultValue: '${currentDefault}'`;
        const newStr = `defaultValue: '${fixMap[currentDefault]}'`;
        // 只替换第一个匹配（避免替换错误）
        if (newLine.includes(oldStr)) {
          newLine = newLine.replace(oldStr, newStr);
          modified = true;
        }
      }
    }
    
    newLines.push(newLine);
  }

  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
    console.log(`  ✏️  ${path.relative(process.cwd(), filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'i18n') {
        walkDir(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixFile(fullPath);
    }
  }
}

console.log('🔧 修复所有英文 defaultValue...\n');
walkDir(SRC_DIR);
console.log('\n✅ 完成！请重启开发服务器。');
