# STATUS — OTTO Plumbing CRM

Updated: 2026-09-16. This file is the current release snapshot. Older implementation history remains in Git history and closed PRs; it is not active release guidance.

## Production

- Authoritative branch: `main`
- Authoritative Vercel project: `otto`
- Production URL: https://otto-kohl.vercel.app
- Verified production source: `df5273c8fa7d89dbc4e4bae98b16ae0e4d62a6f6`
- Verified Vercel deployment: `dpl_46VduECjuLNrG18to2neX5Q9ph9m` — READY and aliased to `otto-kohl.vercel.app`.
- Vercel deployment metadata confirms repository `ejnburrows-rgb/otto` and branch `main`. Production retains the navigation and branding repairs from PR #167.
- New deployments are blocked by Vercel's 100-per-day Hobby quota. A dashboard-created preview initially started and exposed an account-login patch syntax error; that error is fixed and regression-tested in PR #168. The corrected retry was rejected with `api-deployments-free-per-day`, so manual creation is not an ongoing workaround. The latest pending source is not deployed. The account owner must change the hosting allowance or wait for quota renewal; do not create alternate projects to evade the limit.
- At 20:00 UTC, the current production deployment had no error/fatal runtime logs in the preceding 30 minutes. Its isolated navigation smoke test passed 66 checks with no browser runtime errors; this is not credentialed end-to-end sign-in proof.
- Normal deployment workflow: pushes to `main` produce production deployments in the `otto` Vercel project.

A second Vercel project named `otto-prod-new` is not the authoritative customer/owner production project. It does not own the established `otto-kohl.vercel.app` production URL. It remains untouched until its environment/configuration can be compared conclusively; do not treat it as the release target.

## Current product state

OTTO is the bilingual internal CRM for OTTO Plumbing Inc. Current `main` includes customers, jobs, scheduling, estimates/invoices/payments, documents/photos, field workflows, payroll intake, Inbox, reports, backups, Plans & AutoCAD, work-only field location, and Ask OTTO.

PR #164 is merged on `main` and adds the zero-recurring-cost operations layer: deterministic Needs Attention, Job Brief, Closeout Packet, owner metrics, request conversion, a local editable prompt workbench that does not make live generative-AI calls, an isolated customer portal, approved-file filtering, protected customer-file access, and customer portal invitations through the existing Supabase identity model.

PR #165 is merged on `main` and adds the premium bilingual interaction layer: universal customer/job/estimate/invoice context drawer, day/week dispatch, unified activity timeline, mobile field actions, smart record headers, command-palette quick create, personalized Julio/Sarays Today backgrounds, Operations inbox polish, secure customer-portal summary cards, visible offline/sync state, integrated job file viewing, and premium form states. It introduces no new paid API or external AI call. The secure PR #164 customer portal remains authoritative and the new card layer only enhances it.

OTTO Air is the final shared presentation layer across owner/office, field/mobile, Operations, Schedule, Money, customer portal, drawers, forms, tables, cards, and legacy screens. Light and dark modes share the same structure and differ only in color tokens. The fixed operational status language is red = Scheduled, blue = Underway/In progress, green = Completed, and amber = Needs attention, with visible text/accessibility labels so color is never the only signal. The interface favors plain-language answers, actionable queues, restrained cards, progressive disclosure, and useful information over decorative dashboard graphs.

PR #145 is merged and the obsolete Anthropic setup instructions are retired. Current provider documentation follows the code that actually exists. Ask OTTO remains a separate, existing provider-backed feature and requires the configured company-side provider credentials; the local AI Workbench from PR #164 does not call an external AI service.

The supplied Julio and Sarays personal backgrounds are limited to the personalized Today/entry experience so operational record screens remain neutral and readable.

## Backend and access

- Supabase is the production identity/data backend.
- Supabase email-link authentication and server-controlled OTTO roles remain the account boundary.
- Customer portal access is isolated from internal owner/office data and is limited to customer-visible records and explicitly approved files.
- Internal notes, internal costs, payroll, unrelated customers/jobs, and non-approved files must never be exposed through the customer portal.
- SendGrid remains the documented company email provider path where configured.
- QuickBooks remains a manual handoff only; there is no Intuit OAuth/background sync.
- No new paid service or paid AI API is required by the PR #164, PR #165, or OTTO Air layers.

## Current release verification

### 2026-09-16 restrained branding and startup repair

- The dashboard Create Deployment workflow accepted a build when Git-triggered deploys reported a rate limit. That build exposed an extra closing parenthesis in the newly added account-login patch from main. The patch is corrected, uses a cross-platform entry point, and is now imported and compiled with first/repeated generated-login coverage in the full source tests.

- Final production screenshot review also identified an excessively wide desktop sign-in button. The sign-in email, help copy, and button now share a centered 420px maximum width, responsive on phones.

- The current persistence build emitted duplicate async modifiers in local-login redirect declarations, preventing all inline application code from executing. Function replacement now includes async modifiers and tests compile both first and repeated generated builds.
- The new HR navigation observer repeatedly rewrote an unchanged label and froze authenticated screens. Labels now change only when their language changes, with a behavioral regression test. The login branding layer also reuses the normalized logo instead of adding another image.
- Reduced OTTO header/login branding and typography while retaining touch targets; disabled personalized Today artwork; added a small Powered by NBO text credit and an owner Settings company/contact summary sourced from saved companyProfile fields. No business records were erased or replaced. NBO artwork and replacement contact details were not supplied.
- Full source tests passed. The rebuilt app passed 66/66 desktop/mobile navigation smoke checks with zero JavaScript errors. Final production proof is recorded in the release conversation after deployment.

### 2026-09-16 navigation incident

- Production interaction testing reproduced a DOM observer loop in the premium UI layer. On Schedule, the loop continuously replaced the Day/Week controls while the browser was trying to click them; the shared sync indicator and field-job action bar could also retrigger the same observer without any state change.
- The UI layer now renders Schedule once per route entry, leaves an unchanged sync indicator in place, and leaves an unchanged field action bar in place. Day/Week changes still render immediately when the user selects them.
- Regression checks now pin all three no-op guards, and the patch materializer handles both Windows and Unix line endings so the release suite can exercise the deployed layer consistently.
- The complete repository test command passed with zero failures. A real-browser interaction sweep passed 66/66 checks covering desktop/mobile primary navigation, all 24 More destinations, Schedule Day/Week, Jobs filters, Operations tabs, customer context drawer, Search / Ask OTTO, EN/ES, light/dark, field/mobile, and customer portal, with zero JavaScript runtime errors.

The authoritative Vercel production build for `21b66e8` completed successfully. Its build gate ran the full application test command, including live surfaces, owner shell, field workspace, unified intake, UI polish, QuickBooks handoff, Ask OTTO, location consent, OTTO Air, premium Operations, customer portal, merge/sync behavior, authentication, notifications, protected photos/files, roles, backups, UI regressions, and employee-policy acknowledgment. The build reported no failing test suite and completed deployment successfully.

The production QA report for that build reported:

- 449 application functions inspected
- 131 inline button/action calls inspected
- 0 missing handlers
- 0 missing Spanish dictionary keys
- production URL, guide, manifest, and service worker responding successfully
- production runtime error review with no current error clusters

For every release, verify the live `otto-kohl.vercel.app` deployment rather than assuming source state equals production. The minimum acceptance set is desktop/phone, English/Spanish, light/dark parity, owner navigation, day/week Schedule, context drawer, smart record headers, activity timeline, Operations → Needs Attention, Job Brief, Closeout Packet, local AI Workbench behavior, field mobile actions, customer isolation, secure portal cards, approved-file access, sync-state presentation, personalized Today backgrounds, and runtime-error review.

A credentialed end-to-end customer-portal session with a real test account is an operational acceptance check, not something documentation can certify. Do not claim it passed unless it was actually exercised against production.

## Branch rule

`main` is the authoritative release branch. Historical agent/fix branches are not release instructions merely because they still exist remotely. Preserve any branch with proven unique work before pruning it; otherwise prefer the state already merged into `main`.

## Remaining external/configuration boundaries

- `otto-prod-new` remains a non-authoritative Vercel project and must not be used as the release target.
- Production customer-portal acceptance that requires a real mailbox/account remains a credentialed operational check until a dedicated test account is exercised against production.
- Provider-backed email and Ask OTTO delivery depend on the relevant company credentials being present in the authoritative Vercel project. Code presence alone is not delivery proof.
