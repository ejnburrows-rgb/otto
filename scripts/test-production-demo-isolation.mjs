import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}`);
  }
}

console.log('\nProduction/demo isolation guard');

// Network, configuration, or authentication failure is not consent to create
// sample customers, jobs, calls, KPI events, or activity.
check('cloud unavailability never enables demo seeding',
  !html.includes('isFreshInstall && !_cloudAvailable'));

// Demo data must be behind an explicit, isolated mode chosen by a user or test.
// Requiring an explicit token keeps future implementations honest while
// allowing the exact UI/state design to evolve.
check('an explicit demo-mode state exists',
  /explicitDemoMode|demoModeEnabled|mode\s*===\s*['"]demo['"]/i.test(html));

check('blank production database starts with no customers',
  /d\.customers\s*=\s*\[\s*\]/.test(html));
check('blank production database starts with no jobs',
  /d\.jobs\s*=\s*\[\s*\]/.test(html));
check('blank production database starts with no calls',
  /d\.calls\s*=\s*\[\s*\]/.test(html));

// Defense in depth: even an explicitly seeded demo database cannot enter the
// cloud upload path. This does not authorize deleting existing cloud rows.
check('demo-tagged database cannot cloudPush',
  /if\s*\(db\.meta\s*&&\s*db\.meta\.demoSeeded\)[\s\S]{0,220}return;/.test(html));

// Production boot must not call either demo-record or KPI seeders unless the
// surrounding condition contains an explicit demo-mode decision.
const bootTail = html.match(/boot\(\)\.then\(\(\)\s*=>\s*\{([\s\S]*?)\}\);\s*<\/script>/)?.[1] || '';
const bootSeeds = /seedDemoRecords|seedMockKPIs/.test(bootTail);
const bootHasExplicitDemo = /explicitDemoMode|demoModeEnabled|mode\s*===\s*['"]demo['"]/i.test(bootTail);
check('production boot has no implicit demo seed call',
  !bootSeeds || bootHasExplicitDemo);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
