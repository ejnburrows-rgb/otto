-- OTTO CRM: server-side role table, required by api/_lib/serverAuth.js.
--
-- WHAT THIS FILE DOES: creates one table that maps a Supabase Auth user (the
-- person who signed in with email + password) to their CRM role
-- (owner / office / field). The server-side gate reads it on every sensitive
-- request to decide what the caller may do.
--
-- HOW SECURITY WORKS HERE: identical to 0001_init_schema.sql — Row Level
-- Security is ON and no allow-rules exist, and the anon role is revoked. The
-- public key alone gets you nothing; only the Vercel server functions, which
-- hold the secret service-role key, can read this table.
--
-- AFTER RUNNING THIS: add one row per person, where user_id is their Supabase
-- Auth user id (Supabase dashboard -> Authentication -> Users) and role is
-- owner, office, or field. A person with no row is refused by every gated
-- route. See docs/AUTH-SETUP.md for the exact steps.

create table if not exists public."user_roles" (
  user_id uuid primary key,
  role text not null check (role in ('owner', 'office', 'field')),
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."user_roles" enable row level security;
revoke all on public."user_roles" from anon;
