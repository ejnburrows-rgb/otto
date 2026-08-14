import { chromium as playwrightChromium } from 'playwright';
import chromium from '@sparticuz/chromium';

const PROD = 'https://otto-kohl.vercel.app';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  let browser;
  try {
    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true
    });
    const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
    const response = await page.goto(PROD, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const result = await page.evaluate(() => ({
      title: document.title,
      readyState: document.readyState,
      bodyPreview: document.body?.innerText?.slice(0, 500) || '',
      hasApp: !!document.querySelector('#app')
    }));
    return res.status(200).json({
      ok: response?.ok() ?? false,
      status: response?.status() ?? null,
      finalUrl: page.url(),
      ...result
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error?.stack || error).slice(0, 4000) });
  } finally {
    try { if (browser) await browser.close(); } catch {}
  }
}
