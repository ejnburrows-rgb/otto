TITLE: Wave 6: Make the KPIs screen show real demo numbers instead of all 0s
LABEL: claude
BRANCH: fix/seed-kpi-demo-data
FILES: index.html

---

REPO
Repository: github.com/ejnburrows-rgb/otto
Owner: ejnburrows-rgb (EJN — ejnburrows@gmail.com)
Branch: main
Every commit you make must show EJN as the author.

## Before you start

Read `AGENTS.md` in full and obey it. Branch off `main` named
`fix/seed-kpi-demo-data`. Never force-push.

This task edits `index.html`. Do not start it while any other `index.html` task is
open. Run it AFTER Waves 4 and 5 are merged.

## Background (plain language)

The KPIs screen (`viewKpis()`, around lines 4373–4456) shows 0 for every metric
(hours, jobs done, escalations, locations). That is because the metrics are
computed from collections the demo seed leaves empty:

- check-ins / locations ← `db.job_events` of type `check_in` (none seeded)
- jobs done ← `db.jobs` with `status==='completed'` (none seeded completed)
- escalations ← `db.ai_escalations` (empty)
- PTO ← `db.time_off` (only one entry added by `seedMockKPIs()` at boot)

So the analytics shell works but has nothing to display. Separately, the
aggregate "charts" view (`renderCharts`, around lines 4461–4504) needs
`window.Chart` (Chart.js), which is not loaded, so it renders nothing.

## Exactly what to change

1. Extend the demo seed (build on the existing `seedMockKPIs()` around line 4363,
   or the main seed) so that a realistic slice of demo activity exists for the
   current period: a handful of `check_in` `job_events`, a few `completed` jobs, a
   couple of `ai_escalations`, and one or two `time_off` entries — spread across a
   few of the named field workers from Wave 5. Keep it small and clearly
   demo-only; do not touch real cloud data paths.
2. For the charts view: either add the Chart.js `<script>` so charts render, OR,
   if you keep it out, make `renderCharts` show a clear "charts available when
   connected" placeholder instead of blank. Pick one; do not leave a silent blank.

Touch only `index.html`.

## This task is done when

- The KPIs summary tiles show non-zero demo numbers for at least hours/check-ins,
  jobs done, and escalations for the seeded workers.
- The charts view either renders or shows an explicit placeholder (not blank).
- `npm test` and `node scripts/qa-check.mjs` both pass.

## Proof required

- Terminal output of `npm test` and `node scripts/qa-check.mjs`.
- Browser screenshot of the KPIs screen with populated numbers.

## Final step (required)

Append one dated line to the "Session log" at the bottom of `docs/STATUS.md`.
Append only; on a conflict keep both lines.
