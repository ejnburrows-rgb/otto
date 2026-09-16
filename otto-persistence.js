/* OTTO persistence UI/recovery guard.
   Permanent data lives in Supabase. IndexedDB/localStorage are recovery caches only.
   All writes flow through the single global save() function patched at build time. */
(function () {
  'use strict';

  const CANONICAL_URL = 'https://otto-kohl.vercel.app';
  let lastFingerprint = '';
  let toastWrapped = false;

  function tx(en, es) {
    try { return typeof lang !== 'undefined' && lang === 'es' ? es : en; }
    catch (_) { return en; }
  }

  function ensureStyle() {
    if (document.querySelector('[data-otto-persistence-style]')) return;
    const style = document.createElement('style');
    style.dataset.ottoPersistenceStyle = '1';
    style.textContent = `
      .otto-save-status{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:5px 9px;border:1px solid var(--line,#e5e7eb);border-radius:999px;background:var(--card,#fff);color:var(--text2,#626872);font-size:12px;font-weight:650;line-height:1;white-space:nowrap}
      .otto-save-dot{width:8px;height:8px;border-radius:50%;background:#17803D;flex:0 0 8px}
      .otto-save-status[data-state="saving"] .otto-save-dot{background:#2563EB;animation:ottoSavePulse 1s ease-in-out infinite}
      .otto-save-status[data-state="pending"] .otto-save-dot,.otto-save-status[data-state="error"] .otto-save-dot{background:#B76A00}
      @keyframes ottoSavePulse{0%,100%{opacity:.45}50%{opacity:1}}
      @media (prefers-reduced-motion:reduce){.otto-save-status[data-state="saving"] .otto-save-dot{animation:none}}
      @media (max-width:480px){.otto-save-status{font-size:11px;padding:5px 7px;gap:5px}}
    `;
    document.head.appendChild(style);
  }

  function fingerprint() {
    try {
      if (typeof db === 'undefined' || !db) return '';
      const meta = { ...(db.meta || {}) };
      delete meta.updated;
      delete meta.lastCloudSavedAt;
      delete meta.lastCloudSaveError;
      return JSON.stringify({ ...db, meta });
    } catch (_) { return ''; }
  }

  function ensureBadge() {
    ensureStyle();
    const top = document.querySelector('.topbar');
    if (!top || document.querySelector('[data-otto-save-status]')) return;
    const badge = document.createElement('div');
    badge.dataset.ottoSaveStatus = '1';
    badge.className = 'otto-save-status';
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-live', 'polite');
    badge.innerHTML = '<span class="otto-save-dot" aria-hidden="true"></span><span data-otto-save-label></span>';
    const controls = top.querySelector('.langtoggle');
    if (controls) top.insertBefore(badge, controls);
    else top.appendChild(badge);
    setState('saved');
  }

  function setState(state, detail) {
    ensureBadge();
    const badge = document.querySelector('[data-otto-save-status]');
    const label = badge && badge.querySelector('[data-otto-save-label]');
    if (!badge || !label) return;
    badge.dataset.state = state;
    if (state === 'saving') label.textContent = tx('Saving…', 'Guardando…');
    else if (state === 'saved') label.textContent = tx('Saved', 'Guardado');
    else if (state === 'pending') label.textContent = tx('Not saved to cloud — retrying', 'No guardado en la nube — reintentando');
    else label.textContent = tx('Save problem', 'Problema al guardar');
    if (detail && detail.confirmedAt) badge.title = tx(`Cloud confirmed ${detail.confirmedAt}`, `Nube confirmada ${detail.confirmedAt}`);
  }

  function wrapToast() {
    if (toastWrapped || typeof toast !== 'function') return;
    const baseToast = toast;
    toast = function (message, type) {
      try {
        const savedEn = typeof t === 'function' ? t('saved') : 'Saved';
        if (type === 'success' && (message === savedEn || message === 'Saved' || message === 'Guardado')) {
          // The persistent save badge is the only authoritative save indicator.
          // A form closing successfully means the edit was accepted locally;
          // only the cloud-confirmation event is allowed to say "Saved".
          return;
        }
      } catch (_) { }
      return baseToast.apply(this, arguments);
    };
    toastWrapped = true;
  }

  function detectDirectMutation() {
    try {
      if (typeof save !== 'function' || typeof db === 'undefined' || !db) return;
      const next = fingerprint();
      if (!next) return;
      if (!lastFingerprint) { lastFingerprint = next; return; }
      if (next === lastFingerprint) return;
      lastFingerprint = next;
      save();
    } catch (_) { }
  }

  function retryPending() {
    try {
      if (typeof window.__ottoRetryPendingSave === 'function') window.__ottoRetryPendingSave();
    } catch (_) { }
  }

  window.addEventListener('otto:save-state', event => {
    const d = event.detail || {};
    setState(d.state || 'saving', d);
    if (d.state === 'saved') lastFingerprint = fingerprint();
  });

  function boot() {
    ensureStyle();
    ensureBadge();
    wrapToast();
    lastFingerprint = fingerprint();
    setInterval(detectDirectMutation, 1500);
    setInterval(retryPending, 15000);
    document.addEventListener('visibilitychange', () => {
      detectDirectMutation();
      if (document.visibilityState === 'visible') retryPending();
    });
    window.addEventListener('online', retryPending);
    window.addEventListener('pagehide', detectDirectMutation);
    new MutationObserver(() => { ensureBadge(); wrapToast(); }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.__ottoPersistence = { canonicalUrl: CANONICAL_URL, fingerprint, retryPending };
})();
