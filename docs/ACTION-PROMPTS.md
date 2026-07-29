# ACTION-PROMPTS.md — OTTO Plumbing CRM · Copy-paste prompts for coding agents

Ready-to-paste prompts in priority order. Each block is one task. Assumes: **branch + PR per change,
verify bar `npm test && npm run qa`, commits authored `EJN <ejnburrows@gmail.com>` (no AI trailers),
bilingual EN/ES parity, and a real browser screenshot in the PR** (serve with
`node scripts/local-server.js` → http://localhost:8000).

> Self-driving version: point the agent at **`docs/AGENT-LOOP.md`** and say "run the loop."

---

## P0 — OWNER MANUAL STEPS (you, not an agent)
Add to Vercel env + local `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`,
`NVIDIA_API_KEY` (optional `NVIDIA_MODEL`), `INBOUND_WEBHOOK_TOKEN`, and QuickBooks keys. If you want Jules
in the background, grant its GitHub app push access (until then it can only draft + report).

## 1 — Fix the Inbox "Refresh" button (renders as raw HTML)
```
In index.html, the Inbox tab prints the literal text `<button class="btn" onclick="fetchNewEmails()">…
Refresh Inbox</button>` instead of a real button. Find the inbox render function and fix the escaping
(HTML is being set as text/double-escaped instead of inserted as markup). Make Refresh Inbox a working
button that calls fetchNewEmails(). Branch fix/inbox-refresh-button. Screenshot the fixed Inbox tab.
```

## 2 — Make KPIs show real data (currently 0 + Math.random mock)
```
In index.html around lines 4404-4407, Team KPIs derive from empty job_events, jobs (assigned/completed),
and ai_escalations, and the aggregate view uses Math.random() mock data. Replace the mock with real
derivation from job history and seed a little demo activity so Hours Worked / Jobs Done / Escalations /
Locations Visited show real non-zero numbers in demo mode. Branch fix/kpis-real-data. Screenshot real KPIs.
```

## 3 — Name the field team + fix the count mismatch
```
The 15 FIELD workers show "?" with no names; the Home dashboard tile says Team 15 but the Team screen says
19. Give the seed field workers real names and make both counts read from one source of truth. Branch
fix/team-roster-counts. Screenshot the Team screen and dashboard tile agreeing.
```

## 4 — Normalize nav label casing
```
The "More" menu mixes Team/Reports with lowercase urgent/kpis. Title-case all nav labels in BOTH EN and
ES. Branch fix/nav-casing. Screenshot the menu.
```

## 5 — Landing: real booking/contact form
```
landing.html "Book a Plumber" only links to tel:. Add a working booking/contact form (name, phone,
problem) that submits to a real endpoint (email webhook / form service) with a success state,
in both EN and ES. Branch feat/landing-booking. Screenshot a successful submission.
```

## 6 — Landing: replace placeholder content + fix contrast
```
Replace the dummy phone (305) 555-1234 everywhere with the real number, replace filler service copy with
real services, and darken the too-faint service-card description text for readability. Branch
chore/landing-content. Screenshot the readable page.
```

## 7 — Bilingual parity audit
```
Sweep index.html and landing.html for EN-only or ES-only strings; ensure every user-facing string flips
correctly with the EN/ES toggle. Branch chore/i18n-parity. Screenshot the same screens in EN and ES.
```

## 8 — Backend go-live (needs P0 secrets)
```
Verify Supabase cloud sync (api/data.js) and photo storage (api/photos.js) work across devices, then
verify the AI (api/claude.js,
api/nvidia.js), inbound email (api/inbound-email.js) and QuickBooks (api/quickbooks.js) integrations
against real keys so Ask OTTO, inbox import, and invoicing actually work. One branch per integration
(feat/supabase-sync-live, feat/integrations-live). Screenshot each working end-to-end.
```

---

### Priority order
Bugs 1→2→3→4 first (customer-visible), then landing 5→6, then 7. Backend 8 after P0 secrets are set.
