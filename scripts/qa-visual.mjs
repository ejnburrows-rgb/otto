// Drives the real app in a real browser and captures the evidence AGENTS.md
// asks for: zero JavaScript errors, zero broken images, no sideways scroll, and
// a screenshot of every screen the facelift touched.
//
// This exists because every fault that has ever shipped in this repo — the
// syntax error that blanked the app, the six images whose src held prompt text,
// the draggable cards that ate a normal scroll — was invisible to the other
// tests and would have been caught by opening the page once.
//
// Needs the local server running:  npm start
// Then:  node scripts/qa-visual.mjs        (or: npm run qa:visual)
//
// Screenshots land in evidence/ and are overwritten on each run.

import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, join } from 'node:path';

const APP_URL = process.env.QA_URL || 'http://localhost:8000/index.html';
// Normally Playwright finds its own browser. Set QA_CHROME to a Chrome/Chromium
// binary if you are on a machine where it cannot download one.
const EXECUTABLE = process.env.QA_CHROME || undefined;
// Set QA_PROXY if this machine reaches the internet through a proxy — without it
// the icon and font CDNs fail and every icon renders as an empty box.
const PROXY = process.env.QA_PROXY
  ? { server: process.env.QA_PROXY, bypass: 'localhost,127.0.0.1' }
  : undefined;
// The icons and both fonts come from CDNs, so on a machine whose browser cannot
// reach them every icon renders as an empty box and the screenshots prove
// nothing. QA_ASSETS points at a folder holding those same CDN files, which are
// then served to the browser from disk. It changes nothing about the app — it
// only stands in for the network. Files are matched by filename:
//   fa.css, gfonts.css, and the .woff2 files those two reference.
const ASSETS = process.env.QA_ASSETS || '';
const PIN = '1357';                       // set on first run by this script
const OUT = fileURLToPath(new URL('../evidence/', import.meta.url));
mkdirSync(OUT, { recursive: true });

// Screens an owner can reach that the facelift changed or sits on top of.
const SCREENS = ['home', 'jobs', 'customers', 'estimates', 'invoices', 'backups', 'settings'];

let passed = 0, failed = 0;
function check(name, ok, detail) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

// The local server serves static files only — no serverless functions — so the
// app's own cloud calls 404 by design. Everything else is a real fault.
const EXPECTED = (t) => /\/api\//.test(t) || /Failed to load resource/.test(t);

async function pageErrors(page) {
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' && !EXPECTED(m.text())) errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  return errors;
}

async function signIn(page) {
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // First run: nobody has a code yet, so the app asks the first owner to pick one.
  const boot = page.locator('#boot-pin');
  if (await boot.count()) {
    await boot.fill(PIN);
    await page.getByRole('button', { name: /save|guardar/i }).click();
    await page.waitForTimeout(600);
  }
  await page.locator('.card-login .list-item').first().click();
  await page.waitForTimeout(300);
  const keys = page.locator('.pinpad button');
  for (const d of PIN) await keys.nth(Number(d) - 1).click();
  await page.waitForTimeout(1200);
}

// naturalWidth is 0 for an image that failed: a broken <img> renders as nothing
// and looks perfectly fine in the source.
const brokenImages = (page) => page.evaluate(() =>
  [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.currentSrc || i.src));

const sidewaysScroll = (page) => page.evaluate(() => {
  const el = document.scrollingElement || document.documentElement;
  return el.scrollWidth - el.clientWidth;
});

async function run(label, viewport, opts = {}) {
  const browser = await chromium.launch({ executablePath: EXECUTABLE, proxy: PROXY });
  const context = await browser.newContext({ viewport, ...opts });
  if (ASSETS) {
    await context.route(/cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/, (route) => {
      const url = route.request().url();
      let file = basename(new global.URL(url).pathname);
      if (url.includes('fonts.googleapis.com')) file = 'gfonts.css';
      else if (url.includes('font-awesome') && file.endsWith('.css')) file = 'fa.css';
      const path = join(ASSETS, file);
      return existsSync(path) ? route.fulfill({ path }) : route.abort();
    });
  }
  const page = await context.newPage();
  const errors = await pageErrors(page);

  console.log(`\n${label} — ${viewport.width}x${viewport.height}`);
  await signIn(page);
  check('signing in reaches the app', await page.locator('#app:not(.hidden)').count() === 1);

  for (const view of SCREENS) {
    await page.evaluate(v => window.nav(v), view);
    await page.waitForTimeout(500);
    const broken = await brokenImages(page);
    const over = await sidewaysScroll(page);
    check(`${view}: no broken images`, broken.length === 0, broken.join(', '));
    check(`${view}: no sideways scroll`, over <= 0, `overflows by ${over}px`);
    await page.screenshot({ path: join(OUT, `${label}-${view}-${viewport.width}.png`), fullPage: false });
  }

  // The draggable-cards fault: a swipe across a list card used to pick the card
  // up and carry it with the pointer — 216px up the screen — instead of
  // scrolling the page. The card must not follow the pointer.
  //
  // It is allowed to move 3px: `.card:hover` lifts it by that much on purpose,
  // and a mouse left sitting on the card is hovering it. What must never happen
  // is the card tracking the swipe, so the test is "did it follow", not "did it
  // move at all" — the old fault translated it by the full drag distance.
  await page.evaluate(() => window.nav('customers'));
  await page.waitForTimeout(500);
  const card = page.locator('.card').first();
  if (await card.count()) {
    const box = await card.boundingBox();
    const dragBy = box.height - 40;
    const translateY = el => {
      const m = getComputedStyle(el).transform;
      return m === 'none' ? 0 : Math.abs(Number(m.slice(m.lastIndexOf(',') + 1, -1)) || 0);
    };
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 20);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 20, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const moved = await card.evaluate(translateY);
    await page.screenshot({ path: join(OUT, `${label}-scroll-card-${viewport.width}.png`) });
    check(`swiping ${Math.round(dragBy)}px up a list card does not carry the card (moved ${moved}px)`,
      moved <= 4, `the card followed the pointer by ${moved}px`);
    // And once the pointer leaves, it sits back down where it started.
    await page.mouse.move(2, 2);
    await page.waitForTimeout(400);
    check('the card returns to rest', await card.evaluate(translateY) === 0);
  }

  check('0 JavaScript errors', errors.length === 0, errors.slice(0, 5).join('\n       '));
  await browser.close();
}

await run('desktop', { width: 1280, height: 900 });
await run('phone-viewport', { width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

console.log(`\n${passed} passed, ${failed} failed\n`);
console.log('Screenshots: evidence/');
process.exit(failed ? 1 : 0);
