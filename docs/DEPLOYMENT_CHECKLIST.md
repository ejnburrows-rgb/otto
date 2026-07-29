# OTTO Plumbing CRM — Deployment Checklist

## Live URLs

| URL | Status |
|-----|--------|
| https://otto-kohl.vercel.app | **Production CRM** — verified serving this repo's current `index.html` (title matches). This is the URL the crew installs. |
| https://otto-plumbing-site.vercel.app | **The client's public marketing website** — a separate repo (`otto-plumbing-site`), not a stale copy of the CRM. It is correct and live; do not send it to the crew as the CRM. |
| https://otto-kohl.vercel.app/landing.html | A marketing page bundled inside this repo that duplicates the real marketing site. Not the CRM. Under review for removal. |
| https://otto-crm.vercel.app | Responds, but serves an unrelated app (title: "Otto") — do not send to crew |
| https://otto-crm-git-main-ejns-projects-1b938dd2.vercel.app | Dead (404) |

## Worker install

1. Send crew the production CRM URL above.
2. Open in Chrome (Android) or Safari (iPhone).
3. Add to Home Screen.
4. Sign in with assigned PIN.

## Sign-in codes (PINs)

Each crew member is assigned their own unique PIN inside the app under the Team screen. PINs are never written down or stored in this repository. Note that the previously published demo codes remain in the project's git history, so deleting them from this current file does not erase them from the past. For security, the owner must change those specific codes within the app itself so that they can no longer be used.

## Vercel environment variables

> **Do not add any `FIREBASE_*` settings.** The Firebase database was deleted on
> 2026-07-21 after a data exposure and replaced by Supabase. Re-adding those
> settings would point the app at a dead, previously-leaked service. See
> `docs/STATUS.md` §3.1.

| Variable | Required for | Set? |
|----------|----------------|------|
| `SUPABASE_URL` | Cloud sync (`/api/data`) — the database address | **Not yet set — blocks cloud sync** |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloud sync (`/api/data`) — the server-side secret key | **Not yet set — blocks cloud sync** |
| `INBOUND_WEBHOOK_TOKEN` | Auth token required by `/api/inbound-email` | Set |
| `NVIDIA_API_KEY` | Blueprint / PDF estimator | Set |
| `ANTHROPIC_API_KEY` | Ask OTTO, OCR, photo→customer | Set |
| `QB_CLIENT_ID` + `QB_CLIENT_SECRET` | QuickBooks connect (when ready) | Not connected |
| `TWILIO_SID` + `TWILIO_AUTH` + `TWILIO_FROM` | Customer SMS | Not connected |
| `SENDGRID_API_KEY` | Customer email | Not connected |

`SUPABASE_SERVICE_ROLE_KEY` is a secret. It belongs only in Vercel and in a local
`.env` file — never in the code, a GitHub issue, or a chat message.

Until the two Supabase settings are added and the project is redeployed,
`/api/data` returns 503 and the app runs from each device on its own. Nothing is
broken; devices simply do not share data yet.

## Pre-crew security (when going live with real data)

- [ ] Replace the previously published PINs with unique PINs per person (Team screen)
- [x] Close the exposed database — done 2026-07-21, Firebase project deleted
- [x] Lock the database against public access — done, anonymous requests return 401
- [x] Make repo private
- [ ] Enable branch protection on `main` (needs a paid GitHub plan on a private repo)
