import { View, Text, Input, Button, Image } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { getLocalUser } from '@/utils/localUser';
import { resolveAvatarPath } from '@/lib/templates';
import Icon from '@/components/Icon';
import AvatarSelector from '@/components/AvatarSelector';
import type { AvatarOption } from '@/lib/templates';
import './index.scss';

export default function ProfileEdit() {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [selectedAvatarSrc, setSelectedAvatarSrc] = useState(''); // 存储选中的头像 PNG 路径
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // 新增：PIN 码 / 密码修改
  const [pinCode, setPinCode] = useState('');
  const [showPinSection, setShowPinSection] = useState(false);
  const [changingPin, setChangingPin] = useState(false);

  useEffect(() => {
    const localUser = getLocalUser();
    if (localUser) {
      setName(localUser.name || '');
      setAvatar(localUser.avatar || '');
      setSelectedAvatarSrc(localUser.avatar || '');
      setUserId(localUser.id);
    } else {
      loadFromSupabase();
    }
  }, []);

  const loadFromSupabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data } = await supabase.from('members').select('name, avatar').eq('id', user.id).single();
        if (data) { setName(data.name || ''); setAvatar(data.avatar || ''); }
      }
    } catch {}
  };

  /** 头像选择回调 */
  const handleAvatarSelect = (selected: AvatarOption) => {
    setSelectedAvatarSrc(selected.src);
    setAvatar(selected.src); // 存 PNG 路径
  };

  /** 保存 PIN 码 */
  const handleSavePin = async () => {
    if (!pinCode.trim()) { Taro.showToast({ title: '请输入PIN码', icon: 'none' }); return; }
    if (pinCode.length < 4) { Taro.showToast({ title: 'PIN码至少4位', icon: 'none' }); return; }
    setChangingPin(true);
    try {
      const stored = Taro.getStorageSync('guest_user');
      if (stored) {
        const u = JSON.parse(stored);
        u.pinCode = pinCode.trim();
        Taro.setStorageSync('guest_user', JSON.stringify(u));
      }
      Taro.showToast({ title: 'PIN码已更新', icon: 'success' });
      setShowPinSection(false);
    } catch (err) {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
    setChangingPin(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { Taro.showToast({ title: '请输入昵称', icon: 'none' }); return; }
    setSaving(true);
    try {
      // 始终同步本地存储（游客模式也能用）
      const stored = Taro.getStorageSync('guest_user');
      if (stored) {
        const u = JSON.parse(stored);
        u.name = name.trim();
        u.avatar = avatar;
        Taro.setStorageSync('guest_user', JSON.stringify(u));
      }

      // 尝试同步到 Supabase（登录用户才成功，游客忽略错误）
      if (userId && !userId.startsWith('guest-')) {
        const updateData: any = { name: name.trim() };
        if (avatar) {
          updateData.avatar = avatar.trim();
        }
        const { error } = await supabase.from('members').update(updateData).eq('id', userId);
        if (error) throw error;
      }

      Taro.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1200);
    } catch (err) {
      // 即使云端失败，本地已保存，仍提示成功
      Taro.showToast({ title: '本地保存成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1200);
    }
    setSaving(false);
  };

  return (
    <View className="pe-page">
      <View className="pe-header">
        <View className="pe-back" onClick={() => Taro.navigateBack()}>
          <Icon name="x" size={36} color="#3f4a3c" />
        </View>
        <Text className="pe-header-title">编辑资料</Text>
        <View className="pe-back" />
      </View>
      <View className="pe-body">
        {/* 头像区域 - 点击打开选择器 */}
        <View className="pe-avatar-section" onClick={() => setShowAvatarPicker(true)}>
          {selectedAvatarSrc || avatar ? (
            <Image className="pe-avatar" src={resolveAvatarPath(selectedAvatarSrc || avatar || '')} mode="aspectFill" />
          ) : (
            <View className="pe-avatar-placeholder">
              <Icon name="user" size={48} color="#becab9" />
            </View>
          )}
          <Text className="pe-avatar-hint">点击更换头像</Text>
          <Icon name="arrowRight" size={24} color="#becab9" style={{ marginLeft: '8rpx' }} />
        </View>

        <View className="pe-card">
          <View className="pe-field">
            <Text className="pe-label">昵称</Text>
            <Input className="pe-input" placeholder="输入昵称" value={name} onInput={(e) => setName(e.detail.value)} />
          </View>
        </View>

        {/* ===== 新增：PIN 码设置（对齐 Web 版）===== */}
        <View className="pe-card">
          <View
            className="pe-field pe-clickable"
            onClick={() => setShowPinSection(!showPinSection)}
          >
            <View className="pe-field-header">
              <Icon name="lock" size={32} color="#006e1c" />
              <View className="pe-field-info">
                <Text className="pe-label">PIN 码（家长控制）</Text>
                <Text className="pe-desc">设置后进入敏感功能需验证</Text>
              </View>
              <Icon name={showPinSection ? 'chevronUp' : 'chevronDown'} size={24} color="#becab9" />
            </View>
          </View>
          {showPinSection && (
            <View className="pe-pin-section">
              <Input
                className="pe-input"
                type="number"
                password
                placeholder="请输入4-6位数字PIN码"
                value={pinCode}
                onInput={(e) => setPinCode(e.detail.value)}
                maxlength={6}
              />
              <Button
                className="pe-pin-btn"
                onClick={handleSavePin}
                disabled={changingPin}
              >
                {changingPin ? '保存中...' : '更新 PIN'}
              </Button>
            </View>
          )}
        </View>

        <Button className="pe-submit" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </View>

      {/* 头像选择器 */}
      <AvatarSelector
        visible={showAvatarPicker}
        onSelect={handleAvatarSelect}
        onClose={() => setShowAvatarPicker(false)}
        currentAvatar={avatar}
      />
    </View>
  );
}
