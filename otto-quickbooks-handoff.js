/* OTTO CRM — manual QuickBooks handoff only.
   OTTO prepares/copies existing record information. The user opens QuickBooks,
   enters it manually, and records a manual status in OTTO. No Intuit API,
   OAuth, sync, webhooks, credentials, or automatic customer-data transfer. */
(function () {
  'use strict';

  const DEFAULT_QUICKBOOKS_URL = 'https://qbo.intuit.com/';
  const STATUSES = ['not_started', 'ready', 'entered'];
  const originalOpenEstimateForm = window.openEstimateForm;
  const originalOpenInvoiceView = window.openInvoiceView;

  function addTranslations() {
    if (typeof T === 'undefined' || !T.en || !T.es) return;
    Object.assign(T.en, {
      quickbooksHandoff: 'QuickBooks handoff',
      quickbooksManualOnly: 'Manual handoff only — OTTO does not send or sync this record.',
      quickbooksOpen: 'Open QuickBooks',
      quickbooksCopyDetails: 'Copy Details',
      quickbooksCopy: 'Copy',
      quickbooksCopied: 'Copied',
      quickbooksSaved: 'Saved',
      quickbooksStatus: 'QuickBooks Status',
      quickbooksReference: 'QuickBooks invoice / reference number',
      quickbooksReferencePlaceholder: 'Optional reference',
      quickbooksDestination: 'QuickBooks destination',
      quickbooksSave: 'Save',
      quickbooksChange: 'Change',
      quickbooksRemove: 'Remove',
      quickbooksInvalidUrl: 'Use a secure Intuit or QuickBooks HTTPS address.',
      quickbooksStatusNotStarted: 'Not started',
      quickbooksStatusReady: 'Ready for QuickBooks',
      quickbooksStatusEntered: 'Entered in QuickBooks',
      quickbooksCustomer: 'Customer',
      quickbooksAddress: 'Address',
      quickbooksContact: 'Phone / email',
      quickbooksRecordNumber: 'Quote / invoice number',
      quickbooksJobDescription: 'Job description',
      quickbooksLineItems: 'Line items',
      quickbooksSubtotal: 'Subtotal',
      quickbooksTax: 'Tax',
      quickbooksTotal: 'Total',
      quickbooksNotes: 'Notes',
      quickbooksNotStored: 'Not stored on this record',
      quickbooksOwnerLinkNote: 'Owners can save the preferred QuickBooks page used by this device/workspace.'
    });
    Object.assign(T.es, {
      quickbooksHandoff: 'Entrega a QuickBooks',
      quickbooksManualOnly: 'Entrega manual únicamente — OTTO no envía ni sincroniza este registro.',
      quickbooksOpen: 'Abrir QuickBooks',
      quickbooksCopyDetails: 'Copiar detalles',
      quickbooksCopy: 'Copiar',
      quickbooksCopied: 'Copiado',
      quickbooksSaved: 'Guardado',
      quickbooksStatus: 'Estado de QuickBooks',
      quickbooksReference: 'Número de factura / referencia de QuickBooks',
      quickbooksReferencePlaceholder: 'Referencia opcional',
      quickbooksDestination: 'Destino de QuickBooks',
      quickbooksSave: 'Guardar',
      quickbooksChange: 'Cambiar',
      quickbooksRemove: 'Eliminar',
      quickbooksInvalidUrl: 'Use una dirección HTTPS segura de Intuit o QuickBooks.',
      quickbooksStatusNotStarted: 'No iniciado',
      quickbooksStatusReady: 'Listo para QuickBooks',
      quickbooksStatusEntered: 'Ingresado en QuickBooks',
      quickbooksCustomer: 'Cliente',
      quickbooksAddress: 'Dirección',
      quickbooksContact: 'Teléfono / correo',
      quickbooksRecordNumber: 'Número de presupuesto / factura',
      quickbooksJobDescription: 'Descripción del trabajo',
      quickbooksLineItems: 'Partidas',
      quickbooksSubtotal: 'Subtotal',
      quickbooksTax: 'Impuesto',
      quickbooksTotal: 'Total',
      quickbooksNotes: 'Notas',
      quickbooksNotStored: 'No guardado en este registro',
      quickbooksOwnerLinkNote: 'Los dueños pueden guardar la página preferida de QuickBooks usada por este dispositivo/espacio.'
    });
  }

  function tr(key) {
    if (typeof T !== 'undefined' && T[lang] && T[lang][key]) return T[lang][key];
    return key;
  }

  function trustedHost(hostname) {
    const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
    return host === 'intuit.com' || host.endsWith('.intuit.com') || host === 'quickbooks.com' || host.endsWith('.quickbooks.com');
  }

  function normalizeQuickBooksUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' || !trustedHost(url.hostname) || url.username || url.password) return null;
      return url.href;
    } catch (_) {
      return null;
    }
  }

  function configuredQuickBooksUrl() {
    const saved = db && db.companyProfile && db.companyProfile.quickbooksUrl;
    return normalizeQuickBooksUrl(saved) || DEFAULT_QUICKBOOKS_URL;
  }

  function hasSavedQuickBooksUrl() {
    return Boolean(db && db.companyProfile && normalizeQuickBooksUrl(db.companyProfile.quickbooksUrl));
  }

  function canEditQuickBooksUrl() {
    return Boolean(session && session.role === 'owner');
  }

  function moneyText(value) {
    if (value === null || value === undefined || value === '') return '';
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    if (typeof money === 'function') return money(number);
    return new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { style: 'currency', currency: 'USD' }).format(number);
  }

  function customerFor(record) {
    return record && record.customerId ? get('customers', record.customerId) : null;
  }

  function jobFor(record) {
    return record && record.jobId ? get('jobs', record.jobId) : null;
  }

  function lineItemsFor(record) {
    const raw = record && (record.lineItems || record.items || record.lines);
    if (!Array.isArray(raw) || !raw.length) return [];
    return raw.map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return String(item || '');
      const name = item.description || item.name || item.title || item.item || '';
      const qty = item.quantity ?? item.qty;
      const rate = item.rate ?? item.price ?? item.unitPrice;
      const amount = item.amount ?? item.total;
      const parts = [name];
      if (qty !== undefined && qty !== '') parts.push(`x${qty}`);
      if (rate !== undefined && rate !== '') parts.push(`@ ${moneyText(rate)}`);
      if (amount !== undefined && amount !== '') parts.push(`= ${moneyText(amount)}`);
      return parts.filter(Boolean).join(' ');
    }).filter(Boolean);
  }

  function jobNotes(jobId) {
    if (!jobId || !db || !Array.isArray(db.notes)) return [];
    return db.notes.filter(n => n && n.jobId === jobId && n.text).map(n => n.text);
  }

  function recordDetails(kind, record) {
    const customer = customerFor(record) || {};
    const job = jobFor(record) || {};
    const items = lineItemsFor(record);
    const subtotal = record.subtotal ?? record.subTotal ?? '';
    const tax = record.tax ?? record.taxAmount ?? record.salesTax ?? '';
    const total = record.total ?? record.amount ?? '';
    const number = kind === 'invoice'
      ? (record.number || '')
      : (record.number || record.quoteNumber || record.estimateNumber || '');
    const notes = [record.notes, record.note, ...jobNotes(record.jobId)].filter(Boolean).join('\n');
    return {
      customer: customer.name || '',
      address: job.address || customer.address || '',
      contact: [customer.phone, customer.email].filter(Boolean).join(' · '),
      number,
      jobDescription: job.description || record.description || record.title || job.title || '',
      lineItems: items.join('\n'),
      subtotal: moneyText(subtotal),
      tax: moneyText(tax),
      total: moneyText(total),
      notes
    };
  }

  function detailRows(details) {
    return [
      ['quickbooksCustomer', details.customer],
      ['quickbooksAddress', details.address],
      ['quickbooksContact', details.contact],
      ['quickbooksRecordNumber', details.number],
      ['quickbooksJobDescription', details.jobDescription],
      ['quickbooksLineItems', details.lineItems],
      ['quickbooksSubtotal', details.subtotal],
      ['quickbooksTax', details.tax],
      ['quickbooksTotal', details.total],
      ['quickbooksNotes', details.notes]
    ];
  }

  function copyTextBlock(kind, record) {
    const details = recordDetails(kind, record);
    return detailRows(details).map(([key, value]) => `${tr(key)}: ${value || '—'}`).join('\n');
  }

  async function copyText(text) {
    const value = String(text || '');
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const area = document.createElement('textarea');
        area.value = value;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      toast(tr('quickbooksCopied'), 'success');
      return true;
    } catch (_) {
      return false;
    }
  }

  function statusOptions(current) {
    const options = [
      ['not_started', tr('quickbooksStatusNotStarted')],
      ['ready', tr('quickbooksStatusReady')],
      ['entered', tr('quickbooksStatusEntered')]
    ];
    return options.map(([value, label]) => `<option value="${value}"${current === value ? ' selected' : ''}>${esc(label)}</option>`).join('');
  }

  function valueRow(key, value, copyValue) {
    const display = value || tr('quickbooksNotStored');
    const copy = copyValue || value;
    return `<div class="otto-qb-detail${value ? '' : ' is-empty'}">
      <span class="otto-qb-detail-label">${esc(tr(key))}</span>
      <span class="otto-qb-detail-value">${esc(display)}</span>
      ${copy ? `<button type="button" class="otto-qb-copy" data-qb-action="copy-value" data-qb-copy="${esc(copy)}">${esc(tr('quickbooksCopy'))}</button>` : ''}
    </div>`;
  }

  function panelMarkup(kind, record) {
    const details = recordDetails(kind, record);
    const status = STATUSES.includes(record.quickbooksStatus) ? record.quickbooksStatus : 'not_started';
    const savedUrl = hasSavedQuickBooksUrl();
    const editableUrl = canEditQuickBooksUrl();
    const destination = configuredQuickBooksUrl();
    const rows = detailRows(details).map(([key, value]) => valueRow(key, value)).join('');

    return `<section class="otto-qb-panel" data-qb-kind="${kind}" data-qb-id="${esc(record.id)}" aria-labelledby="otto-qb-title-${esc(record.id)}">
      <div class="otto-qb-head">
        <div>
          <h3 id="otto-qb-title-${esc(record.id)}"><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> ${esc(tr('quickbooksHandoff'))}</h3>
          <p>${esc(tr('quickbooksManualOnly'))}</p>
        </div>
        <div class="otto-qb-head-actions">
          <button type="button" class="btn" data-qb-action="open">${esc(tr('quickbooksOpen'))}</button>
          <button type="button" class="btn ghost" data-qb-action="copy-details">${esc(tr('quickbooksCopyDetails'))}</button>
        </div>
      </div>

      <div class="otto-qb-details">${rows}</div>

      <div class="otto-qb-fields">
        <div class="field">
          <label>${esc(tr('quickbooksStatus'))}</label>
          <select data-qb-field="status">${statusOptions(status)}</select>
        </div>
        <div class="field">
          <label>${esc(tr('quickbooksReference'))}</label>
          <input data-qb-field="reference" value="${esc(record.quickbooksReference || '')}" placeholder="${esc(tr('quickbooksReferencePlaceholder'))}">
        </div>
      </div>

      <div class="otto-qb-destination">
        <label>${esc(tr('quickbooksDestination'))}</label>
        <div class="otto-qb-destination-row">
          <input data-qb-field="url" type="url" inputmode="url" value="${esc(destination)}" ${editableUrl ? '' : 'readonly'} aria-readonly="${editableUrl ? 'false' : 'true'}">
          ${editableUrl ? `<button type="button" class="btn ghost" data-qb-action="save-url">${esc(savedUrl ? tr('quickbooksChange') : tr('quickbooksSave'))}</button>${savedUrl ? `<button type="button" class="btn ghost" data-qb-action="remove-url">${esc(tr('quickbooksRemove'))}</button>` : ''}` : ''}
        </div>
        ${editableUrl ? `<small>${esc(tr('quickbooksOwnerLinkNote'))}</small>` : ''}
      </div>
    </section>`;
  }

  function currentRecord(panel) {
    if (!panel) return null;
    const kind = panel.dataset.qbKind;
    const collection = kind === 'invoice' ? 'invoices' : 'estimates';
    const record = get(collection, panel.dataset.qbId);
    return record ? { kind, collection, record } : null;
  }

  function appendPanel(kind, id) {
    const collection = kind === 'invoice' ? 'invoices' : 'estimates';
    const record = get(collection, id);
    const sheet = document.querySelector('.overlay .sheet');
    if (!record || !sheet || sheet.querySelector('.otto-qb-panel')) return;
    const holder = document.createElement('div');
    holder.innerHTML = panelMarkup(kind, record);
    sheet.appendChild(holder.firstElementChild);
  }

  function refreshPanel(panel) {
    const info = currentRecord(panel);
    if (!info) return;
    const holder = document.createElement('div');
    holder.innerHTML = panelMarkup(info.kind, info.record);
    panel.replaceWith(holder.firstElementChild);
  }

  function persistRecordField(panel, field, value) {
    const info = currentRecord(panel);
    if (!info) return false;
    const patch = {};
    if (field === 'status') {
      if (!STATUSES.includes(value)) return false;
      patch.quickbooksStatus = value;
    } else if (field === 'reference') {
      patch.quickbooksReference = String(value || '').trim();
    } else {
      return false;
    }
    update(info.collection, info.record.id, patch);
    return true;
  }

  function savePreferredUrl(panel) {
    if (!canEditQuickBooksUrl()) return false;
    const input = panel.querySelector('[data-qb-field="url"]');
    const normalized = normalizeQuickBooksUrl(input && input.value);
    if (!normalized) {
      toast(tr('quickbooksInvalidUrl'), 'error');
      return false;
    }
    db.companyProfile.quickbooksUrl = normalized;
    db.companyProfile.updated = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();
    save();
    refreshPanel(panel);
    toast(tr('quickbooksSaved'), 'success');
    return true;
  }

  function removePreferredUrl(panel) {
    if (!canEditQuickBooksUrl()) return false;
    delete db.companyProfile.quickbooksUrl;
    db.companyProfile.updated = typeof nowISO === 'function' ? nowISO() : new Date().toISOString();
    save();
    refreshPanel(panel);
    return true;
  }

  function openQuickBooks() {
    const url = configuredQuickBooksUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function installHooks() {
    if (typeof originalOpenEstimateForm === 'function') {
      window.openEstimateForm = function (id, jobId) {
        const result = originalOpenEstimateForm.apply(this, arguments);
        if (id) appendPanel('estimate', id);
        return result;
      };
    }
    if (typeof originalOpenInvoiceView === 'function') {
      window.openInvoiceView = function (id) {
        const result = originalOpenInvoiceView.apply(this, arguments);
        if (id) appendPanel('invoice', id);
        return result;
      };
    }
  }

  document.addEventListener('change', function (event) {
    const field = event.target.closest('[data-qb-field]');
    if (!field) return;
    const panel = field.closest('.otto-qb-panel');
    if (!panel) return;
    if (field.dataset.qbField === 'status') {
      if (persistRecordField(panel, 'status', field.value)) toast(tr('quickbooksSaved'), 'success');
    }
    if (field.dataset.qbField === 'reference') {
      persistRecordField(panel, 'reference', field.value);
    }
  });

  document.addEventListener('blur', function (event) {
    const field = event.target.closest && event.target.closest('[data-qb-field="reference"]');
    if (!field) return;
    const panel = field.closest('.otto-qb-panel');
    if (panel) persistRecordField(panel, 'reference', field.value);
  }, true);

  document.addEventListener('click', function (event) {
    const button = event.target.closest('[data-qb-action]');
    if (!button) return;
    const panel = button.closest('.otto-qb-panel');
    const info = panel ? currentRecord(panel) : null;
    switch (button.dataset.qbAction) {
      case 'open':
        openQuickBooks();
        break;
      case 'copy-details':
        if (info) copyText(copyTextBlock(info.kind, info.record));
        break;
      case 'copy-value':
        copyText(button.dataset.qbCopy || '');
        break;
      case 'save-url':
        if (panel) savePreferredUrl(panel);
        break;
      case 'remove-url':
        if (panel) removePreferredUrl(panel);
        break;
    }
  });

  addTranslations();
  installHooks();

  window.__ottoQuickBooksHandoff = Object.freeze({
    DEFAULT_QUICKBOOKS_URL,
    STATUSES: [...STATUSES],
    normalizeQuickBooksUrl,
    trustedHost,
    configuredQuickBooksUrl,
    recordDetails,
    copyTextBlock,
    appendPanel
  });
})();
