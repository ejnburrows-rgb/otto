/* OTTO CRM — minimal wallpaper-first owner/office home.
   This file intentionally does not touch the public plumbing website. */
(function () {
  'use strict';

  const legacyViewHome = viewHome;
  const legacyViewInbox = viewInbox;
  const legacyRenderNav = renderNav;
  const legacyStartApp = startApp;

  const PANEL_STATES = ['collapsed', 'compact', 'expanded', 'fullscreen'];
  const panelStates = {
    'panel-today': 'compact',
    'panel-field': 'compact',
    'panel-inbox': 'compact',
    'panel-tools': 'compact'
  };

  function words(en, es) {
    return lang === 'es' ? es : en;
  }

  function applySessionWallpaper() {
    const wp = document.getElementById('wallpaper-bg');
    if (!wp || !session) return;
    if (session.id === 'owner-2') wp.setAttribute('data-user', 'owner-2');
    else if (session.id === 'ops-1') wp.setAttribute('data-user', 'ops-1');
    else wp.removeAttribute('data-user');
  }

  function syncFullscreenBody() {
    const hasFullscreen = Object.values(panelStates).includes('fullscreen') && route.view === 'home' && session && session.role !== 'field';
    document.body.classList.toggle('panel-fullscreen-open', hasFullscreen);
  }

  function setPanelState(panelId, state) {
    if (!PANEL_STATES.includes(state) || !Object.prototype.hasOwnProperty.call(panelStates, panelId)) return;
    if (state === 'fullscreen') {
      Object.keys(panelStates).forEach(id => {
        if (id !== panelId && panelStates[id] === 'fullscreen') panelStates[id] = 'compact';
      });
    }
    panelStates[panelId] = state;
    document.querySelectorAll('.home-panel[data-panel-id]').forEach(panel => {
      const id = panel.getAttribute('data-panel-id');
      panel.dataset.state = panelStates[id] || 'compact';
    });
    syncFullscreenBody();
  }

  function panelControls(panelId) {
    const labels = lang === 'es'
      ? { collapse: 'Minimizar', compact: 'Compacto', expand: 'Ampliar', full: 'Pantalla completa' }
      : { collapse: 'Minimize', compact: 'Compact', expand: 'Expand', full: 'Full screen' };
    return `<div class="panel-controls">
      <button type="button" class="panel-state-btn" onclick="setPanelState('${panelId}','collapsed')" aria-label="${labels.collapse}"><i class="fas fa-minus"></i><span>${labels.collapse}</span></button>
      <button type="button" class="panel-state-btn" onclick="setPanelState('${panelId}','compact')" aria-label="${labels.compact}"><i class="fas fa-compress"></i><span>${labels.compact}</span></button>
      <button type="button" class="panel-state-btn" onclick="setPanelState('${panelId}','expanded')" aria-label="${labels.expand}"><i class="fas fa-up-right-and-down-left-from-center"></i><span>${labels.expand}</span></button>
      <button type="button" class="panel-state-btn" onclick="setPanelState('${panelId}','fullscreen')" aria-label="${labels.full}"><i class="fas fa-expand"></i><span>${labels.full}</span></button>
    </div>`;
  }

  function panelShell(id, icon, title, count, preview, detail, primaryAction, primaryLabel) {
    return `<section id="${id}" class="home-panel" data-panel-id="${id}" data-state="${panelStates[id] || 'compact'}">
      <div class="home-panel-header">
        <div class="home-panel-icon"><i class="fas ${icon}"></i></div>
        <div class="home-panel-title">${esc(title)}</div>
        <div class="home-panel-count">${Number(count) || 0}</div>
      </div>
      <div class="home-panel-preview">${preview}</div>
      <div class="home-panel-detail">${detail || ''}</div>
      ${primaryAction ? `<button type="button" class="panel-primary" onclick="${primaryAction}">${esc(primaryLabel)}</button>` : ''}
      ${panelControls(id)}
    </section>`;
  }

  function jobItem(job) {
    const customer = db.customers.find(c => c.id === job.customerId);
    const title = job.title || t('untitled');
    const meta = job.status ? t(job.status) : '';
    return `<div class="home-panel-item"><i class="fas fa-screwdriver-wrench"></i><span class="home-panel-item-main">${esc(title)}${customer ? ` · ${esc(customer.name)}` : ''}</span>${meta ? `<span class="home-panel-item-meta">${esc(meta)}</span>` : ''}</div>`;
  }

  function workerItem(worker, todayJobs) {
    const assigned = todayJobs.filter(j => j.assignedTo === worker.id);
    const current = assigned.find(j => !['completed', 'canceled'].includes(j.status)) || assigned[0];
    const meta = current ? (current.title || t('job')) : words('No job today', 'Sin trabajo hoy');
    return `<div class="home-panel-item"><i class="fas fa-user"></i><span class="home-panel-item-main">${esc(worker.name)}</span><span class="home-panel-item-meta">${esc(meta)}</span></div>`;
  }

  function attentionItems() {
    const unreadMail = (db.inbox_emails || []).filter(e => !e.read).map(e => ({
      icon: 'fa-envelope',
      text: e.subject || e.from || words('Email', 'Correo'),
      meta: words('Email', 'Correo')
    }));
    const openAlerts = (db.alerts || []).filter(a => a.status === 'open').map(a => ({
      icon: 'fa-triangle-exclamation',
      text: a.msg || a.title || a.type || t('alert'),
      meta: t('alert')
    }));
    return [...unreadMail, ...openAlerts];
  }

  function attentionItem(item) {
    return `<div class="home-panel-item"><i class="fas ${item.icon}"></i><span class="home-panel-item-main">${esc(item.text)}</span><span class="home-panel-item-meta">${esc(item.meta)}</span></div>`;
  }

  function toolItem(icon, en, es) {
    return `<div class="home-panel-item"><i class="fas ${icon}"></i><span class="home-panel-item-main">${esc(words(en, es))}</span></div>`;
  }

  viewHome = function () {
    if (session.role === 'field') {
      document.body.classList.remove('admin-home', 'panel-fullscreen-open');
      return legacyViewHome();
    }

    applySessionWallpaper();
    document.body.classList.add('theme-app', 'admin-home');

    const hour = new Date().getHours();
    const greet = hour < 12 ? words('Good morning', 'Buenos días') : hour < 18 ? words('Good afternoon', 'Buenas tardes') : words('Good evening', 'Buenas noches');
    const todayJobs = (db.jobs || []).filter(j => (j.scheduledDate || '').slice(0, 10) === todayISO());
    const fieldWorkers = (db.users || []).filter(u => u.role === 'field' && u.name);
    const attention = attentionItems();

    const todayPreview = todayJobs.length
      ? todayJobs.slice(0, 3).map(jobItem).join('')
      : `<div class="home-panel-empty">${words('No jobs today', 'No hay trabajos hoy')}</div>`;
    const todayDetail = todayJobs.length > 3 ? todayJobs.slice(3, 10).map(jobItem).join('') : '';

    const fieldPreview = fieldWorkers.length
      ? fieldWorkers.slice(0, 3).map(w => workerItem(w, todayJobs)).join('')
      : `<div class="home-panel-empty">${words('No field workers', 'No hay trabajadores de campo')}</div>`;
    const fieldDetail = fieldWorkers.length > 3 ? fieldWorkers.slice(3).map(w => workerItem(w, todayJobs)).join('') : '';

    const inboxPreview = attention.length
      ? attention.slice(0, 3).map(attentionItem).join('')
      : `<div class="home-panel-empty">${words('Nothing needs your attention', 'Nada requiere tu atención')}</div>`;
    const inboxDetail = attention.length > 3 ? attention.slice(3, 10).map(attentionItem).join('') : '';

    const toolsPreview = [
      toolItem('fa-file-invoice-dollar', 'Money', 'Dinero'),
      toolItem('fa-screwdriver-wrench', 'Jobs & documents', 'Trabajos y documentos')
    ].join('');
    const toolsDetail = [
      toolItem('fa-chart-line', 'Business', 'Negocio'),
      toolItem('fa-gear', 'Settings', 'Configuración')
    ].join('');

    const html = `<div class="wallpaper-home-shell">
      <div class="wallpaper-home-header"><div class="greet">${esc(greet)}, <b>${esc(session.name)}</b></div><div class="muted">${fmtDate(todayISO())}</div></div>
      <div class="home-panels">
        ${panelShell('panel-today', 'fa-calendar-day', t('today'), todayJobs.length, todayPreview, todayDetail, "nav('jobs')", words('Open today’s jobs', 'Abrir trabajos de hoy'))}
        ${panelShell('panel-field', 'fa-users-gear', t('fieldWorkers'), fieldWorkers.length, fieldPreview, fieldDetail, "nav('team')", words('Open field workers', 'Abrir trabajadores'))}
        ${panelShell('panel-inbox', 'fa-inbox', t('inbox'), attention.length, inboxPreview, inboxDetail, "nav('inbox')", words('Open inbox', 'Abrir bandeja'))}
        ${panelShell('panel-tools', 'fa-toolbox', t('tools'), 4, toolsPreview, toolsDetail, 'expandTools()', words('Open tools', 'Abrir herramientas'))}
      </div>
    </div>`;

    $('#main').innerHTML = html;
    const fab = document.getElementById('fab');
    if (fab) fab.classList.add('hidden');
    syncFullscreenBody();
  };

  expandPanel = function (panelId) {
    setPanelState(panelId, panelStates[panelId] === 'expanded' ? 'compact' : 'expanded');
  };

  expandTools = function () {
    const L = lang === 'es';
    modal(`<h2>${esc(t('tools'))}</h2><div class="card" style="margin-top:12px">
      <div class="list-item" onclick="closeModal();nav('estimates')"><div class="avatar" style="background:var(--action)"><i class="fas fa-file-signature"></i></div><div class="li-main"><div class="li-title">${L ? 'Presupuestos' : 'Estimates'}</div><div class="li-sub">${L ? 'Crear y revisar presupuestos' : 'Create and review estimates'}</div></div><i class="fas fa-chevron-right chev"></i></div>
      <div class="list-item" onclick="closeModal();nav('invoices')"><div class="avatar" style="background:var(--green-fill)"><i class="fas fa-file-invoice-dollar"></i></div><div class="li-main"><div class="li-title">${L ? 'Facturas y pagos' : 'Invoices & payments'}</div><div class="li-sub">${L ? 'Dinero y cobros' : 'Money and collections'}</div></div><i class="fas fa-chevron-right chev"></i></div>
      <div class="list-item" onclick="closeModal();nav('payroll')"><div class="avatar" style="background:var(--amber-fill)"><i class="fas fa-money-check-dollar"></i></div><div class="li-main"><div class="li-title">${esc(t('payroll'))}</div><div class="li-sub">${L ? 'Subir Excel/CSV y revisar' : 'Upload Excel/CSV and review'}</div></div><i class="fas fa-chevron-right chev"></i></div>
      <div class="list-item" onclick="closeModal();nav('jobs')"><div class="avatar" style="background:var(--action)"><i class="fas fa-screwdriver-wrench"></i></div><div class="li-main"><div class="li-title">${esc(t('jobs'))}</div><div class="li-sub">${L ? 'Trabajos, clientes y documentos' : 'Jobs, customers and documents'}</div></div><i class="fas fa-chevron-right chev"></i></div>
      <div class="list-item" onclick="closeModal();nav('reports')"><div class="avatar" style="background:var(--green-fill)"><i class="fas fa-chart-line"></i></div><div class="li-main"><div class="li-title">${esc(t('reports'))}</div><div class="li-sub">${L ? 'Resumen del negocio' : 'Business overview'}</div></div><i class="fas fa-chevron-right chev"></i></div>
      <div class="list-item" onclick="closeModal();nav('settings')"><div class="avatar" style="background:var(--neutral-fill)"><i class="fas fa-gear"></i></div><div class="li-main"><div class="li-title">${esc(t('settings'))}</div><div class="li-sub">${L ? 'QuickBooks, idioma, apariencia y equipo' : 'QuickBooks, language, appearance and team'}</div></div><i class="fas fa-chevron-right chev"></i></div>
    </div>`);
  };

  renderNav = function () {
    legacyRenderNav();
    const minimalHome = session && session.role !== 'field' && route.view === 'home';
    document.body.classList.toggle('admin-home', Boolean(minimalHome));
    if (!minimalHome) document.body.classList.remove('panel-fullscreen-open');
    const bn = document.getElementById('bottomnav');
    if (bn) bn.classList.toggle('home-minimal', Boolean(minimalHome));
  };

  startApp = function (...args) {
    document.body.classList.add('theme-app');
    applySessionWallpaper();
    return legacyStartApp.apply(this, args);
  };

  viewInbox = function () {
    legacyViewInbox();
    if (!session || session.role === 'field') return;
    const alerts = (db.alerts || []).filter(a => a.status === 'open');
    if (!alerts.length) return;
    const main = document.getElementById('main');
    if (!main) return;
    const strip = document.createElement('section');
    strip.className = 'attention-strip';
    strip.innerHTML = `<div class="attention-strip-title"><i class="fas fa-triangle-exclamation"></i><span>${words('Needs attention', 'Requiere atención')}</span><span class="pill">${alerts.length}</span></div>
      ${alerts.slice(0, 5).map(a => `<button type="button" class="attention-item" onclick="nav('alerts')"><i class="fas fa-bell"></i><span>${esc(a.msg || a.title || a.type || t('alert'))}</span></button>`).join('')}`;
    const head = main.querySelector('.pagehead');
    if (head) head.insertAdjacentElement('afterend', strip);
    else main.prepend(strip);
  };

  openPlumbBotModal = function () {
    nav('assistant');
  };

  sendPlumbBotMsg = function () {
    const inp = document.getElementById('plumbbot-input');
    const text = (inp && inp.value || '').trim();
    if (inp) inp.value = '';
    closePlumbBotModal();
    nav('assistant');
    if (!text) return;
    setTimeout(() => {
      const chat = document.getElementById('chat-in');
      if (!chat) return;
      chat.value = text;
      askAssistant();
    }, 0);
  };

  window.setPanelState = setPanelState;
  window.expandPanel = expandPanel;
  window.expandTools = expandTools;
  window.openPlumbBotModal = openPlumbBotModal;
  window.sendPlumbBotMsg = sendPlumbBotMsg;

  // The inline boot starts before this enhancement file loads. Re-apply the
  // visual layer once it has had a chance to restore an existing session.
  setTimeout(() => {
    if (!session) return;
    document.body.classList.add('theme-app');
    applySessionWallpaper();
    if (route.view === 'home') render();
  }, 0);
})();
