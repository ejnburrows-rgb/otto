// Shared server-side authentication and authorization gate for sensitive endpoints.
// Supabase Auth proves identity. OTTO's own users table then proves that identity
// is mapped to an active application user. Provider user_metadata is never trusted
// for authorization.
function bearerToken(req) {
  const raw = req?.headers?.authorization || req?.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return match ? match[1].trim() : '';
}

export async function getServerAuth(req) {
  const token = bearerToken(req);
  const url = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token || !url || !apiKey || !serviceKey) return null;
  const base = url.replace(/\/$/, '');
  try {
    const response = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const authUser = await response.json();
    if (!authUser?.id) return null;

    // The Auth UUID is stored server-side in the application record as authUserId.
    // Never authorize from user-editable Supabase user_metadata.
    const lookup = await fetch(`${base}/rest/v1/users?select=data&data-%3E%3EauthUserId=eq.${encodeURIComponent(authUser.id)}&limit=1`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!lookup.ok) return null;
    const rows = await lookup.json();
    const appUser = rows?.[0]?.data;
    if (!appUser?.id || appUser.disabled === true) return null;
    return { authUser, appUser, role: appUser.role };
  } catch {
    return null;
  }
}

export async function hasServerAuth(req) {
  return Boolean(await getServerAuth(req));
}

export function denyUnauthenticated(res) {
  res.status(401).json({ error: 'unauthorized', message: 'A valid OTTO sign-in is required.' });
}
