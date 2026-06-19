/* OTTO Plumbing CRM — service worker
   Offline-first shell cache. App data lives in IndexedDB, not here. */
const CACHE = 'otto-crm-v1';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Never cache API calls (Anthropic, Firebase, QuickBooks, etc.)
  if (url.hostname.includes('anthropic.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('intuit.com')) return;
  // Network-first for the app shell so updates land; fall back to cache offline.
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }
  // Cache-first for static CDN assets (fonts, icons).
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((res) => {
      if (res && res.status === 200 && (url.hostname.includes('cdnjs') || url.hostname.includes('fonts') || url.hostname.includes('cdn-icons'))) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => m))
  );
});
