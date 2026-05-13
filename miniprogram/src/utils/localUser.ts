import Taro from '@tarojs/taro';

// 本地存储的当前用户信息
const STORAGE_KEY = 'guest_user';

export interface LocalUser {
  id: string;
  name: string;
  role: string;
  stars: number;
  avatar: string;
  family_id?: string;
  darkMode?: boolean;
}

// 从存储中获取当前用户（兼容登录和游客模式）
export function getLocalUser(): LocalUser | null {
  try {
    const raw = Taro.getStorageSync(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
}

// 检查是否有本地用户（用于判断是否需要重定向到登录页）
export function hasLocalUser(): boolean {
  return getLocalUser() !== null;
}

// 安全获取 userId
export function getLocalUserId(): string | null {
  return getLocalUser()?.id || null;
}

// 设置本地用户信息（切换用户时使用）
export function setLocalUser(user: LocalUser): void {
  try {
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('[localUser] setLocalUser error:', e);
  }
}
