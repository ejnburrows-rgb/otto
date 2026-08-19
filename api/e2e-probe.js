const PROD = 'https://otto-kohl.vercel.app';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const random = () => Math.random().toString(36).slice(2, 10);

function serverHeaders(key) {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`${options.method || 'GET'} ${url} -> ${response.status}: ${String(text).slice(0, 300)}`);
  return data;
}

async function createAuthUser(sb, key, email, password) {
  return jsonFetch(`${sb}/auth/v1/admin/users`, {
    method: 'POST',
    headers: serverHeaders(key),
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { qa: true, source: 'pr154-production-verifier' } }),
  });
}

async function createOwnerProfile(sb, key, id, authUid, email) {
  return jsonFetch(`${sb}/rest/v1/users?on_conflict=id`, {
    method: 'POST',
    headers: { ...serverHeaders(key), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{ id, auth_uid: authUid, data: { id, name: 'QA Production Owner', email, role: 'owner', active: true, status: 'active', qa: true } }]),
  });
}

async function passwordSession(sb, key, email, password) {
  return jsonFetch(`${sb}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

async function cleanup(sb, key, profileId, authId) {
  if (profileId) {
    await fetch(`${sb}/rest/v1/users?id=eq.${encodeURIComponent(profileId)}`, { method: 'DELETE', headers: serverHeaders(key) }).catch(() => {});
  }
  if (authId) {
    await fetch(`${sb}/auth/v1/admin/users/${encodeURIComponent(authId)}`, { method: 'DELETE', headers: serverHeaders(key) }).catch(() => {});
  }
}

function findExistingPhoto(data) {
  const photos = Array.isArray(data?.photos) ? data.photos : [];
  const direct = photos.find((p) => p && p.fileId && (p.jobId || p.associatedJobId));
  if (direct) return { fileId: direct.fileId, jobId: direct.jobId || direct.associatedJobId, source: 'photos' };
  for (const doc of (Array.isArray(data?.documents) ? data.documents : [])) {
    const jobId = doc && (doc.jobId || doc.associatedJobId);
    const item = jobId && (doc.attachments || []).find((a) => a && a.fileId && /^image\//i.test(a.mime || a.type || ''));
    if (item) return { fileId: item.fileId, jobId, source: 'documents' };
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'GET' || String(req.query?.run || '') !== '154') return res.status(404).json({ error: 'not_found' });
  if (process.env.VERCEL_ENV !== 'production') return res.status(404).json({ error: 'not_found' });

  const sb = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sb || !service) return res.status(500).json({ error: 'missing_production_supabase_config' });

  const run = `${Date.now()}-${random()}`;
  const profileId = `qa-prod154-${run}`;
  const email = `${profileId}@example.com`;
  const password = `Q!${random()}${random()}9aA`;
  let authId = '';
  let browser = null;
  const proof = { production: PROD, ownerAuthenticated: false, askOttoOpened: false, questionSubmitted: false, nvidiaCalled: false, nvidiaStatus: null, answerShown: false, providerErrorShown: false, dataApiStatus: null, cloudPhotoCount: 0, photoRecordFound: false, photoVisibleInBrowserDb: false, photoApiStatus: null, signedPhotoStatus: null, renderedPhotoCount: 0, renderedPhotoDimensions: [] };

  try {
    const auth = await createAuthUser(sb, service, email, password);
    authId = auth.id;
    if (!authId) throw new Error('Supabase did not return an auth user id.');
    await createOwnerProfile(sb, service, profileId, authId, email);
    const session = await passwordSession(sb, service, email, password);
    if (!session?.access_token || !session?.refresh_token) throw new Error('Supabase did not return an authenticated session.');

    const dataResponse = await fetch(`${PROD}/api/data`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    proof.dataApiStatus = dataResponse.status;
    const cloudData = await dataResponse.json().catch(() => ({}));
    proof.cloudPhotoCount = Array.isArray(cloudData?.photos) ? cloudData.photos.length : 0;
    const photo = dataResponse.ok ? findExistingPhoto(cloudData) : null;
    proof.photoRecordFound = Boolean(photo?.fileId && photo?.jobId);
    proof.photoSource = photo?.source || '';

    const { chromium: playwrightChromium } = await import('playwright');
    const chromiumModule = await import('@sparticuz/chromium');
    const chromium = chromiumModule.default || chromiumModule;
    browser = await playwrightChromium.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    const projectRef = new URL(sb).hostname.split('.')[0];
    await context.addInitScript(({ storageKey, sessionValue }) => {
      localStorage.setItem(storageKey, JSON.stringify(sessionValue));
    }, { storageKey: `sb-${projectRef}-auth-token`, sessionValue: session });

    const page = await context.newPage();
    const nvidiaResponses = [];
    const photoResponses = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/nvidia')) nvidiaResponses.push({ status: response.status(), url });
      if (url.includes('/api/photos?fileId=')) photoResponses.push({ status: response.status(), url });
    });

    await page.goto(PROD, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction((id) => localStorage.getItem('otto_session') === id && typeof window.__db === 'function', profileId, { timeout: 20000 });
    proof.ownerAuthenticated = true;

    await page.waitForFunction(() => window.__ottoAssistant && window.__ottoAssistant.allowed && window.__ottoAssistant.allowed(), null, { timeout: 12000 });
    await page.evaluate(() => window.__ottoAssistant.open());
    await page.waitForFunction(() => {
      const panel = document.querySelector('.otto-assistant-panel');
      return panel && !panel.hidden;
    }, null, { timeout: 8000 });
    proof.askOttoOpened = true;

    const question = 'In one sentence, based only on OTTO records, tell me whether there is enough information here to identify the most recent completed plumbing job.';
    await page.evaluate((q) => window.__ottoAssistant.submit(q), question);
    proof.questionSubmitted = true;
    await page.waitForFunction(() => {
      const answer = document.querySelector('.otto-assistant-answer');
      return answer && !document.querySelector('.otto-assistant-loading');
    }, null, { timeout: 25000 }).catch(() => {});
    await sleep(400);

    const answerState = await page.evaluate(() => {
      const node = document.querySelector('.otto-assistant-answer');
      return node ? { text: (node.textContent || '').trim(), error: node.classList.contains('is-error') } : { text: '', error: false };
    });
    proof.nvidiaCalled = nvidiaResponses.length > 0;
    proof.nvidiaStatus = nvidiaResponses.length ? nvidiaResponses[nvidiaResponses.length - 1].status : null;
    proof.answerShown = Boolean(answerState.text && !answerState.error);
    proof.providerErrorShown = Boolean(answerState.text && answerState.error);
    proof.askOttoText = answerState.text ? answerState.text.slice(0, 220) : '';

    if (photo?.fileId && photo?.jobId) {
      await page.waitForFunction(({ fileId, jobId }) => {
        const db = window.__db();
        return (db.photos || []).some((p) => p && p.fileId === fileId && (p.jobId === jobId || p.associatedJobId === jobId)) ||
          (db.documents || []).some((d) => d && (d.jobId === jobId || d.associatedJobId === jobId) && (d.attachments || []).some((a) => a?.fileId === fileId));
      }, { fileId: photo.fileId, jobId: photo.jobId }, { timeout: 20000 }).catch(() => {});
      proof.photoVisibleInBrowserDb = await page.evaluate(({ fileId, jobId }) => {
        const db = window.__db();
        return (db.photos || []).some((p) => p && p.fileId === fileId && (p.jobId === jobId || p.associatedJobId === jobId)) ||
          (db.documents || []).some((d) => d && (d.jobId === jobId || d.associatedJobId === jobId) && (d.attachments || []).some((a) => a?.fileId === fileId));
      }, { fileId: photo.fileId, jobId: photo.jobId });

      const photoApi = await fetch(`${PROD}/api/photos?fileId=${encodeURIComponent(photo.fileId)}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      proof.photoApiStatus = photoApi.status;
      let photoJson = {};
      try { photoJson = await photoApi.json(); } catch {}
      if (photoApi.ok && photoJson?.url) {
        const imageResponse = await fetch(photoJson.url);
        proof.signedPhotoStatus = imageResponse.status;
      }

      await page.evaluate((jobId) => window.nav('job', jobId), photo.jobId);
      await page.waitForTimeout(500);
      await page.waitForFunction(() => Array.from(document.images).some((img) => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0 && (/\/storage\/v1\/object\/sign\//i.test(img.src) || /blob:/i.test(img.src))), null, { timeout: 15000 }).catch(() => {});
      await sleep(500);
      const rendered = await page.evaluate(() => Array.from(document.images)
        .filter((img) => /\/storage\/v1\/object\/sign\//i.test(img.src) || /blob:/i.test(img.src))
        .map((img) => ({ complete: img.complete, width: img.naturalWidth, height: img.naturalHeight, broken: !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0 })));
      proof.renderedPhotoCount = rendered.length;
      proof.renderedPhotoDimensions = rendered.slice(0, 6).map((img) => `${img.width}x${img.height}`);
      proof.renderedPhotosHealthy = rendered.length > 0 && rendered.every((img) => !img.broken);
      proof.photoUiRequests = photoResponses.length;
      proof.photoUiStatuses = photoResponses.slice(-6).map((item) => item.status);
    }

    const askPass = proof.ownerAuthenticated && proof.askOttoOpened && proof.questionSubmitted && proof.nvidiaCalled && (proof.answerShown || proof.providerErrorShown);
    const photosPass = proof.dataApiStatus === 200 && proof.photoRecordFound && proof.photoVisibleInBrowserDb && proof.photoApiStatus === 200 && proof.signedPhotoStatus === 200 && proof.renderedPhotosHealthy === true && proof.photoUiRequests > 0 && proof.photoUiStatuses.every((status) => status === 200);
    return res.status(200).json({ askOtto: askPass ? 'PASS' : 'FAIL', photos: photosPass ? 'PASS' : 'FAIL', proof });
  } catch (error) {
    return res.status(200).json({ askOtto: 'FAIL', photos: 'FAIL', proof, error: String(error?.message || error).slice(0, 800) });
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanup(sb, service, profileId, authId);
  }
}
