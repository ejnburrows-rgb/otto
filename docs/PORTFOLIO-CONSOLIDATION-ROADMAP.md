# Portfolio Consolidation Roadmap

## Objective

Consolidate the GitHub portfolio into a cleaner, easier-to-understand product stack centered on a single default SaaS CRM platform while preserving real functionality from the active business systems.

## Recommended end state

### Core product repo
- `ejnburrows-rgb/nbo-saas-crm`
  - Default SaaS CRM foundation
  - Shared operational logic for service businesses
  - Branded overlays for OTTO and Tucker

### Public-facing repos
- `ejnburrows-rgb/nbo-marketing`
  - Marketing and brand site
- `ejnburrows-rgb/nbo-starter-template`
  - Template or starter project for prospective clients

### Private/internal repos
- `ejnburrows-rgb/Command-Center-`
- `ejnburrows-rgb/dev-firm-compass`
- `ejnburrows-rgb/db-backups`

### Archive candidates
- `ejnburrows-rgb/agency-agents`
- `ejnburrows-rgb/cartilla-de-gretel`
- `ejnburrows-rgb/lany-books-web`
- `ejnburrows-rgb/Locks`
- `ejnburrows-rgb/dbarrera-y-mas`
- `ejnburrows-rgb/VD-`
- `ejnburrows-rgb/client-project-starter` if not repurposed as a starter template

## Current repository classification

### Active product / migration sources
- `otto`
  - Recommended: convert to a migration source and then archive after extraction
  - Reason: contains the deepest current product logic
- `tucker-pool-crm`
  - Recommended: convert to a migration source and then archive after extraction
  - Reason: key service-business workflow patterns and bilingual customer management logic

### Public / portfolio
- `client-project-starter`
  - Recommended: rename to `nbo-starter-template` or archive if no longer in use
- `otto-plumbing-site`
  - Recommended: keep public only if it is still a live marketing site
- `nbo-marketing` (new repo)
  - Recommended: create as the consolidated public marketing repo

### Private/internal/sensitive
- `Command-Center-`
- `dev-firm-compass`
- `db-backups`

### Archive / legacy
- `agency-agents`
- `cartilla-de-gretel`
- `lany-books-web`
- `Locks`
- `dbarrera-y-mas`
- `VD-`

## Product strategy

### Shared CRM foundation
The default SaaS CRM should include:
- customer records
- contact management
- service job and work-order tracking
- estimates and invoices
- payment and ledger tracking
- scheduling and dispatch
- team/staff records
- notes and communication history
- file/photo/document attachments
- bilingual UX
- admin config and branding
- search / AI assistant

### Brand overlays
- OTTO brand overlay: plumbing operation-specific workflow and naming
- Tucker Pool brand overlay: pool-service workflow and business rules

The product should be generic at the core and customer-specific at the brand layer.

## Migration plan

### Phase 1: audit and classify
- Confirm the purpose and active status of each repo
- Identify which repos are live customer-facing, internal, or historical
- Separate private and sensitive repos from public ones

### Phase 2: create the new canonical product repo
Create `nbo-saas-crm` with:
- README
- docs/
- architecture overview
- feature matrix
- migration plan
- product vision

### Phase 3: extract shared features
Using `otto` and `tucker-pool-crm` as the migration sources, move the common logic into:
- `apps/web`
- `apps/admin`
- `packages/core`
- `packages/ui`
- `packages/types`
- `packages/branding`
- `brands/otto`
- `brands/tucker`

### Phase 4: keep the public repos minimal
- `nbo-marketing` for brand and marketing
- `nbo-starter-template` for reusable starter content
- Possibly `otto-plumbing-site` only if it is still part of customer acquisition

### Phase 5: archive non-core repos
Archive any repo that is not directly supporting the product, marketing, or private internal use cases.

## Repo-by-repo decisions

| Repo | Recommended status | Decision |
| --- | --- | --- |
| `otto` | Active migration source -> archive after extraction | Preserve as source and then archive |
| `tucker-pool-crm` | Active migration source -> archive after extraction | Preserve as source and then archive |
| `client-project-starter` | Rename or archive | Prefer `nbo-starter-template` if kept public |
| `agency-agents` | Archive | Historical/prototype |
| `otto-plumbing-site` | Public marketing or archive | Keep only if live customer-facing |
| `Command-Center-` | Keep private | Internal tool |
| `dev-firm-compass` | Keep private | Internal ops tool |
| `db-backups` | Keep private | Sensitive backups |
| `cartilla-de-gretel` | Archive | Not part of SaaS core |
| `lany-books-web` | Archive | Not part of SaaS core |
| `Locks` | Archive | Client or one-off site |
| `dbarrera-y-mas` | Archive | Client or one-off site |
| `VD-` | Archive | Not relevant to core product |

## Suggested repo naming convention

- `nbo-saas-crm` — main product
- `nbo-marketing` — public marketing site
- `nbo-starter-template` — starter or template repo
- `nbo-private-ops` — if needed for private internal tools
- `nbo-backups` — if needed for backup or operational repos

## Cleanup checklist

### Before doing anything destructive
- Verify the repo is not live or production-critical
- Confirm there is no active customer data or business workflow depending on it
- Confirm the repo is not a private/internal asset that should remain hidden
- Do not delete anything without explicit approval if it may be active

### Standard cleanup order
1. Create the new product repo (`nbo-saas-crm`)
2. Merge/extract shared features from `otto` and `tucker-pool-crm`
3. Create `nbo-marketing` and `nbo-starter-template` if useful
4. Keep private repos in private visibility
5. Archive old repo clutter
6. Keep only the minimal public portfolio

## Final recommendation

The portfolio should read like a coherent SaaS/product system instead of a random collection of sites and experiments.

The strongest end state is:
- one main product repo: `nbo-saas-crm`
- a few focused public repos for marketing and templates
- private internal repos to hold developer tools and backups
- legacy and side-project repos archived

This preserves product value while making the GitHub brand feel polished, intentional, and scalable.

## Next step

Proceed by creating the new canonical repo, then move shared CRM features from `otto` and `tucker-pool-crm` into it. After the new product core is present, archive the legacy and side repos in a controlled order.



