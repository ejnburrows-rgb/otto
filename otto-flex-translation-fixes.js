/* OTTO CRM — hard-coded bilingual cleanup.
   The main translation dictionary cannot translate literal English written directly
   into template strings. This tiny layer handles only those known leftovers and
   dynamic count forms; it does not replace OTTO's native t() translation system. */
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
    ['Worker', 'Trabajador'],
    ['Time off', 'Tiempo libre'],
    ['Back to Home', 'Volver al inicio'],
    ['Back to panels', 'Volver a los paneles'],
    ['Home sections', 'Secciones de inicio']
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

  const observer = new MutationObserver(() => queueMicrotask(pass));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    if (e.target.closest && e.target.closest('.langtoggle, #lang-en, #lang-es')) setTimeout(pass, 0);
  });
  setTimeout(pass, 0);
})();
