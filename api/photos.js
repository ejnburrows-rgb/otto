// Server-side relay for Supabase Storage photo files.
//
// WHY THIS EXISTS: photo files must not be stored in browser-local IndexedDB
// only — they become invisible to other devices and are permanently lost if the
// phone is wiped. Supabase Storage is the durable home. The bucket is private;
// the service-role key lives only here and in Vercel env vars, never in the
// browser. This follows the same pattern as api/data.js.
//
// Environment variables (same ones as api/data.js):
//   SUPABASE_URL               — https://huaehartegjbihyygqgb.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  — secret; never in the browser
//
// Routes:
//   GET    /api/photos?fileId=<id>  → { url: '<signed url, 1 hour>' }
//   POST   /api/photos              → JSON body { fileId, mime, data: '<base64 dataURL>' }
//                                     or multipart body with 'file' + 'fileId' fields
//                                  → { ok: true, path: '<storage path>' }
//   DELETE /api/photos?fileId=<id>  → { ok: true }

import { requireServerAuth } from './_lib/serverAuth.js';
import { STORAGE_BUCKET as BUCKET, MAX_FILE_BYTES, safeUpload, uploadStorageObject } from './_lib/storage.js';


// Provider-backed identity and job access are verified before Supabase Storage
// is reached. See api/_lib/serverAuth.js.
export default async function handler(req, res) {
  const identity = await requireServerAuth(req, res);
  if (!identity) return;
  const allowed = await authorizePhotoRequest(req, identity);
  if (!allowed) {
    res.status(403).json({ error: 'forbidden', message: 'This photo is not connected to an assigned job.' });
    return;
  }
  return photosHandler(req, res, identity);
}

// The relay logic remains separate so storage behavior stays fully testable.
export async function photosHandler(req, res, identity = { role: 'owner', userId: 'test-owner' }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Not configured yet — soft failure, matches api/data.js pattern.
    res.status(503).json({ error: 'no_server_key' });
    return;
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  try {
    // ── GET: return a signed URL for one file ──────────────────────────────
    if (req.method === 'GET') {
      const fileId = req.query && req.query.fileId;
      if (!fileId) { res.status(400).json({ error: 'missing_fileId' }); return; }
      const path = fileId;
      const r = await fetch(
        `${url}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(path)}`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ expiresIn: 3600 }),
        }
      );
      if (!r.ok) {
        const text = await r.text();
        res.status(r.status).json({ error: 'sign_failed', detail: text.slice(0, 200) });
        return;
      }
      const data = await r.json();
      // Supabase returns the signed URL under different keys depending on version.
      const signedURL = data.signedURL || data.signedUrl || (data.data && data.data.signedURL);
      res.status(200).json({ url: toAbsoluteStorageUrl(url, signedURL) });
      return;
    }

    // ── POST: upload a file ────────────────────────────────────────────────
    if (req.method === 'POST') {
      // Accept two body shapes:
      //   (a) multipart/form-data — Vercel parses this in production; req.body
      //       has { file: Buffer, fileId: string, mime: string }
      //   (b) application/json — { fileId, mime, data: '<base64 dataURL>' }
      //       used by the test harness and browsers that cannot send multipart
      let fileBuffer, fileId, mime;
      const ct = (req.headers && req.headers['content-type']) || '';

      if (ct.includes('multipart/form-data')) {
        fileBuffer = req.body && req.body.file;
        fileId     = req.body && req.body.fileId;
        mime       = (req.body && req.body.mime) || 'image/jpeg';
      } else {
        const parsed = await parseBody(req);
        fileId = parsed.fileId;
        mime   = parsed.mime || 'image/jpeg';
        if (parsed.data) {
          const b64 = parsed.data.replace(/^data:[^;]+;base64,/, '');
          fileBuffer = Buffer.from(b64, 'base64');
        }
      }

      if (!fileId || !fileBuffer) {
        res.status(400).json({ error: 'missing_file_or_fileId' });
        return;
      }

      if (!safeUpload(fileId, mime, fileBuffer.length)) {
        res.status(fileBuffer.length > MAX_FILE_BYTES ? 413 : 415).json({ error: 'unsafe_upload', message: 'Files must be an allowed type and no larger than 25 MB.' });
        return;
      }

      const path = fileId;
      await uploadStorageObject({ url, key, fileId: path, mime, buffer: fileBuffer });
      res.status(200).json({ ok: true, path });
      return;
    }

    // ── DELETE: remove a file ──────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const fileId = req.query && req.query.fileId;
      if (!fileId) { res.status(400).json({ error: 'missing_fileId' }); return; }
      const path = fileId;
      // Supabase Storage bulk delete endpoint accepts an array of paths.
      const r = await fetch(
        `${url}/storage/v1/object/${BUCKET}`,
        {
          method: 'DELETE',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prefixes: [path] }),
        }
      );
      if (!r.ok) {
        const text = await r.text();
        res.status(r.status).json({ error: 'delete_failed', detail: text.slice(0, 200) });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    if (e && e.code === 'upload_failed') {
      res.status(e.status || 502).json({ error: 'upload_failed', detail: String(e.message || '').slice(0, 300) });
      return;
    }
    if (e && e.code === 'unsafe_upload') {
      res.status(413).json({ error: 'unsafe_upload', detail: String(e.message || '').slice(0, 300) });
      return;
    }
    res.status(500).json({ error: 'proxy_error', detail: String(e && e.message || e).slice(0, 300) });
  }
}

async function authorizePhotoRequest(req, identity) {
  if (identity.role === 'owner' || identity.role === 'office') return true;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const fileId = (req.query && req.query.fileId) || (body && body.fileId);
  let jobId = body && body.jobId;
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  if (!jobId && fileId) {
    for (const collection of ['photos', 'documents']) {
      const response = await fetch(`${url}/rest/v1/${collection}?select=data`, { headers });
      if (!response.ok) continue;
      const rows = await response.json();
      const found = rows.map((row) => row.data).find((record) => record &&
        (record.fileId === fileId || (record.attachments || []).some((item) => item.fileId === fileId)));
      if (found) { jobId = found.jobId || found.associatedJobId; break; }
    }
  }
  if (!jobId) return false;
  const jobsResponse = await fetch(`${url}/rest/v1/jobs?id=eq.${encodeURIComponent(jobId)}&select=data`, { headers });
  if (!jobsResponse.ok) return false;
  const rows = await jobsResponse.json();
  const job = rows[0] && rows[0].data;
  const assigned = [job && job.assignedTo, job && job.workerId, job && job.employeeId]
    .concat((job && job.assignedWorkerIds) || [], (job && job.assignedToIds) || [])
    .filter(Boolean);
  return assigned.includes(identity.userId);
}

// Supabase's sign endpoint returns signedURL as a path relative to
// `${SUPABASE_URL}/storage/v1` — e.g. "/object/sign/job-photos/f_xyz?token=…" —
// not a fully-qualified URL. Handing that straight to the browser meant an
// <img src> or fetch resolved it against the app's own origin instead of
// Supabase, so every photo 404'd at
// otto-kohl.vercel.app/object/sign/job-photos/… while the real file sat on
// Supabase Storage the whole time. Already-absolute values (a future Supabase
// version, or a differently-shaped test double) are returned unchanged.
function toAbsoluteStorageUrl(supabaseUrl, signedURL) {
  if (!signedURL) return signedURL;
  if (/^https?:\/\//i.test(signedURL)) return signedURL;
  const path = signedURL.startsWith('/') ? signedURL : `/${signedURL}`;
  return `${supabaseUrl}/storage/v1${path}`;
}

// Vercel usually parses JSON bodies for us, but not always — fall back to
// reading the raw request when it hasn't (same helper as api/data.js).
async function parseBody(req) {
  if (req.body != null && typeof req.body !== 'string') return req.body;
  const raw = typeof req.body === 'string' ? req.body : await readRaw(req);
  return raw ? JSON.parse(raw) : {};
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
