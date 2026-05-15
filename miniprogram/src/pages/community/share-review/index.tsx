import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import { useMemo, useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import Icon from '@/components/Icon';
import { findCommunityTemplate } from '@/lib/communityTemplates';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

export default function CommunityShareReviewPage() {
  const router = useRouter();
  const template = findCommunityTemplate(router.params?.id);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [communityChecked, setCommunityChecked] = useState(false);
  const [note, setNote] = useState(template?.summary || '');

  const redactionLabels = useMemo(() => ['家庭成员姓名', '具体学校/地点', '手机号', '可识别备注'], []);

  const confirmShare = () => {
    if (!template) return;
    if (!privacyChecked || !communityChecked) {
      Taro.showToast({ title: '请先确认分享检查', icon: 'none' });
      return;
    }
    const records = Taro.getStorageSync('wishcard_community_share_records') || [];
    const next = Array.isArray(records) ? records : [];
    next.unshift({
      id: `share_${Date.now()}`,
      templateId: template.id,
      title: template.title,
      note,
      status: 'ready_to_publish',
      createdAt: new Date().toISOString(),
    });
    Taro.setStorageSync('wishcard_community_share_records', next.slice(0, 50));
    Taro.showToast({ title: '已保存分享草稿', icon: 'success' });
    setTimeout(() => Taro.navigateBack(), 700);
  };

  if (!template) {
    return (
      <View className={`review-page ${getThemeClass()}`}>
        <View className="review-header">
          <View className="review-back" onClick={() => Taro.navigateBack()}>
            <Icon name="arrowLeft" size={34} color="#25352a" />
          </View>
          <Text className="review-title">分享确认</Text>
          <View style={{ width: '64rpx' }} />
        </View>
        <View className="empty-state">
          <Icon name="alertCircle" size={64} color="#d64545" />
          <Text>没有找到这份模板</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`review-page ${getThemeClass()}`}>
      <View className="review-header">
        <View className="review-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={34} color="#25352a" />
        </View>
        <Text className="review-title">分享确认</Text>
        <View style={{ width: '64rpx' }} />
      </View>

      <ScrollView scrollY enhanced className="review-scroll">
        <View className="privacy-card">
          <View className="privacy-icon">
            <Icon name="shield" size={48} color="#ffffff" />
          </View>
          <Text className="privacy-title">发布前隐私检查</Text>
          <Text className="privacy-desc">这一步只保留日程结构、年龄段、城市层级和家庭场景，真实姓名和具体地点不进入社区。</Text>
        </View>

        <View className="review-section">
          <View className="section-head">
            <Icon name="eye" size={30} color="#006e1c" />
            <Text>可分享内容</Text>
          </View>
          <Text className="template-title">{template.title}</Text>
          <Text className="template-meta">{template.scene} · {template.ageRange} · {template.cityLevel}</Text>
          <Textarea className="review-textarea" value={note} onInput={(e) => setNote(e.detail.value)} />
        </View>

        <View className="review-section">
          <View className="section-head">
            <Icon name="listTodo" size={30} color="#1976D2" />
            <Text>日程结构</Text>
          </View>
          {template.slots.map(slot => (
            <View key={slot.id} className="slot-row">
              <Text className="slot-time">{slot.time}</Text>
              <View className="slot-main">
                <Text className="slot-title">{slot.title}</Text>
                <Text className="slot-desc">{slot.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="review-section">
          <View className="section-head">
            <Icon name="shield" size={30} color="#006e1c" />
            <Text>已脱敏项目</Text>
          </View>
          <View className="redaction-grid">
            {redactionLabels.map(label => (
              <View key={label} className="redaction-chip">
                <Icon name="check" size={22} color="#006e1c" />
                <Text>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="consent-card" onClick={() => setPrivacyChecked(!privacyChecked)}>
          <View className={`check-box ${privacyChecked ? 'active' : ''}`}>
            {privacyChecked && <Icon name="check" size={24} color="#ffffff" />}
          </View>
          <Text>我已确认内容不包含家庭隐私信息</Text>
        </View>
        <View className="consent-card" onClick={() => setCommunityChecked(!communityChecked)}>
          <View className={`check-box ${communityChecked ? 'active' : ''}`}>
            {communityChecked && <Icon name="check" size={24} color="#ffffff" />}
          </View>
          <Text>同意将此模板用于社区经验分享和模板推荐</Text>
        </View>

        <View className={`confirm-btn ${privacyChecked && communityChecked ? '' : 'disabled'}`} onClick={confirmShare}>
          <Text>确认分享草稿</Text>
        </View>
      </ScrollView>
    </View>
  );
}

