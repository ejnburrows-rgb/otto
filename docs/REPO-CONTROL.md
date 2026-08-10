# OTTO Repository Control Center

This is the current control point for `ejnburrows-rgb/otto`. It exists so a new coding agent can determine the real state without relying on chat, old branches, or historical task queues.

## Read order

1. `AGENTS.md` — permanent safety and working rules.
2. This file — current objective, priorities, and authority.
3. `docs/STATUS.md` — factual history and evidence.
4. `docs/DECISIONS.md` — major technical decisions.
5. `docs/NO-QUICKBOOKS.md` — explicit retired-scope decision.
6. Task-specific material only when this file or a current open GitHub issue names it.

No other Markdown file may silently become a competing source of truth.

## Current objective

Finish OTTO as a dependable production CRM **without redoing completed UI work and without reopening retired scope**.

## Current verified product truth

- `main` contains the current owner/office home with a permanent left rail and **Today / Field Workers / Inbox / Tools**.
- The current wallpapers and OTTO wordmark are committed and in use.
- English/Spanish, light/dark, local/offline behavior, and the current CRM workflows must be preserved.
- The Supabase project and core production tables already exist; this is not a database-setup project anymore.
- Sensitive server routes remain intentionally fail-closed until fresh server authorization is implemented and proven.
- Supabase Auth PR #103 was reviewed and closed unmerged. It was stale relative to current `main` and its authorization boundaries were too broad. Do not resurrect or merge that branch wholesale.
- Real server authorization must be built fresh from current `main` under issue **#70**.
- Live Supabase currently contains 19 users, 3 customers, 13 jobs, 1 invoice, and 0 Supabase Auth users as verified read-only on 2026-08-10.
- Ten live job rows are cleanup candidates from old demo seeding. No deletion is authorized merely by this document; see issue **#111**.
- QuickBooks/Intuit integration is removed and out of scope. `docs/NO-QUICKBOOKS.md` is authoritative.
- Final production/browser QA and the public website Git→Vercel auto-deploy repair are tracked in issue **#110**.

## Active work only

The current open work should be limited to these lanes unless a new verified defect is found:

1. **#110 — production QA / Vercel Git auto-deploy**
   - Verify CRM and website production behavior in a real browser.
   - Repair the website GitHub `main` → Vercel automatic deploy path.
   - Fix only defects actually reproduced against current production/current `main`.

2. **#70 — real server authorization**
   - Start fresh from current `main`.
   - Use provider-backed identity.
   - Server authorization must use explicit allowlists and record/job-level checks, not a broad collection denylist.
   - Field users must not receive unrelated business/accounting/security data.
   - Photo GET/POST/DELETE must validate access to the related job/photo.
   - Keep misconfiguration fail-closed.
   - Do not reintroduce QuickBooks.

3. **#111 — existing duplicate/demo live rows**
   - Read-only investigation and exact dependency mapping are allowed.
   - No delete until the exact rows, backup, dependent records, and owner approval are all explicit.

After #70 is safely complete, prove cross-device records/photos with separate accounts before describing shared sync as production-ready.

## Retired / superseded work

Do not reopen these merely because old files or branches mention them:

- PR #103 Supabase Auth branch — closed unmerged; reference only.
- old wallpaper-first/full-screen panel variants — superseded by the permanent-left-rail home on `main`.
- old facelift branches and Qwen/Claude task queues — historical only.
- QuickBooks/Intuit integration — explicitly removed in PR #106.
- old website production-mismatch/content P0 tasks — resolved; website is maintained in `ejnburrows-rgb/otto-plumbing-site`.

## Priority order

1. Keep repository instructions and open work truthful; remove stale active-looking task artifacts.
2. Complete #110 production QA / website deploy automation without changing auth.
3. Complete #70 fresh server authorization with independent security review and deployed multi-account proof.
4. Resolve #111 before enabling broad production sync against live data.
5. Prove cross-device record/photo behavior after authorization is safe.
6. Improve OCR/provider reliability only from verified defects and within approved cost/access controls.
7. Final release readiness and director sign-off.

Independent lanes may proceed in parallel when they do not touch the same files or security boundary.

## Decision rights

The director approves:

- authentication changes,
- deletion of live data,
- payments/accounting behavior,
- new paid services or dependencies,
- production deployment,
- client-facing commitments,
- and irreversible cleanup.

Agents may investigate, implement approved work on branches, verify it, open pull requests, and merge only under `AGENTS.md` rules.

## Branch and pull-request rules

- `main` is the production source of truth.
- Never commit directly to `main`.
- Never force-push or rewrite shared history.
- Work on a focused branch and open a pull request.
- An open pull-request branch stays until the PR is resolved.
- A closed-unmerged branch must be checked for unique useful work before deletion.
- A merged branch may be deleted after confirming its useful work is present in current `main`.
- Do not keep stale branches merely because Vercel once created a preview for them.
- Generate branch deletion decisions from current GitHub evidence, not an old registry.

## Instruction-file policy

`AGENTS.md` and this file are controlling.

`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, and `.github/copilot-instructions.md` must remain short pointers. They must not contain their own task queues, branch counts, test totals, or stale product status.

`docs/PASTE-ME.md` is the portable brief for environments that load no repository instructions and must mirror this file's current priorities.

Old autonomous loops, historical audits, and old task files are reference material only unless explicitly reactivated here.

## Definition of done

A change is complete only when all applicable evidence exists:

- full current tests pass with zero relevant failures;
- `node scripts/qa-check.mjs` passes;
- the real app is exercised in a browser when behavior/UI is affected;
- phone and desktop are checked for UI changes;
- JavaScript errors, broken images, and unintended overflow are checked;
- visible behavior has screenshot/equivalent evidence when relevant;
- the diff is reviewed against acceptance criteria;
- `docs/STATUS.md` gets a factual update for substantive product changes.

Do not substitute code presence, an old screenshot, a green source-only assertion, or an agent statement for direct proof.

## Reporting

Every final report must state, in plain language:

- **Works**
- **Broken**
- **Blocked**
- **Changed**
- **Not done yet**

No evidence receipt means not done.