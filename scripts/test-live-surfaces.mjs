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
  'one tap exports your invoices and payments in the format QuickBooks accepts',
  'permanent left rail with four sections',
  'Only one work panel opens at a time',
  'Back to panels'
];
check('guide no longer promises blocked or retired behavior', retiredGuideClaims.every((s) => !guide.includes(s)));
check('guide explains secure cloud sign-in', guide.includes('Secure cloud sign-in'));
check('guide explains the manual QuickBooks handoff boundary', guide.includes('manual handoff only'));
check('guide explains optional location sharing', guide.includes('may allow or deny work-location sharing'));
check('guide documents the three-window workspace', guide.includes('Three primary windows are open together') && guide.includes('minimized') && guide.includes('full screen'));
check('guide documents Julio green and Saray pink identity', guide.includes('Julio’s interface uses green accents') && guide.includes('Saray’s uses pink accents'));
check('guide documents Plans & AutoCAD', guide.includes('PDF, DWG, DXF, DWF, or DGN'));
check('guide documents real crew hours', guide.includes('job check-in and check-out records') && guide.includes('fake KPI charts'));
check('guide documents photo retry truthfully', guide.includes('Failed cloud uploads remain in the persistent retry queue'));

check('PWA metadata has no retired marketing claim', !String(manifest.description || '').includes("Miami's Elite"));
check('PWA metadata describes the actual CRM', manifest.description === 'Bilingual offline-first plumbing CRM for OTTO Plumbing Inc.');
check('offline cache is current for the workspace', /const CACHE = 'otto-crm-v(\d+)'/.exec(sw)?.[1] === '12');

console.log(`Live surface checks: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
