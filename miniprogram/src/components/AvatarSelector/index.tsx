/**
 * 头像选择器组件 - 小程序版
 * 显示 Emoji + 背景色卡片，4 Tab 切换（男孩/女孩/父母/爷爷奶奶）
 */
import { View, Text, Image } from '@tarojs/components';
import { useState } from 'react';
import { BOY_AVATARS, GIRL_AVATARS, PARENT_AVATARS, GRANDPARENT_AVATARS, type AvatarOption, resolveAvatarPath } from '@/lib/templates';
import Icon from '../Icon';
import './index.scss';

interface AvatarSelectorProps {
  visible: boolean;
  onSelect: (avatar: AvatarOption) => void;
  onClose: () => void;
  currentAvatar?: string; // 当前已选的 avatar id 或 emoji
  role?: 'child' | 'parent'; // 预设角色，决定默认显示哪个 tab
}

type AvatarTab = 'boy' | 'girl' | 'parent' | 'grandparent';

const TABS: { key: AvatarTab; label: string; avatars: AvatarOption[] }[] = [
  { key: 'boy', label: '男孩', avatars: BOY_AVATARS },
  { key: 'girl', label: '女孩', avatars: GIRL_AVATARS },
  { key: 'parent', label: '父母', avatars: PARENT_AVATARS },
  { key: 'grandparent', label: '爷爷奶奶', avatars: GRANDPARENT_AVATARS },
];

export default function AvatarSelector({ visible, onSelect, onClose, currentAvatar, role }: AvatarSelectorProps) {
  if (!visible) return null;

  const [activeTab, setActiveTab] = useState<AvatarTab>(role === 'parent' ? 'parent' : 'boy');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeData = TABS.find(t => t.key === activeTab)!;

  const handleConfirm = () => {
    const selected = activeData.avatars.find(a => a.id === selectedId);
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  const handleAvatarTap = (avatar: AvatarOption) => {
    setSelectedId(avatar.id === selectedId ? null : avatar.id);
  };

  // 阻止点击穿透
  const stopPropagation = (e: any) => { e.stopPropagation(); };

  return (
    <View className="as-mask" onClick={onClose}>
      <View className="as-container" onClick={stopPropagation}>
        {/* Header */}
        <View className="as-header">
          <View className="as-back-btn" onClick={onClose}>
            <Icon name="x" size={36} color="#3f4a3c" />
          </View>
          <Text className="as-title">选择头像</Text>
          <View
            className={`as-confirm-btn ${selectedId ? '' : 'disabled'}`}
            onClick={selectedId ? handleConfirm : undefined}
          >
            <Icon name="check" size={28} color={selectedId ? '#ffffff' : '#becab9'} />
            <Text>确认</Text>
          </View>
        </View>

        {/* Tabs */}
        <View className="as-tabs">
          {TABS.map(tab => (
            <View
              key={tab.key}
              className={`as-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.key); setSelectedId(null); }}
            >
              <Text>{tab.label}</Text>
            </View>
          ))}
        </View>

        {/* Grid */}
        <View className="as-grid">
          {activeData.avatars.map(avatar => {
            const isSelected = selectedId === avatar.id || (!selectedId && currentAvatar === avatar.id);
            return (
              <View
                key={avatar.id}
                className={`as-avatar-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleAvatarTap(avatar)}
              >
                <View className="as-avatar-inner">
                  <Image className="as-avatar-img" src={resolveAvatarPath(avatar.src)} mode="aspectFill" />
                </View>
                <Text className="as-avatar-name">{avatar.name}</Text>
                {isSelected && (
                  <View className="as-check-badge">
                    <Icon name="check" size={20} color="#ffffff" />
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}
