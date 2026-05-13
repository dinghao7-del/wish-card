/**
 * Feedback 反馈页面 — 严格对齐 Web端 src/pages/Feedback.tsx (179行)
 *
 * 功能清单:
 * 1. ✅ 返回导航 + 标题"反馈" + "我的反馈"按钮
 * 2. ✅ 分类选择器: 6个分类(成员/反馈/建议/服务/Bug/其他), 3列Grid
 * 3. ✅ 内容输入框: 多行textarea, 最小160px高, placeholder
 * 4. ✅ 媒体上传: 最多4张图片, Camera图标+预览+删除 (Taro.chooseImage降级)
 * 5. ✅ 联系方式输入: Phone图标+placeholder
 * 6. ✅ 底部固定提交按钮(绿色大按钮)
 * 7. ✅ 提交后成功页面(CheckCircle大图标+成功文字+返回按钮)
 * 8. ✅ 最小10字校验 + 本地存储反馈记录
 */
import { View, Text, ScrollView, Textarea, Input, Image } from '@tarojs/components';
import React, { useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import TopAppBar from '@/components/TopAppBar';
import { MINI_UI_COLORS } from '@/utils/uiTokens';
import './index.scss';

// ===== 对齐 Web Feedback.tsx 第13-20行: 分类选项 =====
const CATEGORIES = ['成员', '反馈', '建议', '服务', 'Bug', '其他'];

export default function Feedback() {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // ===== 对齐 Web 第28-38行: handleSubmit =====
  const handleSubmit = () => {
    if (content.length < 10) {
      Taro.showToast({ title: '反馈内容至少10个字哦', icon: 'none' });
      return;
    }

    // 模拟提交延迟 (对齐Web第35-37行 setTimeout 800ms)
    Taro.showLoading({ title: '提交中...' });
    setTimeout(() => {
      Taro.hideLoading();

      // 保存到本地存储
      const existing = Taro.getStorageSync('feedback_list') || [];
      existing.push({
        id: `fb-${Date.now()}`,
        category: selectedCategory,
        content: content.trim(),
        contact: contact.trim(),
        images,
        time: new Date().toISOString(),
        status: 'pending',
      });
      Taro.setStorageSync('feedback_list', existing);

      setIsSubmitted(true);
    }, 800);
  };

  // ===== 对齐 Web 第40-57行: 成功页面 =====
  if (isSubmitted) {
    return (
      <View className="feedback-success-page">
        <View className="success-icon-wrap">
          <Icon name="checkCircle" size={96} color={MINI_UI_COLORS.primary} />
        </View>
        <Text className="success-title">感谢您的反馈</Text>
        <Text className="success-desc">
          我们已收到您的宝贵意见，会认真阅读并尽快处理。
        </Text>
        <View
          className="success-back-btn"
          onClick={() => Taro.navigateBack()}
        >
          <Text>返回上一页</Text>
        </View>
      </View>
    );
  }

  // ===== 主表单页 (对齐Web第60-176行) =====
  return (
    <View className="feedback-page">
      <TopAppBar
        title="反馈"
        rightContent={
          <View className="header-right" onClick={() => Taro.showToast({ title: '暂无历史反馈', icon: 'none' })}>
            <Text className="my-feedback-text">我的反馈</Text>
          </View>
        }
      />

      <ScrollView scrollY enhanced className="feedback-body">
        {/* ===== 分类选择 — 对齐Web第73-93行 ===== */}
        <View className="form-section">
          <Text className="section-label">分类</Text>
          <View className="category-grid">
            {CATEGORIES.map((cat) => (
              <View
                key={cat}
                className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <Text className={`category-text ${selectedCategory === cat ? 'active' : ''}`}>
                  {cat}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ===== 反馈内容 — 对齐Web第95-106行 ===== */}
        <View className="form-section">
          <Text className="section-label">内容</Text>
          <View className="content-input-wrap">
            <Textarea
              className="content-textarea"
              value={content}
              onInput={(e) => setContent(e.detail.value)}
              placeholder="请详细描述您的反馈或建议..."
              maxlength={500}
              autoHeight
            />
          </View>
          <Text className="char-count">{content.length}/500</Text>
        </View>

        {/* ===== 媒体上传 — 对齐Web第108-147行 ===== */}
        <View className="form-section">
          <Text className="section-label">截图（选填）</Text>
          <View className="media-grid">
            {images.map((img, idx) => (
              <View key={idx} className="media-preview">
                <Image className="media-img" src={img} mode="aspectFill" />
                <View
                  className="media-delete"
                  onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                >
                <Text>x</Text>
                </View>
              </View>
            ))}
            {images.length < 4 && (
              <View
                className="media-add-btn"
                onClick={() => {
                  Taro.chooseImage({
                    count: 4 - images.length,
                    sizeType: ['compressed'],
                    sourceType: ['album', 'camera'],
                    success: (res) => {
                      const newImages = res.tempFilePaths;
                      setImages(prev => [...prev, ...newImages].slice(0, 4));
                    },
                  });
                }}
              >
                <Icon name="camera" size={48} color={MINI_UI_COLORS.outlineVariant} />
              </View>
            )}
          </View>
          <Text className="media-hint">最多上传4张图片</Text>
        </View>

        {/* ===== 联系方式 — 对齐Web第149-162行 ===== */}
        <View className="form-section">
          <Text className="section-label">联系方式（选填）</Text>
          <View className="contact-input-wrap">
            <Icon name="phone" size={36} color={MINI_UI_COLORS.outlineVariant} />
            <Input
              className="contact-input"
              value={contact}
              onInput={(e) => setContact(e.detail.value)}
              placeholder="手机号或微信号，方便我们联系您"
              maxlength={30}
            />
          </View>
        </View>

        <View style={{ height: '140rpx' }} />
      </ScrollView>

      {/* ===== 底部固定提交按钮 — 对齐Web第166-175行 ===== */}
      <View className="submit-bar">
        <View
          className={`submit-btn ${content.length < 10 ? 'disabled' : ''}`}
          onClick={() => content.length >= 10 && handleSubmit()}
        >
          <Text className="submit-btn-text">提交反馈</Text>
        </View>
      </View>
    </View>
  );
}
