import { describe, expect, it } from 'vitest';
import { GUEST_MEMBERS, GUEST_TASKS } from '../lib/guestData';
import { getHabitSelectableChildIds, resolveHabitTargetChildId } from '../lib/habitTargeting';

describe('习惯打卡成员选择', () => {
  const childMembers = GUEST_MEMBERS.filter(member => member.role === 'child');

  it('游客演示里的跳绳习惯可以给小红打卡', () => {
    const jumpRopeHabit = GUEST_TASKS.find(task => task.title === '跳绳锻炼10分钟');

    expect(jumpRopeHabit?.assigneeIds).toContain('guest-daughter');
    expect(getHabitSelectableChildIds(jumpRopeHabit!, childMembers)).toContain('guest-daughter');
  });

  it('切换习惯卡时会忽略上一张卡遗留的孩子选择', () => {
    const daughterOnlyHabit = {
      id: 'daughter-habit',
      assigneeIds: ['guest-daughter'],
    };

    expect(resolveHabitTargetChildId(daughterOnlyHabit, childMembers, 'guest-son')).toBe('guest-daughter');
  });
});
