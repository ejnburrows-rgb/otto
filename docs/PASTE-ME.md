# PASTE ME — the whole project, in one block

**What this is.** A self-contained brief to paste at the start of any session, in
any tool, on any account. It assumes nothing has been loaded from this
repository, so it still works in a web IDE, a fresh sandbox, a different account,
or a tool that reads none of the usual instruction filenames.

**How to use it.** Copy everything below the line, paste it as your first
message, then say what you want in one sentence — "fix the photo upload thing",
"add a field to invoices". That is all.

Pasting it when the repo's own files *have* loaded is harmless; it just repeats
them.

**Keep it current.** The figures below were verified against `main` at `92ec282`
on 2026-07-31. Ask for a refresh whenever they move materially — the numbers are
what make it trustworthy.

---

You are working on **OTTO Plumbing CRM** — repo `ejnburrows-rgb/otto`, live at
https://otto-kohl.vercel.app. Read this whole brief before you do anything.

## Who you are working for

EJN owns a plumbing business in Miami. He is **not a programmer**. Define any
technical term in one short phrase the first time you use it. He loses context
between sessions, so never make him brief you or remember where something is. If
you find something missing from the repo's own notes, add it there.

## What this project is

A field-service CRM for a plumbing company with 19 staff — 2 owners, an office
manager, an IT account, 15 field crew. Customers, jobs, calls, estimates,
invoices, payments, checks, follow-ups, payroll, GPS check-in/out, job photos,
printable invoices, English and Spanish throughout.

**The whole app is one file:** `index.html`, 5,544 lines, no build step, no
framework. Serverless functions live in `api/`. Hosted on Vercel, deploying
automatically from `main`. Database is Supabase (project `otto-live`). Data is
stored on each device in IndexedDB so it works with no signal.

## Verified status, 2026-07-31

- `main` = `92ec282`. The live site is **byte-identical** to it.
- `npm test` → **340 checks, 0 failed**. `node scripts/qa-check.mjs` → `pass: true`.
- Production: app `200`, `/api/data` `403` (correct — see below), `/api/login` `404` (correct — deleted).
- Supabase holds 3 customers, 13 jobs, 1 invoice, 19 staff, 0 photos, 0 auth users.

## THE RULES — each has already been broken here and shipped to production

1. **Never make `hasServerAuth()` in `api/_lib/serverAuth.js` return true.** It
   returns `false` on purpose. It is the only thing standing in front of the
   Supabase service-role key — the master database password. On 2026-07-31 it
   was replaced with hand-rolled JWT verification whose signing secret fell back
   to a placeholder committed to the repo, alongside an `api/login.js` that
   returned the SMS code *inside the token it handed the caller* and took
   `userId` and `role` straight from the request body. Anyone on the internet
   could mint an owner session with no PIN and read or write every customer
   record. It was live. See `docs/STATUS.md` §3.8 and §3.10.
2. **Never hand-build authentication.** No homemade password, session, JWT or
   MFA handling. Use a real provider.
3. **Never commit a credential** — not a key, token, password, PIN, or
   "development fallback" secret. Three have reached this repo already. Once
   pushed it cannot be un-published, only revoked. A pre-commit hook now blocks
   the obvious shapes; do not bypass it with `--no-verify` to get a secret in.
4. **Never commit to `main`.** Branch, open a pull request, let EJN merge.
5. **Never force-push.** It destroyed a session's work here once.
6. **Never put a remote URL in an `<img src=>`.** Commit the real image file and
   use a relative path — the app must work offline. Six images once shipped with
   image-generation *prompt text* where the URL belonged; all 404'd and none of
   that redesign was visible.
7. **Never invent a link, name, number or file path.** If you do not have a real
   one, say so and stop. A plausible wrong answer is worse than no answer.
8. **Never put an AI or tool name** in a commit message, author or PR body.
   Commit as `git commit --author="EJN <ejnburrows@gmail.com>"`.

## DONE means all three, every time — paste the real output

1. `npm test` → 340 checks, 0 failed. **A run that stops early is not a pass** —
   sum the per-script totals. If it dies on a missing package, run `npm install`.
2. `node scripts/qa-check.mjs` → `"pass": true`, `missingHandlers: []`.
3. **The real app in a real browser.** `npm start` serves it on
   http://localhost:8000. Sign in, click through every screen you touched.
   Zero JavaScript errors, zero broken images, no sideways scroll, and a
   **screenshot** of the final state.

**Every fault that ever shipped here would have been caught by step 3.** A
description of what you believe happened is not evidence. No output = not done.

Specific traps that have actually bitten here: a syntax error means *nothing*
runs and the page is blank — load it, don't just read it. A function defined
inside another function but called from a top-level `onclick` throws at load. A
string added to the English table but not Spanish (or neither) renders as a raw
key. An `<img>` whose src 404s renders as nothing and looks fine in the source.

## What already works — do not rebuild it

- **Client demo:** `?demo=1` seeds 3 customers, 5 jobs, 1 estimate, 2 invoices
  (one paid, one part-paid), 2 payments. Every row is stamped `demo: true` and
  stripped before any upload, so it can never reach the real database. `?demo=0`
  turns it off and deletes those rows.
- **Roles:** `owner` and `office` (which includes the IT account) can both reach
  the Team screen to create staff and set sign-in codes. Field crew cannot.
  KPIs and the audit trail are owner-only.
- **Delete** on customers, jobs, invoices, estimates and payments — soft delete
  into a stored bin, recoverable. Deleting a payment returns the money to its
  invoice.
- **Backup download** includes photo files (base64 in the same JSON, no library,
  works offline). Restores on another device.
- **Sign-in** is a 4-digit code per person, stored salted and hashed, with a
  five-try lockout. Owners can have a second code, checked on the device.

## The work, highest value first

### 1. Photo uploads fail silently — the worst live defect

`_drainPhotoQueue()` (`index.html` ~1299–1345) retries a failed upload every 30
seconds and, after 20 attempts (~10 minutes), **deletes the queue entry and gives
up with no message of any kind.** The photo carries on displaying from the phone's
own storage, so a crew member believes it is filed. Because the server gate
refuses everything, *every upload currently fails this way.*

Why it matters: job photos are the evidence behind an invoice in a dispute.

Same shape nearby: `getFileURL()` (~1269) returns `null` on failure so the image
is simply absent with no explanation; `deletePhotoFile()` (~1351) ignores its
result; `cloudPush()` (~1500) logs failures to the console only.

Build a visible, persistent indicator — extend the Backups screen
(`viewBackups`, ~4741), which already surfaces this kind of state. Do not add a
toast that fires every 30 seconds. Tests go in `scripts/test-photos.mjs`.

### 2. OCR shows one identical message for every failure

Chain: `ocrDocument` / `ocrCheck` / `ocrCustomerAccount` (~3369) → `aiVision()`
(~3360) → `callClaude()` (~3340).

**Important and non-obvious:** `callClaude()` has *two* paths — `/api/claude`
(always `403`, gated) and then a fallback using a personal Anthropic key from
`localStorage.otto_ai_key` entered in Settings, calling the provider directly
from the browser. **So OCR can actually work today with a key**, unlike the
NVIDIA path (`callNvidia`, ~3411) which is server-only and genuinely dead.

Do: test `ocrCheck` on a photographed check and `ocrDocument` on an invoice with
a real key, and report the actual extracted output. Establish what happens when
the model replies with prose or a fenced code block — `aiVision` does a regex
then `JSON.parse`, and a parse failure returns `null`, indistinguishable from
"no key". `toast(t('noKey'))` currently fires for *every* failure mode; separate
them. Confirm the hardcoded model id `claude-sonnet-4-6` is valid for vision.

**Raise with EJN, do not decide alone:** whether the browser-key fallback should
exist at all. It puts a paid key in a browser. Mitigating: it is per-device,
never syncs, and is opt-in. It is also currently the only way any AI works.

### 3. A photo taken on a crew phone never reaches anyone else

Blocked in **two independent places** — both must work:
- the photo **record** goes through `cloudPush()` → `/api/data` → `403`
- the image **bytes** go through `storeFile()` (~1268) → `/api/photos` → `403`

**No permission work is needed.** There is no separate photo screen — photos
render in the job detail view (~2280), and both `owner` and `office` already
have `jobs` access. It lights up for both the moment sync works.

Since the gate cannot open, prove the path end-to-end **in a test harness only,
never in shipped code**, with screenshots from three browser profiles (field,
owner, office), and report exactly what stays blocked.

### 4. Server-side sign-in — the thing everything waits on

EJN has already chosen **Supabase Auth**, and explicitly authorised working
directly in the `otto-live` project. `auth.users` is currently empty.

Design note that matters: the app is offline-first and Supabase Auth needs
internet. Keep the 4-digit PIN as the on-device unlock so crew can work with no
signal, and add the Supabase session purely for server calls. Do not replace the
PIN with an online login.

This unblocks cloud sync, photo sync, AI, customer notifications and QuickBooks —
all of which are built and switched off behind it.

**Do not start this without confirming with EJN first.** It is the largest piece
of work in the project and touches sign-in.

## Things only EJN can do — remind him, do not attempt

- **GitHub Actions has never once run on this repo.** Every red cross comes from
  a phantom deleted workflow that fails at startup; `ci.yml` has one run in its
  whole history, also a startup failure. So local `npm test` is the only real
  safety net. He needs to check repo Settings → Actions and the account spending
  limit (private repo, billable minutes).
- **13 job rows in Supabase where 3 are expected** — 10 demo rows from an old
  seeding fault, already fixed at source. Deleting live rows is his call;
  criteria are in `docs/DUPLICATE-DATA-CLEANUP-REPORT.md`.
- PRs **#77** and **#78** are open and undecided. Issues **#28** and **#70** are
  open; #70's containment shipped but its architecture gate has not.
- A retired Windows "heartbeat" scheduled task may still exist on his PC.

## How to report

Plain language. For each thing you touched, say plainly whether it **works**, is
**broken**, or is **blocked**, and attach the real evidence. Never describe a
blocked feature as working. Add one dated line to the session log at the bottom
of `docs/STATUS.md`. Open a pull request. **Do not merge it yourself.**

## Where to read more

`docs/AGENT-HANDOFF.md` (how to work here), `docs/STATUS.md` (honest state —
§3.8 and §3.10 are required before touching `api/`),
`docs/BACKUP-AND-SECURITY.md`, `AGENTS.md` (the rules in full).
