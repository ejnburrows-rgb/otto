import { chromium } from 'playwright';
import chromiumLambda from '@sparticuz/chromium';
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

const executablePath = await chromiumLambda.executablePath();
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [...chromiumLambda.args, '--no-sandbox', '--disable-dev-shm-usage']
});

async function capture({ id, name, slug, lang, dark }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto(`http://127.0.0.1:${port}/index.html?demo=1`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => typeof window.__db === 'function', null, { timeout: 15000 });
  await page.evaluate((userId) => {
    const u = window.__db().users.find(x => x.id === userId);
    if (!u) throw new Error(`user ${userId} missing`);
    session = u;
    startApp();
    nav('home');
  }, id);
  await page.waitForSelector('.home-panels', { timeout: 15000 });
  await page.evaluate((wantedLang) => setLang(wantedLang), lang);
  const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
  if (isDark !== dark) await page.evaluate(() => toggleTheme());
  await page.waitForTimeout(900);

  const state = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.home-panel')].map(el => {
      const r = el.getBoundingClientRect();
      return { id: el.id, state: el.dataset.state, x: r.x, y: r.y, width: r.width, height: r.height };
    });
    const topbarEl = document.querySelector('.topbar');
    const topbarRect = topbarEl?.getBoundingClientRect();
    const headerEl = document.querySelector('.wallpaper-home-header');
    const headerRect = headerEl?.getBoundingClientRect();
    const vp = { width: innerWidth, height: innerHeight };
    const safe = { left: vp.width * 0.62, top: 0, right: vp.width, bottom: vp.height * 0.42 };
    const overlaps = (r) => r && r.right > safe.left && r.left < safe.right && r.bottom > safe.top && r.top < safe.bottom;
    const blocking = [];
    if (topbarRect && overlaps(topbarRect)) blocking.push('topbar');
    if (headerRect && overlaps(headerRect)) blocking.push('greeting');
    boxes.forEach(b => {
      const r = { left: b.x, right: b.x + b.width, top: b.y, bottom: b.y + b.height };
      if (overlaps(r)) blocking.push(b.id);
    });
    return {
      displayedName: document.querySelector('.wallpaper-home-header .greet')?.textContent?.trim() || '',
      wallpaperUser: document.getElementById('wallpaper-bg')?.getAttribute('data-user') || null,
      wallpaperImage: getComputedStyle(document.getElementById('wallpaper-bg')).backgroundImage,
      boxes,
      topbar: topbarRect ? { x: topbarRect.x, y: topbarRect.y, width: topbarRect.width, height: topbarRect.height, right: topbarRect.right } : null,
      greeting: headerRect ? { x: headerRect.x, y: headerRect.y, width: headerRect.width, height: headerRect.height } : null,
      safeZoneBlocking: blocking,
      viewport: vp,
      theme: document.documentElement.getAttribute('data-theme') || 'light',
      lang: document.documentElement.lang
    };
  });

  if (!state.displayedName.includes(name)) throw new Error(`${name} identity mismatch: ${JSON.stringify(state)}`);
  if (state.wallpaperUser !== id) throw new Error(`${name} wallpaper mapping mismatch: ${JSON.stringify(state)}`);
  if (state.boxes.length !== 4) throw new Error(`${name} does not have four minimized tabs: ${JSON.stringify(state)}`);
  if (state.boxes.some(b => b.height > 60 || b.y < state.viewport.height * 0.80)) throw new Error(`${name} tabs are not minimized at bottom: ${JSON.stringify(state)}`);
  if (state.topbar && state.topbar.right > state.viewport.width * 0.62) throw new Error(`${name} top controls extend into protected artwork area: ${JSON.stringify(state)}`);
  if (state.safeZoneBlocking.length) throw new Error(`${name} upper-right artwork safe zone blocked by ${state.safeZoneBlocking.join(', ')}`);
  if (pageErrors.length) throw new Error(`${name} browser errors: ${pageErrors.join(' | ')}`);

  const image = await page.screenshot({ type: 'jpeg', quality: 62, fullPage: false });
  fs.writeFileSync(`wallpaper-proof-${slug}-mobile.jpg`, image);
  fs.writeFileSync(`wallpaper-proof-${slug}-state.json`, JSON.stringify(state, null, 2));
  console.log(`PROOF ${slug}: ${image.length} bytes; safe zone clear; four tabs <= 60px`);
  await ctx.close();
}

try {
  await capture({ id: 'owner-2', name: 'Julio Pablo', slug: 'julio', lang: 'en', dark: false });
  await capture({ id: 'ops-1', name: 'Sarays', slug: 'sarays', lang: 'es', dark: true });
  console.log('WALLPAPER PROOF COMPLETE');
} finally {
  await browser.close().catch(() => {});
  await new Promise(resolve => server.close(resolve));
}
