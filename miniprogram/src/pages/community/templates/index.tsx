import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { COMMUNITY_TEMPLATES } from '@/lib/communityTemplates';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

export default function CommunityTemplatesPage() {
  const [keyword, setKeyword] = useState('');
  const [activeScene, setActiveScene] = useState('全部');
  const scenes = ['全部', ...Array.from(new Set(COMMUNITY_TEMPLATES.map(item => item.scene)))];

  const visibleTemplates = useMemo(() => {
    const q = keyword.trim();
    return COMMUNITY_TEMPLATES.filter(item => {
      const sceneMatched = activeScene === '全部' || item.scene === activeScene;
      const keywordMatched = !q || [item.title, item.summary, item.author, ...item.tags].join(' ').includes(q);
      return sceneMatched && keywordMatched;
    });
  }, [activeScene, keyword]);

  const goReview = (id: string) => {
    Taro.navigateTo({ url: `/pkg/community/share-review/index?id=${encodeURIComponent(id)}` });
  };

  const useTemplate = (id: string) => {
    Taro.setStorageSync('wishcard_pending_community_template', id);
    Taro.showToast({ title: '已选中模板', icon: 'success' });
    setTimeout(() => {
      Taro.navigateTo({ url: `/pkg/plans/wizard/index?communityTemplateId=${encodeURIComponent(id)}` });
    }, 500);
  };

  return (
    <View className={`community-page ${getThemeClass()}`}>
      <View className="community-header">
        <View className="community-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={34} color="#25352a" />
        </View>
        <Text className="community-title">家庭社区</Text>
        <View className="community-sync">
          <Icon name="cloud-off" size={30} color="#6f7d70" />
        </View>
      </View>

      <ScrollView scrollY enhanced className="community-scroll">
        <View className="community-hero">
          <View className="hero-icon">
            <Icon name="users" size={54} color="#ffffff" />
          </View>
          <Text className="hero-title">高知家庭日程经验库</Text>
          <Text className="hero-desc">先沉淀可复用的日程结构、假期玩法和心愿兑现经验，后续再接云端审核与推荐。</Text>
        </View>

        <View className="community-search">
          <Icon name="search" size={28} color="#6f7d70" />
          <Input
            className="search-input"
            value={keyword}
            placeholder="搜索作息、假期、心愿、年级"
            onInput={(e) => setKeyword(e.detail.value)}
          />
        </View>

        <ScrollView scrollX className="scene-tabs">
          {scenes.map(scene => (
            <View key={scene} className={`scene-tab ${activeScene === scene ? 'active' : ''}`} onClick={() => setActiveScene(scene)}>
              <Text className={`scene-text ${activeScene === scene ? 'active' : ''}`}>{scene}</Text>
            </View>
          ))}
        </ScrollView>

        <View className="community-stats">
          <Stat label="模板" value={COMMUNITY_TEMPLATES.length} />
          <Stat label="复用" value={COMMUNITY_TEMPLATES.reduce((sum, item) => sum + item.uses, 0)} />
          <Stat label="收藏" value={COMMUNITY_TEMPLATES.reduce((sum, item) => sum + item.likes, 0)} />
        </View>

        <View className="template-list">
          {visibleTemplates.map(item => (
            <View key={item.id} className="template-card">
              <View className="template-top">
                <View className="template-main">
                  <Text className="template-title">{item.title}</Text>
                  <Text className="template-meta">{item.author} · {item.ageRange} · {item.cityLevel}</Text>
                </View>
                <View className="score-pill">
                  <Text>{item.qualityScore}</Text>
                </View>
              </View>
              <Text className="template-summary">{item.summary}</Text>
              <View className="tag-row">
                {item.tags.map(tag => (
                  <View key={tag} className="tag-chip"><Text>{tag}</Text></View>
                ))}
              </View>
              <View className="template-foot">
                <View className="template-signal">
                  <Icon name="heart" size={24} color="#d64545" />
                  <Text>{item.likes}</Text>
                  <Icon name="refresh-cw" size={24} color="#006e1c" />
                  <Text>{item.uses}</Text>
                </View>
                <View className="template-actions">
                  <View className="ghost-btn" onClick={() => goReview(item.id)}><Text>查看</Text></View>
                  <View className="primary-btn" onClick={() => useTemplate(item.id)}><Text>套用</Text></View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="community-stat">
      <Text className="stat-value">{value}</Text>
      <Text className="stat-label">{label}</Text>
    </View>
  );
}

