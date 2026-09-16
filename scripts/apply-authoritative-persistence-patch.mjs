import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const DATA_API = new URL('../api/data.js', import.meta.url);
const SW = new URL('../sw.js', import.meta.url);

const AUTH_STORAGE = `
  /* Provider session durability. Supabase remains the authority; IndexedDB is
     only a second browser copy of the provider refresh session. */
  const ottoAuthStorage = {
    async getItem(key) {
      let value = null;
      try { value = localStorage.getItem(key); } catch (_) { }
      if (value != null) {
        try { await idbPut('kv', 'auth:' + key, value); } catch (_) { }
        return value;
      }
      try { value = await idbGet('kv', 'auth:' + key); } catch (_) { value = null; }
      if (value != null) { try { localStorage.setItem(key, value); } catch (_) { } }
      return value == null ? null : value;
    },
    async setItem(key, value) {
      try { localStorage.setItem(key, value); } catch (_) { }
      try { await idbPut('kv', 'auth:' + key, value); } catch (_) { }
    },
    async removeItem(key) {
      try { localStorage.removeItem(key); } catch (_) { }
      try { await idbDel('kv', 'auth:' + key); } catch (_) { }
    },
  };
`;

const CLOUD_PUSH = `function cloudPush() {
    if (!cloudAuthSession) return Promise.resolve(false);
    if (window.__ottoCloudPushPromise) return window.__ottoCloudPushPromise;

    window.__ottoCloudPushPromise = (async () => {
      try {
        const changes = {};
        const snapshots = {};
        for (const col of SYNCED_COLLECTIONS) {
          const value = _syncableRecords(col);
          const currentStr = JSON.stringify(value);
          if (currentStr === _lastCloudState[col]) continue;
          if (currentStr === _rejectedCloudState[col]) continue;
          changes[col] = value;
          snapshots[col] = currentStr;
        }

        if (!Object.keys(changes).length) {
          _cloudAvailable = true;
          return true;
        }

        const response = await serverFetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ changes })
        });
        if (!response || !response.ok) {
          _cloudAvailable = false;
          return false;
        }

        const result = await response.json().catch(() => ({}));
        const failed = Array.isArray(result.failed) ? result.failed : [];
        const failedByCollection = new Map(failed.map(item => [item.collection, item]));
        for (const col of Object.keys(changes)) {
          const failure = failedByCollection.get(col);
          if (!failure) {
            _lastCloudState[col] = snapshots[col];
            delete _rejectedCloudState[col];
          } else if (Number(failure.status) === 403) {
            // Authorization refusals should not hammer the server every 250ms.
            // Any future edit changes the fingerprint and becomes eligible again.
            _rejectedCloudState[col] = snapshots[col];
          }
        }
        _cloudAvailable = failed.length === 0;
        return failed.length === 0;
      } catch (e) {
        console.warn('OTTO cloud autosave', e);
        _cloudAvailable = false;
        return false;
      } finally {
        window.__ottoCloudPushPromise = null;
      }
    })();

    return window.__ottoCloudPushPromise;
  }`;

const SAVE = `function save() {
    db.meta = db.meta || {};
    db.meta.updated = nowISO();
    const localSnapshot = JSON.stringify(db);

    // Recovery copies are written immediately so a tab crash cannot lose the edit.
    // They are caches only; Supabase confirmation is what makes an edit durable.
    try { localStorage.setItem('otto_db_backup', localSnapshot); } catch (_) { }
    try { idbPut('kv', 'db', localSnapshot).catch(() => {}); } catch (_) { }
    try { window.dispatchEvent(new CustomEvent('otto:save-state', { detail: { state: 'saving' } })); } catch (_) { }

    clearTimeout(_saveTimer);
    return new Promise((resolve) => {
      _ottoSaveWaiters.push(resolve);
      _saveTimer = setTimeout(() => {
        const waiters = _ottoSaveWaiters.splice(0);
        _ottoSaveChain = _ottoSaveChain.then(async () => {
          let confirmed = false;
          try { confirmed = await cloudPush(); } catch (_) { confirmed = false; }

          if (confirmed) {
            db.meta.lastCloudSavedAt = nowISO();
            delete db.meta.lastCloudSaveError;
            const confirmedSnapshot = JSON.stringify(db);
            try { localStorage.setItem('otto_db_backup', confirmedSnapshot); } catch (_) { }
            try { await idbPut('kv', 'db', confirmedSnapshot); } catch (_) { }
            try { await idbPut('kv', 'last_cloud_confirmed_db', confirmedSnapshot); } catch (_) { }
            try { window.dispatchEvent(new CustomEvent('otto:save-state', { detail: { state: 'saved', confirmedAt: db.meta.lastCloudSavedAt } })); } catch (_) { }
          } else {
            db.meta.lastCloudSaveError = nowISO();
            try { window.dispatchEvent(new CustomEvent('otto:save-state', { detail: { state: 'pending' } })); } catch (_) { }
          }
          for (const done of waiters) { try { done(confirmed); } catch (_) { } }
          return confirmed;
        });
      }, 180);
    });
  }`;

const CLOUD_ONLY_SETUP = `function showLocalSetup() {
    showCloudLogin(lang === 'es'
      ? 'La configuración del propietario usa una cuenta autorizada en la nube.'
      : 'Owner setup uses an authorized cloud account.');
  }`;

const CLOUD_ONLY_COMPLETE_SETUP = `async function completeLocalSetup() {
    showLocalSetup();
  }`;

const CLOUD_ONLY_LOGIN = `function showLocalLogin() {
    showCloudLogin(lang === 'es'
      ? 'Inicie sesión con el correo autorizado para continuar.'
      : 'Sign in with the authorized email to continue.');
  }`;

const CLOUD_ONLY_SIGN_IN = `async function signInLocal() {
    showLocalLogin();
  }`;

function functionBounds(source, name) {
  const needle = `function ${name}(`;
  const start = source.indexOf(needle);
  if (start < 0) throw new Error(`Missing function ${name}()`);
  const open = source.indexOf('{', start);
  if (open < 0) throw new Error(`Missing body for ${name}()`);
  let depth = 0;
  let quote = '';
  let escape = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = open; i < source.length; i++) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i++; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return [start, i + 1];
    }
  }
  throw new Error(`Unbalanced body for ${name}()`);
}

function replaceFunction(source, name, replacement) {
  const [start, end] = functionBounds(source, name);
  return source.slice(0, start) + replacement + source.slice(end);
}

export function patchIndex(source) {
  let out = source;

  // One public link, declared in the document itself.
  if (!out.includes('rel="canonical" href="https://otto-kohl.vercel.app/"')) {
    out = out.replace('</head>', '  <link rel="canonical" href="https://otto-kohl.vercel.app/" />\n</head>');
  }

  // Consolidate the old durability layer into this one persistence path.
  out = out.replace(/\s*<script\b[^>]*src=["']\.\/otto-durability\.js[^"']*["'][^>]*><\/script>\s*/g, '\n');
  out = out.replace(/\s*<script\b[^>]*src=["']\.\/otto-persistence\.js[^"']*["'][^>]*><\/script>\s*/g, '\n');
  if (!out.includes('</body>')) throw new Error('index.html is missing </body>');
  out = out.replace('</body>', '  <script src="./otto-persistence.js?v=1" data-otto-persistence></script>\n</body>');

  // Durable provider session; no invented owner and no device-only auth bypass.
  if (!out.includes('const ottoAuthStorage = {')) {
    const marker = "  try { localStorage.removeItem('otto_jwt'); } catch (e) { }\n\n  async function initCloudAuth() {";
    if (!out.includes(marker)) throw new Error('auth initialization marker missing');
    out = out.replace(marker, `  try { localStorage.removeItem('otto_jwt'); } catch (e) { }\n${AUTH_STORAGE}\n  async function initCloudAuth() {`);
  }
  out = out.replace(
    "      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },",
    "      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: ottoAuthStorage },"
  );
  out = out.replace(
    "      } else if (localSessionId && cloudOutcome.status !== 'unavailable') {",
    "      } else if (localSessionId && cloudOutcome.status === 'rejected') {"
  );

  // Production authentication is cloud-only. The legacy device-local owner/PIN
  // path created a second source of truth and could make a fresh browser look
  // like a brand-new CRM. Keep the functions as harmless redirects so any stale
  // cached markup cannot bypass provider authentication.
  out = out.replace(/\n\s*<div style="text-align:center;margin-top:16px">\s*\n\s*<button class="btn ghost sm" onclick="showLocalSetup\(\)"[\s\S]*?<\/div>/, '');
  out = replaceFunction(out, 'showLocalSetup', CLOUD_ONLY_SETUP);
  out = replaceFunction(out, 'completeLocalSetup', CLOUD_ONLY_COMPLETE_SETUP);
  out = replaceFunction(out, 'showLocalLogin', CLOUD_ONLY_LOGIN);
  out = replaceFunction(out, 'signInLocal', CLOUD_ONLY_SIGN_IN);
  out = out.replace(
    "    if (session) startApp(); else {\n      const hasLocalUsers = (db.users || []).some(u => hasPin(u, 'pin'));\n      const why = cloudSessionMessage(cloudOutcome);\n      if (hasLocalUsers && !why) showLocalLogin(); else showCloudLogin(why);\n    }",
    "    if (session) startApp(); else {\n      const why = cloudSessionMessage(cloudOutcome);\n      showCloudLogin(why);\n    }"
  );

  // Never manufacture production business state before the authoritative pull.
  out = out.replace(
    /\n\s*\/\/ Auto-estimating workflow: ensure rate card and company profile are seeded[\s\S]*?\n\s*if \(_changed\) save\(\);\n\n\s*await calcAllWeeklyHours\(\);/,
    `\n    /* Production business state is never seeded from browser defaults.\n       Supabase is authoritative. Demo-only content is handled later by the\n       explicit demo path and can never upload. */\n\n    await calcAllWeeklyHours();`
  );

  // One save queue and one cloud push path.
  out = replaceFunction(out, 'cloudPush', CLOUD_PUSH);
  if (!out.includes('let _ottoSaveWaiters = [];')) {
    out = out.replace(
      '  let _saveTimer = null;',
      `  let _saveTimer = null;\n  let _ottoSaveWaiters = [];\n  let _ottoSaveChain = Promise.resolve();\n  window.__ottoRetryPendingSave = () => save();`
    );
  }
  out = replaceFunction(out, 'save', SAVE);
  return out;
}

export function patchDataApi(source) {
  let out = source;
  out = out.replace('const COLLECTIONS = [', 'export const COLLECTIONS = [');
  out = out.replace('async function authorizeWrite(', 'export async function authorizeWrite(');
  out = out.replace('async function saveOneCollection(', 'export async function saveOneCollection(');
  return out;
}

export function patchServiceWorker(source) {
  let out = source.replace(/const CACHE = 'otto-crm-v\d+';/, "const CACHE = 'otto-crm-v31';");
  if (!out.includes("'./otto-persistence.js'")) {
    out = out.replace("'./', './index.html', './landing.html', './guide.html', './manifest.json', './logo.jpg',", "'./', './index.html', './landing.html', './guide.html', './manifest.json', './logo.jpg', './otto-persistence.js',");
  }
  return out;
}

export function validateAuthoritativePersistence(index, dataApi, sw) {
  const checks = [
    ['canonical production URL declared', index.includes('rel="canonical" href="https://otto-kohl.vercel.app/"')],
    ['single persistence runtime wired', (index.match(/data-otto-persistence/g) || []).length === 1],
    ['obsolete durability runtime removed', !index.includes('otto-durability.js')],
    ['Supabase session persistence enabled', index.includes('storage: ottoAuthStorage') && index.includes('persistSession: true')],
    ['only provider rejection clears remembered profile', index.includes("localSessionId && cloudOutcome.status === 'rejected'") && !index.includes("localSessionId && cloudOutcome.status !== 'unavailable'")],
    ['device-local owner setup is not exposed', !index.includes('onclick="showLocalSetup()"') && !index.includes('Create the first owner profile. Choose a 4-digit PIN to sign in.')],
    ['device-local PIN login is not used at boot', !index.includes('const hasLocalUsers = (db.users || []).some') && !index.includes('if (hasLocalUsers && !why) showLocalLogin()')],
    ['legacy local auth functions only redirect to cloud sign-in', index.includes("function showLocalSetup() {\n    showCloudLogin") && index.includes("function showLocalLogin() {\n    showCloudLogin")],
    ['production does not seed business defaults before cloud pull', !index.includes('Auto-estimating workflow: ensure rate card and company profile are seeded')],
    ['one save function remains', (index.match(/function save\(/g) || []).length === 1],
    ['one cloud push function remains', (index.match(/function cloudPush\(/g) || []).length === 1],
    ['cloud writes use one batch endpoint', index.includes("serverFetch('/api/save'") && !/serverFetch\('\/api\/data'[\s\S]{0,180}method:\s*'POST'/.test(index)],
    ['local database is explicitly recovery-only', index.includes('Recovery copies are written immediately')],
    ['cloud confirmation owns saved state', index.includes("detail: { state: 'saved'") && index.includes('lastCloudSavedAt')],
    ['data API exports the shared whitelist', dataApi.includes('export const COLLECTIONS = [')],
    ['batch API can reuse shared authorization', dataApi.includes('export async function authorizeWrite(')],
    ['batch API can reuse shared persistence', dataApi.includes('export async function saveOneCollection(')],
    ['persistence runtime is offline cached', sw.includes("'./otto-persistence.js'")],
  ];
  return checks;
}

function run() {
  const indexPath = fileURLToPath(INDEX);
  const dataPath = fileURLToPath(DATA_API);
  const swPath = fileURLToPath(SW);
  const beforeIndex = fs.readFileSync(indexPath, 'utf8');
  const beforeData = fs.readFileSync(dataPath, 'utf8');
  const beforeSw = fs.readFileSync(swPath, 'utf8');
  const afterIndex = patchIndex(beforeIndex);
  const afterData = patchDataApi(beforeData);
  const afterSw = patchServiceWorker(beforeSw);
  const failed = validateAuthoritativePersistence(afterIndex, afterData, afterSw).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`Authoritative persistence patch failed: ${failed.map(([name]) => name).join(', ')}`);
  if (afterIndex !== beforeIndex) fs.writeFileSync(indexPath, afterIndex);
  if (afterData !== beforeData) fs.writeFileSync(dataPath, afterData);
  if (afterSw !== beforeSw) fs.writeFileSync(swPath, afterSw);
  console.log(`Authoritative persistence patch: ${afterIndex === beforeIndex && afterData === beforeData && afterSw === beforeSw ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();
