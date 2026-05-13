import { describe, expect, it } from 'vitest';
import { createMemberSession, isMemberSessionValid } from '../lib/memberSession';

describe('member session', () => {
  it('creates a local session envelope for the selected family member', () => {
    const now = new Date('2026-05-13T08:00:00.000Z');
    const session = createMemberSession(
      { id: 'parent-1', role: 'parent' },
      'family-1',
      'pin',
      now,
    );

    expect(session).toMatchObject({
      familyId: 'family-1',
      memberId: 'parent-1',
      role: 'parent',
      verificationMethod: 'pin',
      issuedAt: '2026-05-13T08:00:00.000Z',
    });
    expect(session.expiresAt).toBe('2026-05-13T20:00:00.000Z');
  });

  it('rejects expired sessions', () => {
    const session = createMemberSession(
      { id: 'child-1', role: 'child' },
      'family-1',
      'none',
      new Date('2026-05-13T08:00:00.000Z'),
    );

    expect(isMemberSessionValid(session, new Date('2026-05-13T19:59:59.000Z'))).toBe(true);
    expect(isMemberSessionValid(session, new Date('2026-05-13T20:00:01.000Z'))).toBe(false);
  });
});
