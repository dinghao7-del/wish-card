# 小天才手表客户端接入与家长端联动规格

## 1. 当前目标

先把星愿卡在小天才手表上的第一版能力做成“任务查看 + 运动辅助统计 + 证据提交 + 家长确认”的闭环。

手表端不替代家长判断。手表端只做三件事：

1. 让孩子知道现在要做什么。
2. 用手表能力辅助记录完成情况。
3. 把简明可信的证据交给家长端确认。

## 2. 能力矩阵

| 手表能力 | 产品用途 | 权限 | 不可用时兜底 |
| --- | --- | --- | --- |
| 计步 | 户外走一走、每日步数目标 | 运动/传感器 | 孩子手动点完成，家长确认 |
| 陀螺仪/加速度计 | 跳绳、摆臂、运动时长估算 | 运动/传感器 | 只展示计时器和手动提交 |
| 相机 | 整理书桌、作品完成等成果证明 | 相机 | 改为文字说明或家长线下确认 |
| 定位/地点标签 | 到公园、到球场等地点提醒 | 定位 | 不记录位置，只保留任务提醒 |
| 通知 | 任务开始、快截止、家长确认结果 | 通知 | 进入手表应用后显示待办 |

## 3. 统一数据结构

真实小天才 SDK 接入后，不直接把原始传感器数据交给业务页面。所有能力先归一为两类结构：

### 3.1 活动快照

```ts
type WatchActivitySnapshot = {
  taskId: string;
  metricType: 'steps' | 'active_minutes' | 'jump_rope_estimate' | 'photo_proof' | 'place_hint';
  targetValue: number;
  currentValue: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'xtc_steps' | 'android_sensor' | 'camera' | 'place_tag' | 'manual_fallback';
};
```

使用原则：

- 计步达标可以高置信度。
- 跳绳和动作类只能写“估计”，不能写成确定事实。
- 运动时长可以作为辅助证据，但不等同于任务已完成。
- 原始传感器流不上传，只上传汇总结果。

### 3.2 证明快照

```ts
type WatchProofSnapshot = {
  kind: 'photo' | 'place';
  label: string;
  privacyNote: string;
};
```

使用原则：

- 照片默认只给监护人审核，不公开展示。
- 地点只做标签或提醒，不展示实时轨迹。
- 如果权限被拒绝，证明快照可以为空，任务仍允许手动提交。

## 4. SDK 事件归一

真机 SDK 层只需要输出以下事件，再由 `normalizeWatchSensorEvent` 转成活动快照：

```ts
type WatchSensorEvent =
  | { kind: 'steps'; taskId: string; steps: number; targetSteps: number }
  | { kind: 'motion_count'; taskId: string; count: number; targetCount: number; confidence: 'high' | 'medium' | 'low' }
  | { kind: 'active_minutes'; taskId: string; minutes: number; targetMinutes: number; confidence?: 'high' | 'medium' | 'low' };
```

落地顺序建议：

1. 先接计步事件。
2. 再接运动时长。
3. 真机测试后再接跳绳/摆臂动作估算。
4. 相机和定位必须等权限说明、隐私政策、审核材料同步完成后再打开。

## 5. 家长端审核 Payload

手表端提交后，家长端收到的是简化后的审核载荷：

```ts
type WatchParentReviewPayload = {
  taskId: string;
  taskTitle: string;
  childId: string;
  childName: string;
  rewardStars: number;
  decisionDefault: 'approve' | 'request_more' | 'reject';
  evidence: {
    childSubmission: string;
    activity?: WatchActivityProgress;
    photoLabel?: string;
    placeLabel?: string;
    privacyNote: string;
  };
  actions: Array<{ id: 'approve' | 'request_more' | 'reject'; label: string }>;
};
```

审核默认值规则：

- 计步任务已达标、置信度高、没有敏感证明时，可默认建议通过。
- 动作估算、照片证明、地点证明，默认仍建议家长查看。
- 所有星星发放最终以家长端确认为准。

## 6. 家长端界面要点

审核卡片建议展示：

```text
跳绳 10 分钟
小宇已提交完成
手表辅助记录：估计 96 / 100 个，置信度中
照片：整理后桌面
隐私：只给监护人审核

[通过并发 3 星] [退回补充] [不通过]
```

不要展示：

- 原始传感器波形。
- 完整定位轨迹。
- 孩子运动排名。
- 未经家长确认的自动奖励结果。

## 7. 发布前核对

### 7.1 产品核对

- 8 个手表关键屏已覆盖。
- 权限拒绝后仍可完成任务。
- 运动数据文案不夸大准确性。
- 孩子端只看任务和进度，不看复杂管理功能。

### 7.2 技术核对

- SDK 输出已统一成 `WatchActivitySnapshot` 或 `WatchProofSnapshot`。
- 家长端只消费 `WatchParentReviewPayload`。
- 真实传感器数据不直接进入 UI。
- 真实相机/定位接入前必须有权限说明和隐私策略。

### 7.3 审核核对

- 提供权限用途说明。
- 提供照片/定位数据保存策略。
- 提供未授权兜底流程截图。
- 提供家长确认截图，证明孩子端不会直接发放争议奖励。

## 8. 下一批开发任务

1. 在家长端任务审核卡接入 `WatchParentReviewPayload`。
2. 给任务创建流程新增“手表验证方式”配置。
3. 做计步真机 spike，只验证步数事件到活动快照。
4. 做权限弹窗和隐私政策文案。
5. 做发布截图包：基础任务、计步、跳绳、拍照、地点、权限降级、家长审核。

本轮已补充真机订阅计划与发布包：

- `buildWatchNativeBridgePlan(task)`
- `buildWatchReleaseChecklist()`
- `docs/XIAOTIANCAI_WATCH_RELEASE_PACKAGE.md`
