import Taro from '@tarojs/taro';

export type ThemeSkinId = 'forest-comic' | 'flat-comic' | 'arcade-comic';

export interface MiniThemeSkin {
  id: ThemeSkinId;
  name: string;
  description: string;
  status: 'active' | 'planned';
  className: string;
  preview: {
    primary: string;
    secondary: string;
    background: string;
  };
}

export const THEME_SKIN_STORAGE_KEY = 'wishcard-theme-skin';

export const MINI_THEME_SKINS: MiniThemeSkin[] = [
  {
    id: 'forest-comic',
    name: '绿色漫画风',
    description: '当前正式皮肤，适合家庭管家主线体验。',
    status: 'active',
    className: 'theme-forest-comic',
    preview: { primary: '#006e1c', secondary: '#f0e269', background: '#fbf9f5' },
  },
  {
    id: 'flat-comic',
    name: '简约平面漫画风',
    description: '保留给新版 UI 包，当前作为候选皮肤展示。',
    status: 'planned',
    className: 'theme-flat-comic',
    preview: { primary: '#0f8f43', secondary: '#ffd95a', background: '#fffaf0' },
  },
  {
    id: 'arcade-comic',
    name: '电玩漫画风',
    description: '黄黑厚描边、任务积分感更强，适合游戏化氛围。',
    status: 'active',
    className: 'theme-arcade-comic',
    preview: { primary: '#ffe100', secondary: '#00c8e8', background: '#f4f4f4' },
  },
];

const DEFAULT_SKIN_ID: ThemeSkinId = 'forest-comic';

export function getThemeSkin(skinId?: string | null): MiniThemeSkin {
  return MINI_THEME_SKINS.find(skin => skin.id === skinId) || MINI_THEME_SKINS[0];
}

export function getActiveThemeSkin(): MiniThemeSkin {
  try {
    return getThemeSkin(Taro.getStorageSync(THEME_SKIN_STORAGE_KEY));
  } catch {
    return getThemeSkin(DEFAULT_SKIN_ID);
  }
}

export function getThemeClass(): string {
  return getActiveThemeSkin().className;
}

export function saveActiveThemeSkin(skinId: ThemeSkinId): MiniThemeSkin {
  const requested = getThemeSkin(skinId);
  const skin = requested.status === 'active' ? requested : getThemeSkin(DEFAULT_SKIN_ID);
  try {
    Taro.setStorageSync(THEME_SKIN_STORAGE_KEY, skin.id);
  } catch {}
  return skin;
}
