import { Component } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import './index.scss';

type TabLayoutProps = {
  children?: React.ReactNode;
};

type TabLayoutState = {
  activeTab: number;
};

type TabPage = {
  title: string;
  icon: string;
  iconActiveColor: string;
  path: string;
  isCenter: boolean;
};

/**
 * TabLayout - 仅用于非 TabBar 页面的内嵌场景
 * ⚠️ 禁止直接 import 页面组件！会导致 Page() 泄漏到 common.js
 *
 * TabBar 页面切换由微信原生 tabBar 处理（见 app.config.ts）
 *
 * 使用 Icon 组件渲染图标（SVG base64），对齐Web BottomNav
 */
class TabLayout extends Component<TabLayoutProps, TabLayoutState> {
  state = {
    activeTab: 0,
  };

  // 对齐 Web BottomNav: 首页(Home)/任务(ClipboardList)/奖惩(Sparkles高亮)/心愿(Trophy)/我的(User)
  tabPages: TabPage[] = [
    { title: '首页', icon: 'home', iconActiveColor: '#006e1c', path: '/pages/home/index', isCenter: false },
    { title: '任务', icon: 'list', iconActiveColor: '#006e1c', path: '/pages/tasks/index', isCenter: false },
    // 中间高亮按钮 — 对齐Web variant="highlight" Sparkles
    { title: '奖惩', icon: 'sparkles', iconActiveColor: '#ffffff', path: '/pages/habits/index', isCenter: true },
    { title: '心愿', icon: 'trophy', iconActiveColor: '#006e1c', path: '/pages/rewards/index', isCenter: false },
    { title: '我的', icon: 'user', iconActiveColor: '#006e1c', path: '/pages/profile/index', isCenter: false },
  ];

  handleTabSwitch = (index: number) => {
    const { path } = this.tabPages[index];
    this.setState({ activeTab: index });
    Taro.switchTab({ url: path });
  };

  render() {
    const { activeTab } = this.state;

    return (
      <View className="tab-layout">
        <View className="tab-content">
          {this.props.children}
        </View>

        <View className="tab-bar">
          {this.tabPages.map((page, index) => {
            const isActive = activeTab === index;
            const isCenter = page.isCenter;
            return (
              <View
                key={index}
                className={`tab-item ${isActive ? 'active' : ''} ${isCenter ? 'center-item' : ''}`}
                onClick={() => this.handleTabSwitch(index)}
              >
                {/* 用 Icon 组件渲染 SVG 图标 — 确保可见 */}
                {isCenter ? (
                  /* 中间高亮大圆钮 — 对齐Web highlight variant */
                  <View className="tab-icon-center-wrap">
                    <Icon
                      name={page.icon}
                      size={40}
                      color={isActive ? page.iconActiveColor : '#5a6b54'}
                    />
                  </View>
                ) : (
                  <Icon
                    name={page.icon}
                    size={48}
                    color={isActive ? '#006e1c' : '#3f4a3c'}
                  />
                )}
                <Text className="tab-text">{page.title}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }
}

export default TabLayout;
