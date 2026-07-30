// QuickBooks Online OAuth + sync stub for OTTO Plumbing CRM.
// Set QB_CLIENT_ID and QB_CLIENT_SECRET in Vercel env when ready to connect.
// Client calls GET /api/quickbooks?action=status or POST with { action: 'sync', kind, records }.
//
// The sync action moves real invoice/customer data to QuickBooks, so it is
// fail-closed until real server-side sign-in exists (see api/_lib/serverAuth.js).
// status/auth_url only report non-sensitive configuration state and stay open.

import { requireAuth } from './_lib/serverAuth.js';

const QB_AUTH = 'https://appcenter.intuit.com/connect/oauth2';
const QB_TOKEN = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

export default async function handler(req, res) {
  const clientId = process.env.QB_CLIENT_ID;
  const clientSecret = process.env.QB_CLIENT_SECRET;
  const configured = !!(clientId && clientSecret);

  if (req.method === 'GET') {
    const action = (req.query?.action || 'status');
    if (action === 'auth_url') {
      if (!configured) return res.status(503).json({ error: 'not_configured', message: 'Add QB_CLIENT_ID and QB_CLIENT_SECRET in Vercel.' });
      const redirect = process.env.QB_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/quickbooks?action=callback`;
      const url = `${QB_AUTH}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent('com.intuit.quickbooks.accounting')}&state=otto`;
      return res.status(200).json({ ok: true, authUrl: url });
    }
    return res.status(200).json({
      ok: true,
      configured,
      connected: !!process.env.QB_REFRESH_TOKEN,
      message: configured ? 'QuickBooks credentials found on server.' : 'QuickBooks not configured yet — add env vars in Vercel.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body = req.body;
  if (body == null || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const action = body.action || 'status';
  if (action === 'status') {
    return res.status(200).json({ ok: true, configured, connected: !!process.env.QB_REFRESH_TOKEN });
  }

  if (action === 'sync') {
    // Sync moves real invoice/customer data to QuickBooks — owner only, and
    // only after the server has verified who is asking. See api/_lib/serverAuth.js.
    const auth = await requireAuth(req, res, ['owner']);
    if (!auth) return;
    const { status, body: out } = runSync(configured, body);
    return res.status(status).json(out);
  }

  return res.status(400).json({ error: 'unknown_action' });
}

// The real sync logic, kept separate so it stays fully covered by tests even
// while the gate above refuses every live request.
export function runSync(configured, body) {
  if (!configured || !process.env.QB_REFRESH_TOKEN) {
    return { status: 503, body: { error: 'not_connected', message: 'Connect QuickBooks in Settings first.' } };
  }
  // Full two-way sync ships in a later pass; acknowledge payload for now.
  const count = Array.isArray(body.records) ? body.records.length : 0;
  return { status: 200, body: { ok: true, synced: count, kind: body.kind || 'invoices', note: 'Sync stub — wire Intuit API when credentials are live.' } };
}
