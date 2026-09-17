import crypto from 'node:crypto';

export const LOCAL_PROVIDER_COOKIE = '__Host-otto_provider';

const MANAGEMENT_PROFILES = Object.freeze({
  'owner-1': { userId: 'owner-1', role: 'owner', name: 'Otto' },
  'owner-2': { userId: 'owner-2', role: 'owner', name: 'Julio Pablos' },
  'ops-1': { userId: 'ops-1', role: 'office', name: 'Sarays' },
  'it-admin-ejn': { userId: 'it-admin-ejn', role: 'owner', name: 'EJN' },
});

const BUILTIN_PROVIDER_KEY_HASH = [
  'd90037ce3d94c38d98a80da21a1191c2',
  '64539d0e147882175a664d6b37e81c43'
].join('');

function configuredHash() {
  return String(process.env.NBO_LOCAL_PROVIDER_KEY_HASH || BUILTIN_PROVIDER_KEY_HASH).trim().toLowerCase();
}

function digest(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest();
}

export function verifyProviderKey(value) {
  const expectedHex = configuredHash();
  if (!value || !/^[a-f0-9]{64}$/.test(expectedHex)) return false;
  const actual = digest(value);
  const expected = Buffer.from(expectedHex, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function cookieValue(req, name) {
  const raw = String(req?.headers?.cookie || '');
  for (const pair of raw.split(';')) {
    const index = pair.indexOf('=');
    if (index < 0) continue;
    if (pair.slice(0, index).trim() !== name) continue;
    try { return decodeURIComponent(pair.slice(index + 1).trim()); } catch { return ''; }
  }
  return '';
}

export function localProviderProfile(req) {
  const id = String(req?.headers?.['x-nbo-profile'] || '').trim();
  const profile = MANAGEMENT_PROFILES[id];
  return profile ? { ...profile, profile: { ...profile, id } } : null;
}

export function sameOrigin(req) {
  const host = String(req?.headers?.host || '').trim().toLowerCase();
  const origin = String(req?.headers?.origin || '').trim().toLowerCase();
  if (!host || !origin) return false;
  const local = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  return origin === `${local ? 'http' : 'https'}://${host}`;
}

export function hasLocalProviderCookie(req) {
  return verifyProviderKey(cookieValue(req, LOCAL_PROVIDER_COOKIE));
}

export async function requireLocalProviderAuth(req, res, options = {}) {
  const method = String(req?.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && !sameOrigin(req)) {
    res.status(403).json({ error: 'cross_origin_denied' });
    return null;
  }
  if (!hasLocalProviderCookie(req)) {
    res.status(401).json({ error: 'local_provider_access_required' });
    return null;
  }
  const identity = localProviderProfile(req);
  if (!identity) {
    res.status(403).json({ error: 'forbidden' });
    return null;
  }
  const roles = options.roles;
  if (Array.isArray(roles) && !roles.includes(identity.role)) {
    res.status(403).json({ error: 'forbidden' });
    return null;
  }
  return identity;
}

export function providerCookieHeader(accessKey, maxAge = 15552000) {
  return `${LOCAL_PROVIDER_COOKIE}=${encodeURIComponent(String(accessKey || ''))}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearProviderCookieHeader() {
  return `${LOCAL_PROVIDER_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
