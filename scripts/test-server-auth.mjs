// Regression tests for Supabase-backed server authentication.
import dataHandler from '../api/data.js';
import photosHandler from '../api/photos.js';
import claudeHandler from '../api/claude.js';
import nvidiaHandler from '../api/nvidia.js';
import notifyHandler from '../api/notify.js';
import quickbooksHandler from '../api/quickbooks.js';

let passed=0,failed=0;function check(name,actual,expected){const a=JSON.stringify(actual),e=JSON.stringify(expected);if(a===e){passed++;console.log(`  ok   ${name}`);}else{failed++;console.log(`  FAIL ${name}\n expected ${e}\n got ${a}`);}}
function createRes(){const r={statusCode:null,body:null,headers:{}};r.status=c=>{r.statusCode=c;return r;};r.json=d=>{r.body=d;return r;};r.setHeader=(k,v)=>{r.headers[k]=v;return r;};r.send=d=>{r.body=d;return r;};return r;}
function req(o={}){return{method:'GET',query:{},headers:{},body:null,on(ev,cb){if(ev==='end')cb();return this;},...o};}
const originalEnv={...process.env};const originalFetch=global.fetch;
process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_test';process.env.SUPABASE_SERVICE_ROLE_KEY='service-test';process.env.ANTHROPIC_API_KEY='ant-test';process.env.NVIDIA_API_KEY='nv-test';process.env.TWILIO_SID='AC-test';process.env.TWILIO_AUTH='auth-test';process.env.TWILIO_FROM='+15550000000';process.env.SENDGRID_API_KEY='SG-test';process.env.QB_CLIENT_ID='qb-id';process.env.QB_CLIENT_SECRET='qb-secret';process.env.QB_REFRESH_TOKEN='qb-refresh';
const cases=[['data',dataHandler,req()],['photos',photosHandler,req({query:{fileId:'f_1'}})],['claude',claudeHandler,req({method:'POST',body:{}})],['nvidia',nvidiaHandler,req({method:'POST',body:{}})],['notify',notifyHandler,req({method:'POST',body:{channel:'sms',to:'+1',body:'x'}})],['quickbooks sync',quickbooksHandler,req({method:'POST',body:{action:'sync',records:[]}})]];
async function run(){console.log('\nTesting Supabase server authentication');
 for(const [name,handler,rq] of cases){let calls=0;global.fetch=async()=>{calls++;throw new Error('must not call upstream');};const res=createRes();await handler(rq,res);check(`${name} anonymous returns 401`,res.statusCode,401);check(`${name} anonymous error`,res.body?.error,'unauthorized');check(`${name} anonymous makes no upstream call`,calls,0);}
 // Invalid bearer: exactly one call to Supabase Auth and no protected provider call.
 {let calls=[];global.fetch=async(url)=>{calls.push(String(url));return{ok:false,status:401,json:async()=>({})};};const res=createRes();await dataHandler(req({headers:{authorization:'Bearer invalid'}}),res);check('invalid bearer returns 401',res.statusCode,401);check('invalid bearer checked once',calls.length,1);check('invalid bearer checked by Supabase Auth',calls[0],'https://test.supabase.co/auth/v1/user');}
 // Valid bearer: Supabase confirms identity, then protected route is allowed to continue.
 {let calls=[];global.fetch=async(url)=>{calls.push(String(url));if(String(url).endsWith('/auth/v1/user'))return{ok:true,status:200,json:async()=>({id:'auth-user-1'})};if(String(url).includes('/rest/v1/'))return{ok:true,status:200,json:async()=>[]};throw new Error('unexpected '+url);};const res=createRes();await dataHandler(req({headers:{authorization:'Bearer valid'}}),res);check('valid bearer reaches data route',res.statusCode,200);check('valid bearer verifies identity first',calls[0],'https://test.supabase.co/auth/v1/user');check('valid bearer reaches protected provider',calls.some(x=>x.includes('/rest/v1/')),true);}
 // Public QuickBooks status remains public.
 {global.fetch=async()=>{throw new Error('no fetch expected');};const res=createRes();await quickbooksHandler(req({query:{action:'status'}}),res);check('QuickBooks status remains public',res.statusCode,200);}
 const {readFileSync,readdirSync}=await import('node:fs');const apiDir=new URL('../api/',import.meta.url);const gate=readFileSync(new URL('_lib/serverAuth.js',apiDir),'utf8');check('no hand-built JWT library',/jsonwebtoken|jwt\.(sign|verify)/.test(gate),false);check('provider user endpoint is used',gate.includes('/auth/v1/user'),true);check('old login route absent',readdirSync(apiDir).includes('login.js'),false);
 console.log(`\n${passed} passed, ${failed} failed\n`);global.fetch=originalFetch;process.env={...originalEnv};process.exit(failed?1:0);}
run().catch(e=>{console.error(e);global.fetch=originalFetch;process.env={...originalEnv};process.exit(1);});
