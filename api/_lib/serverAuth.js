// Who is calling? Answered by Supabase, never by us.
//
// WHY THIS FILE MATTERS MORE THAN ANY OTHER HERE: api/data.js holds the
// Supabase service-role key, which reads and writes every customer record and
// bypasses row-level security. api/photos.js mints signed photo links.
// api/claude.js and api/nvidia.js spend paid AI credit. api/notify.js sends real
// texts and emails to real customers. All six ask this file one question before
// they touch anything, and they do exactly what it says.
//
// ---------------------------------------------------------------------------
// READ THIS BEFORE CHANGING ANYTHING BELOW.
//
// 2026-07-31: someone hand-built sign-in here. It signed its own tokens with a
// placeholder secret committed to this repository, so anyone could forge one.
// Its companion route, api/login.js, took `userId` and `role` straight from the
// request body and returned the SMS code inside the very token it handed back —
// a JWT payload is base64, not encrypted. Either path minted an owner session
// with no credential of any kind, and that session unlocked the service-role
// key. Both were deleted, and this file was reduced to `return false` until a
// real identity system existed.
//
// This is that system, and the rules it was written under:
//
//   1. We do not issue tokens. Supabase Auth does.
//   2. We do not verify tokens ourselves — no jwt library, no secret, no
//      base64-decoding a payload and trusting it. The token goes to Supabase's
//      own /auth/v1/user endpoint and Supabase says yes or no.
//   3. There is no development fallback, no bypass flag, no "if unset, allow".
//      Every failure path returns null. Misconfiguration locks the door; it
//      never opens it.
//   4. The role is read from OUR users table, keyed by the Supabase user id.
//      It is never read from the request, and never from the token's metadata,
//      which a user can edit on their own account.
//
// scripts/test-server-auth.mjs enforces rules 1-3 and fails the build if they
// are broken again.
// ---------------------------------------------------------------------------

function config() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY };
}

/** Pull the bearer token off the request. No cookies, no query string — a token
 *  in a URL ends up in server logs and browser history. */
function bearerToken(req) {
  const header = (req && req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  return match ? match[1].trim() : null;
}

/** Ask Supabase who this token belongs to. A bad, expired, forged or
 *  wrong-project token gets a non-200 here and we stop. */
async function supabaseUser(token) {
  const { url, key } = config();
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: key },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user && user.id ? user : null;
}

/** Our own record for that person, which is where the role lives. A Supabase
 *  account with no matching row here is not a user of this app.
 *
 *  Every table in this database is `id` + a `data` jsonb blob, so the role and
 *  the name come out of `data`, not out of columns. `auth_uid` is the one real
 *  column added for this — indexed and unique, so two app users can never share
 *  a single Supabase account. */
async function appUser(authUid) {
  const { url, key } = config();
  const res = await fetch(`${url}/rest/v1/users?auth_uid=eq.${encodeURIComponent(authUid)}&select=id,data&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  const data = row && row.data;
  if (!data || data.deleted) return null;
  if (!['owner', 'office', 'field'].includes(data.role)) return null;
  return { id: row.id, name: data.name, role: data.role };
}

/**
 * The caller, or null. Null means refuse — there is no third answer.
 * @returns {Promise<{uid:string,id:string,name:string,role:'owner'|'office'|'field'}|null>}
 */
export async function getCaller(req) {
  try {
    const { url, key } = config();
    if (!url || !key) return null;                     // misconfigured: stay shut
    const token = bearerToken(req);
    if (!token) return null;
    const authed = await supabaseUser(token);
    if (!authed) return null;
    const row = await appUser(authed.id);
    if (!row) return null;
    return { uid: authed.id, id: row.id, name: row.name, role: row.role };
  } catch {
    return null;                                       // any error: stay shut
  }
}

/** Kept so the six routes read the same as they always did. */
export async function hasServerAuth(req) {
  return (await getCaller(req)) !== null;
}

export function denyUnauthenticated(res, message) {
  res.status(403).json({
    error: 'not_authorized',
    message: message || 'Sign in again from the link your manager sent you. No data was read or changed.',
  });
}

/**
 * The one line each route uses. Returns the caller, or sends 403 and returns
 * null, so a route that forgets to check gets `null.role` and crashes rather
 * than quietly serving an anonymous request.
 */
export async function requireCaller(req, res, allowedRoles) {
  const caller = await getCaller(req);
  if (!caller) { denyUnauthenticated(res); return null; }
  if (allowedRoles && !allowedRoles.includes(caller.role)) {
    denyUnauthenticated(res, 'Your account does not have access to this.');
    return null;
  }
  return caller;
}
