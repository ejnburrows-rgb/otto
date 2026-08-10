/* OTTO CRM — hard-coded bilingual cleanup.
   The main translation dictionary cannot translate literal English written directly
   into template strings. This layer handles known leftovers/dynamic count forms
   and rebuilds additive flex controls whenever the native EN/ES toggle changes. */
(function () {
  'use strict';
  const original = new WeakMap();
  let running = false;

  const exact = new Map([
    ['OWNERS', 'DUEÑOS'],
    ['OPS & IT', 'OPERACIONES Y TI'],
    ['FIELD', 'CAMPO'],
    ['FIELD TEAM', 'EQUIPO DE CAMPO'],
    ['Original data', 'Datos originales'],
    ['Team locations', 'Ubicaciones del equipo'],
    ['Needs attention', 'Requiere atención'],
    ['No job today', 'Sin trabajo hoy'],
    ['Field worker', 'Trabajador de campo'],
    ['Field Worker', 'Trabajador de campo'],
    ['Worker', 'Trabajador'],
    ['Time off', 'Tiempo libre'],
    ['Back to Home', 'Volver al inicio'],
    ['Back to panels', 'Volver a los paneles'],
    ['Home sections', 'Secciones de inicio'],
    ['OTTO Menu', 'Menú OTTO'],
    ['Home', 'Inicio'],
    ['Money', 'Dinero'],
    ['Work', 'Trabajo'],
    ['Team', 'Equipo'],
    ['Business', 'Negocio'],
    ['System', 'Sistema'],
    ['Today', 'Hoy'],
    ['Field Workers', 'Trabajadores'],
    ['Inbox', 'Bandeja'],
    ['Tools', 'Herramientas'],
    ['Estimates', 'Estimados'],
    ['Invoices', 'Facturas'],
    ['Payments', 'Pagos'],
    ['Checks', 'Cheques'],
    ['Payroll', 'Nómina'],
    ['Jobs', 'Trabajos'],
    ['Customers', 'Clientes'],
    ['Calls', 'Llamadas'],
    ['Follow-ups', 'Seguimientos'],
    ['Workflows', 'Flujos'],
    ['Map', 'Mapa'],
    ['Attendance', 'Asistencia'],
    ['Team KPIs', 'Indicadores'],
    ['Urgent', 'Urgente'],
    ['Reports', 'Reportes'],
    ['Alerts', 'Alertas'],
    ['Knowledge', 'Conocimiento'],
    ['Email', 'Correo'],
    ['Audit trail', 'Auditoría'],
    ['Backups', 'Respaldos'],
    ['Ask OTTO', 'Preguntar a OTTO'],
    ['Document OCR', 'OCR de documentos'],
    ['Wallpaper controls', 'Controles de fondo'],
    ['Settings', 'Ajustes'],
    ['Close', 'Cerrar'],
    ['Minimize', 'Minimizar'],
    ['Maximize', 'Maximizar'],
    ['Restore', 'Restaurar'],
    ['Fit', 'Ajustar'],
    ['Fill', 'Llenar'],
    ['Position', 'Posición'],
    ['Import employees', 'Importar empleados'],
    ['Employee import', 'Importación de empleados'],
    ['Import selected employees', 'Importar empleados seleccionados'],
    ['Update existing', 'Actualizar existente'],
    ['Create', 'Crear'],
    ['Name', 'Nombre'],
    ['Phone', 'Teléfono'],
    ['Role', 'Rol'],
    ['Language', 'Idioma'],
    ['Status', 'Estado'],
    ['Last event', 'Último evento'],
    ['Not checked in', 'Sin entrada'],
    ['Checked in', 'Entrada registrada'],
    ['Checked out', 'Salida registrada'],
    ['Run OCR', 'Ejecutar OCR'],
    ['Copy text', 'Copiar texto'],
    ['Download text', 'Descargar texto'],
    ['Select image or PDF', 'Seleccionar imagen o PDF'],
    ['OCR text', 'Texto OCR'],
    ['OCR complete.', 'OCR completado.'],
    ['Choose a file first.', 'Selecciona un archivo primero.'],
    ['Loading OCR engine…', 'Cargando motor OCR…'],
    ['Extracted text appears here.', 'El texto extraído aparecerá aquí.'],
    ['Cancel', 'Cancelar'],
    ['Reset', 'Restablecer']
  ]);

  function spanish() {
    try {
      return !!(window.__ottoFlexBridge && window.__ottoFlexBridge.getLang && window.__ottoFlexBridge.getLang() === 'es');
    } catch (_) { return false; }
  }

  function translate(value) {
    const trimmed = value.trim();
    if (exact.has(trimmed)) return exact.get(trimmed);

    let m = trimmed.match(/^FIELD TEAM\s*\((\d+)\)$/i);
    if (m) return `EQUIPO DE CAMPO (${m[1]})`;

    m = trimmed.match(/^(\d+)\s+records?$/i);
    if (m) return `${m[1]} ${Number(m[1]) === 1 ? 'registro' : 'registros'}`;

    m = trimmed.match(/^Show\s+(\d+)\s+unassigned$/i);
    if (m) return `Mostrar ${m[1]} puestos sin asignar`;

    m = trimmed.match(/^Page\s+(\d+)$/i);
    if (m) return `Página ${m[1]}`;

    return null;
  }

  function pass() {
    if (running || !document.body) return;
    running = true;
    try {
      const isEs = spanish();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p || !node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'OPTION'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
          if (p.closest('[contenteditable="true"]')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (!original.has(node)) original.set(node, node.nodeValue);
        const base = original.get(node);
        if (!isEs) {
          if (node.nodeValue !== base) node.nodeValue = base;
          continue;
        }
        const translated = translate(base);
        if (!translated) continue;
        const lead = (base.match(/^\s*/) || [''])[0];
        const trail = (base.match(/\s*$/) || [''])[0];
        node.nodeValue = lead + translated + trail;
      }
    } finally {
      running = false;
    }
  }

  function rebuildFlexForLanguage() {
    /* Controls generated by the additive layer are easiest and safest to translate
       by recreating them from their bilingual source arrays. Any open additive
       dialog closes so it cannot remain half-English/half-Spanish. */
    document.getElementById('otto-flex-sidebar')?.remove();
    document.getElementById('otto-flex-sidebar-backdrop')?.remove();
    document.getElementById('otto-flex-tabs')?.remove();
    document.getElementById('otto-wallpaper-controls')?.remove();
    document.getElementById('otto-flex-overlay')?.remove();
    setTimeout(() => {
      if (window.ottoFlex && window.ottoFlex.refresh) window.ottoFlex.refresh();
      pass();
    }, 0);
  }

  const observer = new MutationObserver(() => queueMicrotask(pass));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('.langtoggle, #lang-en, #lang-es')) rebuildFlexForLanguage();
  }, true);
  setTimeout(pass, 0);
})();
