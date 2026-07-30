# Custom domain cutover plan — OTTO Plumbing CRM

Today the app lives on the free Vercel address `otto-kohl.vercel.app`. A
delivered client product should live on the client's own domain (for example
`app.ottoplumbing.com` or `crm.ottoplumbing.com` — the exact name is the
owner's choice).

## What changes and what does not

- Only the address changes. The app, the database, and every Vercel setting
  stay exactly as they are.
- The old `otto-kohl.vercel.app` address keeps working — Vercel answers on
  both, so nothing breaks for phones that already installed the app.
- HTTPS is automatic and free (Vercel provisions the certificate).

## Steps (about 15 minutes, one of them owner-only)

1. **Owner decision (this is your call):** pick the exact subdomain and
   register/confirm the domain itself if the client does not already own one.
   A domain costs roughly $10–15/year.
2. Vercel dashboard → the project → **Settings** → **Domains** → **Add** →
   type the chosen subdomain. Vercel shows the DNS record it needs (a CNAME
   pointing at `cname.vercel-dns.com`).
3. In the domain's DNS provider (wherever the domain was bought), add that
   CNAME record. Vercel detects it and issues the certificate automatically.
4. Verify: `https://<subdomain>` loads the app, `manifest.json` and `sw.js`
   return 200, and `/api/notify` returns 405 to a plain GET (healthy).
5. Tell the crew the new address once. Phones keep the old one working, so
   nobody is locked out during the switch.

## The one step that cannot be automated

Buying the domain and adding the DNS record legally require the domain
owner's own account (and payment method). Everything else — the Vercel side
and the verification — can be done for you.

## Also recommended while you are in there

Update the GitHub repository description (it still says "Dream Cooling CRM
Pro - HVAC service management application" — a leftover from a different
project) to: `OTTO Plumbing CRM — bilingual offline-first field-service CRM
for OTTO Plumbing Inc.` GitHub → repo → **About** → ⚙. That setting is not
changeable through the API tools available to the dev team today, so it is
listed here rather than done silently.
