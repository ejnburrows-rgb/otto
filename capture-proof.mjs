import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const port = 4173;
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, `http://127.0.0.1:${port}`).pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];

async function signInAndCapture({ id, name, slug, lang, dark }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  page.on('pageerror', err => errors.push(`${slug}: ${err.message}`));
  const code = String(Math.floor(Math.random() * 9000) + 1000);

  await page.goto(`http://127.0.0.1:${port}/index.html?demo=1`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.__db === 'function' && typeof window.__save === 'function', null, { timeout: 15000 });
  await page.evaluate(({ userId, pin }) => {
    const u = window.__db().users.find(x => x.id === userId);
    if (!u) throw new Error(`user ${userId} missing`);
    delete u.pinHash; delete u.pinSalt; delete u.mfaPin; delete u.mfaHash; delete u.mfaSalt;
    u.pin = pin;
    window.__save();
  }, { userId: id, pin: code });

  await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(700);
  const row = page.locator('.list-item').filter({ hasText: name }).first();
  if (!(await row.count())) throw new Error(`${name} sign-in row missing`);
  await row.click();
  for (const digit of code) {
    await page.locator('.pinpad button').filter({ hasText: new RegExp(`^${digit}$`) }).first().click();
  }
  await page.waitForSelector('#app:not(.hidden)', { timeout: 15000 });
  await page.waitForTimeout(1800);

  if (lang === 'es') await page.evaluate(() => setLang('es'));
  if (dark) {
    const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
    if (!isDark) await page.evaluate(() => toggleTheme());
  }
  await page.waitForTimeout(700);

  const state = await page.evaluate(() => ({
    session: window.__db ? { route: window.location.hash, title: document.title } : null,
    homePanels: [...document.querySelectorAll('.home-panel')].map(x => x.querySelector('.home-panel-title')?.textContent?.trim()),
    wallpaperUser: document.getElementById('wallpaper-bg')?.getAttribute('data-user') || null,
    theme: document.documentElement.getAttribute('data-theme') || 'light',
    lang: document.documentElement.lang,
    bottomNavVisible: !!document.querySelector('#bottomnav:not(.admin-nav-hidden)') && getComputedStyle(document.querySelector('#bottomnav')).display !== 'none'
  }));
  if (state.homePanels.length !== 4) throw new Error(`${name} did not render four home panels: ${JSON.stringify(state)}`);
  if (state.wallpaperUser !== id) throw new Error(`${name} wallpaper mapping mismatch: ${JSON.stringify(state)}`);
  if (state.bottomNavVisible) throw new Error(`${name} legacy bottom nav is still visible`);

  async function shot(label, width, height) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(500);
    const buffer = await page.screenshot({ type: 'jpeg', quality: 52, fullPage: false });
    fs.writeFileSync(`proof-${slug}-${label}.b64`, buffer.toString('base64'));
    fs.writeFileSync(`proof-${slug}-${label}.jpg`, buffer);
    console.log(`PROOF ${slug}-${label}: ${buffer.length} bytes`);
  }

  await shot('mobile', 390, 844);
  await shot('desktop', 1280, 800);
  fs.writeFileSync(`proof-${slug}-state.json`, JSON.stringify(state, null, 2));
  await ctx.close();
}

try {
  await signInAndCapture({ id: 'owner-2', name: 'Julio Pablo', slug: 'julio', lang: 'en', dark: false });
  await signInAndCapture({ id: 'ops-1', name: 'Sarays', slug: 'sarays', lang: 'es', dark: true });
  if (errors.length) throw new Error(`browser errors: ${errors.join(' | ')}`);
  console.log('VISUAL PROOF COMPLETE');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
