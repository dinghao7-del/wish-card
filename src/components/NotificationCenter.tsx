import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle2, AlertCircle, Gift, Star, Clock, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// ==================== 通知类型 ====================

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
  data?: Record<string, any>;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem('wishcard_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('wishcard_notifications', JSON.stringify(notifications.slice(0, 50)));
    } catch {}
  }, [notifications]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: AppNotification = {
      ...n,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));

    // 浏览器推送（需用户授权）
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newNotif.title, { body: newNotif.message, icon: '/pwa-icons/icon-192.png' });
      } catch {}
    }
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

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, addNotification, markAsRead,
      markAllAsRead, removeNotification, clearAll, isOpen, setIsOpen,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

// ==================== 通知图标映射 ====================

function getNotifIcon(type: NotificationType) {
  switch (type) {
    case 'task_completed': return <CheckCircle2 size={18} className="text-primary" />;
    case 'task_reviewing': return <Clock size={18} className="text-warning" />;
    case 'task_approved': return <CheckCircle2 size={18} className="text-primary" />;
    case 'reward_redeemed': return <Gift size={18} className="text-secondary" />;
    case 'reward_approved': return <Star size={18} className="text-secondary" />;
    case 'habit_target': return <AlertCircle size={18} className="text-tertiary" />;
    case 'system': return <Bell size={18} className="text-on-surface-variant" />;
    case 'suggestion': return <AlertCircle size={18} className="text-primary" />;
    default: return <Bell size={18} className="text-on-surface-variant" />;
  }
}

// ==================== 通知中心面板 ====================

export function NotificationPanel() {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll, isOpen, setIsOpen } = useNotifications();

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return t('notification_center.just_now');
    if (diff < 3600000) return t('notification_center.minutes_ago', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('notification_center.hours_ago', { count: Math.floor(diff / 3600000) });
    return t('notification_center.days_ago', { count: Math.floor(diff / 86400000) });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[90]"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-background z-[91] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-primary" />
                <h2 className="font-bold text-on-surface">{t('notification_center.title')}</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-primary font-medium">
                    {t('notification_center.mark_all_read')}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-on-surface-variant">
                    {t('notification_center.clear')}
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1">
                  <X size={20} className="text-on-surface-variant" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant">
                  <Bell size={48} className="opacity-20 mb-3" />
                  <p className="text-sm">{t('notification_center.empty')}</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/10">
                  {notifications.map(n => (
                    <motion.div
                      key={n.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 50 }}
                      className={`px-4 py-3 flex gap-3 hover:bg-surface-container/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!n.read ? 'font-bold text-on-surface' : 'text-on-surface-variant'}`}>
                            {n.title}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                            className="p-0.5 text-on-surface-variant/40 hover:text-on-surface-variant"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-on-surface-variant/50 mt-1">{formatTime(n.timestamp)}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== 通知铃铛按钮 ====================

export function NotificationBell() {
  const { unreadCount, setIsOpen } = useNotifications();

  // 请求推送权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
    >
      <Bell size={20} className="text-on-surface-variant" />
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </motion.span>
      )}
    </button>
  );
}
