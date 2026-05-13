import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { showToastGlobal } from '../components/Toast';
import type { PublicCalendarSignal } from '../domain/publicCalendarIntelligence';
import {
  createSchoolCalendarSignal,
  getStoredPublicCalendarRegion,
  getStoredPublicCalendarSignals,
  getStoredPublicCalendarSourceStatuses,
  loadPublicCalendarSignalBundle,
  type LocalPublicCalendarSignalKind,
  removeStoredPublicCalendarSignal,
  setStoredPublicCalendarRegion,
  upsertStoredPublicCalendarSignal,
  type PublicCalendarSourceStatus,
} from '../lib/publicCalendarSources';
import { cn } from '../lib/utils';

const KIND_OPTIONS: Array<{ key: LocalPublicCalendarSignalKind; label: string; hint: string }> = [
  { key: 'term_start', label: '开学/返校', hint: '接送、作息、睡眠提前回归' },
  { key: 'school_break', label: '放假/寒暑假', hint: '切换假期作息和亲子安排' },
  { key: 'exam', label: '考试/考级', hint: '提前减负，保留复习时间' },
  { key: 'school_event', label: '学校活动', hint: '运动会、家长会、研学' },
  { key: 'emergency', label: '极端天气/停课', hint: '优先安全，暂停非必要外出' },
  { key: 'public_event', label: '重大活动/交通', hint: '提前核对通勤、场馆和课程' },
];

export function SchoolCalendar() {
  const [signals, setSignals] = useState<PublicCalendarSignal[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<LocalPublicCalendarSignalKind>('term_start');
  const [startDate, setStartDate] = useState(todayInputValue());
  const [endDate, setEndDate] = useState(todayInputValue());
  const [region, setRegion] = useState('');
  const [sourceStatuses, setSourceStatuses] = useState<PublicCalendarSourceStatus[]>([]);
  const [freshnessLabel, setFreshnessLabel] = useState('正在检查公共时间数据');

  useEffect(() => {
    Promise.all([
      getStoredPublicCalendarSignals(),
      getStoredPublicCalendarSourceStatuses(),
      getStoredPublicCalendarRegion(),
    ])
      .then(([storedSignals, statuses, storedRegion]) => {
        setSignals(storedSignals);
        setSourceStatuses(statuses);
        if (storedRegion) setRegion(storedRegion);
      })
      .catch(() => {
        setSignals([]);
        setSourceStatuses([]);
      });

    loadPublicCalendarSignalBundle({ year: new Date().getFullYear(), includeRemote: false })
      .then(bundle => {
        setSourceStatuses(bundle.statuses);
        setFreshnessLabel(bundle.freshnessLabel);
      })
      .catch(() => setFreshnessLabel('公共时间数据暂时不可更新，已保留本地校历'));
  }, []);

  const sortedSignals = useMemo(() => [...signals].sort((a, b) =>
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  ), [signals]);

  const handleAdd = async () => {
    if (!title.trim()) {
      showToastGlobal('请先填写事项名称', 'warning');
      return;
    }
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      showToastGlobal('结束日期不能早于开始日期', 'warning');
      return;
    }

    const signal = createSchoolCalendarSignal({
      title: title.trim(),
      startDate,
      endDate,
      kind,
      region: region.trim() || undefined,
    });
    if (region.trim()) {
      await setStoredPublicCalendarRegion(region);
    }
    const next = await upsertStoredPublicCalendarSignal(signal);
    setSignals(next);
    setTitle('');
    setKind('term_start');
    setStartDate(todayInputValue());
    setEndDate(todayInputValue());
    showToastGlobal('已加入公共时间库，会参与后续日程建议', 'success');
  };

  const handleDelete = async (id: string) => {
    const next = await removeStoredPublicCalendarSignal(id);
    setSignals(next);
    showToastGlobal('已删除特殊日期', 'success');
  };

  return (
    <div className="min-h-screen bg-background pb-28 animate-in fade-in duration-500">
      <TopAppBar title="校历与公共时间" backTo="/profile" />

      <main className="px-4 py-4 space-y-4">
        <section className="rounded-3xl bg-primary-container border border-primary/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-surface/70 text-primary flex items-center justify-center shrink-0">
              <GraduationCap size={23} strokeWidth={2.6} />
            </div>
            <div className="min-w-0">
              <h1 className="text-safe text-lg font-black text-primary-text">把会影响日程的时间告诉家庭管家</h1>
              <p className="text-safe text-xs font-bold text-primary-text/70 leading-relaxed mt-1">
                开学、放假、考试、极端天气、临时停课和重大公共活动都会影响安排。录入后，系统会在复盘和下周期安排里自动提醒。
              </p>
              <p className="text-safe text-[11px] font-black text-primary-text/55 leading-relaxed mt-2">
                {freshnessLabel}
              </p>
            </div>
          </div>
        </section>

        {sourceStatuses.length > 0 && (
          <section className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-black text-on-surface">公共时间来源</h2>
              <span className="text-[10px] font-black text-on-surface-variant/40">{sourceStatuses.length} 个来源</span>
            </div>
            <div className="space-y-2">
              {sourceStatuses.map(status => (
                <div key={status.sourceId} className="rounded-2xl bg-surface-container-low px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-safe text-xs font-black text-on-surface">{status.sourceName}</p>
                    <p className="text-safe text-[10px] font-bold text-on-surface-variant/50 mt-0.5">
                      {sourceStatusText(status)} · {status.signalCount} 条
                    </p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-1 text-[10px] font-black',
                    status.status === 'ok' ? 'bg-primary-container/20 text-primary' :
                    status.status === 'needs_config' ? 'bg-warning-container text-warning' :
                    status.status === 'error' ? 'bg-danger-container text-danger' :
                    'bg-primary-container/20 text-primary'
                  )}>
                    {sourceStatusBadge(status)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm space-y-3">
          <div>
            <label className="text-[11px] font-black text-on-surface-variant/50 block mb-1.5">事项名称</label>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="例如：秋季开学、期末考试、暴雨停课、马拉松交通管制"
              className="w-full rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold outline-none border border-outline-variant/10 focus:border-primary"
            />
          </div>

          <div>
            <p className="text-[11px] font-black text-on-surface-variant/50 mb-2">类型</p>
            <div className="grid grid-cols-2 gap-2">
              {KIND_OPTIONS.map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setKind(option.key)}
                  className={cn(
                    'rounded-2xl border p-3 text-left transition-all',
                    kind === option.key ? 'border-primary bg-primary/5' : 'border-outline-variant/10 bg-surface'
                  )}
                >
                  <span className="text-xs font-black text-on-surface block">{option.label}</span>
                  <span className="text-safe text-[10px] font-bold text-on-surface-variant/50 leading-relaxed block mt-1">
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-black text-on-surface-variant/50 block mb-1.5">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={event => setStartDate(event.target.value)}
                className="w-full rounded-2xl bg-surface-container-low px-3 py-3 text-sm font-black outline-none border border-outline-variant/10 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-on-surface-variant/50 block mb-1.5">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={event => setEndDate(event.target.value)}
                className="w-full rounded-2xl bg-surface-container-low px-3 py-3 text-sm font-black outline-none border border-outline-variant/10 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-on-surface-variant/50 block mb-1.5">地区/城市，可选</label>
            <input
              value={region}
              onChange={event => setRegion(event.target.value)}
              placeholder="例如：北京、上海、杭州"
              className="w-full rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold outline-none border border-outline-variant/10 focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="w-full h-12 rounded-2xl bg-primary text-white text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Plus size={18} />
            加入公共时间库
          </button>
        </section>

        <section className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays size={18} className="text-primary shrink-0" />
              <h2 className="text-sm font-black text-on-surface">已记录的特殊日期</h2>
            </div>
            <span className="text-[10px] font-black text-on-surface-variant/40 shrink-0">{signals.length} 项</span>
          </div>

          {sortedSignals.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-low p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-on-surface-variant/45 shrink-0 mt-0.5" />
              <p className="text-safe text-xs font-bold text-on-surface-variant/60 leading-relaxed">
                暂无特殊日期。先录入开学、放假、考试或临时停课时间，系统就能在家庭复盘里提前提醒。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSignals.map(signal => (
                <div key={signal.id} className="rounded-2xl bg-surface-container-low p-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-surface text-primary flex items-center justify-center shrink-0">
                    <CalendarDays size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-safe text-sm font-black text-on-surface">{signal.title}</p>
                    <p className="text-safe text-[11px] font-bold text-on-surface-variant/55 mt-0.5">
                      {formatDate(signal.startDate)} - {formatDate(signal.endDate)} · {signal.region === 'national' ? '通用' : signal.region}
                    </p>
                    {signal.recommendationHint && (
                      <p className="text-safe text-[11px] font-bold text-on-surface-variant/45 leading-relaxed mt-1">
                        {signal.recommendationHint}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(signal.id)}
                    className="w-9 h-9 rounded-xl bg-surface text-danger flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}

function sourceStatusBadge(status: PublicCalendarSourceStatus): string {
  if (status.status === 'ok') return '实时';
  if (status.status === 'needs_config') return '待接入';
  if (status.status === 'error') return '异常';
  return '兜底';
}

function sourceStatusText(status: PublicCalendarSourceStatus): string {
  if (status.status === 'needs_config') return '实时接口尚未配置，当前不影响离线使用';
  if (status.status === 'error') return '本次更新失败，继续保留本地数据';
  if (status.verifiedUntil) return `已核验至 ${formatDate(status.verifiedUntil)}`;
  if (status.mode === 'local') return '保存在本机，离线可用';
  return status.stale ? '建议联网后更新' : '可用';
}
