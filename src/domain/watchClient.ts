import type { Member, Reward, Task } from '../types';

export type WatchMetricType = 'steps' | 'active_minutes' | 'jump_rope_estimate' | 'photo_proof' | 'place_hint';
export type WatchConfidence = 'high' | 'medium' | 'low';
export type WatchSensorSource = 'xtc_steps' | 'android_sensor' | 'camera' | 'place_tag' | 'manual_fallback';
export type WatchPermission = 'camera' | 'location' | 'motion';
export type WatchCapability = 'steps' | 'motion' | 'camera' | 'location' | 'notification';
export type WatchReviewDecision = 'approve' | 'request_more' | 'reject';
export type WatchVerificationMode = 'none' | 'steps' | 'active_minutes' | 'motion_count' | 'photo_proof' | 'place_hint';
export type WatchNativeSubscriptionKind = 'none' | 'pedometer' | 'motion_session' | 'camera_capture' | 'place_arrival';
export type WatchNativeAdapterStatus = 'ready' | 'needs_permission' | 'unsupported' | 'manual_fallback';

export type WatchActivitySnapshot = {
  taskId: string;
  metricType: WatchMetricType;
  targetValue: number;
  currentValue: number;
  confidence: WatchConfidence;
  source: WatchSensorSource;
};

export type WatchProofSnapshot = {
  kind: 'photo' | 'place';
  label: string;
  privacyNote: string;
};

export type WatchWishSummary = {
  title: string;
  currentStars: number;
  targetStars: number;
  remainingStars: number;
  percent: number;
};

export type WatchTaskCard = {
  id: string;
  title: string;
  description: string;
  rewardLabel: string;
  statusLabel: string;
  primaryAction: string;
  secondaryAction: string;
  wish?: WatchWishSummary;
};

export type WatchActivityProgress = {
  percent: number;
  metricLabel: string;
  confidenceLabel: string;
  canAutoSubmit: boolean;
};

export type WatchReviewSummary = {
  title: string;
  rows: Array<{ label: string; value: string }>;
};

export type WatchPermissionFallback = {
  title: string;
  description: string;
  actionLabel: string;
};

export type WatchCapabilityStatus = {
  capability: WatchCapability;
  available: boolean;
  permission?: WatchPermission;
  productUse: string;
  fallback: string;
};

export type WatchSensorEvent =
  | {
      kind: 'steps';
      taskId: string;
      steps: number;
      targetSteps: number;
      source?: WatchSensorSource;
    }
  | {
      kind: 'motion_count';
      taskId: string;
      count: number;
      targetCount: number;
      confidence: WatchConfidence;
      source?: WatchSensorSource;
    }
  | {
      kind: 'active_minutes';
      taskId: string;
      minutes: number;
      targetMinutes: number;
      confidence?: WatchConfidence;
      source?: WatchSensorSource;
    };

export type WatchParentReviewPayload = {
  taskId: string;
  taskTitle: string;
  childId: string;
  childName: string;
  rewardStars: number;
  decisionDefault: WatchReviewDecision;
  evidence: {
    childSubmission: string;
    activity?: WatchActivityProgress;
    photoLabel?: string;
    placeLabel?: string;
    privacyNote: string;
  };
  actions: Array<{ id: WatchReviewDecision; label: string }>;
};

export type WatchVerificationOption = {
  id: WatchVerificationMode;
  label: string;
  shortLabel: string;
  taskType: Task['type'];
  description: string;
  defaultTargetCount?: number;
};

export type WatchNativeBridgePlan = {
  taskId: string;
  mode: WatchVerificationMode;
  subscription: WatchNativeSubscriptionKind;
  requiredPermissions: WatchPermission[];
  targetValue?: number;
  uploadPolicy: string;
  fallbackAction: string;
};

export type WatchNativeDeviceSnapshot = {
  deviceId: string;
  modelName: string;
  appVersion: string;
  capabilities: Partial<Record<WatchCapability, boolean>>;
  grantedPermissions: WatchPermission[];
};

export type WatchNativeAdapterContract = {
  plan: WatchNativeBridgePlan;
  requiredCapabilities: WatchCapability[];
  eventPayload: string;
  submitTrigger: string;
  privacyBoundary: string;
};

export type WatchNativeAdapterReadiness = {
  status: WatchNativeAdapterStatus;
  missingCapabilities: WatchCapability[];
  missingPermissions: WatchPermission[];
  nextAction: string;
};

export type WatchReleaseChecklistItem = {
  id: string;
  label: string;
  status: 'ready' | 'needs_device' | 'needs_policy' | 'manual_review';
  owner: 'product' | 'design' | 'engineering' | 'ops';
};

const WATCH_VERIFICATION_MARKER = '小天才手表验证:';

export const WATCH_VERIFICATION_OPTIONS: WatchVerificationOption[] = [
  {
    id: 'none',
    label: '不使用手表验证',
    shortLabel: '不验证',
    taskType: 'daily',
    description: '孩子手动提交，家长确认。',
  },
  {
    id: 'steps',
    label: '计步达标',
    shortLabel: '计步',
    taskType: 'watch_steps',
    description: '适合户外走一走、每日步数目标。',
    defaultTargetCount: 2000,
  },
  {
    id: 'active_minutes',
    label: '运动时长',
    shortLabel: '时长',
    taskType: 'watch_active_minutes',
    description: '适合跑步、户外活动、运动打卡。',
    defaultTargetCount: 20,
  },
  {
    id: 'motion_count',
    label: '动作估算',
    shortLabel: '动作',
    taskType: 'watch_motion_count',
    description: '适合跳绳、摆臂等动作估算，结果会标注置信度。',
    defaultTargetCount: 100,
  },
  {
    id: 'photo_proof',
    label: '拍照证明',
    shortLabel: '拍照',
    taskType: 'watch_photo_proof',
    description: '适合整理书桌、作品完成等成果证明。',
  },
  {
    id: 'place_hint',
    label: '地点提醒',
    shortLabel: '地点',
    taskType: 'watch_place_hint',
    description: '适合到公园、到球场等地点提醒，不展示实时轨迹。',
  },
];

export const WATCH_VISUAL_TOKENS = {
  screen: {
    width: 320,
    height: 360,
    safeX: 18,
    safeY: 16,
  },
  color: {
    bg: '#050805',
    panel: '#121b11',
    panelStrong: '#172217',
    green: '#35d05f',
    star: '#ffd75a',
    sportBlue: '#28d8ff',
    adventureOrange: '#ffb347',
    text: '#f7fff5',
    muted: '#b7c7b2',
    danger: '#ff7f71',
  },
} as const;

export function toWatchTaskCard(task: Task, member: Member, reward?: Reward): WatchTaskCard {
  return {
    id: task.id,
    title: shorten(task.title, 12),
    description: task.description || '完成后让爸爸妈妈确认',
    rewardLabel: `+${task.rewardStars} 星`,
    statusLabel: getWatchStatusLabel(task.status),
    primaryAction: task.status === 'reviewing' ? '已提交' : '完成了',
    secondaryAction: '稍后',
    wish: reward ? buildWishSummary(member, reward) : undefined,
  };
}

export function buildWatchActivityProgress(activity: WatchActivitySnapshot): WatchActivityProgress {
  const percent = clampPercent(Math.round((activity.currentValue / Math.max(activity.targetValue, 1)) * 100));
  const metricLabel = `${metricPrefix(activity.metricType)}${activity.currentValue} / ${activity.targetValue} ${metricUnit(activity.metricType)}`;
  const confidenceLabel = confidenceText(activity.confidence);
  const canAutoSubmit = activity.metricType === 'steps' && activity.currentValue >= activity.targetValue && activity.confidence === 'high';

  return { percent, metricLabel, confidenceLabel, canAutoSubmit };
}

export function buildWatchReviewSummary(input: {
  task: Task;
  activity?: WatchActivitySnapshot | null;
  photoProof?: WatchProofSnapshot | null;
  placeProof?: WatchProofSnapshot | null;
}): WatchReviewSummary {
  const rows: WatchReviewSummary['rows'] = [
    { label: '孩子提交', value: input.task.status === 'completed' ? '已确认完成' : '已提交完成' },
  ];

  if (input.activity) {
    const progress = buildWatchActivityProgress(input.activity);
    rows.push({ label: '手表辅助记录', value: `${progress.metricLabel}，${progress.confidenceLabel}` });
  } else {
    rows.push({ label: '手表辅助记录', value: '未使用传感器' });
  }

  const proofLabels = [input.photoProof?.label, input.placeProof?.label].filter(Boolean);
  rows.push({ label: '照片 / 地点', value: proofLabels.length > 0 ? proofLabels.join('，') : '未使用敏感权限' });

  return { title: input.task.title, rows };
}

export function buildWatchPermissionFallback(_denied: WatchPermission[]): WatchPermissionFallback {
  return {
    title: '不用权限',
    description: '不打开相机、定位或传感器，也能看任务、点完成、等家长确认。',
    actionLabel: '手动提交',
  };
}

export function buildWatchCapabilityMatrix(available: Partial<Record<WatchCapability, boolean>> = {}): WatchCapabilityStatus[] {
  return [
    {
      capability: 'steps',
      available: available.steps ?? true,
      permission: 'motion',
      productUse: '计步任务自动统计达标进度',
      fallback: '孩子手动点完成，家长确认',
    },
    {
      capability: 'motion',
      available: available.motion ?? true,
      permission: 'motion',
      productUse: '跳绳、摆臂、运动时长等动作估算',
      fallback: '只展示计时器和手动提交',
    },
    {
      capability: 'camera',
      available: available.camera ?? true,
      permission: 'camera',
      productUse: '整理书桌、作品完成等成果拍照证明',
      fallback: '改为文字说明或家长线下确认',
    },
    {
      capability: 'location',
      available: available.location ?? false,
      permission: 'location',
      productUse: '到公园、到球场等地点提醒',
      fallback: '不记录位置，只保留任务提醒',
    },
    {
      capability: 'notification',
      available: available.notification ?? true,
      productUse: '任务开始、快到截止、家长确认结果提醒',
      fallback: '进入手表应用后显示待办',
    },
  ];
}

export function normalizeWatchSensorEvent(event: WatchSensorEvent): WatchActivitySnapshot {
  if (event.kind === 'steps') {
    return {
      taskId: event.taskId,
      metricType: 'steps',
      targetValue: event.targetSteps,
      currentValue: Math.max(0, event.steps),
      confidence: 'high',
      source: event.source ?? 'xtc_steps',
    };
  }

  if (event.kind === 'active_minutes') {
    return {
      taskId: event.taskId,
      metricType: 'active_minutes',
      targetValue: event.targetMinutes,
      currentValue: Math.max(0, event.minutes),
      confidence: event.confidence ?? 'medium',
      source: event.source ?? 'android_sensor',
    };
  }

  return {
    taskId: event.taskId,
    metricType: 'jump_rope_estimate',
    targetValue: event.targetCount,
    currentValue: Math.max(0, event.count),
    confidence: event.confidence,
    source: event.source ?? 'android_sensor',
  };
}

export function buildWatchParentReviewPayload(input: {
  task: Task;
  child: Member;
  activity?: WatchActivitySnapshot | null;
  photoProof?: WatchProofSnapshot | null;
  placeProof?: WatchProofSnapshot | null;
}): WatchParentReviewPayload {
  const activity = input.activity ? buildWatchActivityProgress(input.activity) : undefined;
  const usesSensitiveProof = Boolean(input.photoProof || input.placeProof);
  const canDefaultApprove = Boolean(activity?.canAutoSubmit && !usesSensitiveProof);

  return {
    taskId: input.task.id,
    taskTitle: input.task.title,
    childId: input.child.id,
    childName: input.child.name,
    rewardStars: input.task.rewardStars,
    decisionDefault: canDefaultApprove ? 'approve' : 'request_more',
    evidence: {
      childSubmission: input.task.status === 'completed' ? '已确认完成' : '已提交完成',
      activity,
      photoLabel: input.photoProof?.label,
      placeLabel: input.placeProof?.label,
      privacyNote: buildReviewPrivacyNote(input.photoProof, input.placeProof),
    },
    actions: [
      { id: 'approve', label: `通过并发 ${input.task.rewardStars} 星` },
      { id: 'request_more', label: '退回补充' },
      { id: 'reject', label: '不通过' },
    ],
  };
}

export function isWatchLinkedTask(task: Pick<Task, 'type' | 'description'>): boolean {
  return task.type.startsWith('watch_') || /小天才|手表|WatchActivitySnapshot|WatchProofSnapshot/.test(task.description || '');
}

export function getWatchVerificationOption(mode: WatchVerificationMode): WatchVerificationOption {
  return WATCH_VERIFICATION_OPTIONS.find(option => option.id === mode) || WATCH_VERIFICATION_OPTIONS[0];
}

export function inferWatchVerificationMode(task: Pick<Task, 'type' | 'description'>): WatchVerificationMode {
  const markerMatch = task.description?.match(/小天才手表验证:([a-z_]+)/);
  if (markerMatch) {
    const markedMode = markerMatch[1] as WatchVerificationMode;
    if (WATCH_VERIFICATION_OPTIONS.some(option => option.id === markedMode)) return markedMode;
  }

  const option = WATCH_VERIFICATION_OPTIONS.find(item => item.taskType === task.type);
  return option?.id || 'none';
}

export function buildWatchVerificationTaskPatch(input: {
  mode: WatchVerificationMode;
  description?: string;
  fallbackType?: Task['type'];
  targetCount?: number;
}): Pick<Task, 'type' | 'description' | 'targetCount' | 'currentCount'> {
  const option = getWatchVerificationOption(input.mode);
  const cleanDescription = removeWatchVerificationMarker(input.description || '').trim();

  if (input.mode === 'none') {
    return {
      type: input.fallbackType?.startsWith('watch_') ? '生活' : input.fallbackType || '生活',
      description: cleanDescription,
      targetCount: input.targetCount,
      currentCount: 0,
    };
  }

  const marker = `${WATCH_VERIFICATION_MARKER}${input.mode}（${option.label}）`;
  const targetCount = input.targetCount || option.defaultTargetCount || 1;
  return {
    type: option.taskType,
    description: [cleanDescription, marker].filter(Boolean).join('\n'),
    targetCount,
    currentCount: 0,
  };
}

export function buildWatchActivitySnapshotFromTask(task: Pick<Task, 'id' | 'type' | 'targetCount' | 'currentCount'>): WatchActivitySnapshot | null {
  if (!task.type.startsWith('watch_')) return null;

  const targetValue = Math.max(task.targetCount || 1, 1);
  const currentValue = Math.max(task.currentCount || 0, 0);

  if (/step|walk|steps/.test(task.type)) {
    return {
      taskId: task.id,
      metricType: 'steps',
      targetValue,
      currentValue,
      confidence: currentValue >= targetValue ? 'high' : 'medium',
      source: 'xtc_steps',
    };
  }

  if (/active|minute|duration/.test(task.type)) {
    return {
      taskId: task.id,
      metricType: 'active_minutes',
      targetValue,
      currentValue,
      confidence: 'medium',
      source: 'android_sensor',
    };
  }

  if (/motion|jump|count/.test(task.type)) {
    return {
      taskId: task.id,
      metricType: 'jump_rope_estimate',
      targetValue,
      currentValue,
      confidence: 'medium',
      source: 'android_sensor',
    };
  }

  return null;
}

export function buildWatchNativeBridgePlan(task: Pick<Task, 'id' | 'type' | 'description' | 'targetCount'>): WatchNativeBridgePlan {
  const mode = inferWatchVerificationMode(task);
  const option = getWatchVerificationOption(mode);
  const targetValue = option.defaultTargetCount || task.targetCount ? Math.max(task.targetCount || option.defaultTargetCount || 1, 1) : undefined;

  if (mode === 'steps') {
    return {
      taskId: task.id,
      mode,
      subscription: 'pedometer',
      requiredPermissions: ['motion'],
      targetValue,
      uploadPolicy: '只上传步数汇总和达标状态，不上传原始传感器流',
      fallbackAction: '手动提交给家长确认',
    };
  }

  if (mode === 'active_minutes' || mode === 'motion_count') {
    return {
      taskId: task.id,
      mode,
      subscription: 'motion_session',
      requiredPermissions: ['motion'],
      targetValue,
      uploadPolicy: '只上传运动时长或动作估算汇总，并标注置信度',
      fallbackAction: '显示计时器和手动提交',
    };
  }

  if (mode === 'photo_proof') {
    return {
      taskId: task.id,
      mode,
      subscription: 'camera_capture',
      requiredPermissions: ['camera'],
      uploadPolicy: '照片仅给监护人审核，不公开展示',
      fallbackAction: '文字说明或线下确认',
    };
  }

  if (mode === 'place_hint') {
    return {
      taskId: task.id,
      mode,
      subscription: 'place_arrival',
      requiredPermissions: ['location'],
      uploadPolicy: '只上传地点标签命中结果，不上传完整轨迹',
      fallbackAction: '保留任务提醒并允许手动提交',
    };
  }

  return {
    taskId: task.id,
    mode: 'none',
    subscription: 'none',
    requiredPermissions: [],
    uploadPolicy: '不请求传感器、相机或定位权限',
    fallbackAction: '孩子手动提交，家长确认',
  };
}

export function buildWatchNativeAdapterContract(plan: WatchNativeBridgePlan): WatchNativeAdapterContract {
  const requiredCapabilities = capabilitiesForSubscription(plan.subscription);
  return {
    plan,
    requiredCapabilities,
    eventPayload: eventPayloadForSubscription(plan.subscription),
    submitTrigger: submitTriggerForSubscription(plan.subscription),
    privacyBoundary: plan.uploadPolicy,
  };
}

export function evaluateWatchNativeAdapterReadiness(
  plan: WatchNativeBridgePlan,
  device: WatchNativeDeviceSnapshot,
): WatchNativeAdapterReadiness {
  if (plan.subscription === 'none') {
    return {
      status: 'manual_fallback',
      missingCapabilities: [],
      missingPermissions: [],
      nextAction: plan.fallbackAction,
    };
  }

  const requiredCapabilities = capabilitiesForSubscription(plan.subscription);
  const missingCapabilities = requiredCapabilities.filter(capability => device.capabilities[capability] !== true);
  const missingPermissions = plan.requiredPermissions.filter(permission => !device.grantedPermissions.includes(permission));

  if (missingCapabilities.length > 0) {
    return {
      status: 'unsupported',
      missingCapabilities,
      missingPermissions,
      nextAction: plan.fallbackAction,
    };
  }

  if (missingPermissions.length > 0) {
    return {
      status: 'needs_permission',
      missingCapabilities,
      missingPermissions,
      nextAction: `向监护人说明用途后申请 ${missingPermissions.join(' / ')} 权限`,
    };
  }

  return {
    status: 'ready',
    missingCapabilities: [],
    missingPermissions: [],
    nextAction: submitTriggerForSubscription(plan.subscription),
  };
}

export function buildWatchReleaseChecklist(): WatchReleaseChecklistItem[] {
  return [
    { id: 'screenshots', label: '8 个手表关键屏截图', status: 'ready', owner: 'design' },
    { id: 'parent-review', label: '家长审核闭环截图', status: 'ready', owner: 'product' },
    { id: 'permission-copy', label: '相机、定位、运动传感器权限用途说明', status: 'needs_policy', owner: 'product' },
    { id: 'privacy-policy', label: '儿童隐私政策补充照片、地点、运动汇总数据说明', status: 'needs_policy', owner: 'ops' },
    { id: 'steps-device-spike', label: '真机计步事件到活动快照验证', status: 'needs_device', owner: 'engineering' },
    { id: 'motion-device-spike', label: '真机动作估算置信度验证', status: 'needs_device', owner: 'engineering' },
    { id: 'camera-device-spike', label: '真机拍照权限、预览、上传链路验证', status: 'needs_device', owner: 'engineering' },
    { id: 'location-review', label: '地点提醒是否允许上线的人工确认', status: 'manual_review', owner: 'ops' },
  ];
}

function capabilitiesForSubscription(subscription: WatchNativeSubscriptionKind): WatchCapability[] {
  if (subscription === 'pedometer') return ['steps', 'notification'];
  if (subscription === 'motion_session') return ['motion', 'notification'];
  if (subscription === 'camera_capture') return ['camera', 'notification'];
  if (subscription === 'place_arrival') return ['location', 'notification'];
  return [];
}

function eventPayloadForSubscription(subscription: WatchNativeSubscriptionKind): string {
  if (subscription === 'pedometer') return 'WatchSensorEvent.steps';
  if (subscription === 'motion_session') return 'WatchSensorEvent.active_minutes 或 WatchSensorEvent.motion_count';
  if (subscription === 'camera_capture') return 'WatchProofSnapshot.photo';
  if (subscription === 'place_arrival') return 'WatchProofSnapshot.place';
  return 'manual child submission';
}

function submitTriggerForSubscription(subscription: WatchNativeSubscriptionKind): string {
  if (subscription === 'pedometer') return '步数达到目标后生成家长审核摘要';
  if (subscription === 'motion_session') return '运动会话结束后生成带置信度的审核摘要';
  if (subscription === 'camera_capture') return '孩子拍照确认后提交给监护人审核';
  if (subscription === 'place_arrival') return '地点标签命中后提醒孩子提交';
  return '孩子手动提交，家长确认';
}

function buildWishSummary(member: Member, reward: Reward): WatchWishSummary {
  const targetStars = Math.max(reward.cost, 1);
  const currentStars = Math.max(member.stars, 0);
  const remainingStars = Math.max(targetStars - currentStars, 0);
  return {
    title: reward.name,
    currentStars,
    targetStars,
    remainingStars,
    percent: clampPercent(Math.floor((currentStars / targetStars) * 100)),
  };
}

function getWatchStatusLabel(status: Task['status']): string {
  if (status === 'reviewing') return '待审核';
  if (status === 'completed') return '已完成';
  if (status === 'expired') return '已过期';
  return '待完成';
}

function metricPrefix(metricType: WatchMetricType): string {
  return metricType === 'jump_rope_estimate' ? '估计 ' : '';
}

function metricUnit(metricType: WatchMetricType): string {
  if (metricType === 'steps') return '步';
  if (metricType === 'active_minutes') return '分钟';
  if (metricType === 'jump_rope_estimate') return '个';
  return '项';
}

function confidenceText(confidence: WatchConfidence): string {
  if (confidence === 'high') return '置信度高';
  if (confidence === 'medium') return '置信度中';
  return '置信度低';
}

function buildReviewPrivacyNote(photoProof?: WatchProofSnapshot | null, placeProof?: WatchProofSnapshot | null): string {
  const notes = [photoProof?.privacyNote, placeProof?.privacyNote].filter(Boolean);
  return notes.length > 0 ? notes.join('；') : '未使用相机或定位等敏感权限';
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function shorten(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function removeWatchVerificationMarker(description: string): string {
  return description
    .split('\n')
    .filter(line => !line.trim().startsWith(WATCH_VERIFICATION_MARKER))
    .join('\n');
}
