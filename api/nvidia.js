// Vercel serverless proxy for the NVIDIA AI API (OpenAI-compatible).
//
// The OTTO Plumbing CRM drawing/estimating assistant posts POST /api/nvidia
// with an OpenAI-style chat body ({ messages, max_tokens, ... }). This function
// adds the NVIDIA API key from the NVIDIA_API_KEY environment variable (set once
// in the Vercel project settings) and forwards to NVIDIA's integrate endpoint,
// so the key never reaches the browser and the owner does nothing technical.
//
// If no key is configured it returns 503 so the client can fall back gracefully
// (let the owner type the estimate by hand). The default model can be overridden
// with the NVIDIA_MODEL environment variable.

const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'meta/llama-3.3-70b-instruct';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'no_server_key' });
    return;
  }
  try {
    // req.body is auto-parsed for application/json; fall back to a raw read.
    let body = req.body;
    if (body == null || typeof body === 'string') {
      const raw = typeof body === 'string' ? body : await readRaw(req);
      body = raw ? JSON.parse(raw) : {};
    }
    if (!body.model) body.model = process.env.NVIDIA_MODEL || DEFAULT_MODEL;
    if (body.stream) body.stream = false; // proxy returns a single JSON response

    const upstream = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'Accept': 'application/json',
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
