import { UI_TOKENS } from './uiTokens';

export type ThemeSkinId = 'forest-comic' | 'flat-comic' | 'arcade-comic';

export interface ThemeSkin {
  id: ThemeSkinId;
  name: string;
  description: string;
  status: 'active' | 'planned';
  assets: {
    welcomeIllustration: string;
    emptyTasks?: string;
    emptyRewards?: string;
    achievement?: string;
  };
  tokens: {
    color: {
      primary: string;
      primaryContainer: string;
      background: string;
      surfaceContainerLow: string;
      outlineVariant: string;
      rewardDisplay: string;
    };
    radius: typeof UI_TOKENS.radius;
  };
  platformSupport: {
    web: boolean;
    miniProgram: boolean;
    android: boolean;
    ios: boolean;
  };
  accessibility: {
    minimumContrast: 'WCAG-AA';
    reducedMotion: boolean;
  };
}

const LIGHT_COLOR_TOKENS = {
  primary: UI_TOKENS.color.light.primary,
  primaryContainer: UI_TOKENS.color.light.primaryContainer,
  background: UI_TOKENS.color.light.background,
  surfaceContainerLow: UI_TOKENS.color.light.surfaceContainerLow,
  outlineVariant: UI_TOKENS.color.light.outlineVariant,
  rewardDisplay: UI_TOKENS.color.semantic.rewardDisplay,
};

const ARCADE_COMIC_COLOR_TOKENS = {
  primary: UI_TOKENS.color.arcadeComic.primary,
  primaryContainer: UI_TOKENS.color.arcadeComic.primaryContainer,
  background: UI_TOKENS.color.arcadeComic.background,
  surfaceContainerLow: UI_TOKENS.color.arcadeComic.surfaceContainerLow,
  outlineVariant: UI_TOKENS.color.arcadeComic.outlineVariant,
  rewardDisplay: UI_TOKENS.color.arcadeComic.rewardDisplay,
};

const CROSS_PLATFORM_SUPPORT = {
  web: true,
  miniProgram: true,
  android: true,
  ios: true,
};

const DEFAULT_ACCESSIBILITY = {
  minimumContrast: 'WCAG-AA',
  reducedMotion: true,
} as const;

export const THEME_SKINS: Record<ThemeSkinId, ThemeSkin> = {
  'forest-comic': {
    id: 'forest-comic',
    name: '绿色漫画风',
    description: '当前默认皮肤，强调轻松、正向、家庭陪伴感。',
    status: 'active',
    assets: {
      welcomeIllustration: '/skins/forest-comic/welcome-comic.svg',
    },
    tokens: {
      color: LIGHT_COLOR_TOKENS,
      radius: UI_TOKENS.radius,
    },
    platformSupport: CROSS_PLATFORM_SUPPORT,
    accessibility: DEFAULT_ACCESSIBILITY,
  },
  'flat-comic': {
    id: 'flat-comic',
    name: '简约平面漫画风',
    description: '预留给项目包中新版 UI 的候选皮肤，暂不直接混入主界面。',
    status: 'planned',
    assets: {
      welcomeIllustration: '/skins/forest-comic/welcome-comic.svg',
    },
    tokens: {
      color: LIGHT_COLOR_TOKENS,
      radius: UI_TOKENS.radius,
    },
    platformSupport: CROSS_PLATFORM_SUPPORT,
    accessibility: DEFAULT_ACCESSIBILITY,
  },
  'arcade-comic': {
    id: 'arcade-comic',
    name: '电玩漫画风',
    description: '黄黑厚描边、积分任务感强的游戏化 UI 模板。',
    status: 'active',
    assets: {
      welcomeIllustration: '/skins/arcade-comic/welcome-comic.svg',
    },
    tokens: {
      color: ARCADE_COMIC_COLOR_TOKENS,
      radius: UI_TOKENS.radius,
    },
    platformSupport: CROSS_PLATFORM_SUPPORT,
    accessibility: DEFAULT_ACCESSIBILITY,
  },
};

const DEFAULT_SKIN_ID: ThemeSkinId = 'forest-comic';

export const THEME_SKIN_STORAGE_KEY = 'wishcard-theme-skin';

export function getThemeSkin(skinId?: string | null): ThemeSkin {
  if (skinId && Object.prototype.hasOwnProperty.call(THEME_SKINS, skinId)) {
    return THEME_SKINS[skinId as ThemeSkinId];
  }
  return THEME_SKINS[DEFAULT_SKIN_ID];
}

export function getActiveThemeSkin(): ThemeSkin {
  if (typeof window === 'undefined') return getThemeSkin();
  return getThemeSkin(window.localStorage.getItem(THEME_SKIN_STORAGE_KEY));
}

export function getSelectableThemeSkins(): ThemeSkin[] {
  return Object.values(THEME_SKINS);
}

export function applyThemeSkin(skinId?: string | null): ThemeSkin {
  const skin = skinId === undefined ? getActiveThemeSkin() : getThemeSkin(skinId);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.themeSkin = skin.id;
  }
  return skin;
}

export function saveActiveThemeSkin(skinId: ThemeSkinId): ThemeSkin {
  const requestedSkin = getThemeSkin(skinId);
  const skinToSave = requestedSkin.status === 'active' ? requestedSkin : getThemeSkin(DEFAULT_SKIN_ID);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_SKIN_STORAGE_KEY, skinToSave.id);
  }

  return applyThemeSkin(skinToSave.id);
}
