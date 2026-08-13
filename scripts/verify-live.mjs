// Does production actually serve this commit, and is it still locked down?
//
//   npm run verify:live
//
// Everything else in this repository tests the working copy. This is the only
// check that looks at what the public is actually being served, which is a
// different question and has been answered wrongly before: `docs/STATUS.md`
// carried a "live deployment verified" claim while version.json named a commit
// from days earlier, because it was maintained by hand. It is generated at build
// time now (scripts/stamp-version.mjs), so it can be compared.
//
// Set VERIFY_SKIP_LIVE=1 to skip when offline. It exits 3, not 0 — a skip must
// never be able to read as a pass. `verify.mjs` treats 3 as SKIPPED and refuses
// to print an all-clear verdict, because "every stage passed" over a stage that
// never ran is the exact failure this whole exercise exists to remove.

import { execFileSync } from 'node:child_process';

const SITE = process.env.VERIFY_URL || 'https://otto-kohl.vercel.app';

let passed = 0, failed = 0, skipped = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};

if (process.env.VERIFY_SKIP_LIVE) {
  console.log('\nlive deployment — SKIPPED (VERIFY_SKIP_LIVE set). Production was NOT checked.\n');
  process.exit(3);
}

const curl = (args) => {
  try { return execFileSync('curl', ['-sS', '--max-time', '25', ...args], { encoding: 'utf8' }); }
  catch { return null; }
};
const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
const status = (url, method = 'GET') => {
  const out = curl(['-o', nullDevice, '-w', '%{http_code}', '-L', ...(method === 'POST' ? ['-X', 'POST'] : []), url]);
  return out ? out.trim() : '000';
};

console.log(`\nlive deployment — ${SITE}`);

// ── 1. Which commit is being served? ─────────────────────────────────────────
const raw = curl(['-L', `${SITE}/version.json`]);
if (raw === null) {
  console.log('  FAIL could not reach the site at all');
  console.log('\n0 passed, 1 failed\n');
  process.exit(1);
}
let marker = null;
try { marker = JSON.parse(raw); } catch { /* not json */ }
check('the deployed build identifies itself', !!marker && !!marker.commit,
  marker ? `${marker.shortCommit} on ${marker.sourceBranch}, built ${marker.builtAt}` : 'version.json is missing or not JSON');

const head = (() => {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { return null; }
})();
if (marker && marker.commit && head) {
  const match = marker.commit === head;
  // Not a failure on a feature branch — production is meant to be `main`. It is
  // reported either way so the number is never assumed.
  if (match) check('production is serving this exact commit', true, marker.shortCommit);
  else {
    skipped++;
    console.log(`  note production serves ${marker.shortCommit}; this working copy is ${head.slice(0, 7)}`);
    console.log('       (expected while on a branch — compare again once merged)');
  }
}

// ── 2. The pages the public is meant to get ──────────────────────────────────
for (const page of ['index.html', 'landing.html', 'guide.html', 'manifest.json', 'sw.js', 'logo.jpg']) {
  check(`${page} is served`, status(`${SITE}/${page}`) === '200');
}

// ── 3. What must NOT be served ───────────────────────────────────────────────
// vercel.json publishes the repository root, so before .vercelignore existed all
// of this returned 200 on the public domain — including a status document that
// details three past credential incidents and states that sign-in is enforced in
// the browser only.
const mustBeHidden = [
  'docs/STATUS.md',
  'docs/OWNER-MANUAL-STEPS.md',
  'AGENTS.md',
  'scripts/qa-check.mjs',
  'supabase/migrations/0001_init_schema.sql',
  'legacy/dream-cooling-crm.html',
];
for (const f of mustBeHidden) {
  const code = status(`${SITE}/${f}`);
  check(`${f} is not published`, code !== '200', `HTTP ${code}`);
}

// ── 4. Anonymous access is refused ───────────────────────────────────────────
// Status codes only — never response bodies, which would mean touching real
// customer data. Authenticated access is covered separately with test accounts.
for (const [route, method] of [['data', 'GET'], ['nvidia', 'POST'], ['notify', 'POST'], ['photos', 'GET']]) {
  const code = status(`${SITE}/api/${route}`, method);
  check(`/api/${route} refuses an unauthenticated request`, code === '401', `HTTP ${code}`);
}

console.log(`\n${passed} passed, ${failed} failed${skipped ? `, ${skipped} noted` : ''}\n`);
process.exit(failed ? 1 : 0);
