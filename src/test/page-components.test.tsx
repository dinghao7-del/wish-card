import { describe, it, expect } from 'vitest';

describe('设计令牌 CSS 类验证', () => {
  it('应该包含 Tailwind 设计令牌类', () => {
    const fs = require('fs');
    const path = require('path');
    
    // 检查 index.css 是否包含设计令牌
    const cssPath = path.resolve(__dirname, '../../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    
    // 验证关键设计令牌
    expect(cssContent).toContain('--color-primary');
    expect(cssContent).toContain('--color-secondary');
    expect(cssContent).toContain('--color-surface');
    expect(cssContent).toContain('--color-on-surface');
  });

  it('Tailwind 配置文件应该正确配置', () => {
    const fs = require('fs');
    const path = require('path');
    
    const configPath = path.resolve(__dirname, '../../tailwind.config.js');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    
    // 验证 Tailwind 配置包含设计令牌
    expect(configContent).toContain('colors');
  });

  it('设计令牌验证脚本应该可执行', () => {
    const fs = require('fs');
    const path = require('path');
    
    const scriptPath = path.resolve(__dirname, '../../scripts/validate-design-tokens.js');
    const scriptExists = fs.existsSync(scriptPath);
    
    expect(scriptExists).toBeTruthy();
  });

  it('测试文件应该存在', () => {
    const fs = require('fs');
    const path = require('path');
    
    // 验证关键测试文件存在
    const testFiles = [
      path.resolve(__dirname, './design-token.test.tsx'),
      path.resolve(__dirname, '../../e2e/visual-regression.spec.ts'),
      path.resolve(__dirname, '../../e2e/navigation.spec.ts'),
    ];
    
    testFiles.forEach(filePath => {
      expect(fs.existsSync(filePath)).toBeTruthy();
    });
  });
});
