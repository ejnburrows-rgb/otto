import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX=new URL('../index.html',import.meta.url);
const SW=new URL('../sw.js',import.meta.url);
const SHELL=new URL('../otto-shell.js',import.meta.url);
const V='1';

function patchIndex(src){
 let out=src.replace(/\s*<script\b[^>]*data-otto-premium-ops-bridge[^>]*>[\s\S]*?<\/script>\s*/g,'\n').replace(/\s*<script\b[^>]*data-otto-premium-ops-runtime[^>]*><\/script>\s*/g,'\n').replace(/\s*<link\b[^>]*data-otto-premium-ops-style[^>]*>\s*/g,'\n');
 out=out.replace('</head>',`  <link rel="stylesheet" href="./otto-premium-ops.css?v=${V}" data-otto-premium-ops-style />\n</head>`);
 const bridge=`<script data-otto-premium-ops-bridge>\nwindow.__ottoPremiumOpsBridge={getDb:()=>db,getSession:()=>session,getLang:()=>lang,add:(c,o)=>add(c,o),update:(c,i,p)=>update(c,i,p),save:()=>save(),nav:(v,i)=>nav(v,i)};\n</script>`;
 out=out.replace('</body>',`  ${bridge}\n  <script src="./otto-premium-ops.js?v=${V}" data-otto-premium-ops-runtime></script>\n</body>`);
 return out;
}
function patchSw(src){
 if(src.includes("'./otto-premium-ops.js'"))return src;
 const n="'./otto-shell.css', './otto-shell.js',";
 if(!src.includes(n))throw new Error('shell cache marker missing');
 return src.replace(n,`${n}\n  './otto-premium-ops.css', './otto-premium-ops.js',`);
}
function patchShell(src){return src.replace("return Boolean(session) && session.role !== 'field';","return Boolean(session) && ['owner', 'office'].includes(session.role);");}

const paths=[INDEX,SW,SHELL].map(fileURLToPath);
const before=paths.map(p=>fs.readFileSync(p,'utf8'));
const after=[patchIndex(before[0]),patchSw(before[1]),patchShell(before[2])];
if(!after[0].includes('data-otto-premium-ops-runtime')||!after[1].includes("'./otto-premium-ops.js'")||!after[2].includes("['owner', 'office'].includes(session.role)"))throw new Error('premium ops UI patch validation failed');
after.forEach((txt,i)=>{if(txt!==before[i])fs.writeFileSync(paths[i],txt)});
console.log('Premium operations UI patch applied and validated');
