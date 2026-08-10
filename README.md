# OTTO Plumbing CRM

OTTO is the internal bilingual CRM for **OTTO Plumbing Inc.** It is a mobile-first, offline-capable Progressive Web App for customers, jobs, field work, documents, estimates/invoices/payments, payroll intake, Inbox, reporting, job photos, work-only check-in/location, and Ask OTTO.

**Production CRM:** `https://otto-kohl.vercel.app`

The public plumbing website is maintained separately in `ejnburrows-rgb/otto-plumbing-site`.

## Start here

For current instructions and product truth, read in this order:

1. `AGENTS.md`
2. `docs/REPO-CONTROL.md`
3. `docs/STATUS.md`
4. `docs/DECISIONS.md`
5. `docs/NO-QUICKBOOKS.md`

Old task queues, branch handoffs, historical audits, and chat summaries are not active instructions unless `docs/REPO-CONTROL.md` explicitly activates them.

## Current state

- The current owner/office home is already merged to `main` and uses the permanent left rail: **Today / Field Workers / Inbox / Tools**.
- Current wallpapers and the OTTO wordmark are committed assets.
- English/Spanish, light/dark, and local/offline behavior must be preserved.
- The Supabase project and core production tables already exist. This is **not** waiting on initial database creation or merely two Vercel variables.
- Sensitive server routes remain intentionally fail-closed until the fresh server-authorization work in issue **#70** is implemented and proven from current `main`.
- The older Supabase Auth attempt, PR **#103**, was reviewed and closed unmerged. Do not resurrect or merge that branch wholesale.
- Read-only verification on 2026-08-10 found 19 users, 3 customers, 13 jobs, 1 invoice, and 0 Supabase Auth users. The ten later duplicate/demo job rows are tracked separately in issue **#111**; no live deletion is authorized by this README.
- Production/browser QA and the public website GitHub→Vercel automatic-deployment repair are tracked in issue **#110**.

## Authentication and shared sync

A local PIN is a convenient device unlock; it is not sufficient server authorization.

The replacement server authorization must be built fresh from current `main` under issue #70 using provider-backed identity, explicit role allowlists, record/job-level authorization, fail-closed defaults, and deployed multi-account proof.

Until that work is complete, do not describe shared server data, cross-device photo access, notifications, or server AI as safely production-enabled simply because backend code or environment variables exist.

## QuickBooks

**QuickBooks/Intuit integration is deliberately out of scope.** `docs/NO-QUICKBOOKS.md` is authoritative.

Keep OTTO's native invoices/payments, generic CSV export, payroll import, jobs, customers, documents, reports, Inbox, and Ask OTTO. Do not restore `/api/quickbooks`, Intuit OAuth, QuickBooks credentials, QuickBooks-specific UI, or QuickBooks-specific tests without a new explicit requirement.

## Main capabilities

- Customers, jobs, calls, notes, follow-ups, and workflows
- Job photos and documents
- Estimates, invoices, payments, and checks inside OTTO
- Payroll spreadsheet/CSV intake
- Inbox/email register
- Work-only field check-in/out and location records
- Reports, audit/history, backups, JSON/CSV export
- Project/job context and Ask OTTO
- English and Spanish
- Light and dark modes
- Offline-first PWA behavior

Some provider/server-backed capabilities remain blocked until issue #70 is complete. Code presence alone is not proof that a feature is live.

## Development and verification

Before changing anything, start from current `main` on a focused branch and follow the repository control files above.

Run the current applicable commands from `package.json`. The normal verification baseline includes:

```bash
npm test
node scripts/qa-check.mjs
npm run qa:visual
```

For UI or behavior changes, browser verification is mandatory. Check phone and desktop widths, English/Spanish, light/dark where applicable, JavaScript errors, broken images, navigation, and unintended overflow.

Do not put a permanent fixed test count in this README; report the actual result of the current run.

## Safety

- Never commit secrets, API keys, PINs, passwords, tokens, or fallback credentials.
- Never hand-build authentication or homemade JWT verification.
- Never make the server authorization boundary permissive as a shortcut.
- Never delete live data without explicit approval for the exact rows after backup and dependency review.
- Never reintroduce retired Firebase or QuickBooks configuration.
- Never claim production/deployment success without direct evidence.

For full rules and the active priority order, use `AGENTS.md` and `docs/REPO-CONTROL.md`.