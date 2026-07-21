# STATUS — OTTO Plumbing CRM

Last updated: 2026-07-20, by an AI agent doing a full repo audit. This is an
honest snapshot, not a plan. See [DECISIONS.md](DECISIONS.md) for why things
were built this way, and [../AGENTS.md](../AGENTS.md) for the rules everyone
working here follows.

Current branch: `feat/otto-finish` (not yet merged into `main`).

## DONE

- Core CRM screens: customers, jobs/work orders, calls, notes, estimates,
  invoices, payments, checks, follow-ups, workflows, knowledge base, reports.
- Bilingual (English/Spanish) UI — automated check found 0 missing Spanish
  translations (`docs/QA_REPORT.md`).
- Rebrand from the previous "Dream Cooling" HVAC app to OTTO Plumbing is
  complete in the app itself — 0 remaining "Dream Cooling" mentions in
  `index.html`, `landing.html`, or `guide.html`.
- PWA install + offline shell (`manifest.json`, `sw.js`, cache name
  `otto-crm-v2`).
- Automated browser QA: 17/17 checks passing on a local server
  (`docs/QA_BROWSER.md`, run 2026-07-06).
- AI features working through server-side proxies: `api/claude.js`
  (assistant + OCR) and `api/nvidia.js` (drawing/PDF → materials estimate).
- CSV export for QuickBooks-format invoices/payments and for every record type
  (Reports).
- Worker accountability layer: check-in/out with work-only GPS, before/after
  photos, checklists, owner hub with exception tags.
- Miami Luxe visual design system with glassmorphism (commit `7b0e9ff`).

## IN PROGRESS

- `feat/otto-finish` branch has not been merged to `main`.
- A `.gitignore` edit (adding `.vercel`) was sitting uncommitted before this
  session — now included in this session's commit.
- The overnight task queue in the old `JULES.md` (now removed — see Known
  Issue #2 below, which is that file's unfinished item) left the webhook
  security task undone.

## NOT STARTED

- **QuickBooks two-way sync.** `api/quickbooks.js` is a stub — it returns the
  message `"Sync stub — wire Intuit API when credentials are live."` One-way
  CSV export works today; a live connection needs `QB_CLIENT_ID` and
  `QB_CLIENT_SECRET` in Vercel and further coding.
- **Real SMS/email delivery.** `api/notify.js` returns a 503 (meaning "not
  ready") until a Twilio account (for texts) and a SendGrid account (for
  email) are connected via environment variables.
- **Server-side MFA (multi-factor authentication, a second login step).**
  Only in-app equivalents exist today.
- **Immutable offsite backups.** Backups exist and are checksummed, but true
  write-once offsite storage needs a cloud provider to be wired up.

## KNOWN ISSUES

Ordered most serious first.

1. **A live cloud-database key is committed in the app code, and the repo is
   public.** `index.html` line 960 contains a fallback Firebase (Google's
   cloud database) project ID and API key, hardcoded. `api/inbound-email.js`
   writes to that same database using only that key. If the database's
   security rules are not locked down, anyone who reads this public GitHub
   repository can read or overwrite customer data. **This needs the owner's
   action outside of code** — an AI agent cannot fix this alone:
   - Go to the [Firebase console](https://console.firebase.google.com),
     project `otto-crm-7f951`, and lock down Firestore's security rules so
     only the app's authenticated writes are allowed.
   - Rotate (replace) the exposed API key.
   - Consider making the `ejnburrows-rgb/otto` GitHub repository private.
   - `docs/DEPLOYMENT_CHECKLIST.md` already listed "Rotate Firebase API key
     if exposed" and "Enable Firestore security rules" as unchecked to-dos —
     they are still unchecked.

2. **The inbound-email webhook has no security check.** `api/inbound-email.js`
   accepts any POST request from anyone on the internet and files it into the
   CRM as a real customer email — which then feeds the "Ask OTTO" AI
   assistant, meaning a stranger could plant instructions for the AI to
   follow (a "prompt injection" attack). Needs a shared-secret or signature
   check added, with the secret read from an environment variable.

3. **Demo PINs are published and described as real logins.**
   `docs/DEPLOYMENT_CHECKLIST.md` lists Owner PIN `0721` and Field PIN `0715`
   as the crew's actual sign-in codes, in a public repo's git history. Each
   crew member should get a unique PIN, and the demo PINs should be retired.

4. **`package.json` scripts are broken on this machine.** `dev`, `start`, and
   `preview` all call `python3 -m http.server 3000 --directory
   /home/daytona/codebase` — a path from a different (cloud) computer that
   does not exist here. On this Windows machine, run
   `python -m http.server 8000` from the repo folder instead (see updated
   `README.md`).

5. **`.gitignore` was mostly a comment, not a real ignore list**, and had no
   `.env` entry — fixed in this session (see commit).

6. **`docs/CLEANUP_PLAN.md` claimed a security scan found no exposed key.**
   That claim was wrong (see issue #1) and the file has been removed to avoid
   spreading false confidence; the accurate parts are folded into this file.

7. **`docs/QA_CHECKLIST.md` told readers to `cd D:\Projects\otto-fresh`** —
   a path from a different machine. Corrected to point at this repo's actual
   location.

8. **The stored QA report (`docs/QA_REPORT.md`, dated 2026-07-06) is stale.**
   Re-running `node scripts/qa-check.mjs` on 2026-07-21 against the live
   production site gives `"pass": false` — `manifest.json` and `sw.js` now
   return 404 (not found) on the production URL, and `api/quickbooks` /
   `api/notify` also return 404 instead of the expected 200/503. The
   application code itself (functions, buttons, Spanish translations) still
   checks out clean — 356 functions, 119 buttons, 0 missing translations.
   This looks like a production deployment or routing problem on the live
   site, not a code defect in this branch. Needs investigating: is
   `otto-plumbing-site.vercel.app` serving the current build, or an old/
   misconfigured one?
