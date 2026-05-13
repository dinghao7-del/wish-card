/**
 * DataLayer — 离线优先统一数据层 (Web / Capacitor)
 * 
 * 这是所有数据操作的唯一入口。所有页面/组件应该通过 DataLayer
 * 来读写数据，而不是直接调用 Supabase API 或操作 localStorage。
 * 
 * 核心特性：
 * ✅ 写入先存本地，立即返回（< 5ms）
 * ✅ 自动排队上传云端（在线即时，离线排队）
 * ✅ 读取始终从本地缓存（0延迟）
 * ✅ 后台自动同步（30秒间隔 + 上线立即同步）
 * ✅ 冲突自动解决（LWW + 字段级合并）
 */

import { getStorageAdapter, STORAGE_KEYS, storageGet, storageSet } from './StorageAdapter';
import { SyncEngine, type SyncOperation, type SyncResult, type SyncStatus } from './SyncEngine';
import { NetworkMonitor } from './NetworkMonitor';
import supabase from './supabase';
import type { Database } from './supabase';

// ==================== 类型复用 ====================

type DbTask = Database['public']['Tables']['tasks']['Row'];
type DbPlan = Database['public']['Tables']['plans']['Row'];
type DbMember = Database['public']['Tables']['members']['Row'];
type DbReward = Database['public']['Tables']['rewards']['Row'];
type DbHabit = Database['public']['Tables']['habits']['Row'];
type DbStarTx = Database['public']['Tables']['star_transactions']['Row'];

function generateEntityId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
    (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16)
  );
}

export function stableEntityId(input: string): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x01000193;

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= code + i;
    hashB = Math.imul(hashB, 0x811c9dc5);
  }

  const hex = [
    hashA >>> 0,
    hashB >>> 0,
    (hashA ^ hashB) >>> 0,
    Math.imul(hashA, hashB) >>> 0,
  ].map(part => part.toString(16).padStart(8, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map(item => [item.id, item]));
  incoming.forEach(item => {
    map.set(item.id, { ...map.get(item.id), ...item });
  });
  return Array.from(map.values());
}

type QueueableSyncOperation = Omit<SyncOperation, 'id' | 'createdAt' | 'retryCount' | 'status'>;
type ActorTracked = {
  actorMemberId?: string | null;
};

export function withActorMemberId<T extends QueueableSyncOperation>(
  operation: T,
  actorMemberId: string,
): T & { actorMemberId: string } {
  return {
    ...operation,
    actorMemberId,
  };
}

// 前端类型（与 types.ts 对齐）
export interface DataTask extends ActorTracked {
  id: string;
  planId?: string | null;
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
  startTime?: string | null;
  deadline?: string | null;
  completed: boolean;
  completedAt: string | null;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataPlan extends ActorTracked {
  id: string;
  name: string;
  type: string;
  metadata: Record<string, unknown>;
  sortOrder: number;
  isActive: boolean;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export function dbPlanToDataPlan(plan: Partial<DbPlan>, familyId: string): DataPlan {
  return {
    id: plan.id || '',
    name: plan.name || '',
    type: plan.type || '自定义',
    metadata: plan.metadata || {},
    sortOrder: plan.sort_order ?? 0,
    isActive: plan.is_active !== false,
    familyId: plan.family_id || familyId,
    actorMemberId: (plan as any).actor_member_id || null,
    createdAt: plan.created_at || '',
    updatedAt: plan.updated_at || '',
  };
}

export function dataPlanToDb(plan: DataPlan): Record<string, any> {
  return {
    id: plan.id,
    family_id: plan.familyId,
    name: plan.name,
    type: plan.type,
    metadata: plan.metadata || {},
    sort_order: plan.sortOrder,
    is_active: plan.isActive,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  };
}

export function dbTaskToDataTask(task: Partial<DbTask>, familyId: string): DataTask {
  return {
    id: task.id || '',
    planId: task.plan_id || null,
    title: task.title || '',
    description: task.description || '',
    starAmount: task.star_amount ?? 0,
    assigneeIds: task.assignee_ids ?? [],
    creatorId: task.creator_id || '',
    status: task.status || 'pending',
    isHabit: task.is_habit || false,
    targetCount: task.target_count ?? 1,
    currentCount: task.current_count ?? 0,
    icon: task.icon || '',
    startTime: (task as any).start_time || task.created_at || null,
    deadline: (task as any).deadline || null,
    completed: task.completed || false,
    completedAt: task.completed_at || null,
    familyId: task.family_id || familyId,
    actorMemberId: (task as any).actor_member_id || null,
    createdAt: task.created_at || '',
    updatedAt: task.updated_at || '',
  };
}

export function dataTaskToDb(task: DataTask): Record<string, any> {
  return {
    id: task.id,
    family_id: task.familyId,
    plan_id: task.planId || null,
    title: task.title,
    description: task.description || null,
    star_amount: task.starAmount,
    assignee_ids: task.assigneeIds,
    creator_id: task.creatorId,
    status: task.status,
    is_habit: task.isHabit,
    target_count: task.targetCount,
    current_count: task.currentCount,
    completed: task.completed,
    completed_at: task.completedAt,
    icon: task.icon || null,
    start_time: task.startTime || null,
    deadline: task.deadline || null,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  };
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
  credentialHash?: string | null;
  credentialAlgo?: string | null;
  credentialUpdatedAt?: string | null;
  lastVerifiedAt?: string | null;
  isActive: boolean;
  familyId: string;
}

export function dbMemberToDataMember(member: Partial<DbMember>, familyId: string): DataMember {
  return {
    id: member.id || '',
    name: member.name || '',
    avatar: member.avatar || '',
    role: member.role || 'child',
    stars: member.stars ?? 0,
    color: member.color ?? null,
    pin: member.pin ?? null,
    password: member.password ?? null,
    credentialHash: (member as any).credential_hash ?? null,
    credentialAlgo: (member as any).credential_algo ?? null,
    credentialUpdatedAt: (member as any).credential_updated_at ?? null,
    lastVerifiedAt: (member as any).last_verified_at ?? null,
    isActive: member.is_active !== false,
    familyId: member.family_id || familyId,
  };
}

export function dataMemberToDb(member: DataMember): Record<string, any> {
  return {
    id: member.id,
    family_id: member.familyId,
    name: member.name,
    avatar: member.avatar || null,
    role: member.role,
    stars: member.stars,
    color: member.color,
    pin: member.pin,
    password: member.password,
    is_active: member.isActive,
  };
}

export interface DataReward extends ActorTracked {
  id: string;
  planId?: string | null;
  name: string;
  description: string;
  starCost: number;
  icon: string | null;
  imageUrl: string | null;
  category: string | null;
  status: 'available' | 'pending_approval' | 'redeemed';
  stock: number | null;
  redeemedBy: string | null;
  redeemedAt: string | null;
  familyId: string;
}

export function dbRewardToDataReward(reward: Partial<DbReward>, familyId: string): DataReward {
  return {
    id: reward.id || '',
    planId: reward.plan_id || null,
    name: reward.name || '',
    description: reward.description || '',
    starCost: reward.star_cost ?? 0,
    icon: reward.icon ?? null,
    imageUrl: reward.image_url ?? null,
    category: reward.category ?? null,
    status: reward.status || 'available',
    stock: reward.stock ?? null,
    redeemedBy: reward.redeemed_by ?? null,
    redeemedAt: reward.redeemed_at ?? null,
    familyId: reward.family_id || familyId,
    actorMemberId: (reward as any).actor_member_id || null,
  };
}

export function dataRewardToDb(reward: DataReward): Record<string, any> {
  return {
    id: reward.id,
    family_id: reward.familyId,
    plan_id: reward.planId || null,
    name: reward.name,
    description: reward.description || null,
    star_cost: reward.starCost,
    icon: reward.icon,
    image_url: reward.imageUrl,
    category: reward.category,
    status: reward.status,
    stock: reward.stock,
    redeemed_by: reward.redeemedBy,
    redeemed_at: reward.redeemedAt,
  };
}

export interface DataOperationAuditLog {
  id: string;
  familyId: string;
  actorMemberId: string | null;
  accountId: string | null;
  operationType: string;
  targetTable: string | null;
  targetId: string | null;
  clientOperationId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}

export function buildOperationAuditLog(
  operation: QueueableSyncOperation & { actorMemberId?: string },
  clientOperationId: string | null,
  now: Date = new Date(),
): DataOperationAuditLog {
  return {
    id: generateEntityId(),
    familyId: operation.familyId,
    actorMemberId: operation.actorMemberId || null,
    accountId: null,
    operationType: `${operation.action}_${operation.table}`,
    targetTable: operation.table,
    targetId: typeof operation.payload?.id === 'string' ? operation.payload.id : null,
    clientOperationId,
    payload: operation.payload || {},
    createdAt: now.toISOString(),
  };
}

// ==================== 配置常量 ====================

const SYNC_INTERVAL_MS = 30_000; // 30秒自动同步
const AUTO_SYNC_ENABLED = true;

// ==================== DataLayer 主类 ====================

export class DataLayer {
  // 内部状态
  private familyId: string;
  private userId: string;
  private storage = getStorageAdapter();
  private engine: SyncEngine | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  // 回调钩子（用于通知 UI 更新）
  public onDataChanged?: () => void;
  public onSyncStatusChange?: (status: SyncStatus) => void;

  constructor() {
    this.familyId = '';
    this.userId = '';
  }

  // ==================== 初始化 & 生命周期 ====================

  /**
   * 初始化 DataLayer —— 必须在使用任何方法前调用！
   * 会从云端拉取全量数据到本地缓存
   */
  async initialize(familyId: string, userId: string): Promise<void> {
    if (this.initialized && this.familyId === familyId) {
      this.userId = userId;
      return;
    }

    this.familyId = familyId;
    this.userId = userId;

    // 初始化同步引擎
    this.engine = new SyncEngine(this.storage, familyId);

    // 订阅同步状态变化
    this.engine.onStatusChange((status) => {
      this.onSyncStatusChange?.(status);
    });

    // 首次加载：从云端拉取数据填充本地缓存
    try {
      await this._loadFromRemote(true);
      console.log(`[DataLayer] ✅ Initialized for family ${familyId}`);
    } catch (e) {
      console.warn('[DataLayer] ⚠️ Remote load failed, using local cache', e);
      // 失败时使用本地缓存（可能有过期数据）
    }

    // 启动自动同步
    if (AUTO_SYNC_ENABLED) {
      this._startAutoSync();
    }

    // 监听网络变化 → 上线时立即同步
    NetworkMonitor.subscribe((online) => {
      this.engine?.setOnlineStatus(online);
      this.onSyncStatusChange?.(this.getSyncStatus());
      if (online) {
        this.syncNow().catch(() => {});
        this.onDataChanged?.(); // 触发UI刷新
      }
    });

    this.initialized = true;
  }

  /** 停止自动同步（离开页面 / 登出时调用） */
  destroy(): void {
    this._stopAutoSync();
    this.initialized = false;
  }

  /** 登出时清除所有本地数据 */
  async clearAll(): Promise<void> {
    this.destroy();
    if (this.engine) await this.engine.clearAll();
    this.familyId = '';
    this.userId = '';
  }

  // ==================== 任务 CRUD ====================

  async addTask(task: Omit<DataTask, 'id' | 'createdAt' | 'updatedAt' | 'familyId'>): Promise<DataTask> {
    const now = new Date().toISOString();
    const newTask: DataTask = {
      ...task,
      id: generateEntityId(),
      familyId: this.familyId,
      createdAt: now,
      updatedAt: now,
    };

    // 1. 立即写入本地缓存
    const tasks = await this._getLocalTasks();
    tasks.unshift(newTask);
    await this._saveLocalTasks(tasks);

    // 2. 加入同步队列
    if (this.engine) {
      await this._enqueue({
        table: 'tasks',
        action: 'insert',
        payload: this._taskToDb(newTask),
        familyId: this.familyId,
      });
    }

    // 3. 触发同步 + UI更新
    this._triggerSync();
    this.onDataChanged?.();

    return newTask;
  }

  async updateTask(id: string, changes: Partial<Omit<DataTask, 'id' | 'familyId' | 'createdAt'>>): Promise<DataTask> {
    const tasks = await this._getLocalTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx < 0) throw new Error('任务不存在');

    const updated = {
      ...tasks[idx],
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    tasks[idx] = updated;
    await this._saveLocalTasks(tasks);

    // 加入同步队列
    if (this.engine) {
      await this._enqueue({
        table: 'tasks',
        action: 'update',
        payload: this._taskToDb(updated),
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    let tasks = await this._getLocalTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    tasks = tasks.filter(t => t.id !== id);
    await this._saveLocalTasks(tasks);

    if (this.engine) {
      await this._enqueue({
        table: 'tasks',
        action: 'delete',
        payload: { id },
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
  }

  async getTasks(): Promise<DataTask[]> {
    // 始终从本地读
    return this._getLocalTasks();
  }

  // ==================== 计划 CRUD ====================

  async addPlan(plan: Omit<DataPlan, 'id' | 'createdAt' | 'updatedAt' | 'familyId' | 'isActive'> & { isActive?: boolean }): Promise<DataPlan> {
    const now = new Date().toISOString();
    const newPlan: DataPlan = {
      ...plan,
      id: generateEntityId(),
      familyId: this.familyId,
      isActive: plan.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    const plans = await this._getLocalPlans(false);
    plans.push(newPlan);
    await this._saveLocalPlans(plans);

    if (this.engine) {
      await this._enqueue({
        table: 'plans',
        action: 'insert',
        payload: this._planToDb(newPlan),
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
    return newPlan;
  }

  async updatePlan(id: string, changes: Partial<Omit<DataPlan, 'id' | 'familyId' | 'createdAt'>>): Promise<DataPlan> {
    const plans = await this._getLocalPlans(false);
    const idx = plans.findIndex(p => p.id === id);
    if (idx < 0) throw new Error('计划不存在');

    const updated = {
      ...plans[idx],
      ...changes,
      updatedAt: new Date().toISOString(),
    };
    plans[idx] = updated;
    await this._saveLocalPlans(plans);

    if (this.engine) {
      await this._enqueue({
        table: 'plans',
        action: 'update',
        payload: this._planToDb(updated),
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
    return updated;
  }

  async deletePlan(id: string): Promise<void> {
    await this.updatePlan(id, { isActive: false });
  }

  async getPlans(includeInactive = false): Promise<DataPlan[]> {
    return this._getLocalPlans(includeInactive);
  }

  async getPlan(id: string): Promise<DataPlan | null> {
    const plans = await this._getLocalPlans(false);
    return plans.find(p => p.id === id) || null;
  }

  async importLocalRecords(records: {
    members?: DataMember[];
    plans?: DataPlan[];
    tasks?: DataTask[];
    rewards?: DataReward[];
  }): Promise<void> {
    if (records.members?.length) {
      const members = await this._getLocalMembers();
      const nextMembers = mergeById(members, records.members.map(member => ({
        ...member,
        familyId: this.familyId,
        isActive: member.isActive !== false,
      })));
      await this._saveLocalMembers(nextMembers);
      if (this.engine) {
        for (const member of records.members) {
          await this._enqueue({
            table: 'members',
            action: 'insert',
            payload: this._memberToDb({ ...member, familyId: this.familyId, isActive: member.isActive !== false }),
            familyId: this.familyId,
          });
        }
      }
    }

    if (records.plans?.length) {
      const plans = await this._getLocalPlans(false);
      const now = new Date().toISOString();
      const nextPlans = mergeById(plans, records.plans.map(plan => ({
        ...plan,
        familyId: this.familyId,
        isActive: plan.isActive !== false,
        createdAt: plan.createdAt || now,
        updatedAt: plan.updatedAt || now,
      })));
      await this._saveLocalPlans(nextPlans);
      if (this.engine) {
        for (const plan of records.plans) {
          await this._enqueue({
            table: 'plans',
            action: 'insert',
            payload: this._planToDb({
              ...plan,
              familyId: this.familyId,
              isActive: plan.isActive !== false,
              createdAt: plan.createdAt || now,
              updatedAt: plan.updatedAt || now,
            }),
            familyId: this.familyId,
          });
        }
      }
    }

    if (records.tasks?.length) {
      const tasks = await this._getLocalTasks();
      const now = new Date().toISOString();
      const nextTasks = mergeById(tasks, records.tasks.map(task => ({
        ...task,
        familyId: this.familyId,
        createdAt: task.createdAt || now,
        updatedAt: task.updatedAt || now,
      })));
      await this._saveLocalTasks(nextTasks);
      if (this.engine) {
        for (const task of records.tasks) {
          await this._enqueue({
            table: 'tasks',
            action: 'insert',
            payload: this._taskToDb({ ...task, familyId: this.familyId }),
            familyId: this.familyId,
          });
        }
      }
    }

    if (records.rewards?.length) {
      const rewards = await this._getLocalRewards();
      const nextRewards = mergeById(rewards, records.rewards.map(reward => ({
        ...reward,
        familyId: this.familyId,
      })));
      await this._saveLocalRewards(nextRewards);
      if (this.engine) {
        for (const reward of records.rewards) {
          await this._enqueue({
            table: 'rewards',
            action: 'insert',
            payload: this._rewardToDb({ ...reward, familyId: this.familyId }),
            familyId: this.familyId,
          });
        }
      }
    }

    this._triggerSync();
    this.onDataChanged?.();
  }

  // ==================== 成员 CRUD ====================

  async addMember(member: Omit<DataMember, 'id' | 'isActive' | 'familyId'>): Promise<DataMember> {
    const now = new Date().toISOString();
    const newMember: DataMember = {
      ...member,
      id: generateEntityId(),
      isActive: true,
      familyId: this.familyId,
    };

    const members = await this._getLocalMembers();
    members.push(newMember);
    await this._saveLocalMembers(members);

    if (this.engine) {
      await this._enqueue({
        table: 'members',
        action: 'insert',
        payload: this._memberToDb(newMember),
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
    return newMember;
  }

  async updateMember(id: string, changes: Partial<Omit<DataMember, 'id' | 'familyId'>>): Promise<DataMember> {
    const members = await this._getLocalMembers();
    const idx = members.findIndex(m => m.id === id);
    if (idx < 0) throw new Error('成员不存在');

    const updated = { ...members[idx], ...changes };
    members[idx] = updated;
    await this._saveLocalMembers(members);

    if (this.engine) {
      await this._enqueue({
        table: 'members',
        action: 'update',
        payload: this._memberToDb(updated),
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
    return updated;
  }

  async deleteMember(id: string): Promise<void> {
    let members = await this._getLocalMembers();
    members = members.filter(m => m.id !== id);
    await this._saveLocalMembers(members);

    if (this.engine) {
      await this._enqueue({
        table: 'members',
        action: 'update',
        payload: { id, is_active: false },
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
  }

  async getMembers(): Promise<DataMember[]> {
    return this._getLocalMembers();
  }

  // ==================== 奖励 CRUD ====================

  async addReward(reward: Omit<DataReward, 'id' | 'familyId'>): Promise<DataReward> {
    const newReward: DataReward = {
      ...reward,
      id: generateEntityId(),
      familyId: this.familyId,
    };

    const rewards = await this._getLocalRewards();
    rewards.unshift(newReward);
    await this._saveLocalRewards(rewards);

    if (this.engine) {
      await this._enqueue({
        table: 'rewards',
        action: 'insert',
        payload: this._rewardToDb(newReward),
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
    return newReward;
  }

  async updateReward(id: string, changes: Partial<Omit<DataReward, 'id' | 'familyId'>>): Promise<DataReward> {
    const rewards = await this._getLocalRewards();
    const idx = rewards.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('奖励不存在');

    const updated = { ...rewards[idx], ...changes };
    rewards[idx] = updated;
    await this._saveLocalRewards(rewards);

    if (this.engine) {
      await this._enqueue({
        table: 'rewards',
        action: 'update',
        payload: this._rewardToDb(updated),
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
    return updated;
  }

  async deleteReward(id: string): Promise<void> {
    let rewards = await this._getLocalRewards();
    rewards = rewards.filter(r => r.id !== id);
    await this._saveLocalRewards(rewards);

    if (this.engine) {
      await this._enqueue({
        table: 'rewards',
        action: 'delete',
        payload: { id },
        familyId: this.familyId,
      });
    }

    this._triggerSync();
    this.onDataChanged?.();
  }

  async getRewards(): Promise<DataReward[]> {
    return this._getLocalRewards();
  }

  // ==================== 星星操作 ====================

  async addStars(memberId: string, amount: number, reason: string, relatedInfo?: {
    taskId?: string;
    habitId?: string;
    rewardId?: string;
  }): Promise<void> {
    const transactionId = amount < 0 && relatedInfo?.rewardId
      ? stableEntityId(`reward-spend:${this.familyId}:${memberId}:${relatedInfo.rewardId}`)
      : generateEntityId();

    // 1. 本地更新成员星星数
    const members = await this._getLocalMembers();
    const memberIdx = members.findIndex(m => m.id === memberId);
    if (memberIdx >= 0) {
      members[memberIdx].stars += amount;
      await this._saveLocalMembers(members);
    }

    // 2. 加入同步队列
    if (this.engine) {
      await this._enqueue({
        table: 'star_transactions',
        action: 'insert',
        payload: {
          id: transactionId,
          family_id: this.familyId,
          member_id: memberId,
          amount,
          type: amount > 0 ? 'earn' : 'spend',
          reason,
          related_task_id: relatedInfo?.taskId || null,
          related_habit_id: relatedInfo?.habitId || null,
          related_reward_id: relatedInfo?.rewardId || null,
        },
        familyId: this.familyId,
      });

      // 同时加入星星更新的队列（因为服务端需要通过 trigger 更新成员表）
      if (memberIdx >= 0) {
        await this._enqueue({
          table: 'members',
          action: 'update',
          payload: { id: memberId, stars: members[memberIdx].stars },
          familyId: this.familyId,
        });
      }
    }

    this._triggerSync();
    this.onDataChanged?.();
  }

  // ==================== 同步控制 ====================

  /** 手动触发同步 */
  async syncNow(forcePull = false): Promise<SyncResult> {
    if (!this.engine) {
      return { success: false, pushed: 0, pulled: 0, failed: 0, skipped: 0, conflicts: 0, durationMs: 0, error: 'Not initialized' };
    }
    
    const result = await this.engine.sync(forcePull);
    if (result.success || result.pulled > 0) {
      // 有新数据拉取后通知UI刷新
      this.onDataChanged?.();
    }
    return result;
  }

  /** 获取同步状态 */
  getSyncStatus(): SyncStatus {
    return this.engine ? this.engine.getStatus() : {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      pendingCount: 0,
      lastSyncAt: null,
      lastError: null,
    };
  }

  async getOperationAuditLogs(limit = 50): Promise<DataOperationAuditLog[]> {
    const logs = await this._getLocalOperationAuditLogs();
    return logs.slice(0, limit);
  }

  private async _enqueue(operation: QueueableSyncOperation): Promise<void> {
    if (!this.engine) return;
    const operationWithActor = withActorMemberId(operation, this.userId);
    const clientOperationId = await this.engine.enqueue(operationWithActor);
    await this._appendOperationAuditLog(buildOperationAuditLog(operationWithActor, clientOperationId));
  }

  // ==================== 批量导入 (Onboarding 使用) ====================

  /**
   * 批量导入 Onboarding 数据
   * 同时写入本地缓存 + 排队等待云端同步
   */
  async bulkImport(data: {
    members: Omit<DataMember, 'id' | 'isActive' | 'familyId'>[];
    tasks: Array<{
      title: string;
      description: string;
      type: string;
      rewardStars: number;
      icon: string;
      category: string;
      assigneeChildNames?: string[];
      assigneeIds?: string[];
      isHabit: boolean;
      targetCount: number;
      currentCount: number;
      planId?: string | null;
    }>;
    rewards: Array<{
      name: string;
      description: string;
      cost: number;
      icon: string;
      image: string;
      category: string;
    }>;
  }): Promise<{ memberIds: string[]; taskIds: string[]; rewardIds: string[] }> {
    const now = new Date().toISOString();
    const memberIds: string[] = [];
    const taskIds: string[] = [];
    const rewardIds: string[] = [];

    // 1. 导入成员
    const members = await this._getLocalMembers();
    for (const m of data.members) {
      const newMember: DataMember = {
        ...m,
        id: generateEntityId(),
        isActive: true,
        familyId: this.familyId,
      };
      members.push(newMember);
      memberIds.push(newMember.id);

      if (this.engine) {
        await this._enqueue({
          table: 'members',
          action: 'insert',
          payload: this._memberToDb(newMember),
          familyId: this.familyId,
        });
      }
    }
    await this._saveLocalMembers(members);

    // 2. 导入任务
    const tasks = await this._getLocalTasks();
    for (const t of data.tasks) {
      // 解析 assignee：如果给的是名字数组，转换为ID数组
      const assigneeIds = t.assigneeIds || t.assigneeChildNames?.map(name => {
        const found = members.find(m => m.name === name);
        return found?.id || name;
      }) || [];

      const newTask: DataTask = {
        id: generateEntityId(),
        planId: t.planId || null,
        title: t.title,
        description: t.description,
        starAmount: t.rewardStars,
        assigneeIds,
        creatorId: this.userId,
        status: 'pending',
        isHabit: t.isHabit || false,
        targetCount: t.targetCount || 1,
        currentCount: t.currentCount || 0,
        icon: t.icon || '',
        completed: false,
        completedAt: null,
        familyId: this.familyId,
        createdAt: now,
        updatedAt: now,
      };
      tasks.push(newTask);
      taskIds.push(newTask.id);

      if (this.engine) {
        await this._enqueue({
          table: 'tasks',
          action: 'insert',
          payload: this._taskToDb(newTask),
          familyId: this.familyId,
        });
      }
    }
    await this._saveLocalTasks(tasks);

    // 3. 导入奖励
    const rewards = await this._getLocalRewards();
    for (const r of data.rewards) {
      const newReward: DataReward = {
        id: generateEntityId(),
        planId: null,
        name: r.name,
        description: r.description,
        starCost: r.cost,
        icon: r.icon || null,
        imageUrl: r.image || null,
        category: r.category || null,
        status: 'available',
        stock: null,
        redeemedBy: null,
        redeemedAt: null,
        familyId: this.familyId,
      };
      rewards.push(newReward);
      rewardIds.push(newReward.id);

      if (this.engine) {
        await this._enqueue({
          table: 'rewards',
          action: 'insert',
          payload: this._rewardToDb(newReward),
          familyId: this.familyId,
        });
      }
    }
    await this._saveLocalRewards(rewards);

    // 触发同步
    this._triggerSync();
    this.onDataChanged?.();

    return { memberIds, taskIds, rewardIds };
  }

  // ==================== 私有方法：本地缓存读写 ====================

  private async _getLocalTasks(): Promise<DataTask[]> {
    const raw = await storageGet<any[]>(this.storage, 'dl_cache_tasks', []);
    return raw.map(t => dbTaskToDataTask(t, this.familyId));
  }

  private async _saveLocalTasks(tasks: DataTask[]): Promise<void> {
    await storageSet(this.storage, 'dl_cache_tasks', tasks.map(dataTaskToDb));
  }

  private async _getLocalPlans(includeInactive = false): Promise<DataPlan[]> {
    const raw = await storageGet<any[]>(this.storage, 'dl_cache_plans', []);
    return raw
      .map(p => dbPlanToDataPlan(p, this.familyId))
      .filter(p => includeInactive || p.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  private async _saveLocalPlans(plans: DataPlan[]): Promise<void> {
    await storageSet(this.storage, 'dl_cache_plans', plans.map(dataPlanToDb));
  }

  private async _getLocalMembers(): Promise<DataMember[]> {
    const raw = await storageGet<any[]>(this.storage, 'dl_cache_members', []);
    return raw.map(m => dbMemberToDataMember(m, this.familyId));
  }

  private async _saveLocalMembers(members: DataMember[]): Promise<void> {
    await storageSet(this.storage, 'dl_cache_members', members.map(dataMemberToDb));
  }

  private async _getLocalRewards(): Promise<DataReward[]> {
    const raw = await storageGet<any[]>(this.storage, 'dl_cache_rewards', []);
    return raw.map(r => dbRewardToDataReward(r, this.familyId));
  }

  private async _saveLocalRewards(rewards: DataReward[]): Promise<void> {
    await storageSet(this.storage, 'dl_cache_rewards', rewards.map(dataRewardToDb));
  }

  private async _getLocalOperationAuditLogs(): Promise<DataOperationAuditLog[]> {
    return storageGet<DataOperationAuditLog[]>(this.storage, STORAGE_KEYS.CACHE_AUDIT_LOGS, []);
  }

  private async _appendOperationAuditLog(log: DataOperationAuditLog): Promise<void> {
    const logs = await this._getLocalOperationAuditLogs();
    const nextLogs = [log, ...logs].slice(0, 200);
    await storageSet(this.storage, STORAGE_KEYS.CACHE_AUDIT_LOGS, nextLogs);
  }

  // ==================== 私有方法：远程加载 ====================

  /** 从服务端全量加载数据到本地 */
  private async _loadFromRemote(force = false): Promise<void> {
    if (!force && !this._isOnline()) return;

    const [membersRes, plansRes, tasksRes, rewardsRes] = await Promise.all([
      supabase.from('members').select('*').eq('family_id', this.familyId),
      supabase.from('plans').select('*').eq('family_id', this.familyId),
      supabase.from('tasks').select('*').eq('family_id', this.familyId),
      supabase.from('rewards').select('*').eq('family_id', this.familyId),
    ]);

    if (!membersRes.error && membersRes.data) {
      await storageSet(this.storage, 'dl_cache_members', membersRes.data);
    }
    if (!plansRes.error && plansRes.data) {
      await storageSet(this.storage, 'dl_cache_plans', plansRes.data);
    }
    if (!tasksRes.error && tasksRes.data) {
      await storageSet(this.storage, 'dl_cache_tasks', tasksRes.data);
    }
    if (!rewardsRes.error && rewardsRes.data) {
      await storageSet(this.storage, 'dl_cache_rewards', rewardsRes.data);
    }
  }

  // ==================== 私有方法：类型转换 ====================

  private _taskToDb(task: DataTask): Record<string, any> {
    return dataTaskToDb(task);
  }

  private _planToDb(plan: DataPlan): Record<string, any> {
    return dataPlanToDb(plan);
  }

  private _memberToDb(member: DataMember): Record<string, any> {
    return dataMemberToDb(member);
  }

  private _rewardToDb(reward: DataReward): Record<string, any> {
    return dataRewardToDb(reward);
  }

  // ==================== 私有方法：自动同步 ====================

  private _startAutoSync(): void {
    this._stopAutoSync();
    this.syncTimer = setInterval(() => {
      this.syncNow().catch(() => {});
    }, SYNC_INTERVAL_MS);
  }

  private _stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /** 触发异步同步（不阻塞当前操作） */
  private _triggerSync(): void {
    if (this._isOnline()) {
      // 微任务延迟，让当前写操作完成后再触发
      setTimeout(() => this.syncNow().catch(() => {}), 100);
    }
  }

  private _isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
}

// ==================== 单例导出 ====================

let _dataLayerInstance: DataLayer | null = null;

/** 获取全局 DataLayer 实例 */
export function getDataLayer(): DataLayer {
  if (!_dataLayerInstance) {
    _dataLayerInstance = new DataLayer();
  }
  return _dataLayerInstance;
}
