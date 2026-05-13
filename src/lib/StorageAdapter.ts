/**
 * 存储适配器 —— 统一本地存储接口
 * 
 * 三端共用同一接口定义，各端自行实现：
 * - Web/Capacitor: localStorage
 * - 小程序: Taro.getStorageSync/setStorageSync
 */

// ==================== 类型定义 ====================

export interface IStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface IStorageSyncAdapter extends IStorageAdapter {
  /** 同步版本，用于初始化时不需要 async */
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): void;
}

// ==================== 本地缓存 Key 常量 ====================

export const STORAGE_KEYS = {
  // === 核心数据缓存（云端数据的本地镜像）===
  CACHE_MEMBERS: 'dl_cache_members',
  CACHE_TASKS: 'dl_cache_tasks',
  CACHE_HABITS: 'dl_cache_habits',
  CACHE_REWARDS: 'dl_cache_rewards',
  CACHE_PLANS: 'dl_cache_plans',
  CACHE_TRANSACTIONS: 'dl_cache_transactions',
  CACHE_AUDIT_LOGS: 'dl_cache_audit_logs',
  COMMUNITY_SHARE_DRAFTS: 'ff_community_share_drafts',
  COMMUNITY_CLOUD_TEMPLATE_CACHE: 'ff_community_cloud_template_cache',
  COMMUNITY_TEMPLATE_LIBRARY: 'ff_community_template_library',
  RECOMMENDATION_CONSENT: 'ff_recommendation_consent',
  RECOMMENDATION_EVENTS: 'ff_recommendation_events',
  COMMERCIAL_RESOURCE_CACHE: 'ff_commercial_resource_cache',
  PUBLIC_CALENDAR_SIGNALS: 'ff_public_calendar_signals',
  PUBLIC_CALENDAR_SOURCE_STATUS: 'ff_public_calendar_source_status',
  PUBLIC_CALENDAR_REMOTE_CACHE: 'ff_public_calendar_remote_cache',
  PUBLIC_CALENDAR_REGION: 'ff_public_calendar_region',
  ONBOARDING_PROFILE_ARCHIVES: 'ff_onboarding_profile_archives',
  GUEST_LOCAL_STATE: 'ff_guest_local_state',
  GUEST_LOCAL_PLANS: 'ff_guest_local_plans',

  // === 离线操作队列 ===
  SYNC_QUEUE: 'dl_sync_queue',

  // === 同步元数据 ===
  SYNC_META: 'dl_sync_meta',

  // === 设备信息 ===
  DEVICE_ID: 'dl_device_id',

  // === 用户会话 ===
  CURRENT_USER: 'currentUser',
  MEMBER_SESSION: 'ff_member_session',
  FAMILY_ID: 'familyId',
  GUEST_MODE: 'guestMode',
} as const;

// ==================== Web / Capacitor 实现 ====================

export class WebStorageAdapter implements IStorageSyncAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[WebStorage] setItem failed:', key, e);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  async getAllKeys(): Promise<string[]> {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch {}
  }

  // 同步版本
  getItemSync(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  setItemSync(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('[WebStorage] setItemSync failed:', key, e);
    }
  }

  removeItemSync(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

// ==================== 工厂函数：自动检测环境返回对应实现 ====================
let _cachedAdapter: IStorageSyncAdapter | null = null;

export function getStorageAdapter(): IStorageSyncAdapter {
  if (!_cachedAdapter) {
    _cachedAdapter = new WebStorageAdapter();
  }
  return _cachedAdapter;
}

/** JSON 安全读取 */
export async function storageGet<T>(adapter: IStorageAdapter, key: string, fallback: T): Promise<T> {
  const raw = await adapter.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

/** JSON 安全写入 */
export async function storageSet<T>(adapter: IStorageAdapter, key: string, value: T): Promise<void> {
  await adapter.setItem(key, JSON.stringify(value));
}

/** 同步版 JSON 安全读取 */
export function storageGetSync<T>(adapter: IStorageSyncAdapter, key: string, fallback: T): T {
  const raw = adapter.getItemSync(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

/** 同步版 JSON 安全写入 */
export function storageSetSync<T>(adapter: IStorageSyncAdapter, key: string, value: T): void {
  adapter.setItemSync(key, JSON.stringify(value));
}
