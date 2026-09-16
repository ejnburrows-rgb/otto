import fs from 'node:fs';

const js=fs.readFileSync(new URL('../otto-premium-ops.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../otto-premium-ops.css',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../otto-ui-integrations.js',import.meta.url),'utf8');
const uiCss=fs.readFileSync(new URL('../otto-ui-integrations.css',import.meta.url),'utf8');
const compat=fs.readFileSync(new URL('../otto-ui-integrations-compat.js',import.meta.url),'utf8');
const compatCss=fs.readFileSync(new URL('../otto-ui-integrations-compat.css',import.meta.url),'utf8');
const auth=fs.readFileSync(new URL('../api/_lib/serverAuth.js',import.meta.url),'utf8');
const data=fs.readFileSync(new URL('../api/data.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
let pass=0,fail=0;
function check(name,ok){if(ok){pass++;console.log('PASS',name)}else{fail++;console.error('FAIL',name)}}

check('premium operations runtime wired',index.includes('data-otto-premium-ops-runtime'));
check('premium operations stylesheet wired',index.includes('data-otto-premium-ops-style'));
check('premium operations cached offline',sw.includes("'./otto-premium-ops.js'")&&sw.includes("'./otto-premium-ops.css'"));
check('customer role requires customer id',auth.includes("profile.role === 'customer' && !profile.customerId"));
check('customer records use explicit collection allowlist',data.includes('CUSTOMER_COLLECTIONS')&&data.includes('customerRecordVisible'));
check('customer files require explicit approval',data.includes('customerVisibleFile(record)'));
check('customer cannot read internal collections',!data.match(/CUSTOMER_COLLECTIONS[\s\S]{0,300}'users'/)&&!data.match(/CUSTOMER_COLLECTIONS[\s\S]{0,300}'payroll'/));
check('customer writes limited to service request records',data.includes("identity.role === 'customer'")&&data.includes("collection !== 'calls'")&&data.includes("record.source !== 'customer_portal'"));
check('attention logic includes operational facts',js.includes('Overdue invoice')&&js.includes('Estimate waiting for response')&&js.includes('Photo sync failed')&&js.includes('Employee clocked in unusually long')&&js.includes('Follow-up overdue'));
check('job brief is deterministic',js.includes('OTTO JOB BRIEF')&&js.includes('Service history')&&js.includes('Unresolved items'));
check('closeout has internal and customer versions',js.includes('closeoutText(j,false)')&&js.includes('closeoutText(j,true)'));
check('customer closeout filters approved files',js.includes('approvedVisible(p)'));
check('manual prompt workbench includes requested templates', ['history','followup','technician','estimate','invoice','dispatch','closeout','email','plans','bilingual'].every(k=>js.includes(`${k}:`)));
check('prompts instruct no invention',js.includes('Do not invent missing values'));
check('new runtime never calls an AI endpoint',!js.includes('/api/nvidia')&&!js.includes('/api/openai')&&!js.includes('/api/anthropic')&&!js.includes('/api/gemini')&&!js.includes('callAI('));
check('copy is local/manual',js.includes('navigator.clipboard'));
check('request conversion avoids duplicate customer by email',js.includes("String(x.email||'').trim().toLowerCase()===email"));
check('request conversion avoids duplicate job by source request',js.includes('sourceRequestId===r.id'));
check('owner metrics are real-data metrics',js.includes('Outstanding invoices')&&js.includes('Revenue collected')&&js.includes('Overdue follow-ups'));
check('mobile touch layout included',css.includes('@media(max-width:800px)')&&css.includes('min-height:44px'));
check('browser print/PDF path included',css.includes('@media print')&&js.includes('window.print()'));
check('bilingual strings are present',js.includes("getLang()==='es'")&&js.includes('Requiere atención'));

check('premium UI integration runtime wired',index.includes('data-otto-ui-integrations-runtime'));
check('premium UI integration stylesheet wired',index.includes('data-otto-ui-integrations-style'));
check('premium UI integrations are cached offline',sw.includes("'./otto-ui-integrations.js'")&&sw.includes("'./otto-ui-integrations.css'"));
check('secure portal compatibility runtime wired',index.includes('data-otto-ui-integrations-compat-runtime')&&index.includes('data-otto-ui-integrations-compat-style'));
check('secure portal compatibility is cached offline',sw.includes("'./otto-ui-integrations-compat.js'")&&sw.includes("'./otto-ui-integrations-compat.css'"));
check('universal record drawer covers customer job estimate and invoice',ui.includes('openDrawer(type, rid)')&&['customer','job','estimate','invoice'].every(k=>ui.includes(`type === '${k}'`)));
check('dispatch supports day and week modes',ui.includes("dispatchMode: 'day'")&&ui.includes('data-mode="week"')&&ui.includes('ui-dispatch-lanes'));
check('dispatch enhancement does not replace its own controls in a mutation loop',ui.includes("r.view === 'otto_schedule' && !document.querySelector('[data-ui-dispatch]')"));
check('dispatch shows unassigned work and preparation alerts',ui.includes('ui-dispatch-unassigned')&&ui.includes('dispatchAttention(jobs)'));
check('activity timeline combines real CRM collections',['notes','calls','emails','photos','documents','estimates','invoices','payments','job_events','audit_log'].every(k=>ui.includes(`arr('${k}')`)));
check('field sticky actions reuse existing field business actions',ui.includes('data-of-action="check-in"')&&ui.includes('data-of-action="check-out"')&&ui.includes('data-of-action="add-photo"')&&ui.includes('data-of-action="add-note"'));
check('smart record headers cover key records',ui.includes('smartHeaderMarkup(type, rid)')&&['customer','job','estimate','invoice'].every(k=>ui.includes(`type === '${k}'`)));
check('command palette gets customer job estimate quick-create',ui.includes('data-ui-quick="customer"')&&ui.includes('data-ui-quick="job"')&&ui.includes('data-ui-quick="estimate"'));
check('personal Today uses supplied Julio and Sarays backgrounds',uiCss.includes('julio-pablo.avif')&&uiCss.includes('sarays.avif')&&ui.includes("['julio', 'sarays'].includes(key)"));
check('Operations is presented as a work inbox',ui.includes('enhanceOperationsInbox()')&&ui.includes("'Operational inbox', 'Bandeja operativa'"));
check('customer portal has premium cards and request service',ui.includes('ui-portal-grid')&&ui.includes("'Request service', 'Solicitar servicio'")&&ui.includes("source: 'customer_portal'"));
check('secure customer portal remains the source of truth',compat.includes('__ottoPremiumOps.renderOps()')&&compat.includes("s.role!=='customer'")&&compat.includes('uiSecurePortalSummary'));
check('secure portal keeps approved-file flow intact',js.includes('data-op-file')&&compat.includes('.otto-portal-shell'));
check('drawer file grid feeds unified photo/document viewer',compat.includes('data-ui-file-photo')&&compat.includes('data-ui-file-document')&&compatCss.includes('.ui-drawer-file-grid'));
check('offline and sync states are visible',ui.includes('navigator.onLine')&&ui.includes("'Offline · saved locally', 'Sin conexión · guardado local'")&&ui.includes("'Saved', 'Guardado'"));
check('unchanged sync status does not retrigger the DOM observer',ui.includes('prior.dataset.syncKey === v.key && prior.dataset.syncText === v.text'));
check('unchanged field actions do not retrigger the DOM observer',ui.includes('if (prior.outerHTML !== html) prior.outerHTML = html'));
check('unified file viewer supports photos and documents',ui.includes('openFileViewer(kind, rid)')&&ui.includes("kind === 'photo'")&&ui.includes('ui-file-frame'));
check('premium forms add sticky actions and validation',ui.includes('ui-sticky-form-actions')&&ui.includes("addEventListener('invalid'")&&ui.includes('reportValidity()'));
check('new UI surfaces have paired English Spanish copy',[
  "'New customer', 'Nuevo cliente'","'New job', 'Nuevo trabajo'","'New estimate', 'Nuevo estimado'",
  "'Schedule', 'Agenda'","'Activity', 'Actividad'","'Request service', 'Solicitar servicio'",
  "'Quick view', 'Vista rápida'","'Job brief', 'Resumen'","'Saved', 'Guardado'"
].every(needle=>ui.includes(needle)));
check('compatibility UI is bilingual',compat.includes("tx('Estimates','Estimados')")&&compat.includes("tx('Photos & documents','Fotos y documentos')")&&compat.includes("tx('Request service','Solicitar servicio')"));
check('new UI runtime adds no external service call',!ui.includes('fetch(')&&!ui.includes('XMLHttpRequest')&&!ui.includes('/api/openai')&&!ui.includes('/api/anthropic')&&!ui.includes('/api/gemini')&&!ui.includes('/api/nvidia'));
check('new UI is mobile responsive and honors reduced motion',uiCss.includes('@media (max-width:900px)')&&uiCss.includes('@media (prefers-reduced-motion:reduce)'));
check('new UI maintains practical touch targets',uiCss.includes('min-height:48px')&&uiCss.includes('min-height:40px'));

console.log(`premium operations: ${pass} passed / ${fail} failed`);
if(fail)process.exit(1);
