import { test } from '@playwright/test';

test('screenshot edit reward page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:5174', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  const guestBtn = page.locator('button:has-text("先逛逛")');
  if (await guestBtn.isVisible().catch(() => false)) {
    await guestBtn.click();
    await page.waitForTimeout(2000);
  }

  const rewardNav = page.locator('a:has-text("奖励")');
  if (await rewardNav.first().isVisible().catch(() => false)) {
    await rewardNav.first().click();
    await page.waitForTimeout(2000);
  }

  const addBtn = page.locator('button:has-text("添加")');
  if (await addBtn.first().isVisible().catch(() => false)) {
    await addBtn.first().click();
    await page.waitForTimeout(1000);
  }

  await page.screenshot({ path: '/tmp/edit-reward-page.png', fullPage: true });
});
