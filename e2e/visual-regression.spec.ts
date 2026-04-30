import { test, expect } from '@playwright/test';

test.describe('视觉回归测试 - 设计系统统一', () => {
  test.beforeEach(async ({ page }) => {
    // 增加超时时间
    test.setTimeout(60000);
  });

  test('Home 页面视觉快照', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1000); // 等待动画完成
    
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('Test Design System 页面视觉快照', async ({ page }) => {
    await page.goto('/test-design', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('test-design-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('Dark 模式视觉快照', async ({ page }) => {
    // 切换到 Dark 模式
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('home-page-dark.png', {
      fullPage: true,
      maxDiffPixels: 500, // 增加容差以适应不同浏览器渲染
    });
  });

  test('移动端视觉快照', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('home-page-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
