# OTTO cleanup plan

## Status

- Repository: `ejnburrows-rgb/otto`
- Default branch: `main`
- Current purpose: field-service CRM / O.T.T.O. Plumbing CRM workstream
- Current root shape: single-file PWA plus API helpers and legacy reference
- **Rebrand:** complete in code — no "Dream Cooling" strings remain in
  `index.html` or `landing.html`. (GitHub's repo description metadata still
  reads "Dream Cooling CRM Pro" as of this pass — that's a GitHub setting, not
  a file in this repo, and out of scope here.)
- **Dark-first UI facelift:** shipped to `main` (commit `48107d2`) — opaque
  dark surfaces, Housecall-blue accent, `sw.js` bumped to `otto-crm-v4`.
- QA script pass counts are not evergreen — see `docs/QA_CHECKLIST.md` for
  why, and re-run `scripts/qa-check.mjs` / `scripts/qa-browser.mjs` for a
  current number rather than trusting any number written here.

## Current root inventory

Keep visible at root:

- `.gitignore`
- `README.md`
- `SPEC.md`
- `index.html`
- `manifest.json`
- `sw.js`
- `api/`
- `legacy/`
- `docs/`

## Open PR management

PR #4 (the rebrand PR this section used to track) no longer exists — the
rebrand it was for is already complete in `main`. As of this pass, the real
open PRs are:

| PR | Title | Adds |
|---|---|---|
| #13 | docs: inventory legacy folder contents and reference status | `docs/LEGACY_INVENTORY.md` |
| #14 | docs: add firebase setup guide for ejn | `docs/FIREBASE_SETUP_EJN.md` |
| #15 | docs: Add SPEC vs REALITY gap report | SPEC.md-vs-code gap report |
| #16 | Add SECURITY_AUDIT.md and proof screenshots | `docs/SECURITY_AUDIT.md` — flags that seeded demo PINs and `window.__db` are console-accessible |
| #17 | Accessibility (ADA/WCAG) Audit Report | `docs/A11Y_AUDIT.md` |

All five are unreviewed and unmerged as of this pass. Recommended next step:
review and merge/close each on its own merits — they touch disjoint new doc
files, so order doesn't matter, but PR #16's finding (console-visible
seeded PINs) is worth prioritizing given it's a security item.

## Branch cleanup candidates

The three branches previously listed here
(`claude/otto-ai-server-key`, `claude/otto-plumbing-crm-fdsaf9`,
`claude/plumbing-crm-bilingual-8hplz5`) no longer exist on the remote — already
cleaned up. Current remote branches other than `main`, as of this pass:

- `claude/repo-website-linking-ge3amu`
- `feat/otto-backend-fixes-2508006757931382798` — base branch of closed PR #12; PR #11 (also based here) was closed unmerged
- `main-13118038372817789804` (PR #17), `main-13714816785519993407` (PR #15), `main-8209447042964602781` (PR #13), `security-audit-13322456363879212751` (PR #16), `submit-firebase-guide-10380598989076462137` (PR #14) — each backs one of the open PRs above
- `o.t.t.o.-plumbing-crm-production-release-43b74` — head of open PR #12, based on `feat/otto-backend-fixes-...` rather than `main`

Suggested rule (unchanged): keep a branch only while it backs an open, active
PR; delete once that PR is merged, closed, or superseded.

## Clutter cleanup plan

### Low-risk documentation cleanup

- Keep this file as the cleanup tracker.
- Add a short status banner to `README.md` after the product direction is finalized.
- Add a changelog or release notes file if `v1.1.0` remains the current shipped tag.

### Medium-risk repo cleanup

- Confirm whether `legacy/` is needed long term.
- `legacy/README.md` already exists, explaining why `legacy/dream-cooling-crm.html` (the old HVAC app) remains.
- Keep `api/` documented because serverless functions are part of the deployment story.

### High-risk cleanup

Do not remove or rewrite these without a browser smoke test:

- `index.html`
- `manifest.json`
- `sw.js`
- `api/`
- `legacy/`

## Security review

Initial code search did not find these in `otto`:

- `ANTHROPIC_API_KEY`
- `FIREBASE_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `sk-ant`
- `AIza`
- `firebaseConfig`
- generic `apiKey`

Security items to verify manually:

1. Confirm no live secrets are embedded in `index.html`.
2. Confirm demo PINs are not used as real production access controls.
3. Confirm server-side API keys, if used, are set only in hosting environment variables.
4. Confirm any Firebase/browser config is intentionally public before committing it.
5. Confirm service-worker cache behavior does not pin stale sensitive app data.

## Suggested next cleanup commit

Status of the original list (all were `otto`-repo items):

1. ~~Add `legacy/README.md`~~ — done, already present.
2. ~~Add a repo status banner to `README.md`~~ — done, already present.
3. ~~Add a short deployment checklist under `docs/DEPLOYMENT_CHECKLIST.md`~~ — done, already present.
4. ~~Avoid changing `index.html` until PR #4 is resolved~~ — moot, PR #4 no longer exists; `index.html` has since shipped the dark-first facelift (see Status above).

## Open PRs across repos

This session's repository access is scoped to `ejnburrows-rgb/otto` only, so
PR status for `cartilla-de-gretel` and `tucker-pool-crm` (previously listed
here) can't be re-verified from here — treat those two lines as unconfirmed.
For `otto` itself, see **Open PR management** above for the current, verified
list (PRs #13–#17; PR #4 no longer exists).
