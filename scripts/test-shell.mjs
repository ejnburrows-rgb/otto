/* Owner reference shell — the checks that prove the new presentation is the one
   the browser actually loads, not just code sitting in the repository.

   These assert wiring and design contract. Rendering, responsive behaviour and
   JavaScript errors are proven in a real browser; see docs/STATUS.md. */

import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../otto-shell.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../otto-shell.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

/* Comments explain what the shell deliberately does NOT do, so they name the
   very things some checks below search for. Match against code only. */
const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const todayScreen = js.slice(js.indexOf('function todayScreen'), js.indexOf('function scheduleScreen'));

const checks = [
  // ── the page really loads it ──────────────────────────────────────────────
  ['shell stylesheet is wired into the page', index.includes('href="./otto-shell.css?v=1" data-otto-shell-styles')],
  ['shell runtime is wired into the page', index.includes('src="./otto-shell.js?v=1" data-otto-shell-runtime')],
  ['shell loads after the layer it supersedes',
    index.indexOf('data-otto-shell-styles') > index.indexOf('data-otto-home-styles')
    && index.indexOf('data-otto-shell-runtime') > index.indexOf('data-otto-home-runtime')],
  ['shell assets are precached for offline use', sw.includes("'./otto-shell.css'") && sw.includes("'./otto-shell.js'")],

  // ── one typeface ──────────────────────────────────────────────────────────
  ['Geist is requested from the existing font stylesheet', index.includes('family=Geist:wght@400;500;600;700')],
  ['the shell declares one font family with Inter as the fallback',
    css.includes("--ot-font: 'Geist', 'Inter'") && (css.match(/--ot-font:/g) || []).length === 1],

  // ── fixed palette ─────────────────────────────────────────────────────────
  ...[['--ot-bg', '#F7F7F8'], ['--ot-surface', '#FFFFFF'], ['--ot-sidebar', '#111214'],
      ['--ot-sidebar-hover', '#1B1D21'], ['--ot-text', '#15171A'], ['--ot-text-2', '#626872'],
      ['--ot-muted', '#8A9099'], ['--ot-border', '#E5E7EA'], ['--ot-accent', '#2563EB'],
      ['--ot-accent-hover', '#1D4ED8'], ['--ot-selected', '#EEF4FF'], ['--ot-success', '#17803D'],
      ['--ot-warning', '#B76A00'], ['--ot-error', '#C93737']]
    .map(([token, value]) => [`palette token ${token} is ${value}`, css.includes(`${token}: ${value}`)]),
  ['radius scale is controls 8 / panels 10 / dialogs 12',
    css.includes('--ot-r-control: 8px') && css.includes('--ot-r-panel: 10px') && css.includes('--ot-r-dialog: 12px')],
  ['motion stays inside 120–180ms', /--ot-motion: 1[2-8]0ms/.test(css)],
  ['no gradients, glass or glow in the shell layer',
    !/linear-gradient|radial-gradient|backdrop-filter/.test(css)],

  // ── the superseded presentation is neutralized, not deleted ──────────────
  ['wallpaper is removed from the operational shell', css.includes('body.otto-shell #wallpaper-bg') && css.includes('display: none !important')],
  ['the desktop-window metaphor is out of the shell',
    js.includes("classList.remove('admin-home', 'admin-workspace', 'otto-secondary', 'otto-fullscreen-window')")],
  ['the previous workspace runtime is preserved, not deleted',
    fs.existsSync(new URL('../otto-home.js', import.meta.url))
    && fs.readFileSync(new URL('../otto-home.js', import.meta.url), 'utf8').includes('const WINDOW_STATES')],
  ['field workers keep their own home', js.includes("session.role === 'field'") && js.includes('priorViewHome()')],

  // ── primary navigation ────────────────────────────────────────────────────
  ['desktop primary navigation is Today, Schedule, Jobs, Customers, Money',
    ['Today', 'Schedule', 'Jobs', 'Customers', 'Money'].every(name => js.includes(`en: '${name}'`))
    && (js.match(/^\s+\{ id: '(today|schedule|jobs|customers|money)'/gm) || []).length === 5],
  ['secondary features are kept and moved into More',
    ['Team', 'Inbox', 'Plans & AutoCAD', 'Payroll', 'Reports', 'Checks', 'Workflows', 'Knowledge', 'Map', 'Backups', 'Audit', 'Settings']
      .every(name => js.includes(`en: '${name}'`))],
  ['More is reachable from both the sidebar and the phone dock',
    (js.match(/data-otto-action="otto-more"/g) || []).length >= 2],

  // ── Today ─────────────────────────────────────────────────────────────────
  ['Today leads with a short summary, not a KPI card grid',
    js.includes("words('In progress'") && js.includes("words('Scheduled today'") && js.includes("words('Need attention'")
    && (todayScreen.match(/class="ot-stat/g) || []).length === 4],
  ["today's jobs show time, customer, description, technician and status",
    js.includes('class="ot-row-time"') && js.includes('class="ot-row-title"') && js.includes('class="ot-row-sub"')
    && js.includes('class="ot-row-tech"') && js.includes('function jobStatus(job)')],
  ['Home answers attention and recent change',
    js.includes('function attention()') && js.includes('function activity()') && js.includes("words('Recent activity'")],
  ['attention items are real work, not filler',
    js.includes("words('Overdue invoice'") && js.includes("words('Estimate awaiting approval'")
    && js.includes("words('Unassigned job'") && js.includes("words('Customer reply'")],
  ['no records are invented for the display',
    !js.includes('Math.random') && js.includes("list('audit_log')")],
  ['a real clock time is shown only when one exists',
    js.includes('function jobTime(job)') && js.includes('if (job.activeCheckIn)')],
  ['every section has a polished empty state',
    js.includes('function emptyState(') && (js.match(/emptyState\(/g) || []).length >= 4],

  // ── search / Ask OTTO ─────────────────────────────────────────────────────
  ['one compact command entry point, labelled for search and Ask OTTO',
    js.includes("words('Search or Ask OTTO…'") && js.includes('function commandHint()')],
  ['the command palette opens on ⌘K / Ctrl K',
    js.includes("(event.metaKey || event.ctrlKey) && (event.key === 'k'")],
  ['it searches real jobs and customers and can hand the question to Ask OTTO',
    js.includes("list('jobs')") && js.includes("list('customers')") && js.includes('function askOtto(text)')],
  ['the existing Ask OTTO backend is reused, not rewritten',
    js.includes("nav('assistant')") && js.includes('askAssistant()') && !code.includes('fetch(')],
  ['Home carries no embedded chatbot panel', !js.includes('chat-history') && !js.includes('otto-assistant-panel')],

  // ── mobile ────────────────────────────────────────────────────────────────
  ['the phone gets its own bottom navigation, not a shrunken sidebar',
    css.includes('.ot-dock {') && css.includes('.ot-sidebar { display: none; }')],
  ['the phone dock is Today, Schedule, Jobs, Customers, More',
    js.includes("item.id !== 'money'") && js.includes("['today', 'schedule', 'jobs', 'customers'].includes(active)")],
  ['phone content uses the full width', css.includes('margin-left: 0;') && css.includes('padding: 20px 16px')],
  ['the phone breakpoint is declared', css.includes('@media (max-width: 900px)')],

  // ── business logic untouched ──────────────────────────────────────────────
  ['the shell adds no data, auth or storage behaviour',
    !/supabase|localStorage|indexedDB|serverFetch/i.test(code)],
  ['navigation reuses the existing router and permission checks',
    js.includes('data-otto-action="nav"') && js.includes('function allowed(item)') && js.includes('can(item.perm)')],

  // ── the design reaches every screen, not only the ones it rewrote ───────
  /* The screens that predate the shell keep their own markup and logic; these
     assert that their vocabulary is restyled rather than left as foreign cards
     inside a new frame. */
  ['legacy screen surfaces are restyled inside the shell',
    ['#main .card', '#main .list-item', '#main .tile'].every(s => css.includes(s))],
  ['legacy controls are restyled inside the shell',
    ['#main .btn', '#main .iconbtn', '#main .tabs button', '#main .pill'].every(s => css.includes(s))],
  ['legacy forms are restyled inside the shell',
    css.includes('#main .field label') && css.includes('#main .searchbar') && css.includes('body.otto-shell .overlay select')],
  ['legacy empty states and page heads are restyled',
    css.includes('#main .empty') && css.includes('#main .pagehead .back') && css.includes('#main .section-title')],

  // ── light / dark ────────────────────────────────────────────────────────
  /* The theme control used to be inert while the shell was active. Dark now
     re-tones the same shell; it must never become a second application. */
  ['dark mode re-tones the shell tokens', css.includes('html[data-theme="dark"] body.otto-shell')],
  ['dark mode also remaps the app tokens the legacy screens read',
    css.includes('html[data-theme="dark"] body.otto-shell[data-theme]')],
  ['dark mode gives the status badges their own ground rather than a light wash',
    css.includes('html[data-theme="dark"] body.otto-shell .ot-badge.is-active')],
  ['light remains the baseline — dark applies only on an explicit choice',
    !css.includes('prefers-color-scheme')],

  // ── responsive ──────────────────────────────────────────────────────────
  ['dense tables restack on small screens instead of shrinking',
    css.includes('table td[data-label]::before') && css.includes('table thead { display: none; }')],
  ['phone breakpoints raise the tap targets',
    css.includes('@media (max-width: 900px)') && css.includes('min-height: 44px')],
  ['status filters wrap rather than scrolling out of sight',
    css.includes('#main .tabs { flex-wrap: wrap; overflow-x: visible; }')],
  ['landscape phone and large desktop are both handled',
    css.includes('orientation: landscape') && css.includes('@media (min-width: 1600px)')],
  ['no screen may scroll the page sideways', css.includes('#main { overflow-x: hidden; }')],

  // ── Ask OTTO is a dialog, not a permanent overlay ───────────────────────
  /* `viewAssistant` is "open the panel", so nothing ever closed it: it followed
     the owner onto every later screen with its trigger hidden by the shell. */
  ['the assistant panel closes when the route changes',
    js.includes('closeAssistantOnRouteChange') && js.includes('__ottoAssistant')],
  ['closing it is keyed to a route change, not to every render',
    js.includes('if (view === lastRouteView) return;')],
  ['the assistant route itself still opens the panel',
    js.includes("if (view === 'assistant') return;")],

  // ── the command palette's "Ask OTTO: <query>" result must actually work ──
  /* askOtto() called nav('assistant') then wrote into #chat-in and called
     askAssistant() — the entry points of the assistant UI this shell replaced.
     Once otto-assistant.js owned the panel, `#chat-in` no longer existed, so
     the panel opened empty and the typed question was silently dropped; the
     owner had to reopen Ask OTTO and retype it. Proven live: typing a question
     and pressing Enter now carries it into #otto-assistant-input and the panel
     shows a real result — a local search or, for an action-intent question the
     local patterns can't resolve, a real /api/nvidia proposal. */
  ["the command palette hands the question to the assistant's own API",
    js.includes('window.__ottoAssistant') && js.includes('assistant.submit(text)')],
  ['it does not target the retired chat-in element',
    (() => {
      const fn = /function askOtto\([\s\S]*?\n  \}/.exec(js)?.[0] || '';
      return !fn.includes('chat-in');
    })()],
  ["otto-assistant.js exposes submit so the shell can reach it",
    (() => {
      const assistantJs = fs.readFileSync(new URL('../otto-assistant.js', import.meta.url), 'utf8');
      return assistantJs.includes('open: openPanel, close: closePanel, search, currentContext, allowed: isAllowed, submit');
    })()],
];

let passed = 0;
let failed = 0;
for (const [name, ok] of checks) {
  if (ok) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}
console.log(`Owner shell checks: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
