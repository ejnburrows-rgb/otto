// Provider-backed identity gate for OTTO server routes.
// Supabase Auth issues and verifies sessions. OTTO never signs its own tokens.

function config() {
  return {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ownerEmails: String(process.env.OWNER_EMAILS || '')
      .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  };
}

function bearerToken(req) {
  const header = (req && req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  return match ? match[1].trim() : null;
}

async function supabaseUser(token) {
  const { url, key } = config();
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: key },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user && user.id ? user : null;
}

async function appUser(authUid) {
  const { url, key } = config();
  const res = await fetch(`${url}/rest/v1/users?auth_uid=eq.${encodeURIComponent(authUid)}&select=id,data&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  const data = row && row.data;
  if (!data || data.deleted || !['owner', 'office', 'field'].includes(data.role)) return null;
  return { id: row.id, name: data.name, role: data.role };
}

async function bindBootstrapOwner(authed) {
  const { url, key, ownerEmails } = config();
  const email = String(authed.email || '').toLowerCase();
  if (!email || !ownerEmails.includes(email)) return null;
  if (!authed.email_confirmed_at && !authed.confirmed_at) return null;

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const res = await fetch(`${url}/rest/v1/users?select=id,data,auth_uid&limit=200`, { headers });
  if (!res.ok) return null;
  const rows = await res.json();
  const owners = (Array.isArray(rows) ? rows : []).filter((r) => r.data && r.data.role === 'owner' && !r.data.deleted);
  const target = owners.find((r) => String((r.data.email || '')).toLowerCase() === email)
    || owners.find((r) => !r.auth_uid);
  if (!target) return null;

  const patch = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(target.id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ auth_uid: authed.id, data: { ...target.data, email } }),
  });
  if (!patch.ok) return null;
  return { id: target.id, name: target.data.name, role: 'owner' };
}

export async function getCaller(req) {
  try {
    const { url, key } = config();
    if (!url || !key) return null;
    const token = bearerToken(req);
    if (!token) return null;
    const authed = await supabaseUser(token);
    if (!authed) return null;
    let row = await appUser(authed.id);
    if (!row) row = await bindBootstrapOwner(authed);
    if (!row) return null;
    return { uid: authed.id, id: row.id, name: row.name, role: row.role };
  } catch {
    return null;
  }
}

export async function hasServerAuth(req) {
  return (await getCaller(req)) !== null;
}

export function denyUnauthenticated(res, message) {
  res.status(403).json({
    error: 'not_authorized',
    message: message || 'Sign in again. No data was read or changed.',
  });
}

export async function requireCaller(req, res, allowedRoles) {
  const caller = await getCaller(req);
  if (!caller) { denyUnauthenticated(res); return null; }
  if (allowedRoles && !allowedRoles.includes(caller.role)) {
    denyUnauthenticated(res, 'Your account does not have access to this.');
    return null;
  }
  return caller;
}
