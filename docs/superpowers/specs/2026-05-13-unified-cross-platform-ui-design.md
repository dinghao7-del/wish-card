# Unified Cross-Platform UI Design

## Goal

Unify the WishCard / Forest Family UI across Web, Capacitor Android, Capacitor iOS, and the WeChat mini program without removing the existing theme skin capability.

The standard must make the current app feel consistent now and also define rules for future UI skins. A skin may change visual expression, but it must not change product structure, business flows, accessibility guarantees, or platform safety behavior.

## Current Context

The project is a multi-platform app:

- Web and native wrappers use React, Vite, Tailwind, and Capacitor.
- The mini program uses Taro-style page and SCSS files under `miniprogram/src`.
- Android and iOS contain native shell resources for launch, status bar, and token bridging.
- Theme skins are defined in `src/lib/themeSkins.ts` and documented in `docs/THEME_SKIN_ARCHITECTURE.md`.

The current design system already has useful foundations, but the standards conflict in several places:

- `DESIGN_TOKENS.md`, `BRAND_VISUAL_SYSTEM.md`, and `docs/UI-DESIGN-SPEC.md` disagree on some card backgrounds, button radii, and typography details.
- Web, mini program, Android resources, and iOS resources do not all use the same token values.
- Hard-coded colors and arbitrary class values are spread through Web and mini program pages.
- Bottom navigation, top bars, safe areas, and fixed bottom actions are handled separately per platform.
- Theme skins exist, but there is no enforceable contract for future templates.

## Design Principles

1. Use `DESIGN_TOKENS.md` as the source of truth for cross-platform primitive and semantic tokens.
2. Keep `forest-comic` as the active default skin.
3. Treat future skins as token and asset overlays, not duplicated page implementations.
4. Preserve platform expectations: native safe areas, minimum 44px touch targets, readable text, and predictable navigation.
5. Standardize heavily used surfaces first, then apply the same rules to secondary pages.
6. Add automated checks so new pages cannot drift back into arbitrary colors, spacing, or radii.

## Token Standard

### Color

The canonical light-mode tokens are:

- Primary: `#006e1c`
- Primary container: `#4caf50`
- Secondary: `#686000`
- Secondary container: `#f0e269`
- Background: `#fbf9f5`
- Surface: `#fbf9f5`
- Surface container low: `#f5f3ef`
- Surface container: `#efeeea`
- Surface container high: `#eae8e4`
- Surface container highest: `#e4e2de`
- On surface: `#1b1c1a`
- On surface variant: `#3f4a3c`
- Outline: `#6f7a6b`
- Outline variant: `#becab9`

Semantic colors for task state, quadrants, rewards, danger, and success remain shared tokens. Page code should use semantic names, not raw hex values.

Android `colors.xml`, iOS `UIColor+DesignTokens.swift`, Web Tailwind theme tokens, and mini program SCSS variables must map to the same values unless a documented platform adaptation is needed for system UI contrast.

### Typography

Use system-safe sans fonts for product UI:

- Web: `Inter`, `Plus Jakarta Sans`, system fallback.
- Mini program: system Chinese UI font stack.
- Android/iOS native shell: platform system font.

Use these roles:

- Page title: 24-30px equivalent, semibold/bold.
- Section title: 18-20px equivalent, semibold.
- Body: 16px equivalent.
- Secondary/body small: 14px equivalent.
- Caption/badge: 12px equivalent.

Letter spacing should default to `0`. Decorative uppercase labels may use explicit tracking only when they are not core reading content.

### Spacing

Use a 4px base scale:

- 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

Equivalent mini program units use `2rpx = 1px` as the documented mapping. Android and iOS use dp/pt values matching the px scale.

### Radius

Use four stable roles:

- Small: 8px, compact tags and tiny controls.
- Medium: 16px, buttons, inputs, list rows, compact cards.
- Large: 24px, primary cards and modal panels.
- Full: avatars, badges, icon pills, circular action surfaces.

Avoid introducing new arbitrary radii in product UI. A skin may choose a softer or sharper expression only through token overrides that preserve these roles.

### Shadow and Elevation

Use subtle elevation:

- Level 1: input and light surfaces.
- Level 2: standard cards.
- Level 3: dialogs, bottom sheets, popovers.

Dark mode uses border and surface contrast first, shadow second.

### Motion

Motion should support feedback rather than decoration:

- Tap feedback: 100-150ms.
- State transitions: 150-200ms.
- Page/modal transitions: 200-300ms.
- Celebrations: allowed for rewards and task completion, with reduced-motion fallback.

## Shell Standard

### Top Navigation

Use one shared top app bar model:

- 56px height before safe-area padding.
- 44px minimum touch target.
- Centered title, left back action, optional right action.
- Sticky on Web/Capacitor secondary pages.
- Native mini program navigation uses equivalent color and title behavior.

### Bottom Navigation

Use one tab model across Web and mini program:

- Labels: `首页`, `任务`, `奖惩`, `心愿`, `我的`.
- Five equal slots.
- Selected color uses primary.
- Background uses `background` or `surface` with a light blur/elevation where supported.
- Safe-area bottom padding must be included.
- The center `奖惩` tab may use the highlighted circular treatment, but its size and position must not obscure content or shift layout.

### Safe Areas

All fixed top and bottom surfaces must account for:

- iOS status bar and home indicator.
- Android gesture navigation and virtual nav bars.
- Mini program device safe area.
- Web viewport resize and mobile browser chrome.

Fixed bottom action bars must use the same safe-area contract as bottom navigation.

## Component Standard

### Buttons

Buttons use semantic variants:

- Primary: filled primary background, on-primary text.
- Secondary: surface or transparent background, primary border/text.
- Tertiary: text/icon action with no heavy container.
- Danger: semantic danger token.

All buttons must meet 44px minimum touch height. Full-width action buttons are allowed in mobile forms and bottom bars.

### Cards

Cards use tokenized surface colors and role-based radii:

- Primary cards: surface container low or gradient when the card is a clear hero/status surface.
- List cards: surface or surface container low with a light border.
- No nested decorative cards. Nested content should use rows, dividers, or surface changes.

### Inputs

Inputs use:

- 16px text on mobile to avoid zoom.
- Medium radius.
- Outline variant border by default.
- Primary border/focus token on focus.
- Clear error and helper states.

### Tags, Badges, and Status

Badges use full radius and semantic color pairs. They should not introduce arbitrary palette colors outside the token map.

### Empty, Loading, and Error States

These states must use skin-aware assets and shared copy tone:

- Empty states may use skin illustration assets.
- Loading states use simple spinners or skeletons.
- Error states show action recovery and avoid visual noise.

## Theme Skin Template Standard

Theme skins are first-class design system overlays.

### Skin Contract

A skin may define:

- Primitive palette overrides.
- Semantic token mappings.
- Illustration assets.
- Icon asset variants where needed.
- Optional texture/pattern assets.
- Motion intensity presets.
- Component expression tokens, such as card radius role values or shadow softness.

A skin must not define:

- Separate business page implementations.
- New routes or data structures.
- Different permissions, sync behavior, task logic, reward logic, or onboarding rules.
- Text that changes product meaning.
- Component dimensions that break minimum touch targets or safe-area behavior.

### Skin Metadata

Each skin should expose:

- `id`
- `name`
- `description`
- `status`
- `assets`
- `tokens`
- `platformSupport`
- `accessibility`

Current skins:

- `forest-comic`: active default.
- `flat-comic`: planned, visible as a future option but not saved as active until complete.

### Skin Asset Structure

Use a stable folder model:

```text
public/skins/<skin-id>/
  welcome-comic.svg
  empty-tasks.svg
  empty-rewards.svg
  achievement.svg
  patterns/
```

Mini program skin assets should mirror the same logical names under its static asset root or use a generated asset map.

### Skin Validation

Every skin must pass:

- Required token presence.
- Contrast checks for primary text, secondary text, and primary buttons.
- Asset existence checks.
- Mobile viewport screenshot smoke checks.
- Tab and top-bar safe-area checks.

## Platform Mapping

### Web / Capacitor

- Keep Tailwind theme tokens in `src/index.css`.
- Keep `data-theme-skin` on `document.documentElement`.
- Add skin CSS using token overrides under `[data-theme-skin="<id>"]`.
- Replace hard-coded page colors with token classes or semantic helper classes.
- Keep Capacitor-specific safe-area CSS in platform adaptation files, but source visual colors from tokens.

### Mini Program

- Keep global SCSS variables in `miniprogram/src/app.scss`.
- Add CSS custom property equivalents where Taro supports them.
- Align tab labels and selected colors with Web.
- Move repeated raw colors/radii into shared SCSS variables or mixins.
- Keep mini program page-specific style only for layout, not core color decisions.

### Android

- Update `android/app/src/main/res/values/colors.xml` to match canonical tokens.
- Keep splash/status/nav bar colors aligned with primary/background tokens.
- Avoid using Android-only green variants unless documented as system contrast adaptations.

### iOS

- Keep `UIColor+DesignTokens.swift` as the native token bridge.
- Expand SwiftUI token aliases where native surfaces need them.
- Keep Capacitor web content and native shell background aligned to prevent launch flashes.

## Rollout Plan

1. Document and lock the standard.
2. Align native token resources and app shell constants.
3. Add or update token validation tests.
4. Standardize shared navigation and safe-area helpers.
5. Standardize shared components.
6. Replace hard-coded styles in the main tab pages.
7. Replace hard-coded styles in secondary pages by feature group.
8. Add skin validation and required metadata.
9. Run type tests, unit tests, token checks, and visual smoke tests.

## Testing

Required verification:

- `npm run lint`
- `npm run test:tokens`
- `npm run test`
- Rendered Web smoke test on desktop and mobile viewport.
- Main tab navigation interaction check.
- At least one secondary page top-bar/back-flow check.
- Mini program style/static analysis for token drift.
- Android and iOS native token resource inspection.

## Acceptance Criteria

- One canonical UI standard governs Web, mini program, Android, and iOS.
- Main navigation labels, selected state, and safe areas match across Web and mini program.
- Android and iOS native resources use the same canonical token values as Web.
- Theme skins are governed by a clear template contract.
- New skins can be added by defining tokens and assets without copying business pages.
- Automated checks make future UI drift visible.
