// Tests for the notifications API endpoint.
//
// These tests mock fetch and environment variables to simulate Twilio and SendGrid
// interactions.
// Run with: node scripts/test-notify.mjs

import { notifyHandler as handler } from '../api/notify.js';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

let fetchCalls = [];
let nextFetchResponse = null;

global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  if (nextFetchResponse instanceof Error) {
    throw nextFetchResponse;
  }
  return {
    ok: nextFetchResponse.ok,
    status: nextFetchResponse.status,
    json: async () => {
      if (nextFetchResponse && nextFetchResponse.jsonError) throw nextFetchResponse.jsonError;
      return nextFetchResponse.data;
    },
    text: async () => nextFetchResponse.text,
  };
};

function createRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

function resetEnv() {
  process.env = { ...originalEnv };
  delete process.env.TWILIO_SID;
  delete process.env.TWILIO_AUTH;
  delete process.env.TWILIO_FROM;
  delete process.env.SENDGRID_API_KEY;
  delete process.env.SENDGRID_FROM;
}

async function runTests() {
  console.log('\nTesting api/notify.js');

  // Test 1: Method not allowed
  let res = createRes();
  await handler({ method: 'GET' }, res);
  check('rejects non-POST methods', { status: res.statusCode, error: res.body.error }, { status: 405, error: 'method_not_allowed' });

  // Test 2: Unknown channel
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'pigeon' } }, res);
  check('rejects unknown channel', { status: res.statusCode, error: res.body.error }, { status: 400, error: 'unknown_channel' });

  // Test 3: SMS missing config
  resetEnv();
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'sms', to: '123' } }, res);
  check('returns 503 if SMS not configured', { status: res.statusCode, error: res.body.error }, { status: 503, error: 'sms_not_configured' });

  // Test 4: SMS success
  resetEnv();
  process.env.TWILIO_SID = 'AC123';
  process.env.TWILIO_AUTH = 'auth123';
  process.env.TWILIO_FROM = '555';
  fetchCalls = [];
  nextFetchResponse = { ok: true, status: 200, data: { sid: 'SM123' } };
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'sms', to: '+1234567890', body: 'Hello' } }, res);
  check('SMS success', { status: res.statusCode, ok: res.body.ok, sid: res.body.sid }, { status: 200, ok: true, sid: 'SM123' });
  check('SMS fetch called with right params', fetchCalls.length, 1);
  check('SMS fetch URL correct', fetchCalls[0].url.includes('AC123'), true);

  // Test 5: SMS fetch API error
  fetchCalls = [];
  nextFetchResponse = { ok: false, status: 400, data: { code: 21211, message: 'Invalid number' } };
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'sms', to: 'bad' } }, res);
  check('SMS API error returns 400', { status: res.statusCode, error: res.body.error, detail: res.body.detail }, { status: 400, error: 'twilio_error', detail: { code: 21211, message: 'Invalid number' } });

  // Test 6: SMS network exception
  fetchCalls = [];
  nextFetchResponse = new Error('Network failure');
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'sms', to: '123' } }, res);
  check('SMS exception returns 500', { status: res.statusCode, error: res.body.error }, { status: 500, error: 'twilio_failed' });

  // Test 6b: SMS JSON parse exception
  fetchCalls = [];
  nextFetchResponse = { ok: true, status: 200, jsonError: new Error('JSON Parse failed') };
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'sms', to: '123' } }, res);
  check('SMS JSON parse exception returns 500', { status: res.statusCode, error: res.body.error }, { status: 500, error: 'twilio_failed' });

  // Test 7: Email missing config
  resetEnv();
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'email', to: 'a@b.com' } }, res);
  check('returns 503 if Email not configured', { status: res.statusCode, error: res.body.error }, { status: 503, error: 'email_not_configured' });

  // Test 8: Email success
  resetEnv();
  process.env.SENDGRID_API_KEY = 'SG123';
  process.env.SENDGRID_FROM = 'verified@example.com';
  fetchCalls = [];
  nextFetchResponse = { ok: true, status: 202 };
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'email', to: 'test@example.com', subject: 'Subj', body: 'Body' } }, res);
  check('Email success', { status: res.statusCode, ok: res.body.ok }, { status: 200, ok: true });
  check('Email fetch called', fetchCalls.length, 1);
  check('Email fetch URL correct', fetchCalls[0].url, 'https://api.sendgrid.com/v3/mail/send');

  // Test 9: Email fetch API error
  fetchCalls = [];
  nextFetchResponse = { ok: false, status: 400, text: 'Bad request' };
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'email', to: 'test@example.com' } }, res);
  check('Email API error returns 400', { status: res.statusCode, error: res.body.error, detail: res.body.detail }, { status: 400, error: 'sendgrid_error', detail: 'Bad request' });

  // Test 10: Email network exception
  fetchCalls = [];
  nextFetchResponse = new Error('DNS failure');
  res = createRes();
  await handler({ method: 'POST', body: { channel: 'email', to: 'test@example.com' } }, res);
  check('Email exception returns 500', { status: res.statusCode, error: res.body.error }, { status: 500, error: 'email_failed' });

  // Test 11: Stringified body (common with some webhooks or old fetch calls)
  resetEnv();
  process.env.SENDGRID_API_KEY = 'SG123';
  process.env.SENDGRID_FROM = 'verified@example.com';
  fetchCalls = [];
  nextFetchResponse = { ok: true, status: 202 };
  res = createRes();
  await handler({ method: 'POST', body: JSON.stringify({ channel: 'email', to: 'str@example.com' }) }, res);
  check('Parses stringified body', { status: res.statusCode, ok: res.body.ok }, { status: 200, ok: true });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
