import {
  clearProviderCookieHeader,
  localProviderProfile,
  providerCookieHeader,
  sameOrigin,
  verifyProviderKey,
} from './_lib/localProviderAuth.js';

const attempts = new Map();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 15 * 60 * 1000;

function clientKey(req) {
  return String(req?.headers?.['x-forwarded-for'] || req?.headers?.['x-real-ip'] || 'local')
    .split(',')[0].trim().slice(0, 120);
}

function limited(req) {
  const key = clientKey(req);
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(key, recent);
    return true;
  }
  recent.push(now);
  attempts.set(key, recent);
  return false;
}

function clearAttempts(req) {
  attempts.delete(clientKey(req));
}

function parsedBody(req) {
  if (req?.body && typeof req.body === 'object') return req.body;
  if (typeof req?.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    if (!sameOrigin(req)) return res.status(403).json({ error: 'cross_origin_denied' });
    res.setHeader('Set-Cookie', clearProviderCookieHeader());
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  if (!sameOrigin(req)) return res.status(403).json({ error: 'cross_origin_denied' });

  const profile = localProviderProfile(req);
  if (!profile || !['owner', 'office'].includes(profile.role)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  if (limited(req)) return res.status(429).json({ error: 'too_many_attempts' });

  const body = parsedBody(req);
  const accessKey = String(body.accessKey || '');
  if (!verifyProviderKey(accessKey)) {
    return res.status(401).json({ error: 'invalid_access_key' });
  }

  clearAttempts(req);
  res.setHeader('Set-Cookie', providerCookieHeader(accessKey));
  return res.status(200).json({ ok: true, profile: { id: profile.userId, role: profile.role } });
}
