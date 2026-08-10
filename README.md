# OTTO Plumbing CRM

OTTO is the internal bilingual CRM for **OTTO Plumbing Inc.** It is a mobile-first Progressive Web App built around customers, jobs, field work, documents, estimates/invoices/payments, payroll intake, Inbox, reporting, job photos, GPS check-in/out, and Ask OTTO.

**Production CRM:** `https://otto-kohl.vercel.app`

The public plumbing website is a separate repository: `ejnburrows-rgb/otto-plumbing-site`.

## Start here

Repository instructions are authoritative in this order:

1. `AGENTS.md`
2. `docs/REPO-CONTROL.md`
3. `docs/STATUS.md`
4. `docs/DECISIONS.md`

Old task queues, branch handoffs, historical audits, chat summaries, and tool-specific prompts are not current instructions unless `docs/REPO-CONTROL.md` explicitly activates them.

## Current product state

- The current owner/office home and permanent left rail are merged to `main`.
- The home uses **Today / Field Workers / Inbox / Tools** with one active panel at a time.
- Current wallpapers and the OTTO wordmark are committed assets.
- English/Spanish and light/dark behavior are part of the current UI.
- Local/offline CRM behavior is preserved.
- The Supabase project and core production tables already exist.
- Sensitive server routes remain intentionally fail-closed until the fresh server-authorization work in GitHub issue **#70** is implemented and proven.
- Existing duplicate/demo live job rows require a separate owner-approved cleanup decision; see issue **#111**. Do not delete live rows casually.
- Final production/browser QA and the website Git→Vercel auto-deploy repair are tracked in issue **#110**.

## Authentication and sync

The local PIN experience is not a substitute for server authorization.

A previous Supabase Auth branch (PR #103) was reviewed and closed unmerged because it was stale relative to current `main` and did not enforce sufficiently narrow field access. Do not resurrect or merge that branch wholesale.

The replacement must be built fresh from current `main` under issue #70 using provider-backed identity, explicit server-side role/record authorization, fail-closed defaults, and deployed multi-account proof.

Until that is complete, server-backed shared data, cross-device photo access, notifications, and server AI must not be presented as safely enabled merely because Supabase environment variables exist.

## QuickBooks

**QuickBooks/Intuit integration is deliberately out of scope.** See `docs/NO-QUICKBOOKS.md`.

Keep OTTO's native invoices/payments, generic CSV export, payroll file import, and reporting. Do not reintroduce `/api/quickbooks`, Intuit OAuth, QuickBooks credentials, QuickBooks-specific UI, or QuickBooks-specific tests without a new explicit requirement.

## Main capabilities

- Customers and jobs
- Calls, notes, follow-ups, workflows, and SOPs
- Job photos and documents
- Estimates, invoices, payments, and checks inside OTTO
- Payroll spreadsheet/CSV intake
- Inbox/email register
- Work-only field check-in/out and location records
- Project/job context and Ask OTTO
- Reports, audit/history, backup/export tooling
- English and Spanish
- Light and dark modes
- Offline-first PWA behavior

Some server/provider-backed capabilities remain blocked until issue #70 is complete. Read `docs/STATUS.md` for the evidence-based current state rather than assuming that code presence means a feature is live.

## Development and verification

Before making changes, read the repository control files above and start from current `main` on a focused branch.

Run the current applicable verification commands from `package.json`. The normal baseline includes:

```bash
npm test
node scripts/qa-check.mjs
npm run qa:visual
```

Browser verification is mandatory for UI work. Test phone and desktop widths and verify JavaScript errors, broken images, overflow, navigation, English/Spanish, and light/dark behavior.

Do not hardcode a permanent test-count claim in this README; report the actual result from the run.

## Safety

- Never commit secrets, API keys, PINs, passwords, or fallback credentials.
- Never hand-build authentication or homemade JWT verification.
- Never make the server authorization boundary permissive as a shortcut.
- Never delete live data without explicit approval for the exact records.
- Never reintroduce retired Firebase or QuickBooks configuration.
- Never claim production/deployment success without direct evidence.

For the full rules and current priority order, use `AGENTS.md` and `docs/REPO-CONTROL.md`.