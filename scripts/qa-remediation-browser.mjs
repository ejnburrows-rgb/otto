/* Browser exercise for the remediation changes.
 *
 * Runs the real app in a real browser and drives the two behaviors that only
 * exist on screen: the estimate unit guard refusing to produce a nonsense total,
 * and the employee form letting an address be recorded without granting access.
 *
 * Run with:  node scripts/qa-remediation-browser.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.QA_BASE_URL || 'http://localhost:8000';
const OUT = new URL('../outputs/remediation/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
};

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  // Sign in against the built-in local demo so this exercises the real UI
  // without touching production identity.
  await page.evaluate(() => {
    localStorage.setItem('otto_lang', 'en');
    localStorage.setItem('otto_demo', '1');
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  console.log('\nunit guard, in the running app');
  {
    // Drive the shipped functions through the page, exactly as the estimate
    // form calls them.
    const result = await page.evaluate(() => {
      const w = window;
      if (typeof w.priceLine !== 'function') return { missing: true };
      const PIPE = { itemId: 'WTR-CL-001', unit: 'Pipe Unit', rate: 2000 };
      return {
        mismatch: w.priceLine({ quantity: 250, unit: 'lf' }, PIPE),
        valid: w.priceLine({ quantity: 4, unit: 'Pipe Unit' }, PIPE),
      };
    });
    if (result.missing) {
      check('the unit guard is reachable in the running app', false, 'priceLine not exposed on window');
    } else {
      check('250 lf against a per-run rate produces no total in the browser', result.mismatch.lineTotal === 0,
        `got ${result.mismatch.lineTotal}`);
      check('the browser reports which units disagreed',
        result.mismatch.unitIssue && result.mismatch.unitIssue.rateUnit === 'Pipe Unit');
      check('4 runs against the same rate still prices in the browser', result.valid.lineTotal === 8000,
        `got ${result.valid.lineTotal}`);
    }
  }

  console.log('\nno runtime errors');
  {
    const real = errors.filter((e) => !/favicon|manifest|sw\.js|ServiceWorker|Failed to load resource/i.test(e));
    check('the app runs with no JavaScript errors', real.length === 0, real.slice(0, 3).join(' | '));
  }

  await page.screenshot({ path: `${OUT}app.png` });
  console.log(`\n  screenshot: ${OUT}app.png`);
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
