export type ThemeSkinTemplateId = 'forest-comic-base' | 'arcade-comic';

type ComponentRecipeKey =
  | 'appShell'
  | 'topBar'
  | 'bottomNav'
  | 'energyCard'
  | 'quickAction'
  | 'taskCard'
  | 'rewardPromo'
  | 'rewardCard'
  | 'habitCard'
  | 'modal';

export interface ThemeSkinComponentRecipe {
  role: string;
  hooks: string[];
  structure: string;
  behavior: 'preserve-existing-flow';
}

export interface ThemeSkinTemplate {
  id: ThemeSkinTemplateId;
  dataThemeSkin: string;
  visualLanguage: string;
  pagePatterns: {
    home: string;
    tasks: string;
    rewards: string;
    habits: string;
    profile: string;
  };
  componentRecipes: Record<ComponentRecipeKey, ThemeSkinComponentRecipe>;
}

const preserveFlow = 'preserve-existing-flow' as const;

export const FOREST_COMIC_BASE_TEMPLATE: ThemeSkinTemplate = {
  id: 'forest-comic-base',
  dataThemeSkin: 'forest-comic',
  visualLanguage: 'Soft comic surface system with calm family companion tone.',
  pagePatterns: {
    home: 'Soft dashboard cards with rounded stats and gentle progress.',
    tasks: 'List-first task cards with clear status and compact actions.',
    rewards: 'Reward grid with soft image surfaces and compact redemption controls.',
    habits: 'Two-tab habit and penalty grid with lightweight reward emphasis.',
    profile: 'Profile settings grouped into calm rounded surface panels.',
  },
  componentRecipes: {
    appShell: {
      role: 'Default mobile shell',
      hooks: ['ui-app-content'],
      structure: 'Single max-width mobile column with safe bottom padding.',
      behavior: preserveFlow,
    },
    topBar: {
      role: 'Soft translucent page top bar',
      hooks: ['ui-top-app-bar'],
      structure: 'Avatar, title/action group, and optional notification entry.',
      behavior: preserveFlow,
    },
    bottomNav: {
      role: 'Soft bottom navigation',
      hooks: ['ui-bottom-nav', 'ui-bottom-nav-item-active'],
      structure: 'Five persistent navigation entries with one highlighted route.',
      behavior: preserveFlow,
    },
    energyCard: {
      role: 'Home energy summary',
      hooks: ['ui-energy-card', 'ui-energy-stat', 'ui-energy-progress'],
      structure: 'Greeting, mood action, stats, and progress in one card.',
      behavior: preserveFlow,
    },
    quickAction: {
      role: 'Home quick action',
      hooks: ['ui-quick-action'],
      structure: 'Icon-first compact action tile.',
      behavior: preserveFlow,
    },
    taskCard: {
      role: 'Task status card',
      hooks: ['ui-task-card'],
      structure: 'Leading status stripe, task metadata, and trailing action.',
      behavior: preserveFlow,
    },
    rewardPromo: {
      role: 'Reward promo banner',
      hooks: ['ui-reward-promo', 'ui-reward-promo-icon'],
      structure: 'Promotional heading, copy, action button, and supporting icon.',
      behavior: preserveFlow,
    },
    rewardCard: {
      role: 'Reward item card',
      hooks: ['ui-reward-card', 'ui-reward-card-media', 'ui-reward-card-body'],
      structure: 'Image, reward name, cost, progress, and redemption action.',
      behavior: preserveFlow,
    },
    habitCard: {
      role: 'Habit item card',
      hooks: ['ui-habit-card', 'ui-habit-type-badge', 'ui-habit-dot-row'],
      structure: 'Habit icon, type badge, title, value, and repeat dots.',
      behavior: preserveFlow,
    },
    modal: {
      role: 'Modal and action sheet',
      hooks: ['ui-panel', 'ui-panel-compact'],
      structure: 'Rounded modal surfaces with existing form and action content.',
      behavior: preserveFlow,
    },
  },
};

export const ARCADE_COMIC_TEMPLATE: ThemeSkinTemplate = {
  id: 'arcade-comic',
  dataThemeSkin: 'arcade-comic',
  visualLanguage: 'High-impact yellow and black arcade comic system with thick outlines, hard shadows, and flexible card shapes.',
  pagePatterns: {
    home: 'Brand header, yellow hero card, black scoreboard strip, color quick actions, and thick outlined task cards.',
    tasks: 'Yellow header, pill filters, bold section labels, and thick outlined task rows.',
    rewards: 'Wishlist header, yellow promo banner, two-column product cards, black redeem buttons, and visible savings progress.',
    habits: 'Streak summary, two-tab habit switcher, tall habit cards, dot progress, and next reward banner.',
    profile: 'Thick outlined member cards and grouped settings panels with black hard shadows.',
  },
  componentRecipes: {
    appShell: {
      role: 'Arcade mobile shell',
      hooks: ['ui-app-content'],
      structure: 'Single mobile column with extra bottom clearance for thick fixed navigation.',
      behavior: preserveFlow,
    },
    topBar: {
      role: 'Yellow comic top bar',
      hooks: ['ui-home-header', 'ui-rewards-header', 'ui-habit-header', 'ui-top-app-bar'],
      structure: 'High-saturation yellow bar with avatar, brand/title, score pill, and action icon.',
      behavior: preserveFlow,
    },
    bottomNav: {
      role: 'Arcade bottom navigation',
      hooks: ['ui-bottom-nav', 'ui-bottom-nav-item-active'],
      structure: 'White nav tray with thick black border, hard shadow, and yellow selected tab.',
      behavior: preserveFlow,
    },
    energyCard: {
      role: 'Arcade home energy card',
      hooks: ['ui-energy-card', 'ui-energy-scoreboard', 'ui-energy-stat', 'ui-energy-progress'],
      structure: 'Yellow hero panel, black scoreboard strip, yellow stat blocks, hot badge, and bold progress.',
      behavior: preserveFlow,
    },
    quickAction: {
      role: 'Arcade quick action tile',
      hooks: ['ui-quick-action'],
      structure: 'Color-blocked icon tile with thick border and hard shadow.',
      behavior: preserveFlow,
    },
    taskCard: {
      role: 'Arcade task row',
      hooks: ['ui-task-card', 'ui-comic-button'],
      structure: 'White task row with black outline, hard shadow, colored status stripe, and yellow action button.',
      behavior: preserveFlow,
    },
    rewardPromo: {
      role: 'Arcade reward promo',
      hooks: ['ui-reward-promo', 'ui-reward-promo-icon'],
      structure: 'Yellow headline banner with black CTA and oversized white circular icon crop.',
      behavior: preserveFlow,
    },
    rewardCard: {
      role: 'Arcade reward product card',
      hooks: ['ui-reward-card', 'ui-reward-card-media', 'ui-reward-card-body', 'ui-reward-action'],
      structure: 'Two-column product card with image top, white info area, bold cost, progress, and black redemption button.',
      behavior: preserveFlow,
    },
    habitCard: {
      role: 'Arcade habit card',
      hooks: ['ui-habit-card', 'ui-habit-type-badge', 'ui-habit-dot-row', 'ui-habit-next-reward'],
      structure: 'Tall two-column habit card with icon tile, reward/penalty badge, value, repeat dots, and next reward banner.',
      behavior: preserveFlow,
    },
    modal: {
      role: 'Arcade modal surface',
      hooks: ['ui-panel', 'ui-panel-compact', 'ui-comic-card'],
      structure: 'Existing modal content on thick outlined white panels with hard shadows.',
      behavior: preserveFlow,
    },
  },
};

export const THEME_SKIN_TEMPLATES: Record<ThemeSkinTemplateId, ThemeSkinTemplate> = {
  'forest-comic-base': FOREST_COMIC_BASE_TEMPLATE,
  'arcade-comic': ARCADE_COMIC_TEMPLATE,
};
