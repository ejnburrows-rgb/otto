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

  // ── owner-requested three-window workspace ────────────────────────────────
  ['exactly three primary workspace windows are declared',
    ['panel-today', 'panel-field', 'panel-inbox'].every(id => runtime.includes(`id: '${id}'`)) && !runtime.includes("id: 'panel-tools'")],
  ['all three windows open by default',
    ['panel-today', 'panel-field', 'panel-inbox'].every(id => runtime.includes(`'${id}': 'normal'`))],
  ['window states include normal, minimize, maximize and full screen',
    runtime.includes("const WINDOW_STATES = ['normal', 'minimized', 'maximized', 'fullscreen']")],
  ['each window renders Windows-style controls',
    runtime.includes('class="otto-window-controls"') && runtime.includes("data-otto-state=\"minimized\"") && runtime.includes("'maximized'") && runtime.includes("'fullscreen'")],
  ['minimize removes the window from the stage but leaves its rail task',
    runtime.includes("if (state === 'minimized') return ''") && runtime.includes("class=\"otto-task${state === 'minimized' ? ' is-minimized' : ''}")],
  ['rail restores a minimized window',
    runtime.includes("action === 'restore-window'") && runtime.includes("setWindowState(id, 'normal', true)")],
  ['rail can bring another normal window forward while one is enlarged',
    runtime.includes("(anyWindowState('maximized') || anyWindowState('fullscreen')) && windowStates[id] === 'normal'") && runtime.includes("setWindowState(id, 'maximized', true)")],
  ['maximize occupies the workspace without deleting other window state',
    styles.includes('.otto-window-stage.has-maximized .otto-window:not([data-state="maximized"])') && styles.includes('.otto-window[data-state="maximized"]')],
  ['full screen really occupies the viewport and can be exited',
    styles.includes('.otto-window[data-state="fullscreen"]') && styles.includes('position: fixed') && runtime.includes("state === 'fullscreen' ? 'normal' : 'fullscreen'")],
  ['Tools is a launcher, not a fourth main window',
    runtime.includes('class="otto-tools-launch"') && runtime.includes('function openTools()') && !runtime.includes("'panel-tools':")],
  ['no drag or reorder interaction was reintroduced',
    !runtime.includes('draggable') && !runtime.includes('interact(') && !styles.includes('drag-handle')],

  // ── personal identity ─────────────────────────────────────────────────────
  ['Julio gets green interface accents',
    runtime.includes("session.id === 'owner-2') userTheme = 'julio'") && styles.includes('body[data-otto-user="julio"]') && styles.includes('--action: #15803d')],
  ['Saray gets pink interface accents',
    runtime.includes("session.id === 'ops-1') userTheme = 'saray'") && styles.includes('body[data-otto-user="saray"]') && styles.includes('--action: #be185d')],
  ['Otto keeps the blue base identity', runtime.includes("session.id === 'owner-1') userTheme = 'otto'")],
  ['Julio wallpaper mapping is preserved', runtime.includes("wallpaper.setAttribute('data-user', 'owner-2')") && styles.includes("julio-pablo.avif")],
  ['Saray wallpaper mapping is preserved', runtime.includes("wallpaper.setAttribute('data-user', 'ops-1')") && styles.includes("sarays.avif")],
  ['Saray artwork remains anchored away from left-side chrome', styles.includes('.wallpaper-container[data-user="ops-1"]') && styles.includes('background-position: right top')],

  // ── crew simplification ──────────────────────────────────────────────────
  ['crew hours are calculated from actual check-in/check-out events',
    runtime.includes("e.type === 'check_in' || e.type === 'check_out'") && runtime.includes('function workIntervals(workerId)') && runtime.includes('function sumHours(intervals, from, to)')],
  ['group hours show today, week and number clocked in',
    runtime.includes("words('Crew Hours', 'Horas del equipo')") && runtime.includes("words('Clocked in', 'Trabajando')") && runtime.includes('totalWeek')],
  ['worker summaries contain only current job, next job, hours and time off',
    runtime.includes("words('Current job', 'Trabajo actual')") && runtime.includes("words('Next job', 'Próximo trabajo')") && runtime.includes("words('Time off', 'Tiempo libre')")],
  ['random KPI/heatmap data is gone from the replacement runtime',
    !runtime.includes('Math.random') && !runtime.includes('Calendar Heatmap') && !runtime.includes('loginHistory') && !runtime.includes('locationsVisited')],
  ['old fake hours formula is not used', !runtime.includes('checkins.length * 2')],
  ['owner KPI route is repurposed as real Crew Hours', runtime.includes('viewKpis = function ()') && runtime.includes('crewHoursMarkup(false)')],
  ['worker profile route is simplified', runtime.includes('viewWorkerProfile = function ()') && runtime.includes('otto-worker-page')],

  // ── Plans & AutoCAD ──────────────────────────────────────────────────────
  ['Plans & AutoCAD has a dedicated hub', runtime.includes('function openPlansHub()') && runtime.includes("'Plans & AutoCAD'")],
  ['plan hub clearly distinguishes analyzable and storage-only formats', runtime.includes('PDF · DXF') && runtime.includes('DWG · DWF · DGN') && runtime.includes("'(storage)'")],
  ['plan upload uses the existing tested drawing pipeline', runtime.includes("uploadDoc(jobId, 'cad')")],
  ['recent plans are linked to their job folder', runtime.includes('function planDocuments()') && runtime.includes('jobTitle(doc.jobId)')],
  ['Plans & AutoCAD is visible directly on the left rail', runtime.includes('otto-plans-launch') && runtime.includes("words('Plans & AutoCAD', 'Planos y AutoCAD')")],
  ['Plans & AutoCAD is also the first prominent Tools action', runtime.includes('otto-tools-hero') && runtime.includes('data-otto-action="plans-hub"')],
  ['core CRM sections have visible direct navigation tabs', runtime.includes('function primaryNavMarkup()') && runtime.includes('class="otto-primary-nav"') && runtime.includes("label: words('Customers', 'Clientes')") && runtime.includes("label: words('Jobs', 'Trabajos')")],
  ['Plans hub always offers direct PDF and AutoCAD import', runtime.includes('data-otto-action="import-plan"') && runtime.includes("'Import PDF / AutoCAD'")],

  // ── simplified navigation/settings ───────────────────────────────────────
  ['daily Tools launcher keeps only core operational groups',
    ['jobs', 'customers', 'calls', 'followups', 'estimates', 'invoices', 'payments', 'payroll', 'team', 'urgent', 'reports', 'alerts', 'assistant', 'settings'].every(v => runtime.includes(`can('${v}')`))],
  ['secondary technical clutter is not promoted in Tools',
    !runtime.includes("nav('workflows')") && !runtime.includes("nav('knowledge')") && !runtime.includes("nav('map')") && !runtime.includes("nav('audit')")],
  ['admin Settings hides provider keys and setup stubs',
    runtime.includes('viewSettings = function ()') && !runtime.includes('Twilio From') && !runtime.includes('Google Client ID') && !runtime.includes('NVIDIA API Key')],
  ['admin Settings keeps essential appearance, team, owner security, data safety and sign out',
    runtime.includes("words('Appearance', 'Apariencia')") && runtime.includes("words('Team access', 'Acceso del equipo')") && runtime.includes("words('Owner security', 'Seguridad del dueño')") && runtime.includes("words('Data safety', 'Seguridad de datos')") && runtime.includes("action === 'sign-out'")],
  ['owner extra-code security remains available', runtime.includes('id="set-mfa"') && runtime.includes('onclick="saveMfa()"') && runtime.includes('onclick="clearMfa()"')],
  ['field Settings remains the existing worker workflow', runtime.includes("session.role === 'field') return legacyViewSettings()")],
  ['duplicate floating assistant is hidden for admin while Assistant remains in Tools', styles.includes('body.admin-workspace #ai-float-btn') && runtime.includes("can('assistant')")],

  // ── navigation, accessibility and responsive behavior ────────────────────
  ['owner/office legacy bottom navigation stays hidden', runtime.includes("classList.toggle('admin-nav-hidden', admin)") && styles.includes('.bottomnav.admin-nav-hidden')],
  ['secondary screens keep one Back to Home control', runtime.includes("id = 'otto-back-home'") && runtime.includes("words('Back to Home', 'Volver al inicio')")],
  ['desktop stage uses three columns', styles.includes('grid-template-columns: repeat(3, minmax(0, 1fr))')],
  ['small desktop/tablet keeps all windows visible in a two-column flow', styles.includes('@media (max-width: 1180px)') && styles.includes('grid-template-columns: repeat(2, minmax(0, 1fr))')],
  ['phone keeps the side task panel and a one-window column', styles.includes('@media (max-width: 760px)') && styles.includes('--otto-taskbar-w: 78px')],
  ['narrow phone layout exists', styles.includes('@media (max-width: 480px)')],
  ['short-screen layout exists', styles.includes('@media (max-height: 640px)')],
  ['every new control family has a visible focus treatment', styles.includes(':focus-visible') && styles.includes('outline: 3px solid var(--accent)')],
  ['reduced motion is respected', styles.includes('prefers-reduced-motion')],

  // ── existing product contracts preserved ─────────────────────────────────
  ['Ask OTTO still routes to the real assistant', runtime.includes('openPlumbBotModal = function ()') && runtime.includes("nav('assistant')")],
  ['attention window uses unified email data', runtime.includes("list('emails')") && !runtime.includes("list('inbox_emails')")],
  ['attention window still uses worker messages and PTO', runtime.includes("list('employee_messages')") && runtime.includes("list('pto_requests')")],
  ['public website is untouched', !runtime.includes('landing.html') && !styles.includes('landing.html')],
  ['top bar still uses the supplied OTTO Plumbing logo', patched.includes('<img src="./logo.jpg" alt="OTTO Plumbing Inc." class="crystal-logo"')],
  ['wrench-person icon is not restored as the CRM logo', !/<img[^>]*icon-192\.png[^>]*class="crystal-logo"/.test(patched)],

  // ── offline update ────────────────────────────────────────────────────────
  ['workspace assets use the new cache-busting version', HOME_ASSET_VERSION === '4' && patched.includes('otto-home.css?v=4') && patched.includes('otto-home.js?v=4')],
  ['offline cache is bumped for the new workspace', sw.includes("const CACHE = 'otto-crm-v12'")],
  ['both personal wallpapers remain precached', sw.includes('julio-pablo.avif') && sw.includes('sarays.avif')],
  ['cache-busted same-origin assets still resolve offline', sw.includes('ignoreSearch: sameOrigin')]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`OTTO home checks: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
