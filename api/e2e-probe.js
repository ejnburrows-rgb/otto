import { chromium as playwrightChromium } from 'playwright';
import chromium from '@sparticuz/chromium';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  let browser;
  try {
    browser = await playwrightChromium.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const response = await page.goto('https://otto-kohl.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.title();
    return res.status(200).json({ ok: true, status: response && response.status(), title });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error && error.stack || error).slice(0, 5000) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
