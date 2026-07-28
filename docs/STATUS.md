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
- **Automated tests.** 57 checks run with `npm test`: the cloud sync merge rules,
  the same rules as embedded in `index.html` (so the two copies cannot drift),
  and the sign-in code handling. A further 9 drive the real app in a real browser
  (`node scripts/test-signin-browser.mjs`). They run on every push via GitHub.
- **CSV export** for every record type, including QuickBooks-format invoices.
- **Documentation standard** — `AGENTS.md` plus this file and `DECISIONS.md`.

## 2. HALF-DONE — started, not finished

- **Cloud sync conflict handling — rewritten 2026-07-21, not yet proven in the
  field.** Records now merge one at a time instead of collections being
  overwritten, so two people editing different customers no longer erase each
  other. Deleting hides a record rather than destroying it. The app now checks
  for other people's changes every 20 seconds while it is open instead of only at
  startup. 22 automated tests cover the merge rules. What is *not* proven is 19
  real phones on real Miami cell service — expect a week of actual crew use
  before trusting it.
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

### 3.1 RESOLVED 2026-07-21 — the exposed Firebase database has been deleted

For the record, because this was the most serious problem the project had:

The old Firebase project `otto-crm-7f951` held a live copy of the customer data
and its access key was published in `index.html`, so anyone who viewed the page
source could read every customer, job, and invoice. This was verified as real,
not theoretical — an anonymous request returned HTTP 200 with data.

The owner deleted the project on 2026-07-21. Verified immediately afterwards:
the same request now returns
`HTTP 403 — Permission denied on resource project otto-crm-7f951`.

All 43 collections (93 records) were exported to local backups before deletion
and confirmed readable, then loaded into Supabase and count-checked. No data was
lost. Google retains a deleted project for 30 days, so recovery is possible until
approximately 2026-08-20 if anything was missed.

**Lesson worth keeping:** the key is still in this repository's git history and
always will be. It is dead now, but the pattern is what mattered — a credential
committed to a repo cannot be un-published, only revoked. See
[DECISIONS.md](DECISIONS.md) for why the replacement keeps its key server-side.

### 3.1b Supabase database is live and verified — one step remains

Confirmed on 2026-07-21 in project `huaehartegjbihyygqgb` (display name
"otto-live"):

- **All data moved.** The count check returned
  `ALL 43 TABLES MATCH - 93 rows total`, comparing every table against the
  records rescued from Firebase (3 customers, 3 jobs, 1 invoice, 19 users,
  48 audit log entries). Nothing was lost.
- **The public is locked out.** A request using only the public key returns
  `401 permission denied`. This is the real test — an earlier check returned
  `404 table does not exist`, which only meant the tables were absent. For
  comparison, the same request against Firebase returned `200` with customer
  data.

**Still to do:** the two settings below are not yet set in Vercel, so the live
site cannot reach the new database (`/api/data` returns 503) and cloud sync is
switched off. The app still works — it runs from each device, as designed.

| Setting | Value |
|---|---|
| `SUPABASE_URL` | `https://huaehartegjbihyygqgb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret "service_role" key from Supabase → Settings → API |

Set both in Vercel → Settings → Environment Variables, then redeploy. The secret
key belongs only in Vercel and a local `.env` file — never in the code.

### 3.2 Sign-in — hardened 2026-07-21, but still browser-only

Fixed on 2026-07-21:

- PINs are no longer stored as readable numbers. Each person has a random salt
  and only a fingerprint (hash) is kept. Existing PINs convert automatically on
  first load; nobody is locked out or asked to re-enter anything.
- The Team screen no longer displays anyone's PIN. It offers an empty box to set
  a new one, and leaving it blank keeps the current code.
- Five wrong tries now forces a 60-second wait, per person, so all 10,000
  combinations can no longer be tried.
- The owner's extra code (MFA) gets the same treatment.
- **Removed a much worse problem found while doing this:** startup code was
  resetting every person's PIN back to a hardcoded value on *every launch*. The
  owner could not actually change anybody's sign-in code — it came back the next
  time the app opened. Those hardcoded codes were the ones published in the docs.

**Still true, and it is a real limit:** all checking happens in the browser, so
somebody able to edit the page in their own browser can still get past the
sign-in screen. This removed the obvious weaknesses; it did not make the app
bank-grade. Real enforcement needs sign-in to happen on a server.

### 3.3 The published PINs still need changing — OWNER ACTION

The values were removed from the documentation on 2026-07-21, and the startup
code that kept resetting them was removed the same day. But they remain in the
project's git history permanently, so **the codes themselves must be changed in
the app**: Team screen, pick a person, type a new PIN, save.

Until that is done, anyone who reads the old history can sign in. This is now a
two-minute job and nothing else blocks it.

### 3.4 FIXED 2026-07-21 — `package.json` scripts

They pointed at `/home/daytona/codebase`, a folder on a different machine, and
called `python3`. They now run the project's own Node server. `npm start` serves
the app on http://localhost:8000, `npm test` runs the automated checks, `npm run
qa` runs the wider check.

### 3.5 Force-pushing is now blocked on this computer

Between 2026-07-20 and 2026-07-21 the `main` branch history was rewritten and
force-pushed by another tool. Every commit id changed and a previously pushed
branch (`feat/otto-finish`) vanished from GitHub, taking a session's work with
it — recovered from a local copy.

A `pre-push` hook now refuses any push that would erase commits already on
GitHub (`.githooks/pre-push`, switched on with
`git config core.hooksPath .githooks`). It was tested against a real force push
on a throwaway branch: blocked, while ordinary pushes still work.

**This only protects this computer.** GitHub's own branch protection, which would
protect the repository from everything and everyone, needs a paid GitHub plan on
a private repository — see NEEDS OWNER DECISION. The culprit was never
identified; several agent-created branches (`main-<numbers>`, `jules-<numbers>`)
exist on the remote and one of them is the likely source.

### 3.6 FIXED 2026-07-21 — `vercel.json` routing

The rule `{"src": "/^.*$", "dest": "/index.html"}` mixed a path with a regular
expression and almost certainly never matched anything. It was removed rather
than rewritten: the app never reads or changes the web address (navigation is
held in memory), so there are no deep links needing a fallback rule.

### 3.7 FIXED 2026-07-21 — the GitHub deploy that never worked

A workflow tried to publish the app to GitHub Pages on every push. Pages was
never switched on for this repository, so it failed every single time — a red
cross on every commit, which trains everyone to ignore failures. The live site is
on Vercel and deploys itself, so nothing was ever actually broken by this.

It was replaced with a workflow that runs the automated checks instead. Also
confirmed while doing this: no second public copy of the app was ever published,
so the old Firebase key was not exposed there as well.

## 4. MISSING FOR LAUNCH

Before a real person can safely use this with real customers:

1. ~~Close the open database and stop shipping the key.~~ **Done 2026-07-21** —
   Firebase deleted, key removed from the code, data moved to Supabase (3.1).
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
- 2026-07-21 — Verified the Supabase migration: all 43 tables match the Firebase
  record counts (93 rows total), and an anonymous request is refused with
  `401 permission denied` rather than returning data. Remaining step is setting
  the two Supabase settings in Vercel.
- 2026-07-21 — Owner deleted the exposed Firebase project `otto-crm-7f951`.
  Verified: anonymous reads now return `403 Permission denied` where they
  previously returned `200` with customer data. The data exposure is closed.
- 2026-07-21 — Simplification pass over the new sync code. Named the synced
  collection list once instead of rebuilding it in three places, and split
  `api/data.js` into named functions. The pass also found and fixed a real
  fault: if the server failed to return one collection, the app replaced that
  collection with nothing and saved it, destroying good records over a
  temporary glitch. It now keeps the device's copy in that case.
- 2026-07-21 — Large batch of work, all verified: migrated the inbound email
  webhook off the deleted Firebase database; rewrote cloud sync to merge record
  by record with soft deletes and 20-second polling (#22); stored sign-in codes
  as salted fingerprints with a wrong-attempt lockout (#23); removed startup code
  that was silently resetting every PIN back to its published value on every
  launch; fixed the npm scripts (#19) and the Vercel routing rule (#20); replaced
  a GitHub deploy that had never once worked with a workflow that runs the tests;
  blocked force-pushing with a git hook; stopped tracking node_modules.

- 2026-07-21 — Reviewed 22 open pull requests from the background agent. Merged
  the genuinely useful parts: tests for `api/notify.js`, `api/quickbooks.js` and
  `api/inbound-email.js` (the test suite went from 3 files to 6, and from ~70 to
  101 checks), parallel attachment loading when opening an email (measured 238ms
  to 103ms), parallel cleanup of old backup files (109ms to 44ms), and a `var`
  to `const` tidy-up. Rejected the rest, with reasons on each pull request.
- 2026-07-21 — Cleared the pull request backlog: 22 open PRs reviewed, 8 merged
  (tests, two measured speed-ups, a tidy-up, and the accessibility audit),
  14 closed with the reason written on each. Notable rejections: a security fix
  whose check any value satisfied, and a change that would have put the deleted
  Firebase code back into `index.html`. Accessibility findings filed as #45.
- 2026-07-21 — Design pass. Fixed a bug on the sign-in screen where the heading
  read "FIELD TEAM (4896)" — it was printing the length of the generated HTML
  instead of the number of workers. Collapsed the 15 unassigned field-worker
  slots behind a "Show unassigned" row so real staff appear first. Met the
  WCAG AA contrast requirement everywhere (avatars went from 2.26:1 to 4.72:1,
  red/green/amber buttons all now above 5:1), tied 70 form labels to their
  inputs, and added spoken names to the icon-only buttons. Accessibility issue
  #45 is now largely addressed; print styles remain open.
- 2026-07-21 — Added printable invoices and estimates. A Print button on each
  produces a plain black-on-white document — company details, customer, work
  description, amount, what has been paid, balance, and terms — instead of
  printing the app interface. Use the browser's "Save as PDF" option to email
  one to a customer. Works in English and Spanish.
- 2026-07-21 — Fixed a date fault found while building the above: any date
  entered as a plain day (a job date, an invoice due date, time off) displayed
  one day EARLIER than it should. A due date of the 15th printed as the 14th on
  customer invoices. Affected the whole app, not just printing.
- 2026-07-21 — Fixed the Inbox "Refresh" button (Wave 4) showing as literal
  escaped HTML text instead of a real button. `pageHead()` now takes a fourth
  `actions` parameter for trusted action HTML that is never passed through
  `esc()`, and `viewInbox()` uses it instead of stuffing the button into the
  `sub` argument (which is correctly still escaped for real subtitle text).
  No other screen's header changed. `npm test` (57 checks) and
  `node scripts/qa-check.mjs` both pass.
- 2026-07-21 — Fixed blank "?" avatars and the 15-vs-19 team count mismatch
  (Wave 5). `blankDB()` now gives the 15 seeded field workers real placeholder
  names ("Field Tech 1"..."Field Tech 15") instead of `''`. Found and fixed
  the actual root cause while verifying live in the browser: `boot()` was
  forcibly resetting every field worker's name back to `''` on *every app
  launch* — the same reset-on-every-boot pattern already fixed for PINs, just
  never caught for names, which is why the seed data alone did not fix the
  "?" avatars. Replaced that reset with a one-time backfill that only fills
  in a placeholder name when one is still blank, so an owner-renamed worker
  is never overwritten. Also gave the hub tile and the Team screen distinct,
  explicit labels ("Field Crew: 15" on the hub tile; "19 · 15 Field Crew" on
  the Team header) instead of the same bare "Team" label showing two
  different numbers. `npm test` (57 checks) and `node scripts/qa-check.mjs`
  both pass.
- 2026-07-22 — Made the KPIs screen show real demo numbers instead of all 0s
  (Wave 6). `seedMockKPIs()` now adds a small, clearly demo-only slice of
  activity across a handful of the named field workers -- check-ins on
  their already-assigned jobs, two completed jobs earlier this week (not
  "today", so the dashboard's Jobs-today tile isn't skewed), and two AI
  escalations -- guarded by a one-time `db.meta.kpiDemoSeeded` flag instead
  of the old per-collection-length check, since this runs on every boot.
  For the Aggregate/Charts view, added an explicit bilingual placeholder
  ("Charts appear here once connected.") instead of silently blank canvases
  when `window.Chart` isn't loaded -- chose this over adding a Chart.js CDN
  script since the app is offline-first with a service worker and the chart
  data was already `Math.random()` mock. `npm test` (57 checks) and
  `node scripts/qa-check.mjs` both pass.
- 2026-07-28 — Built photo file sync (#30): photos now upload to Supabase Storage
  via a queued background process (`photo_upload_queue` in IndexedDB, retries every
  30 s and on reconnect) and are fetched lazily when a job is opened on another
  device via `api/photos.js`. The `job-photos` bucket is private; anonymous access
  is denied. Offline display is preserved — photos appear instantly on the
  capturing device from local IDB. Delete propagates to Storage. Five design
  decisions recorded in DECISIONS.md. `npm test` (124 checks) and
  `npm run qa` both pass.
