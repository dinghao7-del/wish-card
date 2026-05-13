#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'assets');
const dstDir = path.join(__dirname, '..', 'dist', 'assets');

if (fs.existsSync(srcDir)) {
  fs.cpSync(srcDir, dstDir, { recursive: true });
  const count = findFiles(dstDir, '.png').length;
  console.log(`[copy-assets] ✓ Copied ${count} PNG files to dist/assets`);
} else {
  console.log('[copy-assets] ! src/assets not found');
}

function findFiles(dir, ext) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(findFiles(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}
