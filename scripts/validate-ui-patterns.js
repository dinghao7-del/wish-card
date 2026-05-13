import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const baselinePath = path.join(__dirname, 'ui-pattern-baseline.json');
const updateBaseline = process.argv.includes('--update-baseline');

const scanTargets = [
  { dir: 'src/pages', extensions: ['.tsx', '.ts'] },
  { dir: 'src/components', extensions: ['.tsx', '.ts'] },
  { dir: 'miniprogram/src', extensions: ['.tsx', '.ts', '.scss'] },
];

const antiPatterns = [
  {
    id: 'fixed-tailwind-status-color',
    pattern: /\b(?:bg|text|border|shadow|hover:bg|hover:text)-(?:red|orange|yellow|amber|green|emerald|teal|cyan|sky|blue|indigo|purple|pink|gray|slate)-(?:50|100|200|300|400|500|600|700|800|900)\b/g,
    message: 'Use semantic design tokens such as primary, secondary, warning, danger, surface, or on-surface.',
  },
  {
    id: 'hard-white-surface',
    pattern: /\bbg-white\b/g,
    message: 'Use bg-surface or a semantic surface/container token so skin templates can override it.',
  },
  {
    id: 'hard-white-border',
    pattern: /\bborder-white\b/g,
    message: 'Use border-surface, border-outline-variant, or a semantic token.',
  },
  {
    id: 'legacy-viewport-height',
    pattern: /(?:max-h|h|min-h)-\[[^\]]*\b(?<!s)vh\b[^\]]*\]|\b\d+vh\b/g,
    message: 'Use svh for app modals/sheets so iOS and Android browser chrome do not crop content.',
  },
  {
    id: 'low-modal-layer',
    pattern: /\bz-50\b/g,
    message: 'Use the modal layer scale: z-[100]+ for overlays and z-40 only for bottom navigation.',
  },
];

const excluded = [
  /\/animations?\//,
  /ProductHunt/,
  /TestDesignSystem/,
  /\.test\./,
];

function normalize(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) return { allowedExistingViolations: [] };
  const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  if (!Array.isArray(parsed.allowedExistingViolations)) {
    throw new Error('ui-pattern-baseline.json must contain allowedExistingViolations.');
  }
  return parsed;
}

function walk(dir, extensions, files = []) {
  const fullDir = path.join(rootDir, dir);
  if (!fs.existsSync(fullDir)) return files;

  for (const entry of fs.readdirSync(fullDir)) {
    const fullPath = path.join(fullDir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(normalize(fullPath), extensions, files);
    } else if (extensions.includes(path.extname(fullPath)) && !excluded.some(rule => rule.test(normalize(fullPath)))) {
      files.push(fullPath);
    }
  }

  return files;
}

function keyFor(violation) {
  return `${violation.file}:${violation.id}:${violation.match}`;
}

function scanFile(filePath) {
  const rel = normalize(filePath);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const violations = [];

  lines.forEach((line, index) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    for (const rule of antiPatterns) {
      rule.pattern.lastIndex = 0;
      for (const match of line.matchAll(rule.pattern)) {
        violations.push({
          file: rel,
          line: index + 1,
          column: (match.index ?? 0) + 1,
          id: rule.id,
          match: match[0],
          message: rule.message,
        });
      }
    }
  });

  return violations;
}

const allFiles = scanTargets.flatMap(target => walk(target.dir, target.extensions));
const allViolations = allFiles.flatMap(scanFile);

if (updateBaseline) {
  fs.writeFileSync(
    baselinePath,
    `${JSON.stringify({ allowedExistingViolations: allViolations.map(keyFor).sort() }, null, 2)}\n`
  );
  console.log(`UI pattern baseline updated: ${normalize(baselinePath)} (${allViolations.length} existing findings).`);
  process.exit(0);
}

const baseline = new Set(loadBaseline().allowedExistingViolations);
const newViolations = allViolations.filter(violation => !baseline.has(keyFor(violation)));

if (newViolations.length > 0) {
  console.error('UI pattern validation failed:');
  for (const violation of newViolations) {
    console.error(`- ${violation.file}:${violation.line}:${violation.column} [${violation.id}] ${violation.match}`);
    console.error(`  ${violation.message}`);
  }
  process.exit(1);
}

console.log('UI pattern validation passed.');
