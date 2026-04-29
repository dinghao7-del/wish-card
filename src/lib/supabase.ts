import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 环境变量未配置，请检查 .env 文件');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      families: {
        Row: { id: string; name: string; invite_code: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; invite_code?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; name?: string; invite_code?: string | null; created_at?: string; updated_at?: string };
      };
      members: {
        Row: { id: string; family_id: string | null; name: string; avatar: string | null; role: 'parent' | 'child'; stars: number; color: string | null; pin: string | null; password: string | null; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; family_id?: string | null; name: string; avatar?: string | null; role: 'parent' | 'child'; stars?: number; color?: string | null; pin?: string | null; password?: string | null; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; family_id?: string | null; name?: string; avatar?: string | null; role?: 'parent' | 'child'; stars?: number; color?: string | null; pin?: string | null; password?: string | null; is_active?: boolean; created_at?: string; updated_at?: string };
      };
      tasks: {
        Row: { id: string; family_id: string | null; title: string; description: string | null; star_amount: number; assignee_ids: string[]; creator_id: string | null; status: 'pending' | 'in_progress' | 'reviewing' | 'completed'; is_habit: boolean; target_count: number; current_count: number; completed: boolean; completed_at: string | null; icon: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; family_id?: string | null; title: string; description?: string | null; star_amount?: number; assignee_ids?: string[]; creator_id?: string | null; status?: 'pending' | 'in_progress' | 'reviewing' | 'completed'; is_habit?: boolean; target_count?: number; current_count?: number; completed?: boolean; completed_at?: string | null; icon?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; family_id?: string | null; title?: string; description?: string | null; star_amount?: number; assignee_ids?: string[]; creator_id?: string | null; status?: 'pending' | 'in_progress' | 'reviewing' | 'completed'; is_habit?: boolean; target_count?: number; current_count?: number; completed?: boolean; completed_at?: string | null; icon?: string | null; created_at?: string; updated_at?: string };
      };
      habits: {
        Row: { id: string; family_id: string | null; title: string; description: string | null; frequency: 'daily' | 'weekly' | 'custom' | null; star_amount: number; assignee_ids: string[]; creator_id: string | null; current_count: number; target_count: number; last_completed_date: string | null; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id?: string; family_id?: string | null; title: string; description?: string | null; frequency?: 'daily' | 'weekly' | 'custom' | null; star_amount?: number; assignee_ids?: string[]; creator_id?: string | null; current_count?: number; target_count?: number; last_completed_date?: string | null; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: { id?: string; family_id?: string | null; title?: string; description?: string | null; frequency?: 'daily' | 'weekly' | 'custom' | null; star_amount?: number; assignee_ids?: string[]; creator_id?: string | null; current_count?: number; target_count?: number; last_completed_date?: string | null; is_active?: boolean; created_at?: string; updated_at?: string };
      };
      rewards: {
        Row: { id: string; family_id: string | null; name: string; description: string | null; star_cost: number; icon: string | null; image_url: string | null; category: string | null; stock: number | null; status: 'available' | 'pending_approval' | 'redeemed'; creator_id: string | null; redeemed_by: string | null; redeemed_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; family_id?: string | null; name: string; description?: string | null; star_cost?: number; icon?: string | null; image_url?: string | null; category?: string | null; stock?: number | null; status?: 'available' | 'pending_approval' | 'redeemed'; creator_id?: string | null; redeemed_by?: string | null; redeemed_at?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; family_id?: string | null; name?: string; description?: string | null; star_cost?: number; icon?: string | null; image_url?: string | null; category?: string | null; stock?: number | null; status?: 'available' | 'pending_approval' | 'redeemed'; creator_id?: string | null; redeemed_by?: string | null; redeemed_at?: string | null; created_at?: string; updated_at?: string };
      };
      star_transactions: {
        Row: { id: string; family_id: string | null; member_id: string; amount: number; type: 'earn' | 'spend'; reason: string; related_task_id: string | null; related_habit_id: string | null; related_reward_id: string | null; created_at: string };
        Insert: { id?: string; family_id?: string | null; member_id: string; amount: number; type: 'earn' | 'spend'; reason: string; related_task_id?: string | null; related_habit_id?: string | null; related_reward_id?: string | null; created_at?: string };
        Update: { id?: string; family_id?: string | null; member_id?: string; amount?: number; type?: 'earn' | 'spend'; reason?: string; related_task_id?: string | null; related_habit_id?: string | null; related_reward_id?: string | null; created_at?: string };
      };
      analytics_events: {
        Row: { id: string; family_id: string | null; member_id: string | null; event_name: string; event_data: Record<string, unknown>; created_at: string };
        Insert: { id?: string; family_id?: string | null; member_id?: string | null; event_name: string; event_data?: Record<string, unknown>; created_at?: string };
        Update: { id?: string; family_id?: string | null; member_id?: string | null; event_name?: string; event_data?: Record<string, unknown>; created_at?: string };
      };
      invite_codes: {
        Row: { id: string; code: string; description: string | null; max_uses: number; current_uses: number; is_active: boolean; created_by: string | null; expires_at: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; code: string; description?: string | null; max_uses?: number; current_uses?: number; is_active?: boolean; created_by?: string | null; expires_at?: string | null; created_at?: string; updated_at?: string };
        Update: { id?: string; code?: string; description?: string | null; max_uses?: number; current_uses?: number; is_active?: boolean; created_by?: string | null; expires_at?: string | null; created_at?: string; updated_at?: string };
      };
      templates: {
        Row: { id: string; type: 'task' | 'habit' | 'reward'; title: string; description: string | null; category: string; stars: number; icon: string | null; source: 'system' | 'community'; usage_count: number; is_active: boolean; i18n_key: string | null; extra_data: Record<string, unknown>; created_at: string; updated_at: string };
        Insert: { id?: string; type: 'task' | 'habit' | 'reward'; title: string; description?: string | null; category?: string; stars?: number; icon?: string | null; source?: 'system' | 'community'; usage_count?: number; is_active?: boolean; i18n_key?: string | null; extra_data?: Record<string, unknown>; created_at?: string; updated_at?: string };
        Update: { id?: string; type?: 'task' | 'habit' | 'reward'; title?: string; description?: string | null; category?: string; stars?: number; icon?: string | null; source?: 'system' | 'community'; usage_count?: number; is_active?: boolean; i18n_key?: string | null; extra_data?: Record<string, unknown>; created_at?: string; updated_at?: string };
      };
      notifications: {
        Row: { id: string; family_id: string; member_id: string | null; type: string; title: string; message: string; read: boolean; action_url: string | null; action_label: string | null; data: Record<string, unknown>; created_at: string };
        Insert: { id?: string; family_id: string; member_id?: string | null; type: string; title: string; message: string; read?: boolean; action_url?: string | null; action_label?: string | null; data?: Record<string, unknown>; created_at?: string };
        Update: { id?: string; family_id?: string; member_id?: string | null; type?: string; title?: string; message?: string; read?: boolean; action_url?: string | null; action_label?: string | null; data?: Record<string, unknown>; created_at?: string };
      };
      calendar_subscriptions: {
        Row: { id: string; family_id: string; member_id: string | null; token: string; name: string | null; last_accessed_at: string | null; is_active: boolean; created_at: string };
        Insert: { id?: string; family_id: string; member_id?: string | null; token?: string; name?: string | null; last_accessed_at?: string | null; is_active?: boolean; created_at?: string };
        Update: { id?: string; family_id?: string; member_id?: string | null; token?: string; name?: string | null; last_accessed_at?: string | null; is_active?: boolean; created_at?: string };
      };
      app_config: {
        Row: { id: string; key: string; value: string; description: string | null; category: string | null; updated_at: string };
        Insert: { id?: string; key: string; value: string; description?: string | null; category?: string | null; updated_at?: string };
        Update: { id?: string; key?: string; value?: string; description?: string | null; category?: string | null; updated_at?: string };
      };
    };
  };
};

export default supabase;
