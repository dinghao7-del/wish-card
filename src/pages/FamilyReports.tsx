import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, Gift, HeartHandshake, Sparkles, Star, Target, TrendingDown, Trophy, WandSparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { useFamily } from '../context/FamilyContext';
import {
  buildFamilyReportSummary,
  type FamilyReportPlanInput,
  type FamilyReportPeriod,
  type FamilyReportPeriodRange,
} from '../domain/familyReports';
import { buildNextPeriodScheduleAdjustment } from '../domain/familyScheduleAdjustment';
import { getDataLayer } from '../lib/DataLayer';
import { getStoredPublicCalendarRegion, loadPublicCalendarSignalBundle } from '../lib/publicCalendarSources';
import { cn } from '../lib/utils';
import type { PublicCalendarSignal } from '../domain/publicCalendarIntelligence';
import { getGuestPlans } from '../lib/guestPlans';
import { StarEconomyPanel } from '../components/StarEconomyPanel';
import { useTranslation } from 'react-i18next';

const PERIOD_OPTIONS: Array<{ key: FamilyReportPeriod; label: string }> = [
  { key: 'week', label: '周报' },
  { key: 'month', label: '月报' },
  { key: 'term', label: '学期' },
  { key: 'year', label: '年度' },
];

const PERIOD_LABELS_EN: Record<FamilyReportPeriod, string> = {
  week: 'Weekly',
  month: 'Monthly',
  term: 'Term',
  year: 'Yearly',
};

const REPORT_TEXT_EN: Record<string, string> = {
  任务: 'Tasks',
  好习惯: 'Good habits',
  心愿兑现: 'Wishes kept',
  星星: 'Stars',
  重要: 'Important',
  普通: 'Normal',
  提醒: 'Reminder',
  节奏偏满: 'A little full',
  节奏适中: 'Balanced',
  节奏轻松: 'Light',
};

function isEnglish(language?: string) {
  return (language || '').toLowerCase().startsWith('en');
}

function reportText(text: string | undefined, language?: string): string {
  if (!text) return '';
  if (!isEnglish(language)) return text;
  if (REPORT_TEXT_EN[text]) return REPORT_TEXT_EN[text];
  return text
    .replace(/周报/g, 'Weekly Review')
    .replace(/月报/g, 'Monthly Review')
    .replace(/学期/g, 'Term')
    .replace(/年度/g, 'Year')
    .replace(/完成任务/g, 'completed tasks')
    .replace(/好习惯/g, 'good habits')
    .replace(/心愿兑现/g, 'wishes kept')
    .replace(/星星/g, 'stars')
    .replace(/扣减/g, 'deducted')
    .replace(/获得/g, 'earned')
    .replace(/任务/g, 'Tasks')
    .replace(/提醒：/g, 'Reminder: ');
}

export function FamilyReports() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { familyId, guestMode, tasks, rewards, stars } = useFamily();
  const { t, i18n } = useTranslation();
  const english = isEnglish(i18n.language);
  const initialPeriod = searchParams.get('period') as FamilyReportPeriod | null;
  const [periodType, setPeriodType] = useState<FamilyReportPeriod>(
    initialPeriod === 'month' || initialPeriod === 'term' || initialPeriod === 'year' ? initialPeriod : 'week'
  );
  const [reportPlans, setReportPlans] = useState<FamilyReportPlanInput[]>([]);
  const [publicCalendarSignals, setPublicCalendarSignals] = useState<PublicCalendarSignal[]>([]);
  const [publicCalendarRegion, setPublicCalendarRegion] = useState<string | undefined>();

  useEffect(() => {
    if (!familyId || guestMode) {
      if (guestMode) {
        setReportPlans(getGuestPlans().map(plan => ({
          id: plan.id,
          name: plan.name,
          kind: (plan.metadata?.kind as string | undefined) || plan.type,
        })));
      } else {
        setReportPlans([]);
      }
      return;
    }

    let mounted = true;
    getDataLayer().getPlans()
      .then(plans => {
        if (!mounted) return;
        setReportPlans(plans.map(plan => ({
          id: plan.id,
          name: plan.name,
          kind: (plan.metadata?.kind as string | undefined) || plan.type,
        })));
      })
      .catch(() => {
        if (mounted) setReportPlans([]);
      });

    return () => {
      mounted = false;
    };
  }, [familyId, guestMode]);

  const changePeriod = (nextPeriod: FamilyReportPeriod) => {
    setPeriodType(nextPeriod);
    setSearchParams({ period: nextPeriod });
  };

  const { currentPeriod, nextPeriod } = useMemo(() => {
    const now = new Date();
    return {
      currentPeriod: buildPeriodRange(periodType, now, 0),
      nextPeriod: buildPeriodRange(periodType, now, 1),
    };
  }, [periodType]);

  useEffect(() => {
    let mounted = true;
    getStoredPublicCalendarRegion()
      .then(region => {
        if (mounted) setPublicCalendarRegion(region);
        return loadPublicCalendarSignalBundle({
          year: new Date(nextPeriod.start).getFullYear(),
          region,
          includeRemote: typeof navigator !== 'undefined' ? navigator.onLine : false,
        });
      })
      .then(bundle => {
        if (mounted) setPublicCalendarSignals(bundle.signals);
      })
      .catch(() => {
        if (mounted) setPublicCalendarSignals([]);
      });

    return () => {
      mounted = false;
    };
  }, [nextPeriod]);

  const report = useMemo(() => buildFamilyReportSummary(
    currentPeriod,
    tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      type: task.type,
      planId: task.planId,
      status: task.status,
      rewardStars: task.rewardStars,
      isHabit: task.isHabit,
      startTime: task.startTime,
      deadline: task.deadline,
      completedAt: task.completedAt,
      createdAt: task.createdAt || task.startTime,
    })),
    reportPlans,
    { nextPeriod, previewLimit: 6 },
  ), [currentPeriod, nextPeriod, reportPlans, tasks]);
  const adjustment = useMemo(() => buildNextPeriodScheduleAdjustment(tasks, nextPeriod, {
    publicCalendarSignals,
    region: publicCalendarRegion,
  }), [tasks, nextPeriod, publicCalendarSignals, publicCalendarRegion]);

  const totalCompleted = report.completedTasks
    + report.completedGoodHabits
    + report.completedFamilyPromises;

  return (
    <div className="ui-ai-subpage min-h-screen bg-background pb-24 animate-in fade-in duration-500">
      <TopAppBar title={t('reports.title', english ? 'Family Review' : '家庭复盘')} />

      <main className="px-4 py-4 space-y-3.5 sm:space-y-4">
        <div className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-container p-1">
          {PERIOD_OPTIONS.map(option => {
            const active = periodType === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => changePeriod(option.key)}
                className={cn(
                  "h-10 rounded-xl text-sm font-black transition-all active:scale-95",
                  active ? "bg-primary text-white shadow-sm" : "text-on-surface-variant"
                )}
              >
                {english ? PERIOD_LABELS_EN[option.key] : option.label}
              </button>
            );
          })}
        </div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-4 sm:p-5 shadow-sm border border-primary/15 bg-primary/8 text-on-surface"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={22} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-black text-primary mb-1">{formatPeriod(currentPeriod, i18n.language)}</p>
              <h2 className="text-safe text-lg sm:text-xl font-black leading-tight">
                {english ? `${PERIOD_LABELS_EN[periodType]} Family Review` : report.familyWeekly.title}
              </h2>
              <p className="text-safe text-xs sm:text-sm font-bold leading-relaxed mt-2 text-on-surface-variant">
                {english ? 'A warm summary of completed tasks, steady habits, fulfilled wishes, and useful reminders for the next period.' : report.familyWeekly.opening}
              </p>
            </div>
          </div>
        </motion.section>

        <section className="rounded-3xl p-4 sm:p-5 bg-surface border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-primary" />
            <h3 className="font-black text-on-surface">{t('reports.period_results', english ? 'This Period' : '本周期成果')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label={t('reports.completed_tasks', english ? 'Tasks done' : '完成任务')} value={report.completedTasks} />
            <MiniStat label={t('reports.good_habits', english ? 'Good habits' : '好习惯')} value={report.completedGoodHabits} />
            <MiniStat label={t('reports.wishes_kept', english ? 'Wishes kept' : '心愿兑现')} value={report.completedFamilyPromises} />
            <MiniStat label={t('reports.net_stars', english ? 'Net stars' : '星星净变化')} value={report.earnedStars - report.penaltyStars} prefix={report.earnedStars - report.penaltyStars >= 0 ? '+' : ''} />
          </div>
        </section>

        <StarEconomyPanel
          earnedStars={report.earnedStars}
          penaltyStars={report.penaltyStars}
          currentBalance={stars}
          affordableRewards={(rewards || []).filter(reward => (!reward.status || reward.status === 'available') && stars >= reward.cost).length}
          period={periodType}
        />

        <section className="grid grid-cols-2 gap-3">
          <MetricCard icon={Trophy} label={t('reports.completed_tasks', english ? 'Tasks done' : '完成任务')} value={report.completedTasks} tone="green" />
          <MetricCard icon={Sparkles} label={t('reports.good_habits', english ? 'Good habits' : '好习惯')} value={report.completedGoodHabits} tone="yellow" />
          <MetricCard icon={HeartHandshake} label={t('reports.wishes_kept_short', english ? 'Wishes kept' : '兑现心愿')} value={report.completedFamilyPromises} tone="green" />
          <MetricCard icon={TrendingDown} label={t('reports.star_deductions', english ? 'Deductions' : '扣星提醒')} value={report.completedPenaltyHabits} tone="red" />
        </section>

        <section className="rounded-3xl p-4 sm:p-5 bg-surface border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-secondary" />
            <h3 className="font-black text-on-surface">{t('reports.child_highlights', english ? 'Child Highlights' : '孩子高光时刻')}</h3>
          </div>
          <div className="space-y-2">
            {report.familyWeekly.childHighlights.map((item, index) => (
              <EncouragementRow key={item} index={index + 1} text={english ? 'A visible moment of effort was recorded this period. Keep noticing and praising the process.' : item} tone="child" />
            ))}
          </div>
        </section>

        <section className="rounded-3xl p-4 sm:p-5 bg-surface border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Star size={18} className="text-reward-display fill-current" />
            <h3 className="font-black text-on-surface">{t('reports.star_changes', english ? 'Star Changes' : '星星变化')}</h3>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-bold text-on-surface-variant">{t('reports.earned', english ? 'Earned' : '获得')}</p>
              <p className="text-3xl font-black text-primary">+{report.earnedStars}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface-variant">{t('reports.deducted', english ? 'Deducted' : '扣减')}</p>
              <p className="text-3xl font-black text-red-500">-{report.penaltyStars}</p>
            </div>
          </div>
          <p className="text-safe text-xs font-bold leading-relaxed text-on-surface-variant mt-3">
            {english ? 'Effort is being seen. Keep the rhythm gentle, specific, and encouraging.' : report.encouragement.childMessage}
          </p>
        </section>

        <section className="rounded-3xl p-4 sm:p-5 bg-surface border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <HeartHandshake size={18} className="text-primary" />
            <h3 className="font-black text-on-surface">{t('reports.parent_reminders', english ? 'Parent Reminders' : '给家长的提醒')}</h3>
          </div>
          <div className="space-y-2">
            {report.familyWeekly.parentFocus.map((item, index) => (
              <EncouragementRow key={item} index={index + 1} text={english ? 'Keep expectations clear, praise effort promptly, and leave space for recovery.' : item} tone="parent" />
            ))}
          </div>
        </section>

        {report.planBreakdown.length > 0 && (
          <section className="rounded-3xl p-4 sm:p-5 bg-surface border border-outline-variant/10 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={18} className="text-primary" />
              <h3 className="font-black text-on-surface">{t('reports.plan_progress', english ? 'Progress by Plan' : '按计划看进展')}</h3>
            </div>
            <div className="space-y-2">
              {report.planBreakdown.map(plan => {
                return (
                  <div key={plan.planId} className="rounded-2xl p-3 bg-surface-container-low">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-on-surface truncate">{reportText(plan.planName, i18n.language)}</p>
                        <p className="text-[10px] font-black text-primary/70 mt-0.5">{reportText(plan.kindLabel, i18n.language)}</p>
                      </div>
                      <span className="text-[11px] font-black text-primary shrink-0">
                        {english ? `${plan.positiveActions} updates` : `${plan.positiveActions} 个进展`}
                      </span>
                    </div>
                    <p className="text-safe text-[10px] font-bold text-on-surface-variant/55 mt-1">
                      {english
                        ? `Tasks ${plan.completedTasks} · Habits ${plan.completedGoodHabits} · Wishes ${plan.completedFamilyPromises} · Stars +${plan.earnedStars}`
                        : `任务 ${plan.completedTasks} · 好习惯 ${plan.completedGoodHabits} · 心愿兑现 ${plan.completedFamilyPromises} · 星星 +${plan.earnedStars}`}
                    </p>
                    <p className="text-safe text-[11px] font-bold text-on-surface-variant/65 leading-relaxed mt-2">
                      {english ? 'This plan has new progress. Keep the next step small and visible.' : plan.reviewMessage}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-3xl p-4 sm:p-5 bg-surface border border-outline-variant/10 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <WandSparkles size={18} className="text-primary" />
            <h3 className="font-black text-on-surface">{t('reports.next_period', english ? 'Next Period' : '下个周期怎么安排')}</h3>
          </div>
          <div className="rounded-2xl p-4 bg-surface-container-low mb-3">
            <div className="flex items-center gap-2 mb-3">
              <Target size={17} className="text-primary" />
              <p className="text-sm font-black text-on-surface">{t('reports.quadrant_advice', english ? 'Quadrant Advice' : '四象限取舍建议')}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <MiniStat label={t('reports.do_first', english ? 'Do first' : '先处理')} value={report.familyWeekly.quadrantAdvice.urgentImportant} compact />
              <MiniStat label={t('reports.keep_habit', english ? 'Keep habit' : '稳习惯')} value={report.familyWeekly.quadrantAdvice.importantNotUrgent} compact />
              <MiniStat label={t('reports.defer', english ? 'Defer' : '可后移')} value={report.familyWeekly.quadrantAdvice.reduceOrDefer} compact />
            </div>
            <p className="text-safe text-xs font-bold text-on-surface-variant leading-relaxed">
              {english ? 'Handle urgent and important items first, keep the useful routines steady, and move lower-value tasks away from crowded days.' : report.familyWeekly.quadrantAdvice.message}
            </p>
          </div>
          <div className="rounded-2xl p-4 bg-primary/8 border border-primary/10 mb-3">
            <p className="text-sm font-black text-on-primary-container">
              {english ? 'Suggested rhythm for the next period' : adjustment.headline}
            </p>
            <p className="text-safe text-[11px] font-bold text-on-surface-variant mt-1">
              {adjustment.pressureLevel === 'busy'
                ? t('reports.pressure_busy', english ? 'A little full' : '节奏偏满')
                : adjustment.pressureLevel === 'balanced'
                  ? t('reports.pressure_balanced', english ? 'Balanced' : '节奏适中')
                  : t('reports.pressure_light', english ? 'Light' : '节奏轻松')}
            </p>
          </div>
          {adjustment.publicCalendar && adjustment.publicCalendar.adjustments.length > 0 && (
            <div className="rounded-2xl p-4 bg-amber-50 border border-amber-100 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={16} className="text-amber-700" />
                <p className="text-sm font-black text-amber-800">{t('reports.public_time', english ? 'Public Time Notice' : '公共时间提醒')}</p>
              </div>
              <p className="text-safe text-xs font-bold text-amber-800/80 leading-relaxed">
                {english ? 'Public holiday or school calendar signals may affect the schedule.' : adjustment.publicCalendar.headline}
              </p>
              <div className="mt-2 space-y-1.5">
                {adjustment.publicCalendar.adjustments.slice(0, 2).map(item => (
                  <p key={item.id} className="text-safe text-[11px] font-bold text-amber-900/70 leading-relaxed">
                    {english ? 'Calendar notice: please check the affected dates.' : `${item.title}：${item.message}`}
                  </p>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            {adjustment.suggestions.map(suggestion => (
              <div key={suggestion.id} className="rounded-2xl p-3 bg-surface-container-low flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0 mt-1.5",
                      suggestion.priority === 'high' ? 'bg-red-500' : suggestion.priority === 'medium' ? 'bg-secondary' : 'bg-primary'
                    )} />
                  <p className="text-safe text-sm font-black text-on-surface">{english ? 'Schedule suggestion' : suggestion.title}</p>
                  </div>
                  <p className="text-safe text-xs font-bold text-on-surface-variant leading-relaxed mt-1">
                    {english ? 'Keep this action small enough to finish, and adjust the week before it gets crowded.' : suggestion.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(suggestion.actionTarget === 'quadrant' ? '/quadrant?range=week' : suggestion.actionTarget === 'rewards' ? '/rewards' : '/tasks')}
                  className="self-start rounded-full px-3 py-1.5 text-[11px] font-black bg-primary text-white shrink-0 active:scale-95 sm:self-auto"
                >
                  {english ? 'Open' : suggestion.actionLabel}
                </button>
              </div>
            ))}
          </div>
          {adjustment.actionPlan.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white/70 p-3">
              <p className="text-sm font-black text-on-surface mb-2">{t('reports.action_plan', english ? 'Action Plan' : '可执行动作')}</p>
              <div className="space-y-2">
                {adjustment.actionPlan.slice(0, 4).map(action => (
                  <div key={action.id} className="rounded-2xl bg-surface-container-low p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-safe text-xs font-black text-on-surface">
                        {english ? 'Action' : actionTypeLabel(action.type)} · {english ? 'Adjust one schedule item' : action.title}
                      </p>
                      <p className="text-safe text-[11px] font-bold text-on-surface-variant/60 leading-relaxed mt-1">
                        {english ? 'Review the target page and make the next adjustment.' : action.message}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(action.actionTarget === 'quadrant' ? '/quadrant?range=week' : action.actionTarget === 'rewards' ? '/rewards' : '/tasks')}
                      className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black bg-primary/10 text-primary active:scale-95"
                    >
                      {english ? 'Open' : action.actionLabel}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl p-4 sm:p-5 bg-surface border border-outline-variant/10 shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays size={18} className="text-primary" />
              <h3 className="text-safe font-black text-on-surface">{t('reports.next_preview', english ? 'Next Preview' : '下个周期预告')}</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/quadrant?range=week')}
              className="shrink-0 text-xs font-black text-primary flex items-center gap-1"
            >
              {t('reports.view_quadrant', english ? 'Quadrant' : '看四象限')} <ChevronRight size={14} />
            </button>
          </div>
          <p className="text-safe text-xs font-bold text-on-surface-variant mb-3">
            {english ? 'Here are the items that may need attention in the next period.' : report.nextPeriodPreview?.summary}
          </p>
          <div className="space-y-2">
            {report.nextPeriodPreview?.items.length ? report.nextPeriodPreview.items.map(item => (
              <div key={item.id} className="rounded-2xl p-3 bg-surface-container-low flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-on-surface truncate">{reportText(item.title, i18n.language)}</p>
                  <p className="text-safe text-[10px] font-bold text-on-surface-variant/60">
                    {item.deadline
                      ? `${t('reports.reminder', english ? 'Reminder' : '提醒')}：${formatShortDate(item.deadline, i18n.language)}`
                      : reportText(item.planName, i18n.language)}
                  </p>
                </div>
                <span className={cn(
                  "rounded-full px-2 py-1 text-[10px] font-black shrink-0",
                  item.importance === 'important' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
                )}>
                  {item.importance === 'important'
                    ? t('reports.important', english ? 'Important' : '重要')
                    : t('reports.normal', english ? 'Normal' : '普通')}
                </span>
              </div>
            )) : (
              <div className="rounded-2xl p-4 bg-surface-container-low text-center text-xs font-bold text-on-surface-variant">
                {t('reports.empty_preview', english ? 'Nothing needs an early reminder yet.' : '暂时没有需要提前预告的事项。')}
              </div>
            )}
          </div>
        </section>

        {totalCompleted === 0 && report.completedPenaltyHabits === 0 && (
          <section className="rounded-3xl p-4 sm:p-5 bg-surface border border-outline-variant/10 shadow-sm text-center">
            <Gift size={36} className="mx-auto text-primary mb-2" />
            <p className="text-sm font-black text-on-surface">{t('reports.empty_start_title', english ? 'Start with one small action this period' : '这个周期先从一个小行动开始')}</p>
            <p className="text-safe text-xs font-bold text-on-surface-variant mt-1">
              {t('reports.empty_start_desc', english ? 'The app will track completed tasks, good habits, fulfilled wishes, and next-period plans automatically.' : '系统会自动记录完成、好习惯、心愿兑现和下周期安排。')}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: 'green' | 'yellow' | 'red';
}) {
  const color = tone === 'red' ? 'text-red-500' : tone === 'yellow' ? 'text-secondary' : 'text-primary';
  return (
    <div className="rounded-3xl p-4 bg-surface border border-outline-variant/10 shadow-sm">
      <div className={cn("w-9 h-9 rounded-2xl flex items-center justify-center bg-surface-container-low mb-3", color)}>
        <Icon size={18} />
      </div>
      <p className="truncate text-xs font-bold text-on-surface-variant">{label}</p>
      <p className={cn("text-3xl font-black mt-1", color)}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, prefix = '', compact = false }: {
  label: string;
  value: number;
  prefix?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl bg-surface-container-low text-center", compact ? "p-2" : "p-3")}>
      <p className="truncate text-[10px] font-black text-on-surface-variant/55">{label}</p>
      <p className={cn("font-black text-primary", compact ? "text-lg" : "text-2xl")}>{prefix}{value}</p>
    </div>
  );
}

function EncouragementRow({ index, text, tone }: {
  index: number;
  text: string;
  tone: 'child' | 'parent';
}) {
  return (
    <div className={cn(
      "rounded-2xl p-3 flex items-start gap-3",
      tone === 'child' ? 'bg-amber-50' : 'bg-primary-container/60'
    )}>
      <div className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0",
        tone === 'child' ? 'bg-amber-200 text-amber-800' : 'bg-primary text-white'
      )}>
        {index}
      </div>
      <p className="text-safe text-xs font-bold text-on-surface-variant leading-relaxed">{text}</p>
    </div>
  );
}

function buildPeriodRange(type: FamilyReportPeriod, now: Date, offset: number): FamilyReportPeriodRange {
  if (type === 'week') {
    const start = startOfWeek(now);
    start.setDate(start.getDate() + offset * 7);
    return { type, start: start.toISOString(), end: endOfDays(start, 7).toISOString() };
  }

  if (type === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return { type, start: start.toISOString(), end: end.toISOString() };
  }

  if (type === 'term') {
    const month = now.getMonth();
    const baseYear = month >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    const termStart = month >= 1 && month <= 6
      ? new Date(now.getFullYear(), 1, 1)
      : new Date(baseYear + offset, 8, 1);
    const termEnd = termStart.getMonth() === 1
      ? new Date(termStart.getFullYear(), 6, 31, 23, 59, 59, 999)
      : new Date(termStart.getFullYear() + 1, 0, 31, 23, 59, 59, 999);
    if (offset > 0 && month >= 1 && month <= 6) {
      const nextStart = new Date(now.getFullYear(), 8, 1);
      return { type, start: nextStart.toISOString(), end: new Date(now.getFullYear() + 1, 0, 31, 23, 59, 59, 999).toISOString() };
    }
    return { type, start: termStart.toISOString(), end: termEnd.toISOString() };
  }

  const start = new Date(now.getFullYear() + offset, 0, 1);
  const end = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59, 999);
  return { type, start: start.toISOString(), end: end.toISOString() };
}

function startOfWeek(now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  return start;
}

function endOfDays(start: Date, days: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatPeriod(period: FamilyReportPeriodRange, language?: string): string {
  return `${formatShortDate(period.start, language)} - ${formatShortDate(period.end, language)}`;
}

function formatShortDate(value: string, language?: string): string {
  return new Date(value).toLocaleDateString(isEnglish(language) ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' });
}

function actionTypeLabel(type: 'keep' | 'reduce' | 'defer' | 'confirm'): string {
  if (type === 'keep') return '保留';
  if (type === 'reduce') return '减少';
  if (type === 'defer') return '顺延';
  return '确认';
}
