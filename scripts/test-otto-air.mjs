import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const index = read('index.html');
const sw = read('sw.js');
const css = read('otto-air.css');
const js = read('otto-air.js');
let passed = 0, failed = 0;
function check(name, ok) {
  if (ok) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name}`); }
}

check('OTTO Air stylesheet is wired last', index.includes('data-otto-air-style'));
check('OTTO Air runtime is wired', index.includes('data-otto-air-runtime'));
check('OTTO Air assets are cached offline', sw.includes("'./otto-air.css'") && sw.includes("'./otto-air.js'"));
check('light palette is airy', css.includes('--air-bg: #F6F8FB') && css.includes('--air-sidebar: #F2F6FA'));
check('dark palette is soft slate rather than black', css.includes('--air-bg: #20262E') && css.includes('--air-sidebar: #232A33'));
check('scheduled is red', css.includes('--air-scheduled: #C84C4C') && css.includes('.ui-job-block.status-scheduled { border-left-color: var(--air-scheduled)'));
check('underway is blue', css.includes('--air-underway: #3C73D9') && css.includes('.ui-job-block.status-inprogress { border-left-color: var(--air-underway)'));
check('completed is green', css.includes('--air-completed: #2F7D5A') && css.includes('.ui-job-block.status-completed { border-left-color: var(--air-completed)'));
check('needs attention is amber', css.includes('--air-attention: #A96A16') && css.includes('.ot-badge.is-error,.ot-badge.is-warning'));
const darkTokenBlock = css.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1] || '';
check('light and dark keep identical structure', darkTokenBlock.length > 0 && !/\b(display|position|grid|flex|padding|margin|width|height|inset)\s*:/.test(darkTokenBlock));
check('personal artwork is atmospheric only', css.includes('otto-personal-today #main::before') && css.includes("julio-pablo.avif") && css.includes("sarays.avif"));
check('Spanish fallback dictionary covers primary navigation', ['Today','Schedule','Jobs','Customers','Money','Operations','Settings'].every(s => js.includes(`'${s}'`)));
check('Spanish fallback covers core workflows', ['Invoice','Estimate','Payment','Customer portal','Service request','Job Brief','Finish closeout'].every(s => js.includes(`'${s}'`)));
check('Spanish translation audit hook exists', js.includes('window.__ottoAirAudit'));
check('sync language is plain English and Spanish', js.includes("'Sync successful':'Everything saved'") && js.includes("'Everything saved':'Todo guardado'"));
check('status semantics never rely on color alone', js.includes("el.setAttribute('aria-label', labels[status])"));
check('English fallback is mutation-idempotent', js.includes('const next = rewriteEnglish(node.nodeValue);') && js.includes('if (next !== node.nodeValue) node.nodeValue = next;') && !js.includes('node.nodeValue = rewriteEnglish(node.nodeValue);'));
check('reduced motion is supported', css.includes('prefers-reduced-motion'));
check('mobile shares the design system', css.includes('@media (max-width: 900px)'));
check('customer portal shares the design system', css.includes('body[data-otto-role="customer"]'));

console.log(`OTTO Air: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
