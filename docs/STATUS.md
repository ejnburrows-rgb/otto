# STATUS — OTTO Plumbing CRM

Last updated: 2026-08-11.

This file is the current factual snapshot. Historical incident detail remains in Git history and issue/PR discussions; it is intentionally not repeated here because stale status narratives were causing agents to redo completed work or restore superseded UI decisions.

**Production CRM:** `https://otto-kohl.vercel.app`

**Production redeploy requested:** 2026-08-10 after the final owner-workspace revision reached `main`, because the public production domain was still serving the superseded one-panel UI.

## Works

- Core offline-first CRM records and workflows remain present: customers, jobs, calls, notes, estimates, invoices, payments, checks, follow-ups, payroll intake, documents, reports, backups, Inbox, field check-in/out, work-only location records, and Ask OTTO.
- English/Spanish and light/dark modes are part of the app.
- The supplied OTTO Plumbing wordmark is `logo.jpg` and is the approved CRM logo.
- Julio and Saray have committed wallpaper assets.
- The existing job document/drawing flow accepts PDF, DWG, DXF, DWF and DGN files and can route them into the drawing/estimate pipeline.
- Failed job-photo uploads are protected by a persistent retry flow instead of being silently abandoned.
- Local PINs are hashed on supported browsers and wrong attempts are rate-limited. Local PIN unlock is still only a device-level convenience, not server authorization.
- QuickBooks is intentionally out of scope; OTTO keeps its own invoice/payment/payroll workflows and generic exports.

## Current owner / office UI contract

This is the required UI direction. It supersedes the one-panel-at-a-time home that was previously merged.

- **Three primary windows open together:** Today, Field Workers, Inbox.
- Each primary window supports **minimize to the left side panel, restore, maximize inside the workspace, and full screen**.
- **No generic drag/reorder.** The previous drag implementation interfered with ordinary scrolling.
- **Julio:** green interface accents + Julio wallpaper.
- **Saray:** pink interface accents + Saray wallpaper.
- **Otto:** blue OTTO identity; no wallpaper is invented.
- **Plans & AutoCAD:** visible directly from the left side panel and also promoted in Tools; uses the existing PDF/DWG/DXF/DWF/DGN job-document pipeline.
- **Crew Hours:** whole-team today/week totals and currently clocked-in count, derived from real job check-in/check-out records.
- Worker detail is limited to the operational facts requested: **current job, next job, today/week hours, time-off status**.
- Random heatmaps, fake hours formulas, mock performance charts, vanity location counts, and login-history presentation are not part of the approved worker UI.
- Owner/office Settings is intentionally reduced to appearance, team access, owner security, data safety, and sign out. Provider keys and unfinished integration setup are not promoted as normal owner-facing controls.

## Unified file intake — 2026-08-11 branch work

Branch `feat/unified-file-intake` now defines one Upload / Import model for spreadsheets, OCR and Plans & AutoCAD:

- Excel/XLS/CSV reads structured cells directly and ends in an editable employee review table.
- Spreadsheet employee writes are forced to Field Worker; PINs are never imported.
- Imported workers can receive an attendance-roster marker, but no `check_in` or `check_out` events are fabricated.
- Images and scanned PDFs use browser-side Tesseract OCR with English + Spanish languages loaded together.
- OCR output remains visible for review and can deliberately feed the same employee-review flow.
- DWG/DXF/DWF/DGN files require a job and reuse the existing document storage plus `analyzeDrawing` pipeline.
- PDF asks one explicit choice between document OCR and plan/drawing instead of guessing.
- The Plans & AutoCAD contextual upload action and old job-document upload buttons are redirected into the unified intake. Old customer/check scan buttons that launched the separate provider-key OCR path are retired from the visible UI.
- The legacy startup cleanup is corrected so legitimate newly imported employees are not removed merely because they have non-seed IDs.
- Obsolete active-looking OCR handoffs `docs/HANDOFF-PHOTOS-OCR.md` and `docs/AGENT-HANDOFF.md` are removed on the branch; Git history remains the historical record.

This branch is **not yet production-approved**. It still requires the full test/QA chain, Vercel preview build, and interactive browser verification before integration or production deployment.

## Verified build evidence

- Vercel successfully built and deployed branch commit `98c6c1ebdf885b5e7e7ec574f5a9f8cce020a5c6` as a READY preview for the prior owner-workspace revision.
- That commit contains the final runtime/CSS, current home tests, current live-surface tests, current guide, README, repository control, and paste-in brief. The later branch commits before this status update changed documentation only.
- The Vercel build completed JavaScript syntax checks and the full repository test command with zero failures.
- The rewritten final workspace regression suite reported **73 passed, 0 failed**.
- Live-surface checks reported **13 passed, 0 failed**.
- Photo-retry checks reported **22 passed, 0 failed**.
- UI-regression checks reported **76 passed, 0 failed**.
- The repository QA check completed with `pass: true`, no missing handlers, no missing Spanish keys, production/guide/manifest/service-worker HTTP 200 checks, and the security gate returning the expected 403 for blocked server notification access.
- Direct preview fetches confirm the deployed `otto-home.js?v=3` contains the three-window state machine, real Crew Hours, Plans & AutoCAD hub, simplified worker detail, and Julio/Saray identity mapping. Direct preview fetches also confirm `otto-home.css?v=3` contains the three-column workspace plus Julio green and Saray pink theme rules.

## Broken / risky

- **Server authorization is not finished.** Sensitive server routes remain fail-closed. Local PINs do not provide safe record-level server authorization.
- **Cross-device proof is incomplete.** Do not promise that records, photos, notifications, or server AI are safely shared between authorized users until issue #70 is completed and independently verified.
- **Live duplicate/demo data reconciliation is still pending** under issue #111. No live deletion is authorized without backup and exact dependency review.
- Some old implementation code and historical documentation still exist in Git history. `AGENTS.md` and `docs/REPO-CONTROL.md` are authoritative; do not resurrect superseded handoffs or old UI branches wholesale.

## External CI note

- GitHub Actions jobs currently do not start because the GitHub account is locked by a billing issue. The current failure annotation explicitly says the job was not started for that reason; it is not evidence of a code failure.
- Vercel supplied independent build evidence for the final runtime revision and successfully completed the repository test/QA command chain described above.

## Changed in the 2026-08-10 workspace pass

- Restored the three simultaneous owner/office windows.
- Restored minimize, restore, maximize, and full-screen window states without restoring drag/reorder.
- Added Julio green and Saray pink interface accents while preserving their wallpapers and Otto's blue identity.
- Replaced the worker KPI presentation with real Crew Hours calculated from check-in/check-out records.
- Simplified worker detail to current job, next job, actual today/week hours, and time off.
- Added a dedicated Plans & AutoCAD hub using the existing drawing upload flow.
- Reduced the normal Tools launcher to core daily modules.
- Reduced owner/office Settings while retaining owner extra-code security and data backup/restore.
- Updated the offline asset version/cache, user guide, repository control document, README, paste-in brief, and regression tests so another agent cannot silently restore the superseded one-panel UI.

## Remaining release proof

Before describing this UI revision or the unified intake as fully production-proven, verify after integration that:

1. The production deployment points to the accepted revision.
2. The production URL serves the accepted workspace and unified-intake assets.
3. The real app is exercised interactively at desktop and phone widths for Julio, Saray, and Otto, including minimize → restore → maximize → restore → full screen → restore.
4. Unified intake is exercised non-destructively with spreadsheet, image, PDF OCR mode, PDF plan mode, and CAD plan routing; the review step and Field Worker-only employee save behavior are proven.
5. A Plans & AutoCAD upload is linked to the correct job and reuses the existing analysis pipeline.
6. Crew Hours is compared against known check-in/check-out records.
7. No browser JavaScript errors, broken images, or unintended horizontal overflow appear during interactive verification.

Do not report these remaining gates as complete without direct evidence.
