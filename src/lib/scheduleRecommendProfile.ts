import type { Member } from '../types';
import type { ChildProfile } from './scheduleRecommendAI';

export function inferGenderFromMember(member?: Pick<Member, 'avatar' | 'gender'> | null): ChildProfile['gender'] {
  if (!member) return '';
  if (member.gender === 'boy' || member.gender === 'girl') return member.gender;
  if (member.avatar?.includes('/avatars/boy/')) return 'boy';
  if (member.avatar?.includes('/avatars/girl/')) return 'girl';
  return '';
}

export function inferGradeFromAge(age: number | null | undefined): string {
  if (age == null) return '';
  if (age <= 3) return '幼儿园小班';
  if (age === 4) return '幼儿园中班';
  if (age === 5) return '幼儿园大班';
  if (age === 6) return '一年级';
  if (age === 7) return '二年级';
  if (age === 8) return '三年级';
  if (age === 9) return '四年级';
  if (age === 10) return '五年级';
  if (age === 11) return '六年级';
  if (age === 12) return '初一';
  if (age === 13) return '初二';
  if (age === 14) return '初三';
  if (age === 15) return '高一';
  if (age === 16) return '高二';
  return '高三';
}

export function inferAgeFromMember(member?: Pick<Member, 'id' | 'age'> | null): number | null {
  if (!member) return null;
  if (typeof member.age === 'number') return member.age;
  if (member.id === 'guest-son') return 9;
  if (member.id === 'guest-daughter') return 13;
  return null;
}

export function inferGradeFromMember(member?: Pick<Member, 'id' | 'age' | 'grade'> | null): string {
  if (!member) return '';
  if (member.grade) return member.grade;
  if (member.id === 'guest-son') return '三年级';
  if (member.id === 'guest-daughter') return '初一';
  return inferGradeFromAge(inferAgeFromMember(member));
}

export function buildProfileFromChildMember(member: Member, current: ChildProfile): ChildProfile {
  const age = inferAgeFromMember(member);
  const grade = inferGradeFromMember(member);
  return {
    ...current,
    gender: inferGenderFromMember(member),
    age: age ?? current.age,
    grade: grade || current.grade,
  };
}

export function canProceedFromBasicProfile(
  profile: Pick<ChildProfile, 'age' | 'grade'>,
  selectedChildId?: string,
): boolean {
  return Boolean(selectedChildId || profile.age !== null || profile.grade);
}

export function getScheduleTargetChildIds(members: Member[], selectedChildId?: string): string[] {
  if (selectedChildId) return [selectedChildId];
  return members.filter(member => member.role === 'child').map(member => member.id);
}

export function formatChildScheduleSubject(member: Member | undefined, profile: Pick<ChildProfile, 'age' | 'grade'>): string {
  const name = member?.name || '孩子';
  const stage = profile.grade || (profile.age ? `${profile.age}岁` : '当前阶段');
  return `${name} · ${stage}`;
}
