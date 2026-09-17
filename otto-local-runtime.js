/* OTTO / NBO local-first profile runtime.
   This is the active identity surface for the local archetype. It never stores
   passwords or PINs. Only minimum profile identity data is seeded in source. */
(function () {
  'use strict';

  const PROTECTED_PROFILES = [
    { id: 'owner-1', name: 'Otto', role: 'owner', title: 'Owner', active: true, nboProtected: true },
    { id: 'owner-2', name: 'Julio Pablos', role: 'owner', title: 'Owner', active: true, nboProtected: true },
    { id: 'ops-1', name: 'Sarays', role: 'office', title: 'Office Manager', active: true, nboProtected: true },
    { id: 'it-admin-ejn', name: 'EJN', role: 'owner', title: 'NBO Administrator', active: true, nboProtected: true }
  ];

  // Existing employee identities from the established OTTO Team roster.
  // Compensation, contact details, credentials and other private HR data are
  // deliberately not embedded in this public source tree.
  const FIELD_PROFILE_SEEDS = [
    { id: 'employee-pay-sheet-01', name: 'Alain Hernandez', role: 'field', lang: 'es', active: true, loginAccess: false },
    { id: 'employee-pay-sheet-02', name: 'Elieser Hernández', role: 'field', lang: 'es', active: true, loginAccess: false },
    { id: 'employee-pay-sheet-03', name: 'Jesús Bruguera', role: 'field', lang: 'es', active: true, loginAccess: false },
    { id: 'employee-pay-sheet-04', name: 'JSG SERVICE & repair', role: 'field', lang: 'es', active: true, loginAccess: false },
    { id: 'employee-pay-sheet-05', name: 'Leandro Hernández', role: 'field', lang: 'es', active: true, loginAccess: false },
    { id: 'employee-pay-sheet-06', name: 'Reinaldo Acosta', role: 'field', lang: 'es', active: true, loginAccess: false },
    { id: 'employee-pay-sheet-07', name: 'Richar L Morejon', role: 'field', lang: 'es', active: true, loginAccess: false },
    { id: 'employee-pay-sheet-08', name: 'Yoandy Montiel', role: 'field', lang: 'es', active: true, loginAccess: false },
    { id: 'employee-pay-sheet-09', name: 'Yasel Mirabal', role: 'field', lang: 'es', active: true, loginAccess: false },
    { id: 'employee-pay-sheet-10', name: 'Raider Gonzalez', role: 'field', lang: 'es', active: true, loginAccess: false }
  ];

  const isSpanish = () => {
    try { return typeof lang !== 'undefined' && lang === 'es'; }
    catch (_) { return false; }
  };
  const words = (en, es) => isSpanish() ? es : en;
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  function localDb() {
    try { return typeof db !== 'undefined' && db ? db : null; }
    catch (_) { return null; }
  }

  function mergeSeed(existing, seed) {
    if (!existing) return { ...seed };
    if (seed.nboProtected) {
      return { ...existing, ...seed, name: existing.name || seed.name };
    }
    return {
      ...seed,
      ...existing,
      id: seed.id,
      role: 'field',
      name: existing.name || seed.name,
      active: existing.active !== false
    };
  }

  function ensureProfiles() {
    const state = localDb();
    if (!state) return [];
    if (!Array.isArray(state.users)) state.users = [];
    let changed = false;
    const seeds = PROTECTED_PROFILES.concat(FIELD_PROFILE_SEEDS);

    for (const seed of seeds) {
      const index = state.users.findIndex((user) => user && user.id === seed.id);
      if (index < 0) {
        state.users.push({ ...seed });
        changed = true;
        continue;
      }
      const existing = state.users[index] || {};
      const next = mergeSeed(existing, seed);
      if (JSON.stringify(existing) !== JSON.stringify(next)) {
        state.users[index] = next;
        changed = true;
      }
    }

    if (changed) {
      try {
        if (typeof save === 'function') save();
      } catch (_) { }
    }
    return state.users;
  }

  function selectableProfiles() {
    const users = ensureProfiles();
    const protectedRows = PROTECTED_PROFILES.map((seed) => users.find((user) => user && user.id === seed.id) || seed);
    // Field records are preconfigured for Team/HR but are not a login shortcut.
    // A later approved access flow may explicitly enable loginAccess per worker.
    const fieldRows = users.filter((user) => user && user.active !== false && user.role === 'field' && user.loginAccess === true);
    return protectedRows.concat(fieldRows);
  }

  function roleLabel(profile) {
    if (!profile) return '';
    if (profile.id === 'it-admin-ejn') return words('NBO Administrator', 'Administrador NBO');
    if (profile.role === 'office') return words('Office Manager', 'Gerente de oficina');
    if (profile.role === 'field') return words('Field Worker', 'Trabajador de campo');
    return words('Owner', 'Propietario');
  }

  function selectProfile(id) {
    const state = localDb();
    if (!state || !Array.isArray(state.users)) return false;
    const profile = state.users.find((user) => user && user.id === id && user.active !== false);
    if (!profile) return false;
    const protectedProfile = PROTECTED_PROFILES.some((seed) => seed.id === id);
    if (!protectedProfile && profile.loginAccess !== true) return false;

    try { session = profile; } catch (_) { window.session = profile; }
    try { localStorage.setItem('otto_session', profile.id); } catch (_) { }
    document.body.dataset.nboProfile = profile.id;

    const login = document.getElementById('login');
    const app = document.getElementById('app');
    if (login) login.classList.add('hidden');
    if (app) app.classList.remove('hidden');

    try {
      if (typeof startApp === 'function') startApp();
      else if (typeof render === 'function') render();
    } catch (_) {
      location.reload();
    }
    return true;
  }

  function profileButton(profile) {
    const id = esc(profile.id);
    const name = esc(profile.name || profile.email || profile.id);
    const role = esc(roleLabel(profile));
    const initial = esc((profile.name || '?').trim().slice(0, 1).toUpperCase());
    return `<button type="button" class="nbo-profile-card" data-nbo-profile-id="${id}">
      <span class="nbo-profile-avatar" aria-hidden="true">${initial}</span>
      <span class="nbo-profile-copy"><strong>${name}</strong><small>${role}</small></span>
      <i class="fas fa-chevron-right" aria-hidden="true"></i>
    </button>`;
  }

  function showProfileChooser(message = '') {
    ensureProfiles();
    const app = document.getElementById('app');
    const login = document.getElementById('login');
    if (!login) return;
    if (app) app.classList.add('hidden');
    login.classList.remove('hidden');
    document.body.classList.add('nbo-local-mode');

    const profiles = selectableProfiles();
    login.innerHTML = `<main class="nbo-profile-login" aria-labelledby="nbo-profile-title">
      <section class="nbo-profile-login-card">
        <div class="nbo-profile-brand">
          <img src="./logo.jpg" alt="OTTO Plumbing Inc.">
          <span>${esc(words('Powered by NBO', 'Desarrollado por NBO'))}</span>
        </div>
        <div class="nbo-profile-heading">
          <p class="nbo-profile-eyebrow">${esc(words('Local workspace', 'Espacio de trabajo local'))}</p>
          <h1 id="nbo-profile-title">${esc(words('Who is using OTTO?', '¿Quién está usando OTTO?'))}</h1>
          <p>${esc(words('Choose a management profile. Business data stays on this device in this local-first release.', 'Elige un perfil de administración. Los datos del negocio permanecen en este dispositivo en esta versión local.'))}</p>
          ${message ? `<div class="nbo-profile-message" role="status">${esc(message)}</div>` : ''}
        </div>
        <div class="nbo-profile-grid">${profiles.map(profileButton).join('')}</div>
        <div class="nbo-profile-lang" aria-label="${esc(words('Language', 'Idioma'))}">
          <button type="button" data-nbo-lang="en" class="${!isSpanish() ? 'is-active' : ''}">EN</button>
          <button type="button" data-nbo-lang="es" class="${isSpanish() ? 'is-active' : ''}">ES</button>
        </div>
      </section>
    </main>`;
  }

  function switchProfile() {
    showProfileChooser(words('Choose another local profile.', 'Elige otro perfil local.'));
  }

  document.addEventListener('click', (event) => {
    const profile = event.target.closest('[data-nbo-profile-id]');
    if (profile) {
      event.preventDefault();
      selectProfile(profile.getAttribute('data-nbo-profile-id'));
      return;
    }
    const language = event.target.closest('[data-nbo-lang]');
    if (language) {
      event.preventDefault();
      const next = language.getAttribute('data-nbo-lang') === 'es' ? 'es' : 'en';
      try {
        if (typeof setLang === 'function') setLang(next);
        else lang = next;
      } catch (_) { }
      showProfileChooser();
    }
  });

  const api = {
    protectedProfiles: PROTECTED_PROFILES.map((profile) => ({ ...profile })),
    fieldProfiles: FIELD_PROFILE_SEEDS.map((profile) => ({ ...profile })),
    ensureProfiles,
    selectableProfiles,
    showProfileChooser,
    selectProfile,
    switchProfile,
    roleLabel
  };

  window.__nboLocalMode = api;
  window.__nboEnsureProfiles = ensureProfiles;
  window.__nboShowProfileChooser = showProfileChooser;
  window.__nboSwitchProfile = switchProfile;
  document.body.classList.add('nbo-local-mode');
})();
