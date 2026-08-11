// Starts the first-owner / returning-owner email sign-in. The endpoint never
// returns a credential: Supabase sends the link to the allowlisted address.
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowed = String(process.env.OWNER_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!url || !key || !allowed.length) { res.status(503).json({ error: 'owner_signin_not_configured' }); return; }

  let body = req.body;
  if (body == null || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }
  const email = String(body.email || '').trim().toLowerCase();
  const redirectTo = String(body.redirectTo || '');

  // Do not reveal whether an address is on the owner list.
  if (!email || !allowed.includes(email)) { res.status(200).json({ ok: true }); return; }

  try {
    const payload = { email, create_user: true };
    if (/^https:\/\//i.test(redirectTo)) payload.options = { email_redirect_to: redirectTo };
    const r = await fetch(`${url}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) { res.status(502).json({ error: 'email_link_failed' }); return; }
    res.status(200).json({ ok: true });
  } catch {
    res.status(502).json({ error: 'email_link_failed' });
  }
}
