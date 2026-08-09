// Regression tests for the sign-in gate (api/_lib/serverAuth.js).
//
// This file used to prove the gate refused EVERY request, because there was no
// sign-in system and the routes were bolted shut. Real sign-in exists now, so
// what has to be proven changed. What must still hold:
//
//   · no token, a forged token, an expired one, or one from another project
//     -> 403, before any call to Supabase/Anthropic/NVIDIA/Twilio/SendGrid,
//     and with no customer data, signed URL, provider reply or message
//     preview in the response;
//   · a valid token from somebody who is in our users table -> allowed;
//   · role is enforced on the server, not just hidden in the app's navigation;
//   · the gate still signs nothing, verifies nothing itself, and has no
//     development bypass — the three things that caused the 2026-07-31 bypass.
//
// Run with: node scripts/test-server-auth.mjs

import dataHandler from '../api/data.js';
import photosHandler from '../api/photos.js';
import claudeHandler from '../api/claude.js';
import nvidiaHandler from '../api/nvidia.js';
import notifyHandler from '../api/notify.js';
import quickbooksHandler from '../api/quickbooks.js';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

function createRes() {
  const r = { statusCode: null, body: null, headers: {} };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (d) => { r.body = d; return r; };
  r.setHeader = () => r;
  r.send = (d) => { r.body = d; return r; };
  return r;
}

function noopReq(overrides = {}) {
  return {
    method: 'GET',
    query: {},
    headers: {},
    body: null,
    on(ev, cb) { if (ev === 'end') cb(); return this; },
    ...overrides,
  };
}

const originalEnv = { ...process.env };
let calledUpstream = false;
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  calledUpstream = true;
  throw new Error('test setup error: the gate should have refused this request before any network call');
};

async function runTests() {
  console.log('\nTesting the fail-closed containment gate (api/_lib/serverAuth.js)');

  // Fully "configured" environment — proves the gate refuses regardless of
  // whether the underlying provider keys are present.
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sk-test';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  process.env.NVIDIA_API_KEY = 'nvapi-test';
  process.env.TWILIO_SID = 'AC-test';
  process.env.TWILIO_AUTH = 'auth-test';
  process.env.TWILIO_FROM = '+15550000000';
  process.env.SENDGRID_API_KEY = 'SG-test';
  process.env.QB_CLIENT_ID = 'qb-id';
  process.env.QB_CLIENT_SECRET = 'qb-secret';
  process.env.QB_REFRESH_TOKEN = 'qb-refresh';

  const cases = [
    ['GET /api/data (read customer data)', dataHandler, noopReq({ method: 'GET' })],
    ['POST /api/data (write customer data)', dataHandler, noopReq({ method: 'POST', body: { collection: 'customers', records: [{ id: '1' }] } })],
    ['GET /api/photos (signed photo link)', photosHandler, noopReq({ method: 'GET', query: { fileId: 'f_1' } })],
    ['POST /api/photos (upload photo)', photosHandler, noopReq({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ fileId: 'f_1', data: 'data:image/jpeg;base64,AA==' }) })],
    ['DELETE /api/photos (delete photo)', photosHandler, noopReq({ method: 'DELETE', query: { fileId: 'f_1' } })],
    ['POST /api/claude (AI proxy)', claudeHandler, noopReq({ method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }] } })],
    ['POST /api/nvidia (AI proxy)', nvidiaHandler, noopReq({ method: 'POST', body: { messages: [{ role: 'user', content: 'hi' }] } })],
    ['POST /api/notify (send SMS)', notifyHandler, noopReq({ method: 'POST', body: { channel: 'sms', to: '+15551234567', body: 'secret job details' } })],
    ['POST /api/notify (send email)', notifyHandler, noopReq({ method: 'POST', body: { channel: 'email', to: 'customer@example.com', subject: 'Invoice', body: 'secret invoice content' } })],
    ['POST /api/quickbooks (sync action)', quickbooksHandler, noopReq({ method: 'POST', body: { action: 'sync', records: [{ id: 1 }] } })],
  ];

  for (const [name, handler, req] of cases) {
    calledUpstream = false;
    const res = createRes();
    await handler(req, res);
    check(`${name} returns 403`, res.statusCode, 403);
    check(`${name} returns not_authorized`, res.body && res.body.error, 'not_authorized');
    check(`${name} reveals no customer/provider data`, JSON.stringify(res.body).toLowerCase().includes('secret'), false);
    check(`${name} never calls the upstream provider`, calledUpstream, false);
  }

  // The routes that are NOT gated (non-sensitive QuickBooks status/auth_url)
  // must still work normally — proves the gate is scoped, not a global outage.
  {
    const res = createRes();
    await quickbooksHandler(noopReq({ method: 'GET', query: { action: 'status' } }), res);
    check('GET /api/quickbooks?action=status is not gated', res.statusCode, 200);
  }

  /* ── 2026-07-31 incident: the gate was replaced with hand-rolled JWT
     verification whose secret fell back to a literal string published in this
     repository, alongside an api/login.js that minted an owner session for
     anyone who asked. These checks exist so that cannot return quietly. ── */
  {
    const { readFileSync, readdirSync } = await import('node:fs');
    const apiDir = new URL('../api/', import.meta.url);

    // A token forged with the old fallback secret must be refused. Built by
    // hand so the test needs no JWT library and cannot be fooled by one.
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const forged = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ userId: 'owner-1', role: 'owner', exp: 9999999999 })}.forged`;
    for (const header of [`Bearer ${forged}`, 'Bearer ', forged, 'Basic abc']) {
      const res = createRes();
      await dataHandler(noopReq({ method: 'GET', headers: { authorization: header } }), res);
      check(`a request bearing "${header.slice(0, 18)}…" is still refused`, res.statusCode, 403);
    }

    // The literal must not exist anywhere under api/, in any form.
    const offenders = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
        if (entry.isDirectory()) walk(child);
        else if (entry.name.endsWith('.js')) {
          const src = readFileSync(child, 'utf8');
          if (src.includes('fallback_secret_for_dev')) offenders.push(entry.name);
        }
      }
    };
    walk(apiDir);
    check('no api/ file contains the published fallback secret', offenders, []);

    // The sign-in route that issued owner sessions to anyone is gone.
    const apiFiles = readdirSync(apiDir).filter((f) => f.endsWith('.js'));
    check('api/login.js no longer exists', apiFiles.includes('login.js'), false);

    // The three rules that caused the incident, pinned.
    const gate = readFileSync(new URL('_lib/serverAuth.js', apiDir), 'utf8');
    check('the gate does not sign or verify its own tokens',
      /jsonwebtoken|jwt\.(sign|verify)|createHmac/.test(gate), false);
    check('the gate asks Supabase who the caller is',
      /\/auth\/v1\/user/.test(gate), true);
    check('the gate reads the role from our own table, not from the token',
      /auth_uid=eq\./.test(gate), true);
    // Comments stripped: this file explains the bypass it is banning, and the
    // explanation must not be what trips the check.
    const gateCode = gate.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    check('the gate has no development bypass',
      /NODE_ENV|ALLOW_INSECURE|SKIP_AUTH|bypass/i.test(gateCode), false);
    // Misconfiguration must lock the door, never open it.
    check('a missing service key refuses rather than allows',
      /if \(!url \|\| !key\) return null;/.test(gateCode), true);
  }

  /* ── A caller who really is signed in gets through, and only to what their
     role allows. Supabase is stood in for here: the point is that the gate
     believes Supabase and nothing else. ── */
  {
    const asRole = (role, userId) => {
      global.fetch = async (url) => {
        const u = String(url);
        if (u.includes('/auth/v1/user')) {
          return { ok: true, json: async () => ({ id: 'uid-' + userId, email: userId + '@otto.local' }) };
        }
        if (u.includes('/rest/v1/users?auth_uid=eq.')) {
          return { ok: true, json: async () => [{ id: userId, data: { name: 'Test', role } }] };
        }
        // Any other upstream call: record it and answer emptily.
        calledUpstream = true;
        return { ok: true, json: async () => [], text: async () => '' };
      };
      return noopReq({ method: 'GET', headers: { authorization: 'Bearer real-looking-token' } });
    };

    // An owner reaches the data route.
    let res = createRes();
    await dataHandler(asRole('owner', 'owner-1'), res);
    check('a signed-in owner is allowed through to /api/data', res.statusCode, 200);

    // A field worker reaches it too — they need their jobs.
    res = createRes();
    await dataHandler(asRole('field', 'field-3'), res);
    check('a signed-in field worker is allowed through to /api/data', res.statusCode, 200);
    check('a field worker is not handed payroll',
      Object.keys(res.body || {}).includes('payroll'), false);
    check('a field worker is still handed their jobs',
      Object.keys(res.body || {}).includes('jobs'), true);

    // ...but cannot write to a collection that is not theirs.
    res = createRes();
    {
      const req = asRole('field', 'field-3');
      req.method = 'POST';
      req.body = { collection: 'payroll', records: [{ id: '1' }] };
      await dataHandler(req, res);
    }
    check('a field worker cannot write to payroll', res.statusCode, 403);

    // Routes that spend money or message customers are office-and-above.
    res = createRes();
    await notifyHandler(Object.assign(asRole('field', 'field-3'), { method: 'POST', body: { channel: 'sms', to: '+15551234567', body: 'secret' } }), res);
    check('a field worker cannot send a customer notification', res.statusCode, 403);

    res = createRes();
    await nvidiaHandler(Object.assign(asRole('field', 'field-3'), { method: 'POST', body: { messages: [] } }), res);
    check('a field worker cannot spend drawing-takeoff credit', res.statusCode, 403);

    // A Supabase account with no row in our users table is nobody.
    global.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'uid-x', email: 'ghost@otto.local' }) };
      if (u.includes('/rest/v1/users?auth_uid=eq.')) return { ok: true, json: async () => [] };
      calledUpstream = true;
      return { ok: true, json: async () => [] };
    };
    res = createRes();
    await dataHandler(noopReq({ method: 'GET', headers: { authorization: 'Bearer real-looking-token' } }), res);
    check('a Supabase account with no staff record is refused', res.statusCode, 403);

    // A user whose row was soft-deleted loses access immediately.
    global.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: 'uid-y', email: 'field-9@otto.local' }) };
      if (u.includes('/rest/v1/users?auth_uid=eq.')) return { ok: true, json: async () => [{ id: 'field-9', data: { name: 'Gone', role: 'field', deleted: true } }] };
      calledUpstream = true;
      return { ok: true, json: async () => [] };
    };
    res = createRes();
    await dataHandler(noopReq({ method: 'GET', headers: { authorization: 'Bearer real-looking-token' } }), res);
    check('a removed member of staff is refused', res.statusCode, 403);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  process.exit(failed ? 1 : 0);
}

runTests().catch((e) => {
  console.error(e);
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  process.exit(1);
});
