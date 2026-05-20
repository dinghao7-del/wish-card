import { expect, test } from '@playwright/test';

test.describe('最终关键路径冒烟', () => {
  test('游客模式可以访问计划落地、AI 分析和商业资源后台核心入口', async ({ page }) => {
    const runtimeErrors: string[] = [];

    page.on('pageerror', error => {
      runtimeErrors.push(error.message);
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        if (/Failed to load resource: the server responded with a status of 404/.test(message.text())) return;
        runtimeErrors.push(message.text());
      }
    });

    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '先逛逛' }).click();
    await expect(page.getByText('体验模式')).toBeVisible();

    await page.goto('/plans/guest-final-smoke?name=%E6%9A%91%E5%81%87%E6%80%BB%E8%AE%A1%E5%88%92&type=%E6%9A%91%E5%81%87%E8%AE%A1%E5%88%92&kind=container', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.getByRole('heading', { name: '暑假总计划' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '落地工作台' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '子计划拆解' })).toBeVisible();
    await expect(page.getByText('假期每日作息')).toBeVisible();
    await page.getByRole('button', { name: /生成 4 个子计划/ }).click();
    await expect(page.getByText('已拆出 4 个子计划')).toBeVisible();
    await expect(page.getByRole('button', { name: '假期每日作息', exact: true })).toBeVisible();

    await page.goto('/plans', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '把计划变成可执行安排' })).toBeVisible();
    await expect(page.getByText('假期/特殊时间').first()).toBeVisible();

    await page.goto('/ai-analysis', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('AI 智能建档')).toBeVisible();
    await expect(page.getByText(/家庭推荐方向|推荐方向/).first()).toBeVisible();

    await page.goto('/internal/resources', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: '商业资源配置' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '运营诊断' })).toBeVisible();
    await expect(page.getByText(/补资源|补标签|提权|观察/).first()).toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });
});
