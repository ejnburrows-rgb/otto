# Autonomous Agent Prompt — OTTO CRM

**How to use:** open your coding agent in this repo and say: "Read docs/AGENT-PROMPT.md and execute it."

---

Repo: github.com/ejnburrows-rgb/otto — owner ejnburrows-rgb. This IS the OTTO Plumbing field-service CRM. The GitHub description saying "Dream Cooling CRM Pro / HVAC" is stale metadata; the old HVAC app is parked at legacy/dream-cooling-crm.html. Do not re-litigate this. Live: https://otto-kohl.vercel.app

Read first: AGENTS.md, docs/STATUS.md, SPEC.md, docs/A11Y_AUDIT.md.

## RULES

- Never commit to main. Branch + PR only. The owner merges.
- Never reintroduce Firebase. It was retired 2026-07-21 after a data exposure. See docs/STATUS.md section 3.1. If any PR you touch mentions Firebase, strip it.
- Every claim needs proof: file:line, or test output, or a screenshot. Never say "should work."
- npm test && npm run qa must pass before you open any PR.
- Append one line to the Session log at the bottom of docs/STATUS.md. On conflict, keep both lines.

## PHASE 1 — MERGE THE BACKLOG (this is the priority)

Nine PRs are open. All are based on old main SHAs and are behind, so each needs its branch updated before it can merge. Process them in EXACTLY this order, one at a time, fully finishing each before starting the next:

1. **#62** — docs/STATUS.md cleanup + scrubs live 4-digit PINs that were printed in plain text in scripts/otto-heartbeat.ps1. THIS IS A SECRET LEAK. Do it first. Before merging, grep the whole tree for 0721 and 0715 and confirm no real PIN remains in any tracked file. Report what you find.
2. **#53** — prototype pollution fix in api/inbound-email.js safeParse. Security.
3. **#60** — photo sync to Supabase Storage (closes issue #30). Verify by reading the diff that the job-photos bucket is private, that no storage key appears in index.html or any browser-served file, and that the service-role key is only read server-side in api/photos.js. If any of those three is false, do not merge — comment on the PR and stop.
4. **#49** — KPI perf (pre-grouped lookups).
5. **#54** — nav label casing, urgent/kpis missing from the i18n tables.
6. **#51** — test coverage for api/notify.js SMS parse path.

#49, #54, #55 and #60 all edit index.html. Expect conflicts. Resolve them by hand and re-run npm test after every resolution. Never resolve a conflict by deleting someone else's change — if you can't reconcile two edits, keep both behaviors and say so in the PR.

Then handle the three drafts:
- **#55** (KPI charts were built from Math.random() — fake numbers that changed every render) and **#56** (landing booking form + the EN/ES toggle that was cosmetic and never actually translated) are real fixes. Rebase them, re-run tests, take a browser screenshot of each, mark them ready for review, and leave them for the owner.
- **#52** is docs only. Rebase and mark ready.

Write the results to a comment on each PR: what conflicted, what you changed, what passed.

## PHASE 2 — ACCESSIBILITY (issue #45)

Branch fix/accessibility-wcag. Every screen currently fails WCAG 2.1 AA. The specific fixes are already enumerated in docs/A11Y_AUDIT.md — implement them, don't re-audit:
- aria-labels on every icon-only button, routed through t() so EN and ES both get them
- contrast to 4.5:1 minimum, including dropping avatarColor lightness from 45% to 30%
- real labels on every form input
- landmark roles and alt text on the logo

Skip the audit item about the Firebase key input; that field is gone.

Done when: every interactive element has an accessible name, contrast passes at 4.5:1, and you have screenshots of three different screens in both languages. One PR.

## PHASE 3 — SUPABASE ACTIVATION KIT (issue #28 — you CANNOT finish this, and that's expected)

Creating the tables requires the owner's Supabase dashboard and Vercel env vars. Do not attempt it. Instead, on branch docs/supabase-activation-kit, make it a 10-minute job for the owner:
- Cross-check supabase/migrations/0001_init_schema.sql against every table name the app actually reads and writes. Report any table the code expects that the migration doesn't create.
- Write scripts/verify-supabase.mjs that the owner runs after activating. It must prove: an anonymous request returns 401 or a permission error (NOT 200, and NOT 404), /api/data does not return 503, and seeded counts match 3 customers / 3 jobs / 1 invoice / 19 users / 48 audit_log rows.
- Write docs/ACTIVATE-CLOUD.md as numbered clicks, naming the exact two Vercel variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) and where the seed file lives. Note in the doc that backups/seed_data.sql is deliberately not in the repo because it holds real customer and employee data.

## STOP AND ASK, don't decide

Anything involving money, scope, deadlines, client communication, image resize dimensions, or deleting data.

When you run out of work above, stop and write docs/SCRUB-REPORT.md on branch docs/scrub-report listing what you'd do next in priority order. Do not invent new features.

PR body format: What changed · Why · What the owner should check · What is still not done · Proof.
