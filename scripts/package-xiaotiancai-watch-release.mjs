import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceScreenshotDir = path.join(root, 'outputs/xiaotiancai-watch-release');
const packageDir = path.join(root, 'outputs/xiaotiancai-watch-release-package');

const docs = [
  'docs/XIAOTIANCAI_WATCH_DELIVERY_INDEX.md',
  'docs/XIAOTIANCAI_WATCH_DEVICE_QA_SUBMISSION.md',
  'docs/XIAOTIANCAI_WATCH_RELEASE_PACKAGE.md',
  'docs/XIAOTIANCAI_WATCH_3_STEP_PROJECT.md',
  'docs/XIAOTIANCAI_WATCH_INTEGRATION_SPEC.md',
  'docs/XIAOTIANCAI_WATCH_SDK_HANDOFF_CHECKLIST.md',
  'docs/XIAOTIANCAI_WATCH_UI_STYLE_GUIDE.md',
  'docs/XIAOTIANCAI_WATCH_SENSOR_EXTENSION.md',
];

const screenshots = [
  'watch-preview-desktop.png',
  'watch-preview-mobile.png',
  'watch-release-desktop.png',
  'watch-release-mobile.png',
  'watch-delivery-desktop.png',
  'watch-delivery-mobile.png',
  'manifest.json',
];

async function copyFileToPackage(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

await fs.rm(packageDir, { recursive: true, force: true });
await fs.mkdir(path.join(packageDir, 'docs'), { recursive: true });
await fs.mkdir(path.join(packageDir, 'screenshots'), { recursive: true });

for (const doc of docs) {
  await copyFileToPackage(path.join(root, doc), path.join(packageDir, 'docs', path.basename(doc)));
}

for (const screenshot of screenshots) {
  await copyFileToPackage(path.join(sourceScreenshotDir, screenshot), path.join(packageDir, 'screenshots', screenshot));
}

const readme = `# 小天才手表客户端交付包

生成时间：${new Date().toISOString()}

## 入口

- 手表 UI 预览：/watch-preview
- 发布准备页：/watch-release
- 交付评审页：/watch-delivery

## 内容

- docs/: 产品方案、接入规格、SDK 交接清单、真机测试任务单、发布包、交付索引
- screenshots/: 提审/评审截图和 manifest

## 当前状态

- 已完成模拟器、家长审核闭环、任务创建验证方式、真机订阅计划、SDK 适配契约、五类能力 Spike。
- 未完成真实小天才 SDK 接入。
- 权限说明和儿童隐私政策仍需产品/运营/法务确认。

## 复验命令

\`\`\`bash
npm run watch:release:preflight
\`\`\`
`;

await fs.writeFile(path.join(packageDir, 'README.md'), readme);

console.log(`Packaged Xiaotiancai watch release bundle at ${packageDir}`);
