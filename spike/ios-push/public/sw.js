/**
 * The whole service worker. iOS does not allow a silent push, so every one has
 * to show something, which suits a spike whose question is whether and when
 * anything appears.
 */
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Push spike', {
      body: data.body ?? 'No body.',
      tag: data.tag,
      // Do not collapse one into another: the point is seeing each arrival.
      renotify: false,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
);
