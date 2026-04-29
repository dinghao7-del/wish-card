import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import './styles/ipad-responsive.css';
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

// iOS 状态栏适配
document.addEventListener('deviceready', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const capacitor = (window as any).Capacitor;
  if (capacitor?.getPlatform() === 'ios') {
    // iOS 特定初始化
    document.body.classList.add('ios-native');
  }
}, false);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
