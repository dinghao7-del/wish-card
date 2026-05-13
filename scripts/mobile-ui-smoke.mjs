import { chromium, devices, expect } from '@playwright/test';

const baseURL = process.env.MOBILE_SMOKE_URL || 'http://127.0.0.1:3000';
const device = devices['iPhone 12'];

const browser = await chromium.launch();
const context = await browser.newContext({
  ...device,
  baseURL,
});
await context.addInitScript(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});
const page = await context.newPage();
const runtimeErrors = [];

page.on('pageerror', error => {
  runtimeErrors.push(error.message);
});
page.on('console', message => {
  if (message.type() === 'error') {
    runtimeErrors.push(message.text());
  }
});

try {
  await page.goto('/welcome', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('img[src="/skins/forest-comic/welcome-comic.svg"]')).toBeVisible();
  await page.getByRole('button', { name: '先逛逛' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('体验模式')).toBeVisible();

  await page.locator('nav a[href="/tasks"]').click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole('heading').first()).toBeVisible();

  await page.locator('nav a[href="/rewards"]').click();
  await expect(page).toHaveURL(/\/rewards$/);
  await expect(page.getByRole('heading').first()).toBeVisible();

  await page.locator('nav a[href="/profile"]').click();
  await expect(page).toHaveURL(/\/profile$/);
  await page.getByText('主题皮肤').click();
  await expect(page).toHaveURL(/\/settings\/appearance$/);
  await expect(page.getByText('绿色漫画风')).toBeVisible();

  await page.goto('/plans');
  await expect(page.getByRole('heading').first()).toBeVisible();
  await page.goto('/plans/smart-recommend');
  await expect(page.getByRole('heading').first()).toBeVisible();

  await page.screenshot({ path: '/tmp/forest-family-mobile-smoke.png', fullPage: true });

  if (runtimeErrors.length > 0) {
    throw new Error(`Runtime errors:\n${runtimeErrors.join('\n')}`);
  }

  console.log(`Mobile smoke passed: ${baseURL}`);
} finally {
  await browser.close();
}
