// Tests for the sign-in code (PIN) handling in index.html.
//
// Pulls the real functions out of index.html and runs them against Node's own
// Web Crypto, which is the same API the browser provides. Run with:
//   node scripts/test-pin.mjs

import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function extractFunction(name) {
  let start = html.indexOf(`async function ${name}(`);
  if (start < 0) start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`could not find ${name}() in index.html`);
  let depth = 0;
  for (let i = html.indexOf('{', start); i < html.length; i++) {
    if (html[i] === '{') depth++;
    if (html[i] === '}') { depth--; if (depth === 0) return html.slice(start, i + 1); }
  }
  throw new Error(`unbalanced braces in ${name}()`);
}

const names = ['randomSalt', 'hashPin', 'setUserPin', 'verifyPin', 'hasPin',
  'pinLockRemainingMs', 'recordFailedPin', 'clearFailedPins', '_attemptKey'];
const src = names.map(extractFunction).join('\n');

// Minimal browser stand-ins.
const store = new Map();
const sandbox = {
  window: { crypto: webcrypto },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  },
  TextEncoder,
  console
};

const factory = new Function(...Object.keys(sandbox), `
  const _canHash = true;
  const MAX_PIN_ATTEMPTS = 5, LOCKOUT_MS = 60000;
  ${src}
  return { randomSalt, hashPin, setUserPin, verifyPin, hasPin, pinLockRemainingMs, recordFailedPin, clearFailedPins };
`);
const pin = factory(...Object.values(sandbox));

let passed = 0, failed = 0;
function check(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${JSON.stringify(expected)}\n       got      ${JSON.stringify(actual)}`); }
}

console.log('\nstoring a code');
{
  const user = { id: 'u1', name: 'Otto', pin: '0721' };
  await pin.setUserPin(user, '0721');
  check('the readable PIN is removed', user.pin, undefined);
  check('a fingerprint is stored', typeof user.pinHash === 'string' && user.pinHash.length === 64, true);
  check('a salt is stored', typeof user.pinSalt === 'string' && user.pinSalt.length === 32, true);
  check('the PIN cannot be read back out of the record',
    JSON.stringify(user).includes('0721'), false);
}

console.log('\nchecking a code');
{
  const user = { id: 'u2' };
  await pin.setUserPin(user, '1234');
  check('correct PIN is accepted', await pin.verifyPin(user, '1234'), true);
  check('wrong PIN is rejected', await pin.verifyPin(user, '9999'), false);
  check('empty PIN is rejected', await pin.verifyPin(user, ''), false);
}

console.log('\ntwo people, same PIN');
{
  const a = { id: 'a' }, b = { id: 'b' };
  await pin.setUserPin(a, '0000');
  await pin.setUserPin(b, '0000');
  check('their stored fingerprints differ (salts do their job)', a.pinHash === b.pinHash, false);
  check('but both still sign in', [await pin.verifyPin(a, '0000'), await pin.verifyPin(b, '0000')], [true, true]);
}

console.log('\nexisting users created before this change');
{
  // An old record still carrying a readable PIN must keep working, then convert.
  const old = { id: 'old', pin: '0715' };
  check('old readable PIN still signs in before conversion', await pin.verifyPin(old, '0715'), true);
  await pin.setUserPin(old, '0715');
  check('after conversion the same PIN still signs in', await pin.verifyPin(old, '0715'), true);
  check('and the readable copy is gone', old.pin, undefined);
}

console.log('\nthe owner changing someone else\'s code');
{
  const user = { id: 'u3' };
  await pin.setUserPin(user, '1111');
  await pin.setUserPin(user, '2222');
  check('the old code stops working', await pin.verifyPin(user, '1111'), false);
  check('the new code works', await pin.verifyPin(user, '2222'), true);
}

console.log('\nguess limiting');
{
  store.clear();
  check('not locked to start with', pin.pinLockRemainingMs('u4'), 0);
  for (let i = 0; i < 4; i++) pin.recordFailedPin('u4');
  check('still allowed after 4 wrong tries', pin.pinLockRemainingMs('u4'), 0);
  pin.recordFailedPin('u4');
  check('locked out on the 5th wrong try', pin.pinLockRemainingMs('u4') > 0, true);
  check('lockout is about a minute', pin.pinLockRemainingMs('u4') > 58000, true);
  pin.clearFailedPins('u4');
  check('a correct sign-in clears the lockout', pin.pinLockRemainingMs('u4'), 0);
}
{
  store.clear();
  for (let i = 0; i < 5; i++) pin.recordFailedPin('userA');
  check('one person being locked out does not lock anybody else', pin.pinLockRemainingMs('userB'), 0);
}

console.log('\nthe extra owner code (MFA) gets the same treatment');
{
  const owner = { id: 'o1' };
  await pin.setUserPin(owner, '4321', 'mfaPin');
  check('extra code is stored as a fingerprint too', typeof owner.mfaPinHash === 'string', true);
  check('and is not readable', JSON.stringify(owner).includes('4321'), false);
  check('correct extra code accepted', await pin.verifyPin(owner, '4321', 'mfaPin'), true);
  check('wrong extra code rejected', await pin.verifyPin(owner, '1111', 'mfaPin'), false);
  check('hasPin sees it', pin.hasPin(owner, 'mfaPin'), true);
  check('hasPin is false for someone without one', pin.hasPin({ id: 'x' }, 'mfaPin'), false);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
