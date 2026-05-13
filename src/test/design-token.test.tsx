import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { UI_TOKENS } from '../lib/uiTokens';

const toAndroidArgb = (hex: string) => `#FF${hex.slice(1).toUpperCase()}`;

const readText = (filePath: string) => readFileSync(resolve(process.cwd(), filePath), 'utf8');

const readCssVar = (source: string, name: string) => {
  const match = source.match(new RegExp(`${name}:\\s*([^;]+);`));
  return match?.[1];
};

const readAndroidColor = (source: string, name: string) => {
  const match = source.match(new RegExp(`<color name="${name}">([^<]+)</color>`));
  return match?.[1];
};

const readScssVar = (source: string, name: string) => {
  const match = source.match(new RegExp(`\\${name}:\\s*([^;]+);`));
  return match?.[1];
};

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

  it('keeps platform token resources aligned with canonical colors', () => {
    const webCss = readText('src/index.css');
    expect(readCssVar(webCss, '--color-primary')).toBe(UI_TOKENS.color.light.primary);
    expect(readCssVar(webCss, '--color-primary-container')).toBe(UI_TOKENS.color.light.primaryContainer);
    expect(readCssVar(webCss, '--color-reward-display')).toBe(UI_TOKENS.color.semantic.rewardDisplay);
    expect(readCssVar(webCss, '--color-background')).toBe(UI_TOKENS.color.light.background);
    expect(readCssVar(webCss, '--color-surface-container-low')).toBe(UI_TOKENS.color.light.surfaceContainerLow);

    const androidColors = readText('android/app/src/main/res/values/colors.xml');
    Object.entries({
      primary: UI_TOKENS.color.light.primary,
      primary_container: UI_TOKENS.color.light.primaryContainer,
      background: UI_TOKENS.color.light.background,
      surface: UI_TOKENS.color.light.surface,
      surface_container_low: UI_TOKENS.color.light.surfaceContainerLow,
      surface_container: UI_TOKENS.color.light.surfaceContainer,
      surface_container_high: UI_TOKENS.color.light.surfaceContainerHigh,
      on_surface: UI_TOKENS.color.light.onSurface,
      on_surface_variant: UI_TOKENS.color.light.onSurfaceVariant,
      outline: UI_TOKENS.color.light.outline,
      outline_variant: UI_TOKENS.color.light.outlineVariant,
      error: UI_TOKENS.color.semantic.danger,
    }).forEach(([name, value]) => {
      expect(readAndroidColor(androidColors, name)).toBe(toAndroidArgb(value));
    });
    expect(readAndroidColor(androidColors, 'on_primary')).toBe('#FFFFFFFF');
    expect(readAndroidColor(androidColors, 'error_container')).toBe('#FFFFDAD6');
    expect(androidColors).not.toContain('#FF9AF2A7');
    expect(androidColors).not.toContain('#FFF7FBF2');

    const miniProgramStyles = readText('miniprogram/src/app.scss');
    expect(readScssVar(miniProgramStyles, '$primary-color')).toBe(UI_TOKENS.color.light.primary);
    expect(readScssVar(miniProgramStyles, '$primary-container')).toBe(UI_TOKENS.color.light.primaryContainer);
    expect(readScssVar(miniProgramStyles, '$bg-color')).toBe(UI_TOKENS.color.light.background);
    expect(readScssVar(miniProgramStyles, '$surface-container-low')).toBe(UI_TOKENS.color.light.surfaceContainerLow);
    expect(miniProgramStyles).toContain('@mixin ui-card($padding: 24rpx)');
    expect(miniProgramStyles).toContain('background-color: $card-bg;');
    expect(miniProgramStyles).toContain('@mixin ui-primary-button');
    expect(miniProgramStyles).toContain('min-height: 88rpx;');
    expect(miniProgramStyles).toContain('background-color: $primary-color;');
    expect(miniProgramStyles).toContain('@mixin ui-input');
    expect(miniProgramStyles).toContain('border: 2rpx solid $border-color;');

    const iosTokens = readText('ios/App/App/Extensions/UIColor+DesignTokens.swift');
    [
      'surfaceContainerLowToken',
      'surfaceContainerToken',
      'surfaceContainerHighToken',
      'outlineToken',
      'outlineVariantToken',
    ].forEach((alias) => {
      expect(iosTokens).toContain(`static let ${alias} = Color(UIColor.`);
    });
  });
});
