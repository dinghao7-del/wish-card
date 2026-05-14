import { describe, expect, it } from 'vitest';
import { normalizeStarHistoryRecord, normalizeStarHistoryRecords } from './starHistory';

describe('normalizeStarHistoryRecord', () => {
  it('keeps legacy stars records and maps negative redemption as spend', () => {
    expect(normalizeStarHistoryRecord({
      id: 'legacy-redeem',
      stars: -30,
      title: '兑换心愿: 看电视',
      timestamp: '2026-05-14T12:00:00.000Z',
      type: 'redeem',
    })).toMatchObject({
      id: 'legacy-redeem',
      amount: -30,
      reason: '兑换心愿: 看电视',
      type: 'spend',
    });
  });

  it('drops zero and invalid local records', () => {
    expect(normalizeStarHistoryRecords([
      { id: 'zero-amount', amount: 0, reason: '申请兑换心愿' },
      { id: 'zero-stars', stars: 0, title: '申请兑换心愿' },
      { id: 'invalid', amount: 'abc', reason: '坏数据' },
      { id: 'valid', amount: 10, reason: '完成任务' },
    ])).toEqual([
      expect.objectContaining({ id: 'valid', amount: 10, type: 'earn' }),
    ]);
  });
});
