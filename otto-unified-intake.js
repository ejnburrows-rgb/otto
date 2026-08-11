/* OTTO CRM — unified file intake.
   One front door: spreadsheet -> structured employee review; image/scan -> bilingual OCR;
   drawing -> existing job document/drawing pipeline. PDFs ask one routing question because
   a PDF may be either a scan/document or a construction plan. */
(function () {
  'use strict';

  const bridge = () => window.__ottoUnifiedIntakeBridge || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = v => String(v == null ? '' : v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const lang = () => { try { return bridge().getLang() || 'en'; } catch (_) { return 'en'; } };
  const tx = (en, es) => lang() === 'es' ? es : en;
  const data = () => { try { return bridge().getDb() || {}; } catch (_) { return {}; } };
  const isAdmin = () => { try { const s = bridge().getSession(); return !!s && s.role !== 'field'; } catch (_) { return false; } };

  function injectStyles() {
    if ($('#otto-unified-intake-style')) return;
    const style = document.createElement('style');
    style.id = 'otto-unified-intake-style';
    style.textContent = `
      .otto-intake-launch{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border,rgba(20,56,92,.14));background:var(--surface,#fff);color:var(--text,#123);border-radius:12px;padding:9px 12px;font:inherit;font-weight:700;cursor:pointer;box-shadow:0 8px 22px rgba(14,46,78,.08)}
      .otto-intake-launch:hover{transform:translateY(-1px)}
      .otto-intake-overlay{position:fixed;inset:0;z-index:10050;background:rgba(7,24,42,.48);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}
      .otto-intake-dialog{width:min(760px,100%);max-height:90vh;overflow:auto;background:var(--surface,#fff);color:var(--text,#123);border:1px solid var(--border,rgba(20,56,92,.14));border-radius:22px;box-shadow:0 28px 80px rgba(0,25,55,.28);padding:20px}
      .otto-intake-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}.otto-intake-head h2{margin:0;font-size:22px}.otto-intake-close{border:0;background:transparent;color:inherit;font-size:22px;cursor:pointer}
      .otto-intake-drop{display:grid;place-items:center;text-align:center;gap:8px;border:1.5px dashed rgba(44,101,151,.35);border-radius:18px;padding:26px;background:rgba(74,139,194,.055);cursor:pointer}.otto-intake-drop strong{font-size:17px}.otto-intake-muted{font-size:13px;opacity:.72}.otto-intake-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}.otto-intake-btn{border:1px solid rgba(37,88,134,.18);background:var(--surface,#fff);color:inherit;border-radius:11px;padding:10px 13px;font:inherit;font-weight:700;cursor:pointer}.otto-intake-btn.primary{background:var(--action,#0b5fa5);color:#fff;border-color:transparent}.otto-intake-btn:disabled{opacity:.45;cursor:not-allowed}
      .otto-intake-field{display:grid;gap:6px;margin:12px 0}.otto-intake-field label{font-size:12px;font-weight:800;opacity:.72}.otto-intake-field select,.otto-intake-field input,.otto-intake-field textarea{width:100%;box-sizing:border-box;border:1px solid rgba(34,86,132,.18);border-radius:11px;padding:10px 11px;background:var(--surface,#fff);color:inherit;font:inherit}.otto-intake-field textarea{min-height:210px;resize:vertical}
      .otto-intake-table-wrap{overflow:auto;margin-top:12px;border:1px solid rgba(34,86,132,.12);border-radius:14px}.otto-intake-table{border-collapse:collapse;width:100%;min-width:680px}.otto-intake-table th,.otto-intake-table td{padding:9px;border-bottom:1px solid rgba(34,86,132,.1);text-align:left;font-size:13px}.otto-intake-table th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;opacity:.65}.otto-intake-table input[type=text],.otto-intake-table input[type=email],.otto-intake-table input[type=tel]{width:100%;min-width:110px;box-sizing:border-box;border:1px solid rgba(34,86,132,.15);border-radius:8px;padding:7px;background:transparent;color:inherit}.otto-intake-route{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}.otto-intake-route button{min-height:96px;text-align:left;padding:16px;border-radius:15px;border:1px solid rgba(34,86,132,.16);background:rgba(74,139,194,.055);color:inherit;cursor:pointer}.otto-intake-route strong{display:block;margin-bottom:5px}.otto-intake-progress{margin-top:10px;font-size:13px;font-weight:700}.otto-intake-ok{color:#18794e}.otto-intake-error{color:#b42318}
      @media(max-width:640px){.otto-intake-dialog{padding:15px;border-radius:18px}.otto-intake-route{grid-template-columns:1fr}.otto-intake-launch span{display:none}.otto-intake-launch{padding:9px 10px}}
    `;
    document.head.appendChild(style);
  }

  function close() { $('#otto-unified-intake-overlay')?.remove(); }
  function shell(title, body) {
    close(); injectStyles();
    const overlay = document.createElement('div');
    overlay.id = 'otto-unified-intake-overlay';
    overlay.className = 'otto-intake-overlay';
    overlay.innerHTML = `<section class="otto-intake-dialog" role="dialog" aria-modal="true"><header class="otto-intake-head"><h2>${esc(title)}</h2><button class="otto-intake-close" type="button" data-intake-close aria-label="${esc(tx('Close','Cerrar'))}">×</button></header>${body}</section>`;
    overlay.addEventListener('click', e => { if (e.target === overlay || e.target.closest('[data-intake-close]')) close(); });
    document.body.appendChild(overlay);
    return overlay;
  }

  function jobs() { return (data().jobs || []).filter(Boolean); }
  function jobOptions(selected = '') {
    return `<option value="">${esc(tx('Select a job when this file belongs to one','Selecciona un trabajo si este archivo pertenece a uno'))}</option>` + jobs().map(j => `<option value="${esc(j.id)}" ${j.id === selected ? 'selected' : ''}>${esc(j.title || j.id)}</option>`).join('');
  }

  function ensureLauncher() {
    const old = $('#otto-unified-intake-launch');
    if (!isAdmin()) { old?.remove(); return; }
    if (old) return;
    const host = document.querySelector('.topbar') || document.body;
    const btn = document.createElement('button');
    btn.id = 'otto-unified-intake-launch';
    btn.type = 'button';
    btn.className = 'otto-intake-launch';
    btn.innerHTML = `<i class="fas fa-arrow-up-from-bracket" aria-hidden="true"></i><span>${esc(tx('Upload / Import','Subir / Importar'))}</span>`;
    btn.setAttribute('aria-label', tx('Upload or import a file','Subir o importar un archivo'));
    btn.addEventListener('click', openIntake);
    host.appendChild(btn);
  }

  function openIntake() {
    const root = shell(tx('Upload / Import','Subir / Importar'), `
      <p class="otto-intake-muted">${esc(tx('Give OTTO the file. Spreadsheets are read as structured employee data, photos/scans use English + Spanish OCR, and plans use the existing job drawing pipeline.','Dale el archivo a OTTO. Las hojas se leen como datos estructurados de empleados, las fotos/escaneos usan OCR en inglés + español y los planos usan el flujo existente de dibujos del trabajo.'))}</p>
      <div class="otto-intake-field"><label>${esc(tx('Job (optional until a plan needs one)','Trabajo (opcional hasta que un plano lo necesite'))}</label><select data-intake-job>${jobOptions()}</select></div>
      <label class="otto-intake-drop" data-intake-drop>
        <i class="fas fa-file-arrow-up" style="font-size:28px" aria-hidden="true"></i>
        <strong>${esc(tx('Choose a file','Selecciona un archivo'))}</strong>
        <span class="otto-intake-muted">Excel / CSV · photo · PDF · DWG / DXF / DWF / DGN</span>
        <input type="file" hidden data-intake-file accept=".xlsx,.xls,.csv,image/*,.pdf,.dwg,.dxf,.dwf,.dgn,application/pdf">
      </label>
      <div class="otto-intake-actions"><button class="otto-intake-btn" type="button" data-intake-camera><i class="fas fa-camera"></i> ${esc(tx('Take photo','Tomar foto'))}</button></div>
      <div class="otto-intake-progress" data-intake-progress></div>`);
    const fileInput = $('[data-intake-file]', root);
    const job = $('[data-intake-job]', root);
    $('[data-intake-camera]', root).addEventListener('click', () => {
      const camera = document.createElement('input'); camera.type = 'file'; camera.accept = 'image/*'; camera.capture = 'environment';
      camera.onchange = () => { if (camera.files?.[0]) routeFile(camera.files[0], job.value, root); };
      camera.click();
    });
    fileInput.addEventListener('change', () => { if (fileInput.files?.[0]) routeFile(fileInput.files[0], job.value, root); });
    const drop = $('[data-intake-drop]', root);
    drop.addEventListener('dragover', e => { e.preventDefault(); });
    drop.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) routeFile(f, job.value, root); });
  }

  function ext(file) { return (file.name.match(/\.([^.]+)$/)?.[1] || '').toLowerCase(); }
  function progress(root, text, cls = '') { const p = $('[data-intake-progress]', root); if (p) { p.className = `otto-intake-progress ${cls}`; p.textContent = text; } }

  async function routeFile(file, jobId, root) {
    const x = ext(file);
    if (['xlsx','xls','csv'].includes(x)) return importSpreadsheet(file);
    if (['dwg','dxf','dwf','dgn'].includes(x)) return saveAsPlan(file, jobId);
    if (x === 'pdf' || file.type === 'application/pdf') return choosePdfRoute(file, jobId);
    if (file.type.startsWith('image/')) return runOCR(file, jobId);
    progress(root, tx('This file type is not supported here.','Este tipo de archivo no es compatible aquí.'), 'otto-intake-error');
  }

  function choosePdfRoute(file, jobId) {
    const root = shell(tx('What kind of PDF is this?','¿Qué tipo de PDF es?'), `
      <p class="otto-intake-muted">${esc(file.name)}</p>
      <div class="otto-intake-field"><label>${esc(tx('Job','Trabajo'))}</label><select data-pdf-job>${jobOptions(jobId)}</select></div>
      <div class="otto-intake-route">
        <button type="button" data-pdf-ocr><strong>${esc(tx('Read text / scanned document','Leer texto / documento escaneado'))}</strong><span class="otto-intake-muted">${esc(tx('Use bilingual OCR.','Usar OCR bilingüe.'))}</span></button>
        <button type="button" data-pdf-plan><strong>${esc(tx('Plan / drawing','Plano / dibujo'))}</strong><span class="otto-intake-muted">${esc(tx('Attach to a job and use the existing drawing analysis.','Adjuntar a un trabajo y usar el análisis de dibujos existente.'))}</span></button>
      </div>`);
    $('[data-pdf-ocr]', root).addEventListener('click', () => runOCR(file, $('[data-pdf-job]', root).value));
    $('[data-pdf-plan]', root).addEventListener('click', () => saveAsPlan(file, $('[data-pdf-job]', root).value));
  }

  async function saveAsPlan(file, jobId) {
    if (!jobId) {
      const root = shell(tx('Choose the job','Selecciona el trabajo'), `<p class="otto-intake-muted">${esc(tx('Plans must stay attached to the correct job.','Los planos deben permanecer adjuntos al trabajo correcto.'))}</p><div class="otto-intake-field"><label>${esc(tx('Job','Trabajo'))}</label><select data-plan-job>${jobOptions()}</select></div><div class="otto-intake-actions"><button class="otto-intake-btn primary" type="button" data-plan-save>${esc(tx('Continue','Continuar'))}</button></div>`);
      $('[data-plan-save]', root).addEventListener('click', () => { const id = $('[data-plan-job]', root).value; if (id) saveAsPlan(file, id); });
      return;
    }
    const root = shell(tx('Plan / drawing','Plano / dibujo'), `<p class="otto-intake-muted">${esc(file.name)}</p><div class="otto-intake-progress" data-intake-progress>${esc(tx('Saving to the job…','Guardando en el trabajo…'))}</div>`);
    try {
      const b = bridge();
      const fileId = await b.storeFile(file);
      const rec = b.add('documents', { jobId, name: file.name || `drawing-${Date.now()}`, kind: 'cad', mime: file.type || '', size: file.size || 0 });
      rec.fileId = fileId; b.save();
      progress(root, tx('Saved. Opening the existing drawing analysis…','Guardado. Abriendo el análisis de dibujos existente…'), 'otto-intake-ok');
      await b.analyzeDrawing(rec.id);
    } catch (e) {
      console.error('OTTO unified plan intake', e);
      progress(root, tx('The plan could not be saved or analyzed.','No se pudo guardar o analizar el plano.'), 'otto-intake-error');
    }
  }

  async function loadXLSX() {
    if (window.XLSX) return window.XLSX;
    return new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.crossOrigin = 'anonymous';
      s.onload = () => resolve(window.XLSX); s.onerror = () => reject(new Error('XLSX failed to load')); document.head.appendChild(s);
    });
  }
  function parseCSV(text) {
    const rows = []; let row = [], cur = '', quoted = false;
    for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === '"') { if (quoted && text[i+1] === '"') { cur += '"'; i++; } else quoted = !quoted; } else if (c === ',' && !quoted) { row.push(cur); cur = ''; } else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i+1] === '\n') i++; row.push(cur); if (row.some(v => v !== '')) rows.push(row); row = []; cur = ''; } else cur += c; }
    row.push(cur); if (row.some(v => v !== '')) rows.push(row); if (!rows.length) return [];
    const headers = rows[0]; return rows.slice(1).map(r => Object.fromEntries(headers.map((h,i) => [h, r[i] || ''])));
  }
  async function readRows(file) {
    if (ext(file) === 'csv') return parseCSV(await file.text());
    const XLSX = await loadXLSX(); const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; return XLSX.utils.sheet_to_json(ws, { defval: '' });
  }
  function pick(row, aliases) {
    const keys = Object.keys(row || {}); for (const a of aliases) { const n = norm(a); const key = keys.find(k => norm(k) === n || norm(k).includes(n)); if (key && String(row[key]).trim()) return String(row[key]).trim(); } return '';
  }
  function mapEmployee(row) {
    let name = pick(row, ['employee name','full name','name','nombre empleado','nombre']);
    if (!name) name = `${pick(row,['first name','first','nombre'])} ${pick(row,['last name','last','apellido'])}`.trim();
    const l = norm(pick(row,['language','lang','idioma']));
    return { name, phone: pick(row,['phone','mobile','cell','telephone','telefono','celular']), email: pick(row,['email','e-mail','correo']), employeeId: pick(row,['employee id','employee number','emp id','id empleado','numero empleado']), lang: l.startsWith('en') || l.includes('english') || l.includes('ingles') ? 'en' : 'es', hourlyRate: pick(row,['hourly rate','rate','pay rate','tarifa','pago por hora']) };
  }
  function existingMatch(emp) {
    const users = data().users || []; const email = norm(emp.email), eid = norm(emp.employeeId), name = norm(emp.name), phone = String(emp.phone || '').replace(/\D/g,'');
    return users.find(u => (eid && norm(u.employeeId) === eid) || (email && norm(u.email) === email) || (phone && String(u.phone || '').replace(/\D/g,'') === phone) || (name && norm(u.name) === name));
  }

  async function importSpreadsheet(file) {
    let rows; try { rows = await readRows(file); } catch (e) { return shell(tx('Employee import','Importación de empleados'), `<p class="otto-intake-error">${esc(tx('OTTO could not read that spreadsheet.','OTTO no pudo leer esa hoja de cálculo.'))}</p>`); }
    reviewEmployees(rows.map(mapEmployee).filter(e => e.name), file.name);
  }

  function reviewEmployees(emps, sourceName) {
    if (!emps.length) return shell(tx('Employee import','Importación de empleados'), `<p class="otto-intake-error">${esc(tx('No employee rows were found.','No se encontraron filas de empleados.'))}</p>`);
    const root = shell(tx('Review employees','Revisar empleados'), `<p class="otto-intake-muted">${esc(sourceName || '')} · ${esc(tx('All imported people are forced to Field Worker. PINs are never imported.','Todas las personas importadas se fuerzan a Trabajador de campo. Los PIN nunca se importan.'))}</p><div class="otto-intake-table-wrap"><table class="otto-intake-table"><thead><tr><th></th><th>${esc(tx('Name','Nombre'))}</th><th>${esc(tx('Phone','Teléfono'))}</th><th>${esc(tx('Email','Correo'))}</th><th>ID</th><th>${esc(tx('Language','Idioma'))}</th><th>${esc(tx('Action','Acción'))}</th></tr></thead><tbody>${emps.map((e,i) => { const match = existingMatch(e); return `<tr><td><input type="checkbox" data-emp-use="${i}" checked></td><td><input type="text" data-emp-name="${i}" value="${esc(e.name)}"></td><td><input type="tel" data-emp-phone="${i}" value="${esc(e.phone)}"></td><td><input type="email" data-emp-email="${i}" value="${esc(e.email)}"></td><td><input type="text" data-emp-id="${i}" value="${esc(e.employeeId)}"></td><td><select data-emp-lang="${i}"><option value="es" ${e.lang==='es'?'selected':''}>Español</option><option value="en" ${e.lang==='en'?'selected':''}>English</option></select></td><td>${esc(match ? tx('Update existing','Actualizar existente') : tx('Create','Crear'))}</td></tr>`; }).join('')}</tbody></table></div><div class="otto-intake-actions"><button type="button" class="otto-intake-btn primary" data-emp-save>${esc(tx('Save selected employees','Guardar empleados seleccionados'))}</button><button type="button" class="otto-intake-btn" data-intake-close>${esc(tx('Cancel','Cancelar'))}</button></div><div class="otto-intake-progress" data-intake-progress></div>`);
    $('[data-emp-save]', root).addEventListener('click', () => {
      const b = bridge(); let created = 0, updated = 0;
      root.querySelectorAll('[data-emp-use]:checked').forEach(cb => {
        const i = Number(cb.dataset.empUse); const emp = { name: $(`[data-emp-name="${i}"]`,root).value.trim(), phone: $(`[data-emp-phone="${i}"]`,root).value.trim(), email: $(`[data-emp-email="${i}"]`,root).value.trim(), employeeId: $(`[data-emp-id="${i}"]`,root).value.trim(), lang: $(`[data-emp-lang="${i}"]`,root).value, role: 'field' };
        if (!emp.name) return; const match = existingMatch(emp); let user;
        if (match) { user = b.update('users', match.id, emp); updated++; } else { user = b.add('users', emp); created++; }
        if (user) { const events = data().job_events || []; const rostered = events.some(ev => ev && ev.type === 'attendance_roster' && (ev.userId === user.id || ev.workerId === user.id)); if (!rostered) b.add('job_events', { type:'attendance_roster', userId:user.id, workerId:user.id, source:'unified_file_intake', ts:new Date().toISOString() }); }
      });
      b.save(); b.render(); progress(root, tx(`${created} created, ${updated} updated.`,`${created} creados, ${updated} actualizados.`), 'otto-intake-ok');
    });
  }

  async function loadTesseract() {
    if (window.Tesseract?.createWorker) return window.Tesseract;
    return new Promise((resolve,reject) => { const s = document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; s.crossOrigin='anonymous'; s.onload=()=>resolve(window.Tesseract); s.onerror=()=>reject(new Error('Tesseract failed to load')); document.head.appendChild(s); });
  }
  async function pdfPages(file) {
    if (!window.pdfjsLib) throw new Error('PDF.js unavailable');
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; const pages=[];
    for (let i=1;i<=pdf.numPages;i++) { const page=await pdf.getPage(i); const viewport=page.getViewport({scale:1.8}); const c=document.createElement('canvas'); c.width=Math.ceil(viewport.width); c.height=Math.ceil(viewport.height); await page.render({canvasContext:c.getContext('2d'),viewport}).promise; pages.push(c); }
    return pages;
  }
  async function runOCR(file, jobId) {
    const root = shell(tx('Document OCR','OCR de documentos'), `<p class="otto-intake-muted">${esc(file.name)}</p><div class="otto-intake-progress" data-intake-progress>${esc(tx('Loading bilingual OCR…','Cargando OCR bilingüe…'))}</div><div class="otto-intake-field"><label>${esc(tx('Extracted text','Texto extraído'))}</label><textarea data-ocr-output></textarea></div><div class="otto-intake-actions"><button class="otto-intake-btn" type="button" data-ocr-copy>${esc(tx('Copy text','Copiar texto'))}</button><button class="otto-intake-btn" type="button" data-ocr-employees>${esc(tx('Use as employee list','Usar como lista de empleados'))}</button>${jobId ? `<button class="otto-intake-btn primary" type="button" data-ocr-save>${esc(tx('Save to job','Guardar en trabajo'))}</button>` : ''}</div>`);
    const out = $('[data-ocr-output]',root); let worker;
    try {
      const T = await loadTesseract(); worker = await T.createWorker(['eng','spa'],1,{logger:m=>{if(m.status==='recognizing text'&&Number.isFinite(m.progress))progress(root,`OCR ${Math.round(m.progress*100)}%`);}});
      const sources = ext(file)==='pdf' || file.type==='application/pdf' ? await pdfPages(file) : [file]; let text='';
      for (let i=0;i<sources.length;i++) { progress(root, tx(`Processing page ${i+1} of ${sources.length}…`,`Procesando página ${i+1} de ${sources.length}…`)); const r=await worker.recognize(sources[i]); text += (sources.length>1 ? `\n\n--- ${tx('Page','Página')} ${i+1} ---\n` : '') + (r?.data?.text || ''); out.value=text.trim(); }
      progress(root,tx('OCR complete. Review the text before saving or importing.','OCR completado. Revisa el texto antes de guardar o importar.'),'otto-intake-ok');
    } catch(e) { console.error('OTTO unified OCR',e); progress(root,tx('OCR could not complete. Check the file and connection.','No se pudo completar el OCR. Revisa el archivo y la conexión.'),'otto-intake-error'); }
    finally { if(worker) try{await worker.terminate();}catch(_){} }
    $('[data-ocr-copy]',root).addEventListener('click',async()=>{if(out.value&&navigator.clipboard)await navigator.clipboard.writeText(out.value);});
    $('[data-ocr-employees]',root).addEventListener('click',()=>{const rows=out.value.split(/\n+/).map(s=>s.trim()).filter(s=>s && !/^---/.test(s)).map(line=>({name:line,phone:'',email:'',employeeId:'',lang:'es'})); reviewEmployees(rows,file.name);});
    const saveBtn=$('[data-ocr-save]',root); if(saveBtn) saveBtn.addEventListener('click',async()=>{try{const b=bridge();const fileId=await b.storeFile(file);const rec=b.add('documents',{jobId,name:file.name||`scan-${Date.now()}`,kind:'scan',mime:file.type||'',size:file.size||0,ocr:out.value});rec.fileId=fileId;b.save();progress(root,tx('Saved to job.','Guardado en el trabajo.'),'otto-intake-ok');}catch(e){progress(root,tx('Could not save to job.','No se pudo guardar en el trabajo.'),'otto-intake-error');}});
  }

  const observer = new MutationObserver(() => queueMicrotask(ensureLauncher));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#otto-unified-intake-overlay'))close();});
  window.ottoUnifiedIntake = { open: openIntake, routeFile, importSpreadsheet, runOCR };
  setTimeout(ensureLauncher,0);
})();
