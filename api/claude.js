// Vercel serverless proxy for the Claude (Anthropic) API.
//
// The OTTO Plumbing CRM front-end calls POST /api/claude with the same JSON
// body it would send to https://api.anthropic.com/v1/messages. This function
// adds the Anthropic API key from the ANTHROPIC_API_KEY environment variable
// (set once in the Vercel project settings) so the key never lives in the
// browser and every worker's device gets AI with nothing to paste.
//
// If no key is configured it returns 503 so the client can fall back to a
// personal key entered in Settings, or to local (no-AI) behavior.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'no_server_key' });
    return;
  }
  try {
    // req.body is auto-parsed for application/json; fall back to raw read.
    let body = req.body;
    if (body == null || typeof body === 'string') {
      const raw = typeof body === 'string' ? body : await readRaw(req);
      body = raw ? JSON.parse(raw) : {};
    }
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream_error', detail: String(e && e.message || e) });
  }
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
