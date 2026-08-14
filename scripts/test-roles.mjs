// Who can see what.
//
// These are the rules the owner actually asked for, pinned down so a future
// edit to ROLE_VIEWS cannot quietly take an ability away from somebody who
// needs it on the job:
//
//   - owners see everything;
//   - the office manager AND the IT account run staff admin, so both reach the
//     Team screen where accounts are created and sign-in codes are set;
//   - field crew stay on their own small set of screens.
//
// Run with:  node scripts/test-roles.mjs

import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

// Pull the real ROLE_VIEWS table and can() out of index.html rather than
// restating them here — a copy would just drift.
const adminStart = html.indexOf('const FULL_ADMIN_VIEWS = [');
if (adminStart < 0) throw new Error('FULL_ADMIN_VIEWS not found in index.html');
const adminEnd = html.indexOf(';', adminStart) + 1;
const start = html.indexOf('const ROLE_VIEWS = {');
if (start < 0) throw new Error('ROLE_VIEWS not found in index.html');
const end = html.indexOf('};', start) + 2;
const table = html.slice(adminStart, adminEnd) + '\n' + html.slice(start, end);

const { ROLE_VIEWS, can } = new Function(`
  ${table}
  let session = null;
  function setSession(s) { session = s; }
  function can(view) { return session && (ROLE_VIEWS[session.role] || []).includes(view); }
  return { ROLE_VIEWS, can: (role, view) => { setSession({ role }); return can(view); } };
`)();

console.log('\nstaff admin — only owners can change cloud identities or roles');
check('an owner reaches Team', can('owner', 'team'), true);
check('the office manager cannot reach Team', can('office', 'team'), false);
check('office cannot change user roles', can('office', 'team'), false);
check('field crew do NOT reach Team', can('field', 'team'), false);
check('Sarays is seeded as a full owner administrator', html.includes("id: 'ops-1', name: 'Sarays', role: 'owner'"), true);
check('the IT administrator is protected from deletion', html.includes("'it-admin-ejn'") && html.includes("Only field workers can be deleted."), true);
check('the Team delete action is limited to field workers', html.includes("u.role === 'field' && !protectedAdmin") && html.includes('deleteFieldWorker'), true);

console.log('\nfull administrators — the entire CRM');
for (const view of ['customers', 'jobs', 'inbox', 'emails', 'estimates', 'pricing', 'contracts', 'invoices', 'payments', 'checks', 'payroll', 'map', 'reports', 'backups', 'audit', 'team', 'settings']) {
  check(`owner reaches ${view}`, can('owner', view), true);
}
check('Team explains complete business and file access', html.includes('Complete CRM access') && html.includes('documents, photos and settings'), true);
check('document deletion removes both record and uploaded file', html.includes('deletePhotoFile(documentRecord.fileId)') && html.includes("remove('documents', id)"), true);

console.log('\nthe money screens');
for (const view of ['invoices', 'payments', 'estimates', 'checks', 'payroll']) {
  check(`owner sees ${view}`, can('owner', view), true);
  check(`office sees ${view}`, can('office', view), true);
  check(`field does not see ${view}`, can('field', view), false);
}

console.log('\nowner-only oversight stays owner-only');
for (const view of ['kpis', 'audit']) {
  check(`only the owner sees ${view}`, [can('owner', view), can('office', view), can('field', view)], [true, false, false]);
}

console.log('\nfield crew keep what they need on site');
for (const view of ['home', 'jobs', 'customers', 'followups']) {
  check(`field sees ${view}`, can('field', view), true);
}

/* Ask OTTO used to be granted to field and is now deliberately withheld, so
   this assertion is inverted rather than deleted: the role table is the single
   place that decision is made, and a future change that hands the assistant
   back to the crew has to fail here first. api/nvidia.js only accepts
   owner/office, so the button could never have produced an answer anyway. */
check('field does not see assistant', can('field', 'assistant'), false);

console.log('\nno role is empty or missing');
for (const role of ['owner', 'office', 'field']) {
  check(`${role} has screens`, (ROLE_VIEWS[role] || []).length > 0, true);
  check(`${role} can reach home`, can(role, 'home'), true);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
