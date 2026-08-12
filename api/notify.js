// Customer SMS + SendGrid email delivery for OTTO Plumbing CRM.
// POST { channel: 'sms'|'email', to, subject?, body, html?, replyTo?, cc?,
//        inReplyTo?, references?, attachments?: [{ filename, type, content }] }

import { requireServerAuth } from './_lib/serverAuth.js';

// Only authenticated owner/office accounts may reach Twilio or SendGrid.
export default async function handler(req, res) {
  const identity = await requireServerAuth(req, res, { roles: ['owner', 'office'] });
  if (!identity) return;
  if (req.method === 'GET') return integrationStatus(res);
  return notifyHandler(req, res);
}

async function integrationStatus(res) {
  const sendingConfigured = !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM);
  const inboundConfigured = !!process.env.INBOUND_WEBHOOK_TOKEN;
  let lastInboundAt = null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      const r = await fetch(`${url}/rest/v1/emails?select=data&order=updated_at.desc&limit=50`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (r.ok) {
        const rows = await r.json();
        const inbound = rows.map(row => row.data).find(email => email && email.direction !== 'outgoing');
        lastInboundAt = inbound && (inbound.date || inbound.created) || null;
      }
    } catch (_) { /* status remains useful even if the history check fails */ }
  }
  return res.status(200).json({ sendingConfigured, inboundConfigured, lastInboundAt });
}

// The send logic remains separate so provider behavior stays fully testable.
export async function notifyHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body = req.body;
  if (body == null || typeof body === 'string') {
    try { body = JSON.parse(body || '{}'); } catch { body = {}; }
  }

  const channel = body.channel || 'sms';
  const twilioReady = !!(process.env.TWILIO_SID && process.env.TWILIO_AUTH && process.env.TWILIO_FROM);
  const emailReady = !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM);

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
        message: 'Add SENDGRID_API_KEY and a verified SENDGRID_FROM address in Vercel to send email.',
        preview: { to: body.to, subject: body.subject, body: body.body },
      });
    }
    try {
      const to = addressList(body.to);
      const cc = addressList(body.cc);
      if (!to.length) return res.status(400).json({ error: 'valid_recipient_required' });
      const attachments = normalizeAttachments(body.attachments);
      if (attachments.error) return res.status(400).json({ error: attachments.error });
      const personalization = { to };
      if (cc.length) personalization.cc = cc;
      const headers = {};
      if (body.inReplyTo) headers['In-Reply-To'] = cleanHeader(body.inReplyTo);
      if (body.references) headers.References = cleanHeader(body.references);
      if (Object.keys(headers).length) personalization.headers = headers;
      const content = [{ type: 'text/plain', value: String(body.body || '') }];
      if (body.html) content.push({ type: 'text/html', value: String(body.html) });
      const payload = {
        personalizations: [personalization],
        from: { email: process.env.SENDGRID_FROM, name: process.env.SENDGRID_FROM_NAME || 'OTTO Plumbing' },
        subject: body.subject || 'OTTO Plumbing',
        content,
      };
      const replyTo = cleanEmail(body.replyTo || process.env.SENDGRID_REPLY_TO || process.env.SENDGRID_FROM);
      if (replyTo) payload.reply_to = { email: replyTo, name: process.env.SENDGRID_REPLY_TO_NAME || 'OTTO Plumbing' };
      if (attachments.value.length) payload.attachments = attachments.value;
      const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^\S+@\S+\.\S+$/.test(email) ? email : '';
}
function addressList(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return list.map(item => typeof item === 'object' ? cleanEmail(item.email) : cleanEmail(item))
    .filter(Boolean).map(email => ({ email }));
}
function cleanHeader(value) { return String(value || '').replace(/[\r\n]/g, ' ').trim().slice(0, 998); }
function normalizeAttachments(items) {
  const value = [];
  let total = 0;
  for (const item of Array.isArray(items) ? items : []) {
    const content = String(item && (item.content || item.data) || '').replace(/^data:[^;]+;base64,/, '');
    const size = Buffer.byteLength(content, 'base64');
    total += size;
    if (!content || size > 25 * 1024 * 1024 || total > 30 * 1024 * 1024) return { error: 'attachment_too_large' };
    value.push({
      content,
      filename: String(item.filename || item.name || 'attachment').replace(/[\r\n/\\]/g, '_').slice(0, 180),
      type: String(item.type || item.mime || 'application/octet-stream').slice(0, 120),
      disposition: 'attachment',
    });
  }
  return { value };
}
