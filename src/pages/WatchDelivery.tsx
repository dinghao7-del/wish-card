import '../styles/watch-delivery.css';
import {
  buildWatchNativeAdapterContract,
  buildWatchNativeBridgePlan,
  buildWatchReleaseChecklist,
  evaluateWatchNativeAdapterReadiness,
  WATCH_VERIFICATION_OPTIONS,
  type WatchNativeAdapterStatus,
  type WatchNativeDeviceSnapshot,
  type WatchReleaseChecklistItem,
} from '../domain/watchClient';
import { watchDemoTasks } from '../data/watchDemo';

const statusLabels: Record<WatchReleaseChecklistItem['status'], string> = {
  ready: '已完成',
  needs_device: '待真机',
  needs_policy: '待政策',
  manual_review: '待确认',
};

const readinessLabels: Record<WatchNativeAdapterStatus, string> = {
  ready: '可测试',
  needs_permission: '待授权',
  unsupported: '不支持',
  manual_fallback: '手动兜底',
};

const deviceSnapshot: WatchNativeDeviceSnapshot = {
  deviceId: 'xtc-review-device',
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

const qaRows = [
  ['计步达标', 'watch_steps', '步数事件到家长审核摘要', '真机截图 + 事件日志'],
  ['计步拒权', 'watch_steps', '拒绝权限后手动提交', '拒权截图 + 兜底截图'],
  ['运动时长', 'watch_active_minutes', '分钟数和置信度', '运动结束页 + 审核摘要'],
  ['动作估算', 'watch_motion_count', '估算数量和置信度', '动作页 + 家长确认'],
  ['拍照证明', 'watch_photo_proof', '照片证明进入监护人审核', '权限弹窗 + 照片标签'],
  ['地点提醒', 'watch_place_hint', '地点标签命中，不展示轨迹', '平台确认后执行'],
] as const;

const submissionRows = [
  ['产品 UI', '已具备', '手表端 8 个关键屏与多风格 UI 稿'],
  ['家长审核闭环', '已具备', '活动快照、证明快照、通过/退回/拒绝动作'],
  ['SDK 适配契约', '已具备', '能力检测、权限判断、事件 payload、提交触发点'],
  ['权限文案', '已具备初稿', '运动、相机、定位均有用途和拒权说明'],
  ['隐私政策补充', '待确认', '需运营/法务确认数据类型、用途和删除方式'],
  ['真机截图', '待真机', '需真实手表、真实权限弹窗和链路日志'],
] as const;

export default function WatchDelivery() {
  const checklist = buildWatchReleaseChecklist();
  const readyCount = checklist.filter(item => item.status === 'ready').length;
  const needsDeviceCount = checklist.filter(item => item.status === 'needs_device').length;
  const needsPolicyCount = checklist.filter(item => item.status === 'needs_policy').length;
  const contracts = WATCH_VERIFICATION_OPTIONS
    .filter(option => option.id !== 'none')
    .map(option => {
      const task = watchDemoTasks.find(item => item.type === option.taskType) || {
        id: `delivery-${option.id}`,
        type: option.taskType,
        description: `小天才手表验证:${option.id}（${option.label}）`,
        targetCount: option.defaultTargetCount,
      };
      const plan = buildWatchNativeBridgePlan(task);
      return {
        option,
        contract: buildWatchNativeAdapterContract(plan),
        readiness: evaluateWatchNativeAdapterReadiness(plan, deviceSnapshot),
      };
    });

  return (
    <main className="watch-delivery-page">
      <div className="watch-delivery-shell">
        <header className="watch-delivery-hero">
          <div>
            <h1>小天才手表交付评审</h1>
            <p>把 UI、SDK 契约、真机测试、提审材料和剩余阻断项放在同一个页面里，方便产品、设计、工程和运营一起过会。</p>
          </div>
          <div className="watch-delivery-status-card">
            <strong>{readyCount}/{checklist.length}</strong>
            <span>当前已完成项</span>
            <p>{needsDeviceCount} 项待真机，{needsPolicyCount} 项待政策确认</p>
          </div>
        </header>

        <section className="watch-delivery-overview">
          <MetricCard label="UI 与业务闭环" value="已完成" tone="green" />
          <MetricCard label="SDK 适配契约" value="已完成" tone="blue" />
          <MetricCard label="真机验证" value="待执行" tone="amber" />
          <MetricCard label="平台提审" value="待材料" tone="red" />
        </section>

        <section className="watch-delivery-band">
          <div className="watch-delivery-section-title">
            <h2>一页看完交付范围</h2>
            <p>当前能提交给团队评审，但不能对外表述为已上线小天才。</p>
          </div>
          <div className="watch-delivery-flow">
            <FlowStep index="1" title="已完成本地交付" body="手表 UI、家长审核、任务创建验证方式、发布截图与交付包。" />
            <FlowStep index="2" title="进入真机测试" body="按任务单验证计步、运动、拍照、地点与拒权兜底。" />
            <FlowStep index="3" title="准备平台提审" body="补齐 appId、SDK 版本、隐私政策、用户协议和真机截图。" />
          </div>
        </section>

        <section className="watch-delivery-band">
          <div className="watch-delivery-section-title">
            <h2>SDK 能力 readiness</h2>
            <p>这里展示的是测试机样例状态，真实结果以小天才 SDK 与真机回调为准。</p>
          </div>
          <div className="watch-delivery-contracts">
            {contracts.map(({ option, contract, readiness }) => (
              <article className={`watch-delivery-contract watch-delivery-contract-${readiness.status}`} key={option.id}>
                <div>
                  <h3>{option.label}</h3>
                  <p>{contract.eventPayload}</p>
                </div>
                <span>{readinessLabels[readiness.status]}</span>
                <dl>
                  <div>
                    <dt>能力</dt>
                    <dd>{contract.requiredCapabilities.join(' / ')}</dd>
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

        <section className="watch-delivery-grid">
          <article className="watch-delivery-panel">
            <h2>真机测试任务单</h2>
            <div className="watch-delivery-table">
              {qaRows.map(([name, type, target, evidence]) => (
                <div className="watch-delivery-row" key={name}>
                  <strong>{name}</strong>
                  <span>{type}</span>
                  <p>{target}</p>
                  <em>{evidence}</em>
                </div>
              ))}
            </div>
          </article>

          <article className="watch-delivery-panel">
            <h2>提审材料状态</h2>
            <div className="watch-delivery-table">
              {submissionRows.map(([name, status, note]) => (
                <div className="watch-delivery-row watch-delivery-row-compact" key={name}>
                  <strong>{name}</strong>
                  <span>{status}</span>
                  <p>{note}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="watch-delivery-band">
          <div className="watch-delivery-section-title">
            <h2>上线前阻断项</h2>
            <p>这些项目没有完成前，不建议进入正式发布口径。</p>
          </div>
          <div className="watch-delivery-blockers">
            <Blocker title="小天才 SDK 与能力范围" body="需要 SDK 包、接口说明、机型范围、权限回调和测试/正式环境信息。" />
            <Blocker title="真实账号与 appId" body="appId 由平台分配，appSecret 只能放服务端，不能进入前端仓库。" />
            <Blocker title="儿童隐私政策补充" body="需确认数据类型、收集目的、监护人可见范围、删除方式和拒权影响。" />
            <Blocker title="真机截图与日志" body="每类能力至少保留一条从 SDK 事件到家长审核摘要的证据。" />
          </div>
        </section>

        <section className="watch-delivery-handoff">
          <div>
            <h2>可以开始评审的交付物</h2>
            <p>交付包包含设计文档、SDK 交接清单、真机测试任务单、发布说明、截图和 manifest。</p>
          </div>
          <div className="watch-delivery-links">
            <a href="/watch-preview">手表 UI 预览</a>
            <a href="/watch-release">发布准备页</a>
            <a href="/tasks/new">创建任务验证方式</a>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'green' | 'blue' | 'amber' | 'red' }) {
  return (
    <article className={`watch-delivery-metric watch-delivery-metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function FlowStep({ index, title, body }: { index: string; title: string; body: string }) {
  return (
    <article className="watch-delivery-flow-step">
      <span>{index}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function Blocker({ title, body }: { title: string; body: string }) {
  return (
    <article className="watch-delivery-blocker">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}
