import fs from 'node:fs';
import vm from 'node:vm';
import { patchHrPayrollIndex, patchHrPayrollSw, validateHrPayroll } from './apply-hr-payroll-patch.mjs';

let passed = 0, failed = 0;
const check = (name, ok) => { if (ok) { passed++; console.log(`  ok   ${name}`); } else { failed++; console.error(`  FAIL ${name}`); } };

const rawIndex = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const rawSw = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../otto-hr-payroll.js', import.meta.url), 'utf8');
let labelWrites = 0;
let labelText = 'HR / Payroll';
const label = { get textContent() { return labelText; }, set textContent(value) { labelWrites++; labelText = value; } };
const button = { querySelector: () => label, classList: { toggle() {} } };
const navRoot = { querySelector: () => button };
const navigation = runtime.slice(runtime.indexOf('  function ensureDesktopTab()'), runtime.indexOf('  function injectMoreShortcut()'));
const context = { session: { role: 'owner' }, route: { view: 'home' }, VIEW: 'otto_hr_payroll', document: { querySelector: () => navRoot }, text: en => en };
vm.createContext(context);
vm.runInContext(navigation + '\nensureDesktopTab(); ensureDesktopTab();', context);
check('unchanged HR navigation does not retrigger the DOM observer', labelWrites === 0);
context.text = (_, es) => es;
vm.runInContext('ensureDesktopTab(); ensureDesktopTab();', context);
check('HR navigation updates language exactly once', labelWrites === 1 && labelText === 'RR. HH. / Nómina');
const index = patchHrPayrollIndex(rawIndex);
const sw = patchHrPayrollSw(rawSw);

console.log('HR / Payroll workspace');
for (const [name, ok] of validateHrPayroll(index, sw, runtime)) check(name, ok);
check('policy covers attendance', runtime.includes('Attendance and punctuality') && runtime.includes('Asistencia y puntualidad'));
check('policy covers timekeeping', runtime.includes('Accurate timekeeping') && runtime.includes('Registro exacto del tiempo'));
check('policy covers location accountability', runtime.includes('Jobsite accountability and location') && runtime.includes('Responsabilidad en el sitio y ubicación'));
check('policy covers quality and customer conduct', runtime.includes('Quality of work') && runtime.includes('Customer conduct') && runtime.includes('Calidad del trabajo') && runtime.includes('Conducta con clientes'));
check('policy covers safety and company property', runtime.includes("['6. Safety'") && runtime.includes("['7. Vehicles, tools, materials, and company property'") && runtime.includes("['6. Seguridad'") && runtime.includes("['7. Vehículos, herramientas, materiales y propiedad de la empresa'"));
check('policy covers documentation and integrity', runtime.includes('Photos, documents, and job records') && runtime.includes('Integrity, privacy, and confidentiality') && runtime.includes('Fotos, documentos y registros de trabajo') && runtime.includes('Integridad, privacidad y confidencialidad'));
check('policy acknowledgment status is versioned', runtime.includes('Number(r.version) === POLICY_VERSION') && runtime.includes("r.status === 'acknowledged'"));
check('field employees remain mandatory-policy population', runtime.includes("u.role === 'field'") && runtime.includes('New field employees will be required'));
check('workspace is responsive', runtime.includes('@media(max-width:900px)') && runtime.includes('@media(max-width:520px)'));
check('workspace supports light and dark via OTTO tokens', runtime.includes('var(--ot-surface') && runtime.includes('var(--ot-text-2'));

console.log(`\nHR / Payroll: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
