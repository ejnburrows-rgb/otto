// OTTO authoritative autosave endpoint.
// One authenticated request persists every changed collection to Supabase.
// Vercel is intentionally stateless; Supabase is the permanent source of truth.

import { requireServerAuth } from './_lib/serverAuth.js';
import { COLLECTIONS, authorizeWrite, saveOneCollection } from './data.js';

function bodyOf(req) {
  if (req.body != null && typeof req.body !== 'string') return Promise.resolve(req.body);
  if (typeof req.body === 'string') {
    try { return Promise.resolve(JSON.parse(req.body || '{}')); }
    catch (_) { return Promise.resolve({}); }
  }
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const identity = await requireServerAuth(req, res);
  if (!identity) return;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(503).json({ error: 'persistence_unavailable' });
    return;
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  try {
    const body = await bodyOf(req);
    const changes = body && typeof body.changes === 'object' && body.changes ? body.changes : {};
    const requested = Object.keys(changes).filter(name => COLLECTIONS.includes(name));
    if (!requested.length) {
      res.status(200).json({ saved: [], failed: [], confirmedAt: new Date().toISOString() });
      return;
    }

    const saved = [];
    const failed = [];

    // Sequential on purpose: authorization for field/customer accounts can read
    // current assignment/profile state. Keeping one deterministic order prevents
    // races while the whole client save still remains one HTTP request.
    for (const collection of requested) {
      const records = changes[collection];
      const allowed = await authorizeWrite(url, headers, identity, { collection, records });
      if (!allowed.ok) {
        failed.push({ collection, status: 403, error: 'forbidden', message: allowed.message });
        continue;
      }

      const result = await saveOneCollection(url, headers, { collection, records });
      if (result.status >= 200 && result.status < 300) {
        saved.push({ collection, count: Number(result.body && result.body.saved || 0) });
      } else {
        failed.push({ collection, status: result.status, ...(result.body || {}) });
      }
    }

    // A batch can contain an independently forbidden collection while other
    // changes are safely committed. Always return the exact per-collection truth;
    // the browser keeps failed changes pending and retries recoverable failures.
    res.status(200).json({ saved, failed, confirmedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'autosave_failed', detail: String(e && e.message || e).slice(0, 300) });
  }
}
