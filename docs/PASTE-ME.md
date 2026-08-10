# OTTO Plumbing CRM — paste-in brief

Use this only in an environment that does not automatically load repository instructions.

You are working in `ejnburrows-rgb/otto`.

Before doing anything, read:

1. `AGENTS.md`
2. `docs/REPO-CONTROL.md`
3. `docs/STATUS.md`
4. `docs/DECISIONS.md`

The project goal is to finish OTTO as a dependable, demo-ready and production-ready plumbing CRM without redoing completed work.

Permanent rules:

- Never commit directly to `main`.
- Never force-push or rewrite history.
- Never commit secrets or invent credentials.
- Never hand-build authentication.
- Keep `api/_lib/serverAuth.js` fail-closed until issue #70 has a fresh, approved and deployed server-authorization implementation from current `main`.
- Do not change authentication, payments, live data, production deployment, or paid services without director approval.
- Do not trust old reports, task queues, branch scripts, or chat summaries over the current repository control files.
- Do not resurrect PR #103 wholesale; it was closed after independent review found stale scope and authorization gaps.
- QuickBooks is out of scope. `docs/NO-QUICKBOOKS.md` is authoritative.
- Do not hardcode test totals. Run the full current suite and report the actual output.
- Done requires tests, `node scripts/qa-check.mjs`, real-browser verification, mobile and desktop checks, and direct evidence.

Current priority order:

1. Repository governance cleanup and stale-branch/PR/issue reduction using current evidence.
2. Photo-upload reliability: never silently abandon a locally stored photo; keep retrying and show its pending/not-sent state.
3. Safe server authorization from current `main` under issue #70, preserving offline PIN unlock.
4. Cross-device record/photo proof with role and record-level isolation.
5. Reconcile the verified duplicate/demo live rows under issue #28 only after backup and explicit destructive-action approval.
6. OCR reliability and clear failure messages.
7. Notifications only after authenticated server access is proven.
8. Restore and prove the website GitHub `main` → Vercel automatic deployment path under issue #110.
9. Final production and demo readiness.

Report only:

- what works,
- what is broken,
- what is blocked,
- what changed,
- and what is not done yet.

For the full current rules and acceptance criteria, follow `AGENTS.md` and `docs/REPO-CONTROL.md`.
