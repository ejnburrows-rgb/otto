/* OTTO Plumbing CRM — service worker
   Offline-first shell cache. App data lives in IndexedDB, not here. */
const CACHE = 'otto-crm-v5';
const SHELL = ['./', './index.html', './manifest.json', './logo.jpg'];

// The icon font and the two webfonts, fetched at install rather than waiting for
// a second visit. On the very first load the service worker is not controlling
// the page yet, so it never sees those requests — a phone that opened the app
// once and then lost signal had no icons at all.
const CDN_SHELL = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Inter:wght@400;500;600;700;800&display=swap',
];

// A stylesheet on its own is not enough: caching all.min.css while its
// fa-solid-900.woff2 stays on the network leaves every icon a blank box, and the
// computed font-family still reads "Font Awesome", so it looks fine to a test
// that only checks the name. Read the font files out of the stylesheet that was
// just fetched, rather than hardcoding them — these URLs carry version hashes
// that change whenever the CDN updates.
async function cacheFontsReferencedBy(cache, cssUrl, cssText) {
  const urls = [...cssText.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)]
    .map((m) => m[1])
    .filter((u) => u.endsWith('.woff2'))       // every browser this app targets uses woff2
    .map((u) => new URL(u, cssUrl).href);
  for (const u of [...new Set(urls)]) {
    try { await cache.add(new Request(u, { mode: 'cors' })); } catch (err) { /* keep going */ }
  }
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    // One at a time: addAll rejects the whole batch if any single request
    // fails, and a CDN hiccup must not cost the app its offline shell.
    for (const url of SHELL) {
      try { await c.add(url); } catch (err) { /* keep going */ }
    }
    for (const url of CDN_SHELL) {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res || res.status !== 200) continue;
        await c.put(url, res.clone());
        await cacheFontsReferencedBy(c, url, await res.text());
      } catch (err) { /* keep going */ }
    }
  }).catch(() => {}));
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
  // Never cache API calls (Anthropic, Gmail, QuickBooks, etc.).
  // Match the API hosts exactly. This used to be a substring test, which also
  // caught fonts.googleapis.com, so the stylesheet that declares every webfont
  // was never stored and the app lost its headings the moment a phone went
  // offline — while the font files it points at were cached and unusable.
  const API_HOSTS = [
    'api.anthropic.com',
    'gmail.googleapis.com',
    'www.googleapis.com',
    'oauth2.googleapis.com',
    'accounts.google.com',
    'apis.google.com',
  ];
  if (API_HOSTS.includes(url.hostname) ||
      url.hostname.endsWith('.intuit.com') ||
      url.hostname === 'intuit.com') return;
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
      if (res && res.status === 200 && (url.hostname.includes('cdnjs') || url.hostname.includes('fonts') || url.hostname.includes('cdn-icons') || url.hostname.includes('jsdelivr'))) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => m))
  );
});
