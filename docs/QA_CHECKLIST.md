# OTTO Plumbing — QA Checklist (plain language)

**Last full test:** see `QA_BROWSER.md` and `QA_REPORT.md`

## Tested and working (browser robot checked)

- [x] Website opens
- [x] Dark screen on first open
- [x] Pick your name and enter PIN
- [x] Owner login (PIN 0721)
- [x] Field worker login (PIN 0715)
- [x] Owner home screen
- [x] Customers list
- [x] Photo → new customer button present
- [x] Urgent issues screen (owner)
- [x] Owner hub
- [x] Backups screen
- [x] English / Spanish switch
- [x] Download backup file
- [x] No crash errors in browser

## Live internet checks

`scripts/qa-check.mjs` currently points at `otto-plumbing-site.vercel.app`,
which is a stale/different deployment, not the real production URL
(`otto-kohl.vercel.app` — see `docs/DEPLOYMENT_CHECKLIST.md`). Until the
script's URL is corrected, its live-site results below are not meaningful;
verify manually against the real production URL instead.

- [ ] Production site online (last run checked the wrong URL — see note above)
- [ ] User guide online (same)
- [ ] Phone install file (manifest) online (same)
- [ ] Offline helper (service worker) online (same)
- [ ] QuickBooks helper responds (same)
- [ ] Text/email helper responds (same)

## Bugs fixed during this QA

- [x] Blueprint save now opens the correct job page
- [x] New buttons wired properly for the app
- [x] Blueprint AI tries server key first (not only manual key)

## Still needs your business accounts (not a bug)

- [ ] QuickBooks two-way live sync (export CSV works today)
- [ ] Customer texts actually send (built, needs Twilio)
- [ ] Customer emails actually send (built, needs SendGrid)
- [ ] Smart assistant OCR without Anthropic key on server (needs key in hosting)

## Re-run tests anytime

```
cd otto
node scripts/qa-browser.mjs
node scripts/qa-check.mjs
```