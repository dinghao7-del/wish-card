/**
 * User Session Slice
 * 管理当前用户、家庭ID、游客模式
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import Taro from '@tarojs/taro';
import { supabase } from '@/utils/supabase';

interface CurrentUser {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  stars?: number;
  role?: 'parent' | 'child';
}

interface UserSessionState {
  currentUser: CurrentUser | null;
  familyId: string | null;
  guestMode: boolean;
  initialized: boolean;
}

const initialState: UserSessionState = {
  currentUser: null,
  familyId: null,
  guestMode: false,
  initialized: false,
};

// Async Thunks

export const loadUserData = createAsyncThunk(
  'user/loadUserData',
  async (userId: string) => {
    // 从 Supabase 获取用户信息和成员信息
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) throw new Error('Not authenticated');

    const { data: member } = await supabase
      .from('members')
      .select('*')
      .eq('id', user.user.id)
      .single();

    return {
      currentUser: {
        id: user.user.id,
        email: user.user.email,
        name: member?.name,
        avatar: member?.avatar,
        stars: member?.stars || 0,
        role: member?.role,
      },
      familyId: member?.family_id || null,
    };
  }
);

export const loadGuestData = createAsyncThunk(
  'user/loadGuestData',
  async ({ memberId, famId }: { memberId: string; famId: string }) => {
    return {
      currentUser: { id: memberId, name: '访客用户', stars: 0, role: 'child' as const },
      familyId: famId,
      guestMode: true,
    };
  }
);

const userSessionSlice = createSlice({
  name: 'userSession',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<CurrentUser | null>) => {
      state.currentUser = action.payload;
    },
    setFamilyId: (state, action: PayloadAction<string | null>) => {
      state.familyId = action.payload;
    },
    setGuestMode: (state, action: PayloadAction<boolean>) => {
      state.guestMode = action.payload;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.initialized = action.payload;
    },
    logout: (state) => {
      state.currentUser = null;
      state.familyId = null;
      state.guestMode = false;
      Taro.clearStorageSync();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserData.fulfilled, (state, action) => {
        state.currentUser = action.payload.currentUser;
        state.familyId = action.payload.familyId;
        state.initialized = true;
      })
      .addCase(loadGuestData.fulfilled, (state, action) => {
        state.currentUser = action.payload.currentUser;
        state.familyId = action.payload.familyId;
        state.guestMode = action.payload.guestMode;
        state.initialized = true;
      });
  },
});

export const userSessionActions = userSessionSlice.actions;
export default userSessionSlice.reducer;
