const FNI_SCOPE = self.registration.scope;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch {
      payload = { body: event.data?.text() || '' };
    }

    const title = payload.title || 'FNI Cells Connect';
    const options = {
      body: payload.body || 'You have a new FNI update.',
      icon: payload.icon || `${FNI_SCOPE}fni-official-logo.jpg`,
      badge: payload.badge || `${FNI_SCOPE}logo.svg`,
      tag: payload.tag || `fni-${Date.now()}`,
      renotify: Boolean(payload.renotify),
      data: payload.data || {},
      timestamp: payload.timestamp || Date.now(),
    };

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  event.waitUntil((async () => {
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
    return self.clients.openWindow(target.toString());
  })());
});

self.addEventListener('pushsubscriptionchange', event => {
  // The application re-registers the subscription the next time the member opens FNI.
  event.waitUntil(Promise.resolve());
});
