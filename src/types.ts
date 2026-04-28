/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TaskStatus = 'pending' | 'in_progress' | 'reviewing' | 'completed' | 'expired';

export type TaskType = string;

export type TaskFrequency = string;

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  frequency?: TaskFrequency; // How often the task repeats
  startTime: string; // ISO string
  deadline?: string; // ISO string
  reminderTime?: string; // e.g. "08:00 AM"
  assigneeIds: string[];
  creatorId: string; // The person who assigned the task
  memberProgress?: Record<string, TaskStatus>; // Track individual progress for collaboration
  rewardStars: number;
  status: TaskStatus;
  images?: string[];
  icon: string;
  isHabit?: boolean;
  targetCount?: number;
  currentCount?: number;
}

export interface Member {
  id: string;
  name: string;
  avatar: string;
  stars: number;
  role: 'parent' | 'child';
  pin?: string; // Optional PIN for profile switching
  password?: string; // Formal password for admin login
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  image: string;
  category: string;
  unit?: string;
  stock?: number;
  hasLimit?: boolean;
  limitPeriod?: 'day' | 'week' | 'month';
  limitCount?: number;
}

export interface HistoryRecord {
  id: string;
  userId: string;
  title: string;
  type: 'task' | 'redeem' | 'daily';
  stars: number;
  timestamp: string;
  icon: string;
}
