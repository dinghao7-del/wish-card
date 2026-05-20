import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const submissionDir = path.join(root, 'outputs/xiaotiancai-watch-formal-submission');
const releasePackageDir = path.join(root, 'outputs/xiaotiancai-watch-release-package');
const apkPath = path.join(root, 'android/app/build/outputs/apk/release/app-release.apk');
const aabPath = path.join(root, 'android/app/build/outputs/bundle/release/app-release.aab');
const apkMetadataPath = path.join(root, 'android/app/build/outputs/apk/release/output-metadata.json');

const docs = [
  'docs/XIAOTIANCAI_WATCH_DELIVERY_INDEX.md',
  'docs/XIAOTIANCAI_WATCH_DEVICE_QA_SUBMISSION.md',
  'docs/XIAOTIANCAI_WATCH_RELEASE_PACKAGE.md',
  'docs/XIAOTIANCAI_WATCH_SDK_HANDOFF_CHECKLIST.md',
  'docs/XIAOTIANCAI_WATCH_INTEGRATION_SPEC.md',
  'docs/XIAOTIANCAI_WATCH_SENSOR_EXTENSION.md',
  'docs/XIAOTIANCAI_WATCH_UI_STYLE_GUIDE.md',
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

async function copyFile(source, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

await fs.rm(submissionDir, { recursive: true, force: true });
await fs.mkdir(path.join(submissionDir, 'app-build'), { recursive: true });
await fs.mkdir(path.join(submissionDir, 'docs'), { recursive: true });
await fs.mkdir(path.join(submissionDir, 'screenshots'), { recursive: true });

if (!(await fileExists(apkPath))) {
  throw new Error(`Release APK is missing: ${apkPath}`);
}

await copyFile(apkPath, path.join(submissionDir, 'app-build/wishcard-xiaotiancai-1.0.6-release.apk'));

if (await fileExists(aabPath)) {
  await copyFile(aabPath, path.join(submissionDir, 'app-build/wishcard-xiaotiancai-1.0.6-release.aab'));
}

if (await fileExists(apkMetadataPath)) {
  await copyFile(apkMetadataPath, path.join(submissionDir, 'app-build/output-metadata.json'));
}

for (const doc of docs) {
  await copyFile(path.join(root, doc), path.join(submissionDir, 'docs', path.basename(doc)));
}

for (const screenshot of screenshots) {
  await copyFile(
    path.join(releasePackageDir, 'screenshots', screenshot),
    path.join(submissionDir, 'screenshots', screenshot),
  );
}

const appInfo = `# 小天才平台提交信息

## 应用基础信息

| 字段 | 内容 |
| --- | --- |
| 应用名称 | 愿望卡 |
| 包名 | com.forestfamily.app |
| versionName | 1.0.6 |
| versionCode | 6 |
| APK | app-build/wishcard-xiaotiancai-1.0.6-release.apk |
| AAB | app-build/wishcard-xiaotiancai-1.0.6-release.aab |
| 当前状态 | 本地提审包已生成，待小天才账号授权、appId/appSecret、真机测试和平台提交 |

## 版本更新说明

本版本新增小天才手表客户端准备能力：手表端任务 UI、家长审核闭环、任务创建中的手表验证方式、SDK 适配契约、权限文案、真机测试任务单和提审材料包。

## 详细改动项

- 新增手表端 /watch-preview 预览，覆盖今日任务、计步、运动、拍照、地点、愿望进度、权限兜底等关键屏。
- 新增 /watch-release 发布准备页，展示真机订阅计划、SDK 适配契约、发布核对清单和能力 Spike。
- 新增 /watch-delivery 交付评审页，集中展示交付状态、真机任务单、提审材料状态和上线阻断项。
- 家长端新增手表证明审核摘要，可处理运动快照、照片证明和地点证明。
- 创建任务支持选择计步达标、运动时长、动作估算、拍照证明、地点提醒等手表验证方式。

## 权限用途

- 运动/传感器：用于统计任务相关步数、运动时长或动作估算，只上传汇总值。
- 相机：用于拍摄任务成果，仅给监护人审核，不公开展示。
- 定位：用于地点提醒或地点标签命中，不展示实时轨迹，不保存完整路线。

## 当前不得承诺

- 不得表述为已完成小天才正式上线。
- 不得表述为已支持所有小天才手表传感器能力。
- 不得表述为可实时定位孩子位置。
- 不得表述为可自动判断所有运动任务完成。
`;

const readme = `# 小天才手表正式提交包

生成时间：${new Date().toISOString()}

## 目录

- app-build/: Android release APK、AAB 与构建 metadata。
- docs/: SDK 交接清单、真机测试任务单、发布说明、设计与集成文档。
- screenshots/: 手表 UI、发布准备页、交付评审页截图。
- SUBMISSION_APP_INFO.md: 可粘贴到平台后台或发给小天才对接人的提交信息。

## 下一步

1. 使用小天才开放平台账号登录或联系小天才对接群。
2. 获取 appId、appSecret、权限范围、SDK 包和目标机型范围。
3. 上传 app-build/wishcard-xiaotiancai-1.0.6-release.apk。
4. 上传截图和测试用例/测试报告。
5. 按 docs/XIAOTIANCAI_WATCH_DEVICE_QA_SUBMISSION.md 执行真机验证。

## 平台侧仍需人工授权

- 小天才开发者账号登录。
- 入驻申请或应用创建。
- appId/appSecret 分配。
- 真实手表权限授权与真机测试。
- 最终提交审核按钮。
`;

await fs.writeFile(path.join(submissionDir, 'SUBMISSION_APP_INFO.md'), appInfo);
await fs.writeFile(path.join(submissionDir, 'README.md'), readme);

console.log(`Packaged Xiaotiancai watch formal submission at ${submissionDir}`);
