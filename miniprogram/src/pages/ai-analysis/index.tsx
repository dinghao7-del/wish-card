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
    desc: '用最少问题整理家庭画像、课外班、兴趣、作息和照护约束',
    url: '/pkg/onboarding/index',
    color: '#006e1c',
  },
  {
    icon: 'calendar',
    title: '日程优化',
    desc: '读取建档、任务、课外班、心愿兑现和公共时间情报，自动给出调整建议',
    url: '/pkg/schedule-recommend/index',
    color: '#7B1FA2',
  },
  {
    icon: 'barChart',
    title: '家庭复盘',
    desc: '自动形成周报、月报，展示任务、习惯、星星和愿望进展',
    url: '/pkg/reports/index',
    color: '#1976D2',
  },
  {
    icon: 'target',
    title: '四象限分析',
    desc: '按今天、本周、本月评估重要与紧急程度',
    url: '/pkg/quadrant/index',
    color: '#F57C00',
  },
  {
    icon: 'users',
    title: '家庭灵感库',
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
  const hasStartedFamilyProfile = members.length > 0 || tasks.length > 0 || rewards.length > 0;

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
        <Text className="ai-title">家庭管家</Text>
        <View className="ai-version"><Text>{APP_VERSION}</Text></View>
      </View>

      <ScrollView scrollY enhanced className="ai-scroll">
        <View className="ai-hero">
          <View className="ai-hero-icon">
            <Icon name="sparkles" size={64} color="#ffffff" />
          </View>
          <Text className="ai-hero-title">智能家庭管家已同步</Text>
          <Text className="ai-hero-desc">第一次使用先完成引导式建档，把家庭画像、作息和孩子安排一次说清楚。</Text>
          <View className="ai-release-badge">
            <Text>{APP_VERSION_LABEL} · {APP_RELEASE_DATE}</Text>
          </View>
        </View>

        <View className="onboarding-card">
          <View className="onboarding-icon">
            <Icon name="sparkles" size={46} color="#ffffff" />
          </View>
          <View className="onboarding-copy">
            <View className="onboarding-title-row">
              <Text className="onboarding-title">{hasStartedFamilyProfile ? '继续微调家庭建档' : '新用户第一步：引导式家庭建档'}</Text>
              <Text className="onboarding-badge">核心流程</Text>
            </View>
            <Text className="onboarding-desc">
              AI 会用最少问题带家长梳理孩子年龄、上学时间、课外班频率、日常练习、父母工作约束和奖励偏好，最后直接生成任务、习惯、计划和心愿草稿。
            </Text>
            <View className="onboarding-tags">
              {['家庭成员', '作息约束', '课外班/兴趣', '奖励与心愿'].map(label => (
                <Text key={label} className="onboarding-tag">{label}</Text>
              ))}
            </View>
            <View className="onboarding-actions">
              <View className="onboarding-primary" onClick={() => go('/pkg/onboarding/index')}>
                <Text>{hasStartedFamilyProfile ? '打开建档存档继续微调' : '开始第一次建档'}</Text>
                <Icon name="chevronRight" size={26} color="#ffffff" />
              </View>
              <View className="onboarding-secondary" onClick={() => go('/pkg/schedule-recommend/index')}>
                <Text>已有画像，直接优化日程</Text>
              </View>
            </View>
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
          <Text className="section-title">管家工作流</Text>
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
          <Text>公共节假日、调休、极端天气和公共事件会作为后台情报参与日程优化，有影响时才提醒家长处理。</Text>
        </View>
      </ScrollView>
    </View>
  );
}
