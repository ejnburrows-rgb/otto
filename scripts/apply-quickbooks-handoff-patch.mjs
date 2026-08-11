import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const SW = new URL('../sw.js', import.meta.url);
export const QUICKBOOKS_HANDOFF_VERSION = '1';

export function patchIndex(source) {
  let out = source;
  const style = `<link rel="stylesheet" href="./otto-quickbooks-handoff.css?v=${QUICKBOOKS_HANDOFF_VERSION}" data-otto-quickbooks-handoff-styles />`;
  const script = `<script src="./otto-quickbooks-handoff.js?v=${QUICKBOOKS_HANDOFF_VERSION}" data-otto-quickbooks-handoff-runtime></script>`;

  if (out.includes('data-otto-quickbooks-handoff-styles')) {
    out = out.replace(/<link\b[^>]*\bdata-otto-quickbooks-handoff-styles\b[^>]*>/, style);
  } else {
    if (!out.includes('</head>')) throw new Error('index.html is missing </head>');
    out = out.replace('</head>', `  ${style}\n</head>`);
  }

  if (out.includes('data-otto-quickbooks-handoff-runtime')) {
    out = out.replace(/<script\b[^>]*\bdata-otto-quickbooks-handoff-runtime\b[^>]*><\/script>/, script);
  } else {
    if (!out.includes('</body>')) throw new Error('index.html is missing </body>');
    out = out.replace('</body>', `  ${script}\n</body>`);
  }

  return out;
}

export function patchServiceWorker(source) {
  let out = source;
  if (!out.includes("'./otto-quickbooks-handoff.css'")) {
    const polished = "'./otto-ui-polish.css', './otto-ui-polish.js',";
    const home = "'./otto-home.css', './otto-home.js',";
    const needle = out.includes(polished) ? polished : home;
    if (!out.includes(needle)) throw new Error('sw.js workspace asset cache marker missing');
    out = out.replace(needle, `${needle}\n  './otto-quickbooks-handoff.css', './otto-quickbooks-handoff.js',`);
  }
  return out;
}

export function validate(index, sw) {
  return [
    ['QuickBooks handoff stylesheet wired', index.includes(`href="./otto-quickbooks-handoff.css?v=${QUICKBOOKS_HANDOFF_VERSION}" data-otto-quickbooks-handoff-styles`)],
    ['QuickBooks handoff runtime wired', index.includes(`src="./otto-quickbooks-handoff.js?v=${QUICKBOOKS_HANDOFF_VERSION}" data-otto-quickbooks-handoff-runtime`)],
    ['QuickBooks handoff CSS cached offline', sw.includes("'./otto-quickbooks-handoff.css'")],
    ['QuickBooks handoff JS cached offline', sw.includes("'./otto-quickbooks-handoff.js'")]
  ];
}

function run() {
  const indexPath = fileURLToPath(INDEX);
  const swPath = fileURLToPath(SW);
  const beforeIndex = fs.readFileSync(indexPath, 'utf8');
  const beforeSw = fs.readFileSync(swPath, 'utf8');
  const afterIndex = patchIndex(beforeIndex);
  const afterSw = patchServiceWorker(beforeSw);
  const failed = validate(afterIndex, afterSw).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`QuickBooks handoff patch validation failed: ${failed.map(([name]) => name).join(', ')}`);
  if (afterIndex !== beforeIndex) fs.writeFileSync(indexPath, afterIndex);
  if (afterSw !== beforeSw) fs.writeFileSync(swPath, afterSw);
  console.log(`QuickBooks handoff patch: index ${afterIndex === beforeIndex ? 'already applied' : 'applied'}; sw ${afterSw === beforeSw ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
