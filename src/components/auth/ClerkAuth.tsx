/**
 * Clerk 认证组件
 * 提供完整的登录、注册、用户管理功能
 * 支持 Web 端和移动端原生集成
 */

import React, { useEffect, useState } from 'react';
import { ClerkProvider, SignIn, SignUp, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useFamily } from '../../context/FamilyContext';
import { Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import ClerkAuthPlugin from '../../plugins/ClerkAuthPlugin';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// 检测是否在原生移动端环境
const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

// 认证状态同步组件
function AuthSync() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { setCurrentUser, setFamilyId } = useFamily();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user) return;
    
    // 同步 Clerk 用户到应用状态
    const syncUser = async () => {
      setSyncing(true);
      try {
        // 获取 Clerk session token
        const token = await getToken();
        
        // 移动端：保存 token 到原生层可访问的存储
        if (isNativePlatform() && token) {
          localStorage.setItem('__clerk_token', token);
          localStorage.setItem('__clerk_user', JSON.stringify(user));
        }
        
        // 设置当前用户
        setCurrentUser({
          id: user.id,
          name: user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || '用户',
          avatar: user.imageUrl || '👤',
          stars: 0,
          role: 'parent',
        }, 'account');
        
        // 从 metadata 获取 family_id
        const familyId = user.publicMetadata?.familyId as string;
        if (familyId) {
          setFamilyId(familyId);
        }
        
        // 导航到首页
        navigate('/', { replace: true });
      } catch (err) {
        console.error('[Clerk] 同步用户失败:', err);
      } finally {
        setSyncing(false);
      }
    };
    
    syncUser();
  }, [isLoaded, isSignedIn, user, setCurrentUser, setFamilyId, navigate, getToken]);

  if (syncing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return null;
}

// 移动端认证页面 - 使用原生 Clerk SDK
function MobileAuthPage({ type }: { type: 'sign-in' | 'sign-up' }) {
  const navigate = useNavigate();
  const { setCurrentUser, setFamilyId } = useFamily();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查原生端的认证状态
    const checkNativeAuth = async () => {
      try {
        const state = await ClerkAuthPlugin.getAuthState();
        if (state.isSignedIn && state.userId) {
          // 已登录，同步用户信息
          setCurrentUser({
            id: state.userId,
            name: state.name || '用户',
            avatar: '👤',
            stars: 0,
            role: 'parent',
          }, 'account');
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('[Clerk Native] 检查认证状态失败:', err);
      } finally {
        setLoading(false);
      }
    };

    checkNativeAuth();
  }, [navigate, setCurrentUser, setFamilyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-handwritten text-on-surface mb-4">
          {type === 'sign-in' ? '欢迎回来' : '创建账号'}
        </h1>
        <p className="text-on-surface-variant mb-8">
          请使用原生登录界面完成认证
        </p>
        <button
          onClick={() => navigate('/welcome')}
          className="text-primary underline"
        >
          返回欢迎页面
        </button>
      </div>
    </div>
  );
}

// 登录页面
export function ClerkSignIn() {
  const navigate = useNavigate();
  
  // 移动端使用原生认证
  if (isNativePlatform()) {
    return <MobileAuthPage type="sign-in" />;
  }
  
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-500 mb-4">未配置 Clerk API Key</p>
          <button 
            onClick={() => navigate('/welcome')}
            className="text-primary underline"
          >
            返回原登录页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <AuthSync />
        <div className="w-full max-w-md">
          <SignIn 
            routing="hash"
            signUpUrl="/#/sign-up"
            fallbackRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'bg-white shadow-xl rounded-[2rem] border border-outline-variant/10',
                headerTitle: 'text-2xl font-handwritten text-on-surface',
                headerSubtitle: 'text-on-surface-variant font-bold text-sm',
                formButtonPrimary: 'bg-primary text-white rounded-2xl font-black h-14',
                formFieldInput: 'bg-surface-container-low rounded-2xl border-2 border-transparent focus:border-primary/30',
                footerActionLink: 'text-primary font-bold',
                identityPreviewEditButton: 'text-primary',
                formFieldLabel: 'text-xs font-bold text-on-surface-variant',
              }
            }}
          />
        </div>
      </div>
    </ClerkProvider>
  );
}

// 注册页面
export function ClerkSignUp() {
  const navigate = useNavigate();
  
  // 移动端使用原生认证
  if (isNativePlatform()) {
    return <MobileAuthPage type="sign-up" />;
  }
  
  if (!CLERK_PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-500 mb-4">未配置 Clerk API Key</p>
          <button 
            onClick={() => navigate('/welcome')}
            className="text-primary underline"
          >
            返回原注册页面
          </button>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <AuthSync />
        <div className="w-full max-w-md">
          <SignUp 
            routing="hash"
            signInUrl="/#/sign-in"
            fallbackRedirectUrl="/"
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'bg-white shadow-xl rounded-[2rem] border border-outline-variant/10',
                headerTitle: 'text-2xl font-handwritten text-on-surface',
                headerSubtitle: 'text-on-surface-variant font-bold text-sm',
                formButtonPrimary: 'bg-primary text-white rounded-2xl font-black h-14',
                formFieldInput: 'bg-surface-container-low rounded-2xl border-2 border-transparent focus:border-primary/30',
                footerActionLink: 'text-primary font-bold',
                formFieldLabel: 'text-xs font-bold text-on-surface-variant',
              }
            }}
          />
        </div>
      </div>
    </ClerkProvider>
  );
}

// 用户按钮（用于导航栏）
export function ClerkUserButton() {
  // 移动端使用原生用户管理
  if (isNativePlatform()) {
    return null; // 移动端使用原生 UI
  }
  
  if (!CLERK_PUBLISHABLE_KEY) return null;
  
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <UserButton 
        afterSignOutUrl="/welcome"
        appearance={{
          elements: {
            avatarBox: 'w-10 h-10 rounded-full',
          }
        }}
      />
    </ClerkProvider>
  );
}

// 保护路由包装器
export function ClerkProtected({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (isNativePlatform()) {
        // 移动端：检查原生认证状态
        try {
          const state = await ClerkAuthPlugin.getAuthState();
          setIsAuthenticated(state.isSignedIn);
        } catch {
          setIsAuthenticated(false);
        }
      } else {
        // Web 端：使用 Clerk React hook
        // 这个逻辑在组件内部处理
      }
    };

    if (isNativePlatform()) {
      checkAuth();
    }
  }, [navigate]);

  // Web 端使用 Clerk hook
  if (!isNativePlatform()) {
    return <WebClerkProtected>{children}</WebClerkProtected>;
  }

  // 移动端等待认证检查
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate('/sign-in');
    return null;
  }

  return <>{children}</>;
}

// Web 端保护路由
function WebClerkProtected({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate('/sign-in');
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}
