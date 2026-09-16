import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const INDEX = new URL('../index.html', import.meta.url);
const storageBlock = `
  /* Mirror Supabase's refresh-session payload into IndexedDB as a second,
     origin-private copy. Browsers/webviews can evict localStorage while leaving
     IndexedDB intact; recovering the same provider token is not an auth bypass —
     Supabase still validates and refreshes it before OTTO accepts the profile. */
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

export function patchSessionPersistence(source) {
  let out = source;
  if (!out.includes('const ottoAuthStorage = {')) {
    const marker = "  try { localStorage.removeItem('otto_jwt'); } catch (e) { }\n\n  async function initCloudAuth() {";
    if (!out.includes(marker)) throw new Error('auth initialization marker missing');
    out = out.replace(marker, `  try { localStorage.removeItem('otto_jwt'); } catch (e) { }\n${storageBlock}\n  async function initCloudAuth() {`);
  }

  const oldAuth = "      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },";
  const newAuth = "      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: ottoAuthStorage },";
  if (out.includes(oldAuth)) out = out.replace(oldAuth, newAuth);
  if (!out.includes(newAuth)) throw new Error('Supabase durable storage option not wired');

  const oldClear = "      } else if (localSessionId && cloudOutcome.status !== 'unavailable') {";
  const newClear = "      } else if (localSessionId && cloudOutcome.status === 'rejected') {";
  if (out.includes(oldClear)) out = out.replace(oldClear, newClear);
  if (!out.includes(newClear)) throw new Error('profile marker clearing rule not patched');

  const oldComment = `        /* Only forget the profile marker when we actually know this device is\n           signed out or refused. Deleting it because OTTO was briefly\n           unreachable threw away the one hint about who was using the phone. */`;
  const newComment = `        /* Only a provider-authenticated rejection may forget the remembered\n           profile marker. A missing browser token is not proof that the owner\n           profile disappeared; the login screen may reconnect the same profile. */`;
  if (out.includes(oldComment)) out = out.replace(oldComment, newComment);
  return out;
}

export function validateSessionPersistence(source) {
  return [
    ['Supabase session persistence remains enabled', source.includes('persistSession: true') && source.includes('autoRefreshToken: true')],
    ['provider session is mirrored into IndexedDB', source.includes("idbPut('kv', 'auth:' + key, value)")],
    ['provider session can recover from IndexedDB', source.includes("idbGet('kv', 'auth:' + key)")],
    ['sign-out removes the IndexedDB mirror', source.includes("idbDel('kv', 'auth:' + key)")],
    ['custom storage is passed to Supabase', source.includes('storage: ottoAuthStorage')],
    ['only a real provider rejection clears remembered profile', source.includes("localSessionId && cloudOutcome.status === 'rejected'") && !source.includes("localSessionId && cloudOutcome.status !== 'unavailable'")],
    ['magic-link sign-in cannot create unknown accounts', source.includes('shouldCreateUser: false')],
  ];
}

function run() {
  const path = fileURLToPath(INDEX);
  const before = fs.readFileSync(path, 'utf8');
  const after = patchSessionPersistence(before);
  const failed = validateSessionPersistence(after).filter(([, ok]) => !ok);
  if (failed.length) throw new Error(`Session persistence patch failed: ${failed.map(([name]) => name).join(', ')}`);
  if (after !== before) fs.writeFileSync(path, after);
  console.log(`Session persistence patch: ${after === before ? 'already applied' : 'applied'}; validated`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run();