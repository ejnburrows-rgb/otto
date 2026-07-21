import { fileURLToPath } from 'node:url';
// Proves the merge rules inside index.html behave identically to the tested
// module in scripts/sync-merge.mjs.
//
// index.html cannot import files (it is deliberately one self-contained file
// with no build step), so the merge rules exist in two places. This script pulls
// the functions back out of index.html and runs the exact same test suite
// against them. If someone changes one copy and not the other, this fails.
//
// Run with:  node scripts/test-inpage-merge.mjs

import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

/** Pull one whole function out of the page by matching its braces. */
function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`could not find function ${name}() in index.html`);
  let depth = 0;
  for (let i = html.indexOf('{', start); i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') { depth--; if (depth === 0) return html.slice(start, i + 1); }
  }
  throw new Error(`unbalanced braces reading ${name}() from index.html`);
}

const extracted = ['_recordTime', 'mergeRecords', 'mergeCollections'].map(extractFunction).join('\n');

const shimPath = new URL('./.inpage-merge.generated.mjs', import.meta.url);
const testPath = new URL('./.test-inpage.generated.mjs', import.meta.url);

writeFileSync(shimPath, `${extracted}
export { mergeRecords, mergeCollections };
export function isVisible(record) { return !(record && record.deleted === true); }
`);

const suite = readFileSync(new URL('./test-merge.mjs', import.meta.url), 'utf8')
  .replace('./sync-merge.mjs', './.inpage-merge.generated.mjs');
writeFileSync(testPath, suite);

console.log('Running the merge test suite against the copy inside index.html:\n');
try {
  const out = execFileSync(process.execPath, [fileURLToPath(testPath)], { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.log(e.stdout || '');
  console.error('\nThe copy of the merge rules in index.html does NOT match scripts/sync-merge.mjs.');
  console.error('Update whichever one is wrong so the two agree.');
  process.exitCode = 1;
} finally {
  try { unlinkSync(shimPath); unlinkSync(testPath); } catch (e) { /* already gone */ }
}
