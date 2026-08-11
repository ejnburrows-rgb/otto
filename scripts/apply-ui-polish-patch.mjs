import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const SW = new URL('../sw.js', import.meta.url);
export const UI_POLISH_VERSION = '2';

export function patchIndex(source) {
  let out = source;
  const style = `<link rel="stylesheet" href="./otto-ui-polish.css?v=${UI_POLISH_VERSION}" data-otto-ui-polish-styles />`;
  const finishStyle = `<link rel="stylesheet" href="./otto-client-visible-polish.css?v=${UI_POLISH_VERSION}" data-otto-client-visible-polish />`;
  const script = `<script src="./otto-ui-polish.js?v=${UI_POLISH_VERSION}" data-otto-ui-polish-runtime></script>`;

  if (out.includes('data-otto-ui-polish-styles')) {
    out = out.replace(/<link\b[^>]*\bdata-otto-ui-polish-styles\b[^>]*>/, style);
  } else {
    if (!out.includes('</head>')) throw new Error('index.html is missing </head>');
    out = out.replace('</head>', `  ${style}\n</head>`);
  }

  if (out.includes('data-otto-client-visible-polish')) {
    out = out.replace(/<link\b[^>]*\bdata-otto-client-visible-polish\b[^>]*>/, finishStyle);
  } else {
    if (!out.includes('</head>')) throw new Error('index.html is missing </head>');
    out = out.replace('</head>', `  ${finishStyle}\n</head>`);
  }

  if (out.includes('data-otto-ui-polish-runtime')) {
    out = out.replace(/<script\b[^>]*\bdata-otto-ui-polish-runtime\b[^>]*><\/script>/, script);
  } else {
    if (!out.includes('</body>')) throw new Error('index.html is missing </body>');
    out = out.replace('</body>', `  ${script}\n</body>`);
  }

  return out;
}

export function patchServiceWorker(source) {
  let out = source;
  if (!out.includes("'./otto-ui-polish.css'")) {
    const needle = "'./otto-home.css', './otto-home.js',";
    if (!out.includes(needle)) throw new Error('sw.js shell marker missing');
    out = out.replace(needle, `${needle}\n  './otto-ui-polish.css', './otto-ui-polish.js',`);
  }
  if (!out.includes("'./otto-client-visible-polish.css'")) {
    const needle = "'./otto-ui-polish.css', './otto-ui-polish.js',";
    if (!out.includes(needle)) throw new Error('ui polish shell marker missing');
    out = out.replace(needle, `${needle}\n  './otto-client-visible-polish.css',`);
  }
  return out;
}

export function validate(index, sw) {
  return [
    ['polish stylesheet wired', index.includes(`href="./otto-ui-polish.css?v=${UI_POLISH_VERSION}" data-otto-ui-polish-styles`)],
    ['client-visible stylesheet wired', index.includes(`href="./otto-client-visible-polish.css?v=${UI_POLISH_VERSION}" data-otto-client-visible-polish`)],
    ['polish runtime wired', index.includes(`src="./otto-ui-polish.js?v=${UI_POLISH_VERSION}" data-otto-ui-polish-runtime`)],
    ['polish CSS cached offline', sw.includes("'./otto-ui-polish.css'")],
    ['client-visible CSS cached offline', sw.includes("'./otto-client-visible-polish.css'")],
    ['polish JS cached offline', sw.includes("'./otto-ui-polish.js'")]
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
  if (failed.length) throw new Error(`UI polish patch validation failed: ${failed.map(([name]) => name).join(', ')}`);
  if (afterIndex !== beforeIndex) fs.writeFileSync(indexPath, afterIndex);
  if (afterSw !== beforeSw) fs.writeFileSync(swPath, afterSw);
  console.log(`UI polish patch: index ${afterIndex === beforeIndex ? 'already applied' : 'applied'}; sw ${afterSw === beforeSw ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
