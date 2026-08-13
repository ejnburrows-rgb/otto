import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed++;
    console.log(`PASS ${name}`);
  } else {
    failed++;
    console.log(`FAIL ${name}`);
  }
}

check('English explains that location is optional', source.includes('Location sharing is optional.'));
check('Spanish explains that location is optional', source.includes('Compartir la ubicación es opcional.'));
check('employee can continue after denying location', source.includes('onclick="declineConsent()"'));
check('denial is stored as a real consent decision', source.includes("locationPermission: granted ? 'granted' : 'denied'"));
check('the app accepts either location decision', source.includes("session.role === 'field' && !hasLocationDecision(session.id)"));
check('background GPS requires a field employee and consent', source.includes("session.role !== 'field' || !locationAllowed(session.id)"));
check('check-in asks for location only after consent', source.includes("const mayShareLocation = session.role === 'field' && locationAllowed(session.id);"));
check('denying browser permission still opens the app', /catch\(e\) \{[\s\S]*?recordLocationDecision\(false\);[\s\S]*?startApp\(\);[\s\S]*?\}/.test(source));
check('no mandatory GPS warning remains', !source.includes('GPS is required') && !source.includes('GPS es obligatorio'));

console.log(`\nLocation consent checks: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
