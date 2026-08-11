# DECISIONS — OTTO Plumbing CRM

A concise dated log of decisions that still govern the product. Historical implementation detail remains in Git history; superseded choices are not kept here as if they were still active.

## 2026-08-11 — unified file intake

- **One Upload / Import front door is the required file-intake model.** Do not restore separate competing spreadsheet, OCR, scan, and CAD upload experiences.
- **Spreadsheets are parsed directly.** `.xlsx`, `.xls`, and `.csv` use their structured cells; OCR is not used on real spreadsheet files.
- **Photos and scans use bilingual browser OCR.** English + Spanish OCR runs locally in the browser and leaves extracted text visible for review before anything is saved or imported.
- **PDF is explicitly routed because the format is ambiguous.** Ask whether it is a text/scanned document or a plan/drawing instead of guessing silently.
- **Plans reuse the existing job drawing pipeline.** DWG, DXF, DWF, DGN and plan PDFs remain attached to the selected job and use existing document storage plus drawing analysis rather than a second file system.
- **All employee intake is review-first and least-privilege.** Spreadsheet/OCR employee intake ends in the same editable review table; imported people are Field Worker only, PINs are never imported, and attendance is never fabricated.
- **The old provider-key/Claude OCR path is retired as the normal user workflow.** Historical code may remain where unrelated legacy features still depend on it, but it must not appear as a competing file-intake experience or be described as the current process.

## 2026-08-10 — owner / office workspace

- **Three simultaneous primary windows are the required home model.** Today, Field Workers, and Inbox open together over the wallpaper. A prior one-panel-at-a-time redesign is superseded.
- **Window controls stay.** Each primary window supports minimize to the left side panel, restore, maximize inside the workspace, and full screen.
- **Generic drag/reorder stays out.** An earlier drag implementation attached to scrollable cards and interfered with normal phone scrolling. Window controls are useful; draggable content is not.
- **Personal accents are functional identity, not a different product.** Julio uses green accents, Saray pink accents, Otto the blue OTTO identity. Permissions and workflows stay the same.
- **The supplied OTTO Plumbing wordmark remains the CRM logo.** The app icon is not a substitute for the approved brand mark.

## 2026-08-10 — worker information and hours

- **Worker information is intentionally small.** The owner needs current job, next job, actual today/week hours, and time-off status. Random heatmaps, login-history presentation, vanity location counts, fake KPI formulas, and mock charts add noise and are not approved worker information.
- **Crew hours come from job check-in/check-out records.** Do not derive hours from placeholder multipliers or random/demo chart values.
- **The whole crew must be visible together.** Crew Hours shows total recorded time today, total recorded time this week, currently clocked-in count, and per-worker today/week totals.

## 2026-08-10 — Plans & AutoCAD

- **Plans & AutoCAD is a first-class entry point.** It is visible from the owner/office side panel and in Tools instead of being buried only inside Job → Documents.
- **Reuse the existing drawing pipeline.** PDF, DWG, DXF, DWF and DGN uploads continue through the existing job document/drawing-analysis flow rather than creating a second competing file system.
- **A drawing belongs to a job folder.** The upload hub asks for the job first so plans remain attached to the correct customer/work context.

## 2026-08-10 — simplified navigation and Settings

- **Tools is a launcher, not another dashboard.** Promote daily operational modules only. Secondary technical/admin screens may remain reachable where appropriate without occupying prime workspace space.
- **Owner/office Settings is restrained.** Keep appearance, team access, owner extra-code security, data safety, and sign out. Do not expose provider keys or unfinished integration setup merely to fill the page.
- **Field Settings keeps the existing worker actions.** Time-off and urgent-contact workflows are operational worker features and are not removed by the owner/office simplification.

## 2026-08-10 — documentation and regression control

- **The repository must remember the owner’s UI contract.** `docs/REPO-CONTROL.md`, README, the user guide, paste-in brief, status, and automated home checks all describe the same three-window model so a future agent cannot silently simplify it back to one panel.
- **Do not treat infrastructure failures as code failures.** A GitHub Actions job that never starts because of account billing, or a Vercel deployment rejected for a platform build-rate limit, is recorded as an external verification blocker. It does not become a passing test, but it also must not be misreported as an application defect.

## Active platform / security decisions

- **Offline-first data remains the primary operating mode.** IndexedDB holds the working data with a localStorage mirror; cloud access is an additional layer, not a requirement for field use.
- **Sensitive server routes stay fail-closed until issue #70.** Local PIN unlock is not sufficient server authorization. The replacement must use provider-backed identity plus explicit role and record/job-level authorization.
- **Do not resurrect the older PR #103 authentication attempt wholesale.** It was reviewed and closed because its scope and authorization model were stale.
- **No live-data deletion without backup and exact approval.** Duplicate/demo reconciliation is tracked under issue #111.
- **QuickBooks is out of scope.** OTTO keeps its native estimates, invoices, payments, checks, payroll intake, and generic exports. Intuit routes/UI/credentials are not restored without a new explicit requirement.
- **AI/provider keys belong server-side.** Do not commit or expose paid provider credentials in browser-visible files.

## Photo and file decisions

- **Job photos save locally first.** Field work must remain usable with poor signal.
- **Failed photo uploads remain queued.** The app must never silently remove a retry entry and leave the worker believing a photo reached the office.
- **Cloud photo access must remain private.** Browser code does not receive the Supabase service-role key.
- **Documents and drawings remain job-context files.** Do not create a second unrelated storage workflow for the AutoCAD hub.

## Data / sync decisions

- **Record conflicts use most-recently-edited whole-record resolution.** Field-level merge complexity is not justified for the current small-team workflow.
- **Deletes are recoverable/soft at the local CRM layer.** An accidental delete should not immediately destroy business history.
- **Cloud polling is deliberately modest rather than permanently connected.** Reliable offline field operation and safe authorization matter more than pretending every update is instant.

## Product foundations that remain active

- Progressive Web App rather than native app-store builds.
- English/Spanish parity.
- Vercel as the application host.
- Supabase as the current managed database/storage platform behind server-side access controls.
- One existing CRM codebase rather than parallel replacement applications.

When a future decision supersedes one of these, add the new dated decision and update `docs/REPO-CONTROL.md` at the same time.
