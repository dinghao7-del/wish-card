/**
 * Notifications Slice
 * 管理通知列表和未读数
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'task_complete' | 'redeem' | 'stars_change' | 'system' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

interface NotificationsState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'read' | 'createdAt'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      state.items.unshift(notification);
      state.unreadCount += 1;
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const item = state.items.find(n => n.id === action.payload);
      if (item && !item.read) {
        item.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.items.forEach(n => { n.read = true; });
      state.unreadCount = 0;
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      const item = state.items.find(n => n.id === action.payload);
      state.items = state.items.filter(n => n.id !== action.payload);
      if (item && !item.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    clearAll: (state) => {
      state.items = [];
      state.unreadCount = 0;
    },
  },
});

export const notificationActions = notificationsSlice.actions;
export default notificationsSlice.reducer;
