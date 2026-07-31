# Product Requirements Document (PRD): OTTO Plumbing CRM (MVP)

> **Document Status**: Production Complete
> **Product Name**: OTTO Plumbing CRM
> **Tagline**: The bilingual operating system built for field plumbers and hands-on owners.

---

## 1. Product Overview & Target Audience

### 1.1 Product Purpose
OTTO Plumbing CRM replaces messy paper notes, phone calls, and Excel spreadsheets with a mobile-first, bilingual Progressive Web App designed specifically for a 15-person plumbing crew and company owner.

### 1.2 User Personas
- **The Owner (Otto)**: Needs complete visibility into jobs, emergency exception alerts, financial summary, and team check-ins without making 20 phone calls a day.
- **Office Dispatcher / Manager**: Manages call intake, assigns jobs, reviews incoming paper check scans, and monitors active work orders.
- **Field Worker (Plumber)**: Spanish or English speaking; needs a fast, 1-tap mobile interface to view job details, upload before/after photos, dictate notes, and check in/out.
- **Accounting / Bookkeeper**: Requires accurate customer estimates, invoices, check tracking, and one-tap QuickBooks CSV exports.

---

## 2. User Journey (Discovery → Operations → Success)

1. **Job Dispatch**: Office logs a call → assigns to a field worker → worker receives instant notification on phone.
2. **On-Site Execution**: Worker arrives → taps "Share Location" / "Check-in" → takes before/after job photos → dictates voice notes in Spanish or English.
3. **Billing & Invoicing**: Worker completes job → office scans physical check / generates invoice → automated 7-day customer follow-up task is scheduled.
4. **Owner Review**: Owner opens app → sees 4 core status tiles, daily job activity, exception tags, and revenue reconciliation.

---

## 3. Core MVP Feature Specifications (MoSCoW)

### Must-Have (v1)
- **Bilingual Interface**: Toggle between English and Spanish in top navigation; individual user default language setting.
- **Offline PWA Shell**: Fully functional offline capabilities with local IndexedDB storage and auto-sync.
- **Core Records**: Customers, Jobs, Calls, Notes, Photos, Estimates, Invoices, Payments, and Checks.
- **AI Assistants**: Voice-to-text dictation, paper check OCR scanner, AutoCAD/PDF drawing estimator.
- **Role-Based Access**: Owner, Office, Field Worker, and Accounting views with PIN-protected authorization.
- **QuickBooks Integration**: One-click CSV exports of invoices and payments formatted for QuickBooks import.

### Intentionally Saved for Version 2 (Non-MVP)
- Live GPS hardware vehicle telematics tracking.
- Automated SMS customer marketing campaigns.
- Multi-branch multi-company tenant switching.

---

## 4. Success Metrics & Key Performance Indicators (KPIs)

- **Field Worker Adoption**: > 95% of job photo/note updates recorded via app rather than paper/SMS.
- **Invoicing Velocity**: Average time from job completion to invoice generation reduced from 3 days to < 10 minutes.
- **Data Integrity**: 100% mathematical reconciliation between job estimates, invoices, payments, and bank checks.

---

## 5. Design & User Experience Principles

- **Non-Technical First**: Large 48px+ touch targets, simple non-jargon labels, zero complex dropdown chains.
- **High Contrast**: Dark/Light mode default tailored for high visibility under direct sunlight on jobsites.
- **Bilingual Consistency**: Native Spanish terminology tailored for trade plumbing (not machine-translated).

---

## 6. Definition of Done (DoD)

- [x] All 17 browser integration QA tests passing (`node scripts/qa-browser.mjs`).
- [x] Static syntax and dictionary verification passing (`node scripts/qa-check.mjs`).
- [x] Tested and installable as a mobile PWA shell.
