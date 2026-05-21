import { View, Text, Input, Button, Image } from '@tarojs/components';
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';
import Icon from '@/components/Icon';
import { setGuestMode } from '@/lib/guestData';
import './index.scss';

// Supabase 配置
const SUPABASE_URL = 'https://qdiuufuoleharmjfarzr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaXV1ZnVvbGVoYXJtamZhcnpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQyNDMsImV4cCI6MjA5MjgxMDI0M30.THu9_M-69tEDUaK_Zjiz0p4rZmclvFt6HvQWIxtepbk';

type Step = 'intro' | 'login' | 'register';

const STORAGE_KEY = 'guest_user';
const SUPABASE_AUTH_STORAGE_KEY = 'sb-qdiuufuoleharmjfarzr-auth-token';

const WELCOME_COMIC_ILLUSTRATIONS = [
  '/static/skins/forest-comic/welcome/welcome-green-01.png',
  '/static/skins/forest-comic/welcome/welcome-green-02.png',
  '/static/skins/forest-comic/welcome/welcome-green-03.png',
  '/static/skins/forest-comic/welcome/welcome-green-04.png',
];

function pickWelcomeComic() {
  return WELCOME_COMIC_ILLUSTRATIONS[Math.floor(Math.random() * WELCOME_COMIC_ILLUSTRATIONS.length)];
}

export default function Login() {
  const [step, setStep] = useState<Step>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [welcomeComic] = useState(pickWelcomeComic);

  // 登录状态
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // 注册状态
  const [regNickname, setRegNickname] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // 测试账户
  const TEST_EMAIL = 'test@wishcard.com';
  const TEST_PASSWORD = 'test123456';

  useEffect(() => {
    checkExistingSession();
  }, []);

  // 直接查 members 表（客户端 REST）
  const fetchMemberByQuery = async (query: string) => {
    try {
      const res = await new Promise<any>((resolve, reject) => {
        wx.request({
          url: `${SUPABASE_URL}/rest/v1/members?${query}&limit=1`,
          method: 'GET',
          header: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
          success: (r: any) => resolve(r),
          fail: (e: any) => reject(e),
        });
      });
      const data = res.data;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('[fetchMember] error:', err);
      return null;
    }
  };

  const checkExistingSession = async () => {
    try {
      const localUser = Taro.getStorageSync(STORAGE_KEY);
      if (localUser) {
        Taro.switchTab({ url: '/pages/home/index' });
        return;
      }
      // 真实账号 session 不在登录页首屏自动校验。
      // 这样即使 DevTools 或网络临时不可用，欢迎页和游客入口也能稳定出现。
      Taro.getStorageSync(SUPABASE_AUTH_STORAGE_KEY);
    } catch {}
  };

  // 游客模式 / 先逛逛
  const handleGuestMode = () => {
    setLoading(true);
    try {
      // 设置游客模式标志（供 Profile 等页面识别）
      setGuestMode(true);

      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({
        id: 'guest-son',  // 默认以"小明"身份进入
        name: '小明',
        role: 'child',
        stars: 186,
        avatar: 'https://qdiuufuoleharmjfarzr.supabase.co/storage/v1/object/public/assets/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-10.png',
        family_id: 'guest-family',
      }));
      Taro.showToast({ title: '进入体验模式（游客）', icon: 'success', duration: 1500 });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' });
      }, 1500);
    } catch (err) {
      setError('进入体验模式失败');
    } finally {
      setLoading(false);
    }
  };

  // 登录
  const handleLogin = async () => {
    const username = loginUsername.trim();
    if (!username) { setError('请输入邮箱或昵称'); return; }
    if (!loginPassword) { setError('请输入密码'); return; }

    setLoading(true);
    setError('');

    try {
      const isEmail = username.includes('@');
      let user: any = null;

      if (isEmail) {
        try {
          const authRes = await new Promise<any>((resolve, reject) => {
            wx.request({
              url: `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
              method: 'POST',
              header: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
              data: { email: username, password: loginPassword },
              success: (r: any) => resolve(r),
              fail: (e: any) => reject(e),
            });
          });
          if (authRes.statusCode === 200 && authRes.data?.user?.id) {
            // ⭐ 关键修复：将 Auth Token 写入 Supabase Client Session
            // 否则后续 supabase.auth.getUser() 永远返回 null
            try {
              await supabase.client.auth.setSession({
                access_token: authRes.data.access_token,
                refresh_token: authRes.data.refresh_token,
              });
              console.log('[Login] ✅ Auth session 已建立, userId:', authRes.data.user.id);
            } catch (sessErr) {
              console.warn('[Login] setSession 失败（继续用本地存储）:', sessErr);
            }
            user = await fetchMemberByQuery(`id=eq.${authRes.data.user.id}`);
          }
        } catch (e) {
          console.warn('[Login] Auth API 调用失败:', e);
        }
        if (!user) {
          user = await fetchMemberByQuery(`name=eq.${encodeURIComponent(username)}&password=eq.${loginPassword}`);
        }
      } else {
        user = await fetchMemberByQuery(`name=eq.${encodeURIComponent(username)}&password=eq.${loginPassword}`);
      }

      if (!user) {
        throw new Error('用户名或密码错误 🍃');
      }

      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({
        id: user.id,
        name: user.name,
        role: user.role,
        stars: user.stars || 0,
        avatar: user.avatar || '',
        family_id: user.family_id,
      }));

      Taro.showToast({ title: '登录成功！', icon: 'success', duration: 1500 });
      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' });
      }, 1500);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('Network') || msg.includes('network')) {
        setError('网络连接失败，无法连接到服务器。请检查网络后重试，或使用「先逛逛」体验模式');
      } else {
        setError(msg || '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  // 离线演示模式
  const handleOfflineDemo = () => {
    // 设置游客模式标志
    setGuestMode(true);

    Taro.setStorageSync(STORAGE_KEY, JSON.stringify({
      id: 'guest-son',
      name: '小明',
      role: 'child',
      stars: 186,
      avatar: '/assets/avatars/boy/Cute_cartoon_avatar_of_an_Asia_2026-04-27T18-28-10.png',
      family_id: 'demo-family',  // demo-family 标记为离线模式
    }));
    Taro.showToast({ title: '已进入离线演示模式（游客数据）', icon: 'success', duration: 1500 });
    setTimeout(() => {
      Taro.switchTab({ url: '/pages/home/index' });
    }, 1500);
  };

  // 注册
  const handleRegister = () => {
    if (!regNickname.trim()) { setError('请输入管理员昵称'); return; }
    if (!regEmail.trim()) { setError('请输入邮箱'); return; }
    if (!regPassword) { setError('请输入密码'); return; }
    if (regPassword !== regConfirmPassword) { setError('两次输入的密码不一致哦 🍃'); return; }
    if (regPassword.length < 6) { setError('密码至少6位'); return; }

    setLoading(true);
    setError('');

    supabase.auth.signInWithOtp({
      email: regEmail.trim(),
      options: { shouldCreateUser: true, data: { nickname: regNickname.trim(), password: regPassword } },
    }).then(({ error: otpError }) => {
      if (otpError) throw otpError;
      setInfo(`验证码已发送至 ${regEmail}`);
      setStep('login');
      setLoginUsername(regEmail.trim());
      setLoginPassword(regPassword);
    }).catch((err: any) => {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('Network')) {
        setError('网络连接失败，无法连接到服务器。请检查网络后重试，或使用「先逛逛」体验模式');
      } else {
        setError(msg || '注册失败');
      }
    }).finally(() => {
      setLoading(false);
    });
  };

  const fillTestAccount = () => {
    setLoginUsername(TEST_EMAIL);
    setLoginPassword(TEST_PASSWORD);
  };

  const clearError = () => { setError(''); setInfo(''); };

  return (
    <View className="login-page">
      {/* ===== 动画背景装饰 ===== */}
      <View className="login-bg-deco-1" />
      <View className="login-bg-deco-2" />

      {/* ===== 跳过按钮（始终可见） ===== */}
      <View className="login-skip-btn" onClick={handleGuestMode}>
        <Icon name="x" size={28} color="var(--color-primary)" />
        <Text>跳过</Text>
      </View>

      {/* ===== Intro 页 ===== */}
      {step === 'intro' && (
        <View className="login-intro">
          <View className="login-logo-area">
            <View className="login-logo-glow" />
            <Image
              className="login-logo-img"
              src={welcomeComic}
              mode="aspectFit"
            />
          </View>
          <Text className="login-brand">星愿卡</Text>
          <Text className="login-slogan">用努力开启小确幸 🌱</Text>
          <Text className="login-tagline">记录成长每一步</Text>

          <View className="login-actions">
            <Button
              className="login-btn login-btn-primary"
              onClick={() => { clearError(); setStep('register'); }}
            >
              <Icon name="userPlus" size={40} color="var(--color-on-primary)" />
              <Text>注册</Text>
            </Button>
            <Button
              className="login-btn login-btn-secondary"
              onClick={() => { clearError(); setStep('login'); }}
            >
              <Icon name="logIn" size={40} color="var(--color-primary)" />
              <Text>登录</Text>
            </Button>
            <Button
              className="login-btn login-btn-ghost"
              onClick={handleGuestMode}
              disabled={loading}
            >
              {loading ? (
                <Icon name="loader" size={28} color="var(--color-on-surface-variant)" />
              ) : (
                <Icon name="arrowRight" size={28} color="var(--color-on-surface-variant)" />
              )}
              <Text>先逛逛</Text>
            </Button>
          </View>
        </View>
      )}

      {/* ===== 登录表单 ===== */}
      {step === 'login' && (
        <View className="login-form-container">
          <View className="login-form-header">
            <Text className="login-form-title">欢迎登录</Text>
            <Text className="login-form-subtitle">输入账号密码开启今日愿望 🌱</Text>
            <View className="login-close-btn" onClick={() => { clearError(); setStep('intro'); }}>
              <Icon name="plus" size={36} color="var(--color-on-surface)" />
            </View>
          </View>

          <View className="login-form-body">
            <View className="login-field">
              <Text className="login-field-label">账号</Text>
              <Input
                className="login-input"
                placeholder="邮箱 或 昵称"
                value={loginUsername}
                onInput={(e) => setLoginUsername(e.detail.value)}
              />
            </View>
            <View className="login-field">
              <Text className="login-field-label">密码</Text>
              <Input
                className="login-input"
                placeholder="管理密码"
                value={loginPassword}
                onInput={(e) => setLoginPassword(e.detail.value)}
                password
              />
            </View>

            {error && (
              <View className="login-error">
                <Icon name="x" size={24} color="var(--color-danger)" />
                <Text>{error}</Text>
              </View>
            )}
            {info && (
              <View className="login-info">
                <Icon name="checkCircle" size={24} color="var(--color-primary)" />
                <Text>{info}</Text>
              </View>
            )}

            <Button
              className="login-btn-submit"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <Icon name="loader" size={36} color="var(--color-on-primary)" />
              ) : (
                '登录账号'
              )}
            </Button>

            {/* 离线演示 */}
            <View className="login-offline-section">
              <Button className="login-btn-offline" onClick={handleOfflineDemo}>
                <Text>📴 网络不通？离线演示模式</Text>
              </Button>
            </View>

            {/* 忘记密码 */}
            <View className="login-forgot-link">
              <Text onClick={() => Taro.navigateTo({ url: '/pkg/forgot-password/index' })}>
                忘记密码？
              </Text>
            </View>

            {/* 填入测试账号 */}
            <View className="login-test-link" onClick={fillTestAccount}>
              <Text>填入测试账号</Text>
            </View>

            <View className="login-bottom-links">
              <Text className="login-link" onClick={() => { clearError(); setStep('register'); }}>
                没有账号？去注册 →
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== 注册表单 ===== */}
      {step === 'register' && (
        <View className="login-form-container">
          <View className="login-form-header">
            <Text className="login-form-title">欢迎注册</Text>
            <Text className="login-form-subtitle">只有家长才可以注册管理员哦 🌱</Text>
            <View className="login-close-btn" onClick={() => { clearError(); setStep('intro'); }}>
              <Icon name="plus" size={36} color="var(--color-on-surface)" />
            </View>
          </View>

          <View className="login-form-body">
            <View className="login-field">
              <Text className="login-field-label">管理员昵称</Text>
              <Input
                className="login-input"
                placeholder="如：妈妈"
                value={regNickname}
                onInput={(e) => setRegNickname(e.detail.value)}
              />
            </View>
            <View className="login-field">
              <Text className="login-field-label">邮箱</Text>
              <Input
                className="login-input"
                placeholder="请输入邮箱地址"
                value={regEmail}
                onInput={(e) => setRegEmail(e.detail.value)}
                type="text"
              />
            </View>
            <View className="login-field">
              <Text className="login-field-label">登录密码</Text>
              <Input
                className="login-input"
                placeholder="请输入管理密码"
                value={regPassword}
                onInput={(e) => setRegPassword(e.detail.value)}
                password
              />
            </View>
            <View className="login-field">
              <Text className="login-field-label">确认密码</Text>
              <Input
                className="login-input"
                placeholder="请再次输入密码"
                value={regConfirmPassword}
                onInput={(e) => setRegConfirmPassword(e.detail.value)}
                password
              />
            </View>

            {error && (
              <View className="login-error">
                <Icon name="x" size={24} color="var(--color-danger)" />
                <Text>{error}</Text>
              </View>
            )}
            {info && (
              <View className="login-info">
                <Icon name="checkCircle" size={24} color="var(--color-primary)" />
                <Text>{info}</Text>
              </View>
            )}

            <Button
              className="login-btn-submit"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <Icon name="loader" size={36} color="var(--color-on-primary)" />
              ) : (
                '发送验证码'
              )}
            </Button>

            <View className="login-bottom-links">
              <Text className="login-link" onClick={() => { clearError(); setStep('login'); }}>
                已有账号？去登录 →
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
