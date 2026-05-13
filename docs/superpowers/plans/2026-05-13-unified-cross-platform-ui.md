# Unified Cross-Platform UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize UI tokens, navigation, shell behavior, skin templates, and enforcement across Web, Capacitor Android/iOS, and the WeChat mini program.

**Architecture:** Treat `DESIGN_TOKENS.md` and the implementation token modules as the single source of UI truth. Ship a small shared token package in `src/lib/uiTokens.ts`, map it into Web CSS, native resource files, and mini program SCSS, then tighten navigation and skin validation around those values. Page-level cleanup proceeds after the shared primitives are locked.

**Tech Stack:** React 18, Vite, Tailwind CSS v4, Vitest, Capacitor Android/iOS, Taro mini program SCSS/TSX, Node validation scripts.

---

## File Structure

- Create `src/lib/uiTokens.ts`: canonical token object shared by tests, scripts, and theme skin validation.
- Modify `src/index.css`: align Web CSS variables and add skin hook variables.
- Modify `src/lib/themeSkins.ts`: extend skin metadata with token overlays, platform support, and accessibility fields.
- Modify `src/test/theme-skins.test.ts`: verify skin contract and default fallback.
- Modify `src/test/design-token.test.tsx`: replace stale Tailwind class expectations with canonical token checks.
- Modify `scripts/validate-design-tokens.js`: make validation baseline-aware so existing debt can be tracked while new drift is blocked.
- Modify `android/app/src/main/res/values/colors.xml`: align Android native resource values.
- Modify `ios/App/App/Extensions/UIColor+DesignTokens.swift`: expose all core token aliases used by native shell surfaces.
- Modify `miniprogram/src/app.scss`: align variables and add mixins for card, button, input, safe area, and tab surfaces.
- Modify `miniprogram/src/app.config.ts`: align tab labels and colors.
- Modify `miniprogram/src/components/TabLayout/index.tsx`: align embedded tab labels and active colors.
- Modify `miniprogram/src/components/TabLayout/index.scss`: use global variables and safe-area rules.
- Modify `src/components/BottomNav.tsx`: make Web nav labels, active states, safe area, and center tab match the standard.
- Modify `src/components/navigation/TopAppBar.tsx`: enforce safe-area padding and tokenized top-bar shell.
- Create `scripts/ui-token-baseline.json`: checked-in current allowed hard-coded color baseline for incremental cleanup.
- Create or modify `scripts/validate-theme-skins.js`: validate required skin metadata and assets.

## Task 1: Canonical Token Module

**Files:**
- Create: `src/lib/uiTokens.ts`
- Modify: `src/test/design-token.test.tsx`

- [ ] **Step 1: Replace stale token expectations with canonical token tests**

Edit `src/test/design-token.test.tsx` so it imports `UI_TOKENS` and validates exact token values instead of classes like `bg-primary-500`, which are not the current Tailwind v4 token names.

```ts
import { describe, it, expect } from 'vitest';
import { UI_TOKENS } from '../lib/uiTokens';

describe('canonical UI tokens', () => {
  it('defines cross-platform light color tokens', () => {
    expect(UI_TOKENS.color.light.primary).toBe('#006e1c');
    expect(UI_TOKENS.color.light.primaryContainer).toBe('#4caf50');
    expect(UI_TOKENS.color.light.background).toBe('#fbf9f5');
    expect(UI_TOKENS.color.light.surfaceContainerLow).toBe('#f5f3ef');
    expect(UI_TOKENS.color.light.outlineVariant).toBe('#becab9');
  });

  it('defines stable radius roles', () => {
    expect(UI_TOKENS.radius).toEqual({
      small: 8,
      medium: 16,
      large: 24,
      full: 9999,
    });
  });

  it('defines shared navigation labels', () => {
    expect(UI_TOKENS.navigation.tabs.map(tab => tab.label)).toEqual([
      '首页',
      '任务',
      '奖惩',
      '心愿',
      '我的',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails before the module exists**

Run: `npm run test -- src/test/design-token.test.tsx`

Expected: FAIL with an import error for `../lib/uiTokens`.

- [ ] **Step 3: Add canonical token module**

Create `src/lib/uiTokens.ts`:

```ts
export const UI_TOKENS = {
  color: {
    light: {
      primary: '#006e1c',
      primaryContainer: '#4caf50',
      secondary: '#686000',
      secondaryContainer: '#f0e269',
      background: '#fbf9f5',
      surface: '#fbf9f5',
      surfaceContainerLow: '#f5f3ef',
      surfaceContainer: '#efeeea',
      surfaceContainerHigh: '#eae8e4',
      surfaceContainerHighest: '#e4e2de',
      onSurface: '#1b1c1a',
      onSurfaceVariant: '#3f4a3c',
      outline: '#6f7a6b',
      outlineVariant: '#becab9',
    },
    dark: {
      primary: '#81d67a',
      primaryContainer: '#008126',
      secondary: '#f0e269',
      secondaryContainer: '#3f4a3c',
      background: '#1b1c1a',
      surface: '#1b1c1a',
      surfaceContainerLow: '#242522',
      surfaceContainer: '#2b2c29',
      surfaceContainerHigh: '#31322f',
      surfaceContainerHighest: '#373834',
      onSurface: '#e4e2de',
      onSurfaceVariant: '#becab9',
      outline: '#6f7a6b',
      outlineVariant: '#becab9',
    },
    semantic: {
      q1: '#E57373',
      q2: '#64B5F6',
      q3: '#FFD54F',
      q4: '#90A4AE',
      pending: '#FFB74D',
      inProgress: '#4FC3F7',
      reviewing: '#BA68C8',
      completed: '#81C784',
      reward: '#FFD600',
      rewardDeep: '#F9A825',
      danger: '#E57373',
    },
  },
  radius: {
    small: 8,
    medium: 16,
    large: 24,
    full: 9999,
  },
  spacing: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
  touch: {
    minimum: 44,
  },
  navigation: {
    tabs: [
      { id: 'home', label: '首页', path: '/' },
      { id: 'tasks', label: '任务', path: '/tasks' },
      { id: 'habits', label: '奖惩', path: '/habits', highlight: true },
      { id: 'rewards', label: '心愿', path: '/rewards' },
      { id: 'profile', label: '我的', path: '/profile' },
    ],
  },
} as const;

export type UiTokens = typeof UI_TOKENS;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/test/design-token.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/uiTokens.ts src/test/design-token.test.tsx
git commit -m "feat: add canonical ui tokens"
```

## Task 2: Theme Skin Template Contract

**Files:**
- Modify: `src/lib/themeSkins.ts`
- Modify: `src/test/theme-skins.test.ts`
- Create: `scripts/validate-theme-skins.js`
- Modify: `package.json`

- [ ] **Step 1: Add failing skin contract tests**

Append this test block to `src/test/theme-skins.test.ts`:

```ts
it('defines template metadata required for future skins', () => {
  const skin = THEME_SKINS['forest-comic'];

  expect(skin.tokens.color.primary).toBe('#006e1c');
  expect(skin.platformSupport).toEqual({
    web: true,
    miniProgram: true,
    android: true,
    ios: true,
  });
  expect(skin.accessibility.minimumContrast).toBe('WCAG-AA');
});

it('keeps planned skins selectable but not saveable until active', () => {
  const planned = THEME_SKINS['flat-comic'];

  expect(planned.status).toBe('planned');
  expect(planned.platformSupport.web).toBe(true);
  expect(saveActiveThemeSkin('flat-comic').id).toBe('forest-comic');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/test/theme-skins.test.ts`

Expected: FAIL because `tokens`, `platformSupport`, and `accessibility` are missing.

- [ ] **Step 3: Extend skin metadata**

Modify `src/lib/themeSkins.ts`:

```ts
import { UI_TOKENS } from './uiTokens';

export type ThemeSkinId = 'forest-comic' | 'flat-comic';

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
```

Set each skin with these additional fields:

```ts
tokens: {
  color: {
    primary: UI_TOKENS.color.light.primary,
    primaryContainer: UI_TOKENS.color.light.primaryContainer,
    background: UI_TOKENS.color.light.background,
    surfaceContainerLow: UI_TOKENS.color.light.surfaceContainerLow,
    outlineVariant: UI_TOKENS.color.light.outlineVariant,
  },
  radius: UI_TOKENS.radius,
},
platformSupport: {
  web: true,
  miniProgram: true,
  android: true,
  ios: true,
},
accessibility: {
  minimumContrast: 'WCAG-AA',
  reducedMotion: true,
},
```

- [ ] **Step 4: Add skin validation script**

Create `scripts/validate-theme-skins.js`:

```js
import fs from 'fs';
import path from 'path';

const themeSkinsFile = path.resolve('src/lib/themeSkins.ts');
const source = fs.readFileSync(themeSkinsFile, 'utf8');

const requiredSnippets = [
  'tokens:',
  'platformSupport:',
  'accessibility:',
  "minimumContrast: 'WCAG-AA'",
  "welcomeIllustration: '/skins/forest-comic/welcome-comic.svg'",
];

const missing = requiredSnippets.filter(snippet => !source.includes(snippet));

const requiredAssets = [
  'public/skins/forest-comic/welcome-comic.svg',
];

const missingAssets = requiredAssets.filter(assetPath => !fs.existsSync(path.resolve(assetPath)));

if (missing.length > 0 || missingAssets.length > 0) {
  console.error('Theme skin validation failed.');
  missing.forEach(snippet => console.error(`Missing metadata: ${snippet}`));
  missingAssets.forEach(assetPath => console.error(`Missing asset: ${assetPath}`));
  process.exit(1);
}

console.log('Theme skin validation passed.');
```

Add script in `package.json`:

```json
"test:skins": "node scripts/validate-theme-skins.js"
```

- [ ] **Step 5: Verify tests and script**

Run: `npm run test -- src/test/theme-skins.test.ts && npm run test:skins`

Expected: PASS and output includes `Theme skin validation passed.`

- [ ] **Step 6: Commit**

```bash
git add src/lib/themeSkins.ts src/test/theme-skins.test.ts scripts/validate-theme-skins.js package.json
git commit -m "feat: define theme skin template contract"
```

## Task 3: Platform Token Alignment

**Files:**
- Modify: `src/index.css`
- Modify: `android/app/src/main/res/values/colors.xml`
- Modify: `ios/App/App/Extensions/UIColor+DesignTokens.swift`
- Modify: `miniprogram/src/app.scss`

- [ ] **Step 1: Add exact token assertions**

Extend `src/test/design-token.test.tsx` with file-content assertions:

```ts
import fs from 'fs';
import path from 'path';

it('aligns Web CSS with canonical colors', () => {
  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');

  expect(css).toContain('--color-primary: #006e1c;');
  expect(css).toContain('--color-primary-container: #4caf50;');
  expect(css).toContain('--color-background: #fbf9f5;');
  expect(css).toContain('--color-surface-container-low: #f5f3ef;');
});

it('aligns Android native colors with canonical colors', () => {
  const xml = fs.readFileSync(path.resolve('android/app/src/main/res/values/colors.xml'), 'utf8');

  expect(xml).toContain('<color name="primary">#FF006E1C</color>');
  expect(xml).toContain('<color name="primary_container">#FF4CAF50</color>');
  expect(xml).toContain('<color name="background">#FFFBF9F5</color>');
  expect(xml).toContain('<color name="surface_container_low">#FFF5F3EF</color>');
});

it('aligns mini program SCSS with canonical colors', () => {
  const scss = fs.readFileSync(path.resolve('miniprogram/src/app.scss'), 'utf8');

  expect(scss).toContain('$primary-color: #006e1c;');
  expect(scss).toContain('$primary-container: #4caf50;');
  expect(scss).toContain('$bg-color: #fbf9f5;');
  expect(scss).toContain('$surface-container-low: #f5f3ef;');
});
```

- [ ] **Step 2: Run test to expose platform drift**

Run: `npm run test -- src/test/design-token.test.tsx`

Expected: FAIL on Android resource values such as `#FF9AF2A7` or `#FFF7FBF2`.

- [ ] **Step 3: Update Android resource colors**

Set `android/app/src/main/res/values/colors.xml` to include:

```xml
<color name="primary">#FF006E1C</color>
<color name="primary_container">#FF4CAF50</color>
<color name="on_primary">#FFFFFFFF</color>
<color name="background">#FFFBF9F5</color>
<color name="surface">#FFFBF9F5</color>
<color name="surface_container_low">#FFF5F3EF</color>
<color name="surface_container">#FFEFEEEA</color>
<color name="surface_container_high">#FFEAE8E4</color>
<color name="on_surface">#FF1B1C1A</color>
<color name="on_surface_variant">#FF3F4A3C</color>
<color name="outline">#FF6F7A6B</color>
<color name="outline_variant">#FFBECAB9</color>
<color name="error">#FFE57373</color>
<color name="error_container">#FFFFDAD6</color>
```

- [ ] **Step 4: Update iOS token bridge**

Add SwiftUI aliases in `ios/App/App/Extensions/UIColor+DesignTokens.swift`:

```swift
static let surfaceContainerLowToken = Color(UIColor.surfaceContainerLow)
static let surfaceContainerToken = Color(UIColor.surfaceContainer)
static let surfaceContainerHighToken = Color(UIColor.surfaceContainerHigh)
static let outlineToken = Color(UIColor.outline)
static let outlineVariantToken = Color(UIColor.outlineVariant)
```

- [ ] **Step 5: Add mini program utility mixins**

Append to `miniprogram/src/app.scss`:

```scss
@mixin ui-card($padding: 24rpx) {
  background-color: $card-bg;
  border: 2rpx solid $border-color;
  border-radius: 32rpx;
  padding: $padding;
}

@mixin ui-primary-button {
  min-height: 88rpx;
  background-color: $primary-color;
  color: #ffffff;
  border-radius: 32rpx;
  font-size: 32rpx;
  font-weight: 600;
}

@mixin ui-input {
  min-height: 88rpx;
  border: 2rpx solid $border-color;
  border-radius: 32rpx;
  padding: 0 24rpx;
  background-color: $card-bg;
  color: $text-primary;
}
```

- [ ] **Step 6: Verify platform token tests**

Run: `npm run test -- src/test/design-token.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/index.css android/app/src/main/res/values/colors.xml ios/App/App/Extensions/UIColor+DesignTokens.swift miniprogram/src/app.scss src/test/design-token.test.tsx
git commit -m "fix: align platform design tokens"
```

## Task 4: Navigation and Safe-Area Shell

**Files:**
- Modify: `src/components/BottomNav.tsx`
- Modify: `src/components/navigation/TopAppBar.tsx`
- Modify: `miniprogram/src/app.config.ts`
- Modify: `miniprogram/src/components/TabLayout/index.tsx`
- Modify: `miniprogram/src/components/TabLayout/index.scss`

- [ ] **Step 1: Add navigation tests**

Create or extend a test in `src/test/design-token.test.tsx`:

```ts
it('keeps standard tab labels available from tokens', () => {
  expect(UI_TOKENS.navigation.tabs.map(tab => tab.label)).toEqual([
    '首页',
    '任务',
    '奖惩',
    '心愿',
    '我的',
  ]);
});
```

- [ ] **Step 2: Update Web bottom nav to use token labels**

In `src/components/BottomNav.tsx`, define nav items from labels that match `UI_TOKENS.navigation.tabs`:

```ts
const navItems = [
  { to: '/', icon: Home, label: t('nav.home', { defaultValue: '首页' }) },
  { to: '/tasks', icon: ClipboardList, label: t('nav.tasks', { defaultValue: '任务' }) },
  { to: '/habits', icon: Sparkles, label: t('nav.habits', { defaultValue: '奖惩' }), variant: 'highlight' as const },
  { to: '/rewards', icon: Trophy, label: t('nav.rewards', { defaultValue: '心愿' }) },
  { to: '/profile', icon: User, label: t('nav.profile', { defaultValue: '我的' }) },
];
```

Render with `navItems.map`.

- [ ] **Step 3: Update mini program tab labels**

Change `miniprogram/src/app.config.ts` tab list labels:

```ts
{ pagePath: 'pages/habits/index', text: '奖惩', iconPath: 'assets/icons/check.png', selectedIconPath: 'assets/icons/check-active.png' },
{ pagePath: 'pages/rewards/index', text: '心愿', iconPath: 'assets/icons/reward.png', selectedIconPath: 'assets/icons/reward-active.png' },
```

Change `miniprogram/src/components/TabLayout/index.tsx` center and reward labels:

```ts
{ title: '奖惩', icon: 'sparkles', iconActiveColor: '#ffffff', path: '/pages/habits/index', isCenter: true },
{ title: '心愿', icon: 'trophy', iconActiveColor: '#006e1c', path: '/pages/rewards/index', isCenter: false },
```

- [ ] **Step 4: Update top app bar safe area**

Change `src/components/navigation/TopAppBar.tsx` header classes:

```tsx
className={cn(
  'sticky top-0 z-40 flex items-end justify-between',
  'min-h-14 px-4 pb-1 pt-[max(0.5rem,env(safe-area-inset-top,0px))]',
  'bg-surface/90 backdrop-blur-xl',
  'border-b border-outline-variant/30',
  className
)}
```

- [ ] **Step 5: Update mini program tab SCSS to token variables**

In `miniprogram/src/components/TabLayout/index.scss`, replace raw hard-coded values with variables:

```scss
.tab-bar {
  background-color: rgba(251, 249, 245, 0.95);
  border-top: 1rpx solid $border-color;
  padding-bottom: max(12rpx, env(safe-area-inset-bottom));
}

.tab-icon-center-wrap {
  background-color: $surface-container;
  border: 4rpx solid $card-bg;
}

.tab-text {
  color: rgba($text-secondary, 0.65);
}
```

- [ ] **Step 6: Verify navigation tests**

Run: `npm run test -- src/test/design-token.test.tsx`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/BottomNav.tsx src/components/navigation/TopAppBar.tsx miniprogram/src/app.config.ts miniprogram/src/components/TabLayout/index.tsx miniprogram/src/components/TabLayout/index.scss src/test/design-token.test.tsx
git commit -m "fix: unify navigation shell across platforms"
```

## Task 5: Baseline-Aware Drift Enforcement

**Files:**
- Modify: `scripts/validate-design-tokens.js`
- Create: `scripts/ui-token-baseline.json`
- Modify: `package.json`

- [ ] **Step 1: Generate current baseline**

Run the existing scanner and capture current paths manually:

```bash
node scripts/validate-design-tokens.js
```

Expected: FAIL with current hard-coded color debt.

Create `scripts/ui-token-baseline.json`:

```json
{
  "allowedExistingViolations": [],
  "allowlistedFiles": [
    "src/lib/uiTokens.ts",
    "src/lib/themeSkins.ts",
    "src/components/Avatar.tsx",
    "src/components/TextAvatar.tsx",
    "src/components/CelebrationAnimation.tsx",
    "miniprogram/src/app.scss",
    "android/app/src/main/res/values/colors.xml",
    "ios/App/App/Extensions/UIColor+DesignTokens.swift"
  ]
}
```

- [ ] **Step 2: Update scanner to skip token source files**

In `scripts/validate-design-tokens.js`, load the baseline:

```js
const baselinePath = path.resolve(process.cwd(), 'scripts/ui-token-baseline.json');
const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  : { allowedExistingViolations: [], allowlistedFiles: [] };

function normalizePath(filePath) {
  return path.relative(process.cwd(), filePath).replaceAll(path.sep, '/');
}
```

Inside `scanFile`, before reading content:

```js
const relFilePath = normalizePath(filePath);
if (baseline.allowlistedFiles.includes(relFilePath)) return [];
```

- [ ] **Step 3: Add package script for strict UI check**

Add to `package.json`:

```json
"test:ui-standard": "node scripts/validate-design-tokens.js && node scripts/validate-theme-skins.js"
```

- [ ] **Step 4: Verify scanner behavior**

Run: `npm run test:ui-standard`

Expected: If remaining page debt exists, FAIL with a reduced list that excludes canonical token files. Use the reduced output to drive Tasks 6 and 7.

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-design-tokens.js scripts/ui-token-baseline.json package.json
git commit -m "test: add ui standard drift checks"
```

## Task 6: Main Tab Page Cleanup

**Files:**
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Tasks.tsx`
- Modify: `src/pages/HabitRewards.tsx`
- Modify: `src/pages/Rewards.tsx`
- Modify: `src/pages/Profile.tsx`
- Modify corresponding mini program files under:
  - `miniprogram/src/pages/home/index.scss`
  - `miniprogram/src/pages/tasks/index.scss`
  - `miniprogram/src/pages/habits/index.scss`
  - `miniprogram/src/pages/rewards/index.scss`
  - `miniprogram/src/pages/profile/index.scss`

- [ ] **Step 1: Audit main tab hard-coded styles**

Run:

```bash
rg -n "#[0-9A-Fa-f]{3,8}|rgba\\(|rgb\\(|text-\\[[^\\]]+\\]|rounded-\\[[^\\]]+\\]" src/pages/Home.tsx src/pages/Tasks.tsx src/pages/HabitRewards.tsx src/pages/Rewards.tsx src/pages/Profile.tsx miniprogram/src/pages/home/index.scss miniprogram/src/pages/tasks/index.scss miniprogram/src/pages/habits/index.scss miniprogram/src/pages/rewards/index.scss miniprogram/src/pages/profile/index.scss
```

Expected: List of remaining raw styles to replace.

- [ ] **Step 2: Replace Web raw colors with semantic classes**

Use these mappings:

```text
#006e1c -> text-primary or bg-primary
#4caf50 -> bg-primary-container
#fbf9f5 -> bg-background
#f5f3ef -> bg-surface-container-low
#efeeea -> bg-surface-container
#becab9 -> border-outline-variant
#3f4a3c -> text-on-surface-variant
#1b1c1a -> text-on-surface
```

Use semantic reward/status classes where applicable:

```text
#FFD600 or #F9A825 -> text-secondary or text-amber-text when the existing token exists
#E57373 -> text-red-500 or semantic danger helper until danger token class is added
```

- [ ] **Step 3: Replace mini program raw styles with SCSS variables**

Use these mappings:

```scss
color: #006e1c; -> color: $primary-color;
background: #ffffff; -> background: $card-bg;
background-color: #fbf9f5; -> background-color: $bg-color;
border-color: #becab9; -> border-color: $border-color;
color: #3f4a3c; -> color: $text-secondary;
border-radius: 24rpx; -> border-radius: 32rpx; // medium role
border-radius: 48rpx; -> border-radius: 9999rpx; // full role for pills only
```

- [ ] **Step 4: Verify reduced drift**

Run:

```bash
npm run test:ui-standard
```

Expected: Fewer page-level violations than before Task 6.

- [ ] **Step 5: Run app tests**

Run:

```bash
npm run lint
npm run test -- src/test/page-components.test.tsx src/test/design-token.test.tsx src/test/theme-skins.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Home.tsx src/pages/Tasks.tsx src/pages/HabitRewards.tsx src/pages/Rewards.tsx src/pages/Profile.tsx miniprogram/src/pages/home/index.scss miniprogram/src/pages/tasks/index.scss miniprogram/src/pages/habits/index.scss miniprogram/src/pages/rewards/index.scss miniprogram/src/pages/profile/index.scss
git commit -m "fix: standardize main tab ui styles"
```

## Task 7: Secondary Page and Component Cleanup

**Files:**
- Modify shared components with hard-coded UI values under `src/components`.
- Modify secondary pages with top bars and form surfaces under `src/pages`.
- Modify matching mini program secondary page SCSS files.

- [ ] **Step 1: Audit shared component drift**

Run:

```bash
rg -n "#[0-9A-Fa-f]{3,8}|rgba\\(|rgb\\(|text-\\[[^\\]]+\\]|rounded-\\[[^\\]]+\\]" src/components src/pages miniprogram/src/components miniprogram/src/pages --glob '!**/*.bak'
```

Expected: Remaining component and secondary-page drift list.

- [ ] **Step 2: Clean shared components first**

Prioritize these files:

```text
src/components/TaskCard.tsx
src/components/ConfirmDialog.tsx
src/components/UserSelector.tsx
src/components/NotificationCenter.tsx
src/components/TaskTemplateSelector.tsx
src/components/PopularTemplates.tsx
src/components/VoiceAssistant.tsx
```

Apply the same token mappings from Task 6. Keep avatar hash colors and celebration particle colors only if they are documented as semantic dynamic palettes.

- [ ] **Step 3: Clean secondary page groups**

Work in this order:

```text
Forms: PublishTask, EditReward, EditProfile, AddMember
Tools: PomodoroTimer, CalendarSync, QuadrantAnalysisPage
Planning: Plans, PlanWizard, PlanDetail, ScheduleRecommend
Support: SettingsSubPage, ContactUs, Feedback, History
```

Use `TopAppBar` on pages that already import it. For pages with custom top headers, either switch to `TopAppBar` or match the same 56px/safe-area/token contract.

- [ ] **Step 4: Verify strict checks**

Run:

```bash
npm run test:ui-standard
npm run lint
npm run test
```

Expected: PASS or a short documented allowlist for dynamic visual assets and avatar palettes.

- [ ] **Step 5: Commit**

```bash
git add src/components src/pages miniprogram/src/components miniprogram/src/pages scripts/ui-token-baseline.json
git commit -m "fix: reduce secondary ui style drift"
```

## Task 8: Rendered Visual QA

**Files:**
- Modify only files needed to fix visual issues found during QA.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

Expected: Vite starts and prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 2: Open app in Browser plugin**

Use the Browser skill with the flow:

```text
app loads -> first meaningful screen renders -> bottom navigation visible -> primary tab click changes route -> secondary page top bar renders with back action
```

Check:

```text
Page identity
Not blank
No framework overlay
Console errors/warnings
Desktop screenshot
Mobile screenshot
Navigation interaction proof
Secondary top-bar/back interaction proof
```

- [ ] **Step 3: Fix visual blockers**

If screenshots show overlap, clipping, unreadable labels, or unsafe bottom spacing, patch the smallest relevant shell/component file and rerun the same Browser checks.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm run lint
npm run test:ui-standard
npm run test
```

Expected: PASS.

- [ ] **Step 5: Commit QA fixes**

```bash
git add src miniprogram android ios scripts package.json
git commit -m "fix: polish cross-platform ui qa issues"
```

## Self-Review

Spec coverage:

- Token standard: Tasks 1, 3, and 5.
- Shell standard: Task 4 and Task 8.
- Component standard: Tasks 6 and 7.
- Theme skin template standard: Task 2 and Task 5.
- Platform mapping: Tasks 3 and 4.
- Testing and acceptance criteria: Tasks 5 and 8.

Placeholder scan:

- The plan contains no unresolved markers or open-ended implementation steps.
- Each code-changing task includes exact files, commands, and expected outcomes.

Type consistency:

- `UI_TOKENS` is introduced in Task 1 and referenced consistently in later tests and theme skin metadata.
- `ThemeSkin` fields added in Task 2 match the test names used in the same task.
