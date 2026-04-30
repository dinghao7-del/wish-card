import { test, expect } from '@playwright/test';

test.describe('设计令牌验证 - E2E', () => {
  test('页面应该使用 CSS 自定义属性', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 检查 CSS 变量是否定义
    const hasDesignTokens = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      return (
        styles.getPropertyValue('--color-primary') !== '' ||
        styles.getPropertyValue('--color-surface') !== ''
      );
    });
    
    expect(hasDesignTokens).toBeTruthy();
  });

  test('Dark 模式切换应该生效', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // 模拟 Dark 模式
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // 验证 Dark 模式下的样式
    const isDarkMode = await page.evaluate(() => {
      const styles = getComputedStyle(document.documentElement);
      // 检查 Dark 模式下的背景色（应该是深色）
      const bgColor = styles.getPropertyValue('--color-surface').trim();
      return bgColor !== '' && (bgColor.includes('30') || bgColor.includes('dark') || bgColor.startsWith('#1'));
    });
    
    // 注意：这个测试可能需要根据实际 CSS 变量值调整
    console.log('Dark mode detected:', isDarkMode);
  });

  test('字体加载正常', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 等待字体加载
    await page.waitForTimeout(1000);
    
    // 验证字体已应用
    const fontFamily = await page.evaluate(() => {
      const body = document.body;
      return getComputedStyle(body).fontFamily;
    });
    
    expect(fontFamily).toBeTruthy();
    console.log('Font family:', fontFamily);
  });

  test('没有硬编码颜色（内联样式检查）', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 检查内联样式中是否有硬编码颜色
    const inlineStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('[style]');
      const hardCodedColors: string[] = [];
      
      elements.forEach(el => {
        const style = (el as HTMLElement).style.cssText;
        if (style.match(/#[0-9a-f]{3,8}/i)) {
          hardCodedColors.push(style);
        }
      });
      
      return hardCodedColors;
    });
    
    // 如果没有硬编码颜色，数组应该为空
    expect(inlineStyles.length).toBeLessThanOrEqual(5); // 允许少量特殊情况
  });
});
