import { describe, expect, it } from 'vitest';
import { UI_TOKENS } from '../lib/uiTokens';

describe('canonical UI tokens', () => {
  it('defines the light color palette contract', () => {
    expect(UI_TOKENS.color.light.primary).toBe('#006e1c');
    expect(UI_TOKENS.color.light.primaryContainer).toBe('#4caf50');
    expect(UI_TOKENS.color.light.background).toBe('#fbf9f5');
    expect(UI_TOKENS.color.light.surfaceContainerLow).toBe('#f5f3ef');
    expect(UI_TOKENS.color.light.outlineVariant).toBe('#becab9');
  });

  it('defines the radius scale contract', () => {
    expect(UI_TOKENS.radius).toEqual({
      small: 8,
      medium: 16,
      large: 24,
      full: 9999,
    });
  });

  it('defines the navigation tab labels contract', () => {
    expect(UI_TOKENS.navigation.tabs.map((tab) => tab.label)).toEqual([
      '首页',
      '任务',
      '奖惩',
      '心愿',
      '我的',
    ]);
  });
});
