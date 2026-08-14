/* OTTO CRM — owner reference shell and Today screen.

   This layer replaces the wallpaper-and-floating-windows presentation for
   owner/office sessions with one quiet application shell:

   - desktop: a dark left sidebar with five primary destinations, one command
     entry (Search or Ask OTTO, ⌘K) and a More menu for everything else;
   - phone: the same five destinations as a bottom bar, content full width;
   - Home is a Today screen: a short summary line, today's jobs as the dominant
     section, what needs attention, and what recently changed.

   It only touches presentation. Data, permissions, navigation, Supabase, the
   assistant backend and every existing screen keep working exactly as before —
   secondary screens still render their own markup into `#main`, they simply do
   it inside this shell. Everything shown here is read from `db`; nothing is
   invented, and each section has a real empty state instead of filler. */
(function () {
  'use strict';

  const priorViewHome = viewHome;
  const priorRenderNav = renderNav;

  /* Routes owned by this shell. `render()` falls back to `viewHome` for any
     view it does not know, so these need no entry in the app's view table —
     viewHome dispatches on `route.view` below. */
  const SCHEDULE_VIEW = 'otto_schedule';
  const MONEY_VIEW = 'otto_money';

  const PRIMARY = [
    { id: 'today', view: 'home', icon: 'fa-house', en: 'Today', es: 'Hoy' },
    { id: 'schedule', view: SCHEDULE_VIEW, icon: 'fa-calendar-day', en: 'Schedule', es: 'Agenda', perm: 'jobs' },
    { id: 'jobs', view: 'jobs', icon: 'fa-screwdriver-wrench', en: 'Jobs', es: 'Trabajos', perm: 'jobs' },
    { id: 'customers', view: 'customers', icon: 'fa-user-group', en: 'Customers', es: 'Clientes', perm: 'customers' },
    { id: 'money', view: MONEY_VIEW, icon: 'fa-dollar-sign', en: 'Money', es: 'Dinero', perm: 'invoices' }
  ];

  /* Which primary destination is highlighted for a given route. Secondary
     screens stay reachable and still light up the section they belong to. */
  const ROUTE_GROUP = {
    home: 'today',
    [SCHEDULE_VIEW]: 'schedule',
    jobs: 'jobs', job: 'jobs',
    customers: 'customers', customer: 'customers',
    [MONEY_VIEW]: 'money', invoices: 'money', payments: 'money', estimates: 'money',
    checks: 'money', payroll: 'money', contracts: 'money', pricing: 'money'
  };

  /* Secondary features keep every existing entry point in code; they are simply
     not primary navigation any more. */
  const MORE_GROUPS = [
    {
      en: 'Work', es: 'Trabajo', items: [
        { view: 'inbox', icon: 'fa-inbox', en: 'Inbox', es: 'Bandeja' },
        { action: 'plans-hub', perm: 'jobs', icon: 'fa-drafting-compass', en: 'Plans & AutoCAD', es: 'Planos y AutoCAD' },
        { view: 'calls', icon: 'fa-phone', en: 'Calls', es: 'Llamadas' },
        { view: 'followups', icon: 'fa-bell', en: 'Follow-ups', es: 'Seguimientos' },
        { view: 'map', icon: 'fa-map-location-dot', en: 'Map', es: 'Mapa' },
        { view: 'workflows', icon: 'fa-diagram-project', en: 'Workflows', es: 'Flujos' }
      ]
    },
    {
      en: 'Money', es: 'Dinero', items: [
        { view: MONEY_VIEW, perm: 'invoices', icon: 'fa-dollar-sign', en: 'Money overview', es: 'Resumen de dinero' },
        { view: 'estimates', icon: 'fa-file-signature', en: 'Estimates', es: 'Estimados' },
        { view: 'invoices', icon: 'fa-file-invoice-dollar', en: 'Invoices', es: 'Facturas' },
        { view: 'payments', icon: 'fa-credit-card', en: 'Payments', es: 'Pagos' },
        { view: 'checks', icon: 'fa-money-check', en: 'Checks', es: 'Cheques' },
        { view: 'payroll', icon: 'fa-money-check-dollar', en: 'Payroll', es: 'Nómina' },
        { view: 'pricing', icon: 'fa-tags', en: 'Material pricing', es: 'Precios de materiales' },
        { view: 'contracts', icon: 'fa-file-contract', en: 'Contracts', es: 'Contratos' }
      ]
    },
    {
      en: 'Team', es: 'Equipo', items: [
        { view: 'team', icon: 'fa-user-gear', en: 'Team', es: 'Equipo' },
        { view: 'kpis', icon: 'fa-clock', en: 'Crew hours', es: 'Horas del equipo' },
        { view: 'urgent', icon: 'fa-bolt', en: 'Urgent', es: 'Urgente' }
      ]
    },
    {
      en: 'Business', es: 'Negocio', items: [
        { view: 'reports', icon: 'fa-chart-line', en: 'Reports', es: 'Reportes' },
        { view: 'knowledge', icon: 'fa-book', en: 'Knowledge', es: 'Conocimiento' },
        { view: 'alerts', icon: 'fa-triangle-exclamation', en: 'Alerts', es: 'Alertas' },
        { view: 'backups', icon: 'fa-database', en: 'Backups', es: 'Respaldos' },
        { view: 'audit', icon: 'fa-clipboard-list', en: 'Audit', es: 'Auditoría' },
        { view: 'assistant', icon: 'fa-wand-magic-sparkles', en: 'Ask OTTO', es: 'Preguntar a OTTO' },
        { view: 'settings', icon: 'fa-gear', en: 'Settings', es: 'Ajustes' }
      ]
    }
  ];

  /* ── small helpers ─────────────────────────────────────────────────────── */

  const L = () => lang === 'es';
  const words = (en, es) => (L() ? es : en);
  const label = item => words(item.en, item.es);

  function list(name) {
    const value = db && db[name];
    return Array.isArray(value) ? value : [];
  }

  function isShellUser() {
    return Boolean(session) && session.role !== 'field';
  }

  function allowed(item) {
    if (item.perm) return can(item.perm);
    if (item.view) return can(item.view) || item.view === 'settings' || item.view === 'assistant';
    return true;
  }

  function userName(id) {
    const user = list('users').find(u => u.id === id);
    return user ? (user.name || '') : '';
  }

  function openJobs() {
    return list('jobs').filter(j => j && !['completed', 'canceled'].includes(j.status));
  }

  function jobsToday() {
    const today = todayISO();
    return list('jobs')
      .filter(j => j && (String(j.scheduledDate || '').slice(0, 10) === today || j.activeCheckIn))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }

  function sortKey(job) {
    return `${jobTime(job) || '~'}${job.title || ''}`;
  }

  /* A real clock time is only shown when OTTO actually holds one: the moment
     the crew checked in, or a scheduled date that carries a time. Nothing is
     fabricated to fill the column. */
  function jobTime(job) {
    if (job.activeCheckIn) {
      const event = list('job_events').find(e => e.id === job.activeCheckIn);
      if (event && event.ts) return clock(event.ts);
    }
    const raw = String(job.scheduledDate || '');
    if (raw.includes('T') && raw.length > 11) return clock(raw);
    if (job.scheduledTime) return String(job.scheduledTime);
    return '';
  }

  function clock(value) {
    const date = new Date(value);
    if (isNaN(date)) return '';
    return date.toLocaleTimeString(L() ? 'es' : 'en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function jobStatus(job) {
    if (job.activeCheckIn) return { text: words('On site', 'En sitio'), tone: 'is-active' };
    if (job.status === 'inProgress') return { text: t('inProgress'), tone: 'is-active' };
    if (job.status === 'completed') return { text: t('completed'), tone: 'is-done' };
    if (job.status === 'canceled') return { text: t('canceled'), tone: 'is-done' };
    if (job.status === 'scheduled') return { text: t('scheduled'), tone: 'is-scheduled' };
    return { text: job.status ? t(job.status) : words('New', 'Nuevo'), tone: '' };
  }

  /* ── UI primitives ─────────────────────────────────────────────────────── */

  function navAttrs(view, id) {
    return ` data-otto-action="nav" data-otto-view="${esc(view)}"${id ? ` data-otto-id="${esc(String(id))}"` : ''}`;
  }

  function badge(text, tone) {
    return `<span class="ot-badge ${tone || ''}">${esc(text)}</span>`;
  }

  function jobRow(job) {
    const time = jobTime(job);
    const status = jobStatus(job);
    const customer = customerName(job.customerId);
    const tech = userName(job.assignedTo);
    return `<button type="button" class="ot-row"${can('jobs') ? navAttrs('job', job.id) : ''}>
      <span class="ot-row-time">${esc(time || '—')}</span>
      <span class="ot-row-main">
        <span class="ot-row-title">${esc(customer || job.title || t('untitled'))}</span>
        <span class="ot-row-sub">${esc(job.title || job.description || '')}</span>
      </span>
      <span class="ot-row-tech">${esc(tech || words('Unassigned', 'Sin asignar'))}</span>
      ${badge(status.text, status.tone)}
    </button>`;
  }

  function flatRow(icon, title, sub, meta, tone, view, id, action, extra) {
    const interactive = Boolean(view || action);
    const tag = interactive ? 'button' : 'div';
    let attrs = interactive ? ' type="button"' : '';
    if (view) attrs += navAttrs(view, id);
    else if (action) attrs += ` data-otto-action="${action}"`;
    if (extra) attrs += ` ${extra}`;
    return `<${tag} class="ot-row ot-row-flat${interactive ? '' : ' is-static'}"${attrs}>
      <span class="ot-row-icon" aria-hidden="true"><i class="fas ${icon}"></i></span>
      <span class="ot-row-main">
        <span class="ot-row-title">${esc(title)}</span>
        ${sub ? `<span class="ot-row-sub">${esc(sub)}</span>` : ''}
      </span>
      ${meta ? badge(meta, tone) : ''}
    </${tag}>`;
  }

  function emptyState(title, body, actionLabel, action) {
    return `<div class="ot-empty">
      <i class="fas fa-circle-check" aria-hidden="true"></i>
      <b>${esc(title)}</b>
      ${body ? `<span>${esc(body)}</span>` : ''}
      ${actionLabel ? `<button type="button" class="ot-btn" data-otto-action="${action}">${esc(actionLabel)}</button>` : ''}
    </div>`;
  }

  function section(title, count, body, linkLabel, linkView) {
    return `<section class="ot-section">
      <div class="ot-section-head">
        <h2>${esc(title)}</h2>
        ${count === null || count === undefined ? '' : `<span class="ot-section-count">${Number(count) || 0}</span>`}
        ${linkLabel ? `<button type="button" class="ot-section-link"${navAttrs(linkView)}>${esc(linkLabel)}</button>` : ''}
      </div>
      <div class="ot-panel">${body}</div>
    </section>`;
  }

  function pageHeader(title, sub) {
    return `<header class="ot-head">
      <div>
        <h1>${esc(title)}</h1>
        <p>${esc(sub)}</p>
      </div>
      <div class="ot-head-actions">
        <button type="button" class="ot-omni" data-otto-action="otto-command" aria-label="${esc(words('Search or Ask OTTO', 'Buscar o preguntar a OTTO'))}">
          <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
          <span>${esc(words('Search or Ask OTTO…', 'Buscar o preguntar a OTTO…'))}</span>
          <kbd>${esc(commandHint())}</kbd>
        </button>
        ${can('jobs') ? `<button type="button" class="ot-btn ot-btn-primary" data-otto-action="otto-new-job"><i class="fas fa-plus" aria-hidden="true"></i> ${esc(words('New Job', 'Nuevo trabajo'))}</button>` : ''}
      </div>
    </header>`;
  }

  function commandHint() {
    return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '') ? '⌘K' : 'Ctrl K';
  }

  /* ── attention and activity ────────────────────────────────────────────── */

  function attention() {
    const items = [];

    list('invoices')
      .filter(i => i && invStatus(i) === 'overdue')
      .forEach(i => items.push({
        icon: 'fa-file-invoice-dollar',
        title: `${words('Overdue invoice', 'Factura vencida')} · ${customerName(i.customerId) || money(i.amount || 0)}`,
        sub: `${money((i.amount || 0) - (i.paid || 0))} ${words('outstanding', 'pendiente')}`,
        meta: words('Overdue', 'Vencida'), tone: 'is-error', view: 'invoices'
      }));

    list('estimates')
      .filter(e => e && !['approved', 'declined', 'canceled'].includes(e.status))
      .forEach(e => items.push({
        icon: 'fa-file-signature',
        title: `${words('Estimate awaiting approval', 'Estimado por aprobar')} · ${customerName(e.customerId) || jobTitle(e.jobId) || ''}`,
        sub: e.amount ? money(e.amount) : '',
        meta: words('Estimate', 'Estimado'), tone: 'is-attention', view: 'estimates'
      }));

    openJobs()
      .filter(j => !j.assignedTo)
      .forEach(j => items.push({
        icon: 'fa-screwdriver-wrench',
        title: `${words('Unassigned job', 'Trabajo sin asignar')} · ${j.title || t('untitled')}`,
        sub: customerName(j.customerId),
        meta: words('Unassigned', 'Sin asignar'), tone: 'is-attention', view: 'job', id: j.id
      }));

    list('emails')
      .filter(e => e && e.direction !== 'outgoing' && !e.read)
      .forEach(e => items.push({
        icon: 'fa-envelope',
        title: e.subject || e.from || words('Customer reply', 'Respuesta del cliente'),
        sub: e.from || '',
        meta: words('Reply', 'Respuesta'), tone: 'is-attention', view: 'inbox'
      }));

    list('employee_messages')
      .filter(m => m && m.status === 'open')
      .forEach(m => items.push({
        icon: 'fa-bolt',
        title: `${userName(m.workerId) || words('Field worker', 'Trabajador')}: ${m.text || ''}`,
        sub: '', meta: words('Crew', 'Cuadrilla'), tone: 'is-attention', view: 'urgent'
      }));

    list('pto_requests')
      .filter(p => p && p.status === 'pending')
      .forEach(p => items.push({
        icon: 'fa-calendar-check',
        title: `${userName(p.workerId) || words('Worker', 'Trabajador')} · ${words('time off request', 'solicitud de permiso')}`,
        sub: `${p.startDate || ''}${p.endDate && p.endDate !== p.startDate ? ` – ${p.endDate}` : ''}`,
        meta: words('Time off', 'Permiso'), tone: 'is-attention', view: 'team'
      }));

    list('alerts')
      .filter(a => a && a.status === 'open')
      .forEach(a => items.push({
        icon: 'fa-triangle-exclamation',
        title: a.msg || a.title || a.type || t('alert'),
        sub: '', meta: t('alert'), tone: 'is-error', view: 'alerts'
      }));

    return items.filter(item => !item.view || can(item.view) || ['job', 'customer'].includes(item.view));
  }

  function activity() {
    return list('audit_log')
      .slice()
      .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
      .slice(0, 6);
  }

  /* ── Today ─────────────────────────────────────────────────────────────── */

  function todayScreen() {
    const jobs = jobsToday();
    const inProgress = jobs.filter(j => j.activeCheckIn || j.status === 'inProgress').length;
    const needs = attention();
    const events = activity();

    const jobsBody = jobs.length
      ? jobs.slice(0, 12).map(jobRow).join('')
      : emptyState(
          words('No jobs scheduled for today', 'No hay trabajos programados para hoy'),
          words('Schedule a job and it will appear here with its time, crew and status.', 'Programe un trabajo y aparecerá aquí con su hora, cuadrilla y estado.'),
          can('jobs') ? words('New Job', 'Nuevo trabajo') : '', 'otto-new-job');

    const needsBody = needs.length
      ? needs.slice(0, 8).map(i => flatRow(i.icon, i.title, i.sub, i.meta, i.tone, i.view, i.id)).join('')
      : emptyState(words('Nothing needs your attention', 'Nada requiere su atención'),
          words('Estimates, overdue invoices, unassigned jobs and customer replies show up here.', 'Los estimados, facturas vencidas, trabajos sin asignar y respuestas de clientes aparecen aquí.'));

    const activityBody = events.length
      ? events.map(a => flatRow('fa-clock-rotate-left', a.action || '', `${a.byName || words('system', 'sistema')}${a.entity ? ` · ${a.entity}` : ''}`, timeAgo(a.ts), '')).join('')
      : emptyState(words('No recent activity yet', 'Aún no hay actividad reciente'),
          words('Changes made in OTTO are listed here as they happen.', 'Los cambios hechos en OTTO se listan aquí a medida que ocurren.'));

    return `<div class="ot-page">
      ${pageHeader(words('Today', 'Hoy'), fmtDate(todayISO()))}
      <div class="ot-stats">
        <div class="ot-stat"><b>${inProgress}</b><span>${esc(words('In progress', 'En progreso'))}</span></div>
        <div class="ot-stat"><b>${jobs.length}</b><span>${esc(words('Scheduled today', 'Programados hoy'))}</span></div>
        <div class="ot-stat${needs.length ? ' is-attention' : ''}"><b>${needs.length}</b><span>${esc(words('Need attention', 'Requieren atención'))}</span></div>
      </div>
      ${section(words("Today's jobs", 'Trabajos de hoy'), jobs.length, jobsBody, can('jobs') ? words('View schedule', 'Ver agenda') : '', SCHEDULE_VIEW)}
      ${section(words('Needs attention', 'Requiere atención'), needs.length, needsBody)}
      ${section(words('Recent activity', 'Actividad reciente'), null, activityBody, can('audit') ? words('View all', 'Ver todo') : '', 'audit')}
    </div>`;
  }

  /* ── Schedule ──────────────────────────────────────────────────────────── */

  function scheduleScreen() {
    const today = todayISO();
    const upcoming = openJobs()
      .filter(j => j.scheduledDate && String(j.scheduledDate).slice(0, 10) >= today)
      .sort((a, b) => String(a.scheduledDate).localeCompare(String(b.scheduledDate)));

    const byDay = new Map();
    upcoming.forEach(job => {
      const day = String(job.scheduledDate).slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(job);
    });

    const unscheduled = openJobs().filter(j => !j.scheduledDate);
    let body = '';
    byDay.forEach((jobs, day) => {
      body += section(day === today ? words('Today', 'Hoy') : fmtDate(day), jobs.length, jobs.map(jobRow).join(''));
    });
    if (unscheduled.length) {
      body += section(words('Not scheduled', 'Sin programar'), unscheduled.length, unscheduled.map(jobRow).join(''));
    }
    if (!body) {
      body = section(words('Upcoming', 'Próximos'), 0, emptyState(
        words('Nothing scheduled ahead', 'Nada programado por delante'),
        words('Jobs with a date appear here, grouped by day.', 'Los trabajos con fecha aparecen aquí, agrupados por día.'),
        can('jobs') ? words('New Job', 'Nuevo trabajo') : '', 'otto-new-job'));
    }

    return `<div class="ot-page">
      ${pageHeader(words('Schedule', 'Agenda'), words('Upcoming work by day', 'Trabajo próximo por día'))}
      ${body}
    </div>`;
  }

  /* ── Money ─────────────────────────────────────────────────────────────── */

  function moneyScreen() {
    const invoices = list('invoices');
    const outstanding = invoices.reduce((sum, i) => sum + Math.max(0, (i.amount || 0) - (i.paid || 0)), 0);
    const overdue = invoices.filter(i => invStatus(i) === 'overdue').length;
    const openEstimates = list('estimates').filter(e => e && !['approved', 'declined', 'canceled'].includes(e.status)).length;

    const links = [
      { view: 'estimates', icon: 'fa-file-signature', en: 'Estimates', es: 'Estimados', count: list('estimates').length },
      { view: 'invoices', icon: 'fa-file-invoice-dollar', en: 'Invoices', es: 'Facturas', count: invoices.length },
      { view: 'payments', icon: 'fa-credit-card', en: 'Payments', es: 'Pagos', count: list('payments').length },
      { view: 'checks', icon: 'fa-money-check', en: 'Checks', es: 'Cheques', count: list('checks').length },
      { view: 'payroll', icon: 'fa-money-check-dollar', en: 'Payroll', es: 'Nómina', count: null }
    ].filter(allowed);

    return `<div class="ot-page">
      ${pageHeader(words('Money', 'Dinero'), words('Estimates, invoices and payments', 'Estimados, facturas y pagos'))}
      <div class="ot-stats">
        <div class="ot-stat"><b>${esc(money(outstanding))}</b><span>${esc(words('Outstanding', 'Por cobrar'))}</span></div>
        <div class="ot-stat${overdue ? ' is-attention' : ''}"><b>${overdue}</b><span>${esc(words('Overdue invoices', 'Facturas vencidas'))}</span></div>
        <div class="ot-stat"><b>${openEstimates}</b><span>${esc(words('Open estimates', 'Estimados abiertos'))}</span></div>
      </div>
      ${section(words('Money screens', 'Pantallas de dinero'), null,
        links.map(l => flatRow(l.icon, label(l), '', l.count === null ? '' : String(l.count), '', l.view)).join(''))}
    </div>`;
  }

  /* ── shell chrome ──────────────────────────────────────────────────────── */

  function activeGroup() {
    return ROUTE_GROUP[route && route.view] || '';
  }

  function primaryItems() {
    return PRIMARY.filter(allowed);
  }

  function sidebarMarkup() {
    const active = activeGroup();
    const needs = attention().length;
    const items = primaryItems().map(item => `<button type="button" class="ot-nav-item${active === item.id ? ' is-active' : ''}"${navAttrs(item.view)}>
        <i class="fas ${item.icon}" aria-hidden="true"></i><span>${esc(label(item))}</span>
        ${item.id === 'today' && needs ? `<span class="ot-nav-count">${needs}</span>` : ''}
      </button>`).join('');

    return `<div class="ot-sidebar-brand"><img src="./logo.jpg" alt="OTTO Plumbing Inc." data-otto-logo-slot="replaceable" /></div>
      <button type="button" class="ot-sidebar-search" data-otto-action="otto-command">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <span>${esc(words('Search or Ask OTTO…', 'Buscar o preguntar…'))}</span>
        <kbd>${esc(commandHint())}</kbd>
      </button>
      <nav class="ot-nav" aria-label="${esc(words('Primary', 'Principal'))}">
        ${items}
        <button type="button" class="ot-nav-item${active ? '' : ' is-active'}" data-otto-action="otto-more">
          <i class="fas fa-ellipsis" aria-hidden="true"></i><span>${esc(words('More', 'Más'))}</span>
        </button>
      </nav>
      <div class="ot-sidebar-foot">
        <button type="button" class="ot-sidebar-user"${navAttrs('settings')}>
          <span class="ot-avatar" aria-hidden="true">${esc(initials(session.name))}</span>
          <span>${esc(session.name || '')}</span>
        </button>
        <div class="ot-lang">
          <button type="button" class="${L() ? '' : 'is-on'}" data-otto-action="otto-lang" data-otto-lang="en">EN</button>
          <button type="button" class="${L() ? 'is-on' : ''}" data-otto-action="otto-lang" data-otto-lang="es">ES</button>
        </div>
      </div>`;
  }

  function dockMarkup() {
    const active = activeGroup();
    /* The phone carries four destinations plus More, so each target stays a
       comfortable width. Money keeps its sidebar slot on desktop and sits in
       More on the phone. */
    const items = primaryItems().filter(item => item.id !== 'money').map(item => `<button type="button" class="ot-dock-item${active === item.id ? ' is-active' : ''}"${navAttrs(item.view)}>
        <i class="fas ${item.icon}" aria-hidden="true"></i><span>${esc(label(item))}</span>
      </button>`).join('');
    const inDock = ['today', 'schedule', 'jobs', 'customers'].includes(active);
    return `${items}<button type="button" class="ot-dock-item${inDock ? '' : ' is-active'}" data-otto-action="otto-more">
        <i class="fas fa-ellipsis" aria-hidden="true"></i><span>${esc(words('More', 'Más'))}</span>
      </button>`;
  }

  function mountChrome() {
    const app = document.getElementById('app');
    if (!app) return;

    let sidebar = document.getElementById('otto-sidebar');
    let dock = document.getElementById('otto-dock');

    if (!isShellUser()) {
      if (sidebar) sidebar.remove();
      if (dock) dock.remove();
      document.body.classList.remove('otto-shell');
      return;
    }

    document.body.classList.add('otto-shell');
    /* Neutralize the superseded presentation instead of stacking another patch
       on top of it: those classes are what the wallpaper/window CSS keys off. */
    document.body.classList.remove('admin-home', 'admin-workspace', 'otto-secondary', 'otto-fullscreen-window');

    if (!sidebar) {
      sidebar = document.createElement('aside');
      sidebar.id = 'otto-sidebar';
      sidebar.className = 'ot-sidebar';
      sidebar.setAttribute('aria-label', words('Main navigation', 'Navegación principal'));
      app.appendChild(sidebar);
    }
    if (!dock) {
      dock = document.createElement('nav');
      dock.id = 'otto-dock';
      dock.className = 'ot-dock';
      dock.setAttribute('aria-label', words('Main navigation', 'Navegación principal'));
      app.appendChild(dock);
    }

    sidebar.innerHTML = sidebarMarkup();
    dock.innerHTML = dockMarkup();
  }

  /* ── More sheet ────────────────────────────────────────────────────────── */

  function openMore() {
    const groups = MORE_GROUPS.map(group => {
      const items = group.items.filter(allowed);
      if (!items.length) return '';
      return `<h3>${esc(label(group))}</h3><div class="ot-panel">${items.map(item =>
        flatRow(item.icon, label(item), '', '', '', item.view, null, item.action)).join('')}</div>`;
    }).join('');

    modal(`<div class="ot-more">
      <h2>${esc(words('More', 'Más'))}</h2>
      <p>${esc(words('Everything outside the daily five.', 'Todo lo que está fuera de los cinco diarios.'))}</p>
      ${groups}
      <h3>${esc(words('Session', 'Sesión'))}</h3>
      <div class="ot-panel">
        ${flatRow('fa-right-from-bracket', t('signOut'), '', '', '', null, null, 'sign-out')}
      </div>
    </div>`);
  }

  /* ── command palette (Search / Ask OTTO) ───────────────────────────────── */

  let cursor = 0;
  let results = [];

  function buildResults(query) {
    const q = query.trim().toLowerCase();
    const out = [];

    if (q) {
      if (can('jobs')) {
        list('jobs')
          .filter(j => `${j.title || ''} ${customerName(j.customerId)} ${j.description || ''}`.toLowerCase().includes(q))
          .slice(0, 5)
          .forEach(j => out.push({ group: t('jobs'), icon: 'fa-screwdriver-wrench', title: j.title || t('untitled'), meta: customerName(j.customerId), view: 'job', id: j.id }));
      }
      if (can('customers')) {
        list('customers')
          .filter(c => `${c.name || ''} ${c.address || ''} ${c.phone || ''}`.toLowerCase().includes(q))
          .slice(0, 5)
          .forEach(c => out.push({ group: t('customers'), icon: 'fa-user', title: c.name || '', meta: c.address || c.phone || '', view: 'customer', id: c.id }));
      }
    }

    const destinations = primaryItems().concat(MORE_GROUPS.flatMap(g => g.items).filter(allowed));
    destinations
      .filter(item => item.view && (!q || label(item).toLowerCase().includes(q)))
      .slice(0, q ? 5 : 6)
      .forEach(item => out.push({ group: words('Go to', 'Ir a'), icon: item.icon, title: label(item), view: item.view }));

    if (can('assistant') || true) {
      out.push({
        group: 'OTTO',
        icon: 'fa-wand-magic-sparkles',
        title: q ? `${words('Ask OTTO', 'Preguntar a OTTO')}: ${query.trim()}` : words('Ask OTTO', 'Preguntar a OTTO'),
        ask: query.trim()
      });
    }
    return out;
  }

  function renderResults(query) {
    const host = document.getElementById('otto-cmd-results');
    if (!host) return;
    results = buildResults(query);
    if (cursor >= results.length) cursor = results.length - 1;
    if (cursor < 0) cursor = 0;

    let html = '';
    let group = '';
    results.forEach((item, index) => {
      if (item.group !== group) {
        group = item.group;
        html += `<div class="ot-cmd-group">${esc(group)}</div>`;
      }
      html += `<button type="button" class="ot-cmd-item${index === cursor ? ' is-cursor' : ''}" data-otto-cmd-index="${index}">
        <i class="fas ${item.icon}" aria-hidden="true"></i><span>${esc(item.title)}</span>${item.meta ? `<small>${esc(item.meta)}</small>` : ''}
      </button>`;
    });
    host.innerHTML = html;
  }

  function runResult(item) {
    if (!item) return;
    closeCommand();
    if (item.ask !== undefined) {
      askOtto(item.ask);
      return;
    }
    nav(item.view, item.id || null);
  }

  /* Reuses the existing Ask OTTO panel and backend; this only carries the
     typed question across so the command entry actually leads somewhere.
     `#chat-in` / `askAssistant()` were the entry points of the assistant UI
     this shell replaced. That UI is gone — otto-assistant.js now owns the
     panel and exposes `open`/`submit` on `window.__ottoAssistant` — so the old
     call found nothing, opened the panel, and silently dropped the typed
     question. The owner had to open Ask OTTO and retype it. */
  function askOtto(text) {
    const assistant = window.__ottoAssistant;
    if (assistant && typeof assistant.open === 'function') assistant.open();
    else nav('assistant');
    if (!text) return;
    if (assistant && typeof assistant.submit === 'function') assistant.submit(text);
  }

  function openCommand() {
    if (document.getElementById('otto-cmd')) return;
    cursor = 0;
    const backdrop = document.createElement('div');
    backdrop.id = 'otto-cmd';
    backdrop.className = 'ot-cmd-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.innerHTML = `<div class="ot-cmd">
      <div class="ot-cmd-field">
        <i class="fas fa-magnifying-glass" aria-hidden="true"></i>
        <input id="otto-cmd-input" type="text" autocomplete="off" spellcheck="false"
          placeholder="${esc(words('Search jobs and customers, or ask OTTO…', 'Busque trabajos y clientes, o pregunte a OTTO…'))}"
          aria-label="${esc(words('Search or Ask OTTO', 'Buscar o preguntar a OTTO'))}" />
      </div>
      <div class="ot-cmd-results" id="otto-cmd-results"></div>
      <div class="ot-cmd-foot">${esc(words('↑ ↓ to move · Enter to open · Esc to close', '↑ ↓ para moverse · Enter para abrir · Esc para cerrar'))}</div>
    </div>`;
    backdrop.addEventListener('click', event => { if (event.target === backdrop) closeCommand(); });
    document.body.appendChild(backdrop);

    const input = document.getElementById('otto-cmd-input');
    renderResults('');
    input.addEventListener('input', () => { cursor = 0; renderResults(input.value); });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); cursor = Math.min(cursor + 1, results.length - 1); renderResults(input.value); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); cursor = Math.max(cursor - 1, 0); renderResults(input.value); }
      else if (event.key === 'Enter') { event.preventDefault(); runResult(results[cursor]); }
      else if (event.key === 'Escape') { event.preventDefault(); closeCommand(); }
    });
    input.focus();
  }

  function closeCommand() {
    const node = document.getElementById('otto-cmd');
    if (node) node.remove();
  }

  /* ── view overrides ────────────────────────────────────────────────────── */

  viewHome = function () {
    if (!session) return;
    if (session.role === 'field') {
      document.body.classList.remove('otto-shell');
      return priorViewHome();
    }
    const main = document.getElementById('main');
    if (!main) return;
    const view = route && route.view;
    main.innerHTML = view === SCHEDULE_VIEW ? scheduleScreen()
      : view === MONEY_VIEW ? moneyScreen()
      : todayScreen();
  };

  /* Ask OTTO is a floating dialog, and `viewAssistant` is simply "open it", so
     the route that opens it never closes it: it stayed on top of every screen
     the owner moved to afterwards, at z-index 9801, with its own trigger hidden
     by the shell and Escape the only way out. Closing it on an actual route
     change puts it back to behaving like a dialog. It is deliberately keyed to a
     change of route rather than to every render, so opening it from ⌘K on some
     other screen — where the route legitimately stays put — is left alone. */
  let lastRouteView = route && route.view;
  function closeAssistantOnRouteChange() {
    const view = route && route.view;
    if (view === lastRouteView) return;
    lastRouteView = view;
    if (view === 'assistant') return;
    const assistant = window.__ottoAssistant;
    if (assistant && typeof assistant.close === 'function') assistant.close();
  }

  renderNav = function (...args) {
    priorRenderNav.apply(this, args);
    closeAssistantOnRouteChange();
    mountChrome();
  };

  /* ── events ────────────────────────────────────────────────────────────── */

  document.addEventListener('click', function (event) {
    const target = event.target && event.target.closest && event.target.closest('[data-otto-action], [data-otto-cmd-index]');
    if (!target) return;

    const index = target.getAttribute('data-otto-cmd-index');
    if (index !== null) {
      event.preventDefault();
      runResult(results[Number(index)]);
      return;
    }

    const action = target.getAttribute('data-otto-action');
    if (action === 'otto-command') {
      event.preventDefault();
      openCommand();
    } else if (action === 'otto-more') {
      event.preventDefault();
      openMore();
    } else if (action === 'otto-new-job') {
      event.preventDefault();
      closeModal();
      if (typeof openJobForm === 'function') openJobForm();
    } else if (action === 'otto-lang') {
      event.preventDefault();
      setLang(target.getAttribute('data-otto-lang'));
    }
  });

  document.addEventListener('keydown', function (event) {
    if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
      if (!isShellUser()) return;
      event.preventDefault();
      if (document.getElementById('otto-cmd')) closeCommand();
      else openCommand();
    } else if (event.key === 'Escape' && document.getElementById('otto-cmd')) {
      closeCommand();
    }
  });

  window.ottoShell = { openCommand, closeCommand, openMore, mountChrome };

  /* The runtime loads after the app has already rendered once, so bring the
     shell up on the current screen without waiting for the next navigation. */
  setTimeout(() => {
    if (!session || !isShellUser()) return;
    if (document.getElementById('app')?.classList.contains('policy-gate-active')) return;
    render();
  }, 0);
})();
