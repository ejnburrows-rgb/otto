/* OTTO CRM — HR / Payroll workspace.
   Single policy source: otto-employee-policy-final.js, generated from
   OTTO_Codigo_de_Conducta_Empleado_Final_2026. No duplicate policy text lives here. */
(function () {
  'use strict';

  const VIEW = 'hr_payroll';
  const POLICY_VERSION = 2;
  let policyLanguage = null;

  /* Canonical policy runtime loads immediately after this file and fills these shells.
     Keeping the API stable lets the field gate + HR workspace share one document. */
  const POLICY = {
    en: { title: '', subtitle: '', intro: '', sections: [] },
    es: { title: '', subtitle: '', intro: '', sections: [] }
  };

  const text = (en, es) => {
    try { return lang === 'es' ? es : en; } catch (_) { return en; }
  };
  const safe = value => {
    try { return typeof esc === 'function' ? esc(String(value == null ? '' : value)) : String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    catch (_) { return String(value == null ? '' : value); }
  };
  const data = name => {
    try { return Array.isArray(db && db[name]) ? db[name] : []; }
    catch (_) { return []; }
  };
  const currentPolicyVersion = () => {
    try { return Number(window.__ottoFinalEmployeePolicy?.version || window.__ottoEmployeePolicy?.version || POLICY_VERSION); }
    catch (_) { return POLICY_VERSION; }
  };

  function currentPolicyRecord(userId) {
    const version = currentPolicyVersion();
    return data('consent_records')
      .filter(r => r && r.userId === userId && r.type === 'employee_code_of_conduct' && Number(r.version) === version && r.status === 'acknowledged')
      .sort((a, b) => String(b.acknowledgedAt || b.ts || '').localeCompare(String(a.acknowledgedAt || a.ts || '')))[0] || null;
  }

  function policyHtml(code) {
    const selected = code === 'es' ? 'es' : 'en';
    try {
      if (window.__ottoFinalEmployeePolicy && typeof window.__ottoFinalEmployeePolicy.render === 'function') {
        return window.__ottoFinalEmployeePolicy.render(selected);
      }
    } catch (_) {}
    return `<div class="hr-empty"><i class="fas fa-file-shield" aria-hidden="true"></i><div><strong>${text('Loading the current Code of Conduct…','Cargando el Código de Conducta vigente…')}</strong><span>${text('The canonical policy document is being prepared.','Se está preparando el documento canónico de políticas.')}</span></div></div>`;
  }

  function statusTable() {
    const workers = data('users').filter(u => u && u.role === 'field' && u.active !== false);
    if (!workers.length) {
      return `<div class="hr-empty"><i class="fas fa-circle-check" aria-hidden="true"></i><div><strong>${text('No field employees currently require acknowledgment','No hay empleados de campo que requieran acuse actualmente')}</strong><span>${text('New field employees must review and approve the current Code of Conduct before entering the field workspace.','Los nuevos empleados de campo deberán revisar y aprobar el Código de Conducta vigente antes de entrar al espacio de trabajo de campo.')}</span></div></div>`;
    }
    return `<div class="hr-table" role="table" aria-label="${safe(text('Code of Conduct acknowledgments','Acuses del Código de Conducta'))}">
      ${workers.map(worker => {
        const ack = currentPolicyRecord(worker.id);
        const when = ack && (ack.acknowledgedAt || ack.ts) ? new Date(ack.acknowledgedAt || ack.ts) : null;
        const date = when && !isNaN(when) ? when.toLocaleString(text('en-US','es-US'), {dateStyle:'medium', timeStyle:'short'}) : '';
        return `<div class="hr-row" role="row">
          <div role="cell"><strong>${safe(worker.name || worker.name_en || worker.name_es || text('Unnamed employee','Empleado sin nombre'))}</strong><span>${safe(worker.employeeId || '')}</span></div>
          <div role="cell"><span class="hr-status ${ack ? 'is-ok' : 'is-pending'}">${ack ? text('Acknowledged','Aceptado') : text('Pending','Pendiente')}</span></div>
          <div role="cell">${safe(date || text('Not approved yet','Aún no aprobado'))}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function renderHrPayroll() {
    const main = document.getElementById('main');
    if (!main) return;
    const workers = data('users').filter(u => u && u.role === 'field' && u.active !== false);
    const acknowledged = workers.filter(w => currentPolicyRecord(w.id)).length;
    const pending = Math.max(0, workers.length - acknowledged);
    const payrollCount = data('payroll').length;
    const code = policyLanguage || (typeof lang !== 'undefined' && lang === 'es' ? 'es' : 'en');
    policyLanguage = code;

    main.innerHTML = `<div class="ot-page hr-payroll-page">
      <header class="ot-head hr-head">
        <div><h1>${text('HR / Payroll','RR. HH. / Nómina')}</h1><p>${text('Employees, payroll, policy acknowledgments, and accountability in one place.','Empleados, nómina, acuses de políticas y responsabilidad en un solo lugar.')}</p></div>
      </header>
      <div class="hr-actions">
        <button type="button" class="ot-btn ot-btn-primary" data-hr-action="payroll"><i class="fas fa-money-check-dollar"></i>${text('Open Payroll','Abrir Nómina')}</button>
        <button type="button" class="ot-btn" data-hr-action="team"><i class="fas fa-users"></i>${text('Employee Records','Expedientes de empleados')}</button>
      </div>
      <div class="hr-stats">
        <div><strong>${workers.length}</strong><span>${text('Field employees','Empleados de campo')}</span></div>
        <div><strong>${acknowledged}</strong><span>${text('Policy acknowledged','Política aceptada')}</span></div>
        <div><strong>${pending}</strong><span>${text('Needs acknowledgment','Necesita aceptación')}</span></div>
        <div><strong>${payrollCount}</strong><span>${text('Payroll records','Registros de nómina')}</span></div>
      </div>
      <section class="hr-section">
        <div class="hr-section-head"><div><h2>${text('Employee accountability','Responsabilidad del empleado')}</h2><p>${text('Current Code of Conduct acknowledgment status.','Estado actual de aceptación del Código de Conducta.')}</p></div></div>
        ${statusTable()}
      </section>
      <section class="hr-section">
        <div class="hr-section-head hr-policy-tools">
          <div><h2>${text('Employee Code of Conduct','Código de Conducta del Empleado')}</h2><p>${text('Canonical 2026 policy used for the mandatory employee acknowledgment.','Política canónica de 2026 utilizada para el reconocimiento obligatorio del empleado.')}</p></div>
          <div class="hr-language" role="group" aria-label="Policy language"><button type="button" data-hr-policy-lang="en" class="${code === 'en' ? 'is-on' : ''}">English</button><button type="button" data-hr-policy-lang="es" class="${code === 'es' ? 'is-on' : ''}">Español</button></div>
        </div>
        <div class="hr-policy-wrap">${policyHtml(code)}</div>
      </section>
    </div>`;
    bindPage();
    syncNavigation();
  }

  function bindPage() {
    document.querySelector('[data-hr-action="payroll"]')?.addEventListener('click', () => { try { nav('payroll'); } catch (_) {} });
    document.querySelector('[data-hr-action="team"]')?.addEventListener('click', () => { try { nav('team'); } catch (_) {} });
    document.querySelectorAll('[data-hr-policy-lang]').forEach(btn => btn.addEventListener('click', () => {
      policyLanguage = btn.dataset.hrPolicyLang === 'es' ? 'es' : 'en';
      renderHrPayroll();
    }));
  }

  function installStyles() {
    if (document.getElementById('otto-hr-payroll-style')) return;
    const style = document.createElement('style');
    style.id = 'otto-hr-payroll-style';
    style.textContent = `
      .hr-payroll-page{max-width:1120px}.hr-head{margin-bottom:16px}.hr-actions{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 20px}.hr-actions .ot-btn{min-height:46px;font-size:15px}.hr-actions i{margin-right:7px}
      .hr-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px}.hr-stats>div{background:var(--ot-surface,var(--card,#fff));border:1px solid var(--ot-border,var(--line,#e5e7ea));border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:4px}.hr-stats strong{font-size:24px;line-height:1.1}.hr-stats span{color:var(--ot-text-2,var(--text2,#626872));font-size:14px}
      .hr-section{background:var(--ot-surface,var(--card,#fff));border:1px solid var(--ot-border,var(--line,#e5e7ea));border-radius:14px;padding:20px;margin-bottom:18px}.hr-section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px}.hr-section-head h2{font-size:20px;margin:0 0 4px}.hr-section-head p{margin:0;color:var(--ot-text-2,var(--text2,#626872));font-size:15px;line-height:1.45}
      .hr-table{border:1px solid var(--ot-border,var(--line,#e5e7ea));border-radius:10px;overflow:hidden}.hr-row{display:grid;grid-template-columns:minmax(220px,1fr) 150px minmax(180px,.8fr);gap:12px;align-items:center;padding:13px 15px;border-bottom:1px solid var(--ot-border,var(--line,#e5e7ea));font-size:15px}.hr-row:last-child{border-bottom:0}.hr-row>div:first-child{display:flex;flex-direction:column;gap:2px}.hr-row>div:first-child span{font-size:13px;color:var(--ot-text-2,var(--text2,#626872))}.hr-status{display:inline-flex;width:max-content;border-radius:999px;padding:5px 9px;font-weight:700;font-size:12px}.hr-status.is-ok{background:rgba(23,128,61,.12);color:var(--green,#17803D)}.hr-status.is-pending{background:rgba(183,106,0,.12);color:var(--amber,#B76A00)}
      .hr-empty{display:flex;gap:12px;align-items:flex-start;padding:16px;border:1px solid var(--ot-border,var(--line,#e5e7ea));border-radius:10px}.hr-empty i{color:var(--green,#17803D);margin-top:3px}.hr-empty div{display:flex;flex-direction:column;gap:4px}.hr-empty span{color:var(--ot-text-2,var(--text2,#626872));font-size:14px;line-height:1.45}
      .hr-language{display:inline-flex;border:1px solid var(--ot-border,var(--line,#e5e7ea));border-radius:9px;overflow:hidden;flex:0 0 auto}.hr-language button{border:0;background:transparent;color:var(--ot-text-2,var(--text2,#626872));padding:9px 12px;font-weight:700;cursor:pointer}.hr-language button.is-on{background:var(--ot-selected,rgba(37,99,235,.1));color:var(--ot-accent,#2563EB)}
      .hr-policy-wrap{max-width:920px}.hr-policy-heading{display:flex;justify-content:space-between;gap:16px;align-items:baseline;border-bottom:1px solid var(--ot-border,var(--line,#e5e7ea));padding-bottom:12px;margin-bottom:14px}.hr-policy-heading h1,.hr-policy-heading h2{font-size:22px;margin:0}.hr-policy-heading p,.hr-policy-heading span{color:var(--ot-text-2,var(--text2,#626872));font-size:13px}.hr-policy-major{padding:16px 0;border-top:1px solid var(--ot-border,var(--line,#e5e7ea))}.hr-policy-major h2{font-size:18px;margin:0 0 8px}.hr-policy p,.hr-policy li,.hr-policy td,.hr-policy th{font-size:16px;line-height:1.55}.hr-policy-toc{padding:10px 0 18px}.hr-policy-table{width:100%;border-collapse:collapse}.hr-policy-table th,.hr-policy-table td{padding:9px;border:1px solid var(--ot-border,var(--line,#e5e7ea));text-align:left}.hr-policy-callout{padding:12px 14px;border-radius:9px;background:var(--ot-selected,rgba(37,99,235,.08));margin:10px 0}.hr-policy-footer{padding:18px 0 4px;color:var(--ot-text-2,var(--text2,#626872));font-size:13px}
      .ot-nav-item[data-otto-hr-tab]{margin-top:2px}.ot-nav-item[data-otto-hr-tab].is-active{background:var(--ot-sidebar-hover,#1B1D21);color:#fff}.hr-more-shortcut{width:100%;min-height:46px;display:flex;align-items:center;gap:10px;border:0;border-radius:9px;padding:0 12px;background:var(--card,#fff);color:var(--text,#15171A);font:600 15px/1.2 inherit;text-align:left;cursor:pointer}.hr-more-shortcut:hover{background:var(--card-hover,#f5f5f6)}
      @media(max-width:900px){.hr-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.hr-policy-tools{flex-direction:column}.hr-row{grid-template-columns:1fr;gap:7px}.hr-section{padding:16px}.hr-policy-heading{flex-direction:column;align-items:flex-start}}
      @media(max-width:520px){.hr-stats{grid-template-columns:1fr 1fr}.hr-stats>div{padding:14px}.hr-actions{display:grid;grid-template-columns:1fr}.hr-actions .ot-btn{width:100%;justify-content:center}.hr-section-head h2{font-size:19px}}
    `;
    document.head.appendChild(style);
  }

  function ensureDesktopTab() {
    let shellUser = false;
    try { shellUser = !!session && session.role !== 'field'; } catch (_) {}
    const navRoot = document.querySelector('.ot-sidebar .ot-nav');
    if (!shellUser || !navRoot) return;
    let button = navRoot.querySelector('[data-otto-hr-tab]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'ot-nav-item';
      button.dataset.ottoHrTab = '1';
      button.innerHTML = `<i class="fas fa-people-group" aria-hidden="true"></i><span>${text('HR / Payroll','RR. HH. / Nómina')}</span>`;
      button.addEventListener('click', () => { try { nav(VIEW); } catch (_) {} });
      navRoot.appendChild(button);
    }
    const label = button.querySelector('span');
    const title = text('HR / Payroll','RR. HH. / Nómina');
    if (label.textContent !== title) label.textContent = title;
    button.classList.toggle('is-active', !!(typeof route !== 'undefined' && route && route.view === VIEW));
  }

  function injectMoreShortcut() {
    let shellUser = false;
    try { shellUser = !!session && session.role !== 'field'; } catch (_) {}
    if (!shellUser || document.querySelector('[data-hr-more-shortcut]')) return;
    const host = Array.from(document.querySelectorAll('.sheet,.modal,.modal-card,.card')).find(el => {
      const txt = (el.textContent || '').toLowerCase();
      return txt.includes('more') || txt.includes('más') || (txt.includes('business') && txt.includes('team')) || (txt.includes('negocio') && txt.includes('equipo'));
    });
    if (!host) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hr-more-shortcut';
    button.dataset.hrMoreShortcut = '1';
    button.innerHTML = `<i class="fas fa-people-group" aria-hidden="true"></i><span>${text('HR / Payroll','RR. HH. / Nómina')}</span>`;
    button.addEventListener('click', () => { try { document.querySelector('.modal-overlay')?.remove(); nav(VIEW); } catch (_) {} });
    host.appendChild(button);
  }

  function syncNavigation() {
    ensureDesktopTab();
    const button = document.querySelector('[data-otto-hr-tab]');
    if (button) button.classList.toggle('is-active', !!(typeof route !== 'undefined' && route && route.view === VIEW));
  }

  function applyPolicyToGate() {
    const gate = document.getElementById('policy-scroll');
    if (!gate) return;
    try {
      const code = (typeof lang !== 'undefined' && lang === 'es') ? 'es' : 'en';
      if (window.__ottoFinalEmployeePolicy && typeof window.__ottoFinalEmployeePolicy.render === 'function') {
        gate.dataset.ottoAccountabilityPolicy = String(currentPolicyVersion());
        gate.innerHTML = window.__ottoFinalEmployeePolicy.render(code);
      }
    } catch (_) {}
  }

  function installView() {
    const previous = window.viewHome;
    if (typeof previous !== 'function' || previous.__ottoHrWrapped) return;
    const wrapped = function () {
      if (typeof route !== 'undefined' && route && route.view === VIEW && (!session || session.role !== 'field')) return renderHrPayroll();
      return previous.apply(this, arguments);
    };
    wrapped.__ottoHrWrapped = true;
    window.viewHome = wrapped;
  }

  function installMoreWrap() {
    const previous = window.openMore;
    if (typeof previous !== 'function' || previous.__ottoHrWrapped) return;
    const wrapped = function () {
      const result = previous.apply(this, arguments);
      setTimeout(injectMoreShortcut, 0);
      return result;
    };
    wrapped.__ottoHrWrapped = true;
    window.openMore = wrapped;
  }

  function refreshCanonicalHosts() {
    if (!(window.__ottoFinalEmployeePolicy && typeof window.__ottoFinalEmployeePolicy.render === 'function')) return;
    const code = policyLanguage || ((typeof lang !== 'undefined' && lang === 'es') ? 'es' : 'en');
    document.querySelectorAll('.hr-policy-wrap').forEach(host => {
      if (!host.querySelector('.otto-final-employee-policy') || host.dataset.finalPolicyLang !== code) {
        host.dataset.finalPolicyLang = code;
        host.innerHTML = window.__ottoFinalEmployeePolicy.render(code);
      }
    });
    applyPolicyToGate();
  }

  function boot() {
    installStyles();
    installView();
    installMoreWrap();
    ensureDesktopTab();
    applyPolicyToGate();
    new MutationObserver(() => {
      installView();
      installMoreWrap();
      ensureDesktopTab();
      injectMoreShortcut();
      refreshCanonicalHosts();
      syncNavigation();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();

  window.__ottoEmployeePolicy = { version: POLICY_VERSION, policy: POLICY, render: renderHrPayroll, applyToGate: applyPolicyToGate, view: VIEW };
})();