/* OTTO CRM — OCR v2.
   Uses the supported Tesseract.js v5 createWorker -> worker.recognize flow.
   Loaded after otto-flex-ui.js and captures OCR menu activation before the
   older convenience implementation, so there is one user-visible OCR flow. */
(function () {
  'use strict';

  const bridge = () => window.__ottoFlexBridge || {};
  function es() { try { return bridge().getLang && bridge().getLang() === 'es'; } catch (_) { return false; } }
  function tx(en, spa) { return es() ? spa : en; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  async function loadTesseract() {
    if (window.Tesseract && window.Tesseract.createWorker) return window.Tesseract;
    return new Promise((resolve, reject) => {
      const old = document.querySelector('script[data-otto-tesseract]');
      if (old) {
        old.addEventListener('load', () => resolve(window.Tesseract), { once: true });
        old.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.dataset.ottoTesseract = '1';
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(window.Tesseract);
      script.onerror = () => reject(new Error('Tesseract.js failed to load'));
      document.head.appendChild(script);
    });
  }

  async function renderPdf(file) {
    if (!window.pdfjsLib) throw new Error('PDF.js unavailable');
    const data = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      pages.push(canvas);
    }
    return pages;
  }

  function close() { document.getElementById('otto-flex-overlay')?.remove(); }

  function downloadText(text, sourceName) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = String(sourceName || 'otto-ocr').replace(/\.[^.]+$/, '') + '.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openOCR() {
    close();
    const overlay = document.createElement('div');
    overlay.id = 'otto-flex-overlay';
    overlay.className = 'otto-flex-overlay';
    overlay.innerHTML = `<section class="otto-flex-dialog" role="dialog" aria-modal="true" aria-labelledby="otto-ocr-title">
      <div class="otto-flex-dialog-head">
        <h2 id="otto-ocr-title">${esc(tx('Document OCR', 'OCR de documentos'))}</h2>
        <button type="button" class="otto-flex-iconbtn" data-ocr-close aria-label="${esc(tx('Close', 'Cerrar'))}"><i class="fas fa-xmark"></i></button>
      </div>
      <p>${esc(tx('Upload a photo, scan, or PDF. OTTO extracts selectable English and Spanish text in your browser.', 'Sube una foto, escaneo o PDF. OTTO extrae texto seleccionable en inglés y español dentro del navegador.'))}</p>
      <div class="otto-flex-field">
        <label>${esc(tx('Select image or PDF', 'Seleccionar imagen o PDF'))}</label>
        <input type="file" accept="image/*,.pdf,application/pdf" data-ocr-file>
      </div>
      <div class="otto-ocr-progress" data-ocr-progress aria-live="polite"></div>
      <div class="otto-flex-field">
        <label>${esc(tx('OCR text', 'Texto OCR'))}</label>
        <textarea data-ocr-output placeholder="${esc(tx('Extracted text appears here.', 'El texto extraído aparecerá aquí.'))}"></textarea>
      </div>
      <div class="otto-flex-actions">
        <button class="otto-flex-btn otto-flex-primary" type="button" data-ocr-run>${esc(tx('Run OCR', 'Ejecutar OCR'))}</button>
        <button class="otto-flex-btn" type="button" data-ocr-copy>${esc(tx('Copy text', 'Copiar texto'))}</button>
        <button class="otto-flex-btn" type="button" data-ocr-download>${esc(tx('Download text', 'Descargar texto'))}</button>
      </div>
    </section>`;
    document.body.appendChild(overlay);

    const fileInput = overlay.querySelector('[data-ocr-file]');
    const output = overlay.querySelector('[data-ocr-output]');
    const progress = overlay.querySelector('[data-ocr-progress]');
    let busy = false;

    overlay.addEventListener('click', async e => {
      if (e.target === overlay || e.target.closest('[data-ocr-close]')) { close(); return; }
      if (e.target.closest('[data-ocr-copy]')) {
        if (output.value && navigator.clipboard) await navigator.clipboard.writeText(output.value);
        return;
      }
      if (e.target.closest('[data-ocr-download]')) {
        if (output.value) downloadText(output.value, fileInput.files?.[0]?.name);
        return;
      }
      if (!e.target.closest('[data-ocr-run]') || busy) return;
      const file = fileInput.files?.[0];
      if (!file) { progress.textContent = tx('Choose a file first.', 'Selecciona un archivo primero.'); return; }

      busy = true;
      output.value = '';
      let worker;
      try {
        progress.textContent = tx('Loading OCR engine…', 'Cargando motor OCR…');
        const Tesseract = await loadTesseract();
        worker = await Tesseract.createWorker(['eng', 'spa'], 1, {
          logger(message) {
            if (message.status === 'recognizing text' && Number.isFinite(message.progress)) {
              progress.textContent = `${tx('OCR', 'OCR')} ${Math.round(message.progress * 100)}%`;
            }
          }
        });

        const sources = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
          ? await renderPdf(file)
          : [file];
        let collected = '';
        for (let i = 0; i < sources.length; i++) {
          progress.textContent = tx(`Processing page ${i + 1} of ${sources.length}…`, `Procesando página ${i + 1} de ${sources.length}…`);
          const result = await worker.recognize(sources[i]);
          const pageText = result?.data?.text || '';
          if (sources.length > 1) collected += `\n\n--- ${tx('Page', 'Página')} ${i + 1} ---\n`;
          collected += pageText;
          output.value = collected.trim();
        }
        progress.textContent = tx('OCR complete.', 'OCR completado.');
      } catch (error) {
        console.error('OTTO OCR:', error);
        progress.textContent = tx('OCR could not complete. Check the file and your connection, then try again.', 'No se pudo completar el OCR. Revisa el archivo y la conexión e inténtalo otra vez.');
      } finally {
        busy = false;
        if (worker) {
          try { await worker.terminate(); } catch (_) {}
        }
      }
    });
  }

  /* Capture before the flex sidebar's bubble listener invokes its legacy OCR helper. */
  document.addEventListener('click', e => {
    const target = e.target.closest && e.target.closest('[data-flex-nav="__ocr"]');
    if (!target) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    document.getElementById('otto-flex-sidebar')?.classList.remove('is-open');
    document.getElementById('otto-flex-sidebar-backdrop')?.classList.remove('is-open');
    openOCR();
  }, true);

  if (window.ottoFlex) window.ottoFlex.openOCR = openOCR;
  window.ottoFlexOCR = { open: openOCR };
})();
