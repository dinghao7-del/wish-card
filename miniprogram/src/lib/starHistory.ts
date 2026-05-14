export type StarHistoryType = 'earn' | 'spend' | 'reward' | 'penalty';

export interface StarHistoryRecord {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  type: StarHistoryType;
}

function inferHistoryType(amount: number, explicitType?: string): StarHistoryType {
  if (explicitType === 'penalty') return 'penalty';
  if (explicitType === 'reward' || explicitType === 'earn' || explicitType === 'task' || explicitType === 'daily') return 'earn';
  return amount > 0 ? 'earn' : 'spend';
}

export function normalizeStarHistoryRecord(raw: any): StarHistoryRecord | null {
  const amount = Number(raw?.amount ?? raw?.stars ?? 0);
  if (!Number.isFinite(amount) || amount === 0) return null;

  return {
    id: String(raw?.id || `history-${Math.abs(amount)}-${raw?.created_at || raw?.timestamp || Date.now()}`),
    amount,
    reason: String(raw?.reason || raw?.title || (amount > 0 ? '获得星星' : '星星消费')),
    created_at: String(raw?.created_at || raw?.timestamp || new Date().toISOString()),
    type: inferHistoryType(amount, raw?.type),
  };
}

export function normalizeStarHistoryRecords(records: any[]): StarHistoryRecord[] {
  return records
    .map(normalizeStarHistoryRecord)
    .filter((record): record is StarHistoryRecord => record !== null);
}
