// Private Supabase Storage relay for OTTO job photos.
import { requireCaller } from './_lib/serverAuth.js';

const BUCKET = 'job-photos';

export default async function handler(req, res) {
  const caller = await requireCaller(req, res, ['owner', 'office', 'field']);
  if (!caller) return;
  return photosHandler(req, res, caller);
}

async function readRows(url, headers, col) {
  const r = await fetch(`${url}/rest/v1/${encodeURIComponent(col)}?select=data`, { headers });
  if (!r.ok) return [];
  return (await r.json()).map((row) => row.data).filter(Boolean);
}

async function fieldCanAccessFile(url, headers, caller, fileId) {
  if (caller.role !== 'field') return true;
  const photos = await readRows(url, headers, 'photos');
  const photo = photos.find((p) => p && (p.fileId === fileId || p.id === fileId));
  if (!photo || !photo.jobId) return false;
  const jobs = await readRows(url, headers, 'jobs');
  return jobs.some((j) => j && j.id === photo.jobId && j.assignedTo === caller.id);
}

export async function photosHandler(req, res, caller = { role: 'owner', id: 'test-owner' }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { res.status(503).json({ error: 'no_server_key' }); return; }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  try {
    if (req.method === 'GET') {
      const fileId = req.query && req.query.fileId;
      if (!fileId) { res.status(400).json({ error: 'missing_fileId' }); return; }
      if (!(await fieldCanAccessFile(url, headers, caller, fileId))) {
        res.status(403).json({ error: 'not_authorized' }); return;
      }
      const r = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(fileId)}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 3600 }),
      });
      if (!r.ok) {
        const text = await r.text();
        res.status(r.status).json({ error: 'sign_failed', detail: text.slice(0, 200) }); return;
      }
      const data = await r.json();
      const signedURL = data.signedURL || data.signedUrl || (data.data && data.data.signedURL);
      res.status(200).json({ url: signedURL }); return;
    }

    if (req.method === 'POST') {
      let fileBuffer, fileId, mime;
      const ct = (req.headers && req.headers['content-type']) || '';
      if (ct.includes('multipart/form-data')) {
        fileBuffer = req.body && req.body.file;
        fileId = req.body && req.body.fileId;
        mime = (req.body && req.body.mime) || 'image/jpeg';
      } else {
        const parsed = await parseBody(req);
        fileId = parsed.fileId;
        mime = parsed.mime || 'image/jpeg';
        if (parsed.data) {
          const b64 = parsed.data.replace(/^data:[^;]+;base64,/, '');
          fileBuffer = Buffer.from(b64, 'base64');
        }
      }
      if (!fileId || !fileBuffer) { res.status(400).json({ error: 'missing_file_or_fileId' }); return; }
      if (!(await fieldCanAccessFile(url, headers, caller, fileId))) {
        // Metadata is synchronized through /api/data. Until the matching photo
        // record exists and points at an assigned job, a field upload stays in
        // the local retry queue rather than being accepted without ownership.
        res.status(403).json({ error: 'not_authorized' }); return;
      }
      const r = await fetch(`${url}/storage/v1/object/${BUCKET}/${encodeURIComponent(fileId)}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': mime, 'x-upsert': 'true' },
        body: fileBuffer,
      });
      if (!r.ok) {
        const text = await r.text();
        res.status(r.status).json({ error: 'upload_failed', detail: text.slice(0, 200) }); return;
      }
      res.status(200).json({ ok: true, path: fileId }); return;
    }

    if (req.method === 'DELETE') {
      const fileId = req.query && req.query.fileId;
      if (!fileId) { res.status(400).json({ error: 'missing_fileId' }); return; }
      if (!(await fieldCanAccessFile(url, headers, caller, fileId))) {
        res.status(403).json({ error: 'not_authorized' }); return;
      }
      const r = await fetch(`${url}/storage/v1/object/${BUCKET}`, {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: [fileId] }),
      });
      if (!r.ok) {
        const text = await r.text();
        res.status(r.status).json({ error: 'delete_failed', detail: text.slice(0, 200) }); return;
      }
      res.status(200).json({ ok: true }); return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    res.status(500).json({ error: 'proxy_error', detail: String(e && e.message || e).slice(0, 300) });
  }
}

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
