# Xiaotiancai Watch MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first working web-based Xiaotiancai watch simulator for StarWish/WishCard that validates the watch UI, watch-specific task types, sensor summary data, permission fallback, and parent-review handoff before native watch packaging.

**Architecture:** Add a focused watch domain presenter layer under `src/domain`, reusable watch UI components under `src/components/watch`, and a standalone preview route at `/watch-preview`. The preview uses local demo data first, maps existing `Task`, `Member`, and `Reward` models into watch-facing screen models, and keeps all sensor values as summary/metadata rather than raw sensor streams.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Vitest, CSS imported by the preview page, existing `src/types.ts` domain types.

---

## Scope Decision

This plan intentionally builds a web simulator first. It does not produce a Xiaotiancai APK, does not request real sensor permissions, and does not change Supabase schema yet. That keeps the next step fast, reviewable, and safe inside the current product.

Native Xiaotiancai work should start after the simulator is accepted, because the platform still needs true-device confirmation for motion sensors, camera behavior, and any location API availability.

## File Structure

- Create `src/domain/watchClient.ts`
  - Owns watch-specific types, token constants, and pure presenter helpers.
  - Converts existing product data into watch screen cards.
  - Produces review summaries and permission fallback copy.

- Create `src/test/watch-client-domain.test.ts`
  - Covers watch task mapping, activity session progress, sensor confidence wording, privacy fallback, and review summaries.

- Create `src/data/watchDemo.ts`
  - Owns deterministic demo tasks, member, reward, activity sessions, and proof samples for the preview route.

- Create `src/components/watch/WatchShell.tsx`
  - Owns the 320x360 watch frame, status bar, and shared page chrome.

- Create `src/components/watch/WatchPrimitives.tsx`
  - Owns reusable UI primitives: watch pill, primary/secondary buttons, metric panel, progress bar, tab bar, permission notice.

- Create `src/pages/WatchPreview.tsx`
  - Owns the simulator page, screen selection state, local demo interactions, and renders the 8 accepted screens.

- Create `src/styles/watch-preview.css`
  - Owns watch simulator and watch-screen styling based on `docs/XIAOTIANCAI_WATCH_UI_STYLE_GUIDE.md`.

- Modify `src/App.tsx`
  - Adds a standalone route: `/watch-preview`.

- Modify `src/test/page-components.test.tsx` if the route/page import list needs to include `WatchPreview`.

- Optional docs update after implementation:
  - Modify `docs/XIAOTIANCAI_WATCH_UI_STYLE_GUIDE.md` to link `/watch-preview` as the live simulator path.

## Task 1: Watch Domain Presenter

**Files:**
- Create: `src/domain/watchClient.ts`
- Create: `src/test/watch-client-domain.test.ts`

- [ ] **Step 1: Write failing tests for watch task mapping**

Create `src/test/watch-client-domain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Member, Reward, Task } from '../types';
import {
  buildWatchActivityProgress,
  buildWatchPermissionFallback,
  buildWatchReviewSummary,
  toWatchTaskCard,
} from '../domain/watchClient';

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
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test -- src/test/watch-client-domain.test.ts
```

Expected result: fail because `src/domain/watchClient.ts` does not exist.

- [ ] **Step 3: Implement the watch presenter**

Create `src/domain/watchClient.ts`:

```ts
import type { Member, Reward, Task } from '../types';

export type WatchMetricType = 'steps' | 'active_minutes' | 'jump_rope_estimate' | 'photo_proof' | 'place_hint';
export type WatchConfidence = 'high' | 'medium' | 'low';
export type WatchSensorSource = 'xtc_steps' | 'android_sensor' | 'camera' | 'place_tag' | 'manual_fallback';
export type WatchPermission = 'camera' | 'location' | 'motion';

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

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function shorten(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
```

- [ ] **Step 4: Run the domain tests**

Run:

```bash
npm run test -- src/test/watch-client-domain.test.ts
```

Expected result: all tests pass.

- [ ] **Step 5: Commit domain layer**

Run:

```bash
git add src/domain/watchClient.ts src/test/watch-client-domain.test.ts
git commit -m "feat: add watch client domain presenter"
```

## Task 2: Demo Data for the Watch Simulator

**Files:**
- Create: `src/data/watchDemo.ts`

- [ ] **Step 1: Create deterministic watch demo data**

Create `src/data/watchDemo.ts`:

```ts
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
```

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
npm run lint
```

Expected result: pass or fail only on unrelated existing worktree issues. If it fails on `watchDemo.ts`, fix the type error before moving on.

- [ ] **Step 3: Commit demo data**

Run:

```bash
git add src/data/watchDemo.ts
git commit -m "feat: add watch simulator demo data"
```

## Task 3: Watch Shell and Primitives

**Files:**
- Create: `src/components/watch/WatchShell.tsx`
- Create: `src/components/watch/WatchPrimitives.tsx`
- Create: `src/styles/watch-preview.css`

- [ ] **Step 1: Create the watch shell**

Create `src/components/watch/WatchShell.tsx`:

```tsx
import type { ReactNode } from 'react';

type WatchShellProps = {
  time?: string;
  children: ReactNode;
};

export function WatchShell({ time = '18:28', children }: WatchShellProps) {
  return (
    <div className="watch-shell" aria-label="小天才手表 320 乘 360 预览">
      <div className="watch-inner">
        <div className="watch-status" aria-label="手表状态栏">
          <span className="watch-signal" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{time}</span>
          <span className="watch-battery" aria-hidden="true" />
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create shared primitives**

Create `src/components/watch/WatchPrimitives.tsx`:

```tsx
import type { ReactNode } from 'react';

export function WatchHeader({ title, badge, tone = 'star' }: { title: string; badge?: string; tone?: 'star' | 'sport' | 'place' | 'privacy' }) {
  return (
    <div className="watch-head">
      <h3>{title}</h3>
      {badge && <span className={`watch-pill watch-pill-${tone}`}>{badge}</span>}
    </div>
  );
}

export function WatchPanel({ children }: { children: ReactNode }) {
  return <div className="watch-panel">{children}</div>;
}

export function WatchMetric({ value, unit, tone = 'star' }: { value: string | number; unit?: string; tone?: 'star' | 'sport' | 'place' | 'plain' }) {
  return (
    <div className="watch-metric">
      <strong className={`watch-metric-${tone}`}>{value}</strong>
      {unit && <span>{unit}</span>}
    </div>
  );
}

export function WatchProgress({ percent, tone = 'star' }: { percent: number; tone?: 'star' | 'sport' | 'place' }) {
  return (
    <div className={`watch-progress watch-progress-${tone}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
    </div>
  );
}

export function WatchActions({ primary, secondary, tone = 'default' }: { primary: string; secondary?: string; tone?: 'default' | 'sport' | 'place' }) {
  return (
    <div className="watch-actions">
      <button className={`watch-button watch-button-${tone}`} type="button">{primary}</button>
      {secondary && <button className="watch-button watch-button-secondary" type="button">{secondary}</button>}
    </div>
  );
}

export function WatchTabBar({ active }: { active: 'today' | 'stars' | 'wish' }) {
  return (
    <div className="watch-tabbar" aria-label="手表主导航">
      <span className={active === 'today' ? 'active' : ''}>今日</span>
      <span className={active === 'stars' ? 'active' : ''}>星星</span>
      <span className={active === 'wish' ? 'active' : ''}>愿望</span>
    </div>
  );
}

export function WatchPermissionNotice({ children }: { children: ReactNode }) {
  return (
    <div className="watch-permission">
      <i />
      <span>{children}</span>
    </div>
  );
}
```

- [ ] **Step 3: Add the CSS foundation**

Create `src/styles/watch-preview.css` with the styles copied from `ui-demos/xiaotiancai-watch-recommended-system.html`, preserving these class names:

```css
.watch-preview-page { min-height: 100vh; background: linear-gradient(180deg, #f7faf4, #eef4ef); color: #152018; padding: 28px 16px 42px; }
.watch-preview-shell { width: min(1180px, 100%); margin: 0 auto; }
.watch-preview-header { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 22px; }
.watch-preview-header h1 { margin: 0; font-size: 32px; line-height: 1.1; letter-spacing: 0; }
.watch-preview-header p { margin: 8px 0 0; color: #60705f; font-size: 15px; line-height: 1.6; }
.watch-preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(292px, 1fr)); gap: 16px; }
.watch-preview-card { padding: 14px; border-radius: 8px; background: rgba(255,255,255,.82); border: 1px solid rgba(21,32,24,.1); box-shadow: 0 18px 48px rgba(25,48,28,.1); }
.watch-preview-card-title { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 10px; font-size: 14px; font-weight: 900; }
.watch-shell { width: 280px; height: 315px; margin: 0 auto; overflow: hidden; color: #f7fff5; border-radius: 28px; background: radial-gradient(circle at 50% 0%, rgba(53,208,95,.14), transparent 36%), linear-gradient(180deg, #071008, #050805); box-shadow: inset 0 0 0 8px #161c16, inset 0 0 0 9px rgba(255,255,255,.08), 0 16px 30px rgba(0,0,0,.24); }
.watch-inner { height: 100%; padding: 15px 16px 12px; display: flex; flex-direction: column; gap: 8px; }
.watch-status { height: 16px; display: flex; justify-content: space-between; align-items: center; color: #c8d6c3; font-size: 10px; font-weight: 900; }
.watch-signal { display: flex; gap: 2px; align-items: end; }
.watch-signal i { width: 3px; border-radius: 3px; background: currentColor; }
.watch-signal i:nth-child(1) { height: 4px; opacity: .55; }
.watch-signal i:nth-child(2) { height: 7px; opacity: .75; }
.watch-signal i:nth-child(3) { height: 10px; }
.watch-battery { width: 20px; height: 9px; border: 1px solid currentColor; border-radius: 3px; position: relative; }
.watch-battery::before { content: ""; position: absolute; inset: 2px 5px 2px 2px; border-radius: 2px; background: #35d05f; }
.watch-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.watch-head h3 { margin: 0; font-size: 22px; line-height: 1.05; }
.watch-pill { min-height: 26px; padding: 0 9px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 12px; font-weight: 950; white-space: nowrap; border: 1px solid rgba(255,215,90,.28); }
.watch-pill-star { color: #ffd75a; background: rgba(255,215,90,.14); }
.watch-pill-sport { color: #28d8ff; background: rgba(40,216,255,.12); border-color: rgba(40,216,255,.28); }
.watch-pill-place { color: #ffb347; background: rgba(255,179,71,.13); border-color: rgba(255,179,71,.26); }
.watch-pill-privacy { color: #ffd7d0; background: rgba(255,127,113,.12); border-color: rgba(255,127,113,.22); }
.watch-panel { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; padding: 13px; border-radius: 19px; background: #121b11; border: 1px solid rgba(255,255,255,.1); }
.watch-metric { display: flex; align-items: baseline; gap: 5px; }
.watch-metric strong { font-size: 48px; line-height: .9; }
.watch-metric span { color: #b7c7b2; font-size: 14px; font-weight: 900; }
.watch-metric-star { color: #ffd75a; }
.watch-metric-sport { color: #28d8ff; }
.watch-metric-place { color: #ffb347; }
.watch-metric-plain { color: #f7fff5; font-size: 36px !important; }
.watch-panel-title { margin: 10px 0 5px; font-size: 23px; line-height: 1.08; font-weight: 950; }
.watch-panel-desc { margin: 0; color: #b7c7b2; font-size: 13px; line-height: 1.45; font-weight: 700; }
.watch-progress { height: 12px; margin-top: 11px; padding: 2px; border-radius: 999px; background: rgba(255,255,255,.1); }
.watch-progress span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #35d05f, #ffd75a); }
.watch-progress-sport span { background: linear-gradient(90deg, #28d8ff, #35d05f); }
.watch-progress-place span { background: linear-gradient(90deg, #ffb347, #35d05f); }
.watch-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.watch-button { height: 44px; border: 0; border-radius: 999px; color: #031d0b; background: #35d05f; font: inherit; font-size: 15px; font-weight: 950; }
.watch-button-sport { background: #28d8ff; color: #03131b; }
.watch-button-place { background: #ffb347; color: #251503; }
.watch-button-secondary { color: #f7fff5; background: #172217; border: 1px solid rgba(255,255,255,.12); }
.watch-tabbar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: auto; }
.watch-tabbar span { min-height: 31px; display: grid; place-items: center; border-radius: 999px; color: #b7c7b2; background: rgba(255,255,255,.05); font-size: 11px; font-weight: 900; }
.watch-tabbar .active { color: #06230f; background: #35d05f; }
.watch-permission { min-height: 34px; display: flex; align-items: center; gap: 8px; padding: 0 10px; color: #ffd7d0; background: rgba(255,127,113,.12); border: 1px solid rgba(255,127,113,.18); border-radius: 999px; font-size: 11px; font-weight: 900; }
.watch-permission i { width: 8px; height: 8px; border-radius: 50%; background: #ff7f71; }
@media (max-width: 760px) {
  .watch-preview-header { display: block; }
  .watch-preview-header h1 { font-size: 26px; }
}
```

- [ ] **Step 4: Run TypeScript check**

Run:

```bash
npm run lint
```

Expected result: no new TypeScript errors from the watch components. CSS is not type-checked.

- [ ] **Step 5: Commit shared UI primitives**

Run:

```bash
git add src/components/watch/WatchShell.tsx src/components/watch/WatchPrimitives.tsx src/styles/watch-preview.css
git commit -m "feat: add watch preview UI primitives"
```

## Task 4: Watch Preview Page

**Files:**
- Create: `src/pages/WatchPreview.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the preview page**

Create `src/pages/WatchPreview.tsx`:

```tsx
import '../styles/watch-preview.css';
import { WatchShell } from '../components/watch/WatchShell';
import {
  WatchActions,
  WatchHeader,
  WatchMetric,
  WatchPanel,
  WatchPermissionNotice,
  WatchProgress,
  WatchTabBar,
} from '../components/watch/WatchPrimitives';
import {
  buildWatchActivityProgress,
  buildWatchPermissionFallback,
  buildWatchReviewSummary,
  toWatchTaskCard,
} from '../domain/watchClient';
import {
  watchDemoActivity,
  watchDemoMember,
  watchDemoPhotoProof,
  watchDemoReward,
  watchDemoTasks,
} from '../data/watchDemo';

export default function WatchPreview() {
  const todayTask = toWatchTaskCard(watchDemoTasks[0], watchDemoMember, watchDemoReward);
  const stepTask = watchDemoTasks[1];
  const stepProgress = buildWatchActivityProgress(watchDemoActivity['task-steps']);
  const jumpProgress = buildWatchActivityProgress(watchDemoActivity['task-today-jump']);
  const reviewSummary = buildWatchReviewSummary({
    task: watchDemoTasks[0],
    activity: {
      ...watchDemoActivity['task-today-jump'],
      currentValue: 96,
    },
    photoProof: null,
    placeProof: null,
  });
  const fallback = buildWatchPermissionFallback(['camera', 'location', 'motion']);

  return (
    <main className="watch-preview-page">
      <div className="watch-preview-shell">
        <header className="watch-preview-header">
          <div>
            <h1>星愿卡小天才手表预览</h1>
            <p>验证今日任务、运动统计、拍照证明、地点提醒、愿望进度、家长审核和权限降级。</p>
          </div>
        </header>

        <section className="watch-preview-grid">
          <PreviewCard title="01 今日任务" note="基础入口">
            <WatchShell time="18:28">
              <WatchHeader title="今日任务" badge={todayTask.rewardLabel} />
              <WatchPanel>
                <WatchMetric value="1" unit="/ 4 项" />
                <div className="watch-panel-title">{todayTask.title}</div>
                <p className="watch-panel-desc">{todayTask.description}</p>
                <WatchProgress percent={25} />
              </WatchPanel>
              <WatchActions primary={todayTask.primaryAction} secondary={todayTask.secondaryAction} />
              <WatchTabBar active="today" />
            </WatchShell>
          </PreviewCard>

          <PreviewCard title="02 计步任务" note="运动统计">
            <WatchShell time="18:36">
              <WatchHeader title={stepTask.title} badge="记录中" tone="sport" />
              <WatchPanel>
                <WatchMetric value={watchDemoActivity['task-steps'].currentValue} unit={`/ ${watchDemoActivity['task-steps'].targetValue} 步`} tone="sport" />
                <div className="watch-panel-title">还差 720 步</div>
                <p className="watch-panel-desc">达标后自动提交给家长确认。</p>
                <WatchProgress percent={stepProgress.percent} tone="sport" />
              </WatchPanel>
              <WatchActions primary="继续" secondary="暂停" tone="sport" />
            </WatchShell>
          </PreviewCard>

          <PreviewCard title="03 跳绳计数" note="动作估算">
            <WatchShell time="18:38">
              <WatchHeader title="跳绳计数" badge={jumpProgress.confidenceLabel.replace('置信度', '')} tone="sport" />
              <WatchPanel>
                <WatchMetric value={watchDemoActivity['task-today-jump'].currentValue} unit="/ 100 个" tone="sport" />
                <div className="watch-panel-title">节奏很好</div>
                <p className="watch-panel-desc">记录不准时，也可以提交给家长确认。</p>
                <WatchProgress percent={jumpProgress.percent} tone="sport" />
              </WatchPanel>
              <WatchActions primary="继续跳" secondary="结束" tone="sport" />
            </WatchShell>
          </PreviewCard>

          <PreviewCard title="04 拍照证明" note="成果证据">
            <WatchShell time="19:02">
              <WatchHeader title="整理书桌" badge="需照片" tone="sport" />
              <WatchPanel>
                <div className="watch-panel-title">拍成果</div>
                <p className="watch-panel-desc">{watchDemoPhotoProof.privacyNote}。只拍桌面，不用拍到人。</p>
              </WatchPanel>
              <WatchActions primary="拍一下" tone="sport" />
            </WatchShell>
          </PreviewCard>

          <PreviewCard title="05 地点提醒" note="户外任务">
            <WatchShell time="16:20">
              <WatchPermissionNotice>不记录路线，只做提醒</WatchPermissionNotice>
              <WatchPanel>
                <WatchMetric value="22" unit="分钟" tone="place" />
                <div className="watch-panel-title">到公园后开始</div>
                <p className="watch-panel-desc">地点只作为任务提醒，不保存孩子完整轨迹。</p>
                <WatchProgress percent={72} tone="place" />
              </WatchPanel>
              <WatchActions primary="我到了" secondary="稍后" tone="place" />
            </WatchShell>
          </PreviewCard>

          <PreviewCard title="06 愿望进度" note="奖励目标">
            <WatchShell time="18:32">
              <WatchHeader title="我的愿望" badge={`还差 ${todayTask.wish?.remainingStars ?? 0}`} />
              <WatchPanel>
                <WatchMetric value={todayTask.wish?.currentStars ?? 0} unit={`/ ${todayTask.wish?.targetStars ?? 0} 星`} />
                <div className="watch-panel-title">{todayTask.wish?.title}</div>
                <p className="watch-panel-desc">爸爸妈妈会一起兑现。</p>
                <WatchProgress percent={todayTask.wish?.percent ?? 0} />
              </WatchPanel>
              <WatchActions primary="继续加油" />
              <WatchTabBar active="wish" />
            </WatchShell>
          </PreviewCard>

          <PreviewCard title="07 家长审核" note="可信摘要">
            <WatchShell time="20:10">
              <WatchHeader title="待家长确认" badge="+3 星" />
              <WatchPanel>
                {reviewSummary.rows.map(row => (
                  <div className="watch-review-row" key={row.label}>
                    <b>{row.label}</b>
                    <span>{row.value}</span>
                  </div>
                ))}
              </WatchPanel>
              <WatchActions primary="等家长确认" secondary="详情" />
            </WatchShell>
          </PreviewCard>

          <PreviewCard title="08 权限降级" note="合规兜底">
            <WatchShell time="20:12">
              <WatchHeader title="也可以手动" badge="保护隐私" tone="privacy" />
              <WatchPanel>
                <WatchMetric value={fallback.title} tone="plain" />
                <div className="watch-panel-title">照常完成</div>
                <p className="watch-panel-desc">{fallback.description}</p>
              </WatchPanel>
              <WatchActions primary={fallback.actionLabel} />
            </WatchShell>
          </PreviewCard>
        </section>
      </div>
    </main>
  );
}

function PreviewCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <article className="watch-preview-card">
      <div className="watch-preview-card-title">
        <span>{title}</span>
        <span>{note}</span>
      </div>
      {children}
    </article>
  );
}
```

- [ ] **Step 2: Add missing review row CSS**

Append to `src/styles/watch-preview.css`:

```css
.watch-review-row { padding: 9px; border-radius: 13px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.08); }
.watch-review-row + .watch-review-row { margin-top: 7px; }
.watch-review-row b { display: block; font-size: 13px; }
.watch-review-row span { display: block; margin-top: 3px; color: #b7c7b2; font-size: 11px; line-height: 1.35; }
```

- [ ] **Step 3: Wire the route**

Modify `src/App.tsx`:

```tsx
import WatchPreview from './pages/WatchPreview';
```

Then add this route before the `<Route element={<Layout />}>` block:

```tsx
<Route path="/watch-preview" element={<WatchPreview />} />
```

- [ ] **Step 4: Run TypeScript check**

Run:

```bash
npm run lint
```

Expected result: no new TypeScript errors from `WatchPreview`.

- [ ] **Step 5: Commit preview route**

Run:

```bash
git add src/pages/WatchPreview.tsx src/App.tsx src/styles/watch-preview.css
git commit -m "feat: add xiaotiancai watch preview route"
```

## Task 5: Visual Verification

**Files:**
- No source changes expected unless screenshot QA finds layout issues.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected result: Vite prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 2: Open the route**

Open:

```text
http://localhost:5173/watch-preview
```

Expected result: the page shows 8 watch cards matching `ui-demos/xiaotiancai-watch-recommended-system.png`.

- [ ] **Step 3: Capture a desktop screenshot**

Run:

```bash
npx playwright screenshot --full-page --viewport-size=1600,1800 http://127.0.0.1:5173/watch-preview /private/tmp/watch-preview-desktop.png
```

Expected result: screenshot saved without clipping.

- [ ] **Step 4: Capture a mobile screenshot**

Run:

```bash
npx playwright screenshot --full-page --viewport-size=390,1200 http://127.0.0.1:5173/watch-preview /private/tmp/watch-preview-mobile.png
```

Expected result: one-column layout, no horizontal overflow, each watch frame centered.

- [ ] **Step 5: Compare against accepted visual baseline**

Open these images with `view_image`:

```text
/Users/zerone/WorkBuddy/20260420104543/ui-demos/xiaotiancai-watch-recommended-system.png
/private/tmp/watch-preview-desktop.png
/private/tmp/watch-preview-mobile.png
```

Expected checks:

- 8 screens are present.
- Watch frames remain visually 320x360-like.
- Default task uses forest green and star yellow.
- Sport screens use blue accent.
- Place screen uses orange accent and privacy copy.
- Permission fallback clearly says base completion still works.
- No button text or panel text is clipped.

- [ ] **Step 6: Fix any visible issues**

If the screenshot shows clipping or text crowding, adjust only `src/styles/watch-preview.css`. Keep the content and hierarchy unchanged.

- [ ] **Step 7: Commit visual fixes**

Run:

```bash
git add src/styles/watch-preview.css
git commit -m "fix: polish watch preview layout"
```

Skip this commit if no fixes were needed.

## Task 6: Documentation Handoff

**Files:**
- Modify: `docs/XIAOTIANCAI_WATCH_UI_STYLE_GUIDE.md`
- Modify: `docs/XIAOTIANCAI_WATCH_SENSOR_EXTENSION.md`

- [ ] **Step 1: Add simulator links to the UI style guide**

Append to `docs/XIAOTIANCAI_WATCH_UI_STYLE_GUIDE.md`:

```md
## 8. Live Simulator

After implementation, the web simulator is available at:

```text
/watch-preview
```

Use it to validate the 8 core watch screens before building a native Xiaotiancai package.
```
```

- [ ] **Step 2: Add implementation boundary to the sensor extension doc**

Append to `docs/XIAOTIANCAI_WATCH_SENSOR_EXTENSION.md`:

```md
## 9. Implementation Boundary

The first implementation step is the Web watch simulator at `/watch-preview`.

It uses deterministic summary values for steps, motion count, photo proof, and place proof. It does not request real camera, location, or motion permissions. Native Xiaotiancai permission prompts and sensor APIs should be added only after the simulator flow is accepted and a true device test target is available.
```

- [ ] **Step 3: Commit docs**

Run:

```bash
git add docs/XIAOTIANCAI_WATCH_UI_STYLE_GUIDE.md docs/XIAOTIANCAI_WATCH_SENSOR_EXTENSION.md
git commit -m "docs: document watch simulator handoff"
```

## Task 7: Final Verification Before Native Work

**Files:**
- No source changes expected.

- [ ] **Step 1: Run focused domain tests**

Run:

```bash
npm run test -- src/test/watch-client-domain.test.ts
```

Expected result: pass.

- [ ] **Step 2: Run TypeScript check**

Run:

```bash
npm run lint
```

Expected result: pass, or report unrelated pre-existing failures separately.

- [ ] **Step 3: Run the preview route**

Run:

```bash
npm run dev
```

Open `/watch-preview` and confirm the page renders.

- [ ] **Step 4: Write native follow-up notes**

Create a short native follow-up issue or doc section with these items:

```md
Native Xiaotiancai follow-up:

- Confirm exact API for step count on target devices.
- Confirm whether accelerometer/gyroscope access is available in the chosen runtime.
- Confirm camera capture flow and compression constraints.
- Confirm current status of location API support.
- Confirm app package size against 10M/30M tiers.
- Confirm memory use under 35M during preview-equivalent screens.
```

- [ ] **Step 5: Commit native follow-up notes**

Run:

```bash
git add docs/XIAOTIANCAI_WATCH_SENSOR_EXTENSION.md
git commit -m "docs: add native watch follow-up checklist"
```

## Self-Review

Spec coverage:

- UI style guide: covered by Tasks 3, 4, and 5.
- Sensor extension data model: covered by Tasks 1 and 2.
- Permission fallback: covered by Tasks 1 and 4.
- Parent review handoff: covered by Tasks 1 and 4.
- Web simulator path: covered by Task 4.
- Verification and screenshot QA: covered by Task 5.
- Native Xiaotiancai boundaries: covered by Tasks 6 and 7.

Placeholder scan:

- No `TBD`, `TODO`, `fill in details`, or unresolved implementation placeholders are intentionally included.
- Native work is explicitly excluded from this MVP and listed as a follow-up checklist.

Type consistency:

- Watch domain type names are defined in Task 1 and reused consistently in Tasks 2 and 4.
- `WatchPermission` values match `buildWatchPermissionFallback`.
- `WatchActivitySnapshot` values match demo data and review summary helpers.
