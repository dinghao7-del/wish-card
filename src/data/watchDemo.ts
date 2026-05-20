import type { Member, Reward, Task } from '../types';
import type { WatchActivitySnapshot, WatchProofSnapshot } from '../domain/watchClient';

export const watchDemoMember: Member = {
  id: 'child-watch-demo',
  name: '小宇',
  avatar: '🌱',
  stars: 128,
  role: 'child',
};

export const watchDemoReward: Reward = {
  id: 'reward-camping',
  name: '周末露营',
  description: '爸爸妈妈会一起兑现',
  cost: 150,
  icon: 'gift',
  image: '',
  category: 'experience',
};

export const watchDemoTasks: Task[] = [
  {
    id: 'task-today-jump',
    title: '跳绳 10 分钟',
    description: '完成后让爸爸妈妈确认，星星会自动到账。',
    type: 'watch_motion_count',
    startTime: '2026-05-17T18:30:00.000Z',
    assigneeIds: ['child-watch-demo'],
    creatorId: 'parent-demo',
    rewardStars: 3,
    status: 'pending',
    icon: 'activity',
    targetCount: 100,
    currentCount: 68,
  },
  {
    id: 'task-steps',
    title: '户外走一走',
    description: '达标后自动提交给家长确认。',
    type: 'watch_steps',
    startTime: '2026-05-17T18:36:00.000Z',
    assigneeIds: ['child-watch-demo'],
    creatorId: 'parent-demo',
    rewardStars: 4,
    status: 'in_progress',
    icon: 'footprints',
  },
  {
    id: 'task-desk-photo',
    title: '整理书桌',
    description: '只拍桌面，不用拍到人。照片只给家长审核。',
    type: 'watch_photo_proof',
    startTime: '2026-05-17T19:02:00.000Z',
    assigneeIds: ['child-watch-demo'],
    creatorId: 'parent-demo',
    rewardStars: 2,
    status: 'pending',
    icon: 'camera',
  },
  {
    id: 'task-active-minutes',
    title: '户外运动 20 分钟',
    description: '手表只记录运动时长，完成后交给家长确认。',
    type: 'watch_active_minutes',
    startTime: '2026-05-17T17:30:00.000Z',
    assigneeIds: ['child-watch-demo'],
    creatorId: 'parent-demo',
    rewardStars: 4,
    status: 'in_progress',
    icon: 'timer',
    targetCount: 20,
    currentCount: 12,
  },
  {
    id: 'task-park',
    title: '到公园后开始',
    description: '地点只作为任务提醒，不保存孩子完整轨迹。',
    type: 'watch_place_hint',
    startTime: '2026-05-17T16:20:00.000Z',
    assigneeIds: ['child-watch-demo'],
    creatorId: 'parent-demo',
    rewardStars: 4,
    status: 'pending',
    icon: 'map-pin',
  },
];

export const watchDemoActivity: Record<string, WatchActivitySnapshot> = {
  'task-steps': {
    taskId: 'task-steps',
    metricType: 'steps',
    targetValue: 2000,
    currentValue: 1280,
    confidence: 'high',
    source: 'xtc_steps',
  },
  'task-today-jump': {
    taskId: 'task-today-jump',
    metricType: 'jump_rope_estimate',
    targetValue: 100,
    currentValue: 68,
    confidence: 'medium',
    source: 'android_sensor',
  },
  'task-active-minutes': {
    taskId: 'task-active-minutes',
    metricType: 'active_minutes',
    targetValue: 20,
    currentValue: 12,
    confidence: 'medium',
    source: 'android_sensor',
  },
};

export const watchDemoPhotoProof: WatchProofSnapshot = {
  kind: 'photo',
  label: '已拍成果照片',
  privacyNote: '只给监护人审核',
};

export const watchDemoPlaceProof: WatchProofSnapshot = {
  kind: 'place',
  label: '地点标签：公园',
  privacyNote: '不保存完整路线',
};
