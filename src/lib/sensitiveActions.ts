import type { Member, Reward } from '../types';
import { STAR_ECONOMY } from './starEconomy';

export const HIGH_VALUE_REWARD_COST = STAR_ECONOMY.highValueRewardCost;

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
