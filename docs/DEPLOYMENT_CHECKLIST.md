# OTTO Plumbing CRM — Deployment Checklist

## Live URLs

| URL | Status |
|-----|--------|
| https://otto-kohl.vercel.app | **Production** — OTTO Plumbing CRM (this repo) |

`otto-plumbing-site.vercel.app` and `otto-crm.vercel.app` are **not** this
app — verified live: the former is the separate marketing-site repo
([otto-plumbing-site](https://github.com/ejnburrows-rgb/otto-plumbing-site)),
the latter resolves to an unrelated Next.js deployment that happens to hold
that subdomain. Don't send crew to either.

## Worker install

1. Send crew the production URL above.
2. Open in Chrome (Android) or Safari (iPhone).
3. Add to Home Screen.
4. Sign in with assigned PIN.

## Demo PINs (testing)

| Role | PIN |
|------|-----|
| Owner | 0721 |
| Field | 0715 |

## Vercel environment variables

| Variable | Required for |
|----------|----------------|
| `NVIDIA_API_KEY` | Blueprint / PDF estimator |
| `ANTHROPIC_API_KEY` | Ask OTTO, OCR, photo→customer |
| `FIREBASE_PROJECT_ID` + `FIREBASE_API_KEY` | Cloud sync + inbound email webhook + marketing-site lead capture (`/api/website-lead`) |
| `QB_CLIENT_ID` + `QB_CLIENT_SECRET` | QuickBooks connect (when ready) |
| `TWILIO_SID` + `TWILIO_AUTH` + `TWILIO_FROM` | Customer SMS |
| `SENDGRID_API_KEY` | Customer email |

## Pre-crew security (when going live with real data)

- [ ] Replace demo PINs with unique PINs per person
- [ ] Rotate Firebase API key if exposed
- [ ] Enable Firestore security rules
- [ ] Make repo private
- [ ] Enable branch protection on `main`