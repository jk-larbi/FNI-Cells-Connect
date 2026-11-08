// Firebase Cloud Messaging Service Worker for FNI CELLS CONNECT
// Handles background push notifications, system badges, and deep-link click routing

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Default / fallback configuration
const defaultConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(defaultConfig);
  }
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || payload.data?.title || 'FNI CELLS CONNECT';
    const body = payload.notification?.body || payload.data?.message || payload.data?.body || 'New ministry update received';
    const tag = payload.data?.idempotencyKey || payload.data?.tag || ('fni-' + Date.now());

    const notificationOptions = {
      body: body,
      icon: '/fni-official-logo.jpg',
      badge: '/logo.svg',
      tag: tag,
      renotify: true,
      data: payload.data || {},
      actions: [
        { action: 'open', title: 'Open in FNI Connect' }
      ]
    };

    return self.registration.showNotification(title, notificationOptions);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js] Compat init skipped, using native push event listeners:', err);
}

// Native Push Event Fallback Handler
self.addEventListener('push', function(event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.notification?.title || payload.data?.title || 'FNI CELLS CONNECT';
    const body = payload.notification?.body || payload.data?.message || payload.data?.body || 'New notification received';
    const tag = payload.data?.idempotencyKey || payload.data?.tag || ('fni-' + Date.now());

    const options = {
      body: body,
      icon: '/fni-official-logo.jpg',
      badge: '/logo.svg',
      tag: tag,
      renotify: true,
      data: payload.data || {},
      actions: [
        { action: 'open', title: 'Open in FNI Connect' }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('FNI CELLS CONNECT', {
        body: text || 'New ministry update received.',
        icon: '/fni-official-logo.jpg',
        badge: '/logo.svg',
      })
    );
  }
});

// Notification Click Handler: Deep-link into active tab or open window
self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data || {};
  const targetTab = data.targetTab || data.tab || '';
  const reportId = data.reportId || '';
  const conversationId = data.conversationId || '';

  let clickUrl = '/';
  if (targetTab) {
    clickUrl = `/?tab=${encodeURIComponent(targetTab)}`;
    if (reportId) clickUrl += `&reportId=${encodeURIComponent(reportId)}`;
    if (conversationId) clickUrl += `&conversationId=${encodeURIComponent(conversationId)}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients) {
      // 1. If an existing app window is open, focus it and broadcast event
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'FNI_NOTIFICATION_CLICK',
            data: data,
            targetTab: targetTab,
            reportId: reportId,
            conversationId: conversationId
          });
          return;
        }
      }
      // 2. Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(clickUrl);
      }
    })
  );
});
