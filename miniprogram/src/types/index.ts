/**
 * Forest Family 小程序 - 类型定义
 * 与 Web 端 src/types.ts 完全对齐
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

// ===== 对齐 Web types.ts L6-7 =====
export type TaskStatus = 'pending' | 'in_progress' | 'reviewing' | 'completed' | 'expired';
export type TaskType = string;
export type TaskFrequency = string;

// ===== 对齐 Web types.ts L12-32 =====
export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  frequency?: TaskFrequency;
  startTime: string; // ISO string
  deadline?: string; // ISO string
  reminderTime?: string;
  assigneeIds: string[];
  creatorId: string;
  memberProgress?: Record<string, TaskStatus>; // ⭐ 多成员独立进度追踪
  rewardStars: number;
  status: TaskStatus;
  images?: string[];
  icon: string;
  isHabit?: boolean;
  targetCount?: number;
  currentCount?: number;
  plan_id?: string; // 所属计划ID
}

// ===== 对齐 Web types.ts L34-42 =====
export interface Member {
  id: string;
  name: string;
  avatar: string;
  stars: number;
  role: 'parent' | 'child';
  pin?: string;
  password?: string;
  family_id?: string; // DB字段，用于关联家庭
}

// ===== 对齐 Web types.ts L44-57 =====
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

// ===== 对齐 Web types.ts L59-67 =====
export interface HistoryRecord {
  id: string;
  userId: string;
  title: string;
  type: 'task' | 'redeem' | 'daily';
  stars: number;
  timestamp: string;
  icon: string;
}

// ===== 对齐 Web types.ts L69-80 =====
export interface Plan {
  id: string;
  name: string;
  type: '寒假' | '暑假' | '学期' | '年级' | '自定义';
  familyId?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
  targetCount?: number;
  wishCount?: number;
}

// ===== 对齐 Web FamilyContext 的额外状态类型（小程序独有）=====

/** UI 状态 */
export interface UIState {
  isUserSelectorOpen: boolean;
  isDarkMode: boolean;
  loading: boolean;
  isInitialized: boolean;
}

/** 用户会话状态 */
export interface UserSession {
  currentUser: Member | null;
  familyId: string | null;
  guestMode: boolean;
}
