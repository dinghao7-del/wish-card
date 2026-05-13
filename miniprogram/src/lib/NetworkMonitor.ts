/**
 * 网络状态监听器 — 小程序环境
 * 
 * 使用 wx.onNetworkStatusChange 监听网络变化
 */

import Taro from '@tarojs/taro';

type OnlineCallback = (online: boolean) => void;

class NetworkMonitorImpl {
  private _isOnline: boolean = true;
  private _listeners: Set<OnlineCallback> = new Set();
  private _started = false;

  constructor() {
    this._startListening();
  }

  private async _startListening() {
    if (this._started) return;
    this._started = true;

    // 获取初始状态
    try {
      const res = await Taro.getNetworkType();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._isOnline = (res as any).networkType !== 'none';
    } catch {}

    // 监听变化
    if (typeof wx !== 'undefined' && wx.onNetworkStatusChange) {
      wx.onNetworkStatusChange((res: { isConnected: boolean }) => {
        this._update(res.isConnected);
      });
    }

    // Taro 也支持
    Taro.onNetworkStatusChange?.((res: any) => {
      this._update(res.isConnected);
    });
  }

  get isOnline(): boolean { return this._isOnline; }

  subscribe(callback: OnlineCallback): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  private get listeners() { return this._listeners; }

  private _update(online: boolean) {
    const changed = this._isOnline !== online;
    this._isOnline = online;
    console.log(`[Network] ${online ? '🟢 在线' : '🔴 离线'}`);

    this._listeners.forEach(cb => {
      try { cb(online); } catch (e) { console.warn('[Network] callback error:', e); }
    });

    if (online && changed) {
      this._listeners.forEach(cb => {
        try { (cb as any).__onBackOnline?.(); } catch {}
      });
    }
  }
}

const instance = new NetworkMonitorImpl();
export const NetworkMonitor = instance;
export const isOnline = () => instance.isOnline;
