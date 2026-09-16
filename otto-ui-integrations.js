/* OTTO premium UI integrations — bilingual, deterministic, offline-first. */
(function () {
  'use strict';

  const B = () => window.__ottoPremiumOpsBridge || {};
  const state = { dispatchMode: 'day', dispatchDate: new Date().toISOString().slice(0, 10), drawer: null, formDirty: false };

  const db = () => { try { return B().getDb ? (B().getDb() || {}) : {}; } catch (_) { return {}; } };
  const session = () => { try { return B().getSession ? B().getSession() : null; } catch (_) { return null; } };
  const route = () => { try { return B().getRoute ? (B().getRoute() || {}) : {}; } catch (_) { return {}; } };
  const lang = () => { try { return B().getLang && B().getLang() === 'es' ? 'es' : 'en'; } catch (_) { return 'en'; } };
  const tx = (en, es) => lang() === 'es' ? es : en;
  const arr = name => Array.isArray(db()[name]) ? db()[name] : [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = value => new Intl.NumberFormat(lang() === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(Number(value) || 0);
  const iso = value => { const d = value ? new Date(value) : new Date(); return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10); };
  const today = () => iso();
  const fmtDate = value => { if (!value) return ''; const raw = String(value).slice(0, 10); const p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw); const d = p ? new Date(+p[1], +p[2] - 1, +p[3]) : new Date(value); return Number.isNaN(d.getTime()) ? raw : d.toLocaleDateString(lang() === 'es' ? 'es-US' : 'en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }); };
  const fmtTime = value => { if (!value) return ''; if (/^\d{1,2}:\d{2}/.test(String(value))) return String(value); const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleTimeString(lang() === 'es' ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit' }); };
  const id = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const customer = cid => arr('customers').find(x => x && x.id === cid) || null;
  const job = jid => arr('jobs').find(x => x && x.id === jid) || null;
  const user = uid => arr('users').find(x => x && x.id === uid) || null;
  const customerName = cid => { const c = customer(cid); return c ? (c.name || c.company || [c.firstName, c.lastName].filter(Boolean).join(' ')) : ''; };
  const jobName = jid => { const j = job(jid); return j ? (j.title || j.description || jid) : ''; };
  const can = view => { try { return B().can ? !!B().can(view) : true; } catch (_) { return true; } };
  const nav = (view, rid) => { try { return B().nav && B().nav(view, rid || null); } catch (_) {} };
  const add = (collection, record) => { try { return B().add && B().add(collection, record); } catch (_) {} };
  const update = (collection, rid, patch) => { try { return B().update && B().update(collection, rid, patch); } catch (_) {} };
  const save = () => { try { return B().save && B().save(); } catch (_) {} };
  const rerender = () => { try { return B().render && B().render(); } catch (_) {} };
  const toast = (message, type) => { try { if (B().toast) return B().toast(message, type); } catch (_) {} const n = document.createElement('div'); n.className = `ui-toast ${type || ''}`; n.textContent = message; n.setAttribute('role', type === 'error' ? 'alert' : 'status'); document.body.appendChild(n); setTimeout(() => n.remove(), 2600); };

  function currentUserKey() {
    const s = session();
    if (!s) return '';
    if (s.id === 'owner-2' || /^julio$/i.test(s.name || '')) return 'julio';
    if (s.id === 'ops-1' || /^sarays?$/i.test(s.name || '')) return 'sarays';
    if (s.id === 'owner-1' || /^otto$/i.test(s.name || '')) return 'otto';
    return '';
  }

  function applyPersonalToday() {
    const s = session();
    const r = route();
    const key = currentUserKey();
    if (key) document.body.dataset.ottoUser = key; else delete document.body.dataset.ottoUser;
    document.body.classList.remove('otto-personal-today');
  }

  function recordStatus(record) {
    const raw = String(record?.status || '').trim();
    const map = {
      scheduled: ['Scheduled', 'Agendado'], inProgress: ['In progress', 'En progreso'], completed: ['Completed', 'Completado'], canceled: ['Canceled', 'Cancelado'],
      approved: ['Approved', 'Aprobado'], declined: ['Declined', 'Rechazado'], sent: ['Sent', 'Enviado'], draft: ['Draft', 'Borrador'], paid: ['Paid', 'Pagada'], overdue: ['Overdue', 'Vencida'], open: ['Open', 'Abierto']
    };
    return map[raw] ? tx(map[raw][0], map[raw][1]) : (raw || tx('Recorded', 'Registrado'));
  }

  function activityEntries(kind, rid) {
    const base = kind === 'customer' ? { customerId: rid, jobIds: new Set(arr('jobs').filter(j => j && j.customerId === rid).map(j => j.id)) }
      : kind === 'job' ? { customerId: job(rid)?.customerId || '', jobIds: new Set([rid]) }
      : { customerId: '', jobIds: new Set() };
    const out = [];
    const related = r => r && ((base.customerId && r.customerId === base.customerId) || (r.jobId && base.jobIds.has(r.jobId)));
    arr('notes').filter(related).forEach(n => out.push({ ts: n.created || n.updated, icon: 'fa-note-sticky', title: tx('Note added', 'Nota agregada'), detail: n.text || n.note || n.body || '' }));
    arr('calls').filter(related).forEach(c => out.push({ ts: c.created || c.updated || c.ts, icon: 'fa-phone', title: tx('Call / request', 'Llamada / solicitud'), detail: c.subject || c.description || c.note || c.text || '' }));
    arr('emails').filter(related).forEach(e => out.push({ ts: e.created || e.updated || e.ts, icon: 'fa-envelope', title: e.direction === 'outgoing' ? tx('Email sent', 'Correo enviado') : tx('Email received', 'Correo recibido'), detail: e.subject || '' }));
    arr('photos').filter(related).forEach(p => out.push({ ts: p.created || p.updated, icon: 'fa-camera', title: tx('Photo added', 'Foto agregada'), detail: p.caption || jobName(p.jobId) }));
    arr('documents').filter(related).forEach(d => out.push({ ts: d.created || d.updated, icon: 'fa-file', title: tx('Document added', 'Documento agregado'), detail: d.name || d.filename || jobName(d.jobId) }));
    arr('estimates').filter(related).forEach(e => out.push({ ts: e.updated || e.sentAt || e.created, icon: 'fa-file-signature', title: tx('Estimate updated', 'Estimado actualizado'), detail: `${money(e.amount || e.total || 0)} · ${recordStatus(e)}` }));
    arr('invoices').filter(related).forEach(i => out.push({ ts: i.updated || i.created, icon: 'fa-file-invoice-dollar', title: tx('Invoice updated', 'Factura actualizada'), detail: `${money(i.amount || i.total || 0)} · ${recordStatus(i)}` }));
    const invoiceIds = new Set(arr('invoices').filter(related).map(i => i.id));
    arr('payments').filter(p => p && (related(p) || invoiceIds.has(p.invoiceId))).forEach(p => out.push({ ts: p.created || p.updated || p.date, icon: 'fa-credit-card', title: tx('Payment recorded', 'Pago registrado'), detail: money(p.amount || 0) }));
    arr('job_events').filter(e => e && e.jobId && base.jobIds.has(e.jobId)).forEach(e => out.push({ ts: e.ts || e.created, icon: e.type === 'check_in' ? 'fa-right-to-bracket' : e.type === 'check_out' ? 'fa-right-from-bracket' : 'fa-clock', title: e.type === 'check_in' ? tx('Crew checked in', 'Cuadrilla registró entrada') : e.type === 'check_out' ? tx('Crew checked out', 'Cuadrilla registró salida') : tx('Job event', 'Evento de trabajo'), detail: user(e.workerId || e.userId)?.name || '' }));
    arr('audit_log').filter(a => a && ((base.customerId && a.customerId === base.customerId) || (a.jobId && base.jobIds.has(a.jobId)))).forEach(a => out.push({ ts: a.ts || a.created, icon: 'fa-clock-rotate-left', title: a.action || tx('Record changed', 'Registro actualizado'), detail: a.byName || a.entity || '' }));
    return out.filter(x => x.ts).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 40);
  }

  function timelineMarkup(kind, rid, limit = 10) {
    const entries = activityEntries(kind, rid).slice(0, limit);
    if (!entries.length) return `<div class="ui-empty">${esc(tx('No recorded activity yet.', 'Todavía no hay actividad registrada.'))}</div>`;
    return `<div class="ui-timeline">${entries.map(e => `<div class="ui-timeline-row"><span class="ui-timeline-icon"><i class="fas ${e.icon}" aria-hidden="true"></i></span><span class="ui-timeline-copy"><strong>${esc(e.title)}</strong>${e.detail ? `<span>${esc(e.detail)}</span>` : ''}</span><time>${esc(fmtDate(e.ts))}</time></div>`).join('')}</div>`;
  }

  function closeDrawer() {
    const n = document.getElementById('otto-context-drawer');
    if (n) n.remove();
    state.drawer = null;
  }

  function drawerMarkup(type, rid) {
    if (type === 'customer') {
      const c = customer(rid); if (!c) return '';
      const jobs = arr('jobs').filter(j => j && j.customerId === rid);
      const invoices = arr('invoices').filter(i => i && i.customerId === rid);
      const outstanding = invoices.reduce((s, i) => s + Math.max(0, Number(i.amount || i.total || 0) - Number(i.paid || 0)), 0);
      return `<header class="ui-drawer-head"><div><span class="ui-eyebrow">${esc(tx('Customer', 'Cliente'))}</span><h2>${esc(c.name || c.company || tx('Customer', 'Cliente'))}</h2><p>${esc([c.phone, c.email, c.address].filter(Boolean).join(' · '))}</p></div><button class="ui-icon" data-ui-action="close-drawer" aria-label="${esc(tx('Close', 'Cerrar'))}"><i class="fas fa-xmark"></i></button></header>
        <div class="ui-drawer-stats"><div><b>${jobs.length}</b><span>${esc(tx('Jobs', 'Trabajos'))}</span></div><div><b>${money(outstanding)}</b><span>${esc(tx('Outstanding', 'Pendiente'))}</span></div></div>
        <section><h3>${esc(tx('Recent activity', 'Actividad reciente'))}</h3>${timelineMarkup('customer', rid, 8)}</section>
        <footer class="ui-drawer-actions"><button class="ui-button primary" data-ui-open="customer" data-id="${esc(rid)}">${esc(tx('Open customer', 'Abrir cliente'))}</button><button class="ui-button" data-ui-action="new-job-for-customer" data-id="${esc(rid)}">${esc(tx('New job', 'Nuevo trabajo'))}</button></footer>`;
    }
    if (type === 'job') {
      const j = job(rid); if (!j) return '';
      const c = customer(j.customerId) || {};
      const assigned = [j.assignedTo].concat(j.assignedWorkerIds || []).filter(Boolean).map(x => user(x)?.name || x);
      const estimate = arr('estimates').find(e => e && e.jobId === rid);
      const invoice = arr('invoices').find(i => i && i.jobId === rid);
      const fileCount = arr('photos').filter(p => p && p.jobId === rid).length + arr('documents').filter(d => d && d.jobId === rid).length;
      return `<header class="ui-drawer-head"><div><span class="ui-eyebrow">${esc(tx('Job', 'Trabajo'))}</span><h2>${esc(j.title || j.description || tx('Untitled job', 'Trabajo sin título'))}</h2><p>${esc([c.name, j.address || c.address, j.scheduledDate ? `${fmtDate(j.scheduledDate)} ${fmtTime(j.scheduledTime || '')}`.trim() : ''].filter(Boolean).join(' · '))}</p></div><button class="ui-icon" data-ui-action="close-drawer" aria-label="${esc(tx('Close', 'Cerrar'))}"><i class="fas fa-xmark"></i></button></header>
        <div class="ui-drawer-stats"><div><b>${esc(recordStatus(j))}</b><span>${esc(tx('Status', 'Estado'))}</span></div><div><b>${esc(assigned.join(', ') || tx('Unassigned', 'Sin asignar'))}</b><span>${esc(tx('Crew', 'Cuadrilla'))}</span></div><div><b>${fileCount}</b><span>${esc(tx('Files', 'Archivos'))}</span></div></div>
        ${j.description ? `<section><h3>${esc(tx('Description', 'Descripción'))}</h3><p class="ui-body-copy">${esc(j.description)}</p></section>` : ''}
        <section><h3>${esc(tx('Financials', 'Finanzas'))}</h3><div class="ui-facts"><span>${esc(tx('Estimate', 'Estimado'))}</span><b>${estimate ? money(estimate.amount || estimate.total || 0) : '—'}</b><span>${esc(tx('Invoice', 'Factura'))}</span><b>${invoice ? `${money(invoice.amount || invoice.total || 0)} · ${recordStatus(invoice)}` : '—'}</b></div></section>
        <section><h3>${esc(tx('Recent activity', 'Actividad reciente'))}</h3>${timelineMarkup('job', rid, 8)}</section>
        <footer class="ui-drawer-actions"><button class="ui-button primary" data-ui-open="job" data-id="${esc(rid)}">${esc(tx('Open job', 'Abrir trabajo'))}</button><button class="ui-button" data-ui-action="job-brief" data-id="${esc(rid)}">${esc(tx('Job brief', 'Resumen'))}</button></footer>`;
    }
    if (type === 'estimate') {
      const e = arr('estimates').find(x => x && x.id === rid); if (!e) return '';
      return `<header class="ui-drawer-head"><div><span class="ui-eyebrow">${esc(tx('Estimate', 'Estimado'))}</span><h2>${esc(customerName(e.customerId) || jobName(e.jobId) || tx('Estimate', 'Estimado'))}</h2><p>${esc(recordStatus(e))}</p></div><button class="ui-icon" data-ui-action="close-drawer"><i class="fas fa-xmark"></i></button></header><div class="ui-hero-number">${money(e.amount || e.total || 0)}</div><div class="ui-facts"><span>${esc(tx('Status', 'Estado'))}</span><b>${esc(recordStatus(e))}</b><span>${esc(tx('Created', 'Creado'))}</span><b>${esc(fmtDate(e.created || e.updated))}</b></div><footer class="ui-drawer-actions"><button class="ui-button primary" data-ui-action="edit-estimate" data-id="${esc(rid)}">${esc(tx('Open estimate', 'Abrir estimado'))}</button></footer>`;
    }
    if (type === 'invoice') {
      const i = arr('invoices').find(x => x && x.id === rid); if (!i) return '';
      const total = Number(i.amount || i.total || 0), paid = Number(i.paid || 0), balance = Math.max(0, total - paid);
      return `<header class="ui-drawer-head"><div><span class="ui-eyebrow">${esc(tx('Invoice', 'Factura'))}</span><h2>${esc(customerName(i.customerId) || jobName(i.jobId) || tx('Invoice', 'Factura'))}</h2><p>${esc(recordStatus(i))}</p></div><button class="ui-icon" data-ui-action="close-drawer"><i class="fas fa-xmark"></i></button></header><div class="ui-hero-number">${money(balance)}</div><div class="ui-facts"><span>${esc(tx('Total', 'Total'))}</span><b>${money(total)}</b><span>${esc(tx('Paid', 'Pagado'))}</span><b>${money(paid)}</b><span>${esc(tx('Due', 'Vence'))}</span><b>${esc(fmtDate(i.dueDate || i.due)) || '—'}</b></div><footer class="ui-drawer-actions"><button class="ui-button primary" data-ui-open="invoice" data-id="${esc(rid)}">${esc(tx('Open invoice', 'Abrir factura'))}</button></footer>`;
    }
    return '';
  }

  function openDrawer(type, rid) {
    const body = drawerMarkup(type, rid); if (!body) return;
    closeDrawer(); state.drawer = { type, rid };
    const n = document.createElement('aside'); n.id = 'otto-context-drawer'; n.className = 'ui-drawer'; n.setAttribute('role', 'dialog'); n.setAttribute('aria-modal', 'true'); n.setAttribute('aria-label', tx('Record details', 'Detalles del registro')); n.innerHTML = `<div class="ui-drawer-inner">${body}</div>`; document.body.appendChild(n);
    requestAnimationFrame(() => n.classList.add('is-open'));
  }

  function periodBounds() {
    const d = new Date(`${state.dispatchDate}T12:00:00`);
    if (state.dispatchMode === 'day') return [iso(d), iso(d)];
    const start = new Date(d); start.setDate(start.getDate() - start.getDay());
    const end = new Date(start); end.setDate(start.getDate() + 6);
    return [iso(start), iso(end)];
  }

  function dispatchJobs() {
    const [start, end] = periodBounds();
    return arr('jobs').filter(j => j && !['canceled'].includes(j.status) && j.scheduledDate && iso(j.scheduledDate) >= start && iso(j.scheduledDate) <= end)
      .sort((a, b) => `${iso(a.scheduledDate)} ${a.scheduledTime || ''}`.localeCompare(`${iso(b.scheduledDate)} ${b.scheduledTime || ''}`));
  }

  function dispatchAttention(jobs) {
    return jobs.filter(j => {
      const c = customer(j.customerId);
      return !j.assignedTo || !(j.description || j.title) || !(j.address || c?.address);
    });
  }

  function jobBlock(j) {
    const c = customer(j.customerId);
    const day = state.dispatchMode === 'week' ? `<span class="ui-dispatch-day">${esc(fmtDate(j.scheduledDate))}</span>` : '';
    return `<button type="button" class="ui-job-block status-${esc(String(j.status || 'new').toLowerCase())}" data-ui-drawer="job" data-id="${esc(j.id)}">${day}<span class="ui-job-time">${esc(fmtTime(j.scheduledTime || '')) || '—'}</span><strong>${esc(c?.name || j.title || tx('Job', 'Trabajo'))}</strong><span>${esc(j.title || j.description || '')}</span></button>`;
  }

  function renderDispatch() {
    const main = document.getElementById('main'); if (!main) return;
    const jobs = dispatchJobs();
    const workers = arr('users').filter(u => u && ['field', 'worker'].includes(u.role) && u.active !== false);
    const unassigned = jobs.filter(j => !j.assignedTo && !(j.assignedWorkerIds || []).length);
    const attention = dispatchAttention(jobs);
    const [start, end] = periodBounds();
    main.innerHTML = `<div class="ui-dispatch-page" data-ui-dispatch>
      <header class="ui-dispatch-head"><div><span class="ui-eyebrow">${esc(tx('Dispatch', 'Despacho'))}</span><h1>${esc(tx('Schedule', 'Agenda'))}</h1><p>${esc(state.dispatchMode === 'day' ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`)}</p></div><div class="ui-dispatch-tools"><div class="ui-segmented"><button data-ui-action="dispatch-mode" data-mode="day" aria-pressed="${state.dispatchMode === 'day'}">${esc(tx('Day', 'Día'))}</button><button data-ui-action="dispatch-mode" data-mode="week" aria-pressed="${state.dispatchMode === 'week'}">${esc(tx('Week', 'Semana'))}</button></div><button class="ui-icon" data-ui-action="dispatch-prev" aria-label="${esc(tx('Previous', 'Anterior'))}"><i class="fas fa-chevron-left"></i></button><button class="ui-button" data-ui-action="dispatch-today">${esc(tx('Today', 'Hoy'))}</button><button class="ui-icon" data-ui-action="dispatch-next" aria-label="${esc(tx('Next', 'Siguiente'))}"><i class="fas fa-chevron-right"></i></button></div></header>
      ${attention.length ? `<section class="ui-dispatch-alert"><div><strong>${attention.length} ${esc(tx('need preparation', 'requieren preparación'))}</strong><span>${esc(tx('Missing crew, address, or job detail.', 'Falta cuadrilla, dirección o detalle del trabajo.'))}</span></div><button class="ui-button" data-ui-action="open-operations">${esc(tx('Review', 'Revisar'))}</button></section>` : ''}
      ${unassigned.length ? `<section class="ui-dispatch-unassigned"><header><h2>${esc(tx('Unassigned', 'Sin asignar'))}</h2><span>${unassigned.length}</span></header><div class="ui-job-strip">${unassigned.map(jobBlock).join('')}</div></section>` : ''}
      <div class="ui-dispatch-lanes">${workers.map(w => { const mine = jobs.filter(j => j.assignedTo === w.id || (j.assignedWorkerIds || []).includes(w.id)); return `<section class="ui-dispatch-lane"><header><span class="ui-avatar">${esc((w.name || '?').split(/\s+/).map(x => x[0] || '').slice(0, 2).join('').toUpperCase())}</span><div><h2>${esc(w.name || tx('Field worker', 'Trabajador'))}</h2><span>${mine.length} ${esc(tx('jobs', 'trabajos'))}</span></div></header><div class="ui-dispatch-track">${mine.length ? mine.map(jobBlock).join('') : `<div class="ui-empty compact">${esc(tx('No work scheduled', 'Sin trabajo agendado'))}</div>`}</div></section>`; }).join('')}</div>
    </div>`;
  }

  function jobBriefText(j) {
    const c = customer(j.customerId) || {};
    const crew = [j.assignedTo].concat(j.assignedWorkerIds || []).filter(Boolean).map(x => user(x)?.name || x).join(', ');
    const history = arr('jobs').filter(x => x && x.customerId === j.customerId && x.id !== j.id && x.status === 'completed').slice(-5);
    return `${tx('OTTO JOB BRIEF', 'RESUMEN DE TRABAJO OTTO')}\n\n${tx('Customer', 'Cliente')}: ${c.name || '—'}\n${tx('Address', 'Dirección')}: ${j.address || c.address || '—'}\n${tx('Appointment', 'Cita')}: ${j.scheduledDate || '—'} ${j.scheduledTime || ''}\n${tx('Job', 'Trabajo')}: ${j.title || '—'}\n${tx('Description', 'Descripción')}: ${j.description || '—'}\n${tx('Crew', 'Cuadrilla')}: ${crew || '—'}\n\n${tx('Service history', 'Historial de servicio')}:\n${history.length ? history.map(x => `- ${x.completedAt || x.scheduledDate || ''} ${x.title || x.description || ''}`).join('\n') : '—'}`;
  }

  function modal(title, body, actions = '') {
    const prior = document.getElementById('otto-ui-modal'); if (prior) prior.remove();
    const n = document.createElement('div'); n.id = 'otto-ui-modal'; n.className = 'ui-modal-backdrop'; n.setAttribute('role', 'dialog'); n.setAttribute('aria-modal', 'true'); n.innerHTML = `<div class="ui-modal"><header><h2>${esc(title)}</h2><button class="ui-icon" data-ui-action="close-modal" aria-label="${esc(tx('Close', 'Cerrar'))}"><i class="fas fa-xmark"></i></button></header><div class="ui-modal-body">${body}</div>${actions ? `<footer>${actions}</footer>` : ''}</div>`; document.body.appendChild(n); return n;
  }

  function quickCustomerForm() {
    modal(tx('New customer', 'Nuevo cliente'), `<form id="ui-new-customer" class="ui-form"><label>${esc(tx('Name', 'Nombre'))}<input name="name" required autocomplete="name"></label><div class="ui-form-grid"><label>${esc(tx('Phone', 'Teléfono'))}<input name="phone" type="tel" autocomplete="tel"></label><label>${esc(tx('Email', 'Correo'))}<input name="email" type="email" autocomplete="email"></label></div><label>${esc(tx('Address', 'Dirección'))}<input name="address" autocomplete="street-address"></label><p class="ui-form-error" data-ui-form-error></p></form>`, `<button class="ui-button" data-ui-action="close-modal">${esc(tx('Cancel', 'Cancelar'))}</button><button class="ui-button primary" data-ui-action="save-customer">${esc(tx('Save customer', 'Guardar cliente'))}</button>`);
  }

  function fallbackJobForm(customerId) {
    const options = arr('customers').map(c => `<option value="${esc(c.id)}" ${customerId === c.id ? 'selected' : ''}>${esc(c.name || c.company || c.id)}</option>`).join('');
    modal(tx('New job', 'Nuevo trabajo'), `<form id="ui-new-job" class="ui-form"><label>${esc(tx('Customer', 'Cliente'))}<select name="customerId" required><option value="">${esc(tx('Select customer', 'Seleccionar cliente'))}</option>${options}</select></label><label>${esc(tx('Job title', 'Título del trabajo'))}<input name="title" required></label><label>${esc(tx('Description', 'Descripción'))}<textarea name="description" rows="3"></textarea></label><div class="ui-form-grid"><label>${esc(tx('Date', 'Fecha'))}<input name="scheduledDate" type="date"></label><label>${esc(tx('Time', 'Hora'))}<input name="scheduledTime" type="time"></label></div><p class="ui-form-error" data-ui-form-error></p></form>`, `<button class="ui-button" data-ui-action="close-modal">${esc(tx('Cancel', 'Cancelar'))}</button><button class="ui-button primary" data-ui-action="save-job">${esc(tx('Save job', 'Guardar trabajo'))}</button>`);
  }

  function runQuickCreate(kind, contextId) {
    if (kind === 'customer') return quickCustomerForm();
    if (kind === 'job') {
      try { if (B().openJobForm) return B().openJobForm(null, contextId || null); } catch (_) {}
      return fallbackJobForm(contextId || '');
    }
    if (kind === 'estimate') {
      try { if (B().openEstimateForm) return B().openEstimateForm(); } catch (_) {}
      nav('estimates');
    }
  }

  function injectQuickCreate() {
    const host = document.getElementById('otto-cmd-results'); if (!host || host.querySelector('.ui-quick-create')) return;
    const group = document.createElement('div'); group.className = 'ui-quick-create'; group.innerHTML = `<div class="ot-cmd-group">${esc(tx('Create', 'Crear'))}</div><div class="ui-quick-grid"><button data-ui-quick="customer"><i class="fas fa-user-plus"></i><span>${esc(tx('New customer', 'Nuevo cliente'))}</span></button><button data-ui-quick="job"><i class="fas fa-screwdriver-wrench"></i><span>${esc(tx('New job', 'Nuevo trabajo'))}</span></button><button data-ui-quick="estimate"><i class="fas fa-file-signature"></i><span>${esc(tx('New estimate', 'Nuevo estimado'))}</span></button></div>`; host.prepend(group);
  }

  function smartHeaderMarkup(type, rid) {
    if (type === 'customer') { const c = customer(rid); if (!c) return ''; return `<section class="ui-record-head"><div><span class="ui-eyebrow">${esc(tx('Customer', 'Cliente'))}</span><h1>${esc(c.name || c.company || tx('Customer', 'Cliente'))}</h1><p>${esc([c.phone, c.email, c.address].filter(Boolean).join(' · '))}</p></div><div class="ui-record-actions"><button class="ui-button" data-ui-drawer="customer" data-id="${esc(rid)}">${esc(tx('Quick view', 'Vista rápida'))}</button><button class="ui-button primary" data-ui-action="new-job-for-customer" data-id="${esc(rid)}">${esc(tx('New job', 'Nuevo trabajo'))}</button></div></section>`; }
    if (type === 'job') { const j = job(rid); if (!j) return ''; const c = customer(j.customerId); return `<section class="ui-record-head"><div><span class="ui-eyebrow">${esc(tx('Job', 'Trabajo'))} · ${esc(recordStatus(j))}</span><h1>${esc(j.title || j.description || tx('Job', 'Trabajo'))}</h1><p>${esc([c?.name, j.address || c?.address, j.scheduledDate ? `${fmtDate(j.scheduledDate)} ${fmtTime(j.scheduledTime || '')}`.trim() : ''].filter(Boolean).join(' · '))}</p></div><div class="ui-record-actions"><button class="ui-button" data-ui-drawer="job" data-id="${esc(rid)}">${esc(tx('Quick view', 'Vista rápida'))}</button><button class="ui-button primary" data-ui-action="job-brief" data-id="${esc(rid)}">${esc(tx('Job brief', 'Resumen'))}</button></div></section>`; }
    if (type === 'estimate') { const e = arr('estimates').find(x => x && x.id === rid); if (!e) return ''; return `<section class="ui-record-head"><div><span class="ui-eyebrow">${esc(tx('Estimate', 'Estimado'))} · ${esc(recordStatus(e))}</span><h1>${esc(customerName(e.customerId) || jobName(e.jobId) || tx('Estimate', 'Estimado'))}</h1><p>${money(e.amount || e.total || 0)}</p></div><div class="ui-record-actions"><button class="ui-button primary" data-ui-action="edit-estimate" data-id="${esc(rid)}">${esc(tx('Edit estimate', 'Editar estimado'))}</button></div></section>`; }
    if (type === 'invoice') { const i = arr('invoices').find(x => x && x.id === rid); if (!i) return ''; const balance = Math.max(0, Number(i.amount || i.total || 0) - Number(i.paid || 0)); return `<section class="ui-record-head"><div><span class="ui-eyebrow">${esc(tx('Invoice', 'Factura'))} · ${esc(recordStatus(i))}</span><h1>${esc(customerName(i.customerId) || jobName(i.jobId) || tx('Invoice', 'Factura'))}</h1><p>${esc(tx('Balance', 'Saldo'))}: ${money(balance)}</p></div><div class="ui-record-actions"><button class="ui-button" data-ui-drawer="invoice" data-id="${esc(rid)}">${esc(tx('Quick view', 'Vista rápida'))}</button></div></section>`; }
    return '';
  }

  function enhanceRecordPage() {
    const r = route(), main = document.getElementById('main'); if (!main || !r.view || !r.id) return;
    if (!['customer', 'job', 'estimate', 'invoice'].includes(r.view)) return;
    if (!main.querySelector(':scope > .ui-record-head')) main.insertAdjacentHTML('afterbegin', smartHeaderMarkup(r.view, r.id));
    if (['customer', 'job'].includes(r.view) && !main.querySelector(':scope > .ui-activity-card')) main.insertAdjacentHTML('beforeend', `<section class="ui-activity-card"><header><h2>${esc(tx('Activity', 'Actividad'))}</h2><span>${esc(tx('One timeline across notes, calls, files and money.', 'Una línea de tiempo de notas, llamadas, archivos y dinero.'))}</span></header>${timelineMarkup(r.view, r.id, 16)}</section>`);
  }

  function fieldStickyActions() {
    const s = session(), r = route();
    const prior = document.getElementById('otto-field-sticky-actions');
    if (!s || s.role !== 'field' || r.view !== 'job' || !r.id) { if (prior) prior.remove(); return; }
    const j = job(r.id); if (!j) return;
    const action = j.activeCheckIn ? `<button class="ui-field-primary" data-of-action="check-out" data-of-id="${esc(j.id)}"><i class="fas fa-flag-checkered"></i><span>${esc(tx('Complete', 'Completar'))}</span></button>` : `<button class="ui-field-primary" data-of-action="check-in" data-of-id="${esc(j.id)}"><i class="fas fa-play"></i><span>${esc(tx('Start', 'Empezar'))}</span></button>`;
    const html = `<div id="otto-field-sticky-actions" class="ui-field-actions">${action}<button data-of-action="add-photo" data-of-id="${esc(j.id)}"><i class="fas fa-camera"></i><span>${esc(tx('Photo', 'Foto'))}</span></button><button data-of-action="add-note" data-of-id="${esc(j.id)}"><i class="fas fa-note-sticky"></i><span>${esc(tx('Note', 'Nota'))}</span></button></div>`;
    if (prior) {
      if (prior.outerHTML !== html) prior.outerHTML = html;
    } else document.body.insertAdjacentHTML('beforeend', html);
  }

  function portalCards() {
    const s = session(), main = document.getElementById('main');
    if (!s || s.role !== 'customer' || !main || main.querySelector('.ui-portal-home')) return;
    const cid = s.customerId;
    const jobs = arr('jobs').filter(j => j && j.customerId === cid);
    const upcoming = jobs.filter(j => j.status !== 'completed' && j.scheduledDate && iso(j.scheduledDate) >= today()).sort((a,b)=>String(a.scheduledDate).localeCompare(String(b.scheduledDate)))[0];
    const completed = jobs.filter(j => j.status === 'completed').sort((a,b)=>String(b.completedAt || b.scheduledDate || '').localeCompare(String(a.completedAt || a.scheduledDate || '')));
    const estimates = arr('estimates').filter(e => e && (e.customerId === cid || jobs.some(j => j.id === e.jobId)));
    const invoices = arr('invoices').filter(i => i && (i.customerId === cid || jobs.some(j => j.id === i.jobId)));
    const balance = invoices.reduce((sum, i) => sum + Math.max(0, Number(i.amount || i.total || 0) - Number(i.paid || 0)), 0);
    main.innerHTML = `<div class="ui-portal-home"><header><span class="ui-eyebrow">OTTO Plumbing</span><h1>${esc(tx('Your service portal', 'Su portal de servicio'))}</h1><p>${esc(tx('Appointments, estimates, invoices and service history in one place.', 'Citas, estimados, facturas e historial de servicio en un solo lugar.'))}</p></header>
      ${upcoming ? `<section class="ui-portal-hero"><div><span>${esc(tx('Upcoming service', 'Próximo servicio'))}</span><h2>${esc(upcoming.title || upcoming.description || tx('Service appointment', 'Cita de servicio'))}</h2><p>${esc(`${fmtDate(upcoming.scheduledDate)} ${fmtTime(upcoming.scheduledTime || '')}`.trim())}</p></div><button class="ui-button primary" data-ui-drawer="job" data-id="${esc(upcoming.id)}">${esc(tx('View details', 'Ver detalles'))}</button></section>` : ''}
      <div class="ui-portal-grid"><button class="ui-portal-card" data-ui-action="portal-scroll" data-target="portal-estimates"><i class="fas fa-file-signature"></i><b>${estimates.length}</b><span>${esc(tx('Estimates', 'Estimados'))}</span></button><button class="ui-portal-card" data-ui-action="portal-scroll" data-target="portal-invoices"><i class="fas fa-file-invoice-dollar"></i><b>${money(balance)}</b><span>${esc(tx('Balance due', 'Saldo pendiente'))}</span></button><button class="ui-portal-card" data-ui-action="portal-scroll" data-target="portal-history"><i class="fas fa-clock-rotate-left"></i><b>${completed.length}</b><span>${esc(tx('Completed jobs', 'Trabajos completados'))}</span></button><button class="ui-portal-card accent" data-ui-action="portal-request"><i class="fas fa-plus"></i><b>+</b><span>${esc(tx('Request service', 'Solicitar servicio'))}</span></button></div>
      <section id="portal-estimates" class="ui-portal-section"><h2>${esc(tx('Estimates', 'Estimados'))}</h2>${estimates.length ? estimates.map(e => `<button data-ui-drawer="estimate" data-id="${esc(e.id)}"><span>${esc(recordStatus(e))}</span><strong>${money(e.amount || e.total || 0)}</strong></button>`).join('') : `<div class="ui-empty">${esc(tx('No estimates yet.', 'Aún no hay estimados.'))}</div>`}</section>
      <section id="portal-invoices" class="ui-portal-section"><h2>${esc(tx('Invoices', 'Facturas'))}</h2>${invoices.length ? invoices.map(i => `<button data-ui-drawer="invoice" data-id="${esc(i.id)}"><span>${esc(recordStatus(i))}</span><strong>${money(Math.max(0, Number(i.amount || i.total || 0) - Number(i.paid || 0)))}</strong></button>`).join('') : `<div class="ui-empty">${esc(tx('No invoices yet.', 'Aún no hay facturas.'))}</div>`}</section>
      <section id="portal-history" class="ui-portal-section"><h2>${esc(tx('Service history', 'Historial de servicio'))}</h2>${completed.length ? completed.map(j => `<button data-ui-drawer="job" data-id="${esc(j.id)}"><span>${esc(fmtDate(j.completedAt || j.scheduledDate))}</span><strong>${esc(j.title || j.description || tx('Completed service', 'Servicio completado'))}</strong></button>`).join('') : `<div class="ui-empty">${esc(tx('No completed service yet.', 'Aún no hay servicio completado.'))}</div>`}</section></div>`;
  }

  function portalRequestForm() {
    modal(tx('Request service', 'Solicitar servicio'), `<form id="ui-portal-request" class="ui-form"><label>${esc(tx('Service category', 'Categoría de servicio'))}<select name="serviceCategory"><option>${esc(tx('Plumbing service', 'Servicio de plomería'))}</option><option>${esc(tx('Leak / water issue', 'Fuga / problema de agua'))}</option><option>${esc(tx('Drain / stoppage', 'Drenaje / obstrucción'))}</option><option>${esc(tx('Fixture / installation', 'Accesorio / instalación'))}</option><option>${esc(tx('Other', 'Otro'))}</option></select></label><label>${esc(tx('Description', 'Descripción'))}<textarea name="description" required rows="4"></textarea></label><div class="ui-form-grid"><label>${esc(tx('Urgency', 'Urgencia'))}<select name="urgency"><option value="normal">${esc(tx('Normal', 'Normal'))}</option><option value="soon">${esc(tx('Soon', 'Pronto'))}</option><option value="urgent">${esc(tx('Urgent', 'Urgente'))}</option></select></label><label>${esc(tx('Preferred timing', 'Horario preferido'))}<input name="requestedTiming"></label></div><p class="ui-form-error" data-ui-form-error></p></form>`, `<button class="ui-button" data-ui-action="close-modal">${esc(tx('Cancel', 'Cancelar'))}</button><button class="ui-button primary" data-ui-action="save-portal-request">${esc(tx('Send request', 'Enviar solicitud'))}</button>`);
  }

  async function openFileViewer(kind, rid) {
    const collection = kind === 'photo' ? 'photos' : 'documents';
    const record = arr(collection).find(x => x && x.id === rid); if (!record) return;
    let url = '';
    try { if (B().getFileURL) url = await B().getFileURL(record.fileId || record.storageId || record.id); } catch (_) {}
    const siblings = arr(collection).filter(x => x && x.jobId === record.jobId);
    const index = siblings.findIndex(x => x.id === rid);
    modal(record.caption || record.name || record.filename || tx(kind === 'photo' ? 'Photo' : 'Document', kind === 'photo' ? 'Foto' : 'Documento'), `${url ? (kind === 'photo' ? `<img class="ui-file-image" src="${esc(url)}" alt="">` : `<iframe class="ui-file-frame" src="${esc(url)}" title="${esc(tx('Document preview', 'Vista del documento'))}"></iframe>`) : `<div class="ui-empty">${esc(tx('Preview is not available on this device.', 'La vista previa no está disponible en este dispositivo.'))}</div>`}<div class="ui-file-meta">${esc(jobName(record.jobId))}</div>`, `<button class="ui-button" data-ui-file-nav="prev" data-kind="${kind}" data-index="${index}" data-job="${esc(record.jobId || '')}" ${index <= 0 ? 'disabled' : ''}>${esc(tx('Previous', 'Anterior'))}</button><button class="ui-button" data-ui-file-nav="next" data-kind="${kind}" data-index="${index}" data-job="${esc(record.jobId || '')}" ${index >= siblings.length - 1 ? 'disabled' : ''}>${esc(tx('Next', 'Siguiente'))}</button>`);
  }

  function syncState() {
    const failed = arr('photos').concat(arr('documents')).filter(x => x && ['failed', 'error'].includes(x.syncStatus || x.uploadStatus)).length;
    const pending = arr('photos').concat(arr('documents')).filter(x => x && (x.uploadPending || ['pending', 'queued', 'syncing'].includes(x.syncStatus || x.uploadStatus))).length;
    if (!navigator.onLine) return { key: 'offline', icon: 'fa-cloud-arrow-down', text: tx('Offline · saved locally', 'Sin conexión · guardado local') };
    if (failed) return { key: 'failed', icon: 'fa-triangle-exclamation', text: tx(`${failed} need sync`, `${failed} requieren sincronización`) };
    if (pending) return { key: 'syncing', icon: 'fa-arrows-rotate', text: tx(`Syncing ${pending}`, `Sincronizando ${pending}`) };
    return { key: 'saved', icon: 'fa-cloud', text: tx('Saved', 'Guardado') };
  }

  function renderSyncStatus() {
    const s = session(); const prior = document.getElementById('otto-sync-status');
    if (!s) { if (prior) prior.remove(); return; }
    const v = syncState();
    if (prior && prior.dataset.syncKey === v.key && prior.dataset.syncText === v.text) return;
    const html = `<div id="otto-sync-status" class="ui-sync ${v.key}" role="status" data-sync-key="${esc(v.key)}" data-sync-text="${esc(v.text)}"><i class="fas ${v.icon}" aria-hidden="true"></i><span>${esc(v.text)}</span></div>`;
    if (prior) prior.outerHTML = html; else document.body.insertAdjacentHTML('beforeend', html);
  }

  function enhanceForms() {
    document.querySelectorAll('#main form, .modal form, .sheet form').forEach(form => {
      if (form.dataset.uiEnhanced === '1') return; form.dataset.uiEnhanced = '1';
      form.addEventListener('input', () => { state.formDirty = true; });
      const submit = form.querySelector('button[type="submit"], .btn.primary, .btn-primary');
      if (submit && !form.querySelector('.ui-sticky-form-actions')) {
        const bar = document.createElement('div'); bar.className = 'ui-sticky-form-actions';
        const clone = submit.cloneNode(true); clone.removeAttribute('id'); clone.addEventListener('click', e => { e.preventDefault(); submit.click(); }); bar.appendChild(clone); form.appendChild(bar);
      }
      form.querySelectorAll('input,select,textarea').forEach(input => {
        input.addEventListener('invalid', () => { input.classList.add('ui-invalid'); });
        input.addEventListener('input', () => { if (input.checkValidity()) input.classList.remove('ui-invalid'); });
      });
    });
  }

  function enhanceOperationsInbox() {
    const r = route(); if (r.view !== 'otto_operations') return;
    const card = Array.from(document.querySelectorAll('.otto-premium-card.full')).find(x => /Needs attention|Requiere atención/i.test(x.querySelector('h2')?.textContent || ''));
    if (!card || card.querySelector('.ui-attention-toolbar')) return;
    const items = Array.from(card.querySelectorAll('.otto-premium-item'));
    const toolbar = document.createElement('div'); toolbar.className = 'ui-attention-toolbar'; toolbar.innerHTML = `<span>${esc(tx('Operational inbox', 'Bandeja operativa'))}</span><span>${items.length} ${esc(tx('open', 'abiertos'))}</span>`;
    const muted = card.querySelector('.otto-premium-muted'); if (muted) muted.insertAdjacentElement('afterend', toolbar);
    items.forEach(item => { const action = item.querySelector('.otto-premium-actions'); if (action && !action.querySelector('[data-ui-action="attention-details"]')) { const b = document.createElement('button'); b.type = 'button'; b.dataset.uiAction = 'attention-details'; b.textContent = tx('Details', 'Detalles'); action.appendChild(b); } });
  }

  function enhanceCurrentView() {
    applyPersonalToday();
    const r = route(); const s = session();
    if (s && ['owner', 'office'].includes(s.role) && r.view === 'otto_schedule' && !document.querySelector('[data-ui-dispatch]')) renderDispatch();
    enhanceRecordPage();
    fieldStickyActions();
    if (!(session() && session().role === 'customer')) portalCards();
    enhanceOperationsInbox();
    injectQuickCreate();
    enhanceForms();
    renderSyncStatus();
  }

  function shiftDispatch(days) {
    const d = new Date(`${state.dispatchDate}T12:00:00`); d.setDate(d.getDate() + days); state.dispatchDate = iso(d); renderDispatch();
  }

  function saveCustomer() {
    const form = document.getElementById('ui-new-customer'); if (!form) return;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries()); const rid = id('customer'); const now = new Date().toISOString();
    add('customers', { id: rid, name: data.name.trim(), phone: data.phone.trim(), email: data.email.trim(), address: data.address.trim(), created: now, updated: now }); save(); document.getElementById('otto-ui-modal')?.remove(); toast(tx('Customer saved', 'Cliente guardado'), 'success'); nav('customer', rid);
  }

  function saveJob() {
    const form = document.getElementById('ui-new-job'); if (!form) return;
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries()); const rid = id('job'); const now = new Date().toISOString();
    add('jobs', { id: rid, customerId: data.customerId, title: data.title.trim(), description: data.description.trim(), scheduledDate: data.scheduledDate || '', scheduledTime: data.scheduledTime || '', status: data.scheduledDate ? 'scheduled' : 'new', created: now, updated: now }); save(); document.getElementById('otto-ui-modal')?.remove(); toast(tx('Job saved', 'Trabajo guardado'), 'success'); nav('job', rid);
  }

  function savePortalRequest() {
    const s = session(), form = document.getElementById('ui-portal-request'); if (!s || !form || !form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries()); const now = new Date().toISOString();
    add('calls', { id: id('portal-request'), customerId: s.customerId, source: 'customer_portal', requestSource: 'customer_portal', serviceCategory: data.serviceCategory, description: data.description.trim(), urgency: data.urgency, requestedTiming: data.requestedTiming.trim(), status: 'open', created: now, updated: now }); save(); document.getElementById('otto-ui-modal')?.remove(); toast(tx('Request sent', 'Solicitud enviada'), 'success'); rerender();
  }

  document.addEventListener('click', function (event) {
    const drawer = event.target.closest('[data-ui-drawer]');
    if (drawer) { event.preventDefault(); event.stopPropagation(); openDrawer(drawer.dataset.uiDrawer, drawer.dataset.id); return; }
    const quick = event.target.closest('[data-ui-quick]');
    if (quick) { event.preventDefault(); event.stopPropagation(); document.getElementById('otto-cmd')?.remove(); runQuickCreate(quick.dataset.uiQuick); return; }
    const open = event.target.closest('[data-ui-open]');
    if (open) { event.preventDefault(); closeDrawer(); nav(open.dataset.uiOpen, open.dataset.id); return; }
    const fileNav = event.target.closest('[data-ui-file-nav]');
    if (fileNav) { event.preventDefault(); const col = fileNav.dataset.kind === 'photo' ? 'photos' : 'documents'; const siblings = arr(col).filter(x => x && x.jobId === fileNav.dataset.job); const nextIndex = Number(fileNav.dataset.index) + (fileNav.dataset.uiFileNav === 'next' ? 1 : -1); const rec = siblings[nextIndex]; if (rec) openFileViewer(fileNav.dataset.kind, rec.id); return; }
    const actionNode = event.target.closest('[data-ui-action]'); if (!actionNode) return;
    const action = actionNode.dataset.uiAction; const rid = actionNode.dataset.id;
    switch (action) {
      case 'close-drawer': closeDrawer(); break;
      case 'close-modal': document.getElementById('otto-ui-modal')?.remove(); state.formDirty = false; break;
      case 'dispatch-mode': state.dispatchMode = actionNode.dataset.mode === 'week' ? 'week' : 'day'; renderDispatch(); break;
      case 'dispatch-prev': shiftDispatch(state.dispatchMode === 'week' ? -7 : -1); break;
      case 'dispatch-next': shiftDispatch(state.dispatchMode === 'week' ? 7 : 1); break;
      case 'dispatch-today': state.dispatchDate = today(); renderDispatch(); break;
      case 'open-operations': nav('otto_operations'); break;
      case 'new-job-for-customer': closeDrawer(); runQuickCreate('job', rid); break;
      case 'job-brief': { const j = job(rid); if (j) modal(tx('OTTO Job Brief', 'Resumen de Trabajo OTTO'), `<textarea class="ui-copy-area" readonly>${esc(jobBriefText(j))}</textarea>`, `<button class="ui-button primary" data-ui-action="copy-brief" data-id="${esc(rid)}">${esc(tx('Copy brief', 'Copiar resumen'))}</button>`); break; }
      case 'copy-brief': { const j = job(rid); if (j) navigator.clipboard?.writeText(jobBriefText(j)).then(() => toast(tx('Copied', 'Copiado'), 'success')); break; }
      case 'edit-estimate': try { if (B().openEstimateForm) B().openEstimateForm(rid); else nav('estimates'); } catch (_) { nav('estimates'); } break;
      case 'save-customer': saveCustomer(); break;
      case 'save-job': saveJob(); break;
      case 'portal-scroll': document.getElementById(actionNode.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'portal-request': portalRequestForm(); break;
      case 'save-portal-request': savePortalRequest(); break;
      case 'attention-details': actionNode.closest('.otto-premium-item')?.classList.toggle('is-expanded'); break;
      default: break;
    }
  }, true);

  document.addEventListener('click', function (event) {
    const target = event.target.closest('[data-otto-view]'); if (!target) return;
    const view = target.getAttribute('data-otto-view'); const rid = target.getAttribute('data-otto-id');
    if (!rid || !['job', 'customer', 'estimate', 'invoice'].includes(view)) return;
    const s = session(); if (!s || !['owner', 'office'].includes(s.role)) return;
    event.preventDefault(); event.stopImmediatePropagation(); openDrawer(view, rid);
  }, true);

  document.addEventListener('click', function (event) {
    const photo = event.target.closest('[data-ui-file-photo]'); if (photo) { event.preventDefault(); openFileViewer('photo', photo.dataset.uiFilePhoto); }
    const doc = event.target.closest('[data-ui-file-document]'); if (doc) { event.preventDefault(); openFileViewer('document', doc.dataset.uiFileDocument); }
  });

  window.addEventListener('online', renderSyncStatus);
  window.addEventListener('offline', renderSyncStatus);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (document.getElementById('otto-context-drawer')) closeDrawer(); else if (document.getElementById('otto-ui-modal')) document.getElementById('otto-ui-modal').remove(); } });

  let scheduled = false;
  const observer = new MutationObserver(() => { if (scheduled) return; scheduled = true; requestAnimationFrame(() => { scheduled = false; enhanceCurrentView(); }); });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.ottoUiIntegrations = { enhanceCurrentView, openDrawer, renderDispatch, activityEntries, openFileViewer };
  setTimeout(enhanceCurrentView, 0);
})();
