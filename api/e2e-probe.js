const PROD = 'https://otto-kohl.vercel.app';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const random = () => Math.random().toString(36).slice(2, 10);
const TEST_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8zGQAAAAASUVORK5CYII=';

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

async function authenticatedJson(path, accessToken, options = {}) {
  return jsonFetch(`${PROD}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
}

async function saveRecord(accessToken, collection, record) {
  return authenticatedJson('/api/data', accessToken, {
    method: 'POST',
    body: JSON.stringify({ collection, records: [record] }),
  });
}

async function deleteRow(sb, key, collection, id) {
  if (!id) return;
  await fetch(`${sb}/rest/v1/${encodeURIComponent(collection)}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: serverHeaders(key),
  }).catch(() => {});
}

async function deleteStorageObject(sb, key, fileId) {
  if (!fileId) return;
  await fetch(`${sb}/storage/v1/object/job-photos`, {
    method: 'DELETE', headers: serverHeaders(key), body: JSON.stringify({ prefixes: [fileId] }),
  }).catch(() => {});
}

async function cleanup(sb, key, profileId, authId, fixture = {}) {
  await deleteStorageObject(sb, key, fixture.fileId);
  await deleteRow(sb, key, 'photos', fixture.photoId);
  await deleteRow(sb, key, 'jobs', fixture.jobId);
  await deleteRow(sb, key, 'users', profileId);
  if (authId) {
    await fetch(`${sb}/auth/v1/admin/users/${encodeURIComponent(authId)}`, { method: 'DELETE', headers: serverHeaders(key) }).catch(() => {});
  }
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
  const fixture = {
    jobId: `qa-job-${run}`,
    photoId: `qa-photo-${run}`,
    fileId: `qa-photo-${run}.png`,
  };
  let authId = '';
  let browser = null;
  const proof = {
    production: PROD,
    ownerAuthenticated: false,
    askOttoOpened: false,
    questionSubmitted: false,
    nvidiaCalled: false,
    nvidiaStatus: null,
    answerShown: false,
    providerErrorShown: false,
    preexistingPhotoCount: null,
    fixtureJobSaved: false,
    fixturePhotoUploaded: false,
    fixturePhotoSaved: false,
    photoVisibleInBrowserDb: false,
    photoApiStatus: null,
    signedPhotoStatus: null,
    renderedPhotoCount: 0,
    renderedPhotoDimensions: [],
    photoUiRequests: 0,
    photoUiStatuses: [],
  };

  try {
    const auth = await createAuthUser(sb, service, email, password);
    authId = auth.id;
    if (!authId) throw new Error('Supabase did not return an auth user id.');
    await createOwnerProfile(sb, service, profileId, authId, email);
    const session = await passwordSession(sb, service, email, password);
    if (!session?.access_token || !session?.refresh_token) throw new Error('Supabase did not return an authenticated session.');

    const before = await authenticatedJson('/api/data', session.access_token);
    proof.preexistingPhotoCount = Array.isArray(before?.photos) ? before.photos.length : null;

    const now = new Date().toISOString();
    await saveRecord(session.access_token, 'jobs', {
      id: fixture.jobId,
      title: 'PR 154 production photo verification',
      status: 'completed',
      scheduledDate: now.slice(0, 10),
      created: now,
      updated: now,
      qa: true,
    });
    proof.fixtureJobSaved = true;

    const upload = await authenticatedJson('/api/photos', session.access_token, {
      method: 'POST',
      body: JSON.stringify({ fileId: fixture.fileId, mime: 'image/png', data: TEST_PNG, jobId: fixture.jobId }),
    });
    proof.fixturePhotoUploaded = Boolean(upload?.ok);

    await saveRecord(session.access_token, 'photos', {
      id: fixture.photoId,
      jobId: fixture.jobId,
      fileId: fixture.fileId,
      caption: 'PR 154 production verification',
      phase: 'after',
      created: now,
      createdBy: profileId,
      uploadPending: false,
      qa: true,
    });
    proof.fixturePhotoSaved = true;

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
      if (url.includes('/api/nvidia')) nvidiaResponses.push({ status: response.status() });
      if (url.includes('/api/photos?fileId=')) photoResponses.push({ status: response.status() });
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

    await page.waitForFunction(({ photoId, jobId, fileId }) => {
      const db = window.__db();
      return (db.photos || []).some((p) => p?.id === photoId && p.fileId === fileId && p.jobId === jobId) &&
        (db.jobs || []).some((j) => j?.id === jobId);
    }, fixture, { timeout: 20000 }).catch(() => {});
    proof.photoVisibleInBrowserDb = await page.evaluate(({ photoId, jobId, fileId }) => {
      const db = window.__db();
      return (db.photos || []).some((p) => p?.id === photoId && p.fileId === fileId && p.jobId === jobId) &&
        (db.jobs || []).some((j) => j?.id === jobId);
    }, fixture);

    const photoApi = await fetch(`${PROD}/api/photos?fileId=${encodeURIComponent(fixture.fileId)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    proof.photoApiStatus = photoApi.status;
    let photoJson = {};
    try { photoJson = await photoApi.json(); } catch {}
    if (photoApi.ok && photoJson?.url) {
      const imageResponse = await fetch(photoJson.url);
      proof.signedPhotoStatus = imageResponse.status;
    }

    await page.evaluate((jobId) => window.nav('job', jobId), fixture.jobId);
    await page.waitForFunction((fileId) => Array.from(document.images).some((img) =>
      img.src.includes(fileId) && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0), fixture.fileId, { timeout: 15000 }).catch(() => {});
    await sleep(500);
    const rendered = await page.evaluate((fileId) => Array.from(document.images)
      .filter((img) => img.src.includes(fileId))
      .map((img) => ({ complete: img.complete, width: img.naturalWidth, height: img.naturalHeight, broken: !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0 })), fixture.fileId);
    proof.renderedPhotoCount = rendered.length;
    proof.renderedPhotoDimensions = rendered.map((img) => `${img.width}x${img.height}`);
    proof.renderedPhotosHealthy = rendered.length > 0 && rendered.every((img) => !img.broken);
    proof.photoUiRequests = photoResponses.length;
    proof.photoUiStatuses = photoResponses.map((item) => item.status);

    const askPass = proof.ownerAuthenticated && proof.askOttoOpened && proof.questionSubmitted && proof.nvidiaCalled && proof.nvidiaStatus === 200 && (proof.answerShown || proof.providerErrorShown);
    const photosPass = proof.fixtureJobSaved && proof.fixturePhotoUploaded && proof.fixturePhotoSaved && proof.photoVisibleInBrowserDb && proof.photoApiStatus === 200 && proof.signedPhotoStatus === 200 && proof.renderedPhotosHealthy === true && proof.photoUiRequests > 0 && proof.photoUiStatuses.every((status) => status === 200);
    return res.status(200).json({ askOtto: askPass ? 'PASS' : 'FAIL', photos: photosPass ? 'PASS' : 'FAIL', proof });
  } catch (error) {
    return res.status(200).json({ askOtto: 'FAIL', photos: 'FAIL', proof, error: String(error?.message || error).slice(0, 800) });
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanup(sb, service, profileId, authId, fixture);
  }
}
