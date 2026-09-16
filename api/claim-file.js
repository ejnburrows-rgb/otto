// Authenticated relay for PDFs submitted through the public OTTO website.
// Website intake stores the file in the private job-photos bucket and records
// its exact storage path on the matching CRM alert/call. Only owner/office
// accounts may open these unassigned public-intake attachments.

import { requireServerAuth } from './_lib/serverAuth.js';

const BUCKET = 'job-photos';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const identity = await requireServerAuth(req, res, { roles: ['owner', 'office'] });
  if (!identity) return;

  const alertId = String((req.query && req.query.alertId) || '').trim();
  if (!/^web_[A-Za-z0-9_-]{6,120}$/.test(alertId)) {
    res.status(400).json({ error: 'invalid_alert_id' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(503).json({ error: 'no_server_key' });
    return;
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    const lookup = await fetch(
      `${url}/rest/v1/alerts?id=eq.${encodeURIComponent(alertId)}&select=data&limit=1`,
      { headers }
    );
    if (!lookup.ok) {
      res.status(502).json({ error: 'alert_lookup_failed' });
      return;
    }
    const rows = await lookup.json();
    const record = rows[0] && rows[0].data;
    const path = String(record && record.claimPdfPath || '').trim();
    const fromWebsite = record && (record.requestSource === 'otto-plumbing-site' || record.source === 'otto-plumbing-site');
    if (!record || !fromWebsite || !path || !path.startsWith('website-requests/')) {
      res.status(404).json({ error: 'claim_file_not_found' });
      return;
    }

    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const sign = await fetch(`${url}/storage/v1/object/sign/${BUCKET}/${encodedPath}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (!sign.ok) {
      res.status(sign.status === 404 ? 404 : 502).json({ error: 'claim_file_sign_failed' });
      return;
    }
    const body = await sign.json();
    const signed = body.signedURL || body.signedUrl || (body.data && body.data.signedURL);
    if (!signed) {
      res.status(502).json({ error: 'claim_file_sign_failed' });
      return;
    }
    const absolute = /^https?:\/\//i.test(signed)
      ? signed
      : `${url}/storage/v1${signed.startsWith('/') ? signed : '/' + signed}`;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', absolute);
    res.status(302).end();
  } catch (error) {
    res.status(500).json({ error: 'claim_file_error', detail: String(error && error.message || error).slice(0, 180) });
  }
}
