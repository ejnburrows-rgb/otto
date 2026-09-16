// Read-only readiness check. Never returns credentials or business records.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ ready: false });
  try {
    const response = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) return res.status(503).json({ ready: false });
    await response.json();
    return res.status(200).json({ ready: true, database: 'connected' });
  } catch {
    return res.status(503).json({ ready: false });
  }
}
