export default defineAppConfig({
  // ========== 主包：核心页面（≤1.5MB）==========
  pages: [
    // TabBar 主页面（必须在主包）
    'pages/home/index',
    'pages/tasks/index',
    'pages/habits/index',
    'pages/rewards/index',
    'pages/profile/index',
    // 核心流程页面
    'pages/login/index',
    'pages/check-in/index',
    'pages/contact/index',
    'pages/forgot-password/index',
    'pages/onboarding/index',
    'pages/switch-profile/index',
  ],

  // ========== 分包配置（方案A：独立分包目录）==========
  // 注意：如果需要启用分包，需要先创建对应的目录并移动文件
  // 当前先注释掉，采用"优化主包体积"的过渡方案
  //
  // subpackages: [
  //   {
  //     root: 'package-task',
  //     pages: [
  //       'pages/tasks/create/index',
  //       'pages/tasks/edit/index',
  //       'pages/tasks/detail/index',
  //     ],
  //   },
  //   {
  //     root: 'package-family',
  //     pages: [
  //       'pages/members/add/index',
  //       'pages/members/detail/index',
  //       'pages/profile/edit/index',
  //       'pages/settings/basic/index',
  //       'pages/settings/security/index',
  //       'pages/settings/notifications/index',
  //     ],
  //   },
  // ],

  // ========== 窗口配置 ==========
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#006e1c',
    navigationBarTitleText: 'Forest Family',
    navigationBarTextStyle: 'white',
    backgroundColor: '#fbf9f5',
  },

  // ========== TabBar 配置 ==========
  tabBar: {
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
