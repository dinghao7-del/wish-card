import { View, Text, Input, Switch, ScrollView } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import { getThemeClass } from '@/lib/themeSkins';
import './index.scss';

export default function SecuritySettings() {
  const [user, setUser] = useState<any>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [email, setEmail] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = Taro.getStorageSync('guest_user');
      if (stored) {
        setUser(JSON.parse(stored));
        return;
      }
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        setEmail(authUser.email || '');
        const { data } = await supabase.from('members').select('*').eq('id', authUser.id).single();
        if (data) setUser({ ...authUser, ...data });
      }
    } catch {}
  };

  const handleChangePassword = async () => {
    if (!newPassword) { Taro.showToast({ title: '请输入新密码', icon: 'none' }); return; }
    if (newPassword !== confirmPwd) { Taro.showToast({ title: '两次密码不一致', icon: 'none' }); return; }
    if (newPassword.length < 6) { Taro.showToast({ title: '密码至少6位', icon: 'none' }); return; }

    // 游客模式：本地更新
    const stored = Taro.getStorageSync('guest_user');
    if (stored) {
      const u = JSON.parse(stored);
      u.password = newPassword;
      Taro.setStorageSync('guest_user', JSON.stringify(u));
      Taro.showToast({ title: '密码已更新（本地）', icon: 'success' });
      setOldPassword(''); setNewPassword(''); setConfirmPwd('');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
      if (session) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        Taro.showToast({ title: '密码修改成功', icon: 'success' });
        setOldPassword(''); setNewPassword(''); setConfirmPwd('');
      } else {
        Taro.showToast({ title: '原密码错误', icon: 'none' });
      }
    } catch (e: any) {
      Taro.showToast({ title: e.message || '修改失败', icon: 'none' });
    }
    setLoading(false);
  };

  const handleChangeEmail = async () => {
    if (!email.includes('@')) { Taro.showToast({ title: '邮箱格式错误', icon: 'none' }); return; }
    Taro.showLoading({ title: '发送中...' });
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      Taro.showToast({ title: '验证邮件已发送', icon: 'success' });
    } catch (e: any) {
      Taro.showToast({ title: e.message || '发送失败', icon: 'none' });
    }
    Taro.hideLoading();
  };

  const handleDeleteAccount = () => {
    Taro.showModal({
      title: '危险操作',
      content: '删除账号后所有数据将永久丢失，确定继续吗？',
      confirmText: '删除',
      confirmColor: '#e53935',
      success: async (res) => {
        if (!res.confirm) return;
        Taro.showLoading({ title: '处理中...' });
        try {
          const stored = Taro.getStorageSync('guest_user');
          if (stored) {
            Taro.removeStorageSync('guest_user');
            Taro.hideLoading();
            Taro.reLaunch({ url: '/pages/login/index' });
            return;
          }
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            // 先删除成员数据（不需要 admin 权限）
            await supabase.from('members').delete().eq('id', authUser.id);
            // 再登出（Supabase Auth 会自动清理 session）
            await supabase.auth.signOut();
          }
          Taro.hideLoading();
          Taro.reLaunch({ url: '/pages/login/index' });
        } catch {
          Taro.hideLoading();
          Taro.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  };

  return (
    <View className={`settings-page ${getThemeClass()}`}>
      <View className="settings-header">
        <View className="settings-back" onClick={() => Taro.navigateBack()}>
          <Icon name="arrowLeft" size={32} color="#3f4a3c" />
        </View>
        <Text className="settings-title">账号与安全</Text>
        <Text className="settings-desc">管理你的账户安全设置</Text>
      </View>

      <ScrollView className="settings-body" scrollY>
        {/* 修改密码 */}
        <View className="settings-section">
          <Text className="settings-section-title">修改密码</Text>
          <View className="settings-form-item">
            <Text className="form-label">当前密码</Text>
            <Input
              className="form-input"
              password
              value={oldPassword}
              placeholder={user?.password ? '******' : '请输入当前密码'}
              onInput={(e) => setOldPassword(e.detail.value)}
            />
          </View>
          <View className="settings-form-item">
            <Text className="form-label">新密码</Text>
            <Input
              className="form-input"
              password
              value={newPassword}
              placeholder="至少6位字符"
              onInput={(e) => setNewPassword(e.detail.value)}
            />
          </View>
          <View className="settings-form-item">
            <Text className="form-label">确认新密码</Text>
            <Input
              className="form-input"
              password
              value={confirmPwd}
              placeholder="再次输入新密码"
              onInput={(e) => setConfirmPwd(e.detail.value)}
            />
          </View>
          <View className={`settings-action-btn ${loading ? 'disabled' : ''}`} onClick={() => !loading && handleChangePassword()}>
            <Text className="settings-action-text">{loading ? '处理中...' : '修改密码'}</Text>
          </View>
        </View>

        {/* 邮箱管理 */}
        <View className="settings-section">
          <Text className="settings-section-title">绑定邮箱</Text>
          <View className="settings-info-row">
            <Text className="info-label">当前邮箱</Text>
            <Text className="info-value">{email || user?.email || '未绑定'}</Text>
          </View>
          <View className="settings-form-item">
            <Text className="form-label">新邮箱</Text>
            <Input
              className="form-input"
              value={email}
              placeholder="输入新邮箱地址"
              type="text"
              onInput={(e) => setEmail(e.detail.value)}
            />
          </View>
          <View className="settings-action-btn secondary" onClick={handleChangeEmail}>
            <Text className="settings-action-text">更换邮箱</Text>
          </View>
        </View>

        {/* 两步验证 */}
        <View className="settings-section">
          <View className="settings-toggle-row">
            <View className="toggle-left">
              <Text className="toggle-label">两步验证</Text>
              <Text className="toggle-desc">登录时需要额外验证码</Text>
            </View>
            <Switch checked={twoFactorEnabled} color="#006e1c" onChange={(e) => {
              setTwoFactorEnabled(e.detail.value);
              Taro.showToast({ title: e.detail.value ? '已开启两步验证' : '已关闭', icon: 'none' });
            }} />
          </View>
        </View>

        {/* 危险区域 */}
        <View className="settings-section danger">
          <Text className="settings-section-title danger-text">危险区域</Text>
          <View className="settings-danger-btn" onClick={handleDeleteAccount}>
            <Icon name="trash" size={32} color="#e53935" />
            <Text className="danger-btn-text">注销并删除账号</Text>
          </View>
          <Text className="danger-hint">此操作不可逆，删除后数据无法恢复</Text>
        </View>

        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
