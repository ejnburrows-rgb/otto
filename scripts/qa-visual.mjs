// The check this repository keeps needing and never had: does the app actually
// LOOK right, and does it survive losing signal?
//
//   npm run qa:visual        (needs `npm start` running, and a network connection)
//
// Why it exists. Every fault that has shipped here would have been caught by
// opening the app in a browser once, and the automated sweep that missed the
// draggable-card fault missed it because the sandbox could not reach the CDNs —
// so the broken code never ran where the testing happened. A green run that
// silently skipped half the app is worse than no run. This script therefore
// refuses to pretend: if it cannot fetch the CDN assets it says so and stops,
// rather than reporting a pass over an app with no icons in it.
//
// What it proves:
//   1. The icons and both webfonts really render — measured against a glyph, not
//      guessed from a font-family name, which still reads correctly when the
//      font file is missing and every icon is a blank box.
//   2. Every screen the owner can reach renders at 390 / 768 / 1280px with no
//      JavaScript error, no broken image and no sideways scroll.
//   3. A normal upward swipe does not carry a card up the screen (PR #89).
//   4. After ONE online visit, with the CDN hosts then taken away, the app still
//      has its icons and fonts — a crew phone that opened the app and drove out
//      of signal.
//
// For (4) a local HTTPS server stands in for the four CDN hosts, with Chromium's
// host-resolver-rules pointing the real hostnames at it. Requests have to be
// genuinely cross-origin and genuinely https, or the service worker's own
// caching rules — the thing under test — never get a say.

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.QA_URL || 'http://localhost:8000';
const WORK = process.env.QA_VISUAL_DIR || path.join(os.tmpdir(), 'otto-qa-visual');
const SHOTS = path.join(WORK, 'shots');
const CDN = path.join(WORK, 'cdn');
const PORT = Number(process.env.QA_VISUAL_PORT || 8443);

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};
const stop = (why) => { console.error(`\nCannot run this check: ${why}\n`); process.exit(2); };

fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(path.join(CDN, 'webfonts'), { recursive: true });
fs.mkdirSync(path.join(CDN, 'gstatic'), { recursive: true });

// ── the assets, fetched once and kept ────────────────────────────────────────
// curl rather than fetch(): it honours the proxy settings some sandboxes need,
// and this has to work in an environment the browser itself cannot reach out of.
//
// The two stylesheet URLs are read out of index.html, never written down here.
// They were written down here once, and the dashboard redesign then added two
// font families to the page without touching this file — so the stand-in went on
// serving a stylesheet declaring Newsreader and Inter while the app asked for
// one declaring Hanken Grotesk and JetBrains Mono as well. The offline check
// passed against fonts the app no longer uses. Same fault as the one in sw.js
// that it exists to catch, in the harness rather than the product.
const pageHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const stylesheetsInPage = [...pageHtml.matchAll(/<link\b[^>]*>/g)]
  .filter((tag) => /rel=["']stylesheet["']/.test(tag[0]))
  .map((tag) => (tag[0].match(/href=["']([^"']+)["']/) || [])[1])
  .filter((href) => href && href.startsWith('https://'));
const FA = stylesheetsInPage.find((u) => u.includes('font-awesome'));
const GF = stylesheetsInPage.find((u) => u.includes('fonts.googleapis.com'));
if (!FA) stop('index.html no longer links a Font Awesome stylesheet — nothing to stand in for.');
if (!GF) stop('index.html no longer links a Google Fonts stylesheet — nothing to stand in for.');

// The families the page actually asks for, so the offline check below tests the
// fonts the app really uses rather than a list that can quietly go stale.
const FAMILIES = [...new URL(GF).searchParams.getAll('family')]
  .map((f) => f.split(':')[0].replace(/\+/g, ' '));

const CHART = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

// The cached copy is keyed by the URL it came from. Keying it by filename alone
// means an edit to the page's font list silently reuses the previous download.
function grab(url, dest) {
  const stamp = dest + '.url';
  const fresh = fs.existsSync(dest) && fs.statSync(dest).size > 0
    && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === url;
  if (fresh) return true;
  try {
    execFileSync('curl', ['-sfL', '-A', UA, '--max-time', '30', '-o', dest, url], { stdio: 'pipe' });
    const ok = fs.existsSync(dest) && fs.statSync(dest).size > 0;
    if (ok) fs.writeFileSync(stamp, url);
    return ok;
  } catch { return false; }
}

console.log('fetching the CDN assets this app depends on…');
if (!grab(FA, path.join(CDN, 'fa.css'))) stop(`could not fetch Font Awesome (${FA}). Without it this script would test an app with no icons, which proves nothing.`);
if (!grab(GF, path.join(CDN, 'gfonts.css'))) stop('could not fetch the Google Fonts stylesheet.');
grab(CHART, path.join(CDN, 'chart.js'));
// The page loads pdf.js in its head. The stand-in has to serve it, or the browser
// reports a CORS failure that belongs to this harness rather than to the app.
grab(PDFJS, path.join(CDN, 'pdf.js'));
for (const f of ['fa-solid-900', 'fa-regular-400', 'fa-brands-400']) {
  grab(`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/${f}.woff2`, path.join(CDN, 'webfonts', `${f}.woff2`));
}
const gcss = fs.readFileSync(path.join(CDN, 'gfonts.css'), 'utf8');
const gUrls = [...new Set([...gcss.matchAll(/(https:\/\/fonts\.gstatic\.com[^)"']+)/g)].map(m => m[1]))];
for (const u of gUrls) grab(u, path.join(CDN, 'gstatic', u.split('/').pop()));
console.log(`  ${gUrls.length} webfont files ready\n`);

// ── a stand-in for the four CDN hosts ────────────────────────────────────────
const certDir = path.join(WORK, 'cert');
fs.mkdirSync(certDir, { recursive: true });
const KEY = path.join(certDir, 'key.pem'), CRT = path.join(certDir, 'cert.pem');
if (!fs.existsSync(KEY) || !fs.existsSync(CRT)) {
  const opensslBin = (() => {
    if (process.env.OPENSSL_BIN) return process.env.OPENSSL_BIN;
    if (process.platform === 'win32') {
      for (const p of ['C:\\Program Files\\OpenVPN\\bin\\openssl.exe', 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe']) {
        if (fs.existsSync(p)) return p;
      }
    }
    return 'openssl';
  })();
  const cnfPath = path.join(certDir, 'openssl.cnf');
  if (!fs.existsSync(cnfPath)) {
    fs.writeFileSync(cnfPath, '[req]\ndistinguished_name=req_dn\n[req_dn]\n');
  }
  const env = { ...process.env, OPENSSL_CONF: process.env.OPENSSL_CONF || cnfPath };
  try {
    execFileSync(opensslBin, ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', KEY, '-out', CRT,
      '-days', '2', '-nodes', '-subj', '/CN=cdn-stand-in'], { stdio: 'pipe', env });
  } catch (err) { stop('openssl is not available, and the offline test needs a local https server.'); }
}

const server = https.createServer({ key: fs.readFileSync(KEY), cert: fs.readFileSync(CRT) }, (req, res) => {
  const host = req.headers.host || '';
  const p = req.url.split('?')[0];
  let file = null, type = 'text/plain';
  if (host.startsWith('cdnjs') && p.endsWith('all.min.css')) { file = path.join(CDN, 'fa.css'); type = 'text/css'; }
  else if (host.startsWith('cdnjs') && p.includes('/pdf.js/')) { file = path.join(CDN, 'pdf.js'); type = 'application/javascript'; }
  else if (host.startsWith('cdnjs') && p.includes('/webfonts/')) { file = path.join(CDN, 'webfonts', p.split('/').pop()); type = 'font/woff2'; }
  else if (host.startsWith('fonts.googleapis')) { file = path.join(CDN, 'gfonts.css'); type = 'text/css'; }
  else if (host.startsWith('fonts.gstatic')) { file = path.join(CDN, 'gstatic', p.split('/').pop()); type = 'font/woff2'; }
  else if (host.startsWith('cdn.jsdelivr')) { file = path.join(CDN, 'chart.js'); type = 'application/javascript'; }
  if (file && fs.existsSync(file)) {
    res.writeHead(200, { 'content-type': type, 'access-control-allow-origin': '*', 'cache-control': 'max-age=3600' });
    res.end(fs.readFileSync(file));
  } else { res.writeHead(404, { 'access-control-allow-origin': '*' }); res.end('not here'); }
});
await new Promise((r, j) => { server.once('error', j); server.listen(PORT, r); }).catch(() => stop(`port ${PORT} is in use; set QA_VISUAL_PORT.`));

const HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: [
    `--host-resolver-rules=${HOSTS.map(h => `MAP ${h} 127.0.0.1:${PORT}`).join(', ')}`,
    '--ignore-certificate-errors',
    // Chromium on Linux reads HTTPS_PROXY from the environment by itself and
    // would tunnel these hosts to the proxy, ignoring the mapping above.
    '--no-proxy-server',
  ],
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, hasTouch: true, isMobile: true,
});
const page = await ctx.newPage();

const errors = [], badReq = [];
// The local server serves static files only, with no serverless functions, so
// /api/* failures are expected here. Google sign-in is not part of this check.
const expected = (s) => /\/api\/(data|photos|claude|nvidia|notify|quickbooks)/.test(s) || /google\.com/.test(s);
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() !== 'error') return;
  // 'Failed to load resource' carries no URL, so it cannot be judged alone —
  // the request listeners below are the authority on what actually failed.
  if (/Failed to load resource/.test(m.text())) return;
  if (!expected(m.text())) errors.push('console: ' + m.text());
});
page.on('requestfailed', r => { if (!expected(r.url())) badReq.push(`${r.url().slice(0, 90)} ${r.failure()?.errorText || ''}`); });
page.on('response', r => { if (r.status() >= 400 && !expected(r.url())) badReq.push(`${r.status()} ${r.url().slice(0, 90)}`); });

// Reads what is actually on screen. Note the glyph measurement: when the .woff2
// is missing the computed font-family still reads "Font Awesome 6 Free" and
// every icon is a blank box, so the name alone proves nothing.
const visualState = () => page.evaluate(async (families) => {
  await document.fonts.ready;
  const el = document.querySelector('i.fas, i.fa-solid');
  const family = el ? getComputedStyle(el, '::before').fontFamily : 'none';
  const faceLoaded = await document.fonts.load('900 16px "Font Awesome 6 Free"').then(r => r.length > 0).catch(() => false);
  const width = (font) => { const c = document.createElement('canvas').getContext('2d'); c.font = font; return c.measureText('\uf015').width; };
  const glyph = width('900 16px "Font Awesome 6 Free"'), tofu = width('900 16px "NoSuchFontAnywhere"');
  const webfonts = {};
  for (const f of families) {
    webfonts[f] = await document.fonts.load(`600 32px "${f}"`).then(r => r.length > 0).catch(() => false);
  }
  return {
    iconsRender: /Font Awesome/i.test(family) && faceLoaded && glyph !== tofu,
    glyph, tofu, webfonts,
    missing: Object.entries(webfonts).filter(([, ok]) => !ok).map(([f]) => f),
    chart: typeof window.Chart !== 'undefined',
  };
}, FAMILIES);

try {
  // ── 1. online ──────────────────────────────────────────────────────────────
  console.log('online — the app as the owner sees it');
  await page.goto(`${BASE}/index.html?demo=1`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  check('the page is the real app', (await page.title()).includes('OTTO'));
  check('no JavaScript error on load', errors.length === 0, errors.slice(0, 3).join(' | '));
  const online = await visualState();
  check('the icons render as real glyphs', online.iconsRender, `glyph ${online.glyph}px vs fallback ${online.tofu}px`);
  check(`every webfont the page asks for loaded (${FAMILIES.join(', ')})`,
    online.missing.length === 0, online.missing.join(', '));

  // ── 2. sign in through the real keypad ─────────────────────────────────────
  // Invented here, typed here, thrown away with the browser profile. It is
  // generated rather than written down so that no sign-in code — not even a
  // throwaway one — ever sits in a file in this repository.
  const code = String(Math.floor(Math.random() * 9000) + 1000);
  console.log('\nsigning in the way a person does');
  await page.evaluate((pin) => {
    const u = window.__db().users.find(x => x.id === 'owner-1');
    delete u.pinHash; delete u.pinSalt; delete u.mfaPin; delete u.mfaHash; delete u.mfaSalt;
    u.pin = pin; window.__save();
  }, code);
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const row = page.locator('.list-item').filter({ hasText: /owner|dueñ/i }).first();
  await (await row.count() ? row : page.locator('.list-item').first()).click();
  await page.waitForTimeout(400);
  for (const d of code) {
    await page.locator('.pinpad button').filter({ hasText: new RegExp(`^${d}$`) }).first().click();
    await page.waitForTimeout(160);
  }
  await page.waitForTimeout(2500);
  const inApp = await page.locator('#app').isVisible();
  check('the owner reaches the app', inApp);
  if (!inApp) {
    await page.screenshot({ path: path.join(SHOTS, 'FAILED-signin.png') });
    throw new Error('sign-in failed — screenshot in ' + SHOTS);
  }

  // ── 3. every screen, three widths ──────────────────────────────────────────
  const views = ['home', 'hub', 'kpis', 'urgent', 'customers', 'jobs', 'calls', 'inbox', 'emails',
    'estimates', 'invoices', 'payments', 'checks', 'payroll', 'alerts', 'followups', 'workflows',
    'knowledge', 'map', 'reports', 'backups', 'audit', 'team', 'settings', 'assistant'];
  const problems = [];
  for (const w of [390, 768, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    for (const v of views) {
      await page.evaluate((view) => window.nav(view), v);
      await page.waitForTimeout(420);
      const r = await page.evaluate(() => ({
        broken: [...document.images].filter(i => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
          .map(i => i.getAttribute('src')),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        empty: document.body.innerText.trim().length === 0,
      }));
      if (r.broken.length) problems.push(`${w}px ${v}: broken image ${r.broken.join(', ')}`);
      if (r.overflow > 0) problems.push(`${w}px ${v}: scrolls sideways by ${r.overflow}px`);
      if (r.empty) problems.push(`${w}px ${v}: renders nothing`);
    }
    console.log(`\nevery owner screen at ${w}px`);
    check(`all ${views.length} screens render, no broken image, no sideways scroll`,
      !problems.some(p => p.startsWith(`${w}px`)),
      problems.filter(p => p.startsWith(`${w}px`)).slice(0, 3).join(' | '));
  }

  // ── 4. the swipe that used to drag the whole card ──────────────────────────
  console.log('\nscrolling a list must not move the list');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.nav('customers'));
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => getComputedStyle(document.querySelector('.wrap .card')).transform);
  const at = await page.evaluate(() => {
    const r = document.querySelector('.wrap .card').getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + Math.min(r.height / 2, 300)) };
  });
  await page.evaluate(async ([x, y0]) => {
    const el = document.elementFromPoint(x, y0);
    const ev = (type, y) => new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
      changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
    });
    el.dispatchEvent(ev('touchstart', y0));
    for (let y = y0; y > y0 - 220; y -= 20) { el.dispatchEvent(ev('touchmove', y)); await new Promise(r => setTimeout(r, 20)); }
    el.dispatchEvent(ev('touchend', y0 - 220));
  }, [at.x, at.y]);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => getComputedStyle(document.querySelector('.wrap .card')).transform);
  check('a swipe leaves the card where it was', before === after, `${before} -> ${after}`);

  await page.evaluate(() => window.nav('home'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SHOTS, 'home-390.png') });

  console.log('\nacross the whole online pass');
  check('zero JavaScript errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('zero failed asset requests', badReq.length === 0, [...new Set(badReq)].slice(0, 3).join(' | '));

  // ── 5. one visit, then no signal ───────────────────────────────────────────
  // A fresh profile: this must hold for a phone that opens the app for the very
  // first time and then drives out of coverage, not one warmed up by the pass
  // above.
  console.log('\none online visit, then the signal goes — a crew phone in the field');
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, hasTouch: true, isMobile: true });
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE}/index.html?demo=1`, { waitUntil: 'networkidle', timeout: 60000 });
  await p2.evaluate(() => navigator.serviceWorker.ready).catch(() => {});
  await p2.waitForTimeout(4000);

  server.close();
  await new Promise(r => setTimeout(r, 300));
  await p2.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await p2.waitForTimeout(3500);

  const offline = await p2.evaluate(async (families) => {
    await document.fonts.ready;
    const el = document.querySelector('i.fas, i.fa-solid');
    const family = el ? getComputedStyle(el, '::before').fontFamily : 'none';
    const faceLoaded = await document.fonts.load('900 16px "Font Awesome 6 Free"').then(r => r.length > 0).catch(() => false);
    const width = (f) => { const c = document.createElement('canvas').getContext('2d'); c.font = f; return c.measureText('\uf015').width; };
    const glyph = width('900 16px "Font Awesome 6 Free"'), tofu = width('900 16px "NoSuchFontAnywhere"');
    const missing = [];
    for (const f of families) {
      const ok = await document.fonts.load(`600 32px "${f}"`).then(r => r.length > 0).catch(() => false);
      if (!ok) missing.push(f);
    }
    return {
      iconsRender: /Font Awesome/i.test(family) && faceLoaded && glyph !== tofu,
      glyph, tofu, missing,
      renders: document.body.innerText.trim().length > 0,
    };
  }, FAMILIES);
  await p2.screenshot({ path: path.join(SHOTS, 'offline-390.png') });
  check('the app still opens with no signal', offline.renders);
  check('the icons are still real glyphs offline', offline.iconsRender, `glyph ${offline.glyph}px vs fallback ${offline.tofu}px`);
  check(`every webfont survives offline (${FAMILIES.join(', ')})`,
    offline.missing.length === 0, offline.missing.join(', '));
} finally {
  try { server.close(); } catch { /* already closed */ }
  await browser.close();
}

console.log(`\nscreenshots: ${SHOTS}`);
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
