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

**Recommended setup (one time):** add your Anthropic key as an environment
variable in Vercel, then redeploy.
1. Vercel → the project → **Settings → Environment Variables**
2. Add `ANTHROPIC_API_KEY` = `sk-ant-…` (Production + Preview)
3. Redeploy (or push). AI now works on every worker's device with nothing to
   paste in the app.

The client falls back gracefully: server proxy → a personal key entered in
**Settings → Artificial Intelligence** (device-only) → local keyword search over
your records. Without any key, scanning simply lets you type the details in.

> Self-hosting elsewhere? Any platform that runs the `api/claude.js` function
> works, or set a personal key in Settings. Opening `index.html` directly (no
> server) still runs everything except the AI calls.

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
payments · checks · followups · workflows · sops · users · locations · folders`

Photos and files are stored as blobs in IndexedDB and linked to their job;
everything else is JSON, backed up to localStorage and exportable to JSON/CSV.

## Files
- `index.html` — the entire application.
- `api/claude.js` — Vercel serverless proxy to the Anthropic API (keeps the key server-side).
- `manifest.json`, `sw.js` — PWA install + offline shell.
- `legacy/dream-cooling-crm.html` — the previous Dream Cooling (HVAC) app this
  branch replaced, kept for reference.
