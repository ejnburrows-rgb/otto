# STATUS — OTTO Plumbing CRM

Last updated: 2026-07-28 (docs cleanup pass). Honest snapshot, not a plan. See
[DECISIONS.md](DECISIONS.md) for why things were built this way, and
[../AGENTS.md](../AGENTS.md) for the rules everyone here follows.

Branch: `main`. Live app: **https://otto-kohl.vercel.app** (verified working).

> **Note on an earlier version of this file.** A previous sweep was performed
> against an out-of-date copy of the project and reported several things that were
> already fixed, and claimed the app had no working deployment. That was wrong.
> Core facts below were re-verified against `origin/main` on 2026-07-21; the
> 2026-07-28 pass only corrected contradictions and recorded owner actions.

---

## 1. DONE — verified working end to end

- **The 2026-07-31 "Boss-Level Facelift" — most of what this entry used to claim
  was never true, and the rest has been removed.** It is kept, corrected, because
  it sat in this "verified working" section asserting features that did not exist.
  What it claimed and what is actually the case:
  - *"Direct 8K executive background assets integrated"* — **no such assets ever
    existed.** The six `src` attributes held image-generation prompt text where a
    URL belongs; every one returned 404. Removed in PR #82.
  - *"Glowing Rose Beacon"* and *"Little Prince Cameo"* animations — same thing.
    No artwork for either exists anywhere in this repository. The CSS remains,
    commented, so they can be restored if real files ever land.
  - *"Draggable HUD via interact.js"* — **this was the cause of the interface
    being unusable** (session log 2026-08-01). Removed.
  - *"Universal 4-digit PIN routing (PIN 1 -> Otto, PIN 2 -> Príncipe...)"* — the
    comparison is against the whole typed code, so a 4-digit PIN never equals
    `'1'`. Themes are selected by name, not PIN. "El Príncipe" is now Julio.
  - *"Verified with 307/307 checks passed"* — the same commit shipped a syntax
    error that stopped the entire app booting, a removed security gate, and a
    sign-in route that handed owner sessions to anyone. Whatever was run, it was
    not a verification. See §3.10.
  What genuinely survives from that commit: the PlumbBot modal, the glass logo
  treatment, the per-person theme colours, and the estimator margin buttons.
  None has been reviewed by a human on a real device — see
  [UI-DEBUG-HANDOFF.md](UI-DEBUG-HANDOFF.md).
- **Live deployment.** `https://otto-kohl.vercel.app` serves the real app
  (title "OTTO Plumbing CRM"). `manifest.json` and `sw.js` both return 200, so
  the app genuinely installs to a phone and works offline. The serverless
  functions respond (`/api/notify` returns 405 to a GET, which is the correct
  answer for a POST-only endpoint).
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
- **Automated tests.** `npm test` runs the suite in `package.json` (merge rules,
  in-page merge parity, PIN handling, inbound-email, notify, quickbooks, nvidia).
  Session log 2026-07-21 recorded the suite growing to **~101 checks** after API
  tests were added; older "57 checks" lines in this file referred to an earlier
  subset and are retired. A further browser script
  (`node scripts/test-signin-browser.mjs`) drives the real app. As of
  2026-07-31 the suite is **275 checks, 0 failed**, and `npm run qa` passes.
  **Re-run `npm test` locally and paste the count if you need an exact number
  after the next code change** — and you do need to, because the automated
  safety net is local only. See §3.9: GitHub Actions has never actually run
  here, so `.github/workflows/ci.yml` is not checking anything today.
- **CSV export** for every record type, including QuickBooks-format invoices.
- **Documentation standard** — `AGENTS.md` plus this file and `DECISIONS.md`.
- **Tool-agnostic agent rules** — `AGENTS.md` no longer names Claude-only skills
  (merged 2026-07-28). Any coding tool may work here under the same rules.

## 2. HALF-DONE — started, not finished

- **Cloud sync conflict handling — rewritten 2026-07-21, not yet proven in the
  field.** Records now merge one at a time instead of collections being
  overwritten, so two people editing different customers no longer erase each
  other. Deleting hides a record rather than destroying it. The app now checks
  for other people's changes every 20 seconds while it is open instead of only at
  startup. Automated tests cover the merge rules. What is *not* proven is 19
  real phones on real Miami cell service — expect a week of actual crew use
  before trusting it.
- **Photo files still do not leave the phone that took them** (open issue #30).
  Photo *records* can sync; the image *bytes* stay in device IndexedDB via
  `storeFile` / `getFileURL`. Build work remaining.
- **Backups — records only, and they never leave the device.** Local snapshots
  with a checksum and a restore log exist, and a restore was rehearsed on
  2026-07-29 (§4 item 5). Three limits were missed in earlier passes and are
  material, so they are stated plainly here — full detail in
  [BACKUP-AND-SECURITY.md](BACKUP-AND-SECURITY.md):
  - **No images are backed up at all.** `backupNow()` stores
    `JSON.stringify(db)`, and image bytes are separate blobs in the `files`
    store that `db` only points at by `fileId`. A restored snapshot yields
    photo records whose files do not exist. Since photo bytes also do not sync
    (§2 above), a lost phone loses its job photos permanently.
  - **The snapshot lives in the same IndexedDB as the live data**, so one lost
    device loses the records and every snapshot of them together. It is a
    version history, not a backup. The only offsite path is the manual
    Download button, which also excludes images.
  - **It only runs when an owner or office manager opens the app**
    (`maybeAutoBackup()` is called from `startApp` for those two roles only),
    at most once per 24h, keeping the last 12 restorable snapshots while older
    log rows remain — so the count on screen overstates what can be restored.
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

### 3.1b Supabase database is live — cloud switch is owner-configured

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

**Owner action (2026-07-28):** owner reports the two Vercel environment variables
are now set and the project redeployed. **Independent proof still required**
before closing issue #28:

1. Backups screen shows Cloud ✅
2. Counts still match 3 / 3 / 1 / 19 / 48
3. Anonymous curl against `/rest/v1/customers?select=id` returns 401 or
   permission error — not 200, not 404
4. `GET /api/data` on the live host returns 200 with collections (not 503
   `no_server_key`)

**Proof run 2026-07-29 — three of the four pass, one fails.** Checks 3 and 4
pass: an anonymous REST read returns `401 UNAUTHORIZED_MISSING_API_KEY`, and
`GET /api/data` returns `200` with all 43 collections. Check 1 needs a signed-in
session on the live site, so it is still owner-only. **Check 2 fails.** The live
`jobs` table holds **13 rows where 3 are expected** — customers 3, invoices 1,
users 19 and audit_log 48 are all still correct.

The cause is not lost or corrupted data; it is the app's own start-up seeding.
`blankDB()` creates three demo jobs with freshly generated ids on any device with
no local data, `seedMockKPIs()` adds two more, and the merge has no way to tell
them from real records, so they upload as new rows. The dates line up exactly:
3 real jobs (2026-07-17), +5 on 2026-07-28, +5 on 2026-07-29. Customers escaped
only by luck — nothing edits them after boot, so their seeded copies are never
pushed. **Issue #28 stays open until this is fixed.** No rows have been deleted;
that needs the owner's sign-off. Also filed as the top item in PR #66/#67.

| Setting | Value |
|---|---|
| `SUPABASE_URL` | `https://huaehartegjbihyygqgb.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret "service_role" key from Supabase → Settings → API |

The secret key belongs only in Vercel and a local `.env` file — never in the code.

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

### 3.3 Published PINs — owner changes codes; scrub remaining docs

The demo PIN values were removed from `DEPLOYMENT_CHECKLIST.md` on 2026-07-21,
and the startup reset was removed the same day. They remain in git history
permanently, so **the codes themselves must be changed in the app** (Team
screen).

**Owner reports (2026-07-28)** the Team-screen PIN change is done. A 2026-07-28
docs pass also found the old values still printed in the archived Windows
heartbeat scripts (moved under `legacy/heartbeat/` and scrubbed). Do not put
real PINs in any file again.

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

### 3.8 CONTAINED 2026-07-29 — sensitive server routes now fail closed; real server-side sign-in still missing

**The problem.** `api/data.js` (reads/writes every Supabase collection using
the service-role key), `api/photos.js` (signed photo links, uploads,
deletes), `api/claude.js` and `api/nvidia.js` (AI proxies that spend paid
API credit), `api/notify.js` (sends real customer texts/emails), and the
`sync` action of `api/quickbooks.js` all ran with zero server-side check of
who was calling. Anyone who could reach the URL — not just the app — could
read or change real customer data, pull a signed photo link, spend AI
credit, or trigger a customer notification. This is a direct continuation of
the Firebase lesson in §3.1: a key that only lives on the server is safe
from being *copied out of the page*, but it does nothing if the route that
holds it has no idea who is asking.

**The fix is containment, not a cure.** A new shared gate,
`api/_lib/serverAuth.js`, is imported by all six routes and checked before
any of them touch Supabase, Anthropic, NVIDIA, Twilio, SendGrid, or
QuickBooks. `hasServerAuth()` returns `false` unconditionally today, so
every request to these routes — authenticated-looking or not — gets back
`403 { error: 'server_auth_not_configured' }` and nothing else: no customer
data, no signed URL, no provider reply, no message preview. This is
deliberately *not* a login system (AGENTS.md forbids hand-building one) —
it is a closed valve that stays closed until a real one exists. The
QuickBooks `status`/`auth_url` actions are unaffected; they only report
whether env vars are set, not customer data.

**Client behavior is unchanged, on purpose.** Every caller of these routes
already treated a non-`ok` response (previously mostly `503 no_server_key`)
as "feature unavailable — fall back honestly," never as a crash or a reason
to erase local data: `cloudPull()` keeps the device's copy when `/api/data`
doesn't return `ok`, `callClaude`/`callNvidia` return `null` and show a
translated "unavailable" message, and photo uploads stay queued locally and
retry instead of silently vanishing. A `403` degrades through the exact same
paths a `503` already did, so nothing about the offline-first app changed
except that it can no longer be told cloud sync, AI, or notifications
"worked" when they didn't reach a real server check.

**Regression tests** (`scripts/test-server-auth.mjs`, wired into `npm test`)
prove all six routes refuse an unauthenticated request — even with every
provider key configured — before any upstream call happens, and that the
response never contains customer data, a signed URL, a provider reply, or a
notification preview.

**What is still required, not yet built:** a real server-side identity and
session system with authorization by role (who is signed in, checked on the
server, not just in the browser — see §3.2). Until that ships and each
route's `hasServerAuth()` check is replaced with a real one, cloud sync,
photo sync, in-app AI, customer notifications, and QuickBooks sync all stay
switched off in the deployed app. This is the same "still true" limitation
called out in §3.2, now enforced at every server route instead of only at
sign-in.

### 3.9 GitHub Actions has never run — the tests are local-only

Found 2026-07-31 while checking CI on a pull request. §1 previously claimed CI
runs `npm test` and `qa-check` on every push. **It does not, and as far as the
run history shows, it never has.**

The facts, from the Actions API:

- The real workflow, `.github/workflows/ci.yml` (id `317206276`, "Checks"), has
  **exactly one run in its entire history** — a manual `workflow_dispatch` on
  2026-07-21 — and that run ended `startup_failure`. It has never once been
  triggered by a push or a pull request.
- Every red cross on the commit list comes from a **different, phantom
  workflow**: id `314100393`, name empty, path `BuildFailed`, `state: deleted`.
  It has no file in the repository — `.github/workflows/` on `main` contains
  only `ci.yml` — yet GitHub still spawns a run for it on every push and every
  pull request, and every one of those runs ends `startup_failure`.
- All 30 most recent runs across the repository, on every branch including
  `main`, are that phantom workflow failing at startup. Zero jobs execute.

`startup_failure` with no jobs at all means the run dies before any step, so
this is not a failing test — nothing is being tested. This is the §3.7 lesson
repeating itself: a permanently red cross that everyone learns to ignore.

**This is an owner action, not a code fix.** Nothing in the repository can
repair it, because `ci.yml` itself is valid and is not what is failing. Two
places to look, both in GitHub's web interface:

1. **Settings → Actions → General** — confirm Actions is allowed for this
   repository.
2. **Billing → Spending limit** (account level) — this is a *private* repo, so
   Actions minutes are billable beyond the free monthly allowance. A hit
   spending limit or a missing payment method blocks runs at startup exactly
   like this.

Until it starts working, treat `npm test` and `npm run qa` **run locally** as
the only real evidence, and paste the counts into the session log as this file
already instructs.

### 3.10 INCIDENT 2026-07-31 — live authentication bypass, found and closed

**What happened.** A facelift commit (`cee5f5f`) and a companion commit
(`320cd12`) removed the §3.8 fail-closed gate and replaced it with hand-rolled
JWT verification, adding a public `api/login.js`. Both reached `main` and were
deployed.

**Why it was critical.** Two independent, remotely exploitable bypasses:

1. `POST /api/login {action:'request_mfa'}` returned the SMS code *inside* the
   token it handed back. A JWT payload is base64, not encrypted, so any caller
   could read the code out of the token they had just been given — no SMS
   needed, and with Twilio unconfigured the code was only logged while the token
   was still returned. `verify_mfa` then took `userId` and `role` **straight from
   the request body**, so anyone could mint a 7-day `role: 'owner'` session with
   no PIN and no credential of any kind.
2. The signing secret fell back to a hardcoded development placeholder committed
   to this repository, so tokens could be forged directly without touching
   `/api/login` at all.

Either token satisfied `hasServerAuth()` and unlocked all six protected routes,
including `api/data.js` and its Supabase **service-role** key — full read and
write of every collection.

**Established by reading the code. The exploit was deliberately NOT run against
production**, because that would have meant accessing real customer data.

**Fix.** `hasServerAuth()` restored to unconditional `false`; `api/login.js`
deleted; the client's owner second-code check restored to the local
`verifyPin(u, typed, 'mfaPin')` against the salted hash, with its lockout;
`serverFetch()` reduced to a plain pass-through that also clears any stale
`otto_jwt` left in a browser; `jsonwebtoken` dropped. §3.8 is in force again.

**Regression tests** (`scripts/test-server-auth.mjs`, now 49 checks) assert that a
forged token is refused, that no file under `api/` contains the placeholder
secret, that `api/login.js` does not exist, and that the gate neither signs nor
verifies its own tokens.

**Owner actions, still outstanding:**

1. **Rotate `SUPABASE_SERVICE_ROLE_KEY`** in Supabase and Vercel. It had been
   configured as a JWT signing secret, which is not what it is for.
2. **Review Supabase logs** for the exposure window — commits landed
   2026-07-31, PR #82 merged 21:26 UTC — for any `/rest/v1` access that was not
   yours. The live database holds 3 customers, 13 jobs and 1 invoice, so the
   blast radius is small, but exposure cannot be ruled out.

**Lesson.** This is the third time a credential has been committed to this
repository (§3.1, §3.3, now this). It is also exactly what AGENTS.md forbids:
"Never hand-build authentication." The supported path — the provider's own
sign-in — is recorded as §4 item 8 and remains the correct next step.

## 4. MISSING FOR LAUNCH

Before a real person can safely use this with real customers:

1. ~~Close the open database and stop shipping the key.~~ **Done 2026-07-21** —
   Firebase deleted, key removed from the code, data moved to Supabase (3.1).
2. ~~Set Supabase env vars in Vercel.~~ **Owner reports done 2026-07-28** — still
   needs the four proof checks in §3.1b before calling cloud sync closed.
3. ~~Change published demo PINs in the Team screen.~~ **Owner reports done
   2026-07-28** — keep rotating if any leak is suspected.
4. Photo files that leave the capturing phone (#30).
5. ~~A rehearsed backup restore — proof that recovery works, not just that
   backups exist.~~ **Done 2026-07-29** — a snapshot taken on one device was
   exported and restored into a clean, separate browser profile. All 14
   non-empty collections came back with identical counts and a marker record
   added before the snapshot survived the round trip. See the session log.
   Still true: snapshots live in the same IndexedDB as the data, so the
   *offsite* copy is the exported JSON file and somebody has to keep it
   somewhere safe.
6. Accounts connected for any feature the business actually needs day one:
   Twilio/SendGrid for customer notifications, QuickBooks for accounting.
7. A written answer for the crew on what GPS and photo data is collected and kept —
   the in-app consent screen exists, but no retention policy is written down.
8. **A real server-side identity/session system with authorization by
   role.** Until it exists, `api/data.js`, `api/photos.js`, `api/claude.js`,
   `api/nvidia.js`, `api/notify.js`, and the QuickBooks `sync` action stay
   fail-closed (§3.8) — the app runs offline-only in practice. This is the
   single blocking item for cloud sync, photo sync, in-app AI, customer
   notifications, and QuickBooks sync to work at all.

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
- 2026-07-28 — Docs cleanup: retired the "57 vs ~101 checks" contradiction in
  §1; recorded owner report that Vercel Supabase env vars and Team PINs were
  set (proof still required for #28); moved Windows heartbeat scripts to
  `legacy/heartbeat/` and scrubbed published PIN values from them.
- 2026-07-29 — Finished the PIN scrub started above. `scripts/qa-browser.mjs`
  was still typing both live sign-in codes into the login keypad as digit
  arrays; it now reads them from `QA_OWNER_PIN` / `QA_FIELD_PIN` at run time and
  refuses to run without them, so a code change no longer breaks the script and
  no code sits in a tracked file. Also removed the codes from the tick-list
  labels in `docs/QA_CHECKLIST.md` and `docs/QA_BROWSER.md`. `npm test`
  (123 checks) and `npm run qa` both pass.
- 2026-07-22 — Fixed prototype pollution vulnerability in `safeParse` inside `api/inbound-email.js` and added tests to `scripts/test-inbound-email.mjs`.
- 2026-07-28 — Built photo file sync (#30): photos now upload to Supabase Storage
  via a queued background process (`photo_upload_queue` in IndexedDB, retries every
  30 s and on reconnect) and are fetched lazily when a job is opened on another
  device via `api/photos.js`. The `job-photos` bucket is private; anonymous access
  is denied. Offline display is preserved — photos appear instantly on the
  capturing device from local IDB. Delete propagates to Storage. Five design
  decisions recorded in DECISIONS.md. `npm test` (124 checks) and
  `npm run qa` both pass.
- [2026-07-21] Optimized KPI Summary view rendering by replacing nested `.filter` operations with pre-computed mappings resulting in a ~32x performance improvement (from 865ms to 27ms in benchmark testing).
- 2026-07-22 — Added missing test for SMS JSON parsing exception in scripts/test-notify.mjs, covering the error path in api/notify.js.
- 2026-07-29 — Backlog merge pass: #62, #53, #60, #49, #54, #51 brought up to
  date with `main`, conflicts resolved by hand, and merged in that order.
  **Correction to the check counts quoted during that pass:** they were
  understated. `scripts/test-notify.mjs` ends with `Tests complete. Passed: N`
  while every other script ends with `N passed`, so a summary grep silently
  dropped it and mislabelled the quickbooks total as notify's. The true totals
  are 22 + 22 + 32 + 15 + 16 + 19 + 16 + 23 = **165 checks, 0 failed**. The
  "0 failed" part was correct throughout; only the totals were wrong. Worth
  making the per-script summary lines consistent so this cannot recur.
- 2026-07-29 — Ran the four cloud-sync proofs for #28. Anonymous reads are
  refused (401) and `/api/data` returns 200 with all 43 collections, so the
  Vercel settings really are live. The count check failed: 13 jobs where 3 are
  expected. Traced it to the app's own start-up seeding creating five demo jobs
  with new ids on every fresh device and syncing them up as real records — the
  creation dates match device-by-device. #28 left open; nothing deleted, since
  removing live rows is the owner's call. Details in §3.1b.
- 2026-07-29 — Finished #45 with a real tool instead of hand-computed figures.
  An axe-core scan (WCAG 2.0/2.1 A + AA) across 8 screens × 2 languages found
  **168 failing elements** on the pre-audit build and **110 still failing on
  current `main`** — the 2026-07-21 pass had corrected the light palette, but
  the app opens in dark mode and the dark values were untouched, so white button
  text sat at 2.15–2.77:1. Added separate `--*-fill` variables for solid buttons,
  lifted dark `--text3`, the language toggle, the sign-in secondary text, the
  dark blue pill and the active nav label, and gave the icon-only back button a
  translated `aria-label`. The scan now reports **0**. Print styles were already
  shipped on 2026-07-21 and were re-checked here: under print media the whole app
  interface is hidden and only the document prints, black on white.
- 2026-07-29 — Standardised the eight test scripts on one summary line,
  `N passed, N failed`. `test-notify.mjs` and `test-quickbooks.mjs` each had
  their own wording, which is what produced the miscounted totals recorded
  above. A single grep across the suite now sums to 165 with no special cases.
  Nothing greps these lines automatically, so no other file needed changing.
- 2026-07-29 — Corrected the `SPEC.md` header, which still advertised "Firebase
  Firestore/Storage" as the stack five weeks after that project was deleted, and
  the stale `FIREBASE_*` entries in the same file's env-var note.
- 2026-07-29 — Rehearsed a backup restore end to end (§4 item 5). Added a marker
  customer, took a snapshot (checksum verified, built-in restore test passed),
  exported the JSON, then restored it into a completely separate clean browser
  profile. All 14 non-empty collections came back with identical counts and the
  marker record survived. Recovery is now demonstrated, not assumed.
- 2026-07-29 — Audited the stale agent branches for deletion. Twelve of the
  fourteen `main-<numbers>` / `jules-<numbers>` branches carry only content that
  is already in `main` or was explicitly abandoned, and are safe to delete. Two
  are **not** safe and were kept: `main-8209447042964602781` holds
  `docs/LEGACY_INVENTORY.md` and `main-13118038372817789804` holds the A11Y
  evidence screenshots, neither of which exists in `main`. The deletions
  themselves could not be performed from this environment — the git relay
  refuses delete refspecs with HTTP 403 and no available API tool deletes a
  branch — so the verified list is handed to the owner.
- 2026-07-29 — Emergency containment (§3.8): `api/data.js`, `api/photos.js`,
  `api/claude.js`, `api/nvidia.js`, `api/notify.js`, and the QuickBooks
  `sync` action had no server-side check of who was calling, despite holding
  the Supabase service-role key and paid AI/SMS/email credentials. Added a
  shared fail-closed gate (`api/_lib/serverAuth.js`, not a hand-built login
  system) that every one of those routes now checks before touching any
  upstream service; an unauthenticated request gets `403
  server_auth_not_configured` and nothing else. No Supabase data was read,
  written, or deleted to make this change. Client code already treated a
  non-`ok` response as "unavailable, fall back to local" for every one of
  these routes, so no client changes were needed and local/offline data is
  never erased. Added `scripts/test-server-auth.mjs` (41 checks) proving all
  six routes refuse unauthenticated requests even when fully configured,
  before any upstream call, with no sensitive data in the response; updated
  `test-notify.mjs`, `test-nvidia.mjs`, `test-photos.mjs`, and
  `test-quickbooks.mjs` to exercise the underlying provider logic directly
  (still fully covered) since the gate now makes it unreachable through a
  live request. `npm test` totals 211 checks, 0 failed. Remaining requirement
  recorded as §4 item 8: a real server-side identity/session system with
  authorization by role.
- 2026-07-29 — Fixed the demo-data contamination fault at its source (#28's
  failing count check). Root cause: `blankDB()` created 3 customers, 3 jobs and
  a call with fresh random ids *before* the cloud pull, and `seedMockKPIs()`
  added 2 more jobs — so a fresh device invented starter records and uploaded
  them as real work, five jobs per device (3 → 8 → 13 over two days). Two
  independent guards now prevent it: demo content only exists in explicit demo
  mode (`?demo=1`, remembered per device) and is seeded *after* the cloud pull,
  and every demo record is stamped `demo: true` and filtered out by
  `cloudPush()`, so even a hand-enabled demo device cannot contaminate a real
  workspace. A production device now starts empty and shows "Nothing here yet."
  Verified in a real browser: production profile creates 0 customers / 0 jobs
  and stays empty across a reload, the 19-person staff roster still loads, and
  demo mode still produces its 3 customers / 5 jobs with every record stamped.
  Added `scripts/test-demo-seed.mjs` (37 checks) covering production default,
  demo opt-in and opt-out, refusal to seed over real or cloud-pulled data,
  reload idempotency, demo rows never leaving the device, five successive fresh
  devices leaving the cloud count unchanged, and the boot ordering itself.
  `npm test` totals 248 checks, 0 failed; `npm run qa` passes. **No cloud
  records were read, written or deleted.** The ten existing extra rows are left
  in place — identification criteria and the required pre-deletion steps are in
  `docs/DUPLICATE-DATA-CLEANUP-REPORT.md`, which contains no delete commands and
  leaves the decision to the owner.
- 2026-07-31 — Readiness check plus client-demo preparation. Verified rather
  than rebuilt: working tree clean, `main` and the working branch identical, and
  the live site byte-for-byte identical to the repo (sha256 of `index.html`,
  `sw.js`, `manifest.json`, `landing.html`, `guide.html` all match), so the
  deployment really is current. `npm test` 275 checks 0 failed, `npm run qa`
  passes. Supabase `otto-live` is ACTIVE_HEALTHY and its security advisors show
  only INFO "RLS enabled, no policy" — the deny-all state we want. Re-confirmed
  §3.8 is still in force: `/api/data` on the live host returns
  `403 server_auth_not_configured`, so cloud sync, photo sync, AI, notifications
  and QuickBooks sync remain switched off. **No e-commerce exists in this
  product** and none was added; the nearest working equivalent is the
  estimate → invoice → payment billing chain. Three small changes, all confined
  to demo mode or naming: (1) `applyDemoSeed()` now also seeds one estimate, two
  invoices (one paid, one part-paid) and two payments, so the billing chain can
  actually be shown — every row carries the same `demo: true` stamp and is
  stripped by `_syncableRecords()` exactly like the existing rows; (2) `?demo=0`
  now clears the demo records it left behind instead of only unsetting the flag,
  via `purgeDemoRecords()`, which touches only `demo: true` rows so a device
  holding real work loses nothing — previously the fictional customers stayed on
  screen after the demo ended, which looks like real data appearing from
  nowhere; (3) owner-2 renamed `El Príncipe` → `Julio` and ops-1 `Sarays` →
  `Saray` at owner's instruction, including the `fixUser()` backfill and the
  per-person theme checks. `scripts/test-demo-seed.mjs` grew from 37 to 64
  checks covering the new billing rows, the purge, and the boot ordering.
  Verified in a real browser: demo device shows 3 customers / 5 jobs / 2
  invoices / 1 estimate / 2 payments with 0 unstamped rows and Outstanding
  $1,950.00; a production device stays at 0 across the board; `?demo=0` takes a
  demoed device from 5 jobs to 0. Owner-facing instructions — demo flow, what
  not to click, turning the demo off, and QuickBooks/email/AI/AutoCAD setup with
  honest ALREADY WORKING vs FUTURE INTEGRATION splits — are in
  `docs/ONSITE-HANDOFF.md`. No cloud records were read, written or deleted.
- 2026-07-31 — Checked CI while opening PR #79 and found §3.9: GitHub Actions
  has never run on this repository. `ci.yml` has one run in its whole history
  (a manual dispatch on 2026-07-21) which ended `startup_failure`; every red
  cross since comes from a phantom workflow (`state: deleted`, path
  `BuildFailed`, no file on `main`) that GitHub still fires on every push and
  PR and which also dies at startup with zero jobs. Corrected the §1 claim that
  CI runs on every push — it does not. No code change fixes this; it needs the
  owner to check repository Actions settings and the account spending limit,
  since the repo is private and Actions minutes are billable. Local `npm test`
  (275 checks) and `npm run qa` remain the only real evidence.
- 2026-07-31 — Traced three areas for a handoff and recorded them in
  `docs/HANDOFF-PHOTOS-OCR.md`. **Correction to an earlier claim in this file
  and in the handoff guide:** AI is not uniformly switched off. `callNvidia()`
  is server-only, so PDF takeoff really is dead until the §3.8 gate opens, but
  `callClaude()` has a second path — a personal Anthropic key in
  `localStorage.otto_ai_key`, entered in Settings, calling `api.anthropic.com`
  directly from the browser. So photo OCR (`ocrCheck`, `ocrDocument`,
  `ocrCustomerAccount` via `aiVision`) can work today on a device with a key.
  That key is per-device and is NOT in `db.meta`, so it does not sync to
  Supabase. Also confirmed: a photo cannot reach another person today, blocked
  in two independent places — the photo *record* syncs through `/api/data`
  (403) and the image *bytes* through `/api/photos` (403). No role change is
  needed for owner or office manager to see photos once sync works; both
  already have `jobs`, which is where photos render. Worst silent failure
  found: `_drainPhotoQueue()` retries a failed upload 20 times over ~10 minutes
  then deletes the queue entry with no message at all, while the photo keeps
  displaying locally — so a crew member believes a photo is filed when nothing
  left the device. Nothing was changed in the app for this pass; findings only.
- 2026-07-31 — Backup and security assessment at handover, written up in
  `docs/BACKUP-AND-SECURITY.md` and used to correct the Backups entry in §2,
  which understated three things. Verified by reading the code: `backupNow()`
  captures `JSON.stringify(db)` only, so **no image bytes are backed up** —
  photo blobs live in the separate `files` store and `db` holds only `fileId`
  pointers, meaning a restore produces photo records with no files behind them.
  Snapshots are written to the same IndexedDB as the live data, so a lost
  device loses records and snapshots together; the only offsite path is the
  manual Download button, which also excludes images. `maybeAutoBackup()` is
  called from `startApp` for the owner and office roles only, so a period where
  just field crew use the app produces no snapshot at all. `checksum()` is a
  32-bit non-cryptographic hash, adequate for accidental corruption but not
  tampering, and `restoreTest()` only asserts every collection is an array, so
  it would pass on a structurally valid but empty database. On the security
  side, confirmed good: Supabase RLS deny-all (anonymous read returns 401),
  service-role key only in Vercel, all six routes fail closed, PINs salted and
  hashed with a five-try lockout. Confirmed weak: device storage is plaintext
  IndexedDB plus a localStorage mirror with no encryption at rest, sign-in is
  still browser-side only (§3.2), and `hashPin()` is a single SHA-256 round,
  which is thin cover for a 4-digit PIN if a hash ever leaks. Findings only —
  no application code changed.
- 2026-07-31 — Raised --text-muted contrast ratio to rgba(248, 250, 252, 0.88) in landing.html (issue landing-01) for WCAG AA readability compliance across service cards and text blocks. Verified with node scripts/qa-check.mjs.
- 2026-07-31 — Centralized business phone number into a single BUSINESS_PHONE constant in landing.html (issue landing-02) that populates all links/labels at runtime. Verified with node scripts/qa-check.mjs.
- 2026-07-31 — Added accessible booking/contact form to landing.html (issue landing-03). Features minimal name, phone, and message inputs with explicit accessible labels, inline error messages, and aria-invalid/aria-describedby attributes. Form POSTs to /api/notify and gracefully degrades to a direct call button with user inputs preserved if backend is unavailable. Buttons ("Book Now", "Book a Plumber") point smoothly to #contact. Verified with node scripts/qa-check.mjs and npm test (all 307 checks pass).
- 2026-07-31 — Final production sweep of the CRM (`index.html`). Found and fixed
  a blocker introduced by the executive facelift commit: the sign-in keypad's
  PIN check had lost four lines (`const typed`, the `pin` reset and the
  `await verifyPin(...)` test), which left an unmatched `}`. That is a fatal
  JavaScript syntax error, so the whole app — deployed included — booted to a
  blank page. Restored the original verification (including the wrong-attempt
  lockout and the owner MFA condition, both of which the same edit had dropped)
  and passed the typed code through to `finishLogin` so persona theming still
  works. Second boot-stopper: `openPlumbBotModal`, `closePlumbBotModal`,
  `sendPlumbBotMsg` and `initDraggableHUD` were defined inside `showLogin()`
  but referenced from top-level `onclick` handlers and the `Object.assign(window, …)`
  export, so the export threw `openPlumbBotModal is not defined` at load; moved
  them to top level. Third: the six "8K asset" images were image-generation
  prompt text pasted where a URL belongs (including unreplaced
  `{{DATA:IMAGE:IMAGE_15}}` placeholders) — all six returned 404, which is why
  no facelift was visible. Pointed the brand mark at the repo's own `logo.jpg`,
  used the existing `fa-robot` icon for PlumbBot, dropped the two cameo images
  that have no artwork in the repo, and gave the three persona themes solid
  gradient backdrops so each still reads distinctly. Also added four missing
  string-table keys (`inbox`, `all`, `escalations`, `approvalHistory`) that were
  rendering as raw lowercase keys — the bottom nav read "inbox" in both
  languages. Verified: `npm test` 332 passed / 0 failed, `npm run qa` pass:true,
  and a headless run of the real app signs in and renders all 26 screens at
  390px, 768px and 1280px with 0 JavaScript errors, 0 broken images and no
  horizontal overflow.
- 2026-07-31 — Closed a live authentication bypass introduced by the facelift
  commits earlier the same day; full detail in §3.10. `api/login.js` issued
  owner sessions to any caller (it returned the SMS code inside the token it
  handed back, and trusted `userId`/`role` from the request body), and the
  replacement gate's signing secret fell back to a placeholder committed to this
  repo, so tokens could also be forged directly. Either route reached the
  Supabase service-role key. Restored `hasServerAuth()` to unconditional
  `false`, deleted `api/login.js`, put the owner second code back on the local
  salted-hash check with its lockout, reduced `serverFetch()` to a pass-through
  that clears any stale `otto_jwt`, and dropped `jsonwebtoken`. Added forged-token
  and banned-literal regression tests. Verified in a browser: app boots, PIN
  sign-in works, the owner second-code screen appears and accepts the right code,
  zero `/api/login` requests, no page errors. `npm test` 340 checks, 0 failed;
  `npm run qa` passes. Owner still needs to rotate the Supabase service-role key
  and review access logs for the exposure window.
- 2026-08-01 — Owner reported the interface as buggy and glitchy; it was.
  `initDraggableHUD()` ran from `finishLogin()` for every user, role and screen
  size and made every `.card`/`.tile` draggable — and a card is the container for
  every list in the app. Measured at 390px with touch: one ordinary upward scroll
  on the customer list carried the card 216px up the screen
  (`transform: translate(-0.07px, -215.89px)`), over its own page header, leaving
  the rest blank. A second duplicate binding existed in `startApp()`. Removed
  both, dropped the now-unused interact.js CDN script, and took the function off
  the `window` export list (leaving it would have thrown at load and blanked the
  app — the PR #82 fault). Also raised `.wrap` bottom padding 120px → 168px: the
  floating assistant button occupies up to 144px from the bottom and was sitting
  on the Daily summary button. **The important part:** the automated sweep passed
  the whole time — 25 screens × 3 widths, no JS errors, no overflow, no broken
  images — because interact.js loads from a CDN the sandbox blocks, so the binding
  never happened where the testing was done. It only misbehaved where the CDN
  works, i.e. on the owner's phone. Proof of fix was taken with interact.js
  force-injected so the binding *could* have occurred: nothing registers as
  draggable and the same gesture leaves the card unmoved. Added
  `scripts/test-ui-regressions.mjs` (11 checks) covering draggable bindings, every
  `window` export resolving to a real definition, padding clearing the floating
  button, and no `<img>` pointing at a remote host. `npm test` 351 checks, 0
  failed; `npm run qa` passes. Remaining UI verification that cannot be done from
  a sandbox — icons, fonts, themes, the PlumbBot modal, a real phone pass — is
  written up in `docs/UI-DEBUG-HANDOFF.md`.

- 2026-08-01 — Refreshed the shared OTTO interface for field use: one navy and
  teal visual system across roles, clearer screen hierarchy, larger touch areas,
  and a phone-friendly two-column dashboard. Verified locally on desktop and a
  390px-wide phone view; `npm test` passed 351 checks with 0 failures and the QA
  review passed.
