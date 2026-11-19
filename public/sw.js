// FNI Cells Connect — Service Worker with PWA Offline Shell & Push Notifications
const CACHE_VERSION = 'fni-pwa-shell-v2';
const FNI_SCOPE = self.registration.scope;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './fni-official-logo.jpg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './logo.svg',
];

// 1. Install Event: Cache Core Application Shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async cache => {
      try {
        await cache.addAll(CORE_ASSETS);
      } catch (err) {
        console.warn('[FNI SW] Pre-caching non-fatal warning:', err);
      }
      return self.skipWaiting();
    })
  );
});

// 2. Activate Event: Clean Stale Caches and Claim Clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(async keys => {
      await Promise.all(
        keys.map(key => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      );
      return self.clients.claim();
    })
  );
});

// Helper: Determine if request is a sensitive API or real-time stream that MUST NOT be cached
function isUncacheable(url) {
  const href = url.href.toLowerCase();
  return (
    href.includes('supabase.co') ||
    href.includes('/rest/v1/') ||
    href.includes('/auth/v1/') ||
    href.includes('/functions/v1/') ||
    href.includes('livekit') ||
    href.includes('firebaseio.com') ||
    href.includes('googleapis.com') ||
    href.includes('google-analytics.com') ||
    href.includes('nominatim.openstreetmap.org') ||
    href.includes('google.com/maps')
  );
}

// 3. Fetch Event: Reliable Caching without locking out updates
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Strictly skip external APIs, Supabase Auth/DB, WebRTC, and non-http schemes
  if (!url.protocol.startsWith('http') || isUncacheable(url)) {
    return;
  }

  // Strategy A: Navigation Requests (HTML Pages) -> Network-First with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('./index.html') || await caches.match(`${FNI_SCOPE}index.html`);
          return fallback || Response.error();
        })
    );
    return;
  }

  // Strategy B: Static Assets (JS, CSS, Images, Fonts) -> Stale-While-Revalidate
  const isStaticAsset =
    url.pathname.includes('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        const fetchPromise = fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_VERSION).then(cache => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// 4. Push Event: Handle Background Web Push Notifications on iOS & Android
self.addEventListener('push', event => {
  event.waitUntil(
    (async () => {
      let payload = {};
      try {
        payload = event.data ? event.data.json() : {};
      } catch {
        payload = { body: event.data?.text() || '' };
      }

      const title = payload.title || 'FNI Cells Connect';
      const options = {
        body: payload.body || 'You have a new FNI update.',
        icon: payload.icon || `${FNI_SCOPE}apple-touch-icon.png`,
        badge: payload.badge || `${FNI_SCOPE}logo.svg`,
        tag: payload.tag || `fni-${Date.now()}`,
        renotify: Boolean(payload.renotify),
        data: payload.data || {},
        timestamp: payload.timestamp || Date.now(),
      };

      // Set App Badge if supported on iOS/macOS/desktop
      if ('setAppBadge' in navigator && typeof payload.badgeCount === 'number') {
        try {
          await navigator.setAppBadge(payload.badgeCount);
        } catch {}
      }

      await self.registration.showNotification(title, options);
    })()
  );
});

// 5. Notification Click Event: Deep Link into Conversations, Groups, Meetings, or Reports
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};

  // Clear app badge when notification clicked
  if ('clearAppBadge' in navigator) {
    try {
      navigator.clearAppBadge();
    } catch {}
  }

  event.waitUntil(
    (async () => {
      if (typeof data.actionUrl === 'string') {
        try {
          const mapsUrl = new URL(data.actionUrl);
          if (mapsUrl.hostname === 'www.google.com' && mapsUrl.pathname.startsWith('/maps/')) {
            return self.clients.openWindow(mapsUrl.toString());
          }
        } catch {}
      }

      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          client.postMessage({
            type: 'FNI_NOTIFICATION_CLICK',
            targetTab: data.targetTab || 'notifications',
            reportId: data.reportId,
            conversationId: data.conversationId,
            materialId: data.materialId,
          });
          return client.focus();
        }
      }

      const target = new URL(FNI_SCOPE);
      target.searchParams.set('fniNotification', '1');
      if (data.targetTab) target.searchParams.set('tab', data.targetTab);
      return self.clients.openWindow(target.toString());
    })()
  );
});

// 6. Push Subscription Change Event
self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(Promise.resolve());
});
