import { View, Text, Input, Textarea, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import './index.scss';

export default function Feedback() {
  const [type, setType] = useState(0); // 0=功能建议 1=Bug报告 2=其他
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const types = ['功能建议', 'Bug 报告', '其他反馈'];
  const typeIcons = ['lightbulb', 'alertTriangle', 'messageCircle'];

  const handleSubmit = async () => {
    if (!title.trim()) { Taro.showToast({ title: '请输入标题', icon: 'none' }); return; }
    if (!content.trim()) { Taro.showToast({ title: '请输入详细内容', icon: 'none' }); return; }

    setSubmitting(true);
    Taro.showLoading({ title: '提交中...' });

    // 模拟提交到后端
    await new Promise(r => setTimeout(r, 1200));

    // 保存到本地记录
    const records = Taro.getStorageSync('feedback_records') ? JSON.parse(Taro.getStorageSync('feedback_records')) : [];
    records.unshift({
      id: Date.now(),
      type: types[type],
      title,
      content,
      contact,
      time: new Date().toLocaleString('zh-CN'),
      status: 'submitted',
    });
    Taro.setStorageSync('feedback_records', JSON.stringify(records.slice(0, 50)));

    Taro.hideLoading();
    setSubmitted(true);

    // 3秒后重置
    setTimeout(() => {
      setSubmitted(false);
      setTitle(''); setContent(''); setContact('');
    }, 3000);

    setSubmitting(false);
  };

  if (submitted) {
    return (
      <View className="feedback-page">
        <View className="success-container">
          <Icon name="checkCircle" size={96} color="#006e1c" />
          <Text className="success-title">提交成功！</Text>
          <Text className="success-desc">感谢你的反馈，我们会认真查看并尽快处理。</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="feedback-page">
      <View className="fb-header">
        <Text className="fb-title">意见反馈</Text>
        <Text className="fb-desc">你的每一条反馈都能帮助我们做得更好</Text>
      </View>

      <ScrollView className="fb-body" scrollY>
        {/* 反馈类型选择 */}
        <View className="fb-section">
          <Text className="fb-label">反馈类型</Text>
          <View className="type-chips">
            {types.map((t, i) => (
              <View
                key={i}
                className={`type-chip ${type === i ? 'active' : ''}`}
                onClick={() => setType(i)}
              >
                <Icon name={typeIcons[i]} size={24} color={type === i ? '#ffffff' : '#3f4a3c'} />
                <Text className={`type-chip-text ${type === i ? 'active' : ''}`}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 标题 */}
        <View className="fb-section">
          <Text className="fb-label">标题 <Text className="required">*</Text></Text>
          <Input
            className="fb-input"
            value={title}
            placeholder="简短描述你的反馈"
            maxlength={50}
            onInput={(e) => setTitle(e.detail.value)}
          />
        </View>

        {/* 详细内容 */}
        <View className="fb-section">
          <Text className="fb-label">详细内容 <Text className="required">*</Text></Text>
          <Textarea
            className="fb-textarea"
            value={content}
            placeholder="请详细描述问题或建议..."
            maxlength={500}
            autoHeight
            onInput={(e) => setContent(e.detail.value)}
          />
          <Text className="char-count">{content.length}/500</Text>
        </View>

        {/* 联系方式 */}
        <View className="fb-section">
          <Text className="fb-label">联系方式（选填）</Text>
          <Input
            className="fb-input"
            value={contact}
            placeholder="邮箱或微信号，方便我们联系你"
            onInput={(e) => setContact(e.detail.value)}
          />
        </View>

        {/* 提交按钮 */}
        <View className={`fb-submit-btn ${submitting ? 'disabled' : ''}`} onClick={() => !submitting && handleSubmit()}>
          <Text className="fb-submit-text">{submitting ? '提交中...' : '提交反馈'}</Text>
        </View>

        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
