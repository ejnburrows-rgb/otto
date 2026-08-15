/* Field worker workspace — the real app, in a real browser.
 *
 *   npm start          (in another terminal)
 *   node scripts/qa-field-browser.mjs
 *
 * Static checks prove wiring. This proves the thing a person actually gets: the
 * redesigned workspace renders, the legacy blue presentation is gone, Ask OTTO
 * cannot be reached, and check in → note → photo → see the photo → check out
 * writes real records that survive a reload and a re-sign-in.
 *
 * Sign-in uses the app's own device path — a profile marker plus a stored code,
 * which is what boot() already falls back to when there is no cloud session.
 * Nothing here bypasses authentication or invents a way in; the cloud identity
 * path needs a live Supabase project and is verified separately.
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.QA_URL || 'http://localhost:8000';
const SHOTS = process.env.QA_FIELD_DIR || path.join(process.cwd(), 'outputs', 'field');
const PHONE = { width: 390, height: 844 };

fs.mkdirSync(SHOTS, { recursive: true });

let passed = 0, failed = 0;
const check = (name, ok, detail = '') => {
  if (ok) { passed++; console.log(`  ok   ${name}${detail ? ' — ' + detail : ''}`); }
  else { failed++; console.log(`  FAIL ${name}${detail ? ' — ' + detail : ''}`); }
};

const shot = async (page, name) => {
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
};

/* A 1x1 JPEG, written to a temp file so the photo goes through the app's real
   file input, downscale and storeFile path rather than a shortcut. */
const QA_IMAGE = path.join(SHOTS, 'qa-upload.jpg');
fs.writeFileSync(QA_IMAGE, Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64'));

const errors = [];

/* The sandbox may ship a Chromium that does not match the pinned Playwright
   revision. QA_CHROMIUM points at the one that is actually installed rather
   than downloading a second copy. */
const executablePath = process.env.QA_CHROMIUM || undefined;

const run = async () => {
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const context = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(String(e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  console.log('\nloading the app');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__db === 'function', { timeout: 20000 });
  await page.waitForTimeout(1200);

  // ── seed one QA worker with one assigned QA job ────────────────────────────
  console.log('\nseeding a QA field worker and one assigned job');
  const seeded = await page.evaluate(async () => {
    const db = window.__db();
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const WORKER = 'qa-field-worker';
    const CUSTOMER = 'qa-field-customer';
    const JOB = 'qa-field-job';

    const put = (col, record) => {
      db[col] = (db[col] || []).filter(r => r.id !== record.id);
      db[col].unshift(record);
    };

    put('users', {
      id: WORKER, name: 'QA Trabajador', role: 'field', email: 'qa.worker@example.invalid',
      phone: '555-0100', lang: 'en', active: true, pin: '4242', created: now, updated: now
    });
    put('customers', { id: CUSTOMER, name: 'QA Customer', address: '900 QA Street, Miami FL', phone: '555-0199', created: now, updated: now });
    put('jobs', {
      id: JOB, title: 'QA JOB — FIELD WORKSPACE', customerId: CUSTOMER, assignedTo: WORKER,
      status: 'scheduled', address: '900 QA Street, Miami FL', scheduledDate: today, scheduledTime: '09:00',
      description: 'Replace the shut-off valve under the kitchen sink.', created: now, updated: now
    });
    // Onboarding is preserved, not bypassed: these are the records the policy
    // gate and the location prompt write once the worker has completed them.
    put('consent_records', {
      id: 'qa-policy-ack', userId: WORKER, type: 'employee_code_of_conduct', version: 2,
      status: 'acknowledged', accepted: true, created: now, updated: now
    });
    put('consent_records', {
      id: 'qa-location-decision', userId: WORKER, type: 'location_consent',
      accepted: false, locationPermission: 'denied', created: now, updated: now
    });

    localStorage.setItem('otto_session', WORKER);
    localStorage.setItem('otto_theme', 'light');
    localStorage.setItem('otto_lang', 'en');
    window.__save();
    return { WORKER, JOB };
  });
  await page.waitForTimeout(900);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);

  // ── 1. role routing and the workspace itself ───────────────────────────────
  console.log('\nthe worker gets the redesigned field workspace');
  const shell = await page.evaluate(() => ({
    role: (window.__db().users.find(u => u.id === 'qa-field-worker') || {}).role,
    fieldClass: document.body.classList.contains('otto-field'),
    shellClass: document.body.classList.contains('otto-shell'),
    header: !!document.getElementById('otto-field-header'),
    dock: !!document.getElementById('otto-field-dock'),
    legacyTopbar: document.querySelector('.topbar') ? getComputedStyle(document.querySelector('.topbar')).display : 'absent',
    legacyNav: document.querySelector('.bottomnav') ? getComputedStyle(document.querySelector('.bottomnav')).display : 'absent',
    fab: document.querySelector('#fab') ? getComputedStyle(document.querySelector('#fab')).display : 'absent',
    ownerSidebar: !!document.getElementById('otto-sidebar')
  }));
  check('the signed-in account is role=field', shell.role === 'field');
  check('the field workspace is active', shell.fieldClass);
  check('the owner shell is not also active', !shell.shellClass && !shell.ownerSidebar);
  check('the redesigned header is present', shell.header);
  check('the redesigned dock is present', shell.dock);
  check('the legacy top bar is gone', shell.legacyTopbar === 'none' || shell.legacyTopbar === 'absent', shell.legacyTopbar);
  check('the legacy bottom navigation is gone', shell.legacyNav === 'none' || shell.legacyNav === 'absent', shell.legacyNav);
  check('the legacy floating add button is gone', shell.fab === 'none' || shell.fab === 'absent', shell.fab);

  // ── 2. who am I, what role am I ────────────────────────────────────────────
  const header = await page.evaluate(() => {
    const el = document.getElementById('otto-field-header');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const lang = el.querySelector('.of-lang');
    const theme = el.querySelector('.of-theme');
    return {
      wordmark: (el.querySelector('.of-wordmark') || {}).textContent,
      name: (el.querySelector('.of-who-name') || {}).textContent,
      role: (el.querySelector('.of-who-role') || {}).textContent,
      brandLeft: (el.querySelector('.of-brand') || el).getBoundingClientRect().left,
      langRect: lang ? lang.getBoundingClientRect() : null,
      themeRect: theme ? theme.getBoundingClientRect() : null,
      width: rect.width
    };
  });
  check('the header shows OTTO', header && header.wordmark === 'OTTO');
  check('the header shows the worker name', header && header.name === 'QA Trabajador', header && header.name);
  check('the header shows the Field Worker role', header && /field worker/i.test(header.role || ''), header && header.role);
  check('name and role sit at the top left', header && header.brandLeft < header.width / 2);
  check('EN/ES and the theme control are both top right',
    header && header.langRect && header.themeRect
    && header.langRect.left > header.width / 2 && header.themeRect.left > header.width / 2);
  check('the theme control sits directly beside EN/ES',
    header && header.langRect && header.themeRect
    && header.themeRect.left >= header.langRect.right
    && (header.themeRect.left - header.langRect.right) < 24,
    header && header.themeRect ? `${Math.round(header.themeRect.left - header.langRect.right)}px apart` : '');

  // ── 3. Ask OTTO is absent ──────────────────────────────────────────────────
  console.log('\nAsk OTTO is absent for the field worker');
  const assistantReach = await page.evaluate(() => {
    const visibleText = document.body.innerText;
    const floating = document.getElementById('ai-float-btn');
    const popup = document.getElementById('ai-chat-popup');
    const plumb = document.getElementById('plumbbot-modal');
    const seen = el => el && getComputedStyle(el).display !== 'none';
    return {
      text: /ask otto|preguntar a otto|plumbbot/i.test(visibleText),
      floating: seen(floating), popup: seen(popup), plumb: seen(plumb),
      granted: window.__db() && null
    };
  });
  check('no Ask OTTO text anywhere on the field screen', !assistantReach.text);
  check('no floating assistant button', !assistantReach.floating);
  check('no floating assistant popup', !assistantReach.popup);
  check('no legacy assistant modal on screen', !assistantReach.plumb);

  const routeRefused = await page.evaluate(() => {
    window.nav('assistant');
    return { view: window.__db() && document.body.innerText.slice(0, 0) === '' ? null : null };
  });
  await page.waitForTimeout(500);
  const afterAssistantNav = await page.evaluate(() => ({
    text: document.body.innerText,
    hasChatInput: !!document.getElementById('chat-in')
  }));
  check('typing the assistant route by hand does not open it', !afterAssistantNav.hasChatInput);
  check('the assistant route lands back on the field workspace', /Today|Hoy/i.test(afterAssistantNav.text));

  // ── 4. Today answers who / what / next ─────────────────────────────────────
  await page.evaluate(() => window.nav('home'));
  await page.waitForTimeout(600);
  const today = await page.evaluate(() => document.body.innerText);
  check('Today names the worker', today.includes('QA Trabajador'));
  check('Today states the Field Worker role', /FIELD WORKER/i.test(today));
  check('Today shows the assigned job', today.includes('QA JOB — FIELD WORKSPACE'));
  check('Today shows the customer', today.includes('QA Customer'));
  check('Today offers the check-in action', /Start job \/ Check in/i.test(today));

  const dockLabels = await page.evaluate(() =>
    [...document.querySelectorAll('#otto-field-dock .of-dock-item span')].map(s => s.textContent.trim()));
  check('the dock offers exactly Today, Jobs, Activity, Profile',
    JSON.stringify(dockLabels) === JSON.stringify(['Today', 'Jobs', 'Activity', 'Profile']),
    dockLabels.join(' / '));

  const overflow = () => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('Today does not scroll sideways at 390px', (await overflow()) <= 0);
  console.log('  shot ' + await shot(page, '1-worker-today-light'));

  // ── 5. light / dark, EN / ES ───────────────────────────────────────────────
  console.log('\nlight/dark and EN/ES');
  await page.click('#otto-field-header .of-theme');
  await page.waitForTimeout(600);
  const dark = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
    stored: localStorage.getItem('otto_theme'),
    bg: getComputedStyle(document.body).backgroundColor,
    stillField: document.body.classList.contains('otto-field')
  }));
  check('the theme control switches to dark', dark.theme === 'dark', dark.bg);
  check('the theme choice is persisted', dark.stored === 'dark');
  check('dark is the same workspace, not the legacy field UI', dark.stillField);
  check('dark does not scroll sideways at 390px', (await overflow()) <= 0);
  console.log('  shot ' + await shot(page, '2-worker-today-dark'));

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  const afterReload = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  check('the theme survives a refresh', afterReload === 'dark');

  await page.click('#otto-field-header .of-theme');
  await page.waitForTimeout(500);
  await page.click('#otto-field-header .of-lang button:last-child');
  await page.waitForTimeout(700);
  const spanish = await page.evaluate(() => ({
    role: (document.querySelector('.of-who-role') || {}).textContent,
    text: document.body.innerText,
    dock: [...document.querySelectorAll('#otto-field-dock .of-dock-item span')].map(s => s.textContent.trim())
  }));
  check('Spanish shows Trabajador de Campo', /trabajador de campo/i.test(spanish.role || ''), spanish.role);
  /* The longest role label in either language. If the header ever runs out of
     room this is the line that gets ellipsised, and it is the one line a
     technician must be able to read, so it is measured rather than eyeballed. */
  const roleFits = await page.evaluate(() => {
    const el = document.querySelector('.of-who-role');
    return el ? { clipped: el.scrollWidth - el.clientWidth, text: el.textContent } : null;
  });
  check('the Spanish role label is not truncated at 390px',
    roleFits && roleFits.clipped <= 1, roleFits ? `${roleFits.clipped}px clipped` : 'missing');
  check('Spanish navigation is translated',
    JSON.stringify(spanish.dock) === JSON.stringify(['Hoy', 'Trabajos', 'Actividad', 'Perfil']), spanish.dock.join(' / '));
  check('Ask OTTO is still absent in Spanish', !/preguntar a otto/i.test(spanish.text));
  check('Spanish does not scroll sideways at 390px', (await overflow()) <= 0);
  console.log('  shot ' + await shot(page, '5-worker-spanish'));

  await page.click('#otto-field-header .of-lang button:first-child');
  await page.waitForTimeout(600);

  // ── 6. check in ────────────────────────────────────────────────────────────
  console.log('\ncheck in → note → photo → check out');
  await page.click('button[data-of-action="check-in"]');
  await page.waitForTimeout(500);
  await page.click('.overlay button:has-text("Acknowledge")');
  await page.waitForTimeout(1400);
  const checkedIn = await page.evaluate(() => {
    const db = window.__db();
    const job = db.jobs.find(j => j.id === 'qa-field-job');
    const event = db.job_events.find(e => e.jobId === 'qa-field-job' && e.type === 'check_in');
    return {
      activeCheckIn: !!job.activeCheckIn, status: job.status,
      event: event ? { userId: event.userId, ts: event.ts } : null,
      text: document.body.innerText
    };
  });
  check('a check_in record is stored against the worker and the job',
    checkedIn.event && checkedIn.event.userId === 'qa-field-worker' && !!checkedIn.event.ts);
  check('the job records the open check-in', checkedIn.activeCheckIn);
  check('the job moves to in progress', checkedIn.status === 'inProgress', checkedIn.status);
  check('Today shows the checked-in state with a time', /Checked in\s*—/.test(checkedIn.text));
  check('the primary action becomes check out', /Complete \/ Check out/i.test(checkedIn.text));

  // ── 7. note ────────────────────────────────────────────────────────────────
  await page.evaluate(() => window.nav('job', 'qa-field-job'));
  await page.waitForTimeout(700);
  await page.click('button[data-of-action="add-note"]');
  await page.waitForTimeout(400);
  await page.fill('#note-text', 'QA FIELD NOTE — DEMO SYNC TEST');
  await page.click('.overlay button:has-text("Save")');
  await page.waitForTimeout(1200);
  const noted = await page.evaluate(() => {
    const note = window.__db().notes.find(n => n.jobId === 'qa-field-job');
    return { note: note ? { text: note.text, createdBy: note.createdBy } : null, text: document.body.innerText };
  });
  check('the note is stored against the worker and the job',
    noted.note && noted.note.text === 'QA FIELD NOTE — DEMO SYNC TEST' && noted.note.createdBy === 'qa-field-worker');
  check('the note is visible on the job screen', noted.text.includes('QA FIELD NOTE — DEMO SYNC TEST'));

  // ── 8. photo ───────────────────────────────────────────────────────────────
  const chooser = page.waitForEvent('filechooser');
  await page.click('button[data-of-action="add-photo"]');
  await (await chooser).setFiles(QA_IMAGE);
  await page.waitForTimeout(2200);
  const photoed = await page.evaluate(() => {
    const photo = window.__db().photos.find(p => p.jobId === 'qa-field-job');
    const tile = document.querySelector('.of-photo .of-photo-img img');
    return {
      photo: photo ? { fileId: photo.fileId, createdBy: photo.createdBy, created: photo.created } : null,
      thumbnail: !!tile && tile.naturalWidth > 0
    };
  });
  check('the photo record is stored against the worker and the job',
    photoed.photo && !!photoed.photo.fileId && photoed.photo.createdBy === 'qa-field-worker');
  check('the worker sees their own photo as a thumbnail immediately', photoed.thumbnail);
  check('the job screen does not scroll sideways at 390px', (await overflow()) <= 0);
  console.log('  shot ' + await shot(page, '3-worker-job'));

  // ── 9. my uploads ──────────────────────────────────────────────────────────
  await page.evaluate(() => window.nav('otto_field_profile'));
  await page.waitForTimeout(1400);
  const uploads = await page.evaluate(() => ({
    text: document.body.innerText,
    thumb: !!document.querySelector('.of-uploads .of-photo-img img')
  }));
  check('Profile lists My uploads', /my uploads/i.test(uploads.text));
  check('My uploads shows the photo with its job', uploads.thumb && uploads.text.includes('QA JOB — FIELD WORKSPACE'));
  console.log('  shot ' + await shot(page, '4-worker-my-uploads'));

  // ── 10. check out ──────────────────────────────────────────────────────────
  await page.evaluate(() => window.nav('job', 'qa-field-job'));
  await page.waitForTimeout(700);
  /* Check-out requires a complete checklist, which is existing product
     behaviour. Each tick re-renders the job screen, so the boxes are clicked
     one at a time against a fresh query rather than a stale NodeList. */
  for (let i = 0; i < 8; i++) {
    const pending = page.locator('.of-check-box[aria-pressed="false"]').first();
    if (!(await pending.count())) break;
    await pending.click();
    await page.waitForTimeout(600);
  }
  const checklistDone = await page.evaluate(() => {
    const cl = window.__db().job_checklists.find(c => c.jobId === 'qa-field-job');
    return cl ? cl.items.every(i => i.done) : false;
  });
  check('the worker can complete the checklist from the field job screen', checklistDone);
  await page.click('button[data-of-action="check-out"]');
  await page.waitForTimeout(600);
  await page.click('.overlay button:has-text("Submit")');
  await page.waitForTimeout(2000);
  const checkedOut = await page.evaluate(() => {
    const db = window.__db();
    const job = db.jobs.find(j => j.id === 'qa-field-job');
    const out = db.job_events.find(e => e.jobId === 'qa-field-job' && e.type === 'check_out');
    return { active: job.activeCheckIn, out: out ? { userId: out.userId, ts: out.ts } : null };
  });
  check('a check_out record is stored against the worker and the job',
    checkedOut.out && checkedOut.out.userId === 'qa-field-worker' && !!checkedOut.out.ts);
  check('the open check-in is cleared', !checkedOut.active);

  // ── 11. activity from real records ─────────────────────────────────────────
  await page.evaluate(() => window.nav('otto_field_activity'));
  await page.waitForTimeout(800);
  const activity = await page.evaluate(() => document.body.innerText);
  for (const entry of ['Checked in', 'Checked out', 'Added note', 'Uploaded photo']) {
    check(`Activity shows "${entry}" from a stored record`, activity.includes(entry));
  }

  // ── 12. it survives a reload and a fresh sign-in ───────────────────────────
  console.log('\nthe data survives a reload and signing back into the same account');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  const afterRefresh = await page.evaluate(() => {
    const db = window.__db();
    return {
      note: !!db.notes.find(n => n.jobId === 'qa-field-job'),
      photo: !!db.photos.find(p => p.jobId === 'qa-field-job'),
      events: db.job_events.filter(e => e.jobId === 'qa-field-job').map(e => e.type).sort().join(','),
      field: document.body.classList.contains('otto-field')
    };
  });
  check('the note survives a reload', afterRefresh.note);
  check('the photo survives a reload', afterRefresh.photo);
  check('both check-in and check-out survive a reload', afterRefresh.events === 'check_in,check_out', afterRefresh.events);
  check('the worker still lands in the field workspace after a reload', afterRefresh.field);

  await page.evaluate(() => window.signOut());
  await page.waitForTimeout(1200);
  const signedOut = await page.evaluate(() => ({
    login: !document.getElementById('login').classList.contains('hidden'),
    floating: !!document.getElementById('ai-float-btn')
  }));
  check('sign out returns to the sign-in screen', signedOut.login);

  await page.evaluate(() => localStorage.setItem('otto_session', 'qa-field-worker'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2400);
  const backIn = await page.evaluate(() => {
    const db = window.__db();
    return {
      field: document.body.classList.contains('otto-field'),
      name: (document.querySelector('.of-who-name') || {}).textContent,
      role: (document.querySelector('.of-who-role') || {}).textContent,
      note: !!db.notes.find(n => n.jobId === 'qa-field-job'),
      photo: !!db.photos.find(p => p.jobId === 'qa-field-job'),
      events: db.job_events.filter(e => e.jobId === 'qa-field-job').length
    };
  });
  check('signing back in reaches the same account', backIn.name === 'QA Trabajador');
  check('signing back in keeps the Field Worker role', /field worker/i.test(backIn.role || ''));
  check('signing back in gives the same redesigned workspace', backIn.field);
  check('the note is still there after signing back in', backIn.note);
  check('the photo is still there after signing back in', backIn.photo);
  check('both check events are still there after signing back in', backIn.events === 2, String(backIn.events));

  // ── 13. the owner side of the same demo path ───────────────────────────────
  /* The owner has to see the worker's records from their own session, keep Ask
     OTTO, and — the point of this section — get a REAL server request when they
     ask a question. There is no provider key in this sandbox, so the call is
     expected to fail; what is proven here is that a request is genuinely made
     and that a failure is reported as a failure instead of being dressed up as
     an answer. The successful answer itself needs production. */
  console.log('\nthe owner sees the worker records and keeps a real Ask OTTO');
  await page.evaluate(() => {
    const db = window.__db();
    const now = new Date().toISOString();
    db.users = db.users.filter(u => u.id !== 'qa-owner');
    db.users.unshift({ id: 'qa-owner', name: 'QA Owner', role: 'owner', email: 'qa.owner@example.invalid',
      pin: '1717', active: true, created: now, updated: now });
    localStorage.setItem('otto_session', 'qa-owner');
    window.__save();
  });
  await page.waitForTimeout(900);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2400);

  const ownerShell = await page.evaluate(() => ({
    shell: document.body.classList.contains('otto-shell'),
    field: document.body.classList.contains('otto-field'),
    sidebar: !!document.getElementById('otto-sidebar'),
    fieldHeader: !!document.getElementById('otto-field-header')
  }));
  check('the owner gets the owner shell', ownerShell.shell && ownerShell.sidebar);
  check('the owner does not get the field workspace', !ownerShell.field && !ownerShell.fieldHeader);

  await page.evaluate(() => window.nav('job', 'qa-field-job'));
  await page.waitForTimeout(1400);
  const ownerSees = await page.evaluate(() => {
    const db = window.__db();
    return {
      text: document.body.innerText,
      note: !!db.notes.find(n => n.jobId === 'qa-field-job' && n.createdBy === 'qa-field-worker'),
      photo: !!db.photos.find(p => p.jobId === 'qa-field-job' && p.createdBy === 'qa-field-worker'),
      checkIn: !!db.job_events.find(e => e.jobId === 'qa-field-job' && e.type === 'check_in'),
      checkOut: !!db.job_events.find(e => e.jobId === 'qa-field-job' && e.type === 'check_out')
    };
  });
  check('the owner sees the worker note record', ownerSees.note);
  check('the owner sees the worker photo record', ownerSees.photo);
  check('the owner sees the worker check-in record', ownerSees.checkIn);
  check('the owner sees the worker check-out record', ownerSees.checkOut);
  check('the worker note is visible on the owner job screen',
    ownerSees.text.includes('QA FIELD NOTE — DEMO SYNC TEST'));
  console.log('  shot ' + await shot(page, '6-owner-job-with-worker-records'));

  const assistantCalls = [];
  page.on('request', r => { if (r.url().includes('/api/nvidia')) assistantCalls.push(r.url()); });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => window.nav('assistant'));
  await page.waitForTimeout(900);
  const ownerHasAssistant = await page.evaluate(() => !!document.getElementById('chat-in'));
  check('the owner can open Ask OTTO', ownerHasAssistant);

  if (ownerHasAssistant) {
    await page.fill('#chat-in', 'What note did the field worker add to the QA job?');
    await page.evaluate(() => window.askAssistant());
    await page.waitForTimeout(4000);
    const reply = await page.evaluate(() => {
      const bubbles = [...document.querySelectorAll('#chatlog .bubble.bot')];
      return bubbles.length ? bubbles[bubbles.length - 1].innerText : '';
    });
    check('asking a question makes a real request to the server assistant',
      assistantCalls.length > 0, `${assistantCalls.length} request(s)`);
    check('a failed assistant call says so instead of inventing an answer',
      /assistant/i.test(reply) && /(could not|failed|not configured|no access|did not respond)/i.test(reply),
      reply.split('\n')[0]);
    check('no canned keyword reply is produced',
      !/Quick Margin/i.test(reply) && !/OTTO received "/i.test(reply));
    check('real CRM records are still offered, clearly labelled as records',
      /records/i.test(reply));
    console.log('  shot ' + await shot(page, '7-owner-ask-otto'));
  }

  // ── 14. no JavaScript errors ───────────────────────────────────────────────
  const real = errors.filter(e => !/favicon|net::ERR|Failed to load resource|supabase|cdn|font/i.test(e));
  check('no JavaScript errors during the whole run', real.length === 0, real.slice(0, 3).join(' | '));

  await browser.close();
};

run().then(() => {
  console.log(`\nField browser run: ${passed} passed, ${failed} failed`);
  console.log(`Screenshots in ${SHOTS}`);
  process.exit(failed ? 1 : 0);
}).catch(err => {
  console.error('\nRun could not complete:', err && err.message || err);
  process.exit(2);
});
