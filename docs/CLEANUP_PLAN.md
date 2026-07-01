# OTTO cleanup plan

## Status

- Repository: `ejnburrows-rgb/otto`
- Default branch: `main`
- Current purpose: field-service CRM / O.T.T.O. Plumbing CRM workstream
- Current root shape: single-file PWA plus API helpers and legacy reference

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

### PR #4 — Rebrand from Dream Cooling CRM to O.T.T.O. Plumbing CRM

Status: open.

Observed scope:

- Changes 2 files: `README.md` and `index.html`.
- Large app rewrite: about 1,850 additions and 2,390 deletions.
- Purpose is a domain pivot from Dream Cooling / HVAC to O.T.T.O. Plumbing CRM.

Recommended next steps before merge:

1. Confirm the business direction is definitely plumbing, not HVAC.
2. Review the large `index.html` rewrite manually in browser.
3. Verify the app still boots offline as a static PWA.
4. Confirm default/demo PINs are intentional and not production credentials.
5. Check that `legacy/dream-cooling-crm.html` remains preserved for rollback/reference.
6. After review, either merge PR #4 or close it as superseded.

## Branch cleanup candidates

Review these branches after PR decisions:

- `claude/otto-ai-server-key`
- `claude/otto-plumbing-crm-fdsaf9`
- `claude/plumbing-crm-bilingual-8hplz5`

Suggested rule:

- Keep branches only if they back an open, active PR.
- Delete branches after their PR is merged, closed, or superseded.

## Clutter cleanup plan

### Low-risk documentation cleanup

- Keep this file as the cleanup tracker.
- Add a short status banner to `README.md` after the product direction is finalized.
- Add a changelog or release notes file if `v1.1.0` remains the current shipped tag.

### Medium-risk repo cleanup

- Confirm whether `legacy/` is needed long term.
- If kept, add a short `legacy/README.md` explaining why the old Dream Cooling app remains.
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

A safe follow-up commit could:

1. Add `legacy/README.md`.
2. Add a repo status banner to `README.md`.
3. Add a short deployment checklist under `docs/DEPLOYMENT_CHECKLIST.md`.
4. Avoid changing `index.html` until PR #4 is resolved.

## Open PRs across repos

Current open PRs found across `ejnburrows-rgb`:

- `otto` PR #4 — rebrand to O.T.T.O. Plumbing CRM.
- `cartilla-de-gretel` PR #41 — faithful HTML region schema pilot.
- `cartilla-de-gretel` PR #42 — draft Juego Payaso Chano pilot game.
- `tucker-pool-crm` PR #22 — landing page/env/IDE cleanup fixes.

Suggested triage:

1. Resolve `otto` PR #4 first because it defines product direction.
2. Review `tucker-pool-crm` PR #22 next because it fixes deployment/env problems.
3. Keep `cartilla-de-gretel` PR #41/#42 active only if those are current workbook priorities.
