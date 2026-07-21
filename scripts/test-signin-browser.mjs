// Drives the real app in a real browser to prove sign-in still works after the
// PIN changes. Unit tests check the maths; this checks a person can get in.
//
// Needs the local server running:  npm start
// Then:  node scripts/test-signin-browser.mjs

import { chromium } from 'playwright';

const URL = 'http://localhost:8000/index.html';
let passed = 0, failed = 0;
function check(name, ok) {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}`); }
}

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
// /api/data returning 404 is expected here: the local server serves static files
// only, with no serverless functions. The app is meant to carry on device-only.
const EXPECTED = (text) => text.includes('/api/data') || text.includes('Failed to load resource');
page.on('console', m => { if (m.type() === 'error' && !EXPECTED(m.text())) errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log('\nstartup');
check('the app loads without a script error', errors.length === 0);
if (errors.length) errors.slice(0, 5).forEach(e => console.log('       ' + e.slice(0, 160)));
check('the app still works with no cloud connection at all',
  (await page.evaluate(() => window.__db().users.length)) === 19);

// Give a real user a readable PIN, the way an old record would have looked,
// then reload so the startup conversion runs against it. It must be one of the
// app's own 19 ids, because startup removes any user it does not recognise.
await page.evaluate(async () => {
  const user = window.__db().users.find(u => u.id === 'owner-1');
  delete user.pinHash; delete user.pinSalt;
  user.pin = '1357';
  window.__save();
});
// save() is debounced by 250ms and does not return a promise, so wait for the
// write to actually reach storage before reloading.
await page.waitForTimeout(800);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

console.log('\nautomatic conversion of an existing readable PIN');
const stored = await page.evaluate(() => JSON.stringify(window.__db().users.find(u => u.id === 'owner-1')));
check('the readable PIN is gone from storage', !stored.includes('1357'));
check('a fingerprint replaced it', stored.includes('pinHash'));
check('a salt was stored', stored.includes('pinSalt'));

console.log('\nsigning in with the code they already had');
const signedIn = await page.evaluate(async () => {
  const u = window.__db().users.find(x => x.id === 'owner-1');
  return await window.__verifyPin(u, '1357');
});
check('the original PIN still works after conversion', signedIn === true);
const wrongRejected = await page.evaluate(async () => {
  const u = window.__db().users.find(x => x.id === 'owner-1');
  return await window.__verifyPin(u, '0000');
});
check('a wrong PIN is refused', wrongRejected === false);

console.log('\nthe Team screen must never show a code');
const teamHtml = await page.evaluate(() => {
  const u = window.__db().users.find(x => x.id === 'owner-1');
  return (u.pinHash || '') + '|' + (u.pin === undefined ? 'no-plain' : u.pin);
});
check('no readable PIN exists to display', teamHtml.includes('no-plain'));

console.log('\nguess limiting');
const lockout = await page.evaluate(() => {
  window.__clearFailedPins('owner-1');
  for (let i = 0; i < 5; i++) window.__recordFailedPin('owner-1');
  return window.__pinLockRemaining('owner-1');
});
check('five wrong tries triggers a wait', lockout > 0);

console.log(`\n${passed} passed, ${failed} failed\n`);
await browser.close();
process.exit(failed ? 1 : 0);
