// One command. Run this, read one verdict.
//
//   npm run verify
//
// Why this exists. The evidence in this repository was spread across four
// commands with different names, different output formats and different
// prerequisites, and two of them needed a dev server somebody had to remember to
// start. That is how the false claims happened: a commit said "307/307 checks
// passed" while shipping a syntax error that served a blank page; STATUS.md said
// the accessibility scan "reports 0" long after it had decayed to 88; a sweep
// reported 25 screens clean while the app was unusable on a phone. In every case
// something was skipped and the skip looked like a pass.
//
// So this refuses to be quiet about it. A stage that cannot run is a FAILURE,
// reported by name, not a gap in the output. The server is started and stopped
// here so there is nothing to remember. Every stage still runs on its own for
// debugging:
//
//   npm test              source checks over every shipped page
//   npm run qa            button wiring and window exports
//   npm run qa:visual     the CRM in a browser, online and offline
//   npm run qa:site       the public site and the guide in a browser
//   npm run verify:live   production serves this commit and is still locked down

import { spawn, execFileSync } from 'node:child_process';
import http from 'node:http';

const PORT = Number(process.env.VERIFY_PORT || 8000);
const BASE = `http://localhost:${PORT}`;

// `--no-live` omits the production stage entirely, for a pull request: that
// stage asserts things about production which the branch has not deployed yet
// (that the working documents have stopped being published, for one), so gating
// a pull request on it fails by construction. The stage is dropped rather than
// faked, and the verdict says so in words — an all-clear that quietly did not
// look at production is exactly the kind of claim this file exists to prevent.
const NO_LIVE = process.argv.includes('--no-live');

const STAGES = [
  { name: 'unit + source checks', cmd: ['npm', 'test'], needsServer: false,
    covers: 'merge rules, PINs, API routes, roles, demo seeding, and the page-level guards over index.html, landing.html and guide.html' },
  { name: 'button wiring', cmd: ['node', 'scripts/qa-check.mjs'], needsServer: true,
    covers: 'every onclick resolves to a real function; every new function is exported to window' },
  { name: 'the CRM in a browser', cmd: ['node', 'scripts/qa-visual.mjs'], needsServer: true,
    covers: '25 screens at 390/768/1280px, real icons and fonts, and the offline pass' },
  { name: 'the public site in a browser', cmd: ['node', 'scripts/qa-site.mjs'], needsServer: true,
    covers: 'landing.html and guide.html at three widths, links, images, and axe-core WCAG AA' },
  { name: 'the live deployment', cmd: ['node', 'scripts/verify-live.mjs'], needsServer: false, live: true,
    covers: 'production serves a known commit, the working documents are not published, and the API gate is still 403' },
].filter((stage) => !(NO_LIVE && stage.live));

// Exit 3 means "this stage deliberately did not run" (see verify-live.mjs).
// It is reported as SKIPPED and, critically, is not a pass.
const run = (cmd) => new Promise((resolve) => {
  const child = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('close', (code) => resolve(code === 0 ? 'pass' : code === 3 ? 'skip' : 'fail'));
  child.on('error', () => resolve('fail'));
});

const serverUp = () => new Promise((resolve) => {
  const req = http.get(`${BASE}/index.html`, (res) => { res.resume(); resolve(res.statusCode === 200); });
  req.on('error', () => resolve(false));
  req.setTimeout(1500, () => { req.destroy(); resolve(false); });
});

// ── start the server ourselves, unless one is already up ─────────────────────
let ownServer = null;
let haveServer = await serverUp();
if (!haveServer) {
  ownServer = spawn('node', ['scripts/local-server.js'], { stdio: 'ignore', env: { ...process.env, PORT: String(PORT) } });
  for (let i = 0; i < 40 && !haveServer; i++) {
    await new Promise((r) => setTimeout(r, 250));
    haveServer = await serverUp();
  }
}

// Playwright is needed by two stages. Missing it must be loud, not a silent skip.
let havePlaywright = true;
try { execFileSync('node', ['-e', "require('playwright')"], { stdio: 'pipe' }); }
catch { havePlaywright = false; }

console.log('\n' + '='.repeat(64));
console.log('OTTO — full verification');
console.log('='.repeat(64));
if (!haveServer) console.log('\n! the local server did not come up on ' + BASE);
if (!havePlaywright) console.log('\n! playwright is not installed — run: npm install');

const results = [];
for (const stage of STAGES) {
  console.log(`\n${'─'.repeat(64)}\n▶ ${stage.name}\n  ${stage.covers}\n${'─'.repeat(64)}`);

  if (stage.needsServer && !haveServer) {
    console.log(`  cannot run: no server on ${BASE}`);
    results.push({ ...stage, state: 'fail', why: 'the local server would not start' });
    continue;
  }
  if (stage.cmd.includes('scripts/qa-visual.mjs') || stage.cmd.includes('scripts/qa-site.mjs')) {
    if (!havePlaywright) {
      results.push({ ...stage, state: 'fail', why: 'playwright is not installed (npm install)' });
      continue;
    }
  }
  const state = await run(stage.cmd);
  results.push({
    ...stage, state,
    why: state === 'pass' ? ''
      : state === 'skip' ? 'was skipped — it did not run, so it proves nothing'
        : 'reported failures — see its output above',
  });
}

if (ownServer) ownServer.kill();

// ── one verdict ──────────────────────────────────────────────────────────────
const pad = Math.max(...results.map((r) => r.name.length));
console.log('\n' + '='.repeat(64));
console.log('RESULT');
console.log('='.repeat(64));
for (const r of results) {
  const label = r.state === 'pass' ? 'PASS' : r.state === 'skip' ? 'SKIP' : 'FAIL';
  console.log(`  ${label}  ${r.name.padEnd(pad)}${r.state === 'pass' ? '' : '   ' + r.why}`);
}
// A skipped stage is not a passed stage. Nothing here may print an all-clear
// unless every stage actually ran and actually passed.
const failedStages = results.filter((r) => r.state !== 'pass');
console.log('='.repeat(64));
if (failedStages.length === 0) {
  console.log(NO_LIVE
    ? '\nPASS — every stage that ran passed. PRODUCTION WAS NOT CHECKED (--no-live).\n'
    : '\nPASS — every stage ran and every stage passed.\n');
  console.log('Still not covered by any of this, and worth saying plainly:');
  if (NO_LIVE) console.log('  · what production is actually serving (run: npm run verify)');
  console.log('  · a real phone in a real hand');
  console.log('  · anything behind issue #70 (server-side sign-in): cloud sync,');
  console.log('    cross-device photos and customer notifications\n');
  process.exit(0);
}
const skippedCount = failedStages.filter((r) => r.state === 'skip').length;
console.log(`\nNOT VERIFIED — ${failedStages.length} of ${results.length} stage(s) did not pass`
  + (skippedCount ? ` (${skippedCount} skipped, which is not a pass)` : '') + ':\n');
for (const r of failedStages) console.log(`  · ${r.name}: ${r.why}`);
console.log('\nNothing here is a pass until every stage above says PASS.\n');
process.exit(1);
