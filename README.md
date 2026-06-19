# O.T.T.O. Plumbing CRM

The operating system for a plumbing company — a bilingual (English/Spanish), mobile-first CRM built for non-technical field workers and a hands-on owner. Single-file web app, deploy anywhere.

## Who it's for
Auto Plumbing / O.T.T.O. Plumbing — ~15 employees, $1M+ in yearly contracts. Designed to replace paper and Excel, cut calls to the owner, and let the crew work from their phones without training.

## Core features
- **English by default, full Spanish toggle** — native labels, switchable any time; each user has a preferred language.
- **Role-based access** — Owner, Office, Field Worker, Accounting. Each role sees only what it needs. PIN login per person.
- **Customers, Jobs, Calls, Notes, Photos, Documents** — every record searchable from any device.
- **Job folders** — auto-created per job; photos and AutoCAD/drawings (.dwg/.dxf) and paperwork attach to the right job automatically.
- **Estimates & Invoices** — line items, convert estimate → invoice, track balances, QuickBooks sync flag.
- **Payments & Checks** — record payments, auto-match to open invoices.
- **Check / paper OCR** — snap a check, receipt, or invoice; it's read and matched to a payment (requires an AI key).
- **Voice input (EN/ES)** — dictate notes, job updates, follow-ups, and knowledge entries.
- **Follow-ups** — overdue / today / upcoming, with one-tap complete.
- **Workflows** — new call → customer + job; completed job → follow-up; status change → office notified. Toggle on/off.
- **Knowledge base / SOPs** — searchable how-to guides; powers the assistant.
- **Assistant** — answers from your jobs, customers, notes, and SOPs locally; optionally smarter with an AI key.
- **Worker map / GPS** — opt-in location tracking; "I'm Here" logs arrival to a job.
- **Reports** — revenue, jobs by status and worker, outstanding invoices; full CSV export to replace spreadsheets.

## Data & privacy
Runs entirely in the browser. Data is stored in `localStorage`; photos and files in IndexedDB; rolling auto-backups kept locally. Export/restore full JSON backups from Settings. An AI key (Anthropic) is optional and used only for check/paper reading and the smart assistant.

## Default PINs (demo)
Owner `1111` · Office `2222` · Carlos (Field) `3333` · Accounting `4444` — change these in Settings → Team.

## Deployment
Static single-file HTML app (`index.html`). Deploy to Vercel, Netlify, or any static host.
