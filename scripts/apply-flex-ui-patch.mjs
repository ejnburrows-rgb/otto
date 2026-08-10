import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
export const FLEX_ASSET_VERSION = '1';

const STYLE = `<link rel="stylesheet" href="./otto-flex-ui.css?v=${FLEX_ASSET_VERSION}" data-otto-flex-ui-styles />`;
const BRIDGE = `<script data-otto-flex-bridge>\nwindow.__ottoFlexBridge = {\n  getDb: () => db,\n  getSession: () => session,\n  getLang: () => lang,\n  getRoute: () => route,\n  add: (col, obj) => add(col, obj),\n  update: (col, id, patch) => update(col, id, patch),\n  save: () => save(),\n  render: () => render(),\n  nav: (view, id) => nav(view, id),\n  can: (view) => can(view)\n};\n</script>`;
const SCRIPT = `<script src="./otto-flex-ui.js?v=${FLEX_ASSET_VERSION}" data-otto-flex-ui-runtime></script>`;

export function patchFlexSource(source) {
  let out = source;
  out = out.replace(/\s*<link\b[^>]*\bdata-otto-flex-ui-styles\b[^>]*>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-flex-bridge\b[^>]*>[\s\S]*?<\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*\bdata-otto-flex-ui-runtime\b[^>]*><\/script>\s*/g, '\n');

  if (!out.includes('</head>')) throw new Error('index.html is missing </head>');
  if (!out.includes('</body>')) throw new Error('index.html is missing </body>');
  out = out.replace('</head>', `  ${STYLE}\n</head>`);
  out = out.replace('</body>', `  ${BRIDGE}\n  ${SCRIPT}\n</body>`);
  return out;
}

export function validateFlexSource(source) {
  return [
    ['flex stylesheet wired', source.includes('data-otto-flex-ui-styles') && source.includes(`otto-flex-ui.css?v=${FLEX_ASSET_VERSION}`)],
    ['flex runtime wired', source.includes('data-otto-flex-ui-runtime') && source.includes(`otto-flex-ui.js?v=${FLEX_ASSET_VERSION}`)],
    ['bridge wired before runtime', source.indexOf('data-otto-flex-bridge') > -1 && source.indexOf('data-otto-flex-bridge') < source.indexOf('data-otto-flex-ui-runtime')],
    ['bridge exposes existing db safely', source.includes('getDb: () => db')],
    ['bridge exposes existing attendance events', source.includes('add: (col, obj) => add(col, obj)')],
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
