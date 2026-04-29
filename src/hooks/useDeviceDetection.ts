import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isIPad: boolean;
  isIPhone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
  isMultiWindow: boolean;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isIPad: false,
    isIPhone: false,
    isIOS: false,
    isAndroid: false,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    orientation: 'portrait',
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    isMultiWindow: false
  });

  useEffect(() => {
    const detectDevice = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // iOS 设备检测
      const isIPad = /iPad/.test(ua) || 
        (/Macintosh/.test(ua) && 'ontouchend' in document);
      const isIPhone = /iPhone/.test(ua);
      const isIOS = isIPad || isIPhone || /iPod/.test(ua);
      
      // Android 检测
      const isAndroid = /Android/.test(ua);
      
      // 设备类型
      const isTablet = isIPad || (isAndroid && !/Mobile/.test(ua)) || width >= 768;
      const isMobile = (isIOS || isAndroid) && !isTablet;
      const isDesktop = !isIOS && !isAndroid;
      
      // 方向
      const orientation = width > height ? 'landscape' : 'portrait';
      
      // 多窗口检测 (iPad 分屏)
      const isMultiWindow = isIPad && width < 1024 && width > 320;

      setDeviceInfo({
        isIPad,
        isIPhone,
        isIOS,
        isAndroid,
        isMobile,
        isTablet,
        isDesktop,
        orientation,
        screenWidth: width,
        screenHeight: height,
        isMultiWindow
      });
    };

    detectDevice();

    // 监听尺寸变化
    const handleResize = () => {
      detectDevice();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}

// 辅助函数：根据设备类型返回样式类名
export function getDeviceClasses(deviceInfo: DeviceInfo): string {
  const classes: string[] = [];
  
  if (deviceInfo.isIPad) classes.push('device-ipad');
  if (deviceInfo.isIPhone) classes.push('device-iphone');
  if (deviceInfo.isIOS) classes.push('device-ios');
  if (deviceInfo.isAndroid) classes.push('device-android');
  if (deviceInfo.isTablet) classes.push('device-tablet');
  if (deviceInfo.isMobile) classes.push('device-mobile');
  if (deviceInfo.isDesktop) classes.push('device-desktop');
  classes.push(`orientation-${deviceInfo.orientation}`);
  if (deviceInfo.isMultiWindow) classes.push('multi-window');
  
  return classes.join(' ');
}
