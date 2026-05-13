import type { PlanningScenario, ScheduleSlot } from '../domain/familyPlanning';
import type { DailyScheduleTemplate, PlanSceneType, TimeSlot } from './planTemplates';
import type { SharedScheduleTemplateDraft, StoredSharedScheduleTemplateDraft } from './communityShare';

export interface CommunityTemplateReusePreview {
  title: string;
  scene: PlanSceneType;
  schedule: DailyScheduleTemplate;
  adaptationNotes: string[];
  sourceSummary: string;
}

export function planningScenarioToSceneType(scenario: PlanningScenario): PlanSceneType {
  if (scenario === 'school_day') return 'weekday';
  if (scenario === 'travel') return 'exchange';
  if (scenario === 'holiday' || scenario === 'winter_break' || scenario === 'summer_break') return 'holiday';
  return 'custom';
}

export function communityDraftToDailyScheduleTemplate(draft: SharedScheduleTemplateDraft): DailyScheduleTemplate {
  const slots = draft.content.slots
    .map((slot, index) => communitySlotToTimeSlot(slot, index))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return {
    wakeTime: inferWakeTime(slots),
    bedTime: inferBedTime(slots),
    mealTimes: {
      breakfast: inferMealTime(slots, /早餐|早饭/, '07:30'),
      lunch: inferMealTime(slots, /午餐|午饭|中饭/, '12:00'),
      dinner: inferMealTime(slots, /晚餐|晚饭/, '18:30'),
    },
    slots,
  };
}

export function buildCommunityTemplateReusePreview(
  storedDraft: StoredSharedScheduleTemplateDraft,
): CommunityTemplateReusePreview {
  const draft = storedDraft.draft;
  const schedule = communityDraftToDailyScheduleTemplate(draft);
  const adaptationNotes = buildAdaptationNotes(storedDraft);

  return {
    title: `${draft.title} · 复用`,
    scene: planningScenarioToSceneType(draft.scenario),
    schedule,
    adaptationNotes,
    sourceSummary: [
      draft.ageRange,
      draft.gradeBand,
      draft.cityLevel,
      storedDraft.asset?.profileSignal?.timeCoverage === 'full_day' ? '全天模板' : '',
    ].filter(Boolean).join(' · ') || '社区日程模板',
  };
}

export function buildAdaptationNotes(storedDraft: StoredSharedScheduleTemplateDraft): string[] {
  const draft = storedDraft.draft;
  const asset = storedDraft.asset;
  const notes: string[] = [];

  if (draft.ageRange || draft.gradeBand) {
    notes.push(`原模板适合${[draft.gradeBand, draft.ageRange].filter(Boolean).join('、')}，复用前建议确认和自家孩子阶段是否一致。`);
  } else {
    notes.push('原模板缺少年龄或学段标签，建议先按孩子阶段调整任务难度。');
  }

  if (draft.cityLevel) {
    notes.push(`原模板来自${draft.cityLevel}场景，通勤、课外资源密度和你家所在地可能不同。`);
  }

  if (asset?.profileSignal?.caregiverRequiredSlots > 0) {
    notes.push(`有 ${asset.profileSignal.caregiverRequiredSlots} 段需要家长陪伴，请和父母工作时间再对齐一次。`);
  }

  if (asset?.profileSignal?.timeCoverage !== 'full_day') {
    notes.push('这不是完整全天模板，建议补齐起床、三餐、睡前和自由活动等兜底时段。');
  }

  if (asset?.privacyRiskLevel === 'medium' || asset?.privacyRiskLevel === 'high') {
    notes.push('模板曾做过隐私脱敏，复用后请把“孩子”“地点”等泛化文字改成自家真实安排。');
  }

  if (asset?.publishBlockers?.length) {
    notes.push(`模板仍有待完善项：${asset.publishBlockers.slice(0, 2).join('；')}。`);
  }

  return Array.from(new Set(notes)).slice(0, 6);
}

function communitySlotToTimeSlot(
  slot: Omit<ScheduleSlot, 'childIds'> & { childIds?: never },
  index: number,
): TimeSlot {
  return {
    label: slot.title || `安排 ${index + 1}`,
    startTime: normalizeTime(slot.startTime, '09:00'),
    endTime: normalizeTime(slot.endTime, '09:30'),
    description: slot.description || buildSlotDescription(slot.category, slot.caregiverRequired),
    icon: slot.icon || categoryToIcon(slot.category),
  };
}

function normalizeTime(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2])));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function inferWakeTime(slots: TimeSlot[]): string {
  return slots[0]?.startTime || '07:00';
}

function inferBedTime(slots: TimeSlot[]): string {
  const sleepSlot = [...slots].reverse().find(slot => /睡|就寝|晚安/.test(`${slot.label} ${slot.description}`));
  return sleepSlot?.endTime || slots[slots.length - 1]?.endTime || '21:00';
}

function inferMealTime(slots: TimeSlot[], pattern: RegExp, fallback: string): string {
  const slot = slots.find(item => pattern.test(`${item.label} ${item.description}`));
  return slot?.startTime || fallback;
}

function categoryToIcon(category: ScheduleSlot['category']): string {
  const icons: Record<ScheduleSlot['category'], string> = {
    study: '📚',
    life: '🏠',
    exercise: '⚽',
    interest: '🎨',
    family: '👨‍👩‍👧‍👦',
    rest: '😴',
    medical: '🏥',
    travel: '✈️',
    other: '✨',
  };
  return icons[category] || '✨';
}

function buildSlotDescription(category: ScheduleSlot['category'], caregiverRequired: boolean): string {
  const base = category === 'study'
    ? '学习安排'
    : category === 'exercise'
      ? '运动安排'
      : category === 'interest'
        ? '兴趣活动'
        : category === 'family'
          ? '家庭共同参与'
          : '日程安排';
  return caregiverRequired ? `${base}，需要家长配合` : base;
}
