/**
 * Data Slice
 * 管理业务数据：members、tasks、rewards、history
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@/utils/supabase';

// 类型定义
export interface Member {
  id: string;
  name: string;
  avatar?: string;
  stars: number;
  role: 'parent' | 'child';
  family_id?: string;
  pin?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'completed' | 'rejected';
  reward_stars: number;
  assignee_id?: string;
  creator_id?: string;
  family_id?: string;
  is_habit?: boolean;
  start_time?: string;
  quadrant_color?: string;
  icon?: string;
  target_count?: number;
  current_count?: number;
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  star_cost: number;
  category?: string;
  stock?: number;
  image_url?: string;
  icon?: string;
}

export interface HistoryRecord {
  id: string;
  userId: string;
  title: string;
  stars: number;
  timestamp: string;
  type: 'earn' | 'spend' | 'bonus' | 'penalty';
}

interface DataState {
  members: Member[];
  tasks: Task[];
  rewards: Reward[];
  history: HistoryRecord[];
}

const initialState: DataState = {
  members: [],
  tasks: [],
  rewards: [],
  history: [],
};

// Async Thunks

export const fetchFamilyData = createAsyncThunk(
  'data/fetchFamilyData',
  async (familyId: string) => {
    const [membersRes, tasksRes, rewardsRes] = await Promise.all([
      supabase.from('members').select('*').eq('family_id', familyId),
      supabase.from('tasks').select('*').eq('family_id', familyId).order('created_at', { ascending: false }),
      supabase.from('rewards').select('*').eq('family_id', familyId),
    ]);

    return {
      members: membersRes.data || [],
      tasks: tasksRes.data || [],
      rewards: rewardsRes.data || [],
    };
  }
);

export const addTask = createAsyncThunk(
  'data/addTask',
  async (task: Partial<Task> & { family_id: string }) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

export const updateTask = createAsyncThunk(
  'data/updateTask',
  async (task: Partial<Task> & { id: string }) => {
    const { data, error } = await supabase
      .from('tasks')
      .update(task)
      .eq('id', task.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

export const deleteTask = createAsyncThunk(
  'data/deleteTask',
  async (taskId: string) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    return taskId;
  }
);

export const submitForReview = createAsyncThunk(
  'data/submitForReview',
  async (taskId: string) => {
    const { data } = await supabase
      .from('tasks')
      .update({ status: 'reviewing' })
      .eq('id', taskId)
      .select()
      .single();

    return data;
  }
);

export const approveTask = createAsyncThunk(
  'data/approveTask',
  async (taskId: string) => {
    const { data } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', taskId)
      .select()
      .single();
    
    return data;
  }
);

export const rejectTask = createAsyncThunk(
  'data/rejectTask',
  async (taskId: string) => {
    const { data } = await supabase
      .from('tasks')
      .update({ status: 'pending' })
      .eq('id', taskId)
      .select()
      .single();
    
    return data;
  }
);

export const addReward = createAsyncThunk(
  'data/addReward',
  async (reward: Partial<Reward> & { family_id: string }) => {
    const { data, error } = await supabase
      .from('rewards')
      .insert(reward)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

export const updateReward = createAsyncThunk(
  'data/updateReward',
  async (reward: Partial<Reward> & { id: string }) => {
    const { data, error } = await supabase
      .from('rewards')
      .update(reward)
      .eq('id', reward.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

export const deleteReward = createAsyncThunk(
  'data/deleteReward',
  async (rewardId: string) => {
    await supabase.from('rewards').delete().eq('id', rewardId);
    return rewardId;
  }
);

export const redeemReward = createAsyncThunk(
  'data/redeemReward',
  async (rewardId: string) => {
    // 创建兑换记录并扣减库存
    const { error } = await supabase
      .from('redemptions')
      .insert({ reward_id: rewardId });

    if (error) throw error;
    return rewardId;
  }
);

export const addMember = createAsyncThunk(
  'data/addMember',
  async (member: Omit<Member, 'id'> & { family_id: string }) => {
    const { data, error } = await supabase
      .from('members')
      .insert(member)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

export const deleteMember = createAsyncThunk(
  'data/deleteMember',
  async (memberId: string) => {
    await supabase.from('members').delete().eq('id', memberId);
    return memberId;
  }
);

export const updateMember = createAsyncThunk(
  'data/updateMember',
  async (member: Partial<Member> & { id: string }) => {
    const { data, error } = await supabase
      .from('members')
      .update(member)
      .eq('id', member.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

const dataSlice = createSlice({
  name: 'data',
  initialState,
  reducers: {
    setMembers: (state, action: PayloadAction<Member[]>) => {
      state.members = action.payload;
    },
    setTasks: (state, action: PayloadAction<Task[]>) => {
      state.tasks = action.payload;
    },
    setRewards: (state, action: PayloadAction<Reward[]>) => {
      state.rewards = action.payload;
    },
    setHistory: (state, action: PayloadAction<HistoryRecord[]>) => {
      state.history = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFamilyData.fulfilled, (state, action) => {
        state.members = action.payload.members;
        state.tasks = action.payload.tasks;
        state.rewards = action.payload.rewards;
      })
      .addCase(addTask.fulfilled, (state, action) => {
        state.tasks.unshift(action.payload);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) state.tasks[idx] = action.payload;
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(t => t.id !== action.payload);
      })
      .addCase(submitForReview.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) state.tasks[idx] = action.payload;
      })
      .addCase(approveTask.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) state.tasks[idx] = action.payload;
      })
      .addCase(rejectTask.fulfilled, (state, action) => {
        const idx = state.tasks.findIndex(t => t.id === action.payload.id);
        if (idx !== -1) state.tasks[idx] = action.payload;
      })
      .addCase(addReward.fulfilled, (state, action) => {
        state.rewards.push(action.payload);
      })
      .addCase(updateReward.fulfilled, (state, action) => {
        const idx = state.rewards.findIndex(r => r.id === action.payload.id);
        if (idx !== -1) state.rewards[idx] = action.payload;
      })
      .addCase(deleteReward.fulfilled, (state, action) => {
        state.rewards = state.rewards.filter(r => r.id !== action.payload);
      })
      .addCase(addMember.fulfilled, (state, action) => {
        state.members.push(action.payload);
      })
      .addCase(deleteMember.fulfilled, (state, action) => {
        state.members = state.members.filter(m => m.id !== action.payload);
      })
      .addCase(updateMember.fulfilled, (state, action) => {
        const idx = state.members.findIndex(m => m.id === action.payload.id);
        if (idx !== -1) state.members[idx] = action.payload;
      });
  },
});

export const dataActions = dataSlice.actions;
export default dataSlice.reducer;
