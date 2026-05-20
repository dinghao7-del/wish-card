import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, LayoutGrid, Trash2, Star, Target, Users, Sparkles, CalendarDays, ClipboardCheck, Flag, Layers, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFamily } from '../context/FamilyContext';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { TopAppBar } from '../components/navigation/TopAppBar';
import { AppModal } from '../components/AppModal';
import { getDataLayer } from '../lib/DataLayer';
import { buildPlanCenterOverview, buildPlanDisplaySummary, buildPlanExperienceSummary, buildPlanHierarchySummary, calculatePlanProgress, getPlanParentId, inferPlanKind, PLAN_KIND_DEFINITIONS, type GoalPlanMetadata, type PlanCenterOverview, type PlanDisplaySummary, type PlanExperienceCategory, type PlanExperienceSummary, type PlanHierarchySummary, type PlanKind, type PlanProgressSummary } from '../domain/familyPlanning';
import { deleteGuestPlan, getGuestPlans, saveGuestPlan } from '../lib/guestPlans';
import { localeText, type LocaleText } from '../lib/localeText';

interface PlanItem {
  id: string;
  name: string;
  type: string;
  targetCount: number;
  wishCount: number;
  progress: PlanProgressSummary;
  displaySummary: PlanDisplaySummary;
  hierarchySummary: PlanHierarchySummary;
  kind: PlanKind;
  kindLabel: string;
  usesOutcomeProgress: boolean;
  parentPlanId?: string;
  metadata?: Record<string, unknown>;
  experience: PlanExperienceSummary;
}

const PLAN_PRESETS = [
  '寒假计划', '暑假计划',
  '一年级上学期', '一年级下学期',
  '二年级上学期', '二年级下学期',
  '三年级上学期', '三年级下学期',
  '四年级上学期', '四年级下学期',
  '五年级上学期', '五年级下学期',
  '六年级上学期', '六年级下学期',
];

interface GuidedPlanTemplate {
  title: string;
  name: string;
  kind: PlanKind;
  need: string;
  time: string;
  constraint: string;
  success: string;
  goal?: {
    finalGoal: string;
    frequency: string;
    minutes: number;
    practiceTime: string;
    months: number;
  };
}

function planCopy(language: string, copy: LocaleText): string {
  return localeText(language, copy);
}

const GUIDED_PLAN_TEMPLATES: Record<PlanKind, GuidedPlanTemplate[]> = {
  goal: [
    {
      title: '钢琴考级 5 级',
      name: '钢琴考级 5 级计划',
      kind: 'goal',
      need: '孩子准备钢琴考级，但平时练习不稳定',
      time: '未来 6 个月，每周练习 4-5 次，每次 30 分钟',
      constraint: '平日作业后时间有限，周末可以多练一点',
      success: '通过钢琴 5 级考级，并能稳定完成考级曲目',
      goal: { finalGoal: '通过钢琴 5 级考级', frequency: '每周 5 次', minutes: 30, practiceTime: '19:00', months: 6 },
    },
    {
      title: '读完 20 本书',
      name: '读完 20 本分级阅读计划',
      kind: 'goal',
      need: '希望孩子建立阅读量，并能说出书里的主要内容',
      time: '未来 3 个月，每天阅读 20 分钟',
      constraint: '晚上时间有限，不能影响睡眠',
      success: '读完 20 本分级阅读，并能做一次家庭分享',
      goal: { finalGoal: '读完 20 本分级阅读', frequency: '每天', minutes: 20, practiceTime: '20:00', months: 3 },
    },
    {
      title: '数学期末提升',
      name: '数学期末提升计划',
      kind: 'goal',
      need: '希望孩子补齐薄弱题型，期末前更有信心',
      time: '未来 8 周，每周 4 次，每次 25 分钟',
      constraint: '不想刷题太重，避免孩子抵触',
      success: '薄弱题型错误明显减少，期末成绩有稳定提升',
      goal: { finalGoal: '数学期末稳定提升', frequency: '每周 4 次', minutes: 25, practiceTime: '19:30', months: 2 },
    },
  ],
  cycle: [
    {
      title: '每周练琴安排',
      name: '每周练琴安排',
      kind: 'cycle',
      need: '希望孩子把练琴变成稳定习惯',
      time: '每周 4 次，每次 30 分钟',
      constraint: '避开作业高峰和太晚的时间',
      success: '连续坚持 4 周，孩子不明显抗拒',
    },
    {
      title: '每天跳绳 10 分钟',
      name: '每天跳绳 10 分钟',
      kind: 'cycle',
      need: '希望孩子每天有一点稳定运动',
      time: '每天 10 分钟，优先安排在放学后或晚饭前',
      constraint: '天气不好或回家太晚时可以改成室内运动',
      success: '连续坚持 4 周，体能和精神状态更稳定',
    },
    {
      title: '每周两次游泳',
      name: '每周两次游泳安排',
      kind: 'cycle',
      need: '希望孩子保持运动频率，同时兼顾放松',
      time: '每周 2 次，每次 60 分钟',
      constraint: '需要家长接送，尽量避开作业多的晚上',
      success: '一个月内稳定完成 6-8 次，孩子愿意继续',
    },
    {
      title: '每日英语阅读',
      name: '每日英语阅读安排',
      kind: 'cycle',
      need: '希望孩子每天接触英语，但不要变成负担',
      time: '每天 15-20 分钟，睡前或晚饭后',
      constraint: '不追求难度，优先保护兴趣',
      success: '连续坚持 4 周，能主动读或听英语内容',
    },
  ],
  routine: [
    {
      title: '寒假计划',
      name: '寒假计划',
      kind: 'routine',
      need: '希望寒假既能休息，也能保持学习、运动和兴趣节奏',
      time: '整个寒假，工作日和周末节奏可以不同',
      constraint: '家长工作日陪伴有限，周末可以安排亲子活动',
      success: '开学前作息稳定，学习任务不堆积',
    },
    {
      title: '工作日日程',
      name: '工作日日程安排',
      kind: 'routine',
      need: '希望放学后的作业、运动、兴趣和睡眠更顺',
      time: '周一到周五，重点安排放学后到睡前',
      constraint: '家长下班时间不固定，孩子不能太晚睡',
      success: '每天关键事情能完成，晚上不再拖到很晚',
    },
    {
      title: '周末家庭安排',
      name: '周末家庭安排',
      kind: 'routine',
      need: '希望周末兼顾休息、亲子陪伴和必要学习',
      time: '每周六日，上午下午分开安排',
      constraint: '不想排得太满，要给孩子留自由时间',
      success: '周末更有节奏，全家不临时混乱',
    },
    {
      title: '暑假计划',
      name: '暑假计划',
      kind: 'routine',
      need: '希望暑假能安排学习、运动、兴趣和亲子出游',
      time: '整个暑假，按工作日、周末和出游日分开',
      constraint: '家长请假时间有限，预算和陪伴时间要平衡',
      success: '孩子有成长也有放松，开学前能顺利收心',
    },
  ],
  container: [],
};

const GOAL_PLAN_TEMPLATES: Array<{
  id: string;
  title: string;
  finalGoal: string;
  practiceFrequency: string;
  practiceMinutes: number;
  practiceTime: string;
  months: number;
  milestones: GoalPlanMetadata['milestones'];
  optimizationHint: string;
}> = [
  {
    id: 'piano-grade-5',
    title: '钢琴考级 5 级',
    finalGoal: '通过钢琴 5 级考级',
    practiceFrequency: '每周 5 次',
    practiceMinutes: 30,
    practiceTime: '19:00',
    months: 6,
    milestones: [
      { title: '完成曲目与教材清单确认', targetPercent: 15 },
      { title: '完成音阶与基础技巧阶段', targetPercent: 35 },
      { title: '主曲目能完整弹奏', targetPercent: 60 },
      { title: '模拟考级并修正弱项', targetPercent: 85 },
      { title: '完成考前稳定演练', targetPercent: 100 },
    ],
    optimizationHint: '如果连续两周完成率低于 60%，建议把单次练习降到 20 分钟，但保持频率；如果完成质量稳定，再提高难度。',
  },
  {
    id: 'violin-basic',
    title: '小提琴阶段提升',
    finalGoal: '完成一个阶段教材并能稳定演奏 2 首曲目',
    practiceFrequency: '每周 4 次',
    practiceMinutes: 25,
    practiceTime: '19:30',
    months: 4,
    milestones: [
      { title: '稳定持琴和空弦练习', targetPercent: 20 },
      { title: '完成第一组音阶和节奏', targetPercent: 45 },
      { title: '完整拉奏第一首曲目', targetPercent: 70 },
      { title: '完成家庭展示演奏', targetPercent: 100 },
    ],
    optimizationHint: '乐器类目标要优先保护兴趣，练习频率比单次时长更重要，遇到抗拒时先降难度。',
  },
  {
    id: 'english-reading',
    title: '英语阅读提升',
    finalGoal: '完成 20 本分级阅读并能复述主要内容',
    practiceFrequency: '每天',
    practiceMinutes: 20,
    practiceTime: '20:00',
    months: 3,
    milestones: [
      { title: '完成前 5 本并建立阅读记录', targetPercent: 25 },
      { title: '完成 10 本并能说出关键词', targetPercent: 50 },
      { title: '完成 15 本并能简单复述', targetPercent: 75 },
      { title: '完成 20 本和一次家庭展示', targetPercent: 100 },
    ],
    optimizationHint: '阅读目标适合小步高频，如果孩子排斥，可以改成亲子共读或听读结合。',
  },
];

type PlanFilterKey = 'all' | PlanExperienceCategory;
type PlanCreationStep = 'intent' | 'details' | 'preview';

const PLAN_FILTERS: Array<{ key: PlanFilterKey; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'onboarding', label: 'AI建档' },
  { key: 'holiday', label: '假期' },
  { key: 'goal', label: '目标' },
  { key: 'routine', label: '日常' },
  { key: 'cycle', label: '周期' },
  { key: 'container', label: '总计划' },
];

const PLAN_FILTER_LABELS_EN: Record<PlanFilterKey, string> = {
  all: 'All',
  onboarding: 'AI Profile',
  holiday: 'Vacation',
  goal: 'Goal',
  routine: 'Routine',
  cycle: 'Cycle',
  container: 'Master',
};

const PLAN_FILTER_LABELS_MULTI: Record<PlanFilterKey, Record<string, string>> = {
  all: { 'ja-JP': 'すべて', 'ko-KR': '전체', 'es-ES': 'Todo', 'fr-FR': 'Tout' },
  onboarding: { 'ja-JP': 'AIプロファイル', 'ko-KR': 'AI 프로필', 'es-ES': 'Perfil IA', 'fr-FR': 'Profil IA' },
  holiday: { 'ja-JP': '休暇', 'ko-KR': '방학', 'es-ES': 'Vacaciones', 'fr-FR': 'Vacances' },
  goal: { 'ja-JP': '目標', 'ko-KR': '목표', 'es-ES': 'Meta', 'fr-FR': 'Objectif' },
  routine: { 'ja-JP': '日常', 'ko-KR': '일상', 'es-ES': 'Rutina', 'fr-FR': 'Routine' },
  cycle: { 'ja-JP': '周期', 'ko-KR': '반복', 'es-ES': 'Recurrente', 'fr-FR': 'Récurrent' },
  container: { 'ja-JP': '総合', 'ko-KR': '마스터', 'es-ES': 'General', 'fr-FR': 'Global' },
};

const PLAN_TEXT_EN: Record<string, string> = {
  'AI建档': 'AI Profile',
  '假期': 'Vacation',
  '目标': 'Goal',
  '运行中': 'Active',
  '总计划': 'Master Plan',
  '子计划': 'Sub-plan',
  '日常作息': 'Daily Routine',
  '目标型计划': 'Goal Plan',
  '周期习惯计划': 'Recurring Habit Plan',
  '日程安排计划': 'Schedule Plan',
  'AI建档方案': 'AI Profile Plan',
  '假期计划': 'Vacation Plan',
  '寒假计划': 'Winter Vacation Plan',
  '暑假计划': 'Summer Vacation Plan',
  '幼儿园小班智能日程优化方案': 'Kindergarten Schedule Optimization Plan',
  '把建议继续拆成家庭可执行安排。': 'Turn suggestions into practical family actions.',
  '重点是让家庭每天稳定运转，而不是追求一个终点百分比。': 'Keep the family rhythm stable each day instead of chasing a final percentage.',
  '重点是让家庭每天稳定运转，而不是追求一个终点百分比': 'Keep the family rhythm stable each day instead of chasing a final percentage.',
  '可以进入计划详情，把建议继续拆成家庭可执行安排。': 'Open the plan details to turn suggestions into practical family actions.',
  '查看日程落地': 'View Schedule Actions',
  '执行记录': 'Execution log',
  '今日/近期安排': 'Today / Upcoming',
  '近期安排': 'Upcoming',
  '项': 'items',
};

const PLAN_TEXT_MULTI: Record<string, Partial<Record<'ja-JP' | 'ko-KR' | 'es-ES' | 'fr-FR', string>>> = {
  'AI建档': { 'ja-JP': 'AIプロフィール', 'ko-KR': 'AI 프로필', 'es-ES': 'Perfil IA', 'fr-FR': 'Profil IA' },
  '假期': { 'ja-JP': '休暇', 'ko-KR': '방학', 'es-ES': 'Vacaciones', 'fr-FR': 'Vacances' },
  '目标': { 'ja-JP': '目標', 'ko-KR': '목표', 'es-ES': 'Meta', 'fr-FR': 'Objectif' },
  '运行中': { 'ja-JP': '進行中', 'ko-KR': '진행 중', 'es-ES': 'Activo', 'fr-FR': 'Actif' },
  '总计划': { 'ja-JP': '親プラン', 'ko-KR': '마스터 계획', 'es-ES': 'Plan general', 'fr-FR': 'Plan global' },
  '子计划': { 'ja-JP': 'サブプラン', 'ko-KR': '하위 계획', 'es-ES': 'Subplan', 'fr-FR': 'Sous-plan' },
  '日常作息': { 'ja-JP': '日課', 'ko-KR': '일상 루틴', 'es-ES': 'Rutina diaria', 'fr-FR': 'Routine quotidienne' },
  '目标型计划': { 'ja-JP': '目標プラン', 'ko-KR': '목표형 계획', 'es-ES': 'Plan de meta', 'fr-FR': 'Plan d’objectif' },
  '周期习惯计划': { 'ja-JP': '反復習慣プラン', 'ko-KR': '반복 습관 계획', 'es-ES': 'Plan recurrente', 'fr-FR': 'Plan récurrent' },
  '日程安排计划': { 'ja-JP': '日程プラン', 'ko-KR': '일정 계획', 'es-ES': 'Plan de agenda', 'fr-FR': 'Plan d’agenda' },
  'AI建档方案': { 'ja-JP': 'AIプロフィール案', 'ko-KR': 'AI 프로필 계획', 'es-ES': 'Plan de perfil IA', 'fr-FR': 'Plan de profil IA' },
  '假期计划': { 'ja-JP': '休暇プラン', 'ko-KR': '방학 계획', 'es-ES': 'Plan de vacaciones', 'fr-FR': 'Plan de vacances' },
  '寒假计划': { 'ja-JP': '冬休みプラン', 'ko-KR': '겨울방학 계획', 'es-ES': 'Plan de invierno', 'fr-FR': 'Plan de vacances d’hiver' },
  '暑假计划': { 'ja-JP': '夏休みプラン', 'ko-KR': '여름방학 계획', 'es-ES': 'Plan de verano', 'fr-FR': 'Plan de vacances d’été' },
  '幼儿园小班智能日程优化方案': { 'ja-JP': '幼児向けスマート日程プラン', 'ko-KR': '유치원 맞춤 일정 계획', 'es-ES': 'Plan inteligente para infantil', 'fr-FR': 'Planning intelligent maternelle' },
  '把建议继续拆成家庭可执行安排。': { 'ja-JP': '提案を家庭で実行できる予定に分けます。', 'ko-KR': '추천을 가족이 실행할 수 있는 일정으로 나눕니다.', 'es-ES': 'Convierte las sugerencias en acciones familiares.', 'fr-FR': 'Transforme les conseils en actions familiales.' },
  '重点是让家庭每天稳定运转，而不是追求一个终点百分比。': { 'ja-JP': 'ゴール率より、毎日のリズムを安定させることが大切です。', 'ko-KR': '끝점 비율보다 매일 안정적인 리듬이 중요합니다.', 'es-ES': 'Importa más sostener el ritmo diario que perseguir un porcentaje final.', 'fr-FR': 'L’objectif est de stabiliser le rythme familial, pas de courir après un pourcentage.' },
  '可以进入计划详情，把建议继续拆成家庭可执行安排。': { 'ja-JP': '詳細で提案を家庭で実行できる予定に分けられます。', 'ko-KR': '상세에서 추천을 실행 가능한 일정으로 나눌 수 있습니다.', 'es-ES': 'Abre el detalle para convertir sugerencias en acciones.', 'fr-FR': 'Ouvrez le détail pour transformer les conseils en actions.' },
  '查看日程落地': { 'ja-JP': '日程化を見る', 'ko-KR': '일정 적용 보기', 'es-ES': 'Ver acciones', 'fr-FR': 'Voir les actions' },
  '执行记录': { 'ja-JP': '実行記録', 'ko-KR': '실행 기록', 'es-ES': 'Registro', 'fr-FR': 'Historique' },
  '今日/近期安排': { 'ja-JP': '今日・近日', 'ko-KR': '오늘/다가오는 일정', 'es-ES': 'Hoy / próximo', 'fr-FR': 'Aujourd’hui / bientôt' },
  '近期安排': { 'ja-JP': '近日', 'ko-KR': '다가오는 일정', 'es-ES': 'Próximo', 'fr-FR': 'À venir' },
};

function isEnglishLanguage(language?: string) {
  return (language || '').toLowerCase().startsWith('en');
}

function planFilterLabel(key: PlanFilterKey, fallback: string, language?: string): string {
  return localeText(language, {
    'zh-CN': fallback,
    'en-US': PLAN_FILTER_LABELS_EN[key],
    'ja-JP': PLAN_FILTER_LABELS_MULTI[key]['ja-JP'],
    'ko-KR': PLAN_FILTER_LABELS_MULTI[key]['ko-KR'],
    'es-ES': PLAN_FILTER_LABELS_MULTI[key]['es-ES'],
    'fr-FR': PLAN_FILTER_LABELS_MULTI[key]['fr-FR'],
  });
}

function planText(text: string | undefined, language?: string): string {
  if (!text) return '';
  const locale = (language || 'zh-CN').toLowerCase();
  if (locale.startsWith('zh')) return text;
  if (locale.startsWith('en')) {
    if (PLAN_TEXT_EN[text]) return PLAN_TEXT_EN[text];
    return text
      .replace(/AI建档方案/g, 'AI Profile Plan')
      .replace(/幼儿园小班智能日程优化方案/g, 'Kindergarten Schedule Optimization Plan')
      .replace(/日常作息/g, 'Daily Routine')
      .replace(/目标型计划/g, 'Goal Plan')
      .replace(/周期习惯计划/g, 'Recurring Habit Plan')
      .replace(/日程安排计划/g, 'Schedule Plan')
      .replace(/总计划/g, 'Master Plan')
      .replace(/子计划/g, 'Sub-plan')
      .replace(/个事项/g, 'items')
      .replace(/个心愿/g, 'wishes')
      .replace(/个子计划/g, 'sub-plans')
      .replace(/(\d+)\s*项/g, '$1 items')
      .replace(/包含/g, 'Includes')
      .replace(/当前有\s*(\d+)\s*个近期安排需要继续推进。/g, '$1 upcoming actions need attention.')
      .replace(/继续推进/g, 'Keep going')
      .replace(/查看日程落地/g, 'View Schedule Actions');
  }
  const supported = locale.startsWith('ja') ? 'ja-JP' : locale.startsWith('ko') ? 'ko-KR' : locale.startsWith('es') ? 'es-ES' : 'fr-FR';
  if (PLAN_TEXT_MULTI[text]?.[supported]) return PLAN_TEXT_MULTI[text]?.[supported] || text;
  return text
    .replace(/AI建档方案/g, PLAN_TEXT_MULTI['AI建档方案']?.[supported] || 'AI Profile Plan')
    .replace(/幼儿园小班智能日程优化方案/g, PLAN_TEXT_MULTI['幼儿园小班智能日程优化方案']?.[supported] || 'Kindergarten Schedule Optimization Plan')
    .replace(/日常作息/g, PLAN_TEXT_MULTI['日常作息']?.[supported] || 'Daily Routine')
    .replace(/目标型计划/g, PLAN_TEXT_MULTI['目标型计划']?.[supported] || 'Goal Plan')
    .replace(/周期习惯计划/g, PLAN_TEXT_MULTI['周期习惯计划']?.[supported] || 'Recurring Habit Plan')
    .replace(/日程安排计划/g, PLAN_TEXT_MULTI['日程安排计划']?.[supported] || 'Schedule Plan')
    .replace(/总计划/g, PLAN_TEXT_MULTI['总计划']?.[supported] || 'Master Plan')
    .replace(/子计划/g, PLAN_TEXT_MULTI['子计划']?.[supported] || 'Sub-plan')
    .replace(/个事项/g, supported === 'ja-JP' ? '項目' : supported === 'ko-KR' ? '개 항목' : supported === 'es-ES' ? ' elementos' : ' éléments')
    .replace(/个心愿/g, supported === 'ja-JP' ? '個の願い' : supported === 'ko-KR' ? '개 소원' : supported === 'es-ES' ? ' deseos' : ' souhaits')
    .replace(/个子计划/g, supported === 'ja-JP' ? '個のサブプラン' : supported === 'ko-KR' ? '개 하위 계획' : supported === 'es-ES' ? ' subplanes' : ' sous-plans')
    .replace(/(\d+)\s*项/g, supported === 'ja-JP' ? '$1項目' : supported === 'ko-KR' ? '$1개 항목' : supported === 'es-ES' ? '$1 elementos' : '$1 éléments')
    .replace(/包含/g, supported === 'ja-JP' ? '含む' : supported === 'ko-KR' ? '포함' : supported === 'es-ES' ? 'Incluye' : 'Inclut')
    .replace(/当前有\s*(\d+)\s*个近期安排需要继续推进。/g, supported === 'ja-JP' ? '近日中の予定が$1件あります。' : supported === 'ko-KR' ? '다가오는 일정 $1개가 있습니다.' : supported === 'es-ES' ? 'Hay $1 acciones próximas.' : '$1 actions à venir.')
    .replace(/继续推进/g, supported === 'ja-JP' ? '続ける' : supported === 'ko-KR' ? '계속 진행' : supported === 'es-ES' ? 'Continuar' : 'Continuer')
    .replace(/AI建档方案/g, 'AI Profile Plan')
    .replace(/查看日程落地/g, PLAN_TEXT_MULTI['查看日程落地']?.[supported] || 'View Schedule Actions');
}

const PLAN_ACCENT_CLASS: Record<PlanExperienceSummary['accent'], string> = {
  primary: 'bg-primary/5 text-primary border-primary/10',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  blue: 'bg-sky-50 text-sky-700 border-sky-100',
  purple: 'bg-violet-50 text-violet-700 border-violet-100',
};

const PLAN_ACCENT_BAR_CLASS: Record<PlanExperienceSummary['accent'], string> = {
  primary: 'bg-primary',
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  blue: 'bg-sky-500',
  purple: 'bg-violet-500',
};

function PlanCenterSummary({ overview }: { overview: PlanCenterOverview }) {
  const { t, i18n } = useTranslation();
  const stats = [
    { label: t('plans.center_ai_profile', planFilterLabel('onboarding', 'AI建档', i18n.language)), value: overview.onboardingPlans, icon: Sparkles, tone: 'green' as const },
    { label: t('plans.center_vacation', planFilterLabel('holiday', '假期', i18n.language)), value: overview.holidayPlans, icon: CalendarDays, tone: 'amber' as const },
    { label: t('plans.center_goal', planFilterLabel('goal', '目标', i18n.language)), value: overview.goalPlans, icon: Flag, tone: 'purple' as const },
    { label: t('plans.center_active', localeText(i18n.language, { 'zh-CN': '运行中', 'en-US': 'Active', 'ja-JP': '実行中', 'ko-KR': '진행 중', 'es-ES': 'Activo', 'fr-FR': 'Actif' })), value: overview.runningPlans, icon: ClipboardCheck, tone: 'primary' as const },
  ];

  return (
    <section className="ui-ai-subpage-panel rounded-3xl bg-white p-4 shadow-sm border border-outline-variant/10">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Layers size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/35">
                {t('plans.center_title', localeText(i18n.language, { 'zh-CN': '家庭方案中心', 'en-US': 'Family Plan Center', 'ja-JP': '家族プランセンター', 'ko-KR': '가족 계획 센터', 'es-ES': 'Centro de planes familiares', 'fr-FR': 'Centre des plans familiaux' }))}
              </p>
              <h2 className="mt-1 text-lg font-black text-on-surface">
                {t('plans.center_subtitle', localeText(i18n.language, { 'zh-CN': '把计划变成可执行安排', 'en-US': 'Turn plans into action', 'ja-JP': '計画を実行に移す', 'ko-KR': '계획을 실행으로 연결', 'es-ES': 'Convierte planes en acciones', 'fr-FR': 'Transformer les plans en actions' }))}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-primary leading-none">{overview.totalPlans}</p>
              <p className="mt-1 text-[10px] font-bold text-on-surface-variant/40">
                {t('plans.center_count_unit', localeText(i18n.language, { 'zh-CN': '个方案', 'en-US': 'plans', 'ja-JP': '件', 'ko-KR': '개', 'es-ES': 'planes', 'fr-FR': 'plans' }))}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs font-bold leading-relaxed text-on-surface-variant/60">
            {localeText(i18n.language, {
              'zh-CN': overview.nextFocus,
              'en-US': `${overview.runningPlans} active plan${overview.runningPlans === 1 ? '' : 's'} need attention. Keep routine and recurring practice stable first.`,
              'ja-JP': `${overview.runningPlans}件の実行中プランがあります。まず日常リズムと反復練習を安定させましょう。`,
              'ko-KR': `진행 중인 계획 ${overview.runningPlans}개가 있어요. 먼저 일상 리듬과 반복 연습을 안정화하세요.`,
              'es-ES': `Hay ${overview.runningPlans} planes activos. Prioriza la rutina y la práctica recurrente.`,
              'fr-FR': `${overview.runningPlans} plans actifs demandent attention. Stabilisez d’abord la routine et la pratique régulière.`,
            })}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn('rounded-2xl border p-2', PLAN_ACCENT_CLASS[stat.tone])}>
              <div className="flex items-center justify-between">
                <Icon size={14} />
                <span className="text-sm font-black">{stat.value}</span>
              </div>
              <div className={cn('my-2 h-1 rounded-full', PLAN_ACCENT_BAR_CLASS[stat.tone])} />
              <p className="text-[10px] font-black">{stat.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Plans() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const ui = (copy: LocaleText) => planCopy(i18n.language, copy);
  const { familyId, guestMode, tasks, rewards } = useFamily();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState<string | null>(null);
  const [creationStep, setCreationStep] = useState<PlanCreationStep>('intent');
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanKind, setNewPlanKind] = useState<PlanKind>('routine');
  const [newParentPlanId, setNewParentPlanId] = useState('');
  const [planKindManuallySelected, setPlanKindManuallySelected] = useState(false);
  const [planNeedText, setPlanNeedText] = useState('');
  const [planTimeText, setPlanTimeText] = useState('');
  const [planConstraintText, setPlanConstraintText] = useState('');
  const [planSuccessText, setPlanSuccessText] = useState('');
  const [goalFinalGoal, setGoalFinalGoal] = useState('');
  const [goalFrequency, setGoalFrequency] = useState('每周 5 次');
  const [goalMinutes, setGoalMinutes] = useState(30);
  const [goalPracticeTime, setGoalPracticeTime] = useState('19:00');
  const [goalTargetDate, setGoalTargetDate] = useState(defaultGoalTargetDate(6));
  const [goalMilestones, setGoalMilestones] = useState<GoalPlanMetadata['milestones']>([]);
  const [goalOptimizationHint, setGoalOptimizationHint] = useState('');
  const [activeFilter, setActiveFilter] = useState<PlanFilterKey>('all');
  const [separateWishes, setSeparateWishes] = useState(false);
  const containerPlans = plans.filter(plan => !plan.parentPlanId && plan.kind === 'container');
  const overview = buildPlanCenterOverview(plans.map(plan => plan.experience));
  const visiblePlans = activeFilter === 'all'
    ? plans
    : plans.filter(plan => plan.experience.category === activeFilter);
  const currentTemplates = GUIDED_PLAN_TEMPLATES[newPlanKind]?.length
    ? GUIDED_PLAN_TEMPLATES[newPlanKind]
    : GUIDED_PLAN_TEMPLATES.routine;

  useEffect(() => {
    if (familyId) {
      loadPlans();
    }
  }, [familyId, tasks, rewards]);

  async function loadPlans() {
    setLoading(true);
    const mapPlan = (
      p: { id: string; name: string; type: string; metadata?: Record<string, unknown> },
      hierarchyInputs: Array<{ id: string; name: string; type?: string; kind?: string; parentPlanId?: string }> = [],
    ) => {
      const planTasks = tasks.filter(task => task.planId === p.id);
      const planRewards = rewards.filter(reward => reward.planId === p.id);
      const planKind = inferPlanKind({
        kind: p.metadata?.kind as string | undefined,
        type: p.type,
        name: p.name,
      });
      const progress = calculatePlanProgress(planTasks, planRewards);
      const displaySummary = buildPlanDisplaySummary(planKind, progress);
      const hierarchySummary = buildPlanHierarchySummary(p.id, hierarchyInputs);
      const experience = buildPlanExperienceSummary({
        id: p.id,
        name: p.name,
        type: p.type,
        kind: planKind,
        metadata: p.metadata,
        progress,
        hierarchySummary,
      });
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        targetCount: planTasks.length,
        wishCount: planRewards.length,
        progress,
        displaySummary,
        hierarchySummary,
        kind: planKind,
        kindLabel: experience.categoryLabel,
        usesOutcomeProgress: PLAN_KIND_DEFINITIONS[planKind].usesOutcomeProgress,
        parentPlanId: getPlanParentId(p as any),
        metadata: p.metadata,
        experience,
      };
    };
    if (guestMode) {
      const guestPlans = getGuestPlans();
      const hierarchyInputs = guestPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        type: plan.type,
        kind: plan.metadata?.kind as string | undefined,
        parentPlanId: getPlanParentId(plan),
      }));
      setPlans(guestPlans.map((p) => mapPlan(p, hierarchyInputs)));
      setLoading(false);
      return;
    }
    const dataLayer = getDataLayer();
    const localPlans = await dataLayer.getPlans();
    const hierarchyInputs = localPlans.map(plan => ({
      id: plan.id,
      name: plan.name,
      type: plan.type,
      kind: plan.metadata?.kind as string | undefined,
      parentPlanId: getPlanParentId(plan),
    }));
    setPlans(localPlans.map((p) => mapPlan(p, hierarchyInputs)));
    setLoading(false);
  }

  async function handleAddPlan() {
    const draftedPlan = buildGuidedPlanDraft({
      name: newPlanName,
      kind: newPlanKind,
      need: planNeedText,
      time: planTimeText,
      constraint: planConstraintText,
      success: planSuccessText,
    });
    if (!draftedPlan.name.trim() || !familyId) return;
    const goalPlan = buildGoalPlanMetadata({
      kind: newPlanKind,
      finalGoal: goalFinalGoal || draftedPlan.successText || draftedPlan.name,
      practiceFrequency: goalFrequency,
      practiceMinutes: goalMinutes,
      practiceTime: goalPracticeTime,
      targetDate: goalTargetDate,
      milestones: goalMilestones,
      optimizationHint: goalOptimizationHint,
    });

    if (guestMode) {
      // 游客模式：不走数据库，保存到本机计划库
      const planName = draftedPlan.name.trim();
      const planType = PLAN_PRESETS.includes(planName) ? planName : '自定义';
      const planId = `guest-${Date.now()}`;
      saveGuestPlan({
        id: planId,
        name: planName,
        type: planType,
        metadata: {
          kind: newPlanKind,
          planningBrief: draftedPlan,
          ...(goalPlan ? { goalPlan } : {}),
          ...(newParentPlanId ? { parentPlanId: newParentPlanId } : {}),
        },
        sortOrder: Date.now(),
      });
      setNewPlanName('');
      setNewPlanKind('routine');
      setNewParentPlanId('');
      setPlanKindManuallySelected(false);
      resetGuidedPlanForm();
      resetGoalPlanForm();
      setShowAddDialog(false);
      setCreationStep('intent');
      await loadPlans();
      navigate(`/plans/${planId}?from=guided-draft`);
      return;
    }
    
    const data = await getDataLayer().addPlan({
      name: draftedPlan.name.trim(),
      type: PLAN_PRESETS.includes(draftedPlan.name.trim()) ? draftedPlan.name.trim() : '自定义',
      metadata: {
        kind: newPlanKind,
        planningBrief: draftedPlan,
        ...(goalPlan ? { goalPlan } : {}),
        ...(newParentPlanId ? { parentPlanId: newParentPlanId } : {}),
      },
      sortOrder: plans.length,
    });
    
    setNewPlanName('');
    setNewPlanKind('routine');
    setNewParentPlanId('');
    setPlanKindManuallySelected(false);
    resetGuidedPlanForm();
    resetGoalPlanForm();
    setShowAddDialog(false);
    setCreationStep('intent');
    navigate(`/plans/${data.id}?from=guided-draft`);
  }

  function applyGoalTemplate(template: typeof GOAL_PLAN_TEMPLATES[number]) {
    setNewPlanName(template.title);
    setNewPlanKind('goal');
    setPlanKindManuallySelected(true);
    setGoalFinalGoal(template.finalGoal);
    setGoalFrequency(template.practiceFrequency);
    setGoalMinutes(template.practiceMinutes);
    setGoalPracticeTime(template.practiceTime);
    setGoalTargetDate(defaultGoalTargetDate(template.months));
    setGoalMilestones(template.milestones);
    setGoalOptimizationHint(template.optimizationHint);
  }

  function applyGuidedPlanTemplate(template: GuidedPlanTemplate) {
    setNewPlanKind(template.kind);
    setPlanKindManuallySelected(true);
    setNewPlanName(template.name);
    setPlanNeedText(template.need);
    setPlanTimeText(template.time);
    setPlanConstraintText(template.constraint);
    setPlanSuccessText(template.success);
    if (template.goal) {
      setGoalFinalGoal(template.goal.finalGoal);
      setGoalFrequency(template.goal.frequency);
      setGoalMinutes(template.goal.minutes);
      setGoalPracticeTime(template.goal.practiceTime);
      setGoalTargetDate(defaultGoalTargetDate(template.goal.months));
      setGoalMilestones([]);
      setGoalOptimizationHint('');
    } else {
      resetGoalPlanForm();
    }
  }

  function applyCustomGuidedPlan() {
    setPlanKindManuallySelected(true);
    setNewPlanName('');
    resetGuidedPlanForm();
    resetGoalPlanForm();
  }

  function resetGoalPlanForm() {
    setGoalFinalGoal('');
    setGoalFrequency('每周 5 次');
    setGoalMinutes(30);
    setGoalPracticeTime('19:00');
    setGoalTargetDate(defaultGoalTargetDate(6));
    setGoalMilestones([]);
    setGoalOptimizationHint('');
  }

  function resetGuidedPlanForm() {
    setPlanNeedText('');
    setPlanTimeText('');
    setPlanConstraintText('');
    setPlanSuccessText('');
  }

  function openAddPlanDialog() {
    setCreationStep('intent');
    setShowAddDialog(true);
  }

  function choosePlanScenario(kind: PlanKind) {
    const template = GUIDED_PLAN_TEMPLATES[kind]?.[0] || GUIDED_PLAN_TEMPLATES.routine[0];
    applyGuidedPlanTemplate(template);
    setCreationStep('details');
  }

  async function handleDeletePlan(id: string) {
    if (guestMode) {
      deleteGuestPlan(id);
      setPlans(prev => prev.filter(plan => plan.id !== id));
      return;
    }
    await getDataLayer().deletePlan(id);
    loadPlans();
  }

  return (
    <div className="ui-ai-subpage min-h-screen bg-surface-container-low">
      {/* Header */}
      <TopAppBar
        title={t('plans.title', localeText(i18n.language, { 'zh-CN': '计划', 'en-US': 'Plans', 'ja-JP': '計画', 'ko-KR': '계획', 'es-ES': 'Planes', 'fr-FR': 'Plans' }))}
      />

      <div className="p-4 space-y-3">
        {!loading && (
          <PlanCenterSummary overview={overview} />
        )}

        {!loading && plans.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {PLAN_FILTERS.map(filter => {
              const active = activeFilter === filter.key;
              const count = filter.key === 'all'
                ? plans.length
                : plans.filter(plan => plan.experience.category === filter.key).length;
              return (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key)}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-2 text-xs font-black transition-all',
                    active
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-outline-variant/10 bg-white text-on-surface-variant/55'
                  )}
                >
                  {planFilterLabel(filter.key, filter.label, i18n.language)}
                  <span className={cn('ml-1 text-[10px]', active ? 'text-white/80' : 'text-on-surface-variant/35')}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {visiblePlans.map((plan) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="ui-ai-subpage-card bg-white rounded-2xl p-4 shadow-sm border border-outline-variant/10 active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => navigate(`/plans/${plan.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-black text-base text-on-surface">{planText(plan.name, i18n.language)}</h3>
                    <span className={cn(
                      'mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black',
                      PLAN_ACCENT_CLASS[plan.experience.accent]
                    )}>
                      {planText(plan.kindLabel, i18n.language)}
                    </span>
                    {plan.parentPlanId && (
                      <span className="ml-1 mt-1 inline-flex rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-black text-on-surface-variant/50">
                        {t('plans.sub_plan_badge', localeText(i18n.language, { 'zh-CN': '子计划', 'en-US': 'Sub-plan', 'ja-JP': 'サブ計画', 'ko-KR': '하위 계획', 'es-ES': 'Subplan', 'fr-FR': 'Sous-plan' }))}
                      </span>
                    )}
                    <p className="mt-2 text-xs font-bold leading-relaxed text-on-surface-variant/60">
                      {planText(plan.experience.headline, i18n.language)}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <div className="flex items-center gap-1">
                        <Target size={14} className="text-primary" />
                        <span className="text-xs font-bold text-on-surface-variant/60">
                          {plan.targetCount} {t('plans.targets', localeText(i18n.language, { 'zh-CN': '个事项', 'en-US': 'items', 'ja-JP': '項目', 'ko-KR': '개 항목', 'es-ES': 'ítems', 'fr-FR': 'éléments' }))}
                        </span>
                      </div>
                      {(separateWishes || plan.wishCount > 0) && (
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber-500" />
                          <span className="text-xs font-bold text-on-surface-variant/60">
                            {plan.wishCount} {t('plans.wishes', localeText(i18n.language, { 'zh-CN': '个心愿', 'en-US': 'wishes', 'ja-JP': '願い', 'ko-KR': '개 소원', 'es-ES': 'deseos', 'fr-FR': 'souhaits' }))}
                          </span>
                        </div>
                      )}
                    </div>
                    {plan.displaySummary.showOutcomeProgress ? (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-on-surface-variant/40">
                            {planText(plan.displaySummary.primaryLabel, i18n.language)} {planText(String(plan.displaySummary.secondaryValue), i18n.language)}
                          </span>
                          <span className="text-[10px] font-black text-primary">
                            {planText(String(plan.displaySummary.primaryValue), i18n.language)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${plan.progress.progressPercent}%` }} />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-2xl bg-surface-container-low p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-on-surface-variant/40 block">{planText(plan.experience.primaryMetricLabel, i18n.language)}</span>
                            <span className="text-sm font-black text-on-surface">{planText(String(plan.experience.primaryMetricValue), i18n.language)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-on-surface-variant/40 block">{planText(plan.experience.secondaryMetricLabel, i18n.language)}</span>
                            <span className="text-sm font-black text-on-surface">{planText(String(plan.experience.secondaryMetricValue), i18n.language)}</span>
                          </div>
                        </div>
                        <p className="text-[10px] font-bold text-on-surface-variant/50 leading-relaxed mt-2">
                          {planText(plan.experience.nextActionHint, i18n.language)}
                        </p>
                      </div>
                    )}
                    <div className={cn(
                      'mt-2 flex items-center justify-between rounded-2xl border px-3 py-2',
                      PLAN_ACCENT_CLASS[plan.experience.accent]
                    )}>
                      <span className="text-[10px] font-black">{planText(plan.experience.nextActionLabel, i18n.language)}</span>
                      <ChevronRight size={14} />
                    </div>
                    {plan.hierarchySummary.childPlanCount > 0 && (
                      <div className="mt-2 rounded-2xl bg-primary/5 p-3">
                        <p className="text-[10px] font-black text-primary">
                          {localeText(i18n.language, {
                            'zh-CN': `包含 ${plan.hierarchySummary.childPlanCount} 个子计划`,
                            'en-US': `Includes ${plan.hierarchySummary.childPlanCount} sub-plans`,
                            'ja-JP': `${plan.hierarchySummary.childPlanCount}件のサブ計画を含む`,
                            'ko-KR': `하위 계획 ${plan.hierarchySummary.childPlanCount}개 포함`,
                            'es-ES': `Incluye ${plan.hierarchySummary.childPlanCount} subplanes`,
                            'fr-FR': `Inclut ${plan.hierarchySummary.childPlanCount} sous-plans`,
                          })}
                        </p>
                        <p className="text-[10px] font-bold text-primary/70 leading-relaxed mt-1">
                          {plan.hierarchySummary.childNames.slice(0, 3).join(localeText(i18n.language, { 'zh-CN': '、', 'en-US': ', ', 'ja-JP': '、', 'ko-KR': ', ', 'es-ES': ', ', 'fr-FR': ', ' }))}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                      className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-400 active:scale-90 transition-transform"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant/40 active:scale-90 transition-transform">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {visiblePlans.length === 0 && plans.length > 0 && !loading && (
          <div className="text-center py-10 rounded-3xl bg-white border border-outline-variant/10">
            <LayoutGrid size={40} className="mx-auto text-outline-variant/30 mb-3" />
            <p className="text-sm font-bold text-on-surface-variant/45">
              {t('plans.empty_filter', localeText(i18n.language, { 'zh-CN': '当前分类下还没有计划', 'en-US': 'No plans in this category yet', 'ja-JP': 'このカテゴリにはまだ計画がありません', 'ko-KR': '이 분류에는 아직 계획이 없습니다', 'es-ES': 'Aún no hay planes en esta categoría', 'fr-FR': 'Aucun plan dans cette catégorie' }))}
            </p>
          </div>
        )}

        {plans.length === 0 && !loading && (
          <div className="text-center py-12">
            <LayoutGrid size={48} className="mx-auto text-outline-variant/30 mb-3" />
            <p className="text-sm font-bold text-on-surface-variant/40">{t('plans.no_plans', '暂无计划，点击下方按钮创建')}</p>
          </div>
        )}

        <button
          onClick={openAddPlanDialog}
          className="w-full py-4 rounded-2xl bg-primary flex items-center justify-center gap-2 text-white font-black text-sm active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} strokeWidth={3} />
          <span>{t('plans.create_new', localeText(i18n.language, { 'zh-CN': '创建新计划', 'en-US': 'Create Plan', 'ja-JP': '計画を作成', 'ko-KR': '계획 만들기', 'es-ES': 'Crear plan', 'fr-FR': 'Créer un plan' }))}</span>
        </button>

        <button
          onClick={() => navigate('/community/templates')}
          className="w-full py-3.5 rounded-2xl bg-white border border-outline-variant/10 flex items-center justify-center gap-2 text-primary font-black text-sm active:scale-[0.98] transition-all shadow-sm"
        >
          <Users size={18} />
          <span>{t('plans.community_templates', localeText(i18n.language, { 'zh-CN': '参考其他家庭的安排', 'en-US': 'Explore Community Templates', 'ja-JP': '他の家庭のテンプレートを見る', 'ko-KR': '다른 가족 템플릿 보기', 'es-ES': 'Ver plantillas de la comunidad', 'fr-FR': 'Voir les modèles de la communauté' }))}</span>
        </button>
      </div>

      {/* Add plan modal */}
      <AnimatePresence>
        {showAddDialog && (
          <AppModal
            open={showAddDialog}
            onClose={() => {
              setShowAddDialog(false);
              setCreationStep('intent');
            }}
            title={creationStep === 'intent'
              ? ui({ 'zh-CN': '先说清楚想安排什么', 'en-US': 'Start with the real need', 'ja-JP': 'まず目的を整理', 'ko-KR': '먼저 필요한 점 정리', 'es-ES': 'Aclaremos la necesidad', 'fr-FR': 'Clarifions le besoin' })
              : creationStep === 'details'
                ? ui({ 'zh-CN': '把需求补充完整', 'en-US': 'Complete the details', 'ja-JP': '詳細を補足', 'ko-KR': '세부 정보를 채우기', 'es-ES': 'Completa los detalles', 'fr-FR': 'Compléter les détails' })
                : ui({ 'zh-CN': '确认计划草案', 'en-US': 'Review the draft plan', 'ja-JP': '計画案を確認', 'ko-KR': '계획 초안 확인', 'es-ES': 'Revisa el borrador', 'fr-FR': 'Vérifier le brouillon' })}
            surface="sheet"
            zIndexClass="z-[120]"
            className="max-h-[86svh]"
            bodyClassName="px-6 py-5"
          >
            {creationStep === 'intent' && (
              <>
              <div className="mb-5 rounded-3xl bg-primary/5 p-4">
                <p className="text-sm font-black text-on-surface">{ui({ 'zh-CN': '先不要急着创建计划', 'en-US': 'Do not create it too fast', 'ja-JP': '急いで作らなくて大丈夫', 'ko-KR': '너무 빨리 만들 필요는 없어요', 'es-ES': 'No lo crees demasiado rápido', 'fr-FR': 'Ne créez pas trop vite' })}</p>
                <p className="mt-1 text-xs font-bold leading-relaxed text-on-surface-variant/60">
                  {ui({ 'zh-CN': '像跟家庭管家说话一样，先选一个最接近的方向。下一步我会继续问清楚目标、时间、限制和验收方式，再生成计划草案。', 'en-US': 'Choose the closest situation first, like talking to a family steward. Next I will ask about goals, time, limits, and what counts as success before making a draft.', 'ja-JP': '家庭アシスタントに話すように、近い方向を選んでください。次に目標、時間、制約、達成基準を確認してから草案を作ります。', 'ko-KR': '가족 매니저에게 말하듯 가장 가까운 방향을 먼저 고르세요. 다음 단계에서 목표, 시간, 제한, 성공 기준을 확인한 뒤 초안을 만듭니다.', 'es-ES': 'Elige primero la situación más cercana, como si hablaras con el gestor familiar. Luego aclararemos meta, tiempo, límites y éxito antes de crear el borrador.', 'fr-FR': 'Choisissez d’abord la situation la plus proche, comme avec un assistant famille. Ensuite nous préciserons objectif, temps, limites et réussite avant de créer un brouillon.' })}
                </p>
              </div>

              <div className="mb-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => choosePlanScenario('goal')}
                  className={cn(
                    'rounded-3xl border-2 p-4 text-left transition-all',
                    newPlanKind === 'goal' ? 'border-primary bg-primary/5' : 'border-outline-variant/10 bg-white'
                  )}
                >
                  <p className="text-sm font-black text-on-surface">{ui({ 'zh-CN': '想达成一个明确目标', 'en-US': 'Reach a clear goal', 'ja-JP': '明確な目標を達成したい', 'ko-KR': '명확한 목표를 이루고 싶어요', 'es-ES': 'Lograr una meta clara', 'fr-FR': 'Atteindre un objectif clair' })}</p>
                  <p className="mt-1 text-xs font-bold text-on-surface-variant/55 leading-relaxed">
                    {ui({ 'zh-CN': '例如钢琴考级、读完 20 本书、数学期末提升。适合做进度条和里程碑。', 'en-US': 'For example: piano exam, finish 20 books, improve math by term end. Best for progress and milestones.', 'ja-JP': '例：ピアノ検定、20冊読破、算数の期末対策。進捗とマイルストーンに向いています。', 'ko-KR': '예: 피아노 급수, 책 20권 읽기, 수학 학기말 향상. 진행률과 마일스톤에 적합합니다.', 'es-ES': 'Por ejemplo: examen de piano, leer 20 libros o mejorar matemáticas. Ideal para progreso e hitos.', 'fr-FR': 'Exemples : examen de piano, lire 20 livres, progresser en maths. Idéal pour les étapes et la progression.' })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => choosePlanScenario('cycle')}
                  className={cn(
                    'rounded-3xl border-2 p-4 text-left transition-all',
                    newPlanKind === 'cycle' ? 'border-primary bg-primary/5' : 'border-outline-variant/10 bg-white'
                  )}
                >
                  <p className="text-sm font-black text-on-surface">{ui({ 'zh-CN': '想固定一件事的频率', 'en-US': 'Keep a steady rhythm', 'ja-JP': '一定の頻度で続けたい', 'ko-KR': '일정한 리듬으로 유지하고 싶어요', 'es-ES': 'Mantener un ritmo fijo', 'fr-FR': 'Garder un rythme régulier' })}</p>
                  <p className="mt-1 text-xs font-bold text-on-surface-variant/55 leading-relaxed">
                    {ui({ 'zh-CN': '例如每周练琴 4 次、跳绳每天 10 分钟、每周两次游泳。重点看坚持节奏。', 'en-US': 'For example: piano 4 times a week, jump rope 10 minutes daily, swim twice weekly. Best for consistency.', 'ja-JP': '例：週4回ピアノ、毎日10分縄跳び、週2回水泳。継続リズムを重視します。', 'ko-KR': '예: 주 4회 피아노, 매일 줄넘기 10분, 주 2회 수영. 꾸준함을 봅니다.', 'es-ES': 'Por ejemplo: piano 4 veces por semana, saltar 10 minutos al día o nadar dos veces por semana.', 'fr-FR': 'Exemples : piano 4 fois par semaine, corde à sauter 10 minutes par jour, natation deux fois par semaine.' })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => choosePlanScenario('routine')}
                  className={cn(
                    'rounded-3xl border-2 p-4 text-left transition-all',
                    newPlanKind === 'routine' ? 'border-primary bg-primary/5' : 'border-outline-variant/10 bg-white'
                  )}
                >
                  <p className="text-sm font-black text-on-surface">{ui({ 'zh-CN': '想安排一段时间的日程', 'en-US': 'Arrange a time period', 'ja-JP': '一定期間の予定を組みたい', 'ko-KR': '기간별 일정을 짜고 싶어요', 'es-ES': 'Organizar un periodo', 'fr-FR': 'Organiser une période' })}</p>
                  <p className="mt-1 text-xs font-bold text-on-surface-variant/55 leading-relaxed">
                    {ui({ 'zh-CN': '例如工作日、周末、寒暑假、学期安排。重点是让每天更顺。', 'en-US': 'For example: weekdays, weekends, vacations, or a school term. Best for making each day smoother.', 'ja-JP': '例：平日、週末、長期休み、学期予定。毎日をスムーズにするための計画です。', 'ko-KR': '예: 평일, 주말, 방학, 학기 일정. 매일을 더 편하게 만드는 데 초점이 있습니다.', 'es-ES': 'Por ejemplo: días de clase, fines de semana, vacaciones o semestre. Sirve para que cada día fluya mejor.', 'fr-FR': 'Exemples : jours d’école, week-ends, vacances ou trimestre. Le but est de fluidifier chaque journée.' })}
                  </p>
                </button>
              </div>
              </>
            )}

            {creationStep === 'details' && (
              <>
              <div className="mb-5">
                <label className="mb-2 block text-xs font-black text-on-surface">{ui({ 'zh-CN': '先选一个最接近的常见情况', 'en-US': 'Pick the closest common situation', 'ja-JP': '近い例を選択', 'ko-KR': '가장 가까운 상황 선택', 'es-ES': 'Elige el caso más parecido', 'fr-FR': 'Choisissez le cas le plus proche' })}</label>
                <select
                  value={currentTemplates.find(template => template.name === newPlanName)?.title || '__custom'}
                  onChange={event => {
                    if (event.target.value === '__custom') {
                      applyCustomGuidedPlan();
                      return;
                    }
                    const picked = currentTemplates.find(template => template.title === event.target.value);
                    if (picked) applyGuidedPlanTemplate(picked);
                  }}
                  className="w-full rounded-2xl border-2 border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm font-black text-on-surface outline-none transition-colors focus:border-primary"
                >
                  {currentTemplates.map(template => (
                    <option key={template.title} value={template.title}>{template.title}</option>
                  ))}
                  <option value="__custom">{ui({ 'zh-CN': '自定义', 'en-US': 'Custom', 'ja-JP': 'カスタム', 'ko-KR': '직접 입력', 'es-ES': 'Personalizado', 'fr-FR': 'Personnalisé' })}</option>
                </select>
              </div>

              <input
                autoFocus
                value={newPlanName}
                onChange={(e) => {
                  const nextName = e.target.value;
                  setNewPlanName(nextName);
                  if (!planKindManuallySelected) {
                    setNewPlanKind(inferPlanKind({ name: nextName }));
                  }
                }}
                placeholder={ui({ 'zh-CN': '给这个计划起个容易懂的名字', 'en-US': 'Give this plan a simple name', 'ja-JP': 'わかりやすい計画名を入力', 'ko-KR': '이해하기 쉬운 계획 이름', 'es-ES': 'Ponle un nombre sencillo', 'fr-FR': 'Donnez un nom simple au plan' })}
                className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary transition-colors mb-4"
              />

              <div className="space-y-3 mb-5">
                <GuidedPlanQuestion
                  label={ui({ 'zh-CN': '你最想解决什么问题？', 'en-US': 'What problem do you most want to solve?', 'ja-JP': '一番解決したいことは？', 'ko-KR': '가장 해결하고 싶은 문제는?', 'es-ES': '¿Qué quieres resolver primero?', 'fr-FR': 'Quel problème voulez-vous résoudre ?' })}
                  value={planNeedText}
                  onChange={setPlanNeedText}
                  placeholder={newPlanKind === 'goal' ? ui({ 'zh-CN': '例如：孩子准备钢琴考级，但平时练习不稳定', 'en-US': 'Example: preparing for a piano exam, but practice is not stable', 'ja-JP': '例：ピアノ検定に向けて、普段の練習が安定しない', 'ko-KR': '예: 피아노 급수를 준비하지만 연습이 불규칙함', 'es-ES': 'Ejemplo: prepara un examen de piano, pero practica de forma irregular', 'fr-FR': 'Exemple : préparer un examen de piano, mais les entraînements sont irréguliers' }) : newPlanKind === 'cycle' ? ui({ 'zh-CN': '例如：想把练琴、跳绳或阅读固定下来', 'en-US': 'Example: make piano, jump rope, or reading a stable habit', 'ja-JP': '例：ピアノ、縄跳び、読書を定着させたい', 'ko-KR': '예: 피아노, 줄넘기, 독서를 고정 습관으로 만들기', 'es-ES': 'Ejemplo: fijar piano, salto de cuerda o lectura como hábito', 'fr-FR': 'Exemple : rendre le piano, la corde à sauter ou la lecture réguliers' }) : ui({ 'zh-CN': '例如：寒假不想完全放飞，也不想安排得太满', 'en-US': 'Example: keep winter break balanced, not too loose or too packed', 'ja-JP': '例：冬休みをゆるすぎず詰め込みすぎず過ごしたい', 'ko-KR': '예: 겨울방학을 너무 느슨하지도 빡빡하지도 않게', 'es-ES': 'Ejemplo: vacaciones equilibradas, ni vacías ni demasiado llenas', 'fr-FR': 'Exemple : vacances équilibrées, ni trop libres ni trop chargées' })}
                />
                <GuidedPlanQuestion
                  label={ui({ 'zh-CN': '大概持续多久，频率是什么？', 'en-US': 'How long and how often?', 'ja-JP': '期間と頻度は？', 'ko-KR': '기간과 빈도는?', 'es-ES': '¿Cuánto tiempo y con qué frecuencia?', 'fr-FR': 'Durée et fréquence ?' })}
                  value={planTimeText}
                  onChange={setPlanTimeText}
      placeholder={newPlanKind === 'goal' ? ui({ 'zh-CN': '例如：6 个月，每周练 4 次，每次 30 分钟', 'en-US': 'Example: 6 months, 4 times a week, 30 minutes each', 'ja-JP': '例：6か月、週4回、1回30分', 'ko-KR': '예: 6개월, 주 4회, 매번 30분', 'es-ES': 'Ejemplo: 6 meses, 4 veces por semana, 30 minutos', 'fr-FR': 'Exemple : 6 mois, 4 fois par semaine, 30 minutes' }) : newPlanKind === 'cycle' ? ui({ 'zh-CN': '例如：每周 4 次，平日晚上或周末上午', 'en-US': 'Example: 4 times a week, weekday evenings or weekend mornings', 'ja-JP': '例：週4回、平日夜または週末午前', 'ko-KR': '예: 주 4회, 평일 저녁 또는 주말 오전', 'es-ES': 'Ejemplo: 4 veces por semana, tardes o mañanas de fin de semana', 'fr-FR': 'Exemple : 4 fois par semaine, soir de semaine ou matin de week-end' }) : ui({ 'zh-CN': '例如：整个寒假，工作日和周末分开安排', 'en-US': 'Example: the whole winter break, with separate weekday and weekend rhythms', 'ja-JP': '例：冬休み全体、平日と週末を分けて組みます', 'ko-KR': '예: 겨울방학 전체, 평일과 주말을 나눠 구성', 'es-ES': 'Ejemplo: todas las vacaciones, separando días laborables y fines de semana', 'fr-FR': 'Exemple : toutes les vacances, avec rythme semaine/week-end séparé' })}
                />
                <GuidedPlanQuestion
                  label={ui({ 'zh-CN': '家里有什么现实限制？', 'en-US': 'What real-life limits should we respect?', 'ja-JP': '家庭の現実的な制約は？', 'ko-KR': '현실적인 제한은?', 'es-ES': '¿Qué límites reales hay en casa?', 'fr-FR': 'Quelles limites réelles à la maison ?' })}
                  value={planConstraintText}
                  onChange={setPlanConstraintText}
                  placeholder={ui({ 'zh-CN': '例如：家长工作日陪伴少、孩子作业多、晚上不能太晚', 'en-US': 'Example: parents have little weekday time, homework is heavy, nights cannot be too late', 'ja-JP': '例：平日の親の時間が少ない、宿題が多い、夜遅くできない', 'ko-KR': '예: 평일 부모 시간이 적음, 숙제가 많음, 밤늦게는 어려움', 'es-ES': 'Ejemplo: poco tiempo entre semana, muchos deberes, no terminar muy tarde', 'fr-FR': 'Exemple : peu de temps en semaine, beaucoup de devoirs, pas trop tard le soir' })}
                />
                <GuidedPlanQuestion
                  label={ui({ 'zh-CN': '做到什么程度算满意？', 'en-US': 'What would feel successful?', 'ja-JP': 'どこまでできれば満足？', 'ko-KR': '어느 정도면 만족인가요?', 'es-ES': '¿Qué sería un buen resultado?', 'fr-FR': 'Quel résultat serait satisfaisant ?' })}
                  value={planSuccessText}
                  onChange={setPlanSuccessText}
                  placeholder={newPlanKind === 'goal' ? ui({ 'zh-CN': '例如：通过考级，或能完整演奏两首曲子', 'en-US': 'Example: pass the exam, or play two pieces smoothly', 'ja-JP': '例：検定合格、または2曲を通して演奏できる', 'ko-KR': '예: 급수 통과 또는 두 곡을 끝까지 연주', 'es-ES': 'Ejemplo: aprobar el examen o tocar dos piezas completas', 'fr-FR': 'Exemple : réussir l’examen ou jouer deux morceaux entiers' }) : ui({ 'zh-CN': '例如：连续坚持 4 周，作息稳定，孩子不明显抗拒', 'en-US': 'Example: keep it for 4 weeks, rhythm is stable, and the child does not resist much', 'ja-JP': '例：4週間続き、生活リズムが安定し、子どもが強く嫌がらない', 'ko-KR': '예: 4주 연속 지속, 리듬 안정, 아이가 크게 거부하지 않음', 'es-ES': 'Ejemplo: mantenerlo 4 semanas, ritmo estable y poca resistencia', 'fr-FR': 'Exemple : tenir 4 semaines, rythme stable, peu de résistance' })}
                />
              </div>

              {newPlanKind === 'goal' && (
              <div className="mb-6">
                <p className="text-[10px] font-black text-on-surface-variant/40 mb-2 uppercase tracking-widest">{ui({ 'zh-CN': '直接套用目标模板', 'en-US': 'Use a goal template', 'ja-JP': '目標テンプレートを使う', 'ko-KR': '목표 템플릿 사용', 'es-ES': 'Usar plantilla de meta', 'fr-FR': 'Utiliser un modèle d’objectif' })}</p>
                <div className="grid gap-2">
                  {GOAL_PLAN_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => applyGoalTemplate(template)}
                      className={cn(
                        'rounded-2xl border-2 p-3 text-left transition-all',
                        newPlanName === template.title
                          ? 'border-primary bg-primary/5'
                          : 'border-outline-variant/10 bg-white'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-on-surface">{template.title}</span>
                        <span className="rounded-full bg-primary-container/20 px-2 py-0.5 text-[9px] font-black text-primary">
                          {template.practiceFrequency}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-on-surface-variant/55 leading-relaxed mt-1">
                        {template.finalGoal} · {ui({ 'zh-CN': '单次', 'en-US': 'each', 'ja-JP': '1回', 'ko-KR': '1회', 'es-ES': 'cada vez', 'fr-FR': 'par séance' })} {template.practiceMinutes} {ui({ 'zh-CN': '分钟', 'en-US': 'min', 'ja-JP': '分', 'ko-KR': '분', 'es-ES': 'min', 'fr-FR': 'min' })} · {template.milestones.length} {ui({ 'zh-CN': '个里程碑', 'en-US': 'milestones', 'ja-JP': '個のマイルストーン', 'ko-KR': '개 마일스톤', 'es-ES': 'hitos', 'fr-FR': 'jalons' })}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              )}

              {newPlanKind === 'goal' && (
                <div className="mb-6 rounded-3xl bg-surface-container-low p-4">
                  <p className="text-[10px] font-black text-on-surface-variant/40 mb-3 uppercase tracking-widest">{ui({ 'zh-CN': '把目标说清楚', 'en-US': 'Make the goal clear', 'ja-JP': '目標を明確に', 'ko-KR': '목표를 분명히', 'es-ES': 'Aclara la meta', 'fr-FR': 'Clarifier l’objectif' })}</p>
                  <div className="space-y-3">
                    <input
                      value={goalFinalGoal}
                      onChange={event => setGoalFinalGoal(event.target.value)}
                      placeholder={ui({ 'zh-CN': '最终目标，例如：通过钢琴 5 级考级', 'en-US': 'Final goal, e.g. pass piano level 5', 'ja-JP': '最終目標：例 ピアノ5級合格', 'ko-KR': '최종 목표 예: 피아노 5급 통과', 'es-ES': 'Meta final, p. ej. aprobar piano nivel 5', 'fr-FR': 'Objectif final, ex. réussir piano niveau 5' })}
                      className="w-full px-4 py-3 rounded-2xl bg-white text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={goalFrequency}
                        onChange={event => setGoalFrequency(event.target.value)}
                        placeholder={ui({ 'zh-CN': '练习频率', 'en-US': 'Practice frequency', 'ja-JP': '練習頻度', 'ko-KR': '연습 빈도', 'es-ES': 'Frecuencia', 'fr-FR': 'Fréquence' })}
                        className="w-full px-4 py-3 rounded-2xl bg-white text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                      />
                      <input
                        type="number"
                        min={5}
                        max={180}
                        value={goalMinutes}
                        onChange={event => setGoalMinutes(Number(event.target.value) || 30)}
                        placeholder={ui({ 'zh-CN': '单次分钟', 'en-US': 'Minutes each time', 'ja-JP': '1回の分数', 'ko-KR': '1회 시간', 'es-ES': 'Minutos por vez', 'fr-FR': 'Minutes par séance' })}
                        className="w-full px-4 py-3 rounded-2xl bg-white text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={goalPracticeTime}
                        onChange={event => setGoalPracticeTime(event.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-white text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                      />
                      <input
                        type="date"
                        value={goalTargetDate}
                        onChange={event => setGoalTargetDate(event.target.value)}
                        className="w-full px-4 py-3 rounded-2xl bg-white text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                      />
                    </div>
                    <textarea
                      value={goalOptimizationHint}
                      onChange={event => setGoalOptimizationHint(event.target.value)}
                      placeholder={ui({ 'zh-CN': '进一步优化空间，例如：完成率低时降低单次时长，保持频率', 'en-US': 'Optimization idea, e.g. if completion drops, shorten each session but keep frequency', 'ja-JP': '改善案：例 達成率が低い時は1回を短くして頻度を保つ', 'ko-KR': '개선 여지 예: 완료율이 낮으면 시간을 줄이고 빈도 유지', 'es-ES': 'Idea de mejora, p. ej. si baja la constancia, acortar sesiones y mantener frecuencia', 'fr-FR': 'Idée d’amélioration : si le suivi baisse, raccourcir les séances mais garder la fréquence' })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl bg-white text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary resize-none"
                    />
                  </div>
                </div>
              )}

              {newPlanKind !== 'container' && containerPlans.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] font-black text-on-surface-variant/40 mb-2 uppercase tracking-widest">{ui({ 'zh-CN': '归属总计划', 'en-US': 'Parent plan', 'ja-JP': '親計画', 'ko-KR': '상위 계획', 'es-ES': 'Plan principal', 'fr-FR': 'Plan parent' })}</p>
                  <select
                    value={newParentPlanId}
                    onChange={event => setNewParentPlanId(event.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-surface-container-low text-sm font-bold outline-none border-2 border-outline-variant/10 focus:border-primary"
                  >
                    <option value="">{ui({ 'zh-CN': '不归属总计划', 'en-US': 'No parent plan', 'ja-JP': '親計画なし', 'ko-KR': '상위 계획 없음', 'es-ES': 'Sin plan principal', 'fr-FR': 'Aucun plan parent' })}</option>
                    {containerPlans.map(parent => (
                      <option key={parent.id} value={parent.id}>{parent.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] font-bold text-on-surface-variant/45 leading-relaxed mt-2">
                    {ui({ 'zh-CN': '例如把“练琴每周计划”放进“暑假总计划”，总计划看全局，子计划看执行。', 'en-US': 'For example, put a weekly piano plan under a summer plan: the parent plan sees the big picture, subplans handle execution.', 'ja-JP': '例：週ごとのピアノ計画を夏休み計画に入れると、親計画は全体、子計画は実行を見ます。', 'ko-KR': '예: 주간 피아노 계획을 여름방학 계획 아래 두면 상위 계획은 전체를, 하위 계획은 실행을 봅니다.', 'es-ES': 'Ejemplo: poner el plan semanal de piano dentro del plan de verano. El principal ve el conjunto; el subplan ejecuta.', 'fr-FR': 'Exemple : placer le plan hebdo de piano dans le plan d’été. Le parent voit l’ensemble, le sous-plan exécute.' })}
                  </p>
                </div>
              )}

              <button
                onClick={() => setCreationStep('preview')}
                disabled={!newPlanName.trim() || !planNeedText.trim()}
                className="mt-2 w-full py-3.5 rounded-2xl bg-primary text-white font-black text-sm active:scale-[0.98] transition-all disabled:opacity-40"
              >
                {ui({ 'zh-CN': '生成计划草案', 'en-US': 'Generate draft plan', 'ja-JP': '計画案を作成', 'ko-KR': '계획 초안 만들기', 'es-ES': 'Generar borrador', 'fr-FR': 'Créer le brouillon' })}
              </button>
              <button
                type="button"
                onClick={() => setCreationStep('intent')}
                className="mt-2 w-full py-3 rounded-2xl bg-surface-container-low text-on-surface-variant font-black text-sm active:scale-[0.98] transition-all"
              >
                {ui({ 'zh-CN': '返回上一步', 'en-US': 'Back', 'ja-JP': '戻る', 'ko-KR': '이전으로', 'es-ES': 'Volver', 'fr-FR': 'Retour' })}
              </button>
              </>
            )}

            {creationStep === 'preview' && (
              <GuidedPlanPreview
                draft={buildGuidedPlanDraft({
                  name: newPlanName,
                  kind: newPlanKind,
                  need: planNeedText,
                  time: planTimeText,
                  constraint: planConstraintText,
                  success: planSuccessText,
                }, i18n.language)}
                language={i18n.language}
                onBack={() => setCreationStep('details')}
                onConfirm={handleAddPlan}
                disabled={!newPlanName.trim()}
              />
            )}
          </AppModal>
        )}
      </AnimatePresence>
    </div>
  );
}

function defaultGoalTargetDate(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function GuidedPlanQuestion({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-on-surface">{label}</span>
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full resize-none rounded-2xl border-2 border-outline-variant/10 bg-surface-container-low px-4 py-3 text-sm font-bold leading-relaxed outline-none transition-colors focus:border-primary"
      />
    </label>
  );
}

function GuidedPlanPreview({
  draft,
  language,
  onBack,
  onConfirm,
  disabled,
}: {
  draft: ReturnType<typeof buildGuidedPlanDraft>;
  language: string;
  onBack: () => void;
  onConfirm: () => void;
  disabled: boolean;
}) {
  const text = (copy: LocaleText) => planCopy(language, copy);
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-primary/5 p-4">
        <p className="text-sm font-black text-on-surface">{text({ 'zh-CN': '先看草案，再决定是否生成', 'en-US': 'Review before creating', 'ja-JP': '作成前に確認', 'ko-KR': '만들기 전에 확인', 'es-ES': 'Revisa antes de crear', 'fr-FR': 'Vérifier avant de créer' })}</p>
        <p className="mt-1 text-xs font-bold leading-relaxed text-on-surface-variant/60">
          {text({ 'zh-CN': '下面是根据你刚才说的内容整理出的计划方向。确认后才会真正创建计划。', 'en-US': 'This draft is organized from what you just shared. The plan is only created after you confirm.', 'ja-JP': '先ほどの内容から整理した計画案です。確認後に正式に作成されます。', 'ko-KR': '방금 말한 내용을 바탕으로 정리한 초안입니다. 확인 후에만 실제로 생성됩니다.', 'es-ES': 'Este borrador se basa en lo que acabas de contar. Solo se crea al confirmar.', 'fr-FR': 'Ce brouillon est basé sur ce que vous venez d’indiquer. Le plan sera créé après confirmation.' })}
        </p>
      </div>

      <div className="rounded-3xl border border-primary/10 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black text-primary">{draft.kindLabel}</p>
            <h3 className="mt-1 text-lg font-black text-on-surface">{draft.name}</h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-on-surface-variant/65">{draft.summary}</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
            {text({ 'zh-CN': '草案', 'en-US': 'Draft', 'ja-JP': '草案', 'ko-KR': '초안', 'es-ES': 'Borrador', 'fr-FR': 'Brouillon' })}
          </span>
        </div>

        <div className="mt-4 grid gap-2">
          {draft.checkpoints.map(item => (
            <div key={item.label} className="rounded-2xl bg-surface-container-low p-3">
              <p className="text-[10px] font-black text-on-surface-variant/45">{item.label}</p>
              <p className="mt-1 text-xs font-bold leading-relaxed text-on-surface">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-primary-container/25 p-4">
        <p className="mb-3 text-xs font-black text-primary">{text({ 'zh-CN': '确认后会先生成这些内容', 'en-US': 'After confirmation, these will be created first', 'ja-JP': '確認後、まずこれを作成します', 'ko-KR': '확인 후 먼저 생성되는 항목', 'es-ES': 'Al confirmar se creará primero esto', 'fr-FR': 'Après confirmation, ceci sera créé' })}</p>
        <div className="space-y-2">
          {draft.generatedItems.map(item => (
            <div key={item} className="flex items-start gap-2 rounded-2xl bg-white p-3">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-xs font-bold leading-relaxed text-on-surface">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className="w-full rounded-2xl bg-primary py-3.5 text-sm font-black text-white transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {text({ 'zh-CN': '确认，创建这个计划', 'en-US': 'Confirm and create plan', 'ja-JP': '確認して計画を作成', 'ko-KR': '확인하고 계획 만들기', 'es-ES': 'Confirmar y crear plan', 'fr-FR': 'Confirmer et créer le plan' })}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-2xl bg-surface-container-low py-3 text-sm font-black text-on-surface-variant transition-all active:scale-[0.98]"
      >
        {text({ 'zh-CN': '返回修改需求', 'en-US': 'Back to edit details', 'ja-JP': '戻って修正', 'ko-KR': '돌아가서 수정', 'es-ES': 'Volver y editar', 'fr-FR': 'Retour et modifier' })}
      </button>
    </div>
  );
}

function buildGuidedPlanDraft(input: {
  name: string;
  kind: PlanKind;
  need: string;
  time: string;
  constraint: string;
  success: string;
}, language = 'zh-CN') {
  const text = (copy: LocaleText) => planCopy(language, copy);
  const name = input.name.trim() || (input.kind === 'goal'
    ? text({ 'zh-CN': '目标计划', 'en-US': 'Goal plan', 'ja-JP': '目標計画', 'ko-KR': '목표 계획', 'es-ES': 'Plan de meta', 'fr-FR': 'Plan objectif' })
    : input.kind === 'cycle'
      ? text({ 'zh-CN': '周期安排', 'en-US': 'Routine plan', 'ja-JP': '習慣計画', 'ko-KR': '반복 계획', 'es-ES': 'Plan de rutina', 'fr-FR': 'Plan de routine' })
      : text({ 'zh-CN': '日程计划', 'en-US': 'Schedule plan', 'ja-JP': '日程計画', 'ko-KR': '일정 계획', 'es-ES': 'Plan de agenda', 'fr-FR': 'Plan d’agenda' }));
  const kindLabel = input.kind === 'goal'
    ? text({ 'zh-CN': '目标型计划', 'en-US': 'Goal plan', 'ja-JP': '目標型計画', 'ko-KR': '목표형 계획', 'es-ES': 'Plan de meta', 'fr-FR': 'Plan objectif' })
    : input.kind === 'cycle'
      ? text({ 'zh-CN': '周期习惯计划', 'en-US': 'Recurring habit plan', 'ja-JP': '反復習慣計画', 'ko-KR': '반복 습관 계획', 'es-ES': 'Plan de hábito recurrente', 'fr-FR': 'Plan d’habitude récurrente' })
      : text({ 'zh-CN': '日程安排计划', 'en-US': 'Schedule plan', 'ja-JP': '日程計画', 'ko-KR': '일정 계획', 'es-ES': 'Plan de agenda', 'fr-FR': 'Plan d’agenda' });
  const need = input.need.trim() || text({ 'zh-CN': '先把家庭当前最关心的安排梳理清楚', 'en-US': 'Clarify what the family cares about most right now', 'ja-JP': '今家族が一番気にしている予定を整理する', 'ko-KR': '가족이 지금 가장 신경 쓰는 일정을 정리하기', 'es-ES': 'Aclarar lo que más importa ahora a la familia', 'fr-FR': 'Clarifier ce qui compte le plus pour la famille maintenant' });
  const time = input.time.trim() || text({ 'zh-CN': '时间和频率后续可以继续微调', 'en-US': 'Time and frequency can be adjusted later', 'ja-JP': '時間と頻度は後で調整できます', 'ko-KR': '시간과 빈도는 나중에 조정할 수 있습니다', 'es-ES': 'El tiempo y la frecuencia se pueden ajustar después', 'fr-FR': 'Le temps et la fréquence pourront être ajustés ensuite' });
  const constraint = input.constraint.trim() || text({ 'zh-CN': '先按家庭默认作息安排，遇到冲突再调整', 'en-US': 'Start from the family routine and adjust when conflicts appear', 'ja-JP': 'まず家庭の通常リズムに合わせ、衝突時に調整します', 'ko-KR': '가족 기본 루틴에 맞추고 충돌 시 조정합니다', 'es-ES': 'Empezar con la rutina familiar y ajustar si hay conflictos', 'fr-FR': 'Partir de la routine familiale et ajuster en cas de conflit' });
  const successText = input.success.trim() || (input.kind === 'goal'
    ? text({ 'zh-CN': '达到明确验收目标', 'en-US': 'Reach a clear success target', 'ja-JP': '明確な達成基準に届く', 'ko-KR': '명확한 성공 기준 달성', 'es-ES': 'Alcanzar un objetivo claro', 'fr-FR': 'Atteindre un objectif clair' })
    : text({ 'zh-CN': '形成稳定、可持续的执行节奏', 'en-US': 'Build a steady, sustainable rhythm', 'ja-JP': '安定して続けられるリズムを作る', 'ko-KR': '안정적이고 지속 가능한 리듬 만들기', 'es-ES': 'Crear un ritmo estable y sostenible', 'fr-FR': 'Créer un rythme stable et durable' }));
  const generatedItems = input.kind === 'goal'
    ? [
        text({ 'zh-CN': '生成目标说明和阶段里程碑', 'en-US': 'Create goal description and milestones', 'ja-JP': '目標説明と段階マイルストーンを作成', 'ko-KR': '목표 설명과 단계별 마일스톤 생성', 'es-ES': 'Crear descripción de meta e hitos', 'fr-FR': 'Créer la description et les jalons' }),
        text({ 'zh-CN': '生成日常练习任务草案', 'en-US': 'Create draft daily practice tasks', 'ja-JP': '日々の練習タスク案を作成', 'ko-KR': '일상 연습 과제 초안 생성', 'es-ES': 'Crear tareas de práctica diarias', 'fr-FR': 'Créer des tâches de pratique quotidiennes' }),
        text({ 'zh-CN': '保留目标、频率和完成标准，后续可继续编辑', 'en-US': 'Keep goal, frequency, and success criteria editable', 'ja-JP': '目標、頻度、達成基準は後から編集可能', 'ko-KR': '목표, 빈도, 완료 기준은 나중에 수정 가능', 'es-ES': 'Mantener meta, frecuencia y criterios editables', 'fr-FR': 'Garder objectif, fréquence et critères modifiables' }),
      ]
    : input.kind === 'cycle'
      ? [
          text({ 'zh-CN': '生成固定频率的练习或习惯安排', 'en-US': 'Create a fixed-frequency practice or habit plan', 'ja-JP': '固定頻度の練習/習慣予定を作成', 'ko-KR': '고정 빈도의 연습/습관 일정 생성', 'es-ES': 'Crear práctica o hábito de frecuencia fija', 'fr-FR': 'Créer une pratique ou habitude à fréquence fixe' }),
          text({ 'zh-CN': '生成孩子可打卡的执行任务', 'en-US': 'Create check-in tasks children can complete', 'ja-JP': '子どもがチェックインできる実行タスクを作成', 'ko-KR': '아이들이 체크인할 수 있는 실행 과제 생성', 'es-ES': 'Crear tareas que el niño pueda marcar', 'fr-FR': 'Créer des tâches que l’enfant peut valider' }),
          text({ 'zh-CN': '根据家庭作息避开明显冲突时间', 'en-US': 'Avoid obvious conflicts based on family routine', 'ja-JP': '家庭リズムに合わせて明らかな衝突を避ける', 'ko-KR': '가족 루틴에 따라 명확한 충돌 시간 피하기', 'es-ES': 'Evitar conflictos claros según la rutina familiar', 'fr-FR': 'Éviter les conflits évidents selon la routine familiale' }),
        ]
      : [
          text({ 'zh-CN': '生成一版日程骨架', 'en-US': 'Create a schedule skeleton', 'ja-JP': '日程の骨組みを作成', 'ko-KR': '일정 뼈대 생성', 'es-ES': 'Crear una estructura de agenda', 'fr-FR': 'Créer une structure d’agenda' }),
          text({ 'zh-CN': '拆出学习、运动、休息和亲子安排', 'en-US': 'Split study, exercise, rest, and family time', 'ja-JP': '学習、運動、休息、親子時間に分ける', 'ko-KR': '학습, 운동, 휴식, 가족 시간을 나누기', 'es-ES': 'Separar estudio, ejercicio, descanso y familia', 'fr-FR': 'Séparer étude, activité, repos et temps familial' }),
          text({ 'zh-CN': '保留限制条件，后续由 AI 继续优化', 'en-US': 'Keep constraints so AI can keep optimizing later', 'ja-JP': '制約を残し、後でAIが最適化を続けます', 'ko-KR': '제약을 유지해 AI가 나중에 계속 최적화', 'es-ES': 'Guardar límites para que la IA optimice después', 'fr-FR': 'Conserver les limites pour optimisation IA ultérieure' }),
        ];

  return {
    name,
    kind: input.kind,
    kindLabel,
    need,
    time,
    constraint,
    successText,
    summary: text({
      'zh-CN': `围绕“${need}”，先按“${time}”安排，并避开“${constraint}”。`,
      'en-US': `Start from "${need}", schedule it as "${time}", and avoid "${constraint}".`,
      'ja-JP': `「${need}」を中心に、「${time}」で組み、「${constraint}」を避けます。`,
      'ko-KR': `"${need}"을 중심으로 "${time}"에 맞추고 "${constraint}"을 피합니다.`,
      'es-ES': `Partimos de "${need}", lo organizamos como "${time}" y evitamos "${constraint}".`,
      'fr-FR': `Partir de "${need}", organiser selon "${time}" et éviter "${constraint}".`,
    }),
    checkpoints: [
      { label: text({ 'zh-CN': '家长真正想解决的问题', 'en-US': 'What the parent wants to solve', 'ja-JP': '保護者が本当に解決したいこと', 'ko-KR': '부모가 진짜 해결하고 싶은 문제', 'es-ES': 'Lo que quiere resolver la familia', 'fr-FR': 'Ce que le parent veut résoudre' }), value: need },
      { label: text({ 'zh-CN': '时间/频率', 'en-US': 'Time / frequency', 'ja-JP': '時間/頻度', 'ko-KR': '시간/빈도', 'es-ES': 'Tiempo / frecuencia', 'fr-FR': 'Temps / fréquence' }), value: time },
      { label: text({ 'zh-CN': '现实限制', 'en-US': 'Real-life limits', 'ja-JP': '現実的な制約', 'ko-KR': '현실 제한', 'es-ES': 'Límites reales', 'fr-FR': 'Limites réelles' }), value: constraint },
      { label: text({ 'zh-CN': '满意标准', 'en-US': 'Success standard', 'ja-JP': '満足基準', 'ko-KR': '만족 기준', 'es-ES': 'Criterio de éxito', 'fr-FR': 'Critère de réussite' }), value: successText },
    ],
    generatedItems,
  };
}

function buildGoalPlanMetadata(input: {
  kind: PlanKind;
  finalGoal: string;
  practiceFrequency: string;
  practiceMinutes: number;
  practiceTime: string;
  targetDate: string;
  milestones: GoalPlanMetadata['milestones'];
  optimizationHint: string;
}): GoalPlanMetadata | null {
  if (input.kind !== 'goal') return null;
  const finalGoal = input.finalGoal.trim();
  if (!finalGoal) return null;
  const milestones = input.milestones.length > 0
    ? input.milestones
    : [
      { title: '明确目标和材料清单', targetPercent: 20 },
      { title: '完成第一阶段稳定练习', targetPercent: 50 },
      { title: '完成模拟验收和弱项修正', targetPercent: 80 },
      { title: '完成最终验收', targetPercent: 100 },
    ];
  return {
    finalGoal,
    targetDate: input.targetDate,
    practiceFrequency: input.practiceFrequency.trim() || '每周 3 次',
    practiceMinutes: Math.max(5, input.practiceMinutes || 30),
    practiceTime: input.practiceTime || '19:00',
    milestones,
    optimizationHint: input.optimizationHint.trim() || '根据每周完成率和孩子状态调整练习频率、单次时长和家长陪伴方式。',
  };
}
