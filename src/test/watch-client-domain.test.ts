import { describe, expect, it } from 'vitest';
import type { Member, Reward, Task } from '../types';
import {
  buildWatchVerificationTaskPatch,
  buildWatchCapabilityMatrix,
  buildWatchActivityProgress,
  buildWatchActivitySnapshotFromTask,
  buildWatchNativeBridgePlan,
  buildWatchNativeAdapterContract,
  buildWatchParentReviewPayload,
  buildWatchReleaseChecklist,
  evaluateWatchNativeAdapterReadiness,
  inferWatchVerificationMode,
  buildWatchPermissionFallback,
  buildWatchReviewSummary,
  isWatchLinkedTask,
  normalizeWatchSensorEvent,
  toWatchTaskCard,
} from '../domain/watchClient';
import {
  simulateWatchActiveMinutesSpike,
  simulateWatchMotionCountSpike,
  simulateWatchPhotoProofSpike,
  simulateWatchPlaceHintSpike,
  simulateWatchStepSpike,
} from '../domain/watchNativeBridge';

const child: Member = {
  id: 'child-1',
  name: '小宇',
  avatar: '🌱',
  stars: 128,
  role: 'child',
};

const task: Task = {
  id: 'task-1',
  title: '跳绳 10 分钟',
  description: '完成后让爸爸妈妈确认',
  type: 'watch_motion_count',
  startTime: '2026-05-17T18:30:00.000Z',
  assigneeIds: ['child-1'],
  creatorId: 'parent-1',
  rewardStars: 3,
  status: 'pending',
  icon: 'activity',
  targetCount: 100,
  currentCount: 68,
};

const reward: Reward = {
  id: 'reward-1',
  name: '周末露营',
  description: '爸爸妈妈会一起兑现',
  cost: 150,
  icon: 'gift',
  image: '',
  category: 'experience',
};

describe('watch client presenter', () => {
  it('maps a task into a compact watch card', () => {
    const card = toWatchTaskCard(task, child);

    expect(card.id).toBe('task-1');
    expect(card.title).toBe('跳绳 10 分钟');
    expect(card.rewardLabel).toBe('+3 星');
    expect(card.primaryAction).toBe('完成了');
    expect(card.statusLabel).toBe('待完成');
    expect(card.description).toBe('完成后让爸爸妈妈确认');
  });

  it('builds activity progress without over-claiming sensor accuracy', () => {
    const progress = buildWatchActivityProgress({
      taskId: 'task-1',
      metricType: 'jump_rope_estimate',
      targetValue: 100,
      currentValue: 68,
      confidence: 'medium',
      source: 'android_sensor',
    });

    expect(progress.percent).toBe(68);
    expect(progress.metricLabel).toBe('估计 68 / 100 个');
    expect(progress.confidenceLabel).toBe('置信度中');
    expect(progress.canAutoSubmit).toBe(false);
  });

  it('summarizes watch evidence for parent review', () => {
    const summary = buildWatchReviewSummary({
      task,
      activity: {
        taskId: 'task-1',
        metricType: 'jump_rope_estimate',
        targetValue: 100,
        currentValue: 96,
        confidence: 'medium',
        source: 'android_sensor',
      },
      photoProof: null,
      placeProof: null,
    });

    expect(summary.title).toBe('跳绳 10 分钟');
    expect(summary.rows).toEqual([
      { label: '孩子提交', value: '已提交完成' },
      { label: '手表辅助记录', value: '估计 96 / 100 个，置信度中' },
      { label: '照片 / 地点', value: '未使用敏感权限' },
    ]);
  });

  it('keeps base task completion available when permissions are denied', () => {
    expect(buildWatchPermissionFallback(['camera', 'location', 'motion'])).toEqual({
      title: '不用权限',
      description: '不打开相机、定位或传感器，也能看任务、点完成、等家长确认。',
      actionLabel: '手动提交',
    });
  });

  it('builds current wish progress from member stars and reward cost', () => {
    const card = toWatchTaskCard(task, child, reward);

    expect(card.wish).toEqual({
      title: '周末露营',
      currentStars: 128,
      targetStars: 150,
      remainingStars: 22,
      percent: 85,
    });
  });

  it('documents watch capabilities with product fallbacks', () => {
    const matrix = buildWatchCapabilityMatrix({ location: false, camera: false });

    expect(matrix).toContainEqual({
      capability: 'camera',
      available: false,
      permission: 'camera',
      productUse: '整理书桌、作品完成等成果拍照证明',
      fallback: '改为文字说明或家长线下确认',
    });
    expect(matrix).toContainEqual({
      capability: 'location',
      available: false,
      permission: 'location',
      productUse: '到公园、到球场等地点提醒',
      fallback: '不记录位置，只保留任务提醒',
    });
  });

  it('normalizes native watch sensor events into activity snapshots', () => {
    expect(normalizeWatchSensorEvent({
      kind: 'steps',
      taskId: 'task-steps',
      steps: 2100,
      targetSteps: 2000,
    })).toEqual({
      taskId: 'task-steps',
      metricType: 'steps',
      targetValue: 2000,
      currentValue: 2100,
      confidence: 'high',
      source: 'xtc_steps',
    });

    expect(normalizeWatchSensorEvent({
      kind: 'motion_count',
      taskId: 'task-1',
      count: -4,
      targetCount: 100,
      confidence: 'low',
    }).currentValue).toBe(0);
  });

  it('builds a parent review payload with conservative defaults', () => {
    const payload = buildWatchParentReviewPayload({
      task,
      child,
      activity: {
        taskId: 'task-1',
        metricType: 'jump_rope_estimate',
        targetValue: 100,
        currentValue: 96,
        confidence: 'medium',
        source: 'android_sensor',
      },
      photoProof: { kind: 'photo', label: '整理后桌面', privacyNote: '只给监护人审核' },
      placeProof: null,
    });

    expect(payload).toMatchObject({
      taskId: 'task-1',
      taskTitle: '跳绳 10 分钟',
      childId: 'child-1',
      childName: '小宇',
      rewardStars: 3,
      decisionDefault: 'request_more',
    });
    expect(payload.evidence.activity?.metricLabel).toBe('估计 96 / 100 个');
    expect(payload.evidence.photoLabel).toBe('整理后桌面');
    expect(payload.evidence.privacyNote).toBe('只给监护人审核');
    expect(payload.actions.map(action => action.label)).toEqual(['通过并发 3 星', '退回补充', '不通过']);
  });

  it('identifies watch-linked tasks for parent review surfaces', () => {
    expect(isWatchLinkedTask(task)).toBe(true);
    expect(isWatchLinkedTask({ ...task, type: 'daily', description: '来自小天才手表提交' })).toBe(true);
    expect(isWatchLinkedTask({ ...task, type: 'daily', description: '普通任务' })).toBe(false);
  });

  it('builds activity snapshots from saved watch task counters', () => {
    expect(buildWatchActivitySnapshotFromTask(task)).toEqual({
      taskId: 'task-1',
      metricType: 'jump_rope_estimate',
      targetValue: 100,
      currentValue: 68,
      confidence: 'medium',
      source: 'android_sensor',
    });

    expect(buildWatchActivitySnapshotFromTask({
      ...task,
      id: 'task-steps',
      type: 'watch_steps',
      targetCount: 2000,
      currentCount: 2100,
    })).toEqual({
      taskId: 'task-steps',
      metricType: 'steps',
      targetValue: 2000,
      currentValue: 2100,
      confidence: 'high',
      source: 'xtc_steps',
    });
  });

  it('builds task patches for watch verification modes without duplicating markers', () => {
    expect(buildWatchVerificationTaskPatch({
      mode: 'motion_count',
      description: '跳够之后提交',
    })).toEqual({
      type: 'watch_motion_count',
      description: '跳够之后提交\n小天才手表验证:motion_count（动作估算）',
      targetCount: 100,
      currentCount: 0,
    });

    expect(buildWatchVerificationTaskPatch({
      mode: 'steps',
      description: '先走一走\n小天才手表验证:motion_count（动作估算）',
      targetCount: 3000,
    }).description).toBe('先走一走\n小天才手表验证:steps（计步达标）');
  });

  it('infers watch verification mode from saved task type or marker', () => {
    expect(inferWatchVerificationMode({ type: 'watch_photo_proof', description: '' })).toBe('photo_proof');
    expect(inferWatchVerificationMode({ type: 'daily', description: '小天才手表验证:place_hint（地点提醒）' })).toBe('place_hint');
    expect(inferWatchVerificationMode({ type: 'daily', description: '普通任务' })).toBe('none');
  });

  it('plans native watch subscriptions from saved verification mode', () => {
    expect(buildWatchNativeBridgePlan({
      id: 'task-steps',
      type: 'watch_steps',
      description: '',
      targetCount: 3000,
    })).toEqual({
      taskId: 'task-steps',
      mode: 'steps',
      subscription: 'pedometer',
      requiredPermissions: ['motion'],
      targetValue: 3000,
      uploadPolicy: '只上传步数汇总和达标状态，不上传原始传感器流',
      fallbackAction: '手动提交给家长确认',
    });

    expect(buildWatchNativeBridgePlan({
      id: 'task-place',
      type: 'daily',
      description: '小天才手表验证:place_hint（地点提醒）',
      targetCount: 1,
    })).toMatchObject({
      mode: 'place_hint',
      subscription: 'place_arrival',
      requiredPermissions: ['location'],
      uploadPolicy: '只上传地点标签命中结果，不上传完整轨迹',
    });
  });

  it('builds a native adapter contract for SDK integration', () => {
    const plan = buildWatchNativeBridgePlan({
      id: 'task-photo',
      type: 'watch_photo_proof',
      description: '',
      targetCount: 1,
    });

    expect(buildWatchNativeAdapterContract(plan)).toEqual({
      plan,
      requiredCapabilities: ['camera', 'notification'],
      eventPayload: 'WatchProofSnapshot.photo',
      submitTrigger: '孩子拍照确认后提交给监护人审核',
      privacyBoundary: '照片仅给监护人审核，不公开展示',
    });
  });

  it('evaluates native adapter readiness from device capabilities and permissions', () => {
    const stepPlan = buildWatchNativeBridgePlan({
      id: 'task-steps',
      type: 'watch_steps',
      description: '',
      targetCount: 2000,
    });

    expect(evaluateWatchNativeAdapterReadiness(stepPlan, {
      deviceId: 'xtc-demo-1',
      modelName: '小天才测试机',
      appVersion: '1.0.0',
      capabilities: { steps: true, notification: true },
      grantedPermissions: ['motion'],
    })).toEqual({
      status: 'ready',
      missingCapabilities: [],
      missingPermissions: [],
      nextAction: '步数达到目标后生成家长审核摘要',
    });

    expect(evaluateWatchNativeAdapterReadiness(stepPlan, {
      deviceId: 'xtc-demo-2',
      modelName: '小天才测试机',
      appVersion: '1.0.0',
      capabilities: { steps: true, notification: true },
      grantedPermissions: [],
    })).toMatchObject({
      status: 'needs_permission',
      missingPermissions: ['motion'],
    });

    expect(evaluateWatchNativeAdapterReadiness(stepPlan, {
      deviceId: 'xtc-demo-3',
      modelName: '小天才测试机',
      appVersion: '1.0.0',
      capabilities: { steps: false, notification: true },
      grantedPermissions: ['motion'],
    })).toMatchObject({
      status: 'unsupported',
      missingCapabilities: ['steps'],
      nextAction: '手动提交给家长确认',
    });
  });

  it('builds a release checklist that separates ready work from device and policy blockers', () => {
    const checklist = buildWatchReleaseChecklist();

    expect(checklist).toContainEqual({
      id: 'screenshots',
      label: '8 个手表关键屏截图',
      status: 'ready',
      owner: 'design',
    });
    expect(checklist.some(item => item.status === 'needs_device')).toBe(true);
    expect(checklist.some(item => item.status === 'needs_policy')).toBe(true);
    expect(checklist.some(item => item.status === 'manual_review')).toBe(true);
  });

  it('simulates the watch step spike from native event to parent review payload', () => {
    const result = simulateWatchStepSpike({
      task: {
        ...task,
        id: 'task-steps',
        title: '户外走一走',
        type: 'watch_steps',
        targetCount: 2000,
        currentCount: 0,
        rewardStars: 4,
      },
      child,
      steps: 2100,
    });

    expect(result.event).toEqual({
      kind: 'steps',
      taskId: 'task-steps',
      steps: 2100,
      targetSteps: 2000,
    });
    expect(result.activity).toMatchObject({
      taskId: 'task-steps',
      metricType: 'steps',
      targetValue: 2000,
      currentValue: 2100,
      confidence: 'high',
    });
    expect(result.canSubmitToParent).toBe(true);
    expect(result.reviewPayload).toMatchObject({
      taskId: 'task-steps',
      taskTitle: '户外走一走',
      childName: '小宇',
      rewardStars: 4,
      decisionDefault: 'approve',
    });
    expect(result.reviewPayload.evidence.activity?.metricLabel).toBe('2100 / 2000 步');
  });

  it('simulates active minutes and motion count spikes conservatively', () => {
    const activeResult = simulateWatchActiveMinutesSpike({
      task: {
        ...task,
        id: 'task-active',
        title: '户外运动 20 分钟',
        type: 'watch_active_minutes',
        targetCount: 20,
      },
      child,
      value: 22,
      confidence: 'medium',
    });

    expect(activeResult.event).toMatchObject({
      kind: 'active_minutes',
      taskId: 'task-active',
      minutes: 22,
      targetMinutes: 20,
    });
    expect(activeResult.reviewPayload.evidence.activity?.metricLabel).toBe('22 / 20 分钟');
    expect(activeResult.canSubmitToParent).toBe(true);

    const motionResult = simulateWatchMotionCountSpike({
      task,
      child,
      value: 96,
      confidence: 'medium',
    });

    expect(motionResult.event).toMatchObject({
      kind: 'motion_count',
      taskId: 'task-1',
      count: 96,
      targetCount: 100,
      confidence: 'medium',
    });
    expect(motionResult.reviewPayload.evidence.activity?.metricLabel).toBe('估计 96 / 100 个');
    expect(motionResult.reviewPayload.decisionDefault).toBe('request_more');
    expect(motionResult.canSubmitToParent).toBe(false);
  });

  it('simulates photo and place proof spikes for parent review', () => {
    const photoResult = simulateWatchPhotoProofSpike({
      task: {
        ...task,
        id: 'task-photo',
        title: '整理书桌',
        type: 'watch_photo_proof',
      },
      child,
      label: '整理后的桌面照片',
    });

    expect(photoResult.proof).toEqual({
      kind: 'photo',
      label: '整理后的桌面照片',
      privacyNote: '照片仅给监护人审核，不公开展示',
    });
    expect(photoResult.canSubmitToParent).toBe(true);
    expect(photoResult.reviewPayload.evidence.photoLabel).toBe('整理后的桌面照片');
    expect(photoResult.reviewPayload.evidence.privacyNote).toBe('照片仅给监护人审核，不公开展示');
    expect(photoResult.reviewPayload.decisionDefault).toBe('request_more');

    const placeResult = simulateWatchPlaceHintSpike({
      task: {
        ...task,
        id: 'task-place',
        title: '到公园后开始',
        type: 'watch_place_hint',
      },
      child,
      label: '地点标签：公园',
    });

    expect(placeResult.proof).toMatchObject({
      kind: 'place',
      label: '地点标签：公园',
    });
    expect(placeResult.canSubmitToParent).toBe(true);
    expect(placeResult.reviewPayload.evidence.placeLabel).toBe('地点标签：公园');
    expect(placeResult.reviewPayload.evidence.privacyNote).toBe('地点只做任务确认，不展示实时轨迹');
  });
});
