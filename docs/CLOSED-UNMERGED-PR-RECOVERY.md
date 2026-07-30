# Closed-unmerged pull request recovery registry

Updated: 2026-07-30

## Purpose

This file prevents bulk branch cleanup from silently destroying the easiest recovery path for work that was closed without merging. A closed PR is **not** proof that its work was wrong or already preserved.

## Safety rule

- Do not delete a branch tied to any PR below until its diff has been compared with current `main` and classified as **already preserved**, **superseded with evidence**, or **intentionally rejected with a recorded reason**.
- Never merge an old PR blindly. Old security, backend, authentication, or data-handling changes must be re-reviewed against current `main`.
- Never restore retired Firebase code, published PINs, fake data, or unauthenticated server access.
- No live data was read, changed, or deleted to create this registry.

## Critical correction completed

- PR #76 is **merged**, not lost. Current `main` commit `b27141e0a66adf7be235dc176fedf78241155f14` contains the correct demo-data isolation fix, `scripts/test-demo-seed.mjs`, the cleanup report, and the status entry.
- PR #73 was an older unsafe duplicate. It was closed on 2026-07-30 after the merged #76 implementation was verified on `main`.
- The fail-closed server protection from the former #72 work is also present on `main` in `api/_lib/serverAuth.js`.

## Closed without merge — recovery links

GitHub retains each PR's diff and patch at the linked PR page. These links are the durable recovery index even if a head branch is later removed.

| PR | Title | Initial handling |
|---:|---|---|
| #73 | prevent demo records entering production sync | Superseded by merged #76; do not restore |
| #71 | CRM facelift and isolated demo mode | Review visually and compare demo logic with #76 before any reuse |
| #67 | outstanding-work scrub report | Preserve as historical evidence; reconcile against current status |
| #66 | Supabase activation kit and verification script | Review for useful verification tooling; never restore old access assumptions |
| #65 | WCAG contrast, names and target sizes | Compare with current accessibility implementation |
| #64 | autonomous agent prompt | Historical only unless re-reviewed |
| #63 | Spanish client changelog and feedback intake | Compare with current client-document work |
| #56 | landing booking form and bilingual toggle | Scope/client-facing decision required before reuse |
| #55 | KPI charts from real data | Technical review candidate |
| #52 | autonomous finish loop and prompt library | Historical only unless re-reviewed |
| #44 | NVIDIA API tests | Compare with current fail-closed route tests |
| #43 | window-assignment regex fix | Compare with current QA scripts |
| #42 | Team view filtering optimization | Measure before reuse |
| #41 | window-property extraction | Compare with current QA scripts |
| #40 | email attachment optimization | Compare with current implementation |
| #39 | unauthenticated API route fix | Rejected historical approach; current fail-closed implementation governs |
| #38 | Gmail attachment fetching optimization | Compare with current implementation |
| #37 | email normalization tests | Compare with current tests |
| #36 | notification endpoint tests | Compare with current tests |
| #35 | Gmail Promise.all optimization | Compare with current implementation |
| #34 | stripHtml tests | Compare with current tests |
| #33 | IndexedDB backup deletion optimization | Compare carefully; backup safety first |
| #32 | var-to-const cleanup | Low-value; compare before reuse |
| #31 | QuickBooks stub tests | Compare with current fail-closed tests |
| #29 | Supabase migration verification | Historical; current Supabase state differs |
| #27 | Vercel routing fix | Compare with current `vercel.json` |
| #26 | remove hardcoded Firebase key | Historical security evidence; never restore Firebase |
| #24 | repair npm scripts | Compare with current `package.json` |
| #17 | accessibility audit report | Preserve findings as evidence if not already represented |
| #16 | security audit and screenshots | Preserve evidence if absent from `main` |
| #15 | specification-vs-reality report | Reconcile before reuse |
| #14 | Firebase setup guide | Intentionally obsolete; never restore |
| #13 | legacy inventory | Preserve if missing from `main` |
| #12 | unnamed task update | Inspect before branch deletion |
| #11 | backend integration and sync updates | Security/data review required |
| #9 | unnamed task update | Inspect before branch deletion |
| #7 | temporary file-retrieval branch | Inspect only for unique files; never merge blindly |
| #4 | OTTO CRM rebrand | Compare with current branding before deletion |

## Direct PR URLs

- https://github.com/ejnburrows-rgb/otto/pull/73
- https://github.com/ejnburrows-rgb/otto/pull/71
- https://github.com/ejnburrows-rgb/otto/pull/67
- https://github.com/ejnburrows-rgb/otto/pull/66
- https://github.com/ejnburrows-rgb/otto/pull/65
- https://github.com/ejnburrows-rgb/otto/pull/64
- https://github.com/ejnburrows-rgb/otto/pull/63
- https://github.com/ejnburrows-rgb/otto/pull/56
- https://github.com/ejnburrows-rgb/otto/pull/55
- https://github.com/ejnburrows-rgb/otto/pull/52
- https://github.com/ejnburrows-rgb/otto/pull/44
- https://github.com/ejnburrows-rgb/otto/pull/43
- https://github.com/ejnburrows-rgb/otto/pull/42
- https://github.com/ejnburrows-rgb/otto/pull/41
- https://github.com/ejnburrows-rgb/otto/pull/40
- https://github.com/ejnburrows-rgb/otto/pull/39
- https://github.com/ejnburrows-rgb/otto/pull/38
- https://github.com/ejnburrows-rgb/otto/pull/37
- https://github.com/ejnburrows-rgb/otto/pull/36
- https://github.com/ejnburrows-rgb/otto/pull/35
- https://github.com/ejnburrows-rgb/otto/pull/34
- https://github.com/ejnburrows-rgb/otto/pull/33
- https://github.com/ejnburrows-rgb/otto/pull/32
- https://github.com/ejnburrows-rgb/otto/pull/31
- https://github.com/ejnburrows-rgb/otto/pull/29
- https://github.com/ejnburrows-rgb/otto/pull/27
- https://github.com/ejnburrows-rgb/otto/pull/26
- https://github.com/ejnburrows-rgb/otto/pull/24
- https://github.com/ejnburrows-rgb/otto/pull/17
- https://github.com/ejnburrows-rgb/otto/pull/16
- https://github.com/ejnburrows-rgb/otto/pull/15
- https://github.com/ejnburrows-rgb/otto/pull/14
- https://github.com/ejnburrows-rgb/otto/pull/13
- https://github.com/ejnburrows-rgb/otto/pull/12
- https://github.com/ejnburrows-rgb/otto/pull/11
- https://github.com/ejnburrows-rgb/otto/pull/9
- https://github.com/ejnburrows-rgb/otto/pull/7
- https://github.com/ejnburrows-rgb/otto/pull/4

## Next review order

1. Security/data candidates: #66, #55, #39, #33, #29, #11.
2. Client-visible candidates: #71, #63, #56, #4.
3. Evidence/docs candidates: #67, #17, #16, #15, #13.
4. Tests/performance candidates: #65, #44, #43, #42, #41, #40, #38, #37, #36, #35, #34, #32, #31, #27, #24.

Nothing in this registry authorizes merging, deleting branches, or changing live data.