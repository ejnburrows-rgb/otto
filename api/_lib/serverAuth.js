// Shared server-side identity + role gate for sensitive endpoints.
//
// WHY THIS EXISTS: api/data.js, api/photos.js, api/claude.js, api/nvidia.js,
// api/notify.js, and the QuickBooks sync action in api/quickbooks.js all run
// with secret server-side keys (Supabase service-role, Anthropic, NVIDIA,
// Twilio/SendGrid, QuickBooks). A secret key on the server is only safe if the
// route holding it also knows WHO is calling. This module is that check.
//
// HOW IT WORKS (no hand-built authentication — Supabase Auth is the identity
// provider; this file only verifies what Supabase already issued):
//   1. The browser signs in with Supabase Auth (email + password) and sends
//      the resulting access token as "Authorization: Bearer <token>".
//   2. requireAuth asks Supabase Auth (GET /auth/v1/user) whether the token is
//      genuine. The service-role key is used as the apikey for that call; it
//      never leaves the server.
//   3. The caller's role (owner / office / field) is read from the
//      "user_roles" table — server-side data, created by
//      supabase/migrations/0002_user_roles.sql, locked to the public exactly
//      like every other table.
//
// REFUSAL MATRIX (always fail closed — a doubt is a refusal):
//   401 unauthenticated            — no token, malformed header, or Supabase
//                                    rejected the token
//   403 server_auth_not_configured — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//                                    missing, so no verification is possible
//   403 forbidden_role             — genuine user with no role row, or a role
//                                    not allowed on this route
//
// Every refusal happens BEFORE the route touches Supabase data, Anthropic,
// NVIDIA, Twilio, SendGrid, or QuickBooks, and every refusal body is a small
// machine-readable error — never customer data, signed URLs, provider
// replies, or message previews.

const ROLES = ['owner', 'office', 'field'];

export function denyUnauthenticated(res) {
  res.status(401).json({
    error: 'unauthenticated',
    message: 'Sign in first. No data was read or changed.',
  });
}

export function denyNotConfigured(res) {
  res.status(403).json({
    error: 'server_auth_not_configured',
    message: 'This server route is disabled until server sign-in is configured. No data was read or changed.',
  });
}

export function denyForbidden(res) {
  res.status(403).json({
    error: 'forbidden_role',
    message: 'Your account does not have permission for this. No data was read or changed.',
  });
}

function bearerToken(req) {
  const h = (req && req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/* Verify the caller and (optionally) their role. Returns
   { userId, email, role } on success, or null after sending the refusal.
   allowedRoles: array of roles permitted on this route; omit to allow any
   verified user who has a role row. */
export async function requireAuth(req, res, allowedRoles) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { denyNotConfigured(res); return null; }

  const token = bearerToken(req);
  if (!token) { denyUnauthenticated(res); return null; }

  const serviceHeaders = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  // 1. Is this token genuine? Ask Supabase Auth. The service-role key is the
  //    apikey; the user's token is the bearer being checked.
  let userId = null, email = null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) { denyUnauthenticated(res); return null; }
    const u = await r.json();
    userId = u && u.id;
    email = (u && u.email) || null;
  } catch (e) { denyUnauthenticated(res); return null; }
  if (!userId) { denyUnauthenticated(res); return null; }

  // 2. What is this user allowed to do? Read the server-side role table.
  let role = null;
  try {
    const r = await fetch(`${url}/rest/v1/user_roles?user_id=eq.${encodeURIComponent(userId)}&select=role`, { headers: serviceHeaders });
    if (!r.ok) { denyForbidden(res); return null; }
    const rows = await r.json();
    role = Array.isArray(rows) && rows[0] && rows[0].role;
  } catch (e) { denyForbidden(res); return null; }
  if (!ROLES.includes(role)) { denyForbidden(res); return null; }
  if (Array.isArray(allowedRoles) && allowedRoles.length && !allowedRoles.includes(role)) { denyForbidden(res); return null; }

  return { userId, email, role };
}
