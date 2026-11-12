/* ============================================================
   AURELIA EventOS · SHELL DE APLICACIÓN Y ENRUTADOR
   ============================================================ */
(function (global) {
  'use strict';
  const Store = global.Store, S = Store.S, F = Store.fmt, U = global.UI, Pages = global.Pages;

  const NAV = [
    { section: 'Operación' },
    { k: 'dashboard', l: 'Panel de control', i: 'dashboard' },
    { k: 'calendario', l: 'Calendario', i: 'calendar' },
    { k: 'eventos', l: 'Eventos', i: 'events', pill: () => S.kpis().eventosActivos },
    { k: 'tareas', l: 'Tareas', i: 'tasks', pill: () => S.kpis().tareasAbiertas },
    { section: 'Relaciones' },
    { k: 'asistentes', l: 'Asistentes', i: 'people' },
    { k: 'comunicacion', l: 'Comunicación', i: 'chat' },
    { section: 'Control' },
    { k: 'reportes', l: 'Reportes', i: 'chart' },
    { k: 'bitacora', l: 'Bitácora', i: 'audit' },
    { section: 'Portal externo' },
    { k: 'registro', l: 'Registro público', i: 'user' }
  ];

  const App = {
    route: { page: 'dashboard', params: {} },
    repaint() {
      const p = Pages[App.route.page] || Pages.dashboard;
      const view = U.qs('#view');
      const scrollY = window.scrollY;
      view.innerHTML = p.render(App.route.params) || '';
      view.style.animation = 'none';
      requestAnimationFrame(() => { view.style.animation = ''; });
      p.mount && p.mount(view, App.refresh, App.route.params);
      App.paintNav();
      App.paintCrumb();
      window.scrollTo(0, scrollY > 0 ? scrollY : 0);
    },
    refresh() {
      Store.commit();
      App.repaint();
      App.paintNotifs();
    },
    go(path) {
      if (String(path).startsWith('#')) path = String(path).slice(1);
      location.hash = '#' + path;
    },
    paintNav() {
      const nav = U.qs('#nav');
      nav.innerHTML = NAV.map(item => {
        if (item.section) return `<div class="nav-label">${item.section}</div>`;
        const active = (App.route.page === item.k) || (item.k === 'eventos' && App.route.page === 'evento');
        const pill = item.pill ? item.pill() : null;
        return `<button class="nav-item ${active ? 'active' : ''}" data-nav="${item.k}">
          ${U.icon(item.i, 17)}<span>${item.l}</span>${pill ? `<span class="pill">${pill}</span>` : ''}
        </button>`;
      }).join('');
      U.qsa('#nav [data-nav]').forEach(b => b.onclick = () => { App.go(b.dataset.nav); U.qs('#sidebar').classList.remove('open'); });
    },
    paintCrumb() {
      const p = Pages[App.route.page] || Pages.dashboard;
      const ev = App.route.page === 'evento' ? S.evento(App.route.params.id) : null;
      U.qs('#crumbs').innerHTML = `<b>${ev ? U.esc(ev.nombre) : U.esc(p.crumb || p.title)}</b>`;
      document.title = `${ev ? ev.nombre : (p.title || 'Aurelia')} · Aurelia EventOS`;
    },
    paintNotifs() {
      const n = S.notificaciones();
      const unread = n.filter(x => !x.leido).length;
      const c = U.qs('#notif-count');
      c.textContent = unread; c.hidden = unread === 0;
      U.qs('#notif-panel').innerHTML = `
        <div class="np-head"><h4>Notificaciones</h4><button id="np-clear">Marcar leídas</button></div>
        <div class="np-body">${n.slice(0, 12).map(x => `<div class="np-item ${x.leido ? 'read' : 'unread'}">
          <span class="np-dot"></span>
          <div><div class="np-txt"><b>${U.esc(x.texto)}</b><br><span class="muted">${U.esc(x.detalle || '')}</span></div>
          <div class="np-time">${F.fFechaHora(x.fecha)}</div></div>
        </div>`).join('') || `<div class="empty" style="padding:30px"><p>Sin notificaciones</p></div>`}</div>`;
      U.qs('#np-clear').onclick = () => { n.forEach(x => x.leido = true); Store.commit(); App.paintNotifs(); };
    },
    paintSearch(q) {
      const box = U.qs('#search-results');
      if (!q || q.length < 2) { box.classList.remove('open'); return; }
      const ql = q.toLowerCase();
      const evs = S.eventos().filter(e => (e.nombre + e.cliente + e.lugar).toLowerCase().includes(ql)).slice(0, 3);
      const as = S.asistentes().filter(a => (a.nombre + a.email + a.empresa).toLowerCase().includes(ql)).slice(0, 3);
      const ts = S.tareas().filter(t => t.titulo.toLowerCase().includes(ql)).slice(0, 3);
      let html = '';
      if (evs.length) html += `<div class="sr-head">Eventos</div>` + evs.map(e => `<div class="sr-item" data-sr="evento/${e.id}">
        <span class="sr-ico">${U.icon('events', 13)}</span><div>${U.esc(e.nombre)}<small>${U.esc(e.cliente)} · ${F.fCorto(e.fechaInicio)}</small></div></div>`).join('');
      if (as.length) html += `<div class="sr-head">Asistentes</div>` + as.map(a => `<div class="sr-item" data-sr="asistentes">
        <span class="sr-ico">${U.icon('user', 13)}</span><div>${U.esc(a.nombre)}<small>${U.esc(a.empresa)}</small></div></div>`).join('');
      if (ts.length) html += `<div class="sr-head">Tareas</div>` + ts.map(t => `<div class="sr-item" data-sr="${t.eventoId ? 'evento/' + t.eventoId : 'tareas'}">
        <span class="sr-ico">${U.icon('tasks', 13)}</span><div>${U.esc(t.titulo)}<small>${U.esc(t.categoria)}</small></div></div>`).join('');
      if (!html) html = `<div class="sr-head">Sin resultados</div><div class="sr-item muted">No se encontraron coincidencias.</div>`;
      box.innerHTML = html;
      box.classList.add('open');
      U.qsa('[data-sr]', box).forEach(el => el.onclick = () => {
        App.go(el.dataset.sr); box.classList.remove('open'); U.qs('#global-search').value = '';
      });
    }
  };

  /* ---------------- Router ---------------- */
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const [page, id] = raw.split('/');
    return { page: Pages[page] ? page : 'dashboard', params: { id: id || null } };
  }
  function onRoute() {
    App.route = parseHash();
    App.repaint();
  }

  /* ---------------- Arranque ---------------- */
  function boot() {
    Store.init();
    // Navegación
    App.paintNav();
    // Búsqueda global
    const search = U.qs('#global-search');
    search.addEventListener('input', e => App.paintSearch(e.target.value));
    search.addEventListener('focus', e => App.paintSearch(e.target.value));
    document.addEventListener('click', e => {
      if (!e.target.closest('.searchbox')) U.qs('#search-results').classList.remove('open');
      if (!e.target.closest('#notif-panel') && !e.target.closest('#notif-btn')) U.qs('#notif-panel').hidden = true;
    });
    // Notificaciones
    U.qs('#notif-btn').onclick = () => {
      const p = U.qs('#notif-panel');
      p.hidden = !p.hidden;
      if (!p.hidden) App.paintNotifs();
    };
    // Menú móvil
    U.qs('#menu-toggle').onclick = () => U.qs('#sidebar').classList.toggle('open');
    // Reset demo
    U.qs('#reset-demo').onclick = () => {
      U.modal({
        title: 'Restaurar datos de demostración',
        sub: 'Se descartan los cambios locales de este navegador.',
        body: `<p style="font-size:13.5px;line-height:1.6;color:var(--muted)">Esta acción vuelve a generar la cartera de eventos, asistentes, tareas y comunicados con los datos de ejemplo de AURELIA Eventos & Protocolo. Útil para reiniciar la demostración.</p>`,
        foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-danger" id="btn-reset-ok">Restaurar</button>`,
        onMount(root) {
          U.qs('#btn-reset-ok', root).onclick = () => {
            Store.reset(); U.closeModal();
            U.toast('ok', 'Datos restaurados', 'La cartera de demostración se regeneró correctamente.');
            App.go('dashboard'); App.refresh();
          };
        }
      });
    };
    window.addEventListener('hashchange', onRoute);
    onRoute();
    App.paintNotifs();
    // Aviso de bienvenida
    setTimeout(() => U.toast('info', 'AURELIA EventOS', 'Prototipo funcional de gestión de eventos corporativos de alto perfil.'), 700);
  }

  global.App = App;
  document.addEventListener('DOMContentLoaded', boot);
})(window);
