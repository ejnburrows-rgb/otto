// UI faults that reached production, pinned so they cannot return.
//
// Each check below corresponds to something a real person hit in the real app.
// They are deliberately source-level assertions: the faults they guard against
// are invisible to the existing test suite and to qa-check, which is exactly why
// they shipped.
//
// Run with:  node scripts/test-ui-regressions.mjs

import { existsSync, readFileSync } from 'node:fs';

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

  // A path can be perfectly local and still point at a file nobody committed —
  // which renders as nothing and looks fine in the source. So check the disk.
  // Only fixed paths can be checked: the rest are built at runtime from a blob
  // in IndexedDB (`${url}`) or are inline base64 sent to the AI.
  const onDisk = imgSrcs
    .filter(s => !s.includes('${') && !s.startsWith('data:'))
    .filter(s => !existsSync(new URL('../' + s.replace(/^\.\//, ''), import.meta.url)));
  check('every committed image actually exists in the repo', onDisk, []);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nthe page must parse — a syntax error blanks the whole app');
{
  // This is fault #1 in AGENTS.md: an unmatched `}` in the sign-in keypad meant
  // no JavaScript ran at all and the live site served a white screen. Nothing
  // else in this suite would notice, because every other check reads the file as
  // text. `new Function` parses the body without running it.
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  check('the page has an inline script to check', blocks.length > 0, true);
  const broken = blocks.map((b, i) => {
    try { new Function(b[1]); return null; } catch (e) { return `block ${i + 1}: ${e.message}`; }
  }).filter(Boolean);
  check('every inline script parses', broken, []);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\noffline-first — the icons and fonts must survive losing signal');
{
  // WHAT HAPPENED: proven in a real browser with the CDN hosts taken away after
  // one successful load. Offline, every icon rendered as a blank box and both
  // webfonts fell back, on a field tool whose whole promise is working with no
  // signal. Two independent causes, both pinned below.
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

  // Cause 1: the rule that skips API hosts was a substring test, and
  // 'fonts.googleapis.com'.includes('googleapis.com') is true — so the
  // stylesheet declaring every @font-face was excluded from the cache, while
  // the font files it points at were cached and left unusable.
  check('the API-host rule no longer swallows fonts.googleapis.com',
    /includes\(\s*['"]googleapis\.com['"]\s*\)/.test(sw), false);
  check('the Gmail API host is still excluded from caching',
    sw.includes('gmail.googleapis.com'), true);

  // Cause 2: a cross-origin <link>/<script> without crossorigin is fetched in
  // no-cors mode and comes back opaque with status 0, so the service worker's
  // `status === 200` test never matched and it stored nothing.
  const tags = [
    ...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/g),
    ...html.matchAll(/<script\b[^>]*\bsrc=["']https?:[^"']+["'][^>]*>/g),
  ].map(m => m[0]);
  const remoteTags = tags.filter(t => /["']https?:\/\//.test(t));
  const cacheable = remoteTags.filter(t => /cdnjs|jsdelivr|fonts\.googleapis/.test(t));
  check('every cacheable cross-origin stylesheet and script asks for CORS',
    cacheable.filter(t => !/crossorigin/i.test(t)), []);
  check('the scripts injected at run time ask for CORS too',
    (html.match(/\bs\.crossOrigin\s*=\s*['"]anonymous['"]/g) || []).length >= 2, true);

  // The service worker must precache the icon and font stylesheets: on a first
  // visit it is not controlling the page yet, so it never sees those requests,
  // and a phone that opened the app once and drove out of signal had no icons.
  //
  // These two used to assert that a hardcoded `CDN_SHELL` list existed in sw.js.
  // The list did exist, and both checks passed — while the feature was broken.
  // The dashboard redesign added Hanken Grotesk and JetBrains Mono to the page's
  // stylesheet link and left sw.js holding the old URL, so the worker cached a
  // stylesheet the page never asks for and every webfont vanished offline. The
  // icons kept working, because their URL had not changed, which made it look
  // fine. The list existing was never the point — the two URLs agreeing was.
  // So the worker reads them off the page now, and nothing is written twice.
  check('the worker reads its stylesheet list out of the page',
    /cdnStylesheetsIn/.test(sw), true);
  check('no stylesheet URL is hardcoded in the worker, to drift out of date again',
    [...sw.matchAll(/['"](https:\/\/(?:cdnjs\.cloudflare\.com|fonts\.googleapis\.com)[^'"]+)['"]/g)]
      .map(m => m[1]), []);
  const hrefs = cacheable.map(t => (t.match(/href=["']([^"']+)["']/) || [])[1]);
  check('the page still links the icon stylesheet for the worker to find',
    hrefs.some(h => h && h.includes('font-awesome')), true);
  check('the page still links the webfont stylesheet for the worker to find',
    hrefs.some(h => h && h.includes('fonts.googleapis.com')), true);
  // Caching a stylesheet without the .woff2 files it references still leaves
  // every icon a blank box, and the computed font-family still reads correctly,
  // so this one is invisible unless you measure a glyph.
  check('the font files referenced by those stylesheets are precached too',
    /cacheFontsReferencedBy/.test(sw) && /\.woff2/.test(sw), true);
  check('the cache name was bumped so devices pick the new rules up',
    /const CACHE = 'otto-crm-v(\d+)'/.exec(sw)?.[1] >= '5', true);
}

// ─────────────────────────────────────────────────────────────────────────────
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
