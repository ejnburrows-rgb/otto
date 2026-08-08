// The public site and the user guide, in a real browser.
//
//   npm start          (in one terminal)
//   npm run qa:site    (in another — needs a network connection)
//
// Why this exists. Until now nothing in this repository read, fetched or opened
// landing.html. Not one of the thirteen test scripts, not qa-check, not
// qa-visual. `docs/STATUS.md` recorded the booking form as "Verified with
// qa-check and npm test (all 307 checks pass)" — neither command reads the file
// that was changed. What was actually shipping to the public domain:
//
//   - the whole contact section unstyled above 768px, because a media query was
//     opened and never closed;
//   - no logo anywhere, because all four image sources were unreplaced
//     {{DATA:IMAGE:...}} template placeholders, each silenced by an onerror
//     handler that hid the failure;
//   - a third of the navigation pointing at sections that do not exist;
//   - a language toggle that could never bind, being a button inside a button.
//
// Source-level checks now catch that class of fault (test-ui-regressions.mjs).
// This is the other half: what the page actually looks like and does once a
// browser has it. It refuses to run rather than report a pass it cannot back up.

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import https from 'node:https';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.QA_URL || 'http://localhost:8000';
const WORK = process.env.QA_SITE_DIR || path.join(os.tmpdir(), 'otto-qa-site');
const SHOTS = path.join(WORK, 'shots');
const CDN = path.join(WORK, 'cdn');
const PORT = Number(process.env.QA_SITE_PORT || 8449);

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};
const stop = (why) => { console.error(`\nCannot run this check: ${why}\n`); process.exit(2); };

fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(path.join(CDN, 'webfonts'), { recursive: true });
fs.mkdirSync(path.join(CDN, 'gstatic'), { recursive: true });

// ── the CDN assets both pages depend on ──────────────────────────────────────
// curl rather than fetch(): it honours proxy settings the browser may not have,
// and this has to work where the browser itself cannot reach out.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
function grab(url, dest) {
  const stamp = dest + '.url';
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0
    && fs.existsSync(stamp) && fs.readFileSync(stamp, 'utf8') === url) return true;
  try {
    execFileSync('curl', ['-sfL', '-A', UA, '--max-time', '30', '-o', dest, url], { stdio: 'pipe' });
    const ok = fs.existsSync(dest) && fs.statSync(dest).size > 0;
    if (ok) fs.writeFileSync(stamp, url);
    return ok;
  } catch { return false; }
}

// Read the stylesheet URLs out of the pages rather than writing them down here.
// A hardcoded copy of exactly this list is what cost the app its webfonts
// offline when the page changed and the copy did not.
const pages = ['landing.html', 'guide.html'];
const linked = new Set();
for (const p of pages) {
  const src = fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  for (const tag of src.matchAll(/<link\b[^>]*>/g)) {
    if (!/rel=["']stylesheet["']/.test(tag[0])) continue;
    const href = (tag[0].match(/href=["']([^"']+)["']/) || [])[1];
    if (href && href.startsWith('https://')) linked.add(href);
  }
}
console.log('fetching the CDN assets these pages depend on…');
const FA = [...linked].find((u) => u.includes('font-awesome'));
if (FA && !grab(FA, path.join(CDN, 'fa.css'))) {
  stop(`could not fetch Font Awesome (${FA}). Without it this would test a page with no icons, which proves nothing.`);
}
let gIndex = 0;
const gfiles = [];
for (const u of [...linked].filter((x) => x.includes('fonts.googleapis.com'))) {
  const f = path.join(CDN, `gfonts-${gIndex++}.css`);
  if (!grab(u, f)) stop(`could not fetch a Google Fonts stylesheet (${u}).`);
  gfiles.push(f);
}
for (const f of ['fa-solid-900', 'fa-regular-400', 'fa-brands-400']) {
  grab(`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/${f}.woff2`,
    path.join(CDN, 'webfonts', `${f}.woff2`));
}
for (const f of gfiles) {
  const css = fs.readFileSync(f, 'utf8');
  for (const u of new Set([...css.matchAll(/(https:\/\/fonts\.gstatic\.com[^)"']+)/g)].map((m) => m[1]))) {
    grab(u, path.join(CDN, 'gstatic', u.split('/').pop()));
  }
}
const AXE = path.join(CDN, 'axe.min.js');
if (!grab('https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js', AXE)) {
  stop('could not fetch axe-core, so accessibility cannot be measured. Refusing to report a pass without it.');
}
const axeSource = fs.readFileSync(AXE, 'utf8');
console.log(`  ${gfiles.length} font stylesheet(s) and the icon set ready\n`);

// ── a stand-in for the CDN hosts, so requests stay genuinely cross-origin ────
const certDir = path.join(WORK, 'cert');
fs.mkdirSync(certDir, { recursive: true });
const KEY = path.join(certDir, 'key.pem'), CRT = path.join(certDir, 'cert.pem');
if (!fs.existsSync(KEY) || !fs.existsSync(CRT)) {
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', KEY, '-out', CRT,
      '-days', '2', '-nodes', '-subj', '/CN=cdn-stand-in'], { stdio: 'pipe' });
  } catch { stop('openssl is not available, and this needs a local https server.'); }
}
const server = https.createServer({ key: fs.readFileSync(KEY), cert: fs.readFileSync(CRT) }, (req, res) => {
  const host = req.headers.host || '';
  const p = req.url.split('?')[0];
  let file = null, type = 'text/plain';
  if (host.startsWith('cdnjs') && p.endsWith('all.min.css')) { file = path.join(CDN, 'fa.css'); type = 'text/css'; }
  else if (host.startsWith('cdnjs') && p.includes('/webfonts/')) { file = path.join(CDN, 'webfonts', p.split('/').pop()); type = 'font/woff2'; }
  else if (host.startsWith('fonts.googleapis')) { file = gfiles[0]; type = 'text/css'; }
  else if (host.startsWith('fonts.gstatic')) { file = path.join(CDN, 'gstatic', p.split('/').pop()); type = 'font/woff2'; }
  if (file && fs.existsSync(file)) {
    res.writeHead(200, { 'content-type': type, 'access-control-allow-origin': '*', 'cache-control': 'max-age=3600' });
    res.end(fs.readFileSync(file));
  } else { res.writeHead(404, { 'access-control-allow-origin': '*' }); res.end('not here'); }
});
await new Promise((r, j) => { server.once('error', j); server.listen(PORT, r); })
  .catch(() => stop(`port ${PORT} is in use; set QA_SITE_PORT.`));

const HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: [
    `--host-resolver-rules=${HOSTS.map((h) => `MAP ${h} 127.0.0.1:${PORT}`).join(', ')}`,
    '--ignore-certificate-errors',
    // Chromium reads HTTPS_PROXY itself and would tunnel these hosts to the
    // proxy, ignoring the mapping above.
    '--no-proxy-server',
  ],
});

try {
  for (const page of pages) {
    console.log(`\n${page}`);
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
    const tab = await ctx.newPage();
    const errors = [], badReq = [];
    tab.on('pageerror', (e) => errors.push(e.message));
    tab.on('requestfailed', (r) => badReq.push(`${r.url().slice(0, 80)} ${r.failure()?.errorText || ''}`));
    tab.on('response', (r) => { if (r.status() >= 400) badReq.push(`${r.status()} ${r.url().slice(0, 80)}`); });

    const res = await tab.goto(`${BASE}/${page}`, { waitUntil: 'networkidle', timeout: 60000 });
    check(`${page} is served`, res && res.status() === 200, res ? String(res.status()) : 'no response');
    await tab.waitForTimeout(1200);

    // ---- it renders at every width, with nothing broken or overflowing ----
    for (const w of [390, 768, 1280]) {
      await tab.setViewportSize({ width: w, height: 900 });
      await tab.waitForTimeout(500);
      const r = await tab.evaluate(() => ({
        broken: [...document.images]
          .filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
          .map((i) => i.getAttribute('src')),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        text: document.body.innerText.trim().length,
      }));
      check(`${page} at ${w}px: renders, no broken image, no sideways scroll`,
        r.broken.length === 0 && r.overflow <= 0 && r.text > 0,
        [r.broken.length ? `broken: ${r.broken.join(', ')}` : '',
          r.overflow > 0 ? `overflows by ${r.overflow}px` : '',
          r.text === 0 ? 'renders nothing' : ''].filter(Boolean).join(' | '));
      await tab.screenshot({ path: path.join(SHOTS, `${page.replace('.html', '')}-${w}.png`), fullPage: true });
    }

    // ---- the logo actually appears ----
    // Every <img> on landing.html used to be a template placeholder with an
    // onerror handler that hid it, so the page looked deliberate rather than
    // broken. naturalWidth is the only honest test.
    await tab.setViewportSize({ width: 1280, height: 900 });
    await tab.waitForTimeout(300);
    const imgs = await tab.evaluate(() =>
      [...document.images].map((i) => ({ src: i.getAttribute('src'), w: i.naturalWidth })));
    if (imgs.length) {
      check(`${page}: every image actually decoded`,
        imgs.every((i) => i.w > 0), imgs.filter((i) => !i.w).map((i) => i.src).join(', '));
    }

    // ---- every in-page link goes somewhere real ----
    const deadLinks = await tab.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"]')]
        .map((a) => a.getAttribute('href').slice(1))
        .filter((id) => id && id !== 'top' && !document.getElementById(id)));
    check(`${page}: every in-page link resolves`, deadLinks.length === 0, deadLinks.join(', '));

    // ---- landing.html only: the contact section must be styled on desktop ----
    // This is the specific regression test for the unclosed media query. The
    // rule lived inside `@media (max-width: 768px)`, so at 1280px the section
    // had no padding and no background at all — default HTML on a dark page.
    if (page === 'landing.html') {
      const styled = await tab.evaluate(() => {
        const el = document.querySelector('#contact');
        if (!el) return null;
        const cs = getComputedStyle(el);
        return { padding: parseInt(cs.paddingTop, 10), bg: cs.backgroundColor };
      });
      check('landing.html: the contact section is styled at 1280px, not raw HTML',
        !!styled && styled.padding > 20 && styled.bg !== 'rgba(0, 0, 0, 0)',
        styled ? `padding-top ${styled.padding}px, background ${styled.bg}` : 'no #contact section');

      // And it must lead with a way to reach a human that works today, since
      // /api/notify is fail-closed and no form here can deliver anything.
      const call = await tab.evaluate(() => ({
        tel: [...document.querySelectorAll('#contact a[href^="tel:"]')].length,
        forms: document.querySelectorAll('#contact form').length,
      }));
      check('landing.html: the contact section offers a working way to make contact',
        call.tel > 0, `${call.tel} call link(s)`);
      check('landing.html: no form that cannot deliver what it collects',
        call.forms === 0, `${call.forms} form(s) in #contact`);
    }

    // ---- accessibility ----
    const violations = await tab.evaluate(async (src) => {
      if (!window.axe) { const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); }
      const out = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      });
      return out.violations.map((v) => ({ id: v.id, n: v.nodes.length, sample: v.nodes[0].html.slice(0, 90) }));
    }, axeSource);
    const total = violations.reduce((s, v) => s + v.n, 0);
    check(`${page}: axe-core WCAG 2.0/2.1 A + AA — 0 failing elements`, total === 0,
      violations.map((v) => `${v.id} x${v.n} (${v.sample})`).join(' | '));

    check(`${page}: zero JavaScript errors`, errors.length === 0, errors.slice(0, 3).join(' | '));
    const realFails = badReq.filter((f) => !/\/api\//.test(f));
    check(`${page}: zero failed asset requests`, realFails.length === 0, realFails.slice(0, 4).join(' | '));
    await ctx.close();
  }
} finally {
  try { server.close(); } catch { /* already closed */ }
  await browser.close();
}

console.log(`\nscreenshots: ${SHOTS}`);
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
