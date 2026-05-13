import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import React, { type ReactNode } from 'react';
import Icon from '@/components/Icon';
import { MINI_UI_COLORS } from '@/utils/uiTokens';
import './index.scss';

type TopAppBarProps = {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightContent?: ReactNode;
};

export default function TopAppBar({
  title,
  showBack = true,
  onBack,
  rightContent,
}: TopAppBarProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    Taro.navigateBack();
  };

  return (
    <View className="mini-top-app-bar">
      <View className="mini-top-app-bar__side">
        {showBack && (
          <View className="mini-top-app-bar__back" onClick={handleBack}>
            <Icon name="chevronLeft" size={40} color={MINI_UI_COLORS.onSurfaceVariant} />
          </View>
        )}
      </View>
      <Text className="mini-top-app-bar__title">{title}</Text>
      <View className="mini-top-app-bar__side mini-top-app-bar__side--right">
        {rightContent}
      </View>
    </View>
  );
}
