/* OTTO CRM — HR / Payroll workspace.
   This is the owner/office control center for payroll and the same mandatory
   Employee Accountability Code of Conduct used by the field-policy gate. */
(function () {
  'use strict';

  const VIEW = 'hr_payroll';
  const POLICY_VERSION = 2;
  let policyLanguage = null;

  const POLICY = {
    en: {
      title: 'Employee Accountability Code of Conduct',
      subtitle: 'OTTO Plumbing Inc. · Version 2',
      intro: 'Every employee is expected to work safely, honestly, professionally, and accountably. These standards protect customers, coworkers, company property, accurate payroll records, and the quality of every job.',
      sections: [
        ['1. Attendance and punctuality', 'Report to assigned work on time and ready to work. Notify the office as early as possible if an emergency, illness, delay, or absence affects the schedule. Repeated unexcused lateness, missed shifts, or failure to communicate is not acceptable.'],
        ['2. Accurate timekeeping', 'Clock in and out truthfully. Never record time for another employee, alter time to hide lateness, remain clocked in while not working, or misrepresent travel, break, or job time. Corrections must be reported promptly so payroll can be accurate.'],
        ['3. Jobsite accountability and location', 'When assigned to field work, use OTTO check-in/check-out and work-location tools as required for the active job. Location information is for work accountability, dispatch, safety, and time-on-site records. Do not falsify, disable, or manipulate job-location records.'],
        ['4. Quality of work', 'Perform plumbing work carefully, follow the approved scope, applicable codes, manufacturer instructions, and company procedures, and do not conceal mistakes. Report defects, callbacks, damage, missing parts, or work that cannot be completed correctly.'],
        ['5. Customer conduct', 'Treat customers, occupants, vendors, and coworkers with respect. No harassment, threats, discriminatory conduct, intimidation, dishonesty, or inappropriate behavior. Protect the customer’s home or business and leave the work area orderly.'],
        ['6. Safety', 'Follow safety procedures, use required protective equipment, and stop work when a condition is unsafe. Report injuries, vehicle incidents, property damage, hazards, and near misses promptly. Never work impaired by alcohol, illegal drugs, or any substance that makes the work unsafe.'],
        ['7. Vehicles, tools, materials, and company property', 'Use company vehicles, tools, equipment, fuel, parts, cards, devices, and materials only for authorized business purposes. Keep assigned property secure and report loss, theft, misuse, damage, or shortages promptly.'],
        ['8. Photos, documents, and job records', 'Create complete and truthful job records. Required photos, notes, checklists, signatures, receipts, plans, and closeout information must reflect the actual work performed. Do not fabricate, delete, or alter records to hide an error or missed requirement.'],
        ['9. Communication and response', 'Read and respond to reasonable work communications, schedule changes, dispatch instructions, customer issues, and requests for missing job information. Escalate urgent issues instead of allowing them to sit unresolved.'],
        ['10. Integrity, privacy, and confidentiality', 'Do not steal, falsify records, misuse customer or employee information, share passwords, expose confidential business information, or access records unrelated to your work. Use OTTO and company systems only for authorized work.'],
        ['11. Accountability and corrective action', 'Employees are expected to correct mistakes, cooperate with reasonable reviews, and provide truthful information when an issue is investigated. Violations may result in coaching or corrective action consistent with company policy and applicable law. Retaliation for good-faith safety or compliance reporting is prohibited.'],
        ['12. Acknowledgment', 'By acknowledging this policy, the employee confirms that the policy was made available in a language they can read, that they had an opportunity to review it, and that they understand they are expected to follow these standards and ask a supervisor when something is unclear.']
      ]
    },
    es: {
      title: 'Código de Conducta y Responsabilidad del Empleado',
      subtitle: 'OTTO Plumbing Inc. · Versión 2',
      intro: 'Se espera que cada empleado trabaje de manera segura, honesta, profesional y responsable. Estas normas protegen a los clientes, compañeros de trabajo, propiedad de la empresa, registros correctos de nómina y la calidad de cada trabajo.',
      sections: [
        ['1. Asistencia y puntualidad', 'Preséntese al trabajo asignado a tiempo y listo para trabajar. Avise a la oficina lo antes posible si una emergencia, enfermedad, demora o ausencia afecta el horario. Las tardanzas repetidas sin justificación, turnos perdidos o la falta de comunicación no son aceptables.'],
        ['2. Registro exacto del tiempo', 'Marque entrada y salida con veracidad. Nunca registre tiempo por otro empleado, cambie horas para ocultar tardanzas, permanezca marcado mientras no trabaja ni tergiverse tiempo de viaje, descanso o trabajo. Cualquier corrección debe informarse de inmediato para que la nómina sea correcta.'],
        ['3. Responsabilidad en el sitio y ubicación', 'Cuando se le asigne trabajo de campo, use las funciones de entrada/salida y ubicación laboral de OTTO según se requiera para el trabajo activo. La ubicación se usa para responsabilidad laboral, despacho, seguridad y registro del tiempo en el sitio. No falsifique, desactive ni manipule los registros de ubicación del trabajo.'],
        ['4. Calidad del trabajo', 'Realice el trabajo de plomería cuidadosamente, siga el alcance aprobado, los códigos aplicables, las instrucciones del fabricante y los procedimientos de la empresa, y no oculte errores. Informe defectos, regresos por garantía, daños, piezas faltantes o trabajos que no puedan completarse correctamente.'],
        ['5. Conducta con clientes', 'Trate con respeto a clientes, ocupantes, proveedores y compañeros. No se permite acoso, amenazas, conducta discriminatoria, intimidación, deshonestidad ni comportamiento inapropiado. Proteja la casa o negocio del cliente y deje el área de trabajo ordenada.'],
        ['6. Seguridad', 'Siga los procedimientos de seguridad, use el equipo de protección requerido y detenga el trabajo cuando exista una condición insegura. Informe de inmediato lesiones, incidentes vehiculares, daños a propiedad, peligros y casi accidentes. Nunca trabaje afectado por alcohol, drogas ilegales o cualquier sustancia que haga inseguro el trabajo.'],
        ['7. Vehículos, herramientas, materiales y propiedad de la empresa', 'Use vehículos, herramientas, equipos, combustible, piezas, tarjetas, dispositivos y materiales de la empresa únicamente para fines comerciales autorizados. Mantenga segura la propiedad asignada e informe rápidamente pérdidas, robos, uso indebido, daños o faltantes.'],
        ['8. Fotos, documentos y registros de trabajo', 'Cree registros completos y verdaderos. Las fotos, notas, listas de verificación, firmas, recibos, planos e información de cierre requeridos deben reflejar el trabajo realmente realizado. No fabrique, elimine ni altere registros para ocultar un error o requisito incumplido.'],
        ['9. Comunicación y respuesta', 'Lea y responda comunicaciones razonables de trabajo, cambios de horario, instrucciones de despacho, problemas de clientes y solicitudes de información faltante. Eleve los asuntos urgentes en vez de dejarlos sin resolver.'],
        ['10. Integridad, privacidad y confidencialidad', 'No robe, falsifique registros, use indebidamente información de clientes o empleados, comparta contraseñas, divulgue información confidencial del negocio ni acceda a registros ajenos a su trabajo. Use OTTO y los sistemas de la empresa únicamente para trabajo autorizado.'],
        ['11. Responsabilidad y acción correctiva', 'Se espera que los empleados corrijan errores, cooperen con revisiones razonables y proporcionen información veraz cuando se investigue un asunto. Las infracciones pueden resultar en orientación o acción correctiva de acuerdo con la política de la empresa y la ley aplicable. Se prohíben represalias por reportes de buena fe sobre seguridad o cumplimiento.'],
        ['12. Acuse de recibo', 'Al aceptar esta política, el empleado confirma que la política estuvo disponible en un idioma que puede leer, que tuvo oportunidad de revisarla y que entiende que debe cumplir estas normas y consultar a un supervisor cuando algo no esté claro.']
      ]
    }
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

  function currentPolicyRecord(userId) {
    return data('consent_records')
      .filter(r => r && r.userId === userId && r.type === 'employee_code_of_conduct' && Number(r.version) === POLICY_VERSION && r.status === 'acknowledged')
      .sort((a, b) => String(b.acknowledgedAt || b.ts || '').localeCompare(String(a.acknowledgedAt || a.ts || '')))[0] || null;
  }

  function policyHtml(code) {
    const p = POLICY[code === 'es' ? 'es' : 'en'];
    return `<article class="hr-policy" lang="${code === 'es' ? 'es' : 'en'}">
      <div class="hr-policy-heading"><h2>${safe(p.title)}</h2><span>${safe(p.subtitle)}</span></div>
      <p class="hr-policy-intro">${safe(p.intro)}</p>
      ${p.sections.map(([heading, body]) => `<section><h3>${safe(heading)}</h3><p>${safe(body)}</p></section>`).join('')}
    </article>`;
  }

  function statusTable() {
    const workers = data('users').filter(u => u && u.role === 'field' && u.active !== false);
    if (!workers.length) {
      return `<div class="hr-empty"><i class="fas fa-circle-check" aria-hidden="true"></i><div><strong>${text('No field employees currently require acknowledgment','No hay empleados de campo que requieran acuse actualmente')}</strong><span>${text('New field employees will be required to review and sign the current policy before entering the field workspace.','Los nuevos empleados de campo deberán revisar y firmar la política vigente antes de entrar al espacio de trabajo de campo.')}</span></div></div>`;
    }
    return `<div class="hr-table" role="table" aria-label="${safe(text('Code of Conduct acknowledgments','Acuses del Código de Conducta'))}">
      ${workers.map(worker => {
        const ack = currentPolicyRecord(worker.id);
        const when = ack && (ack.acknowledgedAt || ack.ts) ? new Date(ack.acknowledgedAt || ack.ts) : null;
        const date = when && !isNaN(when) ? when.toLocaleString(text('en-US','es-US'), {dateStyle:'medium', timeStyle:'short'}) : '';
        return `<div class="hr-row" role="row">
          <div role="cell"><strong>${safe(worker.name || worker.name_en || worker.name_es || text('Unnamed employee','Empleado sin nombre'))}</strong><span>${safe(worker.employeeId || '')}</span></div>
          <div role="cell"><span class="hr-status ${ack ? 'is-ok' : 'is-pending'}">${ack ? text('Acknowledged','Aceptado') : text('Pending','Pendiente')}</span></div>
          <div role="cell">${safe(date || text('Not signed yet','Aún no firmado'))}</div>
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
          <div><h2>${text('Employee Accountability Code of Conduct','Código de Conducta y Responsabilidad del Empleado')}</h2><p>${text('The same current policy employees must acknowledge before field access.','La misma política vigente que los empleados deben aceptar antes del acceso de campo.')}</p></div>
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
      .hr-policy-wrap{max-width:880px}.hr-policy-heading{display:flex;justify-content:space-between;gap:16px;align-items:baseline;border-bottom:1px solid var(--ot-border,var(--line,#e5e7ea));padding-bottom:12px;margin-bottom:14px}.hr-policy-heading h2{font-size:22px;margin:0}.hr-policy-heading span{color:var(--ot-text-2,var(--text2,#626872));font-size:13px;white-space:nowrap}.hr-policy-intro{font-size:16px;line-height:1.55;margin:0 0 18px}.hr-policy section{padding:14px 0;border-top:1px solid var(--ot-border,var(--line,#e5e7ea))}.hr-policy section:first-of-type{border-top:0}.hr-policy h3{font-size:17px;margin:0 0 6px}.hr-policy p{font-size:16px;line-height:1.55;color:var(--ot-text-2,var(--text2,#626872));margin:0}
      .ot-nav-item[data-otto-hr-tab]{margin-top:2px}.ot-nav-item[data-otto-hr-tab].is-active{background:var(--ot-sidebar-hover,#1B1D21);color:#fff}
      .hr-more-shortcut{width:100%;min-height:46px;display:flex;align-items:center;gap:10px;border:0;border-radius:9px;padding:0 12px;background:var(--card,#fff);color:var(--text,#15171A);font:600 15px/1.2 inherit;text-align:left;cursor:pointer}.hr-more-shortcut:hover{background:var(--card-hover,#f5f5f6)}
      @media(max-width:900px){.hr-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.hr-policy-tools{flex-direction:column}.hr-row{grid-template-columns:1fr;gap:7px}.hr-section{padding:16px}.hr-policy-heading{flex-direction:column;align-items:flex-start}.hr-policy-heading span{white-space:normal}}
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
    const scroller = document.getElementById('policy-scroll');
    if (!scroller || scroller.dataset.ottoAccountabilityPolicy === String(POLICY_VERSION)) return;
    const code = (typeof lang !== 'undefined' && lang === 'es') ? 'es' : 'en';
    scroller.dataset.ottoAccountabilityPolicy = String(POLICY_VERSION);
    scroller.innerHTML = policyHtml(code);
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
      applyPolicyToGate();
      syncNavigation();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();

  window.__ottoEmployeePolicy = { version: POLICY_VERSION, policy: POLICY, render: renderHrPayroll, applyToGate: applyPolicyToGate, view: VIEW };
})();
