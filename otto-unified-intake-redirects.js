/* Route legacy upload/scan buttons into the single unified intake front door. */
(function () {
  'use strict';
  const tx = (en, es) => { try { return window.__ottoUnifiedIntakeBridge?.getLang() === 'es' ? es : en; } catch (_) { return en; } };

  function ensureEnterpriseUi() {
    if (!document.querySelector('link[data-otto-enterprise-ui]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = './otto-enterprise-ui.css?v=1';
      link.setAttribute('data-otto-enterprise-ui', 'runtime');
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[data-otto-enterprise-ui]')) {
      const script = document.createElement('script');
      script.src = './otto-enterprise-ui.js?v=1';
      script.setAttribute('data-otto-enterprise-ui', 'runtime');
      document.body.appendChild(script);
    }
  }

  function openForJob(jobId) {
    if (!window.ottoUnifiedIntake?.open) return;
    window.ottoUnifiedIntake.open();
    const select = document.querySelector('[data-intake-job]');
    if (select && jobId) select.value = jobId;
  }

  function retireLegacyButtons() {
    document.querySelectorAll('button[onclick*="photoScanCreateCustomer()"],button[onclick*="quickScanCheck()"],button[onclick*="quickPhotoScan"]').forEach(btn => btn.remove());

    const uploadButtons = [...document.querySelectorAll('button[onclick*="uploadDoc("]')];
    const groups = new Map();
    uploadButtons.forEach(btn => {
      const row = btn.closest('.btnrow');
      if (!row) return;
      const code = btn.getAttribute('onclick') || '';
      const match = code.match(/uploadDoc\(['"]([^'"]+)['"]/);
      const jobId = match?.[1] || '';
      if (!groups.has(row)) groups.set(row, jobId);
    });
    groups.forEach((jobId, row) => {
      row.querySelectorAll('button[onclick*="uploadDoc("]').forEach(btn => btn.remove());
      if (row.querySelector('[data-otto-intake-job]')) return;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'btn sm'; btn.dataset.ottoIntakeJob = jobId;
      btn.innerHTML = `<i class="fas fa-arrow-up-from-bracket"></i> ${tx('Upload / Import','Subir / Importar')}`;
      row.prepend(btn);
    });
  }

  document.addEventListener('click', e => {
    const plan = e.target.closest?.('[data-otto-action="upload-plan"]');
    if (plan) {
      e.preventDefault(); e.stopImmediatePropagation();
      try { if (typeof closeModal === 'function') closeModal(); } catch (_) {}
      openForJob(plan.getAttribute('data-otto-job') || '');
      return;
    }
    const shortcut = e.target.closest?.('[data-otto-intake-job]');
    if (shortcut) { e.preventDefault(); e.stopImmediatePropagation(); openForJob(shortcut.dataset.ottoIntakeJob || ''); }
  }, true);

  ensureEnterpriseUi();
  const observer = new MutationObserver(() => queueMicrotask(retireLegacyButtons));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(retireLegacyButtons, 0);
})();
