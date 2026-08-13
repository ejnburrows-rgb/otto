import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
export const INTAKE_ASSET_VERSION = '2';
const SCRIPT = `<script src="./otto-unified-intake.js?v=${INTAKE_ASSET_VERSION}" data-otto-unified-intake></script>`;
const REDIRECTS = `<script src="./otto-unified-intake-redirects.js?v=${INTAKE_ASSET_VERSION}" data-otto-unified-intake-redirects></script>`;
const BRIDGE = `<script data-otto-unified-intake-bridge>\nwindow.__ottoUnifiedIntakeBridge = {\n  getDb: () => db,\n  getSession: () => session,\n  getLang: () => lang,\n  add: (col, obj) => add(col, col === 'users' ? { ...obj, role: 'field' } : obj),\n  update: (col, id, patch) => update(col, id, col === 'users' ? { ...patch, role: 'field' } : patch),\n  save: () => save(),\n  render: () => render(),\n  storeFile: file => storeFile(file),\n  analyzeDrawing: id => analyzeDrawing(id)\n};\n</script>`;

const UNSAFE_USER_PRUNE = `const oldUsers = db.users.filter(u => !validIds.includes(u.id) || ['Owner', 'Office', 'Field Worker', 'Accounting', 'Employee Three', 'Employee Four', 'Employee Five'].includes(u.name));`;
const SAFE_USER_PRUNE = `const oldUsers = db.users.filter(u => retiredIds.includes(u.id) ||`;

export function patchUnifiedIntake(source) {
  let out = source;
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-unified-intake-bridge\b[^>]*>[\s\S]*?<\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-unified-intake\b[^>]*><\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-unified-intake-redirects\b[^>]*><\/script>\s*/g, '\n');
  if (out.includes(UNSAFE_USER_PRUNE)) out = out.replace(UNSAFE_USER_PRUNE, SAFE_USER_PRUNE);
  if (!out.includes('</body>')) throw new Error('index.html is missing </body>');
  out = out.replace('</body>', `  ${BRIDGE}\n  ${SCRIPT}\n  ${REDIRECTS}\n</body>`);
  return out;
}

export function validateUnifiedIntake(source) {
  return [
    ['unified intake bridge wired', source.includes('data-otto-unified-intake-bridge')],
    ['unified intake runtime wired', source.includes(`otto-unified-intake.js?v=${INTAKE_ASSET_VERSION}`)],
    ['legacy entry redirects wired', source.includes(`otto-unified-intake-redirects.js?v=${INTAKE_ASSET_VERSION}`)],
    ['bridge precedes unified runtime', source.indexOf('data-otto-unified-intake-bridge') > -1 && source.indexOf('data-otto-unified-intake-bridge') < source.indexOf('src="./otto-unified-intake.js')],
    ['unified runtime precedes redirects', source.indexOf('src="./otto-unified-intake.js') < source.indexOf('src="./otto-unified-intake-redirects.js')],
    ['employee imports forced to field worker', source.includes("col === 'users' ? { ...obj, role: 'field' } : obj") && source.includes("col === 'users' ? { ...patch, role: 'field' } : patch")],
    ['existing CAD analysis exposed instead of duplicated', source.includes('analyzeDrawing: id => analyzeDrawing(id)')],
    ['existing local file storage exposed instead of duplicated', source.includes('storeFile: file => storeFile(file)')],
    ['legitimate imported users survive reload cleanup', source.includes(SAFE_USER_PRUNE) && !source.includes(UNSAFE_USER_PRUNE)]
  ];
}

function run() {
  const path = fileURLToPath(INDEX);
  const before = fs.readFileSync(path, 'utf8');
  const after = patchUnifiedIntake(before);
  const failed = validateUnifiedIntake(after).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`Unified intake patch failed: ${failed.map(([name]) => name).join(', ')}`);
  if (after !== before) fs.writeFileSync(path, after);
  console.log(`Unified intake patch: ${after === before ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
