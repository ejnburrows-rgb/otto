import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX=new URL('../index.html',import.meta.url);
const SW=new URL('../sw.js',import.meta.url);
const SHELL=new URL('../otto-shell.js',import.meta.url);
const UI=new URL('../otto-ui-integrations.js',import.meta.url);
const V='5';

function patchIndex(src){
 let out=src
   .replace(/\s*<script\b[^>]*data-otto-premium-ops-bridge[^>]*>[\s\S]*?<\/script>\s*/g,'\n')
   .replace(/\s*<script\b[^>]*data-otto-premium-ops-runtime[^>]*><\/script>\s*/g,'\n')
   .replace(/\s*<link\b[^>]*data-otto-premium-ops-style[^>]*>\s*/g,'\n')
   .replace(/\s*<script\b[^>]*data-otto-ui-integrations-runtime[^>]*><\/script>\s*/g,'\n')
   .replace(/\s*<link\b[^>]*data-otto-ui-integrations-style[^>]*>\s*/g,'\n')
   .replace(/\s*<script\b[^>]*data-otto-ui-integrations-compat-runtime[^>]*><\/script>\s*/g,'\n')
   .replace(/\s*<link\b[^>]*data-otto-ui-integrations-compat-style[^>]*>\s*/g,'\n')
   .replace(/\s*<link\b[^>]*data-otto-air-style[^>]*>\s*/g,'\n')
   .replace(/\s*<link\b[^>]*data-otto-readability-style[^>]*>\s*/g,'\n')
   .replace(/\s*<script\b[^>]*data-otto-air-runtime[^>]*><\/script>\s*/g,'\n')
   .replace(/\s*<script\b[^>]*data-otto-durability-runtime[^>]*><\/script>\s*/g,'\n');
 out=out.replace('</head>',`  <link rel="stylesheet" href="./otto-premium-ops.css?v=${V}" data-otto-premium-ops-style />\n  <link rel="stylesheet" href="./otto-ui-integrations.css?v=${V}" data-otto-ui-integrations-style />\n  <link rel="stylesheet" href="./otto-ui-integrations-compat.css?v=${V}" data-otto-ui-integrations-compat-style />\n  <link rel="stylesheet" href="./otto-air.css?v=${V}" data-otto-air-style />\n  <link rel="stylesheet" href="./otto-readability.css?v=${V}" data-otto-readability-style />\n</head>`);
 const bridge=`<script data-otto-premium-ops-bridge>\nwindow.__ottoPremiumOpsBridge={\n  getDb:()=>db,\n  getSession:()=>session,\n  getLang:()=>lang,\n  getRoute:()=>route,\n  add:(c,o)=>add(c,o),\n  update:(c,i,p)=>update(c,i,p),\n  save:()=>save(),\n  nav:(v,i)=>nav(v,i),\n  render:()=>render(),\n  can:(v)=>can(v),\n  toast:(m,type)=>toast(m,type),\n  getFileURL:(id)=>getFileURL(id),\n  openJobForm:(id,customerId)=>typeof openJobForm==='function'?openJobForm(id,customerId):null,\n  openEstimateForm:(id,jobId)=>typeof openEstimateForm==='function'?openEstimateForm(id,jobId):null,\n  openInvoiceView:(id)=>typeof openInvoiceView==='function'?openInvoiceView(id):null\n};\n</script>`;
 out=out.replace('</body>',`  ${bridge}\n  <script src="./otto-premium-ops.js?v=${V}" data-otto-premium-ops-runtime></script>\n  <script src="./otto-ui-integrations.js?v=${V}" data-otto-ui-integrations-runtime></script>\n  <script src="./otto-ui-integrations-compat.js?v=${V}" data-otto-ui-integrations-compat-runtime></script>\n  <script src="./otto-air.js?v=${V}" data-otto-air-runtime></script>\n  <script src="./otto-durability.js?v=${V}" data-otto-durability-runtime></script>\n</body>`);
 return out;
}
function patchSw(src){
 let out=src;
 const n="'./otto-shell.css', './otto-shell.js',";
 if(!out.includes(n))throw new Error('shell cache marker missing');
 if(!out.includes("'./otto-premium-ops.js'"))out=out.replace(n,`${n}\n  './otto-premium-ops.css', './otto-premium-ops.js',`);
 if(!out.includes("'./otto-ui-integrations.js'")){
   const premium="'./otto-premium-ops.css', './otto-premium-ops.js',";
   if(!out.includes(premium))throw new Error('premium ops cache marker missing');
   out=out.replace(premium,`${premium}\n  './otto-ui-integrations.css', './otto-ui-integrations.js',`);
 }
 if(!out.includes("'./otto-ui-integrations-compat.js'")){
   const ui="'./otto-ui-integrations.css', './otto-ui-integrations.js',";
   if(!out.includes(ui))throw new Error('UI integration cache marker missing');
   out=out.replace(ui,`${ui}\n  './otto-ui-integrations-compat.css', './otto-ui-integrations-compat.js',`);
 }
 if(!out.includes("'./otto-air.js'")){
   const compat="'./otto-ui-integrations-compat.css', './otto-ui-integrations-compat.js',";
   if(!out.includes(compat))throw new Error('UI compat cache marker missing');
   out=out.replace(compat,`${compat}\n  './otto-air.css', './otto-air.js',`);
 }
 if(!out.includes("'./otto-readability.css'")){
   const air="'./otto-air.css', './otto-air.js',";
   if(!out.includes(air))throw new Error('OTTO Air cache marker missing');
   out=out.replace(air,`${air}\n  './otto-readability.css',`);
 }
 if(!out.includes("'./otto-durability.js'")){
   const readable="'./otto-readability.css',";
   if(!out.includes(readable))throw new Error('readability cache marker missing');
   out=out.replace(readable,`${readable}\n  './otto-durability.js',`);
 }
 return out;
}
function patchShell(src){
 let out=src.replace("return Boolean(session) && session.role !== 'field';","return Boolean(session) && ['owner', 'office'].includes(session.role);");
 out=out.replace("if (item.view) return can(item.view) || item.view === 'settings' || item.view === 'assistant';","if (item.view) return can(item.view) || item.view === 'settings' || item.view === 'assistant' || item.view === 'otto_operations';");
 if(!out.includes("en: 'Operations', es: 'Operaciones'")){
   const newline=out.includes('\r\n')?'\r\n':'\n';
   const needle=`en: 'Business', es: 'Negocio', items: [${newline}        { view: 'reports', icon: 'fa-chart-line', en: 'Reports', es: 'Reportes' },`;
   if(!out.includes(needle))throw new Error('business More group marker missing');
   out=out.replace(needle,`en: 'Business', es: 'Negocio', items: [${newline}        { view: 'otto_operations', icon: 'fa-gauge-high', en: 'Operations', es: 'Operaciones' },${newline}        { view: 'reports', icon: 'fa-chart-line', en: 'Reports', es: 'Reportes' },`);
 }
 return out;
}
function patchUi(src){
 const newline=src.includes('\r\n')?'\r\n':'\n';
 const old=`    portalCards();${newline}    enhanceOperationsInbox();`;
 const next=`    if (!(session() && session().role === 'customer')) portalCards();${newline}    enhanceOperationsInbox();`;
 if(src.includes(next))return src;
 if(!src.includes(old))throw new Error('customer portal enhancement marker missing');
 return src.replace(old,next);
}

const paths=[INDEX,SW,SHELL,UI].map(fileURLToPath);
const before=paths.map(p=>fs.readFileSync(p,'utf8'));
const after=[patchIndex(before[0]),patchSw(before[1]),patchShell(before[2]),patchUi(before[3])];
if(!after[0].includes('data-otto-premium-ops-runtime')||!after[0].includes('data-otto-ui-integrations-runtime')||!after[0].includes('data-otto-ui-integrations-compat-runtime')||!after[0].includes('data-otto-air-style')||!after[0].includes('data-otto-readability-style')||!after[0].includes('data-otto-air-runtime')||!after[0].includes('data-otto-durability-runtime')||!after[0].includes('getRoute:()=>route')||!after[1].includes("'./otto-ui-integrations.js'")||!after[1].includes("'./otto-ui-integrations-compat.js'")||!after[1].includes("'./otto-air.js'")||!after[1].includes("'./otto-readability.css'")||!after[1].includes("'./otto-durability.js'")||!after[2].includes("['owner', 'office'].includes(session.role)")||!after[2].includes("view: 'otto_operations'")||!after[3].includes("if (!(session() && session().role === 'customer')) portalCards();"))throw new Error('premium ops UI patch validation failed');
after.forEach((txt,i)=>{if(txt!==before[i])fs.writeFileSync(paths[i],txt)});
console.log('Premium operations, UI integrations, OTTO Air, readability, and durability patch applied and validated');
