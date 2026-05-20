import { useState, type ReactNode } from 'react';
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
  getWatchVerificationOption,
  toWatchTaskCard,
  WATCH_VERIFICATION_OPTIONS,
  type WatchVerificationMode,
} from '../domain/watchClient';
import {
  watchDemoActivity,
  watchDemoMember,
  watchDemoPhotoProof,
  watchDemoReward,
  watchDemoTasks,
} from '../data/watchDemo';

export default function WatchPreview() {
  const [selectedMode, setSelectedMode] = useState<WatchVerificationMode>('motion_count');
  const selectedOption = getWatchVerificationOption(selectedMode);
  const todayTask = toWatchTaskCard(watchDemoTasks[0], watchDemoMember, watchDemoReward);
  const stepTask = watchDemoTasks[1];
  const stepProgress = buildWatchActivityProgress(watchDemoActivity['task-steps']);
  const jumpProgress = buildWatchActivityProgress(watchDemoActivity['task-today-jump']);
  const activeProgress = buildWatchActivityProgress(watchDemoActivity['task-active-minutes']);
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
            <p>验证今日任务、运动统计、拍照证明、地点提醒、愿望进度、家长审核和权限降级。上方切换器对应创建任务里的“手表验证方式”。</p>
          </div>
        </header>

        <section className="watch-mode-selector" aria-label="手表验证方式预览">
          <div>
            <strong>创建任务预览</strong>
            <span>{selectedOption.label} · {selectedOption.description}</span>
          </div>
          <div className="watch-mode-tabs">
            {WATCH_VERIFICATION_OPTIONS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedMode(option.id)}
                className={selectedMode === option.id ? 'active' : ''}
              >
                {option.shortLabel}
              </button>
            ))}
          </div>
        </section>

        <section className="watch-preview-grid">
          <PreviewCard title="01 配置预览" note={selectedOption.shortLabel}>
            {renderVerificationPreview(selectedMode, {
              todayTask,
              stepTask,
              stepProgress,
              jumpProgress,
              activeProgress,
              fallback,
            })}
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

function PreviewCard({ title, note, children }: { title: string; note: string; children: ReactNode }) {
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

function renderVerificationPreview(
  mode: WatchVerificationMode,
  data: {
    todayTask: ReturnType<typeof toWatchTaskCard>;
    stepTask: typeof watchDemoTasks[number];
    stepProgress: ReturnType<typeof buildWatchActivityProgress>;
    jumpProgress: ReturnType<typeof buildWatchActivityProgress>;
    activeProgress: ReturnType<typeof buildWatchActivityProgress>;
    fallback: ReturnType<typeof buildWatchPermissionFallback>;
  },
) {
  if (mode === 'steps') {
    return (
      <WatchShell time="18:36">
        <WatchHeader title={data.stepTask.title} badge="记录中" tone="sport" />
        <WatchPanel>
          <WatchMetric value={watchDemoActivity['task-steps'].currentValue} unit={`/ ${watchDemoActivity['task-steps'].targetValue} 步`} tone="sport" />
          <div className="watch-panel-title">还差 720 步</div>
          <p className="watch-panel-desc">达标后自动提交给家长确认。</p>
          <WatchProgress percent={data.stepProgress.percent} tone="sport" />
        </WatchPanel>
        <WatchActions primary="继续" secondary="暂停" tone="sport" />
      </WatchShell>
    );
  }

  if (mode === 'active_minutes') {
    return (
      <WatchShell time="17:42">
        <WatchHeader title="运动时长" badge={data.activeProgress.confidenceLabel.replace('置信度', '')} tone="sport" />
        <WatchPanel>
          <WatchMetric value={watchDemoActivity['task-active-minutes'].currentValue} unit="/ 20 分钟" tone="sport" />
          <div className="watch-panel-title">还差 8 分钟</div>
          <p className="watch-panel-desc">只统计活动时长，不做健康诊断。</p>
          <WatchProgress percent={data.activeProgress.percent} tone="sport" />
        </WatchPanel>
        <WatchActions primary="继续运动" secondary="结束" tone="sport" />
      </WatchShell>
    );
  }

  if (mode === 'motion_count') {
    return (
      <WatchShell time="18:38">
        <WatchHeader title="跳绳计数" badge={data.jumpProgress.confidenceLabel.replace('置信度', '')} tone="sport" />
        <WatchPanel>
          <WatchMetric value={watchDemoActivity['task-today-jump'].currentValue} unit="/ 100 个" tone="sport" />
          <div className="watch-panel-title">节奏很好</div>
          <p className="watch-panel-desc">记录不准时，也可以提交给家长确认。</p>
          <WatchProgress percent={data.jumpProgress.percent} tone="sport" />
        </WatchPanel>
        <WatchActions primary="继续跳" secondary="结束" tone="sport" />
      </WatchShell>
    );
  }

  if (mode === 'photo_proof') {
    return (
      <WatchShell time="19:02">
        <WatchHeader title="整理书桌" badge="需照片" tone="sport" />
        <WatchPanel>
          <div className="watch-panel-title">拍成果</div>
          <p className="watch-panel-desc">只给监护人审核。只拍桌面，不用拍到人。</p>
        </WatchPanel>
        <WatchActions primary="拍一下" tone="sport" />
      </WatchShell>
    );
  }

  if (mode === 'place_hint') {
    return (
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
    );
  }

  return (
    <WatchShell time="18:28">
      <WatchHeader title="今日任务" badge={data.todayTask.rewardLabel} />
      <WatchPanel>
        <WatchMetric value="1" unit="/ 4 项" />
        <div className="watch-panel-title">{data.todayTask.title}</div>
        <p className="watch-panel-desc">{data.fallback.description}</p>
        <WatchProgress percent={25} />
      </WatchPanel>
      <WatchActions primary={data.todayTask.primaryAction} secondary={data.todayTask.secondaryAction} />
      <WatchTabBar active="today" />
    </WatchShell>
  );
}
