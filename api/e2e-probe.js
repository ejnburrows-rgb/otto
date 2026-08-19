// Temporary production-verification probe. This file reports only whether the
// secure runtime configuration exists; it never returns environment values.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  return res.status(200).json({
    ok: true,
    environment: process.env.VERCEL_ENV || '',
    branch: process.env.VERCEL_GIT_COMMIT_REF || '',
    config: {
      supabaseUrl: Boolean(process.env.SUPABASE_URL),
      supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      supabasePublishable: Boolean(process.env.SUPABASE_PUBLISHABLE_KEY),
      nvidia: Boolean(process.env.NVIDIA_API_KEY),
    },
  });
}
