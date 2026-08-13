import fs from 'node:fs';
import { patchPhotoRetrySource, validatePhotoRetrySource } from './apply-photo-retry-patch.mjs';

const raw = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const patched = patchPhotoRetrySource(raw);

let passed = 0;
let failed = 0;
function check(name, actual, expected = true) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (ok) passed++; else failed++;
}

for (const [name, ok] of validatePhotoRetrySource(patched)) check(name, ok);
check('patch is idempotent', patchPhotoRetrySource(patched), patched);

function extractFunction(source, name) {
  const start = source.indexOf(`async function ${name}(`);
  if (start < 0) throw new Error(`could not find ${name}`);
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced ${name}`);
}

const retrySource = extractFunction(patched, '_bumpPhotoRetry');
const puts = [];
const deletes = [];
const toasts = [];
let saves = 0;
const db = { photos: [{ id: 'photo-1', fileId: 'f_1' }] };

const makeRetry = new Function(
  'idbPut', 'idbDel', 'db', 'nowISO', 'save', 'toast', 't',
  `const PHOTO_RETRY_WARN_AFTER = 20;\n${retrySource}\nreturn _bumpPhotoRetry;`
);

const retry = makeRetry(
  async (store, key, value) => { puts.push({ store, key, value }); },
  async (store, key) => { deletes.push({ store, key }); },
  db,
  () => '2026-08-10T12:00:00.000Z',
  () => { saves++; },
  (message, type) => { toasts.push({ message, type }); },
  (key) => key
);

await retry('f_1', { fileId: 'f_1', mime: 'image/jpeg', retries: 19, added: 1 });
check('20th failure stays in the persistent queue', puts.at(-1)?.store, 'photo_upload_queue');
check('20th failure increments retry count', puts.at(-1)?.value?.retries, 20);
check('20th failure records last attempt', puts.at(-1)?.value?.lastTry, '2026-08-10T12:00:00.000Z');
check('20th failure does not delete the queue entry', deletes.length, 0);
check('20th failure marks the photo pending', db.photos[0].uploadPending, true);
check('20th failure saves the visible pending state', saves, 1);
check('20th failure warns the user', toasts, [{ message: 'photoNotSentYet', type: 'error' }]);

await retry('f_1', { ...puts.at(-1).value });
check('21st failure remains queued', puts.at(-1)?.value?.retries, 21);
check('warning is not spammed after threshold', toasts.length, 1);
check('later failures still never delete the queue entry', deletes.length, 0);

console.log(`\nPhoto retry checks: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
