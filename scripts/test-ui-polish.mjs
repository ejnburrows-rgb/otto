import fs from 'node:fs';
import { patchIndex, patchServiceWorker, validate, UI_POLISH_VERSION } from './apply-ui-polish-patch.mjs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../otto-ui-polish.css', import.meta.url), 'utf8');
const finishCss = fs.readFileSync(new URL('../otto-client-visible-polish.css', import.meta.url), 'utf8');
const fieldPolicyCss = fs.readFileSync(new URL('../otto-field-policy-gate-fix.css', import.meta.url), 'utf8');
const julioOwnerCss = fs.readFileSync(new URL('../otto-julio-owner.css', import.meta.url), 'utf8');
const saraysOfficeCss = fs.readFileSync(new URL('../otto-sarays-office.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../otto-ui-polish.js', import.meta.url), 'utf8');
const patchedIndex = patchIndex(index);
const patchedSw = patchServiceWorker(sw);

const checks = [
  ...validate(patchedIndex, patchedSw),
  ['polish patch is idempotent', patchIndex(patchedIndex) === patchedIndex && patchServiceWorker(patchedSw) === patchedSw],
  ['polish assets share one version', UI_POLISH_VERSION === '5' && patchedIndex.includes('otto-ui-polish.css?v=5') && patchedIndex.includes('otto-client-visible-polish.css?v=5') && patchedIndex.includes('otto-field-policy-gate-fix.css?v=5') && patchedIndex.includes('otto-julio-owner.css?v=5') && patchedIndex.includes('otto-sarays-office.css?v=5') && patchedIndex.includes('otto-ui-polish.js?v=5')],
  ['Julio owner background uses supplied artwork only for Julio', julioOwnerCss.includes('body.otto-shell[data-otto-user="julio"] #main') && julioOwnerCss.includes("url('./design-assets/wallpapers/julio-pablo.avif')") && !julioOwnerCss.includes('data-otto-user="otto"') && !julioOwnerCss.includes('data-otto-user="saray"')],
  ['Sarays office background uses supplied artwork only for Sarays', saraysOfficeCss.includes('body.otto-shell[data-otto-user="saray"] #main') && saraysOfficeCss.includes("url('./design-assets/wallpapers/sarays.avif')") && !saraysOfficeCss.includes('data-otto-user="otto"') && !saraysOfficeCss.includes('data-otto-user="julio"')],
  ['field policy gate hides fixed worker chrome', fieldPolicyCss.includes('#app.policy-gate-active > .of-header') && fieldPolicyCss.includes('#app.policy-gate-active > .of-dock') && fieldPolicyCss.includes('display: none !important')],
  ['desktop touch targets are at least 40px', css.includes('body.admin-home .topbar .iconbtn') && css.includes('min-width: 40px') && css.includes('min-height: 40px')],
  ['window controls are at least 36px', css.includes('.otto-window-control') && css.includes('min-width: 36px') && css.includes('min-height: 36px')],
  ['Today receives restrained priority treatment', css.includes('#panel-today') && css.includes('inset 0 2px 0')],
  ['secondary screens share Hanken Grotesk headings', css.includes("body.otto-secondary .pagehead h1") && css.includes("font-family: 'Hanken Grotesk'")],
  ['secondary tabs wrap instead of hiding choices offscreen', css.includes('body.otto-secondary .tabs') && css.includes('flex-wrap: wrap') && css.includes('overflow: visible')],
  ['mobile workspace dock moves to bottom', css.includes('@media (max-width: 760px)') && css.includes('.otto-taskbar') && css.includes('top: auto') && css.includes('bottom: max(8px, env(safe-area-inset-bottom))')],
  ['mobile stage uses the full phone width', css.includes('left: max(8px, env(safe-area-inset-left))') && css.includes('right: max(8px, env(safe-area-inset-right))')],
  ['mobile action rows stack for thumb use', css.includes('body.otto-secondary .btnrow .btn') && css.includes('flex-basis: 100%')],
  ['motion is restrained and reduced-motion respected', css.includes('transform: none') && css.includes('prefers-reduced-motion: reduce')],
  ['client-visible layer strengthens workspace hierarchy', finishCss.includes('.otto-window-titlebar') && finishCss.includes('.otto-row + .otto-row') && finishCss.includes('body.otto-secondary .pagehead')],
  ['client-visible layer preserves mobile polish', finishCss.includes('@media (max-width: 760px)') && finishCss.includes('.otto-action') && finishCss.includes('min-height: 48px')],
  ['toasts are announced accessibly', js.includes("setAttribute('aria-live'") && js.includes("setAttribute('role'")],
  ['dialogs gain semantic dialog roles', js.includes("setAttribute('role', 'dialog')") && js.includes("setAttribute('aria-modal', 'true')")],
  ['dialog keyboard focus is trapped', js.includes('function trapDialogTab') && js.includes("event.key === 'Tab'")],
  ['Escape closes dialogs before changing window state', js.includes('closeTopDialog()') && js.includes("event.key !== 'Escape'")],
  ['Escape restores fullscreen and maximized windows', js.includes('data-state="fullscreen"') && js.includes('data-state="maximized"') && js.includes('window.setWindowState')],
  ['logo is keyboard and click navigable to Home', js.includes("querySelectorAll('.crystal-logo')") && js.includes("window.nav('home')")],
  ['rail state receives aria-pressed', js.includes("setAttribute('aria-pressed'")]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`UI polish checks: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
