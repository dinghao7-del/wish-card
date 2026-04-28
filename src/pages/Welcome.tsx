import React, { useState, useEffect } from 'react';
import { useFamily } from '../context/FamilyContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AnimatePresence } from 'framer-motion';
import { X, Mail, Phone, ArrowRight, Loader2, AlertCircle, CheckCircle2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

export function Welcome() {
  const { members, currentUser, setCurrentUser } = useFamily();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // currentUser 变化后自动跳转首页
  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSkip = () => {
    const guest = members[0];
    if (guest) setCurrentUser(guest);
  };

  // ==================== OTP 登录状态 ====================
  const [step, setStep] = useState<'intro' | 'otp' | 'verify'>('intro');
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSendOtp = async () => {
    const input = phoneOrEmail.trim();
    if (!input) {
      setError(t('welcome.otp.error_empty', '请输入手机号或邮箱'));
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
            options: { shouldCreateUser: true },
          })
        : await supabase.auth.signInWithOtp({
            phone: input,
            options: { shouldCreateUser: true },
          });
      if (otpError) throw otpError;
      setInfo(t('welcome.otp.code_sent', `验证码已发送至 ${input}`));
      setStep('verify');
    } catch (err: any) {
      setError(err.message || t('welcome.otp.error_send', '发送验证码失败'));
    } finally {
      setLoading(false);
    }
  };

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
      const { error: vErr } = isEmail
        ? await supabase.auth.verifyOtp({
            email: input,
            token,
            type: 'email',
          })
        : await supabase.auth.verifyOtp({
            phone: input,
            token,
            type: 'sms',
          });
      if (vErr) throw vErr;
      // Supabase session 已设置，FamilyContext.onAuthStateChange 会自动加载用户数据
    } catch (err: any) {
      setError(err.message || t('welcome.otp.error_verify', '验证失败'));
    } finally {
      setLoading(false);
    }
  };

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

      {/* 右上角 Skip 按钮 */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1 }}
        onClick={handleSkip}
        className="absolute top-6 right-6 z-50 w-12 h-12 bg-white/50 backdrop-blur-md rounded-2xl flex items-center justify-center text-on-surface-variant hover:bg-white hover:text-primary transition-all active:scale-95 shadow-sm border border-outline-variant/20"
      >
        <X size={24} />
      </motion.button>

      <AnimatePresence mode="wait">
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
            <h1 className="text-7xl font-handwritten text-on-surface mb-4">{t('welcome.title', '愿望卡')}</h1>
            <p className="text-on-surface-variant font-bold text-base mb-2">{t('welcome.subtitle', '用努力开启小确幸 🌱')}</p>
            <p className="text-[#2e7d32] font-black text-sm mb-12 tracking-tight">{t('welcome.tagline', '记录成长每一步')}</p>

            <button
              onClick={() => setStep('otp')}
              className="w-full h-18 bg-[#006e1c] text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-green-900/20 hover:bg-[#005a16] transition-all active:scale-95 mb-8"
            >
              {t('welcome.start_button', '登录 / 注册')}
              <ArrowRight size={24} />
            </button>

            <div className="h-12" />
          </motion.div>
        )}

        {step === 'otp' && (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md z-10"
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-handwritten text-on-surface mb-2">{t('welcome.otp.title', '登录 / 注册')}</h2>
              <p className="text-on-surface-variant font-bold text-sm tracking-tight">{t('welcome.otp.subtitle', '输入手机号或邮箱')}</p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10 relative">
              <button
                onClick={() => setStep('intro')}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white border border-outline-variant/20 rounded-full shadow-lg flex items-center justify-center text-on-surface-variant hover:text-[#006e1c] transition-colors z-20"
              >
                <Plus className="rotate-45" size={24} />
              </button>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-on-surface-variant ml-2 flex items-center gap-2">
                    {phoneOrEmail.includes('@') ? <Mail size={14} /> : <Phone size={14} />}
                    {t('welcome.otp.phone_email', '手机号或邮箱')}
                  </label>
                  <input
                    type="text"
                    value={phoneOrEmail}
                    onChange={(e) => setPhoneOrEmail(e.target.value)}
                    placeholder={t('welcome.otp.placeholder', '手机号或邮箱')}
                    className="w-full h-14 bg-[#f5f5f5] rounded-2xl px-6 font-bold text-on-surface outline-none border-2 border-transparent focus:border-[#006e1c]/30 transition-all"
                    required
                  />
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
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full h-16 bg-[#006e1c] text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-green-900/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : t('welcome.otp.send', '发送验证码')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-md z-10"
          >
            <div className="text-center mb-8">
              <h2 className="text-4xl font-handwritten text-on-surface mb-2">{t('welcome.otp.verify_title', '输入验证码')}</h2>
              <p className="text-on-surface-variant font-bold text-sm tracking-tight">
                {t('welcome.otp.verify_subtitle', `验证码已发送至 ${phoneOrEmail}`)}
              </p>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-outline-variant/10 relative">
              <button
                onClick={() => { setStep('otp'); setOtpToken(''); setError(''); }}
                className="absolute -top-4 -right-4 w-10 h-10 bg-white border border-outline-variant/20 rounded-full shadow-lg flex items-center justify-center text-on-surface-variant hover:text-[#006e1c] transition-colors z-20"
              >
                <Plus className="rotate-45" size={24} />
              </button>

              <div className="space-y-6">
                <input
                  type="text"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  placeholder={t('welcome.otp.code_placeholder', '请输入验证码')}
                  className="w-full h-14 bg-[#f5f5f5] rounded-2xl px-6 font-bold text-on-surface outline-none border-2 border-transparent focus:border-[#006e1c]/30 transition-all text-center text-2xl tracking-widest"
                />

                {error && (
                  <div className="text-red-500 bg-red-50 p-3 rounded-xl text-[10px] font-bold border border-red-100 flex items-center gap-2">
                    <AlertCircle size={14} /> {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                  className="w-full h-16 bg-[#006e1c] text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-green-900/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : t('welcome.otp.verify', '验证')}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('otp'); setOtpToken(''); setError(''); }}
                  className="w-full h-12 text-on-surface-variant font-bold text-sm"
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
