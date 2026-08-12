/* OTTO CRM — final owner/office workspace.

   Owner direction is intentionally explicit:
   - three primary windows are open together by default: Today, Field Workers,
     and Inbox;
   - each window can minimize to the left rail, maximize inside the workspace,
     or use the full screen, then restore;
   - Tools is a launcher in the rail, not a fourth competing home window;
   - Julio uses green accents, Saray uses pink accents, Otto keeps blue;
   - crew information shows only operational facts: current work, actual recorded
     hours, and time-off status. Fake KPI charts, random heatmaps, login-history
     fluff, escalation counts and location-count vanity metrics are not used;
   - Plans & AutoCAD has one obvious upload hub for PDF/DWG/DXF/DWF/DGN files.

   This file intentionally does not touch the public plumbing website. */
(function () {
  'use strict';

  const legacyViewHome = viewHome;
  const legacyViewInbox = viewInbox;
  const legacyRenderNav = renderNav;
  const legacyStartApp = startApp;
  const legacyViewSettings = viewSettings;

  const WINDOWS = [
    { id: 'panel-today', key: 'today', icon: 'fa-calendar-day' },
    { id: 'panel-field', key: 'fieldWorkers', icon: 'fa-users-gear' },
    { id: 'panel-inbox', key: 'inbox', icon: 'fa-inbox' }
  ];
  const WINDOW_IDS = WINDOWS.map(w => w.id);
  const WINDOW_STATES = ['normal', 'minimized', 'maximized', 'fullscreen'];
  const windowStates = {
    'panel-today': 'normal',
    'panel-field': 'normal',
    'panel-inbox': 'normal'
  };

  function words(en, es) {
    return lang === 'es' ? es : en;
  }

  function list(name) {
    const value = db && db[name];
    return Array.isArray(value) ? value : [];
  }

  function isAdmin() {
    return Boolean(session && session.role !== 'field');
  }

  function onHome() {
    return Boolean(route && route.view === 'home');
  }

  function applySessionIdentity() {
    const wallpaper = document.getElementById('wallpaper-bg');
    if (!session) return;

    let userTheme = 'office';
    if (session.id === 'owner-1') userTheme = 'otto';
    if (session.id === 'owner-2') userTheme = 'julio';
    if (session.id === 'ops-1') userTheme = 'saray';
    document.body.setAttribute('data-otto-user', userTheme);

    if (!wallpaper) return;
    if (session.id === 'owner-2') wallpaper.setAttribute('data-user', 'owner-2');
    else if (session.id === 'ops-1') wallpaper.setAttribute('data-user', 'ops-1');
    else wallpaper.removeAttribute('data-user');
  }

  function userName(id) {
    const user = list('users').find(u => u.id === id);
    return user ? (user.name || user.name_en || user.name_es || '') : '';
  }

  function todayJobs() {
    return list('jobs').filter(j => j && String(j.scheduledDate || '').slice(0, 10) === todayISO());
  }

  function fieldWorkers() {
    return list('users').filter(u => u && u.role === 'field' && u.name);
  }

  function eventWorkerId(event) {
    return event && (event.workerId || event.userId) || '';
  }

  function workIntervals(workerId) {
    const events = list('job_events')
      .filter(e => eventWorkerId(e) === workerId && (e.type === 'check_in' || e.type === 'check_out') && e.ts)
      .sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const open = new Map();
    const intervals = [];

    events.forEach(e => {
      const jobId = e.jobId || '__no_job__';
      if (e.type === 'check_in') {
        open.set(jobId, new Date(e.ts));
        return;
      }
      const start = open.get(jobId);
      if (!start) return;
      const end = new Date(e.ts);
      if (!isNaN(start) && !isNaN(end) && end > start) intervals.push({ start, end, jobId: e.jobId || '' });
      open.delete(jobId);
    });

    open.forEach((start, jobId) => {
      const job = list('jobs').find(j => j.id === jobId);
      if (!job || !job.activeCheckIn) return;
      const end = new Date();
      if (!isNaN(start) && end > start) intervals.push({ start, end, jobId });
    });

    return intervals;
  }

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function startOfWeek() {
    const d = startOfToday();
    const mondayOffset = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - mondayOffset);
    return d;
  }

  function sumHours(intervals, from, to) {
    const a = from.getTime();
    const b = to.getTime();
    const ms = intervals.reduce((total, interval) => {
      const start = Math.max(a, interval.start.getTime());
      const end = Math.min(b, interval.end.getTime());
      return total + Math.max(0, end - start);
    }, 0);
    return ms / 3600000;
  }

  function currentJobFor(workerId) {
    return list('jobs').find(job => {
      if (!job || !job.activeCheckIn) return false;
      const event = list('job_events').find(e => e.id === job.activeCheckIn);
      return eventWorkerId(event) === workerId;
    }) || null;
  }

  function nextJobFor(workerId) {
    const today = todayISO();
    return list('jobs')
      .filter(j => j && j.assignedTo === workerId && j.scheduledDate && String(j.scheduledDate).slice(0, 10) >= today && !['completed', 'canceled'].includes(j.status))
      .sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)))[0] || null;
  }

  function workerTime(workerId) {
    const intervals = workIntervals(workerId);
    const now = new Date();
    return {
      today: sumHours(intervals, startOfToday(), now),
      week: sumHours(intervals, startOfWeek(), now),
      currentJob: currentJobFor(workerId),
      nextJob: nextJobFor(workerId)
    };
  }

  function hoursText(value) {
    const number = Number(value) || 0;
    return `${number.toFixed(number >= 10 ? 1 : 2)}h`;
  }

  function workerPto(workerId) {
    const today = todayISO();
    const requests = [...list('pto_requests'), ...list('time_off')]
      .filter(p => p && p.workerId === workerId)
      .sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || '')));
    const active = requests.find(p => p.status === 'approved' && (p.endDate || p.startDate || '') >= today);
    const pending = requests.find(p => p.status === 'pending');
    return active || pending || null;
  }

  function attentionItems(includeMail) {
    const items = [];

    if (includeMail) {
      list('emails').filter(e => e && e.direction !== 'outgoing' && !e.read).forEach(e => items.push({
        icon: 'fa-envelope',
        text: e.subject || e.from || words('Email', 'Correo'),
        meta: words('Email', 'Correo'),
        view: 'inbox'
      }));
    }

    const messages = list('employee_messages').filter(m => m && m.status === 'open');
    const messageText = new Set();
    messages.forEach(m => {
      const text = m.text || words('Worker message', 'Mensaje del trabajador');
      messageText.add(String(text).trim().toLowerCase());
      items.push({
        icon: 'fa-bolt',
        text: `${userName(m.workerId) || words('Field worker', 'Trabajador')}: ${text}`,
        meta: words('Worker', 'Trabajador'),
        view: 'urgent'
      });
    });

    list('pto_requests').filter(p => p && p.status === 'pending').forEach(p => items.push({
      icon: 'fa-calendar-check',
      text: `${userName(p.workerId) || words('Worker', 'Trabajador')} · ${p.startDate || ''}${p.endDate && p.endDate !== p.startDate ? ` – ${p.endDate}` : ''}`,
      meta: words('Time off', 'Tiempo libre'),
      view: 'team'
    }));

    list('alerts').filter(a => a && a.status === 'open').forEach(a => {
      const text = a.msg || a.title || a.type || t('alert');
      if (messageText.has(String(text).trim().toLowerCase())) return;
      items.push({ icon: 'fa-triangle-exclamation', text, meta: t('alert'), view: 'alerts' });
    });

    return items;
  }

  function navAttrs(view, id) {
    if (!view) return '';
    return ` data-otto-action="nav" data-otto-view="${esc(view)}"${id ? ` data-otto-id="${esc(String(id))}"` : ''}`;
  }

  function rowMarkup(icon, main, meta, view, id, action, extra) {
    const interactive = Boolean(view || action);
    const tag = interactive ? 'button' : 'div';
    let attrs = interactive ? ' type="button"' : '';
    if (view) attrs += navAttrs(view, id);
    if (action) attrs += ` data-otto-action="${action}"`;
    if (extra) attrs += ` ${extra}`;
    return `<${tag} class="otto-row${interactive ? ' otto-row-link' : ''}"${attrs}>
      <span class="otto-row-icon" aria-hidden="true"><i class="fas ${icon || 'fa-circle'}"></i></span>
      <span class="otto-row-main">${esc(main)}</span>
      ${meta ? `<span class="otto-row-meta">${esc(meta)}</span>` : ''}
    </${tag}>`;
  }

  function emptyRow(text) {
    return `<p class="otto-empty">${esc(text)}</p>`;
  }

  function actionButton(label, view, action) {
    if (view) return `<button type="button" class="otto-action is-primary"${navAttrs(view)}>${esc(label)}</button>`;
    return `<button type="button" class="otto-action is-primary" data-otto-action="${action}">${esc(label)}</button>`;
  }

  function todayWindow() {
    const jobs = todayJobs();
    const body = jobs.length
      ? jobs.slice(0, 10).map(job => {
          const customer = list('customers').find(c => c.id === job.customerId);
          return rowMarkup('fa-screwdriver-wrench', `${job.title || t('untitled')}${customer && customer.name ? ` · ${customer.name}` : ''}`, job.status ? t(job.status) : '', can('jobs') ? 'job' : '', job.id);
        }).join('')
      : emptyRow(words('No jobs scheduled for today.', 'No hay trabajos programados para hoy.'));
    return { count: jobs.length, body, actions: can('jobs') ? [actionButton(words('Open jobs', 'Abrir trabajos'), 'jobs')] : [] };
  }

  function fieldWindow() {
    const workers = fieldWorkers();
    const body = workers.length
      ? workers.map(worker => {
          const time = workerTime(worker.id);
          const status = time.currentJob
            ? `${words('On job', 'En trabajo')}: ${time.currentJob.title || t('job')}`
            : `${words('Today', 'Hoy')} ${hoursText(time.today)} · ${words('Week', 'Semana')} ${hoursText(time.week)}`;
          return rowMarkup('fa-user', worker.name, status, '', '', 'worker-summary', `data-otto-worker="${esc(worker.id)}"`);
        }).join('')
      : emptyRow(words('No field workers on the team yet.', 'Aún no hay trabajadores de campo en el equipo.'));
    return {
      count: workers.length,
      body,
      actions: [actionButton(words('View crew hours', 'Ver horas del equipo'), '', 'crew-hours')]
    };
  }

  function inboxWindow() {
    const items = attentionItems(true);
    const body = items.length
      ? items.slice(0, 12).map(item => rowMarkup(item.icon, item.text, item.meta, can(item.view) ? item.view : '')).join('')
      : emptyRow(words('Nothing needs your attention.', 'Nada requiere tu atención.'));
    return { count: items.length, body, actions: can('inbox') ? [actionButton(words('Open inbox', 'Abrir bandeja'), 'inbox')] : [] };
  }

  const WINDOW_BUILDERS = {
    'panel-today': todayWindow,
    'panel-field': fieldWindow,
    'panel-inbox': inboxWindow
  };

  function buildWindow(id) {
    try {
      return WINDOW_BUILDERS[id]();
    } catch (error) {
      if (window.console && console.warn) console.warn('OTTO window failed', id, error);
      return { count: 0, body: emptyRow(words('This window could not be loaded.', 'No se pudo cargar esta ventana.')), actions: [] };
    }
  }

  function windowControls(meta, state) {
    const restore = state === 'maximized' || state === 'fullscreen';
    return `<div class="otto-window-controls" aria-label="${esc(words('Window controls', 'Controles de ventana'))}">
      <button type="button" class="otto-window-control" data-otto-action="window-state" data-otto-panel="${meta.id}" data-otto-state="minimized" title="${esc(words('Minimize', 'Minimizar'))}" aria-label="${esc(words('Minimize', 'Minimizar'))}"><i class="fas fa-minus"></i></button>
      <button type="button" class="otto-window-control" data-otto-action="window-state" data-otto-panel="${meta.id}" data-otto-state="${restore ? 'normal' : 'maximized'}" title="${esc(restore ? words('Restore', 'Restaurar') : words('Maximize', 'Maximizar'))}" aria-label="${esc(restore ? words('Restore', 'Restaurar') : words('Maximize', 'Maximizar'))}"><i class="fas ${restore ? 'fa-clone' : 'fa-square'}"></i></button>
      <button type="button" class="otto-window-control" data-otto-action="window-state" data-otto-panel="${meta.id}" data-otto-state="${state === 'fullscreen' ? 'normal' : 'fullscreen'}" title="${esc(state === 'fullscreen' ? words('Exit full screen', 'Salir de pantalla completa') : words('Full screen', 'Pantalla completa'))}" aria-label="${esc(state === 'fullscreen' ? words('Exit full screen', 'Salir de pantalla completa') : words('Full screen', 'Pantalla completa'))}"><i class="fas ${state === 'fullscreen' ? 'fa-compress' : 'fa-expand'}"></i></button>
    </div>`;
  }

  function windowMarkup(meta) {
    const state = windowStates[meta.id] || 'normal';
    if (state === 'minimized') return '';
    const built = buildWindow(meta.id);
    return `<section class="otto-window" id="${meta.id}" data-panel-id="${meta.id}" data-state="${state}" tabindex="-1" role="region" aria-labelledby="${meta.id}-title">
      <header class="otto-window-titlebar">
        <span class="otto-window-icon" aria-hidden="true"><i class="fas ${meta.icon}"></i></span>
        <h2 class="otto-window-title" id="${meta.id}-title">${esc(t(meta.key))}</h2>
        <span class="otto-window-count">${Number(built.count) || 0}</span>
        ${windowControls(meta, state)}
      </header>
      <div class="otto-window-body">${built.body}</div>
      ${built.actions.length ? `<footer class="otto-window-actions">${built.actions.join('')}</footer>` : ''}
    </section>`;
  }

  function anyWindowState(state) {
    return WINDOW_IDS.some(id => windowStates[id] === state);
  }

  function setWindowState(id, state, focus) {
    if (!WINDOW_IDS.includes(id) || !WINDOW_STATES.includes(state)) return;
    if (state === 'maximized' || state === 'fullscreen') {
      WINDOW_IDS.forEach(other => {
        if (other !== id && (windowStates[other] === 'maximized' || windowStates[other] === 'fullscreen')) windowStates[other] = 'normal';
      });
    }
    windowStates[id] = state;
    if (!onHome()) {
      nav('home');
      return;
    }
    renderWorkspace(focus !== false && state !== 'minimized', id);
  }

  function railMarkup() {
    const hour = new Date().getHours();
    const greet = hour < 12 ? words('Good morning', 'Buenos días') : hour < 18 ? words('Good afternoon', 'Buenas tardes') : words('Good evening', 'Buenas noches');
    const tabs = WINDOWS.map(meta => {
      const state = windowStates[meta.id];
      const built = buildWindow(meta.id);
      return `<button type="button" class="otto-task${state === 'minimized' ? ' is-minimized' : ''}${state === 'maximized' || state === 'fullscreen' ? ' is-active' : ''}" data-otto-action="restore-window" data-otto-panel="${meta.id}" aria-label="${esc(state === 'minimized' ? words(`Restore ${t(meta.key)}`, `Restaurar ${t(meta.key)}`) : t(meta.key))}">
        <span class="otto-task-icon" aria-hidden="true"><i class="fas ${meta.icon}"></i></span>
        <span class="otto-task-label">${esc(t(meta.key))}</span>
        <span class="otto-task-count">${Number(built.count) || 0}</span>
      </button>`;
    }).join('');

    return `<aside class="otto-taskbar" aria-label="${esc(words('Workspace', 'Espacio de trabajo'))}">
      <div class="otto-taskbar-head">
        <p class="otto-taskbar-greet">${esc(greet)}, <b>${esc(session.name || '')}</b></p>
        <p class="otto-taskbar-date">${esc(fmtDate(todayISO()))}</p>
      </div>
      <div class="otto-task-list">${tabs}</div>
      <div class="otto-task-utilities">
        <button type="button" class="otto-tools-launch otto-plans-launch" data-otto-action="plans-hub"><span class="otto-task-icon"><i class="fas fa-drafting-compass"></i></span><span>${esc(words('Plans & AutoCAD', 'Planos y AutoCAD'))}</span></button>
        <button type="button" class="otto-tools-launch" data-otto-action="tools"><span class="otto-task-icon"><i class="fas fa-toolbox"></i></span><span>${esc(t('tools'))}</span></button>
      </div>
    </aside>`;
  }

  function primaryNavMarkup() {
    const items = [
      { icon: 'fa-house', label: words('Home', 'Inicio'), action: 'go-home' },
      { icon: 'fa-users', label: words('Customers', 'Clientes'), view: 'customers' },
      { icon: 'fa-screwdriver-wrench', label: words('Jobs', 'Trabajos'), view: 'jobs' },
      { icon: 'fa-inbox', label: words('Inbox', 'Bandeja'), view: 'inbox' },
      { icon: 'fa-file-signature', label: words('Estimates', 'Estimados'), view: 'estimates' },
      { icon: 'fa-credit-card', label: words('Payments', 'Pagos'), view: 'payments' },
      { icon: 'fa-drafting-compass', label: words('Plans & AutoCAD', 'Planos y AutoCAD'), action: 'plans-hub', featured: true, allowed: can('estimates') },
      { icon: 'fa-user-gear', label: words('Team', 'Equipo'), view: 'team' },
      { icon: 'fa-gear', label: words('Settings', 'Ajustes'), view: 'settings' }
    ].filter(item => item.allowed !== false && (!item.view || can(item.view)));

    return `<nav class="otto-primary-nav" aria-label="${esc(words('Main CRM sections', 'Secciones principales del CRM'))}">
      ${items.map(item => `<button type="button" class="otto-primary-tab${item.featured ? ' is-featured' : ''}" data-otto-action="${item.action || 'nav'}"${item.view ? ` data-otto-view="${esc(item.view)}"` : ''}>
        <i class="fas ${item.icon}" aria-hidden="true"></i><span>${esc(item.label)}</span>
      </button>`).join('')}
    </nav>`;
  }

  function renderWorkspace(focus, focusId) {
    const stage = document.getElementById('otto-window-stage');
    if (!stage) return;
    const maximized = anyWindowState('maximized');
    const fullscreen = anyWindowState('fullscreen');
    stage.classList.toggle('has-maximized', maximized);
    document.body.classList.toggle('otto-fullscreen-window', fullscreen);
    stage.innerHTML = WINDOWS.map(windowMarkup).join('') || `<div class="otto-all-minimized">${esc(words('All three windows are minimized. Restore one from the left panel.', 'Las tres ventanas están minimizadas. Restaure una desde el panel izquierdo.'))}</div>`;

    const home = document.querySelector('.otto-owner-home');
    if (home) {
      const oldRail = home.querySelector('.otto-taskbar');
      if (oldRail) oldRail.outerHTML = railMarkup();
    }

    if (focus && focusId) {
      const panel = document.getElementById(focusId);
      if (panel) panel.focus({ preventScroll: true });
    }
  }

  viewHome = function () {
    if (!session) return;
    if (session.role === 'field') {
      document.body.classList.remove('admin-home', 'admin-workspace', 'otto-secondary', 'otto-fullscreen-window');
      return legacyViewHome();
    }

    applySessionIdentity();
    document.body.classList.add('theme-app', 'admin-home', 'admin-workspace');
    const main = document.getElementById('main');
    if (!main) return;
    main.innerHTML = `<div class="otto-owner-home">${railMarkup()}${primaryNavMarkup()}<main class="otto-window-stage" id="otto-window-stage" aria-label="${esc(words('Main workspace windows', 'Ventanas principales'))}"></main></div>`;
    const fab = document.getElementById('fab');
    if (fab) fab.classList.add('hidden');
    renderWorkspace(false);
  };

  function openTools() {
    const L = lang === 'es';
    const item = (icon, title, subtitle, view, action) => `<button type="button" class="otto-tool-item"${view ? navAttrs(view) : ` data-otto-action="${action}"`}>
      <span class="otto-tool-icon"><i class="fas ${icon}"></i></span><span><b>${esc(title)}</b>${subtitle ? `<small>${esc(subtitle)}</small>` : ''}</span><i class="fas fa-chevron-right"></i>
    </button>`;

    modal(`<div class="otto-tools-sheet">
      <div class="otto-tools-hero">
        <span class="otto-tools-hero-icon"><i class="fas fa-drafting-compass"></i></span>
        <div><h2>${L ? 'Planos y AutoCAD' : 'Plans & AutoCAD'}</h2><p>${L ? 'PDF y DXF se pueden analizar. DWG, DWF y DGN se guardan en el trabajo; solicite una exportación PDF o DXF para el análisis.' : 'PDF and DXF can be analyzed. DWG, DWF and DGN are stored with the job; request a PDF or DXF export for analysis.'}</p></div>
        <button type="button" class="btn" data-otto-action="plans-hub">${L ? 'Abrir' : 'Open'}</button>
      </div>
      <div class="otto-tool-groups">
        <section><h3>${L ? 'Trabajo' : 'Work'}</h3>
          ${can('jobs') ? item('fa-screwdriver-wrench', t('jobs'), '', 'jobs') : ''}
          ${can('customers') ? item('fa-users', t('customers'), '', 'customers') : ''}
          ${can('calls') ? item('fa-phone', t('calls'), '', 'calls') : ''}
          ${can('followups') ? item('fa-bell', t('followups'), '', 'followups') : ''}
        </section>
        <section><h3>${L ? 'Dinero' : 'Money'}</h3>
          ${can('estimates') ? item('fa-file-signature', t('estimates'), '', 'estimates') : ''}
          ${can('pricing') ? item('fa-tags', L ? 'Precios de materiales' : 'Material Pricing', L ? 'Valores predeterminados editables' : 'Editable estimate defaults', 'pricing') : ''}
          ${can('contracts') ? item('fa-file-contract', L ? 'Contratos' : 'Contracts', '', 'contracts') : ''}
          ${can('invoices') ? item('fa-file-invoice-dollar', t('invoices'), '', 'invoices') : ''}
          ${can('payments') ? item('fa-credit-card', t('payments'), '', 'payments') : ''}
          ${can('payroll') ? item('fa-money-check-dollar', t('payroll'), '', 'payroll') : ''}
        </section>
        <section><h3>${L ? 'Equipo' : 'Team'}</h3>
          ${item('fa-clock', L ? 'Horas del equipo' : 'Crew Hours', L ? 'Hoy y esta semana' : 'Today and this week', '', 'crew-hours')}
          ${can('team') ? item('fa-user-gear', t('team'), '', 'team') : ''}
          ${can('urgent') ? item('fa-bolt', t('urgentHub'), '', 'urgent') : ''}
        </section>
        <section><h3>${L ? 'Negocio' : 'Business'}</h3>
          ${can('reports') ? item('fa-chart-line', t('reports'), '', 'reports') : ''}
          ${can('alerts') ? item('fa-triangle-exclamation', t('alerts'), '', 'alerts') : ''}
          ${can('assistant') ? item('fa-wand-magic-sparkles', t('assistant'), '', 'assistant') : ''}
          ${can('settings') ? item('fa-gear', t('settings'), '', 'settings') : ''}
        </section>
      </div>
    </div>`);
  }

  function planDocuments() {
    return list('documents')
      .filter(d => d && (d.kind === 'cad' || d.kind === 'drawing' || /\.(dwg|dxf|dwf|dgn|pdf)$/i.test(d.name || '')))
      .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
  }

  function openPlansHub() {
    const L = lang === 'es';
    const jobs = list('jobs').filter(j => j && !['completed', 'canceled'].includes(j.status));
    const recent = planDocuments().slice(0, 6);
    const jobRows = jobs.length ? jobs.map(job => `<div class="otto-plan-job">
      <span><b>${esc(job.title || t('untitled'))}</b><small>${esc(customerName(job.customerId))}</small></span>
      <button type="button" class="btn sm" data-otto-action="upload-plan" data-otto-job="${esc(job.id)}"><i class="fas fa-file-arrow-up"></i> ${L ? 'Subir plano' : 'Upload plan'}</button>
    </div>`).join('') : `<p class="otto-empty">${esc(L ? 'Cree un trabajo primero para guardar el plano en su carpeta.' : 'Create a job first so the plan has a job folder.')}</p>`;
    const recentRows = recent.length ? recent.map(doc => `<button type="button" class="otto-plan-recent" data-otto-action="open-plan" data-otto-doc="${esc(doc.id)}"><i class="fas fa-file-pdf"></i><span><b>${esc(doc.name || 'Plan')}</b><small>${esc(jobTitle(doc.jobId))}</small></span></button>`).join('') : `<p class="otto-empty">${esc(L ? 'Aún no hay planos cargados.' : 'No plans uploaded yet.')}</p>`;

    modal(`<div class="otto-plans-hub">
      <div class="otto-plans-head"><span class="otto-plans-icon"><i class="fas fa-drafting-compass"></i></span><div><h2>${L ? 'Planos y AutoCAD' : 'Plans & AutoCAD'}</h2><p>${L ? 'Analice PDF/DXF. Los archivos DWG/DWF/DGN se guardan, pero requieren una exportación PDF o DXF para cantidades confiables.' : 'Analyze PDF/DXF. DWG/DWF/DGN files are stored, but need a PDF or DXF export for reliable quantities.'}</p><div class="otto-format-line">PDF · DXF ${L ? '(análisis)' : '(analysis)'} · DWG · DWF · DGN ${L ? '(archivo)' : '(storage)'}</div></div></div>
      <div class="otto-plan-primary-actions">
        <button type="button" class="btn" data-otto-action="import-plan"><i class="fas fa-file-arrow-up"></i> ${L ? 'Importar PDF / AutoCAD' : 'Import PDF / AutoCAD'}</button>
        <button type="button" class="btn ghost" data-otto-action="new-job"><i class="fas fa-plus"></i> ${L ? 'Crear trabajo' : 'Create job'}</button>
      </div>
      <h3>${L ? 'Seleccione el trabajo' : 'Choose the job'}</h3><div class="otto-plan-jobs">${jobRows}</div>
      <h3>${L ? 'Planos recientes' : 'Recent plans'}</h3><div class="otto-plan-recent-list">${recentRows}</div>
    </div>`);
  }

  function crewRows() {
    return fieldWorkers().map(worker => ({ worker, time: workerTime(worker.id), pto: workerPto(worker.id) }));
  }

  function crewHoursMarkup(compact) {
    const rows = crewRows();
    const totalToday = rows.reduce((sum, row) => sum + row.time.today, 0);
    const totalWeek = rows.reduce((sum, row) => sum + row.time.week, 0);
    const active = rows.filter(row => row.time.currentJob).length;
    const summary = `<div class="otto-hours-summary">
      <div><span>${words('Today', 'Hoy')}</span><b>${hoursText(totalToday)}</b></div>
      <div><span>${words('This week', 'Esta semana')}</span><b>${hoursText(totalWeek)}</b></div>
      <div><span>${words('Clocked in', 'Trabajando')}</span><b>${active}</b></div>
    </div>`;
    const listRows = rows.length ? rows.map(({ worker, time, pto }) => {
      let status = time.currentJob ? `${words('On job', 'En trabajo')} · ${time.currentJob.title || t('job')}` : words('Off clock', 'Fuera de turno');
      if (pto) status += ` · ${pto.status === 'pending' ? words('PTO pending', 'Permiso pendiente') : words('PTO approved', 'Permiso aprobado')}`;
      return `<button type="button" class="otto-hours-row" data-otto-action="worker-summary" data-otto-worker="${esc(worker.id)}">
        <span class="otto-hours-person"><b>${esc(worker.name)}</b><small>${esc(status)}</small></span>
        <span><small>${words('Today', 'Hoy')}</small><b>${hoursText(time.today)}</b></span>
        <span><small>${words('Week', 'Semana')}</small><b>${hoursText(time.week)}</b></span>
        <i class="fas fa-chevron-right"></i>
      </button>`;
    }).join('') : emptyRow(words('No field workers on the team yet.', 'Aún no hay trabajadores de campo.'));
    return `${summary}<div class="otto-hours-list${compact ? ' is-compact' : ''}">${listRows}</div>`;
  }

  function openCrewHours() {
    modal(`<div class="otto-crew-hours"><h2>${esc(words('Crew Hours', 'Horas del equipo'))}</h2><p class="sheet-sub">${esc(words('Actual time recorded from job check-in and check-out.', 'Tiempo real registrado al entrar y salir de cada trabajo.'))}</p>${crewHoursMarkup(true)}</div>`);
  }

  function openWorkerSummary(workerId) {
    const worker = list('users').find(u => u.id === workerId);
    if (!worker) return;
    const time = workerTime(workerId);
    const pto = workerPto(workerId);
    const next = time.nextJob;
    const ptoText = !pto ? words('None', 'Ninguno') : pto.status === 'pending'
      ? `${words('Pending', 'Pendiente')} · ${pto.startDate || ''}${pto.endDate ? ` – ${pto.endDate}` : ''}`
      : `${words('Approved', 'Aprobado')} · ${pto.startDate || ''}${pto.endDate ? ` – ${pto.endDate}` : ''}`;

    modal(`<div class="otto-worker-summary">
      <div class="otto-worker-title"><span class="avatar" style="background:var(--action)">${esc(initials(worker.name))}</span><div><h2>${esc(worker.name)}</h2><p>${esc(words('Field worker', 'Trabajador de campo'))}</p></div></div>
      <div class="otto-worker-facts">
        <div><span>${words('Today', 'Hoy')}</span><b>${hoursText(time.today)}</b></div>
        <div><span>${words('This week', 'Esta semana')}</span><b>${hoursText(time.week)}</b></div>
      </div>
      <div class="otto-worker-detail"><span>${words('Current job', 'Trabajo actual')}</span><b>${esc(time.currentJob ? (time.currentJob.title || t('job')) : words('Off clock', 'Fuera de turno'))}</b></div>
      <div class="otto-worker-detail"><span>${words('Next job', 'Próximo trabajo')}</span><b>${esc(next ? `${next.title || t('job')} · ${fmtDate(next.scheduledDate)}` : words('None scheduled', 'Ninguno programado'))}</b></div>
      <div class="otto-worker-detail"><span>${words('Time off', 'Tiempo libre')}</span><b>${esc(ptoText)}</b></div>
    </div>`);
  }

  viewKpis = function () {
    const title = words('Crew Hours', 'Horas del equipo');
    const sub = words('Actual recorded work time for the whole field crew.', 'Tiempo de trabajo registrado para toda la cuadrilla.');
    const main = document.getElementById('main');
    if (!main) return;
    main.innerHTML = `${pageHead(title, sub)}${crewHoursMarkup(false)}`;
  };

  viewWorkerProfile = function () {
    const worker = list('users').find(u => u.id === route.id);
    if (!worker) return nav('kpis');
    const time = workerTime(worker.id);
    const pto = workerPto(worker.id);
    const next = time.nextJob;
    const ptoText = !pto ? words('None', 'Ninguno') : `${t(pto.status)} · ${pto.startDate || ''}${pto.endDate ? ` – ${pto.endDate}` : ''}`;
    const main = document.getElementById('main');
    if (!main) return;
    main.innerHTML = `${pageHead(worker.name, words('Field worker', 'Trabajador de campo'), "nav('kpis')", '', words('Crew Hours', 'Horas del equipo'))}
      <div class="otto-worker-page">
        <div class="otto-worker-facts"><div><span>${words('Today', 'Hoy')}</span><b>${hoursText(time.today)}</b></div><div><span>${words('This week', 'Esta semana')}</span><b>${hoursText(time.week)}</b></div></div>
        <div class="card otto-worker-page-card">
          <div class="otto-worker-detail"><span>${words('Current job', 'Trabajo actual')}</span><b>${esc(time.currentJob ? (time.currentJob.title || t('job')) : words('Off clock', 'Fuera de turno'))}</b></div>
          <div class="otto-worker-detail"><span>${words('Next job', 'Próximo trabajo')}</span><b>${esc(next ? `${next.title || t('job')} · ${fmtDate(next.scheduledDate)}` : words('None scheduled', 'Ninguno programado'))}</b></div>
          <div class="otto-worker-detail"><span>${words('Time off', 'Tiempo libre')}</span><b>${esc(ptoText)}</b></div>
        </div>
      </div>`;
  };

  viewSettings = function () {
    if (!session || session.role === 'field') return legacyViewSettings();
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const main = document.getElementById('main');
    if (!main) return;
    const ownerSecurity = session.role === 'owner' ? `
      <div class="section-title">${esc(words('Owner security', 'Seguridad del dueño'))}</div>
      <div class="card otto-settings-card" style="padding:14px">
        <div class="field"><label for="set-mfa">${esc(t('mfaOwner'))}</label><input id="set-mfa" type="password" inputmode="numeric" maxlength="4" placeholder="${hasPin(session, 'mfaPin') ? esc(words('Set — type to change', 'Configurado — escriba para cambiar')) : '••••'}"></div>
        <div class="btnrow">
          <button class="btn" type="button" onclick="saveMfa()"><i class="fas fa-shield-halved"></i> ${esc(t('save'))}</button>
          ${hasPin(session, 'mfaPin') ? `<button class="btn ghost" type="button" onclick="clearMfa()"><i class="fas fa-xmark"></i> ${esc(words('Remove extra code', 'Quitar código extra'))}</button>` : ''}
        </div>
      </div>` : '';
    main.innerHTML = `${pageHead(t('settings'), '')}
      <div class="card otto-settings-card">
        <div class="list-item" style="cursor:default"><div class="avatar" style="background:var(--action)">${esc(initials(session.name))}</div><div class="li-main"><div class="li-title">${esc(session.name)}</div><div class="li-sub">${esc(t(session.role))}</div></div></div>
      </div>
      <div class="section-title">${esc(words('Appearance', 'Apariencia'))}</div>
      <div class="card otto-settings-card"><button class="otto-settings-row" type="button" data-otto-action="theme"><i class="fas fa-${dark ? 'sun' : 'moon'}"></i><span>${esc(dark ? words('Light mode', 'Modo claro') : words('Dark mode', 'Modo oscuro'))}</span></button></div>
      ${can('team') ? `<div class="section-title">${esc(words('Team access', 'Acceso del equipo'))}</div><div class="card otto-settings-card"><button class="otto-settings-row" type="button"${navAttrs('team')}><i class="fas fa-user-gear"></i><span>${esc(t('team'))}</span></button></div>` : ''}
      ${ownerSecurity}
      <div class="section-title">${esc(words('Company email', 'Correo de la compañía'))}</div>
      <div class="card otto-settings-card" style="padding:14px">
        <div id="email-connection-status" role="status">${esc(words('Checking connection…', 'Comprobando la conexión…'))}</div>
        <div class="muted" style="margin-top:8px;font-size:13px">${esc(words('Secure SendGrid delivery works with any mailbox provider. Email passwords are never stored in OTTO.', 'El envío seguro por SendGrid funciona con cualquier proveedor. OTTO nunca guarda contraseñas de correo.'))}</div>
      </div>
      <div class="section-title">${esc(words('Data safety', 'Seguridad de datos'))}</div>
      <div class="card otto-settings-card">
        <button class="otto-settings-row" type="button" data-otto-action="backup"><i class="fas fa-download"></i><span>${esc(words('Download backup', 'Descargar respaldo'))}</span></button>
        <button class="otto-settings-row" type="button" data-otto-action="restore-backup"><i class="fas fa-upload"></i><span>${esc(words('Restore backup', 'Restaurar respaldo'))}</span></button>
      </div>
      <div class="btnrow"><button class="btn red block" data-otto-action="sign-out"><i class="fas fa-right-from-bracket"></i> ${esc(t('signOut'))}</button></div>`;
    refreshIntegrationStatus();
  };

  function renderSecondaryNav() {
    const bar = document.querySelector('.topbar');
    const show = isAdmin() && !onHome();
    let button = document.getElementById('otto-back-home');
    if (!show || !bar) {
      if (button) button.remove();
      document.body.classList.remove('otto-secondary');
      return;
    }
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.id = 'otto-back-home';
      button.className = 'otto-back-home';
      button.setAttribute('data-otto-action', 'go-home');
      bar.insertBefore(button, bar.firstChild);
    }
    button.innerHTML = `<span class="otto-back-arrow" aria-hidden="true">←</span><span>${esc(words('Back to Home', 'Volver al inicio'))}</span>`;
    document.body.classList.add('otto-secondary');
  }

  renderNav = function () {
    legacyRenderNav();
    const admin = isAdmin();
    document.body.classList.toggle('admin-workspace', admin);
    document.body.classList.toggle('admin-home', admin && onHome());
    const bottom = document.getElementById('bottomnav');
    if (bottom) bottom.classList.toggle('admin-nav-hidden', admin);
    if (!onHome()) document.body.classList.remove('otto-fullscreen-window');
    renderSecondaryNav();
  };

  startApp = function (...args) {
    document.body.classList.add('theme-app');
    applySessionIdentity();
    return legacyStartApp.apply(this, args);
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
    strip.innerHTML = `<div class="attention-strip-title"><i class="fas fa-triangle-exclamation"></i><span>${esc(words('Needs attention', 'Requiere atención'))}</span><span class="pill">${attention.length}</span></div>
      ${attention.slice(0, 8).map(item => rowMarkup(item.icon, item.text, item.meta, can(item.view) ? item.view : '')).join('')}`;
    const head = main.querySelector('.pagehead');
    if (head) head.insertAdjacentElement('afterend', strip);
    else main.prepend(strip);
  };

  expandTools = function () {
    if (!onHome()) nav('home');
    setTimeout(openTools, 0);
  };

  openPlumbBotModal = function () {
    nav('assistant');
  };

  sendPlumbBotMsg = function () {
    const input = document.getElementById('plumbbot-input');
    const text = (input && input.value || '').trim();
    if (input) input.value = '';
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

  document.addEventListener('click', function (event) {
    const target = event.target && event.target.closest && event.target.closest('[data-otto-action]');
    if (!target) return;
    const action = target.getAttribute('data-otto-action');

    if (action === 'window-state') {
      event.preventDefault();
      setWindowState(target.getAttribute('data-otto-panel'), target.getAttribute('data-otto-state'), true);
    } else if (action === 'restore-window') {
      event.preventDefault();
      const id = target.getAttribute('data-otto-panel');
      if (!WINDOW_IDS.includes(id)) return;
      if (windowStates[id] === 'minimized') {
        setWindowState(id, 'normal', true);
      } else if ((anyWindowState('maximized') || anyWindowState('fullscreen')) && windowStates[id] === 'normal') {
        setWindowState(id, 'maximized', true);
      } else {
        const panel = document.getElementById(id);
        if (panel) panel.focus({ preventScroll: true });
      }
    } else if (action === 'tools') {
      event.preventDefault();
      openTools();
    } else if (action === 'plans-hub') {
      event.preventDefault();
      closeModal();
      openPlansHub();
    } else if (action === 'upload-plan') {
      event.preventDefault();
      const jobId = target.getAttribute('data-otto-job');
      closeModal();
      if (jobId) uploadDoc(jobId, 'cad');
    } else if (action === 'import-plan') {
      event.preventDefault();
      closeModal();
      if (window.ottoUnifiedIntake && typeof window.ottoUnifiedIntake.openPlan === 'function') window.ottoUnifiedIntake.openPlan();
      else if (window.ottoUnifiedIntake && typeof window.ottoUnifiedIntake.open === 'function') window.ottoUnifiedIntake.open();
    } else if (action === 'new-job') {
      event.preventDefault();
      closeModal();
      if (typeof window.openJobForm === 'function') window.openJobForm();
    } else if (action === 'open-plan') {
      event.preventDefault();
      const docId = target.getAttribute('data-otto-doc');
      closeModal();
      if (docId) openDoc(docId);
    } else if (action === 'crew-hours') {
      event.preventDefault();
      closeModal();
      openCrewHours();
    } else if (action === 'worker-summary') {
      event.preventDefault();
      openWorkerSummary(target.getAttribute('data-otto-worker'));
    } else if (action === 'go-home') {
      event.preventDefault();
      nav('home');
    } else if (action === 'nav') {
      event.preventDefault();
      closeModal();
      const view = target.getAttribute('data-otto-view');
      if (view) nav(view, target.getAttribute('data-otto-id') || null);
    } else if (action === 'theme') {
      event.preventDefault();
      toggleTheme();
    } else if (action === 'backup') {
      event.preventDefault();
      exportAll();
    } else if (action === 'restore-backup') {
      event.preventDefault();
      importAll();
    } else if (action === 'sign-out') {
      event.preventDefault();
      signOut();
    }
  });

  window.setWindowState = setWindowState;
  window.expandTools = expandTools;
  window.openPlansHub = openPlansHub;
  window.openCrewHours = openCrewHours;
  window.openWorkerSummary = openWorkerSummary;
  window.openPlumbBotModal = openPlumbBotModal;
  window.sendPlumbBotMsg = sendPlumbBotMsg;

  setTimeout(() => {
    if (!session) return;
    document.body.classList.add('theme-app');
    applySessionIdentity();
    if (onHome()) render();
    else renderNav();
  }, 0);
})();
