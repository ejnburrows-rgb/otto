/* OTTO persistence UI/recovery guard.
   Permanent data lives in Supabase. IndexedDB/localStorage are recovery caches only.
   All writes flow through the single global save() function patched at build time. */
(function () {
  'use strict';

  const CANONICAL_URL = 'https://otto-kohl.vercel.app';
  let lastFingerprint = '';
  let toastWrapped = false;
  let recoveryShown = false;
  let professionalLogoSrc = '';
  let professionalLogoPromise = null;

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

      /* One professional logo treatment everywhere. The source asset is cropped
         in JS to its actual artwork bounds; CSS then preserves that full crop.
         Never use cover or a forced aspect ratio for the OTTO wordmark. */
      img.otto-logo-professional,
      #login img.otto-login-logo,
      #otto-global-brand img,
      .crystal-logo,
      .ot-sidebar-brand img {
        object-fit: contain !important;
        object-position: center !important;
        aspect-ratio: auto !important;
        max-width: 100% !important;
        background: #fff !important;
      }
      #login .otto-login-logo-wrap {
        overflow: visible !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        min-height: 118px !important;
        margin: 0 auto 26px !important;
      }
      #login img.otto-login-logo,
      #login img.otto-logo-professional {
        width: min(390px, 86vw) !important;
        height: auto !important;
        max-height: 150px !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 24px rgba(16,24,40,.09) !important;
      }
      #otto-global-brand {
        width: clamp(220px, 20vw, 310px) !important;
        height: auto !important;
        min-height: 76px !important;
        padding: 10px 14px !important;
        overflow: visible !important;
      }
      #otto-global-brand img,
      #otto-global-brand img.otto-logo-professional {
        width: 100% !important;
        height: auto !important;
        max-height: 96px !important;
        border-radius: 8px !important;
      }
      .ot-sidebar-brand { overflow: visible !important; }
      .ot-sidebar-brand img,
      .ot-sidebar-brand img.otto-logo-professional {
        width: min(190px, 100%) !important;
        height: auto !important;
        max-height: 72px !important;
        border-radius: 6px !important;
      }
      .crystal-logo,
      .crystal-logo.otto-logo-professional {
        width: auto !important;
        height: auto !important;
        max-width: 220px !important;
        max-height: 72px !important;
      }
      @media (max-width:900px){
        #login img.otto-login-logo,#login img.otto-logo-professional{width:min(340px,88vw)!important;max-height:132px!important}
        #otto-global-brand{width:174px!important;min-height:58px!important;padding:7px 9px!important}
        #otto-global-brand img,#otto-global-brand img.otto-logo-professional{max-height:72px!important}
      }
      @media (max-width:480px){
        #login img.otto-login-logo,#login img.otto-logo-professional{width:min(315px,90vw)!important;max-height:124px!important}
        #otto-global-brand{width:154px!important;min-height:52px!important;padding:6px 8px!important}
      }
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
          return;
        }
      } catch (_) { }
      return baseToast.apply(this, arguments);
    };
    toastWrapped = true;
  }

  function buildProfessionalLogo() {
    if (professionalLogoSrc) return Promise.resolve(professionalLogoSrc);
    if (professionalLogoPromise) return professionalLogoPromise;
    professionalLogoPromise = new Promise((resolve) => {
      const source = new Image();
      source.onload = () => {
        try {
          const w = source.naturalWidth || source.width;
          const h = source.naturalHeight || source.height;
          if (!w || !h) throw new Error('empty logo');
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(source, 0, 0);
          const pixels = ctx.getImageData(0, 0, w, h).data;

          const corner = Math.max(3, Math.floor(Math.min(w, h) * 0.018));
          let br = 0, bg = 0, bb = 0, bc = 0;
          const addSample = (x0, y0) => {
            for (let y = y0; y < Math.min(h, y0 + corner); y += 2) {
              for (let x = x0; x < Math.min(w, x0 + corner); x += 2) {
                const i = (y * w + x) * 4;
                if (pixels[i + 3] < 16) continue;
                br += pixels[i]; bg += pixels[i + 1]; bb += pixels[i + 2]; bc++;
              }
            }
          };
          addSample(0, 0); addSample(Math.max(0, w - corner), 0);
          addSample(0, Math.max(0, h - corner)); addSample(Math.max(0, w - corner), Math.max(0, h - corner));
          const baseR = bc ? br / bc : 255, baseG = bc ? bg / bc : 255, baseB = bc ? bb / bc : 255;

          let minX = w, minY = h, maxX = -1, maxY = -1;
          const step = Math.max(1, Math.floor(Math.min(w, h) / 700));
          for (let y = 0; y < h; y += step) {
            for (let x = 0; x < w; x += step) {
              const i = (y * w + x) * 4;
              if (pixels[i + 3] < 20) continue;
              const dr = pixels[i] - baseR, dg = pixels[i + 1] - baseG, db = pixels[i + 2] - baseB;
              const distance = Math.sqrt(dr * dr + dg * dg + db * db);
              if (distance < 30) continue;
              minX = Math.min(minX, x); minY = Math.min(minY, y);
              maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
            }
          }

          if (maxX < minX || maxY < minY) throw new Error('logo artwork not detected');
          const artW = maxX - minX + 1, artH = maxY - minY + 1;
          if (artW < w * 0.08 || artH < h * 0.04) throw new Error('logo detection too small');

          const padX = Math.max(12, Math.round(artW * 0.07));
          const padY = Math.max(12, Math.round(artH * 0.13));
          minX = Math.max(0, minX - padX); minY = Math.max(0, minY - padY);
          maxX = Math.min(w - 1, maxX + padX); maxY = Math.min(h - 1, maxY + padY);
          const cw = maxX - minX + 1, ch = maxY - minY + 1;

          const cropped = document.createElement('canvas');
          cropped.width = cw; cropped.height = ch;
          const cctx = cropped.getContext('2d');
          cctx.fillStyle = '#ffffff'; cctx.fillRect(0, 0, cw, ch);
          cctx.drawImage(source, minX, minY, cw, ch, 0, 0, cw, ch);
          professionalLogoSrc = cropped.toDataURL('image/png');
          resolve(professionalLogoSrc);
        } catch (_) {
          professionalLogoSrc = './logo.jpg';
          resolve(professionalLogoSrc);
        }
      };
      source.onerror = () => { professionalLogoSrc = './logo.jpg'; resolve(professionalLogoSrc); };
      source.src = './logo.jpg';
    });
    return professionalLogoPromise;
  }

  function normalizeLogos() {
    const logos = Array.from(document.querySelectorAll('img[src*="logo.jpg"], img.otto-login-logo, #otto-global-brand img, .crystal-logo, .ot-sidebar-brand img'));
    if (!logos.length) return;
    buildProfessionalLogo().then((src) => {
      logos.forEach((img) => {
        if (!img || img.dataset.ottoLogoProcessed === '1') return;
        img.dataset.ottoLogoProcessed = '1';
        img.classList.add('otto-logo-professional');
        img.alt = img.alt || 'OTTO Plumbing Inc.';
        if (src && src !== './logo.jpg') img.src = src;
      });
    });
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

  function showStartupRecovery(reason) {
    if (recoveryShown) return;
    const app = document.getElementById('app');
    const login = document.getElementById('login');
    const appVisible = app && !app.classList.contains('hidden');
    const loginVisible = login && !login.classList.contains('hidden');
    if (appVisible || loginVisible) return;
    recoveryShown = true;
    console.error('OTTO startup recovery', reason || 'unknown startup failure');
    try {
      if (typeof window.showCloudLogin === 'function') {
        window.showCloudLogin(tx(
          'OTTO could not finish loading. Your data is still in the cloud. Sign in again or reload this page.',
          'OTTO no pudo terminar de cargar. Sus datos siguen en la nube. Inicie sesión de nuevo o recargue esta página.'
        ));
        return;
      }
    } catch (_) { }
    if (login) {
      login.classList.remove('hidden');
      login.innerHTML = `<div class="card" style="max-width:520px;margin:40px auto;padding:24px"><h2>${tx('OTTO could not finish loading', 'OTTO no pudo terminar de cargar')}</h2><p>${tx('Your data remains stored in the cloud. Reload this page to try again.', 'Sus datos permanecen guardados en la nube. Recargue esta página para intentarlo de nuevo.')}</p><button class="btn block" onclick="location.reload()">${tx('Reload OTTO', 'Recargar OTTO')}</button></div>`;
    }
  }

  window.addEventListener('otto:save-state', event => {
    const d = event.detail || {};
    setState(d.state || 'saving', d);
    if (d.state === 'saved') lastFingerprint = fingerprint();
  });

  window.addEventListener('unhandledrejection', event => {
    setTimeout(() => showStartupRecovery(event && event.reason), 0);
  });
  window.addEventListener('error', event => {
    setTimeout(() => showStartupRecovery(event && event.error), 0);
  });
  setTimeout(() => showStartupRecovery('startup timeout'), 12000);

  function boot() {
    ensureStyle();
    ensureBadge();
    wrapToast();
    normalizeLogos();
    lastFingerprint = fingerprint();
    setInterval(detectDirectMutation, 1500);
    setInterval(retryPending, 15000);
    document.addEventListener('visibilitychange', () => {
      detectDirectMutation();
      if (document.visibilityState === 'visible') retryPending();
    });
    window.addEventListener('online', retryPending);
    window.addEventListener('pagehide', detectDirectMutation);
    new MutationObserver(() => { ensureBadge(); wrapToast(); normalizeLogos(); }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();

  window.__ottoPersistence = { canonicalUrl: CANONICAL_URL, fingerprint, retryPending, showStartupRecovery, normalizeLogos };
})();