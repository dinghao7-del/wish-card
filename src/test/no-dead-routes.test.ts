import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('known dead routes', () => {
  it('保留发布前关键页面入口', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
    const criticalRoutes = [
      'path="/"',
      'path="/tasks"',
      'path="/tasks/new"',
      'path="/habits"',
      'path="/reports"',
      'path="/rewards"',
      'path="/profile"',
      'path="/settings/:type"',
      'path="/check-in/:taskId?"',
      'path="/welcome"',
      'path="/school-calendar"',
      'path="/quadrant"',
      'path="/ai-analysis"',
      'path="/plans"',
      'path="/plans/wizard"',
      'path="/plans/smart-recommend"',
      'path="/plans/:id"',
      'path="/community/templates"',
      'path="/community/share-review/:id"',
      'path="/support/feedback"',
      'path="*"',
    ];

    criticalRoutes.forEach(route => {
      expect(appSource).toContain(route);
    });
  });

  it('计划智能推荐入口优先于计划详情入口', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf-8');

    expect(appSource.indexOf('path="/plans/smart-recommend"')).toBeLessThan(
      appSource.indexOf('path="/plans/:id"')
    );
  });

  it('不再跳转到已知不存在的页面入口', () => {
    const files = [
      'src/pages/ContactUs.tsx',
      'src/pages/PomodoroTimer.tsx',
      'src/pages/Rewards.tsx',
      'src/pages/HabitRewards.tsx',
      'src/pages/Profile.tsx',
    ];

    const source = files
      .map(file => readFileSync(resolve(process.cwd(), file), 'utf-8'))
      .join('\n');

    expect(source).not.toContain("navigate('/feedback')");
    expect(source).not.toContain('navigate("/feedback")');
    expect(source).not.toContain("navigate('/wishes')");
    expect(source).not.toContain('navigate("/wishes")');
    expect(source).not.toContain("navigate('/notifications')");
    expect(source).not.toContain('navigate("/notifications")');
    expect(source).not.toContain("navigate('/school-calendar-old')");
  });
});
