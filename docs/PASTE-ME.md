# OTTO Plumbing CRM — paste-in brief

Use this only in an environment that does not automatically load repository instructions.

You are working in `ejnburrows-rgb/otto`.

Before doing anything, read:

1. `AGENTS.md`
2. `docs/REPO-CONTROL.md`
3. `docs/STATUS.md`
4. `docs/DECISIONS.md`
5. `docs/UNIFIED-FILE-INTAKE.md` for uploads, imports, OCR, or Plans & AutoCAD

The goal is to finish OTTO as a dependable, demo-ready and production-ready plumbing CRM without redoing completed work.

Permanent rules:

- Never commit directly to `main`.
- Never force-push or rewrite history.
- Never commit secrets or invent credentials.
- Never hand-build authentication.
- Keep `api/_lib/serverAuth.js` fail-closed until issue #70 has a fresh, approved and deployed server-authorization implementation from current `main`.
- Do not change authentication, payments, live data, production deployment, or paid services without director approval.
- Do not trust old reports, task queues, branch scripts, or chat summaries over the current repository control files.
- QuickBooks is out of scope unless the owner explicitly changes that decision.
- Do not hardcode test totals. Run the full current suite and report actual output.
- Done requires tests, `node scripts/qa-check.mjs`, real-browser verification, mobile and desktop checks, and direct evidence.

Current owner/office UI contract:

- Three primary windows are open together: **Today, Field Workers, Inbox**.
- Each supports **minimize, restore, maximize, and full screen**.
- **Desktop uses the left-side workspace rail. Phone uses a compact bottom dock** so content gets the full narrow-screen width.
- Do not replace this with a one-panel-at-a-time dashboard.
- Do not reintroduce generic drag/reorder behavior.
- **Julio = green accents. Saray = pink accents. Otto = blue OTTO identity.**
- Keep the supplied OTTO Plumbing `logo.jpg` as the CRM logo; it returns Home.
- **Plans & AutoCAD** stays clearly visible and uses the existing job-document/drawing workflow.
- **Crew Hours** shows actual recorded hours from job check-in/check-out for the whole field crew.
- Worker detail stays compact: current job, next job, today/week hours, time-off status. No random heatmaps, fake KPI hours, vanity location counts, or mock performance charts.
- Owner/office Settings stays restrained: appearance, team access, owner security, data safety, sign out.
- Refine rather than redesign: consistent secondary screens, restrained effects, practical touch targets, wrapped tabs, accessible dialogs, intentional empty/error/confirmation states.

Unified file intake:

- Use one **Upload / Import** front door instead of separate competing spreadsheet/OCR/CAD upload experiences.
- `.xlsx`, `.xls`, `.csv` are parsed directly as structured employee data; do not OCR spreadsheets.
- Photos/scans use browser-side bilingual OCR with English + Spanish.
- `.dwg`, `.dxf`, `.dwf`, `.dgn` require a job and reuse the existing drawing pipeline.
- PDF asks one simple choice: **Read text / scanned document** or **Plan / drawing**.
- All applicable flows end in review before save.
- Employee imports are always **Field Worker**, never import PINs, and never fabricate attendance.
- Do not restore the old provider-key/Claude OCR flow as the normal user experience.

Current priority order:

1. Finish and prove the refined owner/office workspace above, including desktop rail and phone dock.
2. Preserve and prove unified file intake.
3. Photo-upload reliability: never silently abandon a locally stored photo; keep retrying and show its pending/not-sent state.
4. Safe server authorization from current `main` under issue #70, preserving offline PIN unlock.
5. Cross-device record/photo proof with role and record-level isolation.
6. Reconcile verified duplicate/demo live rows under issue #111 only after backup, dependency review, and explicit destructive-action approval.
7. Notifications only after authenticated server access is proven.
8. Final production and demo readiness.

Report only:

- what works,
- what is broken,
- what is blocked,
- what changed,
- and what is not done yet.

For full current rules and acceptance criteria, follow `AGENTS.md` and `docs/REPO-CONTROL.md`.
