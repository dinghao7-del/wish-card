import { useState } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { APP_NAME } from '@/lib/appMeta';
import './index.scss';

export default function PrivacyDialog() {
  const [visible, setVisible] = useState(() => {
    // 检查是否已经同意过
    return !Taro.getStorageSync('privacy_agreed');
  });

  const handleAgree = () => {
    Taro.setStorageSync('privacy_agreed', 'true');
    setVisible(false);
  };

  const handleDisagree = () => {
    Taro.showModal({
      title: '提示',
      content: '需要同意隐私协议才能使用小程序功能',
      showCancel: false,
    });
  };

  if (!visible) return null;

  return (
    <View className="privacy-overlay">
      <View className="privacy-dialog">
        <View className="privacy-title">隐私保护指引</View>
        
        <View className="privacy-content">
          <Text className="privacy-text">
            欢迎使用{APP_NAME}小程序。我们重视您的隐私保护，根据《个人信息保护法》等相关法律法规，我们需要征得您的同意。
          </Text>
          
          <View className="privacy-list">
            <Text className="privacy-item">• 我们会收集您的微信昵称、头像用于展示</Text>
            <Text className="privacy-item">• 您创建的任务数据仅用于家庭内部展示</Text>
            <Text className="privacy-item">• 我们不会向第三方分享您的个人信息</Text>
            <Text className="privacy-item">• 您可以在设置中删除您的账号和数据</Text>
          </View>
          
          <Text className="privacy-link">
            查看完整《隐私政策》
          </Text>
        </View>
        
        <View className="privacy-buttons">
          <Button className="btn-disagree" onClick={handleDisagree}>
            不同意
          </Button>
          <Button className="btn-agree" onClick={handleAgree}>
            同意并继续
          </Button>
        </View>
      </View>
    </View>
  );
}
