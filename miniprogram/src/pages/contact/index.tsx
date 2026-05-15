/**
 * ContactUs 联系我们页面 — 重写对齐 Web端 src/pages/ContactUs.tsx (85行)
 *
 * 功能清单:
 * 1. ✅ 返回导航 + "联系我们"标题 (sticky header)
 * 2. ✅ 人工客服卡片 → 点击跳转 /pkg/feedback/index
 * 3. ✅ QQ群卡片 → 点击复制群号
 * 4. ✅ 邮箱卡片 → 复制 support@xingmubiao.com (对齐Web)
 * 5. ✅ 卡片样式: 白底圆角2rem+shadow+左侧icon容器+右侧箭头/复制
 */
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import React from 'react';
import Icon from '@/components/Icon';
import TopAppBar from '@/components/TopAppBar';
import { MINI_UI_COLORS } from '@/utils/uiTokens';
import './index.scss';

export default function ContactUs() {
  // ===== 对齐 Web ContactUs.tsx 第10-13行: 复制到剪贴板 =====
  const copyToClipboard = (text: string) => {
    Taro.setClipboardData({
      data: text,
      success: () => Taro.showToast({ title: '已复制到剪贴板', icon: 'success' }),
    });
  };

  return (
    <View className="contact-us-page">
      <TopAppBar title="联系我们" />

      <ScrollView scrollY enhanced className="cu-body">
        {/* ===== 人工客服 — 对齐Web第29-44行 ===== */}
        <View className="cu-card" onClick={() => Taro.navigateTo({ url: '/pkg/feedback/index' })}>
          <View className="cu-card-left">
            <View className="cu-icon-wrap primary">
              <Icon name="headset" size={44} color={MINI_UI_COLORS.primary} />
            </View>
            <View className="cu-card-info">
              <Text className="cu-card-name">人工客服</Text>
              <Text className="cu-card-desc">与我们在线对话（每天 10:00-22:00）</Text>
            </View>
          </View>
          <Icon name="chevronRight" size={32} color={MINI_UI_COLORS.outlineVariant} />
        </View>

        {/* ===== QQ群 — 对齐Web第46-61行 ===== */}
        <View className="cu-card" onClick={() => copyToClipboard('123456789')}>
          <View className="cu-card-left">
            <View className="cu-icon-wrap tertiary">
              <Icon name="users" size={44} color={MINI_UI_COLORS.warning} />
            </View>
            <View className="cu-card-info">
              <Text className="cu-card-name">QQ群</Text>
              <Text className="cu-card-desc">与更多的家长用户一起交流</Text>
            </View>
          </View>
          <Icon name="chevronRight" size={32} color={MINI_UI_COLORS.outlineVariant} />
        </View>

        {/* ===== 邮箱 — 对齐Web第63-80行 ===== */}
        <View className="cu-card">
          <View className="cu-card-left" style={{ flex: 1, minWidth: 0 }}>
            <View className="cu-icon-wrap neutral">
              <Icon name="mail" size={44} color={MINI_UI_COLORS.onSurfaceVariant} />
            </View>
            <View className="cu-card-info" style={{ flex: 1, minWidth: 0 }}>
              <Text className="cu-card-name">邮箱</Text>
              <Text className="cu-card-desc">support@xingmubiao.com</Text>
            </View>
          </View>
          <View
            className="cu-copy-btn"
            onClick={() => copyToClipboard('support@xingmubiao.com')}
          >
            <Icon name="copy" size={28} color={MINI_UI_COLORS.onSurfaceVariant} />
          </View>
        </View>

        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
