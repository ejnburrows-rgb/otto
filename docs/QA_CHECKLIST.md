# OTTO Plumbing — QA Checklist (plain language)

**Last full test:** see `QA_BROWSER.md` and `QA_REPORT.md`

## Tested and working (browser robot checked)

- [x] Website opens
- [x] Dark screen on first open
- [x] Pick your name and enter PIN
- [x] Owner login
- [x] Field worker login
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
- [ ] Ask OTTO and photo OCR (built; needs `NVIDIA_API_KEY` set in hosting)

## Re-run tests anytime

```
cd otto
QA_OWNER_PIN=<owner code> QA_FIELD_PIN=<field code> node scripts/qa-browser.mjs
node scripts/qa-check.mjs
```

The browser test needs two real sign-in codes to get past the login screen. Type
them on the command line as shown. **Never write them into a file in this
project** — that is how they leaked before.