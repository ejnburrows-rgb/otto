/* Field worker workspace + returning login + one real assistant path.

   Focused regression coverage for the demo-critical path:

     owner signs in → assigns a job → field worker signs in → correct workspace
     → checks in, notes, photo → checks out → signs out → signs back into the
     SAME account → owner sees all of it from a fresh session.

   These checks assert wiring, role decisions and persistence rules — the things
   a later change can silently undo. Rendering, real sign-in and real Supabase
   records are proven separately in a browser and against production; see
   docs/STATUS.md. */

import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../otto-field.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../otto-field.js', import.meta.url), 'utf8');
const shellJs = fs.readFileSync(new URL('../otto-shell.js', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const serverAuth = fs.readFileSync(new URL('../api/_lib/serverAuth.js', import.meta.url), 'utf8');
const nvidia = fs.readFileSync(new URL('../api/nvidia.js', import.meta.url), 'utf8');
const dataApi = fs.readFileSync(new URL('../api/data.js', import.meta.url), 'utf8');

/* Comments in these files describe what was removed, so they name the very
   strings some checks search for. Match against code only. */
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const fieldCode = strip(js);
const indexCode = strip(index);

/* The app's inline script, which is where the role table, router and auth chain
   live. Taking the last <script> block matches how qa-check reads the page. */
const inlineBlocks = index.match(/<script>[\s\S]*?<\/script>/g) || [];
const inline = strip(inlineBlocks[inlineBlocks.length - 1] || '');

/* The role table, evaluated rather than pattern-matched, so these assertions
   test the real grants instead of the text that happens to describe them. */
const roleViewsSource = index.match(/const ROLE_VIEWS = \{[\s\S]*?\n  \};/)[0]
  .replace('const FULL_ADMIN_VIEWS', 'FULL_ADMIN_VIEWS');
const fullAdminSource = index.match(/const FULL_ADMIN_VIEWS = \[[^\]]*\];/)[0];
const ROLE_VIEWS = new Function(`${fullAdminSource}\n${roleViewsSource}\nreturn ROLE_VIEWS;`)();
const grants = (role, view) => (ROLE_VIEWS[role] || []).includes(view);

const checks = [
  // ── 1. returning login ────────────────────────────────────────────────────
  /* The reported failure was an accepted employee who could not sign back in.
     Every one of these is a way that used to end at an empty sign-in form with
     no explanation, on an account that was valid the whole time. */
  /* Recovery behavior itself — recreated identities, ambiguity, disabled and
     deleted profiles — is proven against the real function in
     scripts/test-returning-login.mjs. These two stay as source checks only to
     pin the shape of the fix: the stale-uid requirement is gone, and recovery
     is still keyed on the stored email. */
  ['a verified email resolves an existing profile even when a stale auth_uid is stored',
    !serverAuth.includes('candidate.auth_uid == null &&')
    && /candidate\.data\.email/.test(serverAuth)],
  ['an ambiguous email still cannot claim a profile', serverAuth.includes('matches.length === 1')],
  ['a disabled or deleted profile is never rebound on its way to being refused',
    serverAuth.includes('usableProfile(matches[0])')],
  ['a rebind updates the same row rather than creating a second employee',
    serverAuth.includes("method: 'PATCH'") && serverAuth.includes('auth_uid: authUser.id')],
  ['the profile lookup retries instead of failing on the first bad response',
    inline.includes('SESSION_LOOKUP_ATTEMPTS') && inline.includes('for (let attempt = 0; attempt < SESSION_LOOKUP_ATTEMPTS')],
  ['an expired access token is refreshed before the account is judged',
    inline.includes('cloudAuth.auth.refreshSession()')],
  ['a temporary outage is reported as unavailable, not as a rejected account',
    inline.includes("return { status: 'unavailable'") && inline.includes("return { status: 'rejected'")],
  ['a temporary outage does not delete the local profile marker',
    inline.includes("cloudOutcome.status !== 'unavailable'")],
  ['the sign-in screen says why it is being shown',
    inline.includes('cloudSessionMessage(cloudOutcome)') && inline.includes('showCloudLogin(why)')],
  ['an identity that arrives after boot still signs the app in',
    inline.includes('resumeCloudSession') && inline.includes("event === 'SIGNED_IN'")],
  ['device-only and PIN sign-in are not the answer to a cloud failure',
    inline.includes("localStorage.setItem('otto_session', session.id)")
    && !inline.includes('shouldCreateUser: true')],
  ['onboarding is preserved: policy gate still runs before a field session starts',
    inline.includes("session.role === 'field' && !hasEmployeePolicyAcknowledgment(session.id)")],

  // ── 2. one authoritative role router ──────────────────────────────────────
  ['the workspace decision exists in exactly one function',
    inline.includes('function ottoWorkspace(user)') && inline.includes("who.role === 'field' ? 'field' : 'owner'")],
  ['the decision is made from the role, never from a name, email or id',
    !/ottoWorkspace[\s\S]{0,400}?(session\.name|session\.email|session\.id)/.test(inline)],
  ['the field workspace claims every role=field session',
    fieldCode.includes("session.role === 'field'") && fieldCode.includes('function active()')],
  ['the owner shell refuses role=field so there is no second opinion',
    shellJs.includes("return Boolean(session) && session.role !== 'field'")],
  ['the field runtime loads after the owner shell so it is the outer wrapper',
    index.indexOf('data-otto-field-runtime') > index.indexOf('data-otto-shell-runtime')],
  ['a field session cannot open another crew member\'s job',
    fieldCode.includes('job.assignedTo !== session.id') && fieldCode.includes("nav('jobs')")],

  // ── 3. Ask OTTO is absent for field ───────────────────────────────────────
  /* Absent, not hidden: the role does not grant it, the router refuses it, the
     renderer refuses it, and no field surface draws an entry point. */
  ['the field role does not grant the assistant', grants('field', 'assistant') === false],
  ['the owner keeps the assistant', grants('owner', 'assistant') === true],
  ['the router refuses the assistant route for a role without it',
    inline.includes("if (view === 'assistant' && !can('assistant')) view = 'home';")],
  ['a restored history entry cannot reach the assistant either',
    inline.includes("if (route.view === 'assistant' && !can('assistant')) route = { view: 'home', id: null, tab: null };")],
  ['the floating assistant button is not built for a role without the assistant',
    /function createFloatingChat\(\)\s*\{\s*if \(!can\('assistant'\)\) return;/.test(inline)],
  ['a floating assistant left over from another session is removed',
    inline.includes("const stale = document.getElementById('ai-float-btn'); if (stale) stale.remove();")],
  ['the legacy field bottom navigation no longer lists the assistant',
    inline.includes("field: ['home', 'jobs', 'customers', 'followups'],")],
  ['no field workspace surface renders an assistant entry point',
    !/ask\s*otto|assistant|wand-magic/i.test(fieldCode)],
  ['the field stylesheet takes down every floating assistant surface',
    css.includes('#ai-float-btn') && css.includes('#ai-chat-popup') && css.includes('#plumbbot-modal')],
  ['the provider proxy itself refuses field accounts',
    nvidia.includes("roles: ['owner', 'office']")],

  // ── 4. the owner assistant is real ────────────────────────────────────────
  ['the fake keyword replies are gone',
    !indexCode.includes('Quick Margin buttons') && !indexCode.includes('OTTO received "')],
  ['the second assistant modal now opens the one real assistant',
    inline.includes('function sendPlumbBotMsg()') && inline.includes("nav('assistant')")
    && inline.includes('askAssistant()')],
  ['the assistant reaches the provider through the authenticated server proxy',
    inline.includes("serverFetch('/api/nvidia'")],
  ['a failed provider call is reported rather than dressed up as an answer',
    inline.includes('function aiFailureMessage()') && inline.includes('_lastAiFailure')],
  ['the failure reason distinguishes offline, unconfigured and forbidden',
    inline.includes("case 'offline':") && inline.includes("case 'not_configured':") && inline.includes("case 'forbidden':")],
  ['records shown after a failure are labelled as records, not as a reply',
    inline.includes("'Company records (no assistant answer)'")],

  // ── 5. the field workspace is the same design system ──────────────────────
  ['field stylesheet is wired into the page',
    index.includes('href="./otto-field.css?v=1" data-otto-field-styles')],
  ['field runtime is wired into the page',
    index.includes('src="./otto-field.js?v=1" data-otto-field-runtime')],
  ['field assets are precached, because a field phone is the one that goes offline',
    sw.includes("'./otto-field.css'") && sw.includes("'./otto-field.js'")],
  ['the field workspace uses the owner shell typeface',
    css.includes("--of-font: 'Geist', 'Inter'")],
  ...[['--of-bg', '#F7F7F8'], ['--of-surface', '#FFFFFF'], ['--of-header', '#111214'],
      ['--of-text', '#15171A'], ['--of-text-2', '#626872'], ['--of-muted', '#8A9099'],
      ['--of-border', '#E5E7EA'], ['--of-accent', '#2563EB'], ['--of-success', '#17803D'],
      ['--of-warning', '#B76A00'], ['--of-error', '#C93737']]
    .map(([token, value]) => [`field palette token ${token} matches the owner shell (${value})`, css.includes(`${token}: ${value}`)]),
  ['the legacy field presentation is switched off rather than covered',
    ['.topbar', '.bottomnav', '#fab', '#wallpaper-bg', '#open-job-banner']
      .every(sel => css.includes(sel)) && css.includes('display: none !important;')],
  ['the legacy open-job strip does not float over the new header',
    inline.includes("session.role === 'field' && !document.body.classList.contains('otto-field')")],
  ['no field screen may scroll the page sideways', css.includes('overflow-x: hidden;')],
  ['content clears both the fixed header and the dock',
    css.includes('calc(var(--of-header-h) + env(safe-area-inset-top) + 16px)')
    && css.includes('calc(var(--of-dock-h) + env(safe-area-inset-bottom) + 24px)')],
  ['touch targets are at least 44px', css.includes('--of-tap: 44px')],

  // ── 6. header: who am I, what role, and the two controls ──────────────────
  ['the header carries the OTTO wordmark', fieldCode.includes("class=\"of-wordmark\">OTTO<")],
  ['the header always shows the worker name', fieldCode.includes('class="of-who-name"')],
  ['the header always shows the Field Worker role', fieldCode.includes('class="of-who-role"')],
  ['the role reads Field Worker in English and Trabajador de Campo in Spanish',
    fieldCode.includes("words('Field Worker', 'Trabajador de Campo')")],
  ['EN and ES sit in the header', fieldCode.includes('class="of-lang"') && fieldCode.includes('>EN<') && fieldCode.includes('>ES<')],
  ['the light/dark control sits directly beside EN/ES, not inside Settings',
    /class="of-lang"[\s\S]{0,700}?class="of-theme"/.test(fieldCode)
    && /\.of-lang[\s\S]{0,200}?\.of-theme|of-controls/.test(css)],
  ['both controls are in the same header control group',
    /class="of-controls">[\s\S]{0,900}?of-theme/.test(fieldCode)],
  ['the theme control drives the app-wide persisted theme', fieldCode.includes('toggleTheme()')],
  ['dark is a re-tone of the same workspace, not a second interface',
    css.includes('html[data-theme="dark"] body.otto-field {')],

  // ── 7. navigation is four destinations and nothing else ───────────────────
  ['primary navigation is Today, Jobs, Activity, Profile',
    ['Today', 'Jobs', 'Activity', 'Profile'].every(name => fieldCode.includes(`en: '${name}'`))
    && (fieldCode.match(/const NAV = \[[\s\S]*?\];/)[0].match(/id: '/g) || []).length === 4],
  ...['customers', 'money', 'estimates', 'invoices', 'payments', 'checks', 'payroll',
      'reports', 'team', 'pricing', 'inbox', 'backups', 'audit', 'alerts']
    .map(view => [`field navigation does not offer ${view}`,
      !new RegExp(`data-of-nav="${view}"`).test(fieldCode)]),
  ...['team', 'payroll', 'reports', 'pricing', 'checks', 'estimates', 'invoices', 'payments',
      'inbox', 'backups', 'audit', 'kpis']
    .map(view => [`the field role still does not grant ${view}`, grants('field', view) === false]),

  // ── 8. Today answers who / what / next ────────────────────────────────────
  ['Today names the worker and the role before anything else',
    fieldCode.includes('class="of-hello-name"') && fieldCode.includes('class="of-hello-role"')],
  ['Today shows the date', fieldCode.includes('class="of-hello-date"')],
  ['Today shows the current job with customer, address, schedule and status',
    fieldCode.includes("words('Customer', 'Cliente')") && fieldCode.includes("words('Address', 'Dirección')")
    && fieldCode.includes("words('Scheduled', 'Agendado')") && fieldCode.includes("words('Status', 'Estado')")],
  ['Today shows the check-in state', fieldCode.includes("words('Checked in', 'Entrada registrada')")],
  ['the primary action before check-in is start job / check in',
    fieldCode.includes("words('Start job / Check in', 'Empezar / Entrada')")],
  ['the primary action after check-in is complete / check out',
    fieldCode.includes("words('Complete / Check out', 'Completar / Salida')")],
  ['with no assignment Today says so and offers the next job',
    fieldCode.includes("words('No active job', 'Sin trabajo activo')") && fieldCode.includes('function nextJob()')],
  ['Today lists today\'s and next jobs, and recent activity',
    fieldCode.includes("words(\"Today's jobs\", 'Trabajos de hoy')")
    && fieldCode.includes("words('Recent activity', 'Actividad reciente')")],

  // ── 9. the job screen is task focused ─────────────────────────────────────
  ...[['job information', "words('Job information', 'Información del trabajo')"],
      ['work', "words('Work', 'Trabajo')"],
      ['checklist', "words('Checklist', 'Lista')"],
      ['authorized documents', "words('Authorized documents', 'Documentos autorizados')"]]
    .map(([name, needle]) => [`the job screen has a ${name} section`, fieldCode.includes(needle)]),
  ['the job screen has notes and photos', fieldCode.includes("panel(t('notes')") && fieldCode.includes("panel(t('photos')")],
  ['job actions reuse the app\'s existing check-in and check-out logic',
    fieldCode.includes('startCheckInFlow(id)') && fieldCode.includes('startCheckOutFlow(id)')],
  ['notes and photos reuse the app\'s existing save paths',
    fieldCode.includes('openNoteForm(id)') && fieldCode.includes('quickPhoto(id)')],
  ['documents are read-only for the crew',
    !fieldCode.includes('uploadDoc(') && fieldCode.includes("case 'open-doc'")],

  // ── 10. photo visibility: one record, one source of truth ─────────────────
  ['photos are read from the shared photos collection, not a field-only copy',
    fieldCode.includes("list('photos').filter(p => p && p.jobId === job.id)")],
  ['a photo tile resolves its bytes through the shared file resolver',
    fieldCode.includes('await getFileURL(fileId)')],
  ['the shared file resolver falls back to cloud storage for a device without the blob',
    inline.includes("serverFetch('/api/photos?fileId='")],
  ['the worker sees their own uploads outside the job screen',
    fieldCode.includes('function myUploads()') && fieldCode.includes("words('My uploads', 'Mis archivos')")],
  ['my uploads shows the related job and the timestamp',
    fieldCode.includes('class="of-upload-job"') && fieldCode.includes('class="of-upload-meta"')],
  ['before/after is shown when the photo carries a phase',
    fieldCode.includes("words('Before', 'Antes')") && fieldCode.includes("words('After', 'Después')")],
  ['tapping a photo opens a larger preview', fieldCode.includes('async function openPhoto(photoId)')],
  ['a photo still waiting to reach the office is visibly pending',
    fieldCode.includes('photo.uploadPending') && css.includes('.of-photo-pending')],
  ['the upload queue carries the job so the server can authorize a field upload',
    inline.includes('jobId: fileJobId(fileId)')],
  ['a field account may only upload against a job assigned to it',
    fs.readFileSync(new URL('../api/photos.js', import.meta.url), 'utf8').includes('return assigned.includes(identity.userId);')],

  // ── 11. activity comes from stored records ────────────────────────────────
  ['activity is built from job events, notes, photos and checklist submissions',
    ["list('job_events')", "list('notes')", "list('photos')", "list('checklist_submissions')"]
      .every(needle => fieldCode.includes(needle))],
  ['activity is filtered to this employee\'s own records',
    fieldCode.includes('event.userId !== session.id') && fieldCode.includes('note.createdBy !== session.id')
    && fieldCode.includes('photo.createdBy !== session.id')],
  ['check-in and check-out both appear in activity',
    fieldCode.includes("words('Checked in', 'Entrada')") && fieldCode.includes("words('Checked out', 'Salida')")],
  ['activity has a real empty state rather than invented entries',
    fieldCode.includes("words('No recorded activity yet.', 'Todavía no hay actividad registrada.')")],

  // ── 12. field → cloud → owner ─────────────────────────────────────────────
  /* The worker's records have to leave the device, and the owner has to be able
     to read them back. Both halves are asserted, plus the restriction that
     keeps a field account from reading anything beyond its own work. */
  ['every field write goes through the shared save path, which pushes to cloud',
    inline.includes('function save() {') && inline.includes('cloudPush();')],
  ['notes, photos, job events and checklists are all cloud-synced collections',
    ['notes', 'photos', 'job_events', 'job_checklists', 'checklist_submissions']
      .every(col => dataApi.includes(`'${col}'`))],
  ['a field account may write those collections for its assigned work',
    ['notes', 'photos', 'job_events', 'job_checklists', 'checklist_submissions']
      .every(col => new RegExp(`FIELD_COLLECTIONS = new Set\\(\\[[\\s\\S]*?'${col}'`).test(dataApi))],
  ['a rejected push is never recorded as stored',
    inline.includes('delete _lastCloudState[col];')],
  ['a failed read keeps the device copy instead of wiping it',
    inline.includes('if (!Array.isArray(rows)) {')],
  ['a field account still cannot read records outside its assigned work',
    dataApi.includes('function fieldRecordVisible(') && dataApi.includes("if (collection === 'users') return record.id === userId;")],
  ['a field account cannot reassign a job or change its customer',
    dataApi.includes("message: 'A field account cannot reassign a job or change its customer.'")],
  ['a field account cannot change its own role or access',
    dataApi.includes("message: 'A field account cannot change its own role or access.'")],
  ['the owner reads every collection, so worker records reach a fresh owner session',
    dataApi.includes("const context = identity.role === 'field' ? await fieldContext(url, headers, identity) : null;")]
];

let passed = 0;
let failed = 0;
for (const [name, ok] of checks) {
  if (ok) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}
console.log(`Field workspace checks: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
