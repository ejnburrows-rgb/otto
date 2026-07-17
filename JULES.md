# JULES.md — OTTO Plumbing CRM · Overnight Queue

You are Jules. You OWN this repo for this run — no other agent is working here. index.html is the app (single-file PWA, no build step). Never edit legacy/.

## Hard rules
- VERIFY-FIRST GATE on every task: check the current code before working. If a task is already done, record "SKIPPED — already done" with evidence and move on. Never redo finished work.
- One task = one branch created from the LATEST origin/main = one PR. Tasks touch disjoint files so all PRs merge cleanly. If you can merge your own PR after verification, merge it; otherwise leave it open and continue.
- Commit author: ejnburrows-rgb <ejnburrows@gmail.com>. No AI names, no "Co-authored-by" trailers.
- Core CRM features must keep working offline. Free tools only ($0). Never commit API keys or secrets.
- Every PR: SCREENSHOT of the affected page in a browser after the change (use a local http server). Text alone is never proof. End with: what shipped / what remains / blockers. No day labels.

## Task queue (work in order, continuously)
1. Rebrand verification+finish — Files: index.html, landing.html only. Search for any remaining customer-facing "Dream Cooling" / "Dream Cooling CRM Pro"; replace with "OTTO Plumbing CRM" (EN and ES). If none remain, SKIP with evidence.
2. PWA integrity — Files: sw.js, manifest.json only. If the service-worker cache name is still otto-crm-v1, bump to otto-crm-v2; ensure manifest name/short_name are OTTO-branded and theme_color matches the current design. Else SKIP with evidence.
3. Webhook security — Files: api/ only. If the inbound email webhook still accepts unauthenticated POSTs (fake-email injection + prompt-injection path into Ask OTTO), add signature/secret verification read from an environment variable (document the variable name in the PR). Else SKIP with evidence.
4. User guide — File: guide.html only. Full OTTO branding, fix stale Dream Cooling references and old URLs, keep it working offline. SKIP if already clean.
5. Docs truth pass — Files: README.md, SPEC.md, docs/*.md only. Update anything still saying "otto" so docs describe the repo as it actually is. No invented status claims.
