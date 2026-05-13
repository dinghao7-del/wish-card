/**
 * Forest Family 小程序 - 通知中心组件
 * 对齐 Web 端 src/components/NotificationCenter.tsx
 *
 * 使用本地存储 (Taro.setStorageSync) 而非 Redux
 */

import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useCallback } from 'react';
import Taro from '@tarojs/taro';
import Icon from '@/components/Icon';
import './index.scss';

// ==================== 类型定义（对齐Web L7-19）====================

export type NotificationType = 'task_completed' | 'task_reviewing' | 'task_approved' | 'reward_redeemed' | 'reward_approved' | 'habit_target' | 'system' | 'suggestion';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

const STORAGE_KEY = 'wishcard_notifications';
const MAX_NOTIFICATIONS = 50;

// ==================== 本地 Hook（替代 Redux） ====================

function useLocalNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = Taro.getStorageSync(STORAGE_KEY);
      return Array.isArray(stored) ? stored : [];
    } catch { return []; }
  });
  const [isOpen, setIsOpen] = useState(false);

  // 持久化
  useEffect(() => {
    try {
      Taro.setStorageSync(STORAGE_KEY, notifications.slice(0, MAX_NOTIFICATIONS));
    } catch {}
  }, [notifications]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, addNotification, markAsRead, markAllAsRead, removeNotification, clearAll, isOpen, setIsOpen };
}

// ==================== 通知图标映射（对齐 Web L103-115）====================

function NotifIcon({ type }: { type: NotificationType }) {
  const config: Record<NotificationType, { name: string; color: string }> = {
    task_completed: { name: 'checkCircle', color: '#4CAF50' },
    task_reviewing: { name: 'clock', color: '#f97316' },
    task_approved: { name: 'checkCircle', color: '#2196F3' },
    reward_redeemed: { name: 'gift', color: '#9C27B0' },
    reward_approved: { name: 'star', color: '#F9A825' },
    habit_target: { name: 'target', color: '#3F51B5' },
    system: { name: 'bell', color: '#9E9E9E' },
    suggestion: { name: 'sparkles', color: '#009688' },
  };
  const c = config[type] || config.system;
  return (
    <View className="notif-item-icon" style={{ backgroundColor: `${c.color}15` }}>
      <Icon name={c.name} size={32} color={c.color} />
    </View>
  );
}

// ==================== 通知面板（对齐 Web NotificationPanel L119-222）====================

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useLocalNotifications();

  if (!visible) return null;

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  return (
    <View className="modal-mask" onClick={onClose}>
      <View className="notif-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <View className="notif-panel-header">
          <View className="notif-header-left">
            <Icon name="bell" size={36} color="#006e1c" />
            <Text className="notif-panel-title">通知中心</Text>
            {unreadCount > 0 && (
              <View className="notif-unread-badge">
                <Text className="notif-unread-text">{unreadCount}</Text>
              </View>
            )}
          </View>
          <View className="notif-header-right">
            {unreadCount > 0 && (
              <View className="notif-action-btn" onClick={markAllAsRead}>
                <Text className="notif-action-text">全部已读</Text>
              </View>
            )}
            {notifications.length > 0 && (
              <View className="notif-action-btn" onClick={clearAll}>
                <Text className="notif-action-text secondary">清空</Text>
              </View>
            )}
            <View className="notif-close-btn" onClick={onClose}>
              <Icon name="x" size={28} color="#3f4a3c" />
            </View>
          </View>
        </View>

        {/* List */}
        <ScrollView className="notif-panel-list" scrollY enhanced showScrollbar={false}>
          {notifications.length === 0 ? (
            <View className="notif-empty">
              <Icon name="bell" size={56} color="#becab9" />
              <Text className="notif-empty-text">暂无通知</Text>
            </View>
          ) : (
            notifications.map(n => (
              <View
                key={n.id}
                className={`notif-item ${!n.read ? 'unread' : ''}`}
                onClick={() => markAsRead(n.id)}
              >
                <NotifIcon type={n.type} />
                <View className="notif-item-content">
                  <View className="notif-item-top">
                    <Text className={`notif-item-title ${!n.read ? 'bold' : ''}`}>{n.title}</Text>
                    <View className="notif-item-delete" onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}>
                      <Icon name="trash2" size={24} color="#becab9" />
                    </View>
                  </View>
                  <Text className="notif-item-msg">{n.message}</Text>
                  <Text className="notif-item-time">{formatTime(n.timestamp)}</Text>
                </View>
                {!n.read && <View className="notif-unread-dot" />}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ==================== 通知铃铛按钮（对齐 Web NotificationBell L226-253）====================

interface NotificationBellProps {
  onClick: () => void;
}

export function NotificationBell({ onClick }: NotificationBellProps) {
  const { unreadCount } = useLocalNotifications();

  return (
    <View className="notif-bell-btn" onClick={onClick}>
      <Icon name="bell" size={40} color="#3f4a3c" />
      {unreadCount > 0 && (
        <View className="notif-bell-badge">
          <Text className="notif-bell-badge-text">{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

export default NotificationPanel;
