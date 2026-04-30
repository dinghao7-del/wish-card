import { test, expect } from '@playwright/test';

test('最简单的测试 - 首页能否访问', async ({ page }) => {
  // 只测试页面能否访问，不做任何断言
  await page.goto('/');
  console.log('页面加载完成');
});
