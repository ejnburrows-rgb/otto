import fs from 'node:fs';

const landing = fs.readFileSync(new URL('../landing.html', import.meta.url), 'utf8');
const guide = fs.readFileSync(new URL('../guide.html', import.meta.url), 'utf8');
const manifest = JSON.parse(fs.readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

let passed = 0, failed = 0;
function check(name, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed++; else failed++;
}

const retiredClaims = [
  "Miami's Elite",
  '5K+',
  '5 ★',
  '24h',
  'Hundreds of 5-star reviews',
  'Available 7 days a week'
];
check('landing page contains no retired marketing claims', retiredClaims.every((s) => !landing.includes(s)));
check('landing page sends public visitors to the maintained public site', landing.includes('https://otto-plumbing-site.vercel.app/'));
check('landing page keeps the confirmed business phone', landing.includes('(786) 344-2837') && landing.includes('+17863442837'));
check('landing page keeps the confirmed license', landing.includes('CFC1429613'));
check('landing contact area has no undeliverable form', landing.includes('id="contact"') && !/<form\b/i.test(landing));

const retiredGuideClaims = [
  'syncs later',
  'syncs when signal returns',
  'gets your report instantly',
  'sees it instantly on their phone',
  'four big tiles',
  'one tap exports your invoices and payments in the format QuickBooks accepts'
];
check('guide no longer promises blocked or retired behavior', retiredGuideClaims.every((s) => !guide.includes(s)));
check('guide states the fail-closed cloud limitation', guide.includes('Server routes are fail-closed right now'));
check('guide states QuickBooks is not part of the current product', guide.includes('QuickBooks is not part of the current product'));
check('guide documents the permanent left rail', guide.includes('permanent left rail') && guide.includes('Back to panels'));
check('guide documents photo retry truthfully', guide.includes('Failed cloud uploads remain in the persistent retry queue'));

check('PWA metadata has no retired marketing claim', !String(manifest.description || '').includes("Miami's Elite"));
check('PWA metadata describes the actual CRM', manifest.description === 'Bilingual offline-first plumbing CRM for OTTO Plumbing Inc.');
// Pinned to an exact version, this failed the next time the cache legitimately
// needed bumping. What matters is that it never goes backwards past the bump
// these surfaces needed — and that it is compared as a number, since '9' > '10'
// as strings and that mistake has already been made once in this suite.
check('offline cache is at or past the bump these surfaces needed', Number(/const CACHE = 'otto-crm-v(\d+)'/.exec(sw)?.[1]) >= 11);

console.log(`Live surface checks: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
