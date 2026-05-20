import type { Member } from '../types';

const LOCAL_CREDENTIAL_PREFIX = 'local-credential-v1$';

function stableHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }

  const a = (h1 >>> 0).toString(36).padStart(7, '0');
  const b = (h2 >>> 0).toString(36).padStart(7, '0');
  return `${a}${b}`;
}

function normalizeCredential(value?: string | null): string {
  return (value || '').trim();
}

export function isLocalCredentialHash(value?: string | null): boolean {
  return normalizeCredential(value).startsWith(LOCAL_CREDENTIAL_PREFIX);
}

export function hasStoredCredential(value?: string | null): boolean {
  return normalizeCredential(value).length > 0;
}

export function hashMemberCredential(memberId: string, kind: 'pin' | 'password', value?: string | null): string {
  const raw = normalizeCredential(value);
  if (!raw) return '';
  if (isLocalCredentialHash(raw)) return raw;
  return `${LOCAL_CREDENTIAL_PREFIX}${kind}$${stableHash(`${memberId}:${kind}:${raw}`)}`;
}

export function verifyMemberCredential(
  member: Pick<Member, 'id' | 'pin' | 'password'>,
  input: string,
  kind: 'pin' | 'password',
): boolean {
  const rawInput = normalizeCredential(input);
  const stored = normalizeCredential(kind === 'pin' ? member.pin : member.password);
  if (!rawInput || !stored) return false;
  if (isLocalCredentialHash(stored)) {
    return hashMemberCredential(member.id, kind, rawInput) === stored;
  }
  return rawInput === stored;
}

export function verifyMemberPinOrPassword(member: Pick<Member, 'id' | 'pin' | 'password'>, input: string): 'pin' | 'password' | null {
  if (verifyMemberCredential(member, input, 'pin')) return 'pin';

  const password = normalizeCredential(member.password);
  if (password && !isLocalCredentialHash(password) && input === password.slice(0, 4)) {
    return 'password';
  }

  return verifyMemberCredential(member, input, 'password') ? 'password' : null;
}

export function hasSwitchCredential(member: Pick<Member, 'pin' | 'password'>): boolean {
  return hasStoredCredential(member.pin) || hasStoredCredential(member.password);
}

export function getMemberForSwitchVerification<T extends Member>(
  member: T,
  options: { guestMode?: boolean; guestFallbackPin?: string } = {},
): T | null {
  if (hasSwitchCredential(member)) return member;

  const shouldUseGuestFallback = options.guestMode || member.id.startsWith('guest-');
  if (!shouldUseGuestFallback) return null;

  return {
    ...member,
    pin: options.guestFallbackPin || '1234',
  };
}

export function prepareMemberCredentialsForStorage<T extends Member>(member: T): T {
  return {
    ...member,
    pin: hasStoredCredential(member.pin) ? hashMemberCredential(member.id, 'pin', member.pin) : undefined,
    password: hasStoredCredential(member.password) ? hashMemberCredential(member.id, 'password', member.password) : undefined,
  };
}

export function displayCredentialPlaceholder(value?: string | null): string {
  return hasStoredCredential(value) ? '••••' : '';
}
