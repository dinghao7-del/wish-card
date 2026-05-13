/**
 * 同步引擎 (SyncEngine) — Web 端
 * 
 * 职责：
 * 1. PUSH: 将离线队列中的操作上传到 Supabase
 * 2. PULL: 将云端变更拉取到本地
 * 3. CONFLICT: 解决多端编辑冲突
 * 
 * 使用方式：
 *   const engine = new SyncEngine(storageAdapter, familyId);
 *   await engine.sync();  // 执行一次完整同步
 */

import { IStorageAdapter, STORAGE_KEYS, storageGet, storageSet, storageGetSync, storageSetSync } from './StorageAdapter';
import supabase from './supabase';

// ==================== 类型定义 ====================

export type SyncOperationAction = 'insert' | 'update' | 'delete';
export type SyncOperationStatus = 'pending' | 'syncing' | 'done' | 'failed';

export interface SyncOperation {
  id: string;                    // 唯一操作ID (uuid)
  table: string;                  // 目标表名
  action: SyncOperationAction;
  payload: Record<string, any>;   // 完整数据载荷
  familyId: string;
  actorMemberId?: string;          // 家庭内部实际操作者
  createdAt: number;              // 创建时间戳
  retryCount: number;
  status: SyncOperationStatus;
  error?: string;
  /** 服务端返回的真实ID（本地临时ID映射） */
  serverId?: string;
}

export interface SyncMetadata {
  familyId: string;
  lastSyncAt: number;             // 上次成功同步的服务器时间
  lastPullAt: number;             // 上次拉取的本地时间
  deviceId: string;
  pendingCount: number;
}

export interface SyncResult {
  success: boolean;
  pushed: number;                 // 成功上传数
  pulled: number;                 // 新拉取数
  failed: number;                 // 失败数
  skipped: number;                // 跳过数（离线）
  conflicts: number;              // 冲突数
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
const SYNC_QUEUE_MAX = 500;       // 队列上限
const DONE_RETENTION = 100;        // 保留最近N条已完成记录做日志

// 支持同步的表名白名单
const SYNC_TABLES = ['plans', 'tasks', 'members', 'rewards', 'habits', 'star_transactions'] as const;

const TABLE_SYNC_TIME_FIELD: Record<string, string> = {
  star_transactions: 'created_at',
};

// 需要特殊冲突处理的字段（星星只增不减、状态只进不退）
const MERGE_FIELDS: Record<string, 'max' | 'forward'> = {
  stars: 'max',           // 星星取较大值
  current_count: 'max',   // 打卡次数取较大值
  status: 'forward',      // 状态按优先级只向前推进
};

// 状态优先级（数字越大越靠后）
const STATUS_PRIORITY: Record<string, number> = {
  pending: 0,
  in_progress: 1,
  reviewing: 2,
  completed: 3,
  expired: -1,
};

// ==================== 工具函数 ====================

function generateOpId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateDeviceId(): string {
  let id = '';
  try {
    id = localStorage.getItem(STORAGE_KEYS.DEVICE_ID) || '';
  } catch {}
  if (!id) {
    id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try { localStorage.setItem(STORAGE_KEYS.DEVICE_ID, id); } catch {}
  }
  return id;
}

export function isMissingTaskTimeColumnError(error: any): boolean {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`;
  const code = error?.code || '';
  return (code === '42703' || code === 'PGRST204' || /schema cache|column/i.test(message))
    && /(start_time|deadline)/i.test(message);
}

export function stripTaskTimeFieldsForLegacySchema(payload: Record<string, any>): Record<string, any> {
  const cleaned = { ...payload };
  delete cleaned.start_time;
  delete cleaned.deadline;
  return cleaned;
}

// ==================== 主类 ====================

export class SyncEngine {
  private storage: IStorageAdapter;
  private familyId: string;
  private deviceId: string;
  private _statusListeners: Set<SyncStatusListener> = new Set();
  private _currentStatus: SyncStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  };

  constructor(storage: IStorageAdapter, familyId: string) {
    this.storage = storage;
    this.familyId = familyId;
    this.deviceId = generateDeviceId();
    this._currentStatus.isOnline = this._isOnline();
  }

  // ==================== 公共 API ====================

  /** 执行完整同步（PUSH + PULL） */
  async sync(forcePull = false): Promise<SyncResult> {
    const startTime = Date.now();
    this._updateStatus({ isOnline: this._isOnline(), isSyncing: true });

    // 检查在线状态
    if (!this._isOnline()) {
      this._updateStatus({
        isOnline: false,
        isSyncing: false,
        pendingCount: await this.getPendingCount(),
      });
      return {
        success: false,
        pushed: 0,
        pulled: 0,
        failed: 0,
        skipped: await this.getPendingCount(),
        conflicts: 0,
        durationMs: Date.now() - startTime,
        error: 'OFFLINE',
      };
    }

    let pushed = 0;
    let pulled = 0;
    let failed = 0;
    let conflicts = 0;

    try {
      // Phase 1: PUSH 离线队列
      const pushResult = await this._pushQueue();
      pushed = pushResult.pushed;
      failed = pushResult.failed;

      // Phase 2: PULL 云端变更
      const pullResult = await this._pullRemote(forcePull);
      pulled = pullResult.pulled;
      conflicts = pullResult.conflicts;

      // Phase 3: 更新元数据
      await this._updateMetadata();

      // 清理旧记录
      await this._cleanupDoneOps();

      this._updateStatus({
        isSyncing: false,
        pendingCount: await this.getPendingCount(),
        lastSyncAt: Date.now(),
        lastError: null,
      });

      return {
        success: true,
        pushed,
        pulled,
        failed,
        skipped: 0,
        conflicts,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      console.error('[SyncEngine] Sync failed:', errorMsg);

      this._updateStatus({
        isSyncing: false,
        lastSyncAt: null,
        lastError: errorMsg,
      });

      return {
        success: false,
        pushed,
        pulled,
        failed: failed + 1,
        skipped: 0,
        conflicts,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      };
    }
  }

  /** 添加一个待同步操作到队列 */
  async enqueue(operation: Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount' | 'status'>): Promise<string> {
    const queue = await this._getQueue();

    // 队列上限保护
    if (queue.length >= SYNC_QUEUE_MAX) {
      console.warn('[SyncEngine] Queue full, dropping oldest pending op');
      const firstPendingIdx = queue.findIndex(op => op.status === 'pending');
      if (firstPendingIdx >= 0) queue.splice(firstPendingIdx, 1);
    }

    const op: SyncOperation = {
      ...operation,
      id: generateOpId(),
      createdAt: Date.now(),
      retryCount: 0,
      status: 'pending',
    };

    queue.push(op);
    await this._saveQueue(queue);

    this._updateStatus({
      isOnline: this._isOnline(),
      pendingCount: queue.filter(o => o.status === 'pending').length,
    });
    console.log(`[SyncEngine] Enqueued: ${op.action} on ${op.table} (${op.id})`);

    return op.id;
  }

  /** 获取当前同步状态 */
  getStatus(): SyncStatus {
    return { ...this._currentStatus };
  }

  /** 由外部网络监听器推送最新在线状态，保证 UI 能立即响应断网/联网 */
  setOnlineStatus(isOnline: boolean): void {
    this._updateStatus({
      isOnline,
      lastError: isOnline ? this._currentStatus.lastError : null,
    });
  }

  /** 获取待同步数量 */
  async getPendingCount(): Promise<number> {
    const queue = await this._getQueue();
    return queue.filter(o => o.status === 'pending').length;
  }

  /** 获取所有待同步操作（调试用） */
  async getPendingOperations(): Promise<SyncOperation[]> {
    const queue = await this._getQueue();
    return queue.filter(o => o.status === 'pending');
  }

  /** 订阅状态变化 */
  onStatusChange(listener: SyncStatusListener): () => void {
    this._statusListeners.add(listener);
    return () => this._statusListeners.delete(listener);
  }

  /** 清除所有本地数据和队列 */
  async clearAll(): Promise<void> {
    await this.storage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
    await this.storage.removeItem(STORAGE_KEYS.SYNC_META);
    await this.storage.removeItem(STORAGE_KEYS.CACHE_MEMBERS);
    await this.storage.removeItem(STORAGE_KEYS.CACHE_PLANS);
    await this.storage.removeItem(STORAGE_KEYS.CACHE_TASKS);
    await this.storage.removeItem(STORAGE_KEYS.CACHE_HABITS);
    await this.storage.removeItem(STORAGE_KEYS.CACHE_REWARDS);
    await this.storage.removeItem(STORAGE_KEYS.CACHE_TRANSACTIONS);
    await this.storage.removeItem(STORAGE_KEYS.CACHE_AUDIT_LOGS);
  }

  // ==================== 内部：PUSH ====================

  private async _pushQueue(): Promise<{ pushed: number; failed: number }> {
    const queue = await this._getQueue();
    const pending = queue.filter(o => o.status === 'pending').sort((a, b) => a.createdAt - b.createdAt);
    
    let pushed = 0;
    let failed = 0;

    for (const op of pending) {
      // 再次检查网络（长时间推送过程中可能断网）
      if (!this._isOnline()) break;

      // 更新为 syncing
      op.status = 'syncing';
      await this._saveQueue(queue);

      try {
        const serverId = await this._executeOperation(op);

        // 成功
        op.status = 'done';
        op.serverId = serverId || op.payload.id;
        pushed++;
        console.log(`[SyncEngine] ✅ Pushed: ${op.action} ${op.table}`);
      } catch (error: any) {
        op.retryCount++;
        if (op.retryCount >= MAX_RETRY) {
          op.status = 'failed';
          op.error = error?.message || String(error);
          failed++;
          console.warn(`[SyncEngine] ❌ Failed (max retry): ${op.action} ${op.table} - ${op.error}`);
        } else {
          op.status = 'pending'; // 下次重试
          console.warn(`[SyncEngine] ⚠️ Retry (${op.retryCount}/${MAX_RETRY}): ${op.action} ${op.table}`);
        }
      }

      await this._saveQueue(queue);
    }

    return { pushed, failed };
  }

  /** 执行单条操作到服务端 */
  private async _executeOperation(op: SyncOperation): Promise<string | undefined> {
    const { table, action, payload } = op;

    switch (action) {
      case 'insert': {
        const preparedPayload = this._preparePayload(table, payload);
        const query = table === 'star_transactions'
          ? supabase.from(table).upsert(preparedPayload, { onConflict: 'id' })
          : supabase.from(table).insert(preparedPayload);
        const { data, error } = await query.select('id').single();
        if (error) {
          if (table === 'tasks' && isMissingTaskTimeColumnError(error)) {
            console.warn('[SyncEngine] Task time columns are not migrated yet; retrying without start_time/deadline.');
            const { data: legacyData, error: legacyError } = await supabase
              .from(table)
              .insert(stripTaskTimeFieldsForLegacySchema(preparedPayload))
              .select('id')
              .single();
            if (legacyError) throw legacyError;
            return legacyData?.id;
          }
          throw error;
        }
        return data?.id;
      }
      case 'update': {
        const preparedPayload = this._preparePayload(table, payload);
        const { error } = await supabase
          .from(table)
          .update(preparedPayload)
          .eq('id', payload.id);
        if (error) {
          if (table === 'tasks' && isMissingTaskTimeColumnError(error)) {
            console.warn('[SyncEngine] Task time columns are not migrated yet; retrying update without start_time/deadline.');
            const { error: legacyError } = await supabase
              .from(table)
              .update(stripTaskTimeFieldsForLegacySchema(preparedPayload))
              .eq('id', payload.id);
            if (legacyError) throw legacyError;
            return payload.id;
          }
          throw error;
        }
        return payload.id;
      }
      case 'delete': {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', payload.id);
        if (error) throw error;
        return undefined;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /** 准备写入服务端的 payload（过滤掉非 DB 字段） */
  private _preparePayload(table: string, payload: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = { ...payload };

    // 移除非数据库字段
    delete cleaned.localId;
    delete cleaned._synced;
    delete cleaned._version;
    delete cleaned.actorMemberId;
    delete cleaned.actor_member_id;
    delete cleaned._actorMemberId;

    // 确保 family_id
    if (!cleaned.family_id && table !== 'star_transactions') {
      cleaned.family_id = this.familyId;
    }

    return cleaned;
  }

  // ==================== 内部：PULL ====================

  private async _pullRemote(forcePull: boolean): Promise<{ pulled: number; conflicts: number }> {
    const meta = await this._getMetadata();
    let pulled = 0;
    let conflicts = 0;

    for (const table of SYNC_TABLES) {
      try {
        const syncTimeField = TABLE_SYNC_TIME_FIELD[table] || 'updated_at';
        let query = supabase
          .from(table)
          .select('*')
          .eq('family_id', this.familyId);

        // 增量拉取（仅拉取上次同步后的变更）
        if (!forcePull && meta.lastSyncAt > 0) {
          const syncDate = new Date(meta.lastSyncAt).toISOString();
          query = query.gt(syncTimeField, syncDate);
        }

        const { data, error } = await query.order(syncTimeField, { ascending: true });

        if (error) {
          console.warn(`[SyncEngine] Pull ${table} failed:`, error.message);
          continue;
        }

        if (!data || data.length === 0) continue;

        // 合并到本地缓存
        const mergeResult = await this._mergeToLocal(table, data);
        pulled += data.length;
        conflicts += mergeResult.conflicts;

      } catch (e: any) {
        console.warn(`[SyncEngine] Pull ${table} error:`, e.message);
      }
    }

    return { pulled, conflicts };
  }

  /** 合并远程数据到本地缓存（含冲突处理） */
  private async _mergeToLocal(table: string, remoteData: any[]): Promise<{ conflicts: number }> {
    const cacheKey = this._getCacheKey(table);
    const localData: any[] = await storageGet(this.storage, cacheKey, []);
    let conflicts = 0;

    const localMap = new Map(localData.map(item => [item.id, item]));

    for (const remote of remoteData) {
      const local = localMap.get(remote.id);

      if (!local) {
        // 远程新增 → 直接添加
        localData.push(remote);
      } else if (remote.updated_at > local.updated_at) {
        // 远程更新较新 → 检查是否需要合并
        const hasConflict = this._needsMerge(local, remote);
        
        if (hasConflict) {
          // 冲突解决
          const merged = this._resolveConflict(table, local, remote);
          const idx = localData.findIndex(item => item.id === remote.id);
          if (idx >= 0) localData[idx] = merged;
          conflicts++;
          console.log(`[SyncEngine] ⚡ Conflict resolved on ${table}:${remote.id}`);
        } else {
          // 无冲突，直接用远程覆盖
          const idx = localData.findIndex(item => item.id === remote.id);
          if (idx >= 0) localData[idx] = remote;
        }
      }
      // else: 本地更新较新或相同 → 保持不变
    }

    // 处理远端已删除的数据（标记式删除暂不处理）
    await storageSet(this.storage, cacheKey, localData);
    return { conflicts };
  }

  /** 判断是否需要冲突合并（两边都有实质性修改） */
  private _needsMerge(local: any, remote: any): boolean {
    // 检查敏感字段是否有不同修改
    for (const field of Object.keys(MERGE_FIELDS)) {
      if (local[field] !== undefined && remote[field] !== undefined && local[field] !== remote[field]) {
        return true;
      }
    }
    return false;
  }

  /** 冲突解决策略 */
  private _resolveConflict(table: string, local: any, remote: any): any {
    const merged = { ...remote }; // 默认以远程为基础

    for (const field of Object.keys(MERGE_FIELDS)) {
      if (local[field] !== undefined && remote[field] !== undefined) {
        const strategy = MERGE_FIELDS[field];
        
        if (strategy === 'max') {
          merged[field] = Math.max(local[field], remote[field]);
        } else if (strategy === 'forward') {
          // 取优先级更高的状态
          const localPri = STATUS_PRIORITY[local[field]] ?? 0;
          const remotePri = STATUS_PRIORITY[remote[field]] ?? 0;
          merged[field] = remotePri >= localPri ? remote[field] : local[field];
        }
      }
    }

    return merged;
  }

  // ==================== 内部：元数据 & 队列管理 ====================

  private async _getQueue(): Promise<SyncOperation[]> {
    return storageGet<SyncOperation[]>(this.storage, STORAGE_KEYS.SYNC_QUEUE, []);
  }

  private async _saveQueue(queue: SyncOperation[]): Promise<void> {
    await storageSet(this.storage, STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  private async _getMetadata(): Promise<SyncMetadata> {
    const defaultMeta: SyncMetadata = {
      familyId: this.familyId,
      lastSyncAt: 0,
      lastPullAt: 0,
      deviceId: this.deviceId,
      pendingCount: 0,
    };
    return storageGet<SyncMetadata>(this.storage, STORAGE_KEYS.SYNC_META, defaultMeta);
  }

  private async _updateMetadata(): Promise<void> {
    const meta = await this._getMetadata();
    meta.lastSyncAt = Date.now();
    meta.pendingCount = await this.getPendingCount();
    await storageSet(this.storage, STORAGE_KEYS.SYNC_META, meta);
  }

  private async _cleanupDoneOps(): Promise<void> {
    const queue = await this._getQueue();
    const done = queue.filter(o => o.status === 'done');
    if (done.length > DONE_RETENTION) {
      // 保留最近的 DONE 记录
      const doneIds = new Set(done.slice(0, -DONE_RETENTION).map(o => o.id));
      const filtered = queue.filter(o => !doneIds.has(o.id));
      await this._saveQueue(filtered);
    }
  }

  private _getCacheKey(table: string): string {
    const keyMap: Record<string, string> = {
      members: STORAGE_KEYS.CACHE_MEMBERS,
      plans: STORAGE_KEYS.CACHE_PLANS,
      tasks: STORAGE_KEYS.CACHE_TASKS,
      habits: STORAGE_KEYS.CACHE_HABITS,
      rewards: STORAGE_KEYS.CACHE_REWARDS,
      star_transactions: STORAGE_KEYS.CACHE_TRANSACTIONS,
    };
    return keyMap[table] || `dl_cache_${table}`;
  }

  // ==================== 辅助方法 ====================

  private _isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  private _updateStatus(partial: Partial<SyncStatus>) {
    this._currentStatus = { ...this._currentStatus, ...partial };
    this._statusListeners.forEach(cb => {
      try { cb(this._currentStatus); } catch (e) {}
    });
  }
}
