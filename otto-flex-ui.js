/* OTTO CRM — flexible owner/office UI + import/OCR layer.
   Additive by design: preserves the existing CRM and home runtime while adding
   requested flexibility and data-entry helpers. */
(function () {
  'use strict';

  const bridge = () => window.__ottoFlexBridge || {};
  let panelState = 'normal'; // normal | minimized | maximized
  let wallpaper = { mode: 'fit', zoom: 100, x: 50, y: 50 };
  let sidebarOpen = false;
  let observerBusy = false;
  const originalText = new WeakMap();

  const PANEL_TABS = [
    ['panel-today', 'fa-calendar-day', 'Today', 'Hoy'],
    ['panel-field', 'fa-users-gear', 'Field Workers', 'Trabajadores'],
    ['panel-inbox', 'fa-inbox', 'Inbox', 'Bandeja'],
    ['panel-tools', 'fa-toolbox', 'Tools', 'Herramientas']
  ];

  const MENU_GROUPS = [
    ['Money', 'Dinero', [
      ['estimates', 'fa-file-signature', 'Estimates', 'Estimados'],
      ['invoices', 'fa-file-invoice-dollar', 'Invoices', 'Facturas'],
      ['payments', 'fa-credit-card', 'Payments', 'Pagos'],
      ['checks', 'fa-money-check', 'Checks', 'Cheques'],
      ['payroll', 'fa-money-check-dollar', 'Payroll', 'Nómina']
    ]],
    ['Work', 'Trabajo', [
      ['jobs', 'fa-screwdriver-wrench', 'Jobs', 'Trabajos'],
      ['customers', 'fa-users', 'Customers', 'Clientes'],
      ['calls', 'fa-phone', 'Calls', 'Llamadas'],
      ['followups', 'fa-bell', 'Follow-ups', 'Seguimientos'],
      ['workflows', 'fa-diagram-project', 'Workflows', 'Flujos'],
      ['map', 'fa-map-location-dot', 'Map', 'Mapa']
    ]],
    ['Team', 'Equipo', [
      ['team', 'fa-user-gear', 'Team', 'Equipo'],
      ['__attendance', 'fa-user-clock', 'Attendance', 'Asistencia'],
      ['kpis', 'fa-chart-pie', 'Team KPIs', 'Indicadores'],
      ['urgent', 'fa-bolt', 'Urgent', 'Urgente']
    ]],
    ['Business', 'Negocio', [
      ['reports', 'fa-chart-line', 'Reports', 'Reportes'],
      ['alerts', 'fa-triangle-exclamation', 'Alerts', 'Alertas'],
      ['knowledge', 'fa-book', 'Knowledge', 'Conocimiento'],
      ['emails', 'fa-envelope-open-text', 'Email', 'Correo'],
      ['audit', 'fa-clipboard-list', 'Audit trail', 'Auditoría'],
      ['backups', 'fa-database', 'Backups', 'Respaldos']
    ]],
    ['System', 'Sistema', [
      ['assistant', 'fa-wand-magic-sparkles', 'Ask OTTO', 'Preguntar a OTTO'],
      ['__ocr', 'fa-file-lines', 'Document OCR', 'OCR de documentos'],
      ['__wallpaper', 'fa-image', 'Wallpaper controls', 'Controles de fondo'],
      ['settings', 'fa-gear', 'Settings', 'Ajustes']
    ]]
  ];

  /* Exact leftovers that were historically hard-coded outside the native t()
     dictionary. Native translated output is never touched. */
  const ES_EXACT = new Map([
    ['OWNERS', 'DUEÑOS'], ['OPS & IT', 'OPERACIONES Y TI'], ['FIELD', 'CAMPO'],
    ['Original data', 'Datos originales'], ['records', 'registros'], ['record', 'registro'],
    ['Team locations', 'Ubicaciones del equipo'], ['Worker', 'Trabajador'],
    ['Field worker', 'Trabajador de campo'], ['No job today', 'Sin trabajo hoy'],
    ['Needs attention', 'Requiere atención'], ['Time off', 'Tiempo libre'],
    ['Back to panels', 'Volver a los paneles'], ['Back to Home', 'Volver al inicio'],
    ['Home sections', 'Secciones de inicio'], ['Money', 'Dinero'], ['Work', 'Trabajo'],
    ['Team', 'Equipo'], ['Business', 'Negocio'], ['System', 'Sistema'],
    ['Today', 'Hoy'], ['Field Workers', 'Trabajadores'], ['Inbox', 'Bandeja'],
    ['Tools', 'Herramientas'], ['Attendance', 'Asistencia'], ['Not checked in', 'Sin entrada'],
    ['Checked in', 'Entrada registrada'], ['Checked out', 'Salida registrada'],
    ['Import employees', 'Importar empleados'], ['Employee import', 'Importación de empleados'],
    ['Document OCR', 'OCR de documentos'], ['Wallpaper controls', 'Controles de fondo'],
    ['Close', 'Cerrar'], ['Minimize', 'Minimizar'], ['Maximize', 'Maximizar'], ['Restore', 'Restaurar'],
    ['Fit', 'Ajustar'], ['Fill', 'Llenar'], ['Zoom', 'Zoom'], ['Position', 'Posición'],
    ['Name', 'Nombre'], ['Phone', 'Teléfono'], ['Email', 'Correo'], ['Role', 'Rol'],
    ['Language', 'Idioma'], ['Status', 'Estado'], ['Last event', 'Último evento'],
    ['Import', 'Importar'], ['Cancel', 'Cancelar'], ['Copy text', 'Copiar texto'],
    ['Download text', 'Descargar texto'], ['Select image or PDF', 'Seleccionar imagen o PDF'],
    ['No file selected', 'Ningún archivo seleccionado'], ['Processing…', 'Procesando…']
  ]);

  function lang() {
    try { return bridge().getLang ? bridge().getLang() : (typeof window.lang === 'string' ? window.lang : 'en'); }
    catch (_) { return 'en'; }
  }
  function es() { return lang() === 'es'; }
  function tx(en, spa) { return es() ? spa : en; }
  function session() { try { return bridge().getSession ? bridge().getSession() : null; } catch (_) { return null; } }
  function route() { try { return bridge().getRoute ? bridge().getRoute() : null; } catch (_) { return null; } }
  function db() { try { return bridge().getDb ? bridge().getDb() : null; } catch (_) { return null; } }
  function isOwnerOffice() { const s = session(); return !!(s && s.role !== 'field'); }
  function onHome() { const r = route(); return !!(r && r.view === 'home'); }
  function allowed(view) { try { return bridge().can ? bridge().can(view) : true; } catch (_) { return true; } }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function norm(v) { return String(v == null ? '' : v).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function nowISO() { return new Date().toISOString(); }

  function goHome() {
    closeSidebar();
    panelState = 'normal';
    document.body.classList.remove('otto-window-maximized');
    if (bridge().nav) bridge().nav('home');
  }

  function navTo(view) {
    if (view === '__attendance') return openAttendance();
    if (view === '__ocr') return openOCR();
    if (view === '__wallpaper') return toggleWallpaperControls(true);
    if (!allowed(view)) return;
    closeSidebar();
    if (bridge().nav) bridge().nav(view);
  }

  function applyUserTheme() {
    const s = session();
    document.body.removeAttribute('data-otto-user-theme');
    if (!s) return;
    if (s.id === 'ops-1') document.body.setAttribute('data-otto-user-theme', 'sarai');
    else if (s.id === 'owner-2') document.body.setAttribute('data-otto-user-theme', 'julio');
  }

  function bindLogo() {
    document.querySelectorAll('.crystal-logo').forEach(logo => {
      if (logo.dataset.ottoFlexHome === '1') return;
      logo.dataset.ottoFlexHome = '1';
      logo.classList.add('otto-logo-home');
      logo.setAttribute('role', 'button');
      logo.setAttribute('tabindex', '0');
      logo.setAttribute('aria-label', tx('Go to OTTO Home', 'Ir al inicio de OTTO'));
      const activate = e => {
        if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault(); goHome();
      };
      logo.addEventListener('click', activate);
      logo.addEventListener('keydown', activate);
    });
  }

  function ensureMenuTrigger() {
    if (!isOwnerOffice()) return;
    const logo = document.querySelector('.topbar .crystal-logo');
    if (!logo || document.getElementById('otto-flex-menu-trigger')) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.id = 'otto-flex-menu-trigger'; btn.className = 'otto-flex-menu-trigger';
    btn.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
    btn.setAttribute('aria-label', tx('Open all menus', 'Abrir todos los menús'));
    btn.addEventListener('click', toggleSidebar);
    logo.insertAdjacentElement('afterend', btn);
  }

  function sidebarMarkup() {
    const groups = MENU_GROUPS.map(([en, spa, items]) => {
      const visible = items.filter(([view]) => view.startsWith('__') || allowed(view));
      if (!visible.length) return '';
      return `<section class="otto-flex-menu-group"><h3 class="otto-flex-menu-title">${esc(tx(en, spa))}</h3>${visible.map(([view, icon, a, b]) => `<button class="otto-flex-menu-item" type="button" data-flex-nav="${esc(view)}"><i class="fas ${icon}" aria-hidden="true"></i><span>${esc(tx(a,b))}</span></button>`).join('')}</section>`;
    }).join('');
    return `<div class="otto-flex-sidebar-head"><strong class="otto-flex-sidebar-title">${esc(tx('OTTO Menu','Menú OTTO'))}</strong><button class="otto-flex-iconbtn" type="button" data-flex-close-sidebar aria-label="${esc(tx('Close','Cerrar'))}"><i class="fas fa-xmark"></i></button></div><div class="otto-flex-menu-scroll"><button class="otto-flex-menu-item" type="button" data-flex-home><i class="fas fa-house"></i><span>${esc(tx('Home','Inicio'))}</span></button>${groups}</div>`;
  }

  function ensureSidebar() {
    if (document.getElementById('otto-flex-sidebar')) return;
    const side = document.createElement('aside'); side.id='otto-flex-sidebar'; side.className='otto-flex-sidebar'; side.setAttribute('aria-label', tx('OTTO menu','Menú OTTO')); side.innerHTML=sidebarMarkup();
    const backdrop = document.createElement('div'); backdrop.id='otto-flex-sidebar-backdrop'; backdrop.className='otto-flex-sidebar-backdrop';
    document.body.append(side, backdrop);
    side.addEventListener('click', e => {
      const nav = e.target.closest('[data-flex-nav]'); if (nav) navTo(nav.dataset.flexNav);
      if (e.target.closest('[data-flex-close-sidebar]')) closeSidebar();
      if (e.target.closest('[data-flex-home]')) goHome();
    });
    backdrop.addEventListener('click', closeSidebar);
  }

  function toggleSidebar() {
    ensureSidebar(); sidebarOpen = !sidebarOpen;
    document.getElementById('otto-flex-sidebar')?.classList.toggle('is-open', sidebarOpen);
    document.getElementById('otto-flex-sidebar-backdrop')?.classList.toggle('is-open', sidebarOpen);
  }
  function closeSidebar() {
    sidebarOpen=false;
    document.getElementById('otto-flex-sidebar')?.classList.remove('is-open');
    document.getElementById('otto-flex-sidebar-backdrop')?.classList.remove('is-open');
  }

  function ensureHomeTabs() {
    let tabs=document.getElementById('otto-flex-tabs');
    if (!isOwnerOffice() || !onHome()) { tabs?.remove(); return; }
    if (!tabs) { tabs=document.createElement('nav'); tabs.id='otto-flex-tabs'; tabs.className='otto-flex-tabs'; tabs.setAttribute('aria-label',tx('Home tabs','Pestañas de inicio')); document.body.appendChild(tabs); }
    tabs.innerHTML=PANEL_TABS.map(([id,icon,en,spa])=>`<button type="button" class="otto-flex-tab${document.getElementById(`tab-${id}`)?.classList.contains('is-open')?' is-active':''}" data-flex-panel="${id}"><i class="fas ${icon}"></i><span>${esc(tx(en,spa))}</span></button>`).join('');
    tabs.onclick=e=>{ const b=e.target.closest('[data-flex-panel]'); if(!b)return; document.querySelector(`[data-otto-action="open-panel"][data-otto-panel="${b.dataset.flexPanel}"]`)?.click(); };
  }

  function ensureBackButton() {
    if (!isOwnerOffice() || onHome() || document.getElementById('otto-back-home') || document.getElementById('otto-flex-back-home')) return;
    const bar=document.querySelector('.topbar'); if(!bar)return;
    const btn=document.createElement('button'); btn.type='button';btn.id='otto-flex-back-home';btn.className='otto-back-home';btn.innerHTML=`<span aria-hidden="true">←</span><span>${esc(tx('Back to Home','Volver al inicio'))}</span>`;btn.addEventListener('click',goHome);bar.insertBefore(btn,bar.firstChild);
  }

  function ensureWindowControls() {
    const panel=document.querySelector('.otto-panel');
    if(!panel){ panelState='normal';document.body.classList.remove('otto-window-maximized');return; }
    panel.classList.toggle('is-minimized',panelState==='minimized');
    panel.classList.toggle('is-maximized',panelState==='maximized');
    let head=panel.querySelector('.otto-panel-head'); if(!head)return;
    let controls=head.querySelector('.otto-window-controls');
    if(!controls){ controls=document.createElement('div');controls.className='otto-window-controls';head.appendChild(controls); }
    const maxed=panelState==='maximized', min=panelState==='minimized';
    controls.innerHTML=`<button type="button" class="otto-window-control" data-flex-window="min" aria-label="${esc(tx(min?'Restore':'Minimize',min?'Restaurar':'Minimizar'))}"><i class="fas ${min?'fa-window-restore':'fa-window-minimize'}"></i></button><button type="button" class="otto-window-control" data-flex-window="max" aria-label="${esc(tx(maxed?'Restore':'Maximize',maxed?'Restaurar':'Maximizar'))}"><i class="fas ${maxed?'fa-window-restore':'fa-expand'}"></i></button>`;
    controls.onclick=e=>{ const b=e.target.closest('[data-flex-window]'); if(!b)return;e.stopPropagation(); if(b.dataset.flexWindow==='min') panelState=panelState==='minimized'?'normal':'minimized'; else panelState=panelState==='maximized'?'normal':'maximized'; document.body.classList.toggle('otto-window-maximized',panelState==='maximized'); ensureWindowControls(); };
  }

  function applyWallpaper() {
    const root=document.documentElement;
    if(wallpaper.mode==='fit') root.style.setProperty('--otto-wallpaper-size','contain');
    else if(wallpaper.mode==='fill') root.style.setProperty('--otto-wallpaper-size','cover');
    else root.style.setProperty('--otto-wallpaper-size',`${wallpaper.zoom}% auto`);
    root.style.setProperty('--otto-wallpaper-x',`${wallpaper.x}%`);
    root.style.setProperty('--otto-wallpaper-y',`${wallpaper.y}%`);
  }

  function ensureWallpaperControls() {
    if(document.getElementById('otto-wallpaper-controls')) return;
    const box=document.createElement('section');box.id='otto-wallpaper-controls';box.className='otto-wallpaper-controls';
    box.innerHTML=`<div class="otto-wallpaper-head"><strong>${esc(tx('Wallpaper controls','Controles de fondo'))}</strong><button class="otto-flex-iconbtn" type="button" data-wall-close><i class="fas fa-xmark"></i></button></div><div class="otto-flex-actions"><button class="otto-flex-btn" type="button" data-wall-mode="fit">${esc(tx('Fit','Ajustar'))}</button><button class="otto-flex-btn" type="button" data-wall-mode="fill">${esc(tx('Fill','Llenar'))}</button><button class="otto-flex-btn" type="button" data-wall-mode="zoom">${esc(tx('Zoom','Zoom'))}</button></div><div class="otto-wallpaper-row"><label>${esc(tx('Zoom','Zoom'))}</label><input type="range" min="80" max="220" value="100" data-wall-zoom><output data-wall-zoom-out>100%</output></div><div class="otto-wallpaper-row"><label>${esc(tx('Position','Posición'))}</label><div class="otto-wallpaper-buttons"><button data-wall-pan="up">↑</button><button data-wall-pan="left">←</button><button data-wall-pan="right">→</button><button data-wall-pan="down">↓</button></div></div><div class="otto-flex-actions"><button class="otto-flex-btn" type="button" data-wall-reset>${esc(tx('Reset','Restablecer'))}</button></div>`;
    document.body.appendChild(box);
    box.addEventListener('click',e=>{ const mode=e.target.closest('[data-wall-mode]');if(mode){wallpaper.mode=mode.dataset.wallMode;applyWallpaper();} const pan=e.target.closest('[data-wall-pan]');if(pan){ const step=5; if(pan.dataset.wallPan==='up')wallpaper.y=Math.max(0,wallpaper.y-step);if(pan.dataset.wallPan==='down')wallpaper.y=Math.min(100,wallpaper.y+step);if(pan.dataset.wallPan==='left')wallpaper.x=Math.max(0,wallpaper.x-step);if(pan.dataset.wallPan==='right')wallpaper.x=Math.min(100,wallpaper.x+step);applyWallpaper(); } if(e.target.closest('[data-wall-reset]')){wallpaper={mode:'fit',zoom:100,x:50,y:50};box.querySelector('[data-wall-zoom]').value='100';box.querySelector('[data-wall-zoom-out]').textContent='100%';applyWallpaper();} if(e.target.closest('[data-wall-close]'))toggleWallpaperControls(false); });
    box.querySelector('[data-wall-zoom]').addEventListener('input',e=>{wallpaper.zoom=Number(e.target.value)||100;wallpaper.mode='zoom';box.querySelector('[data-wall-zoom-out]').textContent=`${wallpaper.zoom}%`;applyWallpaper();});
  }
  function toggleWallpaperControls(force){ ensureWallpaperControls();const box=document.getElementById('otto-wallpaper-controls');const open=force===undefined?!box.classList.contains('is-open'):force;box.classList.toggle('is-open',open);closeSidebar(); }

  function dialog(title,body,actions='') {
    closeDialog();const overlay=document.createElement('div');overlay.className='otto-flex-overlay';overlay.id='otto-flex-overlay';overlay.innerHTML=`<section class="otto-flex-dialog" role="dialog" aria-modal="true"><div class="otto-flex-dialog-head"><h2>${esc(title)}</h2><button class="otto-flex-iconbtn" type="button" data-flex-dialog-close aria-label="${esc(tx('Close','Cerrar'))}"><i class="fas fa-xmark"></i></button></div>${body}${actions?`<div class="otto-flex-actions">${actions}</div>`:''}</section>`;document.body.appendChild(overlay);overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('[data-flex-dialog-close]'))closeDialog();});return overlay;
  }
  function closeDialog(){document.getElementById('otto-flex-overlay')?.remove();}

  async function loadXLSX(){ if(window.XLSX)return window.XLSX; if(window.loadXLSX)return window.loadXLSX(); return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.crossOrigin='anonymous';s.onload=()=>resolve(window.XLSX);s.onerror=()=>reject(new Error('xlsx'));document.head.appendChild(s);}); }
  function parseCSV(text){const lines=text.replace(/\r/g,'').split('\n').filter(Boolean);if(!lines.length)return[];const split=line=>{const out=[];let cur='',q=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'&&line[i+1]==='"'&&q){cur+='"';i++;}else if(c==='"')q=!q;else if(c===','&&!q){out.push(cur);cur='';}else cur+=c;}out.push(cur);return out;};const headers=split(lines[0]);return lines.slice(1).map(l=>Object.fromEntries(headers.map((h,i)=>[h,split(l)[i]||''])));}
  async function readEmployeeFile(file){ if(/\.csv$/i.test(file.name))return parseCSV(await file.text());const XLSX=await loadXLSX();const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];return XLSX.utils.sheet_to_json(ws,{defval:''}); }
  function pick(row,aliases){const keys=Object.keys(row);for(const alias of aliases){const nk=norm(alias);const key=keys.find(k=>norm(k)===nk||norm(k).includes(nk));if(key&&String(row[key]).trim())return String(row[key]).trim();}return'';}
  function mapEmployee(row){let name=pick(row,['name','employee name','employee','full name','nombre','nombre empleado']);if(!name){const first=pick(row,['first name','first','nombre']);const last=pick(row,['last name','last','apellido']);name=`${first} ${last}`.trim();}const roleRaw=norm(pick(row,['role','position','job title','cargo','puesto']));let role='field';if(roleRaw.includes('owner')||roleRaw.includes('dueno'))role='owner';else if(roleRaw.includes('office')||roleRaw.includes('manager')||roleRaw.includes('gerente')||roleRaw.includes('operations'))role='office';const langRaw=norm(pick(row,['language','lang','idioma']));return {name,phone:pick(row,['phone','mobile','cell','telephone','telefono','celular']),email:pick(row,['email','e-mail','correo']),employeeId:pick(row,['employee id','employee number','emp id','id empleado','numero empleado']),role,lang:langRaw.startsWith('en')||langRaw.includes('english')||langRaw.includes('ingles')?'en':'es',hourlyRate:pick(row,['hourly rate','rate','pay rate','tarifa','pago por hora']),raw:row};}
  function existingMatch(emp,users){const email=norm(emp.email),phone=String(emp.phone||'').replace(/\D/g,''),eid=norm(emp.employeeId),name=norm(emp.name);return users.find(u=>(eid&&norm(u.employeeId)===eid)||(email&&norm(u.email)===email)||(phone&&String(u.phone||'').replace(/\D/g,'')===phone)||(name&&norm(u.name)===name));}

  async function importEmployees(){
    const input=document.createElement('input');input.type='file';input.accept='.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv';input.onchange=async()=>{const file=input.files&&input.files[0];if(!file)return;let raw;try{raw=await readEmployeeFile(file);}catch(e){alert(tx('I could not read that spreadsheet.','No pude leer esa hoja de cálculo.'));return;}const users=db()?.users||[];const mapped=raw.map(mapEmployee).filter(x=>x.name).map(x=>({...x,existing:existingMatch(x,users)}));if(!mapped.length){alert(tx('No employee rows were found.','No se encontraron filas de empleados.'));return;}const rows=mapped.map((x,i)=>`<tr class="${x.existing?'otto-import-duplicate':''}"><td><input type="checkbox" data-import-row="${i}" checked></td><td>${esc(x.name)}</td><td>${esc(x.phone)}</td><td>${esc(x.email)}</td><td>${esc(x.employeeId)}</td><td>${esc(x.role==='field'?tx('Field Worker','Trabajador'):x.role)}</td><td>${x.existing?esc(tx('Update existing','Actualizar existente')):esc(tx('Create','Crear'))}</td></tr>`).join('');const overlay=dialog(tx('Employee import','Importación de empleados'),`<p>${esc(tx('Review the spreadsheet before OTTO creates or updates the team roster. PINs are never imported.','Revisa la hoja antes de que OTTO cree o actualice el equipo. Los PIN nunca se importan.'))}</p><div class="otto-flex-table-wrap"><table class="otto-flex-table"><thead><tr><th></th><th>${esc(tx('Name','Nombre'))}</th><th>${esc(tx('Phone','Teléfono'))}</th><th>${esc(tx('Email','Correo'))}</th><th>ID</th><th>${esc(tx('Role','Rol'))}</th><th>${esc(tx('Action','Acción'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`,`<button class="otto-flex-btn otto-flex-primary" type="button" data-confirm-employee-import>${esc(tx('Import selected employees','Importar empleados seleccionados'))}</button><button class="otto-flex-btn" type="button" data-flex-dialog-close>${esc(tx('Cancel','Cancelar'))}</button>`);overlay.querySelector('[data-confirm-employee-import]').addEventListener('click',()=>confirmEmployeeImport(mapped,overlay));};input.click();
  }

  function confirmEmployeeImport(mapped,overlay){const b=bridge();if(!b.add||!b.update){alert(tx('The CRM data bridge is not available.','El enlace de datos del CRM no está disponible.'));return;}const data=db();let created=0,updated=0;overlay.querySelectorAll('[data-import-row]:checked').forEach(cb=>{const emp=mapped[Number(cb.dataset.importRow)];if(!emp)return;const fields={name:emp.name,role:emp.role||'field',lang:emp.lang||'es'};if(emp.phone)fields.phone=emp.phone;if(emp.email)fields.email=emp.email;if(emp.employeeId)fields.employeeId=emp.employeeId;if(emp.hourlyRate&&!Number.isNaN(Number(emp.hourlyRate)))fields.hourlyRate=Number(emp.hourlyRate);let user=emp.existing;if(user){b.update('users',user.id,fields);updated++;}else{user=b.add('users',fields);created++;}if(user&&user.role==='field'){const roster=(data.job_events||[]).some(e=>e&&e.type==='attendance_roster'&&(e.userId===user.id||e.workerId===user.id));if(!roster)b.add('job_events',{type:'attendance_roster',userId:user.id,workerId:user.id,source:'employee_spreadsheet',ts:nowISO()});}});if(b.save)b.save();if(b.render)b.render();closeDialog();setTimeout(()=>{alert(tx(`${created} created, ${updated} updated. They are now in the field-worker attendance roster.`,`${created} creados, ${updated} actualizados. Ya están en la lista de asistencia de campo.`));},0);}

  function todaysAttendance(){const data=db()||{};const users=(data.users||[]).filter(u=>u&&u.role==='field');const today=new Date().toISOString().slice(0,10);return users.map(u=>{const events=(data.job_events||[]).filter(e=>e&&(e.userId===u.id||e.workerId===u.id)&&(e.type==='check_in'||e.type==='check_out')&&String(e.ts||'').slice(0,10)===today).sort((a,b)=>new Date(a.ts)-new Date(b.ts));const last=events[events.length-1];return {u,last,status:!last?'none':last.type==='check_in'?'in':'out'};});}
  function openAttendance(){closeSidebar();const rows=todaysAttendance().map(({u,last,status})=>`<tr><td>${esc(u.name||'')}</td><td>${esc(u.phone||'')}</td><td><span class="otto-status is-${status}">${esc(status==='in'?tx('Checked in','Entrada registrada'):status==='out'?tx('Checked out','Salida registrada'):tx('Not checked in','Sin entrada'))}</span></td><td>${last?esc(new Date(last.ts).toLocaleString(es()?'es-US':'en-US')):'—'}</td></tr>`).join('');dialog(tx('Attendance','Asistencia'),`<p>${esc(tx('This roster uses OTTO’s existing real job check-in/check-out events. Imported employees appear immediately without creating fake attendance.','Esta lista usa los eventos reales de entrada/salida de trabajos. Los empleados importados aparecen de inmediato sin crear asistencia falsa.'))}</p><div class="otto-flex-actions"><button class="otto-flex-btn otto-flex-primary" type="button" data-att-import>${esc(tx('Import employees','Importar empleados'))}</button></div><div class="otto-flex-table-wrap"><table class="otto-flex-table"><thead><tr><th>${esc(tx('Name','Nombre'))}</th><th>${esc(tx('Phone','Teléfono'))}</th><th>${esc(tx('Status','Estado'))}</th><th>${esc(tx('Last event','Último evento'))}</th></tr></thead><tbody>${rows||`<tr><td colspan="4">${esc(tx('No field workers yet.','Aún no hay trabajadores de campo.'))}</td></tr>`}</tbody></table></div>`).querySelector('[data-att-import]').addEventListener('click',()=>{closeDialog();importEmployees();});}

  async function loadTesseract(){if(window.Tesseract)return window.Tesseract;return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';s.crossOrigin='anonymous';s.onload=()=>resolve(window.Tesseract);s.onerror=()=>reject(new Error('ocr'));document.head.appendChild(s);});}
  async function renderPdfPages(file){if(!window.pdfjsLib)throw new Error('pdfjs');const buf=await file.arrayBuffer();const pdf=await window.pdfjsLib.getDocument({data:buf}).promise;const pages=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const viewport=page.getViewport({scale:1.7});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;pages.push(canvas);}return pages;}
  function downloadText(text,name){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(name||'otto-ocr').replace(/\.[^.]+$/,'')+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function openOCR(){closeSidebar();const overlay=dialog(tx('Document OCR','OCR de documentos'),`<p>${esc(tx('Upload a photo, scanned image, or PDF. OTTO will extract selectable text in the browser.','Sube una foto, imagen escaneada o PDF. OTTO extraerá texto seleccionable en el navegador.'))}</p><div class="otto-flex-field"><label>${esc(tx('Select image or PDF','Seleccionar imagen o PDF'))}</label><input type="file" accept="image/*,.pdf,application/pdf" data-ocr-file></div><div class="otto-ocr-progress" data-ocr-progress></div><div class="otto-flex-field"><label>${esc(tx('OCR text','Texto OCR'))}</label><textarea data-ocr-output placeholder="${esc(tx('Extracted text appears here.','El texto extraído aparecerá aquí.'))}"></textarea></div>`,`<button class="otto-flex-btn otto-flex-primary" type="button" data-ocr-run>${esc(tx('Run OCR','Ejecutar OCR'))}</button><button class="otto-flex-btn" type="button" data-ocr-copy>${esc(tx('Copy text','Copiar texto'))}</button><button class="otto-flex-btn" type="button" data-ocr-download>${esc(tx('Download text','Descargar texto'))}</button>`);const file=overlay.querySelector('[data-ocr-file]'),out=overlay.querySelector('[data-ocr-output]'),progress=overlay.querySelector('[data-ocr-progress]');overlay.querySelector('[data-ocr-run]').addEventListener('click',async()=>{const f=file.files&&file.files[0];if(!f){progress.textContent=tx('Choose a file first.','Selecciona un archivo primero.');return;}progress.textContent=tx('Loading OCR engine…','Cargando motor OCR…');let T;try{T=await loadTesseract();}catch(e){progress.textContent=tx('OCR engine could not load.','No se pudo cargar el motor OCR.');return;}let sources;try{sources=f.type==='application/pdf'||/\.pdf$/i.test(f.name)?await renderPdfPages(f):[f];}catch(e){progress.textContent=tx('Could not read that file.','No se pudo leer ese archivo.');return;}let text='';for(let i=0;i<sources.length;i++){progress.textContent=tx(`Processing page ${i+1} of ${sources.length}…`,`Procesando página ${i+1} de ${sources.length}…`);const r=await T.recognize(sources[i],'eng+spa',{logger:m=>{if(m.status==='recognizing text'&&Number.isFinite(m.progress))progress.textContent=tx(`OCR ${Math.round(m.progress*100)}% — page ${i+1}/${sources.length}`,`OCR ${Math.round(m.progress*100)}% — página ${i+1}/${sources.length}`);}});text+=(sources.length>1?`\n\n--- ${tx('Page','Página')} ${i+1} ---\n`:'')+(r.data?.text||'');out.value=text.trim();}progress.textContent=tx('OCR complete.','OCR completado.');});overlay.querySelector('[data-ocr-copy]').addEventListener('click',async()=>{if(out.value)await navigator.clipboard?.writeText(out.value);});overlay.querySelector('[data-ocr-download]').addEventListener('click',()=>{if(out.value)downloadText(out.value,file.files?.[0]?.name);});}

  function ensureTeamImportBar(){const r=route();if(!isOwnerOffice()||!r||r.view!=='team')return;if(document.querySelector('.otto-team-import-bar'))return;const main=document.getElementById('main');const head=main?.querySelector('.pagehead');if(!head)return;const bar=document.createElement('div');bar.className='otto-team-import-bar';bar.innerHTML=`<button class="otto-flex-btn otto-flex-primary" type="button" data-team-import><i class="fas fa-file-excel"></i> ${esc(tx('Import employees','Importar empleados'))}</button><button class="otto-flex-btn" type="button" data-team-attendance><i class="fas fa-user-clock"></i> ${esc(tx('Attendance','Asistencia'))}</button>`;head.insertAdjacentElement('afterend',bar);bar.querySelector('[data-team-import]').addEventListener('click',importEmployees);bar.querySelector('[data-team-attendance]').addEventListener('click',openAttendance);}

  function translateLeftovers(){const spanish=es();const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION'].includes(p.tagName)||p.closest('[contenteditable="true"]'))return NodeFilter.FILTER_REJECT;return n.nodeValue&&n.nodeValue.trim()?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}});const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){if(!originalText.has(n))originalText.set(n,n.nodeValue);const orig=originalText.get(n);if(!spanish){if(n.nodeValue!==orig)n.nodeValue=orig;continue;}const trimmed=orig.trim();const translated=ES_EXACT.get(trimmed);if(translated){const lead=orig.match(/^\s*/)?.[0]||'',trail=orig.match(/\s*$/)?.[0]||'';n.nodeValue=lead+translated+trail;}}document.querySelectorAll('.crystal-logo').forEach(x=>x.setAttribute('aria-label',tx('Go to OTTO Home','Ir al inicio de OTTO')));}

  function refresh(){if(observerBusy)return;observerBusy=true;try{applyUserTheme();bindLogo();ensureMenuTrigger();ensureSidebar();ensureHomeTabs();ensureBackButton();ensureWindowControls();ensureWallpaperControls();ensureTeamImportBar();translateLeftovers();applyWallpaper();}finally{observerBusy=false;}}
  const obs=new MutationObserver(()=>queueMicrotask(refresh));
  obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.getElementById('otto-flex-overlay'))closeDialog();else if(sidebarOpen)closeSidebar();else if(panelState==='maximized'){panelState='normal';document.body.classList.remove('otto-window-maximized');ensureWindowControls();}}});
  document.addEventListener('click',e=>{if(e.target.closest('#lang-en,#lang-es,.langtoggle button'))setTimeout(refresh,0);});

  window.ottoFlex={refresh,goHome,openAttendance,importEmployees,openOCR,toggleWallpaperControls};
  setTimeout(refresh,0);
})();
