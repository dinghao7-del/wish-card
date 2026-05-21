// ⚠️ Polyfill 必须在最顶部！Supabase SDK (vendors.js) 使用了 Headers/URL/Response
import './polyfills-mini';

import { useState } from 'react';
import { useLaunch } from '@tarojs/taro';
import Taro from '@tarojs/taro';
import { Provider } from 'react-redux';
import { configureStore } from './store';
import { isGuestMode } from './lib/guestData';
import { hasLocalUser } from './utils/localUser';
import PrivacyDialog from './components/privacy-dialog';
import './app.scss';

// 创建Redux store
const store = configureStore();
const SUPABASE_AUTH_STORAGE_KEY = 'sb-qdiuufuoleharmjfarzr-auth-token';

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
        // 1. 本地/游客数据优先，避免小程序调试环境被 Supabase Realtime 初始化拦住
        if (hasLocalUser() || isGuestMode()) {
          console.log('[App] 本地体验模式');
          return;
        }

        const authToken = Taro.getStorageSync(SUPABASE_AUTH_STORAGE_KEY);
        if (!authToken) {
          console.log('[App] 无远程登录凭证，跳转登录页');
          setTimeout(() => {
            Taro.reLaunch({ url: '/pages/login/index' });
          }, 100);
          return;
        }

        // 2. 远程账号不在启动阶段做网络校验。
        // 微信开发者工具偶发 WebSocket/runtime timeout，启动页必须先可用，
        // 真实账号数据由各业务页按需读取并处理失败态。
        console.log('[App] 检测到远程登录凭证，保持当前页面');
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
