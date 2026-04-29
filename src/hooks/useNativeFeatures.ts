import { useState, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { isPlatform } from '@capacitor/core';

export interface CameraOptions {
  source?: 'camera' | 'gallery';
  allowEditing?: boolean;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function useNativeFeatures() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 拍照或从相册选择图片
   */
  const takePhoto = useCallback(async (options: CameraOptions = {}): Promise<string | null> => {
    if (!isPlatform('ios') && !isPlatform('android')) {
      // Web 环境使用原生 input
      return new Promise((resolve) => {
        const input = document.createElement('input', { defaultValue: 'input' });
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    }

    setIsLoading(true);
    setError(null);

    try {
      // 请求相机权限
      const permission = await Camera.requestPermissions();
      if (permission.camera !== 'granted') {
        throw new Error('需要相机权限');
      }

      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: options.allowEditing ?? false,
        resultType: CameraResultType.DataUrl,
        source: options.source === 'gallery' ? CameraSource.Photos : CameraSource.Camera,
        saveToGallery: options.source === 'camera'
      });

      return image.dataUrl || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : '拍照失败';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 获取当前位置
   */
  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    if (!isPlatform('ios') && !isPlatform('android')) {
      // Web 环境使用 Geolocation API
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          setError('浏览器不支持定位');
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
          },
          (err) => {
            setError(err.message);
            resolve(null);
          }
        );
      });
    }

    setIsLoading(true);
    setError(null);

    try {
      // 请求定位权限
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        throw new Error('需要定位权限');
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取位置失败';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 注册推送通知
   */
  const registerPushNotifications = useCallback(async (): Promise<string | null> => {
    if (!isPlatform('ios')) {
      console.log('推送通知仅支持 iOS/Android');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 请求推送权限
      const result = await PushNotifications.requestPermissions();
      if (result.receive !== 'granted') {
        throw new Error('需要推送通知权限');
      }

      // 注册设备
      await PushNotifications.register();

      // 监听注册成功事件
      return new Promise((resolve) => {
        PushNotifications.addListener('registration', (token) => {
          console.log('推送注册成功:', token.value);
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (err) => {
          setError(err.error);
          resolve(null);
        });

        // 监听通知接收
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('收到推送通知:', notification);
        });

        // 监听通知点击
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('点击推送通知:', action);
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册推送失败';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 检查并请求所有必要权限
   */
  const checkAndRequestPermissions = useCallback(async () => {
    const permissions: Record<string, boolean> = {};

    if (isPlatform('ios') || isPlatform('android')) {
      // 相机权限
      try {
        const cameraPerm = await Camera.checkPermissions();
        permissions.camera = cameraPerm.camera === 'granted';
      } catch {
        permissions.camera = false;
      }

      // 定位权限
      try {
        const locationPerm = await Geolocation.checkPermissions();
        permissions.location = locationPerm.location === 'granted';
      } catch {
        permissions.location = false;
      }
    }

    return permissions;
  }, []);

  return {
    isLoading,
    error,
    takePhoto,
    getCurrentLocation,
    registerPushNotifications,
    checkAndRequestPermissions,
    isNative: isPlatform('ios') || isPlatform('android')
  };
}
