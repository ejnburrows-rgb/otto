import fs from 'node:fs';
import { patchSource, patchRuntime, validatePatchedSource, validatePatchedRuntime } from './apply-otto-home-patch.mjs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const runtimeSource = fs.readFileSync(new URL('../otto-home.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../otto-home.css', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const patched = patchSource(index);
const runtime = patchRuntime(runtimeSource);

const checks = [
  ...validatePatchedSource(patched),
  ...validatePatchedRuntime(runtime),
  ['four named panel states', ['collapsed', 'compact', 'expanded', 'fullscreen'].every(s => runtime.includes(`'${s}'`))],
  ['Today panel', runtime.includes("'panel-today'")],
  ['Field Workers panel', runtime.includes("'panel-field'")],
  ['Inbox panel', runtime.includes("'panel-inbox'")],
  ['Tools panel', runtime.includes("'panel-tools'")],
  ['Julio wallpaper runtime mapping', runtime.includes("session.id === 'owner-2'") && patched.includes('julio-pablo.avif')],
  ['Sarays wallpaper runtime mapping', runtime.includes("session.id === 'ops-1'") && patched.includes('sarays.avif')],
  ['Otto wallpaper is not invented', !runtime.includes("session.id === 'owner-1'")],
  ['Light mode glass surface', styles.includes('body.theme-app') && styles.includes('--glass-bg: rgba(255, 255, 255')],
  ['Dark mode glass surface', styles.includes('[data-theme="dark"] body.theme-app')],
  ['mobile layout rule', styles.includes('@media (max-width: 700px)')],
  ['fullscreen panel rule', styles.includes('.home-panel[data-state="fullscreen"]')],
  ['Ask OTTO routes to real assistant', runtime.includes("openPlumbBotModal = function ()") && runtime.includes("nav('assistant')")],
  ['attention center includes real email data', runtime.includes('db.inbox_emails')],
  ['attention center includes worker messages', runtime.includes('db.employee_messages') && runtime.includes("nav('urgent')")],
  ['attention center includes pending PTO', runtime.includes('db.pto_requests') && runtime.includes("nav('kpis')")],
  ['owner navigation hides legacy bottom tabs', runtime.includes("classList.toggle('admin-nav-hidden', admin)") && styles.includes('.bottomnav.admin-nav-hidden')],
  ['owner navigation provides Home and Tools dock', runtime.includes("id = 'otto-utility-nav'") && styles.includes('.otto-utility-nav')],
  ['payroll Excel parser cached for offline use', sw.includes('xlsx.full.min.js') && sw.includes("const CACHE = 'otto-crm-v9'")],
  ['generic CSV export remains', patched.includes('function exportCSV(col)')],
  ['QuickBooks payment method removed', !patched.includes('<option>QuickBooks</option>')],
  ['fake operational status not emitted by new runtime', !runtime.includes('No delays reported today')],
  ['public landing page untouched by patch', !runtime.includes('landing.html') && !styles.includes('landing.html')]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`OTTO home checks: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
