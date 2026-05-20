import { describe, expect, it } from 'vitest';
import {
  STAR_ECONOMY,
  classifyRewardCost,
  buildStarEconomyHealth,
  getRewardStarPreset,
  normalizeTemplateStars,
  normalizeTaskRewardStars,
  suggestRewardCost,
} from '../lib/starEconomy';

describe('star economy rules', () => {
  it('converts legacy inflated task template values into weekly-paced rewards', () => {
    expect(normalizeTemplateStars(10, '生活')).toBe(1);
    expect(normalizeTemplateStars(30, '学习')).toBe(3);
    expect(normalizeTemplateStars(50, '兴趣')).toBe(5);
    expect(normalizeTemplateStars(100, '表扬')).toBe(30);
  });

  it('shrinks penalties so correction stays proportionate', () => {
    expect(normalizeTemplateStars(-10, '批评')).toBe(-1);
    expect(normalizeTemplateStars(-30, '批评')).toBe(-3);
    expect(normalizeTemplateStars(-50, '批评')).toBe(-5);
  });

  it('keeps manual task rewards inside a healthy ordinary-task range by default', () => {
    expect(normalizeTaskRewardStars(50, { category: '学习' })).toBe(STAR_ECONOMY.singleTaskMax);
    expect(normalizeTaskRewardStars(-50, { category: '批评' })).toBe(-STAR_ECONOMY.singlePenaltyMax);
  });

  it('provides price anchors for wishes', () => {
    expect(classifyRewardCost(40).tier).toBe('small');
    expect(classifyRewardCost(120).tier).toBe('weekly');
    expect(classifyRewardCost(500).tier).toBe('monthly');
    expect(classifyRewardCost(1500).tier).toBe('big');
  });

  it('offers parent-facing presets instead of arbitrary large defaults', () => {
    expect(getRewardStarPreset('life')).toBe(1);
    expect(getRewardStarPreset('study')).toBe(3);
    expect(getRewardStarPreset('interest')).toBe(5);
    expect(getRewardStarPreset('milestone')).toBe(20);
  });

  it('flags star inflation when weekly earning or affordable wishes are too high', () => {
    const health = buildStarEconomyHealth({
      earnedStars: 260,
      penaltyStars: 0,
      currentBalance: 800,
      affordableRewards: 6,
      period: 'week',
    });

    expect(health.status).toBe('inflating');
    expect(health.headline).toBe('星星增长偏快');
  });

  it('keeps a normal weekly rhythm marked as healthy', () => {
    const health = buildStarEconomyHealth({
      earnedStars: 120,
      penaltyStars: 5,
      currentBalance: 180,
      affordableRewards: 1,
      period: 'week',
    });

    expect(health.status).toBe('healthy');
    expect(health.netStars).toBe(115);
  });

  it('suggests lightweight prices for small daily wishes', () => {
    const suggestion = suggestRewardCost({ name: '看电视 30 分钟', category: '小特权' });

    expect(suggestion.tier).toBe('small');
    expect(suggestion.suggestedCost).toBeLessThan(80);
  });

  it('suggests long-term prices for large holiday wishes', () => {
    const suggestion = suggestRewardCost({ name: '暑假夏令营', description: '希望参加一周营地' });

    expect(suggestion.tier).toBe('big');
    expect(suggestion.suggestedCost).toBeGreaterThanOrEqual(800);
  });
});
