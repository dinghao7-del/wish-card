/**
 * 网络状态监听器 — Web / Capacitor 环境
 * 
 * 功能：
 * 1. 监听 online/offline 事件
 * 2. 上线瞬间触发同步
 * 3. 提供统一的订阅机制
 */

type OnlineCallback = (online: boolean) => void;

class NetworkMonitorImpl {
  private _isOnline: boolean;
  private _listeners: Set<OnlineCallback> = new Set();

  constructor() {
    // 初始状态
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this._update(true));
      window.addEventListener('offline', () => this._update(false));
    }
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  /** 订阅网络状态变化，返回取消订阅函数 */
  subscribe(callback: OnlineCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private get listeners() {
    return this._listeners;
  }

  private _update(online: boolean) {
    const changed = this._isOnline !== online;
    this._isOnline = online;
    console.log(`[Network] ${online ? '🟢 在线' : '🔴 离线'}`);

    // 通知所有订阅者
    this._listeners.forEach(cb => {
      try { cb(online); } catch (e) { console.warn('[Network] callback error:', e); }
    });

    // 上线时触发特殊事件（用于立即同步）
    if (online && changed) {
      this._listeners.forEach(cb => {
        try { (cb as any).__onBackOnline?.(); } catch {}
      });
    }
  }
}

// 单例
const instance = new NetworkMonitorImpl();
export const NetworkMonitor = instance;
export const isOnline = () => instance.isOnline;
