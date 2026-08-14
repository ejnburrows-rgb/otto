/* OTTO CRM — enterprise UX simplification layer.
   Keeps the existing business logic and routes, but gives owner/office users a
   predictable enterprise shell: one navigation system, one command search,
   focused dashboard cards, and a mobile bottom bar. */
(function () {
  'use strict';

  const COMMAND_ID = 'otto-enterprise-command';
  const SECONDARY_NAV_ID = 'otto-enterprise-secondary-nav';
  let wired = false;

  function isAdmin() {
    return document.body.classList.contains('admin-workspace');
  }

  function isHome() {
    return document.body.classList.contains('admin-home') && !!document.querySelector('.otto-owner-home');
  }

  function spanish() {
    const active = document.querySelector('.langtoggle button.on');
    return !!active && active.textContent.trim().toUpperCase() === 'ES';
  }

  function copy(en, es) {
    return spanish() ? es : en;
  }

  function existingAllowedViews() {
    const views = new Set();
    document.querySelectorAll('[data-otto-view]').forEach((el) => {
      const view = el.getAttribute('data-otto-view');
      if (view) views.add(view);
    });
    return views;
  }

  const MODULES = [
    ['home', 'fa-house', 'Overview', 'Resumen'],
    ['customers', 'fa-users', 'Customers', 'Clientes'],
    ['jobs', 'fa-screwdriver-wrench', 'Jobs', 'Trabajos'],
    ['inbox', 'fa-inbox', 'Inbox', 'Bandeja'],
    ['estimates', 'fa-file-signature', 'Estimates', 'Estimados'],
    ['invoices', 'fa-file-invoice-dollar', 'Invoices', 'Facturas'],
    ['payments', 'fa-credit-card', 'Payments', 'Pagos'],
    ['team', 'fa-user-gear', 'Team', 'Equipo'],
    ['reports', 'fa-chart-line', 'Reports', 'Reportes'],
    ['assistant', 'fa-wand-magic-sparkles', 'Ask OTTO', 'Preguntar a OTTO'],
    ['settings', 'fa-gear', 'Settings', 'Ajustes']
  ];

  function actionAttrs(view, id) {
    if (view === 'home') return 'data-otto-action="go-home"';
    return `data-otto-action="nav" data-otto-view="${view}"${id ? ` data-otto-id="${String(id).replace(/"/g, '&quot;')}"` : ''}`;
  }

  function mountHomeHeader() {
    const home = document.querySelector('.otto-owner-home');
    const stage = document.getElementById('otto-window-stage');
    if (!home || !stage) return;

    let header = home.querySelector('.otto-enterprise-header');
    if (!header) {
      header = document.createElement('section');
      header.className = 'otto-enterprise-header';
      header.setAttribute('aria-label', 'Workspace overview');
      header.innerHTML = `
        <div class="otto-enterprise-heading">
          <span class="otto-enterprise-eyebrow">OTTO CRM</span>
          <h1>${copy('Overview', 'Resumen')}</h1>
          <p class="otto-enterprise-summary" aria-live="polite"></p>
        </div>
        <div class="otto-enterprise-header-actions">
          <button type="button" class="otto-enterprise-search-trigger" data-enterprise-open-command aria-label="${copy('Search OTTO', 'Buscar en OTTO')}">
            <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
            <span>${copy('Search OTTO', 'Buscar en OTTO')}</span>
            <kbd>⌘K</kbd>
          </button>
          <button type="button" class="otto-enterprise-quick" data-otto-action="plans-hub"><i class="fas fa-drafting-compass"></i><span>${copy('Plans', 'Planos')}</span></button>
          <button type="button" class="otto-enterprise-quick" data-otto-action="tools"><i class="fas fa-grid-2"></i><span>${copy('More', 'Más')}</span></button>
          <button type="button" class="otto-enterprise-primary" data-otto-action="new-job"><i class="fas fa-plus"></i><span>${copy('New job', 'Nuevo trabajo')}</span></button>
        </div>`;
      home.insertBefore(header, stage);
    }

    const counts = ['panel-today', 'panel-field', 'panel-inbox'].map((id) => {
      const value = document.querySelector(`#${id} .otto-window-count`);
      return Number(value && value.textContent) || 0;
    });
    const summary = header.querySelector('.otto-enterprise-summary');
    if (summary) {
      summary.textContent = spanish()
        ? `${counts[0]} trabajos hoy · ${counts[1]} trabajadores · ${counts[2]} pendientes`
        : `${counts[0]} jobs today · ${counts[1]} field workers · ${counts[2]} items need attention`;
    }

    const nav = home.querySelector('.otto-primary-nav');
    if (nav && !nav.querySelector('.otto-enterprise-more')) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'otto-primary-tab otto-enterprise-more';
      more.setAttribute('data-otto-action', 'tools');
      more.innerHTML = `<i class="fas fa-ellipsis" aria-hidden="true"></i><span>${copy('More', 'Más')}</span>`;
      nav.appendChild(more);
    }
  }

  function mountSecondaryNav() {
    const existing = document.getElementById(SECONDARY_NAV_ID);
    if (!isAdmin() || isHome()) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;

    const allowed = existingAllowedViews();
    const nav = document.createElement('aside');
    nav.id = SECONDARY_NAV_ID;
    nav.className = 'otto-enterprise-secondary-nav';
    nav.setAttribute('aria-label', copy('Main navigation', 'Navegación principal'));

    const visible = MODULES.filter(([view]) => view === 'home' || allowed.size === 0 || allowed.has(view));
    nav.innerHTML = `
      <div class="otto-enterprise-secondary-brand">
        <span class="otto-enterprise-brand-mark">O</span>
        <span><b>OTTO</b><small>CRM</small></span>
      </div>
      <nav class="otto-enterprise-secondary-links">
        ${visible.slice(0, 8).map(([view, icon, en, es]) => `<button type="button" ${actionAttrs(view)}><i class="fas ${icon}"></i><span>${spanish() ? es : en}</span></button>`).join('')}
      </nav>
      <div class="otto-enterprise-secondary-bottom">
        <button type="button" data-enterprise-open-command><i class="fas fa-magnifying-glass"></i><span>${copy('Search', 'Buscar')}</span></button>
        <button type="button" data-otto-action="plans-hub"><i class="fas fa-drafting-compass"></i><span>${copy('Plans', 'Planos')}</span></button>
        <button type="button" data-otto-action="tools"><i class="fas fa-grid-2"></i><span>${copy('More', 'Más')}</span></button>
      </div>`;
    document.body.appendChild(nav);
  }

  function commandShell() {
    let shell = document.getElementById(COMMAND_ID);
    if (shell) return shell;
    shell = document.createElement('div');
    shell.id = COMMAND_ID;
    shell.className = 'otto-command-shell';
    shell.hidden = true;
    shell.innerHTML = `
      <button type="button" class="otto-command-backdrop" data-enterprise-close-command aria-label="${copy('Close search', 'Cerrar búsqueda')}"></button>
      <section class="otto-command-panel" role="dialog" aria-modal="true" aria-label="${copy('Search OTTO', 'Buscar en OTTO')}">
        <div class="otto-command-input-row">
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" autocomplete="off" spellcheck="false" placeholder="${copy('Search customers, jobs, invoices, or tools…', 'Buscar clientes, trabajos, facturas o herramientas…')}" aria-label="${copy('Search OTTO', 'Buscar en OTTO')}" />
          <button type="button" data-enterprise-close-command aria-label="${copy('Close', 'Cerrar')}"><span>Esc</span></button>
        </div>
        <div class="otto-command-results" role="listbox"></div>
        <footer><span>${copy('Type to search your CRM', 'Escriba para buscar en su CRM')}</span><span>${copy('Enter opens', 'Enter abre')}</span></footer>
      </section>`;
    document.body.appendChild(shell);
    return shell;
  }

  function recordResults(query) {
    const q = query.trim().toLowerCase();
    const results = [];
    const allowed = existingAllowedViews();

    for (const [view, icon, en, es] of MODULES) {
      if (view !== 'home' && allowed.size && !allowed.has(view)) continue;
      const label = spanish() ? es : en;
      if (!q || label.toLowerCase().includes(q)) {
        results.push({ icon, title: label, meta: copy('Section', 'Sección'), view });
      }
    }

    if (!q) {
      results.push(
        { icon: 'fa-drafting-compass', title: copy('Plans & AutoCAD', 'Planos y AutoCAD'), meta: copy('Tool', 'Herramienta'), action: 'plans-hub' },
        { icon: 'fa-grid-2', title: copy('All tools', 'Todas las herramientas'), meta: copy('Tool', 'Herramienta'), action: 'tools' }
      );
      return results.slice(0, 12);
    }

    const db = window.db || {};
    const addRecords = (collection, view, detailView, icon, typeEn, typeEs, fields) => {
      const rows = Array.isArray(db[collection]) ? db[collection] : [];
      rows.forEach((row) => {
        if (!row || row.deleted === true) return;
        const haystack = fields.map((f) => row[f] || '').join(' ').toLowerCase();
        if (!haystack.includes(q)) return;
        const title = row.name || row.title || row.number || row.subject || row.id || copy('Record', 'Registro');
        const secondary = fields.map((f) => row[f]).find((v) => v && String(v) !== String(title));
        results.push({
          icon,
          title: String(title),
          meta: `${spanish() ? typeEs : typeEn}${secondary ? ` · ${String(secondary).slice(0, 56)}` : ''}`,
          view: detailView || view,
          id: detailView ? row.id : ''
        });
      });
    };

    addRecords('customers', 'customers', 'customer', 'fa-user', 'Customer', 'Cliente', ['name', 'phone', 'email', 'address']);
    addRecords('jobs', 'jobs', 'job', 'fa-screwdriver-wrench', 'Job', 'Trabajo', ['title', 'address', 'status', 'description']);
    addRecords('estimates', 'estimates', 'estimate', 'fa-file-signature', 'Estimate', 'Estimado', ['number', 'title', 'status']);
    addRecords('invoices', 'invoices', 'invoice', 'fa-file-invoice-dollar', 'Invoice', 'Factura', ['number', 'status', 'description']);

    return results.slice(0, 14);
  }

  function renderCommand(query) {
    const shell = commandShell();
    const resultsNode = shell.querySelector('.otto-command-results');
    const results = recordResults(query || '');
    resultsNode.innerHTML = results.length
      ? results.map((result, index) => `<button type="button" class="otto-command-result${index === 0 ? ' is-first' : ''}" ${result.action ? `data-otto-action="${result.action}"` : actionAttrs(result.view, result.id)} role="option">
          <span class="otto-command-icon"><i class="fas ${result.icon}"></i></span>
          <span class="otto-command-copy"><b>${escapeHtml(result.title)}</b><small>${escapeHtml(result.meta || '')}</small></span>
          <i class="fas fa-arrow-right otto-command-arrow" aria-hidden="true"></i>
        </button>`).join('')
      : `<div class="otto-command-empty"><i class="fas fa-magnifying-glass"></i><b>${copy('No results', 'Sin resultados')}</b><span>${copy('Try a customer, job address, invoice, or section name.', 'Pruebe un cliente, dirección de trabajo, factura o sección.')}</span></div>`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openCommand() {
    if (!isAdmin()) return;
    const shell = commandShell();
    shell.hidden = false;
    document.body.classList.add('otto-command-open');
    const input = shell.querySelector('input');
    if (input) {
      input.value = '';
      renderCommand('');
      requestAnimationFrame(() => input.focus({ preventScroll: true }));
    }
  }

  function closeCommand() {
    const shell = document.getElementById(COMMAND_ID);
    if (!shell) return;
    shell.hidden = true;
    document.body.classList.remove('otto-command-open');
  }

  function wireOnce() {
    if (wired) return;
    wired = true;

    document.addEventListener('click', (event) => {
      const open = event.target.closest && event.target.closest('[data-enterprise-open-command]');
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        openCommand();
        return;
      }
      const close = event.target.closest && event.target.closest('[data-enterprise-close-command]');
      if (close) {
        event.preventDefault();
        closeCommand();
        return;
      }
      const result = event.target.closest && event.target.closest('.otto-command-result');
      if (result) closeCommand();
    }, true);

    document.addEventListener('input', (event) => {
      if (event.target.matches && event.target.matches(`#${COMMAND_ID} input`)) renderCommand(event.target.value);
    });

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCommand();
        return;
      }
      if (!typing && event.key === '/' && isAdmin()) {
        event.preventDefault();
        openCommand();
        return;
      }
      if (event.key === 'Escape') closeCommand();
      if (event.key === 'Enter' && !document.getElementById(COMMAND_ID)?.hidden && target && target.matches(`#${COMMAND_ID} input`)) {
        const first = document.querySelector(`#${COMMAND_ID} .otto-command-result.is-first`);
        if (first) first.click();
      }
    });
  }

  function enhance() {
    wireOnce();
    if (!isAdmin()) {
      const secondary = document.getElementById(SECONDARY_NAV_ID);
      if (secondary) secondary.remove();
      closeCommand();
      return;
    }
    if (isHome()) mountHomeHeader();
    mountSecondaryNav();
  }

  const observer = new MutationObserver(() => requestAnimationFrame(enhance));
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true });
  else enhance();
})();
