import { describe, expect, it } from 'vitest';
import { getRewardCategoryLabel, normalizeRewardCategoryId } from '../lib/rewardCategories';

describe('reward categories', () => {
  it('兼容旧中文分类和新内部分类编号', () => {
    expect(normalizeRewardCategoryId('常用')).toBe('common');
    expect(normalizeRewardCategoryId('日常')).toBe('common');
    expect(normalizeRewardCategoryId('体验')).toBe('experience');
    expect(normalizeRewardCategoryId('奖品')).toBe('prize');
    expect(normalizeRewardCategoryId('特权')).toBe('privilege');
    expect(normalizeRewardCategoryId('成长')).toBe('growth');
    expect(normalizeRewardCategoryId('活动')).toBe('activity');
    expect(normalizeRewardCategoryId('experience')).toBe('experience');
  });

  it('能把内部分类编号显示为中文标签', () => {
    expect(getRewardCategoryLabel('common')).toBe('日常');
    expect(getRewardCategoryLabel('体验')).toBe('体验');
    expect(getRewardCategoryLabel('unknown')).toBe('unknown');
  });
});
