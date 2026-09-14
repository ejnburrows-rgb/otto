# Premium operations — 2026-09-14

Implemented on `feat-premium-ops-zero-cost` / PR #164.

## Delivered
- Existing minimal owner shell retained; Operations is inside More.
- Deterministic Needs Attention from recorded CRM facts only.
- Deterministic OTTO Job Brief with copy, browser print/PDF, and manual AI prompt copy.
- Deterministic internal/customer Job Closeout with copy, browser print/PDF, and manual AI-polish prompt copy.
- Local editable AI Workbench with ten requested prompt templates and no automatic transmission.
- Website/customer-portal request queue with contacted, convert, and close actions plus duplicate checks.
- Owner metrics limited to open jobs, awaiting estimates, outstanding invoices, collected revenue, scheduled work, unclosed jobs, and overdue follow-ups.
- Bilingual EN/ES strings, responsive touch targets, print styling, loading/empty-state-compatible minimal UI.
- Customer portal role using existing Supabase identity: customer-linked profiles only.
- Server-side portal record allowlist and customer/job isolation; internal collections withheld; photos/documents require an explicit customer-visible flag.
- Customer portal writes restricted to service-request records for the signed-in customer.
- Owner-only Supabase magic-link portal invitation endpoint.
- Focused source/regression checks for premium operations, customer isolation, offline asset wiring, bilingual/mobile/print behavior, and no new external AI endpoint.

## Cost boundary
No new paid API, subscription, workflow service, OCR service, or generative-AI integration was added. The AI Workbench only composes text locally for manual copy/paste.

## Release gate
PR #164 is mergeable. Both connected Vercel projects detected the branch. Preview checks must reach a successful state before merge and production promotion.
