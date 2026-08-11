/* OTTO CRM — interaction polish. Progressive enhancement only. */
(function () {
  'use strict';

  let lastDialogOpener = null;
  let dialogSequence = 0;

  function isEditable(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function labelDialog(sheet) {
    if (!sheet || sheet.dataset.ottoPolishedDialog === '1') return;
    sheet.dataset.ottoPolishedDialog = '1';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    const heading = sheet.querySelector('h1, h2, h3');
    if (heading) {
      if (!heading.id) heading.id = `otto-dialog-${++dialogSequence}`;
      sheet.setAttribute('aria-labelledby', heading.id);
    }
  }

  function enhanceLiveRegions(root) {
    (root || document).querySelectorAll('.toast').forEach((toast) => {
      toast.setAttribute('role', toast.classList.contains('error') ? 'alert' : 'status');
      toast.setAttribute('aria-live', toast.classList.contains('error') ? 'assertive' : 'polite');
      toast.setAttribute('aria-atomic', 'true');
    });
  }

  function enhanceDialogs(root) {
    (root || document).querySelectorAll('.overlay .sheet').forEach(labelDialog);
  }

  function enhanceWorkspace(root) {
    (root || document).querySelectorAll('.otto-task[data-otto-panel]').forEach((button) => {
      const panelId = button.getAttribute('data-otto-panel');
      const panel = panelId ? document.getElementById(panelId) : null;
      const state = panel ? panel.getAttribute('data-state') : '';
      button.setAttribute('aria-pressed', state === 'maximized' || state === 'fullscreen' ? 'true' : 'false');
    });

    (root || document).querySelectorAll('.crystal-logo').forEach((logo) => {
      logo.setAttribute('title', document.documentElement.lang === 'es' ? 'Volver al inicio' : 'Back to Home');
      logo.setAttribute('tabindex', '0');
      logo.setAttribute('role', 'button');
    });
  }

  function enhance(root) {
    enhanceLiveRegions(root);
    enhanceDialogs(root);
    enhanceWorkspace(root);
  }

  function closeTopDialog() {
    const overlays = [...document.querySelectorAll('.overlay')].filter((el) => getComputedStyle(el).display !== 'none');
    const overlay = overlays[overlays.length - 1];
    if (!overlay) return false;
    const close = overlay.querySelector('.sheet-close, [data-action="close"], [aria-label="Close"], [aria-label="Cerrar"]');
    if (close) {
      close.click();
      setTimeout(() => {
        if (lastDialogOpener && document.contains(lastDialogOpener)) lastDialogOpener.focus({ preventScroll: true });
      }, 0);
      return true;
    }
    return false;
  }

  function trapDialogTab(event) {
    const overlays = [...document.querySelectorAll('.overlay')].filter((el) => getComputedStyle(el).display !== 'none');
    const overlay = overlays[overlays.length - 1];
    if (!overlay) return false;
    const sheet = overlay.querySelector('.sheet');
    if (!sheet) return false;
    const focusable = [...sheet.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
      .filter((el) => getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden');
    if (!focusable.length) return false;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }

  document.addEventListener('pointerdown', function (event) {
    if (!event.target.closest('.overlay')) lastDialogOpener = document.activeElement;
  }, true);

  document.addEventListener('click', function (event) {
    const logo = event.target.closest('.crystal-logo');
    if (logo && typeof window.nav === 'function') {
      window.nav('home');
      return;
    }
  });

  document.addEventListener('keydown', function (event) {
    const logo = event.target.closest && event.target.closest('.crystal-logo');
    if (logo && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      if (typeof window.nav === 'function') window.nav('home');
      return;
    }

    if (event.key === 'Tab' && trapDialogTab(event)) return;
    if (event.key !== 'Escape') return;
    if (closeTopDialog()) {
      event.preventDefault();
      return;
    }
    if (isEditable(event.target)) return;

    const fullscreen = document.querySelector('.otto-window[data-state="fullscreen"]');
    if (fullscreen && typeof window.setWindowState === 'function') {
      event.preventDefault();
      window.setWindowState(fullscreen.id, 'normal', true);
      return;
    }
    const maximized = document.querySelector('.otto-window[data-state="maximized"]');
    if (maximized && typeof window.setWindowState === 'function') {
      event.preventDefault();
      window.setWindowState(maximized.id, 'normal', true);
    }
  });

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        enhance(node);
        if (node.matches('.overlay')) {
          const sheet = node.querySelector('.sheet');
          if (sheet) {
            requestAnimationFrame(() => {
              const first = sheet.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])');
              if (first) first.focus({ preventScroll: true });
            });
          }
        }
      }
    }
    enhanceWorkspace(document);
  });

  function start() {
    enhance(document);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state', 'class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
