# Repo cleanup & polish checklist

Safe-to-do-later items from the July 2026 repo audit. **Nothing here is urgent and nothing on `main` was changed** — each item should be done on a branch when there's a natural pause in feature work, so it never blocks the current workflow.

## High value (do when convenient)

- [ ] **Split `index.html` (~337 KB monolith)** into separate `css/`, `js/` modules loaded from a slim HTML shell. Do this on a feature branch with a visual before/after check; it makes every future edit (human or AI agent) faster and less error-prone.
- [ ] **Regenerate `icon-512.png`** — it is currently byte-identical to `icon-192.png` (so installs get an upscaled 192px icon). Export a true 512×512 PNG and replace the file. Same issue exists in `otto-plumbing-site`.
- [ ] **Triage the open issues** — close any already fixed, label the rest.

## Housekeeping

- [ ] **Prune stale branches** after confirming they're merged/abandoned: `main-10389237612083633536`, `main-10434508627538908887`, old `jules-*` test branches, and any merged `claude/*` / `fix/*` branches.
- [ ] **Review `legacy/`** — if nothing references it, delete it (history keeps a copy).
- [ ] **Rename `favicon-miami-luxe.svg` → `favicon.svg`** and update the reference in `index.html` in the same commit (it appears to be the only favicon in the repo, so don't delete it).
- [ ] **Add a GitHub repo description** (e.g. "Dream Cooling CRM — HVAC field-service CRM PWA") and consider renaming the repo `otto` → `dream-cooling-crm` to avoid confusion with `otto-plumbing-site` (GitHub redirects old URLs; update the Vercel project link after renaming).

## Notes

- `CLAUDE.md` / `GEMINI.md` stubs and `AGENTS.md` were intentionally left untouched — they drive the AI-agent workflow.
