import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarDays, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { useTranslation } from 'react-i18next';
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
import { localeCountText, localeText, resolveSupportedLocale, type LocaleText } from '../lib/localeText';

const KIND_OPTIONS: Array<{ key: LocalPublicCalendarSignalKind; label: string; hint: string }> = [
  { key: 'term_start', label: '开学/返校', hint: '接送、作息、睡眠提前回归' },
  { key: 'school_break', label: '放假/寒暑假', hint: '切换假期作息和亲子安排' },
  { key: 'exam', label: '考试/考级', hint: '提前减负，保留复习时间' },
  { key: 'school_event', label: '学校活动', hint: '运动会、家长会、研学' },
  { key: 'emergency', label: '极端天气/停课', hint: '优先安全，暂停非必要外出' },
  { key: 'public_event', label: '重大活动/交通', hint: '提前核对通勤、场馆和课程' },
];

const KIND_OPTIONS_EN: Record<LocalPublicCalendarSignalKind, { label: string; hint: string }> = {
  term_start: { label: 'School starts', hint: 'Pickup, sleep, and routines return early' },
  school_break: { label: 'Break / vacation', hint: 'Switch vacation rhythm and family plans' },
  exam: { label: 'Exam / test', hint: 'Keep review time and reduce extra load' },
  school_event: { label: 'School event', hint: 'Sports day, parent meeting, field trip' },
  emergency: { label: 'Weather / closure', hint: 'Safety first; pause non-essential outings' },
  public_event: { label: 'Public event / traffic', hint: 'Check commute, venues, and offline classes early' },
};

const KIND_OPTIONS_MULTI: Record<LocalPublicCalendarSignalKind, Record<string, { label: string; hint: string }>> = {
  term_start: {
    'en-US': KIND_OPTIONS_EN.term_start,
    'ja-JP': { label: '始業/登校再開', hint: '送迎、睡眠、生活リズムを早めに戻す' },
    'ko-KR': { label: '개학/등교 재개', hint: '등하원, 수면, 루틴을 미리 되돌립니다' },
    'es-ES': { label: 'Inicio de clases', hint: 'Retomar recogida, sueño y rutinas con antelación' },
    'fr-FR': { label: 'Rentrée', hint: 'Recaler transport, sommeil et routines en amont' },
  },
  school_break: {
    'en-US': KIND_OPTIONS_EN.school_break,
    'ja-JP': { label: '休み/長期休暇', hint: '休暇リズムと家族予定に切り替える' },
    'ko-KR': { label: '방학/휴가', hint: '방학 리듬과 가족 일정을 전환합니다' },
    'es-ES': { label: 'Vacaciones', hint: 'Cambiar a ritmo de vacaciones y planes familiares' },
    'fr-FR': { label: 'Vacances', hint: 'Passer au rythme vacances et aux plans familiaux' },
  },
  exam: {
    'en-US': KIND_OPTIONS_EN.exam,
    'ja-JP': { label: '試験/検定', hint: '負担を減らし復習時間を確保' },
    'ko-KR': { label: '시험/평가', hint: '부담을 줄이고 복습 시간을 확보합니다' },
    'es-ES': { label: 'Examen/prueba', hint: 'Reservar repaso y reducir carga extra' },
    'fr-FR': { label: 'Examen/test', hint: 'Garder du temps de révision et alléger' },
  },
  school_event: {
    'en-US': KIND_OPTIONS_EN.school_event,
    'ja-JP': { label: '学校行事', hint: '運動会、保護者会、校外学習' },
    'ko-KR': { label: '학교 행사', hint: '운동회, 학부모 모임, 체험학습' },
    'es-ES': { label: 'Evento escolar', hint: 'Deportes, reunión de padres, salida escolar' },
    'fr-FR': { label: 'Événement scolaire', hint: 'Sport, réunion parents, sortie' },
  },
  emergency: {
    'en-US': KIND_OPTIONS_EN.emergency,
    'ja-JP': { label: '荒天/休校', hint: '安全優先、不要な外出を止める' },
    'ko-KR': { label: '악천후/휴교', hint: '안전을 우선하고 불필요한 외출을 멈춥니다' },
    'es-ES': { label: 'Clima/cierre', hint: 'Seguridad primero; pausar salidas no esenciales' },
    'fr-FR': { label: 'Météo/fermeture', hint: 'Sécurité d’abord; limiter les sorties' },
  },
  public_event: {
    'en-US': KIND_OPTIONS_EN.public_event,
    'ja-JP': { label: '公共イベント/交通', hint: '通勤、会場、教室を早めに確認' },
    'ko-KR': { label: '공공 행사/교통', hint: '이동, 장소, 오프라인 수업을 미리 확인합니다' },
    'es-ES': { label: 'Evento/tráfico', hint: 'Revisar traslado, sedes y clases presenciales' },
    'fr-FR': { label: 'Événement/trafic', hint: 'Vérifier trajets, lieux et cours sur place' },
  },
};

const CALENDAR_TEXT_EN: Record<string, string> = {
  '正在检查公共时间数据': 'Checking public time data',
  '公共时间数据暂时不可更新，已保留本地校历': 'Public time data cannot update right now. Local calendar is kept.',
  '请先填写事项名称': 'Please enter an event name first',
  '结束日期不能早于开始日期': 'End date cannot be earlier than start date',
  '已加入公共时间库，会参与后续日程建议': 'Added to public time library. It will be used in future schedule suggestions.',
  '已删除特殊日期': 'Special date deleted',
  '国务院办公厅节假日安排': 'National holiday schedule',
  '地方教育局校历': 'Local school calendar',
  '气象与应急事件': 'Weather and emergency events',
  '中国法定节假日内置种子': 'Built-in national holiday seed data',
  '家庭手动校历与本地事件': 'Family school calendar and local events',
  '实时公共事件接口': 'Live public event feed',
  '家庭手动校历': 'Family school calendar',
  '家庭手动公共事件': 'Family public event',
  '已连接实时公共时间源': 'Connected to live public time sources',
  '实时公共时间源暂不可用，正在使用最近缓存': 'Live public time sources are temporarily unavailable; using cached data.',
};

const CALENDAR_TEXT_MULTI: Record<string, Partial<Record<'en-US' | 'ja-JP' | 'ko-KR' | 'es-ES' | 'fr-FR', string>>> = {
  ...Object.fromEntries(Object.entries(CALENDAR_TEXT_EN).map(([key, value]) => [key, { 'en-US': value }])),
  '正在检查公共时间数据': {
    'ja-JP': '公共時間データを確認中',
    'ko-KR': '공공 시간 데이터를 확인 중',
    'es-ES': 'Revisando datos públicos de calendario',
    'fr-FR': 'Vérification des données de temps public',
  },
  '公共时间数据暂时不可更新，已保留本地校历': {
    'ja-JP': '公共時間データは一時更新できません。ローカル校暦を保持しています。',
    'ko-KR': '공공 시간 데이터를 일시적으로 업데이트할 수 없어 로컬 학사일정을 유지합니다.',
    'es-ES': 'No se pueden actualizar los datos públicos ahora. Se conserva el calendario local.',
    'fr-FR': 'Les données publiques ne peuvent pas être mises à jour. Le calendrier local est conservé.',
  },
  '请先填写事项名称': {
    'ja-JP': '先に予定名を入力してください',
    'ko-KR': '먼저 일정 이름을 입력하세요',
    'es-ES': 'Introduce primero el nombre del evento',
    'fr-FR': 'Saisissez d’abord le nom de l’événement',
  },
  '结束日期不能早于开始日期': {
    'ja-JP': '終了日は開始日より前にできません',
    'ko-KR': '종료일은 시작일보다 빠를 수 없습니다',
    'es-ES': 'La fecha final no puede ser anterior a la inicial',
    'fr-FR': 'La date de fin ne peut pas précéder la date de début',
  },
  '已加入公共时间库，会参与后续日程建议': {
    'ja-JP': '公共時間ライブラリに追加しました。今後の予定提案に使われます。',
    'ko-KR': '공공 시간 라이브러리에 추가되어 이후 일정 제안에 반영됩니다.',
    'es-ES': 'Añadido a la biblioteca de tiempo público. Se usará en futuras sugerencias.',
    'fr-FR': 'Ajouté à la bibliothèque des temps publics. Il sera utilisé pour les prochaines suggestions.',
  },
  '已删除特殊日期': {
    'ja-JP': '特別日を削除しました',
    'ko-KR': '특별 날짜를 삭제했습니다',
    'es-ES': 'Fecha especial eliminada',
    'fr-FR': 'Date spéciale supprimée',
  },
  '国务院办公厅节假日安排': {
    'ja-JP': '国務院弁公庁の祝日予定',
    'ko-KR': '국무원 판공청 휴일 일정',
    'es-ES': 'Calendario oficial de festivos',
    'fr-FR': 'Calendrier officiel des jours fériés',
  },
  '地方教育局校历': {
    'ja-JP': '地域教育局の学校暦',
    'ko-KR': '지역 교육청 학사일정',
    'es-ES': 'Calendario escolar local',
    'fr-FR': 'Calendrier scolaire local',
  },
  '气象与应急事件': {
    'ja-JP': '天気と緊急情報',
    'ko-KR': '기상 및 긴급 사건',
    'es-ES': 'Clima y emergencias',
    'fr-FR': 'Météo et urgences',
  },
  '中国法定节假日内置种子': {
    'ja-JP': '中国法定祝日の内蔵データ',
    'ko-KR': '중국 법정 공휴일 기본 데이터',
    'es-ES': 'Datos base de festivos oficiales de China',
    'fr-FR': 'Données intégrées des jours fériés chinois',
  },
  '家庭手动校历与本地事件': {
    'ja-JP': '家庭の学校暦とローカル予定',
    'ko-KR': '가족 학사일정 및 로컬 일정',
    'es-ES': 'Calendario escolar familiar y eventos locales',
    'fr-FR': 'Calendrier scolaire familial et événements locaux',
  },
  '实时公共事件接口': {
    'ja-JP': 'リアルタイム公共イベント連携',
    'ko-KR': '실시간 공공 이벤트 연동',
    'es-ES': 'Fuente pública de eventos en tiempo real',
    'fr-FR': 'Flux public d’événements en temps réel',
  },
  '家庭手动校历': {
    'ja-JP': '家庭の学校暦',
    'ko-KR': '가족 학사일정',
    'es-ES': 'Calendario escolar familiar',
    'fr-FR': 'Calendrier scolaire familial',
  },
  '家庭手动公共事件': {
    'ja-JP': '家庭の公共イベント',
    'ko-KR': '가족 공공 이벤트',
    'es-ES': 'Evento público familiar',
    'fr-FR': 'Événement public familial',
  },
  '已连接实时公共时间源': {
    'ja-JP': 'リアルタイム公共時間ソースに接続済み',
    'ko-KR': '실시간 공공 시간 소스에 연결됨',
    'es-ES': 'Conectado a fuentes públicas en tiempo real',
    'fr-FR': 'Connecté aux sources publiques en temps réel',
  },
  '实时公共时间源暂不可用，正在使用最近缓存': {
    'ja-JP': 'リアルタイム公共時間ソースは一時利用できません。最近のキャッシュを使用しています。',
    'ko-KR': '실시간 공공 시간 소스를 일시적으로 사용할 수 없어 최근 캐시를 사용합니다.',
    'es-ES': 'Las fuentes públicas en tiempo real no están disponibles; se usa la caché reciente.',
    'fr-FR': 'Les sources publiques en temps réel sont indisponibles ; le cache récent est utilisé.',
  },
};

function isEnglishLanguage(language?: string): boolean {
  return (language || '').toLowerCase().startsWith('en');
}

function calendarText(text: string | undefined, language: string): string {
  if (!text) return '';
  return localeText(language, {
    'zh-CN': text,
    'en-US': CALENDAR_TEXT_EN[text] || text,
    ...(CALENDAR_TEXT_MULTI[text] || {}),
  });
}

export function SchoolCalendar() {
  const { i18n } = useTranslation();
  const english = isEnglishLanguage(i18n.language);
  const l = (copy: LocaleText) => localeText(i18n.language, copy);
  const kindText = (key: LocalPublicCalendarSignalKind, field: 'label' | 'hint') =>
    KIND_OPTIONS_MULTI[key]?.[resolveSupportedLocale(i18n.language)]?.[field] || KIND_OPTIONS.find(item => item.key === key)?.[field] || '';
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
      showToastGlobal(calendarText('请先填写事项名称', i18n.language), 'warning');
      return;
    }
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      showToastGlobal(calendarText('结束日期不能早于开始日期', i18n.language), 'warning');
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
    showToastGlobal(calendarText('已加入公共时间库，会参与后续日程建议', i18n.language), 'success');
  };

  const handleDelete = async (id: string) => {
    const next = await removeStoredPublicCalendarSignal(id);
    setSignals(next);
    showToastGlobal(calendarText('已删除特殊日期', i18n.language), 'success');
  };

  return (
    <div className="min-h-screen bg-background pb-28 animate-in fade-in duration-500">
      <TopAppBar title={l({ 'zh-CN': '公共时间情报源', 'en-US': 'Public Time Signals', 'ja-JP': '公共時間シグナル', 'ko-KR': '공공 시간 신호', 'es-ES': 'Señales de calendario público', 'fr-FR': 'Signaux de temps public' })} backTo="/profile" />

      <main className="px-4 py-4 space-y-4">
        <section className="rounded-3xl bg-primary-container border border-primary/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-surface/70 text-primary flex items-center justify-center shrink-0">
              <GraduationCap size={23} strokeWidth={2.6} />
            </div>
            <div className="min-w-0">
              <h1 className="text-safe text-lg font-black text-primary-text">
                {l({ 'zh-CN': '后台自动收集会影响日程的公共时间', 'en-US': 'Public dates that may change family schedules', 'ja-JP': '家族予定に影響する公共日程を自動収集', 'ko-KR': '가족 일정에 영향을 주는 공공 시간을 자동 수집', 'es-ES': 'Fechas públicas que pueden cambiar la agenda familiar', 'fr-FR': 'Dates publiques pouvant modifier l’organisation familiale' })}
              </h1>
              <p className="text-safe text-xs font-bold text-primary-text/70 leading-relaxed mt-1">
                {l({
                  'zh-CN': '节假日、调休、极端天气和重大公共事件会优先由系统自动检索；只有家庭自己的考试、活动或学校临时安排，才需要手动补充。',
                  'en-US': 'Holidays, makeup workdays, weather, and major public events are checked by the system first. Add only family-specific exams, events, or school notices here.',
                  'ja-JP': '祝日、振替出勤、荒天、重大イベントは先にシステムが確認します。ここでは家庭固有の試験、行事、学校連絡だけを追加します。',
                  'ko-KR': '공휴일, 대체 근무일, 날씨, 주요 공공 행사는 시스템이 먼저 확인합니다. 여기에는 가족별 시험, 행사, 학교 공지만 추가하세요.',
                  'es-ES': 'El sistema revisa primero festivos, recuperaciones, clima y grandes eventos. Añade aquí solo exámenes, eventos o avisos escolares propios.',
                  'fr-FR': 'Le système vérifie d’abord jours fériés, rattrapages, météo et grands événements. Ajoutez ici seulement les examens, événements ou avis propres à la famille.',
                })}
              </p>
              <p className="text-safe text-[11px] font-black text-primary-text/55 leading-relaxed mt-2">
                {calendarText(freshnessLabel, i18n.language)}
              </p>
            </div>
          </div>
        </section>

        {sourceStatuses.length > 0 && (
          <section className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-black text-on-surface">{l({ 'zh-CN': '公共时间来源', 'en-US': 'Sources', 'ja-JP': '情報源', 'ko-KR': '출처', 'es-ES': 'Fuentes', 'fr-FR': 'Sources' })}</h2>
              <span className="text-[10px] font-black text-on-surface-variant/40">
                {localeCountText(i18n.language, sourceStatuses.length, { 'zh-CN': '{{count}} 个来源', 'en-US': '{{count}} sources', 'ja-JP': '{{count}} 件の情報源', 'ko-KR': '출처 {{count}}개', 'es-ES': '{{count}} fuentes', 'fr-FR': '{{count}} sources' })}
              </span>
            </div>
            <div className="space-y-2">
              {sourceStatuses.map(status => (
                <div key={status.sourceId} className="rounded-2xl bg-surface-container-low px-3 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-safe text-xs font-black text-on-surface">{calendarText(status.sourceName, i18n.language)}</p>
                    <p className="text-safe text-[10px] font-bold text-on-surface-variant/50 mt-0.5">
                      {sourceStatusText(status, i18n.language)} · {localeCountText(i18n.language, status.signalCount, { 'zh-CN': '{{count}} 条', 'en-US': '{{count}} items', 'ja-JP': '{{count}} 件', 'ko-KR': '{{count}}개', 'es-ES': '{{count}} elementos', 'fr-FR': '{{count}} éléments' })}
                    </p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-1 text-[10px] font-black',
                    status.status === 'ok' ? 'bg-primary-container/20 text-primary' :
                    status.status === 'needs_config' ? 'bg-warning-container text-warning' :
                    status.status === 'error' ? 'bg-danger-container text-danger' :
                    'bg-primary-container/20 text-primary'
                  )}>
                    {sourceStatusBadge(status, i18n.language)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm space-y-3">
          <div>
            <label className="text-[11px] font-black text-on-surface-variant/50 block mb-1.5">{l({ 'zh-CN': '事项名称', 'en-US': 'Event name', 'ja-JP': '予定名', 'ko-KR': '일정 이름', 'es-ES': 'Nombre del evento', 'fr-FR': 'Nom de l’événement' })}</label>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder={l({ 'zh-CN': '例如：秋季开学、期末考试、暴雨停课、马拉松交通管制', 'en-US': 'Examples: school starts, final exam, storm closure, marathon traffic control', 'ja-JP': '例：秋の始業、期末試験、暴雨休校、マラソン交通規制', 'ko-KR': '예: 가을 개학, 기말고사, 폭우 휴교, 마라톤 교통 통제', 'es-ES': 'Ej.: inicio de curso, examen final, cierre por tormenta, cortes por maratón', 'fr-FR': 'Ex. : rentrée, examen final, fermeture météo, circulation marathon' })}
              className="w-full rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold outline-none border border-outline-variant/10 focus:border-primary"
            />
          </div>

          <div>
            <p className="text-[11px] font-black text-on-surface-variant/50 mb-2">{l({ 'zh-CN': '类型', 'en-US': 'Type', 'ja-JP': '種類', 'ko-KR': '유형', 'es-ES': 'Tipo', 'fr-FR': 'Type' })}</p>
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
                  <span className="text-xs font-black text-on-surface block">{kindText(option.key, 'label')}</span>
                  <span className="text-safe text-[10px] font-bold text-on-surface-variant/50 leading-relaxed block mt-1">
                    {kindText(option.key, 'hint')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-black text-on-surface-variant/50 block mb-1.5">{l({ 'zh-CN': '开始日期', 'en-US': 'Start date', 'ja-JP': '開始日', 'ko-KR': '시작일', 'es-ES': 'Fecha inicial', 'fr-FR': 'Date de début' })}</label>
              <input
                type="date"
                value={startDate}
                onChange={event => setStartDate(event.target.value)}
                className="w-full rounded-2xl bg-surface-container-low px-3 py-3 text-sm font-black outline-none border border-outline-variant/10 focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-on-surface-variant/50 block mb-1.5">{l({ 'zh-CN': '结束日期', 'en-US': 'End date', 'ja-JP': '終了日', 'ko-KR': '종료일', 'es-ES': 'Fecha final', 'fr-FR': 'Date de fin' })}</label>
              <input
                type="date"
                value={endDate}
                onChange={event => setEndDate(event.target.value)}
                className="w-full rounded-2xl bg-surface-container-low px-3 py-3 text-sm font-black outline-none border border-outline-variant/10 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-black text-on-surface-variant/50 block mb-1.5">{l({ 'zh-CN': '地区/城市，可选', 'en-US': 'Region / city, optional', 'ja-JP': '地域/都市（任意）', 'ko-KR': '지역/도시(선택)', 'es-ES': 'Región/ciudad, opcional', 'fr-FR': 'Région/ville, facultatif' })}</label>
            <input
              value={region}
              onChange={event => setRegion(event.target.value)}
              placeholder={l({ 'zh-CN': '例如：北京、上海、杭州', 'en-US': 'Examples: Beijing, Shanghai, Hangzhou', 'ja-JP': '例：北京、上海、杭州', 'ko-KR': '예: 베이징, 상하이, 항저우', 'es-ES': 'Ej.: Pekín, Shanghái, Hangzhou', 'fr-FR': 'Ex. : Pékin, Shanghai, Hangzhou' })}
              className="w-full rounded-2xl bg-surface-container-low px-4 py-3 text-sm font-bold outline-none border border-outline-variant/10 focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="w-full h-12 rounded-2xl bg-primary text-white text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Plus size={18} />
            {l({ 'zh-CN': '加入公共时间库', 'en-US': 'Add to time library', 'ja-JP': '時間ライブラリに追加', 'ko-KR': '시간 라이브러리에 추가', 'es-ES': 'Añadir a biblioteca', 'fr-FR': 'Ajouter à la bibliothèque' })}
          </button>
        </section>

        <section className="rounded-3xl bg-surface border border-outline-variant/10 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <CalendarDays size={18} className="text-primary shrink-0" />
              <h2 className="text-sm font-black text-on-surface">{l({ 'zh-CN': '已记录的特殊日期', 'en-US': 'Recorded special dates', 'ja-JP': '記録済みの特別日', 'ko-KR': '기록된 특별 날짜', 'es-ES': 'Fechas especiales guardadas', 'fr-FR': 'Dates spéciales enregistrées' })}</h2>
            </div>
            <span className="text-[10px] font-black text-on-surface-variant/40 shrink-0">
              {localeCountText(i18n.language, signals.length, { 'zh-CN': '{{count}} 项', 'en-US': '{{count}} items', 'ja-JP': '{{count}} 件', 'ko-KR': '{{count}}개', 'es-ES': '{{count}} elementos', 'fr-FR': '{{count}} éléments' })}
            </span>
          </div>

          {sortedSignals.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-low p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-on-surface-variant/45 shrink-0 mt-0.5" />
              <p className="text-safe text-xs font-bold text-on-surface-variant/60 leading-relaxed">
                {l({
                  'zh-CN': '暂无特殊日期。先录入开学、放假、考试或临时停课时间，系统就能在家庭复盘里提前提醒。',
                  'en-US': 'No special dates yet. Add school starts, breaks, exams, or temporary closures so family reviews can remind you early.',
                  'ja-JP': '特別日はまだありません。始業、休み、試験、臨時休校を入れると家族レビューで早めに知らせます。',
                  'ko-KR': '아직 특별 날짜가 없습니다. 개학, 방학, 시험, 임시 휴교를 추가하면 가족 리포트에서 미리 알려줍니다.',
                  'es-ES': 'Aún no hay fechas especiales. Añade clases, vacaciones, exámenes o cierres para recibir avisos antes.',
                  'fr-FR': 'Aucune date spéciale. Ajoutez rentrée, vacances, examens ou fermetures pour être prévenus plus tôt.',
                })}
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
                      {formatDate(signal.startDate, i18n.language)} - {formatDate(signal.endDate, i18n.language)} · {signal.region === 'national' ? l({ 'zh-CN': '通用', 'en-US': 'General', 'ja-JP': '共通', 'ko-KR': '공통', 'es-ES': 'General', 'fr-FR': 'Général' }) : signal.region}
                    </p>
                    {signal.recommendationHint && (
                      <p className="text-safe text-[11px] font-bold text-on-surface-variant/45 leading-relaxed mt-1">
                        {l({ 'zh-CN': signal.recommendationHint, 'en-US': 'This date will be considered when schedule suggestions are generated.', 'ja-JP': 'この日程は予定提案を作るときに考慮されます。', 'ko-KR': '이 날짜는 일정 제안 생성 시 반영됩니다.', 'es-ES': 'Esta fecha se tendrá en cuenta al generar sugerencias.', 'fr-FR': 'Cette date sera prise en compte dans les suggestions.' })}
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

function formatDate(value: string, language = 'zh-CN'): string {
  return new Date(value).toLocaleDateString(resolveSupportedLocale(language), {
    month: '2-digit',
    day: '2-digit',
  });
}

function sourceStatusBadge(status: PublicCalendarSourceStatus, language = 'zh-CN'): string {
  if (status.status === 'ok') return localeText(language, { 'zh-CN': '实时', 'en-US': 'Live', 'ja-JP': 'ライブ', 'ko-KR': '실시간', 'es-ES': 'En vivo', 'fr-FR': 'Direct' });
  if (status.status === 'needs_config') return localeText(language, { 'zh-CN': '待接入', 'en-US': 'Setup', 'ja-JP': '設定', 'ko-KR': '설정', 'es-ES': 'Configurar', 'fr-FR': 'Configurer' });
  if (status.status === 'error') return localeText(language, { 'zh-CN': '异常', 'en-US': 'Error', 'ja-JP': 'エラー', 'ko-KR': '오류', 'es-ES': 'Error', 'fr-FR': 'Erreur' });
  return localeText(language, { 'zh-CN': '兜底', 'en-US': 'Local', 'ja-JP': 'ローカル', 'ko-KR': '로컬', 'es-ES': 'Local', 'fr-FR': 'Local' });
}

function sourceStatusText(status: PublicCalendarSourceStatus, language = 'zh-CN'): string {
  if (status.status === 'needs_config') return localeText(language, {
    'zh-CN': '实时接口尚未配置，当前不影响离线使用',
    'en-US': 'Live API is not configured; offline use is available',
    'ja-JP': 'ライブAPI未設定です。オフライン利用は可能です',
    'ko-KR': '실시간 API가 설정되지 않았지만 오프라인 사용은 가능합니다',
    'es-ES': 'La API en vivo no está configurada; el uso offline sigue disponible',
    'fr-FR': 'L’API en direct n’est pas configurée; l’usage hors ligne reste disponible',
  });
  if (status.status === 'error') return localeText(language, {
    'zh-CN': '本次更新失败，继续保留本地数据',
    'en-US': 'Update failed this time; local data is kept',
    'ja-JP': '今回の更新に失敗しました。ローカルデータを保持します',
    'ko-KR': '이번 업데이트에 실패하여 로컬 데이터를 유지합니다',
    'es-ES': 'La actualización falló; se conservan los datos locales',
    'fr-FR': 'La mise à jour a échoué; les données locales sont conservées',
  });
  if (status.verifiedUntil) return localeText(language, {
    'zh-CN': `已核验至 ${formatDate(status.verifiedUntil, language)}`,
    'en-US': `Verified until ${formatDate(status.verifiedUntil, language)}`,
    'ja-JP': `${formatDate(status.verifiedUntil, language)} まで確認済み`,
    'ko-KR': `${formatDate(status.verifiedUntil, language)}까지 확인됨`,
    'es-ES': `Verificado hasta ${formatDate(status.verifiedUntil, language)}`,
    'fr-FR': `Vérifié jusqu’au ${formatDate(status.verifiedUntil, language)}`,
  });
  if (status.mode === 'local') return localeText(language, {
    'zh-CN': '保存在本机，离线可用',
    'en-US': 'Saved locally and available offline',
    'ja-JP': '端末に保存済み。オフラインで利用できます',
    'ko-KR': '기기에 저장되어 오프라인에서 사용할 수 있습니다',
    'es-ES': 'Guardado localmente y disponible sin conexión',
    'fr-FR': 'Enregistré localement et disponible hors ligne',
  });
  return status.stale
    ? localeText(language, { 'zh-CN': '建议联网后更新', 'en-US': 'Connect to refresh when possible', 'ja-JP': '接続できる時に更新してください', 'ko-KR': '가능할 때 연결하여 새로고침하세요', 'es-ES': 'Conéctate para actualizar cuando sea posible', 'fr-FR': 'Connectez-vous pour actualiser si possible' })
    : localeText(language, { 'zh-CN': '可用', 'en-US': 'Available', 'ja-JP': '利用可能', 'ko-KR': '사용 가능', 'es-ES': 'Disponible', 'fr-FR': 'Disponible' });
}
