import dataRoute, { dataHandler } from '../api/data.js';
import notifyRoute from '../api/notify.js';
import { readFileSync } from 'node:fs';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}
function response() {
  return { statusCode: 0, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader() { return this; }, send(body) { this.body = body; return this; } };
}
function request(headers = {}, overrides = {}) { return { method: 'GET', query: { session: '1' }, headers, body: null, on(event, cb) { if (event === 'end') cb(); return this; }, ...overrides }; }

process.env.SUPABASE_URL = 'https://project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-secret';
const originalFetch = global.fetch;
let calls = [];
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  if (String(url).endsWith('/auth/v1/user')) {
    const token = options.headers.Authorization;
    if (token === 'Bearer valid-owner') return new Response(JSON.stringify({ id: 'auth-owner', email: 'otto@example.com', user_metadata: { role: 'field' } }), { status: 200 });
    if (token === 'Bearer valid-field') return new Response(JSON.stringify({ id: 'auth-field', email: 'worker@example.com', user_metadata: { role: 'owner' } }), { status: 200 });
    return new Response('{}', { status: 401 });
  }
  if (String(url).includes('/rest/v1/users?select=')) return new Response(JSON.stringify([
    { id: 'owner-1', auth_uid: 'auth-owner', data: { id: 'owner-1', name: 'Otto', role: 'owner', email: 'otto@example.com', active: true } },
    { id: 'worker-1', auth_uid: 'auth-field', data: { id: 'worker-1', name: 'Worker', role: 'field', email: 'worker@example.com', active: true } },
  ]), { status: 200 });
  if (String(url).includes('/rest/v1/users')) return new Response(JSON.stringify([
    { id: 'owner-1', data: { id: 'owner-1', name: 'Otto', role: 'owner', active: true } },
    { id: 'worker-1', data: { id: 'worker-1', name: 'Worker', role: 'field', active: true } },
  ]), { status: 200 });
  if (String(url).includes('/rest/v1/jobs')) return new Response('[]', { status: 200 });
  if (String(url).includes('/rest/v1/')) return new Response('[]', { status: 200 });
  throw new Error('unexpected upstream: ' + url);
};

console.log('\nSupabase-backed server authorization');
{
  calls = []; const res = response(); await dataRoute(request(), res);
  check('anonymous requests are denied', res.statusCode, 401);
  check('anonymous requests never reach Supabase', calls.length, 0);
}
{
  calls = []; const res = response();
  await dataHandler(request({}, { query: {}, method: 'POST', body: { collection: 'users', records: [{ id: 'owner-1', role: 'owner', active: true, deleted: true }] } }), res, { role: 'owner', userId: 'owner-1', profile: { id: 'owner-1', role: 'owner' } });
  check('protected administrator cannot be deleted', res.statusCode, 403);
}
{
  calls = []; const res = response();
  await dataHandler(request({}, { query: {}, method: 'POST', body: { collection: 'users', records: [{ id: 'worker-1', role: 'field', active: true, deleted: true }] } }), res, { role: 'owner', userId: 'owner-1', profile: { id: 'owner-1', role: 'owner' } });
  check('owner can delete a field worker', res.statusCode, 200);
}
{
  calls = []; const res = response(); await dataRoute(request({ authorization: 'Bearer invalid' }), res);
  check('invalid provider token is denied', res.statusCode, 401);
  check('invalid token never reaches business data', calls.some(call => call.url.includes('/rest/v1/')), false);
}
{
  calls = []; const res = response(); await dataRoute(request({ authorization: 'Bearer valid-owner' }), res);
  check('authorized owner reaches the session endpoint', res.statusCode, 200);
  check('role comes from server business profile', res.body.profile.role, 'owner');
}
{
  calls = []; const res = response(); await notifyRoute(request({ authorization: 'Bearer valid-field' }, { method: 'POST', body: {} }), res);
  check('field account cannot send owner notifications', res.statusCode, 403);
  check('editable user metadata cannot elevate the field account', res.body.error, 'forbidden');
}
{
  calls = []; const res = response();
  await dataHandler(request({}, { query: {}, method: 'POST', body: { collection: 'invoices', records: [{ id: 'inv-1' }] } }), res, { role: 'field', userId: 'worker-1', profile: { id: 'worker-1', role: 'field' } });
  check('field account cannot write accounting collections', res.statusCode, 403);
}

const gate = readFileSync(new URL('../api/_lib/serverAuth.js', import.meta.url), 'utf8');
check('OTTO does not sign or locally verify JWTs', /jsonwebtoken|jwt\.(sign|verify)/.test(gate), false);
check('there is no fallback signing secret', gate.includes('fallback_secret_for_dev'), false);
check('provider user verification is used', gate.includes('/auth/v1/user'), true);
check('authorization ignores user_metadata', gate.includes('user_metadata'), false);

global.fetch = originalFetch;
console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
