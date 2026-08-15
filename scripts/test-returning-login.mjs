/* Returning-user identity resolution.
 *
 * The failure this covers: an accepted employee whose Supabase Auth account is
 * recreated arrives with a new auth UUID. The stored auth_uid no longer matches
 * anything, and before this was fixed the only route back in was a duplicate
 * employee record. Recovery by verified email fixes that, but it is exactly the
 * kind of fallback that turns into account takeover if it is loose, so every
 * boundary around it is asserted here rather than assumed.
 */
import { getServerIdentity } from '../api/_lib/serverAuth.js';

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

process.env.SUPABASE_URL = 'https://project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-secret';

const AUTH = {
  'tok-owner-current': { id: 'auth-owner', email: 'otto@example.com' },
  'tok-owner-recreated': { id: 'auth-owner-NEW', email: 'otto@example.com' },
  'tok-field-current': { id: 'auth-field', email: 'worker@example.com' },
  'tok-field-recreated': { id: 'auth-field-NEW', email: 'worker@example.com' },
  'tok-stranger': { id: 'auth-stranger', email: 'nobody@example.com' },
  'tok-twin': { id: 'auth-twin', email: 'twin@example.com' },
  'tok-disabled': { id: 'auth-disabled-NEW', email: 'disabled@example.com' },
  'tok-deleted': { id: 'auth-deleted-NEW', email: 'deleted@example.com' },
  'tok-blank': { id: 'auth-blank', email: '   ' },
};

function profiles() {
  return [
    { id: 'owner-1', auth_uid: 'auth-owner', data: { id: 'owner-1', name: 'Otto', role: 'owner', email: 'otto@example.com', active: true } },
    { id: 'worker-1', auth_uid: 'auth-field', data: { id: 'worker-1', name: 'Worker', role: 'field', email: 'worker@example.com', active: true } },
    // Two rows share an address: nobody may claim either.
    { id: 'twin-a', auth_uid: null, data: { id: 'twin-a', role: 'field', email: 'twin@example.com', active: true } },
    { id: 'twin-b', auth_uid: null, data: { id: 'twin-b', role: 'field', email: 'twin@example.com', active: true } },
    { id: 'off-1', auth_uid: 'auth-disabled-OLD', data: { id: 'off-1', role: 'field', email: 'disabled@example.com', active: false } },
    { id: 'gone-1', auth_uid: 'auth-deleted-OLD', data: { id: 'gone-1', role: 'field', email: 'deleted@example.com', deleted: true } },
    // Otto, Julio and Sarays look like this until real addresses exist.
    { id: 'pending-1', auth_uid: null, data: { id: 'pending-1', role: 'owner', email: '', active: true } },
  ];
}

let patched = [];
function install() {
  patched = [];
  global.fetch = async (url, options = {}) => {
    const href = String(url);
    if (href.endsWith('/auth/v1/user')) {
      const token = String(options.headers.Authorization || '').replace(/^Bearer\s+/, '');
      const user = AUTH[token];
      return user
        ? new Response(JSON.stringify(user), { status: 200 })
        : new Response('{}', { status: 401 });
    }
    if (href.includes('/rest/v1/users?select=')) return new Response(JSON.stringify(profiles()), { status: 200 });
    if (href.includes('/rest/v1/users?id=eq.') && options.method === 'PATCH') {
      patched.push({ id: decodeURIComponent(href.split('id=eq.')[1].split('&')[0]), body: JSON.parse(options.body) });
      return new Response('[]', { status: 200 });
    }
    throw new Error('unexpected upstream: ' + href);
  };
}

const req = (token) => ({ headers: token ? { authorization: `Bearer ${token}` } : {} });

console.log('\nReturning-user identity resolution');

// 1. The ordinary case: the stored auth_uid still matches, so nothing is rebound.
install();
{
  const identity = await getServerIdentity(req('tok-owner-current'));
  check('a returning owner resolves to the same profile', identity && [identity.userId, identity.role], ['owner-1', 'owner']);
  check('a matching auth_uid rebinds nothing', patched.length, 0);
}
install();
{
  const identity = await getServerIdentity(req('tok-field-current'));
  check('a returning field worker resolves to the same profile', identity && [identity.userId, identity.role], ['worker-1', 'field']);
  check('a returning field worker rebinds nothing', patched.length, 0);
}

// 2. The defect: a recreated Supabase account arrives with a new UUID.
install();
{
  const identity = await getServerIdentity(req('tok-owner-recreated'));
  check('a recreated owner identity recovers the SAME profile', identity && identity.userId, 'owner-1');
  check('the recovered owner keeps the stored role', identity && identity.role, 'owner');
  check('the profile is relinked to the new auth UUID', patched.map(p => [p.id, p.body.auth_uid]), [['owner-1', 'auth-owner-NEW']]);
}
install();
{
  const identity = await getServerIdentity(req('tok-field-recreated'));
  check('a recreated field identity recovers the SAME profile', identity && identity.userId, 'worker-1');
  check('the recovered worker keeps the field role', identity && identity.role, 'field');
  check('no second employee record is created', patched.map(p => p.id), ['worker-1']);
}

// 3. An address OTTO does not know reaches nothing.
install();
{
  const identity = await getServerIdentity(req('tok-stranger'));
  check('an unknown verified email is refused', identity, null);
  check('an unknown email rebinds nothing', patched.length, 0);
}

// 4. Ambiguity is refused rather than resolved.
install();
{
  const identity = await getServerIdentity(req('tok-twin'));
  check('an address held by two profiles claims neither', identity, null);
  check('an ambiguous address rebinds nothing', patched.length, 0);
}

// 5. Access that was withdrawn stays withdrawn — and the withdrawn profile is
//    never rebound on its way to being refused.
install();
{
  const identity = await getServerIdentity(req('tok-disabled'));
  check('a deactivated profile cannot be recovered by email', identity, null);
  check('a deactivated profile is never relinked', patched.length, 0);
}
install();
{
  const identity = await getServerIdentity(req('tok-deleted'));
  check('a deleted profile cannot be recovered by email', identity, null);
  check('a deleted profile is never relinked', patched.length, 0);
}

// 6. Profiles awaiting a real address must not be claimable by a blank one.
install();
{
  const identity = await getServerIdentity(req('tok-blank'));
  check('a blank verified email claims no profile', identity, null);
  check('a blank email rebinds nothing', patched.length, 0);
}

// 7. No credential, no identity.
install();
{
  check('an anonymous request resolves to no identity', await getServerIdentity(req(null)), null);
  check('an invalid token resolves to no identity', await getServerIdentity(req('tok-garbage')), null);
  check('a refused caller never reaches the profile table', patched.length, 0);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
