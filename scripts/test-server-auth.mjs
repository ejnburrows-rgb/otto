import { readFileSync, readdirSync } from 'node:fs';
import dataRoute, { dataHandler } from '../api/data.js';
import photoRoute, { photosHandler } from '../api/photos.js';
import notifyRoute from '../api/notify.js';
import nvidiaRoute from '../api/nvidia.js';
import { getCaller } from '../api/_lib/serverAuth.js';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}
function res() {
  const r = { statusCode: null, body: null, headers: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; return r; };
  r.send = (d) => { r.body = d; return r; };
  return r;
}
function req(overrides = {}) {
  return { method: 'GET', query: {}, headers: {}, body: null, on(ev, cb) { if (ev === 'end') cb(); return this; }, ...overrides };
}

const originalFetch = global.fetch;
const originalEnv = { ...process.env };
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-test';
process.env.OWNER_EMAILS = 'owner@example.com';
process.env.NVIDIA_API_KEY = 'nv-test';
process.env.TWILIO_SID = 'AC-test';
process.env.TWILIO_AUTH = 'auth-test';
process.env.TWILIO_FROM = '+15550000000';

async function run() {
  console.log('\nTesting OTTO provider auth and record-level authorization');

  // No bearer token: sensitive routes stop before any provider/data call.
  let upstream = 0;
  global.fetch = async () => { upstream++; throw new Error('should not be reached'); };
  for (const [name, handler, request] of [
    ['data', dataRoute, req()],
    ['photos', photoRoute, req({ query: { fileId: 'p1' } })],
    ['notify', notifyRoute, req({ method: 'POST', body: { channel: 'sms', to: '+1', body: 'x' } })],
    ['nvidia', nvidiaRoute, req({ method: 'POST', body: { messages: [] } })],
  ]) {
    const r = res(); upstream = 0;
    await handler(request, r);
    check(`${name}: anonymous is refused`, r.statusCode, 403);
    check(`${name}: anonymous never reaches provider`, upstream, 0);
  }

  // A bearer token is trusted only after Supabase validates it and our own
  // users table supplies the role.
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'auth-field-3', email: 'field-3@otto.local' }) };
    if (u.includes('/rest/v1/users?auth_uid=eq.')) return { ok: true, json: async () => [{ id: 'field-3', data: { name: 'Worker', role: 'field' } }] };
    throw new Error(`unexpected ${u}`);
  };
  const caller = await getCaller(req({ headers: { authorization: 'Bearer provider-token' } }));
  check('provider token resolves app user id', caller && caller.id, 'field-3');
  check('role comes from app user row', caller && caller.role, 'field');

  const rows = {
    jobs: [
      { id: 'j-own', assignedTo: 'field-3', customerId: 'c-own' },
      { id: 'j-other', assignedTo: 'field-1', customerId: 'c-other' },
    ],
    customers: [{ id: 'c-own', name: 'Own' }, { id: 'c-other', name: 'Other' }],
    photos: [{ id: 'p-own', fileId: 'p-own', jobId: 'j-own' }, { id: 'p-other', fileId: 'p-other', jobId: 'j-other' }],
    notes: [{ id: 'n-own', jobId: 'j-own' }, { id: 'n-other', jobId: 'j-other' }],
    documents: [], locations: [], job_events: [], job_checklists: [], checklist_submissions: [],
    pto_requests: [], time_off: [], employee_messages: [], consent_records: [], sops: [], alerts: [], plans: [],
  };
  global.fetch = async (url, init = {}) => {
    const u = String(url);
    const match = u.match(/\/rest\/v1\/([^?]+)/);
    if (match && (!init.method || init.method === 'GET')) {
      const col = decodeURIComponent(match[1]);
      return { ok: true, json: async () => (rows[col] || []).map((data) => ({ data })) };
    }
    if (match && init.method === 'POST') return { ok: true, text: async () => '' };
    throw new Error(`unexpected ${u}`);
  };

  let r = res();
  await dataHandler(req(), r, { id: 'field-3', role: 'field' });
  check('field gets only assigned job', r.body.jobs.map((j) => j.id), ['j-own']);
  check('field gets only customer for assigned job', r.body.customers.map((c) => c.id), ['c-own']);
  check('field gets only assigned-job photo metadata', r.body.photos.map((p) => p.id), ['p-own']);
  check('field never receives payroll', Object.prototype.hasOwnProperty.call(r.body, 'payroll'), false);
  check('field never receives user directory', Object.prototype.hasOwnProperty.call(r.body, 'users'), false);
  check('field never receives invoices', Object.prototype.hasOwnProperty.call(r.body, 'invoices'), false);

  r = res();
  await dataHandler(req({ method: 'POST', body: { collection: 'payroll', records: [{ id: 'x' }] } }), r, { id: 'field-3', role: 'field' });
  check('field cannot write payroll', r.statusCode, 403);

  r = res();
  await dataHandler(req({ method: 'POST', body: { collection: 'jobs', records: [{ id: 'j-other', assignedTo: 'field-3' }] } }), r, { id: 'field-3', role: 'field' });
  check('field cannot self-assign another job', r.statusCode, 403);

  // Photo file access is tied to the photo metadata's job and that job's assignment.
  r = res();
  await photosHandler(req({ method: 'GET', query: { fileId: 'p-other' } }), r, { id: 'field-3', role: 'field' });
  check('field cannot fetch another job photo', r.statusCode, 403);

  // Pin the old authentication incident out of the codebase.
  const apiDir = new URL('../api/', import.meta.url);
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
      if (entry.isDirectory()) walk(child);
      else if (entry.name.endsWith('.js')) {
        const src = readFileSync(child, 'utf8');
        if (/fallback_secret_for_dev|jsonwebtoken|jwt\.(sign|verify)|createHmac/.test(src)) offenders.push(entry.name);
      }
    }
  };
  walk(apiDir);
  check('no homemade JWT/fallback auth remains', offenders, []);
  const gate = readFileSync(new URL('_lib/serverAuth.js', apiDir), 'utf8');
  check('server verifies token with Supabase', gate.includes('/auth/v1/user'), true);
  check('server maps identity through auth_uid', gate.includes('auth_uid=eq.'), true);

  console.log(`\n${passed} passed, ${failed} failed\n`);
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  process.exit(1);
});
