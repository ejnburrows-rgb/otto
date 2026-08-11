import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
export const FLEX_ASSET_VERSION = '1';

const STYLE = `<link rel="stylesheet" href="./otto-flex-ui.css?v=${FLEX_ASSET_VERSION}" data-otto-flex-ui-styles />`;
const COMPAT_STYLE = `<style data-otto-flex-compat>\n/* The flexible shell supplies real minimize + maximize. Hide the older one-off expand control only while this layer is active. */\n.otto-panel [data-otto-action="toggle-panel-size"] { display: none !important; }\n</style>`;
const BRIDGE = `<script data-otto-flex-bridge>\nwindow.__ottoFlexBridge = {\n  getDb: () => db,\n  getSession: () => session,\n  getLang: () => lang,\n  getRoute: () => route,\n  /* Bulk spreadsheet import is intentionally FIELD-WORKER ONLY. This bridge is used only by the additive importer. */\n  add: (col, obj) => add(col, col === 'users' ? { ...obj, role: 'field' } : obj),\n  update: (col, id, patch) => update(col, id, col === 'users' ? { ...patch, role: 'field' } : patch),\n  save: () => save(),\n  render: () => render(),\n  nav: (view, id) => nav(view, id),\n  can: (view) => can(view)\n};\n</script>`;
const SCRIPT = `<script src="./otto-flex-ui.js?v=${FLEX_ASSET_VERSION}" data-otto-flex-ui-runtime></script>`;
const TRANSLATION_SCRIPT = `<script src="./otto-flex-translation-fixes.js?v=${FLEX_ASSET_VERSION}" data-otto-flex-translation-runtime></script>`;
const OCR_SCRIPT = `<script src="./otto-flex-ocr-v2.js?v=${FLEX_ASSET_VERSION}" data-otto-flex-ocr-runtime></script>`;

/* The legacy boot cleanup used to delete every user whose id was not one of the
   original 19 seed ids. That is incompatible with real employee imports: add()
   correctly generates a new id, but the next reload would then delete that
   imported field worker. Keep the cleanup for the known old placeholder rows,
   but never prune a legitimate user merely because their id is new. */
const UNSAFE_USER_PRUNE = `const oldUsers = db.users.filter(u => !validIds.includes(u.id) || ['Owner', 'Office', 'Field Worker', 'Accounting', 'Employee Three', 'Employee Four', 'Employee Five'].includes(u.name));`;
const SAFE_USER_PRUNE = `const oldUsers = db.users.filter(u => ['Owner', 'Office', 'Field Worker', 'Accounting', 'Employee Three', 'Employee Four', 'Employee Five'].includes(u.name));`;

export function patchFlexSource(source) {
  let out = source;
  out = out.replace(/\s*<link\b[^>]*\bdata-otto-flex-ui-styles\b[^>]*>\s*/g, '\n');
  out = out.replace(/\s*<style\b[^>]*\bdata-otto-flex-compat\b[^>]*>[\s\S]*?<\/style>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-flex-bridge\b[^>]*>[\s\S]*?<\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-flex-ui-runtime\b[^>]*><\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-flex-translation-runtime\b[^>]*><\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-flex-ocr-runtime\b[^>]*><\/script>\s*/g, '\n');

  if (out.includes(UNSAFE_USER_PRUNE)) out = out.replace(UNSAFE_USER_PRUNE, SAFE_USER_PRUNE);

  if (!out.includes('</head>')) throw new Error('index.html is missing </head>');
  if (!out.includes('</body>')) throw new Error('index.html is missing </body>');
  out = out.replace('</head>', `  ${STYLE}\n  ${COMPAT_STYLE}\n</head>`);
  out = out.replace('</body>', `  ${BRIDGE}\n  ${SCRIPT}\n  ${TRANSLATION_SCRIPT}\n  ${OCR_SCRIPT}\n</body>`);
  return out;
}

export function validateFlexSource(source) {
  return [
    ['flex stylesheet wired', source.includes('data-otto-flex-ui-styles') && source.includes(`otto-flex-ui.css?v=${FLEX_ASSET_VERSION}`)],
    ['flex runtime wired', source.includes('data-otto-flex-ui-runtime') && source.includes(`otto-flex-ui.js?v=${FLEX_ASSET_VERSION}`)],
    ['hard-coded translation runtime wired', source.includes('data-otto-flex-translation-runtime') && source.includes(`otto-flex-translation-fixes.js?v=${FLEX_ASSET_VERSION}`)],
    ['supported OCR runtime wired', source.includes('data-otto-flex-ocr-runtime') && source.includes(`otto-flex-ocr-v2.js?v=${FLEX_ASSET_VERSION}`)],
    ['bridge wired before runtime', source.indexOf('data-otto-flex-bridge') > -1 && source.indexOf('data-otto-flex-bridge') < source.indexOf('data-otto-flex-ui-runtime')],
    ['translation cleanup runs after flex runtime', source.indexOf('data-otto-flex-translation-runtime') > source.indexOf('data-otto-flex-ui-runtime')],
    ['OCR v2 runs after the base flexible runtime', source.indexOf('data-otto-flex-ocr-runtime') > source.indexOf('data-otto-flex-ui-runtime')],
    ['bridge exposes existing db safely', source.includes('getDb: () => db')],
    ['spreadsheet user adds are forced to field role', source.includes("col === 'users' ? { ...obj, role: 'field' } : obj")],
    ['spreadsheet user updates are forced to field role', source.includes("col === 'users' ? { ...patch, role: 'field' } : patch")],
    ['imported users survive legacy startup cleanup', source.includes(SAFE_USER_PRUNE) && !source.includes(UNSAFE_USER_PRUNE)],
    ['legacy one-off expand control hidden when flex shell is active', source.includes('data-otto-flex-compat') && source.includes('data-otto-action="toggle-panel-size"')],
    ['bridge exposes existing attendance events', source.includes('add: (col, obj) => add(col')],
    ['bridge exposes current route and language', source.includes('getRoute: () => route') && source.includes('getLang: () => lang')]
  ];
}

function run() {
  const path = fileURLToPath(INDEX);
  const before = fs.readFileSync(path, 'utf8');
  const after = patchFlexSource(before);
  const failed = validateFlexSource(after).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`OTTO flex UI patch failed: ${failed.map(([name]) => name).join(', ')}`);
  if (before !== after) fs.writeFileSync(path, after);
  console.log(`OTTO flex UI patch: ${before === after ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
