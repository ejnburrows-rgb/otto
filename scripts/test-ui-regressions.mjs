// UI faults that reached production, pinned so they cannot return.
//
// Each check below corresponds to something a real person hit in the real app.
// They are deliberately source-level assertions: the faults they guard against
// are invisible to the existing test suite and to qa-check, which is exactly why
// they shipped.
//
// Run with:  node scripts/test-ui-regressions.mjs

import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\ndraggable cards — the app must not fight the user scrolling');
{
  // WHAT HAPPENED: initDraggableHUD() ran from finishLogin() for every user on
  // every device, and bound interact('.card, .tile').draggable(). `.card` is the
  // container for every list in this app. Proven at 390px with touch: one normal
  // upward swipe on the customer list carried the card 216px up the screen
  // (transform: translate(-0.07px, -215.89px)) and left the page looking empty.
  check('nothing binds interact draggable to cards or tiles',
    /interact\(\s*['"`][^'"`]*\.(card|tile)/.test(html), false);
  check('no .draggable() call survives anywhere',
    /\.draggable\s*\(/.test(html), false);
  check('initDraggableHUD is not called', /^\s*initDraggableHUD\(\)/m.test(html), false);

  // A function removed but left on the window export list throws at load and
  // blanks the whole app — that is the PR #82 fault, and it nearly recurred here.
  const exportBlock = html.slice(html.indexOf('Object.assign(window, {'));
  const exportEnd = exportBlock.indexOf('});') + 3;
  check('initDraggableHUD is not exported to window',
    exportBlock.slice(0, exportEnd).includes('initDraggableHUD'), false);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nevery exported name must actually exist');
{
  // Generalises the check above: anything in the window export list that has no
  // definition throws the moment the page loads, and nothing on the page runs.
  const start = html.indexOf('Object.assign(window, {');
  const block = html.slice(start, html.indexOf('});', start));
  const names = [...block.matchAll(/(?:^|[\s,{])([A-Za-z_$][\w$]*)\s*(?:,|\}|$)/gm)]
    .map(m => m[1])
    .filter(n => !['Object', 'assign', 'window', 'true', 'false', 'null'].includes(n));
  const missing = names.filter(n =>
    !new RegExp(`function\\s+${n}\\s*\\(`).test(html) &&
    !new RegExp(`(const|let|var)\\s+${n}\\s*=`).test(html) &&
    !new RegExp(`${n}\\s*:\\s*`).test(block)
  );
  check('no exported name is undefined', missing, []);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nthe floating assistant button must not cover page content');
{
  // The button is fixed at bottom: 88px with height 56px, so it occupies up to
  // 144px from the bottom. Page padding has to clear that or it sits on top of
  // whatever the last control on the screen happens to be — it was covering the
  // "Daily summary" button on the home screen.
  const fabBottom = /\.fab\s*\{[^}]*bottom:\s*calc\((\d+)px/.exec(html);
  const fabHeight = /\.fab\s*\{[^}]*height:\s*(\d+)px/.exec(html);
  const wrapPad = /\.wrap\s*\{[^}]*padding:\s*\d+px\s+\d+px\s+(\d+)px/.exec(html);
  check('the fab geometry is still readable', !!(fabBottom && fabHeight && wrapPad), true);
  if (fabBottom && fabHeight && wrapPad) {
    const needed = Number(fabBottom[1]) + Number(fabHeight[1]);
    check(`page padding (${wrapPad[1]}px) clears the fab (${needed}px)`,
      Number(wrapPad[1]) >= needed, true);
  }
  // The narrow-screen override must clear it too — that is the phone case.
  const narrow = /@media[^{]*\{[^}]*\.wrap\s*\{\s*padding:\s*\d+px\s+\d+px\s+(\d+)px/.exec(html);
  if (narrow) check(`narrow-screen padding (${narrow[1]}px) clears the fab too`,
    Number(narrow[1]) >= 144, true);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\noffline-first — no image may depend on a remote host');
{
  // Six images once shipped with image-generation prompt text where the URL
  // belonged. All 404'd. This app must render with no signal.
  const imgSrcs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)].map(m => m[1]);
  const remote = imgSrcs.filter(s => /^https?:\/\//.test(s));
  check('every <img> uses a local path', remote, []);
  check('no image-generation prompt text left in a src',
    imgSrcs.filter(s => s.length > 120), []);
  check('no unreplaced asset placeholders', /\{\{DATA:IMAGE/.test(html), false);
}

console.log('\napproved Stitch dashboard structure must stay intact');
{
  check('dashboard uses the approved four-card summary',
    ['jobsToday', 'newCustomers', 'pendingInvoices', 'openEstimates']
      .every(key => html.includes(`t('${key}')`)), true);
  check('dashboard includes the weekly schedule strip',
    html.includes('class="hub-week"'), true);
  check('dashboard includes recent job cards',
    html.includes('class="hub-jobs"'), true);
  check('dashboard uses the approved deep navy surface',
    html.includes('--bg: #0B1326;'), true);
  check('dashboard uses the approved electric blue action colour',
    html.includes('--blue: #2F6BFF;'), true);
  check('dashboard uses Hanken Grotesk headings',
    html.includes("'Hanken Grotesk'"), true);
  check('duplicate floating assistant does not cover dashboard cards',
    /^\s*ensureFloatingAI\(\);/m.test(html), false);
  check('phone job footer leaves room for the add button',
    html.includes('.hub-job-foot { padding-right:62px; }'), true);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
