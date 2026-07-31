import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const body = await parseBody(req);
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback_secret_for_dev';
  
  if (body.action === 'request_mfa') {
    const phone = body.phone;
    if (!phone) return res.status(400).json({ error: 'missing_phone' });

    // Generate 6 digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Send SMS via Twilio
    const twilioReady = !!(process.env.TWILIO_SID && process.env.TWILIO_AUTH && process.env.TWILIO_FROM);
    if (!twilioReady) {
      console.log('DEV MFA CODE:', code);
    } else {
      try {
        const auth = Buffer.from(`${process.env.TWILIO_SID}:${process.env.TWILIO_AUTH}`).toString('base64');
        const params = new URLSearchParams({ To: phone, From: process.env.TWILIO_FROM, Body: `Your OTTO Plumbing sign-in code is: ${code}` });
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
        if (!r.ok) {
          const err = await r.json();
          return res.status(502).json({ error: 'twilio_failed', detail: err });
        }
      } catch (e) {
        return res.status(500).json({ error: 'sms_failed' });
      }
    }

    const mfaToken = jwt.sign({ phone, code }, secret, { expiresIn: '5m' });
    return res.status(200).json({ ok: true, mfaToken });
  }

  if (body.action === 'verify_mfa') {
    const { mfaToken, code, userId, role } = body;
    if (!mfaToken || !code) return res.status(400).json({ error: 'missing_fields' });

    try {
      const decoded = jwt.verify(mfaToken, secret);
      if (decoded.code !== String(code)) {
        return res.status(401).json({ error: 'invalid_code' });
      }
      const sessionToken = jwt.sign({ userId, role: role || 'owner', phone: decoded.phone }, secret, { expiresIn: '7d' });
      return res.status(200).json({ ok: true, sessionToken });
    } catch (e) {
      return res.status(401).json({ error: 'invalid_mfa_token' });
    }
  }

  return res.status(400).json({ error: 'unknown_action' });
}

async function parseBody(req) {
  if (req.body != null && typeof req.body !== 'string') return req.body;
  const raw = typeof req.body === 'string' ? req.body : await readRaw(req);
  return raw ? JSON.parse(raw) : {};
}
function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
