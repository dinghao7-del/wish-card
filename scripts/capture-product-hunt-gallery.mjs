import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.PH_DEMO_URL || 'http://localhost:5176/demo/product-hunt/gallery';
const outputDir = path.resolve('assets/product-hunt');
const frameIds = ['ph-frame-1', 'ph-frame-2', 'ph-frame-3', 'ph-frame-4', 'ph-frame-5'];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1400, height: 900 },
  deviceScaleFactor: 1,
});

const consoleErrors = [];
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});

await page.goto(baseUrl, { waitUntil: 'networkidle' });

for (const [index, frameId] of frameIds.entries()) {
  const frame = page.locator(`#${frameId}`);
  await frame.scrollIntoViewIfNeeded();
  await frame.screenshot({
    path: path.join(outputDir, `wishcard-ph-gallery-${index + 1}.png`),
  });
}

await browser.close();

if (consoleErrors.length > 0) {
  console.error(consoleErrors.join('\n'));
  process.exit(1);
}

console.log(`Captured ${frameIds.length} Product Hunt gallery frames to ${outputDir}`);

