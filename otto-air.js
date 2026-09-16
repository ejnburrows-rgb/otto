/* OTTO Air runtime — plain-language normalization, full-surface EN/ES fallback,
   and accessibility helpers. Existing screen renderers remain authoritative;
   this layer only fixes hard-coded UI copy that escaped their dictionaries. */
(function () {
  'use strict';

  const EXACT_ES = new Map(Object.entries({
    'Today':'Hoy','Schedule':'Agenda','Jobs':'Trabajos','Customers':'Clientes','Money':'Dinero','Operations':'Operaciones',
    'More':'Más','Settings':'Ajustes','Search':'Buscar','Search or Ask OTTO':'Buscar o preguntar a OTTO','Search or Ask OTTO…':'Buscar o preguntar a OTTO…',
    'Ask OTTO':'Preguntar a OTTO','New Job':'Nuevo trabajo','New Customer':'Nuevo cliente','New Invoice':'Nueva factura','New Estimate':'Nuevo estimado',
    'Needs attention':'Necesita atención','Need attention':'Necesita atención','Everything else is on track':'Todo lo demás está en orden',
    'Right now':'Ahora mismo','Next':'Próximo','Recent activity':'Actividad reciente','Activity':'Actividad','Overview':'Resumen','Files':'Archivos',
    'Documents':'Documentos','Photos':'Fotos','Notes':'Notas','Internal notes':'Notas internas','Details':'Detalles','View details':'Ver detalles',
    'View all':'Ver todo','View schedule':'Ver agenda','View invoice':'Ver factura','View invoices':'Ver facturas','Open invoice':'Abrir factura',
    'Open job':'Abrir trabajo','Open customer':'Abrir cliente','Open request':'Abrir solicitud','Request service':'Solicitar servicio',
    'Upcoming Service':'Próximo servicio','Invoices & Payments':'Facturas y pagos','Documents & Photos':'Documentos y fotos',
    'Scheduled':'Programado','Underway':'En curso','In progress':'En curso','On site':'En sitio','Completed':'Completado','Canceled':'Cancelado',
    'Unassigned':'Sin asignar','Not assigned yet':'Aún sin asignar','Assign':'Asignar','Assign technician':'Asignar técnico','Start job':'Iniciar trabajo',
    'Finish job':'Finalizar trabajo','Complete job':'Completar trabajo','Finish closeout':'Finalizar cierre','Closeout':'Cierre','Job Brief':'Resumen del trabajo',
    'Customer':'Cliente','Job':'Trabajo','Invoice':'Factura','Invoices':'Facturas','Estimate':'Estimado','Estimates':'Estimados','Payment':'Pago','Payments':'Pagos',
    'Balance':'Saldo','Outstanding':'Pendiente','Overdue':'Vencido','Due':'Vence','Paid':'Pagado','Unpaid':'Sin pagar','Amount':'Monto','Total':'Total',
    'Technician':'Técnico','Technicians':'Técnicos','Team':'Equipo','Field workers':'Trabajadores de campo','Crew hours':'Horas del equipo',
    'Day':'Día','Week':'Semana','Month':'Mes','Previous':'Anterior','Next week':'Próxima semana','This week':'Esta semana','Today only':'Solo hoy',
    'Calls':'Llamadas','Inbox':'Bandeja','Follow-ups':'Seguimientos','Map':'Mapa','Workflows':'Flujos','Reports':'Reportes','Alerts':'Alertas',
    'Backups':'Respaldos','Audit':'Auditoría','Knowledge':'Conocimiento','Payroll':'Nómina','Pricing':'Precios','Contracts':'Contratos','Checks':'Cheques',
    'Material pricing':'Precios de materiales','Money overview':'Resumen de dinero','Business':'Negocio','Work':'Trabajo',
    'Save':'Guardar','Saving…':'Guardando…','Saving changes…':'Guardando cambios…','Saved':'Guardado','Everything saved':'Todo guardado',
    'Syncing…':'Guardando cambios…','Sync successful':'Todo guardado','Synced':'Todo guardado','Cloud synced':'Todo guardado','Sync state':'Estado de guardado',
    "Couldn't save changes":'No se pudieron guardar los cambios','Retry':'Intentar de nuevo','Refresh':'Actualizar','Reload':'Volver a cargar',
    'Edit':'Editar','Delete':'Eliminar','Cancel':'Cancelar','Close':'Cerrar','Done':'Listo','Continue':'Continuar','Back':'Atrás','Confirm':'Confirmar',
    'Add':'Agregar','Create':'Crear','Update':'Actualizar','Send':'Enviar','Copy':'Copiar','Download':'Descargar','Upload':'Subir','Print':'Imprimir',
    'Filter':'Filtrar','Filters':'Filtros','More filters':'Más filtros','Sort':'Ordenar','Status':'Estado','Priority':'Prioridad','Date':'Fecha','Time':'Hora',
    'Name':'Nombre','Phone':'Teléfono','Email':'Correo electrónico','Address':'Dirección','Description':'Descripción','Title':'Título','Type':'Tipo',
    'No results':'Sin resultados','No records':'No hay registros','Nothing here yet':'Todavía no hay nada aquí','No jobs today':'No hay trabajos hoy',
    'No scheduled jobs':'No hay trabajos programados','No items need attention':'Nada necesita atención','No activity yet':'Todavía no hay actividad',
    'Customer portal':'Portal del cliente','Portal':'Portal','Service request':'Solicitud de servicio','Service requests':'Solicitudes de servicio',
    'Approved files':'Archivos aprobados','Customer files':'Archivos del cliente','Visible to customer':'Visible para el cliente',
    'Open':'Abrir','Pending':'Pendiente','Resolved':'Resuelto','Urgent':'Urgente','Normal':'Normal','Low':'Baja','High':'Alta',
    'Light':'Claro','Dark':'Oscuro','Light mode':'Modo claro','Dark mode':'Modo oscuro','Theme':'Tema','Language':'Idioma','English':'Inglés','Spanish':'Español',
    'Sign in':'Iniciar sesión','Sign out':'Cerrar sesión','Continue with email':'Continuar con correo electrónico','Send secure link':'Enviar enlace seguro',
    'Set up this device':'Configurar este dispositivo','Enter your email':'Ingrese su correo electrónico','Enter PIN':'Ingrese el PIN',
    'Please sign in again':'Vuelva a iniciar sesión','Authentication expired':'La sesión venció','Required':'Obligatorio','Optional':'Opcional',
    'Loading…':'Cargando…','Loading':'Cargando','Please wait…':'Espere…','Try again':'Intentar de nuevo','Something went wrong':'Algo salió mal',
    'No data':'Sin datos','Unknown':'Desconocido','Untitled':'Sin título','All':'Todos','None':'Ninguno','Yes':'Sí','No':'No',
    'Quick create':'Creación rápida','Recent':'Reciente','Assigned to':'Asignado a','Created':'Creado','Updated':'Actualizado','Last updated':'Última actualización',
    'Customer waiting':'Cliente esperando','Waiting for customer':'Esperando al cliente','Waiting for reply':'Esperando respuesta','Needs technician':'Necesita técnico',
    'Overdue invoice':'Factura vencida','outstanding':'pendiente','due today':'vence hoy','due tomorrow':'vence mañana','days overdue':'días vencida',
    'Open menu':'Abrir menú','Open navigation':'Abrir navegación','Go back':'Volver','Go home':'Ir a inicio','Home':'Inicio',
    'Search customers':'Buscar clientes','Search jobs':'Buscar trabajos','Search invoices':'Buscar facturas','Search records':'Buscar registros',
    'Clear search':'Borrar búsqueda','Clear filters':'Borrar filtros','Apply filters':'Aplicar filtros','Show more':'Mostrar más','Show less':'Mostrar menos',
    'No external AI call':'Sin llamada externa de IA','Local only':'Solo local','Assistant':'Asistente','Ask a question':'Hacer una pregunta',
    'What needs attention':'Qué necesita atención','What changed':'Qué cambió','What is happening now':'Qué está pasando ahora',
    'Scheduled revenue':'Ingresos programados','Collected this month':'Cobrado este mes','Still outstanding':'Aún pendiente','Open jobs':'Trabajos abiertos'
  }));

  const PLAIN_EN = new Map(Object.entries({
    'Sync successful':'Everything saved','Cloud synced':'Everything saved','Synced':'Everything saved',
    'Syncing…':'Saving changes…','Syncing...':'Saving changes…','Synchronization in progress':'Saving changes…',
    'Synchronization failed':"Couldn't save changes",'Sync failed':"Couldn't save changes",'Authentication expired':'Please sign in again',
    'Unassigned':'Not assigned yet','Operational exceptions':'Needs attention','Exceptions':'Needs attention','No records':'Nothing here yet'
  }));

  const changedText = new Map();
  const attrStore = new WeakMap();
  let queued = false;

  function currentLang() {
    try { if (typeof lang !== 'undefined') return lang === 'es' ? 'es' : 'en'; } catch (_) {}
    return document.documentElement.lang && document.documentElement.lang.toLowerCase().startsWith('es') ? 'es' : 'en';
  }

  function registerTranslations() {
    try {
      if (typeof T === 'undefined' || !T.en || !T.es) return;
      Object.assign(T.en, {
        airScheduled:'Scheduled', airUnderway:'Underway', airCompleted:'Completed', airAttention:'Needs attention',
        airEverythingSaved:'Everything saved', airSaving:'Saving changes…', airSaveFailed:"Couldn't save changes",
        airNotAssigned:'Not assigned yet', airRightNow:'Right now', airViewDetails:'View details'
      });
      Object.assign(T.es, {
        airScheduled:'Programado', airUnderway:'En curso', airCompleted:'Completado', airAttention:'Necesita atención',
        airEverythingSaved:'Todo guardado', airSaving:'Guardando cambios…', airSaveFailed:'No se pudieron guardar los cambios',
        airNotAssigned:'Aún sin asignar', airRightNow:'Ahora mismo', airViewDetails:'Ver detalles'
      });
    } catch (_) {}
  }

  function installBrandingStyles() {
    if (document.getElementById('otto-branding-style')) return;
    const style = document.createElement('style');
    style.id = 'otto-branding-style';
    style.textContent = `
      #login .otto-login-logo-wrap {
        text-align: center !important;
        margin: 0 auto 30px !important;
      }
      #login img.otto-login-logo {
        display: block !important;
        width: min(360px, 82vw) !important;
        max-width: 100% !important;
        height: 112px !important;
        margin: 0 auto !important;
        aspect-ratio: 2.35 / 1 !important;
        object-fit: cover !important;
        object-position: 50% 49% !important;
        border-radius: 16px !important;
        background: #fff !important;
        box-shadow: 0 10px 30px rgba(16,24,40,.10) !important;
      }
      #otto-global-brand {
        position: fixed;
        top: max(14px, env(safe-area-inset-top));
        right: clamp(18px, 2.5vw, 36px);
        z-index: 86;
        width: clamp(205px, 18vw, 285px);
        height: 82px;
        padding: 7px 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--air-border, #E3E8EF);
        border-radius: 16px;
        background: var(--air-surface, #fff);
        box-shadow: 0 8px 24px rgba(16,24,40,.08);
        cursor: pointer;
      }
      #otto-global-brand img {
        display: block;
        width: 100%;
        height: 100%;
        aspect-ratio: 2.35 / 1;
        object-fit: cover;
        object-position: 50% 49%;
        border-radius: 11px;
        background: #fff;
      }
      body.otto-shell.otto-global-brand-ready .ot-sidebar-brand { display: none !important; }
      body.otto-shell.otto-global-brand-ready #main,
      body.otto-shell.otto-global-brand-ready #main.wrap { padding-top: 112px !important; }
      #otto-global-brand:focus-visible {
        outline: 2px solid var(--air-accent, #4E74C8);
        outline-offset: 3px;
      }
      @media (max-width: 900px) {
        #login img.otto-login-logo { width: min(320px, 84vw) !important; height: 100px !important; }
        #otto-global-brand { width: 158px; height: 56px; top: max(10px, env(safe-area-inset-top)); right: 12px; padding: 5px 8px; border-radius: 12px; }
        body.otto-shell.otto-global-brand-ready #main,
        body.otto-shell.otto-global-brand-ready #main.wrap { padding-top: 78px !important; }
      }
      @media (max-width: 480px) {
        #login img.otto-login-logo { width: min(290px, 86vw) !important; height: 92px !important; }
        #otto-global-brand { width: 142px; height: 50px; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBranding() {
    installBrandingStyles();

    const login = document.getElementById('login');
    if (login) {
      let loginLogo = login.querySelector('img[src$="logo.jpg"]');
      if (!loginLogo) {
        const wrap = document.createElement('div');
        wrap.className = 'otto-login-logo-wrap';
        loginLogo = document.createElement('img');
        loginLogo.src = './logo.jpg';
        loginLogo.alt = 'OTTO Plumbing Inc.';
        wrap.appendChild(loginLogo);
        login.insertBefore(wrap, login.firstChild);
      }
      loginLogo.classList.add('otto-login-logo');
      if (loginLogo.parentElement) loginLogo.parentElement.classList.add('otto-login-logo-wrap');
    }

    const app = document.getElementById('app');
    const signedInShell = !!app && !app.classList.contains('hidden') && document.body.classList.contains('otto-shell');
    let brand = document.getElementById('otto-global-brand');

    if (signedInShell) {
      if (!brand) {
        brand = document.createElement('button');
        brand.id = 'otto-global-brand';
        brand.type = 'button';
        brand.setAttribute('aria-label', currentLang() === 'es' ? 'Ir a inicio' : 'Go home');
        brand.title = currentLang() === 'es' ? 'Ir a inicio' : 'Go home';
        brand.innerHTML = '<img src="./logo.jpg" alt="OTTO Plumbing Inc." />';
        brand.addEventListener('click', () => {
          try { if (typeof nav === 'function') nav('home'); } catch (_) {}
        });
        app.appendChild(brand);
      } else {
        brand.setAttribute('aria-label', currentLang() === 'es' ? 'Ir a inicio' : 'Go home');
        brand.title = currentLang() === 'es' ? 'Ir a inicio' : 'Go home';
      }
      document.body.classList.add('otto-global-brand-ready');
    } else {
      if (brand) brand.remove();
      document.body.classList.remove('otto-global-brand-ready');
    }
  }

  function isUiTextNode(node) {
    const p = node && node.parentElement;
    if (!p) return false;
    if (p.closest('script,style,code,pre,[contenteditable="true"]')) return false;
    if (p.closest('.ot-row-title,.customer-name,.job-title,[data-customer-name],[data-record-value]')) return false;
    return !!p.closest('button,label,h1,h2,h3,h4,th,option,nav,.badge,.pill,.status,.ot-badge,.ot-section-head,.ot-empty,.empty-state,.pagehead,.ot-head,.ui-drawer-head,.ui-dispatch-head,.ui-record-head,.toolbar,.filters,.filterbar,.topbar,.bottomnav,.ot-sidebar,.ot-mobile-nav,.modal,.sheet,.card header,.panel header');
  }

  function rewriteEnglish(text) {
    const trimmed = text.trim();
    if (!trimmed) return text;
    const replacement = PLAIN_EN.get(trimmed);
    if (!replacement) return text;
    return text.replace(trimmed, replacement);
  }

  function translateExact(text) {
    const trimmed = text.trim();
    if (!trimmed) return text;
    const translated = EXACT_ES.get(trimmed);
    if (translated) return text.replace(trimmed, translated);
    return text;
  }

  function translateTextNode(node) {
    if (!isUiTextNode(node)) return;
    const mode = currentLang();
    if (mode === 'es') {
      const base = rewriteEnglish(node.nodeValue);
      const next = translateExact(base);
      if (next !== node.nodeValue) {
        if (!changedText.has(node)) changedText.set(node, node.nodeValue);
        node.nodeValue = next;
      }
    } else {
      if (changedText.has(node)) {
        const next = rewriteEnglish(changedText.get(node));
        if (next !== node.nodeValue) node.nodeValue = next;
        changedText.delete(node);
      } else {
        const next = rewriteEnglish(node.nodeValue);
        if (next !== node.nodeValue) node.nodeValue = next;
      }
    }
  }

  function translateAttr(el, attr) {
    if (!el.hasAttribute || !el.hasAttribute(attr)) return;
    const mode = currentLang();
    const current = el.getAttribute(attr) || '';
    let state = attrStore.get(el);
    if (!state) { state = {}; attrStore.set(el, state); }
    if (mode === 'es') {
      const base = PLAIN_EN.get(current) || current;
      const next = EXACT_ES.get(base) || base;
      if (next !== current) {
        if (!(attr in state)) state[attr] = current;
        el.setAttribute(attr, next);
      }
    } else if (attr in state) {
      el.setAttribute(attr, PLAIN_EN.get(state[attr]) || state[attr]);
      delete state[attr];
    } else if (PLAIN_EN.has(current)) {
      el.setAttribute(attr, PLAIN_EN.get(current));
    }
  }

  function statusSemantics(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('.ot-badge,.badge,.pill,[class*="status-"]').forEach(el => {
      const cls = String(el.className || '').toLowerCase();
      const text = (el.textContent || '').trim().toLowerCase();
      let status = '';
      if (cls.includes('scheduled') || /^(scheduled|programado)$/.test(text)) status = 'scheduled';
      else if (cls.includes('inprogress') || cls.includes('in-progress') || cls.includes('is-active') || /^(underway|in progress|on site|en curso|en sitio)$/.test(text)) status = 'underway';
      else if (cls.includes('completed') || cls.includes('is-done') || /^(completed|completado)$/.test(text)) status = 'completed';
      else if (cls.includes('attention') || cls.includes('warning') || cls.includes('is-error') || /needs attention|necesita atención|overdue|vencid/.test(text)) status = 'attention';
      if (status) {
        el.dataset.airStatus = status;
        const labels = currentLang() === 'es'
          ? {scheduled:'Programado',underway:'En curso',completed:'Completado',attention:'Necesita atención'}
          : {scheduled:'Scheduled',underway:'Underway',completed:'Completed',attention:'Needs attention'};
        if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', labels[status]);
      }
    });
  }

  function syncAccessibility(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('[id*="sync" i],[class*="sync" i],[data-sync-state]').forEach(el => {
      if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live','polite');
    });
    scope.querySelectorAll('button:not([type])').forEach(btn => btn.setAttribute('type','button'));
  }

  function process(root) {
    const scope = root && root.nodeType ? root : document;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const nodes = [];
    if (scope.nodeType === Node.TEXT_NODE) nodes.push(scope);
    else while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(translateTextNode);
    if (scope.querySelectorAll) {
      scope.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
        translateAttr(el,'placeholder'); translateAttr(el,'title'); translateAttr(el,'aria-label');
      });
    }
    statusSemantics(scope);
    syncAccessibility(scope);
    document.documentElement.lang = currentLang() === 'es' ? 'es' : 'en';
    document.body && document.body.classList.add('otto-air');
    ensureBranding();
  }

  function schedule(root) {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; process(root || document); });
  }

  function hookLanguage() {
    const original = window.setLang;
    if (typeof original === 'function' && !original.__ottoAirWrapped) {
      const wrapped = function (value) {
        const result = original.apply(this, arguments);
        queueMicrotask(() => process(document));
        return result;
      };
      wrapped.__ottoAirWrapped = true;
      window.setLang = wrapped;
    }
  }

  function installObserver() {
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') { schedule(record.target.parentElement || document); return; }
        if (record.addedNodes && record.addedNodes.length) { schedule(document); return; }
      }
    });
    observer.observe(document.documentElement, {subtree:true,childList:true,characterData:true});
  }

  /* Browser QA hook: reports untranslated *known UI strings* after Spanish is
     selected. Dynamic customer/job data is deliberately excluded. */
  window.__ottoAirAudit = function () {
    const leftovers = [];
    if (currentLang() !== 'es') return {lang:'en',leftovers:[],count:0};
    document.querySelectorAll('button,label,h1,h2,h3,h4,th,option,.badge,.pill,.ot-badge,.ot-section-head,.ot-empty,.pagehead,.ot-head,.toolbar,.filters,.ot-sidebar,.ot-mobile-nav').forEach(el => {
      if (!el.offsetParent && el.getClientRects().length === 0) return;
      const txt = (el.textContent || '').replace(/\s+/g,' ').trim();
      if (EXACT_ES.has(txt) || PLAIN_EN.has(txt)) leftovers.push(txt);
    });
    return {lang:'es',leftovers:[...new Set(leftovers)].sort(),count:[...new Set(leftovers)].length};
  };

  function boot() {
    registerTranslations();
    hookLanguage();
    process(document);
    installObserver();
    document.addEventListener('click', event => {
      if (event.target.closest('#lang-en,#lang-es,[data-otto-lang],[data-of-lang],.langtoggle,.ot-lang')) setTimeout(() => process(document),0);
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();