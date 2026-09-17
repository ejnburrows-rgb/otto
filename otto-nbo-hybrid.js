/* OTTO / NBO hybrid interaction layer.
   Adds context and identity affordances without creating another navigation model. */
(function () {
  'use strict';

  let scheduled = false;
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const isSpanish = () => {
    try { return typeof lang !== 'undefined' && lang === 'es'; }
    catch (_) { return false; }
  };
  const words = (en, es) => isSpanish() ? es : en;

  function currentProfile() {
    try { return typeof session !== 'undefined' && session ? session : null; }
    catch (_) { return null; }
  }

  function currentRoute() {
    try { return typeof route !== 'undefined' && route ? route : {}; }
    catch (_) { return {}; }
  }

  function roleLabel(profile) {
    const local = window.__nboLocalMode;
    if (local && typeof local.roleLabel === 'function') return local.roleLabel(profile);
    if (!profile) return '';
    if (profile.id === 'it-admin-ejn') return words('NBO Administrator', 'Administrador NBO');
    if (profile.role === 'office') return words('Office Manager', 'Gerente de oficina');
    if (profile.role === 'field') return words('Field Worker', 'Trabajador de campo');
    return words('Owner', 'Propietario');
  }

  function profileMarkup(profile, compact = false) {
    if (!profile) return '';
    const name = esc(profile.name || profile.email || profile.id || words('Profile', 'Perfil'));
    const roleName = esc(roleLabel(profile));
    const initial = esc((profile.name || '?').trim().slice(0, 1).toUpperCase());
    return `<button type="button" class="nbo-profile-switch${compact ? ' is-compact' : ''}" data-nbo-profile-switch aria-label="${esc(words('Switch local profile', 'Cambiar perfil local'))}">
      <span class="nbo-profile-avatar" aria-hidden="true">${initial}</span>
      <span class="nbo-profile-copy"><strong>${name}</strong><small>${roleName}</small></span>
      <i class="fas fa-chevron-up" aria-hidden="true"></i>
    </button>`;
  }

  function mountProfileControl() {
    const profile = currentProfile();
    if (!profile) return;

    const sidebar = document.querySelector('.ot-sidebar');
    if (sidebar && !sidebar.querySelector('[data-nbo-profile-switch]')) {
      sidebar.insertAdjacentHTML('beforeend', profileMarkup(profile));
    }

    const headActions = document.querySelector('.ot-head-actions');
    if (headActions && !headActions.querySelector('[data-nbo-profile-switch]')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'nbo-profile-mobile-slot';
      wrapper.innerHTML = profileMarkup(profile, true);
      headActions.appendChild(wrapper);
    }
  }

  function contextForRoute() {
    const r = currentRoute();
    const view = String(r.view || '');
    if (view === 'customer' || view === 'customers' && r.id) return { key: 'customer', en: 'Customer workspace', es: 'Espacio del cliente' };
    if (view === 'job' || view === 'jobs' && r.id) return { key: 'job', en: 'Job workspace', es: 'Espacio del trabajo' };
    if (['worker', 'employee'].includes(view) || view === 'team' && r.id) return { key: 'employee', en: 'Team member', es: 'Miembro del equipo' };
    return null;
  }

  function mountContextKicker() {
    const context = contextForRoute();
    document.body.dataset.nboContext = context ? context.key : 'business';
    const header = document.querySelector('#main .ot-head, #main .pagehead, #main .page-head');
    if (!header) return;
    const existing = header.querySelector('.nbo-context-kicker');
    if (!context) {
      if (existing) existing.remove();
      return;
    }
    const text = words(context.en, context.es);
    if (existing) {
      if (existing.textContent !== text) existing.textContent = text;
      return;
    }
    const target = header.querySelector('div') || header;
    target.insertAdjacentHTML('afterbegin', `<p class="nbo-context-kicker">${esc(text)}</p>`);
  }

  function refreshIdentityState() {
    const profile = currentProfile();
    if (profile && profile.id) document.body.dataset.nboProfile = profile.id;
    mountProfileControl();
    mountContextKicker();
  }

  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshIdentityState();
    });
  }

  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-nbo-profile-switch]');
    if (!control) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof window.__nboSwitchProfile === 'function') window.__nboSwitchProfile();
  }, true);

  document.addEventListener('DOMContentLoaded', scheduleRefresh, { once: true });
  window.addEventListener('hashchange', scheduleRefresh);
  window.addEventListener('otto:save-state', scheduleRefresh);

  new MutationObserver(scheduleRefresh).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.__nboHybridRefresh = refreshIdentityState;
  scheduleRefresh();
})();
