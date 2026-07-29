// Vercel serverless proxy for the Supabase database.
//
// WHY THIS EXISTS: the browser must never hold a key that can read the customer
// database. The old Firebase setup put such a key straight into index.html, so
// anyone who opened the site could copy it and read every customer record. This
// function fixes that: the secret key lives only in Vercel's environment
// variables (settings stored on the server, never in the code), exactly the way
// api/claude.js already handles the Anthropic key.
//
// The browser calls this function; this function talks to Supabase.
//
// Environment variables required (set in Vercel -> Settings -> Environment
// Variables, and in a local .env file for development):
//   SUPABASE_URL               - the project URL, e.g. https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  - the secret key. NEVER put this in the browser
//                                or in any file that gets committed to git.
//
// Requests:
//   GET  /api/data                  -> returns every collection as one object
//   POST /api/data { collection, records } -> saves records for one collection

const COLLECTIONS = ['customers', 'jobs', 'calls', 'notes', 'photos', 'documents', 'estimates',
  'invoices', 'payments', 'checks', 'followups', 'workflows', 'sops', 'users', 'locations', 'folders',
  'emails', 'inbox_emails', 'payroll', 'time_off', 'login_history',
  'projects', 'job_events', 'job_checklists', 'ai_conversations', 'ai_escalations', 'consent_records',
  'contracts', 'proposals', 'plans', 'alerts', 'backups', 'daily_summaries', 'audit_log',
  'checklist_submissions', 'pto_requests', 'employee_messages',
  'rate_cards', 'estimate_projects', 'estimate_records', 'verification_logs', 'pricing_exceptions',
  'companyProfile'];

export default async function handler(req, res) {
  return res.status(401).json({ error: 'server_auth_not_configured' });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    // Not configured yet. The app keeps working offline on the device, so this
    // is a soft failure, not a crash.
    res.status(503).json({ error: 'no_server_key' });
    return;
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json'
  };

  try {
    if (req.method === 'GET') {
      const result = await readEveryCollection(url, headers);
      res.status(200).json(result);
      return;
    }
    if (req.method === 'POST') {
      const { status, body } = await saveOneCollection(url, headers, await parseBody(req));
      res.status(status).json(body);
      return;
    }
    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    res.status(500).json({ error: 'proxy_error', detail: String(e && e.message || e).slice(0, 300) });
  }
}

// Downloads every collection. Asks for them all at once rather than one after
// another, so a slow connection in the field does not make sign-in crawl.
// A collection that fails comes back as null, which the app treats as "skip
// this one" rather than "this collection is empty" — important, because
// treating a failed read as empty would wipe good data off the device.
async function readEveryCollection(url, headers) {
  const out = {};
  await Promise.all(COLLECTIONS.map(async (col) => {
    const r = await fetch(`${url}/rest/v1/${encodeURIComponent(col)}?select=data`, { headers });
    if (!r.ok) {
      console.warn(`read failed for ${col}: HTTP ${r.status}`);
      out[col] = null;
      return;
    }
    const rows = await r.json();
    out[col] = rows.map((row) => row.data);
  }));
  return out;
}

// Saves the records of a single collection. Returns the status and body for
// the caller to send, rather than writing to the response itself, so the
// routing above stays easy to follow.
async function saveOneCollection(url, headers, { collection, records }) {
  if (!COLLECTIONS.includes(collection)) {
    return { status: 400, body: { error: 'unknown_collection' } };
  }
  const list = Array.isArray(records) ? records : [records];
  const rows = list
    .filter((rec) => rec && rec.id)
    .map((rec) => ({ id: String(rec.id), data: rec, updated_at: new Date().toISOString() }));
  if (!rows.length) return { status: 200, body: { saved: 0 } };

  // "resolution=merge-duplicates" means: insert new records, and update any
  // record whose id is already there, instead of failing.
  const r = await fetch(`${url}/rest/v1/${encodeURIComponent(collection)}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows)
  });
  if (!r.ok) {
    const text = await r.text();
    return { status: r.status, body: { error: 'save_failed', detail: text.slice(0, 300) } };
  }
  return { status: 200, body: { saved: rows.length } };
}

// Vercel usually parses JSON bodies for us, but not always — fall back to
// reading the raw request when it hasn't.
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
