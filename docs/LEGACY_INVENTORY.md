# Legacy Folder Inventory

This document provides an inventory of the `legacy/` folder, which contains historical files from before the rebrand.

## Inventory

### 1. `legacy/README.md`
- **Purpose:** Explains that `legacy/dream-cooling-crm.html` is the previous HVAC / Dream Cooling CRM build kept for rollback reference only. It also explicitly states not to deploy or edit this file for production.
- **Verdict:** SAFE TO DELETE.

### 2. `legacy/dream-cooling-crm.html`
- **Purpose:** The actual previous Dream Cooling (HVAC) CRM application in a single HTML file format.
- **Data/Keys/Content:** Contains numerous legacy OpenWeatherMap API key handling, legacy Anthropic API keys support logic, legacy `dc_anthropic_key` saving/loading, legacy PIN hashes, legacy indexDB definitions. This data must be preserved before deletion if any of it is unique.
- **Verdict:** STILL REFERENCED.

## Reference Search Results

A global search was performed across the repository to determine if `legacy/` or its contents are referenced elsewhere.

The search revealed the following references:

- `./docs/CLEANUP_PLAN.md:22` -> `- \`legacy/\``
- `./docs/CLEANUP_PLAN.md:43` -> `5. Check that \`legacy/otto.html\` remains preserved for rollback/reference.`
- `./docs/CLEANUP_PLAN.md:69` -> `- Confirm whether \`legacy/\` is needed long term.`
- `./docs/CLEANUP_PLAN.md:70` -> `- If kept, add a short \`legacy/README.md\` explaining why the old Dream Cooling app remains.`
- `./docs/CLEANUP_PLAN.md:81` -> `- \`legacy/\``
- `./docs/CLEANUP_PLAN.md:107` -> `1. Add \`legacy/README.md\`.`
- `./JULES.md:3` -> `You are Jules. You OWN this repo for this run — no other agent is working here. index.html is the app (single-file PWA, no build step). Never edit legacy/.`
- `./README.md:197` -> `- \`legacy/dream-cooling-crm.html\` — the previous Dream Cooling (HVAC) app this`

Because `legacy/dream-cooling-crm.html` is explicitly referenced in `README.md`, `JULES.md`, and `docs/CLEANUP_PLAN.md`, the `legacy/` directory **cannot** be deleted at this time.
