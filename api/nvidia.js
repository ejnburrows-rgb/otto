// Vercel serverless proxy for the NVIDIA AI API (OpenAI-compatible).
//
// Every AI feature in the CRM comes through here: the assistant, the plain
// language summaries, the photo and document reading, and the drawing takeoff.
// Callers post an OpenAI-style chat body ({ messages, max_tokens, ... }). This
// function adds the NVIDIA API key from the NVIDIA_API_KEY environment variable
// (set once in the Vercel project settings) and forwards to NVIDIA's integrate
// endpoint, so the key never reaches the browser and the owner does nothing
// technical.
//
// If no key is configured it returns 503 so the client can fall back gracefully
// (local record search instead of a written answer, manual entry instead of a
// scan). The models can be overridden with the NVIDIA_MODEL and
// NVIDIA_VISION_MODEL environment variables.

import { requireServerAuth } from './_lib/serverAuth.js';

const NVIDIA_URL = process.env.NVIDIA_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'meta/llama-3.3-70b-instruct';
// Reading a photo needs a vision model, so the server picks one when the request
// carries an image. Keeping both names here rather than in the browser means
// swapping models is a project-settings change, not a deploy.
const DEFAULT_VISION_MODEL = 'meta/llama-3.2-90b-vision-instruct';

// True when any message carries an OpenAI-style image part.
function hasImagePart(body) {
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  return messages.some((m) => Array.isArray(m && m.content)
    && m.content.some((part) => part && part.type === 'image_url'));
}

// Only authenticated owner/office accounts may reach the provider.
export default async function handler(req, res) {
  const identity = await requireServerAuth(req, res, { roles: ['owner', 'office'] });
  if (!identity) return;
  return nvidiaHandler(req, res);
}

// The proxy logic remains separate so provider behavior stays fully testable.
export async function nvidiaHandler(req, res) {
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
    if (!body.model) {
      body.model = hasImagePart(body)
        ? (process.env.NVIDIA_VISION_MODEL || DEFAULT_VISION_MODEL)
        : (process.env.NVIDIA_MODEL || DEFAULT_MODEL);
    }
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
