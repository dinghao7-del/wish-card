import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  'zh-CN': {
    translation: {
      'common': {
        'back': '返回',
        'save': '保存修改',
        'cancel': '取消',
        'confirm': '确认',
        'confirm_delete': '确定删除',
        'rethink': '我再想想',
        'view_all': '查看全部',
        'stars_suffix': '积分',
      },
      'nav': {
        'home': '首页',
        'tasks': '任务',
        'rewards': '奖惩',
        'wishlist': '心愿',
        'profile': '我的'
      },
      'home': {
        'title': '用努力\n开启小确幸 🌱',
        'energy_title': '今日成长能量',
        'energy_subtitle': '加油！离下一个愿望更近了 🌱',
        'actions': {
          'create_task': '创建目标',
          'make_wish': '许下心愿',
          'view_calendar': '查看日历',
          'pomodoro': '番茄时钟'
        },
        'today_tasks': '今日任务',
        'leaderboard': '家庭排行榜'
      },
      'tasks': {
        'filter': {
          'all': '全部',
          'pending': '进行中',
          'completed': '已完成'
        },
        'status': {
          'reviewing': '待审核',
          'pending': '待完成',
          'completed': '已完成'
        },
        'list': {
          'empty_pending': '当前没有正在进行的任务 🌿',
          'empty_completed': '目前还没有已完成的任务 🌿'
        },
        'calendar': {
          'empty': '这一天没有安排任务哦 🌿'
        },
        'detail': {
          'title': '任务详情',
          'edit': '编辑任务',
          'delete': '删除任务',
          'creator': '分配人',
          'tag': '家庭协作',
          'description': '任务描述',
          'reward': '完成奖励',
          'participants': '参与成员',
          'check_in': '立即打卡',
          'approve': '确认打卡',
          'waiting_approval': '打卡成功，待确认...',
          'reward_distributed': '已发放星星奖励'
        },
        'delete': {
          'confirm_title': '确定删除吗？',
          'confirm_desc': '删除后任务记录将无法找回哦 🌱'
        }
      },
      'rewards': {
        'category': {
          'all': '全部',
          'entertainment': '娱乐',
          'snack': '零食',
          'privilege': '特权'
        },
        'action': {
          'redeem': '立即兑换',
          'cancel': '再看看',
          'confirm': '确认兑换',
          'insufficient': '积分不足'
        },
        'status': {
          'remaining': '还差 {{count}} 个星星'
        },
        'detail': {
          'no_description': '暂无详细说明。这是一个充满森林气息的精美奖励，快用你的星星兑换它吧！🌿'
        }
      },
      'profile': {
        'title': '个人中心',
        'members': {
          'title': '家庭成员',
          'add': '添加成员'
        },
        'menu': {
          'security': '账号安全',
          'share_backup': '分享与备份',
          'share_backup_desc': '备份与还原家庭数据',
          'notifications': '消息通知',
          'feedback': '意见反馈',
          'dark_mode': '深色模式',
          'basic_settings': '基础设置'
        },
        'action': {
          'logout': '退出账号'
        },
        'logout': {
          'confirm': '确定要退出当前账号并返回登录页面吗？🌿'
        },
        'share': {
          'select_content': '选择分享内容',
          'link_title': '分享与链接',
          'copy_link': '复制分享链接',
          'link_copied': '分享链接已复制'
        },
        'export': {
          'download': '下载备份'
        },
        'import': {
          'upload': '上传还原',
          'confirm_title': '确认导入内容',
          'action': '立即导入并覆盖',
          'warning': '导入操作将会视资源分项覆盖当前对应数据，请确保已下载并完整备份。',
          'confirm_msg': '确定要导入备份吗？',
          'items': {
            'members': '• 成员列表',
            'tasks': '• 任务列表',
            'rewards': '• 奖励列表',
            'history': '• 历史记录'
          }
        }
      },
      'settings': {
        'title': '基础设置',
        'language': '多语言',
        'cache': '清除缓存',
        'about': '关于 愿望卡',
        'security': {
          'title': '账号安全',
          'subtitle': '管理您的账号安全选项',
          'password': '修改密码',
          'password_desc': '上次修改于 3个月前',
          'phone': '绑定手机',
          'phone_desc': '138 **** 8888',
          'devices': '设备管理',
          'devices_desc': '当前登录 2台设备',
          'old_password': '原密码',
          'new_password': '新密码',
          'confirm_password': '确认新密码',
          'password_placeholder': '请输入当前密码',
          'new_password_placeholder': '请输入新密码',
          'confirm_password_placeholder': '请再次输入新密码',
          'new_phone': '新手机号',
          'phone_placeholder': '请输入手机号',
          'code': '验证码',
          'code_placeholder': '6位验证码',
          'get_code': '获取',
          'current_device': '当前设备',
          'active_time': '{{time}}前活跃',
          'logout_device': '下线'
        },
        'notifications': {
          'title': '消息通知',
          'subtitle': '个性化您的提醒方式',
          'task_reminder': '任务提醒',
          'task_reminder_desc': '每日 08:00',
          'points_change': '积分变动通知',
          'points_change_desc': '实时推送',
          'system_announcement': '系统公告',
          'system_announcement_desc': '重要更新通知'
        },
        'basic': {
          'subtitle': '通用系统参数配置',
          'version': '版本 {{version}}'
        }
      },
      'welcome': {
        'title': '愿望卡',
        'subtitle': '初次见面，让我们把每个愿望都变成动力 🌱',
        'tagline': '用正向激励法给孩子建立好习惯',
        'start_button': '开启家庭愿望之旅',
        'skip': '跳过',
        'skip_error': '跳过失败，请重试',
        'guest_family': '访客家庭',
        'guest_name': '访客',
        'my_family': '{0}的家庭',
        'has_account': '已有账号？去登录 →',
        'no_account': '没有账号？去注册 →',
        'register': {
          'title': '欢迎注册',
          'subtitle': '只有家长才可以注册管理员哦 🌱',
          'nickname': '管理员昵称',
          'nickname_placeholder': '如：妈妈',
          'password': '登录密码',
          'password_placeholder': '请输入管理密码（至少6位）',
          'confirm_password': '确认密码',
          'confirm_password_placeholder': '请再次输入密码',
          'error_mismatch': '两次输入的密码不一致哦 🍃',
          'error_nickname': '请输入昵称',
          'error_password': '请输入密码',
          'error_password_length': '密码至少6位',
          'submit': '注册账号'
        },
        'login': {
          'title': '欢迎登录',
          'subtitle': '输入账号密码开启今日愿望 🌱',
          'username': '账号',
          'username_placeholder': '邮箱 或 昵称',
          'password': '密码',
          'password_placeholder': '管理密码',
          'error_invalid': '用户名或密码错误，请检查 🍃',
          'error_empty': '请输入账号',
          'error_password': '请输入密码',
          'submit': '进入系统'
        }
      },
      'feedback': {
        'title': '意见反馈',
        'my_feedback': '我的反馈',
        'category': '反馈分类',
        'content': '反馈内容',
        'placeholder': '请输入10个字以上的问题描述，尽量截图或录屏，以便我们快速定位您的问题。',
        'media': '截图/录屏',
        'contact': '联系方式',
        'contact_placeholder': '手机号/微信号/QQ/邮箱均可，便于联系',
        'submit': '提 交',
        'success_title': '反馈成功！',
        'success_desc': '感谢您的宝贵意见，我们会认真核对并持续优化软件体验 🌿',
        'back_home': '返回个人中心',
        'error_min_length': '请输入10个字以上的问题描述，以便我们快速为您解决 🌿',
        'categories': {
          'member': '会员相关',
          'feedback': '功能反馈',
          'suggestion': '优化建议',
          'service': '家长服务',
          'bug': 'BUG反馈',
          'other': '其他'
        }
      },
      'add_member': {
        'title': '添加成员',
        'select_avatar': '选择头像',
        'avatar_selector_title': '选择头像',
        'avatar_selector_subtitle': '共 {{count}} 款精选头像',
        'children_section': '儿童及卡通',
        'adult_section': '成年人及长辈',
        'nickname': '昵称',
        'nickname_placeholder': '请输入成员昵称',
        'role': '角色',
        'role_child': '孩子',
        'role_parent': '家长',
        'initial_stars': '初始星星',
        'pin': '切换密码 (4位数字)',
        'pin_placeholder': '选填：用于快速切换',
        'password': '登录密码',
        'password_required': '(必填)',
        'password_placeholder_parent': '必填管理员密码',
        'password_placeholder_child': '选填：登录密码',
        'error_password_required': '管理员必须设置登录密码 🔐',
        'submit': '完成添加'
      },
      'import': {
        'parsing': '正在解析分享数据...',
        'found_title': '发现分享内容',
        'found_subtitle': '确定要导入以下家庭配置吗？',
        'items_title': '待导入项',
        'members': '家庭成员',
        'tasks': '任务配置库',
        'rewards': '奖励方案集',
        'history': '历史记录数据',
        'confirm_button': '立即导入并覆盖',
        'warning': '* 导入将覆盖当前对应的本地数据，系统建议您在操作前先在个人中心导出当前数据的备份。',
        'success_title': '数据导入成功',
        'success_subtitle': '正在为您同步主页...',
        'error_title': '出错了',
        'error_parsing': '数据解析失败，链接可能已损坏。',
        'error_not_found': '未找到分享数据',
        'error_saving': '保存数据失败',
        'back_home': '返回主页'
      },
      'member_detail': {
        'title': '成员主页',
        'role_parent': '管理员',
        'role_child': '森林探险家',
        'current_stars': '当前星星',
        'completed_tasks': '已成任务',
        'add_stars': '添加星星',
        'deduct_stars': '扣除星星',
        'recent_tasks': '近期任务',
        'view_all': '查看全部',
        'task_completed': '已完成',
        'task_ongoing': '进行中',
        'no_tasks': '暂无任务记录 🍃',
        'delete_member': '删除成员',
        'admin_mode': '进入管理员模式',
        'admin_switch_confirm': '确定要切换到管理员模式吗？',
        'delete_confirm_title': '确认删除成员？',
        'delete_confirm_desc': '删除成员「{{name}}」后，该成员的所有任务记录和星星都将消失，且无法恢复。🌿',
        'deleting': '正在清理森林空间...',
        'edit_stars_title': '修改 {{name}} 的星星',
        'stars_label': '星星',
        'summary_member': '成员',
        'summary_before': '之前',
        'summary_after': '之后',
        'description_label': '描述',
        'description_placeholder': '添加备注...',
        'completed_tasks_title': '已完成的任务',
        'no_completed_tasks': '还没有完成任何任务哦 🍃',
        'got_it': '我知道了'
      }
    }
  },
  'en-US': {
    translation: {
      'common': {
        'back': 'Back',
        'save': 'Save Changes',
        'cancel': 'Cancel',
        'confirm': 'Confirm',
        'confirm_delete': 'Confirm Delete',
        'rethink': 'Let me think',
        'view_all': 'View All',
        'stars_suffix': 'Pts',
      },
      'nav': {
        'home': 'Home',
        'tasks': 'Tasks',
        'rewards': 'Habits',
        'wishlist': 'Wishes',
        'profile': 'Me'
      },
      'home': {
        'title': 'Unlock Happiness\nThrough Effort 🌱',
        'energy_title': 'Daily Growth Energy',
        'energy_subtitle': "Keep going! You're getting closer to your wish 🌱",
        'actions': {
          'create_task': 'Create Goal',
          'make_wish': 'Make Wish',
          'view_calendar': 'Calendar',
          'pomodoro': 'Pomodoro'
        },
        'today_tasks': "Today's Tasks",
        'leaderboard': 'Family Leaderboard'
      },
      'tasks': {
        'filter': {
          'all': 'All',
          'pending': 'Active',
          'completed': 'Done'
        },
        'status': {
          'reviewing': 'Pending Audit',
          'pending': 'Pending',
          'completed': 'Done'
        },
        'list': {
          'empty_pending': 'No active tasks at the moment 🌿',
          'empty_completed': 'No completed tasks yet 🌿'
        },
        'calendar': {
          'empty': 'No tasks scheduled for this day 🌿'
        },
        'detail': {
          'title': 'Task Details',
          'edit': 'Edit Task',
          'delete': 'Delete Task',
          'creator': 'Assigner',
          'tag': 'Collaboration',
          'description': 'Description',
          'reward': 'Reward',
          'participants': 'Participants',
          'check_in': 'Check In Now',
          'approve': 'Approve Check-in',
          'waiting_approval': 'Check-in successful, pending approval...',
          'reward_distributed': 'Reward points distributed'
        },
        'delete': {
          'confirm_title': 'Are you sure you want to delete?',
          'confirm_desc': 'Task records cannot be recovered after deletion 🌱'
        }
      },
      'rewards': {
        'category': {
          'all': 'All',
          'entertainment': 'Entertainment',
          'snack': 'Snacks',
          'privilege': 'Privilege'
        },
        'action': {
          'redeem': 'Redeem Now',
          'cancel': 'Cancel',
          'confirm': 'Confirm Redemption',
          'insufficient': 'Insufficient Points'
        },
        'status': {
          'remaining': '{{count}} stars remaining'
        },
        'detail': {
          'no_description': 'No detailed description available. This is a beautiful reward full of forest vibes, redeem it with your stars! 🌿'
        }
      },
      'profile': {
        'title': 'Profile Center',
        'members': {
          'title': 'Family Members',
          'add': 'Add Member'
        },
        'menu': {
          'security': 'Account Security',
          'share_backup': 'Share & Backup',
          'share_backup_desc': 'Backup & Restore Family Data',
          'notifications': 'Notifications',
          'feedback': 'Feedback',
          'dark_mode': 'Dark Mode',
          'basic_settings': 'Basic Settings'
        },
        'action': {
          'logout': 'Logout'
        },
        'logout': {
          'confirm': 'Are you sure you want to logout and return to the login page? 🌿'
        },
        'share': {
          'select_content': 'Select Content to Share',
          'link_title': 'Share & Link',
          'copy_link': 'Copy Share Link',
          'link_copied': 'Link Copied'
        },
        'export': {
          'download': 'Download Backup'
        },
        'import': {
          'upload': 'Upload Restore',
          'confirm_title': 'Confirm Import Content',
          'action': 'Import and Overwrite Now',
          'warning': 'This will overwrite your existing data. Please ensure you have a backup.',
          'confirm_msg': 'Are you sure you want to import this backup?',
          'items': {
            'members': '• Member List',
            'tasks': '• Task Library',
            'rewards': '• Reward Schemes',
            'history': '• History'
          }
        }
      },
      'settings': {
        'title': 'Basic Settings',
        'language': 'Language',
        'cache': 'Clear Cache',
        'about': 'About WishCard',
        'security': {
          'title': 'Account Security',
          'subtitle': 'Manage your account security options',
          'password': 'Change Password',
          'password_desc': 'Last changed 3 months ago',
          'phone': 'Bind Phone',
          'phone_desc': '+1 **** 8888',
          'devices': 'Device Management',
          'devices_desc': '2 devices currently logged in',
          'old_password': 'Old Password',
          'new_password': 'New Password',
          'confirm_password': 'Confirm New Password',
          'password_placeholder': 'Enter current password',
          'new_password_placeholder': 'Enter new password',
          'confirm_password_placeholder': 'Re-enter new password',
          'new_phone': 'New Phone Number',
          'phone_placeholder': 'Enter phone number',
          'code': 'Verification Code',
          'code_placeholder': '6-digit code',
          'get_code': 'Get',
          'current_device': 'Current Device',
          'active_time': 'Active {{time}} ago',
          'logout_device': 'Logout'
        },
        'notifications': {
          'title': 'Notifications',
          'subtitle': 'Personalize your reminders',
          'task_reminder': 'Task Reminder',
          'task_reminder_desc': 'Daily 08:00',
          'points_change': 'Points Notification',
          'points_change_desc': 'Real-time push',
          'system_announcement': 'System Announcement',
          'system_announcement_desc': 'Important updates'
        },
        'basic': {
          'subtitle': 'General system configuration',
          'version': 'Version {{version}}'
        }
      },
      'welcome': {
        'title': 'WishCard',
        'subtitle': 'Nice to meet you, let\'s turn every wish into motivation 🌱',
        'tagline': 'Establish good habits for children with positive incentives',
        'start_button': 'Start Family Journey',
        'skip': 'Skip',
        'skip_error': 'Skip failed, please retry',
        'guest_family': 'Guest Family',
        'guest_name': 'Guest',
        'my_family': '{0}\'s Family',
        'has_account': 'Already have an account? Login →',
        'no_account': 'No account? Register →',
        'register': {
          'title': 'Welcome Register',
          'subtitle': 'Only parents can register as administrators 🌱',
          'nickname': 'Admin Nickname',
          'nickname_placeholder': 'e.g., Mom',
          'password': 'Login Password',
          'password_placeholder': 'Enter management password (min 6 chars)',
          'confirm_password': 'Confirm Password',
          'confirm_password_placeholder': 'Re-enter password',
          'error_mismatch': 'Passwords do not match 🍃',
          'error_nickname': 'Please enter a nickname',
          'error_password': 'Please enter a password',
          'error_password_length': 'Password must be at least 6 characters',
          'submit': 'Register'
        },
        'login': {
          'title': 'Welcome Login',
          'subtitle': 'Enter your account and password to start today\'s wish 🌱',
          'username': 'Account',
          'username_placeholder': 'Email or Nickname',
          'password': 'Password',
          'password_placeholder': 'Management password',
          'error_invalid': 'Incorrect username or password, please check 🍃',
          'error_empty': 'Please enter your account',
          'error_password': 'Please enter your password',
          'submit': 'Login'
        }
      },
      'feedback': {
        'title': 'Feedback',
        'my_feedback': 'My Feedback',
        'category': 'Category',
        'content': 'Content',
        'placeholder': 'Please enter a problem description of more than 10 words, and try to include screenshots or screen recordings.',
        'media': 'Screenshots/Recordings',
        'contact': 'Contact',
        'contact_placeholder': 'Phone/WeChat/QQ/Email',
        'submit': 'Submit',
        'success_title': 'Submitted Successfully!',
        'success_desc': 'Thank you for your valuable comments, we will carefully check and continue to optimize the software experience 🌿',
        'back_home': 'Back to Profile',
        'error_min_length': 'Please enter at least 10 characters for problem description 🌿',
        'categories': {
          'member': 'Member',
          'feedback': 'Feature',
          'suggestion': 'Suggestion',
          'service': 'Parental',
          'bug': 'Bug',
          'other': 'Other'
        }
      },
      'add_member': {
        'title': 'Add Member',
        'select_avatar': 'Select Avatar',
        'avatar_selector_title': 'Select Avatar',
        'avatar_selector_subtitle': '{{count}} selected avatars',
        'children_section': 'Children & Cartoon',
        'adult_section': 'Adults & Elders',
        'nickname': 'Nickname',
        'nickname_placeholder': 'Enter nickname',
        'role': 'Role',
        'role_child': 'Child',
        'role_parent': 'Parent',
        'initial_stars': 'Initial Stars',
        'pin': 'Quick Pin (4 digits)',
        'pin_placeholder': 'Optional: for quick switch',
        'password': 'Login Password',
        'password_required': '(Required)',
        'password_placeholder_parent': 'Admin password required',
        'password_placeholder_child': 'Optional password',
        'error_password_required': 'Admins must set a login password 🔐',
        'submit': 'Complete'
      },
      'import': {
        'parsing': 'Parsing shared data...',
        'found_title': 'Sharing Content Found',
        'found_subtitle': 'Are you sure you want to import the following family configuration?',
        'items_title': 'Items to Import',
        'members': 'Family Members',
        'tasks': 'Task Library',
        'rewards': 'Reward Schemes',
        'history': 'History Data',
        'confirm_button': 'Import and Overwrite',
        'warning': '* Importing will overwrite current local data. It is recommended to back up your data first.',
        'success_title': 'Data Imported Successfully',
        'success_subtitle': 'Syncing home page...',
        'error_title': 'Something went wrong',
        'error_parsing': 'Data parsing failed, the link may be corrupted.',
        'error_not_found': 'Shared data not found',
        'error_saving': 'Failed to save data',
        'back_home': 'Back to Home'
      },
      'member_detail': {
        'title': 'Member Profile',
        'role_parent': 'Admin',
        'role_child': 'Forest Explorer',
        'current_stars': 'Current Stars',
        'completed_tasks': 'Completed Tasks',
        'add_stars': 'Add Stars',
        'deduct_stars': 'Deduct Stars',
        'recent_tasks': 'Recent Tasks',
        'view_all': 'View All',
        'task_completed': 'Completed',
        'task_ongoing': 'Ongoing',
        'no_tasks': 'No task records yet 🍃',
        'delete_member': 'Delete Member',
        'admin_mode': 'Enter Admin Mode',
        'admin_switch_confirm': 'Are you sure you want to switch to admin mode?',
        'delete_confirm_title': 'Delete Member?',
        'delete_confirm_desc': 'After deleting "{{name}}", all their task records and stars will be lost forever. 🌿',
        'deleting': 'Clearing forest space...',
        'edit_stars_title': 'Edit {{name}}\'s Stars',
        'stars_label': 'Stars',
        'summary_member': 'Member',
        'summary_before': 'Before',
        'summary_after': 'After',
        'description_label': 'Description',
        'description_placeholder': 'Add a note...',
        'completed_tasks_title': 'Completed Tasks',
        'no_completed_tasks': 'No completed tasks yet 🍃',
        'got_it': 'Got it'
      }
    }
  },
  'ja-JP': {
    translation: {
      'common': {
        'back': '戻る',
        'save': '変更を保存',
        'cancel': 'キャンセル',
        'confirm': '確認',
      },
      'nav': {
        'home': 'ホーム',
        'tasks': 'タスク',
        'rewards': '報酬',
        'wishlist': '願い事',
        'profile': 'マイ'
      },
      'home': {
        'title': '努力で\n幸せを解き放つ',
        'energy_title': '今日の成長エネルギー',
        'energy_subtitle': '頑張って！次の願いまであと少しです 🌱',
        'actions': {
          'create_task': '目標作成',
          'make_wish': '願い事',
          'view_calendar': 'カレンダー',
          'pomodoro': 'タイマー'
        },
        'today_tasks': '今日のタスク',
        'leaderboard': 'ランキング'
      },
      'profile': {
        'title': 'マイページ',
        'menu': {
          'security': 'セキュリティ',
          'share_backup': 'バックアップ',
          'share_backup_desc': 'データの保存と復元',
          'notifications': '通知設定',
          'feedback': 'フィードバック',
          'dark_mode': 'ダークモード',
          'basic_settings': '基本設定'
        },
        'action': {
          'logout': 'ログアウト'
        }
      },
      'settings': {
        'title': '基本設定',
        'language': '多言語',
        'cache': 'キャッシュをクリア',
        'about': 'WishCardについて'
      }
    }
  },
  'ko-KR': {
    translation: {
      'common': {
        'back': '뒤로',
        'save': '변경 사항 저장',
        'cancel': '취소',
        'confirm': '확인',
      },
      'nav': {
        'home': '홈',
        'tasks': '할 일',
        'rewards': '보상',
        'wishlist': '소원',
        'profile': '내 정보'
      },
      'home': {
        'title': '노력으로\n행복을 열다',
        'energy_title': '오늘의 성장 에너지',
        'energy_subtitle': '힘내세요! 다음 소원이 머지않았습니다 🌱',
        'actions': {
          'create_task': '목표 만들기',
          'make_wish': '소원 빌기',
          'view_calendar': '캘린더 보기',
          'pomodoro': '포모도로'
        },
        'today_tasks': '오늘의 할 일',
        'leaderboard': '랭킹'
      },
      'profile': {
        'title': '마이 페이지',
        'menu': {
          'security': '계정 보안',
          'share_backup': '공유 및 백アップ',
          'share_backup_desc': '데이터 백업 및 복원',
          'notifications': '알림 설정',
          'feedback': '의견 보내기',
          'dark_mode': '다크 모드',
          'basic_settings': '기본 설정'
        },
        'action': {
          'logout': '로그아웃'
        }
      },
      'settings': {
        'title': '기본 설정',
        'language': '다국어',
        'cache': '캐시 삭제',
        'about': 'WishCard 정보'
      }
    }
  },
  'es-ES': {
    translation: {
      'common': {
        'back': 'Volver',
        'save': 'Guardar Cambios',
        'cancel': 'Cancelar',
        'confirm': 'Confirmar',
      },
      'nav': {
        'home': 'Inicio',
        'tasks': 'Tareas',
        'rewards': 'Premios',
        'wishlist': 'Deseos',
        'profile': 'Perfil'
      },
      'home': {
        'title': 'Desbloquea la Felicidad\na Través del Esfuerzo',
        'energy_title': 'Energía de Crecimiento Diario',
        'energy_subtitle': '¡Sigue así! Estás más cerca de tu deseo 🌱',
        'actions': {
          'create_task': 'Crear Meta',
          'make_wish': 'Pedir Deseo',
          'view_calendar': 'Ver Calendario',
          'pomodoro': 'Pomodoro'
        },
        'today_tasks': 'Tareas de Hoy',
        'leaderboard': 'Clasificación'
      },
      'profile': {
        'title': 'Mi Perfil',
        'menu': {
          'security': 'Seguridad',
          'share_backup': 'Compartir y Copia',
          'share_backup_desc': 'Copia de seguridad y restauración',
          'notifications': 'Notificaciones',
          'feedback': 'Comentarios',
          'dark_mode': 'Modo Oscuro',
          'basic_settings': 'Ajustes Básicos'
        },
        'action': {
          'logout': 'Cerrar Sesión'
        }
      },
      'settings': {
        'title': 'Ajustes Básicos',
        'language': 'Idioma',
        'cache': 'Limpiar Caché',
        'about': 'Sobre WishCard',
        'security': {
          'title': 'Seguridad de la Cuenta',
          'subtitle': 'Administra tus opciones de seguridad',
          'password': 'Cambiar Contraseña',
          'password_desc': 'Último cambio hace 3 meses',
          'phone': 'Vincular Teléfono',
          'phone_desc': '+34 **** 8888',
          'devices': 'Gestión de Dispositivos',
          'devices_desc': '2 dispositivos conectados',
          'old_password': 'Contraseña Anterior',
          'new_password': 'Nueva Contraseña',
          'confirm_password': 'Confirmar Nueva Contraseña',
          'password_placeholder': 'Ingrese contraseña actual',
          'new_password_placeholder': 'Ingrese nueva contraseña',
          'confirm_password_placeholder': 'Reingrese nueva contraseña',
          'new_phone': 'Nuevo Teléfono',
          'phone_placeholder': 'Ingrese número de teléfono',
          'code': 'Código de Verificación',
          'code_placeholder': 'Código de 6 dígitos',
          'get_code': 'Obtener',
          'current_device': 'Dispositivo Actual',
          'active_time': 'Activo hace {{time}}',
          'logout_device': 'Cerrar Sesión'
        },
        'notifications': {
          'title': 'Notificaciones',
          'subtitle': 'Personaliza tus recordatorios',
          'task_reminder': 'Recordatorio de Tareas',
          'task_reminder_desc': 'Diario 08:00',
          'points_change': 'Notificación de Puntos',
          'points_change_desc': 'Push en tiempo real',
          'system_announcement': 'Aviso del Sistema',
          'system_announcement_desc': 'Actualizaciones importantes'
        },
        'basic': {
          'subtitle': 'Configuración general del sistema',
          'version': 'Versión {{version}}'
        }
      },
      'welcome': {
        'title': 'WishCard',
        'subtitle': 'Mucho gusto, convirtamos cada deseo en motivación 🌱',
        'tagline': 'Establecer buenos hábitos para los niños con incentivos positivos',
        'start_button': 'Iniciar viaje familiar',
        'register': {
          'title': 'Bienvenida Registro',
          'subtitle': 'Solo los padres pueden registrarse como administradores 🌱',
          'nickname': 'Apodo del administrador',
          'nickname_placeholder': 'ej. Mamá',
          'password': 'Contraseña de inicio de sesión',
          'password_placeholder': 'Ingrese la contraseña de gestión',
          'confirm_password': 'Confirmar contraseña',
          'confirm_password_placeholder': 'Vuelva a ingresar la contraseña',
          'error_mismatch': 'Las contraseñas no coinciden 🍃',
          'submit': 'Entrar al sistema'
        },
        'login': {
          'title': 'Bienvenida Inicio de sesión',
          'subtitle': 'Ingrese su cuenta y contraseña para comenzar el deseo de hoy 🌱',
          'username': 'Cuenta',
          'username_placeholder': 'Apodo o admin',
          'password': 'Contraseña',
          'password_placeholder': 'Contraseña de gestión',
          'error_invalid': 'Nombre de usuario o contraseña incorrectos, por favor verifique 🍃',
          'submit': 'Entrar al sistema'
        }
      },
      'feedback': {
        'title': 'Comentarios',
        'my_feedback': 'Mis comentarios',
        'category': 'Categoría',
        'content': 'Contenido',
        'placeholder': 'Ingrese una descripción del problema de más de 10 palabras e intente incluir capturas de pantalla.',
        'media': 'Capturas/Grabaciones',
        'contact': 'Contacto',
        'contact_placeholder': 'Teléfono/WeChat/QQ/Email',
        'submit': 'Enviar',
        'success_title': '¡Enviado con éxito!',
        'success_desc': 'Gracias por sus valiosos comentarios, revisaremos cuidadosamente y continuaremos optimizando la experiencia del software 🌿',
        'back_home': 'Volver al perfil',
        'error_min_length': 'Ingrese al menos 10 caracteres para la descripción del problema 🌿',
        'categories': {
          'member': 'Miembro',
          'feedback': 'Función',
          'suggestion': 'Sugerencia',
          'service': 'Padres',
          'bug': 'Error',
          'other': 'Otro'
        }
      }
    }
  },
  'fr-FR': {
    translation: {
      'common': {
        'back': 'Retour',
        'save': 'Enregistrer',
        'cancel': 'Annuler',
        'confirm': 'Confirmer',
      },
      'nav': {
        'home': 'Accueil',
        'tasks': 'Tâches',
        'rewards': 'Récompenses',
        'wishlist': 'Souhaits',
        'profile': 'Moi'
      },
      'home': {
        'title': 'Libérez le Bonheur\npar l\'Effort',
        'energy_title': 'Énergie de Croissance Quotidienne',
        'energy_subtitle': 'Continuez ! Vous vous rapprochez de votre souhait 🌱',
        'actions': {
          'create_task': 'Créer Objectif',
          'make_wish': 'Faire un Vœu',
          'view_calendar': 'Calendrier',
          'pomodoro': 'Pomodoro'
        },
        'today_tasks': 'Tâches d\'Aujourd\'hui',
        'leaderboard': 'Classement'
      },
      'profile': {
        'title': 'Mon Profil',
        'menu': {
          'security': 'Sécurité',
          'share_backup': 'Partage et Sauvegarde',
          'share_backup_desc': 'Sauvegarde et restauration des données',
          'notifications': 'Notifications',
          'feedback': 'Commentaires',
          'dark_mode': 'Mode Sombre',
          'basic_settings': 'Paramètres de Base'
        },
        'action': {
          'logout': 'Déconnexion'
        }
      },
      'settings': {
        'title': 'Paramètres de Base',
        'language': 'Langue',
        'cache': 'Vider le Cache',
        'about': 'À Propos de WishCard',
        'security': {
          'title': 'Sécurité du Compte',
          'subtitle': 'Gérez vos options de sécurité',
          'password': 'Changer le Mot de Passe',
          'password_desc': 'Dernière modification il y a 3 mois',
          'phone': 'Lier un Téléphone',
          'phone_desc': '+33 **** 8888',
          'devices': 'Gestion des Appareils',
          'devices_desc': '2 appareils connectés',
          'old_password': 'Ancien Mot de Passe',
          'new_password': 'Nouveau Mot de Passe',
          'confirm_password': 'Confirmer le Mot de Passe',
          'password_placeholder': 'Entrez le mot de passe actuel',
          'new_password_placeholder': 'Entrez le nouveau mot de passe',
          'confirm_password_placeholder': 'Ressaisissez le mot de passe',
          'new_phone': 'Nouveau Numéro',
          'phone_placeholder': 'Entrez le numéro de téléphone',
          'code': 'Code de Vérification',
          'code_placeholder': 'Code à 6 chiffres',
          'get_code': 'Obtenir',
          'current_device': 'Appareil Actuel',
          'active_time': 'Actif il y a {{time}}',
          'logout_device': 'Déconnexion'
        },
        'notifications': {
          'title': 'Notifications',
          'subtitle': 'Personnalisez vos rappels',
          'task_reminder': 'Rappel de Tâche',
          'task_reminder_desc': 'Quotidien 08:00',
          'points_change': 'Notification de Points',
          'points_change_desc': 'Push en temps réel',
          'system_announcement': 'Annonce Système',
          'system_announcement_desc': 'Mises à jour importantes'
        },
        'basic': {
          'subtitle': 'Configuration générale du système',
          'version': 'Version {{version}}'
        }
      },
      'welcome': {
        'title': 'WishCard',
        'subtitle': 'Ravi de vous rencontrer, transformons chaque souhait en motivation 🌱',
        'tagline': 'Établissez de bonnes habitudes pour les enfants avec des incitations positives',
        'start_button': 'Commencer le voyage en famille',
        'register': {
          'title': 'Bienvenue Inscription',
          'subtitle': 'Seuls les parents peuvent s\'inscrire en tant qu\'administrateurs 🌱',
          'nickname': 'Surnom de l\'administrateur',
          'nickname_placeholder': 'ex. Maman',
          'password': 'Mot de passe de connexion',
          'password_placeholder': 'Entrez le mot de passe de gestion',
          'confirm_password': 'Confirmer le mot de passe',
          'confirm_password_placeholder': 'Ressaisir le mot de passe',
          'error_mismatch': 'Les mots de passe ne correspondent pas 🍃',
          'submit': 'Entrer dans le système'
        },
        'login': {
          'title': 'Bienvenue Connexion',
          'subtitle': 'Entrez votre compte et votre mot de passe pour commencer le souhait d\'aujourd\'hui 🌱',
          'username': 'Compte',
          'username_placeholder': 'Surnom ou admin',
          'password': 'Mot de passe',
          'password_placeholder': 'Mot de passe de gestion',
          'error_invalid': 'Nom d\'utilisateur ou mot de passe incorrect, veuillez vérifier 🍃',
          'submit': 'Entrer dans le système'
        }
      },
      'feedback': {
        'title': 'Commentaires',
        'my_feedback': 'Mes commentaires',
        'category': 'Catégorie',
        'content': 'Contenu',
        'placeholder': 'Veuillez saisir une description du problème de plus de 10 mots et essayer d\'inclure des captures d\'écran.',
        'media': 'Captures/Enregistrements',
        'contact': 'Contact',
        'contact_placeholder': 'Téléphone/WeChat/QQ/Email',
        'submit': 'Soumettre',
        'success_title': 'Soumis avec succès !',
        'success_desc': 'Merci pour vos précieux commentaires, nous vérifierons attentivement et continuerons à optimiser l\'expérience du logiciel 🌿',
        'back_home': 'Retour au profil',
        'error_min_length': 'Veuillez saisir au moins 10 caractères pour la description du problème 🌿',
        'categories': {
          'member': 'Membre',
          'feedback': 'Fonction',
          'suggestion': 'Suggestion',
          'service': 'Parental',
          'bug': 'Bogue',
          'other': 'Autre'
        }
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
