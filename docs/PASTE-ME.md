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
- Keep `api/_lib/serverAuth.js` fail-closed until approved Supabase Auth is implemented.
- Do not change authentication, payments, live data, production deployment, or paid services without director approval.
- Do not trust old reports, task queues, branch scripts, or chat summaries over the current repository control files.
- Do not hardcode test totals. Run the full current suite and report the actual output.
- Done requires tests, `node scripts/qa-check.mjs`, real-browser verification, mobile and desktop checks, and direct evidence.

Current priority order:

1. Repository governance realignment.
2. Visible and truthful photo-upload failure handling.
3. Supabase Auth while preserving offline PIN unlock.
4. Safe cross-device record and photo synchronization.
5. OCR reliability and clear failure messages.
6. Notifications and QuickBooks only after authenticated server access.
7. Final production and demo readiness.

Report only:

- what works,
- what is broken,
- what is blocked,
- what changed,
- and what is not done yet.

For the full current rules and acceptance criteria, follow `AGENTS.md` and `docs/REPO-CONTROL.md`.
