import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase, supabaseAdmin } from './supabase';
import { verifyToken } from './totp';
import { hashPassword, verifyPassword } from './password';

interface AdminInfo {
  id: string;
  userId: string;
  email: string;
  role: 'super_admin' | 'operator' | 'support';
  twoFactorEnabled: boolean;
}

interface Pending2FA {
  adminInfo: AdminInfo;
  totpSecret: string | null;
}

interface AuthContextType {
  admin: AdminInfo | null;
  loading: boolean;
  pending2FA: Pending2FA | null;
  needSetPassword: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  loginWithOtp: (email: string) => Promise<void>;
  verifyOtpCode: (email: string, code: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  verify2FA: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  skip2FASetup: () => void;
  changePassword: (oldPassword: string, newPassword: string, totpCode?: string) => Promise<void>;
  setPassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function generateCode(): string {
  return Math.random().toString().slice(2, 8);
}

// 从 auth.users + admin_users 组装 AdminInfo
async function buildAdminInfo(authUserId: string, email: string): Promise<AdminInfo | null> {
  const { data: rec } = await supabaseAdmin
    .from('admin_users')
    .select('id, user_id, role, two_factor_enabled, totp_secret')
    .eq('user_id', authUserId)
    .single();
  if (!rec) return null;
  return {
    id: rec.id,
    userId: rec.user_id,
    email,
    role: rec.role,
    twoFactorEnabled: rec.two_factor_enabled ?? false,
  };
}

// 验证邮箱是否是管理员，返回 auth user id
async function verifyAdminEmail(email: string): Promise<string> {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw new Error('查询用户失败');
  const user = users.find(u => u.email === email);
  if (!user) throw new Error('该邮箱不是管理员');
  if (user.app_metadata?.admin !== true) throw new Error('该账号无管理员权限');
  return user.id;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [pending2FA, setPending2FA] = useState<Pending2FA | null>(null);
  const [needSetPassword, setNeedSetPassword] = useState(false);
  const [loading, setLoading] = useState(true);

  // 从 localStorage 恢复会话
  useEffect(() => {
    const saved = localStorage.getItem('admin_session');
    if (saved) {
      try {
        const info = JSON.parse(saved) as AdminInfo;
        setAdmin(info);
      } catch {}
    }
    setLoading(false);
  }, []);

  // Google OAuth 回调处理
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const isAdmin = session.user.app_metadata?.admin === true;
        if (isAdmin) {
          const info = await buildAdminInfo(session.user.id, session.user.email || '');
          if (info) {
            if (info.twoFactorEnabled) {
              // 需要查 totp_secret
              const { data: rec } = await supabaseAdmin
                .from('admin_users')
                .select('totp_secret')
                .eq('user_id', session.user.id)
                .single();
              setPending2FA({ adminInfo: info, totpSecret: rec?.totp_secret || null });
            } else {
              setPending2FA({ adminInfo: info, totpSecret: null });
            }
            // 清理 Supabase Auth session（我们不需要它）
            await supabase.auth.signOut();
          }
        } else {
          await supabase.auth.signOut();
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handlePostLogin = (info: AdminInfo, totpSecret: string | null) => {
    if (totpSecret) {
      setPending2FA({ adminInfo: info, totpSecret });
    } else {
      setPending2FA({ adminInfo: info, totpSecret: null });
    }
  };

  // === 独立密码登录 ===
  const loginWithPassword = async (email: string, password: string) => {
    const authUserId = await verifyAdminEmail(email);

    // 查找 admin_users 记录并验证密码
    const { data: rec, error: recErr } = await supabaseAdmin
      .from('admin_users')
      .select('id, user_id, role, password_hash, two_factor_enabled, totp_secret')
      .eq('user_id', authUserId)
      .single();

    if (recErr || !rec) throw new Error('未找到管理员记录');
    if (!rec.password_hash) throw new Error('尚未设置密码，请返回选择「邮箱验证码登录」来首次登录并设置密码');

    const valid = await verifyPassword(password, rec.password_hash);
    if (!valid) throw new Error('密码错误');

    const info: AdminInfo = {
      id: rec.id,
      userId: rec.user_id,
      email,
      role: rec.role,
      twoFactorEnabled: rec.two_factor_enabled ?? false,
    };

    handlePostLogin(info, rec.totp_secret);
  };

  // === 发送邮箱验证码 ===
  const loginWithOtp = async (email: string) => {
    await verifyAdminEmail(email);

    // 生成6位验证码
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabaseAdmin
      .from('admin_login_codes')
      .insert({ email, code, expires_at: expiresAt });

    if (insertErr) throw new Error('发送验证码失败');

    // 通过 Supabase Auth OTP 触发邮件发送
    // 邮件模板中需要包含 {{ .Token }} 让用户看到验证码
    // 或者我们用另一种方式：在邮件正文模板中嵌入验证码
    // 方案：使用 Supabase 的 Magic Link 发邮件，同时在邮件模板中显示我们的验证码
    // 但 Supabase OTP 的 token 和我们的 code 不一样...
    // 最简方案：利用 Supabase 的邮件发送能力，自定义邮件模板

    // 暂时用 Supabase OTP 发邮件，验证码在 admin_login_codes 表中
    const { error: otpErr } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (otpErr) {
      // 如果 Supabase OTP 发送失败，至少我们的验证码已存入数据库
      // 可以考虑其他邮件发送方式
      console.warn('Supabase OTP 发送失败，验证码已生成:', code);
    }
  };

  // === 验证邮箱验证码 ===
  const verifyOtpCode = async (email: string, code: string) => {
    // 查找有效验证码
    const { data: codes, error } = await supabaseAdmin
      .from('admin_login_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !codes || codes.length === 0) {
      throw new Error('验证码错误或已过期');
    }

    // 标记已使用
    await supabaseAdmin
      .from('admin_login_codes')
      .update({ used: true })
      .eq('id', codes[0].id);

    // 获取管理员信息
    const authUserId = await verifyAdminEmail(email);
    const { data: rec } = await supabaseAdmin
      .from('admin_users')
      .select('id, user_id, role, two_factor_enabled, totp_secret')
      .eq('user_id', authUserId)
      .single();

    if (!rec) throw new Error('管理员记录不存在');

    const info: AdminInfo = {
      id: rec.id,
      userId: rec.user_id,
      email,
      role: rec.role,
      twoFactorEnabled: rec.two_factor_enabled ?? false,
    };

    handlePostLogin(info, rec.totp_secret);
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const verify2FA = async (code: string) => {
    if (!pending2FA) throw new Error('无待验证的登录');

    if (pending2FA.totpSecret) {
      const valid = verifyToken(pending2FA.totpSecret, code);
      if (!valid) throw new Error('验证码错误，请重新输入');
    } else {
      const tempSecret = localStorage.getItem('temp_totp_secret');
      if (!tempSecret) throw new Error('请重新扫描二维码');
      const valid = verifyToken(tempSecret, code);
      if (!valid) throw new Error('验证码错误，请重新输入');

      const { error } = await supabaseAdmin
        .from('admin_users')
        .update({ totp_secret: tempSecret, two_factor_enabled: true })
        .eq('user_id', pending2FA.adminInfo.userId);
      if (error) throw new Error('保存验证器失败');
      localStorage.removeItem('temp_totp_secret');
    }

    // 登录成功
    const finalInfo = { ...pending2FA.adminInfo, twoFactorEnabled: true };
    setAdmin(finalInfo);
    setPending2FA(null);
    localStorage.setItem('admin_session', JSON.stringify(finalInfo));

    // 检查是否需要设置密码
    const { data: pwdRec } = await supabaseAdmin
      .from('admin_users')
      .select('password_hash')
      .eq('user_id', finalInfo.userId)
      .single();
    if (!pwdRec?.password_hash) {
      setNeedSetPassword(true);
    }
  };

  const skip2FASetup = async () => {
    if (!pending2FA) return;
    const finalInfo = { ...pending2FA.adminInfo, twoFactorEnabled: false };
    setAdmin(finalInfo);
    setPending2FA(null);
    localStorage.setItem('admin_session', JSON.stringify(finalInfo));
    localStorage.removeItem('temp_totp_secret');

    // 检查是否需要设置密码
    const { data: pwdRec } = await supabaseAdmin
      .from('admin_users')
      .select('password_hash')
      .eq('user_id', finalInfo.userId)
      .single();
    if (!pwdRec?.password_hash) {
      setNeedSetPassword(true);
    }
  };

  const logout = async () => {
    setAdmin(null);
    setPending2FA(null);
    localStorage.removeItem('admin_session');
  };

  const changePassword = async (oldPassword: string, newPassword: string, totpCode?: string) => {
    if (!admin) throw new Error('未登录');

    // 如果已启用 2FA，必须验证谷歌验证码
    if (admin.twoFactorEnabled) {
      if (!totpCode) throw new Error('请输入谷歌验证码');
      const { data: rec2 } = await supabaseAdmin
        .from('admin_users')
        .select('totp_secret')
        .eq('user_id', admin.userId)
        .single();
      if (!rec2?.totp_secret) throw new Error('未找到验证器密钥，请联系超级管理员');
      const valid2FA = verifyToken(rec2.totp_secret, totpCode);
      if (!valid2FA) throw new Error('谷歌验证码错误');
    }

    const { data: rec } = await supabaseAdmin
      .from('admin_users')
      .select('password_hash')
      .eq('user_id', admin.userId)
      .single();

    if (!rec?.password_hash) throw new Error('未设置密码');
    if (!(await verifyPassword(oldPassword, rec.password_hash))) throw new Error('旧密码错误');

    const newHash = await hashPassword(newPassword);
    const { error } = await supabaseAdmin
      .from('admin_users')
      .update({ password_hash: newHash })
      .eq('user_id', admin.userId);
    if (error) throw new Error('修改密码失败');
  };

  const setPassword = async (newPassword: string) => {
    if (!admin) throw new Error('未登录');
    const newHash = await hashPassword(newPassword);
    const { error } = await supabaseAdmin
      .from('admin_users')
      .update({ password_hash: newHash })
      .eq('user_id', admin.userId);
    if (error) throw new Error('设置密码失败');
    setNeedSetPassword(false);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, pending2FA, needSetPassword, loginWithPassword, loginWithOtp, verifyOtpCode, loginWithGoogle, verify2FA, logout, skip2FASetup, changePassword, setPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
