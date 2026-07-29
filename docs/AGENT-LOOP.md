# AGENT-LOOP.md — OTTO Plumbing CRM · Autonomous Finish Loop

**Owner:** EJN · **Repo:** https://github.com/ejnburrows-rgb/otto · **Branch of truth:** `main`
**Stack:** single-file PWA (`index.html` ~333KB) + `landing.html` + `guide.html` + `api/**` · IndexedDB/localStorage + optional Supabase cloud sync · Vercel
**Verify bar:** `npm test && npm run qa` (plus a real browser screenshot)

Self-driving loop: read top to bottom, do the next unchecked task, prove it with tests **and a screenshot**,
open/merge a PR, flip the checkbox, append a status-log line, pick the next unblocked task. Repeat.

---

## WHO RUNS THIS (read first)
- **Push-capable worker:** full loop — branch, commit, push, PR, merge when green, continue.
- **Jules / any agent without push access:** do the same work but output **draft files under
  `drafts/jules/<task>/` + a written report** (diff, test output, screenshots). Never push, never PR.
  **Prerequisite:** owner must grant the Jules GitHub app **write/push** access to this repo.

## OWNER-ONLY PREREQUISITES (accounts/secrets — agents cannot do these)
Add these to Vercel env (and a local `.env` for testing) so the backend/AI/email/accounting tasks verify:
- **Supabase:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (database via `api/data.js` and photo
  storage via `api/photos.js`). The service-role key is read server-side only and must never appear
  in `index.html` or any other browser-served file.
- **AI:** `ANTHROPIC_API_KEY`, `NVIDIA_API_KEY`, optional `NVIDIA_MODEL`
- **Inbound email:** `INBOUND_WEBHOOK_TOKEN` (SendGrid/Mailgun/Postmark webhook + `.eml` import)
- **QuickBooks:** the QuickBooks integration keys per `api/quickbooks.js`
README.md is the source of truth for current behavior; `SPEC.md` is the older design spec.

## HARD RULES
- Branch + PR per change. Never commit to `main`. Never force-push. Squash-merge only when
  `npm test && npm run qa` is green. Never merge red.
- Commits authored `EJN <ejnburrows@gmail.com>` via `git commit --author=`. No AI/agent names, no
  "Co-authored-by".
- **SCREENSHOT PROOF MANDATORY** — real browser shot of the affected screen after the change. Serve with
  `node scripts/local-server.js` (→ http://localhost:8000) and capture `index.html` / `landing.html`.
- **Bilingual parity:** every user-facing string must exist in **both EN and ES**. Any new/changed copy
  ships in both languages or the task is not done.
- After each merged PR: append a dated line to the status log below, flip the checkbox, pick the next task.

## THE LOOP (per task)
```
1. git fetch origin && git reset --hard origin/main
2. create branch (per task)
3. make the fix (single-file app: edit index.html / landing.html carefully; keep the app one file)
4. npm test && npm run qa   (green)
5. serve locally, screenshot the affected screen in the browser
6. PR with before/after screenshot + "what shipped / what remains / blockers"
7. squash-merge when green   (no-push agents: draft + report only)
8. log it, flip the checkbox, next task
```

---

## TASK QUEUE (confirmed from a live click-through 2026-07-21; work top-down)

### BUGS (visible to a paying customer — do first)
- [ ] **T1 · Inbox button renders as raw HTML.** The Inbox tab prints the literal string
      `<button class="btn" onclick="fetchNewEmails()">…Refresh Inbox</button>` instead of a real button.
      Find the inbox render function in `index.html` and fix the escaping (it is being set via
      `textContent`/template text instead of inserted as markup, or an inner template is double-escaped).
      Make "Refresh Inbox" a working button. Branch `fix/inbox-refresh-button`. Screenshot the fixed tab.
- [ ] **T2 · KPIs all read 0 + mock data.** In `index.html` (~lines 4404-4407) the Team KPIs derive from
      empty `job_events`, `jobs` (assigned/completed), and `ai_escalations`, and the aggregate view uses
      `Math.random()` mock values. Replace the mock with real derivation from job history, and seed a
      little demo activity so Hours/Jobs Done/Escalations/Locations show real non-zero numbers in demo.
      Branch `fix/kpis-real-data`. Screenshot KPIs with real numbers.
- [ ] **T3 · Unnamed field team + count mismatch.** The 15 FIELD workers show `?` with no names, and the
      Home dashboard says "Team 15" while the Team screen says "19". Give the seed field workers real
      names and make both counts read from one source of truth. Branch `fix/team-roster-counts`.
      Screenshot the Team screen + dashboard tile agreeing.
- [ ] **T4 · Nav label casing.** The "More" menu mixes `Team`/`Reports` with lowercase `urgent`/`kpis`.
      Normalize all nav labels to Title Case in **both** EN and ES. Branch `fix/nav-casing`. Screenshot.

### LANDING PAGE
- [ ] **T5 · Real booking/contact form.** `landing.html` "Book a Plumber" only links to `tel:`. Add a
      working booking/contact form that captures name/phone/problem and submits somewhere real (email
      webhook / Formspree-style endpoint) with a success state. Branch `feat/landing-booking`.
      Screenshot a successful submission.
- [ ] **T6 · Replace placeholder content.** Swap the dummy phone **(305) 555-1234** everywhere for the
      real number, replace filler service copy with real services, and fix the low-contrast (too faint)
      service-card description text. Branch `chore/landing-content`. Screenshot the readable page.

### QUALITY & BACKEND (backend items need the owner prereqs)
- [ ] **T7 · Bilingual parity audit.** Sweep `index.html` + `landing.html` for any EN-only or ES-only
      strings; make every user-facing string switch correctly with the EN/ES toggle. Branch
      `chore/i18n-parity`. Screenshot the same screens in EN and ES.
- [ ] **T8 · Supabase cloud sync live** (needs prereq) — verify local state syncs to the Supabase
      database and photo storage and back across devices. Branch `feat/supabase-sync-live`.
      Screenshot state surviving a second device.
- [ ] **T9 · AI + email + QuickBooks live** (needs prereqs) — verify `api/claude.js`, `api/nvidia.js`,
      `api/inbound-email.js`, `api/quickbooks.js` against real keys; make "Ask OTTO", inbox import, and
      invoicing actually work. Branch `feat/integrations-live`. Screenshot each working.

---

## STATUS LOG (append one dated line per merged PR; newest at top)
- 2026-07-21 — AGENT-LOOP.md created; queue initialized from live audit. No tasks merged yet.
