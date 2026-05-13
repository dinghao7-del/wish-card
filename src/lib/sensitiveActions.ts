import type { Member, Reward } from '../types';

export const HIGH_VALUE_REWARD_COST = 100;

export function getParentVerificationValue(parent: Member | null): string | null {
  if (!parent || parent.role !== 'parent') return null;
  return parent.pin?.trim() || parent.password?.trim() || null;
}

export function isHighValueReward(reward: Pick<Reward, 'cost'>): boolean {
  return reward.cost >= HIGH_VALUE_REWARD_COST;
}

export function didChangeMemberCredential(before: Member, after: Member): boolean {
  return (before.pin || '') !== (after.pin || '') || (before.password || '') !== (after.password || '');
}
