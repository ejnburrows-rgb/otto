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
console.log('\nevery page this repo ships — not just the app');
{
  // WHAT HAPPENED: these checks existed and passed the whole time landing.html —
  // the public marketing site — was shipping with four unreplaced
  // {{DATA:IMAGE:...}} placeholders, so the live site had no logo at all; with an
  // unclosed @media query that left the entire contact section unstyled on
  // desktop; and with four nav links pointing at sections that do not exist.
  // Every one of those is exactly what the checks below look for. They only ever
  // read index.html. The guard was built and aimed at the wrong file. So the
  // page-level checks now run over every page that deploys.
  const PAGES = ['index.html', 'landing.html', 'guide.html'];

  for (const page of PAGES) {
    const src = readFileSync(new URL('../' + page, import.meta.url), 'utf8');
    const where = (name) => page + ': ' + name;

    // ---- images ----
    const imgSrcs = [...src.matchAll(/<img[^>]+src=["']([^"']+)["']/g)].map((m) => m[1]);
    check(where('every <img> uses a local path'),
      imgSrcs.filter((v) => /^https?:\/\//.test(v)), []);
    check(where('no image-generation prompt text left in a src'),
      imgSrcs.filter((v) => v.length > 120), []);
    // A CSS url() can hold a placeholder too — that is how the hero background
    // on landing.html was lost, silently, because the <img> tags carried
    // onerror handlers that hid the failure.
    check(where('no unreplaced asset placeholders'), /\{\{DATA:IMAGE/.test(src), false);
    // A path can be perfectly local and still point at a file nobody committed.
    // Paths built at runtime (`${url}` from an IndexedDB blob) and inline base64
    // cannot be resolved on disk, so they are skipped.
    check(where('every committed image exists in the repo'),
      imgSrcs
        .filter((v) => !v.includes('${') && !v.startsWith('data:'))
        .filter((v) => !existsSync(new URL('../' + v.replace(/^\.\//, ''), import.meta.url))),
      []);

    // ---- the page must parse ----
    // An unmatched `}` in index.html once meant no JavaScript ran at all and the
    // live site served a white screen. `new Function` parses without running.
    const blocks = [...src.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
    check(where('every inline script parses'),
      blocks.map((b, i) => {
        try { new Function(b[1]); return null; } catch (e) { return 'block ' + (i + 1) + ': ' + e.message; }
      }).filter(Boolean), []);

    // ---- the stylesheet must be balanced ----
    // NEW. `@media (max-width: 768px) {` was opened in landing.html and never
    // closed, so every rule after it — the whole booking/contact section — was
    // trapped inside a mobile-only query and rendered as unstyled default HTML
    // above 768px. Nothing here would have noticed: the file parses, the page
    // loads, no JavaScript error is raised. It is only visible by looking, which
    // is why it survived. Counting braces catches it in a millisecond.
    const styles = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
    check(where('every <style> block closes every rule it opens'),
      styles.map((css, i) => {
        let depth = 0;
        for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
        }
        return depth === 0 ? null : '<style> block ' + (i + 1) + ' ends at depth ' + depth;
      }).filter(Boolean), []);

    // ---- in-page links must go somewhere ----
    // NEW. landing.html carried four links to #portfolio and #mastery across two
    // separate navs. Neither section has ever existed, so a third of the site
    // navigation did nothing at all.
    const ids = new Set([...src.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));
    const fragments = [...src.matchAll(/href=["']#([^"']+)["']/g)]
      .map((m) => m[1]).filter((f) => f && f !== 'top');
    check(where('every in-page link points at a section that exists'),
      [...new Set(fragments.filter((f) => !ids.has(f)))].sort(), []);
  }
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

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nthe design system must hold across every screen, not just the dashboard');
{
  // WHAT HAPPENED: the dashboard was rebuilt to the approved design and the
  // other 24 screens were not, so the app had two visual languages in it. The
  // most visible symptom was button colour — Customers put a green "Add
  // customer" next to a blue "Photo → new customer", and Backups stacked a
  // green, a blue and an orange button in one column, so nothing on the screen
  // said which action mattered. One primary, everything else secondary, red
  // only where something is destroyed.
  check('no green or amber button variant is defined',
    /\.btn\.(green|amber)\s*\{/.test(html), false);
  check('no button asks for a green or amber variant',
    [...html.matchAll(/class="btn[^"]*"/g)].map(m => m[0]).filter(c => /\b(green|amber)\b/.test(c)), []);
  // `small` was never a size in this stylesheet — `sm` is — so four buttons
  // asking for it silently rendered at full size.
  check('no button asks for a size that does not exist',
    [...html.matchAll(/class="btn[^"]*"/g)].map(m => m[0])
      .filter(c => /\bsmall\b/.test(c) || /\bbtn-primary\b/.test(c)), []);

  // WHAT HAPPENED: --green/--amber/--red/--blue2 are the *text* colours, kept
  // deliberately bright so they read on a dark card. Twelve avatar and tile
  // squares used them as solid fills with a white icon on top, which measures
  // 1.71:1 to 2.77:1 — well under the 4.5:1 AA needs. The --*-fill tokens exist
  // for exactly this and are all above 5:1.
  //
  // The first version of this check read the style attribute, and missed the
  // Reports screen entirely, because those six squares get their colour from a
  // table (`'var(--amber)'` in an array) rather than from the literal attribute.
  // So it looks at both: anything painted as a background, and any bright token
  // sitting in a quoted string ready to be handed to one.
  const BRIGHT = String.raw`--(?:green|amber|red|blue2|blue|accent)\b`;
  // Small dots and bars carry nothing on top of them, so a bright colour is
  // exactly right there — they are pure indicators, not surfaces. Everything
  // else that gets painted has a label or a glyph sitting on it.
  const INDICATOR = /notif-dot|sched-dots|pindots|dotsHtml/;
  const offenders = [];
  html.split('\n').forEach((line, i) => {
    if (INDICATOR.test(line)) return;
    const bg = new RegExp(String.raw`background:\s*var\(\s*(${BRIGHT})\s*\)`).exec(line);
    if (bg) offenders.push(`line ${i + 1}: ${bg[0]}`);
    // A colour handed to a `.ic` or `.avatar` square through a table rather than
    // written into the attribute — how the Reports screen escaped the first
    // version of this check. Lines that name a text colour are skipped: putting
    // a bright token on text is the whole reason those tokens are bright. The
    // `background:` case above does not use this exemption, so a line that sets
    // both a background and a colour is still caught.
    if (/color/i.test(line)) return;
    const tbl = new RegExp(String.raw`'var\(\s*(${BRIGHT})\s*\)'`).exec(line);
    if (tbl) offenders.push(`line ${i + 1}: ${tbl[0]}`);
  });
  check('nothing paints a solid surface with a bright text colour', offenders, []);

  // WHAT HAPPENED: three avatars asked for `var(--gray)`, which is defined
  // nowhere in this file, so they painted transparent. Nothing caught it,
  // because a CSS custom property that does not exist fails silently.
  {
    const declared = new Set([...html.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m => m[1]));
    const used = new Set([...html.matchAll(/var\((--[a-z0-9-]+)/gi)].map(m => m[1]));
    check('every CSS variable the page uses is actually defined',
      [...used].filter(v => !declared.has(v)).sort(), []);
  }

  // WHAT HAPPENED: #2F6BFF carrying white text measures 4.499:1 and misses AA by
  // a hundredth, so an axe-core run over 25 screens in both languages reported
  // it on every primary button, both language-toggle states, every selected tab
  // and every dashboard status pill — 88 failing elements. --action is the same
  // blue moved just far enough to clear the bar. This computes the ratio rather
  // than trusting the hex, so nudging the colour back cannot pass quietly.
  {
    const lum = (hex) => {
      const c = [0, 2, 4].map(i => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const onWhite = (hex) => (Math.max(lum(hex), 1) + 0.05) / (Math.min(lum(hex), 1) + 0.05);
    const tokens = ['--action', '--status-done', '--accent-fill', '--green-fill',
      '--amber-fill', '--red-fill', '--neutral-fill'];
    const failing = tokens.map((tok) => {
      const hex = (html.match(new RegExp(`${tok}\\s*:\\s*(#[0-9a-f]{6})`, 'i')) || [])[1];
      return { tok, hex, ratio: hex ? Number(onWhite(hex).toFixed(2)) : null };
    }).filter(r => r.hex === undefined || r.ratio === null || r.ratio < 4.5);
    check('every token that carries white text clears WCAG AA (4.5:1)', failing, []);
  }

  // WHAT HAPPENED: two different screens were both called "Inbox", in both
  // languages, so the More menu listed the same name twice.
  {
    const table = (start) => html.slice(html.indexOf(start), html.indexOf(start) + 9000);
    const nameFor = (block, key) => (block.match(new RegExp(`[ {,]${key}:\\s*'([^']*)'`)) || [])[1];
    const en = table('    en: {'), es = table('    es: {');
    check('the email log and the inbox are not both called the same thing',
      [nameFor(en, 'emails') === nameFor(en, 'inbox'), nameFor(es, 'emails') === nameFor(es, 'inbox')],
      [false, false]);
  }

  // WHAT HAPPENED: the 2026-07-31 facelift left four per-person gradient themes,
  // two cameo animations and a glass override behind. None could run —
  // finishLogin() sets `theme-app` for every role — but the glass rule selected
  // [class*="theme-"], which theme-app matches, so it was forcing an !important
  // background and a 40px shadow onto every card and the top bar.
  check('the dead per-person theme rules have not come back',
    /body\.theme-(otto|julio|principe|saray|field)\s*[,{]/.test(html), false);
  check('nothing styles by partial theme class name again',
    // Comments stripped first: this file explains the rule it is banning, and
    // the explanation must not be what trips the check.
    /\[class\*=["']theme-["']\]/.test(html.replace(/\/\*[\s\S]*?\*\//g, '')), false);
  check('no hardcoded colour singles one person out',
    /#EC4899/i.test(html), false);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nthe install and the deploy must be what they claim to be');
{
  // WHAT HAPPENED: manifest.json declared the same SVG twice, once as 512x512
  // and once as 192x192, and referenced neither PNG that ships. Meanwhile
  // icon-192.png was actually 512x512 and byte-identical to icon-512.png — the
  // same image under two names. An install prompt wants a real raster icon at
  // the size it was promised.
  const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url), 'utf8'));
  const pngSize = (file) => {
    const buf = readFileSync(new URL('../' + file, import.meta.url));
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  };
  const iconProblems = [];
  for (const icon of manifest.icons || []) {
    const rel = icon.src.replace(/^\.\//, '');
    if (!existsSync(new URL('../' + rel, import.meta.url))) {
      iconProblems.push(`${icon.src} is declared but not in the repo`);
      continue;
    }
    if (!rel.endsWith('.png') || icon.sizes === 'any') continue;
    const { w, h } = pngSize(rel);
    if (`${w}x${h}` !== icon.sizes) {
      iconProblems.push(`${icon.src} claims ${icon.sizes} but is actually ${w}x${h}`);
    }
  }
  check('every manifest icon exists and is the size it claims', iconProblems, []);
  check('the manifest ships at least one real raster icon',
    (manifest.icons || []).some((i) => i.src.endsWith('.png')), true);
  check('the manifest start_url is a page that exists',
    existsSync(new URL('../' + String(manifest.start_url || '').replace(/^\.\//, ''), import.meta.url)), true);

  // WHAT HAPPENED: vercel.json sets outputDirectory to ".", so the entire
  // repository was published. docs/STATUS.md — which details three past
  // credential incidents, names the Supabase project and states that sign-in is
  // browser-side only and bypassable — returned 200 on the public domain, as did
  // AGENTS.md, every script, and the database schema.
  const ignore = readFileSync(new URL('../.vercelignore', import.meta.url), 'utf8');
  const mustNotPublish = ['docs/', 'scripts/', 'supabase/', 'legacy/', '*.md'];
  check('the deploy still excludes the working documents and tooling',
    mustNotPublish.filter((entry) => !ignore.split('\n').some((l) => l.trim() === entry)), []);

  // The pages, the worker and the icons must NOT be excluded, or the site ships
  // broken. Cheap sanity check on the same file.
  const shipped = ['index.html', 'landing.html', 'guide.html', 'manifest.json', 'sw.js', 'logo.jpg'];
  check('nothing that must ship is excluded',
    shipped.filter((f) => ignore.split('\n').some((l) => l.trim() === f)), []);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
