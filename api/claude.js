// Vercel serverless proxy for the Claude (Anthropic) API.
import { requireCaller } from './_lib/serverAuth.js';

export default async function handler(req, res) {
  const caller = await requireCaller(req, res, ['owner', 'office', 'field']);
  if (!caller) return;
  return claudeHandler(req, res);
}

export async function claudeHandler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(503).json({ error: 'no_server_key' }); return; }
  try {
    let body = req.body;
    if (body == null || typeof body === 'string') {
      const raw = typeof body === 'string' ? body : await readRaw(req);
      body = raw ? JSON.parse(raw) : {};
    }
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
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
