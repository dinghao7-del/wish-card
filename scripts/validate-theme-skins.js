import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const themeSkinPath = path.join(rootDir, 'src/lib/themeSkins.ts');
const themeSkinTemplatePath = path.join(rootDir, 'src/lib/themeSkinTemplates.ts');
const uiTokensPath = path.join(rootDir, 'src/lib/uiTokens.ts');

const errors = [];

function transpileTsFile(sourcePath, replacements = []) {
  let source = fs.readFileSync(sourcePath, 'utf8');

  for (const [from, to] of replacements) {
    source = source.replace(from, to);
  }

  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function assertSkinContract(skinId, skin) {
  assert(skin && typeof skin === 'object', `${skinId} must be an object.`);
  if (!skin || typeof skin !== 'object') return;

  assert(skin.id === skinId, `${skinId} id must match its registry key.`);
  assert(['active', 'planned'].includes(skin.status), `${skinId} status must be active or planned.`);
  assert(typeof skin.name === 'string' && skin.name.length > 0, `${skinId} must define a name.`);
  assert(typeof skin.description === 'string' && skin.description.length > 0, `${skinId} must define a description.`);

  const assetPath = skin.assets?.welcomeIllustration;
  assert(typeof assetPath === 'string' && assetPath.startsWith('/skins/'), `${skinId} must define a skin welcome illustration.`);
  if (assetPath) {
    const diskPath = path.join(rootDir, 'public', assetPath);
    assert(fs.existsSync(diskPath), `${skinId} asset does not exist: public${assetPath}`);
  }

  for (const tokenName of [
    'primary',
    'primaryContainer',
    'background',
    'surfaceContainerLow',
    'outlineVariant',
    'rewardDisplay',
  ]) {
    const tokenValue = skin.tokens?.color?.[tokenName];
    assert(typeof tokenValue === 'string' && /^#[0-9a-fA-F]{6}$/.test(tokenValue), `${skinId} ${tokenName} must be a 6-digit hex token.`);
  }

  if (skinId === 'forest-comic') {
    assert(skin.tokens?.color?.primary === '#006e1c', `${skinId} primary token must be #006e1c.`);
    assert(skin.tokens?.color?.primaryContainer === '#4caf50', `${skinId} primaryContainer token must be #4caf50.`);
    assert(skin.tokens?.color?.background === '#fbf9f5', `${skinId} background token must be #fbf9f5.`);
    assert(skin.tokens?.color?.surfaceContainerLow === '#f5f3ef', `${skinId} surfaceContainerLow token must be #f5f3ef.`);
    assert(skin.tokens?.color?.outlineVariant === '#becab9', `${skinId} outlineVariant token must be #becab9.`);
    assert(skin.tokens?.color?.rewardDisplay === '#FBC02D', `${skinId} rewardDisplay token must be #FBC02D.`);
  }
  assert(skin.tokens?.radius?.small === 8, `${skinId} radius.small must be 8.`);
  assert(skin.tokens?.radius?.medium === 16, `${skinId} radius.medium must be 16.`);
  assert(skin.tokens?.radius?.large === 24, `${skinId} radius.large must be 24.`);
  assert(skin.tokens?.radius?.full === 9999, `${skinId} radius.full must be 9999.`);

  assert(skin.platformSupport?.web === true, `${skinId} must support web.`);
  assert(skin.platformSupport?.miniProgram === true, `${skinId} must support miniProgram.`);
  assert(skin.platformSupport?.android === true, `${skinId} must support android.`);
  assert(skin.platformSupport?.ios === true, `${skinId} must support ios.`);

  assert(skin.accessibility?.minimumContrast === 'WCAG-AA', `${skinId} must require WCAG-AA contrast.`);
  assert(skin.accessibility?.reducedMotion === true, `${skinId} must support reduced motion.`);

  assert(skin.template && typeof skin.template === 'object', `${skinId} must attach a template file definition.`);
  assert(typeof skin.template?.id === 'string' && skin.template.id.length > 0, `${skinId} template must define an id.`);
  assert(typeof skin.template?.dataThemeSkin === 'string' && skin.template.dataThemeSkin.length > 0, `${skinId} template must define dataThemeSkin.`);
  assert(typeof skin.template?.visualLanguage === 'string' && skin.template.visualLanguage.length > 0, `${skinId} template must define visualLanguage.`);
  for (const pageName of ['home', 'tasks', 'rewards', 'habits', 'profile']) {
    assert(typeof skin.template?.pagePatterns?.[pageName] === 'string' && skin.template.pagePatterns[pageName].length > 0, `${skinId} template must describe ${pageName}.`);
  }
  for (const recipeName of ['appShell', 'topBar', 'bottomNav', 'energyCard', 'quickAction', 'taskCard', 'rewardPromo', 'rewardCard', 'habitCard', 'modal']) {
    const recipe = skin.template?.componentRecipes?.[recipeName];
    assert(recipe && typeof recipe === 'object', `${skinId} template must define ${recipeName} recipe.`);
    assert(typeof recipe?.role === 'string' && recipe.role.length > 0, `${skinId} ${recipeName} recipe must define a role.`);
    assert(Array.isArray(recipe?.hooks) && recipe.hooks.length > 0, `${skinId} ${recipeName} recipe must define CSS hooks.`);
    assert(recipe?.behavior === 'preserve-existing-flow', `${skinId} ${recipeName} recipe must preserve existing flow.`);
  }
}

async function loadThemeSkins() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-skins-'));
  const uiTokensModulePath = path.join(tempDir, 'uiTokens.mjs');
  const themeSkinTemplatesModulePath = path.join(tempDir, 'themeSkinTemplates.mjs');
  const themeSkinsModulePath = path.join(tempDir, 'themeSkins.mjs');

  fs.writeFileSync(uiTokensModulePath, transpileTsFile(uiTokensPath));
  fs.writeFileSync(themeSkinTemplatesModulePath, transpileTsFile(themeSkinTemplatePath));
  fs.writeFileSync(
    themeSkinsModulePath,
    transpileTsFile(themeSkinPath, [
      ["'./uiTokens'", "'./uiTokens.mjs'"],
      ["'./themeSkinTemplates'", "'./themeSkinTemplates.mjs'"],
    ])
  );

  return import(`file://${themeSkinsModulePath}`);
}

if (!fs.existsSync(themeSkinPath)) {
  errors.push('Missing src/lib/themeSkins.ts.');
}

if (!fs.existsSync(uiTokensPath)) {
  errors.push('Missing src/lib/uiTokens.ts.');
}

if (!fs.existsSync(themeSkinTemplatePath)) {
  errors.push('Missing src/lib/themeSkinTemplates.ts.');
}

if (errors.length === 0) {
  try {
    const { THEME_SKINS, getThemeSkin, saveActiveThemeSkin } = await loadThemeSkins();
    const skinIds = Object.keys(THEME_SKINS);

    assert(skinIds.includes('forest-comic'), 'Theme registry must include forest-comic.');
    assert(skinIds.includes('flat-comic'), 'Theme registry must include flat-comic.');
    assert(skinIds.includes('arcade-comic'), 'Theme registry must include arcade-comic.');
    assert(THEME_SKINS['forest-comic']?.status === 'active', 'forest-comic must be active.');
    assert(THEME_SKINS['flat-comic']?.status === 'planned', 'flat-comic must be planned.');
    assert(THEME_SKINS['arcade-comic']?.status === 'active', 'arcade-comic must be active.');
    assert(getThemeSkin('__proto__').id === 'forest-comic', 'getThemeSkin must ignore inherited object keys.');
    assert(saveActiveThemeSkin('flat-comic').id === 'forest-comic', 'planned skins must save as the active default.');
    assert(saveActiveThemeSkin('arcade-comic').id === 'arcade-comic', 'active arcade-comic skin must be selectable.');

    for (const skinId of skinIds) {
      assertSkinContract(skinId, THEME_SKINS[skinId]);
    }
  } catch (error) {
    errors.push(`Unable to load theme skin registry: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (errors.length > 0) {
  console.error('Theme skin validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('Theme skin validation passed.');
