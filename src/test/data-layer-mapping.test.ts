import { describe, expect, it } from 'vitest';
import { buildOperationAuditLog, dataMemberToDb, dataPlanToDb, dataRewardToDb, dataTaskToDb, dbMemberToDataMember, dbPlanToDataPlan, dbRewardToDataReward, dbTaskToDataTask, stableEntityId, withActorMemberId, type DataTask } from '../lib/DataLayer';
import { SyncEngine, isMissingTaskTimeColumnError, stripTaskTimeFieldsForLegacySchema } from '../lib/SyncEngine';
import type { IStorageAdapter } from '../lib/StorageAdapter';

describe('DataLayer task mapping', () => {
  it('keeps planId when mapping between local task and db payload', () => {
    const task: DataTask = {
      id: 'task-1',
      planId: 'plan-1',
      title: '整理书包',
      description: '检查明天课程用品',
      starAmount: 2,
      assigneeIds: ['child-1'],
      creatorId: 'parent-1',
      status: 'pending',
      isHabit: false,
      targetCount: 1,
      currentCount: 0,
      icon: 'bag',
      startTime: '2026-05-13T09:00:00.000Z',
      deadline: '2026-05-14T09:00:00.000Z',
      completed: false,
      completedAt: null,
      familyId: 'family-1',
      createdAt: '2026-05-13T08:00:00.000Z',
      updatedAt: '2026-05-13T08:00:00.000Z',
    };

    const dbPayload = dataTaskToDb(task);
    expect(dbPayload.plan_id).toBe('plan-1');
    expect(dbPayload.start_time).toBe('2026-05-13T09:00:00.000Z');
    expect(dbPayload.deadline).toBe('2026-05-14T09:00:00.000Z');

    const roundTrip = dbTaskToDataTask(dbPayload, 'fallback-family');
    expect(roundTrip.planId).toBe('plan-1');
    expect(roundTrip.familyId).toBe('family-1');
    expect(roundTrip.startTime).toBe('2026-05-13T09:00:00.000Z');
    expect(roundTrip.deadline).toBe('2026-05-14T09:00:00.000Z');
  });

  it('reads future actor metadata without writing it to current task payloads', () => {
    const task = dbTaskToDataTask({
      id: 'task-3',
      family_id: 'family-1',
      title: '练琴',
      actor_member_id: 'parent-1',
    } as any, 'fallback-family');

    expect(task.actorMemberId).toBe('parent-1');

    const dbPayload = dataTaskToDb(task);
    expect(dbPayload.actor_member_id).toBeUndefined();
  });

  it('normalizes missing planId to null for standalone tasks', () => {
    const task = dbTaskToDataTask({
      id: 'task-2',
      family_id: 'family-1',
      title: '自由阅读',
      plan_id: null,
    }, 'fallback-family');

    expect(task.planId).toBeNull();
  });
});

describe('DataLayer plan mapping', () => {
  it('maps plans between local model and db payload', () => {
    const plan = dbPlanToDataPlan({
      id: 'plan-1',
      family_id: 'family-1',
      name: '暑假计划',
      type: '假期计划',
      metadata: { grade: '三年级', wakeTime: '08:00' },
      sort_order: 2,
      is_active: true,
      created_at: '2026-05-13T08:00:00.000Z',
      updated_at: '2026-05-13T08:00:00.000Z',
    }, 'fallback-family');

    expect(plan.familyId).toBe('family-1');
    expect(plan.metadata).toEqual({ grade: '三年级', wakeTime: '08:00' });
    expect(plan.sortOrder).toBe(2);

    const dbPayload = dataPlanToDb(plan);
    expect(dbPayload.family_id).toBe('family-1');
    expect(dbPayload.sort_order).toBe(2);
    expect(dbPayload.is_active).toBe(true);
    expect(dbPayload.metadata).toEqual({ grade: '三年级', wakeTime: '08:00' });
  });
});

describe('DataLayer reward mapping', () => {
  it('keeps planId when mapping rewards', () => {
    const reward = dbRewardToDataReward({
      id: 'reward-1',
      family_id: 'family-1',
      plan_id: 'plan-1',
      name: '周末电影',
      description: '完成本周目标后兑换',
      star_cost: 30,
      icon: 'Gift',
      image_url: '',
      category: 'privilege',
      status: 'available',
      stock: 1,
      redeemed_by: 'child-1',
      redeemed_at: null,
    }, 'fallback-family');

    expect(reward.planId).toBe('plan-1');
    expect(reward.redeemedBy).toBe('child-1');

    const dbPayload = dataRewardToDb(reward);
    expect(dbPayload.plan_id).toBe('plan-1');
    expect(dbPayload.family_id).toBe('family-1');
    expect(dbPayload.redeemed_by).toBe('child-1');
  });
});

describe('DataLayer member mapping', () => {
  it('keeps family member switch credentials in local and db payloads', () => {
    const member = dbMemberToDataMember({
      id: 'member-1',
      family_id: 'family-1',
      name: '妈妈',
      avatar: 'avatar',
      role: 'parent',
      stars: 12,
      pin: '1234',
      password: 'local-pass',
      is_active: true,
    }, 'fallback-family');

    expect(member.pin).toBe('1234');
    expect(member.password).toBe('local-pass');

    const futureMember = dbMemberToDataMember({
      id: 'member-2',
      family_id: 'family-1',
      name: '爸爸',
      role: 'parent',
      credential_hash: 'hash',
      credential_algo: 'pbkdf2-v1',
      credential_updated_at: '2026-05-13T08:00:00.000Z',
      last_verified_at: '2026-05-13T09:00:00.000Z',
    } as any, 'fallback-family');

    expect(futureMember.credentialHash).toBe('hash');
    expect(futureMember.credentialAlgo).toBe('pbkdf2-v1');

    const dbPayload = dataMemberToDb(member);
    expect(dbPayload.family_id).toBe('family-1');
    expect(dbPayload.pin).toBe('1234');
    expect(dbPayload.password).toBe('local-pass');
    expect(dbPayload.credential_hash).toBeUndefined();
  });
});

describe('DataLayer idempotency helpers', () => {
  it('creates stable UUIDs for reward spend transactions', () => {
    const first = stableEntityId('reward-spend:family-1:child-1:reward-1');
    const second = stableEntityId('reward-spend:family-1:child-1:reward-1');
    const different = stableEntityId('reward-spend:family-1:child-1:reward-2');

    expect(first).toBe(second);
    expect(first).not.toBe(different);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('DataLayer sync operation metadata', () => {
  it('attaches the current family member as the offline operation actor', () => {
    const operation = withActorMemberId({
      table: 'tasks',
      action: 'insert',
      payload: { id: 'task-1', title: '整理书包' },
      familyId: 'family-1',
    }, 'parent-1');

    expect(operation.actorMemberId).toBe('parent-1');
    expect(operation.familyId).toBe('family-1');
  });

  it('can build a local audit record from a queued operation', () => {
    const operation = withActorMemberId({
      table: 'rewards',
      action: 'update',
      payload: { id: 'reward-1', status: 'redeemed' },
      familyId: 'family-1',
    }, 'parent-1');

    const log = buildOperationAuditLog(operation, 'op-1', new Date('2026-05-13T08:00:00.000Z'));

    expect(log).toMatchObject({
      familyId: 'family-1',
      actorMemberId: 'parent-1',
      operationType: 'update_rewards',
      targetTable: 'rewards',
      targetId: 'reward-1',
      clientOperationId: 'op-1',
      createdAt: '2026-05-13T08:00:00.000Z',
    });
  });
});

describe('SyncEngine task time migration compatibility', () => {
  it('detects missing task time columns and can strip them for legacy schemas', () => {
    expect(isMissingTaskTimeColumnError({
      code: 'PGRST204',
      message: "Could not find the 'deadline' column of 'tasks' in the schema cache",
    })).toBe(true);
    expect(isMissingTaskTimeColumnError({ code: 'PGRST204', message: 'other column missing' })).toBe(false);

    expect(stripTaskTimeFieldsForLegacySchema({
      id: 'task-1',
      title: '兑现心愿',
      start_time: '2026-05-13T09:00:00.000Z',
      deadline: '2026-05-14T09:00:00.000Z',
    })).toEqual({
      id: 'task-1',
      title: '兑现心愿',
    });
  });
});

class MemoryStorageAdapter implements IStorageAdapter {
  private store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

describe('SyncEngine online status', () => {
  it('can be updated immediately by the network monitor', () => {
    const engine = new SyncEngine(new MemoryStorageAdapter(), 'family-1');

    engine.setOnlineStatus(false);
    expect(engine.getStatus().isOnline).toBe(false);

    engine.setOnlineStatus(true);
    expect(engine.getStatus().isOnline).toBe(true);
  });
});
