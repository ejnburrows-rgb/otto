import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.QA_URL || 'http://127.0.0.1:8000';
const OUT = process.env.QA_POLICY_DIR || path.join(process.cwd(), 'outputs', 'policy-ack');
fs.mkdirSync(OUT, { recursive: true });

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ok   ${name}${detail ? ` — ${detail}` : ''}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });

try {
  await page.goto(`${BASE}/index.html?demo=0`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Let boot finish all one-time migrations before replacing the simulated
  // worker record; otherwise its delayed safety save can overwrite the fixture.
  await page.waitForTimeout(1600);

  await page.evaluate(async () => {
    const request = indexedDB.open('otto-crm', 3);
    const database = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = database.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const raw = await new Promise((resolve, reject) => {
      const get = store.get('db');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    const db = JSON.parse(raw);
    const worker = db.users.find(u => u.id === 'field-1');
    worker.gpsAcknowledged = true;
    delete worker.policyAcknowledgment;
    db.consent_records = (db.consent_records || []).filter(c => c.userId !== worker.id);
    store.put(JSON.stringify(db), 'db');
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    localStorage.setItem('otto_session', worker.id);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  if (await page.locator('.policy-gate').count() === 0) {
    const diagnostic = await page.evaluate(async () => ({
      sessionId: localStorage.getItem('otto_session'),
      appClass: document.querySelector('#app')?.className,
      loginClass: document.querySelector('#login')?.className,
      mainText: document.querySelector('#main')?.textContent?.trim().slice(0, 160),
      sourceHasGate: document.documentElement.innerHTML.includes('EMPLOYEE_POLICY_VERSION')
    }));
    throw new Error(`Policy gate did not render: ${JSON.stringify(diagnostic)}`);
  }

  check('first access opens the full-screen policy gate', await page.locator('#app').evaluate(el => el.classList.contains('policy-gate-active')));
  check('normal app navigation is hidden', await page.locator('.topbar').isHidden() && await page.locator('.bottomnav').isHidden());
  check('the real OTTO logo loads', await page.locator('.policy-brand img').evaluate(img => img.complete && img.naturalWidth > 0));
  check('confirmation starts disabled', await page.locator('#policy-confirm').isDisabled());
  check('acknowledge starts disabled', await page.locator('#policy-acknowledge').isDisabled());
  check('phone view has no sideways overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(OUT, 'employee-policy-first-access.png') });

  await page.locator('#policy-scroll').evaluate(el => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(100);
  check('scrolling to the end enables confirmation', !(await page.locator('#policy-confirm').isDisabled()));

  const box = await page.locator('#policy-signature').boundingBox();
  await page.mouse.move(box.x + 36, box.y + 72);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 42, { steps: 4 });
  await page.mouse.move(box.x + 145, box.y + 88, { steps: 4 });
  await page.mouse.move(box.x + 215, box.y + 48, { steps: 4 });
  await page.mouse.move(box.x + 285, box.y + 82, { steps: 4 });
  await page.mouse.up();
  await page.locator('#policy-confirm').check();
  check('signature plus confirmation enables acknowledge', !(await page.locator('#policy-acknowledge').isDisabled()));
  await page.screenshot({ path: path.join(OUT, 'employee-policy-ready.png') });

  await page.locator('#policy-acknowledge').click();
  await page.waitForFunction(() => !document.querySelector('#app')?.classList.contains('policy-gate-active'));
  const stored = await page.evaluate(async () => {
    const request = indexedDB.open('otto-crm', 3);
    const database = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tx = database.transaction('kv', 'readonly');
    const raw = await new Promise((resolve, reject) => { const get = tx.objectStore('kv').get('db'); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const db = JSON.parse(raw);
    const record = db.consent_records.find(c => c.userId === 'field-1' && c.type === 'employee_code_of_conduct');
    const worker = db.users.find(u => u.id === 'field-1');
    return { record, profile: worker.policyAcknowledgment };
  });
  check('record is saved as acknowledged', stored.record?.status === 'acknowledged');
  check('record includes an ISO timestamp', !Number.isNaN(Date.parse(stored.record?.acknowledgedAt)));
  check('record includes the drawn signature', stored.record?.signatureDataUrl?.startsWith('data:image/png;base64,'));
  check('employee profile links to the record', stored.profile?.recordId === stored.record?.id && stored.profile?.status === 'acknowledged');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  check('the same policy does not appear on later access', await page.locator('.policy-gate').count() === 0);

  // The feature is phone-first, but the same URL may be opened on a tablet or
  // desktop during setup. Verify the reading column stays bounded there too.
  await page.evaluate(async () => {
    const request = indexedDB.open('otto-crm', 3);
    const database = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const tx = database.transaction('kv', 'readwrite');
    const store = tx.objectStore('kv');
    const raw = await new Promise((resolve, reject) => { const get = store.get('db'); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const db = JSON.parse(raw);
    db.consent_records = db.consent_records.filter(c => !(c.userId === 'field-1' && c.type === 'employee_code_of_conduct'));
    const worker = db.users.find(u => u.id === 'field-1');
    delete worker.policyAcknowledgment;
    store.put(JSON.stringify(db), 'db');
    await new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.policy-gate');
  const desktop = await page.evaluate(() => ({
    docWidth: document.querySelector('.policy-document').getBoundingClientRect().width,
    viewport: innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  check('desktop keeps the policy in a readable bounded column', desktop.docWidth <= 720);
  check('desktop view has no sideways overflow', desktop.scrollWidth <= desktop.viewport);
  await page.screenshot({ path: path.join(OUT, 'employee-policy-desktop.png') });
  check('no JavaScript errors occurred', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
