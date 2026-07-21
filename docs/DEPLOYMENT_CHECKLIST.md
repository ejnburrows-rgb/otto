# OTTO Plumbing CRM — Deployment Checklist

## Live URLs

| URL | Status |
|-----|--------|
| https://otto-kohl.vercel.app | **Production** — verified serving this repo's current `index.html` (title matches) |
| https://otto-plumbing-site.vercel.app | Responds, but serves a different/stale build (title: "Otto PLUMBING INC. — Miami's Elite Services") — do not send to crew |
| https://otto-crm.vercel.app | Responds, but serves an unrelated app (title: "Otto") — do not send to crew |
| https://otto-crm-git-main-ejns-projects-1b938dd2.vercel.app | Dead (404) |

## Worker install

1. Send crew the production URL above.
2. Open in Chrome (Android) or Safari (iPhone).
3. Add to Home Screen.
4. Sign in with assigned PIN.

## Demo PINs (testing)

Each crew member is assigned their own unique PIN inside the app under the Team screen. PINs are never written down or stored in this repository. Note that the previously published demo codes remain in the project's git history, so deleting them from this current file does not erase them from the past. For security, the owner must change those specific codes within the app itself so that they can no longer be used.

## Vercel environment variables

| Variable | Required for |
|----------|----------------|
| `NVIDIA_API_KEY` | Blueprint / PDF estimator |
| `ANTHROPIC_API_KEY` | Ask OTTO, OCR, photo→customer |
| `FIREBASE_PROJECT_ID` + `FIREBASE_API_KEY` | Cloud sync + inbound email webhook |
| `INBOUND_WEBHOOK_TOKEN` | Auth token required by `/api/inbound-email` |
| `QB_CLIENT_ID` + `QB_CLIENT_SECRET` | QuickBooks connect (when ready) |
| `TWILIO_SID` + `TWILIO_AUTH` + `TWILIO_FROM` | Customer SMS |
| `SENDGRID_API_KEY` | Customer email |

## Pre-crew security (when going live with real data)

- [ ] Replace demo PINs with unique PINs per person
- [ ] Rotate Firebase API key if exposed
- [ ] Enable Firestore security rules
- [ ] Make repo private
- [ ] Enable branch protection on `main`