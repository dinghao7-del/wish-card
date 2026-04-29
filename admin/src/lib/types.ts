import type { Database } from './supabase';

export type Member = Database['public']['Tables']['members']['Row'];
export type StarTransaction = Database['public']['Tables']['star_transactions']['Row'];
type FamilyRow = Database['public']['Tables']['families']['Row'];

// 用户详情返回类型
export interface UserDetail {
  member: Member;
  familyMembers: Member[];
  taskStats: {
    total: number;
    completed: number;
    pending: number;
  };
  recentTransactions: StarTransaction[];
}

// 家庭详情返回类型
export interface FamilyDetail {
  family: FamilyRow;
  members: Member[];
  taskCount: number;
  completedTaskCount: number;
}

// 用户管理页面状态类型
export type SelectedUserState =
  | null
  | { loading: true }
  | UserDetail;

// 家庭管理页面状态类型
export type SelectedFamilyState =
  | null
  | { loading: true }
  | FamilyDetail;
