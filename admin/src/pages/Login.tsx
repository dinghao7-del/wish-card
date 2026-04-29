import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { useNavigate } from 'react-router-dom';
import { Star, Mail, Lock, KeyRound, ArrowLeft, Shield, Smartphone } from 'lucide-react';
import { generateSecret, generateOtpAuthUri, generateQRCode } from '../lib/totp';

type LoginMode = 'select' | 'password' | 'otp';

export default function Login() {
  const [mode, setMode] = useState<LoginMode>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { admin, pending2FA, needSetPassword, loginWithPassword, loginWithOtp, verifyOtpCode, loginWithGoogle, verify2FA, skip2FASetup, setPassword: setAdminPassword } = useAuth();
  const navigate = useNavigate();

  // 2FA 设置相关
  const [twoFAPhase, setTwoFAPhase] = useState<'verify' | 'setup'>('verify');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [twoFACode, setTwoFACode] = useState('');

  // 设置密码相关
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [setPwdError, setSetPwdError] = useState('');
  const [setPwdLoading, setSetPwdLoading] = useState(false);

  // 如果已登录且不需要设置密码，跳转首页
  useEffect(() => {
    if (admin && !needSetPassword) navigate('/');
  }, [admin, needSetPassword, navigate]);

  // 当 pending2FA 变化时，判断是 setup 还是 verify
  useEffect(() => {
    if (pending2FA) {
      if (pending2FA.totpSecret) {
        setTwoFAPhase('verify');
      } else {
        // 未绑定 → 走 setup 流程
        setupNewTOTP();
        setTwoFAPhase('setup');
      }
    }
  }, [pending2FA]);

  const setupNewTOTP = async () => {
    const secret = generateSecret();
    localStorage.setItem('temp_totp_secret', secret);
    const uri = generateOtpAuthUri(pending2FA?.adminInfo.email || 'admin', secret);
    const dataUrl = await generateQRCode(uri);
    setQrDataUrl(dataUrl);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithPassword(email, password);
      // 登录成功后进入 2FA 流程（pending2FA 会被设置）
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithOtp(email);
      setOtpSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtpCode(email, otpCode);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google 登录失败');
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verify2FA(twoFACode);
      setTwoFACode('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '验证失败');
    } finally {
      setLoading(false);
    }
  };

  // ============ 设置密码界面 ============
  if (admin && needSetPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4">
              <KeyRound className="w-8 h-8 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">设置管理员密码</h1>
            <p className="text-gray-500 mt-2">首次登录需要设置后台独立密码</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {setPwdError && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{setPwdError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="至少6位"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="再次输入密码"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <button
              onClick={async () => {
                setSetPwdError('');
                if (newPwd.length < 6) { setSetPwdError('密码至少6位'); return; }
                if (newPwd !== confirmPwd) { setSetPwdError('两次密码不一致'); return; }
                try {
                  setSetPwdLoading(true);
                  await setAdminPassword(newPwd);
                  setNewPwd(''); setConfirmPwd('');
                } catch (err: unknown) {
                  setSetPwdError(err instanceof Error ? err.message : '设置失败');
                } finally {
                  setSetPwdLoading(false);
                }
              }}
              disabled={setPwdLoading}
              className="w-full py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {setPwdLoading ? '设置中...' : '确认设置'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ 2FA 二次验证界面 ============
  if (pending2FA) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {twoFAPhase === 'setup' ? '绑定安全验证器' : '二次验证'}
            </h1>
            <p className="text-gray-500 mt-2">
              {twoFAPhase === 'setup'
                ? '请使用 Google Authenticator 扫描二维码'
                : '请输入 Google Authenticator 中的验证码'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            {twoFAPhase === 'setup' ? (
              <>
                {/* 步骤1：扫描二维码 */}
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">步骤 1：扫描下方二维码</p>
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="TOTP QR Code" className="mx-auto rounded-lg border border-gray-200" />
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm text-gray-600 mb-3">步骤 2：输入验证器显示的6位数字</p>

                  <input
                    type="text"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6位数字验证码"
                    maxLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                  />

                  <button
                    onClick={handleVerify2FA}
                    disabled={loading || twoFACode.length < 6}
                    className="w-full mt-3 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    {loading ? '验证中...' : '绑定并登录'}
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <button
                    onClick={skip2FASetup}
                    className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    暂时跳过，下次再设置
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* 已绑定 → 直接输入验证码 */}
                <div className="text-center mb-2">
                  <Smartphone className="w-10 h-10 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">打开 Google Authenticator 输入验证码</p>
                </div>

                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6位数字验证码"
                  maxLength={6}
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                />

                <button
                  onClick={handleVerify2FA}
                  disabled={loading || twoFACode.length < 6}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  {loading ? '验证中...' : '验证登录'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ 登录方式选择界面 ============
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-4">
            <Star className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">愿望卡管理后台</h1>
          <p className="text-gray-500 mt-2">请使用管理员账号登录</p>
        </div>

        {/* 登录方式选择 */}
        {mode === 'select' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            {/* Google 登录 */}
            <button
              onClick={handleGoogleLogin}
              className="w-full py-3 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-3 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              使用 Google 账号登录
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-gray-400">或</span>
              </div>
            </div>

            {/* 邮箱验证码登录 */}
            <button
              onClick={() => { setMode('otp'); setError(''); }}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
            >
              <Mail className="w-5 h-5" />
              邮箱验证码登录
            </button>

            {/* 密码登录 */}
            <button
              onClick={() => { setMode('password'); setError(''); }}
              className="w-full py-3 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors text-gray-700"
            >
              <Lock className="w-5 h-5" />
              邮箱密码登录
            </button>
          </div>
        )}

        {/* 邮箱密码登录 */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <button
              type="button"
              onClick={() => { setMode('select'); setError(''); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> 返回
            </button>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              <Lock className="w-4 h-4" />
              {loading ? '登录中...' : '密码登录'}
            </button>
          </form>
        )}

        {/* 邮箱验证码登录 */}
        {mode === 'otp' && (
          !otpSent ? (
            <form onSubmit={handleSendOtp} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <button
                type="button"
                onClick={() => { setMode('select'); setError(''); setOtpSent(false); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> 返回
              </button>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">管理员邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">登录链接或验证码将发送到该邮箱</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <Mail className="w-4 h-4" />
                {loading ? '发送中...' : '发送验证码'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <button
                type="button"
                onClick={() => { setOtpSent(false); setError(''); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> 重新发送
              </button>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}

              <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm space-y-1">
                <p>登录邮件已发送至 <strong>{email}</strong></p>
                <p className="text-xs text-blue-600">点击邮件中的链接可直接登录，或在下方输入6位验证码</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">验证码</label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  placeholder="6位数字验证码"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                {loading ? '验证中...' : '验证登录'}
              </button>
            </form>
          )
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          仅限授权管理员访问 · 登录即表示同意使用条款
        </p>
      </div>
    </div>
  );
}
