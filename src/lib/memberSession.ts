import type { Member } from '../types';
import { getStorageAdapter, STORAGE_KEYS, storageGetSync, storageSetSync } from './StorageAdapter';

export type MemberVerificationMethod = 'pin' | 'password' | 'none' | 'account';

export interface MemberSession {
  familyId: string | null;
  memberId: string;
  role: Member['role'];
  verificationMethod: MemberVerificationMethod;
  issuedAt: string;
  expiresAt: string;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function createMemberSession(
  member: Pick<Member, 'id' | 'role'>,
  familyId: string | null,
  verificationMethod: MemberVerificationMethod = 'none',
  now: Date = new Date(),
): MemberSession {
  return {
    familyId,
    memberId: member.id,
    role: member.role,
    verificationMethod,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
  };
}

export function isMemberSessionValid(session: MemberSession | null, now: Date = new Date()): session is MemberSession {
  if (!session?.memberId || !session.expiresAt) return false;
  const expiresAt = new Date(session.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function readStoredMemberSession(): MemberSession | null {
  const session = storageGetSync<MemberSession | null>(getStorageAdapter(), STORAGE_KEYS.MEMBER_SESSION, null);
  return isMemberSessionValid(session) ? session : null;
}

export function persistMemberSession(session: MemberSession | null): void {
  const storage = getStorageAdapter();
  if (!session) {
    storage.removeItemSync(STORAGE_KEYS.MEMBER_SESSION);
    return;
  }
  storageSetSync(storage, STORAGE_KEYS.MEMBER_SESSION, session);
}
