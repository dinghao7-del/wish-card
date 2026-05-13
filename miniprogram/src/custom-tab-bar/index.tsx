import { Component } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

  // 内联 SVG 图标 - 对齐 DESIGN.md 设计文档
const svgIcons: Record<string, string> = {
  homeTab: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="__COLOR__" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  taskTab: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="__COLOR__" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>`,
  // 奖励(高亮) - Sparkles 图标，对齐 Web 版 BottomNav 用 Sparkles 图标 ✨
  rewardTab: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="__FILL__" stroke="__COLOR__" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>`,
  // 心愿单 - Heart 图标
  wishlistTab: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="__COLOR__" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
  profileTab: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="__COLOR__" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`,
};

interface TabItem {
  pagePath: string;
  text: string;
  icon: string;
  isCheckIn: boolean;
}

interface CustomTabBarState {
  selected: number;
}

export default class CustomTabBar extends Component<{}, CustomTabBarState> {
  state: CustomTabBarState = {
    selected: 0,
  };

  tabList: TabItem[] = [
    // 对齐 Web 端 BottomNav.tsx: 首页 | 任务 | 奖励✨(高亮凸起) | 心愿单 | 我的
    { pagePath: 'pages/home/index', text: '首页', icon: 'homeTab', isCheckIn: false },
    { pagePath: 'pages/tasks/index', text: '任务', icon: 'taskTab', isCheckIn: false },
    { pagePath: 'pages/habits/index', text: '奖励', icon: 'rewardTab', isCheckIn: true },       // 第3位 = 奖励(habits), Sparkles 高亮 ✨
    { pagePath: 'pages/rewards/index', text: '心愿单', icon: 'wishlistTab', isCheckIn: false },  // 第4位 = 心愿单(rewards), Heart
    { pagePath: 'pages/profile/index', text: '我的', icon: 'profileTab', isCheckIn: false },
  ];

  componentDidMount() {
    this.updateSelected();
    // 监听页面切换事件
    Taro.eventCenter.on('tabBarUpdate', this.updateSelected);
  }

  componentWillUnmount() {
    Taro.eventCenter.off('tabBarUpdate', this.updateSelected);
  }

  updateSelected = () => {
    try {
      const pages = Taro.getCurrentPages();
      if (pages.length === 0) return;
      const currentPage = pages[pages.length - 1];
      const route: string = (currentPage as any).route || '';
      const idx = this.tabList.findIndex((tab) => route.endsWith(tab.pagePath));
      if (idx >= 0) {
        this.setState({ selected: idx });
      }
    } catch (err) {
      console.error('[CustomTabBar] updateSelected error:', err);
    }
  };

  switchTab = (index: number, url: string) => {
    this.setState({ selected: index });
    Taro.switchTab({ url: `/${url}` });
  };

  // SVG 转 base64 data URI（支持 __COLOR__ 描边色 和 __FILL__ 填充色）
  svgToDataUri = (svg: string, color: string, fillColor?: string): string => {
    let colored = svg.replace(/__COLOR__/g, color || '#ffffff');
    if (fillColor) {
      colored = colored.replace(/__FILL__/g, fillColor);
    } else {
      colored = colored.replace(/__FILL__/g, 'none');
    }
    return 'data:image/svg+xml,' + encodeURIComponent(colored);
  };

  render() {
    const { selected } = this.state;

    return (
      <View className="custom-tab-bar">
        {this.tabList.map((tab, index) => {
          const isActive = selected === index;

          return (
            <View
              key={index}
              className={`tab-item ${isActive ? 'active' : ''}`}
              onClick={() => this.switchTab(index, tab.pagePath)}
            >
              {tab.isCheckIn ? (
                // 高亮项 - 圆形凸起按钮（与 Web 版 BottomNav 奖励高亮项对齐）
                <View className={`tab-icon-box ${isActive ? 'active' : ''}`}>
                  <Image
                    className="tab-icon-img"
                    src={this.svgToDataUri(svgIcons[tab.icon], '#ffffff', isActive ? '#006e1c' : '#3f4a3c')}
                    mode="scaleToFill"
                  />
                </View>
              ) : (
                // 普通项 - 图标 + 选中背景
                <View className={`tab-icon-wrap ${isActive ? 'active' : ''}`}>
                  <Image
                    className="tab-icon-img"
                    src={this.svgToDataUri(svgIcons[tab.icon], isActive ? '#006e1c' : '#3f4a3c')}
                    mode="scaleToFill"
                  />
                </View>
              )}
              <Text className={`tab-text ${isActive ? 'active' : ''}`}>{tab.text}</Text>
            </View>
          );
        })}
      </View>
    );
  }
}
