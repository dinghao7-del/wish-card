import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { getGuestData, isGuestMode } from '@/lib/guestData';
import { getLocalUser } from '@/utils/localUser';
import { APP_RELEASE_DATE, APP_VERSION, APP_VERSION_LABEL } from '@/lib/appMeta';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

const actions = [
  {
    icon: 'sparkles',
    title: '智能建档',
    desc: '用最少问题整理家庭画像、课外班、兴趣和作息',
    url: '/pkg/onboarding/index',
    color: '#006e1c',
  },
  {
    icon: 'barChart',
    title: '家庭复盘',
    desc: '自动形成周报、月报，展示任务、习惯、星星和愿望进展',
    url: '/pkg/reports/index',
    color: '#1976D2',
  },
  {
    icon: 'calendar',
    title: '日程方案',
    desc: '结合工作日、假期、课外班和公共时间生成安排建议',
    url: '/pkg/schedule-recommend/index',
    color: '#7B1FA2',
  },
  {
    icon: 'target',
    title: '四象限分析',
    desc: '按今天、本周、本月评估重要与紧急程度',
    url: '/pkg/quadrant/index',
    color: '#F57C00',
  },
  {
    icon: 'globe',
    title: '公共时间',
    desc: '节假日、校历、临时公共事件会进入日程判断',
    url: '/pkg/calendar/index',
    color: '#0288D1',
  },
  {
    icon: 'users',
    title: '家庭社区',
    desc: '沉淀优秀家庭日程、假期玩法和心愿兑现模板',
    url: '/pkg/community/templates/index',
    color: '#00897B',
  },
];

export default function AiAnalysis() {
  const guestData = isGuestMode() ? getGuestData() : null;
  const localUser = getLocalUser();
  const tasks = guestData?.tasks || [];
  const rewards = guestData?.rewards || [];
  const members = guestData?.members || [];
  const habits = tasks.filter((task: any) => task.is_habit);
  const normalTasks = tasks.filter((task: any) => !task.is_habit);
  const stars = members.reduce((sum: number, member: any) => sum + (member.stars || 0), 0);

  const summary = [
    { label: '任务', value: normalTasks.length, icon: 'listTodo' },
    { label: '习惯', value: habits.length, icon: 'repeat' },
    { label: '心愿', value: rewards.length, icon: 'gift' },
    { label: '星星', value: stars || localUser?.stars || 0, icon: 'star' },
  ];

  const go = (url: string) => {
    Taro.navigateTo({ url });
  };

  return (
    <View className={`ai-page ${getThemeClass()}`}>
      <View className="ai-header">
        <View className="ai-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={34} color="#25352a" />
        </View>
        <Text className="ai-title">AI分析</Text>
        <View className="ai-version"><Text>{APP_VERSION}</Text></View>
      </View>

      <ScrollView scrollY enhanced className="ai-scroll">
        <View className="ai-hero">
          <View className="ai-hero-icon">
            <Icon name="sparkles" size={64} color="#ffffff" />
          </View>
          <Text className="ai-hero-title">智能家庭管家已同步</Text>
          <Text className="ai-hero-desc">建档、复盘、日程推荐和四象限分析集中在这里，方便家长快速验收新版。</Text>
          <View className="ai-release-badge">
            <Text>{APP_VERSION_LABEL} · {APP_RELEASE_DATE}</Text>
          </View>
        </View>

        <View className="summary-grid">
          {summary.map(item => (
            <View key={item.label} className="summary-card">
              <Icon name={item.icon} size={34} color="#006e1c" />
              <Text className="summary-value">{item.value}</Text>
              <Text className="summary-label">{item.label}</Text>
            </View>
          ))}
        </View>

        <View className="ai-section">
          <Text className="section-title">核心能力</Text>
          {actions.map(item => (
            <View key={item.title} className="ai-action-card" onClick={() => go(item.url)}>
              <View className="action-main">
                <View className="action-icon" style={{ backgroundColor: `${item.color}18` }}>
                  <Icon name={item.icon} size={38} color={item.color} />
                </View>
                <View className="action-copy">
                  <Text className="action-title">{item.title}</Text>
                  <Text className="action-desc">{item.desc}</Text>
                </View>
              </View>
              <Icon name="chevronRight" size={28} color="#a9b8a8" />
            </View>
          ))}
        </View>

        <View className="ai-note">
          <Icon name="checkCircle" size={32} color="#006e1c" />
          <Text>新版入口已从首页“AI分析”进入。智能建档仍保留存档微调方向，复盘会按周、月、学期、年度自动汇总。</Text>
        </View>
      </ScrollView>
    </View>
  );
}
