import { test, expect } from '@playwright/test';

test.describe('导航测试', () => {
  test('首页加载正常', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // 验证页面标题
    await expect(page).toHaveTitle(/愿望卡/);
    
    // 验证主要内容加载
    await expect(page.locator('body')).toBeVisible();
  });

  test('测试设计系统页面可访问', async ({ page }) => {
    await page.goto('/test-design', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // 验证页面包含设计系统内容
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 10000 });
  });

  test('响应式布局 - 移动端', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // 验证移动端布局
    await expect(page.locator('body')).toBeVisible();
  });

  test('响应式布局 - 平板', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('响应式布局 - 桌面', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await expect(page.locator('body')).toBeVisible();
  });
});
