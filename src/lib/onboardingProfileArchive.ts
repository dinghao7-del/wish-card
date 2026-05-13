import { getStorageAdapter, STORAGE_KEYS, storageGet, storageSet } from './StorageAdapter';
import type { HolidayPlayProfile } from '../domain/familyPlanning';
import { inferHolidayPlayPreference } from './recommendationInventory';

export interface OnboardingProfileChild {
  name: string;
  age: number;
  grade: string;
  schoolTime?: { start: string; end: string };
  afterSchoolActivities?: string[];
  customActivities?: string[];
  dailyPractices?: string[];
  customPractices?: string[];
}

export interface OnboardingProfileLike {
  children?: OnboardingProfileChild[];
  careStructure?: string;
  priorities?: string[];
  specialRequests?: string;
  hasHolidaySchedule?: boolean;
  holidayCustomActivities?: string[];
  holidayPlayProfile?: HolidayPlayProfile;
  holidayPlayPreferenceText?: string;
}

export interface OnboardingProfileArchive<TProfile = OnboardingProfileLike, TRecommendation = unknown> {
  id: string;
  profile: TProfile;
  recommendations: TRecommendation[];
  selectedIds: string[];
  savedAt: string;
  title: string;
  scheduleSummary: OnboardingScheduleSummary;
}

export interface OnboardingScheduleSummary {
  childrenCount: number;
  schoolWindowCount: number;
  weeklyClassCount: number;
  dailyPracticeCount: number;
  holidayMode: boolean;
  holidayPlayLabel?: string;
  focusLabels: string[];
  riskHints: string[];
}

export interface OnboardingImportSummary {
  planName: string;
  taskCount: number;
  habitCount: number;
  fixedClassSetupCount: number;
  rewardCount: number;
  focusLabels: string[];
  nextStepHints: string[];
}

export interface OnboardingTaskScheduleInput {
  title: string;
  type?: 'daily' | 'weekly' | 'habit' | string;
  suggestedTime?: string;
  assigneeChildNames?: string[];
}

export interface OnboardingTaskScheduleSuggestion {
  startTime: string;
  deadline?: string;
  note: string;
}

export interface FixedClassSetupSuggestion {
  childName: string;
  activityName: string;
  title: string;
  description: string;
  startTime: string;
  deadline: string;
}

const MAX_ARCHIVES = 5;
const PRIORITY_LABELS: Record<string, string> = {
  study: '学习习惯',
  health: '健康生活',
  housework: '家务劳动',
  social: '社交能力',
  hobby: '兴趣培养',
  responsibility: '责任心',
};

export async function getOnboardingProfileArchives<TProfile = OnboardingProfileLike, TRecommendation = unknown>(): Promise<Array<OnboardingProfileArchive<TProfile, TRecommendation>>> {
  return storageGet<Array<OnboardingProfileArchive<TProfile, TRecommendation>>>(
    getStorageAdapter(),
    STORAGE_KEYS.ONBOARDING_PROFILE_ARCHIVES,
    [],
  );
}

export async function saveOnboardingProfileArchive<TProfile extends OnboardingProfileLike, TRecommendation>(
  input: {
    profile: TProfile;
    recommendations: TRecommendation[];
    selectedIds: string[];
    now?: Date;
  },
): Promise<Array<OnboardingProfileArchive<TProfile, TRecommendation>>> {
  const now = input.now || new Date();
  const archive: OnboardingProfileArchive<TProfile, TRecommendation> = {
    id: `onboarding-${now.getTime()}`,
    profile: input.profile,
    recommendations: input.recommendations,
    selectedIds: input.selectedIds,
    savedAt: now.toISOString(),
    title: buildArchiveTitle(input.profile, now),
    scheduleSummary: buildOnboardingScheduleSummary(input.profile),
  };
  const existing = await getOnboardingProfileArchives<TProfile, TRecommendation>();
  const next = [archive, ...existing.filter(item => item.id !== archive.id)].slice(0, MAX_ARCHIVES);
  await storageSet(getStorageAdapter(), STORAGE_KEYS.ONBOARDING_PROFILE_ARCHIVES, next);
  return next;
}

export async function clearOnboardingProfileArchives(): Promise<void> {
  await storageSet(getStorageAdapter(), STORAGE_KEYS.ONBOARDING_PROFILE_ARCHIVES, []);
}

export function buildOnboardingScheduleSummary(profile: OnboardingProfileLike): OnboardingScheduleSummary {
  const children = profile.children || [];
  const weeklyClassCount = children.reduce((sum, child) =>
    sum + (child.afterSchoolActivities?.length || 0) + (child.customActivities?.length || 0)
  , 0);
  const dailyPracticeCount = children.reduce((sum, child) =>
    sum + (child.dailyPractices?.length || 0) + (child.customPractices?.length || 0)
  , 0);
  const focusLabels = (profile.priorities || []).map(priority => PRIORITY_LABELS[priority] || priority);
  const holidayPlayProfile = resolveHolidayPlayProfile(profile);
  const riskHints = buildRiskHints(profile, weeklyClassCount, dailyPracticeCount, holidayPlayProfile);

  return {
    childrenCount: children.length,
    schoolWindowCount: children.filter(child => child.schoolTime?.start && child.schoolTime?.end).length,
    weeklyClassCount,
    dailyPracticeCount,
    holidayMode: Boolean(profile.hasHolidaySchedule),
    holidayPlayLabel: holidayPlayProfile ? buildHolidayPlayLabel(holidayPlayProfile) : undefined,
    focusLabels,
    riskHints,
  };
}

export function buildOnboardingImportSummary(
  profile: OnboardingProfileLike,
  selectedRecommendations: Array<{ type?: string }>,
): OnboardingImportSummary {
  const scheduleSummary = buildOnboardingScheduleSummary(profile);
  const childNames = (profile.children || []).map(child => child.name).filter(Boolean);
  const taskCount = selectedRecommendations.filter(item => item.type !== 'habit').length;
  const habitCount = selectedRecommendations.filter(item => item.type === 'habit').length;
  const fixedClassSetupCount = buildFixedClassSetupSuggestions(profile).length;
  const rewardCount = estimateRewardCount(profile);
  const nextStepHints = [
    fixedClassSetupCount > 0 ? `补全 ${fixedClassSetupCount} 个课外班的每周具体时间。` : '',
    habitCount > 0 ? '先连续观察 7 天习惯打卡，周报会自动总结。' : '',
    taskCount > 0 ? '进入计划页可按这次建档方案查看任务落地。' : '',
    scheduleSummary.riskHints[0] || '',
  ].filter(Boolean);

  return {
    planName: childNames.length > 0 ? `${childNames.join('、')}AI建档方案` : '家庭AI建档方案',
    taskCount,
    habitCount,
    fixedClassSetupCount,
    rewardCount,
    focusLabels: scheduleSummary.focusLabels,
    nextStepHints,
  };
}

export function suggestOnboardingTaskSchedule(
  profile: OnboardingProfileLike,
  task: OnboardingTaskScheduleInput,
  now: Date = new Date(),
): OnboardingTaskScheduleSuggestion {
  const child = pickRelevantChild(profile, task.assigneeChildNames);
  const suggested = parseSuggestedTime(task.suggestedTime);
  const isWeekly = task.type === 'weekly';
  const isHabit = task.type === 'habit';
  const base = new Date(now);

  if (isWeekly) {
    base.setDate(base.getDate() + ((6 - base.getDay() + 7) % 7 || 7));
    setTime(base, suggested?.hour ?? 10, suggested?.minute ?? 0);
    return {
      startTime: base.toISOString(),
      deadline: addMinutes(base, 90).toISOString(),
      note: task.suggestedTime
        ? `按推荐时间安排到本周周末：${task.suggestedTime}`
        : '按周任务默认安排到周末，方便家长陪伴或验收。',
    };
  }

  if (suggested) {
    setTime(base, suggested.hour, suggested.minute);
    if (base.getTime() <= now.getTime()) base.setDate(base.getDate() + 1);
    return {
      startTime: base.toISOString(),
      deadline: addMinutes(base, isHabit ? 30 : 45).toISOString(),
      note: `按推荐时间段安排：${task.suggestedTime}`,
    };
  }

  const schoolEnd = parseClock(child?.schoolTime?.end || '');
  if (schoolEnd) {
    setTime(base, Math.min(21, schoolEnd.hour + 1), schoolEnd.minute);
    if (base.getTime() <= now.getTime()) base.setDate(base.getDate() + 1);
    return {
      startTime: base.toISOString(),
      deadline: addMinutes(base, isHabit ? 25 : 40).toISOString(),
      note: `根据${child?.name || '孩子'}放学时间，先安排在放学后缓冲时段。`,
    };
  }

  setTime(base, isHabit ? 20 : 19, 30);
  if (base.getTime() <= now.getTime()) base.setDate(base.getDate() + 1);
  return {
    startTime: base.toISOString(),
    deadline: addMinutes(base, isHabit ? 25 : 40).toISOString(),
    note: isHabit ? '未提供具体时间，先安排在晚间习惯打卡时段。' : '未提供具体时间，先安排在晚间家庭可确认时段。',
  };
}

export function buildFixedClassSetupSuggestions(
  profile: OnboardingProfileLike,
  now: Date = new Date(),
): FixedClassSetupSuggestion[] {
  const setupTime = new Date(now);
  setTime(setupTime, 20, 30);
  if (setupTime.getTime() <= now.getTime()) setupTime.setDate(setupTime.getDate() + 1);

  return (profile.children || []).flatMap(child => {
    const childName = child.name || '孩子';
    const classes = dedupeStrings([
      ...(child.afterSchoolActivities || []),
      ...(child.customActivities || []),
    ]);
    return classes.map((activityName, index) => {
      const start = new Date(setupTime);
      start.setMinutes(start.getMinutes() + index * 10);
      const deadline = addMinutes(start, 20);
      return {
        childName,
        activityName,
        title: `确认${childName}${activityName}课时间`,
        description: `${activityName}属于每周固定课外班，先作为日程占位。请补充每周几、几点到几点、接送人和路程缓冲，补全后它会参与冲突检查、顺延和复盘。`,
        startTime: start.toISOString(),
        deadline: deadline.toISOString(),
      };
    });
  });
}

function estimateRewardCount(profile: OnboardingProfileLike): number {
  const childCount = Math.max(1, profile.children?.length || 0);
  return Math.min(5, childCount * 3);
}

function buildArchiveTitle(profile: OnboardingProfileLike, now: Date): string {
  const childNames = (profile.children || []).map(child => child.name).filter(Boolean);
  const date = now.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
  if (childNames.length > 0) return `${childNames.join('、')}的家庭画像 · ${date}`;
  return `家庭画像存档 · ${date}`;
}

function buildRiskHints(
  profile: OnboardingProfileLike,
  weeklyClassCount: number,
  dailyPracticeCount: number,
  holidayPlayProfile?: HolidayPlayProfile,
): string[] {
  const hints: string[] = [];
  if (weeklyClassCount >= 4) {
    hints.push('固定课外班较多，生成日程时需要保留接送和休息缓冲。');
  }
  if (dailyPracticeCount >= 4) {
    hints.push('日常练习项目较多，建议按优先级轮换，不要每天全部压满。');
  }
  if (profile.careStructure === 'one-parent-main') {
    hints.push('一位家长为主，晚间安排要少而稳定。');
  }
  if (profile.careStructure === 'grandparents-help' || profile.careStructure === 'nanny-help') {
    hints.push('有协助照看者，建议增加交接提醒和家长确认。');
  }
  if (profile.hasHolidaySchedule) {
    hints.push('假期作息不同，后续计划要自动切换假期节奏。');
  }
  if (holidayPlayProfile) {
    hints.push(`假期玩法偏好为${buildHolidayPlayLabel(holidayPlayProfile)}，推荐时要同时考虑陪伴时间、预算和省心程度。`);
  }
  if ((profile.specialRequests || '').trim()) {
    hints.push('已有家长补充诉求，重新生成时应优先遵守。');
  }
  return hints;
}

function resolveHolidayPlayProfile(profile: OnboardingProfileLike): HolidayPlayProfile | undefined {
  if (profile.holidayPlayProfile) return profile.holidayPlayProfile;
  if (!profile.holidayPlayPreferenceText?.trim()) return undefined;
  return inferHolidayPlayPreference({ text: profile.holidayPlayPreferenceText });
}

function buildHolidayPlayLabel(profile: HolidayPlayProfile): string {
  return [
    scaleLabel(profile.scale),
    modeLabel(profile.mode),
    `陪伴${levelLabel(profile.caregiverLoad)}`,
    `预算${levelLabel(profile.budgetLevel)}`,
    effortLabel(profile.effortLevel),
  ].join(' · ');
}

function scaleLabel(scale: HolidayPlayProfile['scale']): string {
  if (scale === 'small_play') return '小玩';
  if (scale === 'medium_play') return '中玩';
  return '大玩';
}

function modeLabel(mode: HolidayPlayProfile['mode']): string {
  if (mode === 'pure_fun') return '纯玩';
  if (mode === 'science_fun') return '科学地玩';
  return '兴趣培养';
}

function levelLabel(level: 'low' | 'medium' | 'high'): string {
  if (level === 'low') return '低';
  if (level === 'medium') return '中';
  return '高';
}

function effortLabel(level: HolidayPlayProfile['effortLevel']): string {
  if (level === 'easy') return '省心';
  if (level === 'hands_on') return '深度陪伴';
  return '平衡';
}

function pickRelevantChild(profile: OnboardingProfileLike, childNames?: string[]): OnboardingProfileChild | undefined {
  const children = profile.children || [];
  if (!childNames?.length) return children[0];
  return children.find(child => childNames.includes(child.name)) || children[0];
}

function parseSuggestedTime(value?: string): { hour: number; minute: number } | null {
  if (!value) return null;
  const text = value.trim();
  if (/早晨|早上|上午|起床/.test(text)) return { hour: 7, minute: 30 };
  if (/放学|下午/.test(text)) return { hour: 17, minute: 30 };
  if (/晚饭|晚上|睡前/.test(text)) return { hour: /睡前/.test(text) ? 20 : 19, minute: /睡前/.test(text) ? 0 : 30 };
  const match = text.match(/(\d{1,2})(?::|点|：)?(\d{0,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function setTime(date: Date, hour: number, minute: number): void {
  date.setHours(hour, minute, 0, 0);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function parseClock(value: string): { hour: number; minute: number } | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map(value => value.trim())
    .filter(value => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}
