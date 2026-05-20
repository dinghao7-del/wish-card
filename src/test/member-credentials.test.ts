import { describe, expect, it } from 'vitest';
import {
  displayCredentialPlaceholder,
  getMemberForSwitchVerification,
  hashMemberCredential,
  hasSwitchCredential,
  isLocalCredentialHash,
  prepareMemberCredentialsForStorage,
  verifyMemberCredential,
  verifyMemberPinOrPassword,
} from '../lib/memberCredentials';

describe('member credential helpers', () => {
  it('stores new member PIN/password values as local hashes', () => {
    const member = prepareMemberCredentialsForStorage({
      id: 'child-1',
      name: '孩子',
      avatar: '',
      stars: 0,
      role: 'child' as const,
      pin: '0000',
      password: 'secret',
    });

    expect(member.pin).not.toBe('0000');
    expect(member.password).not.toBe('secret');
    expect(isLocalCredentialHash(member.pin)).toBe(true);
    expect(isLocalCredentialHash(member.password)).toBe(true);
    expect(verifyMemberCredential(member, '0000', 'pin')).toBe(true);
    expect(verifyMemberCredential(member, 'secret', 'password')).toBe(true);
  });

  it('keeps legacy plaintext credentials verifiable during migration', () => {
    const legacy = {
      id: 'parent-1',
      pin: '1234',
      password: 'admin-secret',
    };

    expect(verifyMemberPinOrPassword(legacy, '1234')).toBe('pin');
    expect(verifyMemberPinOrPassword(legacy, 'admi')).toBe('password');
    expect(hasSwitchCredential(legacy)).toBe(true);
  });

  it('does not double-hash stored credentials', () => {
    const hash = hashMemberCredential('member-1', 'pin', '2468');
    expect(hashMemberCredential('member-1', 'pin', hash)).toBe(hash);
    expect(displayCredentialPlaceholder(hash)).toBe('••••');
  });

  it('requires guest profile switching to verify the fallback PIN even when old local data has no PIN', () => {
    const oldGuestMember = {
      id: 'guest-son',
      name: '小明',
      avatar: '',
      stars: 0,
      role: 'child' as const,
    };

    const memberForSwitch = getMemberForSwitchVerification(oldGuestMember, { guestMode: true });

    expect(memberForSwitch).toMatchObject({ id: 'guest-son', pin: '1234' });
    expect(verifyMemberPinOrPassword(memberForSwitch!, '1234')).toBe('pin');
    expect(verifyMemberPinOrPassword(memberForSwitch!, '0000')).toBeNull();
  });

  it('does not allow real family profile switching without an explicit PIN or password', () => {
    const realMemberWithoutCredential = {
      id: 'child-1',
      name: '孩子',
      avatar: '',
      stars: 0,
      role: 'child' as const,
    };

    expect(getMemberForSwitchVerification(realMemberWithoutCredential, { guestMode: false })).toBeNull();
  });
});
