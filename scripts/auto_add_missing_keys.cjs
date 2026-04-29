/**
 * 自动为 i18n/index.ts 中的 zh-CN 添加缺失的翻译 key
 * 直接修改文件，在正确的 section 中插入新的 key-value 对
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const I18N_FILE = path.join(__dirname, '..', 'src', 'i18n', 'index.ts');

// 从代码中提取所有 t('key') 的 key
function extractKeysFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const keys = [];
  const regex = /t\(['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    keys.push(match[1]);
  }
  return keys;
}

function extractAllKeys(dir) {
  let allKeys = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'i18n') {
        allKeys = allKeys.concat(extractAllKeys(fullPath));
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const keys = extractKeysFromFile(fullPath);
      allKeys = allKeys.concat(keys);
    }
  }
  return allKeys;
}

// 为 key 生成中文翻译（扩展版）
function genChinese(key) {
  // 直接映射表（优先级最高）
  const map = {
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
    'common.confirm_delete': '确定删除',
    'common.rethink': '我再想想',
    'common.view_all': '查看全部',
    'common.stars_suffix': '积分',
    'common.loading': '加载中...',
    'common.error': '出错了',
    'common.success': '成功',
    // home
    'home.title': '用努力开启小确幸',
    'home.energy_title': '今日成长能量',
    'home.energy_subtitle': '加油！离下一个愿望更近了',
    'home.today_tasks': '今日任务',
    'home.leaderboard': '家庭排行榜',
    // home_tabs
    'home_tabs.leaderboard': '排行榜',
    'home_tabs.quadrant': '四象限',
    'home_tabs.quadrant_analysis': '四象限分析',
    'home_tabs.click_for_full': '点击查看完整分析',
    // tasks
    'tasks.title': '任务',
    'tasks.filter.all': '全部',
    'tasks.filter.pending': '进行中',
    'tasks.filter.completed': '已完成',
    'tasks.status.reviewing': '待审核',
    'tasks.status.pending': '待完成',
    'tasks.status.completed': '已完成',
    'tasks.status.verify': '待确认',
    'tasks.status.pending_confirm': '待确认',
    'tasks.assignee.all': '全部成员',
    'tasks.action.check_in': '打卡',
    'tasks.list.empty_pending': '当前没有正在进行的任务',
    'tasks.list.empty_completed': '目前还没有已完成的任务',
    'tasks.calendar.empty': '这一天没有安排任务哦',
    'tasks.detail.title': '任务详情',
    'tasks.detail.edit': '编辑',
    'tasks.detail.delete': '删除',
    'tasks.detail.creator': '分配人',
    'tasks.detail.tag': '家庭协作',
    'tasks.detail.description': '描述',
    'tasks.detail.reward': '奖励',
    'tasks.detail.participants': '参与成员',
    'tasks.detail.check_in': '立即打卡',
    'tasks.detail.approve': '确认打卡',
    'tasks.detail.waiting_approval': '打卡成功，待确认',
    'tasks.detail.reward_distributed': '已发放星星奖励',
    'tasks.delete.confirm_title': '确定删除吗？',
    'tasks.delete.confirm_desc': '删除后任务记录将无法找回',
    // rewards
    'rewards.title': '奖惩',
    'rewards.category.all': '全部',
    'rewards.category.entertainment': '娱乐',
    'rewards.category.snack': '零食',
    'rewards.category.privilege': '特权',
    'rewards.category.common': '通用',
    'rewards.category.experience': '体验',
    'rewards.category.prize': '奖品',
    'rewards.category.growth': '成长',
    'rewards.category.activity': '活动',
    'rewards.action.redeem': '立即兑换',
    'rewards.action.cancel': '再看看',
    'rewards.action.confirm': '确认兑换',
    'rewards.action.insufficient': '积分不足',
    'rewards.status.remaining': '还差 {{count}} 个星星',
    'rewards.detail.no_description': '暂无详细说明',
    'rewards.detail.title': '奖励详情',
    // profile
    'profile.title': '个人中心',
    'profile.members.title': '家庭成员',
    'profile.members.add': '添加成员',
    'profile.menu.security': '账号安全',
    'profile.menu.share_backup': '分享与备份',
    'profile.menu.notifications': '消息通知',
    'profile.menu.feedback': '意见反馈',
    'profile.menu.dark_mode': '深色模式',
    'profile.menu.basic_settings': '基础设置',
    'profile.action.logout': '退出账号',
    'profile.logout.confirm': '确定要退出吗？',
    'profile.share.select_content': '选择分享内容',
    'profile.share.link_title': '分享链接',
    'profile.share.copy_link': '复制分享链接',
    'profile.share.link_copied': '链接已复制',
    'profile.export.download': '下载备份',
    'profile.import.upload': '上传还原',
    'profile.import.confirm_title': '确认导入',
    'profile.import.action': '立即导入',
    'profile.import.warning': '导入将覆盖当前数据',
    'profile.import.confirm_msg': '确定要导入吗？',
    'profile.import.items.members': '• 成员列表',
    'profile.import.items.tasks': '• 任务列表',
    'profile.import.items.rewards': '• 奖励列表',
    'profile.import.items.history': '• 历史记录',
    // settings
    'settings.title': '基础设置',
    'settings.language': '多语言',
    'settings.cache': '清除缓存',
    'settings.about': '关于愿望卡',
    'settings.basic.subtitle': '通用系统参数配置',
    'settings.basic.version': '版本 {{version}}',
    'settings.security.title': '账号安全',
    'settings.security.subtitle': '管理您的账号安全选项',
    'settings.security.password': '修改密码',
    'settings.security.phone': '绑定手机',
    'settings.security.devices': '设备管理',
    'settings.notifications.title': '消息通知',
    'settings.notifications.subtitle': '个性化您的提醒方式',
    'settings.notifications.task_reminder': '任务提醒',
    'settings.notifications.points_change': '积分变动通知',
    'settings.notifications.system_announcement': '系统公告',
    // welcome
    'welcome.title': '愿望卡',
    'welcome.subtitle': '初次见面，让我们把每个愿望都变成动力',
    'welcome.tagline': '用正向激励法给孩子建立好习惯',
    'welcome.start_button': '开启家庭愿望之旅',
    'welcome.skip': '跳过',
    'welcome.skip_error': '跳过失败，请重试',
    'welcome.guest_family': '访客家庭',
    'welcome.guest_name': '访客',
    'welcome.my_family': '{0}的家庭',
    'welcome.has_account': '已有账号？去登录',
    'welcome.no_account': '没有账号？去注册',
    // feedback
    'feedback.title': '意见反馈',
    'feedback.my_feedback': '我的反馈',
    'feedback.category': '反馈分类',
    'feedback.content': '反馈内容',
    'feedback.placeholder': '请输入问题描述',
    'feedback.media': '截图/录屏',
    'feedback.contact': '联系方式',
    'feedback.submit': '提交',
    'feedback.success_title': '反馈成功',
    'feedback.success_desc': '感谢您的宝贵意见',
    'feedback.back_home': '返回个人中心',
    'feedback.error_min_length': '请输入至少10个字',
    'feedback.categories.member': '会员相关',
    'feedback.categories.feedback': '功能反馈',
    'feedback.categories.suggestion': '优化建议',
    'feedback.categories.service': '家长服务',
    'feedback.categories.bug': 'BUG反馈',
    'feedback.categories.other': '其他',
    // add_member
    'add_member.title': '添加成员',
    'add_member.select_avatar': '选择头像',
    'add_member.avatar_selector_title': '选择头像',
    'add_member.avatar_selector_subtitle': '精选头像',
    'add_member.children_section': '儿童及卡通',
    'add_member.adult_section': '成年人及长辈',
    'add_member.nickname': '昵称',
    'add_member.nickname_placeholder': '请输入成员昵称',
    'add_member.role': '角色',
    'add_member.role_child': '孩子',
    'add_member.role_parent': '家长',
    'add_member.initial_stars': '初始星星',
    'add_member.pin': '切换密码',
    'add_member.pin_placeholder': '选填',
    'add_member.password': '登录密码',
    'add_member.password_required': '（必填）',
    'add_member.password_placeholder_parent': '必填管理员密码',
    'add_member.password_placeholder_child': '选填登录密码',
    'add_member.error_password_required': '管理员必须设置密码',
    'add_member.submit': '完成添加',
    // import
    'import.parsing': '正在解析分享数据...',
    'import.found_title': '发现分享内容',
    'import.found_subtitle': '确定要导入以下家庭配置吗？',
    'import.items_title': '待导入项',
    'import.members': '家庭成员',
    'import.tasks': '任务配置库',
    'import.rewards': '奖励方案集',
    'import.history': '历史记录数据',
    'import.confirm_button': '立即导入并覆盖',
    'import.warning': '导入将覆盖当前对应的本地数据',
    'import.success_title': '数据导入成功',
    'import.success_subtitle': '正在为您同步主页...',
    'import.error_title': '出错了',
    'import.error_parsing': '数据解析失败',
    'import.error_not_found': '未找到分享数据',
    'import.error_saving': '保存数据失败',
    'import.back_home': '返回主页',
    // member_detail
    'member_detail.title': '成员主页',
    'member_detail.role_parent': '管理员',
    'member_detail.role_child': '森林探险家',
    'member_detail.current_stars': '当前星星',
    'member_detail.completed_tasks': '已成任务',
    'member_detail.add_stars': '添加星星',
    'member_detail.deduct_stars': '扣除星星',
    'member_detail.recent_tasks': '近期任务',
    'member_detail.view_all': '查看全部',
    'member_detail.task_completed': '已完成',
    'member_detail.task_ongoing': '进行中',
    'member_detail.no_tasks': '暂无任务记录',
    'member_detail.delete_member': '删除成员',
    'member_detail.admin_mode': '进入管理员模式',
    'member_detail.admin_switch_confirm': '确定要切换吗？',
    'member_detail.delete_confirm_title': '确认删除成员？',
    'member_detail.delete_confirm_desc': '删除后所有数据将消失',
    'member_detail.deleting': '正在清理...',
    'member_detail.edit_stars_title': '修改星星',
    'member_detail.stars_label': '星星',
    'member_detail.summary_member': '成员',
    'member_detail.summary_before': '之前',
    'member_detail.summary_after': '之后',
    'member_detail.description_label': '描述',
    'member_detail.description_placeholder': '添加备注',
    'member_detail.completed_tasks_title': '已完成的任务',
    'member_detail.no_completed_tasks': '还没有完成的任务',
    'member_detail.got_it': '我知道了',
    // date_range
    'date_range.all': '全部',
    'date_range.today': '今天',
    'date_range.next_3_days': '未来3天',
    'date_range.next_7_days': '未来7天',
    'date_range.this_week': '本周',
    'date_range.this_month': '本月',
    'date_range.next_30_days': '未来30天',
    'date_range.this_year': '今年',
    // quadrant / quadrant_analysis
    'quadrant_analysis.title': '四象限分析',
    'quadrant_analysis.subtitle': '任务优先级分析',
    'quadrant_analysis.error': '加载失败',
    'quadrant_analysis.today': '今天',
    'quadrant_analysis.week': '本周',
    'quadrant_analysis.month': '本月',
    'quadrant_analysis.loading': '加载中...',
    'quadrant_analysis.retry': '重试',
    'quadrant_analysis.items_count': '{{count}} 个任务',
    'quadrant_analysis.no_tasks': '暂无任务',
    'quadrant_analysis.suggestions': '建议',
    'quadrant.urgent_important': '紧急重要',
    'quadrant.not_urgent_important': '不紧急但重要',
    'quadrant.urgent_not_important': '紧急不重要',
    'quadrant.not_urgent_not_important': '不紧急不重要',
    // publish_task
    'publish_task.title': '发布任务',
    'publish_task.reward': '奖励',
    'publish_task.penalty': '惩罚',
    'publish_task.description': '描述',
    'publish_task.star_reward': '星星奖励',
    'publish_task.parent_publisher': '家长发布',
    'publish_task.child_executor': '孩子执行',
    'publish_task.submit_add': '发布任务',
    'publish_task.select_category': '选择分类',
    'publish_task.tag_management': '标签管理',
    'publish_task.time_period': '时间周期',
    'publish_task.time_execution': '执行时间',
    'publish_task.reminder': '提醒',
    'publish_task.reminder_hint': '提醒提示',
    'publish_task.tag_name_placeholder': '输入标签名',
    'publish_task.add_tag': '添加标签',
    'publish_task.cancel_tag': '取消',
    'publish_task.tag_hint': '标签提示',
    'publish_task.weekly': '每周',
    'publish_task.monthly': '每月',
    'publish_task.calendar': '日历',
    'publish_task.week_prefix': '第',
    'publish_task.week_headers': '周',
    'publish_task.quick_workday': '工作日',
    'publish_task.quick_weekend': '周末',
    'publish_task.quick_odd_days': '奇数日',
    'publish_task.quick_even_days': '偶数日',
    'publish_task.quick_ebbinghaus': '艾宾浩斯',
    'publish_task.quick_21day': '21天习惯',
    'publish_task.weekly_score': '每周评分',
    'publish_task.monthly_score': '每月评分',
    'publish_task.calendar_score': '日历评分',
    // voice_assistant
    'voice_assistant.greeting': '你好！我是你的语音助手',
    'voice_assistant.listening': '正在听...',
    'voice_assistant.listening_failed': '启动失败',
    'voice_assistant.error': '出错了',
    'voice_assistant.missing_task_name': '请告诉我任务名称',
    'voice_assistant.executor': '执行人',
    'voice_assistant.reward_stars': '奖励星星',
    'voice_assistant.confirm_create': '确认创建任务',
    'voice_assistant.task_created': '任务已创建',
    'voice_assistant.missing_task_for_complete': '请告诉我哪个任务',
    'voice_assistant.confirm_complete_task': '确认完成任务',
    'voice_assistant.confirm_complete': '确认完成',
    'voice_assistant.task_completed': '任务已完成',
    'voice_assistant.missing_task_for_approve': '请告诉我哪个打卡',
    'voice_assistant.confirm_approve_task': '确认通过打卡',
    'voice_assistant.confirm_approve': '确认通过',
    'voice_assistant.task_approved': '打卡已通过',
    'voice_assistant.missing_task_for_delete': '请告诉我哪个任务',
    'voice_assistant.confirm_delete_task': '确认删除任务',
    'voice_assistant.confirm_delete': '确认删除',
    'voice_assistant.task_deleted': '任务已删除',
    'voice_assistant.task_overview': '任务概览',
    'voice_assistant.reviewing_tasks': '待审核任务',
    'voice_assistant.pending_tasks': '进行中任务',
    'voice_assistant.more_tasks': '更多任务',
    'voice_assistant.completed_tasks_count': '已完成 {{count}} 个',
    'voice_assistant.missing_wish_name': '请告诉我心愿名称',
    'voice_assistant.confirm_create_wish': '确认创建心愿',
    'voice_assistant.wish_created': '心愿已创建',
    'voice_assistant.wish_not_found': '未找到该心愿',
    'voice_assistant.insufficient_stars': '星星不足',
    'voice_assistant.confirm_redeem_wish': '确认兑换心愿',
    'voice_assistant.confirm_redeem': '确认兑换',
    'voice_assistant.redeem_success': '兑换成功',
    'voice_assistant.enjoy_wish': '享受你的心愿吧',
    'voice_assistant.affordable_wishes': '可兑换的心愿',
    'voice_assistant.your_stars': '你的星星',
    'voice_assistant.star_count': '星星数量',
    'voice_assistant.star_history': '星星历史',
    'voice_assistant.quadrant_ready': '四象限分析已就绪',
    'voice_assistant.quick_cmds.quadrant': '四象限',
    'voice_assistant.encouragement_continue': '继续加油',
    'voice_assistant.encouragement_great': '太棒了',
    'voice_assistant.today_summary': '今日总结',
    'voice_assistant.suggestion_reviewing': '有任务待审核',
    'voice_assistant.suggestion_affordable': '有可兑换的心愿',
    'voice_assistant.suggestion_many_pending': '有很多进行中的任务',
    'voice_assistant.suggestion_all_good': '一切都很棒',
    'voice_assistant.smart': '智能助手',
    // habits
    'habits.type.penalty': '惩罚',
    'habits.type.reward': '奖励',
    'habits.title': '习惯',
    // task_templates
    'task_templates.all': '全部',
    'task_templates.title': '任务模板',
    'task_templates.search_placeholder': '搜索模板',
    'task_templates.add_custom': '自定义',
    'task_templates.daily': '每日',
    'task_templates.weekly': '每周',
  };

  if (map[key]) return map[key];

  // 兜底：把 key 最后一部分做简单中文映射
  const last = key.split('.').pop();
  const wordMap = {
    'home': '首页', 'tasks': '任务', 'rewards': '奖惩', 'wishlist': '心愿',
    'profile': '我的', 'settings': '设置', 'leaderboard': '排行榜',
    'quadrant': '四象限', 'analysis': '分析', 'calendar': '日历',
    'history': '历史', 'templates': '模板', 'pomodoro': '番茄时钟',
    'add': '添加', 'edit': '编辑', 'delete': '删除', 'view': '查看',
    'create': '创建', 'make': '制作', 'publish': '发布',
    'import': '导入', 'export': '导出', 'download': '下载',
    'upload': '上传', 'copy': '复制', 'share': '分享',
    'backup': '备份', 'restore': '还原', 'login': '登录',
    'register': '注册', 'logout': '退出', 'password': '密码',
    'nickname': '昵称', 'avatar': '头像', 'stars': '星星',
    'points': '积分', 'all': '全部', 'pending': '进行中',
    'completed': '已完成', 'reviewing': '待审核', 'active': '活跃',
    'title': '标题', 'name': '名称', 'desc': '描述',
    'description': '描述', 'category': '分类', 'status': '状态',
    'action': '操作', 'menu': '菜单', 'list': '列表',
    'detail': '详情', 'confirm': '确认', 'cancel': '取消',
    'save': '保存', 'back': '返回', 'submit': '提交',
    'success': '成功', 'error': '错误', 'warning': '警告', 'info': '信息',
    'loading': '加载中', 'retry': '重试', 'got_it': '知道了',
    'today': '今天', 'week': '本周', 'month': '本月', 'year': '今年',
  };
  return wordMap[last] || last;
}

// 主函数：找出缺失的 key，生成需要添加的翻译
function main() {
  console.log('🔍 提取代码中所有翻译 key...');
  const allKeys = extractAllKeys(SRC_DIR);
  const uniqueKeys = [...new Set(allKeys)];
  console.log(`找到 ${uniqueKeys.length} 个唯一的翻译 key`);

  console.log('\n📖 读取翻译文件...');
  let content = fs.readFileSync(I18N_FILE, 'utf-8');

  // 找出所有已存在的 key（在 zh-CN 区块中）
  const existingKeys = new Set();
  const zhMatch = content.match(/'zh-CN':\s*\{[\s\S]*?^  \},/m);
  if (zhMatch) {
    const zhContent = zhMatch[0];
    const keyRegex = /'([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)*)'\s*:/g;
    let m;
    while ((m = keyRegex.exec(zhContent)) !== null) {
      existingKeys.add(m[1]);
    }
  }

  console.log(`翻译文件中已有 ${existingKeys.size} 个 key`);

  // 找出缺失的 key
  const missing = uniqueKeys.filter(k => !existingKeys.has(k) && !k.includes('/') && !k.includes('.'));
  console.log(`\n⚠️  发现 ${missing.length} 个缺失的翻译 key`);

  if (missing.length === 0) {
    console.log('✅ 所有 key 都已存在！');
    return;
  }

  // 生成要添加的翻译（按 section 分组）
  const grouped = {};
  for (const key of missing) {
    const section = key.split('.')[0];
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(key);
  }

  console.log('\n📝 生成需要添加的翻译（JSON 格式）：');
  console.log('\n// ===== 请将这些翻译复制到 src/i18n/index.ts 的 zh-CN 区块中 =====\n');

  for (const [section, keys] of Object.entries(grouped)) {
    console.log(`  // --- ${section} ---`);
    for (const key of keys) {
      const value = genChinese(key);
      const keyInSection = key.substring(section.length + 1);
      if (keyInSection) {
        console.log(`      '${keyInSection}': '${value}',`);
      } else {
        console.log(`    '${key}': '${value}',`);
      }
    }
    console.log('');
  }

  console.log('\n💡 请手动将以上翻译添加到 src/i18n/index.ts 的正确位置');
  console.log('   或者运行自动修复脚本（需要更复杂的解析）');
}

main();
