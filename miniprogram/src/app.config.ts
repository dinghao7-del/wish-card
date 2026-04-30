export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/tasks/index',
    'pages/check-in/index',
    'pages/rewards/index',
    'pages/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#006e1c',
    navigationBarTitleText: 'Forest Family',
    navigationBarTextStyle: 'white',
    backgroundColor: '#fbf9f5',
  },
  tabBar: {
    color: '#3f4a3c',
    selectedColor: '#006e1c',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/icons/home.png',
        selectedIconPath: 'assets/icons/home-active.png',
      },
      {
        pagePath: 'pages/tasks/index',
        text: '任务',
        iconPath: 'assets/icons/task.png',
        selectedIconPath: 'assets/icons/task-active.png',
      },
      {
        pagePath: 'pages/check-in/index',
        text: '打卡',
        iconPath: 'assets/icons/check.png',
        selectedIconPath: 'assets/icons/check-active.png',
      },
      {
        pagePath: 'pages/rewards/index',
        text: '奖励',
        iconPath: 'assets/icons/reward.png',
        selectedIconPath: 'assets/icons/reward-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/profile.png',
        selectedIconPath: 'assets/icons/profile-active.png',
      },
    ],
  },
});
