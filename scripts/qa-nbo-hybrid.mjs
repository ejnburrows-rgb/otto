import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://nbo.local';
const results = [];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

function localFile(url) {
  const parsed = new URL(url);
  const relative = decodeURIComponent(parsed.pathname === '/' ? '/index.html' : parsed.pathname).replace(/^\/+/, '');
  const candidate = path.resolve(ROOT, relative);
  if (!candidate.startsWith(ROOT + path.sep) && candidate !== path.join(ROOT, 'index.html')) return null;
  return candidate;
}

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const runtimeErrors = [];
  const retiredCloudRequests = [];

  await page.route(`${BASE}/**`, async (route) => {
    const file = localFile(route.request().url());
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    await route.fulfill({ status: 200, contentType: MIME[ext] || 'application/octet-stream', body: fs.readFileSync(file) });
  });

  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (/\/api\/(data|save|photos)(?:\?|$)/.test(url)) retiredCloudRequests.push(url);
  });

  await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.nbo-profile-login', { timeout: 10000 });
  check('local profile chooser renders', await page.locator('.nbo-profile-login').isVisible());
  check('exactly four management profiles are offered', await page.locator('[data-nbo-profile-id]').count() === 4);
  check('protected profiles are present', await page.locator('[data-nbo-profile-id="owner-1"], [data-nbo-profile-id="owner-2"], [data-nbo-profile-id="ops-1"], [data-nbo-profile-id="it-admin-ejn"]').count() === 4);

  const teamSeed = await page.evaluate(() => {
    window.__nboEnsureProfiles?.();
    const state = typeof db !== 'undefined' ? db : null;
    const workers = state && Array.isArray(state.users) ? state.users.filter((u) => u && u.role === 'field') : [];
    return { count: workers.length, rates: workers.some((u) => Object.prototype.hasOwnProperty.call(u, 'hourlyRate')) };
  });
  check('ten existing field employees are preconfigured', teamSeed.count >= 10, String(teamSeed.count));
  check('fresh seed does not expose compensation', teamSeed.rates === false);

  await page.click('[data-nbo-lang="es"]');
  await page.waitForSelector('.nbo-profile-login');
  check('profile chooser switches to Spanish', (await page.locator('#nbo-profile-title').textContent() || '').includes('Quién'));

  await page.click('[data-nbo-profile-id="owner-1"]');
  await page.waitForSelector('.ot-sidebar', { timeout: 10000 });
  check('desktop owner shell renders', await page.locator('.ot-sidebar').isVisible());
  check('desktop profile switch is available', await page.locator('.ot-sidebar [data-nbo-profile-switch]').isVisible());
  check('five primary desktop destinations remain', await page.locator('.ot-sidebar .ot-nav-item').count() >= 5);
  check('desktop has no horizontal page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  check('phone bottom navigation renders', await page.locator('.ot-mobile-nav').isVisible());
  check('phone has no horizontal page overflow', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  check('normal local workflow makes no retired cloud data/photo calls', retiredCloudRequests.length === 0, retiredCloudRequests.join(', '));
  check('browser runtime has no JavaScript errors', runtimeErrors.length === 0, runtimeErrors.join(' | '));

  await context.close();
} catch (error) {
  check('browser QA executed', false, error && error.message ? error.message : String(error));
} finally {
  if (browser) await browser.close();
}

const failed = results.filter((result) => !result.ok);
console.log(`\nNBO browser QA: ${results.length - failed.length} passed / ${failed.length} failed\n`);
if (failed.length) process.exit(1);
