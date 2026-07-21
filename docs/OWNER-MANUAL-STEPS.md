# OWNER-MANUAL-STEPS — OTTO Plumbing CRM

These are the steps **only you (the owner) can do** — they need accounts, secrets,
or a real phone number that no coding agent can supply. The autonomous loop
(`LOOP-CLAUDE.md`) deliberately skips everything on this page.

Plain-language note: "environment variable" = a setting kept in the hosting
dashboard (Vercel), outside the code, so secrets never live in the repo.

---

## 1. Turn on the cloud database (fixes "sync off" / 503)

The live site can't reach its database because its keys aren't set, so `/api/data`
returns 503 and cloud sync is off. In Vercel → Project → Settings → Environment
Variables, set:

- `SUPABASE_URL` = `https://huaehartegjbihyygqgb.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (from your Supabase project's API settings)

Then redeploy. Verify: the live `/api/data` returns 200 (not 503) and the app
shows cloud sync working. Template of every key lives in `.env.example`.

## 2. Set new team PINs (security)

Old demo PINs (`0721`, `0715`) exist in git history. On a trusted device, open the
app, go to Team, and set a fresh 4-digit code for each real person. Only accounts
with a PIN set can sign in. This is a people/security action, not code.

## 3. Connect the outside services (each needs an account + key in Vercel)

All of this code exists and works the moment its key is present; today they return
"not configured":

- **Notifications (Twilio / SendGrid)** — `api/notify.js` returns 503 until
  connected. Needed for the landing booking form to actually send a lead (the form
  UI ships without it and degrades to "call us" — see `docs/issues/landing-03`).
- **QuickBooks (Intuit)** — `api/quickbooks.js` is a stub; only one-way CSV export
  works until you connect an Intuit app.
- **Anthropic ("Ask OTTO" AI)** — set `ANTHROPIC_API_KEY` for the AI assistant.
- **NVIDIA (drawing → estimate)** — set `NVIDIA_API_KEY`.
- **Inbound email** — set `INBOUND_WEBHOOK_TOKEN` and point your email provider's
  webhook at `api/inbound-email.js`.

## 4. The real business phone number

The landing page uses the placeholder `(305) 555-1234`. Task
`docs/issues/landing-02` moves it into ONE place; once that ships, edit that single
constant in `landing.html` to your real number and every button updates. (The same
fake number also appears in the app's demo seed data — that's demo-only and
harmless.)

## 5. Safety items to schedule (people + process, not code)

- **Rehearse a backup restore** — a backup you've never restored isn't a backup.
- **Owner MFA** is currently browser-side only; treat it as a convenience, not real
  multi-factor, until hardened.
- **Sign-in is enforced in the browser only** — fine for a trusted team, but not a
  server-side guarantee.

## 6. (Optional) Grant Jules push access

The `jules` label starts the Jules background agent, but Jules currently can't push
branches to this repo, so new tasks are labeled `claude` and the loop runs on
Claude Code. If you want Jules in the loop, grant its GitHub app push access in the
repo's GitHub App settings, then you may add the `jules` label to ready tasks.
