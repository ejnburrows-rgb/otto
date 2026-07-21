// Tests for the cloud sync merge rules.
//
// These run the real merge functions used by the app, with made-up records, so
// they need no database and no browser. Run with:  node scripts/test-merge.mjs
//
// The merge rules are where sync bugs hide, and sync bugs lose customer records
// silently — so every rule in docs/superpowers/specs/2026-07-21-conflict-safe-sync-design.md
// has a test here.

import { mergeRecords, mergeCollections, isVisible } from './sync-merge.mjs';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

const OLD = '2026-07-01T10:00:00.000Z';
const NEW = '2026-07-02T10:00:00.000Z';

console.log('\nmergeRecords — one record, two versions');
check('newer wins over older',
  mergeRecords({ id: 'a', name: 'old', updated: OLD }, { id: 'a', name: 'new', updated: NEW }).name, 'new');
check('older does not overwrite newer',
  mergeRecords({ id: 'a', name: 'new', updated: NEW }, { id: 'a', name: 'old', updated: OLD }).name, 'new');
check('missing local returns incoming',
  mergeRecords(undefined, { id: 'a', name: 'x', updated: NEW }).name, 'x');
check('missing incoming returns local',
  mergeRecords({ id: 'a', name: 'x', updated: NEW }, undefined).name, 'x');
check('identical timestamps keep local (never silently discard)',
  mergeRecords({ id: 'a', name: 'mine', updated: NEW }, { id: 'a', name: 'theirs', updated: NEW }).name, 'mine');
check('record with no timestamp treated as oldest',
  mergeRecords({ id: 'a', name: 'no-stamp' }, { id: 'a', name: 'stamped', updated: OLD }).name, 'stamped');

console.log('\nmergeCollections — the bug this whole change exists to fix');
{
  // Two people, two different customers, at the same time.
  const local = [{ id: 'c1', name: 'Garcia', updated: NEW }];
  const incoming = [{ id: 'c2', name: 'Patel', updated: NEW }];
  const out = mergeCollections(local, incoming).sort((x, y) => x.id.localeCompare(y.id));
  check('both survive — neither person is erased', out.map(r => r.id), ['c1', 'c2']);
}
{
  const local = [{ id: 'c1', name: 'mine', updated: OLD }];
  const incoming = [{ id: 'c1', name: 'theirs', updated: NEW }];
  check('same record, later edit wins', mergeCollections(local, incoming)[0].name, 'theirs');
}
{
  const local = [{ id: 'c1', updated: NEW }, { id: 'c2', updated: NEW }];
  check('empty incoming keeps everything local', mergeCollections(local, []).length, 2);
}
{
  const incoming = [{ id: 'c1', updated: NEW }];
  check('empty local accepts everything incoming', mergeCollections([], incoming).length, 1);
}
{
  // A failed read arrives as null, NOT an empty list. It must change nothing.
  const local = [{ id: 'c1', updated: NEW }, { id: 'c2', updated: NEW }];
  check('null incoming (server could not read) keeps local untouched',
    mergeCollections(local, null).length, 2);
}
{
  // A record vanishing from the incoming list NEVER means "delete it". Absence
  // is indistinguishable from a partial read, and guessing wrong loses data.
  // Emptying a collection happens by marking records deleted, tested below.
  const local = [{ id: 'c1', updated: OLD }];
  check('a record missing from incoming is NOT treated as deleted',
    mergeCollections(local, []).length, 1);
}
{
  // This is how a collection actually empties: every record marked deleted,
  // which then hides everywhere via isVisible.
  const local = [{ id: 'c1', updated: OLD }, { id: 'c2', updated: OLD }];
  const incoming = [{ id: 'c1', updated: NEW, deleted: true }, { id: 'c2', updated: NEW, deleted: true }];
  const merged = mergeCollections(local, incoming);
  check('a collection emptied by deleting its records shows as empty',
    merged.filter(isVisible).length, 0);
  check('but the data is still there underneath, recoverable', merged.length, 2);
}

console.log('\ndeletes — soft delete, must not resurrect');
{
  const local = [{ id: 'c1', name: 'Garcia', updated: NEW, deleted: true }];
  const incoming = [{ id: 'c1', name: 'Garcia', updated: OLD }];
  const out = mergeCollections(local, incoming);
  check('a delete is not undone by an older copy from another phone', out[0].deleted, true);
}
{
  const local = [{ id: 'c1', updated: OLD }];
  const incoming = [{ id: 'c1', updated: NEW, deleted: true }];
  check('a newer delete from another phone applies', mergeCollections(local, incoming)[0].deleted, true);
}
{
  const local = [{ id: 'c1', updated: OLD, deleted: true }];
  const incoming = [{ id: 'c1', updated: NEW, deleted: false }];
  check('a newer un-delete applies (restore works)', mergeCollections(local, incoming)[0].deleted, false);
}

console.log('\nisVisible — deleted records must be invisible everywhere');
check('normal record is visible', isVisible({ id: 'a' }), true);
check('deleted record is hidden', isVisible({ id: 'a', deleted: true }), false);
check('explicitly undeleted record is visible', isVisible({ id: 'a', deleted: false }), true);

console.log('\noffline — device edits offline, then reconnects');
{
  const local = [{ id: 'c1', name: 'edited offline', updated: NEW }];
  const incoming = [{ id: 'c1', name: 'server copy', updated: OLD }, { id: 'c2', name: 'added by office', updated: OLD }];
  const out = mergeCollections(local, incoming).sort((x, y) => x.id.localeCompare(y.id));
  check('offline edit survives reconnect', out[0].name, 'edited offline');
  check('and the office record still arrives', out[1].name, 'added by office');
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
