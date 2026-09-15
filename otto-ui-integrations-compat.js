/* OTTO UI integration compatibility layer.
   Keeps the existing secure customer portal as the source of truth while adding
   the premium summary cards, and enriches the record drawer with real files. */
(function () {
  'use strict';

  const B=()=>window.__ottoPremiumOpsBridge||{};
  const db=()=>{try{return B().getDb?B().getDb()||{}:{}}catch(_){return{}}};
  const ses=()=>{try{return B().getSession?B().getSession():null}catch(_){return null}};
  const lng=()=>{try{return B().getLang&&B().getLang()==='es'?'es':'en'}catch(_){return'en'}};
  const tx=(en,es)=>lng()==='es'?es:en;
  const arr=name=>Array.isArray(db()[name])?db()[name]:[];
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat(lng()==='es'?'es-US':'en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);

  function customerPortalSummary(){
    const s=ses();
    if(!s||s.role!=='customer')return;
    const main=document.getElementById('main');
    if(!main)return;

    /* The new visual layer originally rendered its own portal. Restore the
       already-secured PR #164 portal once, then mark that existing portal as
       enhanced so the general UI observer leaves it alone. */
    if(main.querySelector(':scope > .ui-portal-home')&&!main.querySelector('.otto-portal-shell')){
      if(window.__ottoPremiumOps&&typeof window.__ottoPremiumOps.renderOps==='function')window.__ottoPremiumOps.renderOps();
    }

    const shell=main.querySelector('.otto-portal-shell');
    const portal=shell&&shell.querySelector('.otto-portal-main');
    if(!portal)return;
    portal.classList.add('ui-portal-home');
    if(portal.querySelector('.ui-portal-grid[data-ui-secure-portal-summary]'))return;

    const cid=s.customerId||(s.profile&&s.profile.customerId);
    const jobs=arr('jobs').filter(j=>j&&j.customerId===cid);
    const estimates=arr('estimates').filter(e=>e&&(e.customerId===cid||jobs.some(j=>j.id===e.jobId)));
    const invoices=arr('invoices').filter(i=>i&&(i.customerId===cid||jobs.some(j=>j.id===i.jobId)));
    const completed=jobs.filter(j=>j.status==='completed');
    const balance=invoices.reduce((sum,i)=>sum+Math.max(0,Number(i.amount||i.total||0)-Number(i.paid||0)),0);
    const sections=Array.from(portal.querySelectorAll(':scope > .otto-portal-section'));
    if(sections[1])sections[1].id='portal-upcoming';
    if(sections[2])sections[2].id='portal-money';
    if(sections[3])sections[3].id='portal-history';
    if(sections[4])sections[4].id='portal-request';

    const grid=document.createElement('div');
    grid.className='ui-portal-grid';
    grid.dataset.uiSecurePortalSummary='1';
    grid.innerHTML=`<button class="ui-portal-card" data-ui-compat-scroll="portal-money"><i class="fas fa-file-signature" aria-hidden="true"></i><b>${estimates.length}</b><span>${esc(tx('Estimates','Estimados'))}</span></button>
      <button class="ui-portal-card" data-ui-compat-scroll="portal-money"><i class="fas fa-file-invoice-dollar" aria-hidden="true"></i><b>${esc(money(balance))}</b><span>${esc(tx('Balance due','Saldo pendiente'))}</span></button>
      <button class="ui-portal-card" data-ui-compat-scroll="portal-history"><i class="fas fa-clock-rotate-left" aria-hidden="true"></i><b>${completed.length}</b><span>${esc(tx('Completed jobs','Trabajos completados'))}</span></button>
      <button class="ui-portal-card accent" data-ui-compat-scroll="portal-request"><i class="fas fa-plus" aria-hidden="true"></i><b>+</b><span>${esc(tx('Request service','Solicitar servicio'))}</span></button>`;
    (sections[0]||portal.firstChild)?.insertAdjacentElement('afterend',grid);
  }

  function drawerFiles(){
    const drawer=document.getElementById('otto-context-drawer');
    if(!drawer||drawer.dataset.uiFilesEnhanced==='1')return;
    const openJob=drawer.querySelector('[data-ui-open="job"][data-id]');
    if(!openJob)return;
    const jobId=openJob.dataset.id;
    const photos=arr('photos').filter(p=>p&&p.jobId===jobId);
    const docs=arr('documents').filter(d=>d&&d.jobId===jobId);
    const files=photos.map(p=>({kind:'photo',id:p.id,name:p.caption||p.name||tx('Job photo','Foto del trabajo'),icon:'fa-image'}))
      .concat(docs.map(d=>({kind:'document',id:d.id,name:d.name||d.filename||d.title||tx('Document','Documento'),icon:'fa-file-lines'})));
    drawer.dataset.uiFilesEnhanced='1';
    if(!files.length)return;
    const footer=drawer.querySelector('.ui-drawer-actions');
    const section=document.createElement('section');
    section.className='ui-drawer-files';
    section.innerHTML=`<h3>${esc(tx('Photos & documents','Fotos y documentos'))}</h3><div class="ui-drawer-file-grid">${files.slice(0,12).map(f=>`<button type="button" class="ui-drawer-file" ${f.kind==='photo'?`data-ui-file-photo="${esc(f.id)}"`:`data-ui-file-document="${esc(f.id)}"`}><i class="fas ${f.icon}" aria-hidden="true"></i><span>${esc(f.name)}</span></button>`).join('')}</div>`;
    if(footer)footer.insertAdjacentElement('beforebegin',section);else drawer.querySelector('.ui-drawer-inner')?.appendChild(section);
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest&&e.target.closest('[data-ui-compat-scroll]');
    if(!target)return;
    const node=document.getElementById(target.dataset.uiCompatScroll);
    if(node){e.preventDefault();node.scrollIntoView({behavior:'smooth',block:'start'});}
  });

  let scheduled=false;
  const enhance=()=>{customerPortalSummary();drawerFiles();};
  const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;enhance();});});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.ottoUiIntegrationsCompat={enhance};
  setTimeout(enhance,0);
})();