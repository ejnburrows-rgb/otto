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
const policy = fs.readFileSync(new URL('../otto-employee-policy-final.js', import.meta.url), 'utf8');
const index = patchHrPayrollIndex(rawIndex);
const sw = patchHrPayrollSw(rawSw);

console.log('HR / Payroll workspace');
for (const [name, ok] of validateHrPayroll(index, sw, runtime, policy)) check(name, ok);

check('HR contains no duplicate policy body', !runtime.includes('Jobsite accountability and location') && !runtime.includes('Responsabilidad en el sitio y ubicación'));
check('canonical policy covers attendance', policy.includes('SECTION 5 — Attendance and Punctuality') && policy.includes('SECCIÓN 5 — Asistencia y Puntualidad'));
check('canonical policy covers truthful timekeeping', policy.includes('Falsifying time records') && policy.includes('Falsificar registros de tiempo'));
check('canonical policy covers GPS / location accountability', policy.includes('GPS in Company Vehicles and Devices') && policy.includes('GPS en Vehículos y Dispositivos de la Empresa'));
check('canonical policy covers photographic documentation', policy.includes('Photographic Documentation') && policy.includes('Documentación Fotográfica'));
check('canonical policy covers workplace safety', policy.includes('SECTION 6 — Workplace Safety') && policy.includes('SECCIÓN 6 — Seguridad Laboral'));
check('canonical policy covers company property and confidentiality', policy.includes('SECTION 8 — Company Property and Confidentiality') && policy.includes('SECCIÓN 8 — Propiedad de la Empresa y Confidencialidad'));
check('canonical policy covers disciplinary conduct', policy.includes('SECTION 9 — Disciplinary Conduct') && policy.includes('SECCIÓN 9 — Conducta Disciplinaria'));
check('canonical digital acknowledgment is bilingual', policy.includes('SECTION 10 — Digital Acknowledgment') && policy.includes('SECCIÓN 10 — Reconocimiento Digital') && policy.includes('Approved') && policy.includes('Aprobado'));
check('acknowledgment status is versioned', runtime.includes('Number(r.version) === version') && runtime.includes("r.status === 'acknowledged'"));
check('field employees remain mandatory-policy population', runtime.includes("u.role === 'field'") && runtime.includes('New field employees must review and approve'));
check('workspace is responsive', runtime.includes('@media(max-width:900px)') && runtime.includes('@media(max-width:520px)'));
check('workspace supports light and dark via OTTO tokens', runtime.includes('var(--ot-surface') && runtime.includes('var(--ot-text-2'));
check('HR renders only the canonical final document', runtime.includes('__ottoFinalEmployeePolicy.render') && policy.includes('Source of truth: OTTO_Codigo_de_Conducta_Empleado_Final_2026'));

console.log(`\nHR / Payroll: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
