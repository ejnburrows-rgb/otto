// Shared server-side authentication gate for sensitive endpoints.
// Supabase Auth is the identity provider. We do not mint or verify our own tokens.
// A caller must present a Supabase access token in Authorization: Bearer <token>.
// The token is verified by this project's Supabase Auth server before any
// service-role database key or third-party provider is touched.

function bearerToken(req) {
  const raw = req?.headers?.authorization || req?.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  return match ? match[1].trim() : '';
}

export async function getServerAuth(req) {
  const token = bearerToken(req);
  const url = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !apiKey) return null;

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (!user?.id) return null;
    return { user };
  } catch {
    return null;
  }
}

// Backward-compatible name used by route modules. This is intentionally async;
// route handlers must await it before touching any protected provider.
export async function hasServerAuth(req) {
  return Boolean(await getServerAuth(req));
}

export function denyUnauthenticated(res) {
  res.status(401).json({
    error: 'unauthorized',
    message: 'A valid signed-in Supabase session is required.',
  });
}
