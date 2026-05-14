type HabitLike = {
  assignee_ids?: string[];
} | null | undefined;

type ChildLike = {
  id: string;
};

export function getHabitSelectableChildIds(habit: HabitLike, childMembers: ChildLike[]): string[] {
  const childIds = childMembers.map(child => child.id);
  const assigneeIds = Array.isArray(habit?.assignee_ids) ? habit.assignee_ids.filter(Boolean) : [];
  if (assigneeIds.length === 0) return childIds;
  return childIds.filter(childId => assigneeIds.includes(childId));
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
