/**
 * 游客模式提示浮动条
 * 显示在页面顶部，提醒用户当前为体验模式
 */
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '../Icon';
import './index.scss';

interface GuestBannerProps {
  /** 关闭回调（通常清除游客状态或隐藏） */
  onClose?: () => void;
  /** 点击注册跳转 */
  onRegister?: () => void;
}

export default function GuestBanner({ onClose, onRegister }: GuestBannerProps) {
  const handleClose = () => {
    if (onClose) onClose();
    // 默认行为：返回上一页
    Taro.navigateBack();
  };

  const handleRegister = () => {
    if (onRegister) onRegister();
    // 默认行为：跳转登录注册页
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  return (
    <View className="guest-banner">
      {/* 左侧图标+文字 */}
      <View className="gb-left">
        <Icon name="sparkles" size={24} color="#8B6914" />
        <Text className="gb-text">游客模式只用于体验功能无法保存真正用数据</Text>
      </View>

      {/* 右侧操作 */}
      <View className="gb-right">
        <Text className="gb-btn gb-btn-register" onClick={handleRegister}>注册</Text>
        <View className="gb-close" onClick={handleClose}>
          <Text>×</Text>
        </View>
      </View>
    </View>
  );
}
