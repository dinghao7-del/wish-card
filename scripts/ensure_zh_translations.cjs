/**
 * 确保所有代码中的 t() key 在 zh-CN 翻译文件中都存在
 * 如果不存在，自动添加中文翻译
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const I18N_FILE = path.join(__dirname, '..', 'src', 'i18n', 'index.ts');

// 从代码中提取所有 t('key') 的 key（支持点分隔的嵌套 key）
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = [];
  // 匹配 t('key') 或 t("key")
  const regex = /t\(['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
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

// 解析翻译文件中已有 key（简单解析）
function parseExistingKeys(content) {
  const keys = new Set();
  // 匹配 'key': （在 zh-CN 区块内）
  const regex = /^\s*'([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)'\s*:/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

// 根据 key 生成合理的中文默认值
function generateChineseDefault(key) {
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  // 特殊 key 映射
  const specialMap = {
    'nav.home': '首页',
    'nav.tasks': '任务',
    'nav.rewards': '奖惩',
    'nav.wishlist': '心愿',
    'nav.profile': '我的',
    'common.back': '返回',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.confirm_delete': '确定删除',
    'common.rethink': '我再想想',
    'common.view_all': '查看全部',
    'common.stars_suffix': '积分',
    'common.loading': '加载中...',
    'home.title': '用努力开启小确幸',
    'home.energy_title': '今日成长能量',
    'home.energy_subtitle': '加油！离下一个愿望更近了',
    'home.today_tasks': '今日任务',
    'home.leaderboard': '家庭排行榜',
    'home_tabs.leaderboard': '排行榜',
    'home_tabs.quadrant': '四象限',
    'home_tabs.quadrant_analysis': '四象限分析',
    'home_tabs.click_for_full': '点击查看完整分析',
    'tasks.filter.all': '全部',
    'tasks.filter.pending': '进行中',
    'tasks.filter.completed': '已完成',
    'tasks.status.reviewing': '待审核',
    'tasks.status.pending': '待完成',
    'tasks.status.completed': '已完成',
    'rewards.category.all': '全部',
    'rewards.category.entertainment': '娱乐',
    'rewards.category.snack': '零食',
    'rewards.category.privilege': '特权',
    'rewards.action.redeem': '立即兑换',
    'rewards.action.cancel': '再看看',
    'rewards.action.confirm': '确认兑换',
    'rewards.action.insufficient': '积分不足',
    'profile.title': '个人中心',
    'profile.menu.security': '账号安全',
    'profile.menu.share_backup': '分享与备份',
    'profile.menu.notifications': '消息通知',
    'profile.menu.feedback': '意见反馈',
    'profile.menu.dark_mode': '深色模式',
    'profile.menu.basic_settings': '基础设置',
    'profile.action.logout': '退出账号',
    'settings.title': '基础设置',
    'settings.language': '多语言',
    'settings.cache': '清除缓存',
    'settings.about': '关于愿望卡',
    'settings.notifications.title': '消息通知',
    'settings.notifications.subtitle': '个性化您的提醒方式',
    'settings.notifications.task_reminder': '任务提醒',
    'settings.notifications.points_change': '积分变动通知',
    'settings.notifications.system_announcement': '系统公告',
    'welcome.title': '愿望卡',
    'welcome.subtitle': '初次见面，让我们把每个愿望都变成动力',
    'welcome.tagline': '用正向激励法给孩子建立好习惯',
    'welcome.start_button': '开启家庭愿望之旅',
    'welcome.skip': '跳过',
    'welcome.has_account': '已有账号？去登录',
    'welcome.no_account': '没有账号？去注册',
    'feedback.title': '意见反馈',
    'feedback.category': '反馈分类',
    'feedback.content': '反馈内容',
    'feedback.submit': '提交',
    'feedback.success_title': '反馈成功',
    'add_member.title': '添加成员',
    'add_member.nickname': '昵称',
    'add_member.role': '角色',
    'add_member.submit': '完成添加',
    'import.parsing': '正在解析分享数据...',
    'import.found_title': '发现分享内容',
    'import.confirm_button': '立即导入并覆盖',
    'import.success_title': '数据导入成功',
    'member_detail.title': '成员主页',
    'member_detail.current_stars': '当前星星',
    'member_detail.completed_tasks': '已成任务',
    'member_detail.recent_tasks': '近期任务',
  };
  
  if (specialMap[key]) return specialMap[key];
  
  // 通用兜底：将 key 的最后一部分转为中文（简单映射）
  const wordMap = {
    'home': '首页',
    'tasks': '任务',
    'rewards': '奖惩',
    'wishlist': '心愿',
    'profile': '我的',
    'settings': '设置',
    'leaderboard': '排行榜',
    'quadrant': '四象限',
    'analysis': '分析',
    'calendar': '日历',
    'history': '历史',
    'templates': '模板',
    'pomodoro': '番茄时钟',
    'add': '添加',
    'edit': '编辑',
    'delete': '删除',
    'view': '查看',
    'create': '创建',
    'make': '制作',
    'publish': '发布',
    'import': '导入',
    'export': '导出',
    'download': '下载',
    'upload': '上传',
    'copy': '复制',
    'share': '分享',
    'backup': '备份',
    'restore': '还原',
    'login': '登录',
    'register': '注册',
    'logout': '退出',
    'password': '密码',
    'nickname': '昵称',
    'avatar': '头像',
    'stars': '星星',
    'points': '积分',
    'all': '全部',
    'pending': '进行中',
    'completed': '已完成',
    'reviewing': '待审核',
    'active': '活跃',
    'title': '标题',
    'name': '名称',
    'desc': '描述',
    'description': '描述',
    'category': '分类',
    'status': '状态',
    'action': '操作',
    'menu': '菜单',
    'list': '列表',
    'detail': '详情',
    'confirm': '确认',
    'cancel': '取消',
    'save': '保存',
    'back': '返回',
    'submit': '提交',
    'success': '成功',
    'error': '错误',
    'warning': '警告',
    'info': '信息',
  };
  
  return wordMap[lastPart] || lastPart;
}

// 在翻译文件中为缺失的 key 添加中文翻译
function addMissingTranslations(existingKeys, allKeys) {
  let i18nContent = fs.readFileSync(I18N_FILE, 'utf-8');
  
  const missingKeys = [];
  for (const key of allKeys) {
    if (!existingKeys.has(key)) {
      missingKeys.push(key);
    }
  }
  
  if (missingKeys.length === 0) {
    console.log('✅ 所有 key 都已存在于 zh-CN 翻译中！');
    return;
  }
  
  console.log(`⚠️  发现 ${missingKeys.length} 个缺失的翻译 key：`);
  missingKeys.forEach(k => console.log(`  - ${k}`));
  
  // 按section分组缺失的key
  const grouped = {};
  for (const key of missingKeys) {
    const section = key.split('.')[0];
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(key);
  }
  
  // 为每个section生成翻译并插入到文件中
  for (const [section, keys] of Object.entries(grouped)) {
    console.log(`\n📝 为 [${section}] 添加 ${keys.length} 个翻译：`);
    
    for (const key of keys) {
      const chineseValue = generateChineseDefault(key);
      const keyWithoutSection = key.substring(section.length + 1);
      
      // 在文件中找到该 section 的插入位置
      // 简单处理：在 'zh-CN' 的 translation 对象的右括号前插入
      // 实际实现需要更精细的解析
      console.log(`  '${key}': '${chineseValue}'`);
    }
  }
  
  console.log('\n💡 请手动将上述翻译添加到 src/i18n/index.ts 的 zh-CN 区块中');
}

function main() {
  console.log('🔍 提取代码中所有翻译 key...');
  const allKeys = extractAllKeys(SRC_DIR);
  const uniqueKeys = [...new Set(allKeys)];
  console.log(`找到 ${uniqueKeys.length} 个唯一的翻译 key`);
  
  console.log('\n📖 读取翻译文件...');
  const i18nContent = fs.readFileSync(I18N_FILE, 'utf-8');
  const existingKeys = parseExistingKeys(i18nContent);
  console.log(`翻译文件中已有 ${existingKeys.size} 个 key`);
  
  console.log('\n🔧 检查缺失的翻译...');
  addMissingTranslations(existingKeys, uniqueKeys);
}

main();
