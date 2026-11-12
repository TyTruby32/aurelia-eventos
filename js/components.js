/* ============================================================
   AURELIA EventOS · BIBLIOTECA DE COMPONENTES REUTILIZABLES
   Cada componente es agnóstico de la página que lo consume.
   ============================================================ */
(function (global) {
  'use strict';
  const S = global.Store;
  const F = S.fmt;

  /* ---------------- Utilidades ---------------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (() => { let n = 0; return () => 'c' + (++n); })();
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------------- Iconografía ---------------- */
  const ICONS = {
    dashboard: 'M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z',
    calendar: 'M8 2v4M16 2v4M3 9h18M4 5h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z',
    events: 'M4 5h16v3H4zM4 10h16v10H4zM8 14h3M8 17h6',
    tasks: 'M9 6h11M9 12h11M9 18h11M4 6l1.2 1.2L7 5M4 12l1.2 1.2L7 11M4 18l1.2 1.2L7 17',
    people: 'M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 6a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM22 20v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0119 7a4 4 0 01-3 3.87',
    chat: 'M21 12a8 8 0 01-8 8H8l-4 3v-6.5A8 8 0 0113 4a8 8 0 018 8z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    audit: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
    plus: 'M12 5v14M5 12h14',
    search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-3.5-3.5',
    close: 'M6 6l12 12M18 6L6 18',
    check: 'M20 6L9 17l-5-5',
    clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
    pin: 'M12 21s7-5.5 7-11a7 7 0 10-14 0c0 5.5 7 11 7 11zM12 10a2 2 0 100-4 2 2 0 000 4z',
    money: 'M2 7h20v10H2zM12 15a3 3 0 100-6 3 3 0 000 6z',
    user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
    mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
    warn: 'M12 3l9 16H3L12 3zM12 9v5M12 17h.01',
    info: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8h.01M11 12h1v5h1',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    back: 'M19 12H5M11 18l-6-6 6-6',
    edit: 'M4 20h4L20 8l-4-4L4 16v4z',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
    dots: 'M12 6h.01M12 12h.01M12 18h.01',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
    filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5z',
    download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
    star: 'M12 3l2.9 6.1 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3.1 1.2-6.5L2.5 10l6.6-.9L12 3z',
    sparkle: 'M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3',
    lock: 'M6 11h12v10H6zM9 11V7a3 3 0 016 0v4',
    layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'
  };
  function icon(name, size = 16, extra = '') {
    const d = ICONS[name] || ICONS.grid;
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}><path d="${d}"/></svg>`;
  }

  /* ---------------- Primitivas visuales ---------------- */
  function badge(text, tone = 'b-gray', dot = false) {
    return `<span class="badge ${tone}">${dot ? '<span class="bdot"></span>' : ''}${esc(text)}</span>`;
  }
  function estadoEvento(e) { return badge(S.LABEL.estadoEvento[e.estado], S.TONE.estadoEvento[e.estado], true); }
  function estadoAsistente(e) { return badge(S.LABEL.estadoAsistente[e.estado], S.TONE.estadoAsistente[e.estado], true); }
  function estadoTarea(t) {
    const est = S.S.estadoTarea(t);
    if (est === 'vencida') return badge('Vencida', 'b-danger', true);
    return badge(S.LABEL.estadoTarea[est], S.TONE.estadoTarea[est], true);
  }
  function prioridad(p) { return badge(p, S.TONE.prioridad[p] || 'b-gray'); }
  function progress(pct, tone = '', label = null, lg = false) {
    const p = Math.max(0, Math.min(100, Number(pct) || 0));
    const t = tone || (p === 100 ? 't-teal' : (p >= 60 ? 't-info' : ''));
    return `<div>
      ${label !== null ? `<div class="prog-meta"><span>${esc(label)}</span><span><b>${p}%</b></span></div>` : ''}
      <div class="prog ${t} ${lg ? 'lg' : ''}"><i style="width:${p}%"></i></div>
    </div>`;
  }
  function kpi({ label, value, foot, icon: ic, tone = '' }) {
    return `<div class="kpi ${tone ? 't-' + tone : ''}">
      <div class="kpi-top"><div class="kpi-ico">${icon(ic, 15)}</div><div class="kpi-label">${esc(label)}</div></div>
      <div class="kpi-val">${value}</div>
      ${foot ? `<div class="kpi-foot">${foot}</div>` : ''}
    </div>`;
  }
  function avatar(nombre, cls = 'avatar-sm') {
    const ini = String(nombre || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    return `<div class="${cls}">${esc(ini)}</div>`;
  }
  function empty(title, text, ic = 'layers', action = '') {
    return `<div class="empty"><div class="ico">${icon(ic, 21)}</div><h4>${esc(title)}</h4><p>${esc(text)}</p>${action}</div>`;
  }
  function alerta(tipo, texto) {
    const ico = tipo === 'danger' ? 'warn' : (tipo === 'warn' ? 'warn' : (tipo === 'success' ? 'check' : 'info'));
    return `<div class="alert a-${tipo}">${icon(ico, 16)}<div>${texto}</div></div>`;
  }

  /* ---------------- Toasts ---------------- */
  function toast(tipo, titulo, cuerpo) {
    const stack = qs('#toasts');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (tipo || 'info');
    const ico = tipo === 'ok' ? 'check' : tipo === 'err' ? 'warn' : tipo === 'warn' ? 'warn' : 'info';
    el.innerHTML = `<span class="t-ico">${icon(ico, 17)}</span><div><strong>${esc(titulo)}</strong>${cuerpo ? `<div class="t-body">${esc(cuerpo)}</div>` : ''}</div>`;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 240); }, 4200);
  }

  /* ---------------- Modal ---------------- */
  let modalOnClose = null;
  function modal({ title, sub, body, foot, wide = false, onMount, onClose }) {
    const root = qs('#modal-root');
    root.hidden = false;
    root.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div><h3>${esc(title)}</h3>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div>
        <button class="x" data-close aria-label="Cerrar">${icon('close', 16)}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
    modalOnClose = onClose || null;
    root.onclick = (e) => { if (e.target === root) closeModal(); };
    qsa('[data-close]', root).forEach(b => b.onclick = closeModal);
    document.addEventListener('keydown', escClose);
    if (onMount) onMount(root);
    return root;
  }
  function escClose(e) { if (e.key === 'Escape') closeModal(); }
  function closeModal() {
    const root = qs('#modal-root');
    if (!root || root.hidden) return;
    root.hidden = true; root.innerHTML = '';
    document.removeEventListener('keydown', escClose);
    const cb = modalOnClose; modalOnClose = null;
    if (cb) cb();
  }

  /* ---------------- Campos de formulario ---------------- */
  function field({ id, label, type = 'text', value = '', ph = '', req = false, hint = '', opts = null, full = false, rows = null, msg = '' }) {
    let control;
    if (type === 'select') {
      control = `<select class="select" id="${id}" name="${id}">
        ${opts.map(o => {
          const v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o;
          return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`;
        }).join('')}
      </select>`;
    } else if (type === 'textarea') {
      control = `<textarea class="textarea" id="${id}" name="${id}" placeholder="${esc(ph)}" rows="${rows || 3}">${esc(value)}</textarea>`;
    } else if (type === 'checkbox') {
      return `<div class="field ${full ? 'full' : ''}" data-field="${id}">
        <label class="checkline"><input type="checkbox" id="${id}" name="${id}" ${value ? 'checked' : ''}/> ${esc(label)}</label>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
      </div>`;
    } else {
      control = `<input class="input" id="${id}" name="${id}" type="${type}" value="${esc(value)}" placeholder="${esc(ph)}"
        ${type === 'number' ? 'step="any"' : ''} ${type === 'date' ? '' : ''}/>`;
    }
    return `<div class="field ${full ? 'full' : ''}" data-field="${id}">
      <label for="${id}">${esc(label)}${req ? ' <span class="req">*</span>' : ''}</label>
      ${control}
      ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}
      <span class="msg" data-msg>${esc(msg)}</span>
    </div>`;
  }

  function applyErrors(root, errs) {
    qsa('.field', root).forEach(f => { f.classList.remove('invalid'); f.querySelector('.input,.select,.textarea')?.classList.remove('err'); });
    Object.entries(errs || {}).forEach(([k, m]) => {
      const f = qs(`[data-field="${k}"]`, root);
      if (!f) return;
      f.classList.add('invalid');
      f.querySelector('.input,.select,.textarea')?.classList.add('err');
      const msg = f.querySelector('[data-msg]'); if (msg) msg.textContent = m;
    });
    const first = qs('.field.invalid .input,.field.invalid .select,.field.invalid .textarea', root);
    if (first) first.focus();
  }
  function readForm(root) {
    const out = {};
    qsa('input,select,textarea', root).forEach(el => {
      if (!el.name) return;
      out[el.name] = el.type === 'checkbox' ? el.checked : el.value;
    });
    return out;
  }
  function formGrid(children) { return `<div class="form-grid">${children.join('')}</div>`; }
  function sectionTitle(t) { return `<div class="form-section-title">${esc(t)}</div>`; }

  /* ---------------- Tabla de datos reutilizable ---------------- */
  const tableState = {};
  function dataTable({ key, columns, rows, onRow, searchable = true, searchFields = null, pageSize = 8, toolbarExtra = '', emptyMsg = ['Sin registros', 'No hay información para mostrar con los filtros actuales.'] }) {
    const st = tableState[key] = tableState[key] || { q: '', page: 1, sort: null, dir: 1 };
    let data = rows.slice();
    if (st.q && searchable) {
      const q = st.q.toLowerCase();
      data = data.filter(r => {
        const cols = searchFields || columns.map(c => c.k);
        return cols.some(k => String(r[k] == null ? '' : r[k]).toLowerCase().includes(q));
      });
    }
    if (st.sort) {
      data.sort((a, b) => {
        const av = a[st.sort], bv = b[st.sort];
        if (av == null) return 1; if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * st.dir;
        return String(av).localeCompare(String(bv), 'es') * st.dir;
      });
    }
    const total = data.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    st.page = Math.min(st.page, pages);
    const slice = data.slice((st.page - 1) * pageSize, st.page * pageSize);

    const head = columns.map(c => `<th class="${c.sortable === false ? '' : 'sortable'}" data-sort="${c.k}">
      ${esc(c.label)}${st.sort === c.k ? `<span class="arw">${st.dir > 0 ? '▲' : '▼'}</span>` : ''}
    </th>`).join('');

    const body = slice.length ? slice.map(r => `<tr data-row="${esc(r.__id)}">
      ${columns.map(c => `<td class="${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.k])}</td>`).join('')}
    </tr>`).join('') : `<tr><td colspan="${columns.length}">${empty(...emptyMsg)}</td></tr>`;

    return `<div class="card" data-table="${key}">
      ${searchable ? `<div class="tbl-toolbar">
        <div class="tbl-search">${icon('search', 14)}<input type="text" data-tq="${key}" value="${esc(st.q)}" placeholder="Buscar…"/></div>
        ${toolbarExtra}
        <div class="spacer"></div>
        <span class="tiny muted">${total} registro${total === 1 ? '' : 's'}</span>
      </div>` : (toolbarExtra ? `<div class="tbl-toolbar">${toolbarExtra}</div>` : '')}
      <div class="tbl-wrap"><table class="tbl"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      ${pages > 1 ? `<div class="pager">
        <button class="pbtn" data-pg="prev" ${st.page === 1 ? 'disabled' : ''}>‹</button>
        <span>Página ${st.page} de ${pages}</span>
        <button class="pbtn" data-pg="next" ${st.page === pages ? 'disabled' : ''}>›</button>
        <div class="spacer"></div><span class="tiny">${total} resultados</span>
      </div>` : ''}
    </div>`;
  }
  function bindTable(root, key, rows, onRow) {
    const st = tableState[key];
    const inp = qs(`[data-tq="${key}"]`, root);
    if (inp) inp.oninput = (e) => { st.q = e.target.value; st.page = 1; rerender(root); };
    qsa('[data-sort]', root).forEach(th => th.onclick = () => {
      const k = th.dataset.sort;
      if (st.sort === k) st.dir *= -1; else { st.sort = k; st.dir = 1; }
      rerender(root);
    });
    const prev = qs('[data-pg="prev"]', root), next = qs('[data-pg="next"]', root);
    if (prev) prev.onclick = () => { st.page--; rerender(root); };
    if (next) next.onclick = () => { st.page++; rerender(root); };
    qsa('[data-row]', root).forEach(tr => tr.onclick = (e) => {
      if (e.target.closest('button,a')) return;
      const row = rows.find(r => String(r.__id) === tr.dataset.row);
      if (row && onRow) onRow(row);
    });
    function rerender() { if (global.App && global.App.refresh) global.App.refresh(); }
  }

  /* ---------------- Calendario reutilizable ---------------- */
  const calState = { y: null, m: null };
  function calendar({ eventos, onPick, compact = false, id = 'cal' }) {
    const hoy = new Date();
    if (calState.y === null) { calState.y = hoy.getFullYear(); calState.m = hoy.getMonth(); }
    const y = calState.y, m = calState.m;
    const first = new Date(y, m, 1);
    const startDow = (first.getDay() + 6) % 7; // lunes primero
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const dow = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const byDay = {};
    eventos.forEach(ev => {
      const ini = new Date(ev.fechaInicio), fin = new Date(ev.fechaFin || ev.fechaInicio);
      const cur = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
      let guard = 0;
      while (cur <= fin && guard++ < 60) {
        const k = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`;
        (byDay[k] = byDay[k] || []).push(ev);
        cur.setDate(cur.getDate() + 1);
      }
    });

    let cells = '';
    for (let i = 0; i < startDow; i++) {
      const d = prevDays - startDow + i + 1;
      cells += `<div class="cal-cell out"><div class="cal-day">${d}</div></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = y === hoy.getFullYear() && m === hoy.getMonth() && d === hoy.getDate();
      const evs = byDay[`${y}-${m}-${d}`] || [];
      const max = compact ? 2 : 3;
      cells += `<div class="cal-cell ${isToday ? 'today' : ''}">
        <div class="cal-day">${d}</div>
        ${evs.slice(0, max).map(ev => `<div class="cal-ev e-${ev.estado}" data-ev="${ev.id}" title="${esc(ev.nombre)}">${esc(ev.nombre)}</div>`).join('')}
        ${evs.length > max ? `<div class="cal-more">+${evs.length - max} más</div>` : ''}
      </div>`;
    }
    const tail = (7 - ((startDow + daysInMonth) % 7)) % 7;
    for (let i = 1; i <= tail; i++) cells += `<div class="cal-cell out"><div class="cal-day">${i}</div></div>`;

    return `<div class="card" data-cal="${id}">
      <div class="cal-head">
        <div class="cal-title">${F.MESES[m]} ${y}</div>
        <div class="cal-nav">
          <button class="icon-btn" data-cal-prev style="width:30px;height:30px">${icon('back', 15)}</button>
          <button class="btn btn-sm btn-outline" data-cal-today>Hoy</button>
          <button class="icon-btn" data-cal-next style="width:30px;height:30px">${icon('arrow', 15)}</button>
        </div>
      </div>
      <div class="cal-grid">${dow.map(d => `<div class="cal-dow">${d}</div>`).join('')}${cells}</div>
    </div>`;
  }
  function bindCalendar(root, { eventos, onPick, id = 'cal', repaint }) {
    const nav = (delta) => {
      calState.m += delta;
      if (calState.m > 11) { calState.m = 0; calState.y++; }
      if (calState.m < 0) { calState.m = 11; calState.y--; }
      repaint();
    };
    qs('[data-cal-prev]', root)?.addEventListener('click', () => nav(-1));
    qs('[data-cal-next]', root)?.addEventListener('click', () => nav(1));
    qs('[data-cal-today]', root)?.addEventListener('click', () => {
      const h = new Date(); calState.y = h.getFullYear(); calState.m = h.getMonth(); repaint();
    });
    qsa('[data-ev]', root).forEach(el => el.addEventListener('click', (e) => {
      e.stopPropagation();
      const ev = eventos.find(x => String(x.id) === el.dataset.ev);
      if (ev && onPick) onPick(ev);
    }));
  }

  /* ---------------- Kanban ---------------- */
  function kanban(tareas, { onOpen, onMove, asignados = {} }) {
    const cols = [
      { k: 'pendiente', t: 'Pendiente', c: '#98A1B0' },
      { k: 'en_progreso', t: 'En progreso', c: '#2D5F9A' },
      { k: 'bloqueada', t: 'Bloqueada', c: '#B4472F' },
      { k: 'completada', t: 'Completada', c: '#2C7A5B' }
    ];
    return `<div class="kanban">${cols.map(col => {
      const items = tareas.filter(t => t.estado === col.k);
      return `<div class="kcol" data-col="${col.k}">
        <div class="kcol-head"><span class="cdot" style="background:${col.c}"></span>${col.t}<span class="cnt">${items.length}</span></div>
        ${items.map(t => {
          const vencida = new Date(t.vencimiento) < F.hoyInicio() && t.estado !== 'completada';
          return `<div class="kcard" draggable="true" data-task="${t.id}">
            <div class="kcard-top"><span class="prio p-${(t.prioridad || 'Media').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}"></span>
              ${badge(t.categoria, 'b-gray')}</div>
            <div class="kcard-title">${esc(t.titulo)}</div>
            <div class="kcard-meta">
              ${vencida ? badge('Vencida', 'b-danger') : ''}
              <span>${icon('clock', 11)} ${F.fCorto(t.vencimiento)}</span>
            </div>
            ${t.progreso > 0 && t.progreso < 100 ? `<div class="prog"><i style="width:${t.progreso}%"></i></div>` : ''}
          </div>`;
        }).join('')}
        ${!items.length ? `<div class="tiny muted" style="padding:12px 6px;text-align:center">Sin tareas</div>` : ''}
      </div>`;
    }).join('')}</div>`;
  }
  function bindKanban(root, { onOpen, onMove }) {
    let dragId = null;
    qsa('.kcard', root).forEach(c => {
      c.addEventListener('dragstart', (e) => { dragId = c.dataset.task; c.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      c.addEventListener('dragend', () => { c.classList.remove('dragging'); dragId = null; });
      c.addEventListener('click', () => { if (onOpen) onOpen(Number(c.dataset.task)); });
    });
    qsa('.kcol', root).forEach(col => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault(); col.classList.remove('drag-over');
        if (!dragId) return;
        const res = onMove(Number(dragId), col.dataset.col);
        if (res && !res.ok) { toast('err', 'No se pudo mover la tarea', res.msg); }
      });
    });
  }

  /* ============================================================
     COMPONENTE REUTILIZABLE 01 · FORMULARIO DE ASISTENTE
     Usado en: Alta de evento · Detalle de evento · Registro público
     ============================================================ */
  function formAsistente({ eventoId = '', eventoFijo = false, eventos = [], compacto = false } = {}) {
    return `<div data-form="asistente">
      ${sectionTitle('Datos de identificación')}
      <div class="form-grid">
        ${field({ id: 'a_nombre', label: 'Nombre completo', req: true, ph: 'Ej. Valeria Montemayor Ruiz', full: true })}
        ${field({ id: 'a_email', label: 'Correo electrónico', type: 'email', req: true, ph: 'nombre@empresa.mx', hint: 'Se usa para enviar la confirmación y el código de acceso.' })}
        ${field({ id: 'a_telefono', label: 'Teléfono', ph: '+52 55 1234 5678', hint: 'Obligatorio para asistentes VIP.' })}
        ${field({ id: 'a_empresa', label: 'Empresa / organización', req: true, ph: 'Grupo Altamira' })}
        ${field({ id: 'a_puesto', label: 'Puesto', ph: 'Directora General' })}
        ${field({ id: 'a_evento', label: 'Evento destino', type: 'select', value: eventoId, req: true,
          opts: [{ v: '', l: '— Selecciona un evento —' }].concat(eventos.map(e => ({ v: e.id, l: e.nombre }))) })}
      </div>
      ${sectionTitle('Clasificación y preferencias')}
      <div class="form-grid">
        ${field({ id: 'a_tipo', label: 'Tipo de asistente', type: 'select', value: 'Corporativo', opts: S.ENUM.tipoAsistente, req: true })}
        ${field({ id: 'a_acompanantes', label: 'Acompañantes', type: 'number', value: 0, hint: 'De 0 a 5 personas adicionales.' })}
        ${field({ id: 'a_dieta', label: 'Restricciones alimentarias', type: 'select', value: 'Ninguna',
          opts: ['Ninguna', 'Vegetariana', 'Vegana', 'Sin gluten', 'Sin lactosa', 'Kosher', 'Alergia a frutos secos'] })}
        ${field({ id: 'a_notas', label: 'Notas de protocolo', type: 'textarea', ph: 'Indicaciones especiales de trato, accesibilidad o seguridad…', rows: 2 })}
      </div>
      ${alerta('info', 'El asistente se registra con estado <b>Pendiente</b>. La confirmación valida el aforo disponible del evento y envía la notificación automática.')}
    </div>`;
  }
  function submitAsistente(root) {
    const d = readForm(qs('[data-form="asistente"]', root));
    const res = S.ACT_RegistrarAsistente({
      nombre: d.a_nombre, email: d.a_email, telefono: d.a_telefono, empresa: d.a_empresa,
      puesto: d.a_puesto, tipo: d.a_tipo, acompanantes: d.a_acompanantes, dieta: d.a_dieta, notas: d.a_notas
    }, d.a_evento);
    if (!res.ok) applyErrors(qs('[data-form="asistente"]', root), res.errs);
    return res;
  }

  /* ============================================================
     COMPONENTE REUTILIZABLE 02 · FORMULARIO DE EVENTO
     Usado en: Crear evento · Editar evento
     ============================================================ */
  function formEvento(ev = {}) {
    const pad = (n) => String(n).padStart(2, '0');
    const toInput = (s) => s ? `${new Date(s).getFullYear()}-${pad(new Date(s).getMonth() + 1)}-${pad(new Date(s).getDate())}` : '';
    return `<div data-form="evento">
      ${sectionTitle('Datos generales')}
      <div class="form-grid">
        ${field({ id: 'e_nombre', label: 'Nombre del evento', req: true, value: ev.nombre || '', ph: 'Cumbre de Inversión Altamira 2027', full: true })}
        ${field({ id: 'e_cliente', label: 'Cliente', req: true, value: ev.cliente || '', ph: 'Grupo Altamira' })}
        ${field({ id: 'e_tipo', label: 'Tipo de evento', type: 'select', value: ev.tipo || 'Cumbre ejecutiva', opts: S.ENUM.tipoEvento, req: true })}
        ${field({ id: 'e_inicio', label: 'Fecha de inicio', type: 'date', value: toInput(ev.fechaInicio) || F.isoDay(new Date()), req: true })}
        ${field({ id: 'e_fin', label: 'Fecha de fin', type: 'date', value: toInput(ev.fechaFin) || F.isoDay(new Date()), req: true })}
        ${field({ id: 'e_lugar', label: 'Sede / recinto', req: true, value: ev.lugar || '', ph: 'Hotel Camino Real Polanco · Salón Virreyes', full: true })}
        ${field({ id: 'e_aforo', label: 'Aforo máximo', type: 'number', req: true, value: ev.aforo || 100, hint: 'Capacidad total incluyendo acompañantes.' })}
        ${field({ id: 'e_presupuesto', label: 'Presupuesto (MXN)', type: 'number', req: true, value: ev.presupuesto || 0 })}
        ${field({ id: 'e_estado', label: 'Estado inicial', type: 'select', value: ev.estado || 'borrador',
          opts: S.ENUM.estadoEvento.map(k => ({ v: k, l: S.LABEL.estadoEvento[k] })) })}
        ${field({ id: 'e_responsable', label: 'Responsable', value: ev.responsable || S.USUARIO.nombre })}
        ${field({ id: 'e_desc', label: 'Descripción / brief', type: 'textarea', value: ev.descripcion || '', ph: 'Objetivo del evento, público objetivo, requerimientos especiales…', rows: 3, full: true })}
      </div>
      ${sectionTitle('Configuración de protocolo')}
      ${field({ id: 'e_vip', label: 'Requiere protocolo VIP y atención preferente', type: 'checkbox', value: ev.protocoloVIP !== false })}
      ${!ev.id ? field({ id: 'e_tareas', label: 'Generar automáticamente las tareas de la plantilla del tipo de evento', type: 'checkbox', value: true, hint: 'Microflujo SUB_GenerarTareasPlantilla: crea entre 5 y 8 tareas con fechas relativas.' }) : ''}
    </div>`;
  }
  function submitEvento(root, id = null) {
    const d = readForm(qs('[data-form="evento"]', root));
    const payload = {
      nombre: d.e_nombre, cliente: d.e_cliente, tipo: d.e_tipo,
      fechaInicio: d.e_inicio ? d.e_inicio + 'T09:00:00' : '',
      fechaFin: d.e_fin ? d.e_fin + 'T18:00:00' : '',
      lugar: d.e_lugar, aforo: d.e_aforo, presupuesto: d.e_presupuesto,
      estado: d.e_estado, responsable: d.e_responsable, descripcion: d.e_desc,
      protocoloVIP: d.e_vip, generarTareas: d.e_tareas !== false
    };
    const res = id ? S.ACT_ActualizarEvento(id, payload) : S.ACT_CrearEvento(payload);
    if (!res.ok) applyErrors(qs('[data-form="evento"]', root), res.errs);
    return res;
  }

  /* ============================================================
     COMPONENTE REUTILIZABLE 03 · FORMULARIO DE TAREA
     ============================================================ */
  function formTarea({ eventoId = '', eventos = [] } = {}) {
    return `<div data-form="tarea">
      <div class="form-grid">
        ${field({ id: 't_titulo', label: 'Título de la tarea', req: true, ph: 'Confirmar montaje de escenario', full: true })}
        ${field({ id: 't_evento', label: 'Evento', type: 'select', req: true, value: eventoId,
          opts: [{ v: '', l: '— Selecciona —' }].concat(eventos.map(e => ({ v: e.id, l: e.nombre }))) })}
        ${field({ id: 't_categoria', label: 'Categoría', type: 'select', value: 'Logística', opts: S.ENUM.categoria })}
        ${field({ id: 't_prioridad', label: 'Prioridad', type: 'select', value: 'Media', opts: S.ENUM.prioridad })}
        ${field({ id: 't_vencimiento', label: 'Fecha límite', type: 'date', value: F.isoDay(new Date()), req: true })}
        ${field({ id: 't_horas', label: 'Horas estimadas', type: 'number', value: 8 })}
        ${field({ id: 't_desc', label: 'Descripción', type: 'textarea', rows: 3, full: true, ph: 'Entregable esperado, criterios de aceptación…' })}
      </div>
    </div>`;
  }
  function submitTarea(root) {
    const d = readForm(qs('[data-form="tarea"]', root));
    const res = S.ACT_CrearTarea({
      titulo: d.t_titulo, eventoId: d.t_evento, categoria: d.t_categoria,
      prioridad: d.t_prioridad, vencimiento: d.t_vencimiento ? d.t_vencimiento + 'T18:00:00' : '',
      horasEstimadas: d.t_horas, descripcion: d.t_desc
    });
    if (!res.ok) applyErrors(qs('[data-form="tarea"]', root), res.errs);
    return res;
  }

  /* ---------------- Gráficas ---------------- */
  function bars(data, { max = null, money = false } = {}) {
    const m = max || Math.max(...data.map(d => d.v), 1);
    return `<div class="bars">${data.map(d => `<div class="bar-col">
      <div class="bv">${money ? (d.v / 1000).toFixed(0) + 'k' : d.v}</div>
      <div class="bar" style="height:${Math.max(3, (d.v / m) * 100)}%" title="${esc(d.l)}: ${d.v}"></div>
      <div class="bl">${esc(d.l)}</div>
    </div>`).join('')}</div>`;
  }
  function donut(parts) {
    const total = parts.reduce((s, p) => s + p.v, 0) || 1;
    const R = 46, C = 2 * Math.PI * R;
    let off = 0;
    const segs = parts.map(p => {
      const len = (p.v / total) * C;
      const s = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${p.c}" stroke-width="13"
        stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"
        transform="rotate(-90 60 60)" stroke-linecap="butt"/>`;
      off += len; return s;
    }).join('');
    return `<div class="donut-wrap">
      <svg width="120" height="120" viewBox="0 0 120 120">${segs}
        <text x="60" y="56" text-anchor="middle" font-size="19" font-family="Fraunces,Georgia,serif" fill="#16202F" font-weight="600">${total}</text>
        <text x="60" y="71" text-anchor="middle" font-size="8.5" fill="#6B7688" letter-spacing="1.2">TOTAL</text>
      </svg>
      <div class="legend">${parts.map(p => `<div class="lg"><span class="sw" style="background:${p.c}"></span><span>${esc(p.l)}</span><span>${p.v}</span></div>`).join('')}</div>
    </div>`;
  }

  /* ---------------- Tabs ---------------- */
  function tabs(items, active) {
    return `<div class="tabs">${items.map(t => `<button class="tab ${t.k === active ? 'on' : ''}" data-tab="${t.k}">
      ${esc(t.l)}${t.c != null ? `<span class="cnt">${t.c}</span>` : ''}</button>`).join('')}</div>`;
  }

  /* ---------------- Exposición ---------------- */
  global.UI = {
    esc, icon, badge, estadoEvento, estadoAsistente, estadoTarea, prioridad, progress, kpi,
    avatar, empty, alerta, toast, modal, closeModal, field, readForm, applyErrors, formGrid,
    sectionTitle, dataTable, bindTable, calendar, bindCalendar, kanban, bindKanban,
    formAsistente, submitAsistente, formEvento, submitEvento, formTarea, submitTarea,
    bars, donut, tabs, qs, qsa, uid
  };
})(window);
