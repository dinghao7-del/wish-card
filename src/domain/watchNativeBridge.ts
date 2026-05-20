import type { Member, Task } from '../types';
import {
  buildWatchNativeBridgePlan,
  buildWatchParentReviewPayload,
  normalizeWatchSensorEvent,
  type WatchActivitySnapshot,
  type WatchParentReviewPayload,
  type WatchProofSnapshot,
  type WatchSensorEvent,
} from './watchClient';

export type WatchStepSpikeInput = {
  task: Task;
  child: Member;
  steps: number;
};

export type WatchMotionSpikeInput = {
  task: Task;
  child: Member;
  value: number;
  confidence?: 'high' | 'medium' | 'low';
};

export type WatchProofSpikeInput = {
  task: Task;
  child: Member;
  label: string;
};

export type WatchNativeSpikeResult = {
  event: WatchSensorEvent;
  activity: WatchActivitySnapshot;
  reviewPayload: WatchParentReviewPayload;
  canSubmitToParent: boolean;
};

export type WatchProofSpikeResult = {
  proof: WatchProofSnapshot;
  reviewPayload: WatchParentReviewPayload;
  canSubmitToParent: boolean;
};

export function simulateWatchStepSpike(input: WatchStepSpikeInput): WatchNativeSpikeResult {
  const plan = buildWatchNativeBridgePlan(input.task);
  const targetSteps = plan.targetValue || input.task.targetCount || 1;
  const event: WatchSensorEvent = {
    kind: 'steps',
    taskId: input.task.id,
    steps: Math.max(0, input.steps),
    targetSteps,
  };
  const activity = normalizeWatchSensorEvent(event);
  const reviewPayload = buildWatchParentReviewPayload({
    task: {
      ...input.task,
      status: 'reviewing',
      currentCount: activity.currentValue,
      targetCount: activity.targetValue,
    },
    child: input.child,
    activity,
    photoProof: null,
    placeProof: null,
  });

  return {
    event,
    activity,
    reviewPayload,
    canSubmitToParent: plan.subscription === 'pedometer' && activity.currentValue >= activity.targetValue,
  };
}

export function simulateWatchActiveMinutesSpike(input: WatchMotionSpikeInput): WatchNativeSpikeResult {
  const plan = buildWatchNativeBridgePlan(input.task);
  const targetMinutes = plan.targetValue || input.task.targetCount || 1;
  const event: WatchSensorEvent = {
    kind: 'active_minutes',
    taskId: input.task.id,
    minutes: Math.max(0, input.value),
    targetMinutes,
    confidence: input.confidence || 'medium',
  };

  return buildMotionResult(input, event, plan.subscription === 'motion_session');
}

export function simulateWatchMotionCountSpike(input: WatchMotionSpikeInput): WatchNativeSpikeResult {
  const plan = buildWatchNativeBridgePlan(input.task);
  const targetCount = plan.targetValue || input.task.targetCount || 1;
  const event: WatchSensorEvent = {
    kind: 'motion_count',
    taskId: input.task.id,
    count: Math.max(0, input.value),
    targetCount,
    confidence: input.confidence || 'medium',
  };

  return buildMotionResult(input, event, false);
}

export function simulateWatchPhotoProofSpike(input: WatchProofSpikeInput): WatchProofSpikeResult {
  const plan = buildWatchNativeBridgePlan(input.task);
  const proof: WatchProofSnapshot = {
    kind: 'photo',
    label: input.label,
    privacyNote: '照片仅给监护人审核，不公开展示',
  };

  return buildProofResult(input, proof, plan.subscription === 'camera_capture');
}

export function simulateWatchPlaceHintSpike(input: WatchProofSpikeInput): WatchProofSpikeResult {
  const plan = buildWatchNativeBridgePlan(input.task);
  const proof: WatchProofSnapshot = {
    kind: 'place',
    label: input.label,
    privacyNote: '地点只做任务确认，不展示实时轨迹',
  };

  return buildProofResult(input, proof, plan.subscription === 'place_arrival');
}

function buildMotionResult(input: WatchMotionSpikeInput, event: WatchSensorEvent, allowAutoSubmit: boolean): WatchNativeSpikeResult {
  const activity = normalizeWatchSensorEvent(event);
  const reviewPayload = buildWatchParentReviewPayload({
    task: {
      ...input.task,
      status: 'reviewing',
      currentCount: activity.currentValue,
      targetCount: activity.targetValue,
    },
    child: input.child,
    activity,
    photoProof: null,
    placeProof: null,
  });

  return {
    event,
    activity,
    reviewPayload,
    canSubmitToParent: allowAutoSubmit && activity.currentValue >= activity.targetValue,
  };
}

function buildProofResult(input: WatchProofSpikeInput, proof: WatchProofSnapshot, canSubmitToParent: boolean): WatchProofSpikeResult {
  const reviewPayload = buildWatchParentReviewPayload({
    task: {
      ...input.task,
      status: 'reviewing',
    },
    child: input.child,
    activity: null,
    photoProof: proof.kind === 'photo' ? proof : null,
    placeProof: proof.kind === 'place' ? proof : null,
  });

  return {
    proof,
    reviewPayload,
    canSubmitToParent,
  };
}
