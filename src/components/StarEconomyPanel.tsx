import React from 'react';
import { AlertTriangle, CheckCircle2, Gauge, Sparkles } from 'lucide-react';
import { buildStarEconomyHealth, type StarEconomyHealthInput } from '../lib/starEconomy';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { localeText } from '../lib/localeText';

interface StarEconomyPanelProps extends StarEconomyHealthInput {
  className?: string;
  compact?: boolean;
}

export function StarEconomyPanel({
  className,
  compact = false,
  ...input
}: StarEconomyPanelProps) {
  const { t, i18n } = useTranslation();
  const health = buildStarEconomyHealth(input);
  const Icon = health.status === 'inflating'
    ? AlertTriangle
    : health.status === 'too_tight'
      ? Gauge
      : CheckCircle2;

  const statusHeadline = {
    inflating: localeText(i18n.language, {
      'zh-CN': '星星增长有点快',
      'en-US': 'Stars are growing too fast',
      'ja-JP': 'ポイントの増え方が少し速いです',
      'ko-KR': '포인트가 조금 빠르게 늘고 있어요',
      'es-ES': 'Los puntos crecen demasiado rápido',
      'fr-FR': 'Les points augmentent un peu trop vite',
    }),
    too_tight: localeText(i18n.language, {
      'zh-CN': '星星可能太难获得',
      'en-US': 'Stars may feel too hard to earn',
      'ja-JP': 'ポイントが少し貯めにくいかもしれません',
      'ko-KR': '포인트를 얻기 너무 어려울 수 있어요',
      'es-ES': 'Los puntos pueden sentirse difíciles de ganar',
      'fr-FR': 'Les points peuvent sembler trop difficiles à gagner',
    }),
    healthy: localeText(i18n.language, {
      'zh-CN': '积分节奏比较健康',
      'en-US': 'Star balance looks healthy',
      'ja-JP': 'ポイントのバランスは健全です',
      'ko-KR': '포인트 균형이 좋아 보여요',
      'es-ES': 'El equilibrio de puntos se ve sano',
      'fr-FR': 'L’équilibre des points semble sain',
    }),
  }[health.status];
  const guidance = localeText(i18n.language, {
    'zh-CN': health.guidance,
    'en-US': 'Keep frequent daily tasks around 1-3 stars, and price bigger wishes as weekly, monthly, or long-term goals.',
    'ja-JP': '毎日の小さなタスクは1〜3ポイント程度にし、大きな願いは週・月・長期目標として設定しましょう。',
    'ko-KR': '자주 하는 일상 과제는 1~3포인트 정도로 두고, 큰 소원은 주간·월간·장기 목표로 설정하세요.',
    'es-ES': 'Mantén las tareas diarias frecuentes en 1-3 puntos y pon los deseos grandes como metas semanales, mensuales o largas.',
    'fr-FR': 'Gardez les petites tâches quotidiennes autour de 1 à 3 points, et valorisez les grands souhaits comme objectifs hebdomadaires, mensuels ou longs.',
  });
  const metricLabel = (label: string) => ({
    '本期获得': localeText(i18n.language, { 'zh-CN': '本期获得', 'en-US': 'Earned', 'ja-JP': '獲得', 'ko-KR': '획득', 'es-ES': 'Ganados', 'fr-FR': 'Gagnés' }),
    '本期扣减': localeText(i18n.language, { 'zh-CN': '本期扣减', 'en-US': 'Deducted', 'ja-JP': '減点', 'ko-KR': '감점', 'es-ES': 'Restados', 'fr-FR': 'Retirés' }),
    '净增长': localeText(i18n.language, { 'zh-CN': '净增长', 'en-US': 'Net', 'ja-JP': '純増', 'ko-KR': '순증가', 'es-ES': 'Neto', 'fr-FR': 'Net' }),
    '可兑心愿': localeText(i18n.language, { 'zh-CN': '可兑心愿', 'en-US': 'Affordable', 'ja-JP': '交換可', 'ko-KR': '교환 가능', 'es-ES': 'Canjeables', 'fr-FR': 'Échangeables' }),
  }[label] || label);

  return (
    <section className={cn(
      "rounded-3xl bg-surface border border-outline-variant/10 shadow-sm p-4 sm:p-5",
      health.status === 'inflating' && "border-amber-200 bg-amber-50/70",
      health.status === 'healthy' && "border-primary/10",
      className,
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0",
            health.status === 'inflating' ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
          )}>
            <Icon size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-on-surface">
                {t('star_economy.title', localeText(i18n.language, {
                  'zh-CN': '积分健康',
                  'en-US': 'Star Economy',
                  'ja-JP': 'ポイント健康度',
                  'ko-KR': '포인트 건강도',
                  'es-ES': 'Salud de puntos',
                  'fr-FR': 'Santé des points',
                }))}
              </h3>
              <span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-black text-primary">
                {localeText(i18n.language, {
                  'zh-CN': `${health.score}分`,
                  'en-US': `${health.score} pts`,
                  'ja-JP': `${health.score}点`,
                  'ko-KR': `${health.score}점`,
                  'es-ES': `${health.score} pts`,
                  'fr-FR': `${health.score} pts`,
                })}
              </span>
            </div>
            <p className="text-sm font-black text-on-surface mt-1">
              {statusHeadline}
            </p>
            <p className="text-safe text-xs font-bold text-on-surface-variant leading-relaxed mt-1">
              {guidance}
            </p>
          </div>
        </div>
        <Sparkles size={18} className="text-reward-display shrink-0" />
      </div>

      {!compact && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          {health.metrics.map(metric => (
            <div key={metric.label} className="rounded-2xl bg-white/70 p-2.5">
              <p className="text-[10px] font-bold text-on-surface-variant/55">
                {metricLabel(metric.label)}
              </p>
              <p className={cn(
                "text-lg font-black mt-0.5",
                metric.tone === 'warn' ? "text-amber-700" : metric.tone === 'good' ? "text-primary" : "text-on-surface"
              )}>
                {String(metric.value).replace(/个/g, '')}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
