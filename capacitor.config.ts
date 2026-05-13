import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.forestfamily.app',
  appName: '愿望卡',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  // iOS 平台配置
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#006e1c',
    scrollEnabled: true,
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: false
  },
  // Android 平台配置（补全，对齐 iOS 配置质量）
  android: {
    backgroundColor: '#006e1c',
    // 允许 WebView 混合内容（Capacitor 内部资源访问）
    allowMixedContent: false,
    // 捕获输入（避免键盘弹出时布局跳动）
    captureInput: true,
    // WebView 调试（由 MainActivity.kt 中 BuildConfig.DEBUG 控制）
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#006e1c',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      // 沉浸模式：false 保留状态栏，避免内容被顶部裁切
      splashImmersive: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
