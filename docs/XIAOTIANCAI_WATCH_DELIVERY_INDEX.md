# 小天才手表客户端交付索引

## 1. 当前可验收入口

| 入口 | 用途 |
| --- | --- |
| `/watch-preview` | 查看手表端 UI、验证方式切换、8 个关键屏 |
| `/watch-release` | 查看真机订阅计划、发布核对清单、能力 Spike 结果 |
| `/watch-delivery` | 查看对外评审版交付页、真机任务单、提审材料状态 |
| `outputs/xiaotiancai-watch-release/` | 发布截图包输出目录 |

## 2. 三步主线

1. 家长审核闭环：已完成手表提交摘要卡和审核 Payload。
2. 任务创建与手表验证方式：已完成 6 种验证方式配置和预览联动。
3. 真机 SDK 与发布包：已完成订阅计划、发布准备页、截图包脚本和五类能力 Spike。

## 3. 核心代码入口

| 文件 | 内容 |
| --- | --- |
| `src/domain/watchClient.ts` | 手表任务模型、验证方式、活动快照、审核 Payload、发布清单 |
| `src/domain/watchNativeBridge.ts` | 计步、运动时长、动作估算、拍照、地点的模拟真机 Spike |
| `src/pages/WatchPreview.tsx` | 手表端 UI 预览 |
| `src/pages/WatchRelease.tsx` | 发布准备与 Spike 结果展示 |
| `src/components/watch/WatchReviewEvidenceCard.tsx` | 家长端手表审核摘要卡 |
| `src/pages/PublishTask.tsx` | 创建/编辑任务里的手表验证方式 |

## 4. SDK 接入交接

新增交付物：

- `docs/XIAOTIANCAI_WATCH_SDK_HANDOFF_CHECKLIST.md`
- `docs/XIAOTIANCAI_WATCH_DEVICE_QA_SUBMISSION.md`

它覆盖：

- 小天才开放平台已确认边界。
- 我们产品侧固定适配契约。
- 真机字段表、权限文案、验收用例。
- 提审材料补充和仍需小天才确认的问题。
- 真机测试任务单、提审截图清单和上线阻断项。

## 5. 发布截图

生成命令：

```bash
npm run watch:release:screenshots
```

输出：

- `watch-preview-desktop.png`
- `watch-preview-mobile.png`
- `watch-release-desktop.png`
- `watch-release-mobile.png`
- `manifest.json`

交付包目录：

- `outputs/xiaotiancai-watch-release-package/`

## 6. 验证命令

一键预检：

```bash
npm run watch:release:preflight
```

生成交付包：

```bash
npm run watch:release:package
```

分步检查：

```bash
npm run watch:release:verify
npm run test -- src/test/watch-client-domain.test.ts
npm run lint
```

当前状态：

- 一键预检：通过。
- 发布包校验：通过。
- 手表领域测试：19 个通过。
- 全量类型检查：通过。

## 7. 尚未完成的真实外部依赖

- 小天才真机 SDK 尚未接入。
- 计步、运动、相机、定位仍需真机验证。
- 权限文案和儿童隐私政策仍需产品/运营/法务最终确认。
- 地点提醒是否允许上线仍需平台或人工确认。
