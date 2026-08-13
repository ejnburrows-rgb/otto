/* OTTO Plumbing CRM — service worker
   Offline-first shell cache. App data lives in IndexedDB, not here. */
const CACHE = 'otto-crm-v13';
// landing.html and guide.html ship too. Without them here, an installed phone
// with no signal that opened /guide.html was served the CRM instead, because the
// navigate handler below falls back to index.html for anything it cannot fetch.
const SHELL = [
  './', './index.html', './landing.html', './guide.html', './manifest.json', './logo.jpg',
  './otto-home.css', './otto-home.js',
  './otto-ui-polish.css', './otto-ui-polish.js',
  './otto-quickbooks-handoff.css', './otto-quickbooks-handoff.js',
  './otto-client-visible-polish.css',
  './design-assets/wallpapers/julio-pablo.avif', './design-assets/wallpapers/sarays.avif'
];

function runtimeScriptsIn(html) {
  return [...html.matchAll(/\.(?:src|workerSrc)\s*=\s*['"](https:\/\/[^'"]+)['"]/g)]
    .map((m) => m[1]);
}

function cdnStylesheetsIn(html) {
  return [...html.matchAll(/<link\b[^>]*>/g)]
    .filter((tag) => /rel=["']stylesheet["']/.test(tag[0]))
    .map((tag) => (tag[0].match(/href=["']([^"']+)["']/) || [])[1])
    .filter((href) => href && href.startsWith('https://'));
}

function cdnScriptsIn(html) {
  return [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/g)]
    .map((m) => m[1])
    .filter((src) => src && src.startsWith('https://'));
}

async function cacheFontsReferencedBy(cache, cssUrl, cssText) {
  const urls = [...cssText.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)]
    .map((m) => m[1])
    .filter((u) => u.endsWith('.woff2'))
    .map((u) => new URL(u, cssUrl).href);
  for (const u of [...new Set(urls)]) {
    try { await cache.add(new Request(u, { mode: 'cors' })); } catch (err) { /* keep going */ }
  }
}

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    for (const url of SHELL) {
      try { await c.add(url); } catch (err) { /* keep going */ }
    }

    let html = '';
    try {
      const page = await fetch('./index.html');
      if (page && page.status === 200) html = await page.text();
    } catch (err) { /* keep going */ }

    for (const url of cdnStylesheetsIn(html)) {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res || res.status !== 200) continue;
        await c.put(url, res.clone());
        await cacheFontsReferencedBy(c, url, await res.text());
      } catch (err) { /* keep going */ }
    }

    const runtimeScripts = [...new Set([...cdnScriptsIn(html), ...runtimeScriptsIn(html)])];
    for (const url of runtimeScripts) {
      try { await c.add(new Request(url, { mode: 'cors' })); } catch (err) { /* keep going */ }
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
  const API_HOSTS = [
    'api.anthropic.com',
    'www.googleapis.com',
    'oauth2.googleapis.com',
  ];
  if (API_HOSTS.includes(url.hostname) ||
      url.hostname.endsWith('.intuit.com') ||
      url.hostname === 'intuit.com') return;
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((m) => {
        if (m) return m;
        const p = url.pathname;
        if (p.endsWith('/landing.html') || p.endsWith('/guide.html')) return caches.match(p.slice(p.lastIndexOf('/') + 1) ? './' + p.slice(p.lastIndexOf('/') + 1) : './index.html');
        return caches.match('./index.html');
      }))
    );
    return;
  }
  const sameOrigin = url.origin === self.location.origin;
  e.respondWith(
    caches.match(req, { ignoreSearch: sameOrigin }).then((m) => m || fetch(req).then((res) => {
      if (res && res.status === 200 && (url.hostname.includes('cdnjs') || url.hostname.includes('fonts') || url.hostname.includes('cdn-icons') || url.hostname.includes('jsdelivr'))) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => m))
  );
});
