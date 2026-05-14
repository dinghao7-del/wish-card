import { describe, expect, it } from 'vitest';
import { getCreationTemplateRoute, getCustomCreationRoute } from '../lib/createFlowRoutes';

describe('新建流程路由', () => {
  it('任务新增优先进入模板页并保留计划来源', () => {
    expect(getCreationTemplateRoute('task', { planId: 'plan-1', planName: '暑假计划' }))
      .toBe('/tasks/templates?planId=plan-1&planName=%E6%9A%91%E5%81%87%E8%AE%A1%E5%88%92&fromMode=target');
  });

  it('习惯新增优先进入任务模板页的习惯模式', () => {
    expect(getCreationTemplateRoute('habit')).toBe('/tasks/templates?fromMode=habit');
  });

  it('心愿新增优先进入心愿模板页，自定义才进表单', () => {
    expect(getCreationTemplateRoute('reward', { planId: 'plan-1' })).toBe('/rewards/templates?planId=plan-1');
    expect(getCustomCreationRoute('reward', { planId: 'plan-1' })).toBe('/rewards/new?planId=plan-1');
  });
});
