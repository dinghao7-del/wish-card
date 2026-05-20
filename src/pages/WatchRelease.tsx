import '../styles/watch-release.css';
import {
  buildWatchNativeAdapterContract,
  buildWatchNativeBridgePlan,
  buildWatchReleaseChecklist,
  evaluateWatchNativeAdapterReadiness,
  WATCH_VERIFICATION_OPTIONS,
  type WatchNativeDeviceSnapshot,
  type WatchReleaseChecklistItem,
} from '../domain/watchClient';
import {
  simulateWatchActiveMinutesSpike,
  simulateWatchMotionCountSpike,
  simulateWatchPhotoProofSpike,
  simulateWatchPlaceHintSpike,
  simulateWatchStepSpike,
  type WatchProofSpikeResult,
} from '../domain/watchNativeBridge';
import { watchDemoMember, watchDemoTasks } from '../data/watchDemo';

const statusLabels: Record<WatchReleaseChecklistItem['status'], string> = {
  ready: '已准备',
  needs_device: '待真机',
  needs_policy: '待政策',
  manual_review: '待人工确认',
};

const ownerLabels: Record<WatchReleaseChecklistItem['owner'], string> = {
  product: '产品',
  design: '设计',
  engineering: '工程',
  ops: '运营',
};

const readinessLabels = {
  ready: '可接真机',
  needs_permission: '待授权',
  unsupported: '不支持',
  manual_fallback: '手动兜底',
};

export default function WatchRelease() {
  const checklist = buildWatchReleaseChecklist();
  const plans = WATCH_VERIFICATION_OPTIONS
    .filter(option => option.id !== 'none')
    .map(option => {
      const task = watchDemoTasks.find(item => item.type === option.taskType) || {
        id: `release-${option.id}`,
        type: option.taskType,
        description: `小天才手表验证:${option.id}（${option.label}）`,
        targetCount: option.defaultTargetCount,
      };
      return {
        option,
        plan: buildWatchNativeBridgePlan(task),
      };
    });
  const deviceSnapshot: WatchNativeDeviceSnapshot = {
    deviceId: 'xtc-demo-device',
    modelName: '小天才测试机',
    appVersion: '1.0.0',
    capabilities: {
      steps: true,
      motion: true,
      camera: true,
      location: false,
      notification: true,
    },
    grantedPermissions: ['motion', 'camera'],
  };
  const adapterContracts = plans.map(({ option, plan }) => ({
    option,
    contract: buildWatchNativeAdapterContract(plan),
    readiness: evaluateWatchNativeAdapterReadiness(plan, deviceSnapshot),
  }));

  const readyCount = checklist.filter(item => item.status === 'ready').length;
  const blockedCount = checklist.length - readyCount;
  const stepTask = watchDemoTasks.find(task => task.type === 'watch_steps') || watchDemoTasks[0];
  const stepSpike = simulateWatchStepSpike({
    task: {
      ...stepTask,
      type: 'watch_steps',
      targetCount: stepTask.targetCount || 2000,
    },
    child: watchDemoMember,
    steps: 2100,
  });
  const activeTask = watchDemoTasks.find(task => task.type === 'watch_active_minutes') || stepTask;
  const activeSpike = simulateWatchActiveMinutesSpike({
    task: {
      ...activeTask,
      type: 'watch_active_minutes',
      targetCount: activeTask.targetCount || 20,
    },
    child: watchDemoMember,
    value: 22,
    confidence: 'medium',
  });
  const motionTask = watchDemoTasks.find(task => task.type === 'watch_motion_count') || stepTask;
  const motionSpike = simulateWatchMotionCountSpike({
    task: {
      ...motionTask,
      type: 'watch_motion_count',
      targetCount: motionTask.targetCount || 100,
    },
    child: watchDemoMember,
    value: 96,
    confidence: 'medium',
  });
  const photoTask = watchDemoTasks.find(task => task.type === 'watch_photo_proof') || stepTask;
  const photoSpike = simulateWatchPhotoProofSpike({
    task: {
      ...photoTask,
      type: 'watch_photo_proof',
    },
    child: watchDemoMember,
    label: '整理后的桌面照片',
  });
  const placeTask = watchDemoTasks.find(task => task.type === 'watch_place_hint') || stepTask;
  const placeSpike = simulateWatchPlaceHintSpike({
    task: {
      ...placeTask,
      type: 'watch_place_hint',
    },
    child: watchDemoMember,
    label: '地点标签：公园',
  });

  return (
    <main className="watch-release-page">
      <div className="watch-release-shell">
        <header className="watch-release-hero">
          <div>
            <p className="watch-release-eyebrow">Xiaotiancai Release Pack</p>
            <h1>小天才手表发布准备</h1>
            <p>这里集中展示真机订阅计划、发布核对清单、权限边界和下一步计步 spike。当前状态是模拟器与业务闭环已准备，真机上线仍待确认。</p>
          </div>
          <div className="watch-release-score">
            <strong>{readyCount}/{checklist.length}</strong>
            <span>已准备项</span>
            <em>{blockedCount} 项仍需真机或人工确认</em>
          </div>
        </header>

        <section className="watch-release-band">
          <div className="watch-release-section-title">
            <h2>真机订阅计划</h2>
            <p>SDK 层按订阅计划接能力，只输出汇总事件，不把原始传感器流直接交给业务 UI。</p>
          </div>
          <div className="watch-release-plan-grid">
            {plans.map(({ option, plan }) => (
              <article className="watch-release-plan" key={option.id}>
                <div className="watch-release-plan-head">
                  <span>{option.shortLabel}</span>
                  <b>{plan.subscription}</b>
                </div>
                <h3>{option.label}</h3>
                <p>{option.description}</p>
                <dl>
                  <div>
                    <dt>权限</dt>
                    <dd>{plan.requiredPermissions.length ? plan.requiredPermissions.join(' / ') : '无'}</dd>
                  </div>
                  <div>
                    <dt>目标</dt>
                    <dd>{plan.targetValue ? `${plan.targetValue}` : '不需要数值'}</dd>
                  </div>
                  <div>
                    <dt>上传</dt>
                    <dd>{plan.uploadPolicy}</dd>
                  </div>
                  <div>
                    <dt>兜底</dt>
                    <dd>{plan.fallbackAction}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="watch-release-band">
          <div className="watch-release-section-title">
            <h2>SDK 适配契约</h2>
            <p>第二阶段先按契约接真机：能力检测、权限状态、事件 payload 和提交触发点全部收口到适配层。</p>
          </div>
          <div className="watch-release-adapter-grid">
            {adapterContracts.map(({ option, contract, readiness }) => (
              <article className={`watch-release-adapter watch-release-adapter-${readiness.status}`} key={option.id}>
                <div className="watch-release-adapter-head">
                  <strong>{option.label}</strong>
                  <span>{readinessLabels[readiness.status]}</span>
                </div>
                <dl>
                  <div>
                    <dt>能力</dt>
                    <dd>{contract.requiredCapabilities.join(' / ') || '无'}</dd>
                  </div>
                  <div>
                    <dt>事件</dt>
                    <dd>{contract.eventPayload}</dd>
                  </div>
                  <div>
                    <dt>触发</dt>
                    <dd>{contract.submitTrigger}</dd>
                  </div>
                  <div>
                    <dt>下一步</dt>
                    <dd>{readiness.nextAction}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="watch-release-band">
          <div className="watch-release-section-title">
            <h2>发布核对清单</h2>
            <p>把 ready、待真机、待政策、待人工确认分开，不把模拟器完成误说成已经上线。</p>
          </div>
          <div className="watch-release-checklist">
            {checklist.map(item => (
              <article className={`watch-release-check watch-release-check-${item.status}`} key={item.id}>
                <div>
                  <h3>{item.label}</h3>
                  <p>{ownerLabels[item.owner]}负责</p>
                </div>
                <span>{statusLabels[item.status]}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="watch-release-bottom">
          <article>
            <h2>计步真机 Spike</h2>
            <ol>
              <li>选择一个 `watch_steps` 任务。</li>
              <li>调用 `buildWatchNativeBridgePlan(task)` 得到 `pedometer` 订阅计划。</li>
              <li>真机输出步数事件：kind 为 steps，包含 taskId、steps、targetSteps。</li>
              <li>用 `normalizeWatchSensorEvent` 转成活动快照。</li>
              <li>家长端用审核摘要确认并发星。</li>
            </ol>
          </article>
          <article>
            <h2>权限边界</h2>
            <p>运动数据只做家庭任务辅助，不做健康诊断；照片只给监护人审核；地点只上传标签命中结果，不展示实时轨迹，不用于广告或商业推荐。</p>
          </article>
        </section>

        <section className="watch-release-band">
          <div className="watch-release-section-title">
            <h2>运动类 Spike 结果</h2>
            <p>用模拟真机事件跑通：事件 → 活动快照 → 家长审核摘要。动作估算默认更保守，不直接建议自动通过。</p>
          </div>
          <SpikeResultGroup title="计步达标" result={stepSpike} />
          <SpikeResultGroup title="运动时长" result={activeSpike} />
          <SpikeResultGroup title="动作估算" result={motionSpike} />
        </section>

        <section className="watch-release-band">
          <div className="watch-release-section-title">
            <h2>证明类 Spike 结果</h2>
            <p>拍照和地点不生成运动快照，只生成证明快照，再交给家长端确认。</p>
          </div>
          <ProofResultGroup title="拍照证明" result={photoSpike} />
          <ProofResultGroup title="地点提醒" result={placeSpike} />
        </section>
      </div>
    </main>
  );
}

function SpikeResultGroup({ title, result }: { title: string; result: ReturnType<typeof simulateWatchStepSpike> }) {
  return (
    <div className="watch-release-spike-group">
      <h3>{title}</h3>
      <div className="watch-release-spike-grid">
        <ResultBox title="SDK 事件" lines={eventLines(result.event)} />
        <ResultBox title="活动快照" lines={[
          `metricType: ${result.activity.metricType}`,
          `currentValue: ${result.activity.currentValue}`,
          `targetValue: ${result.activity.targetValue}`,
          `confidence: ${result.activity.confidence}`,
        ]} />
        <ResultBox title="家长审核" lines={[
          `taskTitle: ${result.reviewPayload.taskTitle}`,
          `childName: ${result.reviewPayload.childName}`,
          `decisionDefault: ${result.reviewPayload.decisionDefault}`,
          `activity: ${result.reviewPayload.evidence.activity?.metricLabel || '无'}`,
        ]} />
      </div>
    </div>
  );
}

function ResultBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <article className="watch-release-result">
      <h3>{title}</h3>
      {lines.map(line => (
        <p key={line}>{line}</p>
      ))}
    </article>
  );
}

function ProofResultGroup({ title, result }: { title: string; result: WatchProofSpikeResult }) {
  return (
    <div className="watch-release-spike-group">
      <h3>{title}</h3>
      <div className="watch-release-spike-grid">
        <ResultBox title="证明快照" lines={[
          `kind: ${result.proof.kind}`,
          `label: ${result.proof.label}`,
          `privacyNote: ${result.proof.privacyNote}`,
          `canSubmitToParent: ${result.canSubmitToParent}`,
        ]} />
        <ResultBox title="家长审核" lines={[
          `taskTitle: ${result.reviewPayload.taskTitle}`,
          `childName: ${result.reviewPayload.childName}`,
          `decisionDefault: ${result.reviewPayload.decisionDefault}`,
          `proof: ${result.reviewPayload.evidence.photoLabel || result.reviewPayload.evidence.placeLabel || '无'}`,
        ]} />
      </div>
    </div>
  );
}

function eventLines(event: ReturnType<typeof simulateWatchStepSpike>['event']) {
  if (event.kind === 'steps') {
    return [`kind: ${event.kind}`, `taskId: ${event.taskId}`, `steps: ${event.steps}`, `targetSteps: ${event.targetSteps}`];
  }
  if (event.kind === 'active_minutes') {
    return [`kind: ${event.kind}`, `taskId: ${event.taskId}`, `minutes: ${event.minutes}`, `targetMinutes: ${event.targetMinutes}`];
  }
  return [`kind: ${event.kind}`, `taskId: ${event.taskId}`, `count: ${event.count}`, `targetCount: ${event.targetCount}`];
}
