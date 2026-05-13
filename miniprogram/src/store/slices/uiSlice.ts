/**
 * UI Slice
 * 管理 UI 状态：暗黑模式、加载状态等
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  isDarkMode: boolean;
  isUserSelectorOpen: boolean;
  loading: boolean;
  isInitialized: boolean;
}

const initialState: UiState = {
  isDarkMode: false,
  isUserSelectorOpen: false,
  loading: false,
  isInitialized: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
    },
    setUserSelectorOpen: (state, action: PayloadAction<boolean>) => {
      state.isUserSelectorOpen = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
  },
});

export const uiActions = uiSlice.actions;
export default uiSlice.reducer;
