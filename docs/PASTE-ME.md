# OTTO Plumbing CRM — paste-in brief

Use this only when the coding environment does not automatically load repository instructions.

Repository: `ejnburrows-rgb/otto`

Read before doing anything:

1. `AGENTS.md`
2. `docs/REPO-CONTROL.md`
3. `docs/STATUS.md`
4. `docs/DECISIONS.md`
5. `docs/NO-QUICKBOOKS.md`

## Permanent rules

- Never commit directly to `main`.
- Never force-push or rewrite shared history.
- Never commit secrets, PINs, passwords, keys, tokens, or fallback credentials.
- Never hand-build authentication or homemade JWT verification.
- Server access must fail closed when identity/configuration is missing or invalid.
- Do not alter authentication, payments/accounting behavior, live data, production deployment, or paid services without director approval.
- Do not delete live data without approval for the exact rows after backup/dependency review.
- Do not trust old task queues, branch reports, audits, or chat summaries over the current repository control files.
- Do not hardcode a permanent test total; run the current suite and report the actual result.
- UI completion requires real-browser evidence, including phone/desktop checks.

## Current truth

- The permanent-left-rail owner/office home is already on `main`; do not redo it.
- Supabase and the core production tables already exist.
- Sensitive server APIs remain intentionally fail-closed pending fresh authorization work.
- PR #103 was reviewed and closed unmerged. Do not resurrect or merge it wholesale.
- Build real server authorization fresh from current `main` under issue **#70**.
- QuickBooks/Intuit integration was deliberately removed and is out of scope. Do not reintroduce it.
- Existing duplicate/demo live jobs require the separate exact-row decision in issue **#111**; no deletion is implied.
- Production/browser QA and the public website Git→Vercel auto-deploy repair are tracked in issue **#110**.

## Active priority order

1. #110 — production QA and website Git→Vercel auto-deploy, without touching auth.
2. #70 — fresh server authorization using provider-backed identity, explicit allowlists, and record/job-level authorization.
3. #111 — decide/prepare exact safe cleanup of the existing duplicate/demo live rows; do not delete without approval.
4. After authorization is safe, prove cross-device records and photo bytes using separate accounts.
5. Address OCR/provider reliability only from verified defects.
6. Final production readiness and sign-off.

Keep English/Spanish, light/dark, offline behavior, current wallpapers, current navigation, and working CRM functionality intact unless a verified defect requires a scoped change.

Final reports must state only:

- **Works**
- **Broken**
- **Blocked**
- **Changed**
- **Not done yet**

For full acceptance criteria, follow `AGENTS.md` and `docs/REPO-CONTROL.md`.