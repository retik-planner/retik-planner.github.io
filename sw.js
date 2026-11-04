// Retik offline worker: network first, so an online visit always gets the newest version;
// the copy kept in the cache opens the app when there is no connection.
'use strict';

const CACHE = 'retik-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')),
      ),
  );
});

// On the first visit the page loads before this worker runs, so the page sends the list of
// files it loaded and they are cached right away; the app then opens offline from the start.
self.addEventListener('message', (event) => {
  const urls = (event.data && event.data.cache) || [];
  const mine = urls.filter((u) => new URL(u).origin === self.location.origin);
  event.waitUntil(caches.open(CACHE).then((c) => Promise.all(mine.map((u) => c.add(u).catch(() => {})))));
});
