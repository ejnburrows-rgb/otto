/* OTTO CRM — field worker workspace.

   The redesigned interface for `role === 'field'`, built from the same design
   system as the owner shell (otto-shell.css tokens, Geist, the same cards,
   rows, buttons, pills and empty states). It is a presentation layer only: the
   business logic it drives — check-in, check-out, checklist, notes, photos,
   cloud sync — is the app's existing code, called unchanged.

   Two things about it are requirements rather than styling choices:

   1. A technician must know who they are and what role they hold before they
      read anything else, so the header carries the name and "Field Worker"
      permanently rather than hiding it behind a menu.
   2. Ask OTTO does not exist here. Not hidden — absent. `ROLE_VIEWS.field` in
      index.html no longer grants `assistant`, the router refuses the route, and
      nothing in this file renders an entry point to it. */
(function () {
  'use strict';

  const priorViewHome = viewHome;
  const priorViewJobs = viewJobs;
  const priorViewJob = viewJob;
  const priorViewSettings = viewSettings;
  const priorRenderNav = renderNav;

  /* Routes this workspace owns. `render()` falls back to `viewHome` for any
     view it does not know, so these need no entry in the app's view table. */
  const ACTIVITY_VIEW = 'otto_field_activity';
  const PROFILE_VIEW = 'otto_field_profile';

  const NAV = [
    { id: 'today', view: 'home', icon: 'fa-house', en: 'Today', es: 'Hoy' },
    { id: 'jobs', view: 'jobs', icon: 'fa-screwdriver-wrench', en: 'Jobs', es: 'Trabajos' },
    { id: 'activity', view: ACTIVITY_VIEW, icon: 'fa-wave-square', en: 'Activity', es: 'Actividad' },
    { id: 'profile', view: PROFILE_VIEW, icon: 'fa-user', en: 'Profile', es: 'Perfil' }
  ];

  const ROUTE_GROUP = {
    home: 'today',
    jobs: 'jobs', job: 'jobs',
    [ACTIVITY_VIEW]: 'activity',
    [PROFILE_VIEW]: 'profile', settings: 'profile'
  };

  /* ── helpers ───────────────────────────────────────────────────────────── */

  const L = () => lang === 'es';
  const words = (en, es) => (L() ? es : en);
  const label = item => words(item.en, item.es);

  /* The role line under the worker's name. Spanish is "Trabajador de Campo"
     exactly, because that is what the crew is called. */
  const roleWords = () => words('Field Worker', 'Trabajador de Campo');

  function list(name) {
    const value = db && db[name];
    return Array.isArray(value) ? value : [];
  }

  function active() {
    return Boolean(session) && session.role === 'field';
  }

  function myJobs() {
    return list('jobs').filter(j => j && j.assignedTo === session.id);
  }

  function openJobs() {
    return myJobs().filter(j => !['completed', 'canceled'].includes(j.status));
  }

  /* The job the technician is standing on right now: the one they are checked
     in to. There is at most one, because check-in clears on check-out. */
  function currentJob() {
    return myJobs().find(j => j.activeCheckIn) || null;
  }

  /* What to do next when nothing is open: today's earliest unfinished job,
     otherwise the next scheduled one. Never invents a job. */
  function nextJob() {
    const open = openJobs();
    const byDate = (a, b) => String(a.scheduledDate || '').localeCompare(String(b.scheduledDate || ''));
    const today = open.filter(j => (j.scheduledDate || '').slice(0, 10) === todayISO()).sort(byDate);
    if (today.length) return today[0];
    const future = open.filter(j => (j.scheduledDate || '').slice(0, 10) > todayISO()).sort(byDate);
    return future[0] || open.sort(byDate)[0] || null;
  }

  function todaysJobs() {
    return myJobs()
      .filter(j => (j.scheduledDate || '').slice(0, 10) === todayISO())
      .sort((a, b) => String(a.scheduledTime || '').localeCompare(String(b.scheduledTime || '')));
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';
  }

  function clockTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString(L() ? 'es-US' : 'en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function longDate(iso) {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    const d = ymd ? new Date(+ymd[1], +ymd[2] - 1, +ymd[3]) : new Date(iso || Date.now());
    if (isNaN(d)) return String(iso || '');
    return d.toLocaleDateString(L() ? 'es-US' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }

  function jobSchedule(job) {
    if (!job) return '';
    const parts = [];
    if (job.scheduledDate) parts.push(fmtDate(job.scheduledDate));
    if (job.scheduledTime) parts.push(job.scheduledTime);
    return parts.join(' · ');
  }

  /* ── shared markup ─────────────────────────────────────────────────────── */

  function panel(title, body, action) {
    return `<section class="of-panel">
      ${title ? `<header class="of-panel-head"><h2>${esc(title)}</h2>${action || ''}</header>` : ''}
      ${body}
    </section>`;
  }

  function empty(message) {
    return `<div class="of-empty">${esc(message)}</div>`;
  }

  function jobStatusPill(job) {
    const map = { scheduled: 'is-info', inProgress: 'is-warn', completed: 'is-ok', onHold: 'is-mute', canceled: 'is-mute' };
    return `<span class="of-pill ${map[job.status] || 'is-mute'}">${esc(t(job.status) || job.status || '')}</span>`;
  }

  function jobRow(job) {
    const checked = Boolean(job.activeCheckIn);
    return `<button type="button" class="of-row" data-of-nav="job" data-of-id="${esc(job.id)}">
      <span class="of-row-icon"><i class="fas fa-screwdriver-wrench" aria-hidden="true"></i></span>
      <span class="of-row-main">
        <span class="of-row-title">${esc(job.title || t('untitled'))}</span>
        <span class="of-row-sub">${esc([customerName(job.customerId), jobSchedule(job)].filter(v => v && v !== '—').join(' · '))}</span>
      </span>
      <span class="of-row-end">${checked ? `<span class="of-pill is-ok">${esc(words('On site', 'En sitio'))}</span>` : jobStatusPill(job)}</span>
    </button>`;
  }

  /* ── Today ─────────────────────────────────────────────────────────────── */

  function currentJobCard() {
    const job = currentJob();
    const next = job ? null : nextJob();
    const subject = job || next;

    if (!subject) {
      return panel(words('Current job', 'Trabajo actual'),
        `<div class="of-nojob">
          <p class="of-nojob-title">${esc(words('No active job', 'Sin trabajo activo'))}</p>
          <p class="of-nojob-sub">${esc(words('Nothing is assigned to you right now. Your next job will appear here.', 'No tiene trabajos asignados ahora. El próximo aparecerá aquí.'))}</p>
        </div>`);
    }

    const checkIn = job ? (list('job_events').find(e => e.id === job.activeCheckIn) || null) : null;
    const heading = job ? words('Current job', 'Trabajo actual') : words('Next job', 'Próximo trabajo');

    const facts = [
      [words('Customer', 'Cliente'), customerName(subject.customerId)],
      [words('Address', 'Dirección'), subject.address || ''],
      [words('Scheduled', 'Agendado'), jobSchedule(subject)],
      [words('Status', 'Estado'), t(subject.status) || subject.status || '']
    ].filter(([, value]) => value && value !== '—');

    const action = job
      ? `<button type="button" class="of-btn is-primary is-block" data-of-action="check-out" data-of-id="${esc(job.id)}">
          <i class="fas fa-flag-checkered" aria-hidden="true"></i> ${esc(words('Complete / Check out', 'Completar / Salida'))}
        </button>`
      : `<button type="button" class="of-btn is-primary is-block" data-of-action="check-in" data-of-id="${esc(subject.id)}">
          <i class="fas fa-play" aria-hidden="true"></i> ${esc(words('Start job / Check in', 'Empezar / Entrada'))}
        </button>`;

    return panel(heading, `<div class="of-current">
      <button type="button" class="of-current-title" data-of-nav="job" data-of-id="${esc(subject.id)}">
        ${esc(subject.title || t('untitled'))}
      </button>
      ${job ? `<p class="of-checked">${esc(words('Checked in', 'Entrada registrada'))}${checkIn && checkIn.ts ? ` — ${esc(clockTime(checkIn.ts))}` : ''}</p>`
            : `<p class="of-notchecked">${esc(words('Not checked in', 'Sin entrada registrada'))}</p>`}
      <dl class="of-facts">
        ${facts.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}
      </dl>
      ${action}
      <button type="button" class="of-btn is-quiet is-block" data-of-nav="job" data-of-id="${esc(subject.id)}">
        ${esc(words('Open job', 'Abrir trabajo'))}
      </button>
    </div>`);
  }

  /* Recent activity is read from stored records only — job events, notes,
     photos and checklist submissions this employee actually created. Nothing
     here is derived from what happens to be on screen. */
  function activityEntries(limit) {
    const mine = new Set(myJobs().map(j => j.id));
    const out = [];

    for (const event of list('job_events')) {
      if (!event || event.userId !== session.id) continue;
      const isIn = event.type === 'check_in';
      if (!isIn && event.type !== 'check_out') continue;
      out.push({
        ts: event.ts || event.created,
        icon: isIn ? 'fa-right-to-bracket' : 'fa-right-from-bracket',
        title: isIn ? words('Checked in', 'Entrada') : words('Checked out', 'Salida'),
        meta: jobTitle(event.jobId)
      });
    }
    for (const note of list('notes')) {
      if (!note || note.createdBy !== session.id) continue;
      out.push({
        ts: note.created, icon: 'fa-note-sticky',
        title: words('Added note', 'Nota agregada'),
        meta: [jobTitle(note.jobId), note.text].filter(Boolean).join(' — ')
      });
    }
    for (const photo of list('photos')) {
      if (!photo || photo.createdBy !== session.id) continue;
      out.push({
        ts: photo.created, icon: 'fa-camera',
        title: words('Uploaded photo', 'Foto subida'),
        meta: jobTitle(photo.jobId)
      });
    }
    for (const submission of list('checklist_submissions')) {
      if (!submission || submission.workerId !== session.id) continue;
      out.push({
        ts: submission.created, icon: 'fa-list-check',
        title: words('Checklist submitted', 'Lista enviada'),
        meta: jobTitle(submission.jobId)
      });
    }
    for (const job of myJobs()) {
      if (!mine.has(job.id) || job.status !== 'completed') continue;
      out.push({
        ts: job.updated, icon: 'fa-circle-check',
        title: words('Job completed', 'Trabajo completado'),
        meta: job.title || ''
      });
    }

    out.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0));
    return limit ? out.slice(0, limit) : out;
  }

  function activityList(entries) {
    if (!entries.length) return empty(words('No recorded activity yet.', 'Todavía no hay actividad registrada.'));
    return `<ul class="of-feed">${entries.map(entry => `<li>
      <span class="of-feed-icon"><i class="fas ${entry.icon}" aria-hidden="true"></i></span>
      <span class="of-feed-main">
        <span class="of-feed-title">${esc(entry.title)}</span>
        ${entry.meta ? `<span class="of-feed-meta">${esc(entry.meta)}</span>` : ''}
      </span>
      <time class="of-feed-time">${esc(timeAgo(entry.ts))}</time>
    </li>`).join('')}</ul>`;
  }

  function todayScreen() {
    const today = todaysJobs();
    const current = currentJob();
    const rest = today.filter(j => !current || j.id !== current.id);
    const upcoming = rest.length ? rest : openJobs().filter(j => !current || j.id !== current.id).slice(0, 5);

    return `<div class="of-page">
      <header class="of-hello">
        <p class="of-hello-name">${esc(session.name || '')}</p>
        <p class="of-hello-role">${esc(roleWords())}</p>
        <p class="of-hello-date">${esc(words('Today', 'Hoy'))} · ${esc(longDate(todayISO()))}</p>
      </header>
      ${currentJobCard()}
      ${panel(rest.length ? words("Today's jobs", 'Trabajos de hoy') : words('Next jobs', 'Próximos trabajos'),
        upcoming.length ? `<div class="of-rows">${upcoming.map(jobRow).join('')}</div>`
                        : empty(words('No other jobs scheduled.', 'No hay más trabajos agendados.')))}
      ${panel(words('Recent activity', 'Actividad reciente'), activityList(activityEntries(6)))}
    </div>`;
  }

  /* ── Jobs ──────────────────────────────────────────────────────────────── */

  function jobsScreen() {
    const open = openJobs();
    const done = myJobs().filter(j => ['completed', 'canceled'].includes(j.status)).slice(0, 20);
    return `<div class="of-page">
      <header class="of-head">
        <h1>${esc(words('My jobs', 'Mis trabajos'))}</h1>
        <p>${esc(words('Work assigned to you.', 'Trabajo asignado a usted.'))}</p>
      </header>
      ${panel(words('Open', 'Abiertos'),
        open.length ? `<div class="of-rows">${open.map(jobRow).join('')}</div>`
                    : empty(words('Nothing open right now.', 'Nada abierto en este momento.')))}
      ${done.length ? panel(words('Finished', 'Terminados'), `<div class="of-rows">${done.map(jobRow).join('')}</div>`) : ''}
    </div>`;
  }

  /* ── Job detail ────────────────────────────────────────────────────────── */

  function checklistBlock(job) {
    const cl = ensureChecklist(job.id);
    const doneCount = cl.items.filter(i => i.done).length;
    const rows = cl.items.map(item => `<li class="of-check${item.done ? ' is-done' : ''}${item.note ? ' is-flag' : ''}">
      <button type="button" class="of-check-box" data-of-action="toggle-check" data-of-id="${esc(job.id)}" data-of-key="${esc(item.key)}"
        aria-pressed="${item.done ? 'true' : 'false'}">
        <i class="fas ${item.done ? (item.note ? 'fa-triangle-exclamation' : 'fa-check') : 'fa-square'}" aria-hidden="true"></i>
      </button>
      <span class="of-check-main">
        <span class="of-check-title">${esc(L() ? item.es : item.en)}</span>
        ${item.note ? `<span class="of-check-note">${esc(item.note)}</span>` : ''}
      </span>
      <button type="button" class="of-btn is-quiet is-small" data-of-action="check-note" data-of-id="${esc(job.id)}" data-of-key="${esc(item.key)}">
        ${esc(t('cantComplete'))}
      </button>
    </li>`).join('');
    return panel(`${words('Checklist', 'Lista')} · ${doneCount}/${cl.items.length}`, `<ul class="of-checks">${rows}</ul>`);
  }

  function notesBlock(job) {
    const notes = list('notes').filter(n => n && n.jobId === job.id)
      .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
    const body = notes.length
      ? `<ul class="of-notes">${notes.map(note => `<li>
          <p class="of-note-text">${esc(note.text || '')}</p>
          <p class="of-note-meta">${esc(userName(note.createdBy) || '')} · ${esc(timeAgo(note.created))}</p>
        </li>`).join('')}</ul>`
      : empty(words('No notes on this job yet.', 'Todavía no hay notas en este trabajo.'));
    const action = `<button type="button" class="of-btn is-quiet is-small" data-of-action="add-note" data-of-id="${esc(job.id)}">
      <i class="fas fa-plus" aria-hidden="true"></i> ${esc(t('addNote'))}
    </button>`;
    return panel(t('notes'), body, action);
  }

  /* Photos are rendered as empty tiles and filled in afterwards by
     hydratePhotos(), because the bytes come from IndexedDB or a signed URL and
     both are async. One record, one tile: the worker and the owner are looking
     at the same photo row, never at separate copies. */
  function photoTiles(photos) {
    return `<div class="of-photos">${photos.map(photo => `<button type="button" class="of-photo" data-of-photo="${esc(photo.fileId || '')}" data-of-action="open-photo" data-of-id="${esc(photo.id)}">
      <span class="of-photo-img" data-of-file="${esc(photo.fileId || '')}"></span>
      ${photo.phase ? `<span class="of-photo-tag">${esc(photo.phase === 'before' ? words('Before', 'Antes') : photo.phase === 'after' ? words('After', 'Después') : photo.phase)}</span>` : ''}
      ${photo.uploadPending ? `<span class="of-photo-pending" title="${esc(t('photoNotSentYet'))}"><i class="fas fa-cloud-arrow-up" aria-hidden="true"></i></span>` : ''}
    </button>`).join('')}</div>`;
  }

  function photosBlock(job) {
    const photos = list('photos').filter(p => p && p.jobId === job.id)
      .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
    const action = `<button type="button" class="of-btn is-quiet is-small" data-of-action="add-photo" data-of-id="${esc(job.id)}">
      <i class="fas fa-camera" aria-hidden="true"></i> ${esc(t('addPhoto'))}
    </button>`;
    return panel(t('photos'),
      photos.length ? photoTiles(photos) : empty(words('No photos on this job yet.', 'Todavía no hay fotos en este trabajo.')),
      action);
  }

  /* Read-only. A technician sees the documents attached to their job; they do
     not get the owner's upload, rename or delete controls. */
  function documentsBlock(job) {
    const docs = list('documents').filter(d => d && (d.jobId === job.id || d.associatedJobId === job.id));
    if (!docs.length) return panel(words('Authorized documents', 'Documentos autorizados'),
      empty(words('No documents shared for this job.', 'No hay documentos compartidos para este trabajo.')));
    return panel(words('Authorized documents', 'Documentos autorizados'),
      `<div class="of-rows">${docs.map(doc => `<button type="button" class="of-row" data-of-action="open-doc" data-of-id="${esc(doc.id)}">
        <span class="of-row-icon"><i class="fas fa-file-lines" aria-hidden="true"></i></span>
        <span class="of-row-main">
          <span class="of-row-title">${esc(doc.name || '')}</span>
          <span class="of-row-sub">${esc(timeAgo(doc.created))}</span>
        </span>
      </button>`).join('')}</div>`);
  }

  function workBlock(job) {
    const checkIn = job.activeCheckIn ? (list('job_events').find(e => e.id === job.activeCheckIn) || null) : null;
    const body = job.activeCheckIn
      ? `<p class="of-checked">${esc(words('Checked in', 'Entrada registrada'))}${checkIn && checkIn.ts ? ` — ${esc(clockTime(checkIn.ts))}` : ''}</p>
         <button type="button" class="of-btn is-primary is-block" data-of-action="check-out" data-of-id="${esc(job.id)}">
           <i class="fas fa-flag-checkered" aria-hidden="true"></i> ${esc(words('Complete / Check out', 'Completar / Salida'))}
         </button>`
      : `<p class="of-notchecked">${esc(words('Not checked in', 'Sin entrada registrada'))}</p>
         <button type="button" class="of-btn is-primary is-block" data-of-action="check-in" data-of-id="${esc(job.id)}">
           <i class="fas fa-play" aria-hidden="true"></i> ${esc(words('Start job / Check in', 'Empezar / Entrada'))}
         </button>`;
    return panel(words('Work', 'Trabajo'), `<div class="of-work">${body}</div>`);
  }

  function jobScreen(job) {
    const facts = [
      [words('Customer', 'Cliente'), customerName(job.customerId)],
      [words('Address', 'Dirección'), job.address || ''],
      [words('Scheduled', 'Agendado'), jobSchedule(job)],
      [words('Instructions', 'Instrucciones'), job.description || '']
    ].filter(([, value]) => value && value !== '—');

    return `<div class="of-page">
      <header class="of-head">
        <button type="button" class="of-back" data-of-nav="jobs">
          <span aria-hidden="true">←</span> ${esc(t('jobs'))}
        </button>
        <h1>${esc(job.title || t('untitled'))}</h1>
        <p>${jobStatusPill(job)}</p>
      </header>
      ${panel(words('Job information', 'Información del trabajo'),
        `<dl class="of-facts">${facts.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`)}
      ${workBlock(job)}
      ${checklistBlock(job)}
      ${notesBlock(job)}
      ${photosBlock(job)}
      ${documentsBlock(job)}
    </div>`;
  }

  /* ── Activity ──────────────────────────────────────────────────────────── */

  function activityScreen() {
    return `<div class="of-page">
      <header class="of-head">
        <h1>${esc(words('Activity', 'Actividad'))}</h1>
        <p>${esc(words('What you have recorded, from saved records.', 'Lo que ha registrado, desde los registros guardados.'))}</p>
      </header>
      ${panel('', activityList(activityEntries(60)))}
    </div>`;
  }

  /* ── Profile / My uploads ──────────────────────────────────────────────── */

  function myUploads() {
    return list('photos')
      .filter(p => p && p.createdBy === session.id)
      .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
  }

  function uploadsBlock() {
    const photos = myUploads();
    if (!photos.length) {
      return panel(words('My uploads', 'Mis archivos'),
        empty(words('You have not uploaded any photos yet.', 'Todavía no ha subido ninguna foto.')));
    }
    return panel(words('My uploads', 'Mis archivos'), `<ul class="of-uploads">${photos.map(photo => `<li>
      <button type="button" class="of-photo is-small" data-of-action="open-photo" data-of-id="${esc(photo.id)}">
        <span class="of-photo-img" data-of-file="${esc(photo.fileId || '')}"></span>
      </button>
      <span class="of-upload-main">
        <span class="of-upload-job">${esc(jobTitle(photo.jobId))}</span>
        <span class="of-upload-meta">${esc(timeAgo(photo.created))}${photo.phase ? ` · ${esc(photo.phase === 'before' ? words('Before', 'Antes') : photo.phase === 'after' ? words('After', 'Después') : photo.phase)}` : ''}</span>
        ${photo.uploadPending ? `<span class="of-upload-pending">${esc(t('photoNotSentYet'))}</span>` : ''}
      </span>
    </li>`).join('')}</ul>`);
  }

  function profileScreen() {
    const me = (list('users').find(u => u.id === session.id)) || session;
    const facts = [
      [words('Name', 'Nombre'), me.name || ''],
      [words('Role', 'Rol'), roleWords()],
      [t('email'), me.email || ''],
      [t('phone'), me.phone || '']
    ].filter(([, value]) => value);

    const hours = _workerWeeklyHours && _workerWeeklyHours[session.id];

    return `<div class="of-page">
      <header class="of-head">
        <h1>${esc(words('Profile', 'Perfil'))}</h1>
        <p>${esc(session.name || '')} · ${esc(roleWords())}</p>
      </header>
      ${panel(words('Your details', 'Sus datos'),
        `<dl class="of-facts">${facts.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}
        ${hours != null ? `<div><dt>${esc(t('thisWeek'))}</dt><dd>${esc(String(Math.round(hours * 10) / 10))} h</dd></div>` : ''}</dl>`)}
      ${uploadsBlock()}
      ${panel(words('Account', 'Cuenta'), `<div class="of-work">
        <button type="button" class="of-btn is-quiet is-block" data-of-action="time-off">
          <i class="fas fa-calendar-day" aria-hidden="true"></i> ${esc(t('timeOff'))}
        </button>
        <button type="button" class="of-btn is-danger is-block" data-of-action="sign-out">
          <i class="fas fa-right-from-bracket" aria-hidden="true"></i> ${esc(t('signOut'))}
        </button>
      </div>`)}
    </div>`;
  }

  /* ── photo hydration and preview ───────────────────────────────────────── */

  function hydratePhotos() {
    const slots = document.querySelectorAll('#main [data-of-file]');
    slots.forEach(async slot => {
      const fileId = slot.getAttribute('data-of-file');
      if (!fileId || slot.dataset.ofLoaded === '1') return;
      slot.dataset.ofLoaded = '1';
      const url = await getFileURL(fileId);
      if (!url) { slot.classList.add('is-missing'); return; }
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.loading = 'lazy';
      slot.appendChild(img);
    });
  }

  async function openPhoto(photoId) {
    const photo = (db.photos || []).find(p => p.id === photoId);
    if (!photo) return;
    const url = await getFileURL(photo.fileId);
    const meta = [jobTitle(photo.jobId), fmtDate(photo.created), clockTime(photo.created)]
      .filter(v => v && v !== '—').join(' · ');
    modal(`<div class="of-preview">
      <h2>${esc(photo.caption || t('photos'))}</h2>
      ${url ? `<img src="${url}" alt="">` : `<p class="of-empty">${esc(words('This photo is not available on this device yet.', 'Esta foto todavía no está disponible en este dispositivo.'))}</p>`}
      <p class="of-preview-meta">${esc(meta)}</p>
    </div>`);
  }

  /* ── chrome ────────────────────────────────────────────────────────────── */

  function headerMarkup() {
    const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    return `<div class="of-brand">
        <span class="of-wordmark">OTTO</span>
        <span class="of-who">
          <span class="of-who-name">${esc(session.name || '')}</span>
          <span class="of-who-role">${esc(roleWords())}</span>
        </span>
      </div>
      <div class="of-controls">
        <div class="of-lang" role="group" aria-label="${esc(words('Language', 'Idioma'))}">
          <button type="button" class="${L() ? '' : 'is-on'}" data-of-action="lang" data-of-lang="en">EN</button>
          <button type="button" class="${L() ? 'is-on' : ''}" data-of-action="lang" data-of-lang="es">ES</button>
        </div>
        <button type="button" class="of-theme" data-of-action="theme"
          aria-label="${esc(theme === 'dark' ? words('Switch to light', 'Cambiar a claro') : words('Switch to dark', 'Cambiar a oscuro'))}"
          aria-pressed="${theme === 'dark' ? 'true' : 'false'}">
          <span aria-hidden="true">${theme === 'dark' ? '☾' : '☀'}</span>
        </button>
      </div>`;
  }

  function dockMarkup() {
    const group = ROUTE_GROUP[route && route.view] || '';
    return NAV.map(item => `<button type="button" class="of-dock-item${group === item.id ? ' is-active' : ''}"
      data-of-nav="${esc(item.view)}"${group === item.id ? ' aria-current="page"' : ''}>
      <i class="fas ${item.icon}" aria-hidden="true"></i><span>${esc(label(item))}</span>
    </button>`).join('');
  }

  function mountChrome() {
    const app = document.getElementById('app');
    if (!app) return;

    let header = document.getElementById('otto-field-header');
    let dock = document.getElementById('otto-field-dock');

    if (!active()) {
      if (header) header.remove();
      if (dock) dock.remove();
      document.body.classList.remove('otto-field');
      return;
    }

    document.body.classList.add('otto-field');
    /* The superseded presentations key off these classes; removing them is
       what stops the legacy field dashboard rendering underneath. */
    document.body.classList.remove('otto-shell', 'admin-home', 'admin-workspace', 'otto-secondary', 'otto-fullscreen-window');

    if (!header) {
      header = document.createElement('header');
      header.id = 'otto-field-header';
      header.className = 'of-header';
      app.insertBefore(header, app.firstChild);
    }
    if (!dock) {
      dock = document.createElement('nav');
      dock.id = 'otto-field-dock';
      dock.className = 'of-dock';
      dock.setAttribute('aria-label', words('Main navigation', 'Navegación principal'));
      app.appendChild(dock);
    }

    header.innerHTML = headerMarkup();
    dock.innerHTML = dockMarkup();
  }

  /* ── view overrides ────────────────────────────────────────────────────── */

  viewHome = function () {
    if (!active()) return priorViewHome.apply(this, arguments);
    const main = document.getElementById('main');
    if (!main) return;
    const view = route && route.view;
    main.innerHTML = view === ACTIVITY_VIEW ? activityScreen()
      : view === PROFILE_VIEW ? profileScreen()
      : todayScreen();
    hydratePhotos();
  };

  viewJobs = function () {
    if (!active()) return priorViewJobs.apply(this, arguments);
    const main = document.getElementById('main');
    if (main) main.innerHTML = jobsScreen();
  };

  viewJob = function () {
    if (!active()) return priorViewJob.apply(this, arguments);
    const job = (db.jobs || []).find(j => j.id === (route && route.id));
    /* A technician can only open work assigned to them. Anything else — a stale
       history entry, a shared link — returns them to their own job list rather
       than rendering another crew's job. */
    if (!job || job.assignedTo !== session.id) { nav('jobs'); return; }
    const main = document.getElementById('main');
    if (!main) return;
    main.innerHTML = jobScreen(job);
    hydratePhotos();
  };

  /* Settings is reachable from the app's own code paths; for a field session it
     shows the same Profile screen so there is one place that answers "who am I
     and what have I done", instead of a second half-owner settings page. */
  viewSettings = function () {
    if (!active()) return priorViewSettings.apply(this, arguments);
    const main = document.getElementById('main');
    if (main) { main.innerHTML = profileScreen(); hydratePhotos(); }
  };

  renderNav = function (...args) {
    priorRenderNav.apply(this, args);
    mountChrome();
  };

  /* ── events ────────────────────────────────────────────────────────────── */

  document.addEventListener('click', function (event) {
    if (!active()) return;
    const target = event.target && event.target.closest && event.target.closest('[data-of-nav], [data-of-action]');
    if (!target) return;

    const destination = target.getAttribute('data-of-nav');
    if (destination) {
      event.preventDefault();
      nav(destination, target.getAttribute('data-of-id') || null);
      return;
    }

    const action = target.getAttribute('data-of-action');
    const id = target.getAttribute('data-of-id');
    event.preventDefault();

    switch (action) {
      case 'lang':
        setLang(target.getAttribute('data-of-lang'));
        break;
      case 'theme':
        toggleTheme();
        break;
      case 'check-in':
        startCheckInFlow(id);
        break;
      case 'check-out':
        startCheckOutFlow(id);
        break;
      case 'toggle-check':
        toggleChecklistItem(id, target.getAttribute('data-of-key'));
        break;
      case 'check-note':
        promptChecklistNote(id, target.getAttribute('data-of-key'));
        break;
      case 'add-note':
        openNoteForm(id);
        break;
      case 'add-photo':
        quickPhoto(id);
        break;
      case 'open-photo':
        openPhoto(id);
        break;
      case 'open-doc':
        openDoc(id);
        break;
      case 'time-off':
        openPTOForm();
        break;
      case 'sign-out':
        signOut();
        break;
      default:
        break;
    }
  });

  window.ottoField = { mountChrome, activityEntries, myUploads };

  /* This runtime loads after the app has already rendered once, so bring the
     field workspace up on the current screen rather than waiting for the next
     navigation. The policy gate deliberately owns the whole screen until it is
     acknowledged, so it is left alone. */
  setTimeout(() => {
    if (!active()) return;
    if (document.getElementById('app')?.classList.contains('policy-gate-active')) return;
    render();
  }, 0);
})();
