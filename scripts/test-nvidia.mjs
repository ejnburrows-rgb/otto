import handler from '../api/nvidia.js';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    setHeader(k, v) { this.headers[k] = v; return this; },
    send(data) { this.body = data; return this; }
  };
}

function createReq(opts = {}) {
  const req = {
    method: opts.method || 'POST',
    body: opts.body
  };
  req.on = (ev, cb) => {
    if (ev === 'data' && opts.rawBody) cb(opts.rawBody);
    if (ev === 'end') cb();
  };
  return req;
}

// Intercept global fetch
let fetchCalls = [];
global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  if (url === 'error') throw new Error('network failed');
  return {
    status: 200,
    text: async () => '{"reply":"hello"}'
  };
};

async function runTests() {
  console.log('\nNVIDIA API Proxy Tests');

  const originalEnv = { ...process.env };

  try {
    // Test 1: Non-POST
    let res = createRes();
    await handler(createReq({ method: 'GET' }), res);
    check('Non-POST returns 405', res.statusCode, 405);
    check('Non-POST returns method_not_allowed error', res.body, { error: 'method_not_allowed' });

    // Test 2: Missing API key
    delete process.env.NVIDIA_API_KEY;
    res = createRes();
    await handler(createReq(), res);
    check('Missing key returns 503', res.statusCode, 503);
    check('Missing key returns no_server_key error', res.body, { error: 'no_server_key' });

    // Test 3: Standard forward
    process.env.NVIDIA_API_KEY = 'test-key-123';
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { messages: [{ role: 'user' }] } }), res);
    // Since NVIDIA_URL is declared as a const reading from process.env ONCE at startup,
    // we cannot override it in tests via process.env after the module is loaded.
    check('Forwards to NVIDIA URL', fetchCalls[0]?.url, 'https://integrate.api.nvidia.com/v1/chat/completions');
    check('Sets Authorization header', fetchCalls[0]?.options.headers.Authorization, 'Bearer test-key-123');

    let bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Injects default model', bodyOut.model, 'meta/llama-3.3-70b-instruct');
    check('Returns 200', res.statusCode, 200);
    check('Returns text body', res.body, '{"reply":"hello"}');

    // Test 4: Custom model and stream override
    process.env.NVIDIA_MODEL = 'custom-model-456';
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { model: 'passed-model', stream: true } }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Respects passed model if provided', bodyOut.model, 'passed-model');
    check('Forces stream to false', bodyOut.stream, false);

    // Test 5: Fallback to process.env.NVIDIA_MODEL if body.model is absent
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: {} }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Uses NVIDIA_MODEL env if model not provided', bodyOut.model, 'custom-model-456');

    // Test 6: body is a string
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: '{"messages": [{"role":"user"}]}' }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Parses string body correctly', bodyOut.messages, [{role: 'user'}]);

    // Test 7: req.body is undefined, reads raw body
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: undefined, rawBody: '{"test":"raw"}' }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Reads from req stream when body is missing', bodyOut.test, 'raw');

    // Test 8: Upstream error (by overriding fetch temporarily to throw an error)
    fetchCalls = [];
    res = createRes();
    const origFetch = global.fetch;
    global.fetch = async () => { throw new Error('network failed'); };
    await handler(createReq({ body: {} }), res);
    global.fetch = origFetch; // restore
    check('Upstream error returns 502', res.statusCode, 502);
    check('Includes error detail', res.body.error, 'upstream_error');

  } finally {
    // Restore env
    process.env = originalEnv;
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

runTests();
