import type { SyncStatus } from './SyncEngine';

export type SyncBannerTone = 'offline' | 'syncing' | 'error' | 'pending' | 'synced';

export interface SyncBannerPresentation {
  visible: boolean;
  tone: SyncBannerTone;
  text: string;
  actionLabel: string | null;
}

export function buildSyncBannerPresentation(params: {
  currentUser: unknown;
  guestMode: boolean;
  isFullPage: boolean;
  status: SyncStatus;
}): SyncBannerPresentation {
  const { currentUser, guestMode, isFullPage, status } = params;

  if (!currentUser || guestMode || isFullPage) {
    return {
      visible: false,
      tone: 'synced',
      text: '',
      actionLabel: null,
    };
  }

  if (!status.isOnline) {
    return {
      visible: true,
      tone: 'offline',
      text: status.pendingCount > 0
        ? `离线使用中 · ${status.pendingCount} 项待同步`
        : '离线使用中 · 数据已保存在本机',
      actionLabel: null,
    };
  }

  if (status.isSyncing) {
    return {
      visible: true,
      tone: 'syncing',
      text: '正在同步家庭数据',
      actionLabel: null,
    };
  }

  if (status.lastError) {
    return {
      visible: true,
      tone: 'error',
      text: '同步遇到问题',
      actionLabel: '重试',
    };
  }

  if (status.pendingCount > 0) {
    return {
      visible: true,
      tone: 'pending',
      text: `${status.pendingCount} 项等待同步`,
      actionLabel: '同步',
    };
  }

  return {
    visible: false,
    tone: 'synced',
    text: '已同步',
    actionLabel: null,
  };
}
