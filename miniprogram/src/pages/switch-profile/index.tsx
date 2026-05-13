import { View, Text, Image, ScrollView, Input } from '@tarojs/components';
import { useState, useEffect, useRef } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import { getLocalUser, setLocalUser } from '@/utils/localUser';
import { resolveAvatarPath } from '@/lib/templates';
import { GUEST_MEMBERS, isGuestMode } from '@/lib/guestData';
import Icon from '@/components/Icon';
import './index.scss';

// 对齐 Web 端 SwitchProfile.tsx
// 功能：切换当前登录的家庭成员账户
// 支持：真实登录用户(从DB加载) / 游客模式(从GUEST_MEMBERS加载) / PIN码验证

interface MemberItem {
  id: string;
  name: string;
  avatar: string;
  role: 'parent' | 'child';
  stars: number;
  pin?: string;        // 孩子账号的4位PIN码
  password?: string;   // 登录密码
}

export default function SwitchProfile() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // PIN 验证状态（对齐 Web 版）
  const [selectedUser, setSelectedUser] = useState<MemberItem | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const pinInputRef = useRef<any>(null);
  const [isGuest, setIsGuest] = useState(false); // 标记是否游客模式

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      // ===== 优先检查是否为游客模式 =====
      if (isGuestMode()) {
        console.log('[SwitchProfile] 游客模式 → 使用 GUEST_MEMBERS');
        setIsGuest(true);

        // 使用 guestData 的完整成员列表（含 pin/password）
        const allMembers: MemberItem[] = GUEST_MEMBERS.map(m => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar,
          role: m.role,
          stars: m.stars,
          pin: m.pin,
          password: m.password,
        }));

        setMembers(allMembers);

        // 获取当前选中的游客用户
        const localUser = getLocalUser();
        if (localUser?.id) {
          setCurrentUserId(localUser.id);
        } else {
          // 默认选中第一个（妈妈）
          setCurrentUserId(allMembers[0].id);
        }
        setLoading(false);
        return;
      }

      // ===== 真实登录用户 → 从 Supabase 加载 =====
      const localUser = getLocalUser();
      if (localUser?.id) {
        setCurrentUserId(localUser.id);
        if (localUser.family_id) {
          const { data } = await supabase
            .from('members')
            .select('*')
            .eq('family_id', localUser.family_id);
          if (Array.isArray(data)) {
            setMembers(data.map(m => ({
              id: m.id,
              name: m.name || '未设置',
              avatar: m.avatar || '',
              role: m.role || 'child',
              stars: m.stars || 0,
              pin: m.pin,
              password: m.password,
            })));
          }
        }
      } else {
        // fallback: Supabase Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
          const { data: memberData } = await supabase
            .from('members')
            .select('family_id')
            .eq('id', user.id)
            .single();
          if (memberData?.family_id) {
            const { data } = await supabase
              .from('members')
              .select('*')
              .eq('family_id', memberData.family_id);
            if (Array.isArray(data)) {
              setMembers(data.map(m => ({
                id: m.id, name: m.name || '未设置', avatar: m.avatar || '',
                role: m.role || 'child', stars: m.stars || 0,
                pin: m.pin, password: m.password,
              })));
            }
          }
        }
      }
    } catch (err) {
      console.error('[SwitchProfile] loadMembers error:', err);
      Taro.showToast({ title: '加载失败', icon: 'none' });
    }
    setLoading(false);
  };

  /** 点击成员卡片 */
  const handleMemberClick = (member: MemberItem) => {
    if (member.id === currentUserId) {
      Taro.navigateBack(); return; // 当前用户，直接返回
    }

    // 检查是否有 PIN 码保护（对齐 Web 版逻辑）
    const hasPin = member.pin && member.pin.trim() !== '' && member.pin.length === 4;

    if (!hasPin) {
      // 无 PIN → 直接切换（管理员/家长）
      doSwitch(member);
      return;
    }

    // 有 PIN → 弹出 PIN 输入框
    console.log(`[SwitchProfile] 成员 ${member.name} 需要 PIN 验证`);
    setSelectedUser(member);
    setPinInput('');
    setPinError('');

    // 延迟聚焦输入框（等待渲染完成）
    setTimeout(() => {
      // 小程序中无法直接 focus Input 组件，但可以提示用户
      Taro.vibrateShort({ type: 'light' });
    }, 100);
  };

  /** 验证 PIN 并切换 */
  const handlePinSubmit = () => {
    if (!selectedUser) return;

    if (!pinInput.trim()) {
      setPinError('请输入PIN码');
      return;
    }

    // 验证 PIN 或 password
    const isValidPin = pinInput.trim() === selectedUser.pin;
    const isValidPassword = pinInput.trim() === selectedUser.password;

    if (!isValidPin && !isValidPassword) {
      setPinError('PIN码或密码错误');
      Taro.vibrateShort({ type: 'heavy' });
      return;
    }

    // PIN 验证通过 → 切换用户
    console.log(`[SwitchProfile] PIN 验证通过 → 切换到 ${selectedUser.name}`);
    setSelectedUser(null);
    doSwitch(selectedUser);
  };

  /** 取消 PIN 输入 */
  const handlePinCancel = () => {
    setSelectedUser(null);
    setPinInput('');
    setPinError('');
  };

  /** 执行实际切换 */
  const doSwitch = async (member: MemberItem) => {
    setSwitchingId(member.id);
    Taro.showLoading({ title: '切换中...' });

    try {
      await new Promise(resolve => setTimeout(resolve, 400)); // 轻微延迟

      if (isGuest) {
        // 游客模式：更新本地存储
        const updatedUser = {
          id: member.id,
          name: member.name,
          avatar: member.avatar,
          role: member.role,
          stars: member.stars,
          family_id: 'guest-family',
          pin: member.pin,
          password: member.password,
        };
        Taro.setStorageSync('guest_user', JSON.stringify(updatedUser));
        setLocalUser(updatedUser);
      } else {
        // 真实登录模式：更新本地存储
        const baseUser = getLocalUser() || {};
        const updatedUser = {
          ...baseUser,
          id: member.id,
          name: member.name,
          avatar: member.avatar,
          role: member.role,
          stars: member.stars,
        };
        setLocalUser(updatedUser);
      }

      Taro.hideLoading();
      Taro.showToast({
        title: `已切换为 ${member.name}`,
        icon: 'success',
        duration: 1200,
      });

      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' });
      }, 1000);
    } catch (err) {
      Taro.hideLoading();
      Taro.showToast({ title: '切换失败', icon: 'none' });
    }
    setSwitchingId(null);
  };

  return (
    <View className="switch-page">
      {/* Header */}
      <View className="sp-header">
        <View className="sp-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowRight" size={36} color="#3f4a3c" style={{ transform: 'rotate(180deg)' }} />
        </View>
        <Text className="sp-title">切换用户</Text>
        <View style={{ width: '60rpx' }} />
      </View>

      {/* 提示文案 */}
      <View className="sp-hint">
        <Text className="sp-hint-text">
          {isGuest ? '游客模式 — 测试切换成员功能' : '选择一个家庭成员身份来使用应用'}
        </Text>
      </View>

      {/* Loading */}
      {loading ? (
        <View className="sp-loading">
          <Icon name="loader-2" size={48} color="#006e1c" />
          <Text>加载成员列表...</Text>
        </View>
      ) : members.length === 0 ? (
        /* Empty */
        <View className="sp-empty">
          <Icon name="users" size={80} color="#becab9" />
          <Text className="sp-empty-title">暂无家庭成员</Text>
          <Text className="sp-empty-desc">请先添加家庭成员</Text>
          <View
            className="sp-empty-btn"
            onClick={() => Taro.navigateTo({ url: '/pages/members/add/index' })}
          >
            <Text>添加成员</Text>
          </View>
        </View>
      ) : (
        /* 成员列表 */
        <ScrollView scrollY enhanced className="sp-list">
          {members.map(member => {
            const isCurrent = member.id === currentUserId;
            const isSwitching = switchingId === member.id;
            const hasPin = member.pin && member.pin.trim() !== '' && member.pin.length === 4;

            return (
              <View
                key={member.id}
                className={`sp-member-card ${isCurrent ? 'current' : ''} ${isSwitching ? 'switching' : ''}`}
                onClick={() => !isSwitching && handleMemberClick(member)}
              >
                {/* 头像 */}
                <View className="sp-avatar-wrap">
                  <Image
                    className="sp-avatar"
                    src={resolveAvatarPath(member.avatar || '')}
                    mode="aspectFill"
                  />
                  {isCurrent && (
                    <View className="sp-current-badge">
                      <Icon name="check" size={18} color="#ffffff" />
                    </View>
                  )}
                </View>

                {/* 信息 */}
                <View className="sp-info">
                  <View className="sp-name-row">
                    <Text className="sp-name">{member.name}</Text>
                    {member.role === 'parent' && (
                      <View className="sp-role-tag parent"><Text>家长</Text></View>
                    )}
                    {member.role === 'child' && (
                      <View className="sp-role-tag child"><Text>孩子</Text></View>
                    )}
                    {/* PIN 保护标记 */}
                    {hasPin && !isCurrent && (
                      <Icon name="lock" size={22} color="#F9A825" style={{ marginLeft: '8rpx' }} />
                    )}
                  </View>

                  {/* 星星 */}
                  <View className="sp-stars-row">
                    <Icon name="star" size={24} color="#F9A825" />
                    <Text className="sp-star-num">{member.stars}</Text>
                  </View>

                  {/* PIN 提示（孩子账号） */}
                  {hasPin && !isCurrent && (
                    <Text style={{ fontSize: '22rpx', color: '#999', marginTop: '4rpx' }}>
                      PIN: {member.pin?.replace(/./g, '*')} （或输入密码）
                    </Text>
                  )}
                </View>

                {/* 右侧指示 */}
                <View className="sp-right">
                  {isCurrent ? (
                    <View className="sp-using-tag"><Text>使用中</Text></View>
                  ) : isSwitching ? (
                    <Icon name="loader-2" size={32} color="#006e1c" className="spin" />
                  ) : (
                    <Icon name="chevronRight" size={28} color="#becab9" />
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ===== PIN 验证弹窗（对齐 Web 版）===== */}
      {selectedUser && (
        <View className="pin-overlay" onClick={handlePinCancel}>
          <View className="pin-modal" onClick={(e) => e.stopPropagation()}>
            {/* 头像和名称 */}
            <View className="pin-header">
              <Image
                className="pin-avatar"
                src={resolveAvatarPath(selectedUser.avatar || '')}
                mode="aspectFill"
              />
              <Text className="pin-title">{selectedUser.name}</Text>
              <Text className="pin-subtitle">请输入 PIN 码或密码以切换到此账户</Text>
            </View>

            {/* PIN 输入框 */}
            <View className="pin-input-wrap">
              <Input
                className="pin-input"
                type="text"
                password
                maxlength={20}
                placeholder="输入PIN码(4位) 或密码"
                value={pinInput}
                onInput={(e) => { setPinInput(e.detail.value); setPinError(''); }}
                focus={true}
                confirmType="done"
                onConfirm={handlePinSubmit}
              />
            </View>

            {/* 错误提示 */}
            {pinError && (
              <View className="pin-error">
                <Text>{pinError}</Text>
              </View>
            )}

            {/* 提示信息 */}
            <View className="pin-hint">
              <Icon name="info" size={24} color="#999" />
              <Text>测试账号：小明 PIN=1234, 小红 PIN=5678</Text>
            </View>

            {/* 按钮 */}
            <View className="pin-actions">
              <View className="pin-btn pin-btn-cancel" onClick={handlePinCancel}>
                <Text>取消</Text>
              </View>
              <View className="pin-btn pin-btn-confirm" onClick={handlePinSubmit}>
                <Text>确认切换</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 底部提示 */}
      {!selectedUser && (
        <View className="sp-footer">
          <Text className="sp-footer-text">
            {isGuest ? '家长可直接切换 · 孩子需输入PIN码' : '切换后将刷新所有数据'}
          </Text>
        </View>
      )}
    </View>
  );
}
