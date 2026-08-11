import { requireServerAuth } from './_lib/serverAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const identity = await requireServerAuth(req, res, { roles: ['owner', 'office'] });
  if (!identity) return;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(503).json({ error: 'auth_not_configured' });
    return;
  }
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const email = String(body.email || '').trim().toLowerCase();
  const userId = String(body.userId || '').trim();
  if (!userId || !/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: 'valid_user_and_email_required' });
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const existing = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,data`, { headers });
  const rows = existing.ok ? await existing.json() : [];
  if (!rows.length) {
    res.status(404).json({ error: 'employee_not_found' });
    return;
  }
  const profile = { ...(rows[0].data || {}), id: userId, email, active: rows[0].data?.active !== false, updated: new Date().toISOString() };
  const save = await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ data: profile, updated_at: new Date().toISOString() }),
  });
  if (!save.ok) {
    res.status(502).json({ error: 'profile_update_failed' });
    return;
  }

  const redirectTo = process.env.OTTO_APP_URL || 'https://otto-kohl.vercel.app';
  const invite = await fetch(`${url}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST', headers, body: JSON.stringify({ email }),
  });
  if (!invite.ok) {
    const detail = (await invite.text()).slice(0, 240);
    // The email is still safely allowlisted. An existing Supabase user can use
    // the normal magic-link screen and will be bound on first sign-in.
    if (invite.status === 422 || invite.status === 409) {
      res.status(200).json({ ok: true, invited: false, existing: true });
      return;
    }
    res.status(502).json({ error: 'invite_failed', detail });
    return;
  }
  const invited = await invite.json();
  if (invited && invited.id) {
    await fetch(`${url}/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ auth_uid: invited.id, updated_at: new Date().toISOString() }),
    });
  }
  res.status(200).json({ ok: true, invited: true });
}
