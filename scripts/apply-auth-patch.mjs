import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const SW = new URL('../sw.js', import.meta.url);
export const AUTH_VERSION = '1';

export function patchIndex(source) {
  const tag = `<script src="./otto-auth.js?v=${AUTH_VERSION}" data-otto-auth-runtime></script>`;
  let out = source;
  if (out.includes('data-otto-auth-runtime')) {
    return out.replace(/<script\b[^>]*\bdata-otto-auth-runtime\b[^>]*><\/script>/, tag);
  }
  const marker = '<script>\n  "use strict";';
  if (!out.includes(marker)) throw new Error('OTTO application script marker missing');
  return out.replace(marker, `${tag}\n  ${marker}`);
}

export function patchServiceWorker(source) {
  let out = source;
  if (!out.includes("'./otto-auth.js'")) {
    const marker = "'./otto-home.css', './otto-home.js',";
    if (!out.includes(marker)) throw new Error('service worker shell marker missing');
    out = out.replace(marker, `${marker}\n  './otto-auth.js',`);
  }
  // Force installed phones to refresh the shell once this security layer lands.
  out = out.replace(/const CACHE = 'otto-crm-v\d+';/, "const CACHE = 'otto-crm-v13';");
  return out;
}

export function validate(index, sw) {
  return [
    ['auth runtime loads before inline OTTO app', index.indexOf('data-otto-auth-runtime') >= 0 && index.indexOf('data-otto-auth-runtime') < index.indexOf('"use strict";')],
    ['auth runtime cached offline', sw.includes("'./otto-auth.js'")],
    ['auth cache version bumped', sw.includes("const CACHE = 'otto-crm-v13';")],
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
  if (failed.length) throw new Error(`Auth patch validation failed: ${failed.map(([name]) => name).join(', ')}`);
  if (afterIndex !== beforeIndex) fs.writeFileSync(indexPath, afterIndex);
  if (afterSw !== beforeSw) fs.writeFileSync(swPath, afterSw);
  console.log(`Auth patch: index ${afterIndex === beforeIndex ? 'already applied' : 'applied'}; sw ${afterSw === beforeSw ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
