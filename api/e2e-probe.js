export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const response = await page.goto('https://otto-kohl.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.title();
    await browser.close();
    return res.status(200).json({ ok: true, status: response && response.status(), title });
  } catch (error) {
    return res.status(500).json({ ok: false, error: String(error && error.message || error).slice(0, 1500) });
  }
}
