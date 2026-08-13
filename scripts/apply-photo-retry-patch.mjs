import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT_INDEX = new URL('../index.html', import.meta.url);

const OLD_RETRY_BLOCK = `  async function _bumpPhotoRetry(fileId, entry) {
    // Give up after 20 attempts (~10 min). Leave the blob so it is still
    // visible locally; remove from queue to stop retrying.
    if (entry.retries >= 20) {
      await idbDel('photo_upload_queue', fileId);
    } else {
      await idbPut('photo_upload_queue', fileId, { ...entry, retries: entry.retries + 1 });
    }
  }`;

const NEW_RETRY_BLOCK = `  const PHOTO_RETRY_WARN_AFTER = 20;
  async function _bumpPhotoRetry(fileId, entry) {
    // A field photo is evidence behind the job. Never silently abandon it just
    // because the phone stayed offline or the server was unavailable for ten
    // minutes. Keep the queue entry until an upload actually succeeds.
    const retries = (entry.retries || 0) + 1;
    await idbPut('photo_upload_queue', fileId, { ...entry, retries, lastTry: nowISO() });

    // Warn once when this has been pending for a while, while making the state
    // visible on the photo record for office/owner UI and later diagnostics.
    if (retries === PHOTO_RETRY_WARN_AFTER) {
      const rec = (db.photos || []).find((p) => p.fileId === fileId);
      if (rec) {
        rec.uploadPending = true;
        rec.updated = nowISO();
        save();
      }
      toast(t('photoNotSentYet'), 'error');
    }
  }`;

const OLD_SUCCESS_BLOCK = `        if (r.ok) {
          await idbDel('photo_upload_queue', fileId);
        } else {`;

const NEW_SUCCESS_BLOCK = `        if (r.ok) {
          await idbDel('photo_upload_queue', fileId);
          const rec = (db.photos || []).find((p) => p.fileId === fileId);
          if (rec && rec.uploadPending) {
            delete rec.uploadPending;
            rec.updated = nowISO();
            save();
          }
        } else {`;

const EN_ANCHOR = `      showInLang: 'Show in this language', drawingHint: 'Upload a drawing or PDF and I will read it and draft a materials list.',`;
const EN_WITH_WARNING = `${EN_ANCHOR}\n      photoNotSentYet: 'A photo has not reached the office yet. It is safe on this phone and will keep trying.',`;

const ES_ANCHOR = `      showInLang: 'Mostrar en este idioma', drawingHint: 'Sube un plano o PDF y lo leeré para hacer una lista de materiales.',`;
const ES_WITH_WARNING = `${ES_ANCHOR}\n      photoNotSentYet: 'Una foto todavía no ha llegado a la oficina. Está segura en este teléfono y seguirá intentando enviarse.',`;

export function patchPhotoRetrySource(source) {
  let out = source;

  if (!out.includes("photoNotSentYet: 'A photo has not reached the office yet.")) {
    if (!out.includes(EN_ANCHOR)) throw new Error('English translation anchor not found');
    out = out.replace(EN_ANCHOR, EN_WITH_WARNING);
  }
  if (!out.includes("photoNotSentYet: 'Una foto todavía no ha llegado a la oficina.")) {
    if (!out.includes(ES_ANCHOR)) throw new Error('Spanish translation anchor not found');
    out = out.replace(ES_ANCHOR, ES_WITH_WARNING);
  }

  if (!out.includes('const PHOTO_RETRY_WARN_AFTER = 20;')) {
    if (!out.includes(OLD_RETRY_BLOCK)) throw new Error('legacy photo retry block not found');
    out = out.replace(OLD_RETRY_BLOCK, NEW_RETRY_BLOCK);
  }

  if (!out.includes('if (rec && rec.uploadPending)')) {
    if (!out.includes(OLD_SUCCESS_BLOCK)) throw new Error('photo upload success block not found');
    out = out.replace(OLD_SUCCESS_BLOCK, NEW_SUCCESS_BLOCK);
  }

  return out;
}

export function validatePhotoRetrySource(source) {
  const fnStart = source.indexOf('async function _bumpPhotoRetry(fileId, entry)');
  const fnEnd = source.indexOf('\n  }', fnStart);
  const retryFn = fnStart >= 0 && fnEnd > fnStart ? source.slice(fnStart, fnEnd + 4) : '';

  return [
    ['photo retry function still exists', !!retryFn],
    ['retry queue is never deleted from the failure handler', !retryFn.includes("idbDel('photo_upload_queue'" )],
    ['failed photo keeps receiving retry attempts', retryFn.includes("idbPut('photo_upload_queue'") && retryFn.includes('retries = (entry.retries || 0) + 1')],
    ['pending retry records last attempt time', retryFn.includes('lastTry: nowISO()')],
    ['long-pending photo is marked visibly pending', retryFn.includes('rec.uploadPending = true')],
    ['long-pending photo warns the user once at threshold', retryFn.includes('retries === PHOTO_RETRY_WARN_AFTER') && retryFn.includes("toast(t('photoNotSentYet'), 'error')")],
    ['successful upload is the only path that clears the retry queue entry', /if \(r\.ok\) \{\r?\n\s+await idbDel\('photo_upload_queue', fileId\);/.test(source)],
    ['successful upload clears the visible pending marker', source.includes('if (rec && rec.uploadPending)') && source.includes('delete rec.uploadPending')],
    ['English pending-photo message exists', source.includes("photoNotSentYet: 'A photo has not reached the office yet. It is safe on this phone and will keep trying.'")],
    ['Spanish pending-photo message exists', source.includes("photoNotSentYet: 'Una foto todavía no ha llegado a la oficina. Está segura en este teléfono y seguirá intentando enviarse.'")],
    ['legacy give-up behavior is gone', !source.includes('Give up after 20 attempts')]
  ];
}

function run() {
  const indexPath = fileURLToPath(ROOT_INDEX);
  const before = fs.readFileSync(indexPath, 'utf8');
  const after = patchPhotoRetrySource(before);
  const failed = validatePhotoRetrySource(after).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`photo retry patch validation failed: ${failed.map(([name]) => name).join(', ')}`);
  if (after !== before) fs.writeFileSync(indexPath, after);
  console.log(`Photo retry patch: ${after === before ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
