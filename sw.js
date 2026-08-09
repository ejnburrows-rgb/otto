/* OTTO Plumbing CRM — service worker
   Offline-first shell cache. App data lives in IndexedDB, not here. */
const CACHE = 'otto-crm-v8';
// landing.html and guide.html ship too. Without them here, an installed phone
// with no signal that opened /guide.html was served the CRM instead, because the
// navigate handler below falls back to index.html for anything it cannot fetch.
const SHELL = [
  './', './index.html', './landing.html', './guide.html', './manifest.json', './logo.jpg',
  './otto-home.css', './otto-home.js',
  './design-assets/wallpapers/julio-pablo.avif', './design-assets/wallpapers/sarays.avif'
];

// The icon font and the webfonts, fetched at install rather than waiting for a
// second visit. On the very first load the service worker is not controlling the
// page yet, so it never sees those requests — a phone that opened the app once
// and then lost signal had no icons at all.
//
// These URLs are read out of index.html rather than listed here. They were
// listed here once, and then the dashboard redesign added two more font families
// to the page's stylesheet link without touching this file. The worker went on
// caching the old URL, the page went on asking for the new one, and every
// webfont vanished the moment a phone lost signal — while the icons, whose URL
// had not changed, carried on working and made it look fine. One URL, one place.
function cdnStylesheetsIn(html) {
  return [...html.matchAll(/<link\b[^>]*>/g)]
    .filter((tag) => /rel=["']stylesheet["']/.test(tag[0]))
    .map((tag) => (tag[0].match(/href=["']([^"']+)["']/) || [])[1])
    .filter((href) => href && href.startsWith('https://'));
}

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
    // Ask the page itself which stylesheets it loads. If it cannot be read there
    // is nothing to cache and nothing to guess at.
    let cdnShell = [];
    try {
      const page = await fetch('./index.html');
      if (page && page.status === 200) cdnShell = cdnStylesheetsIn(await page.text());
    } catch (err) { /* keep going */ }
    for (const url of cdnShell) {
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
      }).catch(() => caches.match(req).then((m) => {
        if (m) return m;
        // Only fall back to the app for app navigations. The marketing site and
        // the user guide are separate pages; serving the CRM in place of the one
        // that was asked for is worse than an offline error.
        const p = url.pathname;
        if (p.endsWith('/landing.html') || p.endsWith('/guide.html')) return caches.match(p.slice(p.lastIndexOf('/') + 1) ? './' + p.slice(p.lastIndexOf('/') + 1) : './index.html');
        return caches.match('./index.html');
      }))
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
