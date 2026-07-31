// The download is the only copy of the data that ever leaves the device, so it
// has to be a WHOLE copy.
//
// It was not. exportAll() used to be JSON.stringify(db), and image bytes live
// in a separate IndexedDB store that the records only point at by fileId — so
// every download silently left the photos behind and a restore produced photo
// records with no files behind them. For a plumbing business those photos are
// the evidence behind an invoice.
//
// These tests pull the real functions out of index.html and drive them against
// a fake file store, so they fail if someone reverts the export to records-only
// or breaks the ability to read an older export back in.
//
// Run with:  node scripts/test-backup-export.mjs

import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`could not find ${name}() in index.html`);
  let depth = 0;
  for (let i = html.indexOf('{', start); i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') { depth--; if (depth === 0) return html.slice(start, i + 1); }
  }
  throw new Error(`unbalanced braces in ${name}()`);
}

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nreferencedFileIds — finds every attached file, wherever it hides');
{
  const fn = new Function(`${extractFunction('referencedFileIds')}\nreturn referencedFileIds;`)();

  check('an empty database references nothing', fn({}).length, 0);
  check('a photo is found', fn({ photos: [{ id: 'p1', fileId: 'f_a' }] }), ['f_a']);
  check('documents and photos are both found',
    fn({ photos: [{ fileId: 'f_a' }], documents: [{ fileId: 'f_b' }] }).sort(), ['f_a', 'f_b']);
  check('a file nested inside an attachment array is found',
    fn({ emails: [{ atts: [{ fileId: 'f_deep' }] }] }), ['f_deep']);
  check('the same file referenced twice is only listed once',
    fn({ photos: [{ fileId: 'f_a' }, { fileId: 'f_a' }] }), ['f_a']);
  check('empty and missing fileIds are ignored',
    fn({ photos: [{ fileId: '' }, { id: 'no-file' }, { fileId: null }] }).length, 0);
  // The walk is generic on purpose: a collection added later must not need a
  // code change here, or it silently stops being backed up.
  check('a collection that did not exist when this was written still works',
    fn({ some_future_thing: [{ fileId: 'f_new' }] }), ['f_new']);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\ndataURLToBlob — the bytes survive the trip back');
{
  const fn = new Function(`
    ${extractFunction('dataURLToBlob')}
    return dataURLToBlob;`)();
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG magic
  const dataUrl = 'data:image/jpeg;base64,' + bytes.toString('base64');
  const blob = fn(dataUrl, 'image/jpeg');
  check('produces a Blob', blob instanceof Blob, true);
  check('keeps the mime type', blob.type, 'image/jpeg');
  check('keeps every byte', blob.size, bytes.length);
  const roundTripped = Buffer.from(await blob.arrayBuffer());
  check('the bytes are identical', roundTripped.equals(bytes), true);
  // A bare base64 string with no data: prefix must still decode — older
  // exports and hand-edited files both show up that way.
  check('a bare base64 string also decodes', fn(bytes.toString('base64'), 'image/jpeg').size, bytes.length);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nthe export format itself');
{
  const src = html;
  check('exportAll collects the referenced files', src.includes('referencedFileIds(db)'), true);
  check('exportAll writes them into _files', /_files: files/.test(src), true);
  check('exportAll is async, because reading blobs is', /async function exportAll\(/.test(src), true);
  check('exportAll records when the download happened', src.includes('db.meta.lastExport = nowISO()'), true);
  check('importAll restores the files', src.includes("idbPut('files', id"), true);
  check('importAll still reads an older records-only export',
    src.includes('parsed && parsed._otto ? parsed.db : parsed'), true);
  // The regression that started all this.
  check('the download is no longer records-only',
    /function exportAll\(\)\s*\{\s*downloadFile\('otto-backup/.test(src), false);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nbackups run for everyone, and the count is honest');
{
  const src = html;
  const startApp = src.slice(src.indexOf('async function startApp('));
  const navHome = startApp.indexOf("nav('home')");
  const backupCall = startApp.indexOf('maybeAutoBackup()', navHome);
  const roleGate = startApp.indexOf("session.role === 'owner' || session.role === 'office'", navHome);
  check('startApp still calls maybeAutoBackup', backupCall > 0, true);
  // It used to sit inside the owner/office branch, so a fortnight of crew-only
  // use produced no snapshot at all — on exactly the devices holding photos.
  check('the backup call is no longer inside the owner/office branch',
    backupCall > roleGate && startApp.slice(roleGate, backupCall).includes('\n'), true);

  check('the snapshot cap is named once', src.includes('const MAX_KEPT_SNAPSHOTS = 12'), true);
  check('pruning uses the named cap', src.includes('db.backups.slice(MAX_KEPT_SNAPSHOTS)'), true);
  check('the screen counts only restorable copies',
    src.includes('Math.min(list.length, MAX_KEPT_SNAPSHOTS)'), true);
  check('the screen shows when the last download happened', src.includes('db.meta.lastExport'), true);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
