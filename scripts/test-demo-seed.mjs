// Regression tests for the demo-data contamination fault.
//
// Background: a fresh device used to invent three customers, three jobs and a
// call inside blankDB(), plus two more jobs in seedMockKPIs(), all with newly
// generated ids. Cloud sync merges by id, so the cloud could not tell them from
// real work and stored them as new rows. The live jobs table went 3 -> 8 -> 13
// over two days as fresh devices came online.
//
// These tests pull the real functions out of index.html and drive them, so they
// fail if someone reintroduces seeding on the production path.
//
// Run with:  node scripts/test-demo-seed.mjs

import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`could not find ${name}() in index.html`);
  let depth = 0;
  for (let i = html.indexOf('{', start); i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') { depth--; if (depth === 0) return html.slice(start, i + 1); }
  }
  throw new Error(`unbalanced braces in ${name}()`);
}

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

// ── build a sandbox with just the helpers these functions need ────────────────
const HELPERS = `
  let _uidN = 0;
  const uid = () => 'id' + (++_uidN);
  const nowISO = () => new Date('2026-07-30T12:00:00.000Z').toISOString();
  const todayISO = () => '2026-07-30';
`;

function build(names, extra = '') {
  const src = names.map(extractFunction).join('\n');
  return new Function('location', 'localStorage', `${HELPERS}\n${src}\n${extra}\nreturn {${names.join(',')}};`);
}

function fakeStorage(initial = {}) {
  const m = { ...initial };
  return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
    _all: m,
  };
}

const emptyDb = () => ({
  customers: [], jobs: [], calls: [], invoices: [], estimates: [], payments: [],
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nisDemoMode — production is the default');
{
  const { isDemoMode } = build(['isDemoMode'])({ search: '' }, fakeStorage());
  check('a fresh device is NOT in demo mode', isDemoMode(), false);
}
{
  const { isDemoMode } = build(['isDemoMode'])({ search: '?demo=1' }, fakeStorage());
  check('?demo=1 turns demo mode on', isDemoMode(), true);
}
{
  const store = fakeStorage();
  build(['isDemoMode'])({ search: '?demo=1' }, store).isDemoMode();
  check('?demo=1 is remembered for later visits', store._all.otto_demo_mode, '1');
}
{
  const store = fakeStorage({ otto_demo_mode: '1' });
  const { isDemoMode } = build(['isDemoMode'])({ search: '?demo=0' }, store);
  check('?demo=0 turns it back off', isDemoMode(), false);
  check('and clears the stored flag', store._all.otto_demo_mode, undefined);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nturning the demo off — the device goes back to normal, empty');
{
  // ?demo=0 must also raise the flag boot() uses to clear the leftover rows.
  // Without it the demo customers stay on screen after the demo is over.
  const store = fakeStorage({ otto_demo_mode: '1' });
  const api = new Function('location', 'localStorage',
    `let _demoJustDisabled = false;\n${extractFunction('isDemoMode')}\n` +
    `return { isDemoMode, flag: () => _demoJustDisabled };`)({ search: '?demo=0' }, store);
  api.isDemoMode();
  check('?demo=0 marks the device for cleanup', api.flag(), true);

  const stay = new Function('location', 'localStorage',
    `let _demoJustDisabled = false;\n${extractFunction('isDemoMode')}\n` +
    `return { isDemoMode, flag: () => _demoJustDisabled };`)({ search: '' }, fakeStorage());
  stay.isDemoMode();
  check('an ordinary visit does not trigger cleanup', stay.flag(), false);
}
{
  const COLS = ['customers', 'jobs', 'calls', 'invoices', 'estimates', 'payments'];
  const purge = new Function(
    `const COLLECTIONS = ${JSON.stringify(COLS)};\n${extractFunction('purgeDemoRecords')}\nreturn purgeDemoRecords;`)();

  const seeded = emptyDb();
  seeded.meta = { kpiDemoSeeded: true };
  Object.assign(seeded, {
    customers: [{ id: 'c1', demo: true }, { id: 'c2', name: 'Real Customer' }],
    jobs: [{ id: 'j1', demo: true }, { id: 'j2', demo: true }],
    invoices: [{ id: 'i1', demo: true }],
    payments: [{ id: 'p1', demo: true }],
    estimates: [{ id: 'e1', demo: true }],
  });
  const removed = purge(seeded);
  check('every demo row is removed', removed, 6);
  check('a real customer is never touched', seeded.customers.map(c => c.id), ['c2']);
  check('demo jobs are gone', seeded.jobs.length, 0);
  check('demo invoices are gone', seeded.invoices.length, 0);
  check('demo payments are gone', seeded.payments.length, 0);
  check('demo estimates are gone', seeded.estimates.length, 0);
  check('the KPI seed flag is cleared so a later demo works', seeded.meta.kpiDemoSeeded, undefined);

  // A device that never ran a demo must come through completely untouched.
  const real = emptyDb();
  real.customers = [{ id: 'c9', name: 'Real Customer' }];
  real.jobs = [{ id: 'j9', title: 'Real job' }];
  check('a production device loses nothing', purge(real), 0);
  check('and keeps its records', [real.customers.length, real.jobs.length], [1, 1]);
}
{
  // A device with no URL/query support at all must fail safe, not throw.
  const { isDemoMode } = build(['isDemoMode'])(null, null);
  check('falls back to production when storage is unavailable', isDemoMode(), false);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\napplyDemoSeed — never lands on a database that already means something');
const seedApi = () => build(['applyDemoSeed', 'hasAnyBusinessData'])({ search: '' }, fakeStorage());
{
  const { applyDemoSeed } = seedApi();
  const d = emptyDb();
  check('seeds an empty database', applyDemoSeed(d), true);
  check('creates 3 demo customers', d.customers.length, 3);
  check('creates 3 demo jobs', d.jobs.length, 3);
  check('every seeded customer is stamped demo', d.customers.every(c => c.demo === true), true);
  check('every seeded job is stamped demo', d.jobs.every(j => j.demo === true), true);
  check('every seeded call is stamped demo', d.calls.every(c => c.demo === true), true);
}
{
  const { applyDemoSeed } = seedApi();
  const d = emptyDb();
  d.jobs = [{ id: 'real1', title: 'Real work' }];
  check('refuses to seed over a real job', applyDemoSeed(d), false);
  check('and leaves the real job untouched', d.jobs, [{ id: 'real1', title: 'Real work' }]);
  check('and adds no customers', d.customers.length, 0);
}
{
  const { applyDemoSeed } = seedApi();
  const d = emptyDb();
  d.customers = [{ id: 'c1', name: 'Real customer' }];
  check('refuses to seed over a real customer', applyDemoSeed(d), false);
}
{
  // Cloud pull landed real rows first — the production path this fault broke.
  const { applyDemoSeed } = seedApi();
  const d = emptyDb();
  d.jobs = [{ id: 'mrp7ni9zz4s19', title: 'Water heater install' }];
  d.customers = [{ id: 'mrp7ni9z8vne7', name: 'Garcia Residence' }];
  check('a device that pulled cloud data first seeds nothing', applyDemoSeed(d), false);
  check('cloud jobs are not duplicated', d.jobs.length, 1);
  check('cloud customers are not duplicated', d.customers.length, 1);
}
{
  // Re-running must be idempotent: demo rows are not "real", but they still
  // must not stack up on reload.
  const { applyDemoSeed } = seedApi();
  const d = emptyDb();
  applyDemoSeed(d);
  const firstIds = d.jobs.map(j => j.id);
  applyDemoSeed(d);
  check('a reload does not double the demo jobs', d.jobs.length, 3);
  check('and reuses the same records', d.jobs.map(j => j.id), firstIds);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n_syncableRecords — demo rows never leave the device');
{
  const src = extractFunction('_allRecords') + '\n' + extractFunction('_syncableRecords');
  const make = (database) => new Function('db', `${src}\nreturn _syncableRecords;`)(database);

  const db = {
    jobs: [
      { id: 'real1', title: 'Real work' },
      { id: 'demo1', title: 'Kitchen faucet leak', demo: true },
      { id: 'demo2', title: 'Water heater install', demo: true },
    ],
    customers: [{ id: 'c1', name: 'Real customer' }],
    companyProfile: { id: 'company-otto-001', name: 'OTTO Plumbing' },
    _deleted: { jobs: [{ id: 'demo3', deleted: true, demo: true }, { id: 'real2', deleted: true }] },
  };
  const syncable = make(db);

  check('demo jobs are stripped before upload', syncable('jobs').map(j => j.id), ['real1', 'real2']);
  check('real customers still upload', syncable('customers').map(c => c.id), ['c1']);
  check('real deletions still upload', syncable('jobs').some(j => j.deleted), true);
  check('deleted demo rows are stripped too', syncable('jobs').some(j => j.demo), false);
  check('companyProfile is passed through unchanged', syncable('companyProfile').name, 'OTTO Plumbing');
}
{
  // The exact production scenario: a fresh device in demo mode must still
  // upload nothing, so a real workspace cannot be contaminated by hand.
  const src = extractFunction('_allRecords') + '\n' + extractFunction('_syncableRecords');
  const seeded = emptyDb();
  seedApi().applyDemoSeed(seeded);
  const syncable = new Function('db', `${src}\nreturn _syncableRecords;`)(seeded);
  check('a fully seeded demo device uploads zero jobs', syncable('jobs').length, 0);
  check('a fully seeded demo device uploads zero customers', syncable('customers').length, 0);
  check('a fully seeded demo device uploads zero calls', syncable('calls').length, 0);
  // The billing rows exist so a demo can show estimate -> invoice -> payment.
  // They must obey exactly the same containment rule as everything above.
  check('a fully seeded demo device uploads zero estimates', syncable('estimates').length, 0);
  check('a fully seeded demo device uploads zero invoices', syncable('invoices').length, 0);
  check('a fully seeded demo device uploads zero payments', syncable('payments').length, 0);
}
{
  // The billing demo data itself: present, stamped, and internally consistent,
  // so the invoice screen shows a real paid/partial split rather than zeros.
  const seeded = emptyDb();
  seedApi().applyDemoSeed(seeded);
  check('seeds one demo estimate', seeded.estimates.length, 1);
  check('seeds two demo invoices', seeded.invoices.length, 2);
  check('seeds two demo payments', seeded.payments.length, 2);
  check('every seeded estimate is stamped demo', seeded.estimates.every(r => r.demo === true), true);
  check('every seeded invoice is stamped demo', seeded.invoices.every(r => r.demo === true), true);
  check('every seeded payment is stamped demo', seeded.payments.every(r => r.demo === true), true);
  const paidInv = seeded.invoices.find(i => i.number === 'INV-1001');
  const partInv = seeded.invoices.find(i => i.number === 'INV-1002');
  check('INV-1001 is fully paid', paidInv.amount - paidInv.paid, 0);
  check('INV-1002 still carries a balance', partInv.amount - partInv.paid, 1950);
  check('each payment points at a seeded invoice',
    seeded.payments.every(p => seeded.invoices.some(i => i.id === p.invoiceId)), true);
  check('each payment amount matches what the invoice records as paid',
    seeded.payments.every(p => seeded.invoices.find(i => i.id === p.invoiceId).paid >= p.amount), true);
  check('billing rows attach to seeded customers',
    [...seeded.invoices, ...seeded.estimates].every(r => seeded.customers.some(c => c.id === r.customerId)), true);
}
{
  // Repeated fresh devices: each seeds locally, none contributes to the cloud,
  // so the cloud count cannot grow. This is the 3 -> 8 -> 13 regression.
  const src = extractFunction('_allRecords') + '\n' + extractFunction('_syncableRecords');
  const cloudJobs = [{ id: 'mrp7ni9zz4s19' }, { id: 'mrp7ni9zkrgbz' }, { id: 'mrp7ni9z6ejlj' }];
  let cloud = [...cloudJobs];
  for (let device = 0; device < 5; device++) {
    const d = emptyDb();
    seedApi().applyDemoSeed(d);
    const syncable = new Function('db', `${src}\nreturn _syncableRecords;`)(d);
    for (const r of syncable('jobs')) if (!cloud.some(c => c.id === r.id)) cloud.push(r);
  }
  check('five fresh demo devices leave the cloud at 3 jobs', cloud.length, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\nsource guarantees — the production boot path');
{
  check('blankDB no longer invents customers',
    /function blankDB\(\)[\s\S]*?\n  \}/.exec(html)[0].includes('Garcia Residence'), false);
  check('demo content lives in applyDemoSeed instead',
    html.includes('function applyDemoSeed('), true);
  check('the KPI seeder refuses to run outside demo mode',
    /function seedMockKPIs\(\)\s*\{[\s\S]{0,400}?if \(!isDemoMode\(\)\) return;/.test(html), true);
  check('records made by the KPI seeder are stamped demo',
    html.includes('if (_seedingDemo) obj.demo = true;'), true);
  check('cloud push filters through _syncableRecords',
    html.includes('const value = _syncableRecords(col);'), true);
  check('cloud push no longer sends _allRecords directly',
    html.includes('const value = _allRecords(col);'), false);

  // Ordering is the heart of the fault: the cloud has to win before any demo
  // data can be created, otherwise the seed is already in the merge.
  const pull = html.indexOf('_cloudAvailable = await cloudPull()');
  const seed = html.indexOf('if (isDemoMode() && applyDemoSeed(db)) save();');
  check('boot pulls the cloud before considering demo data', pull > 0 && seed > pull, true);

  // The cleanup has to hang off the same decision, or ?demo=0 leaves the rows.
  const purgeCall = html.indexOf('_demoJustDisabled && purgeDemoRecords(db)');
  check('boot clears demo rows when the demo is switched off', purgeCall > seed, true);
}
{
  // End to end: seed a demo, then purge it, and the device is empty again —
  // which is the state the owner needs before real customer work starts.
  const d = emptyDb();
  seedApi().applyDemoSeed(d);
  const COLS = ['customers', 'jobs', 'calls', 'invoices', 'estimates', 'payments'];
  const purge = new Function(
    `const COLLECTIONS = ${JSON.stringify(COLS)};\n${extractFunction('purgeDemoRecords')}\nreturn purgeDemoRecords;`)();
  purge(d);
  check('a demoed device is completely empty afterwards',
    COLS.map(c => d[c].length), [0, 0, 0, 0, 0, 0]);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
