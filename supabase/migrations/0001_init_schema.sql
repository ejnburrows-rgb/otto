-- OTTO CRM: Supabase schema, replacing the old Firebase Firestore database.
--
-- WHAT THIS FILE DOES: creates one table per collection the app uses, and locks
-- every one of them so the public cannot read or write them.
--
-- HOW THE DATA IS STORED: one row per record. The record itself lives in a
-- JSONB column called "data" (JSONB = a JSON value that Postgres can store and
-- search). This mirrors the shape the app already uses, so the move is a direct
-- copy rather than a risky redesign.
--
-- HOW SECURITY WORKS HERE: every table has Row Level Security (RLS) turned on.
-- RLS means Postgres denies ALL access unless a rule explicitly allows it. This
-- file creates NO allow-rules, and additionally revokes access from the "anon"
-- role (the public key any website visitor can see). The result: the public key
-- alone gets you nothing.
--
-- The app reaches its data through a small server-side function on Vercel
-- (api/data.js) that holds a secret key, exactly the way api/nvidia.js already
-- holds the AI provider key. That secret never reaches the browser. This is the
-- fix for the old Firebase setup, where the key in the page source was enough
-- for anyone on the internet to read every customer record.

create table if not exists public."customers" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."customers" enable row level security;
revoke all on public."customers" from anon;

create table if not exists public."jobs" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."jobs" enable row level security;
revoke all on public."jobs" from anon;

create table if not exists public."calls" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."calls" enable row level security;
revoke all on public."calls" from anon;

create table if not exists public."notes" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."notes" enable row level security;
revoke all on public."notes" from anon;

create table if not exists public."photos" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."photos" enable row level security;
revoke all on public."photos" from anon;

create table if not exists public."documents" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."documents" enable row level security;
revoke all on public."documents" from anon;

create table if not exists public."estimates" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."estimates" enable row level security;
revoke all on public."estimates" from anon;

create table if not exists public."invoices" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."invoices" enable row level security;
revoke all on public."invoices" from anon;

create table if not exists public."payments" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."payments" enable row level security;
revoke all on public."payments" from anon;

create table if not exists public."checks" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."checks" enable row level security;
revoke all on public."checks" from anon;

create table if not exists public."followups" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."followups" enable row level security;
revoke all on public."followups" from anon;

create table if not exists public."workflows" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."workflows" enable row level security;
revoke all on public."workflows" from anon;

create table if not exists public."sops" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."sops" enable row level security;
revoke all on public."sops" from anon;

create table if not exists public."users" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."users" enable row level security;
revoke all on public."users" from anon;

create table if not exists public."locations" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."locations" enable row level security;
revoke all on public."locations" from anon;

create table if not exists public."folders" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."folders" enable row level security;
revoke all on public."folders" from anon;

create table if not exists public."emails" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."emails" enable row level security;
revoke all on public."emails" from anon;

create table if not exists public."inbox_emails" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."inbox_emails" enable row level security;
revoke all on public."inbox_emails" from anon;

create table if not exists public."payroll" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."payroll" enable row level security;
revoke all on public."payroll" from anon;

create table if not exists public."time_off" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."time_off" enable row level security;
revoke all on public."time_off" from anon;

create table if not exists public."login_history" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."login_history" enable row level security;
revoke all on public."login_history" from anon;

create table if not exists public."projects" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."projects" enable row level security;
revoke all on public."projects" from anon;

create table if not exists public."job_events" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."job_events" enable row level security;
revoke all on public."job_events" from anon;

create table if not exists public."job_checklists" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."job_checklists" enable row level security;
revoke all on public."job_checklists" from anon;

create table if not exists public."ai_conversations" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."ai_conversations" enable row level security;
revoke all on public."ai_conversations" from anon;

create table if not exists public."ai_escalations" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."ai_escalations" enable row level security;
revoke all on public."ai_escalations" from anon;

create table if not exists public."consent_records" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."consent_records" enable row level security;
revoke all on public."consent_records" from anon;

create table if not exists public."contracts" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."contracts" enable row level security;
revoke all on public."contracts" from anon;

create table if not exists public."proposals" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."proposals" enable row level security;
revoke all on public."proposals" from anon;

create table if not exists public."plans" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."plans" enable row level security;
revoke all on public."plans" from anon;

create table if not exists public."alerts" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."alerts" enable row level security;
revoke all on public."alerts" from anon;

create table if not exists public."backups" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."backups" enable row level security;
revoke all on public."backups" from anon;

create table if not exists public."daily_summaries" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."daily_summaries" enable row level security;
revoke all on public."daily_summaries" from anon;

create table if not exists public."audit_log" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."audit_log" enable row level security;
revoke all on public."audit_log" from anon;

create table if not exists public."checklist_submissions" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."checklist_submissions" enable row level security;
revoke all on public."checklist_submissions" from anon;

create table if not exists public."pto_requests" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."pto_requests" enable row level security;
revoke all on public."pto_requests" from anon;

create table if not exists public."employee_messages" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."employee_messages" enable row level security;
revoke all on public."employee_messages" from anon;

create table if not exists public."rate_cards" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."rate_cards" enable row level security;
revoke all on public."rate_cards" from anon;

create table if not exists public."estimate_projects" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."estimate_projects" enable row level security;
revoke all on public."estimate_projects" from anon;

create table if not exists public."estimate_records" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."estimate_records" enable row level security;
revoke all on public."estimate_records" from anon;

create table if not exists public."verification_logs" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."verification_logs" enable row level security;
revoke all on public."verification_logs" from anon;

create table if not exists public."pricing_exceptions" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."pricing_exceptions" enable row level security;
revoke all on public."pricing_exceptions" from anon;

create table if not exists public."companyProfile" (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public."companyProfile" enable row level security;
revoke all on public."companyProfile" from anon;

