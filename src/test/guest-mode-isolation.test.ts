import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceOf(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8');
}

describe('游客模式数据隔离', () => {
  it('游客计划列表不读取云同步数据层缓存', () => {
    const source = sourceOf('src/pages/Plans.tsx');
    const guestGuardIndex = source.indexOf('if (guestMode) {');
    const dataLayerReadIndex = source.indexOf('const dataLayer = getDataLayer();');

    expect(guestGuardIndex).toBeGreaterThan(-1);
    expect(dataLayerReadIndex).toBeGreaterThan(-1);
    expect(guestGuardIndex).toBeLessThan(dataLayerReadIndex);
  });

  it('游客复盘只读取游客本机计划，不读取云同步计划数据', () => {
    const source = sourceOf('src/pages/FamilyReports.tsx');
    const guestGuardIndex = source.indexOf('if (guestMode) {');
    const guestPlanReadIndex = source.indexOf('getGuestPlans()');
    const dataLayerReadIndex = source.indexOf('getDataLayer().getPlans()');

    expect(source).toContain('guestMode');
    expect(guestGuardIndex).toBeGreaterThan(-1);
    expect(guestPlanReadIndex).toBeGreaterThan(-1);
    expect(dataLayerReadIndex).toBeGreaterThan(-1);
    expect(guestGuardIndex).toBeLessThan(dataLayerReadIndex);
    expect(guestPlanReadIndex).toBeLessThan(dataLayerReadIndex);
  });

  it('游客保存 AI 日程方案不会写入云同步数据层', () => {
    const source = sourceOf('src/pages/ScheduleRecommend.tsx');
    const guestGuardIndex = source.indexOf('if (guestMode) {');
    const dataLayerWriteIndex = source.indexOf('const plan = await getDataLayer().addPlan');

    expect(guestGuardIndex).toBeGreaterThan(-1);
    expect(dataLayerWriteIndex).toBeGreaterThan(-1);
    expect(guestGuardIndex).toBeLessThan(dataLayerWriteIndex);
  });
});
