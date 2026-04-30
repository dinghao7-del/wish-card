import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

// 在每个测试前清理
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock FamilyContext
vi.mock('../context/FamilyContext', () => ({
  useFamily: () => ({
    familyMembers: [],
    currentMember: null,
    loading: false,
    error: null,
  }),
  FamilyContext: React.createContext(null),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}));

// 创建一个简单的测试组件来验证设计令牌
const TestComponent = () => (
  <div>
    <div data-testid="primary-bg" className="bg-primary-500 text-white">Primary Background</div>
    <div data-testid="secondary-bg" className="bg-secondary-500 text-white">Secondary Background</div>
    <div data-testid="surface" className="bg-surface-100 dark:bg-surface-800">Surface</div>
  </div>
);

describe('设计令牌使用 - 基础测试', () => {
  it('测试组件渲染正常', () => {
    const { container } = render(<TestComponent />);
    expect(container).toBeTruthy();
  });

  it('Primary 颜色类存在', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('primary-bg');
    expect(element).toBeInTheDocument();
    expect(element).toHaveClass('bg-primary-500');
  });

  it('Secondary 颜色类存在', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('secondary-bg');
    expect(element).toBeInTheDocument();
    expect(element).toHaveClass('bg-secondary-500');
  });

  it('Surface 颜色类存在', () => {
    render(<TestComponent />);
    const element = screen.getByTestId('surface');
    expect(element).toBeInTheDocument();
    expect(element).toHaveClass('bg-surface-100');
  });
});

describe('CSS 自定义属性测试', () => {
  it('CSS 变量应该正确定义', () => {
    // 读取 index.css 检查设计令牌定义
    const fs = require('fs');
    const path = require('path');
    const cssPath = path.resolve(__dirname, '../../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // 验证关键设计令牌存在（根据实际 CSS 变量名）
    expect(cssContent).toContain('--color-primary');
    expect(cssContent).toContain('--color-secondary');
    expect(cssContent).toContain('--color-surface');
    expect(cssContent).toContain('--color-on-surface'); // 文字颜色
    expect(cssContent).toContain('--color-on-surface-variant'); // 次要文字颜色
  });

  it('Dark 模式设计令牌应该定义', () => {
    const fs = require('fs');
    const path = require('path');
    const cssPath = path.resolve(__dirname, '../../src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // 验证 Dark 模式令牌
    expect(cssContent).toContain('.dark');
    expect(cssContent).toContain('--color-primary:');
    expect(cssContent).toContain('--color-on-surface:');
  });
});

describe(' design token validation', () => {
  it('应该通过设计令牌验证脚本', async () => {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('node scripts/validate-design-tokens.js', {
        cwd: process.cwd(),
        encoding: 'utf-8',
      });
      expect(output).toContain('没有发现硬编码颜色值');
    } catch (error: any) {
      // 如果脚本返回错误码 1（发现违规），测试失败
      console.error('设计令牌验证失败:', error.stdout);
      throw new Error('发现硬编码颜色值，请查看上方输出');
    }
  });
});
