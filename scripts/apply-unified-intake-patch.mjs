import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const RUNTIME = new URL('../otto-unified-intake.js', import.meta.url);
export const INTAKE_ASSET_VERSION = '3';
const SCRIPT = `<script src="./otto-unified-intake.js?v=${INTAKE_ASSET_VERSION}" data-otto-unified-intake></script>`;
const PLUS = `<script src="./otto-file-intake-plus.js?v=${INTAKE_ASSET_VERSION}" data-otto-file-intake-plus></script>`;
const REDIRECTS = `<script src="./otto-unified-intake-redirects.js?v=${INTAKE_ASSET_VERSION}" data-otto-unified-intake-redirects></script>`;
const BRIDGE = `<script data-otto-unified-intake-bridge>\nwindow.__ottoUnifiedIntakeBridge = {\n  getDb: () => db,\n  getSession: () => session,\n  getLang: () => lang,\n  add: (col, obj) => add(col, col === 'users' ? { ...obj, role: 'field' } : obj),\n  update: (col, id, patch) => update(col, id, col === 'users' ? { ...patch, role: 'field' } : patch),\n  save: () => save(),\n  render: () => render(),\n  storeFile: (file, mime) => storeFile(file, mime),\n  analyzeDrawing: id => analyzeDrawing(id)\n};\n</script>`;

const UNSAFE_USER_PRUNE = `const oldUsers = db.users.filter(u => !validIds.includes(u.id) || ['Owner', 'Office', 'Field Worker', 'Accounting', 'Employee Three', 'Employee Four', 'Employee Five'].includes(u.name));`;
const SAFE_USER_PRUNE = `const oldUsers = db.users.filter(u => retiredIds.includes(u.id) ||`;

export function patchUnifiedIntake(source) {
  let out = source;
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-unified-intake-bridge\b[^>]*>[\s\S]*?<\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-unified-intake\b[^>]*><\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-file-intake-plus\b[^>]*><\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-unified-intake-redirects\b[^>]*><\/script>\s*/g, '\n');
  if (out.includes(UNSAFE_USER_PRUNE)) out = out.replace(UNSAFE_USER_PRUNE, SAFE_USER_PRUNE);
  if (!out.includes('</body>')) throw new Error('index.html is missing </body>');
  out = out.replace('</body>', `  ${BRIDGE}\n  ${SCRIPT}\n  ${PLUS}\n  ${REDIRECTS}\n</body>`);
  return out;
}

export function patchUnifiedRuntime(source) {
  let out = source;
  const oldImage = `    if (file.type.startsWith('image/')) return runOCR(file, jobId);`;
  const newImage = `    if (file.type.startsWith('image/')) return window.ottoFileIntakePlus?.handleGeneric ? window.ottoFileIntakePlus.handleGeneric(file, jobId) : runOCR(file, jobId);`;
  if (out.includes(oldImage)) out = out.replace(oldImage, newImage);

  const oldPdf = `    $('[data-pdf-ocr]', root).addEventListener('click', () => runOCR(file, $('[data-pdf-job]', root).value));`;
  const newPdf = `    $('[data-pdf-ocr]', root).addEventListener('click', () => { const job = $('[data-pdf-job]', root).value; return window.ottoFileIntakePlus?.handleGeneric ? window.ottoFileIntakePlus.handleGeneric(file, job) : runOCR(file, job); });`;
  if (out.includes(oldPdf)) out = out.replace(oldPdf, newPdf);

  if (!out.includes(newImage) || !out.includes(newPdf)) throw new Error('broad OCR/document routing was not applied');
  return out;
}

export function validateUnifiedIntake(source, runtime = '') {
  return [
    ['unified intake bridge wired', source.includes('data-otto-unified-intake-bridge')],
    ['unified intake runtime wired', source.includes(`otto-unified-intake.js?v=${INTAKE_ASSET_VERSION}`)],
    ['broad file intake runtime wired', source.includes(`otto-file-intake-plus.js?v=${INTAKE_ASSET_VERSION}`)],
    ['legacy entry redirects wired', source.includes(`otto-unified-intake-redirects.js?v=${INTAKE_ASSET_VERSION}`)],
    ['bridge precedes unified runtime', source.indexOf('data-otto-unified-intake-bridge') > -1 && source.indexOf('data-otto-unified-intake-bridge') < source.indexOf('src="./otto-unified-intake.js')],
    ['unified runtime precedes broad file intake', source.indexOf('src="./otto-unified-intake.js') < source.indexOf('src="./otto-file-intake-plus.js')],
    ['broad file intake precedes redirects', source.indexOf('src="./otto-file-intake-plus.js') < source.indexOf('src="./otto-unified-intake-redirects.js')],
    ['employee imports forced to field worker', source.includes("col === 'users' ? { ...obj, role: 'field' } : obj") && source.includes("col === 'users' ? { ...patch, role: 'field' } : patch")],
    ['existing CAD analysis exposed instead of duplicated', source.includes('analyzeDrawing: id => analyzeDrawing(id)')],
    ['existing local file storage exposed instead of duplicated', source.includes('storeFile: (file, mime) => storeFile(file, mime)')],
    ['legitimate imported users survive reload cleanup', source.includes(SAFE_USER_PRUNE) && !source.includes(UNSAFE_USER_PRUNE)],
    ['images use searchable broad intake when available', !runtime || runtime.includes("window.ottoFileIntakePlus?.handleGeneric ? window.ottoFileIntakePlus.handleGeneric(file, jobId) : runOCR(file, jobId)")],
    ['PDF document route uses native text/OCR broad intake when available', !runtime || runtime.includes("window.ottoFileIntakePlus?.handleGeneric ? window.ottoFileIntakePlus.handleGeneric(file, job) : runOCR(file, job)")]
  ];
}

function run() {
  const indexPath = fileURLToPath(INDEX);
  const runtimePath = fileURLToPath(RUNTIME);
  const indexBefore = fs.readFileSync(indexPath, 'utf8');
  const runtimeBefore = fs.readFileSync(runtimePath, 'utf8');
  const indexAfter = patchUnifiedIntake(indexBefore);
  const runtimeAfter = patchUnifiedRuntime(runtimeBefore);
  const failed = validateUnifiedIntake(indexAfter, runtimeAfter).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`Unified intake patch failed: ${failed.map(([name]) => name).join(', ')}`);
  if (indexAfter !== indexBefore) fs.writeFileSync(indexPath, indexAfter);
  if (runtimeAfter !== runtimeBefore) fs.writeFileSync(runtimePath, runtimeAfter);
  const changed = indexAfter !== indexBefore || runtimeAfter !== runtimeBefore;
  console.log(`Unified intake patch: ${changed ? 'applied' : 'already applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();