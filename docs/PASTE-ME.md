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
- QuickBooks is out of scope. `docs/NO-QUICKBOOKS.md` is authoritative.
- Do not hardcode test totals. Run the full current suite and report the actual output.
- Done requires tests, `node scripts/qa-check.mjs`, real-browser verification, mobile and desktop checks, and direct evidence.

Current owner/office UI contract:

- Three primary windows are open together: **Today, Field Workers, Inbox**.
- Each window supports **minimize to the left side panel, restore, maximize, and full screen**.
- Do not replace this with a one-panel-at-a-time dashboard.
- Do not reintroduce generic drag/reorder behavior.
- **Julio = green accents. Saray = pink accents. Otto = blue OTTO identity.**
- Keep the supplied OTTO Plumbing `logo.jpg` as the CRM logo.
- **Plans & AutoCAD** must be clearly visible and use the existing PDF/DWG/DXF/DWF/DGN job-document workflow.
- **Crew Hours** must show actual recorded hours from job check-in/check-out for the whole field crew.
- Worker detail stays compact: current job, next job, today/week hours, time-off status. No random heatmaps, fake KPI hours, vanity location counts, or mock performance charts.
- Owner/office Settings stays restrained: appearance, team access, owner security, data safety, sign out.

Current priority order:

1. Finish and prove the owner/office workspace above.
2. Photo-upload reliability: never silently abandon a locally stored photo; keep retrying and show its pending/not-sent state.
3. Safe server authorization from current `main` under issue #70, preserving offline PIN unlock.
4. Cross-device record/photo proof with role and record-level isolation.
5. Reconcile verified duplicate/demo live rows under issue #111 only after backup, dependency review, and explicit destructive-action approval.
6. OCR/drawing reliability and clear failure messages.
7. Notifications only after authenticated server access is proven.
8. Final production and demo readiness.

Report only:

- what works,
- what is broken,
- what is blocked,
- what changed,
- and what is not done yet.

For the full current rules and acceptance criteria, follow `AGENTS.md` and `docs/REPO-CONTROL.md`.
