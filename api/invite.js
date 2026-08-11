// Owner-only worker access links. Supabase creates the one-time credential;
// OTTO does not mint or sign authentication tokens.
import { requireCaller } from './_lib/serverAuth.js';

export function internalEmail(userId) {
  return `${String(userId).toLowerCase().replace(/[^a-z0-9-]/g, '')}@otto.local`;
}

const admin = (path, init = {}) => fetch(`${process.env.SUPABASE_URL}${path}`, {
  ...init,
  headers: {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  },
});

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

export default async function handler(req, res) {
  const caller = await requireCaller(req, res, ['owner']);
  if (!caller) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(503).json({ error: 'no_server_key' }); return;
  }

  const { userId, redirectTo } = await readBody(req);
  if (!userId || typeof userId !== 'string') { res.status(400).json({ error: 'missing_user' }); return; }

  try {
    const lookup = await admin(`/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=id,data,auth_uid&limit=1`);
    const rows = lookup.ok ? await lookup.json() : [];
    const row = Array.isArray(rows) ? rows[0] : null;
    const person = row && row.data ? { id: row.id, ...row.data, auth_uid: row.auth_uid } : null;
    if (!person || person.deleted || !['field', 'office'].includes(person.role)) {
      res.status(404).json({ error: 'no_such_user' }); return;
    }

    const email = internalEmail(person.id);
    let authUid = person.auth_uid || null;

    if (!authUid) {
      const created = await admin('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, email_confirm: true }),
      });
      if (created.ok) {
        authUid = (await created.json()).id || null;
      } else {
        const found = await admin(`/auth/v1/admin/users?filter=${encodeURIComponent(email)}`);
        if (found.ok) {
          const body = await found.json();
          const list = body.users || body || [];
          const hit = Array.isArray(list) ? list.find((u) => u.email === email) : null;
          authUid = hit ? hit.id : null;
        }
      }
    }

    if (!authUid) { res.status(502).json({ error: 'account_failed' }); return; }

    if (!person.auth_uid) {
      const linked = await admin(`/rest/v1/users?id=eq.${encodeURIComponent(person.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ auth_uid: authUid }),
      });
      if (!linked.ok) { res.status(502).json({ error: 'account_link_failed' }); return; }
    }

    const options = redirectTo && /^https:\/\//i.test(String(redirectTo))
      ? { redirect_to: String(redirectTo) }
      : undefined;
    const linkRes = await admin('/auth/v1/admin/generate_link', {
      method: 'POST',
      body: JSON.stringify({ type: 'magiclink', email, options }),
    });
    if (!linkRes.ok) { res.status(502).json({ error: 'link_failed' }); return; }
    const link = await linkRes.json();
    const url = link.action_link || (link.properties && link.properties.action_link);
    if (!url) { res.status(502).json({ error: 'link_failed' }); return; }

    res.status(200).json({ ok: true, name: person.name, url });
  } catch (e) {
    res.status(500).json({ error: 'invite_failed', detail: String((e && e.message) || e).slice(0, 160) });
  }
}
