// ⚠️ Polyfill 必须在最顶部！Supabase SDK (vendors.js) 使用了 Headers/URL/Response
import './polyfills-mini';

import { useState } from 'react';
import { useLaunch } from '@tarojs/taro';
import Taro from '@tarojs/taro';
import { Provider } from 'react-redux';
import { configureStore } from './store';
import { supabase } from './utils/supabase';
import { isGuestMode } from './lib/guestData';
import PrivacyDialog from './components/privacy-dialog';
import './app.scss';

// 创建Redux store
const store = configureStore();

function App({ children }) {
  const [launchOptions, setLaunchOptions] = useState<any>(null);

  // 小程序启动时 — 路由守卫
  useLaunch(() => {
    const options = Taro.getLaunchOptionsSync();
    setLaunchOptions(options);

    // 获取用户信息
    Taro.getUserInfo({
      success: (res) => {
        store.dispatch({
          type: 'user/setUserInfo',
          payload: res.userInfo,
        });
      },
    });

    // ===== 路由守卫：检查登录状态 =====
    // 优先级：已登录 > 游客模式 > 跳转登录页
    (async () => {
      try {
        // 1. 检查 Supabase session
        let user: any = null;
        try {
          const { data: { session } } = await supabase.client.auth.getSession();
          user = session?.user || null;
        } catch {}

        if (user) {
          console.log('[App] 已登录用户:', user.id);
          return; // 已登录，留在当前页面
        }

        // 2. 检查游客模式
        if (isGuestMode()) {
          console.log('[App] 游客模式');
          return; // 游客模式，留在当前页面
        }

        // 3. 未登录且非游客 → 跳转登录页
        console.log('[App] 未登录，跳转登录页');
        // 延迟一帧确保 tabBar 初始化完成
        setTimeout(() => {
          Taro.redirectTo({ url: '/pages/login/index' });
        }, 100);
      } catch (e) {
        console.error('[App] 路由守卫错误:', e);
      }
    })();
  });

  return (
    <Provider store={store}>
      <PrivacyDialog />
      {children}
    </Provider>
  );
}

export default App;
