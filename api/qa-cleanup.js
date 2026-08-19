export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST' || String(req.query?.run || '') !== '154') return res.status(404).json({ error: 'not_found' });
  if (process.env.VERCEL_ENV !== 'production') return res.status(404).json({ error: 'not_found' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(500).json({ error: 'missing_production_supabase_config' });

  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const list = async () => {
    const r = await fetch(`${url}/storage/v1/object/list/job-photos`, {
      method: 'POST', headers, body: JSON.stringify({ prefix: 'qa-photo-', limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!r.ok) throw new Error(`storage list failed: ${r.status}`);
    const rows = await r.json();
    return (Array.isArray(rows) ? rows : []).map((row) => row?.name).filter((name) => typeof name === 'string' && name.startsWith('qa-photo-'));
  };

  try {
    const before = await list();
    if (before.length) {
      const r = await fetch(`${url}/storage/v1/object/job-photos`, {
        method: 'DELETE', headers, body: JSON.stringify({ prefixes: before }),
      });
      if (!r.ok) throw new Error(`storage delete failed: ${r.status}`);
    }
    const after = await list();
    return res.status(200).json({ ok: after.length === 0, removed: before.length - after.length, remaining: after.length });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.message || error).slice(0, 300) });
  }
}
