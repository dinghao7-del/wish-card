import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.WATCH_RELEASE_BASE_URL || 'http://127.0.0.1:3000';
const outputDir = path.resolve('outputs/xiaotiancai-watch-release');

const targets = [
  {
    name: 'watch-preview-desktop',
    url: `${baseUrl}/watch-preview`,
    viewport: { width: 1600, height: 1900 },
  },
  {
    name: 'watch-preview-mobile',
    url: `${baseUrl}/watch-preview`,
    viewport: { width: 390, height: 1800 },
  },
  {
    name: 'watch-release-desktop',
    url: `${baseUrl}/watch-release`,
    viewport: { width: 1600, height: 1700 },
  },
  {
    name: 'watch-release-mobile',
    url: `${baseUrl}/watch-release`,
    viewport: { width: 390, height: 1800 },
  },
  {
    name: 'watch-delivery-desktop',
    url: `${baseUrl}/watch-delivery`,
    viewport: { width: 1600, height: 1700 },
  },
  {
    name: 'watch-delivery-mobile',
    url: `${baseUrl}/watch-delivery`,
    viewport: { width: 390, height: 1800 },
  },
];

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const target of targets) {
    const context = await browser.newContext({
      viewport: target.viewport,
      locale: 'zh-CN',
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(target.url, { waitUntil: 'commit', timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes('小天才手表'), null, { timeout: 60000 });
    await page.waitForTimeout(1200);
    const outputPath = path.join(outputDir, `${target.name}.png`);
    await page.screenshot({ path: outputPath, fullPage: true });
    await context.close();
    console.log(`captured ${outputPath}`);
  }
} finally {
  await browser.close();
}

const manifest = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  files: targets.map(target => `${target.name}.png`),
};

await fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${path.join(outputDir, 'manifest.json')}`);
