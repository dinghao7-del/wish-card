import type { DataPlan } from './DataLayer';
import { getStorageAdapter, STORAGE_KEYS, storageGetSync, storageSetSync } from './StorageAdapter';

export type GuestPlan = DataPlan;

const storage = getStorageAdapter();

export function getGuestPlans(includeInactive = false): GuestPlan[] {
  const plans = storageGetSync<GuestPlan[]>(storage, STORAGE_KEYS.GUEST_LOCAL_PLANS, []);
  const visiblePlans = includeInactive ? plans : plans.filter(plan => plan.isActive !== false);
  return visiblePlans.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getGuestPlan(id: string): GuestPlan | null {
  return getGuestPlans(false).find(plan => plan.id === id) || null;
}

export function saveGuestPlan(plan: Omit<GuestPlan, 'createdAt' | 'updatedAt' | 'familyId' | 'isActive'> & {
  createdAt?: string;
  updatedAt?: string;
  familyId?: string;
  isActive?: boolean;
}): GuestPlan {
  const now = new Date().toISOString();
  const nextPlan: GuestPlan = {
    ...plan,
    metadata: plan.metadata || {},
    familyId: plan.familyId || 'guest-family',
    isActive: plan.isActive ?? true,
    createdAt: plan.createdAt || now,
    updatedAt: now,
  };
  const plans = storageGetSync<GuestPlan[]>(storage, STORAGE_KEYS.GUEST_LOCAL_PLANS, []);
  const existingIndex = plans.findIndex(item => item.id === nextPlan.id);
  if (existingIndex >= 0) {
    plans[existingIndex] = {
      ...plans[existingIndex],
      ...nextPlan,
      createdAt: plans[existingIndex].createdAt || nextPlan.createdAt,
      updatedAt: now,
    };
  } else {
    plans.push(nextPlan);
  }
  storageSetSync(storage, STORAGE_KEYS.GUEST_LOCAL_PLANS, plans);
  return nextPlan;
}

export function deleteGuestPlan(id: string): void {
  const plans = storageGetSync<GuestPlan[]>(storage, STORAGE_KEYS.GUEST_LOCAL_PLANS, []);
  storageSetSync(storage, STORAGE_KEYS.GUEST_LOCAL_PLANS, plans.map(plan => (
    plan.id === id ? { ...plan, isActive: false, updatedAt: new Date().toISOString() } : plan
  )));
}

export function clearGuestPlans(): void {
  storage.removeItemSync(STORAGE_KEYS.GUEST_LOCAL_PLANS);
}
