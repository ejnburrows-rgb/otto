# STATUS — OTTO Plumbing CRM

Last updated: 2026-07-21, after a full sweep of the codebase and the live site.
Honest snapshot, not a plan. See [DECISIONS.md](DECISIONS.md) for why things were
built this way, and [../AGENTS.md](../AGENTS.md) for the rules everyone here follows.

Branch: `main`. Live app: **https://otto-kohl.vercel.app** (verified working).

> **Note on an earlier version of this file.** A previous sweep was performed
> against an out-of-date copy of the project and reported several things that were
> already fixed, and claimed the app had no working deployment. That was wrong.
> Everything below was re-verified against `origin/main` and the live site on
> 2026-07-21.

---

## 1. DONE — verified working end to end

- **Live deployment.** `https://otto-kohl.vercel.app` serves the real app
  (310,710 bytes, title "OTTO Plumbing CRM"). `manifest.json` and `sw.js` both
  return 200, so the app genuinely installs to a phone and works offline. The
  serverless functions respond (`/api/notify` returns 405 to a GET, which is the
  correct answer for a POST-only endpoint).
- **Core CRM.** Customers, jobs, calls, notes, estimates, invoices, payments,
  checks, follow-ups, workflows, knowledge base, reports — all present and wired;
  the static check finds no dead buttons and no missing click handlers.
- **Bilingual English/Spanish.** 0 missing Spanish translations.
- **Offline-first storage.** IndexedDB with a localStorage mirror; photos and
  documents stored as blobs (binary files) in IndexedDB.
- **AI features with keys kept server-side.** `api/claude.js` and `api/nvidia.js`
  hold their keys in Vercel environment variables, never in the browser.
- **Inbound email webhook is now secured.** It requires `INBOUND_WEBHOOK_TOKEN`
  and returns 401 (unauthorized) without it — this closes the prompt-injection
  path into "Ask OTTO" that an earlier sweep flagged.
- **Cloud sync split per collection.** Firestore writes now go to one document
  per collection instead of one giant document.
- **CSV export** for every record type, including QuickBooks-format invoices.
- **Documentation standard** — `AGENTS.md` plus this file and `DECISIONS.md`.

## 2. HALF-DONE — started, not finished

- **Cloud sync conflict handling.** Splitting into per-collection documents helps,
  but each push still overwrites a whole collection. If two people edit different
  customers at the same time, one person's change can still be silently erased.
  Not safe for 19 people working at once.
- **Backups.** Local snapshots with a checksum (a fingerprint that detects
  corruption) and a restore log exist. True offsite, write-once backup does not —
  and no restore has actually been rehearsed, so "we can recover" is unproven.
- **Notifications (`api/notify.js`).** Code is complete for Twilio (texts) and
  SendGrid (email), but no accounts are connected, so it returns 503 "not
  configured". Nothing actually sends.
- **QuickBooks (`api/quickbooks.js`).** A stub. It returns
  `"Sync stub — wire Intuit API when credentials are live."` One-way CSV export
  works; live two-way sync does not exist.
- **Owner MFA (a second login step).** Owner-only, a 4-digit code, checked in the
  browser and stored in plain text. It raises the bar slightly but is not real
  multi-factor authentication.

## 3. BROKEN OR RISKY

### 3.1 CRITICAL — the OLD Firebase database is still live and still exposed

**The app no longer uses Firebase.** As of 2026-07-21 the code was moved to
Supabase and the Firebase key was deleted from `index.html` entirely. But that
only stops *this app* from using it. The old Firebase database itself is still
sitting on Google's servers, still holding a copy of the customer data, and
still readable by anyone who has the key — and the key is in this project's
git history, so it is permanently public.

- Old project: `otto-crm-7f951`
- Console: https://console.firebase.google.com/project/otto-crm-7f951
- Verified 2026-07-21: anonymous reads of `customers`, `jobs`, `invoices` all
  returned HTTP 200 with data. Only status codes and byte sizes were recorded;
  no customer data was read or stored.

**Only the owner can close this**, by getting into that Firebase console and
either locking the Firestore rules or deleting the project. Until then this
remains the single largest open risk in the project. Everything currently in
that database has been exported to local backups, so deleting the project would
not lose data.

### 3.1b Supabase migration is written but NOT yet live

The new schema and the server-side data function are committed, but the tables
have not been created in Supabase yet — that step needs a database credential
only the owner can retrieve. Until it is run:

- The app runs entirely from each device (which it is designed to do); cloud
  sync answers 503 and is simply switched off.
- The claim "the new database is sealed" is **unproven**. An anonymous request
  currently returns `404 — table does not exist`, which is not the same thing as
  being denied. Re-test after the tables exist.

### 3.2 Sign-in is weak

- PINs are stored, compared, and displayed in plain text (`u.pin`,
  `if (pin === selUser.pin)`), and the Team screen shows each person's PIN in an
  editable box.
- PINs are 4 digits with no lockout, so guessing is easy.
- All checks happen in the browser, so anyone able to edit the page in their own
  browser can bypass them. For a CRM holding client data this is not adequate.

### 3.3 Demo PINs published

`docs/DEPLOYMENT_CHECKLIST.md` lists Owner PIN `0721` and Field PIN `0715` and
describes them as crew logins. They are also in the git history.

### 3.4 `package.json` scripts do not run

`dev`, `start`, and `preview` all point at `/home/daytona/codebase`, a folder from
a different (cloud) machine. On this computer use `python -m http.server 8000`.

### 3.5 Project history was force-pushed

Between 2026-07-20 and 2026-07-21 the `main` branch history was rewritten and
force-pushed by another tool. Every commit ID changed, and a previously pushed
branch (`feat/otto-finish`) disappeared from GitHub, taking a session's
documentation work with it — recovered from a local copy. `AGENTS.md` forbids
force-pushing precisely because it destroys work like this. Whatever automation
did this needs to stop.

### 3.6 `vercel.json` routing pattern is malformed

The rule `{"src": "/^.*$", "dest": "/index.html"}` mixes a path and a regular
expression (a text-matching pattern). Vercel currently tolerates it and the site
works, but it is fragile and should be corrected or removed before it silently
breaks a future deploy.

## 4. MISSING FOR LAUNCH

Before a real person can safely use this with real customers:

1. Close the open database and stop shipping the key (3.1). Nothing else matters
   until this is done.
2. Real per-person sign-in credentials, not shared 4-digit PINs (3.2, 3.3).
3. Sync that cannot silently erase a colleague's work (2).
4. A rehearsed backup restore — proof that recovery works, not just that backups exist.
5. Accounts connected for any feature the business actually needs day one:
   Twilio/SendGrid for customer notifications, QuickBooks for accounting.
6. A written answer for the crew on what GPS and photo data is collected and kept —
   the in-app consent screen exists, but no retention policy is written down.

---

## Session log

Every task adds one dated line here describing what it did. Append to the end of
this list — never edit someone else's line. If two tasks add lines at the same
time and git reports a conflict here, the correct fix is to keep both lines.

- 2026-07-21 — Full sweep of code and live site; corrected the previous status
  report; filed the remaining work as numbered tasks in `docs/issues/`.
- 2026-07-21 — Removed published demo login PIN values (0721 and 0715) from DEPLOYMENT_CHECKLIST.md, replacing them with a plain-language security notice.
- 2026-07-21 — Exported all 44 Firebase collections to local backups, then
  migrated the backend to Supabase: added `supabase/migrations/0001_init_schema.sql`
  (43 tables, all locked to the public) and `api/data.js` (server-side database
  access), and removed the hardcoded Firebase key and its Settings screen from
  `index.html`. Also corrected `scripts/qa-check.mjs`, which had been testing the
  marketing site instead of the real app. QA now passes.
