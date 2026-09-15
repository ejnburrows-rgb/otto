# STATUS — OTTO Plumbing CRM

Updated: 2026-09-14. This file is the current release snapshot. Older implementation history remains in Git history and closed PRs; it is not active release guidance.

## Production

- Authoritative branch: `main`
- Authoritative Vercel project: `otto`
- Production URL: https://otto-kohl.vercel.app
- Current verified production source before this documentation-only commit: `db9bcca2ecbf8dcf1436c7a1f098492a2d181807`
- Verified Vercel deployment: `dpl_8ZbNARBf2mnd7vfT2hnB6UFBbXqS` — READY
- Normal deployment workflow: pushes to `main` produce production deployments in the `otto` Vercel project.

A second Vercel project named `otto-prod-new` is not the authoritative customer/owner production project. It does not own the established `otto-kohl.vercel.app` production URL. It remains untouched until its environment/configuration can be compared conclusively; do not treat it as the release target.

## Current product state

OTTO is the bilingual internal CRM for OTTO Plumbing Inc. Current `main` includes customers, jobs, scheduling, estimates/invoices/payments, documents/photos, field workflows, payroll intake, Inbox, reports, backups, Plans & AutoCAD, work-only field location, and Ask OTTO.

PR #164 is merged on `main` and adds the zero-recurring-cost operations layer: deterministic Needs Attention, Job Brief, Closeout Packet, owner metrics, request conversion, a local editable prompt workbench that does not make live generative-AI calls, an isolated customer portal, approved-file filtering, protected customer-file access, and customer portal invitations through the existing Supabase identity model.

PR #165 adds the next premium UI layer with English/Spanish parity: universal customer/job/estimate/invoice context drawer, day/week dispatch, unified activity timeline, mobile field action bar, smart record headers, command-palette quick create, personalized Julio/Sarays Today backgrounds, Operations inbox polish, secure customer-portal summary cards, visible offline/sync state, integrated job file viewing, and premium form states. It introduces no new paid API or external AI call. The secure PR #164 customer portal remains authoritative and the new card layer only enhances it.

PR #145 is merged and the obsolete Anthropic setup instructions are retired. Current provider documentation follows the code that actually exists. Ask OTTO remains a separate, existing provider-backed feature and requires the configured company-side provider credentials; the local AI Workbench from PR #164 does not call an external AI service.

The latest owner-workspace changes also include the supplied Julio and Sarays personal backgrounds. The premium UI treatment limits those backgrounds to the personalized Today/entry experience so operational record screens remain neutral and readable.

## Backend and access

- Supabase is the production identity/data backend.
- Supabase email-link authentication and server-controlled OTTO roles remain the account boundary.
- Customer portal access is isolated from internal owner/office data and is limited to customer-visible records and explicitly approved files.
- Internal notes, internal costs, payroll, unrelated customers/jobs, and non-approved files must never be exposed through the customer portal.
- SendGrid remains the documented company email provider path where configured.
- QuickBooks remains a manual handoff only; there is no Intuit OAuth/background sync.
- No new paid service or paid AI API is required by the PR #164 or PR #165 premium layers.

## Release acceptance

For every release, verify the live `otto-kohl.vercel.app` deployment rather than assuming source state equals production. The minimum acceptance set is desktop/phone, English/Spanish, owner navigation, day/week Schedule, context drawer, smart record headers, activity timeline, Operations → Needs Attention, Job Brief, Closeout Packet, local AI Workbench behavior, field mobile actions, customer isolation, secure portal cards, approved-file access, sync-state presentation, and runtime-error review.

A credentialed end-to-end customer-portal session with a real test account is an operational acceptance check, not something documentation can certify. Do not claim it passed unless it was actually exercised against production.

## Active work and branch rule

`main` is the authoritative release branch. Historical agent/fix branches are not release instructions merely because they still exist remotely. Preserve any branch with proven unique work before pruning it; otherwise prefer the state already merged into `main`.

PR #165 is mergeable at the GitHub graph level. Its current automated checks are externally blocked before execution: GitHub Actions is failing before any job step is assigned, while both connected Vercel checks are rejected by the Hobby team build-rate limit. Those infrastructure failures are not application test passes and are not application test failures.

## Known release constraints

- Vercel is currently rejecting new `otto` and `otto-prod-new` builds because the Hobby team has hit its build-rate limit. New source is not production proof until a deployment actually reaches READY.
- GitHub Actions currently fails before step 1, so a current full CI run has not executed for PR #165.
- `otto-prod-new` is a redundant-looking Vercel project, but it has not been deleted because the available connected Vercel API does not expose the environment comparison/project deletion needed to prove removal is safe.
- Production authentication/customer-portal acceptance that requires a real mailbox/account must be recorded as unverified until a credentialed session is actually completed.
- Provider-backed email/Ask OTTO delivery depends on the relevant company credentials being present in the authoritative Vercel project. Code presence alone is not delivery proof.
