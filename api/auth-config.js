// Public configuration needed by the browser to use Supabase Auth.
// Only the project URL and publishable key are returned. No service-role secret.
export default function handler(req, res) {
  if (req.method !== 'GET') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !publishableKey) { res.status(503).json({ error: 'auth_not_configured' }); return; }
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).json({ url, publishableKey });
}
