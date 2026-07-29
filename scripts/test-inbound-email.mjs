import { readFileSync } from 'node:fs';

const js = readFileSync(new URL('../api/inbound-email.js', import.meta.url), 'utf8');

function extractFunction(name) {
  let start = js.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`could not find ${name}() in inbound-email.js`);
  let depth = 0;
  for (let i = js.indexOf('{', start); i < js.length; i++) {
    if (js[i] === '{') depth++;
    if (js[i] === '}') { depth--; if (depth === 0) return js.slice(start, i + 1); }
  }
  throw new Error(`unbalanced braces in ${name}()`);
}

const stripHtmlSrc = extractFunction('stripHtml');

const factory = new Function(`${stripHtmlSrc}\nreturn stripHtml;`);
const stripHtml = factory();

let passed = 0, failed = 0;
function check(name, actual, expected) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}\n       expected ${JSON.stringify(expected)}\n       got      ${JSON.stringify(actual)}`); }
}

console.log('testing stripHtml');
check('handles undefined', stripHtml(undefined), '');
check('handles null', stripHtml(null), '');
check('handles empty string', stripHtml(''), '');
check('strips <style> tags and their content completely', stripHtml('<style>body { color: red; }</style>Hello'), 'Hello');
check('strips standard HTML tags', stripHtml('<b>Bold</b> and <i>Italic</i>'), 'Bold and Italic');
check('handles HTML tags with attributes', stripHtml('<a href="https://example.com">Link</a>'), 'Link');
check('decodes &nbsp;', stripHtml('Hello&nbsp;World'), 'Hello World');
check('decodes &amp;', stripHtml('A &amp; B'), 'A & B');
check('collapses multiple spaces', stripHtml('Too   many    spaces'), 'Too many spaces');
check('collapses tabs and spaces', stripHtml('Tabs\t \tand spaces'), 'Tabs and spaces');
check('trims leading and trailing whitespace', stripHtml('  <p> Padded </p>  '), 'Padded');

// Need to verify what `Line 1<br>\nLine 2` becomes since the replacement `/ <[^>]+>/g` turns `<br>` into ` `
check('preserves newlines while converting tags', stripHtml('Line 1<br>\nLine 2'), 'Line 1 \nLine 2');

console.log('testing safeParse for prototype pollution');
const safeParseSrc = extractFunction('safeParse');
const safeParseFactory = new Function(`${safeParseSrc}\nreturn safeParse;`);
const safeParseFunc = safeParseFactory();

const polluted = safeParseFunc('__proto__=polluted&constructor=polluted');
check('does not pollute object prototype', {}.polluted, undefined);
check('does not set __proto__ property', polluted.__proto__, undefined);
check('does not set constructor property', polluted.constructor, undefined);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
