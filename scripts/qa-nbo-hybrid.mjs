import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';

const PORT = Number(process.env.NBO_QA_PORT || 8123);
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};

const waitForServer = async () => {
  for (let i = 0; i < 50; i++) {
    const up = await new Promise((resolve) => {
      const req = http.get(`${BASE}/index.html`, (res) => { res.resume(); resolve(res.statusCode === 200); });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => { req.destroy(); resolve(false); });
    });
    if (up) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

const server = spawn(process.execPath, ['scripts/local-server.js'], {
  stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT) }
});

let browser;
try {
  if (!(await waitForServer())) throw new Error('local server did not start');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  const retiredCloudRequests = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('request', (request) => {
    const url = request.url();
    if (/\/api\/(data|save|photos)(?:\?|$)/.test(url)) retiredCloudRequests.push(url);
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.nbo-profile-login', { timeout: 10000 });
  check('local profile chooser renders', await page.locator('.nbo-profile-login').isVisible());
  check('exactly four management profiles are offered', await page.locator('[data-nbo-profile-id]').count() === 4);
  check('protected profiles are present', await page.locator('[data-nbo-profile-id="owner-1"], [data-nbo-profile-id="owner-2"], [data-nbo-profile-id="ops-1"], [data-nbo-profile-id="it-admin-ejn"]').count() === 4);

  const teamSeed = await page.evaluate(() => {
    window.__nboEnsureProfiles?.();
    const state = typeof db !== 'undefined' ? db : null;
    const workers = state && Array.isArray(state.users) ? state.users.filter((u) => u && u.role === 'field') : [];
    return { count: workers.length, names: workers.map((u) => u.name), rates: workers.some((u) => Object.prototype.hasOwnProperty.call(u, 'hourlyRate')) };
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
  server.kill();
}

const failed = results.filter((result) => !result.ok);
console.log(`\nNBO browser QA: ${results.length - failed.length} passed / ${failed.length} failed\n`);
if (failed.length) process.exit(1);
