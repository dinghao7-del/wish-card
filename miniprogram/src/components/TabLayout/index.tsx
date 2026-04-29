import { Component } from 'react';
import { View, Text } from '@tarojs/components';
import { Tabs } from '@taroify/core';
import Home from '@/pages/home/index';
import Tasks from '@/pages/tasks/index';
import CheckIn from '@/pages/check-in/index';
import Rewards from '@/pages/rewards/index';
import Profile from '@/pages/profile/index';
import './TabLayout.scss';

class TabLayout extends Component {
  state = {
    activeTab: 0,
  };

  tabPages = [
    { title: '首页', icon: 'home', component: Home },
    { title: '任务', icon: 'task', component: Tasks },
    { title: '打卡', icon: 'check', component: CheckIn },
    { title: '奖励', icon: 'reward', component: Rewards },
    { title: '我的', icon: 'profile', component: Profile },
  ];

  render() {
    const { activeTab } = this.state;
    const ActiveComponent = this.tabPages[activeTab].component;

    return (
      <View className="tab-layout">
        <View className="tab-content">
          <ActiveComponent />
        </View>
        
        <View className="tab-bar">
          {this.tabPages.map((page, index) => (
            <View
              key={index}
              className={`tab-item ${activeTab === index ? 'active' : ''}`}
              onClick={() => this.setState({ activeTab: index })}
            >
              <View className={`tab-icon tab-icon-${page.icon}`} />
              <Text className="tab-text">{page.title}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
}

export default TabLayout;
