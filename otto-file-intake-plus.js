/* OTTO CRM — broad safe business-file intake.
   Extends the existing unified uploader without creating a competing workflow.
   Unsafe executable/script/archive formats remain blocked. */
(function () {
  'use strict';
  const MAX_BYTES = 25 * 1024 * 1024;
  const TEXT_EXTS = new Set(['txt','md','markdown','csv','tsv','json','xml','yaml','yml','log','rtf']);
  const OFFICE_EXTS = new Set(['docx','xlsx','xls','pptx','doc','ppt','odt','ods','odp']);
  const SAFE_GENERIC_EXTS = new Set([...TEXT_EXTS, ...OFFICE_EXTS, 'pdf','jpg','jpeg','png','webp','gif','bmp','tif','tiff','heic','heif','dwg','dxf','dwf','dgn']);
  const BLOCKED_EXTS = new Set(['exe','dll','com','scr','bat','cmd','ps1','sh','js','mjs','cjs','jar','msi','php','py','rb','pl','apk','dmg','pkg','deb','rpm','zip','rar','7z','tar','gz','bz2','xz']);
  const ACCEPT = '.pdf,.txt,.md,.markdown,.csv,.tsv,.json,.xml,.yaml,.yml,.log,.rtf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.heic,.heif,.dwg,.dxf,.dwf,.dgn,image/*,application/pdf,text/plain,text/markdown,text/csv,application/json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation';
  const $ = (s, r=document) => r.querySelector(s);
  const ext = file => (String(file && file.name || '').match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
  const bridge = () => window.__ottoUnifiedIntakeBridge || {};
  const lang = () => { try { return bridge().getLang() || 'en'; } catch (_) { return 'en'; } };
  const tx = (en, es) => lang() === 'es' ? es : en;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function enhancePicker(root=document) {
    root.querySelectorAll('[data-intake-file]').forEach(input => input.setAttribute('accept', ACCEPT));
    root.querySelectorAll('.otto-intake-drop .otto-intake-muted').forEach(el => {
      if (!el.closest('[data-intake-drop]')?.querySelector('[data-intake-file]')) return;
      el.textContent = tx('PDF · Office · CSV/MD/TXT/JSON · images · AutoCAD', 'PDF · Office · CSV/MD/TXT/JSON · imágenes · AutoCAD');
    });
  }

  function renderReview(file, text, status, jobId, error='', allowSave=true) {
    document.querySelector('#otto-file-plus-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'otto-file-plus-overlay';
    overlay.className = 'otto-intake-overlay';
    const stateText = status === 'ready'
      ? tx('Ready to save.','Listo para guardar.')
      : allowSave
        ? tx('File can be saved. Text extraction is not available for this format yet.','El archivo se puede guardar. La extracción de texto aún no está disponible para este formato.')
        : tx('This file will not be saved.','Este archivo no se guardará.');
    overlay.innerHTML = `<section class="otto-intake-dialog" role="dialog" aria-modal="true">
      <header class="otto-intake-head"><h2>${esc(tx('Review document','Revisar documento'))}</h2><button class="otto-intake-close" type="button" data-file-plus-close aria-label="${esc(tx('Close','Cerrar'))}">×</button></header>
      <p class="otto-intake-muted">${esc(file.name)} · ${Math.max(1, Math.round(file.size/1024))} KB</p>
      ${error ? `<p class="otto-intake-error">${esc(error)}</p>` : ''}
      <div class="otto-intake-field"><label>${esc(tx('Extracted / searchable text','Texto extraído / buscable'))}</label><textarea data-file-plus-text>${esc(text || '')}</textarea></div>
      <div class="otto-intake-actions">${allowSave ? `<button class="otto-intake-btn primary" type="button" data-file-plus-save>${esc(tx('Save document','Guardar documento'))}</button>` : ''}<button class="otto-intake-btn" type="button" data-file-plus-close>${esc(allowSave ? tx('Cancel','Cancelar') : tx('Close','Cerrar'))}</button></div>
      <div class="otto-intake-progress ${status === 'ready' ? 'otto-intake-ok' : (allowSave ? '' : 'otto-intake-error')}" data-file-plus-progress>${esc(stateText)}</div>
    </section>`;
    const close = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-file-plus-close]')) close(); });
    const saveButton = $('[data-file-plus-save]', overlay);
    if (saveButton) saveButton.addEventListener('click', async () => {
      const p = $('[data-file-plus-progress]', overlay);
      try {
        p.className = 'otto-intake-progress'; p.textContent = tx('Saving…','Guardando…');
        const b = bridge();
        const fileId = await b.storeFile(file, file.type || 'application/octet-stream');
        const searchable = $('[data-file-plus-text]', overlay).value.trim();
        const rec = b.add('documents', {
          jobId: jobId || '', name: file.name || `document-${Date.now()}`, kind: 'document',
          mime: file.type || '', size: file.size || 0, extension: ext(file),
          ocr: searchable, extractedText: searchable,
          extractionStatus: searchable ? 'complete' : 'stored_only', extractionUpdatedAt: new Date().toISOString()
        });
        rec.fileId = fileId;
        b.save(); b.render();
        p.className = 'otto-intake-progress otto-intake-ok'; p.textContent = tx('Saved and searchable in OTTO.','Guardado y buscable en OTTO.');
      } catch (e) {
        console.error('OTTO broad intake save', e);
        p.className = 'otto-intake-progress otto-intake-error'; p.textContent = tx('Could not save this file.','No se pudo guardar este archivo.');
      }
    });
    document.body.appendChild(overlay);
  }

  async function loadJSZip() {
    if (window.JSZip) return window.JSZip;
    return new Promise((resolve,reject) => {
      const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'; s.crossOrigin='anonymous';
      s.onload=()=>resolve(window.JSZip); s.onerror=()=>reject(new Error('JSZip unavailable')); document.head.appendChild(s);
    });
  }
  async function loadXLSX() {
    if (window.XLSX) return window.XLSX;
    return new Promise((resolve,reject) => {
      const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.crossOrigin='anonymous';
      s.onload=()=>resolve(window.XLSX); s.onerror=()=>reject(new Error('XLSX unavailable')); document.head.appendChild(s);
    });
  }
  const xmlText = xml => String(xml || '').replace(/<w:tab\/?\s*>/g,'\t').replace(/<a:br\/?\s*>/g,'\n').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();

  async function extractOfficeText(file) {
    const x = ext(file);
    if (x === 'xlsx' || x === 'xls') {
      const XLSX = await loadXLSX();
      const wb = XLSX.read(await file.arrayBuffer(), { type:'array' });
      return wb.SheetNames.map(name => `## ${name}\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`).join('\n\n').trim();
    }
    if (x === 'docx' || x === 'pptx' || x === 'odt' || x === 'odp') {
      const JSZip = await loadJSZip(); const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const names = Object.keys(zip.files).filter(name => {
        if (x === 'docx') return /^word\/(document|header\d+|footer\d+)\.xml$/.test(name);
        if (x === 'pptx') return /^ppt\/slides\/slide\d+\.xml$/.test(name);
        return /content\.xml$/.test(name);
      }).sort();
      const chunks=[]; for (const name of names) chunks.push(xmlText(await zip.files[name].async('text')));
      return chunks.filter(Boolean).join('\n\n').trim();
    }
    return '';
  }

  async function extractPdfNative(file) {
    if (!window.pdfjsLib) return '';
    const pdf = await window.pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
    const pages=[];
    for (let i=1;i<=pdf.numPages;i++) {
      const page=await pdf.getPage(i); const content=await page.getTextContent();
      pages.push(content.items.map(item=>item.str || '').join(' ').replace(/\s+/g,' ').trim());
    }
    return pages.filter(Boolean).join('\n\n').trim();
  }

  async function extractText(file) {
    const x = ext(file);
    if (['txt','md','markdown','csv','tsv','json','xml','yaml','yml','log','rtf'].includes(x)) return (await file.text()).trim();
    if (['docx','xlsx','xls','pptx','odt','odp'].includes(x)) return extractOfficeText(file);
    if (x === 'pdf' || file.type === 'application/pdf') {
      const native = await extractPdfNative(file);
      if (native.length >= 24) return native;
      if (window.ottoUnifiedIntake?.extractOCRText) return window.ottoUnifiedIntake.extractOCRText(file);
      return native;
    }
    if (file.type && file.type.startsWith('image/') && window.ottoUnifiedIntake?.extractOCRText) return window.ottoUnifiedIntake.extractOCRText(file);
    return '';
  }

  async function handleGeneric(file, jobId) {
    const x = ext(file);
    if (file.size > MAX_BYTES) return renderReview(file, '', 'blocked', jobId, tx('Files must be 25 MB or smaller.','Los archivos deben medir 25 MB o menos.'), false);
    if (BLOCKED_EXTS.has(x)) return renderReview(file, '', 'blocked', jobId, tx('This unsafe file type is blocked.','Este tipo de archivo inseguro está bloqueado.'), false);
    if (!SAFE_GENERIC_EXTS.has(x) && !(file.type || '').startsWith('image/')) return renderReview(file, '', 'blocked', jobId, tx('This file type is not approved for OTTO storage.','Este tipo de archivo no está aprobado para almacenamiento en OTTO.'), false);
    let text='', error='';
    try { text = await extractText(file); } catch (e) { console.warn('OTTO text extraction', e); error = tx('The file will still save, but text extraction could not finish.','El archivo se guardará, pero no se pudo terminar la extracción de texto.'); }
    renderReview(file, text, text ? 'ready' : 'stored_only', jobId, error, true);
  }

  function spreadsheetChoice(file, jobId) {
    document.querySelector('#otto-file-plus-overlay')?.remove();
    const overlay=document.createElement('div'); overlay.id='otto-file-plus-overlay'; overlay.className='otto-intake-overlay';
    overlay.innerHTML=`<section class="otto-intake-dialog" role="dialog" aria-modal="true"><header class="otto-intake-head"><h2>${esc(tx('What should OTTO do?','¿Qué debe hacer OTTO?'))}</h2><button class="otto-intake-close" data-file-plus-close>×</button></header><p class="otto-intake-muted">${esc(file.name)}</p><div class="otto-intake-route"><button data-file-plus-import><strong>${esc(tx('Import employee data','Importar datos de empleados'))}</strong><span class="otto-intake-muted">${esc(tx('Use the existing reviewed spreadsheet import.','Usar la importación revisada existente.'))}</span></button><button data-file-plus-document><strong>${esc(tx('Save/read as a document','Guardar/leer como documento'))}</strong><span class="otto-intake-muted">${esc(tx('Keep the file and make its text searchable.','Guardar el archivo y hacer su texto buscable.'))}</span></button></div></section>`;
    overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-file-plus-close]'))overlay.remove();});
    $('[data-file-plus-import]',overlay).addEventListener('click',()=>{overlay.remove();window.ottoUnifiedIntake?.importSpreadsheet(file);});
    $('[data-file-plus-document]',overlay).addEventListener('click',()=>handleGeneric(file,jobId));
    document.body.appendChild(overlay);
  }

  document.addEventListener('change', e => {
    const input=e.target.closest?.('[data-intake-file]'); if(!input || !input.files?.[0]) return;
    const file=input.files[0], x=ext(file);
    if (['doc','docx','ppt','pptx','odt','ods','odp','txt','md','markdown','tsv','json','xml','yaml','yml','log','rtf','heic','heif'].includes(x)) {
      e.stopImmediatePropagation(); e.preventDefault(); const job=$('[data-intake-job]',input.closest('#otto-unified-intake-overlay'))?.value || ''; handleGeneric(file,job); return;
    }
    if (['csv','xls','xlsx'].includes(x)) {
      e.stopImmediatePropagation(); e.preventDefault(); const job=$('[data-intake-job]',input.closest('#otto-unified-intake-overlay'))?.value || ''; spreadsheetChoice(file,job);
    }
  }, true);

  document.addEventListener('drop', e => {
    const drop=e.target.closest?.('[data-intake-drop]'); if(!drop || !drop.querySelector('[data-intake-file]')) return;
    const file=e.dataTransfer?.files?.[0]; if(!file) return; const x=ext(file);
    if (['doc','docx','ppt','pptx','odt','ods','odp','txt','md','markdown','tsv','json','xml','yaml','yml','log','rtf','csv','xls','xlsx','heic','heif'].includes(x)) {
      e.stopImmediatePropagation(); e.preventDefault(); const root=drop.closest('#otto-unified-intake-overlay'); const job=$('[data-intake-job]',root)?.value || '';
      if(['csv','xls','xlsx'].includes(x)) spreadsheetChoice(file,job); else handleGeneric(file,job);
    }
  }, true);

  const observer=new MutationObserver(()=>enhancePicker()); observer.observe(document.documentElement,{childList:true,subtree:true}); enhancePicker();
  window.ottoFileIntakePlus={accept:ACCEPT,extractText,handleGeneric,blocked:Array.from(BLOCKED_EXTS)};
})();