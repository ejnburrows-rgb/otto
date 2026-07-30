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
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
