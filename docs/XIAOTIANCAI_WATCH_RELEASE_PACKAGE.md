# 小天才手表客户端发布包

## 1. 发布状态

当前状态：模拟器与业务闭环已准备，真机 SDK 与平台审核仍待确认。

不能对外表述为“已完成小天才上线”。当前只能表述为：

- 已完成手表端 Web 模拟器。
- 已完成家长端审核摘要。
- 已完成任务创建里的手表验证方式配置。
- 已完成真机 SDK 接入契约和发布核对清单。

## 2. 真机接入入口

代码入口：

- `buildWatchNativeBridgePlan(task)`：根据任务生成真机订阅计划。
- `buildWatchNativeAdapterContract(plan)`：根据订阅计划生成 SDK 适配契约。
- `evaluateWatchNativeAdapterReadiness(plan, device)`：根据测试机能力和权限判断是否可接真机。
- `normalizeWatchSensorEvent(event)`：把 SDK 事件转为统一活动快照。
- `buildWatchParentReviewPayload(input)`：生成家长审核卡数据。

真机 SDK 层只需要做三件事：

1. 按 `WatchNativeBridgePlan.subscription` 订阅计步、运动、相机或地点能力。
2. 把结果转成 `WatchSensorEvent` 或 `WatchProofSnapshot`。
3. 调用现有归一逻辑，不直接改家长端 UI。

## 3. 订阅计划

| 验证方式 | 真机订阅 | 权限 | 上传策略 | 兜底 |
| --- | --- | --- | --- | --- |
| 不验证 | none | 无 | 不请求敏感权限 | 手动提交 |
| 计步 | pedometer | 运动/传感器 | 只上传步数汇总和达标状态 | 手动提交给家长确认 |
| 运动时长 | motion_session | 运动/传感器 | 只上传运动时长汇总 | 显示计时器和手动提交 |
| 动作估算 | motion_session | 运动/传感器 | 只上传动作估算汇总，并标注置信度 | 显示计时器和手动提交 |
| 拍照证明 | camera_capture | 相机 | 照片仅给监护人审核 | 文字说明或线下确认 |
| 地点提醒 | place_arrival | 定位 | 只上传地点标签命中结果，不上传完整轨迹 | 保留任务提醒并允许手动提交 |

## 4. 提审截图清单

必须准备以下截图：

1. 今日任务基础入口。
2. 计步任务进度。
3. 运动时长或跳绳动作估算。
4. 拍照证明任务。
5. 地点提醒任务。
6. 愿望进度。
7. 家长审核摘要。
8. 权限拒绝后的手动提交兜底。
9. 创建任务里的“手表验证方式”配置。
10. 家长端通过并发星流程。

可用脚本：

```bash
npm run watch:release:screenshots
```

脚本会从本地预览服务抓取：

- `/watch-preview` 桌面图。
- `/watch-preview` 移动图。
- `/watch-release` 桌面图。
- `/watch-release` 移动图。

输出目录：

- `outputs/xiaotiancai-watch-release/`

## 5. 权限说明文案

### 5.1 运动/传感器

用途：用于统计步数、运动时长和部分动作估算，帮助家长了解任务完成情况。

边界：不上传原始传感器流，不做医疗、健康诊断或体能评估。

拒绝后：仍可查看任务并手动提交。

### 5.2 相机

用途：用于拍摄任务成果，例如整理后的桌面或完成的作品。

边界：照片默认仅给监护人审核，不公开展示，不要求拍摄人脸。

拒绝后：可改为文字说明或由家长线下确认。

### 5.3 定位

用途：用于地点提醒或地点标签命中，例如到公园后提醒开始任务。

边界：不展示实时轨迹，不保存完整路线，不用于广告或商业推荐。

拒绝后：仍保留任务提醒和手动提交。

## 6. 儿童隐私政策补充点

发布前必须在隐私政策中补充：

- 收集的数据类型：步数汇总、运动时长、动作估算结果、任务照片、地点标签。
- 收集目的：辅助家庭任务完成确认。
- 数据可见范围：监护人审核可见。
- 数据不做用途：不做广告投放、不做健康诊断、不做公开排名。
- 权限拒绝影响：不影响基础任务查看和手动提交。
- 数据删除方式：监护人可删除任务记录或相关证明。

## 7. 当前发布核对

| 项目 | 状态 | 负责人 |
| --- | --- | --- |
| 8 个手表关键屏截图 | 已具备模拟器基础 | 设计 |
| 家长审核闭环截图 | 已具备页面基础 | 产品 |
| 权限用途说明 | 待确认最终文案 | 产品 |
| 儿童隐私政策补充 | 待法务/运营确认 | 运营 |
| 真机计步事件验证 | 待真机 | 工程 |
| 真机动作估算验证 | 待真机 | 工程 |
| 真机拍照链路验证 | 待真机 | 工程 |
| 地点提醒上线确认 | 待平台/人工确认 | 运营 |

## 8. 下一步

第一优先级是真机计步 spike：

1. 选择一个 `watch_steps` 任务。
2. 调用 `buildWatchNativeBridgePlan(task)` 得到 `pedometer` 订阅计划。
3. 真机产生步数后输出 `{ kind: 'steps', taskId, steps, targetSteps }`。
4. 用 `normalizeWatchSensorEvent` 转为 `WatchActivitySnapshot`。
5. 家长端用 `buildWatchParentReviewPayload` 展示审核摘要。

计步链路跑通后，再做运动时长、动作估算、相机和地点。

当前已提供模拟入口：

- `simulateWatchStepSpike(input)`
- `simulateWatchActiveMinutesSpike(input)`
- `simulateWatchMotionCountSpike(input)`
- `simulateWatchPhotoProofSpike(input)`
- `simulateWatchPlaceHintSpike(input)`

它用于在没有真机 SDK 时先跑通：

```text
模拟步数事件 -> 活动快照 -> 家长审核 Payload
```

`/watch-release` 页面已展示该链路的模拟结果。

## 9. SDK 交接清单

工程对接前先阅读：

- `docs/XIAOTIANCAI_WATCH_SDK_HANDOFF_CHECKLIST.md`
- `docs/XIAOTIANCAI_WATCH_DEVICE_QA_SUBMISSION.md`

这两份文档已拆出：

- 小天才开放平台公开边界。
- 我们产品侧固定契约。
- 设备能力快照字段。
- 运动类和证明类事件字段。
- 权限申请文案。
- 真机验收用例。
- 提审材料补充项。
- 真机测试任务单。
- 提审截图清单。
- 上线前阻断项。
