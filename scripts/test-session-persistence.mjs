import fs from 'node:fs';
import { patchSessionPersistence, validateSessionPersistence } from './apply-session-persistence-patch.mjs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const patched = patchSessionPersistence(html);
let passed = 0, failed = 0;
function check(name, ok) { if (ok) { passed++; console.log(`✓ ${name}`); } else { failed++; console.error(`✗ ${name}`); } }
for (const [name, ok] of validateSessionPersistence(patched)) check(name, ok);
const storageStart = patched.indexOf('const ottoAuthStorage = {');
const storageEnd = patched.indexOf('async function initCloudAuth()', storageStart);
const storageCode = storageStart >= 0 && storageEnd > storageStart ? patched.slice(storageStart, storageEnd) : '';
check('session mirror stores provider tokens only and never invents an owner', storageCode.length > 0 && !/role\s*:\s*['"]owner['"]/.test(storageCode));
check('explicit sign-out still clears the app profile marker', /async function signOut\(\)[\s\S]*?localStorage\.removeItem\('otto_session'\)/.test(patched));
check('no-session does not silently authorize a remembered owner', !/cloudOutcome\.status === 'no-session'[\s\S]{0,180}session\s*=/.test(patched));
check('server profile is still required for cloud sign-in', patched.includes("if (result && result.profile && result.profile.id)"));
console.log(`\nSession persistence: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);