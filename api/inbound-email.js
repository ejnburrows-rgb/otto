// Optional: true automatic email capture.
//
// Point an email provider's inbound webhook (SendGrid Inbound Parse, Mailgun
// Routes, Postmark inbound, etc.) at POST /api/inbound-email. This function
// normalizes the payload into the CRM's email-record shape and appends it to the
// same Firestore document the app already syncs from, so forwarded mail shows up
// in the Inbox automatically — the owner does nothing technical.
//
// Requires the project's Firestore web config in env (the same project used by
// Settings → Cloud Sync):
//   FIREBASE_PROJECT_ID = your-project-id
//   FIREBASE_API_KEY     = your-web-api-key
// If they are missing it returns 503 and the in-app .eml import still works.
//
// Note: the app stores everything as one JSON document, so this does a
// read-modify-write. Fine for normal mail volume; it is not built for bursts of
// hundreds of simultaneous inbound messages.

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!projectId || !apiKey) { res.status(503).json({ error: 'no_firestore_config' }); return; }

  try {
    let body = req.body;
    if (body == null || typeof body === 'string') {
      const raw = typeof body === 'string' ? body : await readRaw(req);
      body = raw ? safeParse(raw) : {};
    }
    const email = normalize(body);

    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/otto_crm/data?key=${apiKey}`;
    // Read current DB JSON (may not exist yet).
    let dbObj = { emails: [] };
    const getR = await fetch(docUrl);
    if (getR.ok) {
      const doc = await getR.json();
      const jsonStr = doc && doc.fields && doc.fields.json && doc.fields.json.stringValue;
      if (jsonStr) { try { dbObj = JSON.parse(jsonStr); } catch (e) { /* start fresh-ish */ } }
    }
    if (!Array.isArray(dbObj.emails)) dbObj.emails = [];
    dbObj.emails.unshift(email);

    const putR = await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(dbObj) } } }),
    });
    if (!putR.ok) { const txt = await putR.text(); res.status(502).json({ error: 'firestore_write_failed', detail: txt.slice(0, 500) }); return; }
    res.status(200).json({ ok: true, id: email.id });
  } catch (e) {
    res.status(500).json({ error: 'inbound_error', detail: String(e && e.message || e) });
  }
}

// Normalize the common inbound-parse shapes (SendGrid / Mailgun / Postmark / plain).
function normalize(b) {
  const fromRaw = b.from || b.From || b.sender || (b.envelope && b.envelope.from) || '';
  const from = (String(fromRaw).match(/<([^>]+)>/) || [])[1] || (String(fromRaw).match(/[^\s<]+@[^\s>]+/) || [''])[0];
  const fromName = String(fromRaw).replace(/<[^>]+>/, '').replace(/"/g, '').trim() || from;
  const subject = b.subject || b.Subject || '';
  const text = b.text || b.TextBody || b['body-plain'] || b['stripped-text'] || b.plain || '';
  const html = b.html || b.HtmlBody || b['body-html'] || '';
  const body = String(text || stripHtml(html) || '').slice(0, 20000);
  const dateStr = b.date || b.Date || b.timestamp;
  const date = dateStr && !isNaN(new Date(dateStr)) ? new Date(dateStr).toISOString() : new Date().toISOString();
  // Attachment metadata only (binaries are not stored in the JSON doc).
  let attachments = [];
  if (Array.isArray(b.Attachments)) attachments = b.Attachments.map(a => ({ name: a.Name || a.name || 'attachment' }));
  else if (Array.isArray(b.attachments)) attachments = b.attachments.map(a => ({ name: (a && (a.name || a.filename)) || 'attachment' }));
  else if (b['attachment-count']) attachments = Array.from({ length: Number(b['attachment-count']) || 0 }, (_, i) => ({ name: 'attachment-' + (i + 1) }));

  return {
    id: 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    from, fromName, subject, body, date,
    attachments, customerId: '', jobId: '',
    created: date, source: 'inbound-webhook',
  };
}
function stripHtml(h) { return String(h || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]{2,}/g, ' ').trim(); }
function safeParse(s) { try { return JSON.parse(s); } catch (e) { /* maybe urlencoded */ } const o = {}; String(s).split('&').forEach(p => { const i = p.indexOf('='); if (i > 0) o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); }); return o; }
function readRaw(req) { return new Promise((resolve, reject) => { let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); req.on('error', reject); }); }
