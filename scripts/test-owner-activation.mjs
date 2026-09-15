/* Activating protected administrator profiles that have no sign-in address yet.
 *
 * Otto, Julio and Sarays are real people with real profiles and no email. When
 * their addresses exist the work should be: type the address, say whether they
 * need to sign in, send the normal invitation. Nothing more.
 */
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const invite = readFileSync(new URL('../api/invite.js', import.meta.url), 'utf8');

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

console.log('\nrecording an address and granting access are separate decisions');
{
  check('the employee form asks whether sign-in access is required',
    html.includes('id="u-login"'), true);
  check('the question is bilingual',
    /Sign-in access required\?[\s\S]{0,600}|¿Necesita acceso para iniciar sesión\?/.test(html), true);
  check('the answer is stored on the profile',
    /loginAccess/.test(html), true);
  check('an invitation is sent only when access was asked for',
    /if \(email && loginAccess\)/.test(html), true);
  check('saving an address no longer invites by itself',
    /if \(email\) \{\s*const response = await serverFetch\('\/api\/invite'/.test(html), false);
  check('saving without access says so rather than claiming an invitation was sent',
    /No sign-in access yet/.test(html), true);
}

console.log('\nexisting behavior is preserved');
{
  check('a profile with no stored answer still defaults to sending an invitation',
    /u\.loginAccess !== false/.test(html), true);
  check('only an explicit no withholds access',
    /\$\('#u-login'\) \|\| \{\}\)\.value !== 'no'/.test(html), true);
}

console.log('\nno engineering is left for activation day');
{
  check('the invite endpoint takes the address as input rather than a fixed list',
    /const email = String\(body\.email \|\| ''\)/.test(invite), true);
  check('the invite endpoint accepts any existing employee id',
    /const userId = String\(body\.userId \|\| ''\)/.test(invite), true);
  check('accepting an invitation binds the profile to the new identity',
    /auth_uid: invited\.id/.test(invite), true);
  check('an address already registered with the provider is not an error',
    /invite\.status === 422 \|\| invite\.status === 409/.test(invite), true);
  check('the protected administrator profiles remain editable rather than hardcoded',
    /PROTECTED_ADMIN_IDS = new Set\(\['owner-1', 'owner-2', 'ops-1', 'it-admin-ejn'\]\)/.test(html), true);
  check('Sarays keeps the office-manager role when saved',
    /existing && existing\.id === 'ops-1' \? 'office' : 'owner'/.test(html), true);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
