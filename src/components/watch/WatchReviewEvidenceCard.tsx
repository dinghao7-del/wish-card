import { Camera, CheckCircle2, MapPin, RotateCcw, ShieldCheck, Watch } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Member, Task } from '../../types';
import {
  buildWatchActivitySnapshotFromTask,
  buildWatchParentReviewPayload,
  isWatchLinkedTask,
  type WatchParentReviewPayload,
} from '../../domain/watchClient';

type WatchReviewEvidenceCardProps = {
  task: Task;
  members: Member[];
  onApprove?: () => void;
  onRequestMore?: () => void;
};

export function WatchReviewEvidenceCard({ task, members, onApprove, onRequestMore }: WatchReviewEvidenceCardProps) {
  if (!isWatchLinkedTask(task)) return null;

  const child = members.find(member => task.assigneeIds.includes(member.id) && member.role === 'child')
    || members.find(member => task.assigneeIds.includes(member.id))
    || members.find(member => member.role === 'child');

  if (!child) return null;

  const payload = buildWatchParentReviewPayload({
    task,
    child,
    activity: buildWatchActivitySnapshotFromTask(task),
    photoProof: inferPhotoProof(task.description),
    placeProof: inferPlaceProof(task.description),
  });

  return (
    <section className="w-full rounded-[2rem] bg-[#071107] text-white p-5 shadow-xl shadow-primary/10 border border-primary/20 mb-10">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <Watch size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">小天才手表提交</p>
          <h3 className="text-xl font-black leading-tight">{payload.taskTitle}</h3>
          <p className="text-xs font-bold text-white/60 mt-1">{payload.childName} 已提交，等待家长确认</p>
        </div>
        <span className="rounded-full bg-secondary/20 text-secondary px-3 py-1 text-[10px] font-black shrink-0">
          +{payload.rewardStars} 星
        </span>
      </div>

      <div className="space-y-2.5">
        <EvidenceRow icon={<CheckCircle2 size={16} />} label="孩子提交" value={payload.evidence.childSubmission} />
        <EvidenceRow
          icon={<Watch size={16} />}
          label="手表辅助"
          value={payload.evidence.activity
            ? `${payload.evidence.activity.metricLabel}，${payload.evidence.activity.confidenceLabel}`
            : '未使用运动传感器'}
        />
        <EvidenceRow icon={<Camera size={16} />} label="照片" value={payload.evidence.photoLabel || '未使用相机'} />
        <EvidenceRow icon={<MapPin size={16} />} label="地点" value={payload.evidence.placeLabel || '未使用定位'} />
        <EvidenceRow icon={<ShieldCheck size={16} />} label="隐私" value={payload.evidence.privacyNote} />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-5">
        <button
          type="button"
          onClick={onApprove}
          className="rounded-2xl bg-primary text-white py-3 text-sm font-black active:scale-[0.98] transition-transform"
        >
          {findActionLabel(payload, 'approve')}
        </button>
        <button
          type="button"
          onClick={onRequestMore}
          className="rounded-2xl bg-white/10 text-white py-3 text-sm font-black active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <RotateCcw size={15} />
          {findActionLabel(payload, 'request_more')}
        </button>
      </div>
    </section>
  );
}

function EvidenceRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.07] border border-white/10 px-3.5 py-3 flex items-start gap-3">
      <div className="text-primary mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-white/45 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-white/85 leading-snug mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function findActionLabel(payload: WatchParentReviewPayload, id: 'approve' | 'request_more') {
  return payload.actions.find(action => action.id === id)?.label || (id === 'approve' ? '通过' : '退回补充');
}

function inferPhotoProof(description: string) {
  if (!/照片|拍照|相机|作品|桌面/.test(description)) return null;
  return {
    kind: 'photo' as const,
    label: '孩子提交的成果照片',
    privacyNote: '照片只给监护人审核，不公开展示',
  };
}

function inferPlaceProof(description: string) {
  if (!/地点|定位|公园|球场|户外/.test(description)) return null;
  return {
    kind: 'place' as const,
    label: '地点标签命中',
    privacyNote: '地点只做任务确认，不展示实时轨迹',
  };
}
