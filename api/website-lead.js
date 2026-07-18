// Public contact-form intake for the Otto Plumbing marketing site
// (github.com/ejnburrows-rgb/otto-plumbing-site). The site's contact form
// POSTs here cross-origin; this appends a new "call" record to the same
// Firestore document the CRM's Cloud Sync already reads from, so a website
// lead shows up in the CRM's Calls list (and can be turned into a job) with
// no manual re-entry.
//
// Requires the same Firestore web config as Cloud Sync / the inbound-email
// webhook:
//   FIREBASE_PROJECT_ID = your-project-id
//   FIREBASE_API_KEY     = your-web-api-key
// If they are missing this returns 503 and the site falls back to a mailto:
// link so a submission is never silently lost.

const MAX_NAME = 200;
const MAX_CONTACT = 200;
const MAX_MESSAGE = 4000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
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

    // Honeypot: bots fill every field, real users never see or fill this one.
    if (body.hp) { res.status(200).json({ ok: true }); return; }

    const name = String(body.name || '').trim().slice(0, MAX_NAME);
    const contact = String(body.contact || '').trim().slice(0, MAX_CONTACT);
    const message = String(body.message || '').trim().slice(0, MAX_MESSAGE);
    if (!name || !contact) { res.status(400).json({ error: 'missing_fields' }); return; }

    const isEmail = /@/.test(contact);
    const call = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      callerName: name,
      callerPhone: isEmail ? '' : contact,
      summary: isEmail ? `${message}\n\n(Contact: ${contact})` : message,
      customerId: '',
      jobId: null,
      source: 'website',
      created: new Date().toISOString(),
    };

    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/otto_crm/calls?key=${apiKey}`;
    let callsArr = [];
    const getR = await fetch(docUrl);
    if (getR.ok) {
      const doc = await getR.json();
      const jsonStr = doc && doc.fields && doc.fields.json && doc.fields.json.stringValue;
      if (jsonStr) { try { callsArr = JSON.parse(jsonStr); } catch (e) { /* start fresh-ish */ } }
    }
    if (!Array.isArray(callsArr)) callsArr = [];
    callsArr.unshift(call);

    const putR = await fetch(docUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(callsArr) } } }),
    });
    if (!putR.ok) { const txt = await putR.text(); res.status(502).json({ error: 'firestore_write_failed', detail: txt.slice(0, 500) }); return; }
    res.status(200).json({ ok: true, id: call.id });
  } catch (e) {
    res.status(500).json({ error: 'website_lead_error', detail: String(e && e.message || e) });
  }
}

function safeParse(s) { try { return JSON.parse(s); } catch (e) { /* maybe urlencoded */ } const o = {}; String(s).split('&').forEach(p => { const i = p.indexOf('='); if (i > 0) o[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); }); return o; }
function readRaw(req) { return new Promise((resolve, reject) => { let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); req.on('error', reject); }); }
