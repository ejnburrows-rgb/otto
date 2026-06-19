# OTTO Plumbing CRM

The operating system for **Auto Plumbing / O.T.T.O. Plumbing** — a bilingual
(English / Spanish), mobile-first, minimal CRM built for a 15-person plumbing
crew and a hands-on owner. Not a generic CRM: it is shaped around how a
plumbing company actually runs a day.

It is a single-file Progressive Web App (`index.html`) plus a manifest and a
service worker. No build step, no server required. Open it, deploy it to any
static host, or install it to a phone's home screen.

## Why it's built this way
- **Non-technical first.** Big obvious buttons, one clear action per screen,
  no deep menus, no jargon. Every screen reads in under 5 seconds.
- **Bilingual from day one.** English default with a full Spanish toggle in the
  top bar. Each user also has a default language, so a Spanish-speaking field
  worker lands in Spanish automatically. Labels are native, not machine-literal.
- **Works on the phone, in the field, offline.** Installable PWA, service-worker
  shell cache, data stored locally in IndexedDB and mirrored to localStorage,
  with optional cloud sync.

## What it does (mapped to the brief)
| Requirement | Where it lives |
|---|---|
| Customers, Jobs, Calls, Notes | Core records + job folders |
| Photos auto-attached to the right job | Camera button on every job → stored in that job's folder |
| Documents, scans, **AutoCAD** files | Job → Documents tab (upload / scan / CAD `.dwg .dxf`) |
| Estimates, Invoices, Payments, **Checks** | Money tab + top-level lists |
| Follow-ups & Workflows | Auto-created (e.g. completing a job schedules a 7‑day follow-up) |
| SOP / Knowledge base | Knowledge section, bilingual entries, searchable |
| **Voice input** (EN/ES) | Microphone button on every text field + standalone voice notes |
| **OCR** for checks/invoices/receipts/paperwork | Scan buttons → reads the image → pre-fills a check/invoice |
| **Internal chatbot** | "Ask OTTO" answers from jobs, customers, notes, invoices, and SOPs |
| **GPS / location** | "Share my location" → team map with latest position per worker |
| **QuickBooks** | One-tap CSV export of invoices and payments in QuickBooks import format |
| **Role-based access** | Owner / Office / Field worker / Accounting, with tailored nav + permissions |
| Replace Excel | Reports dashboard + CSV export of every record type |
| **Inbox / email register** | Import forwarded `.eml` files (or auto-capture via webhook), matched to the right customer/job, searchable, AI-summarized |
| **Payroll intake** | Import an Excel/CSV payroll file → each row becomes a structured, searchable payroll record |
| **Drawing → estimate** | Upload AutoCAD/PDF → reads it → drafts a materials list & scope (NVIDIA) → owner reviews & confirms |
| **AI search** | "Ask OTTO" now also searches emails, documents, and payroll |
| **Worker accountability** | Check-in/out (work-only GPS), before/after photos, short checklist, consent |
| **Owner hub** | 4 tiles + 5 exception tags + daily summary + AI activity + consent + audit |
| **Per-project AI** | Each job has its own AI context; answers from job data, clarifies once, escalates |
| **Versioned documents** | Contracts / proposals / plans with version + approval history |
| **Alerts & audit** | Typed alerts (severity/status/source/owner) + full audit trail |
| **Backups** | Verified, versioned snapshots + scheduled restore tests + log |

## Workflows wired in
- **New call → customer + job.** Logging a call matches an existing customer
  (or creates one), optionally spins up a job, and runs the "New Service Call"
  workflow.
- **Photo / voice note → job.** Field workers pick a job once, then snap photos
  or dictate notes straight into that job's folder.
- **Scan a check → payment.** OCR reads the check and offers to record it as a
  check + payment against an invoice.
- **Complete a job → follow-up + office notice.** Status changes notify the
  office and auto-schedule a customer follow-up.
- **Ask a question → answered from the record**, or pointed to the office/owner
  when the data isn't there — turning repeat phone calls into searchable knowledge.

## Roles & sign-in
Four seeded users (PIN `1234` each — change them in **Team**):
- **Owner** — everything.
- **Office** — everything except team management.
- **Field worker** — jobs, customers, follow-ups, knowledge, assistant. Simplest screen.
- **Accounting** — customers, estimates, invoices, payments, checks, reports.

## AI features (one key, all devices)
Voice-to-text uses the browser's speech recognition and needs no key. OCR
(reading checks/invoices) and the smartest assistant answers use the Anthropic
API through a small serverless proxy (`api/claude.js`), so the key lives on the
server and never in the browser.

The **drawing / PDF estimating assistant** uses the **NVIDIA** API through its
own serverless proxy (`api/nvidia.js`), again with the key on the server.

**Recommended setup (one time):** add your keys as environment variables in
Vercel, then redeploy.
1. Vercel → the project → **Settings → Environment Variables**
2. Add `ANTHROPIC_API_KEY` = `sk-ant-…` (Production + Preview) for OCR + assistant.
3. Add `NVIDIA_API_KEY` = `nvapi-…` (Production + Preview) for the drawing
   estimator. Optionally set `NVIDIA_MODEL` (defaults to `meta/llama-3.3-70b-instruct`).
4. Redeploy (or push). AI now works on every worker's device with nothing to
   paste in the app.

### Drawing → estimate (upload, review, confirm)
Open a job → **Documents** → upload an AutoCAD drawing (`.dwg .dxf .dwf .dgn`)
or a **PDF**. OTTO reads the title block, notes, callouts, dimensions, labels and
tables, turns them into structured data, and asks the NVIDIA model to draft a
plain-language **job summary, scope, and materials list** with quantity counts.
If something is genuinely unclear it asks **one** simple question instead of
guessing. The owner reviews and edits the draft, confirms it (saved inside the
job's folder), and can turn it into a real Estimate in one tap. The result is
shown in whichever language the toggle is set to. DXF and PDF are read in the
browser; binary DWG falls back to readable-text scraping.

The client falls back gracefully: server proxy → a personal key entered in
**Settings → Artificial Intelligence** (device-only) → local keyword search over
your records. Without any key, scanning simply lets you type the details in.

> Self-hosting elsewhere? Any platform that runs the `api/claude.js` function
> works, or set a personal key in Settings. Opening `index.html` directly (no
> server) still runs everything except the AI calls.

## Inbox, documents & payroll (enter it once)
The CRM is the single place correspondence, paperwork, and payroll live — no
re-keying into spreadsheets.

- **Inbox.** Open **Inbox** → **Import email file** to drop in forwarded/saved
  `.eml` files. OTTO reads the sender, subject, body and attachments, matches the
  message to the right customer and job, summarizes it in plain language, and
  makes it searchable. You can re-link it or save it as a job note in one tap.
  For **fully automatic capture**, point your email provider's inbound webhook
  (SendGrid Inbound Parse, Mailgun, Postmark, …) at `/api/inbound-email` and set
  `FIREBASE_PROJECT_ID` + `FIREBASE_API_KEY` in Vercel — forwarded mail then
  appears in the Inbox on its own (it writes into the same Firestore the app
  syncs from; see Cloud sync below).
- **Documents.** Uploading or scanning a file in a job saves the original, OCRs
  it (checks/invoices/receipts) or estimates it (drawings/PDFs), and creates a
  searchable record in that job's folder.
- **Payroll.** Open **Payroll** → **Import payroll file** and pick an Excel
  (`.xlsx`) or CSV file. Columns (employee, hours, rate, gross, period) are
  detected automatically; you get a preview, then every row becomes a structured
  payroll record with a running total, CSV export, and an AI summary. (`.xlsx`
  parsing loads SheetJS from the CDN on first use; `.csv` works fully offline.)

All of the above feed **Ask OTTO**, so the owner can ask questions across any
saved email, document, or payroll record.

## Accountability layer (workers, owner hub, AI, safety)
A field-service layer that keeps workers accountable without adding friction.

- **Worker app.** PIN login; field workers get a **Spanish-first consent screen**
  on first login (work-only GPS, photos, checklists — no personal tracking).
  Inside a job: **Check in / Check out** (GPS captured only between the two),
  **before/after photos**, and a **short checklist**. Off-site check-ins, missing
  photos, missing checklists and late check-outs raise alerts automatically.
- **Owner hub** (owner/office home). Four tiles only — **jobs today, workers on
  site, exceptions, ready to close** — and five exception tags — **off-site,
  missing photo, missing checklist, late check-out, AI escalated**. Everything
  else is drill-down. Plus a one-tap **daily summary**, an **AI activity** panel,
  **consent status** per worker, and the **audit trail**.
- **Project AI.** Every job has its own AI context (overview, goal, phase, rules,
  FAQ) on the job's **🤖 Project AI** tab. It answers *as the owner would, from
  that job's data first*; if unsure it asks **one** clarifying question, and the
  worker can escalate to the owner in one tap (logged + alerted).
- **Documents.** Contracts, proposals and plans are first-class, **versioned**
  records — uploading the same name creates a new version (never overwrites),
  with an **approval history**; updates raise an alert.
- **Alerts.** Typed, with severity / status / source / timestamp / assigned
  owner; in-app first (email/SMS for critical items needs a provider — see notes).
- **Backups.** Automatic + manual snapshots kept as multiple **versioned** copies
  (offsite via cloud sync when configured), each **verified** by checksum, with
  **scheduled restore tests** and a full backup/restore log. Contracts/proposals/
  plans are never overwritten.
- **Security.** Role-based access; optional **extra owner/admin code (MFA)** at
  login; audit logging of key actions; work-only (not continuous) location.

> Honest scope: this is a client-side PWA. True email/SMS delivery, real
> server-side MFA, and immutable offsite storage need a backend/provider — the
> app implements the in-app equivalents and the data model + hooks to wire them
> up. Automatic email capture already has a webhook (`api/inbound-email.js`).

## Cloud sync (optional)
**Settings → Cloud Sync** accepts a Firebase project ID + web API key to share
data across devices via Firestore. Without it, everything still works fully on
the device.

## Run / deploy
```bash
# locally
python3 -m http.server 8000   # then open http://localhost:8000

# or just open index.html, or deploy the folder to Vercel / Netlify / any static host
```

## Data model
`customers · jobs · calls · notes · photos · documents · estimates · invoices ·
payments · checks · followups · workflows · sops · users · locations · folders ·
emails · payroll · projects · job_events · job_checklists · ai_conversations ·
ai_escalations · consent_records · contracts · proposals · plans · alerts ·
backups · daily_summaries · audit_log`

Photos and files are stored as blobs in IndexedDB and linked to their job;
everything else is JSON, backed up to localStorage and exportable to JSON/CSV.

## Files
- `index.html` — the entire application.
- `api/claude.js` — Vercel serverless proxy to the Anthropic API (keeps the key server-side).
- `api/nvidia.js` — Vercel serverless proxy to the NVIDIA API for the drawing estimator (key server-side).
- `api/inbound-email.js` — optional inbound-email webhook for automatic Inbox capture (writes to Firestore).
- `manifest.json`, `sw.js` — PWA install + offline shell.
- `legacy/dream-cooling-crm.html` — the previous Dream Cooling (HVAC) app this
  branch replaced, kept for reference.
