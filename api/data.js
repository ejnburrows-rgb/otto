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

import { requireServerAuth } from './_lib/serverAuth.js';

const COLLECTIONS = ['customers', 'jobs', 'calls', 'notes', 'photos', 'documents', 'estimates',
  'invoices', 'payments', 'checks', 'followups', 'workflows', 'sops', 'users', 'locations', 'folders',
  'emails', 'inbox_emails', 'payroll', 'time_off', 'login_history',
  'projects', 'job_events', 'job_checklists', 'ai_conversations', 'ai_escalations', 'consent_records',
  'contracts', 'proposals', 'plans', 'alerts', 'backups', 'daily_summaries', 'audit_log',
  'checklist_submissions', 'pto_requests', 'employee_messages',
  'rate_cards', 'estimate_projects', 'estimate_records', 'verification_logs', 'pricing_exceptions',
  'companyProfile'];

const PROTECTED_ADMIN_IDS = new Set(['owner-1', 'owner-2', 'ops-1', 'it-admin-ejn']);
const FULL_ADMIN_ROLES = new Set(['owner', 'office']);

// Provider-backed identity is verified before any Supabase business data is
// read or written. See api/_lib/serverAuth.js.
export default async function handler(req, res) {
  const identity = await requireServerAuth(req, res);
  if (!identity) return;
  return dataHandler(req, res, identity);
}

// The real proxy logic, kept separate so it stays fully covered by tests even
// while the gate above refuses every live request.
export async function dataHandler(req, res, identity = { role: 'owner', userId: 'test-owner', profile: { id: 'test-owner', role: 'owner' } }) {
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
      if (req.query && (req.query.session === '1' || req.query.session === 1)) {
        res.status(200).json({ profile: identity.profile });
        return;
      }
      const result = await readEveryCollection(url, headers, identity);
      result._session = identity.profile;
      res.status(200).json(result);
      return;
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const allowed = await authorizeWrite(url, headers, identity, body);
      if (!allowed.ok) {
        res.status(403).json({ error: 'forbidden', message: allowed.message });
        return;
      }
      const { status, body: savedBody } = await saveOneCollection(url, headers, body);
      res.status(status).json(savedBody);
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
const FIELD_COLLECTIONS = new Set([
  'users', 'customers', 'jobs', 'notes', 'photos', 'documents', 'followups', 'locations',
  'job_events', 'job_checklists', 'consent_records', 'checklist_submissions', 'pto_requests',
  'time_off', 'employee_messages',
]);

function isAssignedJob(job, userId) {
  if (!job) return false;
  const assignments = [job.assignedTo, job.workerId, job.employeeId]
    .concat(job.assignedWorkerIds || [], job.assignedToIds || [])
    .filter(Boolean);
  return assignments.includes(userId);
}

function fieldRecordVisible(collection, record, context) {
  if (!record || record.deleted === true) return false;
  const { userId, jobIds, customerIds } = context;
  if (collection === 'users') return record.id === userId;
  if (collection === 'jobs') return jobIds.has(record.id);
  if (collection === 'customers') return customerIds.has(record.id);
  if (['locations', 'consent_records', 'pto_requests', 'time_off', 'employee_messages'].includes(collection)) {
    return [record.workerId, record.userId, record.employeeId, record.createdBy].filter(Boolean).includes(userId);
  }
  return jobIds.has(record.jobId) || jobIds.has(record.associatedJobId) ||
    [record.workerId, record.userId, record.employeeId, record.createdBy, record.assignedTo].filter(Boolean).includes(userId);
}

async function readRows(url, headers, collection) {
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(collection)}?select=data`, { headers });
  if (!response.ok) return null;
  const rows = await response.json();
  return rows.map((row) => row.data).filter(Boolean);
}

async function fieldContext(url, headers, identity) {
  const jobs = (await readRows(url, headers, 'jobs')) || [];
  const assignedJobs = jobs.filter((job) => isAssignedJob(job, identity.userId));
  return {
    userId: identity.userId,
    jobs: assignedJobs,
    jobIds: new Set(assignedJobs.map((job) => job.id)),
    customerIds: new Set(assignedJobs.map((job) => job.customerId).filter(Boolean)),
  };
}

async function readEveryCollection(url, headers, identity) {
  const out = {};
  const context = identity.role === 'field' ? await fieldContext(url, headers, identity) : null;
  await Promise.all(COLLECTIONS.map(async (col) => {
    if (context && !FIELD_COLLECTIONS.has(col)) {
      out[col] = null;
      return;
    }
    const rows = await readRows(url, headers, col);
    if (!rows) {
      out[col] = null;
      return;
    }
    out[col] = context ? rows.filter((record) => fieldRecordVisible(col, record, context)) : rows;
  }));
  return out;
}

async function authorizeWrite(url, headers, identity, body) {
  const collection = body && body.collection;
  // Full administrators can create, edit or soft-delete every business record.
  // User-account writes receive extra safeguards so the four administrators
  // cannot be accidentally removed or demoted.
  if (FULL_ADMIN_ROLES.has(identity.role)) {
    if (collection !== 'users') return { ok: true };
    const records = (Array.isArray(body.records) ? body.records : [body.records]).filter(Boolean);
    const existingUsers = await readRows(url, headers, 'users') || [];
    const existingById = new Map(existingUsers.map(user => [user.id, user]));
    for (const record of records) {
      const existing = existingById.get(record.id);
      if (PROTECTED_ADMIN_IDS.has(record.id)) {
        if (record.deleted === true || record.active === false || record.role !== 'owner') {
          return { ok: false, message: 'Protected administrator accounts must remain active owners.' };
        }
        continue;
      }
      if (!existing && record.role !== 'field') {
        return { ok: false, message: 'New Team records must be field workers.' };
      }
      if (record.deleted === true && (!existing || existing.role !== 'field')) {
        return { ok: false, message: 'Only field workers can be deleted.' };
      }
      if (existing && existing.role === 'field' && record.role !== 'field') {
        return { ok: false, message: 'Field-worker records cannot be promoted through the Team form.' };
      }
    }
    return { ok: true };
  }
  if (!FIELD_COLLECTIONS.has(collection) || collection === 'users' || collection === 'customers') {
    return { ok: false, message: 'Field accounts can only update their assigned work.' };
  }
  const records = (Array.isArray(body.records) ? body.records : [body.records]).filter(Boolean);
  const context = await fieldContext(url, headers, identity);
  for (const record of records) {
    if (collection === 'jobs') {
      const existing = context.jobs.find((job) => job.id === record.id);
      if (!existing || record.assignedTo !== existing.assignedTo || record.customerId !== existing.customerId) {
        return { ok: false, message: 'A field account cannot reassign a job or change its customer.' };
      }
      continue;
    }
    if (!fieldRecordVisible(collection, record, context)) {
      return { ok: false, message: 'This record is not connected to the signed-in employee or an assigned job.' };
    }
    if (collection === 'locations' && record.consentGranted !== true && record.permission !== 'granted') {
      return { ok: false, message: 'Location sharing requires employee consent.' };
    }
  }
  return { ok: true };
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
