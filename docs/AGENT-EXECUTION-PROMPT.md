# GitHub Repo Cleanup Checklist

## 1. Decide the repo categories

Sort each repo into one of these buckets:
- Core product
- Public marketing
- Public starter/template
- Private/internal
- Legacy/archive
- Dispose candidate

## 2. Protect the real assets

Do not touch repos that are:
- live customer sites
- active business systems
- private/internal operational tools
- backup repos with sensitive data
- repos required for current business operations

## 3. Create the new canonical product repo

Create:
- `nbo-saas-crm`

Add:
- README
- architecture overview
- migration plan
- feature matrix
- repo structure docs

## 4. Consolidate product logic

Use the following as the migration source:
- `otto`
- `tucker-pool-crm`

Extract:
- customer / client records
- jobs / work orders
- estimates and invoices
- payment tracking
- scheduling and dispatch
- bilingual UX
- customer communication history
- file uploads and documents
- branding and configuration layer

## 5. Define brand overlays

Add config layers for:
- OTTO brand
- Tucker brand

The core should remain generic. Brand-specific logic should be configuration rather than a duplicated app.

## 6. Reduce the public portfolio

Keep public only when it clearly supports:
- marketing
- template/demo distribution
- visible product positioning

Examples:
- `nbo-marketing`
- `nbo-starter-template`

## 7. Keep sensitive repos private

Do not publicize:
- `Command-Center-`
- `dev-firm-compass`
- `db-backups`

These should remain private or internal.

## 8. Archive old side-projects

Archive repositories that are not part of the product path:
- `agency-agents`
- `cartilla-de-gretel`
- `lany-books-web`
- `Locks`
- `dbarrera-y-mas`
- `VD-`

## 9. Rename repurpose carefully

If a repo still serves a purpose, rename it to fit the new system:
- `client-project-starter` -> `nbo-starter-template`

## 10. Make the final portfolio clean

The final profile should only show a few meaningful repos:
- main product
- marketing/public site
- starter or template repo
- private internal repos kept hidden
- archived legacy repos out of the way

## 11. Final verification

Confirm:
- there is one clear default SaaS CRM repo
- public repos are intentional and not cluttered
- private repos remain private
- archive candidates have been archived rather than deleted
- the portfolio reads as coherent and product-focused

## 12. Do not do destructive actions without approval

Avoid deleting:
- active customer tools
- live sites
- internal business systems
- repos with history that may still be useful

Prefer:
- archive
- visibility change
- rename
- limited migration



