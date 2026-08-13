export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  let browser;
  let stage = 'start';
  try {
    stage = 'import-playwright';
    const { chromium: playwrightChromium } = await import('playwright');
    stage = 'import-chromium';
    const module = await import('@sparticuz/chromium');
    const chromium = module.default || module;
    stage = 'resolve-executable';
    const executablePath = await chromium.executablePath();
    stage = 'launch';
    browser = await playwrightChromium.launch({ args: chromium.args, executablePath, headless: true });
    stage = 'page';
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    stage = 'navigate';
    const response = await page.goto('https://otto-kohl.vercel.app/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    const title = await page.title();
    return res.status(200).json({ ok: true, status: response && response.status(), title, stage: 'done' });
  } catch (error) {
    return res.status(500).json({ ok: false, stage, error: String(error && error.stack || error).slice(0, 8000) });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
