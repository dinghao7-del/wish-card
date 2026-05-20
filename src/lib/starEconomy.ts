export const STAR_ECONOMY = {
  dailySoftCap: 25,
  weeklySoftCap: 150,
  singleTaskMax: 8,
  singlePenaltyMax: 5,
  milestoneMax: 30,
  weeklyPenaltySoftCap: 20,
  highValueRewardCost: 300,
} as const;

export type RewardCostTier = 'small' | 'weekly' | 'monthly' | 'big';

export interface RewardCostClassification {
  tier: RewardCostTier;
  label: string;
  guidance: string;
}

export interface RewardCostSuggestion extends RewardCostClassification {
  suggestedCost: number;
  minCost: number;
  maxCost: number;
  reason: string;
}

export interface StarEconomyHealthInput {
  earnedStars: number;
  penaltyStars: number;
  currentBalance: number;
  affordableRewards?: number;
  period?: 'day' | 'week' | 'month' | 'term' | 'year';
}

export interface StarEconomyHealth {
  status: 'healthy' | 'inflating' | 'too_tight';
  score: number;
  netStars: number;
  headline: string;
  guidance: string;
  metrics: Array<{ label: string; value: string; tone: 'good' | 'warn' | 'muted' }>;
}

const TEMPLATE_STAR_MAP = new Map<number, number>([
  [5, 1],
  [6, 1],
  [8, 1],
  [10, 1],
  [12, 2],
  [15, 2],
  [18, 2],
  [20, 2],
  [22, 3],
  [25, 3],
  [28, 3],
  [30, 3],
  [32, 4],
  [35, 4],
  [38, 4],
  [40, 4],
  [45, 5],
  [50, 5],
  [70, 12],
  [80, 15],
  [85, 18],
  [90, 20],
  [95, 25],
  [98, 25],
  [100, 30],
]);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isMilestoneCategory(category?: string): boolean {
  return /表扬|奖项|积分学习法|阶段|里程碑|成果/.test(category || '');
}

export function normalizeTemplateStars(stars: number, category?: string): number {
  if (!Number.isFinite(stars) || stars === 0) return 0;

  const sign = stars < 0 ? -1 : 1;
  const absoluteStars = Math.abs(Math.round(stars));
  const mapped = TEMPLATE_STAR_MAP.get(absoluteStars)
    ?? clamp(absoluteStars / 10, 1, isMilestoneCategory(category) ? STAR_ECONOMY.milestoneMax : STAR_ECONOMY.singleTaskMax);

  if (sign < 0) return -clamp(mapped, 1, STAR_ECONOMY.singlePenaltyMax);
  if (isMilestoneCategory(category)) return clamp(mapped, 1, STAR_ECONOMY.milestoneMax);
  return clamp(mapped, 1, STAR_ECONOMY.singleTaskMax);
}

export function normalizeTaskRewardStars(
  stars: number,
  options: { category?: string; isMilestone?: boolean } = {},
): number {
  if (!Number.isFinite(stars) || stars === 0) return 0;
  const cap = options.isMilestone || isMilestoneCategory(options.category)
    ? STAR_ECONOMY.milestoneMax
    : STAR_ECONOMY.singleTaskMax;
  if (stars < 0) return -clamp(Math.abs(stars), 1, STAR_ECONOMY.singlePenaltyMax);
  return clamp(stars, 1, cap);
}

export function getRewardStarPreset(kind: 'life' | 'study' | 'interest' | 'family' | 'milestone' | 'penalty' | string): number {
  switch (kind) {
    case 'life':
      return 1;
    case 'study':
      return 3;
    case 'interest':
    case 'family':
      return 5;
    case 'milestone':
      return 20;
    case 'penalty':
      return -2;
    default:
      return 3;
  }
}

export function classifyRewardCost(cost: number): RewardCostClassification {
  if (cost < 80) {
    return { tier: 'small', label: '小特权', guidance: '适合当天或两三天就能兑现的小鼓励。' };
  }
  if (cost < 300) {
    return { tier: 'weekly', label: '周心愿', guidance: '适合一周左右努力后兑换。' };
  }
  if (cost < 1000) {
    return { tier: 'monthly', label: '月心愿', guidance: '适合连续几周积累后兑换。' };
  }
  return { tier: 'big', label: '大心愿', guidance: '适合长期储蓄，并同步提醒家长兑现。' };
}

export function suggestRewardCost(input: {
  name?: string;
  description?: string;
  category?: string;
  currentBalance?: number;
}): RewardCostSuggestion {
  const text = `${input.name || ''} ${input.description || ''} ${input.category || ''}`.toLowerCase();
  const includes = (patterns: string[]) => patterns.some(pattern => text.includes(pattern.toLowerCase()));

  let suggestedCost = 120;
  let minCost = 80;
  let maxCost = 220;
  let reason = '适合作为一周左右能达成的普通心愿。';

  if (includes(['看电视', '动画', '游戏', '零食', '冰淇淋', '饮料', '贴纸', '小特权', '晚睡', '自由时间'])) {
    suggestedCost = 40;
    minCost = 20;
    maxCost = 80;
    reason = '这是轻量小心愿，建议孩子两三天努力就能兑换到。';
  } else if (includes(['电影', '游泳', '公园', '博物馆', '科学馆', '手工', '烘焙', '亲子', '半日', '体验'])) {
    suggestedCost = 160;
    minCost = 100;
    maxCost = 260;
    reason = '这类体验需要家长配合，适合一周左右积累后兑现。';
  } else if (includes(['玩具', '乐高', '书', '绘本', '文具', '球拍', '装备', '课程', '体验课'])) {
    suggestedCost = 260;
    minCost = 180;
    maxCost = 420;
    reason = '这类心愿有实际成本，建议设置成连续几周努力后兑换。';
  } else if (includes(['游乐园', '露营', '周末', '短途', '旅行', '酒店', '演出', '比赛', '大餐'])) {
    suggestedCost = 520;
    minCost = 350;
    maxCost = 800;
    reason = '这类心愿需要父母安排时间和预算，适合月级心愿。';
  } else if (includes(['寒假', '暑假', '夏令营', '冬令营', '出国', '长途', '大型', '电脑', '平板', '手机'])) {
    suggestedCost = 1200;
    minCost = 800;
    maxCost = 2000;
    reason = '这是大心愿，建议作为长期目标，并同步进入父母兑现计划。';
  }

  const classification = classifyRewardCost(suggestedCost);
  return {
    ...classification,
    suggestedCost,
    minCost,
    maxCost,
    reason,
  };
}

function getPeriodTarget(period: StarEconomyHealthInput['period']): number {
  switch (period) {
    case 'day':
      return STAR_ECONOMY.dailySoftCap;
    case 'month':
      return STAR_ECONOMY.weeklySoftCap * 4;
    case 'term':
      return STAR_ECONOMY.weeklySoftCap * 18;
    case 'year':
      return STAR_ECONOMY.weeklySoftCap * 48;
    case 'week':
    default:
      return STAR_ECONOMY.weeklySoftCap;
  }
}

export function buildStarEconomyHealth(input: StarEconomyHealthInput): StarEconomyHealth {
  const period = input.period || 'week';
  const target = getPeriodTarget(period);
  const earnedStars = Math.max(0, Math.round(input.earnedStars || 0));
  const penaltyStars = Math.max(0, Math.round(input.penaltyStars || 0));
  const netStars = earnedStars - penaltyStars;
  const pressure = target > 0 ? earnedStars / target : 0;
  const affordableRewards = input.affordableRewards ?? 0;

  let status: StarEconomyHealth['status'] = 'healthy';
  if (pressure > 1.3 || affordableRewards >= 5) status = 'inflating';
  if (earnedStars > 0 && pressure < 0.35 && affordableRewards === 0) status = 'too_tight';

  const score = status === 'healthy'
    ? clamp(100 - Math.abs(pressure - 0.8) * 35 - Math.min(penaltyStars / Math.max(target, 1), 0.3) * 40, 70, 96)
    : status === 'inflating'
      ? clamp(72 - (pressure - 1.3) * 30 - Math.max(affordableRewards - 4, 0) * 4, 35, 72)
      : clamp(68 + pressure * 25, 45, 74);

  const headline = status === 'inflating'
    ? '星星增长偏快'
    : status === 'too_tight'
      ? '奖励节奏偏紧'
      : '星星节奏健康';

  const guidance = status === 'inflating'
    ? '建议把高频日常任务控制在1-3星，把大心愿价格维持在月级或长期区间。'
    : status === 'too_tight'
      ? '孩子短期内可能很难兑换小心愿，可以增加少量1-2星的生活小任务。'
      : '当前获得、扣减和可兑换心愿处在比较稳定的节奏。';

  return {
    status,
    score,
    netStars,
    headline,
    guidance,
    metrics: [
      { label: '本期获得', value: `+${earnedStars}`, tone: pressure > 1.3 ? 'warn' : 'good' },
      { label: '本期扣减', value: `-${penaltyStars}`, tone: penaltyStars > STAR_ECONOMY.weeklyPenaltySoftCap ? 'warn' : 'muted' },
      { label: '净增长', value: `${netStars >= 0 ? '+' : ''}${netStars}`, tone: netStars > target ? 'warn' : 'good' },
      { label: '可兑心愿', value: `${affordableRewards}个`, tone: affordableRewards >= 5 ? 'warn' : 'muted' },
    ],
  };
}
