import { chromium as playwrightChromium } from 'playwright';

const PROD='https://otto-kohl.vercel.app';
const SB=process.env.SUPABASE_URL;
const SERVICE=process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER='ejnrcgplm@proton.me';
const W1='ejnrcg@yahoo.com';
const JOB='QA JOB 2026-08-14 E2E';
const CUSTOMER='QA CUSTOMER 2026-08-14 E2E';
const EST='QA FINAL - Estimate 2026-08-18';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const H=()=>({apikey:SERVICE,Authorization:`Bearer ${SERVICE}`,'Content-Type':'application/json'});

async function magic(email){
  const r=await fetch(`${SB}/auth/v1/admin/generate_link`,{method:'POST',headers:H(),body:JSON.stringify({type:'magiclink',email})});
  const j=await r.json();
  if(!r.ok) throw new Error(`magic ${email} ${r.status}`);
  return j.action_link||j.properties?.action_link;
}
async function rest(table,q){
  const r=await fetch(`${SB}/rest/v1/${table}?${q}`,{headers:H()});
  const text=await r.text(); let data=[]; try{data=JSON.parse(text)}catch{}
  return {status:r.status,data};
}
async function launch(){
  const c=(await import('@sparticuz/chromium')).default;
  return playwrightChromium.launch({args:c.args,executablePath:await c.executablePath(),headless:true});
}
async function login(page,email){
  await page.goto(await magic(email),{waitUntil:'domcontentloaded',timeout:30000});
  await sleep(1200);
  if(!page.url().startsWith(PROD)) await page.goto(PROD,{waitUntil:'domcontentloaded',timeout:30000});
  await sleep(1400);
  return page.evaluate(()=>({session:localStorage.getItem('otto_session'),url:location.href}));
}
async function records(page){
  return page.evaluate(({JOB,CUSTOMER,W1})=>{const d=window.__db();return {
    j:d.jobs.find(x=>x.title===JOB),c:d.customers.find(x=>x.name===CUSTOMER),w:d.users.find(x=>(x.email||'').toLowerCase()===W1)
  }},{JOB,CUSTOMER,W1});
}

async function askCurrent(browser){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}}); const page=await ctx.newPage();
  const out={login:await login(page,OWNER)};
  await page.waitForFunction(()=>window.__ottoAssistant&&document.getElementById('otto-assistant-panel'),null,{timeout:10000});
  out.allowed=await page.evaluate(()=>window.__ottoAssistant.allowed());
  await page.evaluate(()=>window.__ottoAssistant.open());
  const q=`What is the current status of ${JOB}, and who is assigned to it?`;
  await page.locator('#otto-assistant-input').fill(q);
  await page.locator('[data-assistant-form]').evaluate(f=>f.requestSubmit());
  try{await page.waitForSelector('.otto-assistant-loading',{state:'detached',timeout:25000});}catch{}
  await sleep(500);
  out.panelOpen=await page.locator('#otto-assistant-panel').evaluate(el=>!el.hidden&&el.getAttribute('aria-hidden')==='false');
  out.answer=await page.locator('.otto-assistant-answer').innerText().catch(()=>null);
  out.results=await page.locator('#otto-assistant-panel').innerText();
  out.inputExists=await page.locator('#otto-assistant-input').count()>0;
  await ctx.close(); return out;
}

async function syncWait(browser){
  const ctx=await browser.newContext({viewport:{width:390,height:844},geolocation:{latitude:25.7617,longitude:-80.1918},permissions:['geolocation']});
  const page=await ctx.newPage(); page.on('dialog',d=>d.accept()); const out={login:await login(page,W1)};
  const {j,w}=await records(page); if(!j||!w) throw new Error('QA job/worker missing');
  await page.evaluate(id=>nav('job',id),j.id); await sleep(250);
  let job=await page.evaluate(id=>window.__db().jobs.find(x=>x.id===id),j.id);
  if(!job.activeCheckIn){await page.evaluate(id=>startCheckInFlow(id),j.id);await sleep(100);await page.evaluate(id=>doCheckIn(id),j.id);await sleep(1800);}
  await page.evaluate(id=>shareLocation(id),j.id); await sleep(1800);
  await page.evaluate(id=>{const cl=window.__db().job_checklists.find(c=>c.jobId===id);if(cl)cl.items.filter(i=>!i.done).forEach(i=>toggleChecklistItem(id,i.key));},j.id);
  await sleep(1200);
  job=await page.evaluate(id=>window.__db().jobs.find(x=>x.id===id),j.id);
  if(job.activeCheckIn){await page.evaluate(id=>startCheckOutFlow(id),j.id);await sleep(100);await page.evaluate(id=>doCheckOut(id),j.id);}
  await sleep(7000);
  const jid=encodeURIComponent(j.id),uid=encodeURIComponent(w.id);
  const ev=await rest('job_events',`data->>jobId=eq.${jid}&data->>userId=eq.${uid}&select=id,data`);
  const loc=await rest('locations',`data->>jobId=eq.${jid}&data->>userId=eq.${uid}&select=id,data`);
  const ph=await rest('photos',`data->>jobId=eq.${jid}&select=id,data`);
  const cl=await rest('job_checklists',`data->>jobId=eq.${jid}&select=id,data`);
  out.server={events:ev.data.map(x=>x.data?.type),locations:loc.data.length,photos:ph.data.length,checklist:cl.data[0]?.data?.items?.map(i=>i.done)||[]};
  out.local=await page.evaluate(({jid,uid})=>({events:window.__db().job_events.filter(e=>e.jobId===jid&&e.userId===uid).map(e=>e.type),locations:window.__db().locations.filter(l=>l.jobId===jid&&l.userId===uid).length,photos:window.__db().photos.filter(p=>p.jobId===jid).length,job:window.__db().jobs.find(j=>j.id===jid)}),{jid:j.id,uid:w.id});
  out.mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  await ctx.close(); return out;
}

async function estimate(browser){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}}); const page=await ctx.newPage(); const out={login:await login(page,OWNER)};
  const {j,c}=await records(page); if(!j||!c) throw new Error('QA customer/job missing');
  let e=await page.evaluate(n=>window.__db().estimates.find(x=>x.title===n),EST);
  if(!e){
    await page.evaluate(id=>openEstimateForm(null,id),j.id);
    await page.locator('#e-title').fill(EST); await page.locator('#e-desc').fill('QA FINAL TEST DATA ONLY');
    await page.locator('.el-desc').first().fill('QA Copper pipe'); await page.locator('.el-qty').first().fill('10'); await page.locator('.el-price').first().fill('12.50');
    await page.evaluate(()=>addEstimateLine()); await page.locator('.el-desc').nth(1).fill('QA Valve'); await page.locator('.el-qty').nth(1).fill('2'); await page.locator('.el-price').nth(1).fill('25');
    await page.evaluate(()=>setEstimateAdjustment(.05)); await page.evaluate(()=>saveEstimate('')); await sleep(1800);
  }
  await page.reload({waitUntil:'domcontentloaded'}); await sleep(1200);
  e=await page.evaluate(n=>window.__db().estimates.find(x=>x.title===n),EST); out.after5=e;
  if(!e) throw new Error('estimate missing after reload');
  await page.evaluate(id=>openEstimateForm(id),e.id); await page.evaluate(()=>setEstimateAdjustment(.10)); await page.evaluate(id=>saveEstimate(id),e.id); await sleep(1800);
  await page.reload({waitUntil:'domcontentloaded'}); await sleep(1200);
  e=await page.evaluate(n=>window.__db().estimates.find(x=>x.title===n),EST); out.after10=e;
  out.correct=!!e&&Math.abs(Number(e.baseSubtotal)-175)<.01&&Math.abs(Number(e.amount)-192.5)<.01&&Number(e.adjustmentPct)===.10&&e.jobId===j.id&&e.customerId===c.id;
  const server=await rest('estimates',`data->>title=eq.${encodeURIComponent(EST)}&select=id,data`); out.server=server.data[0]?.data||null;
  await ctx.close(); return out;
}

export default async function handler(req,res){
  let browser; const phase=String(req.query?.phase||'ask');
  try{browser=await launch(); let result;
    if(phase==='ask') result=await askCurrent(browser);
    else if(phase==='sync') result=await syncWait(browser);
    else if(phase==='estimate') result=await estimate(browser);
    else return res.status(400).json({ok:false,error:'unknown phase'});
    return res.status(200).json({ok:true,phase,result});
  }catch(e){return res.status(500).json({ok:false,phase,error:String(e?.stack||e).slice(0,7000)});}
  finally{try{if(browser)await browser.close()}catch{}}
}
