# On-site handoff — running the demo and connecting the extras

Written for the owner, not for a programmer. Every technical word is explained
the first time it appears. Nothing in here needs a laptop unless it says so.

Verified against the live site on 2026-07-31. If something below does not match
what you see on the day, trust the app and tell the developer — do not improvise
around it.

---

## 1. The five-minute pre-flight, before you leave the house

Do these on your own phone, on your own internet, before you go.

1. Open **https://otto-kohl.vercel.app/?demo=1**
2. It asks you to pick a 4-digit code for the first owner. Type any code you
   will remember — `1234` is fine, this is a demo device, not the real
   business.
3. Tap **Otto**, type the same code.
4. You should land on a dashboard reading **Jobs today 3 · Customers 3 ·
   Field Crew 15**.
5. Tap **More → Reports**, then come back. Nothing should be blank or red.

If all five steps work, the demo is ready. If step 1 does not load, you have no
internet — the demo needs internet the *first* time only.

**Do this on the phone you will actually hand to the client.** The demo lives
in that one browser, on that one phone.

---

## 2. What the demo is, in one paragraph

`?demo=1` on the end of the address switches the app into demo mode. It fills
the app with fictional customers, jobs, estimates, invoices and payments, and
stamps every one of those records as demo data. Those stamped records are
blocked from ever being uploaded to the company database — that block is
covered by automated tests. So the demo cannot touch, change, or reveal real
customer information, because there is no real customer information on that
device in the first place.

The demo data is realistic but invented: Garcia Residence, Patel Family, Rivera
Plumbing Co, with `555` phone numbers that cannot dial a real person.

---

## 3. The demo itself — the path to walk

Roughly 6 minutes. Do not rush the first two steps; they set up everything else.

### Step 1 — Open the app
- **CLICK:** the bookmark to `https://otto-kohl.vercel.app/?demo=1`
- **SHOW:** the sign-in screen with real staff names and roles
- **SAY:** "Everyone in the company gets their own sign-in. Owners see
  everything, field crew only see their own jobs."
- **AVOID:** the **Team** screen — it is where staff codes are set.

### Step 2 — Sign in and show the dashboard
- **CLICK:** Otto → your 4-digit code
- **SHOW:** Jobs today, Customers, Field Crew, and the Exceptions panel
- **SAY:** "This is the morning view. Three jobs booked today, and the panel
  underneath flags anything going wrong — a crew member off-site, a missing
  photo, a job left open."
- **AVOID:** the **Ask OTTO** tile (see section 4).

### Step 3 — Open a customer
- **CLICK:** More → Customers → **Garcia Residence**
- **SHOW:** the customer's details and their job history
- **SAY:** "Every customer keeps their own history — every call, every job,
  every invoice, in one place instead of in a notebook."

### Step 4 — Open the job behind it
- **CLICK:** the **Kitchen faucet leak** job
- **SHOW:** the assigned worker, the schedule, the checklist and photo slots
- **SAY:** "The crew opens this on their phone at the house. They check in,
  take before-and-after photos, tick the checklist, and check out. The office
  sees it happen without phoning anyone."

### Step 5 — Show the money side
- **CLICK:** More → (scroll) → **Invoices**
- **SHOW:** INV-1001 Garcia **PAID $285**, INV-1002 Patel **PARTIAL $2,450**,
  Outstanding **$1,950.00**
- **SAY:** "Every job turns into an invoice, and the app keeps a running total
  of what is still owed. That number is the one most small companies lose track
  of."
- **CLICK:** INV-1001 → **Print**
- **SHOW:** the clean black-and-white invoice
- **SAY:** "That prints, or saves as a PDF to email the customer."

### Step 6 — Show the quote pipeline
- **CLICK:** back → **Estimates**
- **SHOW:** "Sewer line repair — 20ft section", Rivera, **$4,800 SENT**
- **SAY:** "Quotes live here until the customer says yes, then they convert
  into an invoice with one tap. Nothing gets forgotten."

### Step 7 — Show it works in Spanish
- **CLICK:** the **ES** button, top right
- **SHOW:** the whole app in Spanish
- **SAY:** "Every screen works in English and Spanish, so the crew uses it in
  the language they actually think in."
- **CLICK:** **EN** to switch back.

### Step 8 — Close
- **SAY:** "That is the working core: calls come in, become jobs, jobs become
  invoices, and nothing falls through the gaps. Accounting and automatic
  quoting from drawings are the next two pieces we connect."

---

## 4. What to avoid during the demo — and why

Be direct with yourself about these. Clicking them makes the product look
broken, and there is no need to go near them.

| Do not click | What happens | Why |
|---|---|---|
| **Ask OTTO** / the robot button | Shows an "unavailable" message | The AI is switched off at the server until proper sign-in is built |
| **Read & estimate** on a drawing | Same "unavailable" message | Same reason — it needs the AI |
| **Backups → Cloud** | Shows not-connected | Cloud sync is switched off for the same reason |
| **Team** | Shows staff and their sign-in codes | Internal; not for a client's eyes |
| **Settings** | Technical fields and API key boxes | Internal |
| **Inbox** | Empty — email is not connected yet | Nothing to show |
| **KPIs → Charts** | Says "Charts appear here once connected" | Honest placeholder, but it looks unfinished |

If the client asks about any of them, the honest answer is good enough:
*"That part is built and waiting on one security piece before we switch it on."*
That is true.

---

## 5. Turning the demo off, so the phone can do real work

**Open `https://otto-kohl.vercel.app/?demo=0`** — note the **0**.

That does two things: it turns demo mode off, and it deletes every demo record
from that phone. Only records stamped as demo are deleted, so if that device
ever holds real work, the real work is untouched. You will be left with an
empty app that says "Nothing here yet." — which is correct for a device that
has not been given any real work.

To go back into the demo later, open `?demo=1` again and it refills.

**Recommendation:** keep the demo on one phone or one browser you use only for
showing the product, and never sign into the real business on it. That way this
question never comes up under pressure.

---

## 6. Is the app ready to go live? — the honest answer

**For one person on one device: yes.** Customers, jobs, calls, estimates,
invoices, payments, checks, follow-ups, printing, photos, GPS check-in/out,
payroll, reports, English/Spanish, and offline working are all built and
tested. 275 automated checks pass. The live site matches the code exactly.

**For your 19 crew sharing one set of records: not yet.** One thing blocks it.

The app's sign-in currently happens inside the phone's browser. That is fine for
keeping honest people in their own lane, but it is not something a server can
trust. Because of that, six server features were deliberately switched off in
July after a security review found they would take orders from anyone who knew
the web address:

- cloud sync (sharing records between phones)
- photo sync between phones
- the AI features
- customer text/email notifications
- the QuickBooks connection

They are all written and tested. They are switched off at a single gate
(`api/_lib/serverAuth.js`) until real server-side sign-in exists. Turning that
gate on without building the sign-in would re-open the hole — do not let anyone
talk you into it as a shortcut.

**So the order of work is:** server-side sign-in first, then everything below
switches on. Section 7 onwards assumes that is done.

---

## 7. QuickBooks — what it takes

**ALREADY WORKING:** you can export invoices, payments and customers to a
QuickBooks-format CSV file (a spreadsheet file QuickBooks can import) today,
from the **QuickBooks** button on the Invoices and Payments screens. No account
or setup needed. That works right now, in the live app.

**FUTURE INTEGRATION:** an automatic two-way connection. The connection code is
written but is a stub — it currently replies "wire Intuit API when credentials
are live" and does nothing.

What you need, in order:

1. **A QuickBooks Online subscription.** Simple Start is around $35/month at
   list price, Essentials around $65 — check current pricing, Intuit discounts
   heavily for the first months. The desktop version will not work.
2. **A free Intuit Developer account** at `developer.intuit.com`, signed up with
   the same email as the QuickBooks subscription.
3. **Create an app** in that developer account. Intuit gives you two values, a
   Client ID and a Client Secret. Treat the secret like a bank card PIN.
4. **Give those to the developer** to put into Vercel (the hosting service) as
   `QB_CLIENT_ID` and `QB_CLIENT_SECRET`. Never put them in a text message or
   email — hand them over in person or by phone.
5. **Authorise the connection** from inside Otto. You will be sent to Intuit,
   asked to approve, and sent back.
6. **Test on Intuit's sandbox first** — a free pretend company Intuit provides,
   so a mistake cannot damage real books.

**What it would exchange:** customers, invoices, and payments out of Otto into
QuickBooks. Payment status back the other way.

**Ongoing cost:** the QuickBooks subscription only. Intuit does not charge for
API access.

---

## 8. Email — what it takes

**ALREADY WORKING:** nothing. The Inbox screen exists and the receiving code is
written and secured, but no email account is connected, so the Inbox is empty.

**FUTURE INTEGRATION**, two separate pieces people often confuse:

**Sending** (invoices and reminders out to customers) needs a SendGrid account.
Free tier covers 100 emails/day; paid starts around $20/month. You give the
developer a `SENDGRID_API_KEY` and the "from" address you want customers to
see. Sending texts instead needs Twilio — roughly $1.15/month for a number plus
about 1¢ per text.

**Receiving** (customer emails landing in Otto's Inbox) needs an email service
that can forward incoming mail to a web address — SendGrid Inbound Parse or
Mailgun Routes both do it. This also needs a change to your domain's DNS
settings, which is the fiddly part and is a job for the developer, not for you
at a kitchen table.

**Do the sending half first.** It is far simpler, and it covers the thing that
actually makes money: getting invoices to customers quickly.

---

## 9. AI — what it takes

**ALREADY WORKING:** nothing you can demonstrate today. The AI is switched off
at the server (section 6).

**ALREADY BUILT, waiting on that gate:** "Ask OTTO" (ask questions about your
own jobs and customers), reading photographed checks and receipts, drafting job
summaries, and reading drawings (section 10).

**The two providers, and which one you need.** The app is wired for both:

- **NVIDIA** (`NVIDIA_API_KEY`) — this is the one that reads your PDF drawings
  and drafts the estimate. If PDF takeoff is what you care about, this is the
  account to open. Sign up at `build.nvidia.com`, which gives free starter
  credits, and generate a key beginning `nvapi-`.
- **Anthropic** (`ANTHROPIC_API_KEY`) — powers "Ask OTTO", reading photographed
  checks and receipts, and job summaries. Separate account, separate key.

You do not need both to start. **NVIDIA alone covers the PDF workflow.**

**Where the key goes:** to the developer, to be set in Vercel under
Settings → Environment Variables. Never in a text message, never in the code,
never in a file that gets committed. Then the project must be redeployed for the
new value to take effect.

**Important, so you are not surprised:** setting the key is necessary but **not
sufficient**. `/api/nvidia` currently refuses every request at the gate
described in section 6, before it ever looks at the key. Until that gate opens,
a correctly installed key changes nothing. Do not buy credits expecting the
feature to switch on.

**Cost control, and take this seriously:** AI is billed per use, and a loop or a
mistake can spend real money quickly. Before switching it on:
- Set a hard monthly spend cap in the provider's billing settings. Not a
  reminder — a cap that stops working when hit.
- Start at a low figure, $20/month, and raise it only when you see what normal
  use costs.
- Check the bill weekly for the first month.

At normal small-company volume, expect single-digit to low-tens of dollars a
month. The risk is not the normal case, it is the runaway case — hence the cap.

---

## 10. Reading PDF drawings — what it takes

**You work from PDFs, not AutoCAD files.** That is the good news: PDF is the
best-supported format in the app, and nothing here needs AutoCAD, a DWG
converter, or any extra software. Ignore any earlier note about DWG and DXF —
it does not apply to you.

**ALREADY WORKING (no AI, no account needed):** you can upload a PDF to a job
and store it, and it stays with that job. The app also has a priced rate card
built in — fixtures at $1,500 each, copper Type L at $2,000 per run, CPVC at
$1,300, and so on — which you can edit to your real prices. Editing that rate
card is worth doing whether or not the AI ever gets switched on, because it is
what every estimate is priced against.

**ALREADY BUILT, waiting on the AI gate:** the "Read & estimate" button. It
pulls the text out of the PDF, sends it to the AI, and gets back a draft
materials list priced against your rate card. The PDF reading half is real and
works today; the AI half is switched off (section 6).

**How well PDFs read:** the app extracts the *text layer* of the PDF — the
labels, the notes, the title block, the dimensions. This works well for PDFs
exported from drawing software, which is what you will normally be sent.

The one case that reads poorly is a **scanned or photographed** PDF — a paper
drawing put through a scanner. Those have no text layer, just a picture, so
there is nothing to pull out. If you get one of those, the fix is to ask for the
original PDF rather than a scan of a printout.

**The limitation to be honest about with the client:** the app reads *text and
labels*, it does not measure geometry or count symbols visually. It will read
"4 × WC" and price four toilets. It will not look at an unlabelled floor plan
and work out pipe runs. What comes back is a **draft for you to check**, not a
final number — and that is the right way to describe it to a client anyway.

---

## 11. Money going out right now

| Service | Why it is running | Do you need it | Cost |
|---|---|---|---|
| Vercel (hosting) | Serves the live app | **Yes** | Free tier |
| Supabase `otto-live` | The company database | **Yes** | Free tier |
| Supabase `Cartilla de Gretel` | A different, unrelated project | Not for Otto | Free tier — check whether it is yours |
| GitHub (private repo) | Stores the code | **Yes** | Free tier |
| GitHub Actions | **Not actually running** — see STATUS §3.9 | Needs fixing | $0 (nothing runs) |
| Anthropic / NVIDIA | Keys may exist but routes are off | Not yet | **$0 today** — nothing can call them |
| Twilio / SendGrid | Not connected | Not yet | $0 |
| Windows "heartbeat" task | Retired in July | **No** | $0, but delete the scheduled task on the PC if it still exists |

**Nothing is quietly burning money.** The AI routes being switched off means
they cannot spend, which is the one genuine cost risk in this product. The only
tidy-ups worth doing: delete the old Windows scheduled task, and check whether
the `Cartilla de Gretel` Supabase project is yours to remove.

72 old branches sit on GitHub from previous work. They cost nothing. Two of
them hold files that exist nowhere else, so do not bulk-delete them.

---

## 12. Recommended order

1. **Server-side sign-in.** Nothing else switches on until this exists, and it
   is also what makes the app safe for 19 people. Everything below is blocked
   behind it, so there is no way to reorder around it.
2. **NVIDIA key + PDF takeoff.** Your stated priority, and the moment the gate
   above opens it is a single environment variable away. Set the spend cap
   first.
3. **QuickBooks.** The CSV export already works, so the client sees progress on
   day one without any account at all.

Email sending can be slotted in beside any of them — it is independent and
cheap.

**One more, separate from the integrations:** get GitHub Actions running again
(STATUS §3.9). It is not a feature, but right now no test runs automatically
anywhere, which is how a bad change reaches the live site unnoticed.
