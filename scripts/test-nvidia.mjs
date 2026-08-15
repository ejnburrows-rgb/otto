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

    /* The caller does not get to name the model. It used to: whatever the
       browser put in `model` was forwarded, so an authenticated account could
       run any model on the owner's key. The server picks, always. */
    process.env.NVIDIA_MODEL = 'custom-model-456';
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { model: 'passed-model', stream: true } }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('A caller-supplied model is ignored for the server-approved one', bodyOut.model, 'custom-model-456');
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

    // Naming a model cannot be used to escape vision selection either.
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { ...withImage(), model: 'explicit-model' } }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    // NVIDIA_VISION_MODEL is still set from the check above, so the server's
    // configured vision model is the correct expectation here.
    check('A caller-supplied model cannot override vision selection',
      bodyOut.model, 'custom-vision-789');

    process.env.NVIDIA_MODEL = 'custom-model-456';
    delete process.env.NVIDIA_VISION_MODEL;

    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: '{"messages": [{"role":"user"}]}' }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Parses string body correctly', bodyOut.messages, [{ role: 'user' }]);

    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: undefined, rawBody: '{"messages":[{"role":"user","content":"raw"}]}' }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Reads from req stream when body is missing', bodyOut.messages, [{ role: 'user', content: 'raw' }]);

    /* The upstream request is rebuilt from known fields rather than forwarded,
       so a caller cannot smuggle provider parameters through this proxy. */
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { messages: [], tools: [{ name: 'x' }], api_key: 'sneaky', n: 50 } }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('Unknown caller fields are not forwarded upstream',
      [bodyOut.tools, bodyOut.api_key, bodyOut.n], [undefined, undefined, undefined]);

    // Output length is capped server-side; a caller asking for more gets the cap.
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { messages: [], max_tokens: 999999 } }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('max_tokens is capped at the server maximum', bodyOut.max_tokens, 1500);

    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { messages: [], max_tokens: 200 } }), res);
    bodyOut = JSON.parse(fetchCalls[0]?.options.body || '{}');
    check('A smaller max_tokens is respected', bodyOut.max_tokens, 200);

    // Oversized input is refused before the provider is paid to read it.
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: { messages: [{ role: 'user', content: 'x'.repeat(120001) }] } }), res);
    check('Oversized input returns 413', res.statusCode, 413);
    check('Oversized input never reaches the provider', fetchCalls.length, 0);

    // Malformed JSON is a client error, not a provider error.
    fetchCalls = [];
    res = createRes();
    await handler(createReq({ body: '{not json' }), res);
    check('Malformed JSON returns 400', res.statusCode, 400);
    check('Malformed JSON never reaches the provider', fetchCalls.length, 0);

    fetchCalls = [];
    res = createRes();
    const origFetch = global.fetch;
    global.fetch = async () => { throw new Error('network failed'); };
    await handler(createReq({ body: {} }), res);
    global.fetch = origFetch;
    check('Upstream error returns 502', res.statusCode, 502);
    check('Includes error class', res.body.error, 'upstream_error');
    /* The prompt is the owner's business data. A provider error message is an
       easy place for it to leak into a log, so only the class is returned. */
    check('Upstream error carries no prompt detail', res.body.detail, undefined);

    // A provider that stops responding must fail as a timeout, not hang.
    process.env.NVIDIA_TIMEOUT_MS = '20';
    const { nvidiaHandler: timeoutHandler } = await import(`../api/nvidia.js?timeout=${Date.now()}`);
    global.fetch = async (url, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        const err = new Error('aborted'); err.name = 'AbortError'; reject(err);
      });
    });
    res = createRes();
    await timeoutHandler(createReq({ body: { messages: [] } }), res, { userId: 'timeout-user' });
    global.fetch = origFetch;
    check('A provider that never answers returns 504', res.statusCode, 504);
    check('Timeout is reported as a timeout', res.body.error, 'upstream_timeout');
    delete process.env.NVIDIA_TIMEOUT_MS;

    /* Rate limiting is per OTTO user id, so one account cannot spend the key by
       looping, and a second account is unaffected by the first one's limit. */
    process.env.NVIDIA_RATE_LIMIT_MAX = '3';
    const { nvidiaHandler: limitHandler } = await import(`../api/nvidia.js?limit=${Date.now()}`);
    global.fetch = async () => ({ status: 200, text: async () => '{"ok":true}' });
    const statuses = [];
    for (let i = 0; i < 4; i++) {
      res = createRes();
      await limitHandler(createReq({ body: { messages: [] } }), res, { userId: 'owner-1' });
      statuses.push(res.statusCode);
    }
    check('A user is limited after the configured number of requests', statuses, [200, 200, 200, 429]);
    check('The refusal names the reason', res.body.error, 'rate_limited');
    check('The refusal tells the caller when to retry', typeof res.headers['Retry-After'], 'string');

    res = createRes();
    await limitHandler(createReq({ body: { messages: [] } }), res, { userId: 'owner-2' });
    check('A different user is not affected by another user rate limit', res.statusCode, 200);
    delete process.env.NVIDIA_RATE_LIMIT_MAX;
    global.fetch = origFetch;
  } finally {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

runTests();
