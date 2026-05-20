import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, 'outputs/xiaotiancai-watch-release');

const requiredFiles = [
  'docs/XIAOTIANCAI_WATCH_DELIVERY_INDEX.md',
  'docs/XIAOTIANCAI_WATCH_DEVICE_QA_SUBMISSION.md',
  'docs/XIAOTIANCAI_WATCH_RELEASE_PACKAGE.md',
  'docs/XIAOTIANCAI_WATCH_SDK_HANDOFF_CHECKLIST.md',
  'src/domain/watchClient.ts',
  'src/domain/watchNativeBridge.ts',
  'src/pages/WatchPreview.tsx',
  'src/pages/WatchRelease.tsx',
  'src/pages/WatchDelivery.tsx',
  'src/components/watch/WatchReviewEvidenceCard.tsx',
  'src/pages/PublishTask.tsx',
  'outputs/xiaotiancai-watch-release/watch-preview-desktop.png',
  'outputs/xiaotiancai-watch-release/watch-preview-mobile.png',
  'outputs/xiaotiancai-watch-release/watch-release-desktop.png',
  'outputs/xiaotiancai-watch-release/watch-release-mobile.png',
  'outputs/xiaotiancai-watch-release/watch-delivery-desktop.png',
  'outputs/xiaotiancai-watch-release/watch-delivery-mobile.png',
  'outputs/xiaotiancai-watch-release/manifest.json',
];

const requiredManifestFiles = [
  'watch-preview-desktop.png',
  'watch-preview-mobile.png',
  'watch-release-desktop.png',
  'watch-release-mobile.png',
  'watch-delivery-desktop.png',
  'watch-delivery-mobile.png',
];

const requiredDocSnippets = [
  '/watch-preview',
  '/watch-release',
  '/watch-delivery',
  'outputs/xiaotiancai-watch-release/',
  'npm run watch:release:screenshots',
  'XIAOTIANCAI_WATCH_DEVICE_QA_SUBMISSION.md',
  'XIAOTIANCAI_WATCH_SDK_HANDOFF_CHECKLIST.md',
  'npm run lint',
];

const failures = [];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  try {
    const stat = await fs.stat(fullPath);
    if (file.endsWith('.png') && stat.size < 50_000) {
      failures.push(`${file} is too small (${stat.size} bytes)`);
    }
  } catch {
    failures.push(`${file} is missing`);
  }
}

try {
  const manifestText = await fs.readFile(path.join(outputDir, 'manifest.json'), 'utf8');
  const manifest = JSON.parse(manifestText);
  for (const file of requiredManifestFiles) {
    if (!manifest.files?.includes(file)) {
      failures.push(`manifest.json does not include ${file}`);
    }
  }
  if (!manifest.generatedAt || !manifest.baseUrl) {
    failures.push('manifest.json is missing generatedAt or baseUrl');
  }
} catch (error) {
  failures.push(`manifest.json is invalid: ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const deliveryIndex = await fs.readFile(path.join(root, 'docs/XIAOTIANCAI_WATCH_DELIVERY_INDEX.md'), 'utf8');
  for (const snippet of requiredDocSnippets) {
    if (!deliveryIndex.includes(snippet)) {
      failures.push(`delivery index missing snippet: ${snippet}`);
    }
  }
} catch (error) {
  failures.push(`delivery index cannot be read: ${error instanceof Error ? error.message : String(error)}`);
}

if (failures.length > 0) {
  console.error('Xiaotiancai watch release verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Xiaotiancai watch release verification passed.');
console.log(`Checked ${requiredFiles.length} files and ${requiredManifestFiles.length} manifest entries.`);
