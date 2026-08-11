(() => {
  'use strict';

  const SUPABASE_URL = 'https://huaehartegjbihyygqgb.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_xOJK14-CGJWKdy7W_bulEQ_hciST-Bb';
  const STORE = 'otto_supabase_session_v1';
  const nativeFetch = window.fetch.bind(window);
  let refreshPromise = null;
  let arrivedFromLink = false;

  function readSession() {
    try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; }
  }

  function saveSession(tokens) {
    if (!tokens) { localStorage.removeItem(STORE); return; }
    const expiresIn = Math.max(60, Number(tokens.expires_in || 3600));
    localStorage.setItem(STORE, JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (expiresIn - 45) * 1000,
    }));
  }

  function captureLink() {
    const hash = String(location.hash || '').replace(/^#/, '');
    if (!hash.includes('access_token=')) return;
    const p = new URLSearchParams(hash);
    const access_token = p.get('access_token');
    const refresh_token = p.get('refresh_token');
    if (!access_token || !refresh_token) return;
    saveSession({ access_token, refresh_token, expires_in: p.get('expires_in') || 3600 });
    arrivedFromLink = true;
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* no-op */ }
  }

  async function refreshToken() {
    const current = readSession();
    if (!current || !current.refresh_token) return null;
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        const r = await nativeFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: current.refresh_token }),
        });
        if (!r.ok) { saveSession(null); return null; }
        const tokens = await r.json();
        saveSession(tokens);
        return tokens.access_token || null;
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
    return refreshPromise;
  }

  async function accessToken() {
    const current = readSession();
    if (!current) return null;
    if (current.access_token && current.expires_at > Date.now()) return current.access_token;
    return refreshToken();
  }

  function apiRequest(input) {
    try {
      const u = new URL(typeof input === 'string' ? input : input.url, location.href);
      return u.origin === location.origin && u.pathname.startsWith('/api/');
    } catch { return false; }
  }

  // Every existing OTTO /api/ call gets the provider session automatically.
  window.fetch = async (input, init = {}) => {
    if (!apiRequest(input)) return nativeFetch(input, init);
    const send = async (token) => {
      const headers = new Headers(init.headers || (typeof input !== 'string' && input.headers) || {});
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return nativeFetch(input, { ...init, headers });
    };
    let response = await send(await accessToken());
    if (response && response.status === 403 && readSession()) {
      const fresh = await refreshToken();
      if (fresh) response = await send(fresh);
    }
    return response;
  };

  captureLink();

  async function whoAmI() {
    try {
      const r = await window.fetch('/api/whoami');
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  function language() {
    return localStorage.getItem('otto_lang') === 'es' ? 'es' : 'en';
  }

  function text(en, es) { return language() === 'es' ? es : en; }

  async function finishArrivingSession() {
    if (!arrivedFromLink) return;
    const me = await whoAmI();
    if (!me || !me.id) {
      saveSession(null);
      alert(text('That sign-in link is not valid for an OTTO account.', 'Ese enlace de acceso no es válido para una cuenta de OTTO.'));
      return;
    }
    localStorage.setItem('otto_session', me.id);
    location.reload();
  }

  function installOwnerLogin() {
    if (readSession() || document.getElementById('otto-cloud-owner-login')) return;
    const login = document.getElementById('login');
    if (!login || login.classList.contains('hidden')) return;

    const box = document.createElement('div');
    box.id = 'otto-cloud-owner-login';
    box.className = 'card-login';
    box.style.marginTop = '14px';
    box.innerHTML = `
      <div style="font-weight:700;margin-bottom:8px">${text('Owner — use OTTO on this phone', 'Dueño — use OTTO en este teléfono')}</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:10px">${text('Get a secure sign-in link by email.', 'Reciba un enlace seguro por correo.')}</div>
      <input id="otto-owner-email" type="email" autocomplete="email" placeholder="${text('Owner email', 'Correo del dueño')}" style="width:100%;margin-bottom:10px" />
      <button id="otto-owner-email-send" class="btn block">${text('Send sign-in link', 'Enviar enlace de acceso')}</button>
      <div id="otto-owner-email-status" style="font-size:12px;color:var(--text2);margin-top:8px"></div>`;
    login.appendChild(box);

    box.querySelector('#otto-owner-email-send').addEventListener('click', async () => {
      const email = String(box.querySelector('#otto-owner-email').value || '').trim();
      const status = box.querySelector('#otto-owner-email-status');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        status.textContent = text('Enter the owner email.', 'Escriba el correo del dueño.'); return;
      }
      status.textContent = text('Sending…', 'Enviando…');
      try {
        const r = await nativeFetch('/api/owner-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, redirectTo: location.origin + location.pathname }),
        });
        status.textContent = r.ok
          ? text('Check that email for the OTTO sign-in link.', 'Revise ese correo para ver el enlace de acceso de OTTO.')
          : text('Owner cloud sign-in is not activated yet.', 'El acceso en la nube del dueño aún no está activado.');
      } catch {
        status.textContent = text('Could not send the link.', 'No se pudo enviar el enlace.');
      }
    });
  }

  async function createWorkerLink(userId) {
    try {
      const r = await window.fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, redirectTo: location.origin + location.pathname }),
      });
      if (!r.ok) throw new Error('invite');
      const data = await r.json();
      const message = text(
        `Open OTTO with this secure link. It works once.\n\n${data.url}`,
        `Abra OTTO con este enlace seguro. Funciona una sola vez.\n\n${data.url}`
      );
      if (navigator.share) {
        await navigator.share({ title: 'OTTO', text: message });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        alert(text('Sign-in link copied.', 'Enlace de acceso copiado.'));
      } else {
        prompt(text('Copy this sign-in link:', 'Copie este enlace de acceso:'), message);
      }
    } catch {
      alert(text('Could not create the sign-in link.', 'No se pudo crear el enlace de acceso.'));
    }
  }

  function installTeamInviteHook() {
    if (!window.openUserForm || window.openUserForm.__ottoAuthWrapped) return;
    const original = window.openUserForm;
    const wrapped = function(userId) {
      const result = original.apply(this, arguments);
      if (!userId || !readSession()) return result;
      setTimeout(() => {
        const sheet = document.querySelector('.sheet');
        if (!sheet || sheet.querySelector('[data-otto-cloud-invite]')) return;
        const btn = document.createElement('button');
        btn.className = 'btn ghost block';
        btn.type = 'button';
        btn.dataset.ottoCloudInvite = '1';
        btn.style.marginTop = '10px';
        btn.textContent = text('Send secure phone sign-in link', 'Enviar enlace seguro de acceso al teléfono');
        btn.addEventListener('click', () => createWorkerLink(userId));
        const danger = sheet.querySelector('.btn.red');
        if (danger) danger.before(btn); else sheet.appendChild(btn);
      }, 0);
      return result;
    };
    wrapped.__ottoAuthWrapped = true;
    window.openUserForm = wrapped;
  }

  function installSignOutHook() {
    if (!window.signOut || window.signOut.__ottoAuthWrapped) return;
    const original = window.signOut;
    const wrapped = function() {
      saveSession(null);
      return original.apply(this, arguments);
    };
    wrapped.__ottoAuthWrapped = true;
    window.signOut = wrapped;
  }

  function installHooks() {
    installOwnerLogin();
    installTeamInviteHook();
    installSignOutHook();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await finishArrivingSession();
    installHooks();
    // OTTO redraws its login and modal surfaces dynamically.
    const observer = new MutationObserver(installHooks);
    observer.observe(document.body, { childList: true, subtree: true });
  });

  window.__ottoAuth = { accessToken, whoAmI, clear: () => saveSession(null), createWorkerLink };
})();
