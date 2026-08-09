// Regression tests for the fail-closed containment gate (api/_lib/serverAuth.js).
//
// Proves: an unauthenticated request to every sensitive route is refused
// with the same machine-readable error, before it ever reaches Supabase,
// Anthropic, NVIDIA, Twilio, or SendGrid — even when the server-side provider
// keys ARE configured. No customer data, signed photo URL, provider response,
// or notification preview is ever returned.
//
// Run with: node scripts/test-server-auth.mjs

import dataHandler from '../api/data.js';
import photosHandler from '../api/photos.js';
import claudeHandler from '../api/claude.js';
import nvidiaHandler from '../api/nvidia.js';
import notifyHandler from '../api/notify.js';

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
  ];

  for (const [name, handler, req] of cases) {
    calledUpstream = false;
    const res = createRes();
    await handler(req, res);
    check(`${name} returns 403`, res.statusCode, 403);
    check(`${name} returns server_auth_not_configured`, res.body && res.body.error, 'server_auth_not_configured');
    check(`${name} reveals no customer/provider data`, JSON.stringify(res.body).toLowerCase().includes('secret'), false);
    check(`${name} never calls the upstream provider`, calledUpstream, false);
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

    // hasServerAuth must be unconditional until a real provider check replaces
    // it. If you are legitimately wiring one up, update this test deliberately.
    const gate = readFileSync(new URL('_lib/serverAuth.js', apiDir), 'utf8');
    check('the gate does not sign or verify its own tokens', /jsonwebtoken|jwt\.(sign|verify)/.test(gate), false);
    check('the gate fails closed', /return false;/.test(gate), true);
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
