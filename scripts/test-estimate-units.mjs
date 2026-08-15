/* Estimate unit safety.
 *
 * WHAT HAPPENED: the rate card prices pipe per 'Pipe Unit' — one confirmed
 * branch or run — while a drawing takeoff extracts pipe as linear feet and
 * pushes it into the estimate with unit 'lf'. Nothing compared the two, so a
 * 250-foot run was multiplied by the $2,000 per-run rate and the estimate read
 * $500,000. The numbers were both real; only their units disagreed.
 *
 * These are behavioral tests run against the real functions lifted out of
 * index.html, not string matches, because the fault is arithmetic.
 */
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

let passed = 0, failed = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${e}\n       got      ${a}`); }
}

// Lift the shipped implementation out of the page and run it directly.
const start = html.indexOf('const UNIT_DIMENSIONS');
const end = html.indexOf('function unitIssueText');
if (start < 0 || end < 0 || end <= start) {
  console.log('  FAIL unit-safety helpers not found in index.html');
  process.exit(1);
}
const source = html.slice(start, end);
const { unitDimension, unitsCompatible, priceLine } =
  new Function(`${source}; return { unitDimension, unitsCompatible, priceLine };`)();

// The rate-card rows this fault actually involved.
const PIPE = { itemId: 'WTR-CL-001', itemName: 'Copper Type L', unit: 'Pipe Unit', rate: 2000 };
const FIXTURE = { itemId: 'FIX-001', itemName: 'Plumbing Fixture', unit: 'Each', rate: 1500 };

console.log('\nunits are grouped by what they measure');
{
  check('linear feet is a length', unitDimension('lf'), 'length');
  check('LF is the same unit as lf', unitDimension('LF'), 'length');
  check('a spelled-out linear foot is a length', unitDimension('Linear Feet'), 'length');
  check('a pipe unit is a count', unitDimension('Pipe Unit'), 'count');
  check('each is a count', unitDimension('Each'), 'count');
  check('ea is the same unit as Each', unitDimension('ea'), 'count');
  check('an hour is time', unitDimension('hr'), 'time');
  check('an unrecognized unit has no dimension', unitDimension('widgets'), '');
}

console.log('\ncompatibility is decided by dimension, not spelling');
{
  check('lf and Pipe Unit are incompatible', unitsCompatible('lf', 'Pipe Unit'), false);
  check('lf and Each are incompatible', unitsCompatible('lf', 'Each'), false);
  check('Each and Pipe Unit both count', unitsCompatible('Each', 'Pipe Unit'), true);
  check('ea and Each agree', unitsCompatible('ea', 'Each'), true);
  check('feet and lf agree', unitsCompatible('ft', 'lf'), true);
  /* An unknown unit is not treated as a conflict. OTTO has no opinion about it,
     and refusing to price everything it does not recognize would block real
     work for no safety gain. */
  check('an unknown unit is not called a conflict', unitsCompatible('widgets', 'Each'), true);
  check('a missing unit is not called a conflict', unitsCompatible('', 'Each'), true);
}

console.log('\nthe reproduced case');
{
  // 250 linear feet of copper against a $2,000-per-run rate.
  const line = priceLine({ quantity: 250, unit: 'lf' }, PIPE);
  check('footage is never multiplied by a per-run rate', line.lineTotal, 0);
  check('the refusal names both units', line.unitIssue && [line.unitIssue.quantityUnit, line.unitIssue.rateUnit], ['lf', 'Pipe Unit']);
  check('the refusal names the rate involved', line.unitIssue && line.unitIssue.itemId, 'WTR-CL-001');
  check('the absurd total is never produced', line.lineTotal === 500000, false);
}

console.log('\nvalid pricing still works');
{
  const fixtures = priceLine({ quantity: 3, unit: 'Each' }, FIXTURE);
  check('three fixtures at the Each rate price normally', fixtures.lineTotal, 4500);
  check('a valid line raises no issue', fixtures.unitIssue, null);

  const runs = priceLine({ quantity: 4, unit: 'Pipe Unit' }, PIPE);
  check('four pipe runs at the per-run rate price normally', runs.lineTotal, 8000);
  check('a matching unit raises no issue', runs.unitIssue, null);

  const adopted = priceLine({ quantity: 2 }, FIXTURE);
  check('a line with no unit adopts the rate-card unit', adopted.unit, 'Each');
  check('a line with no unit still prices', adopted.lineTotal, 3000);

  const unmatched = priceLine({ quantity: 10, unit: 'lf', unitPrice: 12.5 }, null);
  check('a line with no rate-card match prices as entered', unmatched.lineTotal, 125);
  check('a line with no rate-card match raises no issue', unmatched.unitIssue, null);
}

console.log('\na hand-entered price is the estimator\'s own arithmetic');
{
  /* The guard is deliberately narrow. It fires when OTTO would apply its own
     per-run rate to a length. A price the estimator typed is theirs — the rate
     card simply may not carry a per-foot price — so it is multiplied as given
     rather than second-guessed. */
  const typed = priceLine({ quantity: 250, unit: 'lf', unitPrice: 14 }, PIPE);
  check('a typed per-foot price against footage still prices', typed.lineTotal, 3500);
  check('a typed price raises no unit issue', typed.unitIssue, null);

  // But typing the card's own rate back in is still the card's rate.
  const retyped = priceLine({ quantity: 250, unit: 'lf', unitPrice: 2000 }, PIPE);
  check('re-entering the card rate against footage is still refused', retyped.lineTotal, 0);
}

console.log('\nthe estimate paths route through the guard');
{
  check('the drawing takeoff estimate prices through priceLine',
    /const priced = priceLine\(\{ quantity: material\.qty/.test(html), true);
  check('the estimate form prices through priceLine',
    /function estimateLinesFromForm\(\)[\s\S]{0,400}priceLine\(/.test(html), true);
  check('the drawing review modal prices through priceLine',
    /#mat-rows \.mat-row[\s\S]{0,500}priceLine\(/.test(html), true);
  check('the estimate form has somewhere to show the mismatch',
    html.includes('id="e-unit-warning"'), true);
  check('the mismatch message is bilingual',
    /Unidades incompatibles[\s\S]{0,400}Unit mismatch/.test(html), true);
  // No line total anywhere may still be a bare quantity x price multiplication.
  check('no estimate path multiplies quantity by price outside the guard',
    /lineTotal: Math\.round\(\(parseFloat/.test(html), false);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
