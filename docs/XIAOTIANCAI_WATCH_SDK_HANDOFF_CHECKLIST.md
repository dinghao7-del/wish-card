# 小天才手表 SDK 接入交接清单

## 1. 已确认的平台边界

以下信息来自小天才开放平台公开文档，用于约束我们自己的接入设计。具体 SDK 包、私有 API 名称和权限范围仍需以小天才对接人员最终提供为准。

| 事项 | 已确认信息 | 对我们的影响 |
| --- | --- | --- |
| 开放机型 | 小天才 4G 手表基于 Android 定制，公开机型示例包含 320x360 分辨率与加速度传感器等信息。 | UI 稿继续按 320x360 安全区设计；运动能力优先按加速度/计步等保守能力适配。 |
| 账号授权 | appId、appSecret 和权限范围由小天才分配；账号 SDK 需向小天才技术同学获取；授权码 code 有有效期。 | 我们不能在代码里写死 appId/appSecret；需要服务端换 token，并区分测试/正式环境。 |
| H5/服务号 | 服务号 H5 可使用 XtcJSBridge；入口 URL 需 https；调试建议保持手表与 APP 环境一致。 | 若先做 H5/服务号版本，桥接能力要单独适配，不能默认等同原生 APK 能力。 |
| 拍照能力 | 公开资料存在通用拍照能力说明，但具体调用方式应以实际 SDK 为准。 | 拍照证明只作为授权后能力，必须保留文字/线下确认兜底。 |
| 审核规范 | 平台强调未成年人保护、家长知情管控、隐私政策、权限管理、用户协议和儿童易懂表达。 | 提审材料必须说明数据类型、用途、可见范围、拒绝权限后的影响和删除方式。 |

## 2. 产品侧固定契约

小天才 SDK 适配层只负责把设备能力转换成以下统一结构，不直接改任务页或家长审核页。

| 契约 | 代码入口 | 说明 |
| --- | --- | --- |
| 订阅计划 | `buildWatchNativeBridgePlan(task)` | 根据任务验证方式生成订阅类型、所需权限、上传策略和兜底动作。 |
| 适配契约 | `buildWatchNativeAdapterContract(plan)` | 固定所需能力、事件 payload、提交触发点和隐私边界。 |
| 设备 readiness | `evaluateWatchNativeAdapterReadiness(plan, device)` | 判断测试机是否可接真机、缺权限、缺能力或需要手动兜底。 |
| 运动事件归一 | `normalizeWatchSensorEvent(event)` | 将计步、运动时长、动作估算统一成活动快照。 |
| 家长审核 | `buildWatchParentReviewPayload(input)` | 将活动快照、照片证明、地点证明转换成家长审核摘要。 |

## 3. SDK 适配字段表

### 3.1 设备能力快照

```ts
type WatchNativeDeviceSnapshot = {
  deviceId: string;
  modelName: string;
  appVersion: string;
  capabilities: {
    steps?: boolean;
    motion?: boolean;
    camera?: boolean;
    location?: boolean;
    notification?: boolean;
  };
  grantedPermissions: Array<'camera' | 'location' | 'motion'>;
};
```

### 3.2 运动类事件

| 场景 | 事件结构 | 最低要求 |
| --- | --- | --- |
| 计步达标 | `{ kind: 'steps', taskId, steps, targetSteps }` | `steps` 必须为非负数；只上传汇总值。 |
| 运动时长 | `{ kind: 'active_minutes', taskId, minutes, targetMinutes, confidence }` | `minutes` 必须为非负数；低置信度不自动通过。 |
| 动作估算 | `{ kind: 'motion_count', taskId, count, targetCount, confidence }` | 必须带 `confidence`；默认由家长审核确认。 |

### 3.3 证明类事件

| 场景 | 证明结构 | 最低要求 |
| --- | --- | --- |
| 拍照证明 | `{ kind: 'photo', label, privacyNote }` | 不要求拍摄人脸；仅给监护人审核。 |
| 地点提醒 | `{ kind: 'place', label, privacyNote }` | 只上传地点标签命中结果；不上传实时轨迹。 |

## 4. 权限申请文案

| 权限 | 手表端短文案 | 家长端说明 | 拒绝后 |
| --- | --- | --- | --- |
| 运动/传感器 | 用于记录这次任务的步数或运动时长。 | 仅上传任务相关汇总值，不上传原始传感器流，不做健康诊断。 | 孩子仍可手动提交，家长确认。 |
| 相机 | 用照片告诉爸爸妈妈任务完成了。 | 照片仅用于本次任务审核，不公开展示，不要求拍人脸。 | 可改成文字说明或线下确认。 |
| 定位 | 到指定地点后提醒开始或提交。 | 只判断地点标签是否命中，不展示实时轨迹，不保存完整路线。 | 保留普通任务提醒和手动提交。 |

## 5. 真机验收用例

| 用例 | 前置条件 | 操作 | 通过标准 |
| --- | --- | --- | --- |
| 计步达标 | 测试机支持计步且运动权限已授权 | 创建 `watch_steps` 任务并产生超过目标步数 | 家长端审核摘要显示步数汇总，默认决策可通过。 |
| 计步拒权 | 测试机支持计步但未授权运动权限 | 进入任务并拒绝权限 | 页面展示手动提交兜底，不阻断任务查看。 |
| 运动时长 | 测试机支持运动会话 | 开始并结束 20 分钟运动任务 | 审核摘要显示分钟数和置信度，不上传原始传感器流。 |
| 动作估算 | 测试机支持加速度能力 | 执行跳绳或摆臂估算任务 | 审核摘要显示估算数量和置信度，默认仍需家长确认。 |
| 拍照证明 | 相机权限已授权 | 拍摄整理书桌或作品照片 | 审核摘要展示照片标签和隐私说明。 |
| 拍照拒权 | 相机权限未授权 | 拒绝授权后提交任务 | 可切到文字说明或线下确认。 |
| 地点提醒 | 平台确认允许地点能力上线 | 到达地点标签附近 | 只生成地点标签命中证明，不展示轨迹。 |
| 地点不可用 | 设备或平台不支持定位 | 进入地点任务 | 展示手动提交兜底，发布页标记为不支持或待人工确认。 |

## 6. 提审材料补充

提交前需要补齐：

1. 小天才分配的 `appId`、权限范围和测试/正式环境说明。
2. 实际 SDK 包名、版本号、最小手表系统版本和支持机型。
3. 用户协议：面向监护人说明功能、数据、可监护范围、客服方式。
4. 儿童易懂版说明：用孩子能理解的短句解释拍照、运动、地点。
5. 隐私政策：列明步数汇总、运动时长、动作估算、任务照片、地点标签的收集目的和删除方式。
6. 真机验收截图：权限弹窗、拒权兜底、家长审核、任务完成链路。

## 7. 仍需小天才确认的问题

- 是否开放计步或运动传感器 SDK 给第三方应用。
- 运动、相机、定位权限在目标机型上的实际授权弹窗和回调形态。
- H5 服务号与原生 APK 在传感器、相机、定位能力上的差异。
- 地点提醒是否允许作为儿童任务辅助能力上线。
- 审核时是否需要额外提供儿童隐私影响评估或监护人同意截图。

## 8. 公开资料参考

- 小天才开放平台：开放机型，https://developer.imoo.com/docs/develop/00-model.html
- 小天才开放平台：开发基础配置，https://developer.imoo.com/docs/en/develop/01-setting.html
- 小天才开放平台：账号系统，https://developer.imoo.com/docs/develop/09-account.html
- 小天才开放平台：应用服务号与 XtcJSBridge，https://developer.imoo.com/docs/develop/08-service.html
- 小天才开放平台：API 开放接口，https://developer.imoo.com/docs/develop/03-function.html
- 小天才开放平台：审核规范，https://developer.imoo.com/docs/publish/02-resource.html
