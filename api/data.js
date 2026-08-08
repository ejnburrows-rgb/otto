// Vercel serverless proxy for the Supabase database.
import { hasServerAuth, denyUnauthenticated } from './_lib/serverAuth.js';

const COLLECTIONS = ['customers', 'jobs', 'calls', 'notes', 'photos', 'documents', 'estimates',
  'invoices', 'payments', 'checks', 'followups', 'workflows', 'sops', 'users', 'locations', 'folders',
  'emails', 'inbox_emails', 'payroll', 'time_off', 'login_history',
  'projects', 'job_events', 'job_checklists', 'ai_conversations', 'ai_escalations', 'consent_records',
  'contracts', 'proposals', 'plans', 'alerts', 'backups', 'daily_summaries', 'audit_log',
  'checklist_submissions', 'pto_requests', 'employee_messages',
  'rate_cards', 'estimate_projects', 'estimate_records', 'verification_logs', 'pricing_exceptions',
  'companyProfile'];

export default async function handler(req, res) {
  if (!(await hasServerAuth(req))) { denyUnauthenticated(res); return; }
  return dataHandler(req, res);
}

export async function dataHandler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { res.status(503).json({ error: 'no_server_key' }); return; }
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  try {
    if (req.method === 'GET') { res.status(200).json(await readEveryCollection(url, headers)); return; }
    if (req.method === 'POST') {
      const { status, body } = await saveOneCollection(url, headers, await parseBody(req));
      res.status(status).json(body); return;
    }
    res.status(405).json({ error: 'method_not_allowed' });
  } catch { res.status(500).json({ error: 'proxy_error' }); }
}

async function readEveryCollection(url, headers) {
  const out = {};
  await Promise.all(COLLECTIONS.map(async (col) => {
    const r = await fetch(`${url}/rest/v1/${encodeURIComponent(col)}?select=data`, { headers });
    if (!r.ok) { out[col] = null; return; }
    const rows = await r.json(); out[col] = rows.map((row) => row.data);
  }));
  return out;
}

async function saveOneCollection(url, headers, { collection, records }) {
  if (!COLLECTIONS.includes(collection)) return { status: 400, body: { error: 'unknown_collection' } };
  const list = Array.isArray(records) ? records : [records];
  const rows = list.filter((rec) => rec && rec.id).map((rec) => ({ id: String(rec.id), data: rec, updated_at: new Date().toISOString() }));
  if (!rows.length) return { status: 200, body: { saved: 0 } };
  const r = await fetch(`${url}/rest/v1/${encodeURIComponent(collection)}`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) });
  if (!r.ok) return { status: r.status, body: { error: 'save_failed' } };
  return { status: 200, body: { saved: rows.length } };
}

async function parseBody(req) {
  if (req.body != null && typeof req.body !== 'string') return req.body;
  const raw = typeof req.body === 'string' ? req.body : await readRaw(req);
  return raw ? JSON.parse(raw) : {};
}
function readRaw(req) { return new Promise((resolve, reject) => { let data = ''; req.on('data', (c) => { data += c; }); req.on('end', () => resolve(data)); req.on('error', reject); }); }
