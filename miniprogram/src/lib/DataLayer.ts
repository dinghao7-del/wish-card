/**
 * DataLayer — 离线优先统一数据层 (小程序端)
 * 
 * 与 Web 端 API 完全一致，Onboarding 和各页面通过此层操作数据。
 * 写入先存本地 → 自动排队上传云端 → 多端自动同步。
 */

import { getStorageAdapter, storageGet, storageSet } from './StorageAdapter';
import { SyncEngine, type SyncResult, type SyncStatus } from './SyncEngine';
import { NetworkMonitor } from './NetworkMonitor';
import { supabase } from '../utils/supabase';
import { getLocalUser } from '../utils/localUser';
import Taro from '@tarojs/taro';

// ==================== 类型 ====================

export interface DataTask {
  id: string;
  title: string;
  description: string;
  starAmount: number;
  assigneeIds: string[];
  creatorId: string;
  status: 'pending' | 'in_progress' | 'reviewing' | 'completed';
  isHabit: boolean;
  targetCount: number;
  currentCount: number;
  icon: string;
  completed: boolean;
  completedAt: string | null;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataMember {
  id: string;
  name: string;
  avatar: string;
  role: 'parent' | 'child';
  stars: number;
  color: string | null;
  pin: string | null;
  password: string | null;
  isActive: boolean;
  familyId: string;
}

export interface DataReward {
  id: string;
  name: string;
  description: string;
  starCost: number;
  icon: string | null;
  imageUrl: string | null;
  category: string | null;
  status: 'available' | 'pending_approval' | 'redeemed';
  stock: number | null;
  familyId: string;
}

// ==================== 常量 ====================

const SYNC_INTERVAL_MS = 30_000;

// ==================== 主类 ====================

export class DataLayer {
  private familyId = '';
  private userId = '';
  private storage = getStorageAdapter();
  private engine: SyncEngine | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  public onDataChanged?: () => void;
  public onSyncStatusChange?: (status: SyncStatus) => void;

  constructor() {}

  // ==================== 初始化 ====================

  async initialize(familyId?: string, userId?: string): Promise<void> {
    const user = getLocalUser();
    this.familyId = familyId || user?.family_id || '';
    this.userId = userId || user?.id || '';

    if (!this.familyId) {
      console.warn('[DataLayer] No familyId, using guest mode');
      this.initialized = true;
      return;
    }

    if (this.initialized) return;

    this.engine = new SyncEngine(this.storage, this.familyId);
    this.engine.onStatusChange(status => this.onSyncStatusChange?.(status));

    try {
      await this._loadFromRemote(true);
      console.log(`[DataLayer] ✅ Initialized for family ${this.familyId}`);
    } catch (e) {
      console.warn('[DataLayer] ⚠️ Remote load failed', e);
    }

    this._startAutoSync();

    NetworkMonitor.subscribe(async (online) => {
      if (online) {
        await this.syncNow().catch(() => {});
        this.onDataChanged?.();
      }
    });

    this.initialized = true;
  }

  destroy(): void { this._stopAutoSync(); this.initialized = false; }
  async clearAll(): Promise<void> { this.destroy(); if (this.engine) await this.engine.clearAll(); this.familyId = ''; this.userId = ''; }

  // ==================== 任务 CRUD ====================

  async addTask(task: Omit<DataTask, 'id' | 'createdAt' | 'updatedAt' | 'familyId'>): Promise<DataTask> {
    const now = new Date().toISOString();
    const newTask: DataTask = { ...task, id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, familyId: this.familyId, createdAt: now, updatedAt: now };

    const tasks = await this._getLocalTasks(); tasks.unshift(newTask); await this._saveLocalTasks(tasks);
    if (this.engine) await this.engine.enqueue({ table: 'tasks', action: 'insert', payload: this._taskToDb(newTask), familyId: this.familyId });
    this._triggerSync(); this.onDataChanged?.();
    return newTask;
  }

  async updateTask(id: string, changes: Partial<Omit<DataTask, 'id' | 'familyId' | 'createdAt'>>): Promise<DataTask> {
    const tasks = await this._getLocalTasks(); const idx = tasks.findIndex(t => t.id === id);
    if (idx < 0) throw new Error('任务不存在');
    const updated = { ...tasks[idx], ...changes, updatedAt: new Date().toISOString() }; tasks[idx] = updated; await this._saveLocalTasks(tasks);
    if (this.engine) await this.engine.enqueue({ table: 'tasks', action: 'update', payload: this._taskToDb(updated), familyId: this.familyId });
    this._triggerSync(); this.onDataChanged?.();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    let tasks = await this._getLocalTasks(); tasks = tasks.filter(t => t.id !== id); await this._saveLocalTasks(tasks);
    if (this.engine) await this.engine.enqueue({ table: 'tasks', action: 'delete', payload: { id }, familyId: this.familyId });
    this._triggerSync(); this.onDataChanged?.();
  }

  async getTasks(): Promise<DataTask[]> { return this._getLocalTasks(); }

  // ==================== 成员 CRUD ====================

  async addMember(member: Omit<DataMember, 'id' | 'isActive' | 'familyId'>): Promise<DataMember> {
    const newMember: DataMember = { ...member, id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, isActive: true, familyId: this.familyId };
    const members = await this._getLocalMembers(); members.push(newMember); await this._saveLocalMembers(members);
    if (this.engine) await this.engine.enqueue({ table: 'members', action: 'insert', payload: this._memberToDb(newMember), familyId: this.familyId });
    this._triggerSync(); this.onDataChanged?.();
    return newMember;
  }

  async updateMember(id: string, changes: Partial<Omit<DataMember, 'id' | 'familyId'>>): Promise<DataMember> {
    const members = await this._getLocalMembers(); const idx = members.findIndex(m => m.id === id);
    if (idx < 0) throw new Error('成员不存在');
    const updated = { ...members[idx], ...changes }; members[idx] = updated; await this._saveLocalMembers(members);
    if (this.engine) await this.engine.enqueue({ table: 'members', action: 'update', payload: this._memberToDb(updated), familyId: this.familyId });
    this._triggerSync(); this.onDataChanged?.();
    return updated;
  }

  async deleteMember(id: string): Promise<void> {
    let members = await this._getLocalMembers(); members = members.filter(m => m.id !== id); await this._saveLocalMembers(members);
    if (this.engine) await this.engine.enqueue({ table: 'members', action: 'update', payload: { id, is_active: false }, familyId: this.familyId });
    this._triggerSync(); this.onDataChanged?.();
  }

  async getMembers(): Promise<DataMember[]> { return this._getLocalMembers(); }

  // ==================== 奖励 CRUD ====================

  async addReward(reward: Omit<DataReward, 'id' | 'familyId'>): Promise<DataReward> {
    const newReward: DataReward = { ...reward, id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, familyId: this.familyId };
    const rewards = await this._getLocalRewards(); rewards.unshift(newReward); await this._saveLocalRewards(rewards);
    if (this.engine) await this.engine.enqueue({ table: 'rewards', action: 'insert', payload: this._rewardToDb(newReward), familyId: this.familyId });
    this._triggerSync(); this.onDataChanged?.();
    return newReward;
  }

  async updateReward(id: string, changes: Partial<Omit<DataReward, 'id' | 'familyId'>>): Promise<DataReward> {
    const rewards = await this._getLocalRewards(); const idx = rewards.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('奖励不存在');
    const updated = { ...rewards[idx], ...changes }; rewards[idx] = updated; await this._saveLocalRewards(rewards);
    if (this.engine) await this.engine.enqueue({ table: 'rewards', action: 'update', payload: this._rewardToDb(updated), familyId: this.familyId });
    this._triggerSync(); this.onDataChanged?.();
    return updated;
  }

  async deleteReward(id: string): Promise<void> {
    let rewards = await this._getLocalRewards(); rewards = rewards.filter(r => r.id !== id); await this._saveLocalRewards(rewards);
    if (this.engine) await this.engine.enqueue({ table: 'rewards', action: 'delete', payload: { id }, familyId: this.familyId });
    this._triggerSync(); this.onDataChanged?.();
  }

  async getRewards(): Promise<DataReward[]> { return this._getLocalRewards(); }

  // ==================== 星星 ====================

  async addStars(memberId: string, amount: number, reason: string, relatedInfo?: { taskId?: string; habitId?: string; rewardId?: string }): Promise<void> {
    const members = await this._getLocalMembers();
    const mi = members.findIndex(m => m.id === memberId);
    if (mi >= 0) { members[mi].stars += amount; await this._saveLocalMembers(members); }

    if (this.engine) {
      await this.engine.enqueue({
        table: 'star_transactions', action: 'insert',
        payload: { family_id: this.familyId, member_id: memberId, amount, type: amount > 0 ? 'earn' : 'spend', reason, related_task_id: relatedInfo?.taskId || null, related_habit_id: relatedInfo?.habitId || null, related_reward_id: relatedInfo?.rewardId || null },
        familyId: this.familyId,
      });
      if (mi >= 0) {
        await this.engine.enqueue({ table: 'members', action: 'update', payload: { id: memberId, stars: members[mi].stars }, familyId: this.familyId });
      }
    }
    this._triggerSync(); this.onDataChanged?.();
  }

  // ==================== 同步控制 ====================

  async syncNow(forcePull = false): Promise<SyncResult> {
    if (!this.engine) return { success: false, pushed: 0, pulled: 0, failed: 0, skipped: 0, conflicts: 0, durationMs: 0, error: 'Not initialized' };
    const result = await this.engine.sync(forcePull);
    if (result.success || result.pulled > 0) this.onDataChanged?.();
    return result;
  }

  getSyncStatus(): SyncStatus {
    return this.engine ? this.engine.getStatus() : { isOnline: true, isSyncing: false, pendingCount: 0, lastSyncAt: null, lastError: null };
  }

  // ==================== 批量导入 (Onboarding) ====================

  async bulkImport(data: {
    members: Array<{ name: string; avatar: string; avatar_emoji: string; role: 'parent' | 'child'; stars: number }>;
    tasks: Array<{ title: string; description: string; type: string; rewardStars: number; icon: string; category: string; assigneeChildNames?: string[]; assigneeIds?: string[]; isHabit: boolean; targetCount: number; currentCount: number }>;
    rewards: Array<{ name: string; description: string; cost: number; icon: string; image: string; category: string }>;
  }): Promise<{ memberIds: string[]; taskIds: string[]; rewardIds: string[] }> {
    const now = new Date().toISOString();
    const memberIds: string[] = [], taskIds: string[] = [], rewardIds: string[] = [];

    const members = await this._getLocalMembers();
    for (const m of data.members) {
      const nm: DataMember = { name: m.name, avatar: m.avatar || '', role: m.role || 'child', stars: m.stars || 0, color: '#4CAF50', pin: null, password: null, id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, isActive: true, familyId: this.familyId };
      members.push(nm); memberIds.push(nm.id);
      if (this.engine) await this.engine.enqueue({ table: 'members', action: 'insert', payload: this._memberToDb(nm), familyId: this.familyId });
    }
    await this._saveLocalMembers(members);

    const tasks = await this._getLocalTasks();
    for (const t of data.tasks) {
      const aids = t.assigneeIds || (t.assigneeChildNames || []).map(n => members.find(m => m.name === n)?.id || n) || [];
      const nt: DataTask = { id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, title: t.title, description: t.description, starAmount: t.rewardStars, assigneeIds: aids, creatorId: this.userId, status: 'pending', isHabit: t.isHabit || false, targetCount: t.targetCount || 1, currentCount: t.currentCount || 0, icon: t.icon || '', completed: false, completedAt: null, familyId: this.familyId, createdAt: now, updatedAt: now };
      tasks.push(nt); taskIds.push(nt.id);
      if (this.engine) await this.engine.enqueue({ table: 'tasks', action: 'insert', payload: this._taskToDb(nt), familyId: this.familyId });
    }
    await this._saveLocalTasks(tasks);

    const rewards = await this._getLocalRewards();
    for (const r of data.rewards) {
      const nr: DataReward = { id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: r.name, description: r.description, starCost: r.cost, icon: r.icon || null, imageUrl: r.image || null, category: r.category || null, status: 'available', stock: null, familyId: this.familyId };
      rewards.push(nr); rewardIds.push(nr.id);
      if (this.engine) await this.engine.enqueue({ table: 'rewards', action: 'insert', payload: this._rewardToDb(nr), familyId: this.familyId });
    }
    await this._saveLocalRewards(rewards);

    this._triggerSync(); this.onDataChanged?.();
    return { memberIds, taskIds, rewardIds };
  }

  // ==================== 私有：本地缓存读写 ====================

  private async _getLocalTasks(): Promise<DataTask[]> {
    const raw = await storageGet<any[]>(this.storage, 'dl_cache_tasks', []);
    return raw.map(t => ({
      id: t.id, title: t.title, description: t.description || '', starAmount: t.star_amount ?? 0,
      assigneeIds: t.assignee_ids ?? [], creatorId: t.creator_id || '', status: t.status || 'pending',
      isHabit: t.is_habit || false, targetCount: t.target_count ?? 1, currentCount: t.current_count ?? 0,
      icon: t.icon || '', completed: t.completed || false, completedAt: t.completed_at || null,
      familyId: t.family_id || this.familyId, createdAt: t.created_at || '', updatedAt: t.updated_at || '',
    }));
  }

  private async _saveLocalTasks(ts: DataTask[]): Promise<void> {
    await storageSet(this.storage, 'dl_cache_tasks', ts.map(t => ({
      id: t.id, family_id: t.familyId, title: t.title, description: t.description, star_amount: t.starAmount,
      assignee_ids: t.assigneeIds, creator_id: t.creatorId, status: t.status, is_habit: t.isHabit,
      target_count: t.targetCount, current_count: t.currentCount, completed: t.completed, completed_at: t.completedAt,
      icon: t.icon, created_at: t.createdAt, updated_at: t.updatedAt,
    })));
  }

  private async _getLocalMembers(): Promise<DataMember[]> {
    const raw = await storageGet<any[]>(this.storage, 'dl_cache_members', []);
    return raw.map(m => ({
      id: m.id, name: m.name, avatar: m.avatar || '', role: m.role || 'child', stars: m.stars ?? 0,
      color: m.color ?? null, pin: m.pin ?? null, password: m.password ?? null, isActive: m.is_active !== false,
      familyId: m.family_id || this.familyId,
    }));
  }

  private async _saveLocalMembers(ms: DataMember[]): Promise<void> {
    await storageSet(this.storage, 'dl_cache_members', ms.map(m => ({
      id: m.id, family_id: m.familyId, name: m.name, avatar: m.avatar, role: m.role,
      stars: m.stars, color: m.color, pin: m.pin, password: m.password, is_active: m.isActive,
    })));
  }

  private async _getLocalRewards(): Promise<DataReward[]> {
    const raw = await storageGet<any[]>(this.storage, 'dl_cache_rewards', []);
    return raw.map(r => ({
      id: r.id, name: r.name, description: r.description || '', starCost: r.star_cost ?? 0,
      icon: r.icon ?? null, imageUrl: r.image_url ?? null, category: r.category ?? null,
      status: r.status || 'available', stock: r.stock ?? null, familyId: r.family_id || this.familyId,
    }));
  }

  private async _saveLocalRewards(rs: DataReward[]): Promise<void> {
    await storageSet(this.storage, 'dl_cache_rewards', rs.map(r => ({
      id: r.id, family_id: r.familyId, name: r.name, description: r.description, star_cost: r.starCost,
      icon: r.icon, image_url: r.imageUrl, category: r.category, status: r.status, stock: r.stock,
    })));
  }

  // ==================== 私有：远程加载 ====================

  private async _loadFromRemote(_force = false): Promise<void> {
    try {
      const [mR, tR, rR] = await Promise.all([
        supabase.from('members').select('*').eq('family_id', this.familyId),
        supabase.from('tasks').select('*').eq('family_id', this.familyId),
        supabase.from('rewards').select('*').eq('family_id', this.familyId),
      ]);
      if (!mR.error && mR.data) await storageSet(this.storage, 'dl_cache_members', mR.data);
      if (!tR.error && tR.data) await storageSet(this.storage, 'dl_cache_tasks', tR.data);
      if (!rR.error && rR.data) await storageSet(this.storage, 'dl_cache_rewards', rR.data);
    } catch (e) {
      console.warn('[DataLayer] Remote load error:', e);
    }
  }

  // ==================== 类型转换 ====================

  private _taskToDb(t: DataTask): Record<string, any> {
    return { id: t.id, family_id: t.familyId, title: t.title, description: t.description || null, star_amount: t.starAmount, assignee_ids: t.assigneeIds, creator_id: t.creatorId, status: t.status, is_habit: t.isHabit, target_count: t.targetCount, current_count: t.currentCount, completed: t.completed, completed_at: t.completedAt, icon: t.icon || null, created_at: t.createdAt, updated_at: t.updatedAt };
  }
  private _memberToDb(m: DataMember): Record<string, any> {
    return { id: m.id, family_id: m.familyId, name: m.name, avatar: m.avatar || null, role: m.role, stars: m.stars, color: m.color, pin: m.pin, password: m.password, is_active: m.isActive };
  }
  private _rewardToDb(r: DataReward): Record<string, any> {
    return { id: r.id, family_id: r.familyId, name: r.name, description: r.description || null, star_cost: r.starCost, icon: r.icon, image_url: r.imageUrl, category: r.category, status: r.status, stock: r.stock };
  }

  // ==================== 自动同步 ====================

  private _startAutoSync(): void {
    this._stopAutoSync();
    this.syncTimer = setInterval(() => this.syncNow().catch(() => {}), SYNC_INTERVAL_MS);
  }
  private _stopAutoSync(): void { if (this.syncTimer) { clearInterval(this.syncTimer); this.syncTimer = null; } }
  private _triggerSync(): void {
    setTimeout(() => this.syncNow().catch(() => {}), 100);
  }
}

// ==================== 单例 ====================
let _instance: DataLayer | null = null;
export function getDataLayer(): DataLayer {
  if (!_instance) _instance = new DataLayer();
  return _instance;
}
