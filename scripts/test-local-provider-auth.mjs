import crypto from 'node:crypto';
import fs from 'node:fs';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.error(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}
function response() {
  return {
    statusCode: 0, body: null, headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; return this; }
  };
}
function request({ method = 'POST', headers = {}, body = null } = {}) {
  return { method, headers, body };
}

const TEST_KEY = 'test-local-provider-key';
process.env.NBO_LOCAL_PROVIDER_KEY_HASH = crypto.createHash('sha256').update(TEST_KEY).digest('hex');

const auth = await import(`../api/_lib/localProviderAuth.js?test=${Date.now()}`);
const session = await import(`../api/local-session.js?test=${Date.now()}`);
const nvidia = fs.readFileSync(new URL('../api/nvidia.js', import.meta.url), 'utf8');
const notify = fs.readFileSync(new URL('../api/notify.js', import.meta.url), 'utf8');
const patch = fs.readFileSync(new URL('./apply-nbo-hybrid-local-patch.mjs', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../otto-local-runtime.js', import.meta.url), 'utf8');

console.log('\nLocal provider authorization');
check('provider key verifies only by hash', auth.verifyProviderKey(TEST_KEY), true);
check('wrong provider key is rejected', auth.verifyProviderKey('wrong'), false);

{
  const res = response();
  await session.default(request({
    headers: { host: 'otto.example', origin: 'https://otto.example', 'x-nbo-profile': 'owner-1' },
    body: { accessKey: TEST_KEY }
  }), res);
  check('valid management enrollment succeeds', res.statusCode, 200);
  check('enrollment sets an HttpOnly strict cookie', /HttpOnly/.test(res.headers['set-cookie'] || '') && /SameSite=Strict/.test(res.headers['set-cookie'] || ''), true);
}
{
  const res = response();
  await session.default(request({
    headers: { host: 'otto.example', origin: 'https://evil.example', 'x-nbo-profile': 'owner-1' },
    body: { accessKey: TEST_KEY }
  }), res);
  check('cross-origin enrollment is blocked', res.statusCode, 403);
}
{
  const res = response();
  await session.default(request({
    headers: { host: 'otto.example', origin: 'https://otto.example', 'x-nbo-profile': 'employee-pay-sheet-01' },
    body: { accessKey: TEST_KEY }
  }), res);
  check('field profile cannot enroll provider access', res.statusCode, 403);
}

const cookie = `__Host-otto_provider=${encodeURIComponent(TEST_KEY)}`;
{
  const res = response();
  const identity = await auth.requireLocalProviderAuth(request({
    headers: { cookie, host: 'otto.example', origin: 'https://otto.example', 'x-nbo-profile': 'ops-1' }
  }), res, { roles: ['owner', 'office'] });
  check('office manager cookie resolves to office identity', identity && identity.role, 'office');
}
{
  const res = response();
  const identity = await auth.requireLocalProviderAuth(request({
    headers: { host: 'otto.example', origin: 'https://otto.example', 'x-nbo-profile': 'owner-1' }
  }), res, { roles: ['owner', 'office'] });
  check('missing provider cookie is denied', identity, null);
  check('missing provider cookie returns enrollment-required', res.body && res.body.error, 'local_provider_access_required');
}

check('NVIDIA route uses local provider auth instead of Supabase auth', nvidia.includes('requireLocalProviderAuth') && !nvidia.includes('requireServerAuth'), true);
check('notification route uses local provider auth instead of Supabase auth', notify.includes('requireLocalProviderAuth') && !notify.includes('requireServerAuth'), true);
check('local materializer replaces serverFetch for provider access', patch.includes("replaceFunction(out, 'serverFetch'") && patch.includes('requestLocalProviderAccess'), true);
check('local runtime provides provider-access enrollment UI', runtime.includes('__nboRequestProviderAccess') && runtime.includes('/api/local-session'), true);

console.log(`\nLocal provider auth: ${passed} passed / ${failed} failed\n`);
if (failed) process.exit(1);
