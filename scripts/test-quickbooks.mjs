// Tests for the QuickBooks sync stub api endpoint

import handler from '../api/quickbooks.js';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

async function runTests() {
  console.log('\nTesting api/quickbooks.js');

  // Helper for mock request/response
  function createMocks(method, query = {}, body = null, headers = {}) {
    const req = {
      method,
      query,
      body,
      headers
    };
    const res = {
      statusCode: null,
      jsonData: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.jsonData = data;
        return this;
      }
    };
    return { req, res };
  }

  // Backup env
  const originalEnv = { ...process.env };

  try {
    // Test 1: GET status without credentials
    delete process.env.QB_CLIENT_ID;
    delete process.env.QB_CLIENT_SECRET;

    let { req, res } = createMocks('GET', { action: 'status' });
    await handler(req, res);
    check('GET status without env vars returns 200', res.statusCode, 200);
    check('GET status without env vars has configured: false', res.jsonData.configured, false);

    // Test 2: GET status with credentials
    process.env.QB_CLIENT_ID = 'id123';
    process.env.QB_CLIENT_SECRET = 'secret123';
    delete process.env.QB_REFRESH_TOKEN;

    ({ req, res } = createMocks('GET', { action: 'status' }));
    await handler(req, res);
    check('GET status with env vars returns 200', res.statusCode, 200);
    check('GET status with env vars has configured: true', res.jsonData.configured, true);
    check('GET status without token has connected: false', res.jsonData.connected, false);

    // Test 3: GET auth_url without credentials
    delete process.env.QB_CLIENT_ID;
    delete process.env.QB_CLIENT_SECRET;

    ({ req, res } = createMocks('GET', { action: 'auth_url' }));
    await handler(req, res);
    check('GET auth_url without env vars returns 503', res.statusCode, 503);
    check('GET auth_url without env vars gives not_configured error', res.jsonData.error, 'not_configured');

    // Test 4: GET auth_url with credentials
    process.env.QB_CLIENT_ID = 'id123';
    process.env.QB_CLIENT_SECRET = 'secret123';

    ({ req, res } = createMocks('GET', { action: 'auth_url' }, null, { host: 'localhost:8000', 'x-forwarded-proto': 'http' }));
    await handler(req, res);
    check('GET auth_url with env vars returns 200', res.statusCode, 200);
    check('GET auth_url returns a valid URL including client id', res.jsonData.authUrl && res.jsonData.authUrl.includes('id123'), true);

    // Test 5: POST status
    ({ req, res } = createMocks('POST', {}, { action: 'status' }));
    await handler(req, res);
    check('POST status returns 200', res.statusCode, 200);
    check('POST status returns configured: true', res.jsonData.configured, true);

    // Test 6: POST sync without refresh token
    ({ req, res } = createMocks('POST', {}, { action: 'sync', records: [{ id: 1 }] }));
    await handler(req, res);
    check('POST sync without token returns 503', res.statusCode, 503);
    check('POST sync without token gives not_connected error', res.jsonData.error, 'not_connected');

    // Test 7: POST sync with refresh token
    process.env.QB_REFRESH_TOKEN = 'token123';
    ({ req, res } = createMocks('POST', {}, { action: 'sync', records: [{ id: 1 }, { id: 2 }] }));
    await handler(req, res);
    check('POST sync with token returns 200', res.statusCode, 200);
    check('POST sync returns correct synced count', res.jsonData.synced, 2);

    // Test 8: PUT method (invalid)
    ({ req, res } = createMocks('PUT'));
    await handler(req, res);
    check('PUT method returns 405', res.statusCode, 405);
    check('PUT method gives method_not_allowed error', res.jsonData.error, 'method_not_allowed');

    // Test 9: Unknown POST action
    ({ req, res } = createMocks('POST', {}, { action: 'magic' }));
    await handler(req, res);
    check('Unknown POST action returns 400', res.statusCode, 400);
    check('Unknown POST action gives unknown_action error', res.jsonData.error, 'unknown_action');

  } finally {
    // Restore env
    process.env = originalEnv;
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
