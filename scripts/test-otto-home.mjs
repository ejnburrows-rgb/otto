import fs from 'node:fs';
import { patchSource, patchRuntime, validatePatchedSource, validatePatchedRuntime, HOME_ASSET_VERSION } from './apply-otto-home-patch.mjs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtimeSource = fs.readFileSync(new URL('../otto-home.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../otto-home.css', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const patched = patchSource(index);
const runtime = patchRuntime(runtimeSource);

const checks = [
  ...validatePatchedSource(patched),
  ...validatePatchedRuntime(runtime),

  // ── the permanent left rail ────────────────────────────────────────────────
  // The home is four always-rendered tabs plus at most one open panel. These
  // checks pin that model down; the assertions for drag handles, full screen,
  // maximize/restore and the duplicate minimize controls were removed with the
  // features themselves.
  ['four home sections are declared once', ['panel-today', 'panel-field', 'panel-inbox', 'panel-tools']
    .every(id => (runtime.match(new RegExp(`'${id}'`, 'g')) || []).length >= 1)],
  ['Today panel', runtime.includes("id: 'panel-today'")],
  ['Field Workers panel', runtime.includes("id: 'panel-field'")],
  ['Inbox panel', runtime.includes("id: 'panel-inbox'")],
  ['Tools panel', runtime.includes("id: 'panel-tools'")],
  ['one nullable active-panel variable holds the whole home state', runtime.includes('let activePanelId = null')],
  ['every rail tab is always rendered', runtime.includes('PANELS.map(p =>') && runtime.includes('class="otto-rail"')],
  ['opening a panel closes the others by rendering only one', runtime.includes('stage.innerHTML = activePanelId ? panelMarkup(activePanelId) : \'\'')],
  ['an unknown panel id can never be left active', runtime.includes('if (activePanelId && !PANEL_IDS.includes(activePanelId)) activePanelId = null')],
  ['the rail is a permanent fixed panel on the left', styles.includes('.otto-rail {') && styles.includes('position: fixed') && styles.includes('--otto-rail-w')],
  ['rail tabs report their state to assistive tech', runtime.includes("setAttribute('aria-expanded'") && runtime.includes("setAttribute('aria-current', 'true')")],

  // ── back controls, with no dead ends ───────────────────────────────────────
  ['an open panel renders a real labelled Back to panels button', runtime.includes("class=\"otto-back\" data-otto-action=\"close-panel\"") && runtime.includes("words('Back to panels', 'Volver a los paneles')")],
  ['Back to panels is a full-size button, not an icon or a hover target', styles.includes('.otto-back {') && styles.includes('min-height: 52px')],
  ['secondary screens get one Back to Home control', runtime.includes("id = 'otto-back-home'") && runtime.includes("words('Back to Home', 'Volver al inicio')")],
  ['Back to Home is pinned in the top bar, not a bottom dock', styles.includes('.otto-back-home {') && styles.includes('order: -1') && !styles.includes('.otto-utility-nav')],
  ['the bottom utility dock is gone', !runtime.includes('otto-utility-nav')],
  ['in-page back buttons name where they return to', patched.includes('function pageHead(title, sub, withBack, actions, backLabel)') && patched.includes("\"nav('jobs')\", '', t('jobs')")],
  ['the retired hub dashboard is no longer a back destination', !patched.includes("nav('hub')")],

  // ── expand / shrink, and Escape ────────────────────────────────────────────
  // The panel is capped at a little over half the screen while Tools alone
  // lists twenty-odd entries, so one expand control earns its place. It is the
  // only one: the rail is still the minimized state.
  ['the open panel carries exactly one expand control', (runtime.match(/data-otto-action="toggle-max"/g) || []).length === 1],
  ['the expand control is labelled in both languages', runtime.includes("words('Expand this list', 'Ampliar esta lista')") && runtime.includes("words('Shrink this list', 'Reducir esta lista')")],
  ['the expand control reports its state to assistive tech', runtime.includes('aria-pressed="${panelMaximized')],
  ['expanding is bounded by the viewport, never a floating window', styles.includes('body.otto-panel-max .otto-stage') && styles.includes('top: var(--otto-top)')],
  ['expanding cannot outgrow the space between the top bar and the bottom edge', styles.includes('.otto-panel.is-max') && styles.includes('height: 100%')],
  ['closing a panel drops any expanded state', runtime.includes('if (!activePanelId) panelMaximized = false;')],
  ['switching sections opens the next panel collapsed', /function openPanel[\s\S]{0,400}?panelMaximized = false;/.test(runtime)],
  ['Escape steps back one level: expanded shrinks, open closes', runtime.includes('if (panelMaximized) toggleMaximize();') && runtime.includes('else closePanel();')],
  ['Escape stands down while a record sheet is open', runtime.includes("if (document.getElementById('overlay')) return;")],
  ['Escape does not hijack a working screen full of text boxes', runtime.includes('!onHome() || !activePanelId) return;')],
  ['a toast still has somewhere to go when the panel is expanded', styles.includes('body.admin-home.otto-panel-open.otto-panel-max .toast')],

  // ── removed complexity ─────────────────────────────────────────────────────
  ['no panel state machine remains', !runtime.includes('setPanelState') && !runtime.includes("'fullscreen'")],
  ['no full-screen panel rule remains', !styles.includes('fullscreen')],
  ['no drag or reorder handles remain', !runtime.includes('draggable') && !styles.includes('drag-handle')],

  // ── the wallpaper stays the subject ────────────────────────────────────────
  ['Julio wallpaper runtime mapping', runtime.includes("session.id === 'owner-2'") && patched.includes('julio-pablo.avif')],
  ['Sarays wallpaper runtime mapping', runtime.includes("session.id === 'ops-1'") && patched.includes('sarays.avif')],
  ['Otto wallpaper is not invented', !runtime.includes("session.id === 'owner-1'")],
  ['Sarays Little Prince artwork is anchored top-right so it is never cropped away', styles.includes('.wallpaper-container[data-user="ops-1"]') && styles.includes('background-position: right top')],
  ['no panel covers the whole wallpaper', styles.includes('max-height: var(--otto-panel-h)')],
  ['home chrome is pinned left, away from the upper-right artwork', styles.includes('body.admin-home .topbar') && styles.includes('right: auto')],
  ['accounts with no supplied wallpaper still get a finished surface', styles.includes('background-color: var(--bg)')],

  // ── theming, mobile and accessibility ──────────────────────────────────────
  ['Light mode glass surface', styles.includes('body.theme-app') && styles.includes('--glass-bg: rgba(255, 255, 255')],
  ['Dark mode glass surface', styles.includes('[data-theme="dark"] body.theme-app')],
  ['mobile layout rule', styles.includes('@media (max-width: 700px)')],
  ['narrow phone layout rule', styles.includes('@media (max-width: 380px)')],
  ['short screen layout rule', styles.includes('@media (max-height: 640px)')],
  ['every control this file adds has a visible focus ring', styles.includes(':focus-visible') && styles.includes('outline: 3px solid var(--accent)')],
  ['reduced motion is respected', styles.includes('prefers-reduced-motion')],

  // ── real functionality is preserved ────────────────────────────────────────
  ['Ask OTTO routes to real assistant', runtime.includes('openPlumbBotModal = function ()') && runtime.includes("nav('assistant')")],
  ['attention center includes real email data', runtime.includes("list('inbox_emails')")],
  ['attention center includes worker messages', runtime.includes("list('employee_messages')") && runtime.includes("view: 'urgent'")],
  ['attention center includes pending PTO', runtime.includes("list('pto_requests')")],
  ['Tools lists every screen the role can actually open', ['estimates', 'invoices', 'payments', 'checks', 'payroll', 'jobs', 'customers', 'calls', 'followups', 'workflows', 'map', 'team', 'kpis', 'urgent', 'reports', 'alerts', 'knowledge', 'emails', 'audit', 'backups', 'assistant', 'settings']
    .every(v => runtime.includes(`['${v}', 'fa-`))],
  ['Tools hides what the signed-in role may not open', runtime.includes('g.views.filter(([v]) => can(v))')],
  ['owner navigation hides legacy bottom tabs', runtime.includes("classList.toggle('admin-nav-hidden', admin)") && styles.includes('.bottomnav.admin-nav-hidden')],
  ['the add button comes back on owner secondary screens', styles.includes('body.admin-workspace:not(.admin-home) .fab')],
  ['generic CSV export remains', patched.includes('function exportCSV(col)')],
  ['QuickBooks payment method removed', !patched.includes('<option>QuickBooks</option>')],
  ['fake operational status not emitted by new runtime', !runtime.includes('No delays reported today')],
  ['public landing page untouched by patch', !runtime.includes('landing.html') && !styles.includes('landing.html')],

  // ── company logo ───────────────────────────────────────────────────────────
  ['top bar shows the supplied crystal wordmark', patched.includes('<img src="./logo.jpg" alt="OTTO Plumbing Inc." class="crystal-logo"')],
  ['wrench-person icon is not restored', !/<img[^>]*icon-192\.png[^>]*class="crystal-logo"/.test(patched)],

  // ── offline shell ──────────────────────────────────────────────────────────
  ['home assets carry a cache-busting version', patched.includes(`otto-home.css?v=${HOME_ASSET_VERSION}`) && patched.includes(`otto-home.js?v=${HOME_ASSET_VERSION}`)],
  ['the offline cache was bumped for the new assets', Number(/const CACHE = 'otto-crm-v(\d+)'/.exec(sw)?.[1]) >= 12],
  ['a cache-busted app asset still resolves offline', sw.includes('ignoreSearch: sameOrigin')],
  ['payroll and document parsers are precached from the page, not a second URL list', sw.includes('runtimeScriptsIn') && !sw.includes('xlsx.full.min.js')]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`OTTO home checks: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
