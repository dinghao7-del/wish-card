/**
 * 同步引擎 (SyncEngine) — 小程序端
 * 
 * 与 Web 端逻辑完全一致，仅底层存储和 fetch 适配不同：
 * - 存储使用 TaroStorageAdapter
 * - HTTP 使用 wx.request 适配的 supabase client
 * 
 * API 签名与 Web 端 SyncEngine 完全一致，方便统一调用。
 */

import { IStorageAdapter, storageGet, storageSet } from './StorageAdapter';
import { supabase } from '../utils/supabase';

// ==================== 类型定义 ====================

export type SyncOperationAction = 'insert' | 'update' | 'delete';
export type SyncOperationStatus = 'pending' | 'syncing' | 'done' | 'failed';

export interface SyncOperation {
  id: string;
  table: string;
  action: SyncOperationAction;
  payload: Record<string, any>;
  familyId: string;
  createdAt: number;
  retryCount: number;
  status: SyncOperationStatus;
  error?: string;
  serverId?: string;
}

export interface SyncMetadata {
  familyId: string;
  lastSyncAt: number;
  lastPullAt: number;
  deviceId: string;
  pendingCount: number;
}

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  failed: number;
  skipped: number;
  conflicts: number;
  durationMs: number;
  error?: string;
}

export type SyncStatusListener = (status: SyncStatus) => void;

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

// ==================== 常量 ====================

const MAX_RETRY = 3;
const SYNC_QUEUE_MAX = 500;
const DONE_RETENTION = 100;

const SYNC_TABLES = ['tasks', 'members', 'rewards', 'habits'] as const;

const MERGE_FIELDS: Record<string, 'max' | 'forward'> = {
  stars: 'max',
  current_count: 'max',
  status: 'forward',
};

const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  in_progress: 1,
  reviewing: 2,
  completed: 3,
  expired: -1,
};

// 本地 Key 映射
const SKEYS = {
  SYNC_QUEUE: 'dl_sync_queue',
  SYNC_META: 'dl_sync_meta',
  CACHE_MEMBERS: 'dl_cache_members',
  CACHE_TASKS: 'dl_cache_tasks',
  CACHE_HABITS: 'dl_cache_habits',
  CACHE_REWARDS: 'dl_cache_rewards',
  DEVICE_ID: 'dl_device_id',
};

// ==================== 工具函数 ====================

function generateOpId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateDeviceId(storage: IStorageAdapter): string {
  let id = '';
  try {
    const raw = Taro?.getStorageSync?.(SKEYS.DEVICE_ID);
    id = raw || '';
  } catch {}
  
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try { Taro?.setStorageSync?.(SKEYS.DEVICE_ID, id); } catch {}
  }
  return id;
}

// 引入 Taro 用于设备ID
import Taro from '@tarojs/taro';

// ==================== 主类 ====================

export class SyncEngine {
  private storage: IStorageAdapter;
  private familyId: string;
  private deviceId: string;
  private _statusListeners: Set<SyncStatusListener> = new Set();
  private _currentStatus: SyncStatus = {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  };

  constructor(storage: IStorageAdapter, familyId: string) {
    this.storage = storage;
    this.familyId = familyId;
    this.deviceId = generateDeviceId(storage);
  }

  // ==================== 公共 API ====================

  async sync(forcePull = false): Promise<SyncResult> {
    const startTime = Date.now();
    this._updateStatus({ isSyncing: true });

    if (!this._isOnline()) {
      this._updateStatus({ isSyncing: false, pendingCount: await this.getPendingCount() });
      return {
        success: false, pushed: 0, pulled: 0, failed: 0,
        skipped: await this.getPendingCount(), conflicts: 0,
        durationMs: Date.now() - startTime, error: 'OFFLINE',
      };
    }

    let pushed = 0, pulled = 0, failed = 0, conflicts = 0;

    try {
      const pushResult = await this._pushQueue();
      pushed = pushResult.pushed; failed = pushResult.failed;

      const pullResult = await this._pullRemote(forcePull);
      pulled = pullResult.pulled; conflicts = pullResult.conflicts;

      await this._updateMetadata();
      await this._cleanupDoneOps();

      this._updateStatus({ isSyncing: false, pendingCount: await this.getPendingCount(), lastSyncAt: Date.now(), lastError: null });

      return { success: true, pushed, pulled, failed, skipped: 0, conflicts, durationMs: Date.now() - startTime };
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error('[SyncEngine] Sync failed:', errorMsg);
      this._updateStatus({ isSyncing: false, lastSyncAt: null, lastError: errorMsg });
      return { success: false, pushed, pulled, failed: failed + 1, skipped: 0, conflicts, durationMs: Date.now() - startTime, error: errorMsg };
    }
  }

  async enqueue(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> {
    const queue = await this._getQueue();

    if (queue.length >= SYNC_QUEUE_MAX) {
      const firstPendingIdx = queue.findIndex(o => o.status === 'pending');
      if (firstPendingIdx >= 0) queue.splice(firstPendingIdx, 1);
    }

    const op: SyncOperation = {
      ...operation, id: generateOpId(), createdAt: Date.now(),
      retryCount: 0, status: 'pending',
    };

    queue.push(op);
    await this._saveQueue(queue);
    this._updateStatus({ pendingCount: queue.filter(o => o.status === 'pending').length });
    return op.id;
  }

  getStatus(): SyncStatus { return { ...this._currentStatus }; }
  async getPendingCount(): Promise<number> { return (await this._getQueue()).filter(o => o.status === 'pending').length; }
  async getPendingOperations(): Promise<SyncOperation[]> { return (await this._getQueue()).filter(o => o.status === 'pending'); }
  onStatusChange(listener: SyncStatusListener): () => void { this._statusListeners.add(listener); return () => this._statusListeners.delete(listener); }
  async clearAll(): Promise<void> {
    await this.storage.removeItem(SKEYS.SYNC_QUEUE);
    await this.storage.removeItem(SKEYS.SYNC_META);
    await this.storage.removeItem(SKEYS.CACHE_MEMBERS);
    await this.storage.removeItem(SKEYS.CACHE_TASKS);
    await this.storage.removeItem(SKEYS.CACHE_HABITS);
    await this.storage.removeItem(SKEYS.CACHE_REWARDS);
  }

  // ==================== 内部：PUSH ====================
  private async _pushQueue(): Promise<{ pushed: number; failed: number }> {
    const queue = await this._getQueue();
    const pending = queue.filter(o => o.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
    let pushed = 0, failed = 0;

    for (const op of pending) {
      if (!this._isOnline()) break;

      op.status = 'syncing'; await this._saveQueue(queue);

      try {
        const serverId = await this._executeOperation(op);
        op.status = 'done'; op.serverId = serverId || op.payload.id;
        pushed++;
      } catch (error: any) {
        op.retryCount++;
        if (op.retryCount >= MAX_RETRY) {
          op.status = 'failed'; op.error = error?.message || String(error); failed++;
        } else {
          op.status = 'pending';
        }
      }
      await this._saveQueue(queue);
    }

    return { pushed, failed };
  }

  private async _executeOperation(op: SyncOperation): Promise<string | undefined> {
    const { table, action, payload } = op;
    switch (action) {
      case 'insert': {
        const { data, error } = await supabase.from(table).insert(this._preparePayload(table, payload)).select('id').single();
        if (error) throw error;
        return data?.id;
      }
      case 'update': {
        const { error } = await supabase.from(table).update(this._preparePayload(table, payload)).eq('id', payload.id);
        if (error) throw error;
        return payload.id;
      }
      case 'delete': {
        const { error } = await supabase.from(table).delete().eq('id', payload.id);
        if (error) throw error;
        return undefined;
      }
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  private _preparePayload(table: string, payload: Record<string, any>): Record<string, any> {
    const cleaned = { ...payload };
    delete cleaned.localId; delete cleaned._synced; delete cleaned._version;
    if (!cleaned.family_id && table !== 'star_transactions') cleaned.family_id = this.familyId;
    return cleaned;
  }

  // ==================== 内部：PULL ====================
  private async _pullRemote(forcePull: boolean): Promise<{ pulled: number; conflicts: number }> {
    const meta = await this._getMetadata();
    let pulled = 0, conflicts = 0;

    for (const table of SYNC_TABLES) {
      try {
        let query = supabase.from(table).select('*').eq('family_id', this.familyId);
        if (!forcePull && meta.lastSyncAt > 0) {
          query = query.gt('updated_at', new Date(meta.lastSyncAt).toISOString());
        }
        const { data, error } = await query.order('updated_at', { ascending: true });
        if (error || !data || data.length === 0) continue;

        const mergeResult = await this._mergeToLocal(table, data);
        pulled += data.length; conflicts += mergeResult.conflicts;
      } catch (e: any) {
        console.warn(`[SyncEngine] Pull ${table} error:`, e.message);
      }
    }
    return { pulled, conflicts };
  }

  private async _mergeToLocal(table: string, remoteData: any[]): Promise<{ conflicts: number }> {
    const cacheKey = this._getCacheKey(table);
    const localData: any[] = await storageGet(this.storage, cacheKey, []);
    let conflicts = 0;
    const localMap = new Map(localData.map(item => [item.id, item]));

    for (const remote of remoteData) {
      const local = localMap.get(remote.id);
      if (!local) {
        localData.push(remote);
      } else if (remote.updated_at > local.updated_at) {
        if (this._needsMerge(local, remote)) {
          const merged = this._resolveConflict(table, local, remote);
          const idx = localData.findIndex(item => item.id === remote.id);
          if (idx >= 0) localData[idx] = merged;
          conflicts++;
        } else {
          const idx = localData.findIndex(item => item.id === remote.id);
          if (idx >= 0) localData[idx] = remote;
        }
      }
    }

    await storageSet(this.storage, cacheKey, localData);
    return { conflicts };
  }

  private _needsMerge(local: any, remote: any): boolean {
    for (const field of Object.keys(MERGE_FIELDS)) {
      if (local[field] !== undefined && remote[field] !== undefined && local[field] !== remote[field]) return true;
    }
    return false;
  }

  private _resolveConflict(_table: string, local: any, remote: any): any {
    const merged = { ...remote };
    for (const field of Object.keys(MERGE_FIELDS)) {
      if (local[field] !== undefined && remote[field] !== undefined) {
        const strategy = MERGE_FIELDS[field];
        if (strategy === 'max') merged[field] = Math.max(local[field], remote[field]);
        else if (strategy === 'forward') {
          const lp = STATUS_PRIORITY[local[field]] ?? 0;
          const rp = STATUS_PRIORITY[remote[field]] ?? 0;
          merged[field] = rp >= lp ? remote[field] : local[field];
        }
      }
    }
    return merged;
  }

  // ==================== 内部：元数据 & 队列管理 ====================
  private async _getQueue(): Promise<SyncOperation[]> { return storageGet<SyncOperation[]>(this.storage, SKEYS.SYNC_QUEUE, []); }
  private async _saveQueue(queue: SyncOperation[]): Promise<void> { await storageSet(this.storage, SKEYS.SYNC_QUEUE, queue); }
  private async _getMetadata(): Promise<SyncMetadata> {
    const defaultMeta: SyncMetadata = { familyId: this.familyId, lastSyncAt: 0, lastPullAt: 0, deviceId: this.deviceId, pendingCount: 0 };
    return storageGet<SyncMetadata>(this.storage, SKEYS.SYNC_META, defaultMeta);
  }
  private async _updateMetadata(): Promise<void> {
    const meta = await this._getMetadata(); meta.lastSyncAt = Date.now(); meta.pendingCount = await this.getPendingCount();
    await storageSet(this.storage, SKEYS.SYNC_META, meta);
  }
  private async _cleanupDoneOps(): Promise<void> {
    const queue = await this._getQueue();
    const done = queue.filter(o => o.status === 'done');
    if (done.length > DONE_RETENTION) {
      const doneIds = new Set(done.slice(0, -DONE_RETENTION).map(o => o.id));
      await this._saveQueue(queue.filter(o => !doneIds.has(o.id)));
    }
  }

  private _getCacheKey(table: string): string {
    return ({ members: SKEYS.CACHE_MEMBERS, tasks: SKEYS.CACHE_TASKS, habits: SKEYS.CACHE_HABITS, rewards: SKEYS.CACHE_REWARDS } as Record<string, string>)[table] || `dl_cache_${table}`;
  }

  private _isOnline(): boolean { return true; /* 小程序默认有网，由 NetworkMonitor 补充 */ }
  private _updateStatus(partial: Partial<SyncStatus>) {
    this._currentStatus = { ...this._currentStatus, ...partial };
    this._statusListeners.forEach(cb => { try { cb(this._currentStatus); } catch {} });
  }
}
