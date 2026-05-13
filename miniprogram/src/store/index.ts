/**
 * Forest Family 小程序 - Redux Store
 *
 * 对齐 Web 端 FamilyContext 的所有状态和操作
 * Web 用 React Context，小程序用 Redux（更好的性能+DevTools）
 */

import { configureStore } from '@reduxjs/toolkit';
import Taro from '@tarojs/taro';
import userSessionReducer, {
  loadGuestData,
  loadUserData,
  userSessionActions,
} from './slices/userSessionSlice';
import dataReducer from './slices/dataSlice';
import uiReducer from './slices/uiSlice';
import notificationsReducer from './slices/notificationsSlice';
import {
  addMember,
  addReward,
  addTask,
  approveTask,
  dataActions,
  deleteMember,
  deleteReward,
  deleteTask,
  redeemReward,
  rejectTask,
  submitForReview,
  updateMember,
  updateReward,
  updateTask,
} from './slices/dataSlice';
import { uiActions } from './slices/uiSlice';
import { notificationActions } from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    userSession: userSessionReducer,
    data: dataReducer,
    ui: uiReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // 允许非序列化值（Date、函数等）
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// 便捷导出（对齐 hooks/useFamily.ts）
export {
  addMember,
  addReward,
  addTask,
  approveTask,
  dataActions,
  deleteMember,
  deleteReward,
  deleteTask,
  loadGuestData,
  loadUserData,
  notificationActions,
  redeemReward,
  rejectTask,
  submitForReview,
  uiActions,
  updateMember,
  updateReward,
  updateTask,
  userSessionActions,
};
export const logout = userSessionActions.logout;
export const persistLocalData = (getSnapshot: () => unknown) => {
  Taro.setStorageSync('forest-family-state', getSnapshot());
};
export const restoreLocalData = () => Taro.getStorageSync('forest-family-state');

export default store;
