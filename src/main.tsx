import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './styles/ipad-responsive.css';
import './styles/android-adaptive.css';
import './i18n';

// 注册 PWA Elements (Capacitor 相机等组件)
defineCustomElements(window);

// PWA Service Worker 注册 (仅在 Web 环境)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if ('serviceWorker' in navigator && !(window as any).Capacitor) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// 平台适配：注入平台类名，激活对应 CSS 规则
function applyPlatformClass() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capacitor = (window as any).Capacitor;
  const platform = capacitor?.getPlatform?.();
  if (platform === 'ios') {
    document.body.classList.add('ios-native');
  } else if (platform === 'android') {
    document.body.classList.add('android-native');
    // 强制 HTML 字体基准，防止 MIUI/EMUI 等系统字体缩放影响布局
    document.documentElement.style.setProperty('font-size', '16px', 'important');
  }
}

// deviceready 事件（Capacitor 原生环境）
document.addEventListener('deviceready', applyPlatformClass, false);

// 也在 DOMContentLoaded 时尝试（Capacitor 有时不触发 deviceready）
document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capacitor = (window as any).Capacitor;
  if (capacitor?.getPlatform) {
    applyPlatformClass();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
