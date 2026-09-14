import fs from 'node:fs';

const js=fs.readFileSync(new URL('../otto-premium-ops.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../otto-premium-ops.css',import.meta.url),'utf8');
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
console.log(`premium operations: ${pass} passed / ${fail} failed`);
if(fail)process.exit(1);
