// Provider-neutral inbound email endpoint. SendGrid Inbound Parse is the
// production wiring, while JSON payloads remain supported for tests and
// migrations. Clean message text is stored; untrusted-content guards belong at
// the AI call site, never in the owner's inbox.

import crypto from 'node:crypto';
import Busboy from 'busboy';
import { MAX_FILE_BYTES, safeUpload, uploadStorageObject } from './_lib/storage.js';

const MAX_PAYLOAD_BYTES = 32 * 1024 * 1024;
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const expected = process.env.INBOUND_WEBHOOK_TOKEN || '';
  const supplied = bearerToken(req) || String(req.query && req.query.token || '');
  if (!expected || !constantTimeEqual(supplied, expected)) {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or missing webhook token.' });
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { res.status(503).json({ error: 'no_server_key' }); return; }
  const declared = Number(req.headers && req.headers['content-length'] || 0);
  if (declared > MAX_PAYLOAD_BYTES) { res.status(413).json({ error: 'payload_too_large' }); return; }

  try {
    const body = await parseInboundRequest(req);
    const email = normalize(body);
    email.attachments = await storeAttachments(email.attachments, { url, key, emailId: email.id });
    const linked = await autoLink(email.from, { url, key });
    email.customerId = linked.customerId;
    email.jobId = linked.jobId;
    const putR = await fetch(`${url}/rest/v1/emails`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ id: email.id, data: email, updated_at: new Date().toISOString() }]),
    });
    if (!putR.ok) { const txt = await putR.text(); res.status(502).json({ error: 'save_failed', detail: txt.slice(0, 500) }); return; }
    res.status(200).json({ ok: true, id: email.id, matched: !!email.customerId });
  } catch (error) {
    const code = error && error.code;
    const status = code === 'payload_too_large' || code === 'unsafe_upload' ? 413 : 500;
    res.status(status).json({ error: code || 'inbound_error', detail: String(error && error.message || error).slice(0, 300) });
  }
}

function bearerToken(req) {
  const match = String(req.headers && req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}
function constantTimeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
async function parseInboundRequest(req) {
  const type = String(req.headers && req.headers['content-type'] || '');
  if (type.includes('multipart/form-data')) return parseMultipart(req);
  if (req.body != null && typeof req.body !== 'string') return req.body;
  const raw = typeof req.body === 'string' ? req.body : await readRaw(req, MAX_PAYLOAD_BYTES);
  return raw ? safeParse(raw) : {};
}
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = Object.create(null); const files = []; let total = 0;
    const parser = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_BYTES, files: 20, fields: 100, fieldSize: 2 * 1024 * 1024 } });
    parser.on('field', (name, value) => { fields[name] = value; });
    parser.on('file', (fieldName, stream, info) => {
      const chunks = []; let size = 0;
      stream.on('data', chunk => { size += chunk.length; total += chunk.length; if (total > MAX_PAYLOAD_BYTES) stream.destroy(Object.assign(new Error('Inbound payload exceeds 32 MB.'), { code: 'payload_too_large' })); else chunks.push(chunk); });
      stream.on('limit', () => reject(Object.assign(new Error('Attachment exceeds 25 MB.'), { code: 'payload_too_large' })));
      stream.on('error', reject);
      stream.on('end', () => files.push({ fieldName, name: info.filename || fieldName, mime: info.mimeType || 'application/octet-stream', content: Buffer.concat(chunks), size }));
    });
    parser.on('error', reject);
    parser.on('finish', () => { fields.attachments = files; resolve(fields); });
    req.pipe(parser);
  });
}

function normalize(b) {
  const envelope = typeof b.envelope === 'string' ? safeParse(b.envelope) : (b.envelope || {});
  const fromRaw = b.from || b.From || b.sender || envelope.from || '';
  const from = extractEmail(fromRaw);
  const fromName = String(fromRaw).replace(/<[^>]+>/, '').replace(/"/g, '').trim() || from;
  const subject = String(b.subject || b.Subject || '').slice(0, 500);
  const text = b.text || b.TextBody || b['body-plain'] || b['stripped-text'] || b.plain || '';
  const html = b.html || b.HtmlBody || b['body-html'] || '';
  const body = String(text || stripHtml(html) || '').slice(0, 20000);
  const headers = String(b.headers || b.Headers || '');
  const messageId = cleanMessageId(b.messageId || b.MessageID || b['Message-ID'] || headerValue(headers, 'Message-ID'));
  const references = String(b.references || b.References || headerValue(headers, 'References') || '').replace(/[\r\n]/g, ' ').trim().slice(0, 2000);
  const inReplyTo = cleanMessageId(b.inReplyTo || b['In-Reply-To'] || headerValue(headers, 'In-Reply-To'));
  const rootReference = (references.match(/<[^>]+>/) || [])[0];
  const threadId = rootReference || inReplyTo || messageId || `thread-${hash(`${from}|${subject}`)}`;
  const dateStr = b.date || b.Date || b.timestamp;
  const date = dateStr && !isNaN(new Date(dateStr)) ? new Date(dateStr).toISOString() : new Date().toISOString();
  const attachments = normalizeAttachmentList(b);
  const id = messageId ? `e_${hash(messageId)}` : 'e_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
  return { id, from, fromName, subject, body, date, messageId, references, inReplyTo, threadId, attachments, customerId: '', jobId: '', direction: 'inbound', read: false, preview: body.slice(0, 240), created: date, source: 'inbound-webhook' };
}
function normalizeAttachmentList(b) {
  const source = Array.isArray(b.attachments) ? b.attachments : Array.isArray(b.Attachments) ? b.Attachments : [];
  return source.map((item, index) => ({
    name: item.name || item.filename || item.Name || `attachment-${index + 1}`,
    mime: item.mime || item.mimeType || item.type || item.ContentType || 'application/octet-stream',
    content: Buffer.isBuffer(item.content) ? item.content : Buffer.from(String(item.content || item.data || item.Content || '').replace(/^data:[^;]+;base64,/, ''), 'base64'),
    size: Number(item.size || 0),
  }));
}
async function storeAttachments(items, env) {
  const stored = [];
  for (const [index, item] of (items || []).entries()) {
    const content = item.content; const size = content && content.length || item.size || 0;
    if (!safeUpload(item.name, item.mime, size)) {
      stored.push({ name: item.name, mime: item.mime, mimeType: item.mime, size, rejected: true, rejectionReason: size > MAX_FILE_BYTES ? 'Attachment exceeded 25 MB.' : 'Executable attachment type was blocked.' });
      continue;
    }
    const suffix = String(item.name || 'attachment').replace(/[^A-Za-z0-9._-]/g, '_').slice(-100);
    const fileId = `mail_${env.emailId}_${index}_${suffix}`;
    await uploadStorageObject({ url: env.url, key: env.key, fileId, mime: item.mime, buffer: content });
    stored.push({ name: item.name, mime: item.mime, mimeType: item.mime, size, fileId });
  }
  return stored;
}
async function autoLink(from, env) {
  if (!from) return { customerId: '', jobId: '' };
  const headers = { apikey: env.key, Authorization: `Bearer ${env.key}` };
  const [cr, jr] = await Promise.all([fetch(`${env.url}/rest/v1/customers?select=data`, { headers }), fetch(`${env.url}/rest/v1/jobs?select=data`, { headers })]);
  if (!cr.ok || !jr.ok) return { customerId: '', jobId: '' };
  const customers = (await cr.json()).map(row => row.data).filter(Boolean);
  const matches = customers.filter(customer => String(customer.email || '').trim().toLowerCase() === from.toLowerCase());
  if (matches.length !== 1) return { customerId: '', jobId: '' };
  const customer = matches[0];
  const jobs = (await jr.json()).map(row => row.data).filter(Boolean);
  const open = jobs.filter(job => job.customerId === customer.id && !['completed', 'canceled', 'cancelled', 'closed'].includes(String(job.status || '').toLowerCase()));
  return { customerId: customer.id, jobId: open.length === 1 ? open[0].id : '' };
}
function extractEmail(value) { return (String(value).match(/<([^>]+)>/) || [])[1] || (String(value).match(/[^\s<]+@[^\s>]+/) || [''])[0]; }
function cleanMessageId(value) { return String(value || '').replace(/[\r\n]/g, ' ').trim().slice(0, 500); }
function headerValue(headers, name) { const match = String(headers || '').match(new RegExp(`^${name}:\\s*(.+)$`, 'im')); return match ? match[1].trim() : ''; }
function hash(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24); }
function stripHtml(h) { return String(h || '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/[ \t]{2,}/g, ' ').trim(); }
function safeParse(s) { try { return JSON.parse(s); } catch (_) { /* maybe urlencoded */ } const o = Object.create(null); String(s).split('&').forEach(p => { const i = p.indexOf('='); if (i > 0) { const k = decodeURIComponent(p.slice(0, i)); if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') o[k] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' ')); } }); return o; }
function readRaw(req, limit = MAX_PAYLOAD_BYTES) { return new Promise((resolve, reject) => { const chunks = []; let size = 0; req.on('data', c => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Inbound payload exceeds 32 MB.'), { code: 'payload_too_large' })); req.destroy(); } else chunks.push(c); }); req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject); }); }
