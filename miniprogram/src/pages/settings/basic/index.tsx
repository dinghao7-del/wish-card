import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import './index.scss';

const LANG_OPTIONS = ['简体中文', 'English', '繁體中文'];
const FONT_SIZE_OPTIONS = ['小', '标准', '大'];

export default function BasicSettings() {
  const [langIdx, setLangIdx] = useState(() => {
    try { return Taro.getStorageSync('app_lang_idx') ?? 1; } catch { return 1; }
  });
  const [fontIdx, setFontIdx] = useState(() => {
    try { return Taro.getStorageSync('app_font_idx') ?? 1; } catch { return 1; }
  });

  return (
    <View className="basic-settings-page">
      {/* 顶部栏 */}
      <View className="bs-header">
        <View className="bs-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowRight" size={32} color="#3f4a3c" style={{ transform: 'rotate(180deg)' }} />
        </View>
        <Text className="bs-header-title">基础设置</Text>
        <View />
      </View>

      {/* 设置项列表 */}
      <View className="bs-menu-group">
        {/* 语言设置 */}
        <View className="bs-menu-item" onClick={() => {
          Taro.showActionSheet({
            itemList: LANG_OPTIONS,
            success: (res) => {
              const idx = res.tapIndex;
              setLangIdx(idx);
              Taro.setStorageSync('app_lang_idx', idx);
              Taro.showToast({ title: `已切换为 ${LANG_OPTIONS[idx]}`, icon: 'none' });
            },
          });
        }}>
          <View className="bs-menu-icon-wrap">
            <Icon name="grid" size={32} color="#006e1c" />
          </View>
          <View className="bs-menu-content">
            <Text className="bs-menu-label">语言设置</Text>
            <Text className="bs-menu-desc">{LANG_OPTIONS[langIdx]}</Text>
          </View>
          <Text className="bs-menu-arrow">{'>'}</Text>
        </View>

        {/* 字体大小 */}
        <View className="bs-menu-item" onClick={() => {
          Taro.showActionSheet({
            itemList: FONT_SIZE_OPTIONS,
            success: (res) => {
              const idx = res.tapIndex;
              setFontIdx(idx);
              Taro.setStorageSync('app_font_idx', idx);
              Taro.showToast({ title: `字体大小：${FONT_SIZE_OPTIONS[idx]}`, icon: 'none' });
            },
          });
        }}>
          <View className="bs-menu-icon-wrap">
            <Icon name="edit" size={32} color="#006e1c" />
          </View>
          <View className="bs-menu-content">
            <Text className="bs-menu-label">字体大小</Text>
            <Text className="bs-menu-desc">{FONT_SIZE_OPTIONS[fontIdx]}</Text>
          </View>
          <Text className="bs-menu-arrow">{'>'}</Text>
        </View>

        {/* 清除缓存 */}
        <View className="bs-menu-item" onClick={() => {
          Taro.showModal({
            title: '清除缓存',
            content: '确定要清除本地缓存数据吗？',
            success: (res) => {
              if (res.confirm) {
                try {
                  Taro.clearStorageSync();
                  Taro.showToast({ title: '缓存已清除', icon: 'success' });
                  setTimeout(() => Taro.reLaunch({ url: '/pages/home/index' }), 1000);
                } catch {
                  Taro.showToast({ title: '清除失败', icon: 'none' });
                }
              }
            },
          });
        }}>
          <View className="bs-menu-icon-wrap" style={{ backgroundColor: 'rgba(227, 53, 53, 0.1)' }}>
            <Icon name="trash" size={32} color="#e53935" />
          </View>
          <View className="bs-menu-content">
            <Text className="bs-menu-label">清除缓存</Text>
            <Text className="bs-menu-desc">释放本地存储空间</Text>
          </View>
          <Text className="bs-menu-arrow">{'>'}</Text>
        </View>

        {/* 关于 */}
        <View className="bs-menu-item" onClick={() => Taro.showToast({ title: 'WishCard 小程序 v1.0.2', icon: 'none' })}>
          <View className="bs-menu-icon-wrap">
            <Icon name="sparkles" size={32} color="#006e1c" />
          </View>
          <View className="bs-menu-content">
            <Text className="bs-menu-label">关于 WishCard</Text>
            <Text className="bs-menu-desc">小程序体验版 v1.0.2</Text>
          </View>
          <Text className="bs-menu-arrow">{'>'}</Text>
        </View>
      </View>
    </View>
  );
}
