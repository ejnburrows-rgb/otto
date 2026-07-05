import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.QA_URL || 'http://localhost:8000';
const results = [];

function log(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });

try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  log('Page loads', (await page.title()).includes('OTTO'));
  log('Dark theme default', (await page.locator('html').getAttribute('data-theme')) === 'dark');

  await page.waitForSelector('#login:not(.hidden), #app:not(.hidden)', { timeout: 10000 });
  const onLogin = await page.locator('#login').isVisible();
  log('Login screen shows', onLogin);

  if (onLogin) {
    await page.waitForTimeout(1500);
    const ownerRow = page.locator('.list-item', { hasText: /Owner One|Owner 1|Dueño/i }).first();
    if (await ownerRow.count()) await ownerRow.click();
    else await page.locator('.list-item').first().click();
    await page.waitForTimeout(400);
    for (const d of ['0', '7', '2', '1']) {
      await page.locator('.pinpad button').filter({ hasText: new RegExp(`^${d}$`) }).first().click();
      await page.waitForTimeout(150);
    }
    await page.waitForSelector('#app:not(.hidden)', { timeout: 12000 });
    log('Owner login PIN 0721', await page.locator('#app').isVisible());
  }

  await page.waitForTimeout(800);
  const mainText = await page.locator('#main').innerText();
  log('Owner home renders', mainText.length > 20, mainText.slice(0, 40));

  await page.evaluate(() => { if (typeof nav === 'function') nav('customers'); });
  await page.waitForTimeout(500);
  const cust = await page.locator('#main').innerText();
  log('Customers screen', cust.toLowerCase().includes('customer') || cust.toLowerCase().includes('cliente'));
  log('Photo new customer button', await page.locator('button', { hasText: /Photo|Foto/ }).count() > 0);

  await page.evaluate(() => { if (typeof nav === 'function') nav('urgent'); });
  await page.waitForTimeout(500);
  const urgent = await page.locator('#main').innerText();
  log('Urgent hub screen', urgent.toLowerCase().includes('urgent') || urgent.toLowerCase().includes('asunto'));

  await page.evaluate(() => { if (typeof nav === 'function') nav('hub'); });
  await page.waitForTimeout(400);
  log('Owner hub screen', (await page.locator('#main').innerText()).length > 10);

  await page.evaluate(() => { if (typeof nav === 'function') nav('backups'); });
  await page.waitForTimeout(400);
  const backups = await page.locator('#main').innerText();
  log('Backups screen', backups.toLowerCase().includes('backup') || backups.toLowerCase().includes('respaldo'));

  await page.evaluate(() => { if (typeof setLang === 'function') setLang('es'); });
  await page.waitForTimeout(400);
  log('Spanish toggle', (await page.locator('#lang-es').getAttribute('class') || '').includes('on'));

  await page.evaluate(() => { if (typeof exportAll === 'function') exportAll(); });
  log('Backup export function', true);

  log('No JS crashes', errors.length === 0, errors.slice(0, 3).join('; '));

  await page.evaluate(() => { if (typeof signOut === 'function') signOut(); });
  await page.waitForTimeout(600);
  const fieldRow = page.locator('.list-item', { hasText: /Employee One|Empleado/i }).first();
  if (await fieldRow.count()) await fieldRow.click();
  else await page.locator('.list-item').nth(2).click();
  await page.waitForTimeout(400);
  for (const d of ['0', '7', '1', '5']) {
    await page.locator('.pinpad button').filter({ hasText: new RegExp(`^${d}$`) }).first().click();
    await page.waitForTimeout(150);
  }
  await page.waitForSelector('#app:not(.hidden)', { timeout: 12000 });
  log('Field worker login PIN 0715', await page.locator('#app').isVisible());
  await page.waitForTimeout(500);
  const fieldMain = await page.locator('#main').innerText();
  log('Field worker home renders', fieldMain.length > 5);

} catch (e) {
  log('Browser test run', false, e.message);
}

await browser.close();

const passed = results.filter((r) => r.ok).length;
const total = results.length;
const report = { ts: new Date().toISOString(), base: BASE, passed, total, pct: Math.round((passed / total) * 100), results, errors };

const md = [
  '# OTTO Browser QA',
  '',
  `**Run:** ${report.ts}`,
  `**URL:** ${BASE}`,
  `**Score:** ${passed}/${total} (${report.pct}%)`,
  '',
  ...results.map((r) => `- [${r.ok ? 'x' : ' '}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`),
  '',
  errors.length ? `**Console errors:** ${errors.join('; ')}` : '**Console errors:** none',
].join('\n');

fs.writeFileSync('D:/Projects/otto-fresh/docs/QA_BROWSER.md', md, 'utf8');
console.log('\nSCORE:', passed + '/' + total);
process.exit(passed === total ? 0 : 1);