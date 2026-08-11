// Server-side relay for OTTO cloud data. The browser never receives the
// Supabase service-role key. Authorization is enforced here, not in the UI.

import { requireCaller } from './_lib/serverAuth.js';

const COLLECTIONS = ['customers', 'jobs', 'calls', 'notes', 'photos', 'documents', 'estimates',
  'invoices', 'payments', 'checks', 'followups', 'workflows', 'sops', 'users', 'locations', 'folders',
  'emails', 'inbox_emails', 'payroll', 'time_off', 'login_history',
  'projects', 'job_events', 'job_checklists', 'ai_conversations', 'ai_escalations', 'consent_records',
  'contracts', 'proposals', 'plans', 'alerts', 'backups', 'daily_summaries', 'audit_log',
  'checklist_submissions', 'pto_requests', 'employee_messages',
  'rate_cards', 'estimate_projects', 'estimate_records', 'verification_logs', 'pricing_exceptions',
  'companyProfile'];

const FIELD_COLLECTIONS = new Set([
  'customers', 'jobs', 'notes', 'photos', 'documents', 'locations', 'job_events',
  'job_checklists', 'checklist_submissions', 'pto_requests', 'time_off',
  'employee_messages', 'consent_records', 'sops', 'alerts', 'plans'
]);

const JOB_SCOPED = new Set(['notes', 'photos', 'documents', 'job_checklists', 'checklist_submissions', 'plans']);

export default async function handler(req, res) {
  const caller = await requireCaller(req, res);
  if (!caller) return;
  return dataHandler(req, res, caller);
}

export async function dataHandler(req, res, caller = { role: 'owner', id: 'test-owner' }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
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
      const result = caller.role === 'field'
        ? await readFieldData(url, headers, caller)
        : await readEveryCollection(url, headers);
      res.status(200).json(result);
      return;
    }

    if (req.method === 'POST') {
      const payload = await parseBody(req);
      const result = caller.role === 'field'
        ? await saveFieldCollection(url, headers, payload, caller)
        : await saveOneCollection(url, headers, payload);
      res.status(result.status).json(result.body);
      return;
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    res.status(500).json({ error: 'proxy_error', detail: String(e && e.message || e).slice(0, 300) });
  }
}

async function readRows(url, headers, col) {
  const r = await fetch(`${url}/rest/v1/${encodeURIComponent(col)}?select=data`, { headers });
  if (!r.ok) return null;
  const rows = await r.json();
  return rows.map((row) => row.data).filter(Boolean);
}

async function readEveryCollection(url, headers) {
  const out = {};
  await Promise.all(COLLECTIONS.map(async (col) => {
    out[col] = await readRows(url, headers, col);
  }));
  return out;
}

function recordJobId(rec) {
  return rec && (rec.jobId || rec.job_id || rec.projectJobId || rec.sourceJobId);
}

function recordWorkerId(rec) {
  return rec && (rec.userId || rec.workerId || rec.employeeId || rec.assignedTo || rec.assignedUserId);
}

function fieldFilter(col, records, caller, jobIds, customerIds) {
  if (!Array.isArray(records)) return null;
  if (col === 'jobs') return records.filter((r) => r && r.assignedTo === caller.id);
  if (col === 'customers') return records.filter((r) => r && customerIds.has(r.id));
  if (col === 'job_events') return records.filter((r) => r && jobIds.has(recordJobId(r)) && recordWorkerId(r) === caller.id);
  if (JOB_SCOPED.has(col)) return records.filter((r) => r && jobIds.has(recordJobId(r)));
  if (col === 'locations' || col === 'pto_requests' || col === 'time_off' || col === 'consent_records') {
    return records.filter((r) => r && recordWorkerId(r) === caller.id);
  }
  if (col === 'employee_messages') {
    return records.filter((r) => r && [r.userId, r.workerId, r.employeeId, r.toUserId, r.fromUserId].includes(caller.id));
  }
  if (col === 'alerts') {
    return records.filter((r) => r && (jobIds.has(recordJobId(r)) || recordWorkerId(r) === caller.id));
  }
  if (col === 'sops') return records;
  return [];
}

async function readFieldData(url, headers, caller) {
  const jobs = (await readRows(url, headers, 'jobs')) || [];
  const ownJobs = jobs.filter((j) => j && j.assignedTo === caller.id);
  const jobIds = new Set(ownJobs.map((j) => j.id));
  const customerIds = new Set(ownJobs.map((j) => j.customerId).filter(Boolean));
  const out = { jobs: ownJobs };

  await Promise.all([...FIELD_COLLECTIONS].filter((c) => c !== 'jobs').map(async (col) => {
    const rows = await readRows(url, headers, col);
    out[col] = fieldFilter(col, rows, caller, jobIds, customerIds);
  }));

  // Deliberately absent: users directory, payroll, rates, invoices/payments,
  // audit/history, company settings, email inbox, estimates/accounting and
  // unrelated customer/job records.
  return out;
}

async function assignedJobIds(url, headers, caller) {
  const jobs = (await readRows(url, headers, 'jobs')) || [];
  return new Set(jobs.filter((j) => j && j.assignedTo === caller.id).map((j) => j.id));
}

async function saveFieldCollection(url, headers, payload, caller) {
  const { collection, records } = payload || {};
  if (!FIELD_COLLECTIONS.has(collection) || collection === 'customers' || collection === 'sops' || collection === 'alerts') {
    return { status: 403, body: { error: 'not_authorized' } };
  }

  const jobIds = await assignedJobIds(url, headers, caller);
  const list = (Array.isArray(records) ? records : [records]).filter(Boolean);
  let allowed = [];

  if (collection === 'jobs') {
    // A field worker may update an already-assigned job but cannot create jobs
    // or assign a job to themselves.
    allowed = list.filter((r) => r && jobIds.has(r.id) && r.assignedTo === caller.id);
  } else if (collection === 'job_events') {
    allowed = list.filter((r) => r && jobIds.has(recordJobId(r)) && recordWorkerId(r) === caller.id);
  } else if (JOB_SCOPED.has(collection)) {
    allowed = list.filter((r) => r && jobIds.has(recordJobId(r)));
  } else if (['locations', 'pto_requests', 'time_off', 'consent_records'].includes(collection)) {
    allowed = list.filter((r) => r && recordWorkerId(r) === caller.id);
  } else if (collection === 'employee_messages') {
    allowed = list.filter((r) => r && [r.userId, r.workerId, r.employeeId, r.fromUserId].includes(caller.id));
  }

  if (allowed.length !== list.length) return { status: 403, body: { error: 'not_authorized' } };
  return saveOneCollection(url, headers, { collection, records: allowed });
}

async function saveOneCollection(url, headers, { collection, records } = {}) {
  if (!COLLECTIONS.includes(collection)) return { status: 400, body: { error: 'unknown_collection' } };
  const list = Array.isArray(records) ? records : [records];
  const rows = list
    .filter((rec) => rec && rec.id)
    .map((rec) => ({ id: String(rec.id), data: rec, updated_at: new Date().toISOString() }));
  if (!rows.length) return { status: 200, body: { saved: 0 } };

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
