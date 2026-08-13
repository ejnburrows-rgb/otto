import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const homeRuntime = fs.readFileSync(new URL('../otto-home.js', import.meta.url), 'utf8');
let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
  }
}

console.log('employee policy acknowledgment');

check('a current version controls whether the gate appears',
  /const EMPLOYEE_POLICY_VERSION = \d+;/.test(html)
  && /c\.version === EMPLOYEE_POLICY_VERSION/.test(html));
check('only field workers missing the current acknowledgment are gated',
  /session\.role === 'field' && !hasConsent\(session\.id\)/.test(html));
check('the gate uses the real local OTTO logo',
  /class="policy-brand"><img src="\.\/logo\.jpg"/.test(html));
check('the policy content is inside its own scroll container',
  /class="policy-scroll" id="policy-scroll"/.test(html)
  && /overflow-y:auto/.test(html));
check('reaching the end is measured before confirmation is enabled',
  /scrollHeight - scroller\.scrollTop - scroller\.clientHeight <= 24/.test(html)
  && /confirm\.disabled = !_policyGate\.reachedEnd/.test(html));
check('finger signing uses pointer events on a touch-safe canvas',
  /id="policy-signature"/.test(html)
  && /touch-action:none/.test(html)
  && /addEventListener\('pointerdown'/.test(html)
  && /addEventListener\('pointermove'/.test(html));
check('the acknowledgment button requires reading, signature, and checkbox',
  /const ready = _policyGate\.reachedEnd && _policyGate\.signed && confirm && confirm\.checked/.test(html)
  && /id="policy-acknowledge"[^>]+disabled/.test(html));
check('the saved record carries status, timestamp, version, and signature',
  /type: 'employee_code_of_conduct'/.test(html)
  && /status: 'acknowledged'/.test(html)
  && /acknowledgedAt/.test(html)
  && /signatureDataUrl: canvas\.toDataURL\('image\/png'\)/.test(html));
check('the record is durable before the gate releases',
  /async function acceptConsent\(\)/.test(html)
  && /await idbPut\('kv', 'db', snapshot\)/.test(html)
  && /localStorage\.setItem\('otto_db_backup', snapshot\)/.test(html));
check('the employee profile is linked to the acknowledgment record',
  /policyAcknowledgment: profileStatus/.test(html)
  && /recordId: record\.id/.test(html));
check('owners and office staff can see acknowledged or pending on the worker profile',
  /const policyAck = currentPolicyAcknowledgment\(w\.id\)/.test(html)
  && /Acknowledged/.test(html)
  && /Pending/.test(html));
check('the gate has no skip, close, or not-now control',
  !/policy-(?:skip|close|not-now)/.test(html));
check('the delayed home enhancement cannot overwrite the active gate',
  /classList\.contains\('policy-gate-active'\)\) return/.test(homeRuntime));
check('the inline boot completion cannot overwrite the active gate',
  /if \(!\$\('#app'\)\.classList\.contains\('policy-gate-active'\)\) render\(\)/.test(html));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
