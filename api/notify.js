// Customer SMS + email notifications stub for OTTO Plumbing CRM.
// Env: TWILIO_SID, TWILIO_AUTH, TWILIO_FROM, SENDGRID_API_KEY (or SMTP_* later).
// POST { channel: 'sms'|'email', to, subject?, body, trigger?, customerId?, jobId? }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!req.headers['x-user-id']) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing x-user-id header' });
  }

  let body = req.body;
  if (body == null || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const channel = body.channel || 'sms';
  const twilioReady = !!(process.env.TWILIO_SID && process.env.TWILIO_AUTH && process.env.TWILIO_FROM);
  const emailReady = !!process.env.SENDGRID_API_KEY;

  if (channel === 'sms') {
    if (!twilioReady) {
      return res.status(503).json({
        error: 'sms_not_configured',
        message: 'Add TWILIO_SID, TWILIO_AUTH, and TWILIO_FROM in Vercel to send texts.',
        preview: { to: body.to, body: body.body },
      });
    }
    try {
      const auth = Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_AUTH}`).toString('base64');
      const params = new URLSearchParams({ To: body.to, From: process.env.TWILIO_FROM, Body: body.body || '' });
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: 'twilio_error', detail: data });
      return res.status(200).json({ ok: true, sid: data.sid });
    } catch (e) {
      return res.status(500).json({ error: 'twilio_failed', message: String(e.message || e) });
    }
  }

  if (channel === 'email') {
    if (!emailReady) {
      return res.status(503).json({
        error: 'email_not_configured',
        message: 'Add SENDGRID_API_KEY in Vercel to send emails.',
        preview: { to: body.to, subject: body.subject, body: body.body },
      });
    }
    try {
      const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: body.to }] }],
          from: { email: process.env.SENDGRID_FROM || 'otto@example.com', name: 'OTTO Plumbing' },
          subject: body.subject || 'OTTO Plumbing',
          content: [{ type: 'text/plain', value: body.body || '' }],
        }),
      });
      if (!r.ok) {
        const detail = await r.text();
        return res.status(r.status).json({ error: 'sendgrid_error', detail });
      }
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'email_failed', message: String(e.message || e) });
    }
  }

  return res.status(400).json({ error: 'unknown_channel' });
}