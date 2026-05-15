export default defineAppConfig({
  // ========== 主包：只保留启动页和 TabBar 页面，确保微信 2MB 主包限制 ==========
  pages: [
    // 启动页：先进入欢迎/登录页，再按本地游客或真实账号状态进入首页
    'pages/login/index',
    // TabBar 主页面（必须在主包）
    'pages/home/index',
    'pages/tasks/index',
    'pages/habits/index',
    'pages/rewards/index',
    'pages/profile/index',
  ],

  // ========== 分包：所有二级页和低频流程，保留完整功能但不挤占主包 ==========
  subPackages: [
    {
      root: 'pkg',
      pages: [
        'check-in/index',
        'contact/index',
        'forgot-password/index',
        'onboarding/index',
        'ai-analysis/index',
        'switch-profile/index',
        'tasks/create/index',
        'tasks/edit/index',
        'tasks/detail/index',
        'templates/index',
        'members/add/index',
        'members/detail/index',
        'profile/edit/index',
        'settings/basic/index',
        'settings/security/index',
        'settings/backup/index',
        'settings/calendar/index',
        'settings/notifications/index',
        'settings/feedback/index',
        'settings/ai/index',
        'feedback/index',
        'reports/index',
        'community/templates/index',
        'community/share-review/index',
        'import/index',
        'history/index',
        'quadrant/index',
        'pomodoro/index',
        'plans/index',
        'plans/detail/index',
        'plans/wizard/index',
        'calendar/index',
        'schedule-recommend/index',
        'schedule/index',
      ],
    },
  ],

  // ========== 窗口配置 ==========
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#006e1c',
    navigationBarTitleText: '星愿卡',
    navigationBarTextStyle: 'white',
    backgroundColor: '#fbf9f5',
    navigationStyle: 'custom',
  },

  // ========== TabBar 配置 ==========
  tabBar: {
    custom: true,
    color: '#3f4a3c',
    selectedColor: '#006e1c',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/home/index', text: '首页', iconPath: 'assets/icons/home.png', selectedIconPath: 'assets/icons/home-active.png' },
      { pagePath: 'pages/tasks/index', text: '任务', iconPath: 'assets/icons/task.png', selectedIconPath: 'assets/icons/task-active.png' },
      { pagePath: 'pages/habits/index', text: '奖惩', iconPath: 'assets/icons/check.png', selectedIconPath: 'assets/icons/check-active.png' },
      { pagePath: 'pages/rewards/index', text: '心愿', iconPath: 'assets/icons/reward.png', selectedIconPath: 'assets/icons/reward-active.png' },
      { pagePath: 'pages/profile/index', text: '我的', iconPath: 'assets/icons/profile.png', selectedIconPath: 'assets/icons/profile-active.png' },
    ],
  },

  // ========== 其他优化 ==========
  // 开启组件懒加载
  lazyCodeLoading: 'requiredComponents',
  // 骨架屏配置（可选）
  // skeleton: {
  //   enable: true,
  // },
});
