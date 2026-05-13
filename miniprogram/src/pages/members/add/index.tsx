import { View, Text, Input, Button, Picker, Image } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { getLocalUser } from '@/utils/localUser';
import Icon from '@/components/Icon';
import AvatarSelector from '@/components/AvatarSelector';
import GuestBanner from '@/components/GuestBanner';
import { resolveAvatarPath, type AvatarOption } from '@/lib/templates';
import { isGuestMode, setGuestMode } from '@/lib/guestData';
import './index.scss';

export default function MemberAdd() {
  const [name, setName] = useState('');
  const [role, setRole] = useState<'child' | 'parent'>('child');
  const [password, setPassword] = useState('');
  const [familyId, setFamilyId] = useState('');
  const [userId, setUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    initFamilyId();
  }, []);

  // ===== 对齐 Web 版：必须获取真实的 UUID 格式 family_id =====
  const initFamilyId = async () => {
    try {
      const localUser = getLocalUser();
      let effectiveUserId = '';
      let effectiveFamilyId = '';

      // Step 1: 确定 userId（排除 guest-/demo- 前缀）
      if (localUser?.id && !localUser.id.startsWith('guest-') && !localUser.id.startsWith('demo-')) {
        effectiveUserId = localUser.id;
        // 尝试用本地缓存的 family_id
        if (localUser.family_id && localUser.family_id !== 'guest-family' && localUser.family_id !== 'demo-family') {
          effectiveFamilyId = localUser.family_id;
        }
      }

      // Step 2: 如果本地没有有效的 family_id，从 Supabase 查询
      if (!effectiveFamilyId && effectiveUserId) {
        const { data } = await supabase.from('members').select('family_id').eq('id', effectiveUserId).single();
        if (data?.family_id) {
          effectiveFamilyId = data.family_id;
        }
      }

      // Step 3: 如果还是没有，尝试从 session 获取
      if (!effectiveUserId) {
        try {
          const { data: { session } } = await supabase.client.auth.getSession();
          if (session?.user) {
            effectiveUserId = session.user.id;
            const { data } = await supabase.from('members').select('family_id').eq('id', effectiveUserId).single();
            if (data?.familyId) {
              effectiveFamilyId = data.family_id;
            }
          }
        } catch {}
      }

      setUserId(effectiveUserId);
      setFamilyId(effectiveFamilyId);
      setDataReady(true);

      // Step 4: 如果仍然没有有效的 family_id，给用户明确提示
      if (!effectiveFamilyId) {
        console.warn('[MemberAdd] 无法获取有效的 family_id，添加成员功能不可用');
      }
    } catch (err) {
      console.error('[MemberAdd] initFamilyId error:', err);
      setDataReady(true);
    }
  };

  const handleAdd = async () => {
    // 前置校验
    if (!name.trim()) { Taro.showToast({ title: '请输入成员昵称', icon: 'none' }); return; }
    if (!password) { Taro.showToast({ title: '请设置登录密码', icon: 'none' }); return; }
    if (password.length < 4) { Taro.showToast({ title: '密码至少4位', icon: 'none' }); return; }

    // ⚠️ 关键：没有有效 family_id 时禁止提交（不再发送 'default-family'）
    if (!familyId) {
      Taro.showToast({ title: '请先登录家庭账户', icon: 'none' });
      return;
    }

    setSaving(true);
    try {
      const insertData: any = {
        name: name.trim(),
        role,
        password,
        family_id: familyId,  // ← 只使用真实的 UUID
        stars: 0,
      };
      if (selectedAvatar) {
        insertData.avatar = selectedAvatar.src;
      }

      const { error } = await supabase.from('members').insert(insertData);
      if (error) throw error;
      Taro.showToast({ title: '添加成功！', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1200);
    } catch (err: any) {
      Taro.showToast({ title: err.message || '添加失败', icon: 'none' });
    }
    setSaving(false);
  };

  const handleAvatarSelect = (avatar: AvatarOption) => {
    setSelectedAvatar(avatar);
  };

  const roles = ['孩子', '家长'];

  return (
    <View className="ma-page">
      <View className="ma-header">
        <View className="ma-back" onClick={() => Taro.navigateBack()}>
          <Icon name="x" size={36} color="#3f4a3c" />
        </View>
        <Text className="ma-header-title">添加成员</Text>
        <View className="ma-back" />
      </View>

      {/* 游客模式提示条（截图要求） */}
      {isGuestMode() && (
        <GuestBanner
          onRegister={() => {
            setGuestMode(false);
            Taro.navigateTo({ url: '/pages/login/index' });
          }}
          onClose={() => Taro.navigateBack()}
        />
      )}

      <View className="ma-body">
        {/* 头像选择 */}
        <View className="ma-avatar-section" onClick={() => setShowAvatarPicker(true)}>
          {selectedAvatar ? (
            <View className="ma-avatar-preview">
              <Image className="ma-avatar-img" src={resolveAvatarPath(selectedAvatar.src)} mode="aspectFill" />
            </View>
          ) : (
            <View className="ma-avatar-placeholder">
              <Icon name="user" size={48} color="#becab9" />
              <Text className="ma-avatar-placeholder-text">选择头像</Text>
            </View>
          )}
          <Text className="ma-avatar-hint">{selectedAvatar ? `已选：${selectedAvatar.name}` : '点击选择头像（可选）'}</Text>
        </View>

        <View className="ma-card">
          <View className="ma-field">
            <Text className="ma-label">成员昵称</Text>
            <Input className="ma-input" placeholder="如：宝宝" value={name} onInput={(e) => setName(e.detail.value)} />
          </View>
          <View className="ma-field">
            <Text className="ma-label">角色</Text>
            <Picker mode="selector" range={roles} value={role === 'child' ? 0 : 1} onChange={(e) => setRole(parseInt(String(e.detail.value)) === 0 ? 'child' : 'parent')}>
              <View className="ma-picker">
                <Text>{role === 'child' ? '孩子' : '家长'}</Text>
                <Icon name="arrowRight" size={24} color="#becab9" />
              </View>
            </Picker>
          </View>
          <View className="ma-field">
            <Text className="ma-label">登录密码</Text>
            <Input className="ma-input" placeholder="设置4位以上密码" value={password} onInput={(e) => setPassword(e.detail.value)} password />
          </View>
        </View>
        <Button className="ma-submit" onClick={handleAdd} disabled={saving}>
          {saving ? '添加中...' : '确认添加'}
        </Button>
      </View>

      {/* 头像选择器 */}
      <AvatarSelector
        visible={showAvatarPicker}
        onSelect={handleAvatarSelect}
        onClose={() => setShowAvatarPicker(false)}
        role={role}
      />
    </View>
  );
}
