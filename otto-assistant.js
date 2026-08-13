/* OTTO CRM — focused command assistant.
   Search first, preview second, confirm before changes. Offline search and safe
   template creation use the CRM's local data; Claude is optional for drafting. */
(function () {
  'use strict';

  const bridge = () => window.__ottoAssistantBridge || {};
  const ALLOWED_IDS = new Set(['owner-1', 'owner-2', 'ops-1', 'it-admin-ejn']);
  const MAX_RESULTS = 5;
  const SEARCH_TYPES = new Set(['paystub', 'contract', 'email', 'note', 'payroll', 'schedule', 'employee']);
  const ACTIONS = new Set(['create_note', 'create_email_draft', 'create_contract', 'create_paystub', 'create_payroll_summary', 'schedule_change', 'update_employee']);
  const EMPLOYEE_FIELDS = new Set(['phone', 'email', 'address', 'title', 'position']);

  const state = {
    open: false,
    query: '',
    results: [],
    preview: null,
    proposal: null,
    busy: false,
    status: '',
    lastFocus: null
  };

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = value => String(value == null ? '' : value)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9@.+:/-]+/g, ' ').trim();
  const tx = (en, es) => currentLang() === 'es' ? es : en;
  const nowISO = () => new Date().toISOString();

  function currentLang() {
    try { return bridge().getLang?.() || 'en'; } catch (_) { return 'en'; }
  }

  function db() {
    try { return bridge().getDb?.() || {}; } catch (_) { return {}; }
  }

  function session() {
    try { return bridge().getSession?.() || null; } catch (_) { return null; }
  }

  function route() {
    try { return bridge().getRoute?.() || {}; } catch (_) { return {}; }
  }

  function list(name) {
    const value = db()[name];
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function isAllowed() {
    const s = session();
    return Boolean(s && ALLOWED_IDS.has(s.id) && (s.role === 'owner' || s.role === 'office'));
  }

  function employeeName(id) {
    const u = list('users').find(x => x.id === id);
    return u ? (u.name || u.name_en || u.name_es || u.email || id) : '';
  }

  function employeeForRecord(record) {
    const id = record && (record.employeeId || record.workerId || record.userId || record.assignedTo);
    return id ? list('users').find(u => u.id === id) || null : null;
  }

  function currentContext() {
    const r = route();
    let employee = null;
    const candidateIds = [r.employeeId, r.workerId, r.userId, r.id].filter(Boolean);
    for (const id of candidateIds) {
      employee = list('users').find(u => u.id === id) || null;
      if (employee) break;
    }
    if (!employee) {
      const active = document.querySelector('[data-otto-worker][aria-current="true"], [data-employee-id].is-active, [data-worker-id].is-active');
      const id = active && (active.getAttribute('data-otto-worker') || active.getAttribute('data-employee-id') || active.getAttribute('data-worker-id'));
      if (id) employee = list('users').find(u => u.id === id) || null;
    }
    let record = null;
    const view = String(r.view || '');
    if (r.id) {
      const map = {
        payroll: 'payroll', contracts: 'contracts', contract: 'contracts', inbox: 'emails', email: 'emails',
        notes: 'notes', note: 'notes', team: 'users', worker: 'users', employee: 'users', schedule: 'jobs', jobs: 'jobs', job: 'jobs'
      };
      const collection = map[view];
      if (collection) record = list(collection).find(x => x.id === r.id) || null;
    }
    if (!employee && record) employee = employeeForRecord(record);
    return { view, id: r.id || '', employee, record };
  }

  function contextualizeQuery(query) {
    const ctx = currentContext();
    const q = String(query || '').trim();
    if (!ctx.employee) return q;
    const n = norm(q);
    if (/\b(his|her|their|him|she|he|su|sus|el|ella)\b/.test(n)) return `${q} ${ctx.employee.name || ctx.employee.name_en || ''}`.trim();
    return q;
  }

  function categoryHint(query) {
    const q = norm(query);
    if (/paystub|pay stub|talon|comprobante de pago/.test(q)) return 'paystub';
    if (/contract|contrato/.test(q)) return 'contract';
    if (/email|correo|message|mensaje/.test(q)) return 'email';
    if (/note|nota/.test(q)) return 'note';
    if (/payroll|nomina/.test(q)) return 'payroll';
    if (/schedule|scheduled|calendar|tomorrow|today|week|agenda|horario|programad|manana|hoy|semana/.test(q)) return 'schedule';
    if (/employee|worker|staff|team|record|empleado|trabajador|personal|expediente/.test(q)) return 'employee';
    return '';
  }

  function words(query) {
    const stop = new Set(['the','a','an','of','for','to','in','on','and','show','find','open','me','please','el','la','los','las','de','del','para','a','en','y','muestrame','busca','abre','por','favor','his','her','su','sus']);
    return norm(query).split(/\s+/).filter(w => w.length > 1 && !stop.has(w));
  }

  function scoreText(text, queryWords, exactQuery) {
    const hay = norm(text);
    if (!hay) return 0;
    let score = 0;
    queryWords.forEach(w => {
      if (hay === w) score += 18;
      else if (hay.startsWith(w)) score += 8;
      else if (hay.includes(w)) score += 4;
    });
    if (exactQuery && hay.includes(norm(exactQuery))) score += 14;
    return score;
  }

  function dateValue(record) {
    return Date.parse(record.updated || record.updatedAt || record.created || record.createdAt || record.date || record.scheduledDate || record.periodEnd || record.period || 0) || 0;
  }

  function money(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return value == null || value === '' ? '' : String(value);
    return new Intl.NumberFormat(currentLang() === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  function payrollEmployeeId(p) {
    if (p.employeeId) return p.employeeId;
    const name = norm(p.employee || p.name || '');
    if (!name) return '';
    return (list('users').find(u => norm(u.name || u.name_en || u.name_es || '') === name) || {}).id || '';
  }

  function resultFromPayroll(p, type) {
    const employeeId = payrollEmployeeId(p);
    const emp = employeeName(employeeId) || p.employee || p.name || tx('Employee', 'Empleado');
    const period = p.period || [p.periodStart, p.periodEnd].filter(Boolean).join(' – ') || p.date || '';
    const gross = p.gross ?? p.grossPay ?? p.totalGross;
    const net = p.net ?? p.netPay ?? p.totalNet;
    const hours = p.hours ?? p.totalHours;
    const title = type === 'paystub' ? `${emp} · ${tx('Paystub', 'Comprobante de pago')}` : `${emp} · ${tx('Payroll', 'Nómina')}`;
    const meta = [period, hours != null ? `${hours}h` : '', gross != null ? `${tx('Gross', 'Bruto')} ${money(gross)}` : ''].filter(Boolean).join(' · ');
    const snippet = [net != null ? `${tx('Net', 'Neto')} ${money(net)}` : '', p.notes || p.note || ''].filter(Boolean).join(' · ');
    return { type, id: p.id, source: 'payroll', title, meta, snippet, employeeId, data: p, date: dateValue(p) };
  }

  function searchableResults() {
    const out = [];
    list('payroll').forEach(p => {
      out.push(resultFromPayroll(p, 'payroll'));
      out.push(resultFromPayroll(p, 'paystub'));
    });
    list('contracts').forEach(c => {
      const emp = employeeForRecord(c);
      out.push({ type: 'contract', id: c.id, source: 'contracts', title: c.title || c.name || `${tx('Contract', 'Contrato')}${emp ? ` · ${emp.name}` : ''}`, meta: [emp && emp.name, c.status, c.date || c.createdAt].filter(Boolean).join(' · '), snippet: c.summary || c.body || c.notes || '', employeeId: emp && emp.id, data: c, date: dateValue(c) });
    });
    list('emails').forEach(e => {
      const emp = employeeForRecord(e);
      out.push({ type: 'email', id: e.id, source: 'emails', title: e.subject || tx('Email', 'Correo'), meta: [e.fromName || e.from, e.toName || e.to, e.date || e.createdAt].filter(Boolean).join(' · '), snippet: e.summary || e.body || e.text || '', employeeId: emp && emp.id, data: e, date: dateValue(e) });
    });
    list('notes').forEach(n => {
      const emp = employeeForRecord(n);
      out.push({ type: 'note', id: n.id, source: 'notes', title: n.title || `${tx('Note', 'Nota')}${emp ? ` · ${emp.name}` : ''}`, meta: [emp && emp.name, n.date || n.createdAt].filter(Boolean).join(' · '), snippet: n.text || n.body || n.note || '', employeeId: emp && emp.id, data: n, date: dateValue(n) });
    });
    list('jobs').filter(j => j.scheduledDate || j.start || j.date).forEach(j => {
      const emp = employeeForRecord(j);
      const when = j.scheduledDate || j.start || j.date || '';
      out.push({ type: 'schedule', id: j.id, source: 'jobs', title: j.title || tx('Scheduled work', 'Trabajo programado'), meta: [emp && emp.name, when, j.status].filter(Boolean).join(' · '), snippet: j.description || j.address || '', employeeId: emp && emp.id, data: j, date: Date.parse(when) || dateValue(j) });
    });
    list('users').forEach(u => {
      out.push({ type: 'employee', id: u.id, source: 'users', title: u.name || u.name_en || u.name_es || u.email || tx('Employee', 'Empleado'), meta: [u.title || u.position || u.role, u.email, u.phone].filter(Boolean).join(' · '), snippet: [u.address, u.notes].filter(Boolean).join(' · '), employeeId: u.id, data: u, date: dateValue(u) });
    });
    list('documents').filter(d => ['paystub','contract','payroll_summary'].includes(String(d.type || d.kind || '').toLowerCase())).forEach(d => {
      const kind = String(d.type || d.kind || '').toLowerCase();
      const type = kind === 'contract' ? 'contract' : kind === 'paystub' ? 'paystub' : 'payroll';
      const emp = employeeForRecord(d);
      out.push({ type, id: d.id, source: 'documents', title: d.name || d.title || type, meta: [emp && emp.name, d.period || d.date || d.createdAt].filter(Boolean).join(' · '), snippet: d.summary || d.body || d.text || '', employeeId: emp && emp.id, data: d, date: dateValue(d) });
    });
    return out.filter(r => SEARCH_TYPES.has(r.type));
  }

  function search(query) {
    const q = contextualizeQuery(query);
    const qWords = words(q);
    const hint = categoryHint(q);
    const ctx = currentContext();
    return searchableResults().map(r => {
      const blob = [r.title, r.meta, r.snippet, JSON.stringify(r.data)].join(' ');
      let score = scoreText(blob, qWords, q);
      if (hint && r.type === hint) score += 24;
      if (ctx.employee && r.employeeId === ctx.employee.id) score += 12;
      if (!qWords.length && hint === r.type) score += 5;
      return { ...r, score };
    }).filter(r => r.score > 0 || (!qWords.length && hint === r.type))
      .sort((a, b) => b.score - a.score || b.date - a.date)
      .slice(0, MAX_RESULTS);
  }

  function findEmployeeFromQuery(query) {
    const q = norm(query);
    const employees = list('users');
    let best = null;
    employees.forEach(u => {
      const names = [u.name, u.name_en, u.name_es, u.email].filter(Boolean);
      let score = 0;
      names.forEach(name => {
        const n = norm(name);
        if (n && q.includes(n)) score = Math.max(score, n.length + 20);
        n.split(/\s+/).filter(x => x.length > 2).forEach(part => { if (q.includes(part)) score += 4; });
      });
      if (!best || score > best.score) best = { user: u, score };
    });
    if (best && best.score > 0) return best.user;
    return currentContext().employee || null;
  }

  function latestPayrollFor(employeeId) {
    const rows = list('payroll').filter(p => payrollEmployeeId(p) === employeeId);
    return rows.sort((a, b) => dateValue(b) - dateValue(a))[0] || null;
  }

  function actionIntent(query) {
    const q = norm(query);
    return /\b(create|make|draft|write|add|change|update|move|reschedule|schedule|set|crear|haz|redacta|escribe|agrega|anade|cambia|actualiza|mueve|reprograma|programa|poner)\b/.test(q);
  }

  function parseDate(query) {
    const q = norm(query);
    const base = new Date(); base.setHours(0,0,0,0);
    if (/\btomorrow\b|\bmanana\b/.test(q)) { base.setDate(base.getDate() + 1); return base; }
    if (/\btoday\b|\bhoy\b/.test(q)) return base;
    const iso = q.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const us = q.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](20\d{2}))?\b/);
    if (us) return new Date(Number(us[3] || base.getFullYear()), Number(us[1]) - 1, Number(us[2]));
    const names = [
      ['sunday','domingo',0],['monday','lunes',1],['tuesday','martes',2],['wednesday','miercoles',3],['thursday','jueves',4],['friday','viernes',5],['saturday','sabado',6]
    ];
    for (const [en, es, day] of names) {
      if (q.includes(en) || q.includes(es)) {
        const d = new Date(base); let delta = (day - d.getDay() + 7) % 7; if (delta === 0) delta = 7; d.setDate(d.getDate() + delta); return d;
      }
    }
    return null;
  }

  function parseTime(query) {
    const q = norm(query);
    const m = q.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) || q.match(/\b(\d{1,2}):(\d{2})\b/);
    if (!m) return null;
    let hour = Number(m[1]); const minute = Number(m[2] || 0); const ap = m[3];
    if (ap === 'pm' && hour < 12) hour += 12; if (ap === 'am' && hour === 12) hour = 0;
    if (hour > 23 || minute > 59) return null;
    return { hour, minute };
  }

  function extractAfterKeyword(query, keywords) {
    const raw = String(query || '').trim();
    const lower = raw.toLowerCase();
    let pos = -1;
    keywords.forEach(k => { const p = lower.indexOf(k); if (p >= 0 && (pos < 0 || p < pos)) pos = p + k.length; });
    if (pos < 0) return raw;
    return raw.slice(pos).replace(/^\s*(for|about|to|para|sobre|a|:|-)+\s*/i, '').trim() || raw;
  }

  function localProposal(query) {
    const q = norm(query);
    const employee = findEmployeeFromQuery(query);
    if (/\b(note|nota)\b/.test(q) && /\b(create|add|write|crear|agrega|anade|escribe)\b/.test(q)) {
      const text = extractAfterKeyword(query, ['note', 'nota']);
      return { action: 'create_note', employeeId: employee && employee.id, label: tx('Create note', 'Crear nota'), summary: text, payload: { text } };
    }
    if (/\b(email|correo)\b/.test(q) && /\b(create|draft|write|crear|redacta|escribe)\b/.test(q)) {
      const body = extractAfterKeyword(query, ['email', 'correo']);
      return { action: 'create_email_draft', employeeId: employee && employee.id, label: tx('Create email draft', 'Crear borrador de correo'), summary: body, payload: { body } };
    }
    if (/\b(contract|contrato)\b/.test(q) && /\b(create|make|draft|crear|haz|redacta)\b/.test(q)) {
      return { action: 'create_contract', employeeId: employee && employee.id, label: tx('Create contract draft', 'Crear borrador de contrato'), summary: employee ? employee.name : tx('Employee required', 'Empleado requerido'), payload: {} };
    }
    if (/paystub|pay stub|talon|comprobante de pago/.test(q) && /\b(create|make|generate|crear|haz|genera)\b/.test(q)) {
      return { action: 'create_paystub', employeeId: employee && employee.id, label: tx('Create paystub', 'Crear comprobante de pago'), summary: employee ? employee.name : tx('Employee required', 'Empleado requerido'), payload: {} };
    }
    if (/payroll|nomina/.test(q) && /summary|resumen/.test(q) && /\b(create|make|generate|crear|haz|genera)\b/.test(q)) {
      return { action: 'create_payroll_summary', employeeId: employee && employee.id, label: tx('Create payroll summary', 'Crear resumen de nómina'), summary: employee ? employee.name : tx('Latest payroll', 'Nómina más reciente'), payload: {} };
    }
    if (/schedule|reschedule|move|horario|reprograma|mueve|programa/.test(q) && /\b(change|move|reschedule|set|update|cambia|mueve|reprograma|actualiza|programa)\b/.test(q)) {
      const date = parseDate(query); const time = parseTime(query);
      const jobs = list('jobs').filter(j => (!employee || employee.id === (j.assignedTo || j.workerId || j.employeeId)) && (j.scheduledDate || j.start || j.date));
      const target = jobs.sort((a,b) => dateValue(b) - dateValue(a))[0] || null;
      return { action: 'schedule_change', employeeId: employee && employee.id, recordId: target && target.id, label: tx('Change schedule', 'Cambiar horario'), summary: [employee && employee.name, date && date.toLocaleDateString(), time && `${String(time.hour).padStart(2,'0')}:${String(time.minute).padStart(2,'0')}`].filter(Boolean).join(' · '), payload: { date: date ? date.toISOString().slice(0,10) : '', time } };
    }
    if (/employee|record|empleado|expediente/.test(q) && /\b(change|update|set|cambia|actualiza|poner)\b/.test(q)) {
      const payload = {};
      const email = String(query).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i); if (email) payload.email = email[0];
      const phone = String(query).match(/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/); if (phone) payload.phone = phone[0];
      return { action: 'update_employee', employeeId: employee && employee.id, label: tx('Update employee record', 'Actualizar expediente del empleado'), summary: Object.entries(payload).map(([k,v]) => `${k}: ${v}`).join(' · ') || tx('Review requested change', 'Revisar cambio solicitado'), payload };
    }
    return null;
  }

  async function aiProposal(query) {
    const b = bridge();
    if (typeof b.callClaude !== 'function' || navigator.onLine === false) return null;
    const employees = list('users').map(u => ({ id: u.id, name: u.name || u.name_en || u.name_es || '', email: u.email || '' }));
    const schedules = list('jobs').filter(j => j.scheduledDate || j.start || j.date).slice(-30).map(j => ({ id: j.id, title: j.title || '', employeeId: j.assignedTo || j.workerId || j.employeeId || '', when: j.scheduledDate || j.start || j.date || '' }));
    const ctx = currentContext();
    const system = `You convert a plumbing CRM owner's instruction into ONE safe proposed action. Never execute anything. Allowed actions only: ${[...ACTIONS].join(', ')}. Never change roles, authentication, permissions, payments, bank data, payroll amounts, or delete data. Return ONLY compact JSON: {"action":"...","employeeId":"","recordId":"","summary":"","payload":{}}. If the request is not one allowed action, return {"action":""}. Current context employee: ${ctx.employee ? `${ctx.employee.id} ${ctx.employee.name}` : 'none'}. Employees: ${JSON.stringify(employees)}. Recent schedules: ${JSON.stringify(schedules)}.`;
    try {
      const d = await b.callClaude({ model: 'claude-sonnet-4-6', max_tokens: 450, system, messages: [{ role: 'user', content: String(query).slice(0, 1600) }] });
      const text = d && d.content && d.content[0] && d.content[0].text;
      const match = text && text.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (!parsed || !ACTIONS.has(parsed.action)) return null;
      parsed.payload = parsed.payload && typeof parsed.payload === 'object' ? parsed.payload : {};
      parsed.label = actionLabel(parsed.action);
      return sanitizeProposal(parsed);
    } catch (_) { return null; }
  }

  function actionLabel(action) {
    const labels = {
      create_note: tx('Create note', 'Crear nota'),
      create_email_draft: tx('Create email draft', 'Crear borrador de correo'),
      create_contract: tx('Create contract draft', 'Crear borrador de contrato'),
      create_paystub: tx('Create paystub', 'Crear comprobante de pago'),
      create_payroll_summary: tx('Create payroll summary', 'Crear resumen de nómina'),
      schedule_change: tx('Change schedule', 'Cambiar horario'),
      update_employee: tx('Update employee record', 'Actualizar expediente del empleado')
    };
    return labels[action] || action;
  }

  function sanitizeProposal(p) {
    if (!p || !ACTIONS.has(p.action)) return null;
    const out = { action: p.action, employeeId: p.employeeId || '', recordId: p.recordId || '', label: p.label || actionLabel(p.action), summary: String(p.summary || '').slice(0, 800), payload: { ...(p.payload || {}) } };
    if (out.employeeId && !list('users').some(u => u.id === out.employeeId)) out.employeeId = '';
    if (out.action === 'update_employee') {
      out.payload = Object.fromEntries(Object.entries(out.payload).filter(([k]) => EMPLOYEE_FIELDS.has(k)));
    }
    if (out.action === 'schedule_change' && out.recordId && !list('jobs').some(j => j.id === out.recordId)) out.recordId = '';
    return out;
  }

  function audit(action, target, before, after) {
    try {
      bridge().add?.('audit_log', { action, target, before, after, actorId: session() && session().id, createdAt: nowISO(), source: 'ask-otto' });
    } catch (_) {}
  }

  function buildPaystubDocument(employee, payroll) {
    const values = {
      period: payroll.period || [payroll.periodStart, payroll.periodEnd].filter(Boolean).join(' – ') || payroll.date || '',
      hours: payroll.hours ?? payroll.totalHours ?? '',
      regularHours: payroll.regularHours ?? '',
      overtimeHours: payroll.overtimeHours ?? payroll.otHours ?? '',
      gross: payroll.gross ?? payroll.grossPay ?? payroll.totalGross ?? '',
      deductions: payroll.deductions ?? payroll.totalDeductions ?? '',
      net: payroll.net ?? payroll.netPay ?? payroll.totalNet ?? ''
    };
    const body = [
      `OTTO Plumbing Inc. — ${tx('Paystub', 'Comprobante de pago')}`,
      `${tx('Employee', 'Empleado')}: ${employee.name || employee.name_en || employee.name_es || ''}`,
      `${tx('Period', 'Período')}: ${values.period || '—'}`,
      values.hours !== '' ? `${tx('Hours', 'Horas')}: ${values.hours}` : '',
      values.regularHours !== '' ? `${tx('Regular hours', 'Horas regulares')}: ${values.regularHours}` : '',
      values.overtimeHours !== '' ? `${tx('Overtime hours', 'Horas extra')}: ${values.overtimeHours}` : '',
      values.gross !== '' ? `${tx('Gross', 'Bruto')}: ${money(values.gross)}` : '',
      values.deductions !== '' ? `${tx('Deductions', 'Deducciones')}: ${money(values.deductions)}` : '',
      values.net !== '' ? `${tx('Net', 'Neto')}: ${money(values.net)}` : ''
    ].filter(Boolean).join('\n');
    return { type: 'paystub', name: `${employee.name || 'Employee'} — ${tx('Paystub', 'Comprobante')} ${values.period || new Date().toLocaleDateString()}`, employeeId: employee.id, payrollId: payroll.id, ...values, body, createdAt: nowISO(), createdBy: session() && session().id };
  }

  function contractDraft(employee) {
    const name = employee.name || employee.name_en || employee.name_es || tx('Employee', 'Empleado');
    const body = currentLang() === 'es'
      ? `BORRADOR — Acuerdo laboral\n\nEntre OTTO Plumbing Inc. y ${name}.\n\nEste borrador organiza los términos que la empresa apruebe. Antes de firmar, deben revisarse cargo, fecha de inicio, compensación, responsabilidades y cualquier condición aplicable.\n\nEstado: borrador para revisión.`
      : `DRAFT — Employment Agreement\n\nBetween OTTO Plumbing Inc. and ${name}.\n\nThis draft organizes the terms approved by the company. Before signature, role, start date, compensation, responsibilities, and any applicable conditions must be reviewed.\n\nStatus: draft for review.`;
    return { title: `${tx('Employment Agreement', 'Acuerdo laboral')} — ${name}`, employeeId: employee.id, status: 'draft', body, createdAt: nowISO(), createdBy: session() && session().id };
  }

  async function executeProposal(p) {
    const b = bridge();
    if (!isAllowed()) throw new Error(tx('You are not authorized to use Ask OTTO.', 'No estás autorizado para usar Ask OTTO.'));
    const employee = p.employeeId ? list('users').find(u => u.id === p.employeeId) : null;
    const actor = session();

    if (p.action === 'create_note') {
      const text = String(p.payload.text || p.summary || '').trim();
      if (!text) throw new Error(tx('The note needs text.', 'La nota necesita texto.'));
      const rec = { text, employeeId: employee && employee.id, createdAt: nowISO(), createdBy: actor.id, source: 'ask-otto' };
      b.add('notes', rec); audit('create_note', employee && employee.id, null, rec); return tx('Note created.', 'Nota creada.');
    }

    if (p.action === 'create_email_draft') {
      if (!employee || !employee.email) throw new Error(tx('That employee does not have an email address in OTTO.', 'Ese empleado no tiene correo en OTTO.'));
      let body = String(p.payload.body || p.summary || '').trim();
      let subject = String(p.payload.subject || '').trim() || tx('OTTO Plumbing', 'OTTO Plumbing');
      if (typeof b.callClaude === 'function' && navigator.onLine !== false && body) {
        try {
          const d = await b.callClaude({ model: 'claude-sonnet-4-6', max_tokens: 450, system: `Draft a concise professional internal email for OTTO Plumbing. Output JSON only: {"subject":"","body":""}. Reply in ${currentLang() === 'es' ? 'Spanish' : 'English'}. Do not invent facts, money, dates, commitments, or policy.`, messages: [{ role: 'user', content: body }] });
          const t = d && d.content && d.content[0] && d.content[0].text; const m = t && t.match(/\{[\s\S]*\}/); const j = m ? JSON.parse(m[0]) : null;
          if (j && j.body) { body = j.body; subject = j.subject || subject; }
        } catch (_) {}
      }
      const rec = { direction: 'outgoing', status: 'draft', to: employee.email, toName: employee.name || '', employeeId: employee.id, subject, body, createdAt: nowISO(), createdBy: actor.id, source: 'ask-otto' };
      b.add('emails', rec); audit('create_email_draft', employee.id, null, { ...rec, body: '[draft body]' }); return tx('Email draft created. It was not sent.', 'Borrador de correo creado. No se envió.');
    }

    if (p.action === 'create_contract') {
      if (!employee) throw new Error(tx('Choose an employee first.', 'Selecciona un empleado primero.'));
      const rec = contractDraft(employee); b.add('contracts', rec); audit('create_contract', employee.id, null, { title: rec.title, status: rec.status }); return tx('Contract draft created for review.', 'Borrador de contrato creado para revisión.');
    }

    if (p.action === 'create_paystub') {
      if (!employee) throw new Error(tx('Choose an employee first.', 'Selecciona un empleado primero.'));
      const payroll = latestPayrollFor(employee.id); if (!payroll) throw new Error(tx('No payroll record was found for that employee.', 'No se encontró nómina para ese empleado.'));
      const rec = buildPaystubDocument(employee, payroll); b.add('documents', rec); audit('create_paystub', employee.id, null, { payrollId: payroll.id, name: rec.name }); return tx('Paystub created from the recorded payroll values.', 'Comprobante creado usando los valores registrados de nómina.');
    }

    if (p.action === 'create_payroll_summary') {
      const rows = employee ? list('payroll').filter(x => payrollEmployeeId(x) === employee.id) : list('payroll');
      if (!rows.length) throw new Error(tx('No payroll records were found.', 'No se encontraron registros de nómina.'));
      const selected = rows.sort((a,b) => dateValue(b) - dateValue(a)).slice(0, 20);
      const body = selected.map(x => {
        const id = payrollEmployeeId(x); const name = employeeName(id) || x.employee || '';
        return `${name} · ${x.period || x.date || ''} · ${x.hours ?? x.totalHours ?? ''}h · ${x.gross != null ? money(x.gross) : ''}`;
      }).join('\n');
      const rec = { type: 'payroll_summary', name: `${tx('Payroll summary', 'Resumen de nómina')} — ${new Date().toLocaleDateString()}`, employeeId: employee && employee.id, body, createdAt: nowISO(), createdBy: actor.id };
      b.add('documents', rec); audit('create_payroll_summary', employee && employee.id, null, { name: rec.name }); return tx('Payroll summary created.', 'Resumen de nómina creado.');
    }

    if (p.action === 'schedule_change') {
      const job = list('jobs').find(j => j.id === p.recordId); if (!job) throw new Error(tx('I could not identify an existing schedule entry to change.', 'No pude identificar una entrada existente del horario.'));
      const before = { scheduledDate: job.scheduledDate, start: job.start, date: job.date };
      const requestedDate = p.payload.date || ''; const time = p.payload.time;
      if (!requestedDate && !time) throw new Error(tx('The requested date or time is missing.', 'Falta la fecha o la hora solicitada.'));
      const base = new Date(job.scheduledDate || job.start || job.date || nowISO());
      if (requestedDate) { const d = new Date(`${requestedDate}T00:00:00`); base.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); }
      if (time && Number.isFinite(Number(time.hour))) base.setHours(Number(time.hour), Number(time.minute || 0), 0, 0);
      const patch = {};
      if (job.scheduledDate !== undefined) patch.scheduledDate = base.toISOString();
      else if (job.start !== undefined) patch.start = base.toISOString();
      else patch.date = base.toISOString();
      b.update('jobs', job.id, patch); audit('schedule_change', job.id, before, patch); return tx('Schedule updated.', 'Horario actualizado.');
    }

    if (p.action === 'update_employee') {
      if (!employee) throw new Error(tx('Choose an employee first.', 'Selecciona un empleado primero.'));
      const patch = Object.fromEntries(Object.entries(p.payload || {}).filter(([k, v]) => EMPLOYEE_FIELDS.has(k) && String(v || '').trim()));
      if (!Object.keys(patch).length) throw new Error(tx('No safe employee fields were identified to change.', 'No se identificaron campos seguros del empleado para cambiar.'));
      const before = Object.fromEntries(Object.keys(patch).map(k => [k, employee[k]]));
      b.update('users', employee.id, patch); audit('update_employee', employee.id, before, patch); return tx('Employee record updated.', 'Expediente del empleado actualizado.');
    }

    throw new Error(tx('This action is not available.', 'Esta acción no está disponible.'));
  }

  function typeLabel(type) {
    return ({ paystub: tx('Paystub','Comprobante'), contract: tx('Contract','Contrato'), email: tx('Email','Correo'), note: tx('Note','Nota'), payroll: tx('Payroll','Nómina'), schedule: tx('Schedule','Horario'), employee: tx('Employee','Empleado') })[type] || type;
  }

  function icon(type) {
    return ({ paystub:'fa-receipt', contract:'fa-file-signature', email:'fa-envelope', note:'fa-note-sticky', payroll:'fa-money-check-dollar', schedule:'fa-calendar-days', employee:'fa-id-card' })[type] || 'fa-magnifying-glass';
  }

  function previewRows(result) {
    const d = result.data || {};
    const rows = [];
    const add = (label, value) => { if (value !== undefined && value !== null && String(value).trim() !== '') rows.push([label, value]); };
    if (result.employeeId) add(tx('Employee','Empleado'), employeeName(result.employeeId));
    if (result.type === 'paystub' || result.type === 'payroll') {
      add(tx('Period','Período'), d.period || [d.periodStart,d.periodEnd].filter(Boolean).join(' – ')); add(tx('Hours','Horas'), d.hours ?? d.totalHours); add(tx('Gross','Bruto'), d.gross != null ? money(d.gross) : ''); add(tx('Net','Neto'), d.net != null ? money(d.net) : '');
    } else if (result.type === 'contract') { add(tx('Status','Estado'), d.status); add(tx('Date','Fecha'), d.date || d.createdAt); }
    else if (result.type === 'email') { add(tx('From','De'), d.fromName || d.from); add(tx('To','Para'), d.toName || d.to); add(tx('Date','Fecha'), d.date || d.createdAt); }
    else if (result.type === 'schedule') { add(tx('When','Cuándo'), d.scheduledDate || d.start || d.date); add(tx('Status','Estado'), d.status); add(tx('Address','Dirección'), d.address); }
    else if (result.type === 'employee') { add(tx('Role','Rol'), d.title || d.position || d.role); add(tx('Email','Correo'), d.email); add(tx('Phone','Teléfono'), d.phone); add(tx('Address','Dirección'), d.address); }
    return rows;
  }

  function openResult(result) {
    try {
      bridge().openResult?.(result.type, result.id, result.source, result.employeeId);
      closePanel();
    } catch (_) {
      state.status = tx('I could not open that section.', 'No pude abrir esa sección.'); render();
    }
  }

  async function submit(query) {
    const q = String(query || '').trim(); if (!q || !isAllowed()) return;
    state.query = q; state.preview = null; state.proposal = null; state.status = ''; state.busy = true; render();
    try {
      if (actionIntent(q)) {
        let proposal = sanitizeProposal(localProposal(q));
        if (!proposal || (proposal.action === 'update_employee' && !Object.keys(proposal.payload || {}).length) || (proposal.action === 'schedule_change' && !proposal.recordId)) {
          proposal = await aiProposal(q) || proposal;
        }
        if (proposal) {
          state.proposal = proposal;
          state.results = [];
          state.status = tx('Review the proposed change before confirming.', 'Revisa el cambio propuesto antes de confirmar.');
        } else {
          state.results = search(q);
          state.status = state.results.length ? tx('I found these records.', 'Encontré estos registros.') : tx('I could not turn that into a safe change. Try a more specific instruction.', 'No pude convertir eso en un cambio seguro. Intenta una instrucción más específica.');
        }
      } else {
        state.results = search(q);
        state.status = state.results.length ? tx(`Showing ${state.results.length} result${state.results.length === 1 ? '' : 's'}.`, `Mostrando ${state.results.length} resultado${state.results.length === 1 ? '' : 's'}.`) : tx('No matching records found.', 'No se encontraron registros.');
      }
    } finally { state.busy = false; render(); }
  }

  function proposalDetails(p) {
    const emp = p.employeeId ? employeeName(p.employeeId) : '';
    const parts = [];
    if (emp) parts.push(`<div><span>${esc(tx('Employee','Empleado'))}</span><strong>${esc(emp)}</strong></div>`);
    if (p.recordId) {
      const job = list('jobs').find(j => j.id === p.recordId); parts.push(`<div><span>${esc(tx('Record','Registro'))}</span><strong>${esc(job ? (job.title || job.id) : p.recordId)}</strong></div>`);
    }
    Object.entries(p.payload || {}).forEach(([k,v]) => {
      if (v == null || v === '' || typeof v === 'object') return;
      parts.push(`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`);
    });
    return parts.join('');
  }

  function panelMarkup() {
    const ctx = currentContext();
    const online = navigator.onLine !== false;
    const contextChip = ctx.employee ? `<span class="otto-assistant-context"><i class="fas fa-crosshairs"></i>${esc(ctx.employee.name || ctx.employee.name_en || '')}</span>` : '';
    const status = state.status ? `<p class="otto-assistant-status" role="status">${esc(state.status)}</p>` : '';
    const busy = state.busy ? `<div class="otto-assistant-loading" aria-label="${esc(tx('Working','Procesando'))}"><span></span><span></span><span></span></div>` : '';
    const proposal = state.proposal ? `<section class="otto-assistant-proposal" aria-label="${esc(tx('Proposed change','Cambio propuesto'))}">
      <div class="otto-assistant-proposal-kicker"><i class="fas fa-shield-check"></i>${esc(tx('Proposed change — nothing has changed yet','Cambio propuesto — todavía no se ha cambiado nada'))}</div>
      <h3>${esc(state.proposal.label)}</h3>
      ${state.proposal.summary ? `<p>${esc(state.proposal.summary)}</p>` : ''}
      <div class="otto-assistant-proposal-grid">${proposalDetails(state.proposal)}</div>
      <div class="otto-assistant-actions"><button type="button" class="otto-assistant-btn secondary" data-assistant-action="cancel-proposal">${esc(tx('Cancel','Cancelar'))}</button><button type="button" class="otto-assistant-btn primary" data-assistant-action="confirm-proposal">${esc(tx('Confirm change','Confirmar cambio'))}</button></div>
    </section>` : '';
    const results = state.results.length ? `<div class="otto-assistant-results" aria-label="${esc(tx('Search results','Resultados'))}">${state.results.map((r,i) => `<article class="otto-assistant-result">
      <div class="otto-assistant-result-icon"><i class="fas ${icon(r.type)}"></i></div>
      <div class="otto-assistant-result-copy"><span class="otto-assistant-type">${esc(typeLabel(r.type))}</span><h3>${esc(r.title)}</h3>${r.meta ? `<p class="meta">${esc(r.meta)}</p>` : ''}${r.snippet ? `<p>${esc(String(r.snippet).slice(0,180))}</p>` : ''}</div>
      <button type="button" class="otto-assistant-preview-btn" data-assistant-action="preview" data-index="${i}">${esc(tx('Preview','Vista previa'))}</button>
    </article>`).join('')}</div>` : '';
    const preview = state.preview ? `<section class="otto-assistant-preview">
      <div class="otto-assistant-preview-head"><div><span class="otto-assistant-type">${esc(typeLabel(state.preview.type))}</span><h3>${esc(state.preview.title)}</h3></div><button type="button" class="otto-assistant-iconbtn" data-assistant-action="close-preview" aria-label="${esc(tx('Close preview','Cerrar vista previa'))}"><i class="fas fa-xmark"></i></button></div>
      <div class="otto-assistant-preview-grid">${previewRows(state.preview).map(([k,v]) => `<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>
      ${state.preview.snippet ? `<div class="otto-assistant-preview-body">${esc(String(state.preview.snippet).slice(0,1800))}</div>` : ''}
      <button type="button" class="otto-assistant-btn primary" data-assistant-action="open-result">${esc(tx('Open in OTTO','Abrir en OTTO'))}</button>
    </section>` : '';
    return `<header class="otto-assistant-head"><div class="otto-assistant-title"><span class="otto-assistant-mark"><i class="fas fa-wrench"></i></span><div><strong>OTTO</strong><span>${esc(tx('Search · create · change','Buscar · crear · cambiar'))}</span></div></div><button type="button" class="otto-assistant-iconbtn" data-assistant-action="close" aria-label="${esc(tx('Close Ask OTTO','Cerrar Ask OTTO'))}"><i class="fas fa-xmark"></i></button></header>
      <div class="otto-assistant-subhead">${contextChip}<span class="otto-assistant-connectivity ${online ? 'online' : 'offline'}"><i class="fas fa-circle"></i>${esc(online ? tx('Online','En línea') : tx('Offline search','Búsqueda sin conexión'))}</span></div>
      <form class="otto-assistant-form" data-assistant-form><label for="otto-assistant-input">${esc(tx('What do you need?','¿Qué necesitas?'))}</label><div class="otto-assistant-input-row"><input id="otto-assistant-input" autocomplete="off" placeholder="${esc(tx('Search OTTO…','Buscar en OTTO…'))}" value="${esc(state.query)}"><button type="submit" aria-label="${esc(tx('Search','Buscar'))}"><i class="fas fa-arrow-right"></i></button></div></form>
      <div class="otto-assistant-chips" aria-label="${esc(tx('Quick searches','Búsquedas rápidas'))}"><button type="button" data-assistant-query="${esc(tx('Paystubs','Comprobantes de pago'))}">${esc(tx('Paystubs','Comprobantes'))}</button><button type="button" data-assistant-query="${esc(tx('Schedules','Horarios'))}">${esc(tx('Schedule','Horario'))}</button><button type="button" data-assistant-query="${esc(tx('Employee records','Expedientes de empleados'))}">${esc(tx('Employees','Empleados'))}</button></div>
      ${busy}${status}${proposal}${results}${preview}
      ${!state.busy && !state.proposal && !state.results.length && !state.preview ? `<div class="otto-assistant-empty"><i class="fas fa-magnifying-glass"></i><p>${esc(tx('Search paystubs, contracts, emails, notes, payroll, schedules, or employee records. Changes always require confirmation.','Busca comprobantes, contratos, correos, notas, nómina, horarios o expedientes. Los cambios siempre requieren confirmación.'))}</p></div>` : ''}
      <footer class="otto-assistant-foot">${esc(tx('Results first · No voice · Changes require confirmation','Resultados primero · Sin voz · Los cambios requieren confirmación'))}</footer>`;
  }

  function render() {
    const panel = document.getElementById('otto-assistant-panel'); if (!panel) return;
    panel.innerHTML = panelMarkup();
    panel.setAttribute('aria-hidden', state.open ? 'false' : 'true');
    panel.hidden = !state.open;
    const trigger = document.getElementById('otto-assistant-trigger'); if (trigger) trigger.setAttribute('aria-expanded', state.open ? 'true' : 'false');
  }

  function openPanel() {
    if (!isAllowed()) return;
    state.open = true; state.lastFocus = document.activeElement; render();
    requestAnimationFrame(() => document.getElementById('otto-assistant-input')?.focus());
  }

  function closePanel() {
    state.open = false; render();
    if (state.lastFocus && typeof state.lastFocus.focus === 'function') state.lastFocus.focus();
  }

  function mount() {
    const existingTrigger = document.getElementById('otto-assistant-trigger');
    const existingPanel = document.getElementById('otto-assistant-panel');
    if (!isAllowed()) { existingTrigger?.remove(); existingPanel?.remove(); document.body.classList.remove('otto-assistant-enabled'); return; }
    document.body.classList.add('otto-assistant-enabled');
    if (!existingTrigger) {
      const trigger = document.createElement('button'); trigger.id = 'otto-assistant-trigger'; trigger.type = 'button'; trigger.className = 'otto-assistant-trigger'; trigger.setAttribute('aria-label', tx('Ask OTTO','Preguntar a OTTO')); trigger.setAttribute('aria-haspopup','dialog'); trigger.setAttribute('aria-expanded','false'); trigger.innerHTML = '<i class="fas fa-wrench" aria-hidden="true"></i><span>OTTO</span>'; trigger.addEventListener('click', () => state.open ? closePanel() : openPanel()); document.body.appendChild(trigger);
    }
    if (!existingPanel) {
      const panel = document.createElement('aside'); panel.id = 'otto-assistant-panel'; panel.className = 'otto-assistant-panel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','false'); panel.setAttribute('aria-label','Ask OTTO'); panel.hidden = true; document.body.appendChild(panel);
    }
    render();
  }

  document.addEventListener('submit', e => {
    if (!e.target.matches('[data-assistant-form]')) return; e.preventDefault(); submit(document.getElementById('otto-assistant-input')?.value || '');
  });
  document.addEventListener('click', async e => {
    const actionEl = e.target.closest('[data-assistant-action]');
    if (actionEl) {
      const action = actionEl.getAttribute('data-assistant-action');
      if (action === 'close') return closePanel();
      if (action === 'preview') { state.preview = state.results[Number(actionEl.getAttribute('data-index'))] || null; return render(); }
      if (action === 'close-preview') { state.preview = null; return render(); }
      if (action === 'open-result' && state.preview) return openResult(state.preview);
      if (action === 'cancel-proposal') { state.proposal = null; state.status = tx('Change canceled.', 'Cambio cancelado.'); return render(); }
      if (action === 'confirm-proposal' && state.proposal && !state.busy) {
        const p = state.proposal; state.busy = true; render();
        try { const message = await executeProposal(p); bridge().save?.(); bridge().render?.(); state.proposal = null; state.status = message; state.query = ''; }
        catch (err) { state.status = err && err.message ? err.message : tx('The change could not be completed.', 'No se pudo completar el cambio.'); }
        finally { state.busy = false; render(); }
        return;
      }
    }
    const chip = e.target.closest('[data-assistant-query]'); if (chip) return submit(chip.getAttribute('data-assistant-query'));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.open) { e.preventDefault(); closePanel(); return; }
    if (e.key !== 'Tab' || !state.open) return;
    const panel = document.getElementById('otto-assistant-panel'); if (!panel) return;
    const focusable = [...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => !el.hidden && el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  window.addEventListener('online', render); window.addEventListener('offline', render);

  // Retire the two older assistant entry points without deleting their code.
  window.openPlumbBotModal = openPanel;
  window.toggleFloatingChat = openPanel;
  window.viewAssistant = openPanel;
  window.__ottoAssistant = { open: openPanel, close: closePanel, search, currentContext, allowed: isAllowed };

  let mountQueued = false;
  const observer = new MutationObserver(() => {
    if (mountQueued) return; mountQueued = true;
    setTimeout(() => { mountQueued = false; mount(); }, 40);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','data-otto-user'] });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
