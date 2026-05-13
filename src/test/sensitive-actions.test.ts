import { describe, expect, it } from 'vitest';
import { didChangeMemberCredential, getParentVerificationValue, isHighValueReward } from '../lib/sensitiveActions';

describe('sensitive action rules', () => {
  it('uses parent PIN before password for local re-confirmation', () => {
    expect(getParentVerificationValue({
      id: 'parent-1',
      name: '妈妈',
      avatar: '',
      stars: 0,
      role: 'parent',
      pin: '1234',
      password: 'secret',
    })).toBe('1234');
  });

  it('marks rewards from 100 stars as high value', () => {
    expect(isHighValueReward({ cost: 99 })).toBe(false);
    expect(isHighValueReward({ cost: 100 })).toBe(true);
  });

  it('detects PIN or password changes on members', () => {
    const before = { id: 'm1', name: '孩子', avatar: '', stars: 0, role: 'child' as const, pin: '1111', password: '' };
    expect(didChangeMemberCredential(before, { ...before, pin: '2222' })).toBe(true);
    expect(didChangeMemberCredential(before, { ...before, name: '新名字' })).toBe(false);
  });
});
