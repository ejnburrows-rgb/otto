import fs from 'node:fs';
import { patchFlexSource, validateFlexSource, FLEX_ASSET_VERSION } from './apply-flex-ui-patch.mjs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../otto-flex-ui.js', import.meta.url), 'utf8');
const translation = fs.readFileSync(new URL('../otto-flex-translation-fixes.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../otto-flex-ui.css', import.meta.url), 'utf8');
const patched = patchFlexSource(index);

const checks = [
  ...validateFlexSource(patched),
  ['same flex asset version used by both core assets', patched.includes(`otto-flex-ui.css?v=${FLEX_ASSET_VERSION}`) && patched.includes(`otto-flex-ui.js?v=${FLEX_ASSET_VERSION}`)],

  ['company logo routes home', js.includes("logo.classList.add('otto-logo-home')") && js.includes('goHome();')],
  ['explicit home tabs exist', js.includes('PANEL_TABS') && js.includes('otto-flex-tabs')],
  ['full menu sidebar exists', js.includes('otto-flex-sidebar') && js.includes('MENU_GROUPS')],
  ['window minimize exists', js.includes("panelState==='minimized'") && css.includes('.otto-panel.is-minimized')],
  ['window maximize exists', js.includes("panelState==='maximized'") && css.includes('.otto-panel.is-maximized')],
  ['escape restores maximized window', js.includes("e.key==='Escape'") && js.includes("panelState==='maximized'")],

  ['wallpaper defaults to full composition fit', css.includes('--otto-wallpaper-size: contain')],
  ['wallpaper fit and fill controls exist', js.includes('data-wall-mode="fit"') && js.includes('data-wall-mode="fill"')],
  ['wallpaper zoom and pan exist', js.includes('data-wall-zoom') && js.includes('data-wall-pan')],

  ['Sarai pink window theme', css.includes('data-otto-user-theme="sarai"') && css.includes('#A93670')],
  ['Julio green window theme', css.includes('data-otto-user-theme="julio"') && css.includes('#236B42')],
  ['company logo is not recolored', css.includes('.crystal-logo { filter: none !important; }')],

  ['leftover translation sweep exists', js.includes('translateLeftovers') && js.includes('ES_EXACT')],
  ['team hard-coded headings translated', translation.includes("['OWNERS', 'DUEÑOS']") && translation.includes("['OPS & IT', 'OPERACIONES Y TI']") && translation.includes("['FIELD TEAM', 'EQUIPO DE CAMPO']")],
  ['dynamic field-team count translated', translation.includes('EQUIPO DE CAMPO (${m[1]})')],
  ['dynamic record counts translated', translation.includes("Number(m[1]) === 1 ? 'registro' : 'registros'")],
  ['new controls are bilingual', js.includes("'Minimize', 'Minimizar'") && js.includes("'Maximize', 'Maximizar'") && js.includes("'Attendance', 'Asistencia'")],

  ['employee import accepts Excel and CSV', js.includes("input.accept='.xlsx,.xls,.csv")],
  ['employee import reuses SheetJS', js.includes('xlsx.full.min.js')],
  ['employee rows map to real users', js.includes("b.add('users',fields)")],
  ['bulk import bridge forces every imported user to field role', patched.includes("col === 'users' ? { ...obj, role: 'field' } : obj") && patched.includes("col === 'users' ? { ...patch, role: 'field' } : patch")],
  ['duplicate employees update instead of blindly duplicating', js.includes('existingMatch') && js.includes("b.update('users',user.id,fields)")],
  ['PINs are never imported', js.includes('PINs are never imported')],
  ['field workers join existing attendance event store', js.includes("type:'attendance_roster'") && js.includes("b.add('job_events'")],
  ['attendance uses real check-in and check-out events', js.includes("e.type==='check_in'||e.type==='check_out'")],
  ['attendance does not fabricate a check-in on import', !js.includes("source:'employee_spreadsheet',type:'check_in'")],

  ['OCR tool exists', js.includes('openOCR') && js.includes('Document OCR')],
  ['OCR supports image and PDF', js.includes('accept="image/*,.pdf,application/pdf"') && js.includes('renderPdfPages')],
  ['OCR supports English and Spanish recognition', js.includes("T.recognize(sources[i],'eng+spa'")],
  ['OCR output can be copied and downloaded', js.includes('data-ocr-copy') && js.includes('data-ocr-download')]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
console.log(`OTTO flex UI checks: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
