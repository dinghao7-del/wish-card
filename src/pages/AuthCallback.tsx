import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import * as api from '../lib/api';
import { useFamily } from '../context/FamilyContext';
import { useTranslation } from 'react-i18next';

/**
 * 处理 Supabase 邮箱验证链接回调
 * 用户点击邮件中的验证链接后，Supabase 会重定向到此页面
 * URL 中会包含 access_token 和 refresh_token 等参数
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { setCurrentUser } = useFamily();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase 会在 URL hash 或 query params 中携带 token
        // getSession 会自动解析这些参数并建立 session
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

        if (sessionErr) {
          console.error('[AuthCallback] getSession error:', sessionErr);
          throw sessionErr;
        }

        if (!session?.user) {
          // 尝试从 URL hash 中手动解析（某些情况下 getSession 不一定能自动处理）
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token', { defaultValue: 'access token' });
          const refreshToken = hashParams.get('refresh_token', { defaultValue: 'refresh token' });
          const error = hashParams.get('error', { defaultValue: '错误' });
          const errorDescription = hashParams.get('error_description', { defaultValue: 'error description' });

          if (error) {
            throw new Error(errorDescription || error);
          }

          if (accessToken && refreshToken) {
            const { error: setSessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setSessionErr) throw setSessionErr;

            const { data: { session: newSession } } = await supabase.auth.getSession();
            if (newSession?.user) {
              await processUser(newSession.user.id, newSession.user.user_metadata?.nickname);
              return;
            }
          }

          // 也没有 hash params，检查 query params
          const queryParams = new URLSearchParams(window.location.search);
          const code = queryParams.get('code', 'Code de Vérification');
          if (code) {
            const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeErr) throw exchangeErr;

            const { data: { session: codeSession } } = await supabase.auth.getSession();
            if (codeSession?.user) {
              await processUser(codeSession.user.id, codeSession.user.user_metadata?.nickname);
              return;
            }
          }

          throw new Error(t('auth_callback.no_valid_info', '未找到有效的验证信息'));
        }

        await processUser(session.user.id, session.user.user_metadata?.nickname);
      } catch (err: any) {
        console.error('[AuthCallback] Error:', err);
        setStatus('error');
        setErrorMsg(err.message || t('auth_callback.verify_failed', '验证失败'));
      }
    };

    handleCallback();
  }, []);

  async function processUser(userId: string, nickname?: string) {
    try {
      // 检查是否已有成员记录
      const { data: existingMember } = await supabase
        .from('members')
        .select('*', { defaultValue: '*' })
        .eq('id', userId)
        .single();

      if (existingMember) {
        // 已有记录，直接登录
        setCurrentUser({
          id: existingMember.id,
          name: existingMember.name,
          avatar: existingMember.avatar || '👤',
          stars: existingMember.stars || 0,
          role: existingMember.role,
        });
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 1500);
        return;
      }

      // 新用户：创建家庭和成员
      const userNickname = nickname || t('auth_callback.default_parent', '家长');
      const family = await api.createFamily(t('auth_callback.family_name', '{0}的家庭').replace('{0}', userNickname));
      await supabase.from('members').insert({
        id: userId,
        family_id: family.id,
        name: userNickname,
        role: 'parent',
        avatar: '👨‍👩‍👧',
        password: null,
      });

      const { data: newMember } = await supabase
        .from('members')
        .select('*', { defaultValue: '*' })
        .eq('id', userId)
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

      setStatus('success');
      setTimeout(() => navigate('/', { replace: true }), 1500);
    } catch (err: any) {
      console.error('[AuthCallback] processUser error:', err);
      setStatus('error');
      setErrorMsg(err.message || t('auth_callback.create_user_failed', '创建用户数据失败'));
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-[2.5rem] p-10 shadow-xl max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={48} />
            <h2 className="text-xl font-black text-on-surface mb-2">{t('auth_callback.verifying', '正在验证...')}</h2>
            <p className="text-sm text-on-surface-variant">{t('auth_callback.please_wait', '请稍候，正在完成邮箱验证')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="mx-auto mb-4 text-green-500" size={48} />
            <h2 className="text-xl font-black text-on-surface mb-2">{t('auth_callback.verify_success', '验证成功！')}</h2>
            <p className="text-sm text-on-surface-variant">{t('auth_callback.redirecting', '正在跳转到首页...')}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 text-red-500" size={48} />
            <h2 className="text-xl font-black text-on-surface mb-2">{t('auth_callback.verify_failed_title', '验证失败')}</h2>
            <p className="text-sm text-red-500 mb-4">{errorMsg}</p>
            <button
              onClick={() => navigate('/welcome', { replace: true })}
              className="h-12 px-8 bg-primary text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all"
            >
              {t('auth_callback.back_to_login', '返回登录')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
