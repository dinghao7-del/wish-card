import { expect, test } from '@playwright/test';

test.describe('游客模式核心链路', () => {
  test('可以从欢迎页进入并访问主入口和主题皮肤设置', async ({ page }) => {
    test.setTimeout(60_000);
    const runtimeErrors: string[] = [];

    page.on('pageerror', error => {
      runtimeErrors.push(error.message);
    });
    page.on('console', message => {
      if (message.type() === 'error') {
        runtimeErrors.push(message.text());
      }
    });

    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page).toHaveTitle(/愿望卡|WishCard/);
    await expect(page.locator('img[src="/skins/forest-comic/welcome-comic.svg"]')).toBeVisible();

    await page.getByRole('button', { name: '先逛逛' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('体验模式')).toBeVisible();
    await expect(page.getByText('今日任务').first()).toBeVisible();
    await expect(page.locator('nav a[href="/tasks"]')).toContainText('任务');
    await expect(page.locator('nav a[href="/rewards"]')).toContainText(/奖励|心愿/);
    await expect(page.locator('nav a[href="/profile"]')).toContainText('我的');

    await page.getByRole('button', { name: '打卡' }).first().click();
    await expect(page).toHaveURL(/\/check-in\//);
    await expect(page.getByRole('heading', { name: '数学作业：两位数乘法' })).toBeVisible();
    await page.getByRole('button', { name: '确认打卡' }).click();
    await expect(page.getByRole('heading', { name: '打卡成功' })).toBeVisible();
    await page.getByRole('button', { name: '太棒了' }).click();
    await expect(page).toHaveURL(/\/tasks$/);
    await page.getByRole('button', { name: '核实' }).first().click();
    await expect(page).toHaveURL(/\/check-in\//);
    await page.getByRole('button', { name: '确认完成' }).click();
    await expect(page.getByRole('heading', { name: '审核完成' })).toBeVisible();
    await page.getByRole('button', { name: '太棒了' }).click();
    await expect(page).toHaveURL(/\/tasks$/);

    await page.locator('nav a[href="/tasks"]').click();
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByRole('heading').first()).toBeVisible();

    await page.goto('/reports', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByText('+40', { exact: true }).first()).toBeVisible();

    await page.locator('nav a[href="/rewards"]').click();
    await expect(page).toHaveURL(/\/rewards$/);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await page.getByRole('button', { name: '体验' }).click();
    await expect(page.getByText('家庭电影夜')).toBeVisible();
    await page.getByRole('button', { name: '日常' }).click();
    await expect(page.getByText('看电视')).toBeVisible();
    await page.getByRole('button', { name: '兑换' }).first().click();
    await expect(page.getByText('兑换成功')).toBeVisible();
    await expect(page.getByText('消耗 30')).toBeVisible();
    await expect(page.getByText('待确认').first()).toBeVisible({ timeout: 8000 });
    await page.getByRole('button', { name: '确认' }).first().click();
    await expect(page.getByText('已加入父母兑现待办')).toBeVisible();
    await page.getByRole('button', { name: '查看待办' }).click();
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(page.getByText('兑现心愿：看电视')).toBeVisible();

    await page.locator('nav a[href="/profile"]').click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByText('主题皮肤')).toBeVisible();

    await page.getByText('主题皮肤').click();
    await expect(page).toHaveURL(/\/settings\/appearance$/);
    await expect(page.getByText('绿色漫画风')).toBeVisible();
    await expect(page.getByText('已启用')).toBeVisible();
    await expect(page.getByText('简约平面漫画风')).toBeVisible();
    await expect(page.getByText('规划中')).toBeVisible();

    await page.evaluate(() => {
      window.history.pushState({}, '', '/wishes');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('今日任务').first()).toBeVisible();

    expect(runtimeErrors).toEqual([]);
  });
});
