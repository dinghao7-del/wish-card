import { describe, expect, it } from 'vitest';
import { buildSyncBannerPresentation } from '../lib/syncStatusPresentation';
import type { SyncStatus } from '../lib/SyncEngine';

const baseStatus: SyncStatus = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
};

describe('同步状态提示', () => {
  it('游客模式不展示云端同步提示', () => {
    expect(buildSyncBannerPresentation({
      currentUser: { id: 'guest' },
      guestMode: true,
      isFullPage: false,
      status: { ...baseStatus, pendingCount: 3 },
    })).toMatchObject({
      visible: false,
      tone: 'synced',
    });
  });

  it('离线时说明数据保存在本机，并显示待同步数量', () => {
    expect(buildSyncBannerPresentation({
      currentUser: { id: 'parent-1' },
      guestMode: false,
      isFullPage: false,
      status: { ...baseStatus, isOnline: false, pendingCount: 2 },
    })).toMatchObject({
      visible: true,
      tone: 'offline',
      text: '离线使用中 · 2 项待同步',
      actionLabel: null,
    });
  });

  it('在线但有待同步操作时给出手动同步入口', () => {
    expect(buildSyncBannerPresentation({
      currentUser: { id: 'parent-1' },
      guestMode: false,
      isFullPage: false,
      status: { ...baseStatus, pendingCount: 4 },
    })).toMatchObject({
      visible: true,
      tone: 'pending',
      text: '4 项等待同步',
      actionLabel: '同步',
    });
  });

  it('同步失败时优先展示重试入口', () => {
    expect(buildSyncBannerPresentation({
      currentUser: { id: 'parent-1' },
      guestMode: false,
      isFullPage: false,
      status: { ...baseStatus, lastError: 'network failed' },
    })).toMatchObject({
      visible: true,
      tone: 'error',
      actionLabel: '重试',
    });
  });
});
