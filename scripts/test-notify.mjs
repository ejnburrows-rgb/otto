import handler from '../api/notify.js';
let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log('  ok   ' + name); }
  else { failed++; console.log('  FAIL ' + name + '\n       expected ' + e + '\n       got      ' + a); }
}
function createRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
}
async function run() {
  console.log('\nTesting api/notify.js');
  const res = createRes();
  await handler({ method: 'POST', body: { channel: 'sms' } }, res);
  check('returns 401 for anonymous access', { status: res.statusCode, error: res.body.error }, { status: 401, error: 'server_auth_not_configured' });
  if (failed > 0) process.exit(1);
}
run();

