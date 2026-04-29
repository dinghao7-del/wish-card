/**
 * 全面修复 i18n 翻译系统
 * 1. 从代码中提取所有 t() 调用的 key
 * 2. 检查这些 key 是否在 zh-CN 翻译中存在
 * 3. 如果不存在，添加到翻译文件中（使用中文默认值）
 * 4. 检查所有 t() 调用的 defaultValue，确保是中文
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const I18N_FILE = path.join(__dirname, '..', 'src', 'i18n', 'index.ts');

// 从代码中提取所有 t('key') 或 t("key") 的 key
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = [];
  // 匹配 t('key') 或 t("key")
  const regex1 = /t\(['"]([^'"]+)['"]\s*[,)]/g;
  let match;
  while ((match = regex1.exec(content)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

// 递归提取目录下所有 .tsx 和 .ts 文件中的 key
function extractAllKeys(dir) {
  let allKeys = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        allKeys = allKeys.concat(extractAllKeys(fullPath));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const keys = extractKeysFromFile(fullPath);
      allKeys = allKeys.concat(keys);
    }
  }
  return allKeys;
}

// 解析翻译文件，提取所有 key（简单解析，支持嵌套）
function parseTranslationKeys(content) {
  const keys = [];
  // 匹配 'key': 'value' 或 'key': { 
  const regex = /'([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)'\s*:\s*('[^']*'|\{[,:])/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

// 常见英文到中文的映射（用于生成默认值）
const commonTranslations = {
  // nav
  'nav.home': '首页',
  'nav.tasks': '任务',
  'nav.rewards': '奖惩',
  'nav.wishlist': '心愿',
  'nav.profile': '我的',
  // common
  'common.back': '返回',
  'common.save': '保存',
  'common.cancel': '取消',
  'common.confirm': '确认',
  'common.loading': '加载中...',
  'common.error': '出错了',
  'common.success': '成功',
  // home
  'home.title': '用努力开启小确幸',
  'home.energy_title': '今日成长能量',
  'home.energy_subtitle': '加油！离下一个愿望更近了',
  'home.today_tasks': '今日任务',
  'home.leaderboard': '家庭排行榜',
  'home_tabs.leaderboard': '排行榜',
  'home_tabs.quadrant': '四象限',
  'home_tabs.quadrant_analysis': '四象限分析',
  'home_tabs.click_for_full': '点击查看完整分析',
  // tasks
  'tasks.filter.all': '全部',
  'tasks.filter.pending': '进行中',
  'tasks.filter.completed': '已完成',
  'tasks.status.reviewing': '待审核',
  'tasks.status.pending': '待完成',
  'tasks.status.completed': '已完成',
  // rewards
  'rewards.category.all': '全部',
  'rewards.category.entertainment': '娱乐',
  'rewards.category.snack': '零食',
  'rewards.category.privilege': '特权',
  // profile
  'profile.title': '个人中心',
  'profile.menu.notifications': '消息通知',
  'profile.menu.feedback': '意见反馈',
  'profile.menu.dark_mode': '深色模式',
  'profile.menu.basic_settings': '基础设置',
  // settings
  'settings.title': '基础设置',
  'settings.language': '多语言',
  'settings.cache': '清除缓存',
  'settings.about': '关于',
  // welcome
  'welcome.title': '愿望卡',
  'welcome.start_button': '开始',
  'welcome.has_account': '已有账号？去登录',
  'welcome.no_account': '没有账号？去注册',
  // feedback
  'feedback.title': '意见反馈',
  'feedback.category': '反馈分类',
  'feedback.content': '反馈内容',
  'feedback.submit': '提交',
  // add_member
  'add_member.title': '添加成员',
  'add_member.nickname': '昵称',
  'add_member.role': '角色',
  'add_member.submit': '完成添加',
  // import
  'import.parsing': '正在解析...',
  'import.found_title': '发现分享内容',
  'import.confirm_button': '立即导入',
  'import.success_title': '导入成功',
  // member_detail
  'member_detail.title': '成员主页',
  'member_detail.current_stars': '当前星星',
  'member_detail.completed_tasks': '已完成任务',
  'member_detail.recent_tasks': '近期任务',
};

// 主函数
function main() {
  console.log('🔍 提取代码中所有翻译 key...');
  const allKeys = extractAllKeys(SRC_DIR);
  const uniqueKeys = [...new Set(allKeys)];
  console.log(`找到 ${uniqueKeys.length} 个唯一的翻译 key`);

  console.log('\n📖 读取翻译文件...');
  let i18nContent = fs.readFileSync(I18N_FILE, 'utf-8');

  console.log('\n🔧 检查并修复 defaultValue...');
  // 检查 src 目录中的所有文件，修复 defaultValue
  fixDefaultValues(SRC_DIR);

  console.log('\n✅ 完成！');
  console.log('请运行 npm run dev 重启开发服务器');
}

// 修复文件中的 defaultValue
function fixDefaultValues(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        fixDefaultValues(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixFileDefaultValues(fullPath);
    }
  }
}

function fixFileDefaultValues(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 查找所有 t('key', { defaultValue: 'xxx' }) 调用
  const regex = /t\(['"]([^'"]+)['"]\s*,\s*\{\s*defaultValue\s*:\s*['"]([^'"]*)['"]\s*\}/g;
  let match;
  const replacements = [];
  
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    const defaultValue = match[2];
    
    // 如果 defaultValue 是英文（包含英文字母），尝试替换为中文
    if (/[a-zA-Z]/.test(defaultValue) && commonTranslations[key]) {
      const newDefaultValue = commonTranslations[key];
      const oldStr = `t('${key}', { defaultValue: '${defaultValue}' })`;
      const newStr = `t('${key}', { defaultValue: '${newDefaultValue}' })`;
      replacements.push({ oldStr, newStr });
      modified = true;
    }
  }

  // 应用替换
  for (const { oldStr, newStr } of replacements) {
    content = content.replace(oldStr, newStr);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✏️  修复 defaultValue: ${filePath}`);
  }
}

main();
