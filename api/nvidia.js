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

/* The limits below exist because this endpoint spends real money on someone
   else's API key. Every one of them is decided here rather than accepted from
   the caller: a browser that can name its own model, ask for unlimited output
   or retry without pause turns an authenticated account into an open bill. */
function textModel() { return process.env.NVIDIA_MODEL || DEFAULT_MODEL; }
function visionModel() { return process.env.NVIDIA_VISION_MODEL || DEFAULT_VISION_MODEL; }
const MAX_INPUT_CHARS = Number(process.env.NVIDIA_MAX_INPUT_CHARS || 120000);
const MAX_OUTPUT_TOKENS = Number(process.env.NVIDIA_MAX_OUTPUT_TOKENS || 1500);
const TIMEOUT_MS = Number(process.env.NVIDIA_TIMEOUT_MS || 45000);
const RATE_LIMIT_MAX = Number(process.env.NVIDIA_RATE_LIMIT_MAX || 20);
const RATE_LIMIT_WINDOW_MS = Number(process.env.NVIDIA_RATE_LIMIT_WINDOW_MS || 60000);

/* Per-user rate limiting, keyed by OTTO user id rather than IP so that one
   account cannot multiply itself across networks. This lives in module memory,
   which on a serverless platform means per warm instance: it throttles a
   runaway client without pretending to be a distributed quota. */
const hits = new Map();
function rateLimited(userId) {
  const now = Date.now();
  const recent = (hits.get(userId) || []).filter((at) => now - at < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(userId, recent);
    return Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(userId, recent);
  if (hits.size > 500) for (const [key, at] of hits) if (!at.length || now - at[at.length - 1] > RATE_LIMIT_WINDOW_MS) hits.delete(key);
  return 0;
}

// Total characters of prompt text, images included as their encoded length.
function inputSize(messages) {
  let total = 0;
  for (const message of messages) {
    const content = message && message.content;
    if (typeof content === 'string') total += content.length;
    else if (Array.isArray(content)) {
      for (const part of content) {
        if (!part) continue;
        if (typeof part.text === 'string') total += part.text.length;
        if (part.image_url && typeof part.image_url.url === 'string') total += part.image_url.url.length;
      }
    }
  }
  return total;
}

/* Rebuild the upstream request from known-good fields instead of forwarding the
   caller's object. Anything not named here — a model, a tool definition, a
   stream flag, a provider-specific escape hatch — simply does not survive. */
function safeBody(body) {
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  const model = hasImagePart(body) ? visionModel() : textModel();
  const requested = Number(body && body.max_tokens);
  const max_tokens = Number.isFinite(requested) && requested > 0
    ? Math.min(Math.floor(requested), MAX_OUTPUT_TOKENS)
    : MAX_OUTPUT_TOKENS;
  const out = { model, messages, max_tokens, stream: false };
  const temperature = Number(body && body.temperature);
  if (Number.isFinite(temperature)) out.temperature = Math.min(Math.max(temperature, 0), 2);
  if (typeof body?.system === 'string' && body.system) out.messages = [{ role: 'system', content: body.system }, ...messages];
  return out;
}

// True when any message carries an OpenAI-style image part.
function hasImagePart(body) {
  const messages = Array.isArray(body && body.messages) ? body.messages : [];
  return messages.some((m) => Array.isArray(m && m.content)
    && m.content.some((part) => part && part.type === 'image_url'));
}

// Only authenticated owner/office accounts may reach the provider.
export default async function handler(req, res) {
  // Authorization happens before anything is parsed, counted or forwarded, so an
  // unauthorized caller never reaches the provider or the rate-limit table.
  const identity = await requireServerAuth(req, res, { roles: ['owner', 'office'] });
  if (!identity) return;
  return nvidiaHandler(req, res, identity);
}

// The proxy logic remains separate so provider behavior stays fully testable.
export async function nvidiaHandler(req, res, identity) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const key = process.env.NVIDIA_API_KEY;
  if (!key) {
    res.status(503).json({ error: 'no_server_key' });
    return;
  }

  const retryAfter = rateLimited((identity && identity.userId) || 'anonymous');
  if (retryAfter) {
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'rate_limited',
      message: `Too many assistant requests. Try again in ${retryAfter} seconds.`,
    });
    return;
  }

  let body;
  try {
    // req.body is auto-parsed for application/json; fall back to a raw read.
    body = req.body;
    if (body == null || typeof body === 'string') {
      const raw = typeof body === 'string' ? body : await readRaw(req);
      body = raw ? JSON.parse(raw) : {};
    }
  } catch (e) {
    res.status(400).json({ error: 'invalid_json' });
    return;
  }

  const upstreamBody = safeBody(body);
  const size = inputSize(upstreamBody.messages);
  if (size > MAX_INPUT_CHARS) {
    res.status(413).json({
      error: 'input_too_large',
      message: `That request is too large to send (${size} of ${MAX_INPUT_CHARS} characters).`,
    });
    return;
  }

  // A provider that never answers must not hold the function open until the
  // platform kills it, because that failure reaches the owner as a blank screen
  // rather than as a message.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(NVIDIA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'Accept': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
      signal: abort.signal,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json');
    res.send(text);
  } catch (e) {
    if (e && e.name === 'AbortError') {
      res.status(504).json({
        error: 'upstream_timeout',
        message: 'The assistant provider did not respond in time. Try again.',
      });
      return;
    }
    /* Only the failure class is reported. The message being answered is the
       owner's business data, and an error string is the easiest place for it to
       end up in a log it was never meant to reach. */
    res.status(502).json({ error: 'upstream_error' });
  } finally {
    clearTimeout(timer);
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
