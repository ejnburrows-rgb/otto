import { chromium } from 'playwright';
const PIN='4417';
const b=await chromium.launch({headless:true,executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:420,height:900}});
await p.goto('http://localhost:8000',{waitUntil:'domcontentloaded'});await p.waitForTimeout(2500);
if(await p.locator('#boot-pin').count()){await p.locator('#boot-pin').fill(PIN);await p.locator('button',{hasText:/Save/i}).first().click();await p.waitForTimeout(2500);}
if(await p.locator('#login').isVisible()){const r=p.locator('.list-item',{hasText:/Otto/i}).first();if(await r.count())await r.click();else await p.locator('.list-item').first().click();
await p.waitForSelector('.pinpad',{timeout:10000});for(const d of PIN.split('')){await p.locator('.pinpad button').filter({hasText:new RegExp(`^${d}$`)}).first().click();await p.waitForTimeout(130);}
await p.waitForSelector('#app:not(.hidden), #boss-desk:not(.hidden)',{timeout:15000});await p.waitForTimeout(1200);}

// Impersonate a field session directly rather than hunting for a field PIN.
const res = await p.evaluate(() => {
  const w = db.users.find(u => u.role === 'field');
  if (!w) return 'no field user seeded';
  session = { id: w.id, name: w.name, role: 'field' };
  render();
  return 'ok:' + w.name;
});
console.log('session switch:', res);
await p.waitForTimeout(800);
const info = await p.evaluate(() => {
  const btn = document.querySelector('.iconbtn i.fa-bell')?.closest('button');
  if (!btn) return 'bell button not found on this render';
  return { al: btn.getAttribute('aria-label'), onclick: btn.getAttribute('onclick') };
});
console.log('bell button:', JSON.stringify(info));
await b.close();
