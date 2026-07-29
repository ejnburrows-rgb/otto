#!/usr/bin/env node
//
// Proves the cloud database is genuinely switched on AND genuinely private.
// Run this AFTER following docs/ACTIVATE-CLOUD.md.
//
//   node scripts/verify-supabase.mjs
//
// Optional settings, all read from the environment so no key is ever typed
// into a file in this repository:
//
//   SUPABASE_URL        the project URL. Defaults to the otto-live project.
//   SUPABASE_ANON_KEY   the PUBLIC "anon" key from Supabase -> Settings -> API.
//                       Supplying it makes check 1 much stronger: it proves the
//                       key a website visitor could copy out of any page still
//                       gets them nothing.
//   SITE_URL            the live site. Defaults to https://otto-kohl.vercel.app
//
// Exits 0 only if every check passes. Any failure exits 1 and says, in plain
// language, what is wrong and what to do about it.

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://huaehartegjbihyygqgb.supabase.co').replace(/\/$/, '');
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SITE_URL = (process.env.SITE_URL || 'https://otto-kohl.vercel.app').replace(/\/$/, '');

// The counts rescued from Firebase and loaded into Supabase on 2026-07-21.
// See docs/STATUS.md section 3.1b.
const EXPECTED = { customers: 3, jobs: 3, invoices: 1, users: 19, audit_log: 48 };

let failures = 0;
const pass = (m, d) => console.log(`  PASS  ${m}${d ? ` — ${d}` : ''}`);
const fail = (m, d) => { failures++; console.log(`  FAIL  ${m}${d ? ` — ${d}` : ''}`); };

async function main() {
  console.log(`\nChecking the OTTO cloud database`);
  console.log(`  database : ${SUPABASE_URL}`);
  console.log(`  live site: ${SITE_URL}`);
  console.log(`  anon key : ${ANON_KEY ? 'supplied' : 'NOT supplied (check 1 will be weaker)'}\n`);

  await checkPublicIsLockedOut();
  await checkApiDataIsConfigured();

  console.log('');
  if (failures) {
    console.log(`${failures} check(s) FAILED. The cloud is not ready. Details above.\n`);
    process.exit(1);
  }
  console.log('Everything passed. The cloud database is on and the public cannot read it.\n');
}

// ── 1. The public must NOT be able to read customer data ───────────────────
// A 200 here is the exact failure that made the old Firebase database a data
// breach. A 404 is NOT a pass — it only means the table is missing, which would
// also make the app fail once it is created.
async function checkPublicIsLockedOut() {
  console.log('1. Can a member of the public read the customer table?');
  const url = `${SUPABASE_URL}/rest/v1/customers?select=id`;
  const headers = ANON_KEY ? { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } : {};

  let res;
  try {
    res = await fetch(url, { headers });
  } catch (e) {
    fail('could not reach the database at all', String(e.message || e));
    console.log('        Check SUPABASE_URL is right and that you are online.');
    return;
  }

  const body = await res.text();

  if (res.status === 200) {
    fail('THE PUBLIC CAN READ YOUR CUSTOMER DATA', `HTTP 200 from ${url}`);
    console.log('        This is the same fault that made the old Firebase database a breach.');
    console.log('        Fix it before anyone uses the app: re-run supabase/migrations/0001_init_schema.sql,');
    console.log('        which turns on Row Level Security and revokes access from the public role.');
    return;
  }

  if (res.status === 404) {
    fail('the customers table does not exist', 'HTTP 404');
    console.log('        A refusal would be good news, but 404 is not a refusal — it means the');
    console.log('        tables were never created. Run supabase/migrations/0001_init_schema.sql');
    console.log('        in the Supabase SQL editor, then run this script again.');
    return;
  }

  if (res.status === 401 || res.status === 403) {
    pass('the public is refused', `HTTP ${res.status}`);
  } else if (/permission denied|not authorized|JWT/i.test(body)) {
    pass('the public is refused', `HTTP ${res.status} with a permission error`);
  } else {
    fail('unexpected answer — cannot confirm the public is locked out',
      `HTTP ${res.status}: ${body.slice(0, 140)}`);
    return;
  }

  if (!ANON_KEY) {
    console.log('        Note: no anon key was supplied, so this only proves a request with NO key');
    console.log('        is refused. Set SUPABASE_ANON_KEY and re-run to prove the public key is');
    console.log('        refused too — that is the test that actually matters.');
  }
}

// ── 2. The live site must be able to reach the database ────────────────────
async function checkApiDataIsConfigured() {
  console.log('\n2. Can the live site reach the database, and is the data all there?');
  const url = `${SITE_URL}/api/data`;

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    fail('could not reach the live site', String(e.message || e));
    return;
  }

  if (res.status === 503) {
    fail('the live site has no database settings', 'HTTP 503 no_server_key');
    console.log('        SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are missing from Vercel, or');
    console.log('        the project has not been redeployed since they were added.');
    console.log('        See docs/ACTIVATE-CLOUD.md steps 3 and 4.');
    return;
  }

  if (!res.ok) {
    fail('the live site returned an error', `HTTP ${res.status}`);
    return;
  }
  pass('the live site reaches the database', `HTTP 200, not 503`);

  let data;
  try {
    data = await res.json();
  } catch (e) {
    fail('the answer was not readable data', String(e.message || e));
    return;
  }

  console.log('\n3. Do the record counts match what was rescued from the old database?');
  for (const [table, want] of Object.entries(EXPECTED)) {
    const rows = data[table];
    if (!Array.isArray(rows)) {
      fail(`${table}: not returned`, 'the server could not read this table');
      continue;
    }
    // Soft-deleted records are kept as tombstones so deletions can travel
    // between devices. They are not live records, so they are not counted.
    const live = rows.filter((r) => r && r.deleted !== true).length;
    if (live === want) pass(`${table}: ${live}`);
    else fail(`${table}: expected ${want}, found ${live}`,
      live === 0 ? 'the table is empty — was the seed file loaded?' : 'count does not match');
  }
}

main().catch((e) => {
  console.error('\nThe check itself crashed:', e);
  process.exit(1);
});
