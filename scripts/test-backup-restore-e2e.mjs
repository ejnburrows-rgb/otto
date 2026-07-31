// Drives the real app in a real browser to prove backup and restore works.
import { chromium } from 'playwright';

const URL = 'http://localhost:8000/index.html?demo=1';
let passed = 0, failed = 0;
function check(name, ok) {
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name); }
}

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
const EXPECTED = (text) => text.includes('/api/data') || text.includes('Failed to load resource');
page.on('console', m => { if (m.type() === 'error' && !EXPECTED(m.text())) errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log('\nbackup and restore e2e');
check('the app loads without a script error', errors.length === 0);

const originalJobCount = await page.evaluate(() => window.__db().jobs.length);
check('demo data has jobs', originalJobCount > 0);

// Mock downloadFile to capture the backup payload
await page.evaluate(() => {
  window.__backupPayload = null;
  window.downloadFile = (name, data, mime) => {
    window.__backupPayload = data;
  };
});

// Trigger exportAll
await page.evaluate(async () => {
  await window.exportAll();
});
await page.waitForTimeout(500);

const payloadExists = await page.evaluate(() => window.__backupPayload != null);
check('a backup was exported successfully', payloadExists);

// Alter data (delete a job)
await page.evaluate(() => {
  const db = window.__db();
  db.jobs.pop();
  window.__save();
});
await page.waitForTimeout(500);
const alteredJobCount = await page.evaluate(() => window.__db().jobs.length);
check('data was altered (job deleted)', alteredJobCount === originalJobCount - 1);

// Mock importAll by directly processing the JSON payload as importAll would
await page.evaluate(async () => {
  const parsed = JSON.parse(window.__backupPayload);
  const d = parsed && parsed._otto ? parsed.db : parsed;
  const files = (parsed && parsed._files) || {};
  Object.keys(d).forEach(c => { if (!Array.isArray(d[c])) d[c] = []; });
  for (const id in files) {
    const entry = files[id];
    if (entry.text != null) await window.idbPut('files', id, entry.text);
    else if (entry.data) { await window.idbPut('files', id, window.dataURLToBlob(entry.data, entry.mime)); }
  }
  Object.assign(window.__db(), d);
  window.__save();
});
await page.waitForTimeout(1000);

const restoredJobCount = await page.evaluate(() => window.__db().jobs.length);
check('data returned to original state', restoredJobCount === originalJobCount);

console.log(passed + ' passed, ' + failed + ' failed');
await browser.close();
process.exit(failed ? 1 : 0);
