// Public route: tells the browser whether cloud sign-in is available and
// where to point Supabase Auth.
//
// WHY THE ANON KEY IS SAFE TO SERVE: every Supabase browser app ships the anon
// key — it is public by design, not a secret. It can only do what the database
// allows the "anon" role to do, and every table in this project denies the anon
// role entirely (see supabase/migrations/0001_init_schema.sql). Its only jobs
// here are (a) calling Supabase Auth's token endpoint for email+password
// sign-in and (b) nothing else. The SERVICE-ROLE key — the one that can read
// and write everything — stays in Vercel env vars and is never sent here.
//
// GET /api/auth-config ->
//   { configured: false }                                    when env is missing
//   { configured: true, url, anonKey }                       when both are set
//
// Env (Vercel -> Settings -> Environment Variables):
//   SUPABASE_URL        - the project URL
//   SUPABASE_ANON_KEY   - the PUBLIC anon key (Supabase -> Settings -> API)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    res.status(200).json({ configured: false });
    return;
  }
  res.status(200).json({ configured: true, url, anonKey });
}
