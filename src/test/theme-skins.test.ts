import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyThemeSkin,
  getActiveThemeSkin,
  getSelectableThemeSkins,
  getThemeSkin,
  saveActiveThemeSkin,
  THEME_SKIN_STORAGE_KEY,
  THEME_SKINS,
} from '../lib/themeSkins';
import { UI_TOKENS } from '../lib/uiTokens';

describe('theme skins', () => {
  beforeEach(() => {
    localStorage.removeItem(THEME_SKIN_STORAGE_KEY);
    delete document.documentElement.dataset.themeSkin;
  });

  it('uses forest comic as the stable default skin', () => {
    const skin = getThemeSkin();

    expect(skin.id).toBe('forest-comic');
    expect(skin.status).toBe('active');
    expect(skin.assets.welcomeIllustration).toBe('/skins/forest-comic/welcome-comic.svg');
    expect(THEME_SKINS['forest-comic'].tokens.color.primary).toBe('#006e1c');
    expect(THEME_SKINS['forest-comic'].tokens.color.rewardDisplay).toBe(UI_TOKENS.color.semantic.rewardDisplay);
    expect(THEME_SKINS['forest-comic'].platformSupport).toEqual({
      web: true,
      miniProgram: true,
      android: true,
      ios: true,
    });
    expect(THEME_SKINS['forest-comic'].accessibility.minimumContrast).toBe('WCAG-AA');
  });

  it('falls back to default when a stored skin is not available', () => {
    localStorage.setItem(THEME_SKIN_STORAGE_KEY, 'missing-skin');

    expect(getActiveThemeSkin().id).toBe('forest-comic');
  });

  it('keeps the flat comic skin planned instead of mixing it into the active UI', () => {
    expect(THEME_SKINS['flat-comic'].status).toBe('planned');
    expect(THEME_SKINS['flat-comic'].platformSupport.web).toBe(true);
    expect(getThemeSkin('flat-comic').id).toBe('flat-comic');
  });

  it('exposes all skins for settings while only saving active skins', () => {
    expect(getSelectableThemeSkins().map(skin => skin.id)).toEqual(['forest-comic', 'flat-comic']);

    const selectedSkin = saveActiveThemeSkin('flat-comic');

    expect(selectedSkin.id).toBe('forest-comic');
    expect(saveActiveThemeSkin('flat-comic').id).toBe('forest-comic');
    expect(localStorage.getItem(THEME_SKIN_STORAGE_KEY)).toBe('forest-comic');
    expect(document.documentElement.dataset.themeSkin).toBe('forest-comic');
  });

  it('applies the selected skin id to the document for future CSS hooks', () => {
    const appliedSkin = applyThemeSkin('forest-comic');

    expect(appliedSkin.id).toBe('forest-comic');
    expect(document.documentElement.dataset.themeSkin).toBe('forest-comic');
  });
});
