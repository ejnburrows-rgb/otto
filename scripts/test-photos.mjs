// Tests for the photo storage API endpoint.
//
// These mock fetch and environment variables to verify the upload relay,
// signed-URL fetch, delete, 503 without env vars, and 405 on unknown methods.
// Run with:  node scripts/test-photos.mjs

import handler from '../api/photos.js';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

let fetchCalls = [];
let mockFetchResponse = null;
global.fetch = async (url, opts) => {
  fetchCalls.push({ url, opts });
  if (mockFetchResponse instanceof Error) throw mockFetchResponse;
  return {
    ok: mockFetchResponse.ok,
    status: mockFetchResponse.status,
    json: async () => mockFetchResponse.data,
    text: async () => mockFetchResponse.text,
  };
};

function createRes() {
  const r = { statusCode: 200, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json   = (d) => { r.body = d; return r; };
  return r;
}

function bodyStream(obj) {
  let done = false;
  const data = JSON.stringify(obj);
  return {
    on(ev, cb) {
      if (ev === 'data' && !done) { done = true; cb(data); }
      if (ev === 'end') cb();
      return this;
    }
  };
}

function req(method, query = {}, body = null, contentType = 'application/json') {
  const r = { method, query, headers: { 'content-type': contentType }, body };
  if (!body) r.on = bodyStream({}).on;
  return r;
}

// ── 503 when no env vars ─────────────────────────────────────────────────────
console.log('\nno environment variables');
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
{
  const res = createRes();
  await handler(req('GET', { fileId: 'f_abc' }), res);
  check('GET returns 503 without env', res.statusCode, 503);
  check('GET body has no_server_key', res.body.error, 'no_server_key');
}
{
  const res = createRes();
  await handler(req('POST', {}, null, 'multipart/form-data'), res);
  check('POST returns 503 without env', res.statusCode, 503);
}
{
  const res = createRes();
  await handler(req('DELETE', { fileId: 'f_abc' }), res);
  check('DELETE returns 503 without env', res.statusCode, 503);
}

// ── 405 on unknown methods ────────────────────────────────────────────────────
console.log('\nunknown methods');
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'sk-test';
{
  const res = createRes();
  await handler(req('PUT', { fileId: 'f_abc' }), res);
  check('PUT returns 405', res.statusCode, 405);
}

// ── GET signed URL ────────────────────────────────────────────────────────────
console.log('\nGET signed URL');
{
  fetchCalls = [];
  mockFetchResponse = { ok: true, status: 200, data: { signedURL: 'https://cdn.supabase.co/signed' }, text: '' };
  const res = createRes();
  await handler(req('GET', { fileId: 'f_abc123' }), res);
  check('GET returns 200', res.statusCode, 200);
  check('GET returns url', res.body.url, 'https://cdn.supabase.co/signed');
  check('GET calls supabase sign endpoint', fetchCalls[0].url.includes('/sign/'), true);
  check('GET path includes fileId', fetchCalls[0].url.includes('f_abc123'), true);
}
{
  const res = createRes();
  await handler(req('GET', {}), res);
  check('GET without fileId returns 400', res.statusCode, 400);
}
{
  fetchCalls = [];
  mockFetchResponse = { ok: false, status: 404, data: {}, text: 'not found' };
  const res = createRes();
  await handler(req('GET', { fileId: 'f_missing' }), res);
  check('GET upstream 404 returns 404', res.statusCode, 404);
}

// ── POST upload (JSON/base64 path) ────────────────────────────────────────────
console.log('\nPOST upload');
{
  fetchCalls = [];
  mockFetchResponse = { ok: true, status: 200, data: {}, text: '' };
  // Provide a JSON body with a tiny base64 JPEG
  const tinyJpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC';
  const body = JSON.stringify({ fileId: 'f_upload1', mime: 'image/jpeg', data: tinyJpeg });
  const r2 = { method: 'POST', query: {}, headers: { 'content-type': 'application/json' }, body };
  const res = createRes();
  await handler(r2, res);
  check('POST returns 200', res.statusCode, 200);
  check('POST body ok true', res.body.ok, true);
  check('POST calls supabase object endpoint', fetchCalls[0].url.includes('/object/'), true);
}
{
  // Missing fileId
  const body = JSON.stringify({ mime: 'image/jpeg', data: 'abc' });
  const r2 = { method: 'POST', query: {}, headers: { 'content-type': 'application/json' }, body };
  const res = createRes();
  await handler(r2, res);
  check('POST without fileId returns 400', res.statusCode, 400);
}
{
  // Upstream error
  fetchCalls = [];
  mockFetchResponse = { ok: false, status: 413, data: {}, text: 'payload too large' };
  const body = JSON.stringify({ fileId: 'f_big', mime: 'image/jpeg', data: 'data:image/jpeg;base64,abc' });
  const r2 = { method: 'POST', query: {}, headers: { 'content-type': 'application/json' }, body };
  const res = createRes();
  await handler(r2, res);
  check('POST upstream error returns upstream status', res.statusCode, 413);
  check('POST upstream error body has upload_failed', res.body.error, 'upload_failed');
}

// ── DELETE ────────────────────────────────────────────────────────────────────
console.log('\nDELETE file');
{
  fetchCalls = [];
  mockFetchResponse = { ok: true, status: 200, data: {}, text: '' };
  const res = createRes();
  await handler(req('DELETE', { fileId: 'f_abc123' }), res);
  check('DELETE returns 200', res.statusCode, 200);
  check('DELETE body ok', res.body.ok, true);
  check('DELETE calls supabase storage', fetchCalls[0].url.includes('/object/'), true);
}
{
  const res = createRes();
  await handler(req('DELETE', {}), res);
  check('DELETE without fileId returns 400', res.statusCode, 400);
}
{
  fetchCalls = [];
  mockFetchResponse = new Error('network error');
  const res = createRes();
  await handler(req('DELETE', { fileId: 'f_abc123' }), res);
  check('DELETE network error returns 500', res.statusCode, 500);
  check('DELETE network error body has proxy_error', res.body.error, 'proxy_error');
}

// ── cleanup ───────────────────────────────────────────────────────────────────
global.fetch = originalFetch;
process.env = { ...originalEnv };

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
