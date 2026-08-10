/* OTTO CRM — owner/office home.

   One interaction model, deliberately small:

   - Four primary sections (Today, Field Workers, Inbox, Tools) are always
     rendered as a permanent left rail. They are the only primary home controls.
   - `activePanelId` is either one of those panel ids or null. Opening a panel
     closes every other panel because only one panel is ever rendered.
   - Every open panel carries one large "Back to panels" button; every secondary
     owner/office screen carries one "Back to Home" button in the top bar.

   Panel drag/reorder, full screen, maximize/restore and the duplicate
   minimize/collapse controls were removed: the permanent rail *is* the
   minimized state, so none of them had a job left to do.

   This file intentionally does not touch the public plumbing website. */
(function () {
  'use strict';

  const legacyViewHome = viewHome;
  const legacyViewInbox = viewInbox;
  const legacyRenderNav = renderNav;
  const legacyStartApp = startApp;

  /* `counted` marks the sections whose number means "this many things are
     waiting for you". Tools is a menu, so a badge there would read as work
     outstanding when it is nothing of the kind. */
  const PANELS = [
    { id: 'panel-today', key: 'today', icon: 'fa-calendar-day', counted: true },
    { id: 'panel-field', key: 'fieldWorkers', icon: 'fa-users-gear', counted: true },
    { id: 'panel-inbox', key: 'inbox', icon: 'fa-inbox', counted: true },
    { id: 'panel-tools', key: 'tools', icon: 'fa-toolbox', counted: false }
  ];
  const PANEL_IDS = PANELS.map(p => p.id);

  /* The whole home state. Null means "no panel open — wallpaper only". */
  let activePanelId = null;

  function words(en, es) {
    return lang === 'es' ? es : en;
  }

  function isAdmin() {
    return Boolean(session && session.role !== 'field');
  }

  function onHome() {
    return Boolean(route && route.view === 'home');
  }

  function list(name) {
    const v = db && db[name];
    return Array.isArray(v) ? v : [];
  }

  function applySessionWallpaper() {
    const wp = document.getElementById('wallpaper-bg');
    if (!wp || !session) return;
    if (session.id === 'owner-2') wp.setAttribute('data-user', 'owner-2');
    else if (session.id === 'ops-1') wp.setAttribute('data-user', 'ops-1');
    else wp.removeAttribute('data-user');
  }

  /* ---------------------------------------------------------------- data --- */

  function userName(id) {
    const u = list('users').find(x => x.id === id);
    return u ? (u.name || u.name_en || u.name_es || '') : '';
  }

  function todayJobs() {
    return list('jobs').filter(j => j && String(j.scheduledDate || '').slice(0, 10) === todayISO());
  }

  function fieldWorkers() {
    return list('users').filter(u => u && u.role === 'field' && u.name);
  }

  function attentionItems(includeMail = true) {
    const items = [];

    if (includeMail) {
      list('inbox_emails').filter(e => e && !e.read).forEach(e => items.push({
        kind: 'email',
        id: e.id,
        icon: 'fa-envelope',
        text: e.subject || e.from || words('Email', 'Correo'),
        meta: words('Email', 'Correo'),
        view: 'inbox'
      }));
    }

    const openMessages = list('employee_messages').filter(m => m && m.status === 'open');
    const messageText = new Set();
    openMessages.forEach(m => {
      const text = m.text || words('Worker message', 'Mensaje del trabajador');
      messageText.add(String(text).trim().toLowerCase());
      items.push({
        kind: 'worker',
        id: m.id,
        icon: 'fa-bolt',
        text: `${userName(m.workerId) || words('Field worker', 'Trabajador')}: ${text}`,
        meta: words('Worker', 'Trabajador'),
        view: 'urgent'
      });
    });

    list('pto_requests').filter(p => p && p.status === 'pending').forEach(p => items.push({
      kind: 'pto',
      id: p.id,
      icon: 'fa-calendar-check',
      text: `${userName(p.workerId) || words('Worker', 'Trabajador')} · ${p.startDate || ''}${p.endDate && p.endDate !== p.startDate ? ` – ${p.endDate}` : ''}`,
      meta: words('Time off', 'Tiempo libre'),
      view: can('kpis') ? 'kpis' : 'team'
    }));

    list('alerts').filter(a => a && a.status === 'open').forEach(a => {
      const text = a.msg || a.title || a.type || t('alert');
      if (messageText.has(String(text).trim().toLowerCase())) return;
      items.push({
        kind: 'alert',
        id: a.id,
        icon: 'fa-triangle-exclamation',
        text,
        meta: t('alert'),
        view: 'alerts'
      });
    });

    return items;
  }

  /* Everything an owner or office manager can actually open, grouped. This is
     the single place the CRM's secondary screens are listed, so nothing is
     reachable only through a hidden or duplicated path. */
  const TOOL_GROUPS = [
    {
      en: 'Money', es: 'Dinero', views: [
        ['estimates', 'fa-file-signature'],
        ['invoices', 'fa-file-invoice-dollar'],
        ['payments', 'fa-credit-card'],
        ['checks', 'fa-money-check'],
        ['payroll', 'fa-money-check-dollar']
      ]
    },
    {
      en: 'Work', es: 'Trabajo', views: [
        ['jobs', 'fa-screwdriver-wrench'],
        ['customers', 'fa-users'],
        ['calls', 'fa-phone'],
        ['followups', 'fa-bell'],
        ['workflows', 'fa-diagram-project'],
        ['map', 'fa-map-location-dot']
      ]
    },
    {
      en: 'Team', es: 'Equipo', views: [
        ['team', 'fa-user-gear'],
        ['kpis', 'fa-chart-pie'],
        ['urgent', 'fa-bolt']
      ]
    },
    {
      en: 'Business', es: 'Negocio', views: [
        ['reports', 'fa-chart-line'],
        ['alerts', 'fa-triangle-exclamation'],
        ['knowledge', 'fa-book'],
        ['emails', 'fa-envelope-open-text'],
        ['audit', 'fa-clipboard-list'],
        ['backups', 'fa-database']
      ]
    },
    {
      en: 'System', es: 'Sistema', views: [
        ['assistant', 'fa-wand-magic-sparkles'],
        ['settings', 'fa-gear']
      ]
    }
  ];

  const VIEW_LABEL = {
    audit: 'auditTrail',
    urgent: 'urgentHub',
    kpis: 'teamKpis'
  };

  function viewLabel(view) {
    return t(VIEW_LABEL[view] || view);
  }

  function availableTools() {
    return TOOL_GROUPS
      .map(g => ({ title: words(g.en, g.es), views: g.views.filter(([v]) => can(v)) }))
      .filter(g => g.views.length);
  }

  function toolCount() {
    return availableTools().reduce((n, g) => n + g.views.length, 0);
  }

  /* -------------------------------------------------------------- markup --- */

  function navAttrs(view, id) {
    if (!view) return '';
    return ` data-otto-action="nav" data-otto-view="${esc(view)}"${id ? ` data-otto-id="${esc(String(id))}"` : ''}`;
  }

  function row({ icon, main, meta, view, id }) {
    const tag = view ? 'button' : 'div';
    const attrs = view
      ? ` type="button" class="otto-row otto-row-link"${navAttrs(view, id)}`
      : ' class="otto-row"';
    return `<${tag}${attrs}>
      <span class="otto-row-icon" aria-hidden="true"><i class="fas ${icon || 'fa-circle'}"></i></span>
      <span class="otto-row-main">${esc(main)}</span>
      ${meta ? `<span class="otto-row-meta">${esc(meta)}</span>` : ''}
    </${tag}>`;
  }

  function emptyRow(text) {
    return `<p class="otto-empty">${esc(text)}</p>`;
  }

  function actionButton(label, view, primary) {
    return `<button type="button" class="otto-action${primary ? ' is-primary' : ''}"${navAttrs(view)}>${esc(label)}</button>`;
  }

  function todayPanel() {
    const jobs = todayJobs();
    const rows = jobs.slice(0, 20).map(j => {
      const customer = list('customers').find(c => c.id === j.customerId);
      return row({
        icon: 'fa-screwdriver-wrench',
        main: `${j.title || t('untitled')}${customer && customer.name ? ` · ${customer.name}` : ''}`,
        meta: j.status ? t(j.status) : '',
        view: can('jobs') ? 'job' : null,
        id: j.id
      });
    }).join('');
    return {
      count: jobs.length,
      body: jobs.length ? rows : emptyRow(words('No jobs scheduled for today.', 'No hay trabajos programados para hoy.')),
      actions: can('jobs') ? [actionButton(words('Open today’s jobs', 'Abrir trabajos de hoy'), 'jobs', true)] : []
    };
  }

  function fieldPanel() {
    const jobs = todayJobs();
    const workers = fieldWorkers();
    const canProfile = can('worker_profile');
    const rows = workers.map(w => {
      const assigned = jobs.filter(j => j.assignedTo === w.id);
      const current = assigned.find(j => !['completed', 'canceled'].includes(j.status)) || assigned[0];
      return row({
        icon: 'fa-user',
        main: w.name,
        meta: current ? (current.title || t('job')) : words('No job today', 'Sin trabajo hoy'),
        view: canProfile ? 'worker_profile' : null,
        id: w.id
      });
    }).join('');
    return {
      count: workers.length,
      body: workers.length ? rows : emptyRow(words('No field workers on the team yet.', 'Aún no hay trabajadores de campo en el equipo.')),
      actions: can('team') ? [actionButton(words('Open field workers', 'Abrir trabajadores'), 'team', true)] : []
    };
  }

  function inboxPanel() {
    const items = attentionItems(true);
    const rows = items.slice(0, 20).map(item => row({
      icon: item.icon,
      main: item.text,
      meta: item.meta,
      view: can(item.view) ? item.view : null
    })).join('');
    return {
      count: items.length,
      body: items.length ? rows : emptyRow(words('Nothing needs your attention.', 'Nada requiere tu atención.')),
      actions: can('inbox') ? [actionButton(words('Open inbox', 'Abrir bandeja'), 'inbox', true)] : []
    };
  }

  function toolsPanel() {
    const groups = availableTools();
    const body = groups.map(g => `<div class="otto-group">
      <h3 class="otto-group-title">${esc(g.title)}</h3>
      ${g.views.map(([view, icon]) => row({ icon, main: viewLabel(view), view })).join('')}
    </div>`).join('');
    return {
      count: toolCount(),
      body: groups.length ? body : emptyRow(words('No tools are available for this account.', 'No hay herramientas disponibles para esta cuenta.')),
      actions: []
    };
  }

  const PANEL_BUILDERS = {
    'panel-today': todayPanel,
    'panel-field': fieldPanel,
    'panel-inbox': inboxPanel,
    'panel-tools': toolsPanel
  };

  function panelCount(id) {
    try {
      const built = PANEL_BUILDERS[id] && PANEL_BUILDERS[id]();
      return built ? Number(built.count) || 0 : 0;
    } catch (err) {
      return 0;
    }
  }

  function railMarkup() {
    const hour = new Date().getHours();
    const greet = hour < 12
      ? words('Good morning', 'Buenos días')
      : hour < 18 ? words('Good afternoon', 'Buenas tardes') : words('Good evening', 'Buenas noches');

    const tabs = PANELS.map(p => {
      const open = activePanelId === p.id;
      const count = p.counted ? panelCount(p.id) : null;
      return `<button type="button" class="otto-tab${open ? ' is-open' : ''}"
        id="tab-${p.id}" data-otto-action="open-panel" data-otto-panel="${p.id}"
        aria-expanded="${open ? 'true' : 'false'}"${open ? ` aria-controls="${p.id}" aria-current="true"` : ''}>
        <span class="otto-tab-icon" aria-hidden="true"><i class="fas ${p.icon}"></i></span>
        <span class="otto-tab-label">${esc(t(p.key))}</span>
        ${count === null ? '' : `<span class="otto-tab-count"${count ? '' : ' data-empty="true"'}>${count}</span>`}
      </button>`;
    }).join('');

    return `<nav class="otto-rail" aria-label="${esc(words('Home sections', 'Secciones de inicio'))}">
      <div class="otto-rail-head">
        <p class="otto-rail-greet">${esc(greet)}, <b>${esc(session.name || '')}</b></p>
        <p class="otto-rail-date">${esc(fmtDate(todayISO()))}</p>
      </div>
      <div class="otto-rail-tabs">${tabs}</div>
    </nav>`;
  }

  function panelMarkup(id) {
    const meta = PANELS.find(p => p.id === id);
    if (!meta) return '';
    let built;
    try {
      built = PANEL_BUILDERS[id]();
    } catch (err) {
      /* Never leave the user on a blank panel with no way back. */
      built = {
        count: 0,
        body: emptyRow(words('This section could not be loaded.', 'No se pudo cargar esta sección.')),
        actions: []
      };
      if (window.console && console.warn) console.warn('OTTO: panel failed to build', id, err);
    }
    /* A list with no links of its own is a scroll region a keyboard user cannot
       reach, so it takes a tab stop only in that case — adding one when the
       rows are already buttons would just be an extra stop on the way in. */
    return `<section class="otto-panel" id="${id}" tabindex="-1" role="region" aria-labelledby="${id}-title">
      <button type="button" class="otto-back" data-otto-action="close-panel">
        <span class="otto-back-arrow" aria-hidden="true">←</span>
        <span>${esc(words('Back to panels', 'Volver a los paneles'))}</span>
      </button>
      <header class="otto-panel-head">
        <span class="otto-panel-icon" aria-hidden="true"><i class="fas ${meta.icon}"></i></span>
        <h2 class="otto-panel-title" id="${id}-title">${esc(t(meta.key))}</h2>
        ${meta.counted ? `<span class="otto-panel-count">${Number(built.count) || 0}</span>` : ''}
      </header>
      <div class="otto-panel-body"${/otto-row-link/.test(built.body) ? '' : ' tabindex="0"'}>${built.body}</div>
      ${built.actions.length ? `<div class="otto-panel-actions">${built.actions.join('')}</div>` : ''}
    </section>`;
  }

  /* ------------------------------------------------------------ rendering --- */

  function syncTabs() {
    PANELS.forEach(p => {
      const tab = document.getElementById(`tab-${p.id}`);
      if (!tab) return;
      const open = activePanelId === p.id;
      tab.classList.toggle('is-open', open);
      tab.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        tab.setAttribute('aria-controls', p.id);
        tab.setAttribute('aria-current', 'true');
      } else {
        tab.removeAttribute('aria-controls');
        tab.removeAttribute('aria-current');
      }
    });
  }

  function renderStage(focusPanel) {
    const stage = document.getElementById('otto-stage');
    if (!stage) return;
    if (activePanelId && !PANEL_IDS.includes(activePanelId)) activePanelId = null;
    /* One write of the whole stage, so two fast clicks can never leave two
       panels on screen or a half-updated one behind. */
    stage.innerHTML = activePanelId ? panelMarkup(activePanelId) : '';
    document.body.classList.toggle('otto-panel-open', Boolean(activePanelId));
    syncTabs();
    if (focusPanel && activePanelId) {
      const panel = document.getElementById(activePanelId);
      if (panel) panel.focus({ preventScroll: true });
    }
  }

  function openPanel(id, focusPanel) {
    if (!PANEL_IDS.includes(id)) return;
    activePanelId = activePanelId === id ? null : id;
    if (!onHome()) {
      nav('home');
      return;
    }
    renderStage(focusPanel && Boolean(activePanelId));
  }

  function closePanel() {
    const previous = activePanelId;
    activePanelId = null;
    renderStage(false);
    const tab = previous && document.getElementById(`tab-${previous}`);
    if (tab) tab.focus({ preventScroll: true });
  }

  function goHome() {
    activePanelId = null;
    nav('home');
  }

  viewHome = function () {
    if (!session) return;

    if (session.role === 'field') {
      document.body.classList.remove('admin-home', 'admin-workspace', 'otto-panel-open', 'otto-secondary');
      activePanelId = null;
      return legacyViewHome();
    }

    applySessionWallpaper();
    document.body.classList.add('theme-app', 'admin-home', 'admin-workspace');

    const main = $('#main');
    if (!main) return;
    main.innerHTML = `<div class="otto-home">${railMarkup()}<div class="otto-stage" id="otto-stage"></div></div>`;

    const fab = document.getElementById('fab');
    if (fab) fab.classList.add('hidden');

    renderStage(false);
  };

  /* One consistent secondary-screen control: a single labelled "Back to Home"
     button pinned to the top-left of the sticky top bar. No bottom dock, no
     second Home icon, nothing to guess at. */
  function renderSecondaryNav() {
    const bar = document.querySelector('.topbar');
    const show = isAdmin() && !onHome();
    let btn = document.getElementById('otto-back-home');
    if (!show || !bar) {
      if (btn) btn.remove();
      document.body.classList.remove('otto-secondary');
      return;
    }
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'otto-back-home';
      btn.className = 'otto-back-home';
      btn.setAttribute('data-otto-action', 'go-home');
      bar.insertBefore(btn, bar.firstChild);
    }
    btn.innerHTML = `<span class="otto-back-arrow" aria-hidden="true">←</span><span>${esc(words('Back to Home', 'Volver al inicio'))}</span>`;
    document.body.classList.add('otto-secondary');
  }

  renderNav = function () {
    legacyRenderNav();
    const admin = isAdmin();
    const minimalHome = admin && onHome();
    document.body.classList.toggle('admin-workspace', admin);
    document.body.classList.toggle('admin-home', minimalHome);
    if (!minimalHome) {
      if (!admin) activePanelId = null;
      document.body.classList.remove('otto-panel-open');
    }
    const bn = document.getElementById('bottomnav');
    if (bn) bn.classList.toggle('admin-nav-hidden', admin);
    renderSecondaryNav();
  };

  startApp = function (...args) {
    document.body.classList.add('theme-app');
    applySessionWallpaper();
    return legacyStartApp.apply(this, args);
  };

  /* Tools used to open a modal of its own. It is a rail panel now; keep the
     name working so anything that still calls it lands in the right place. */
  expandTools = function () {
    activePanelId = 'panel-tools';
    if (!onHome()) nav('home');
    else renderStage(false);
  };

  viewInbox = function () {
    legacyViewInbox();
    if (!isAdmin()) return;
    const attention = attentionItems(false);
    if (!attention.length) return;
    const main = document.getElementById('main');
    if (!main) return;
    const strip = document.createElement('section');
    strip.className = 'attention-strip';
    strip.innerHTML = `<div class="attention-strip-title"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i><span>${esc(words('Needs attention', 'Requiere atención'))}</span><span class="pill">${attention.length}</span></div>
      ${attention.slice(0, 8).map(item => `<button type="button" class="attention-item"${navAttrs(can(item.view) ? item.view : null)}><i class="fas ${item.icon}" aria-hidden="true"></i><span>${esc(item.text)}</span><small>${esc(item.meta)}</small></button>`).join('')}`;
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

  /* One delegated listener for the whole home and its secondary-screen control.
     Bound to the document once, so re-rendering #main can never leave a dead
     control behind. */
  document.addEventListener('click', function (e) {
    const el = e.target && e.target.closest && e.target.closest('[data-otto-action]');
    if (!el) return;
    const action = el.getAttribute('data-otto-action');
    if (action === 'open-panel') {
      e.preventDefault();
      openPanel(el.getAttribute('data-otto-panel'), true);
    } else if (action === 'close-panel') {
      e.preventDefault();
      closePanel();
    } else if (action === 'go-home') {
      e.preventDefault();
      goHome();
    } else if (action === 'nav') {
      e.preventDefault();
      const view = el.getAttribute('data-otto-view');
      if (!view) return;
      nav(view, el.getAttribute('data-otto-id') || null);
    }
  });

  window.expandTools = expandTools;
  window.openPlumbBotModal = openPlumbBotModal;
  window.sendPlumbBotMsg = sendPlumbBotMsg;

  // The inline boot starts before this enhancement file loads. Re-apply the
  // visual layer once it has had a chance to restore an existing session.
  setTimeout(() => {
    if (!session) return;
    document.body.classList.add('theme-app');
    applySessionWallpaper();
    if (onHome()) render();
    else renderNav();
  }, 0);
})();
