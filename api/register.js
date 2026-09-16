// First-run cloud account bootstrap for OTTO.
// This endpoint only claims the existing unbound owner profile. Once an owner
// auth identity is attached, public self-registration closes permanently.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(503).json({ error: 'auth_not_configured' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: 'valid_email_required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'password_too_short' });
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const profileResponse = await fetch(`${url}/rest/v1/users?select=id,auth_uid,data&order=id.asc`, { headers });
  if (!profileResponse.ok) {
    res.status(502).json({ error: 'profile_lookup_failed' });
    return;
  }
  const profiles = await profileResponse.json();
  const activeOwners = profiles.filter(row => row?.data?.role === 'owner' && row?.data?.active !== false && row?.data?.deleted !== true);
  if (activeOwners.some(row => row.auth_uid)) {
    res.status(409).json({ error: 'owner_already_registered' });
    return;
  }

  const owner = activeOwners.find(row => row.id === 'owner-2') || activeOwners[0];
  if (!owner) {
    res.status(409).json({ error: 'owner_profile_missing' });
    return;
  }

  const create = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: owner.data?.name || 'OTTO Owner', otto_profile_id: owner.id },
    }),
  });
  if (!create.ok) {
    const detail = (await create.text()).slice(0, 300);
    res.status(create.status === 422 ? 409 : 502).json({ error: 'account_create_failed', detail });
    return;
  }
  const authUser = await create.json();
  if (!authUser?.id) {
    res.status(502).json({ error: 'account_create_failed' });
    return;
  }

  const profile = {
    ...(owner.data || {}),
    id: owner.id,
    email,
    active: true,
    updated: new Date().toISOString(),
  };
  const bind = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(owner.id)}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ auth_uid: authUser.id, data: profile, updated_at: new Date().toISOString() }),
  });
  if (!bind.ok) {
    // Avoid leaving an orphaned auth account if profile binding fails.
    await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(authUser.id)}`, { method: 'DELETE', headers }).catch(() => {});
    res.status(502).json({ error: 'profile_bind_failed' });
    return;
  }

  res.status(200).json({ ok: true, profileId: owner.id });
}
