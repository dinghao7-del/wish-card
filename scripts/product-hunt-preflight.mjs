import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const maxGalleryBytes = 3 * 1024 * 1024;

const requiredFiles = [
  'src/pages/ProductHuntDemo.tsx',
  'src/pages/ProductHuntGalleryFrames.tsx',
  'src/lib/productHuntDemoData.ts',
  'src/lib/productHuntAnalytics.ts',
  'scripts/capture-product-hunt-gallery.mjs',
  'docs/product-hunt-english-launch-execution-plan.md',
  'docs/product-hunt-launch-readiness-checklist.md',
  'docs/product-hunt-launch-runbook.md',
  'docs/product-hunt-launch-copy-pack.md',
  'docs/product-hunt-demo-video-script.md',
  'docs/product-hunt-comment-reply-bank.md',
  'docs/product-hunt-supporter-outreach-template.csv',
  'docs/product-hunt-launch-metrics-template.csv',
  'public/product-hunt/wishcard-ph-og.png',
];

const requiredGallery = Array.from({ length: 5 }, (_, index) => ({
  file: `assets/product-hunt/wishcard-ph-gallery-${index + 1}.png`,
  width: 1270,
  height: 760,
}));

const placeholderChecks = [
  { file: 'docs/product-hunt-launch-copy-pack.md', token: 'YOUR_DOMAIN' },
  { file: 'docs/product-hunt-launch-copy-pack.md', token: '[PRODUCT HUNT URL]' },
  { file: 'docs/product-hunt-launch-copy-pack.md', token: '[DEMO URL]' },
  { file: 'docs/product-hunt-launch-runbook.md', token: 'YOUR_DOMAIN' },
];

const results = [];

function resolve(file) {
  return path.join(root, file);
}

function pass(message) {
  results.push({ level: 'pass', message });
}

function fail(message) {
  results.push({ level: 'fail', message });
}

function warn(message) {
  results.push({ level: 'warn', message });
}

function readText(file) {
  return fs.readFileSync(resolve(file), 'utf8');
}

function checkRequiredFiles() {
  for (const file of requiredFiles) {
    if (fs.existsSync(resolve(file))) {
      pass(`Found ${file}`);
    } else {
      fail(`Missing ${file}`);
    }
  }
}

function readPngDimensions(file) {
  const buffer = fs.readFileSync(resolve(file));
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${file} is not a PNG file`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bytes: buffer.byteLength,
  };
}

function checkGalleryAssets() {
  for (const asset of requiredGallery) {
    const absolute = resolve(asset.file);
    if (!fs.existsSync(absolute)) {
      fail(`Missing gallery image ${asset.file}`);
      continue;
    }

    try {
      const dimensions = readPngDimensions(asset.file);
      if (dimensions.width === asset.width && dimensions.height === asset.height) {
        pass(`${asset.file} is ${asset.width}x${asset.height}`);
      } else {
        fail(`${asset.file} is ${dimensions.width}x${dimensions.height}; expected ${asset.width}x${asset.height}`);
      }

      if (dimensions.bytes <= maxGalleryBytes) {
        pass(`${asset.file} is under 3MB`);
      } else {
        fail(`${asset.file} is ${(dimensions.bytes / 1024 / 1024).toFixed(2)}MB; expected under 3MB`);
      }
    } catch (error) {
      fail(error instanceof Error ? error.message : `Could not inspect ${asset.file}`);
    }
  }
}

function checkRoutesAndMeta() {
  const app = readText('src/App.tsx');
  const index = readText('index.html');
  const manifest = readText('public/manifest.json');

  if (app.includes('path="/demo/product-hunt"')) {
    pass('Product Hunt demo route is registered');
  } else {
    fail('Missing /demo/product-hunt route');
  }

  if (app.includes('path="/demo/product-hunt/gallery"')) {
    pass('Product Hunt gallery route is registered');
  } else {
    fail('Missing /demo/product-hunt/gallery route');
  }

  const metaNeedles = [
    'WishCard - AI family planner with wish-powered rewards',
    'property="og:image" content="/product-hunt/wishcard-ph-og.png"',
    'name="twitter:card" content="summary_large_image"',
    '<html lang="en">',
  ];

  for (const needle of metaNeedles) {
    if (index.includes(needle)) {
      pass(`index.html contains ${needle}`);
    } else {
      fail(`index.html is missing ${needle}`);
    }
  }

  if (manifest.includes('"name": "WishCard"') && manifest.includes('"lang": "en"')) {
    pass('Manifest uses WishCard English launch branding');
  } else {
    fail('Manifest does not use WishCard English launch branding');
  }
}

function checkPlaceholders() {
  for (const check of placeholderChecks) {
    const text = readText(check.file);
    if (text.includes(check.token)) {
      fail(`${check.file} still contains ${check.token}`);
    } else {
      pass(`${check.file} has no ${check.token}`);
    }
  }
}

function checkOperationalTemplates() {
  const supporterHeader = readText('docs/product-hunt-supporter-outreach-template.csv').split('\n')[0];
  const metricsHeader = readText('docs/product-hunt-launch-metrics-template.csv').split('\n')[0];
  const replyBank = readText('docs/product-hunt-comment-reply-bank.md');

  if (supporterHeader.includes('Name,Segment,Relationship,Channel')) {
    pass('Supporter outreach CSV has the expected columns');
  } else {
    fail('Supporter outreach CSV header is incomplete');
  }

  if (metricsHeader.includes('Timestamp,PH Rank,PH Upvotes,PH Comments')) {
    pass('Launch metrics CSV has the expected columns');
  } else {
    fail('Launch metrics CSV header is incomplete');
  }

  if (replyBank.includes('## AI Questions') && replyBank.includes('## Pricing')) {
    pass('Comment reply bank covers AI and pricing questions');
  } else {
    warn('Comment reply bank may need more AI or pricing coverage');
  }
}

function printResults() {
  const symbols = {
    pass: 'PASS',
    warn: 'WARN',
    fail: 'FAIL',
  };

  for (const result of results) {
    console.log(`${symbols[result.level]} ${result.message}`);
  }

  const failed = results.filter(result => result.level === 'fail').length;
  const warned = results.filter(result => result.level === 'warn').length;
  const passed = results.filter(result => result.level === 'pass').length;

  console.log('');
  console.log(`Product Hunt preflight: ${passed} passed, ${warned} warnings, ${failed} blockers`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

checkRequiredFiles();
checkGalleryAssets();
checkRoutesAndMeta();
checkPlaceholders();
checkOperationalTemplates();
printResults();
