import { View, Text } from '@tarojs/components';
import { useState } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import { APP_VERSION, APP_VERSION_LABEL } from '@/lib/appMeta';
import { MINI_THEME_SKINS, getActiveThemeSkin, saveActiveThemeSkin, type ThemeSkinId } from '@/lib/themeSkins';
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
  const [activeSkin, setActiveSkin] = useState(() => getActiveThemeSkin());

  const handleSkinSelect = (skinId: ThemeSkinId) => {
    const requested = MINI_THEME_SKINS.find(item => item.id === skinId);
    if (requested?.status !== 'active') {
      Taro.showToast({ title: '这套皮肤还在打磨中', icon: 'none' });
      return;
    }
    const next = saveActiveThemeSkin(skinId);
    setActiveSkin(next);
    Taro.showToast({ title: `已切换为${next.name}`, icon: 'none' });
  };

  return (
    <View className={`basic-settings-page ${activeSkin.className}`}>
      {/* 顶部栏 */}
      <View className="bs-header">
        <View className="bs-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowRight" size={32} color="#3f4a3c" style={{ transform: 'rotate(180deg)' }} />
        </View>
        <Text className="bs-header-title">基础设置</Text>
        <View />
      </View>

      <View className="bs-theme-section">
        <View className="bs-section-title-row">
          <Text className="bs-section-title">主题皮肤</Text>
          <Text className="bs-section-desc">当前：{activeSkin.name}</Text>
        </View>
        <View className="bs-skin-grid">
          {MINI_THEME_SKINS.map(skin => (
            <View
              key={skin.id}
              className={`bs-skin-card ${activeSkin.id === skin.id ? 'active' : ''} ${skin.status === 'planned' ? 'planned' : ''}`}
              onClick={() => handleSkinSelect(skin.id)}
            >
              <View className="bs-skin-preview" style={{ backgroundColor: skin.preview.background }}>
                <View className="bs-skin-dot big" style={{ backgroundColor: skin.preview.primary }} />
                <View className="bs-skin-dot" style={{ backgroundColor: skin.preview.secondary }} />
                <View className="bs-skin-line" style={{ backgroundColor: skin.preview.primary }} />
              </View>
              <View className="bs-skin-copy">
                <Text className="bs-skin-name">{skin.name}</Text>
                <Text className="bs-skin-desc">{skin.description}</Text>
              </View>
              <View className={`bs-skin-state ${activeSkin.id === skin.id ? 'active' : ''}`}>
                <Text>{activeSkin.id === skin.id ? '已启用' : skin.status === 'planned' ? '规划中' : '切换'}</Text>
              </View>
            </View>
          ))}
        </View>
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
        <View className="bs-menu-item" onClick={() => Taro.showToast({ title: APP_VERSION_LABEL, icon: 'none' })}>
          <View className="bs-menu-icon-wrap">
            <Icon name="sparkles" size={32} color="#006e1c" />
          </View>
          <View className="bs-menu-content">
            <Text className="bs-menu-label">关于 星愿卡</Text>
            <Text className="bs-menu-desc">{APP_VERSION}</Text>
          </View>
          <Text className="bs-menu-arrow">{'>'}</Text>
        </View>
      </View>
    </View>
  );
}
