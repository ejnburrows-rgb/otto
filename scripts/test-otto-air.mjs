import fs from 'node:fs';

const read = p => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const index = read('index.html');
const sw = read('sw.js');
const css = read('otto-air.css');
const readable = read('otto-readability.css');
const js = read('otto-air.js');
let passed = 0, failed = 0;
function check(name, ok) {
  if (ok) { passed++; console.log(`✓ ${name}`); }
  else { failed++; console.error(`✗ ${name}`); }
}

check('OTTO Air stylesheet is wired', index.includes('data-otto-air-style'));
check('OTTO readability stylesheet is wired after Air', index.includes('data-otto-readability-style') && index.indexOf('data-otto-readability-style') > index.indexOf('data-otto-air-style'));
check('OTTO Air runtime is wired', index.includes('data-otto-air-runtime'));
check('OTTO Air assets are cached offline', sw.includes("'./otto-air.css'") && sw.includes("'./otto-air.js'"));
check('OTTO readability is cached offline', sw.includes("'./otto-readability.css'"));
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
check('login always carries the approved OTTO logo', js.includes("login.querySelector('img[src$=\"logo.jpg\"]')") && js.includes("loginLogo.src = './logo.jpg'"));
check('authenticated shell mounts a persistent top-right company mark', js.includes("brand.id = 'otto-global-brand'") && js.includes('right: clamp(18px, 2.5vw, 36px)'));
check('prominent logo remains responsive on phone', js.includes('@media (max-width: 900px)') && js.includes('#otto-global-brand { width: 158px; height: 56px;'));
check('reduced motion is supported', css.includes('prefers-reduced-motion'));
check('mobile shares the design system', css.includes('@media (max-width: 900px)'));
check('customer portal shares the design system', css.includes('body[data-otto-role="customer"]'));

check('body copy is globally larger and readable', readable.includes('--otto-body-size: 16.5px') && readable.includes('--otto-leading: 1.55'));
check('navigation uses a readable 15.5px scale', readable.includes('--otto-nav-size: 15.5px') && readable.includes('.ot-nav-item'));
check('page titles use the 26 to 30px hierarchy', readable.includes('--otto-page-size: clamp(26px, 2.6vw, 30px)'));
check('section headings use a 19px hierarchy', readable.includes('--otto-section-size: 19px'));
check('primary controls keep 48px targets', readable.includes('min-height: 48px !important'));
check('general controls keep at least 44px targets', readable.includes('min-height: 44px !important'));
check('schedule day and week controls are prominent', readable.includes('[data-mode="day"]') && readable.includes('[data-mode="week"]'));
check('context drawer stays readable without losing page context', readable.includes('width: min(520px, 100vw)'));
check('field workspace shares the readable scale', readable.includes('body.otto-field .of-who-name') && readable.includes('body.otto-field .of-btn'));
check('customer portal shares larger targets', readable.includes('body[data-otto-role="customer"]') && readable.includes('.ui-portal-card button'));
check('login uses the same larger control scale', readable.includes('.login input') && readable.includes('.login button'));
check('mobile keeps thumb-sized bottom navigation', readable.includes('.ot-dock-item') && readable.includes('min-height: 56px !important'));
check('readability layer respects reduced motion', readable.includes('@media (prefers-reduced-motion: reduce)'));

console.log(`OTTO Air/readability: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
