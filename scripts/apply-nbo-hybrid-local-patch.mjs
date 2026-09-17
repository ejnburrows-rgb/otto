import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const SW = new URL('../sw.js', import.meta.url);

const LOCAL_AUTH = `async function initCloudAuth() {
    if (typeof window.__nboEnsureProfiles === 'function') window.__nboEnsureProfiles();
    let remembered = '';
    try { remembered = localStorage.getItem('otto_session') || ''; } catch (_) { }
    const users = Array.isArray(db && db.users) ? db.users : [];
    const localProfile = users.find((user) => user && user.id === remembered && user.active !== false) || null;
    session = localProfile;
    cloudAuthSession = null;
    return { status: localProfile ? 'authenticated' : 'local', profile: localProfile };
  }`;

const LOCAL_SERVER_FETCH = `async function serverFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (session && session.id) headers.set('X-NBO-Profile', session.id);
    const requestOptions = { ...options, headers, credentials: 'same-origin' };
    let response = await fetch(url, requestOptions);

    if (response.status === 401) {
      let payload = {};
      try { payload = await response.clone().json(); } catch (_) { }
      if (payload && payload.error === 'local_provider_access_required') {
        const requestLocalProviderAccess = window.__nboRequestProviderAccess;
        const enabled = typeof requestLocalProviderAccess === 'function'
          ? await requestLocalProviderAccess()
          : false;
        if (enabled) response = await fetch(url, requestOptions);
      }
    }
    return response;
  }`;

const LOCAL_LOGIN = `function showCloudLogin(message = '') {
    if (typeof window.__nboShowProfileChooser === 'function') {
      window.__nboShowProfileChooser(message);
      return;
    }
    const app = document.getElementById('app');
    const login = document.getElementById('login');
    if (app) app.classList.add('hidden');
    if (login) {
      login.classList.remove('hidden');
      login.innerHTML = '<div class="card" style="max-width:520px;margin:40px auto;padding:24px"><h2>OTTO local workspace</h2><p>Reload the page to choose a local profile.</p></div>';
    }
  }`;

const LOCAL_SETUP = `function showLocalSetup() { showCloudLogin(); }`;
const LOCAL_COMPLETE_SETUP = `async function completeLocalSetup() { showCloudLogin(); }`;
const LOCAL_DEVICE_LOGIN = `function showLocalLogin() { showCloudLogin(); }`;
const LOCAL_SIGN_IN = `async function signInLocal() { showCloudLogin(); }`;

const LOCAL_PULL = `async function cloudPull() {
    _cloudAvailable = false;
    return true;
  }`;

const LOCAL_PUSH = `function cloudPush() {
    _cloudAvailable = false;
    return Promise.resolve(true);
  }`;

const LOCAL_PULL_NOW = `async function cloudPullNow() {
    try {
      if (typeof toast === 'function') toast(lang === 'es' ? 'Los datos ya están guardados en este dispositivo.' : 'Data is already saved on this device.', 'success');
    } catch (_) { }
    return true;
  }`;

const LOCAL_SAVE = `function save() {
    db.meta = db.meta || {};
    db.meta.updated = nowISO();
    db.meta.storageMode = 'local';
    const snapshot = JSON.stringify(db);
    try { localStorage.setItem('otto_db_backup', snapshot); } catch (_) { }
    try { idbPut('kv', 'db', snapshot).catch(() => {}); } catch (_) { }
    try { window.dispatchEvent(new CustomEvent('otto:save-state', { detail: { state: 'saved', local: true, confirmedAt: db.meta.updated } })); } catch (_) { }
    return Promise.resolve(true);
  }`;

const LOCAL_SIGN_OUT = `async function signOut() {
    try { localStorage.removeItem('otto_session'); } catch (_) { }
    session = null;
    cloudAuthSession = null;
    if (typeof window.__nboShowProfileChooser === 'function') {
      window.__nboShowProfileChooser();
      return;
    }
    showCloudLogin();
  }`;

const LOCAL_ENQUEUE_PHOTO = `async function enqueuePhotoUpload() { return true; }`;
const LOCAL_DRAIN_PHOTO = `async function _drainPhotoQueue() { return true; }`;
const LOCAL_START_DRAINER = `function startPhotoQueueDrainer() { return true; }`;
const LOCAL_GET_FILE = `async function getFileURL(fileId) {
    if (!fileId) return '';
    try {
      const stored = await idbGet('files', fileId);
      const blob = stored && stored.blob instanceof Blob ? stored.blob : stored;
      if (blob instanceof Blob) return URL.createObjectURL(blob);
      if (stored && typeof stored.data === 'string') return stored.data;
    } catch (_) { }
    return '';
  }`;
const LOCAL_DELETE_FILE = `async function deletePhotoFile(fileId) {
    if (!fileId) return true;
    try { await idbDel('files', fileId); } catch (_) { }
    try { await idbDel('photo_upload_queue', fileId); } catch (_) { }
    return true;
  }`;

function functionBounds(source, name) {
  const needle = `function ${name}(`;
  let start = source.indexOf(needle);
  if (start < 0) return null;
  const modifier = source.slice(0, start).match(/(?:async\s+)+$/);
  if (modifier) start -= modifier[0].length;
  const open = source.indexOf('{', start);
  if (open < 0) return null;
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
  return null;
}

function replaceFunction(source, name, replacement, required = false) {
  const bounds = functionBounds(source, name);
  if (!bounds) {
    if (required) throw new Error(`NBO local patch: missing ${name}()`);
    return source;
  }
  return source.slice(0, bounds[0]) + replacement + source.slice(bounds[1]);
}

function wireStyles(source) {
  let out = source;
  if (!out.includes('data-nbo-hybrid-styles')) {
    out = out.replace('</head>', '  <link rel="stylesheet" href="./otto-nbo-hybrid.css?v=1" data-nbo-hybrid-styles>\n</head>');
  }
  return out;
}

function wireRuntime(source) {
  let out = source;
  out = out.replace(/\s*<script\b[^>]*src=["'][^"']*supabase[^"']*["'][^>]*><\/script>\s*/gi, '\n');
  if (!out.includes('data-nbo-local-runtime')) {
    out = out.replace('</body>', '  <script src="./otto-local-runtime.js?v=1" data-nbo-local-runtime></script>\n</body>');
  }
  if (!out.includes('data-nbo-hybrid-runtime')) {
    out = out.replace('</body>', '  <script src="./otto-nbo-hybrid.js?v=1" data-nbo-hybrid-runtime></script>\n</body>');
  }
  return out;
}

export function patchIndex(source) {
  let out = source.replace(/\r\n/g, '\n');
  out = wireStyles(out);
  out = wireRuntime(out);

  out = replaceFunction(out, 'initCloudAuth', LOCAL_AUTH, true);
  out = replaceFunction(out, 'serverFetch', LOCAL_SERVER_FETCH, true);
  out = replaceFunction(out, 'showCloudLogin', LOCAL_LOGIN, true);
  out = replaceFunction(out, 'showLocalSetup', LOCAL_SETUP);
  out = replaceFunction(out, 'completeLocalSetup', LOCAL_COMPLETE_SETUP);
  out = replaceFunction(out, 'showLocalLogin', LOCAL_DEVICE_LOGIN);
  out = replaceFunction(out, 'signInLocal', LOCAL_SIGN_IN);
  out = replaceFunction(out, 'cloudPull', LOCAL_PULL, true);
  out = replaceFunction(out, 'cloudPush', LOCAL_PUSH, true);
  out = replaceFunction(out, 'cloudPullNow', LOCAL_PULL_NOW);
  out = replaceFunction(out, 'save', LOCAL_SAVE, true);
  out = replaceFunction(out, 'signOut', LOCAL_SIGN_OUT, true);
  out = replaceFunction(out, 'enqueuePhotoUpload', LOCAL_ENQUEUE_PHOTO);
  out = replaceFunction(out, '_drainPhotoQueue', LOCAL_DRAIN_PHOTO);
  out = replaceFunction(out, 'startPhotoQueueDrainer', LOCAL_START_DRAINER);
  out = replaceFunction(out, 'getFileURL', LOCAL_GET_FILE);
  out = replaceFunction(out, 'deletePhotoFile', LOCAL_DELETE_FILE);

  out = out.replace(/\b_cloudAvailable\s*=\s*await\s+cloudPull\(\);/g, '_cloudAvailable = false; await cloudPull();');
  return out;
}

export function patchServiceWorker(source) {
  let out = source.replace(/const CACHE = 'otto-crm-v(\d+)';/, (_, version) => `const CACHE = 'otto-crm-v${Math.max(Number(version), 32)}';`);
  const assets = ['./otto-local-runtime.js', './otto-nbo-hybrid.css', './otto-nbo-hybrid.js'];
  for (const asset of assets) {
    if (out.includes(`'${asset}'`)) continue;
    const marker = "'./otto-shell.css', './otto-shell.js',";
    if (!out.includes(marker)) throw new Error('NBO local patch: service-worker shell marker missing');
    out = out.replace(marker, `${marker} '${asset}',`);
  }
  return out;
}

export function validateLocalBuild(index, sw) {
  return [
    ['local runtime wired', index.includes('data-nbo-local-runtime')],
    ['hybrid UI wired', index.includes('data-nbo-hybrid-styles') && index.includes('data-nbo-hybrid-runtime')],
    ['cloud auth boot replaced', index.includes("async function initCloudAuth() {\n    if (typeof window.__nboEnsureProfiles")],
    ['provider requests use local enrollment', index.includes("headers.set('X-NBO-Profile', session.id)") && index.includes('local_provider_access_required') && index.includes('__nboRequestProviderAccess')],
    ['local save is authoritative', index.includes("db.meta.storageMode = 'local'") && !index.includes("serverFetch('/api/save'")],
    ['cloud pull is a no-op', index.includes("async function cloudPull() {\n    _cloudAvailable = false;")],
    ['cloud push is a no-op', index.includes("function cloudPush() {\n    _cloudAvailable = false;")],
    ['local file resolver avoids remote fallback', index.includes("const stored = await idbGet('files', fileId)")],
    ['hybrid assets cached offline', ['./otto-local-runtime.js','./otto-nbo-hybrid.css','./otto-nbo-hybrid.js'].every((asset) => sw.includes(`'${asset}'`))]
  ];
}

function main() {
  const beforeIndex = fs.readFileSync(INDEX, 'utf8');
  const beforeSw = fs.readFileSync(SW, 'utf8');
  const index = patchIndex(beforeIndex);
  const sw = patchServiceWorker(beforeSw);
  for (const [name, ok] of validateLocalBuild(index, sw)) {
    if (!ok) throw new Error(`NBO local patch validation failed: ${name}`);
  }
  if (index !== beforeIndex) fs.writeFileSync(INDEX, index);
  if (sw !== beforeSw) fs.writeFileSync(SW, sw);
  console.log('NBO hybrid local runtime materialized');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
