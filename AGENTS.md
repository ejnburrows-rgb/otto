# AGENTS.md — OTTO Plumbing CRM

This file is the single source of truth for any AI agent (Claude, Gemini, or other)
working in this repository. Read it before doing anything else. If another rules
file disagrees with this one, this one wins.

## PROJECT

OTTO is a bilingual (English/Spanish), mobile-first business app — a CRM (Customer
Relationship Manager, meaning software that tracks customers, jobs, and payments) —
built for a real plumbing company, OTTO Plumbing Inc., serving Miami-Dade and
Broward. It is used by a hands-on owner and a crew of about 19 people (2 owners,
1 office/ops person, 1 IT/logs role, 15 field workers). It runs as a PWA
(Progressive Web App — a website that can be installed on a phone's home screen
like a real app, and keeps working without internet). "Finished" means: every
field worker can log jobs, photos, and hours from their phone anywhere, including
with no signal; the owner can see the whole business from one screen; money
(estimates, invoices, payments, checks) is tracked accurately; and no customer
data is exposed to anyone outside the company.

## TECH STACK

- **HTML / CSS / JavaScript (vanilla, no framework)** — the entire app is one file, `index.html`, with no build step.
- **IndexedDB + localStorage** — browser-built-in storage, so the app keeps working with no internet connection.
- **Service Worker (`sw.js`)** — a background script that caches the app shell so it opens instantly and works offline.
- **Firebase Firestore** — Google's cloud database, used only if the owner turns on "Cloud Sync" so data shares across devices.
- **Vercel** — the hosting service that runs the site and its small server-side helper functions (`api/` folder).
- **Vercel Serverless Functions** — small on-demand server programs, one per file in `api/`, so secret API keys never sit in the browser:
  - `api/claude.js` — relays requests to Anthropic's Claude AI (assistant answers, OCR/reading of scanned documents).
  - `api/nvidia.js` — relays requests to NVIDIA's AI (reads uploaded drawings/PDFs into a materials estimate).
  - `api/inbound-email.js` — receives forwarded customer emails and files them into the CRM's Inbox.
  - `api/notify.js` — sends customer text messages and emails (not yet connected to a real Twilio/SendGrid account — currently a stub).
  - `api/quickbooks.js` — connects to QuickBooks accounting software (not yet connected — currently a stub).
- **Playwright** — a browser-automation tool used only by the QA scripts in `scripts/` to click through the app and check nothing is broken.
- **GitHub Actions** — automated steps that run on GitHub whenever code is pushed; here it deploys a copy of the site to GitHub Pages.

## STATUS

Current state of work lives in [docs/STATUS.md](docs/STATUS.md). Read it before
doing anything.

## HOW WE WORK

- Prefer the simplest solution that works. Don't add a library, a framework, or a
  new file when a small change to the existing code does the job.
- Comment code in plain language. If you use a technical term in a comment,
  explain it in parentheses the first time it appears, the same way this file does.
- Never rewrite a whole file when a small, targeted edit works. Large rewrites are
  hard for a non-technical owner to review and hide bugs.
- Verify your work actually runs before saying you are done. Show proof: paste
  the test output, or describe a screenshot you took confirming the change works.
  "I made the change" is not proof; "I ran it and here's what happened" is.

## GIT RULES

- Commit messages look like: `type: short description` (example:
  `fix: correct Spanish label on invoice screen`). Common types: `feat` (new
  feature), `fix` (bug fix), `docs` (documentation only), `chore` (small
  maintenance task).
- Plain `git push` is allowed and expected — you do not need to ask permission
  first.
- Never force-push (`git push --force`). It can permanently erase other people's
  work.
- The commit author is always EJN. Do not add AI names or "Co-authored-by" lines.

## SAFETY RULES

- No passwords, API keys, or other secrets in code. They belong only in a `.env`
  file (a local file that holds secret settings), and `.env` must always be
  listed in `.gitignore` (the file that tells Git which files to never save/publish).
- Before running any destructive command (one that deletes or overwrites data),
  state exactly what will be deleted first, in plain language, and wait for
  confirmation unless the owner has already said to proceed.
- Never touch a live/production database or service directly. Always go through
  the app's normal features or a clearly-labeled test/staging copy.
- **This project is a CRM handling real client data.** Treat every database
  operation — reading, writing, deleting, migrating — as high-risk. When in
  doubt, stop and ask.

## DOCUMENTATION DUTY

At the end of every session:

1. Update [docs/STATUS.md](docs/STATUS.md) with what changed, in plain language.
2. Log any technical decision (a choice between two ways of building something,
   and why one was picked) in [docs/DECISIONS.md](docs/DECISIONS.md), with
   today's date and one plain-language line.

This is not optional. The next agent — human or AI — depends on these two files
being current.
