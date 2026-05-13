/**
 * 存储适配器 — 小程序端 (Taro Storage)
 * 
 * 使用 Taro.getStorageSync / setStorageSync 替代 localStorage
 * 接口定义与 Web 端完全一致
 */

import Taro from '@tarojs/taro';

// ==================== 类型定义 ====================

export interface IStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  clear(): Promise<void>;
}

export interface IStorageSyncAdapter extends IStorageAdapter {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): void;
}

// ==================== 本地缓存 Key 常量 ====================

export const STORAGE_KEYS = {
  CACHE_MEMBERS: 'dl_cache_members',
  CACHE_TASKS: 'dl_cache_tasks',
  CACHE_HABITS: 'dl_cache_habits',
  CACHE_REWARDS: 'dl_cache_rewards',
  CACHE_TRANSACTIONS: 'dl_cache_transactions',
  SYNC_QUEUE: 'dl_sync_queue',
  SYNC_META: 'dl_sync_meta',
  DEVICE_ID: 'dl_device_id',
} as const;

// ==================== 小程序 Taro Storage 实现 ====================

export class TaroStorageAdapter implements IStorageSyncAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      const val = Taro.getStorageSync(key);
      return val !== '' && val !== undefined ? String(val) : null;
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      Taro.setStorageSync(key, value);
    } catch (e) {
      console.warn('[TaroStorage] setItem failed:', key, e);
    }
  }

  async removeItem(key: string): Promise<void> {
    try { Taro.removeStorageSync(key); } catch {}
  }

  async getAllKeys(): Promise<string[]> {
    try {
      const info = Taro.getStorageInfoSync();
      return info.keys || [];
    } catch {
      return [];
    }
  }

  async clear(): Promise<void> {
    try { Taro.clearStorageSync(); } catch {}
  }

  // 同步版本（小程序原生支持同步API）
  getItemSync(key: string): string | null {
    try {
      const val = Taro.getStorageSync(key);
      return val !== '' && val !== undefined ? String(val) : null;
    } catch {
      return null;
    }
  }

  setItemSync(key: string, value: string): void {
    try { Taro.setStorageSync(key, value); } catch (e) {
      console.warn('[TaroStorage] setItemSync failed:', key, e);
    }
  }

  removeItemSync(key: string): void {
    try { Taro.removeStorageSync(key); } catch {}
  }
}

// ==================== 工厂函数 ====================
let _cachedAdapter: IStorageSyncAdapter | null = null;

export function getStorageAdapter(): IStorageSyncAdapter {
  if (!_cachedAdapter) _cachedAdapter = new TaroStorageAdapter();
  return _cachedAdapter;
}

export async function storageGet<T>(adapter: IStorageAdapter, key: string, fallback: T): Promise<T> {
  const raw = await adapter.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export async function storageSet<T>(adapter: IStorageAdapter, key: string, value: T): Promise<void> {
  await adapter.setItem(key, JSON.stringify(value));
}

export function storageGetSync<T>(adapter: IStorageSyncAdapter, key: string, fallback: T): T {
  const raw = adapter.getItemSync(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export function storageSetSync<T>(adapter: IStorageSyncAdapter, key: string, value: T): void {
  adapter.setItemSync(key, JSON.stringify(value));
}
