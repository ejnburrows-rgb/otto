# OTTO Plumbing CRM — Full Project Specification

**Repository:** `ejnburrows-rgb/dream-cooling-crm`
**Stack:** Single-file PWA (HTML/CSS/JS) · IndexedDB · Firebase Firestore/Storage · Vercel · Service Worker
**Languages:** English / Spanish (full bilingual parity required on all UI)
**Last updated:** June 20, 2026

---

## 1. Project Overview

OTTO is a mobile-first, single-file Progressive Web App (PWA) built for a plumbing contractor business. It runs entirely from `index.html` with no build step, no npm dependencies, and no server-side rendering. All state is persisted in IndexedDB with optional Firebase sync. The app is deployed via Vercel and installable on any device as a PWA.

The system has two distinct role views:
- **Owner** — full access to all modules, KPIs, worker management, financials, approvals
- **Worker** — scoped portal showing only their schedule, assigned jobs, checklist, and personal requests

---

## 2. Architecture Rules (Hard — Do Not Break)

1. Single `index.html` file — no multi-page routing, no separate HTML files
2. No npm or Node.js build dependencies — CDN only for all libraries
3. No `localStorage` or `sessionStorage` — use in-memory variables; persist to IndexedDB
4. All pages reachable via in-page navigation (hash routing or JS view switching)
5. Bilingual parity — every string must exist in both `en` and `es` in the i18n object
6. Touch targets minimum 44×44px — all interactive elements
7. PWA integrity maintained — `manifest.json` and `sw.js` must stay valid after every change
8. Role access enforced client-side — `role === 'worker'` never sees owner views; no exceptions
9. GPS permission requested on first launch and required for app use — no geofencing logic needed
10. NVIDIA NIM API key stored in owner Settings — never hardcoded

---

## 3. Role System

### 3.1 Owner
- Single owner account; authenticates via PIN
- Full access to all modules
- Receives all worker submissions, GPS logs, escalations, time-off requests
- Approves/denies time-off requests (one tap → worker notified instantly)

### 3.2 Worker
- Multiple worker accounts, each with unique PIN
- On login, `role === 'worker'` is detected — Worker Portal loads exclusively
- Cannot access owner dashboard, financials, other workers' data, or settings
- GPS is always-on requirement — acknowledged once during app setup, never prompted again

---

## 4. Core CRM Modules (Existing — Maintain)

The following modules are already implemented in `index.html` and must not be broken by new additions:

- Dashboard (owner home with tiles)
- Customers
- Jobs / Work Orders
- Estimates
- Invoices
- Payments
- Payroll
- Scheduling
- Notes & Documents
- Ask OTTO (AI chatbot)
- Drawing → Estimate (NVIDIA)
- OCR
- Inbox (base structure)
- Owner Hub
- Worker Accountability (to be extended — see §6)
- GPS tracking (to be extended — see §7)
- Backups
- Versioned Documents
- Settings

---

## 5. New Module: AI Floor Plan Takeoff via Email Inbox

### 5.1 Overview
When a PDF floor plan arrives as an email attachment, the user can open, download, or trigger an AI analysis — all from inside OTTO without leaving the app.

### 5.2 Email Inbox Integration
- Owner connects Gmail via OAuth 2.0 (one-time setup in Settings → "Connect Email")
- Gmail push notifications (Gmail API) deliver incoming emails to OTTO in real time
- Each email renders as a card in the Notifications/Inbox tab
- If the email has a PDF attachment, three inline action buttons appear on the card:
  - `[ 👁 Preview ]` — renders PDF in an in-app modal using PDF.js
  - `[ ⬇ Download ]` — triggers browser download of the file
  - `[ 🤖 Analyze with AI ]` — triggers the NVIDIA takeoff pipeline

### 5.3 AI Takeoff Pipeline
1. PDF.js converts each PDF page to a base64 JPEG image (client-side, no server)
2. Each page image is sent to NVIDIA NIM VLM via the API call below
3. Structured JSON response is parsed into a material line-item list
4. OTTO displays a job assignment modal asking: existing job or new project folder?
5. Materials are written to the selected job record; original PDF is attached

### 5.4 NVIDIA NIM API Call

**Recommended model:** `nvidia/llama-3.1-nemotron-nano-vl-8b-v1`
**Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions`
**Auth:** Bearer token from owner's NVIDIA API key (stored in Settings)
**Secondary model for structured extraction:** `nvidia/nemoretriever-parse` (bounding-box text classification)

```javascript
async function analyzeFloorPlan(base64ImagePage) {
  const PLUMBING_TAKEOFF_PROMPT = `You are a licensed plumbing estimator.
From this floor plan image extract:
- All fixture locations (toilet, sink, shower, tub, water heater, dishwasher, washing machine connection)
- Linear feet of hot water supply pipe, cold water supply pipe, and drain/waste pipe
- Fitting types and counts (elbows, tees, couplings, valves)
- Rough-in dimensions where visible
Return ONLY valid JSON: { fixtures: [], pipes: [], fittings: [], notes: "" }`;

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SETTINGS.nvidiaApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64ImagePage}` }},
          { type: "text", text: PLUMBING_TAKEOFF_PROMPT }
        ]
      }],
      max_tokens: 1024
    })
  });
  return response.json();
}
```

### 5.5 Job Assignment Modal
After analysis, OTTO shows:
```
✅ AI Analysis Complete
Found: [X] fixtures · [Y] LF pipe · [Z] fittings

Assign to:
○ Existing job  [ Search jobs... ]
○ Create new project folder

[ Cancel ]   [ Confirm & Save ]
```
If "Create new project" is selected, OTTO pre-fills: client name (from email sender), attached PDF, and the full material list. Worker does not see this module.

---

## 6. New Module: Worker Portal

### 6.1 Worker Home Screen
After PIN login with `role === 'worker'`, the worker sees:
- Greeting with their name and today's date
- Today's assigned jobs (time, address, job type)
- This week's schedule (Mon–Sun strip)
- Buttons: "View 2-Week Schedule" / "View 4-Week Schedule"
- Notification dot if they have pending items (PTO status, messages)

### 6.2 Schedule & Workload
- Owner assigns jobs to workers from the owner-side scheduling module
- Workers see their schedule up to 2 weeks by default; owner can extend to 4 weeks per project
- Mandatory overtime jobs display a 🔴 OT badge — worker must tap "Acknowledge OT" to confirm receipt
- Worker cannot decline mandatory OT — acknowledgment only

### 6.3 Job Checklist Flow

**Check-In (Job Start)**
- Worker taps job → taps "Start Job"
- Required: tap "Acknowledge" (confirms they have received and understood the assignment)
- Optional or required (set by owner per job): take a "Before" photo
- GPS coordinates + timestamp are logged automatically at this moment

**During Job (Checklist)**
- Owner pre-configures checklist items per job type (e.g., Rough-In, Service Call, Fixture Install)
- Worker taps each item to check it off
- If an item cannot be completed: worker long-presses or taps "Can't complete" → note field opens → required brief explanation
- Missed items + notes are flagged immediately on owner's dashboard

**Check-Out (Job End)**
- Worker reviews completed checklist
- Optional or required (set by owner): take an "After" photo
- Any unchecked items without a note block submission — OTTO shows: "Complete all items or add a note before closing"
- Worker taps "Submit & Close Job"
- Full report (timestamps, GPS log, photos, checklist state, notes) is sent to owner account instantly

### 6.4 Time-Off Requests
- Worker: Settings → "Request Time Off" → select dates → add optional reason → submit
- Owner receives push notification with Approve / Deny buttons
- One tap = decision made; worker receives immediate in-app notification
- If dates conflict with an existing scheduled job, owner sees a conflict warning before approving
- Approved PTO appears green on worker's schedule; denied shows with owner's optional reason

### 6.5 Multi-Session Behavior
- Workers can open/close the app freely throughout the day
- Each job check-in and check-out is tied to the job card, not the app session
- If a worker closes the app with an open job, OTTO shows a reminder banner on next open: "You have an open job — complete check-out"

---

## 7. GPS Tracking

### 7.1 Setup
- GPS permission is requested once during first app launch (onboarding screen)
- Worker acknowledges that GPS must remain active at all times while the app is in use
- This is a condition of use — no geofencing, no repeated prompts
- If GPS is unavailable when a job action is taken, OTTO logs "GPS unavailable at [timestamp]" and notifies owner

### 7.2 What Gets Logged Per Worker Per Day
- App open timestamp + GPS coordinates
- App close timestamp + GPS coordinates
- Each job check-in: GPS coordinates + timestamp
- Each job check-out: GPS coordinates + timestamp
- Any location snapshot taken mid-job (photo metadata)
- Cumulative time at each unique location (calculated from GPS clusters)

### 7.3 Location Time Calculation
OTTO does not use geofences. Instead, it uses **GPS coordinate clustering**:
- While a job is open, GPS is sampled every 5 minutes
- Coordinates within ~200ft of each other are grouped into a "location session"
- Total time at that location = last sample timestamp minus first sample timestamp for that cluster
- This produces: "Carlos was at [address] for 3h 42min" derived from GPS data, not manual input

### 7.4 Payroll Integration
- GPS-verified hours per worker per job feed directly into the Payroll module
- Hours auto-populate — no manual entry
- When a worker's weekly hours exceed 40, remaining jobs auto-flag 🔴 OT on the owner's scheduler

---

## 8. New Module: Owner KPI Dashboard

### 8.1 Overview
A dedicated KPI view accessible from the owner's home screen. Shows all worker performance data in one place with charts and filterable tables.

### 8.2 KPI Metrics Tracked Per Worker

| Metric | Description |
|--------|-------------|
| **Login Count** | Total app opens this week / month |
| **First Login Time** | Daily first open timestamp |
| **Last Logout Time** | Daily last close timestamp |
| **Jobs Assigned** | Count of jobs assigned in period |
| **Jobs Completed** | Count of jobs with full check-out submitted |
| **Jobs Escalated** | Count of jobs with at least one missed checklist item |
| **Escalation Details** | Which items were missed + worker's notes |
| **GPS Locations** | All unique locations visited with time spent at each |
| **Total Hours On-Site** | GPS-derived cumulative time at job locations |
| **Overtime Hours** | Hours beyond 40/week, flagged per job |
| **PTO Requests** | Count submitted, approved, denied; upcoming approved dates |
| **Before/After Photos** | Count submitted per period |
| **Checklist Completion Rate** | % of checklist items completed without escalation |

### 8.3 KPI Views

**Summary Card (per worker):**
```
Carlos M. ─────────────────────────────────
This Week:  32h on-site  ·  4 jobs done  ·  1 escalation
Locations:  3 sites visited
PTO:        None pending
[ View Full Profile ]
```

**Detailed Worker Profile (tap-through):**
- Weekly calendar heatmap (days worked, hours per day)
- Location log table: address, arrival time, departure time, hours
- Job completion timeline
- Escalation log with notes
- PTO history (requested / approved / denied)
- Login/logout history

**Aggregate Team View:**
- Total team hours this week vs. last week (line chart)
- Jobs completed vs. assigned (bar chart, per worker)
- Escalation rate by worker (bar chart)
- Overtime hours by worker (stacked bar)

### 8.4 Chart Library
Use **Chart.js** (already CDN-available). All charts use OTTO's blue palette (`--blue`, `--blue2`, `--accent`). Charts are responsive and render correctly at 375px mobile width.

### 8.5 Filters
KPI dashboard filterable by:
- Worker (individual or all)
- Date range (this week / last week / this month / custom)
- Metric type (hours / escalations / PTO / locations)

---

## 9. PWA Distribution — How to Get It On Workers' Phones

### 9.1 What OTTO Already Is
OTTO is already a PWA with a valid `manifest.json` and `sw.js`. This means it can be installed on any Android or iOS device directly from the browser — **no App Store submission required.**

### 9.2 Distribution Method (Recommended: Direct Link via Vercel)

1. **Deploy to Vercel** — OTTO's Vercel URL (e.g., `https://otto-crm.vercel.app`) is the install link
2. **Send link to each worker** via SMS or WhatsApp
3. **Worker opens link in browser:**
   - **Android (Chrome):** Banner appears automatically — "Add OTTO to Home Screen" → tap Install
   - **iOS (Safari):** Worker taps Share → "Add to Home Screen" → Add
4. App icon appears on their home screen — looks and behaves like a native app
5. Works offline (service worker caches the app shell)

### 9.3 Per-Worker Setup Flow (First Launch)
1. Worker opens app from home screen icon
2. OTTO shows onboarding screen:
   - "OTTO requires GPS access to track job site hours. Tap Allow to continue."
   - GPS permission prompt fires — worker taps Allow
   - Worker enters their assigned PIN
   - Worker Portal loads — their view only
3. Setup complete. Never prompted for GPS again.

### 9.4 Owner Controls Distribution
- Owner creates worker accounts in Settings → Workers → "Add Worker"
- Assigns name, role, PIN, and language preference (EN/ES)
- Sends the Vercel URL to the worker — that's the entire onboarding

### 9.5 Future: Native App Wrapper (Optional, Later)
If a native App Store listing is later desired, OTTO can be wrapped using:
- **Capacitor** (Ionic) — wraps the existing HTML/JS into an Android APK or iOS IPA with zero code changes
- **PWABuilder** (Microsoft, free) — generates App Store packages directly from the Vercel URL
This is deferred — the PWA installation method covers all current requirements.

---

## 10. Environment Variables (Vercel)

| Variable | Value | Used By |
|----------|-------|---------|
| `NVIDIA_API_KEY` | Owner's NVIDIA NIM key | Floor plan AI takeoff |
| `FIREBASE_API_KEY` | Firebase project API key | Firestore / Storage sync |
| `FIREBASE_PROJECT_ID` | Firebase project ID | All Firebase calls |
| `GMAIL_CLIENT_ID` | Google OAuth client ID | Email inbox integration |

The NVIDIA key is also stored in the owner's in-app Settings (encrypted in IndexedDB) for direct client-side calls.

---

## 11. Data Model Extensions

### New Collections / Stores

**`gps_logs`**
```json
{
  "id": "uuid",
  "workerId": "string",
  "jobId": "string | null",
  "event": "app_open | app_close | job_checkin | job_checkout | sample",
  "lat": "number",
  "lng": "number",
  "timestamp": "ISO8601",
  "locationLabel": "string (reverse geocoded address)"
}
```

**`checklist_submissions`**
```json
{
  "id": "uuid",
  "jobId": "string",
  "workerId": "string",
  "items": [{ "label": "string", "done": "boolean", "note": "string | null" }],
  "beforePhotoUrl": "string | null",
  "afterPhotoUrl": "string | null",
  "checkinTime": "ISO8601",
  "checkoutTime": "ISO8601",
  "escalated": "boolean"
}
```

**`pto_requests`**
```json
{
  "id": "uuid",
  "workerId": "string",
  "dates": ["ISO8601"],
  "reason": "string | null",
  "status": "pending | approved | denied",
  "ownerNote": "string | null",
  "submittedAt": "ISO8601",
  "resolvedAt": "ISO8601 | null"
}
```

**`inbox_emails`**
```json
{
  "id": "gmailMessageId",
  "from": "string",
  "subject": "string",
  "preview": "string",
  "receivedAt": "ISO8601",
  "attachments": [{ "name": "string", "mimeType": "string", "data": "base64" }],
  "linkedJobId": "string | null",
  "aiTakeoffStatus": "none | processing | complete | error",
  "read": "boolean"
}
```

---

## 12. Deferred / Out of Scope (v1)

- Native App Store submission (PWA install covers all needs for now)
- True server-side email sending (SMTP/SendGrid) — client-side Gmail API only
- Immutable audit log storage (Firebase handles versioning)
- Multi-owner / multi-company support
- Stripe or payment gateway integration
- QuickBooks two-way sync (export only in v1)
