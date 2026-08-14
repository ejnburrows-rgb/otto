import { chromium as playwrightChromium } from 'playwright';

const PROD = 'https://otto-kohl.vercel.app';
const SB = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = 'ejnrcgplm@proton.me';
const headers = () => ({ apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' });

async function generateMagicLink(email) {
  const r = await fetch(`${SB}/auth/v1/admin/generate_link`, { method: 'POST', headers: headers(), body: JSON.stringify({ type: 'magiclink', email }) });
  const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch {}
  if (!r.ok) throw new Error(`generate_link ${r.status}: ${t.slice(0,1000)}`);
  return j.action_link || j.properties?.action_link;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!SB || !SERVICE) return res.status(500).json({ error: 'missing_server_config' });
  let browser;
  try {
    const chromium = (await import('@sparticuz/chromium')).default;
    browser = await playwrightChromium.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const actionLink = await generateMagicLink(OWNER_EMAIL);
    if (!actionLink) throw new Error('no action_link returned');
    await page.goto(actionLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    if (page.url().includes('supabase.co')) await page.waitForTimeout(1500);
    if (!page.url().startsWith(PROD)) await page.goto(PROD, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1800);
    const before = await page.evaluate(() => ({ url: location.href, session: localStorage.getItem('otto_session'), body: document.body.innerText.slice(0,2500) }));
    if (!before.session) throw new Error(`owner session not established; url=${before.url}; body=${before.body.slice(0,500)}`);
    await page.evaluate(() => nav('team'));
    await page.waitForTimeout(500);
    const team = await page.evaluate(() => ({
      body: document.body.innerText.slice(0,5000),
      buttons: Array.from(document.querySelectorAll('button')).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0,100)
    }));
    const add = page.getByRole('button', { name: /Add Employee|Agregar empleado/i }).first();
    if (await add.count()) await add.click(); else await page.evaluate(() => openUserForm());
    await page.waitForTimeout(250);
    const form = await page.evaluate(() => ({
      body: document.body.innerText.slice(-3500),
      inputs: Array.from(document.querySelectorAll('input,select,textarea')).map(el => ({ tag: el.tagName, id: el.id, type: el.type, name: el.name, value: el.value, placeholder: el.placeholder, options: el.tagName === 'SELECT' ? Array.from(el.options).map(o => ({value:o.value,text:o.text})) : undefined })).filter(x => x.id)
    }));
    return res.status(200).json({ ok: true, before, team, form });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.stack || e).slice(0,6000) });
  } finally { try { if (browser) await browser.close(); } catch {} }
}
