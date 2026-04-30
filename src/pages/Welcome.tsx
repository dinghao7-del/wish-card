import React, { useState, useEffect } from 'react';
import { useFamily } from '../context/FamilyContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import {
  X, Mail, Phone, ArrowRight, Loader2, AlertCircle,
  CheckCircle2, Plus, UserPlus, LogIn, Eye, EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';

type Step = 'intro' | 'register' | 'login' | 'otp' | 'verify';

export function Welcome() {
  const { currentUser, setCurrentUser, members, setGuestMode, loadGuestData, loadGuestDemoData } = useFamily();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // currentUser 变化后自动跳转首页
  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  // ==================== 状态 ====================
  const [step, setStep] = useState<Step>('intro');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // 注册状态
  const [regNickname, setRegNickname] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 登录状态
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // ==================== 跳过登录（访客模式） ====================
  const handleSkip = async () => {
    setLoading(true);
    setError('');
    try {
      // 如果已有成员，直接选第一个（说明已登录过，有 session）
      if (members.length > 0) {
        setCurrentUser(members[0]);
        return;
      }
      // 访客模式：纯前端本地数据，不写数据库
      // loadGuestDemoData 内部已同步设置 guestModeRef 防止 onAuthStateChange 竞态
      loadGuestDemoData();
      // loadGuestDemoData 设置了 members，取第一个作为当前用户
      const user = {
        id: 'guest-mom',
        name: t('welcome.guest_name', '妈妈'),
        avatar: '/avatars/parent/Cute_cartoon_avatar_of_a_young_2026-04-27T18-33-05.png',
        stars: 320,
        role: 'parent' as const,
      };
      console.log('[GuestMode] Setting currentUser:', user.id, user.name);
      setCurrentUser(user);
      // 立即导航，不等待可能的异步副作用
      navigate('/', { replace: true });
    } catch (err: unknown) {
      console.error('[GuestMode] handleSkip error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t('welcome.skip_error', '跳过失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  // ==================== 注册：邮箱 OTP ====================
  const handleRegisterSendOtp = async () => {
    const input = phoneOrEmail.trim();
    const nickname = regNickname.trim();
    if (!nickname) {
      setError(t('welcome.register.error_nickname', '请输入昵称'));
      return;
    }
    if (!input) {
      setError(t('welcome.otp.error_empty', '请输入手机号或邮箱'));
      return;
    }
    if (!regPassword) {
      setError(t('welcome.register.error_password', '请输入密码'));
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError(t('welcome.register.error_mismatch', '两次输入的密码不一致哦 🍃'));
      return;
    }
    if (regPassword.length < 6) {
      setError(t('welcome.register.error_password_length', '密码至少6位'));
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');
    try {
      const isEmail = input.includes('@');
      const { error: otpError } = isEmail
        ? await supabase.auth.signInWithOtp({
            email: input,
            options: { shouldCreateUser: true, data: { nickname, password: regPassword } },
          })
        : await supabase.auth.signInWithOtp({
            phone: input,
            options: { shouldCreateUser: true, data: { nickname, password: regPassword } },
          });
      if (otpError) throw otpError;
      setInfo(t('welcome.otp.code_sent', `验证码已发送至 ${input}`));
      setStep('verify');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_') || msg.includes('fetch')) {
        setError(t('welcome.network_error', '网络连接失败，无法连接到服务器。请检查网络后重试，或先使用游客模式体验'));
      } else {
        setError(msg || t('welcome.otp.error_send', '发送验证码失败'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ==================== 登录：邮箱+密码 ====================
  const handleLogin = async () => {
    const username = loginUsername.trim();
    if (!username) {
      setError(t('welcome.login.error_empty', '请输入账号'));
      return;
    }
    if (!loginPassword) {
      setError(t('welcome.login.error_password', '请输入密码'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      // 判断是否是邮箱
      const isEmail = username.includes('@');
      if (isEmail) {
        // 邮箱+密码登录
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: username,
          password: loginPassword,
        });
        if (loginErr) throw loginErr;
        // onAuthStateChange 会自动加载用户数据
      } else {
        // 手机号+密码登录（Supabase 不直接支持，需通过查询 members 表验证）
        const { data: memberData, error: memberErr } = await supabase
          .from('members')
          .select('*', { defaultValue: '*' })
          .eq('name', username)
          .eq('password', loginPassword)
          .eq('is_active', true)
          .single();

        if (memberErr || !memberData) {
          throw new Error(t('welcome.login.error_invalid', '用户名或密码错误，请检查 🍃'));
        }

        setCurrentUser({
          id: memberData.id,
          name: memberData.name,
          avatar: memberData.avatar || '👤',
          stars: memberData.stars || 0,
          role: memberData.role,
        });
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_') || msg.includes('fetch')) {
        setError(t('welcome.network_error', '网络连接失败，无法连接到服务器。请检查网络后重试，或先使用游客模式体验'));
      } else {
        setError(msg || t('welcome.login.error_invalid', '登录失败'));
      }
    } finally {
      setLoading(false);
    }
  };

  // ==================== 验证 OTP ====================
  const handleVerifyOtp = async () => {
    const input = phoneOrEmail.trim();
    const token = otpToken.trim();
    if (!token) {
      setError(t('welcome.otp.error_no_code', '请输入验证码'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const isEmail = input.includes('@');
      // signInWithOtp 发送的验证码统一用 'email' 类型验证（不是 'signup'）
      // 'signup' 类型仅用于 signUp 方法发送的验证码
      const { error: vErr } = isEmail
        ? await supabase.auth.verifyOtp({ email: input, token, type: 'email' })
        : await supabase.auth.verifyOtp({ phone: input, token, type: 'sms' });

      if (vErr) {
        throw vErr;
      }

      // 验证成功后，为新用户创建家庭和成员记录
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // 检查是否已有成员记录
        const { data: existingMember } = await supabase
          .from('members')
          .select('id', { defaultValue: 'id' })
          .eq('id', session.user.id)
          .single();

        if (!existingMember) {
          // 新用户：创建家庭和成员
          const nickname = session.user.user_metadata?.nickname || regNickname || '家长';
          const password = session.user.user_metadata?.password || regPassword || '';

          // 设置密码（以便后续邮箱+密码登录）
          if (password) {
            await supabase.auth.updateUser({ password });
          }

          const family = await api.createFamily(t('welcome.my_family', '{0}的家庭').replace('{0}', nickname));
          await supabase.from('members').insert({
            id: session.user.id,
            family_id: family.id,
            name: nickname,
            role: 'parent',
            avatar: '👨‍👩‍👧',
            password: password || null,
          });

          // 重新加载数据
          const { data: newMember } = await supabase
            .from('members')
            .select('*', { defaultValue: '*' })
            .eq('id', session.user.id)
            .single();

          if (newMember) {
            setCurrentUser({
              id: newMember.id,
              name: newMember.name,
              avatar: newMember.avatar || '👤',
              stars: newMember.stars || 0,
              role: newMember.role,
            });
          }
        } else {
          // 已有成员记录，直接设置 currentUser
          const { data: memberData } = await supabase
            .from('members')
            .select('*', { defaultValue: '*' })
            .eq('id', session.user.id)
            .single();
          if (memberData) {
            setCurrentUser({
              id: memberData.id,
              name: memberData.name,
              avatar: memberData.avatar || '👤',
              stars: memberData.stars || 0,
              role: memberData.role,
            });
          }
        }
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_') || msg.includes('fetch')) {
        setError(t('welcome.network_error_verify', '网络连接失败，无法连接到服务器。请检查网络后重试'));
      } else {
        setError(msg || t('welcome.otp.error_verify', '验证失败'));
      }
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => { setError(''); setInfo(''); };

  // ==================== UI ====================
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* 动画背景 */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 20, repeat: Infinity }}
        className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], rotate: [0, -90, 0] }}
        transition={{ duration: 25, repeat: Infinity }}
        className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-secondary/5 rounded-full blur-[120px]"
      />

      {/* 右上角关闭/跳过按钮 - 始终可见，无延迟 */}
      <button
        onClick={handleSkip}
        disabled={loading}
        className="absolute top-6 right-6 z-50 flex items-center gap-1.5 px-4 h-11 bg-white/90 backdrop-blur-md rounded-full text-primary hover:bg-white hover:shadow-lg transition-all active:scale-95 shadow-md border border-primary/20 text-sm font-black"
      >
        {loading ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
        <span>{t('welcome.skip', '跳过')}</span>
      </button>

      <AnimatePresence mode="wait">
        {/* ==================== Intro ==================== */}
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-md text-center z-10"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-56 h-56 mx-auto mb-8 relative flex items-center justify-center p-4 bg-gradient-to-br from-[#98EE99]/10 to-transparent rounded-[3rem]"
            >
              <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse" />
              <img
                src="https://illustrations.popsy.co/green/paper-plane.svg"
                alt="Welcome Illustration"
                className="w-full h-full object-contain relative z-10"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <h1 className="text-7xl font-artistic text-primary mb-4 tracking-wider bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">{t('welcome.title', '星愿卡')}</h1>
            <p className="text-on-surface-variant font-bold text-base mb-2">{t('welcome.subtitle', '用努力开启小确幸 🌱')}</p>
            <p className="text-primary font-black text-sm mb-12 tracking-tight">{t('welcome.tagline', '记录成长每一步')}</p>

            <div className="space-y-3">
              <button
                onClick={() => { clearError(); setStep('register'); }}
                className="w-full h-16 bg-primary text-white rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-green-900/20 hover:bg-primary/80 transition-all active:scale-95"
              >
                <UserPlus size={22} />
                {t('welcome.register.submit', '注册')}
              </button>
              <button
                onClick={() => { clearError(); setStep('login'); }}
                className="w-full h-16 bg-white text-primary rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-lg border-2 border-primary/10 hover:border-primary/30 transition-all active:scale-95"
              >
                <LogIn size={22} />
                {t('welcome.login.submit', '登录')}
              </button>
              <button
                onClick={handleSkip}
                disabled={loading}
                className="w-full h-12 text-primary/60 bg-primary/5 rounded-[2rem] font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/10 transition-all active:scale-95 border border-primary/10"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                {t('welcome.guest_mode', '先逛逛')}
              </button>
            </div>
          </motion.div>
        )}

        {/* ==================== Register ==================== */}
        {step === 'register' && (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md z-10"
          >
            <div className="text-center mb-6">
              <h2 className="text-4xl font-handwritten text-on-surface mb-2">{t('welcome.register.title', '欢迎注册')}</h2>
              <p className="text-on-surface-variant font-bold text-sm tracking-tight">{t('welcome.register.subtitle', '只有家长才可以注册管理员哦 🌱')}</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10 relative">
              <button
                onClick={() => { clearError(); setStep('intro'); }}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white border border-outline-variant/20 rounded-full shadow-lg flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors z-20"
              >
                <Plus className="rotate-45" size={24} />
              </button>

              <div className="space-y-4">
                {/* 昵称 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2">{t('welcome.register.nickname', '管理员昵称')}</label>
                  <input
                    type="text"
                    value={regNickname}
                    onChange={(e) => setRegNickname(e.target.value)}
                    placeholder={t('welcome.register.nickname_placeholder', '如：妈妈')}
                    className="w-full h-12 bg-surface-container-low rounded-2xl px-5 font-bold text-on-surface outline-none border-2 border-transparent focus:border-primary/30 transition-all text-sm"
                  />
                </div>

                {/* 邮箱或手机号 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2 flex items-center gap-2">
                    {phoneOrEmail.includes('@') ? <Mail size={14} /> : <Phone size={14} />}
                    {t('welcome.otp.phone_email', '手机号或邮箱')}
                  </label>
                  <input
                    type="text"
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    placeholder={t('welcome.otp.placeholder', '手机号或邮箱')}
                    className="w-full h-12 bg-surface-container-low rounded-2xl px-5 font-bold text-on-surface outline-none border-2 border-transparent focus:border-primary/30 transition-all text-sm"
                  />
                </div>

                {/* 密码 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2">{t('welcome.register.password', '登录密码')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder={t('welcome.register.password_placeholder', '请输入管理密码')}
                      className="w-full h-12 bg-surface-container-low rounded-2xl px-5 pr-12 font-bold text-on-surface outline-none border-2 border-transparent focus:border-primary/30 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* 确认密码 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2">{t('welcome.register.confirm_password', '确认密码')}</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder={t('welcome.register.confirm_password_placeholder', '请再次输入密码')}
                      className="w-full h-12 bg-surface-container-low rounded-2xl px-5 pr-12 font-bold text-on-surface outline-none border-2 border-transparent focus:border-primary/30 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 bg-red-50 p-3 rounded-xl text-[10px] font-bold border border-red-100 flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}
                {info && (
                  <div className="text-green-500 bg-green-50 p-3 rounded-xl text-[10px] font-bold border border-green-100 flex items-center gap-2">
                    <CheckCircle2 size={14} /> {info}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRegisterSendOtp}
                  disabled={loading}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black text-base shadow-lg hover:shadow-green-900/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : t('welcome.otp.send', '发送验证码')}
                </button>

                <button
                  type="button"
                  onClick={() => { clearError(); setStep('login'); }}
                  className="w-full h-10 text-on-surface-variant font-bold text-xs"
                >
                  {t('welcome.has_account', '已有账号？去登录 →')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== Login ==================== */}
        {step === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md z-10"
          >
            <div className="text-center mb-6">
              <h2 className="text-4xl font-handwritten text-on-surface mb-2">{t('welcome.login.title', '欢迎登录')}</h2>
              <p className="text-on-surface-variant font-bold text-sm tracking-tight">{t('welcome.login.subtitle', '输入账号密码开启今日愿望 🌱')}</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10 relative">
              <button
                onClick={() => { clearError(); setStep('intro'); }}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white border border-outline-variant/20 rounded-full shadow-lg flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors z-20"
              >
                <Plus className="rotate-45" size={24} />
              </button>

              <div className="space-y-4">
                {/* 账号 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2">{t('welcome.login.username', '账号')}</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder={t('welcome.login.username_placeholder', '邮箱 或 昵称')}
                    className="w-full h-12 bg-surface-container-low rounded-2xl px-5 font-bold text-on-surface outline-none border-2 border-transparent focus:border-primary/30 transition-all text-sm"
                  />
                </div>

                {/* 密码 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-2">{t('welcome.login.password', '密码')}</label>
                  <div className="relative">
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={t('welcome.login.password_placeholder', '管理密码')}
                      className="w-full h-12 bg-surface-container-low rounded-2xl px-5 pr-12 font-bold text-on-surface outline-none border-2 border-transparent focus:border-primary/30 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-red-500 bg-red-50 p-3 rounded-xl text-[10px] font-bold border border-red-100 flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black text-base shadow-lg hover:shadow-green-900/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : t('welcome.login.submit', '登录账号')}
                </button>

                <button
                  type="button"
                  onClick={() => { clearError(); setStep('register'); }}
                  className="w-full h-10 text-on-surface-variant font-bold text-xs"
                >
                  {t('welcome.no_account', '没有账号？去注册 →')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== Verify OTP ==================== */}
        {step === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md z-10"
          >
            <div className="text-center mb-6">
              <h2 className="text-4xl font-handwritten text-on-surface mb-2">{t('welcome.otp.verify_title', '输入验证码')}</h2>
              <p className="text-on-surface-variant font-bold text-sm tracking-tight">
                {t('welcome.otp.verify_subtitle', `验证码已发送至 ${phoneOrEmail}`)}
              </p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10 relative">
              <button
                onClick={() => { setStep('register'); setOtpToken(''); clearError(); }}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white border border-outline-variant/20 rounded-full shadow-lg flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors z-20"
              >
                <Plus className="rotate-45" size={24} />
              </button>

              <div className="space-y-5">
                <input
                  type="text"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  placeholder={t('welcome.otp.code_placeholder', '请输入验证码')}
                  className="w-full h-14 bg-surface-container-low rounded-2xl px-6 font-bold text-on-surface outline-none border-2 border-transparent focus:border-primary/30 transition-all text-center text-2xl tracking-widest"
                />

                {error && (
                  <div className="text-red-500 bg-red-50 p-3 rounded-xl text-[10px] font-bold border border-red-100 flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}
                {info && (
                  <div className="text-green-500 bg-green-50 p-3 rounded-xl text-[10px] font-bold border border-green-100 flex items-center gap-2">
                    <CheckCircle2 size={14} /> {info}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="w-full h-14 bg-primary text-white rounded-2xl font-black text-base shadow-lg hover:shadow-green-900/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : t('welcome.otp.verify', '验证')}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('register'); setOtpToken(''); clearError(); }}
                  className="w-full h-10 text-on-surface-variant font-bold text-xs"
                >
                  ← {t('welcome.otp.resend', '重新发送')}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
