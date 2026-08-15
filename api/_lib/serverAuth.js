// Supabase-backed identity and OTTO business-role authorization.
// The browser presents a Supabase access token. Supabase validates that token;
// OTTO then reads the caller's role from the server-controlled users table.

const PUBLIC_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_xOJK14-CGJWKdy7W_bulEQ_hciST-Bb';

function bearer(req) {
  const value = req && req.headers && (req.headers.authorization || req.headers.Authorization);
  const match = typeof value === 'string' && value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function serviceHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

async function fetchBusinessUsers(url) {
  const response = await fetch(`${url}/rest/v1/users?select=id,auth_uid,data`, {
    headers: serviceHeaders(),
  });
  if (!response.ok) return [];
  return response.json();
}

// A profile may act only when it exists, has not been deleted or deactivated,
// and carries a role OTTO recognizes. This is checked before the account is
// relinked as well as after, so a disabled or deleted profile is never rebound
// to a new provider identity on its way to being refused.
const ROLES = ['owner', 'office', 'field'];
function usableProfile(row) {
  const profile = row && row.data;
  if (!profile) return null;
  if (profile.deleted === true || profile.active === false) return null;
  if (!ROLES.includes(profile.role)) return null;
  return profile;
}

export async function getServerIdentity(req) {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = bearer(req);
  if (!url || !serviceKey || !PUBLIC_KEY || !token) return null;

  // Provider verification: OTTO never signs or verifies its own JWTs.
  const authResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: PUBLIC_KEY, Authorization: `Bearer ${token}` },
  });
  if (!authResponse.ok) return null;
  const authUser = await authResponse.json();
  if (!authUser || !authUser.id || !authUser.email) return null;

  const rows = await fetchBusinessUsers(url);
  let row = rows.find((candidate) => candidate.auth_uid === authUser.id);

  // A verified email may claim exactly one pre-authorized OTTO profile. This
  // makes invitations/magic links usable without trusting editable metadata.
  //
  // The email match deliberately ignores whatever auth_uid is already stored.
  // Requiring auth_uid to be null locked an accepted employee out for good the
  // moment their provider identity changed — a deleted-and-recreated Supabase
  // user gets a new uid, so the uid lookup missed and the email lookup was
  // skipped, and the only way back in was a duplicate employee record. The
  // profile's email is server-controlled (only an owner can set it) and the
  // provider has verified the caller owns that mailbox, so re-pointing the row
  // at the identity that just authenticated resolves the SAME OTTO profile and
  // role instead of minting a second one. "Exactly one match" still holds, so
  // an ambiguous address can never claim a profile.
  if (!row) {
    const email = String(authUser.email).trim().toLowerCase();
    // Otto, Julio and Sarays are real profiles that carry no sign-in email yet.
    // A blank address must never be a join key, or the first caller with an
    // empty-looking email would claim one of them.
    const matches = email ? rows.filter((candidate) => {
      const stored = candidate && candidate.data && String(candidate.data.email || '').trim().toLowerCase();
      return stored && stored === email;
    }) : [];
    // Exactly one, counted across every profile: an address held by two rows is
    // ambiguous and claims neither, even if only one of them could be used.
    if (matches.length === 1 && usableProfile(matches[0])) {
      const candidate = matches[0];
      const bind = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(candidate.id)}`, {
        method: 'PATCH',
        headers: { ...serviceHeaders(), Prefer: 'return=representation' },
        body: JSON.stringify({ auth_uid: authUser.id, updated_at: new Date().toISOString() }),
      });
      if (bind.ok) row = { ...candidate, auth_uid: authUser.id };
    }
  }

  const profile = usableProfile(row);
  if (!profile) return null;
  const role = profile.role;
  return {
    authUserId: authUser.id,
    email: authUser.email,
    userId: row.id,
    role,
    profile: { ...profile, id: row.id, email: profile.email || authUser.email },
  };
}

export async function hasServerAuth(req) {
  return !!(await getServerIdentity(req));
}

export async function requireServerAuth(req, res, options = {}) {
  const identity = await getServerIdentity(req);
  if (!identity) {
    denyUnauthenticated(res);
    return null;
  }
  const roles = options.roles;
  if (Array.isArray(roles) && !roles.includes(identity.role)) {
    res.status(403).json({ error: 'forbidden', message: 'This account does not have access to that action.' });
    return null;
  }
  return identity;
}

export function denyUnauthenticated(res) {
  res.status(401).json({
    error: 'authentication_required',
    message: 'Sign in with an authorized OTTO account to continue.',
  });
}
