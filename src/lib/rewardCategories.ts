export const REWARD_CATEGORY_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'common', label: '日常', aliases: ['常用', '日常'] },
  { id: 'experience', label: '体验', aliases: ['体验'] },
  { id: 'prize', label: '奖品', aliases: ['奖品'] },
  { id: 'privilege', label: '特权', aliases: ['特权'] },
  { id: 'growth', label: '成长', aliases: ['成长'] },
  { id: 'activity', label: '活动', aliases: ['活动'] },
] as const;

export type RewardCategoryId = typeof REWARD_CATEGORY_OPTIONS[number]['id'];

export function normalizeRewardCategoryId(category?: string | null): RewardCategoryId | string {
  if (!category) return 'common';

  const matched = REWARD_CATEGORY_OPTIONS.find(option => {
    const aliases = 'aliases' in option ? option.aliases as readonly string[] : [];
    return option.id === category || aliases.includes(category);
  });

  return matched?.id || category;
}

export function getRewardCategoryLabel(category?: string | null): string {
  const normalized = normalizeRewardCategoryId(category);
  return REWARD_CATEGORY_OPTIONS.find(option => option.id === normalized)?.label || category || '日常';
}
