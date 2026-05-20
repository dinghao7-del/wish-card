// 愿望卡 Service Worker - PWA 离线支持
const CACHE_NAME = 'wishcard-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// 安装：预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 请求拦截：Network First 策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API 请求不缓存
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    return;
  }

  // 静态资源：Cache First
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/avatars/') ||
    url.pathname.startsWith('/task-icons/') ||
    url.pathname.startsWith('/reward-icons/') ||
    url.pathname.match(/\.(png|jpg|svg|ico|webp|woff2)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML 页面：Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/index.html');
        });
      })
  );
});

// 推送通知
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || '愿望卡通知';
  const options = {
    body: data.message || '',
    icon: '/pwa-icons/icon-192.png',
    badge: '/pwa-icons/icon-192.png',
    data: data.action_url ? { url: data.action_url } : {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
