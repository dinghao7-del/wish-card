import type { Task } from '../types';
import type { DataTask } from './DataLayer';
import {
  buildPlanExecutionDrafts,
  filterNewTaskDrafts,
  type PlanKind,
  type TaskDraftFromSchedule,
} from '../domain/familyPlanning';
import { dailyScheduleTemplateToFamilyPlan } from './planTemplates';
import type { DailyScheduleTemplate, PlanSceneType } from './planTemplates';

export interface PlanExecutionTaskInput {
  planId: string;
  planName: string;
  planType?: string;
  planKind: PlanKind;
  creatorId: string;
  familyId?: string;
  childIds: string[];
  schedule?: DailyScheduleTemplate | null;
  sceneType?: PlanSceneType;
  existingTasks?: Array<Pick<TaskDraftFromSchedule, 'title' | 'startTime'>>;
}

export interface PlanExecutionTaskBundle {
  drafts: TaskDraftFromSchedule[];
  tasks: Array<Omit<DataTask, 'id' | 'createdAt' | 'updatedAt' | 'familyId'>>;
}

export interface PlanExecutionConflict {
  draftTitle: string;
  existingTitle: string;
  assigneeIds: string[];
  startTime: string;
  endTime?: string;
  existingStartTime: string;
  existingEndTime?: string;
  reason: string;
}

export interface ExistingTaskForConflict {
  title: string;
  startTime?: string | null;
  deadline?: string | null;
  endTime?: string | null;
  assigneeIds: string[];
  status?: string;
}

export function buildPlanExecutionTaskBundle(input: PlanExecutionTaskInput): PlanExecutionTaskBundle {
  const assigneeIds = input.childIds.length > 0 ? input.childIds : [input.creatorId];
  const schedulePlan = input.schedule
    ? dailyScheduleTemplateToFamilyPlan(input.schedule, {
      title: input.planName,
      sceneType: input.sceneType || 'custom',
      familyId: input.familyId,
      childIds: assigneeIds,
    })
    : undefined;

  const generatedDrafts = buildPlanExecutionDrafts({
    planName: input.planName,
    planType: input.planType,
    kind: input.planKind,
    childIds: assigneeIds,
    schedulePlan,
  });
  const drafts = filterNewTaskDrafts(generatedDrafts, input.existingTasks || []);

  return {
    drafts,
    tasks: drafts.map(draft => ({
      planId: input.planId,
      title: draft.title,
      description: draft.description,
      starAmount: draft.rewardStars,
      assigneeIds: draft.assigneeIds,
      creatorId: input.creatorId,
      status: 'pending',
      isHabit: draft.frequency !== 'once',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      completedAt: null,
      icon: draft.icon,
      startTime: buildTaskDateTime(draft.startTime),
      deadline: buildTaskDateTime(draft.deadline, 19, 0),
    })),
  };
}

export function findPlanExecutionConflicts(
  drafts: TaskDraftFromSchedule[],
  existingTasks: ExistingTaskForConflict[],
): PlanExecutionConflict[] {
  return drafts.flatMap(draft => {
    const draftWindow = toMinuteWindow(draft.startTime, draft.deadline);
    if (!draftWindow) return [];

    return existingTasks
      .filter(task => task.status !== 'completed')
      .flatMap(task => {
        const existingWindow = toMinuteWindow(task.startTime || undefined, task.deadline || task.endTime || undefined);
        if (!existingWindow) return [];
        const sharedAssignees = draft.assigneeIds.filter(id => task.assigneeIds.includes(id));
        if (sharedAssignees.length === 0) return [];
        if (!windowsOverlap(draftWindow, existingWindow)) return [];

        return [{
          draftTitle: draft.title,
          existingTitle: task.title,
          assigneeIds: sharedAssignees,
          startTime: draft.startTime,
          endTime: draft.deadline,
          existingStartTime: task.startTime || '',
          existingEndTime: task.deadline || task.endTime || undefined,
          reason: '同一成员在相近时间已有安排，需要家长确认后再生成任务',
        }];
      });
  });
}

function toMinuteWindow(startTime?: string, endTime?: string): { start: number; end: number } | null {
  const start = parseTimeToMinutes(startTime);
  if (start === null) return null;
  const parsedEnd = parseTimeToMinutes(endTime);
  const end = parsedEnd === null ? start + 30 : parsedEnd;
  return {
    start,
    end: end <= start ? start + 30 : end,
  };
}

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) return null;
  const direct = value.match(/^(\d{1,2}):(\d{2})$/);
  if (direct) {
    return Number(direct[1]) * 60 + Number(direct[2]);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getHours() * 60 + parsed.getMinutes();
}

function windowsOverlap(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end && b.start < a.end;
}

export function buildUiTaskFromDraft(
  draft: TaskDraftFromSchedule,
  input: Pick<PlanExecutionTaskInput, 'planId' | 'creatorId'>,
): Task {
  return {
    id: `plan-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: draft.title,
    description: draft.description,
    type: draft.type,
    frequency: draft.frequency || 'once',
    startTime: buildTaskDateTime(draft.startTime),
    deadline: buildTaskDateTime(draft.deadline, 19, 0),
    assigneeIds: draft.assigneeIds,
    creatorId: input.creatorId,
    planId: input.planId,
    memberProgress: buildMemberProgress(draft.assigneeIds),
    rewardStars: draft.rewardStars,
    status: 'pending',
    icon: draft.icon,
  };
}

export function buildTaskDateTime(timeValue?: string, fallbackHour = 18, fallbackMinute = 0): string {
  if (!timeValue) {
    const fallback = new Date();
    fallback.setHours(fallbackHour, fallbackMinute, 0, 0);
    return fallback.toISOString();
  }
  if (/^\d{2}:\d{2}$/.test(timeValue)) {
    const [hour, minute] = timeValue.split(':').map(Number);
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }
  const parsed = new Date(timeValue);
  return Number.isNaN(parsed.getTime()) ? buildTaskDateTime(undefined, fallbackHour, fallbackMinute) : parsed.toISOString();
}

export function buildMemberProgress(assigneeIds: string[]): Record<string, Task['status']> {
  return assigneeIds.reduce<Record<string, Task['status']>>((progress, memberId) => {
    progress[memberId] = 'pending';
    return progress;
  }, {});
}
