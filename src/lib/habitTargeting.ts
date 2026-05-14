type HabitLike = {
  assigneeIds?: string[];
  assignee_ids?: string[];
} | null | undefined;

type ChildLike = {
  id: string;
  role?: string;
};

export function getHabitAssigneeIds(habit: HabitLike): string[] {
  if (!habit) return [];
  if (Array.isArray(habit.assigneeIds)) return habit.assigneeIds.filter(Boolean);
  if (Array.isArray(habit.assignee_ids)) return habit.assignee_ids.filter(Boolean);
  return [];
}

export function getHabitSelectableChildIds(habit: HabitLike, childMembers: ChildLike[]): string[] {
  const childIds = childMembers.map(child => child.id);
  const assigneeIds = getHabitAssigneeIds(habit);
  if (assigneeIds.length === 0) return childIds;
  return childIds.filter(childId => assigneeIds.includes(childId));
}

export function isHabitAssignedToChild(habit: HabitLike, childId: string): boolean {
  const assigneeIds = getHabitAssigneeIds(habit);
  return assigneeIds.length === 0 || assigneeIds.includes(childId);
}

export function resolveHabitTargetChildId(
  habit: HabitLike,
  childMembers: ChildLike[],
  selectedChildId?: string,
): string {
  const selectableChildIds = getHabitSelectableChildIds(habit, childMembers);
  if (selectedChildId && selectableChildIds.includes(selectedChildId)) return selectedChildId;
  return selectableChildIds[0] || '';
}
