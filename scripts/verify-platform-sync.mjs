import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const webDir = path.join(projectRoot, 'dist');
const miniprogramPackagePath = path.join(projectRoot, 'miniprogram/package.json');
const miniprogramAppMetaPath = path.join(projectRoot, 'miniprogram/src/lib/appMeta.ts');
const miniprogramDistPath = path.join(projectRoot, 'miniprogram/dist/app.js');
const androidGradlePath = path.join(projectRoot, 'android/app/build.gradle');
const androidGradleKtsPath = path.join(projectRoot, 'android/app/build.gradle.kts');
const iosInfoPlistPath = path.join(projectRoot, 'ios/App/App/Info.plist');
const iosProjectPath = path.join(projectRoot, 'ios/App/App.xcodeproj/project.pbxproj');
const platformDirs = [
  { name: 'Android', dir: path.join(projectRoot, 'android/app/src/main/assets/public') },
  { name: 'iOS', dir: path.join(projectRoot, 'ios/App/App/public') },
];

const ignoredNames = new Set(['.DS_Store']);

function walkFiles(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (ignoredNames.has(name)) return [];
    const fullPath = path.join(dir, name);
    const relPath = path.relative(base, fullPath);
    if (statSync(fullPath).isDirectory()) return walkFiles(fullPath, base);
    return [relPath];
  }).sort();
}

function hashFile(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function assertDir(dir, label) {
  if (!existsSync(dir)) {
    throw new Error(`${label} directory does not exist: ${dir}`);
  }
}

function readText(filePath) {
  if (!existsSync(filePath)) throw new Error(`Missing file: ${filePath}`);
  return readFileSync(filePath, 'utf8');
}

function matchRequired(text, regex, label) {
  const match = text.match(regex);
  if (!match) throw new Error(`Unable to read ${label}`);
  return match[1];
}

function verifyPlatform(platform) {
  assertDir(platform.dir, platform.name);
  const webFiles = walkFiles(webDir);
  const missing = [];
  const changed = [];

  for (const relPath of webFiles) {
    const webPath = path.join(webDir, relPath);
    const platformPath = path.join(platform.dir, relPath);
    if (!existsSync(platformPath)) {
      missing.push(relPath);
      continue;
    }
    const webHash = hashFile(webPath);
    const platformHash = hashFile(platformPath);
    if (webHash !== platformHash) {
      changed.push(relPath);
    }
  }

  return { missing, changed };
}

function verifyVersions() {
  const expectedVersion = JSON.parse(readText(miniprogramPackagePath)).version;
  const expectedBuild = String(Number(expectedVersion.split('.').at(-1) || '0'));
  const appMeta = readText(miniprogramAppMetaPath);
  const androidGradle = readText(androidGradlePath);
  const androidGradleKts = readText(androidGradleKtsPath);
  const iosInfo = readText(iosInfoPlistPath);
  const iosProject = readText(iosProjectPath);

  const checks = [
    {
      label: 'mini program app meta',
      value: matchRequired(appMeta, /APP_VERSION\s*=\s*'v([^']+)'/, 'mini program APP_VERSION'),
      expected: expectedVersion,
    },
    {
      label: 'Android Gradle versionName',
      value: matchRequired(androidGradle, /versionName\s+"([^"]+)"/, 'Android versionName'),
      expected: expectedVersion,
    },
    {
      label: 'Android Gradle versionCode',
      value: matchRequired(androidGradle, /versionCode\s+(\d+)/, 'Android versionCode'),
      expected: expectedBuild,
    },
    {
      label: 'Android Gradle KTS versionName',
      value: matchRequired(androidGradleKts, /versionName\s*=\s*"([^"]+)"/, 'Android KTS versionName'),
      expected: expectedVersion,
    },
    {
      label: 'Android Gradle KTS versionCode',
      value: matchRequired(androidGradleKts, /versionCode\s*=\s*(\d+)/, 'Android KTS versionCode'),
      expected: expectedBuild,
    },
    {
      label: 'iOS Info.plist short version',
      value: matchRequired(iosInfo, /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/, 'iOS CFBundleShortVersionString'),
      expected: expectedVersion,
    },
    {
      label: 'iOS Info.plist build version',
      value: matchRequired(iosInfo, /<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/, 'iOS CFBundleVersion'),
      expected: expectedBuild,
    },
  ];

  const marketingVersions = [...iosProject.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map(match => match[1]);
  const projectVersions = [...iosProject.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map(match => match[1]);
  if (!marketingVersions.length || marketingVersions.some(version => version !== expectedVersion)) {
    checks.push({ label: 'iOS project MARKETING_VERSION', value: marketingVersions.join(',') || 'missing', expected: expectedVersion });
  }
  if (!projectVersions.length || projectVersions.some(version => version !== expectedBuild)) {
    checks.push({ label: 'iOS project CURRENT_PROJECT_VERSION', value: projectVersions.join(',') || 'missing', expected: expectedBuild });
  }

  const mismatches = checks.filter(check => check.value !== check.expected);
  if (!existsSync(miniprogramDistPath)) {
    mismatches.push({ label: 'mini program dist app.js', value: 'missing', expected: 'present' });
  }

  return { expectedVersion, expectedBuild, mismatches };
}

function main() {
  assertDir(webDir, 'Web dist');

  let hasError = false;
  const versionResult = verifyVersions();
  if (versionResult.mismatches.length) {
    hasError = true;
    console.error('\nVersion verification failed.');
    for (const item of versionResult.mismatches) {
      console.error(`  - ${item.label}: ${item.value} != ${item.expected}`);
    }
  } else {
    console.log(`Versions: ${versionResult.expectedVersion} / build ${versionResult.expectedBuild}.`);
  }

  for (const platform of platformDirs) {
    const result = verifyPlatform(platform);
    if (result.missing.length || result.changed.length) {
      hasError = true;
      console.error(`\n${platform.name} is not synced with dist.`);
      if (result.missing.length) {
        console.error(`Missing files (${result.missing.length}):`);
        result.missing.slice(0, 20).forEach(file => console.error(`  - ${file}`));
      }
      if (result.changed.length) {
        console.error(`Different files (${result.changed.length}):`);
        result.changed.slice(0, 20).forEach(file => console.error(`  - ${file}`));
      }
    } else {
      console.log(`${platform.name}: synced with dist (${walkFiles(webDir).length} files checked).`);
    }
  }

  if (hasError) {
    console.error('\nPlatform sync verification failed. Run: npm run sync:platforms');
    process.exit(1);
  }

  console.log('\nAll platform versions and mobile web assets are in sync.');
}

main();
