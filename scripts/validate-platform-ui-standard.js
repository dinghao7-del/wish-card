import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const errors = [];

function read(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing ${relativePath}.`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function assertIncludes(source, needle, label) {
  assert(source.includes(needle), `${label} must include ${needle}.`);
}

const webCss = read('src/index.css');
const androidCss = read('src/styles/android-adaptive.css');
const miniScss = read('miniprogram/src/app.scss');
const miniTopAppBar = read('miniprogram/src/components/TopAppBar/index.scss');
const androidMainActivity = read('android/app/src/main/java/com/forestfamily/app/MainActivity.kt');
const androidColors = read('android/app/src/main/res/values/colors.xml');
const androidStyles = read('android/app/src/main/res/values/styles.xml');
const iosColors = read('ios/App/App/Extensions/UIColor+DesignTokens.swift');
const themeDoc = read('docs/THEME_SKIN_ARCHITECTURE.md');
const mobileSmoke = read('scripts/mobile-ui-smoke.mjs');
const packageJson = read('package.json');

for (const className of [
  '.ui-panel',
  '.ui-icon-button',
  '.ui-primary-button',
  '.ui-secondary-button',
  '.ui-bottom-action-bar',
  '.ui-empty-state',
]) {
  assertIncludes(webCss, className, 'Web shared component layer');
}

assertIncludes(webCss, 'env(safe-area-inset-bottom', 'Web safe-area contract');
assertIncludes(webCss, 'min-width: 44px', 'Web minimum touch target');
assertIncludes(webCss, 'min-height: 44px', 'Web minimum touch target');

assertIncludes(miniScss, '@mixin ui-card', 'Mini program component mixins');
assertIncludes(miniScss, '@mixin ui-primary-button', 'Mini program component mixins');
assertIncludes(miniScss, '@mixin ui-bottom-action-bar', 'Mini program safe-area mixins');
assertIncludes(miniScss, 'env(safe-area-inset-bottom)', 'Mini program safe-area contract');
assertIncludes(miniTopAppBar, 'env(safe-area-inset-top)', 'Mini program TopAppBar safe-area contract');
assertIncludes(miniTopAppBar, 'width: 88rpx', 'Mini program TopAppBar touch target');

assertIncludes(androidCss, '.android-native .bottom-nav', 'Android WebView bottom nav adaptation');
assertIncludes(androidCss, 'env(safe-area-inset-bottom', 'Android WebView safe-area contract');
assertIncludes(androidMainActivity, 'textZoom = 100', 'Android font scaling guard');

assert(androidColors.includes('<color name="primary">#FF006E1C</color>'), 'Android primary token must match canonical primary.');
assert(androidColors.includes('<color name="secondary">#FF686000</color>'), 'Android secondary token must match canonical secondary.');
assert(androidColors.includes('<color name="reward_display">#FFFBC02D</color>'), 'Android reward token must match canonical reward display.');
assertIncludes(androidStyles, 'android:windowLayoutInDisplayCutoutMode', 'Android cutout support');
assertIncludes(androidStyles, '@color/surface', 'Android launch/background surface token');

assertIncludes(iosColors, 'static let primary', 'iOS token extension');
assertIncludes(iosColors, 'static let rewardDisplay', 'iOS reward token');
assertIncludes(iosColors, 'Color(UIColor.rewardDisplay)', 'iOS SwiftUI reward token');

assertIncludes(themeDoc, '皮肤模板验收清单', 'Theme skin platform acceptance documentation');
assertIncludes(themeDoc, '安全区', 'Theme skin safe-area documentation');
assertIncludes(themeDoc, '44px', 'Theme skin touch target documentation');
assertIncludes(themeDoc, 'npm run test:ui-final', 'Theme skin final acceptance documentation');

assertIncludes(packageJson, '"test:ui-final"', 'Package final UI acceptance script');
assertIncludes(mobileSmoke, 'img[src="/skins/forest-comic/welcome-comic.svg"]', 'Mobile smoke welcome skin asset check');
assertIncludes(mobileSmoke, 'nav a[href="/tasks"]', 'Mobile smoke task navigation check');
assertIncludes(mobileSmoke, 'nav a[href="/rewards"]', 'Mobile smoke reward navigation check');
assertIncludes(mobileSmoke, 'nav a[href="/profile"]', 'Mobile smoke profile navigation check');
assertIncludes(mobileSmoke, '\\/settings\\/appearance', 'Mobile smoke theme setting route check');
assertIncludes(mobileSmoke, '/plans/smart-recommend', 'Mobile smoke smart recommendation route check');

if (errors.length > 0) {
  console.error('Platform UI standard validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Platform UI standard validation passed.');
