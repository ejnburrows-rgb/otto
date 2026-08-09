import fs from 'node:fs';
import { patchSource, validatePatchedSource } from './build-otto-home.mjs';

const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('./otto-home.js', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('./otto-home.css', import.meta.url), 'utf8');
const patched = patchSource(index);

const checks = [
  ...validatePatchedSource(patched),
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
