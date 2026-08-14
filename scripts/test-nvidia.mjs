// Regression guard: production may set NVIDIA_URL/NVIDIA_MODEL; clear them before importing the proxy so this test proves built-in defaults rather than Vercel project settings.
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
  const req = { method: opts.method || 'POST', body: opts.body };
  req.on = (ev, cb) => {
    if (ev === 'data' && opts.rawBody) cb(opts.rawBody);
    if (ev === 'end') cb();
  };
  return req;
}

const originalEnv = { ...process.env };
// Production may deliberately configure NVIDIA_URL and NVIDIA_MODEL. This test
// verifies the code's built-in defaults, so clear those values before importing
// the module: NVIDIA_URL is captured once at module load time.
delete process.env.NVIDIA_URL;
delete process.env.NVIDIA_MODEL;
const { nvidiaHandler: handler } = await import(`../api/nvidia.js?test=${Date.now()}`);

let fetchCalls = [];
global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  return { status: 200, text: async () => '{"reply":"hello"}' };
};

async function runTests() {
  console.log('\nNVIDIA API Proxy Tests');
  try {
    let res = createRes();
    await handler(createReq({ method: 'GET' }), res);
    check('Non-POST returns 405', res.statusCode, 405);
    check('Non-POST returns method_not_allowed error', res.body, { error: 'method_not_allowed' });

    delete process.env.NVIDIA_API_KEY;
    res = createRes();
    await handler(createReq(), res);
    check('Missing key returns 503', res.statusCode, 503);
    check('Missing key returns no_server_key error', res.body, { error: 'no_server_key' });

    process.env.NVIDIA_API_KEY = 'test-key-123';
    delete process.env.NVIDIA_MODEL;
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { messages: [{ role: 'user' }] } }), res);
    check('Forwards to NVIDIA URL', fetchCalls[0]?.url, 'https://integrate.api.nvidia.com/v1/chat/completions');
    check('Sets Authorization header', fetchCalls[0]?.options.headers.Authorization, 'Bearer test-key-123');

    let bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Injects default model', bodyOut.model, 'meta/llama-3.3-70b-instruct');
    check('Returns 200', res.statusCode, 200);
    check('Returns text body', res.body, '{"reply":"hello"}');

    process.env.NVIDIA_MODEL = 'custom-model-456';
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { model: 'passed-model', stream: true } }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Respects passed model if provided', bodyOut.model, 'passed-model');
    check('Forces stream to false', bodyOut.stream, false);

    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: {} }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Uses NVIDIA_MODEL env if model not provided', bodyOut.model, 'custom-model-456');

    // Reading a photo needs a vision model. The browser sends no model name, so
    // the choice is made here from whether the request actually carries an image.
    const withImage = () => ({
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'read this' },
        { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } },
      ] }],
    });

    delete process.env.NVIDIA_MODEL;
    delete process.env.NVIDIA_VISION_MODEL;
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: withImage() }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Picks the default vision model when a request carries an image',
      bodyOut.model, 'meta/llama-3.2-90b-vision-instruct');

    process.env.NVIDIA_VISION_MODEL = 'custom-vision-789';
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: withImage() }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Respects NVIDIA_VISION_MODEL env', bodyOut.model, 'custom-vision-789');

    // A text-only request must not be sent to the vision model, which is slower
    // and priced differently.
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { messages: [{ role: 'user', content: 'plain text' }] } }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Text-only request still uses the text model',
      bodyOut.model, 'meta/llama-3.3-70b-instruct');

    // An explicit model always wins, image or not.
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { ...withImage(), model: 'explicit-model' } }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('An explicit model still wins over vision selection', bodyOut.model, 'explicit-model');

    process.env.NVIDIA_MODEL = 'custom-model-456';
    delete process.env.NVIDIA_VISION_MODEL;

    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: '{"messages": [{"role":"user"}]}' }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Parses string body correctly', bodyOut.messages, [{ role: 'user' }]);

    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: undefined, rawBody: '{"test":"raw"}' }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Reads from req stream when body is missing', bodyOut.test, 'raw');

    fetchCalls = [];
    res = createRes();
    const origFetch = global.fetch;
    global.fetch = async () => { throw new Error('network failed'); };
    await handler(createReq({ body: {} }), res);
    global.fetch = origFetch;
    check('Upstream error returns 502', res.statusCode, 502);
    check('Includes error detail', res.body.error, 'upstream_error');
  } finally {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

runTests();
