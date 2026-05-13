import type { Task } from '../types';

export interface ProductHuntDemoMember {
  id: string;
  name: string;
  role: 'parent' | 'child';
  detail: string;
  avatarLabel: string;
  stars: number;
}

export interface ProductHuntDemoPlanSlot {
  id: string;
  time: string;
  title: string;
  category: string;
  why: string;
  stars: number;
}

export interface ProductHuntDemoWish {
  id: string;
  title: string;
  cost: number;
  description: string;
  parentPromise: string;
}

export const productHuntDemoMembers: ProductHuntDemoMember[] = [
  {
    id: 'ph-emma',
    name: 'Emma',
    role: 'parent',
    detail: 'Busy parent, wants less reminding and a calmer school week.',
    avatarLabel: 'E',
    stars: 0,
  },
  {
    id: 'ph-leo',
    name: 'Leo',
    role: 'child',
    detail: '8 years old, needs a better homework, reading, piano, and bedtime rhythm.',
    avatarLabel: 'L',
    stars: 24,
  },
];

export const productHuntDemoPlan = {
  title: "Leo's calmer school-week rhythm",
  summary:
    'WishCard turns Emma and Leo\'s family profile into a practical after-school routine with clear actions, rewards, and a realistic bedtime wind-down.',
  assumptions: [
    'Emma has limited hands-on time before dinner.',
    'Leo responds better to visible progress than repeated reminders.',
    'The plan protects reading and bedtime before adding extra activities.',
  ],
  slots: [
    {
      id: 'reset',
      time: '4:30 PM',
      title: 'Snack and reset',
      category: 'Family rhythm',
      why: 'A short transition helps Leo settle before homework.',
      stars: 2,
    },
    {
      id: 'homework',
      time: '5:00 PM',
      title: 'Homework focus block',
      category: 'Study',
      why: 'Put the highest-friction task before energy drops.',
      stars: 8,
    },
    {
      id: 'reading',
      time: '5:45 PM',
      title: 'Reading mission',
      category: 'Habit',
      why: 'Protect a small daily win that builds long-term confidence.',
      stars: 6,
    },
    {
      id: 'piano',
      time: '6:20 PM',
      title: 'Piano practice',
      category: 'Interest',
      why: 'Keep the routine short enough to be sustainable.',
      stars: 6,
    },
    {
      id: 'bedtime',
      time: '8:30 PM',
      title: 'Bedtime wind-down',
      category: 'Life',
      why: 'End the day with predictability instead of negotiation.',
      stars: 4,
    },
  ] satisfies ProductHuntDemoPlanSlot[],
};

export const productHuntDemoTasks: Task[] = productHuntDemoPlan.slots.map((slot, index) => ({
  id: `ph-task-${slot.id}`,
  title: slot.title,
  description: slot.why,
  type: slot.category.toLowerCase().replace(/\s+/g, '_'),
  frequency: 'daily',
  startTime: new Date(2026, 4, 14, 16 + index, 30).toISOString(),
  assigneeIds: ['ph-leo'],
  creatorId: 'ph-emma',
  rewardStars: slot.stars,
  status: index === 0 ? 'completed' : 'pending',
  icon: 'CalendarCheck',
  isHabit: slot.category === 'Habit',
  planId: 'ph-plan-school-week',
}));

export const productHuntDemoWish: ProductHuntDemoWish = {
  id: 'ph-wish-museum',
  title: 'Saturday museum trip',
  cost: 30,
  description: 'Leo wants a relaxed museum visit with Emma this weekend.',
  parentPromise: 'Pick a time this weekend and keep the promise visible.',
};

export const productHuntDemoWeeklyReview = {
  title: 'This week is getting easier to follow',
  childHighlights: [
    'Leo completed the first after-school reset without another reminder.',
    'Reading is now attached to a clear time instead of floating somewhere after homework.',
    'The museum wish gives Leo a reason to care about the whole week, not just one task.',
  ],
  parentFocus: [
    'Keep the homework block protected before adding new activities.',
    'Confirm the museum trip by Friday so the reward feels real.',
    'If the evening feels overloaded, shorten piano before cutting reading.',
  ],
  nextWeek:
    'Next week, WishCard would keep the same rhythm, reduce negotiation around bedtime, and move one optional activity to the weekend.',
};

