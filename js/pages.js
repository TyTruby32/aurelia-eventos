/* ============================================================
   AURELIA EventOS · PÁGINAS
   Cada página consume los componentes reutilizables de UI.
   ============================================================ */
(function (global) {
  'use strict';
  const Store = global.Store, S = Store.S, F = Store.fmt, U = global.UI;
  const esc = U.esc, icon = U.icon;
  const on = (root, sel, ev, fn) => U.qsa(sel, root).forEach(el => el.addEventListener(ev, fn));

  const Pages = {};
  let detailTab = 'resumen';

  /* =========================================================
     MODALES REUTILIZABLES
     ========================================================= */
  function openNuevoEvento() {
    U.modal({
      title: 'Crear evento', sub: 'Los datos alimentan el microflujo ACT_CrearEvento y su validación.',
      wide: true,
      body: U.formEvento({}),
      foot: `<button class="btn btn-ghost" data-close>Cancelar</button>
             <button class="btn btn-primary" id="btn-save-ev">${icon('check', 15)} Crear evento</button>`,
      onMount(root) {
        U.qs('#btn-save-ev', root).onclick = () => {
          const res = U.submitEvento(root);
          if (!res.ok) return U.toast('err', 'No se pudo crear el evento', res.msg);
          U.closeModal();
          U.toast('ok', 'Evento creado', res.msg);
          global.App.go('evento/' + res.data.id);
        };
      }
    });
  }

  function openRegistrarAsistente(eventoId) {
    const evs = S.eventos().filter(e => e.estado !== 'cancelado' && e.estado !== 'finalizado');
    if (!evs.length) return U.toast('warn', 'Sin eventos disponibles', 'Todos los eventos están finalizados o cancelados.');
    U.modal({
      title: 'Registrar asistente', sub: 'Formulario reutilizable · COMP_FormularioAsistente',
      wide: true,
      body: U.formAsistente({ eventoId: eventoId || evs[0].id, eventos: evs }),
      foot: `<button class="btn btn-ghost" data-close>Cancelar</button>
             <button class="btn btn-gold" id="btn-save-as">${icon('user', 15)} Registrar asistente</button>`,
      onMount(root) {
        U.qs('#btn-save-as', root).onclick = () => {
          const res = U.submitAsistente(root);
          if (!res.ok) return U.toast('err', 'Registro rechazado', res.msg);
          U.closeModal();
          U.toast('ok', 'Asistente registrado', res.msg);
          global.App.refresh();
        };
      }
    });
  }

  function openTareaModal(eventoId) {
    const evs = S.eventos().filter(e => e.estado !== 'cancelado' && e.estado !== 'finalizado');
    if (!evs.length) return U.toast('warn', 'Sin eventos activos', 'No hay eventos que admitan nuevas tareas.');
    U.modal({
      title: 'Nueva tarea', sub: 'Microflujo ACT_CrearTarea',
      body: U.formTarea({ eventoId: eventoId || evs[0].id, eventos: evs }),
      foot: `<button class="btn btn-ghost" data-close>Cancelar</button>
             <button class="btn btn-primary" id="btn-save-t">${icon('check', 15)} Crear tarea</button>`,
      onMount(root) {
        U.qs('#btn-save-t', root).onclick = () => {
          const res = U.submitTarea(root);
          if (!res.ok) return U.toast('err', 'No se pudo crear la tarea', res.msg);
          U.closeModal(); U.toast('ok', 'Tarea creada', res.msg); global.App.refresh();
        };
      }
    });
  }

  function openTareaDetalle(id) {
    const t = S.tarea(id);
    if (!t) return;
    const ev = S.evento(t.eventoId);
    const asg = S.asignadosDe(t.id);
    const inscritos = S.asistentesDe(t.eventoId);
    U.modal({
      title: t.titulo, sub: `${ev.nombre} · ${t.categoria} · vence ${F.fLarga(t.vencimiento)}`,
      wide: true,
      body: `
        <div class="row row-wrap mb-12">${U.estadoTarea(t)} ${U.prioridad(t.prioridad)} ${U.badge('Vence ' + F.fCorto(t.vencimiento), 'b-gray')}</div>
        <p class="muted" style="font-size:13px;line-height:1.6">${esc(t.descripcion)}</p>
        <div class="divider"></div>
        ${U.sectionTitle('Progreso de la tarea')}
        <div class="field">
          <input type="range" min="0" max="100" step="5" value="${t.progreso}" id="rango-prog" style="width:100%;accent-color:#B8934A"/>
          <div class="prog-meta"><span>Avance registrado</span><span><b id="prog-val">${t.progreso}%</b></span></div>
          <div class="prog lg t-teal"><i id="prog-bar" style="width:${t.progreso}%"></i></div>
        </div>
        ${U.sectionTitle('Responsables asignados')}
        ${asg.length ? `<div class="card" style="box-shadow:none">${asg.map(a => `<div class="list-row">
            ${U.avatar(a.asistente.nombre)}
            <div class="lr-main"><div class="lr-title">${esc(a.asistente.nombre)}</div><div class="lr-sub">${esc(a.rol)} · ${esc(a.asistente.empresa)}</div></div>
            <button class="btn btn-sm btn-ghost" data-unassign="${a.id}">Retirar</button>
          </div>`).join('')}</div>` : `<p class="tiny muted">Sin responsables asignados.</p>`}
        <div class="row" style="margin-top:14px;gap:8px">
          <select class="select" id="sel-asignar" style="max-width:230px">
            <option value="">— Asignar a —</option>
            ${inscritos.filter(a => !asg.some(x => x.asistenteId === a.id)).map(a => `<option value="${a.id}">${esc(a.nombre)} (${a.tipo})</option>`).join('')}
          </select>
          <input class="input" id="rol-asignar" placeholder="Rol en la tarea" style="max-width:200px"/>
          <button class="btn btn-outline btn-sm" id="btn-asignar">Asignar</button>
        </div>
        ${t.bloqueoMotivo ? U.alerta('warn', '<b>Tarea bloqueada:</b> ' + esc(t.bloqueoMotivo)) : ''}
      `,
      foot: `<button class="btn btn-ghost" data-close>Cerrar</button>
             <button class="btn btn-primary" id="btn-prog">${icon('check', 15)} Guardar progreso</button>`,
      onMount(root) {
        const rango = U.qs('#rango-prog', root);
        rango.oninput = () => {
          U.qs('#prog-val', root).textContent = rango.value + '%';
          U.qs('#prog-bar', root).style.width = rango.value + '%';
        };
        U.qs('#btn-prog', root).onclick = () => {
          const res = Store.ACT_ActualizarProgreso(t.id, rango.value);
          U.closeModal(); U.toast(res.ok ? 'ok' : 'err', 'Progreso', res.msg); global.App.refresh();
        };
        U.qs('#btn-asignar', root)?.addEventListener('click', () => {
          const aid = U.qs('#sel-asignar', root).value;
          const rol = U.qs('#rol-asignar', root).value;
          if (!aid) return U.toast('warn', 'Selecciona a quién asignar', 'Debes elegir un asistente inscrito en el evento.');
          const res = Store.ACT_AsignarTarea(t.id, aid, rol);
          U.toast(res.ok ? 'ok' : 'err', 'Asignación de tarea', res.msg);
          if (res.ok) { U.closeModal(); global.App.refresh(); }
        });
        on(root, '[data-unassign]', 'click', (e) => {
          const res = Store.ACT_QuitarAsignacion(e.currentTarget.dataset.unassign);
          U.toast('warn', 'Asignación', res.msg); U.closeModal(); global.App.refresh();
        });
      }
    });
  }

  /* =========================================================
     1 · PANEL DE CONTROL
     ========================================================= */
  Pages.dashboard = {
    title: 'Panel de control', crumb: 'Panel de control',
    render() {
      const k = S.kpis();
      const proximos = S.proximosEventos().slice(0, 4);
      const criticas = S.tareas().filter(t => t.estado !== 'completada' && (t.prioridad === 'Crítica' || t.prioridad === 'Alta'))
        .filter(t => { const e = S.evento(t.eventoId); return e && e.estado !== 'cancelado' && e.estado !== 'finalizado'; })
        .sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento)).slice(0, 5);
      const evsCal = S.eventos().filter(e => e.estado !== 'cancelado');

      return `
      <div class="page-head">
        <div>
          <div class="eyebrow">Aurelia EventOS · Operación</div>
          <h1>Panel de control</h1>
          <div class="sub">Vista ejecutiva de la cartera de eventos de alto perfil: avance de tareas, aforo comprometido y próximos hitos de protocolo.</div>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" id="btn-registro-rapido">${icon('user', 15)} Registrar asistente</button>
          <button class="btn btn-gold" id="btn-nuevo-ev">${icon('plus', 15)} Nuevo evento</button>
        </div>
      </div>

      <div class="grid g-4" style="margin-bottom:16px">
        ${U.kpi({ label: 'Eventos activos', value: k.eventosActivos, icon: 'events', foot: `<span class="up">↑</span> de ${k.totalEventos} en la cartera` })}
        ${U.kpi({ label: 'Tareas abiertas', value: k.tareasAbiertas, icon: 'tasks', tone: 'info', foot: `<span class="down">${k.vencidas}</span> vencidas requieren atención` })}
        ${U.kpi({ label: 'Asistentes registrados', value: F.num(k.asistentes), icon: 'people', tone: 'teal', foot: `${k.confirmados} confirmados y acreditados` })}
        ${U.kpi({ label: 'Cumplimiento operativo', value: k.cumplimiento + '<small>%</small>', icon: 'chart', tone: 'violet', foot: `${k.completadas} tareas cerradas en la cartera` })}
      </div>

      <div class="grid g-main">
        <div class="stack">
          <div class="card">
            <div class="card-head">
              <div><h3>Próximos eventos</h3><div class="sub">Ordenados por fecha de inicio</div></div>
              <div class="right"><button class="btn btn-sm btn-outline" data-go="eventos">Ver todos ${icon('arrow', 12)}</button></div>
            </div>
            ${proximos.length ? proximos.map(e => {
              const oc = S.ocupacion(e.id), av = S.avanceEvento(e.id), dh = F.diasHasta(e.fechaInicio);
              return `<div class="list-row" data-ev-go="${e.id}" style="cursor:pointer;padding:14px 20px">
                <div style="width:52px;text-align:center;flex:0 0 52px">
                  <div style="font-family:var(--serif);font-size:20px;font-weight:600;line-height:1">${new Date(e.fechaInicio).getDate()}</div>
                  <div style="font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)">${F.MESES[new Date(e.fechaInicio).getMonth()].slice(0, 3)}</div>
                </div>
                <div class="lr-main">
                  <div class="row" style="gap:8px;flex-wrap:wrap"><div class="lr-title">${esc(e.nombre)}</div>${U.estadoEvento(e)}</div>
                  <div class="lr-sub">${esc(e.cliente)} · ${esc(e.lugar)}</div>
                  <div style="display:flex;gap:16px;margin-top:7px">
                    <div style="flex:1"><div class="prog-meta"><span>Tareas</span><span>${av}%</span></div>${U.progress(av)}</div>
                    <div style="flex:1"><div class="prog-meta"><span>Aforo</span><span>${oc.usados}/${oc.aforo}</span></div>${U.progress(oc.pct, oc.pct > 90 ? 't-danger' : 't-info')}</div>
                  </div>
                </div>
                <div style="text-align:right;flex:0 0 78px">
                  <div style="font-size:12px;font-weight:700;color:${dh <= 7 ? 'var(--danger)' : 'var(--text)'}">${dh === 0 ? 'Hoy' : dh > 0 ? 'en ' + dh + ' d' : 'hace ' + Math.abs(dh) + ' d'}</div>
                  <div class="tiny muted">${F.fCorto(e.fechaInicio)}</div>
                </div>
              </div>`;
            }).join('') : U.empty('Sin eventos próximos', 'Crea un evento para comenzar a planificar.')}
          </div>

          <div class="card">
            <div class="card-head"><div><h3>Tareas críticas en curso</h3><div class="sub">Prioridad alta y crítica sin cerrar</div></div>
              <div class="right"><button class="btn btn-sm btn-outline" data-go="tareas">Tablero ${icon('arrow', 12)}</button></div></div>
            ${criticas.length ? criticas.map(t => {
              const ev = S.evento(t.eventoId);
              const venc = new Date(t.vencimiento) < F.hoyInicio();
              return `<div class="list-row" data-task-open="${t.id}" style="cursor:pointer">
                <span class="prio p-${t.prioridad.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}" style="width:8px;height:8px;flex:0 0 8px"></span>
                <div class="lr-main"><div class="lr-title">${esc(t.titulo)}</div>
                  <div class="lr-sub">${esc(ev ? ev.nombre : '—')} · ${esc(t.categoria)}</div></div>
                <div style="width:110px">${U.progress(t.progreso)}</div>
                <div style="text-align:right;flex:0 0 92px">${venc ? U.badge('Vencida', 'b-danger') : U.badge(F.fCorto(t.vencimiento), 'b-gray')}</div>
              </div>`;
            }).join('') : U.empty('Sin tareas críticas', 'Todas las tareas de prioridad alta están cerradas.')}
          </div>
        </div>

        <div class="stack">
          <div class="kv-strip" style="flex-direction:column">
            <div class="kv"><div class="l">Presupuesto en cartera</div><div class="v" style="font-size:20px">${F.money(k.presupuesto)}</div></div>
          </div>
          ${U.calendar({ eventos: evsCal, id: 'dash' })}
          <div class="card">
            <div class="card-head"><div><h3>Actividad reciente</h3></div></div>
            <div class="card-pad">
              <div class="timeline">
                ${S.bitacora().slice(0, 5).map(b => `<div class="tl-item ${b.severidad === 'danger' ? 't-danger' : (b.severidad === 'info' ? 't-info' : '')}">
                  <div class="tl-time">${F.fFechaHora(b.fecha)}</div>
                  <div class="tl-title">${esc(b.accion)}</div>
                  <div class="tl-sub">${esc(b.detalle)}</div>
                </div>`).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>`;
    },
    mount(root, repaint) {
      U.qs('#btn-nuevo-ev', root).onclick = openNuevoEvento;
      U.qs('#btn-registro-rapido', root).onclick = () => openRegistrarAsistente();
      on(root, '[data-go]', 'click', e => global.App.go(e.currentTarget.dataset.go));
      on(root, '[data-ev-go]', 'click', e => global.App.go('evento/' + e.currentTarget.dataset.evGo));
      on(root, '[data-task-open]', 'click', e => openTareaDetalle(Number(e.currentTarget.dataset.taskOpen)));
      U.bindCalendar(root, { eventos: S.eventos().filter(e => e.estado !== 'cancelado'), onPick: ev => global.App.go('evento/' + ev.id), repaint });
    }
  };

  /* =========================================================
     2 · CALENDARIO
     ========================================================= */
  Pages.calendario = {
    title: 'Calendario', crumb: 'Calendario',
    render() {
      const evs = S.eventos();
      const mes = F.MESES[new Date().getMonth()];
      return `<div class="page-head">
        <div><div class="eyebrow">Programación</div><h1>Calendario de eventos</h1>
        <div class="sub">Componente reutilizable <span class="mono">COMP_CalendarioEventos</span>, el mismo que se consume en el panel de control y en esta pantalla.</div></div>
        <div class="page-actions"><button class="btn btn-gold" id="btn-nuevo-ev">${icon('plus', 15)} Nuevo evento</button></div>
      </div>
      <div class="grid g-main">
        ${U.calendar({ eventos: evs, id: 'full' })}
        <div class="stack">
          <div class="card">
            <div class="card-head"><div><h3>Leyenda de estados</h3></div></div>
            <div class="card-pad">
              <div class="tag-list">
                ${Store.ENUM.estadoEvento.map(k => `<div class="cal-ev e-${k}" style="cursor:default;width:100%;padding:6px 9px;margin-bottom:5px">${S.LABEL.estadoEvento[k]}</div>`).join('')}
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Agenda del mes</h3><div class="sub">${mes} · ${evs.filter(e => new Date(e.fechaInicio).getMonth() === new Date().getMonth()).length} eventos</div></div></div>
            ${evs.sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)).slice(0, 6).map(e => `
              <div class="list-row" data-ev-go="${e.id}" style="cursor:pointer">
                <div class="lr-main"><div class="lr-title">${esc(e.nombre)}</div><div class="lr-sub">${F.fCorto(e.fechaInicio)} · ${esc(e.lugar)}</div></div>
                ${U.estadoEvento(e)}
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    },
    mount(root, repaint) {
      U.qs('#btn-nuevo-ev', root).onclick = openNuevoEvento;
      on(root, '[data-ev-go]', 'click', e => global.App.go('evento/' + e.currentTarget.dataset.evGo));
      U.bindCalendar(root, { eventos: S.eventos(), onPick: ev => global.App.go('evento/' + ev.id), repaint });
    }
  };

  /* =========================================================
     3 · LISTA DE EVENTOS
     ========================================================= */
  Pages.eventos = {
    title: 'Eventos', crumb: 'Eventos',
    render() {
      const rows = S.eventos().map(e => {
        const oc = S.ocupacion(e.id), av = S.avanceEvento(e.id);
        return {
          __id: e.id, nombre: e.nombre, cliente: e.cliente, tipo: e.tipo,
          estado: e.estado, inicio: new Date(e.fechaInicio).getTime(),
          nAsist: S.inscripcionesDe(e.id).length, avance: av, aforoPct: oc.pct, usados: oc.usados, aforo: e.aforo
        };
      });
      return `<div class="page-head">
        <div><div class="eyebrow">Cartera</div><h1>Eventos</h1>
        <div class="sub">Administra el ciclo de vida completo: de borrador a cierre documental, con control de aforo, presupuesto y avance operativo.</div></div>
        <div class="page-actions">
          <button class="btn btn-outline" id="btn-exp">${icon('download', 15)} Exportar</button>
          <button class="btn btn-gold" id="btn-nuevo-ev">${icon('plus', 15)} Nuevo evento</button>
        </div>
      </div>
      ${U.dataTable({
        key: 'eventos',
        rows,
        pageSize: 7,
        toolbarExtra: `<div class="chips">${['todos'].concat(Store.ENUM.estadoEvento).map(k => `<button class="chip" data-f="${k}">${k === 'todos' ? 'Todos' : S.LABEL.estadoEvento[k]}</button>`).join('')}</div>`,
        columns: [
          { k: 'nombre', label: 'Evento', render: r => `<div class="cell-main">${esc(r.nombre)}</div><div class="cell-sub">${esc(r.cliente)} · ${esc(r.tipo)}</div>` },
          { k: 'inicio', label: 'Fecha', render: r => `${F.fCorto(r.inicio)}` },
          { k: 'nAsist', label: 'Asistentes', render: r => `<b>${r.nAsist}</b>` },
          { k: 'aforoPct', label: 'Aforo', render: r => `<div style="min-width:110px"><div class="prog-meta"><span class="tiny">${r.usados}/${r.aforo}</span><span class="tiny">${r.aforoPct}%</span></div>${U.progress(r.aforoPct, r.aforoPct > 90 ? 't-danger' : 't-info')}</div>` },
          { k: 'avance', label: 'Avance', render: r => `<div style="min-width:100px">${U.progress(r.avance)}</div>` },
          { k: 'estado', label: 'Estado', render: r => U.estadoEvento({ estado: r.estado }) },
          { k: 'acc', label: '', sortable: false, cls: 'cell-actions', render: r => `<button class="btn btn-sm btn-outline" data-open="${r.__id}">Abrir</button>` }
        ]
      })}`;
    },
    mount(root, repaint) {
      U.qs('#btn-nuevo-ev', root).onclick = openNuevoEvento;
      U.qs('#btn-exp', root).onclick = () => U.toast('ok', 'Exportación generada', 'La cartera de eventos se exportó a CSV (simulado en el prototipo).');
      on(root, '[data-open]', 'click', e => global.App.go('evento/' + e.currentTarget.dataset.open));
      on(root, '[data-f]', 'click', e => {
        const f = e.currentTarget.dataset.f;
        U.qsa('[data-f]', root).forEach(c => c.classList.remove('on'));
        e.currentTarget.classList.add('on');
        const rows = S.eventos().filter(x => f === 'todos' || x.estado === f).map(x => ({ __id: x.id }));
        if (f !== 'todos') U.toast('info', 'Filtro aplicado', `Mostrando eventos en estado «${S.LABEL.estadoEvento[f]}».`);
      });
      U.qsa('[data-f]', root)[0]?.classList.add('on');
      U.bindTable(root, 'eventos', S.eventos().map(e => ({ __id: e.id })), r => global.App.go('evento/' + r.__id));
      const tbl = U.qs('[data-table="eventos"]', root);
      on(tbl, '[data-row]', 'click', e => {
        const tr = e.target.closest('[data-row]');
        if (tr && !e.target.closest('button')) global.App.go('evento/' + tr.dataset.row);
      });
    }
  };

  /* =========================================================
     4 · EXPEDIENTE DE EVENTO
     ========================================================= */
  Pages.evento = {
    title: 'Evento',
    render(params) {
      const e = S.evento(params.id);
      if (!e) return `<div class="card">${U.empty('Evento no encontrado', 'El evento solicitado no existe o fue eliminado.', 'warn')}</div>`;
      const insc = S.inscripcionesDe(e.id);
      const tareas = S.tareasDe(e.id);
      const mensajes = S.mensajesDe(e.id);
      const oc = S.ocupacion(e.id);
      const av = S.avanceEvento(e.id);
      const confirmados = insc.filter(i => i.estado === 'confirmado' || i.estado === 'checkin').length;
      const pendientes = insc.filter(i => i.estado === 'pendiente').length;
      const completadas = tareas.filter(t => t.estado === 'completada').length;
      const vencidas = tareas.filter(t => t.estado !== 'completada' && new Date(t.vencimiento) < F.hoyInicio()).length;

      const hero = `<div class="hero" style="margin-bottom:16px">
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <div>
            <div class="h-eyebrow">${esc(e.tipo)} · ${esc(e.cliente)}</div>
            <h1>${esc(e.nombre)}</h1>
            <div class="h-meta">
              <span>${icon('calendar', 14)} ${F.fLarga(e.fechaInicio)}</span>
              <span>${icon('pin', 14)} ${esc(e.lugar)}</span>
              <span>${icon('user', 14)} ${esc(e.responsable)}</span>
            </div>
          </div>
          <div class="row" style="gap:8px">${U.estadoEvento(e)}
            <button class="btn btn-sm" style="background:rgba(255,255,255,.12);color:#fff" id="btn-editar-ev">${icon('edit', 13)} Editar</button>
          </div>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="v">${av}%</div><div class="l">Avance de tareas</div></div>
          <div class="hero-stat"><div class="v">${oc.usados}/${oc.aforo}</div><div class="l">Aforo comprometido</div></div>
          <div class="hero-stat"><div class="v">${insc.length}</div><div class="l">Asistentes</div></div>
          <div class="hero-stat"><div class="v">${F.money(e.presupuesto)}</div><div class="l">Presupuesto</div></div>
          <div class="hero-stat"><div class="v">${tareas.length}</div><div class="l">Tareas totales</div></div>
        </div>
      </div>`;

      let body = '';
      if (detailTab === 'resumen') {
        body = `<div class="grid g-main">
          <div class="stack">
            <div class="card card-pad">
              <h3 style="margin-bottom:14px">Ficha del evento</h3>
              <dl class="dl">
                <dt>Cliente</dt><dd>${esc(e.cliente)}</dd>
                <dt>Tipo de evento</dt><dd>${esc(e.tipo)}</dd>
                <dt>Inicio</dt><dd>${F.fFechaHora(e.fechaInicio)}</dd>
                <dt>Fin</dt><dd>${F.fFechaHora(e.fechaFin)}</dd>
                <dt>Sede</dt><dd>${esc(e.lugar)}</dd>
                <dt>Aforo</dt><dd>${e.aforo} personas</dd>
                <dt>Presupuesto</dt><dd>${F.money(e.presupuesto)}</dd>
                <dt>Protocolo VIP</dt><dd>${e.protocoloVIP ? 'Sí, requiere atención preferente' : 'No aplica'}</dd>
                <dt>Responsable</dt><dd>${esc(e.responsable)}</dd>
                <dt>Creado</dt><dd>${F.fFechaHora(e.creadoEn)}</dd>
              </dl>
              <div class="divider"></div>
              <h4 style="font-size:13px;margin-bottom:7px">Descripción</h4>
              <p class="muted" style="font-size:13px;line-height:1.65">${esc(e.descripcion || 'Sin descripción capturada.')}</p>
              ${e.estado === 'cancelado' ? U.alerta('danger', '<b>Evento cancelado.</b> Motivo: ' + esc(e.motivoCancelacion || '—')) : ''}
            </div>
            <div class="card">
              <div class="card-head"><div><h3>Avance por categoría</h3><div class="sub">Distribución del cumplimiento operativo</div></div></div>
              <div class="card-pad">${U.bars(S.avancePorCategoria(e.id).map(c => ({ l: c.categoria.slice(0, 6), v: c.progreso })))}
              </div>
            </div>
          </div>
          <div class="stack">
            <div class="kv-strip" style="flex-direction:column">
              <div class="kv"><div class="l">Asistentes confirmados</div><div class="v">${confirmados}</div></div>
              <div class="kv"><div class="l">Registros pendientes</div><div class="v">${pendientes}</div></div>
              <div class="kv"><div class="l">Tareas vencidas</div><div class="v" style="color:${vencidas ? 'var(--danger)' : 'inherit'}">${vencidas}</div></div>
            </div>
            <div class="card">
              <div class="card-head"><div><h3>Hitos próximos</h3></div></div>
              ${tareas.filter(t => t.estado !== 'completada').sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento)).slice(0, 5).map(t => `
                <div class="list-row" data-task-open="${t.id}" style="cursor:pointer">
                  <div class="lr-main"><div class="lr-title">${esc(t.titulo)}</div><div class="lr-sub">${F.fCorto(t.vencimiento)}</div></div>
                  ${new Date(t.vencimiento) < F.hoyInicio() ? U.badge('Vencida', 'b-danger') : U.prioridad(t.prioridad)}
                </div>`).join('') || U.empty('Sin pendientes', 'Todas las tareas están cerradas.')}
            </div>
            <div class="card">
              <div class="card-head"><div><h3>Comité operativo</h3></div></div>
              ${S.asistentesDe(e.id).filter(a => a.tipo !== 'Prensa').slice(0, 5).map(a => `
                <div class="list-row">${U.avatar(a.nombre)}<div class="lr-main"><div class="lr-title">${esc(a.nombre)}</div><div class="lr-sub">${esc(a.puesto)} · ${esc(a.empresa)}</div></div>${U.badge(a.tipo, a.tipo === 'VIP' ? 'b-gold' : 'b-gray')}</div>`).join('')}
            </div>
          </div>
        </div>`;
      }

      if (detailTab === 'asistentes') {
        const rows = S.asistentesDe(e.id).map(a => ({
          __id: a.inscripcion.id, nombre: a.nombre, email: a.email, empresa: a.empresa,
          tipo: a.tipo, estado: a.inscripcion.estado, codigo: a.codigo, acompa: a.acompanantes
        }));
        body = `<div class="card">
          <div class="card-head"><div><h3>Asistentes registrados</h3><div class="sub">${rows.length} registros · aforo ${oc.usados}/${oc.aforo}</div></div>
            <div class="right"><button class="btn btn-sm btn-primary" id="btn-add-as">${icon('user', 14)} Registrar asistente</button></div></div>
          ${U.dataTable({
            key: 'as-e' + e.id, rows, pageSize: 8,
            columns: [
              { k: 'nombre', label: 'Asistente', render: r => `<div class="row" style="gap:9px">${U.avatar(r.nombre)}<div><div class="cell-main">${esc(r.nombre)}</div><div class="cell-sub">${esc(r.email)}</div></div></div>` },
              { k: 'empresa', label: 'Empresa', render: r => `<div class="cell-main" style="font-weight:500">${esc(r.empresa)}</div><div class="cell-sub">${esc(r.tipo)}${r.acompa ? ' · +' + r.acompa + ' acompañante(s)' : ''}</div>` },
              { k: 'codigo', label: 'Código', render: r => `<span class="mono">${esc(r.codigo)}</span>` },
              { k: 'estado', label: 'Estado', render: r => U.estadoAsistente({ estado: r.estado }) },
              { k: 'acc', label: '', sortable: false, cls: 'cell-actions', render: r => `
                ${r.estado === 'pendiente' ? `<button class="btn btn-sm btn-outline" data-conf="${r.__id}">Confirmar</button>` : ''}
                ${r.estado === 'confirmado' ? `<button class="btn btn-sm btn-outline" data-check="${r.__id}">Check-in</button>` : ''}` }
            ]
          })}
        </div>`;
      }

      if (detailTab === 'tareas') {
        body = `<div class="card">
          <div class="card-head"><div><h3>Tablero de tareas</h3><div class="sub">Arrastra las tarjetas entre columnas · ${completadas}/${tareas.length} completadas</div></div>
            <div class="right"><button class="btn btn-sm btn-primary" id="btn-add-task">${icon('plus', 14)} Nueva tarea</button></div></div>
          <div class="card-pad">${U.kanban(tareas, { onOpen: openTareaDetalle })}</div>
        </div>`;
      }

      if (detailTab === 'comunicacion') {
        body = `<div class="grid g-main">
          <div class="card">
            <div class="card-head"><div><h3>Enviar comunicado</h3><div class="sub">Microflujo ACT_EnviarComunicado · segmentación por audiencia</div></div></div>
            <div class="card-pad">
              <div class="form-grid">
                ${U.field({ id: 'm_asunto', label: 'Asunto', req: true, full: true, ph: 'Indicaciones de acceso y acreditación' })}
                ${U.field({ id: 'm_canal', label: 'Canal', type: 'select', opts: Store.ENUM.canal })}
                ${U.field({ id: 'm_aud', label: 'Audiencia', type: 'select', opts: ['Todos los asistentes', 'Asistentes confirmados', 'VIP', 'Pendientes'] })}
                ${U.field({ id: 'm_cuerpo', label: 'Mensaje', type: 'textarea', rows: 5, full: true, req: true, ph: 'Escribe el comunicado…' })}
              </div>
              <button class="btn btn-gold" id="btn-send-msg">${icon('send', 15)} Enviar comunicado</button>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><h3>Historial de envíos</h3></div></div>
            ${mensajes.length ? mensajes.map(m => `<div class="list-row">
              <div class="lr-main"><div class="lr-title">${esc(m.asunto)}</div><div class="lr-sub">${esc(m.canal)} · ${m.destinatarios} destinatarios · ${F.fCorto(m.fecha)}</div></div>
              ${U.badge(m.estado, m.estado === 'enviado' ? 'b-teal' : 'b-gray')}
            </div>`).join('') : U.empty('Sin comunicados', 'Aún no se han enviado mensajes para este evento.')}
          </div>
        </div>`;
      }

      if (detailTab === 'bitacora') {
        const log = S.bitacora().filter(b => (b.entidad === 'evento' && b.entidadId === e.id) || (b.entidad === 'tarea' && S.tarea(b.entidadId) && S.tarea(b.entidadId).eventoId === e.id));
        body = `<div class="card card-pad">
          <h3 style="margin-bottom:14px">Bitácora del evento</h3>
          <div class="timeline">${log.map(b => `<div class="tl-item ${b.severidad === 'danger' ? 't-danger' : (b.severidad === 'info' ? 't-info' : '')}">
            <div class="tl-time">${F.fFechaHora(b.fecha)} · ${esc(b.usuario)}</div>
            <div class="tl-title">${esc(b.accion)}</div>
            <div class="tl-sub">${esc(b.detalle)}</div></div>`).join('') || U.empty('Sin movimientos', 'La bitácora se alimenta de cada acción registrada.')}</div>
        </div>`;
      }

      return hero + `<div class="card" style="margin-bottom:16px">${U.tabs([
        { k: 'resumen', l: 'Resumen' }, { k: 'asistentes', l: 'Asistentes', c: insc.length },
        { k: 'tareas', l: 'Tareas', c: tareas.length }, { k: 'comunicacion', l: 'Comunicación', c: mensajes.length },
        { k: 'bitacora', l: 'Bitácora' }
      ], detailTab)}</div>${body}`;
    },
    mount(root, repaint, params) {
      const e = S.evento(params.id);
      if (!e) return;
      on(root, '[data-tab]', 'click', ev => { detailTab = ev.currentTarget.dataset.tab; repaint(); });
      U.qs('#btn-editar-ev', root) && (U.qs('#btn-editar-ev', root).onclick = () => {
        U.modal({ title: 'Editar evento', sub: e.nombre, wide: true, body: U.formEvento(e),
          foot: `<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="btn-upd">${icon('check', 15)} Guardar cambios</button>`,
          onMount(r) {
            U.qs('#btn-upd', r).onclick = () => {
              const res = U.submitEvento(r, e.id);
              if (!res.ok) return U.toast('err', 'No se pudo guardar', res.msg);
              U.closeModal(); U.toast('ok', 'Evento actualizado', res.msg); repaint();
            };
          } });
      });
      U.qs('#btn-add-as', root) && (U.qs('#btn-add-as', root).onclick = () => openRegistrarAsistente(e.id));
      U.qs('#btn-add-task', root) && (U.qs('#btn-add-task', root).onclick = () => openTareaModal(e.id));
      on(root, '[data-task-open]', 'click', ev => openTareaDetalle(Number(ev.currentTarget.dataset.taskOpen)));
      on(root, '[data-conf]', 'click', ev => {
        const res = Store.ACT_ConfirmarAsistente(ev.currentTarget.dataset.conf);
        U.toast(res.ok ? 'ok' : 'err', 'Confirmación', res.msg); repaint();
      });
      on(root, '[data-check]', 'click', ev => {
        const res = Store.ACT_CheckIn(ev.currentTarget.dataset.check);
        U.toast(res.ok ? 'ok' : 'err', 'Check-in', res.msg); repaint();
      });
      const kb = U.qs('.kanban', root);
      if (kb) U.bindKanban(kb, { onOpen: openTareaDetalle, onMove: (id, col) => { const r = Store.ACT_MoverTarea(id, col); if (r.ok) repaint(); return r; } });
      U.qs('#btn-send-msg', root) && (U.qs('#btn-send-msg', root).onclick = () => {
        const d = U.readForm(root);
        const res = Store.ACT_EnviarComunicado({ asunto: d.m_asunto, cuerpo: d.m_cuerpo, canal: d.m_canal, audiencia: d.m_aud, eventoId: e.id });
        U.toast(res.ok ? 'ok' : 'err', 'Comunicación', res.msg);
        if (res.ok) { U.qs('#m_asunto', root).value = ''; U.qs('#m_cuerpo', root).value = ''; repaint(); }
      });
      if (U.qs('[data-table]', root)) U.bindTable(root, 'as-e' + e.id, [], () => { });
    }
  };

  /* =========================================================
     5 · TAREAS (global)
     ========================================================= */
  Pages.tareas = {
    title: 'Tareas', crumb: 'Tareas',
    render() {
      const abiertas = S.tareas().filter(t => { const e = S.evento(t.eventoId); return e && e.estado !== 'cancelado' && t.estado !== 'completada'; });
      const vencidas = abiertas.filter(t => new Date(t.vencimiento) < F.hoyInicio()).length;
      const todas = S.tareas().filter(t => { const e = S.evento(t.eventoId); return e && e.estado !== 'cancelado'; });
      return `<div class="page-head">
        <div><div class="eyebrow">Ejecución</div><h1>Tablero de tareas</h1>
        <div class="sub">Seguimiento Kanban de todas las tareas de la cartera. Cada movimiento dispara <span class="mono">ACT_MoverTarea</span> y registra bitácora.</div></div>
        <div class="page-actions"><button class="btn btn-gold" id="btn-add-task">${icon('plus', 15)} Nueva tarea</button></div>
      </div>
      <div class="grid g-4" style="margin-bottom:16px">
        ${U.kpi({ label: 'Tareas totales', value: todas.length, icon: 'tasks' })}
        ${U.kpi({ label: 'En curso', value: abiertas.length, icon: 'clock', tone: 'info' })}
        ${U.kpi({ label: 'Vencidas', value: vencidas, icon: 'warn', tone: 'danger', foot: vencidas ? 'Requieren renegociación inmediata' : 'Sin retrasos' })}
        ${U.kpi({ label: 'Completadas', value: todas.filter(t => t.estado === 'completada').length, icon: 'check', tone: 'teal' })}
      </div>
      <div class="card">
        <div class="card-head"><div><h3>Tablero Kanban</h3><div class="sub">Componente reutilizable COMP_TableroTareas</div></div>
          <div class="right"><div class="segmented"><button class="on">Todas</button><button>Mis tareas</button></div></div></div>
        <div class="card-pad">${U.kanban(todas, { onOpen: openTareaDetalle })}</div>
      </div>`;
    },
    mount(root, repaint) {
      U.qs('#btn-add-task', root).onclick = () => openTareaModal();
      const todas = S.tareas().filter(t => { const e = S.evento(t.eventoId); return e && e.estado !== 'cancelado'; });
      U.bindKanban(U.qs('.kanban', root), { onOpen: openTareaDetalle, onMove: (id, col) => { const r = Store.ACT_MoverTarea(id, col); if (r.ok) repaint(); return r; } });
    }
  };

  /* =========================================================
     6 · ASISTENTES (global)
     ========================================================= */
  Pages.asistentes = {
    title: 'Asistentes', crumb: 'Asistentes',
    render() {
      const rows = S.asistentes().map(a => {
        const evs = S.eventosDeAsistente(a.id);
        const tareas = S.tareasDeAsistente(a.id);
        return { __id: a.id, nombre: a.nombre, email: a.email, empresa: a.empresa, tipo: a.tipo, puesto: a.puesto,
          eventos: evs.length, tareas: tareas.length, codigo: a.codigo };
      });
      return `<div class="page-head">
        <div><div class="eyebrow">Directorio</div><h1>Asistentes</h1>
        <div class="sub">Maestro único de personas: un mismo asistente se reutiliza en todos los eventos sin duplicar registros.</div></div>
        <div class="page-actions"><button class="btn btn-gold" id="btn-add-as">${icon('user', 15)} Registrar asistente</button></div>
      </div>
      ${U.dataTable({
        key: 'asistentes', rows, pageSize: 9,
        columns: [
          { k: 'nombre', label: 'Asistente', render: r => `<div class="row" style="gap:9px">${U.avatar(r.nombre)}<div><div class="cell-main">${esc(r.nombre)}</div><div class="cell-sub">${esc(r.email)}</div></div></div>` },
          { k: 'empresa', label: 'Organización', render: r => `<div class="cell-main" style="font-weight:500">${esc(r.empresa)}</div><div class="cell-sub">${esc(r.puesto)}</div>` },
          { k: 'tipo', label: 'Tipo', render: r => U.badge(r.tipo, r.tipo === 'VIP' ? 'b-gold' : r.tipo === 'Ponente' ? 'b-violet' : r.tipo === 'Staff' ? 'b-info' : 'b-gray') },
          { k: 'eventos', label: 'Eventos', render: r => `<b>${r.eventos}</b>` },
          { k: 'tareas', label: 'Tareas', render: r => `<b>${r.tareas}</b>` },
          { k: 'codigo', label: 'Código', render: r => `<span class="mono">${esc(r.codigo)}</span>` },
          { k: 'acc', label: '', sortable: false, cls: 'cell-actions', render: r => `<button class="btn btn-sm btn-outline" data-as="${r.__id}">Ver ficha</button>` }
        ]
      })}`;
    },
    mount(root, repaint) {
      U.qs('#btn-add-as', root).onclick = () => openRegistrarAsistente();
      U.bindTable(root, 'asistentes', [], () => { });
      on(root, '[data-as]', 'click', e => {
        const a = S.asistente(e.currentTarget.dataset.as);
        const evs = S.eventosDeAsistente(a.id), ts = S.tareasDeAsistente(a.id);
        U.modal({
          title: a.nombre, sub: `${a.puesto} · ${a.empresa}`,
          body: `<div class="row row-wrap mb-12">${U.badge(a.tipo, a.tipo === 'VIP' ? 'b-gold' : 'b-gray')} ${U.badge('Código ' + a.codigo, 'b-gray')} ${a.acompanantes ? U.badge('+' + a.acompanantes + ' acompañante(s)', 'b-info') : ''}</div>
            <dl class="dl"><dt>Correo</dt><dd>${esc(a.email)}</dd><dt>Teléfono</dt><dd>${esc(a.telefono || '—')}</dd>
            <dt>Dieta</dt><dd>${esc(a.dieta)}</dd><dt>Registrado</dt><dd>${F.fCorto(a.creadoEn)}</dd></dl>
            <div class="divider"></div>
            ${U.sectionTitle('Eventos en los que participa')}
            ${evs.map(x => `<div class="list-row">${U.avatar(x.ev.nombre)}<div class="lr-main"><div class="lr-title">${esc(x.ev.nombre)}</div><div class="lr-sub">${F.fCorto(x.ev.fechaInicio)}</div></div>${U.estadoAsistente({ estado: x.inscripcion.estado })}</div>`).join('') || '<p class="tiny muted">Sin eventos.</p>'}
            ${U.sectionTitle('Tareas asignadas')}
            ${ts.length ? ts.map(t => `<div class="list-row"><div class="lr-main"><div class="lr-title">${esc(t.titulo)}</div><div class="lr-sub">${F.fCorto(t.vencimiento)}</div></div>${U.estadoTarea(t)}</div>`).join('') : '<p class="tiny muted">Sin tareas asignadas.</p>'}
          `,
          foot: `<button class="btn btn-ghost" data-close>Cerrar</button>`
        });
      });
    }
  };

  /* =========================================================
     7 · COMUNICACIÓN
     ========================================================= */
  Pages.comunicacion = {
    title: 'Comunicación', crumb: 'Comunicación',
    render() {
      const evs = S.eventos().filter(e => e.estado !== 'cancelado');
      const msgs = S.mensajes().slice().sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      const totalDest = msgs.reduce((s, m) => s + m.destinatarios, 0);
      return `<div class="page-head">
        <div><div class="eyebrow">Relación con asistentes</div><h1>Centro de comunicación</h1>
        <div class="sub">Canal único para comunicados segmentados por audiencia, con historial, canal y trazabilidad por evento.</div></div>
      </div>
      <div class="grid g-4" style="margin-bottom:16px">
        ${U.kpi({ label: 'Comunicados enviados', value: msgs.length, icon: 'mail', tone: 'info' })}
        ${U.kpi({ label: 'Destinatarios alcanzados', value: F.num(totalDest), icon: 'people', tone: 'teal' })}
        ${U.kpi({ label: 'Tasa de lectura', value: (msgs.length ? Math.round(msgs.reduce((s, m) => s + m.leidos, 0) / Math.max(1, totalDest) * 100) : 0) + '<small>%</small>', icon: 'chart', tone: 'violet' })}
        ${U.kpi({ label: 'Canales activos', value: Store.ENUM.canal.length, icon: 'send' })}
      </div>
      <div class="grid g-main">
        <div class="card">
          <div class="card-head"><div><h3>Nuevo comunicado</h3><div class="sub">ACT_EnviarComunicado · validación de asunto, cuerpo y audiencia</div></div></div>
          <div class="card-pad">
            <div class="form-grid">
              ${U.field({ id: 'c_evento', label: 'Evento', type: 'select', req: true, full: true, opts: evs.map(e => ({ v: e.id, l: e.nombre })) })}
              ${U.field({ id: 'c_asunto', label: 'Asunto', req: true, full: true, ph: 'Instrucciones de acreditación' })}
              ${U.field({ id: 'c_canal', label: 'Canal', type: 'select', opts: Store.ENUM.canal })}
              ${U.field({ id: 'c_aud', label: 'Audiencia', type: 'select', opts: ['Todos los asistentes', 'Asistentes confirmados', 'VIP', 'Pendientes'] })}
              ${U.field({ id: 'c_cuerpo', label: 'Mensaje', type: 'textarea', rows: 6, full: true, req: true, ph: 'Estimado(a) invitado(a)…' })}
            </div>
            <div class="row"><button class="btn btn-gold" id="btn-send">${icon('send', 15)} Enviar comunicado</button>
              <span class="tiny muted">Se registra en bitácora y notificaciones.</span></div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>Historial</h3><div class="sub">${msgs.length} comunicados</div></div></div>
          <div style="max-height:620px;overflow-y:auto">
            ${msgs.map(m => {
              const ev = S.evento(m.eventoId);
              return `<div class="list-row">
                <div style="width:30px;height:30px;border-radius:8px;background:#F7F4EC;display:grid;place-items:center;color:var(--gold);flex:0 0 30px">${icon('mail', 14)}</div>
                <div class="lr-main"><div class="lr-title">${esc(m.asunto)}</div>
                  <div class="lr-sub">${esc(ev ? ev.nombre : '—')} · ${m.destinatarios} dest. · ${F.fCorto(m.fecha)}</div></div>
                <div style="text-align:right"><div class="tiny" style="font-weight:600">${m.leidos}/${m.destinatarios}</div><div class="tiny muted">leídos</div></div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
    },
    mount(root, repaint) {
      U.qs('#btn-send', root).onclick = () => {
        const d = U.readForm(root);
        const res = Store.ACT_EnviarComunicado({ eventoId: d.c_evento, asunto: d.c_asunto, cuerpo: d.c_cuerpo, canal: d.c_canal, audiencia: d.c_aud });
        U.toast(res.ok ? 'ok' : 'err', 'Comunicación', res.msg);
        if (res.ok) repaint();
      };
    }
  };

  /* =========================================================
     8 · REPORTES
     ========================================================= */
  Pages.reportes = {
    title: 'Reportes', crumb: 'Reportes',
    render() {
      const evs = S.eventos();
      const activos = evs.filter(e => e.estado !== 'cancelado');
      const porEvento = activos.map(e => ({ l: e.nombre.split(' ')[0], v: S.avanceEvento(e.id) }));
      const estados = Store.ENUM.estadoEvento.map((k, i) => ({
        l: S.LABEL.estadoEvento[k], v: evs.filter(e => e.estado === k).length,
        c: ['#98A1B0', '#C9A227', '#2C7A5B', '#2D5F9A', '#5B4B8A', '#B4472F'][i]
      })).filter(x => x.v > 0);
      const clientes = {};
      activos.forEach(e => { clientes[e.cliente] = (clientes[e.cliente] || 0) + e.presupuesto; });
      const porCliente = Object.entries(clientes).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([l, v]) => ({ l: l.split(' ')[0], v }));
      const tareas = S.tareas();
      return `<div class="page-head">
        <div><div class="eyebrow">Analítica</div><h1>Reportes y tablero analítico</h1>
        <div class="sub">Indicadores de cumplimiento, distribución de la cartera y concentración de presupuesto por cliente.</div></div>
        <div class="page-actions"><button class="btn btn-outline" id="btn-exp-r">${icon('download', 15)} Exportar PDF</button></div>
      </div>
      <div class="grid g-2" style="margin-bottom:16px">
        <div class="card">
          <div class="card-head"><div><h3>Avance operativo por evento</h3><div class="sub">Porcentaje de tareas completadas</div></div></div>
          <div class="card-pad">${U.bars(porEvento)}</div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>Distribución de la cartera</h3><div class="sub">Eventos por estado</div></div></div>
          <div class="card-pad">${U.donut(estados)}</div>
        </div>
      </div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><div><h3>Presupuesto por cliente (miles de MXN)</h3></div></div>
          <div class="card-pad">${U.bars(porCliente.map(c => ({ l: c.l, v: c.v / 1000 })))}</div>
        </div>
        <div class="card">
          <div class="card-head"><div><h3>Indicadores de calidad</h3></div></div>
          <div class="card-pad">
            <div class="kv-strip" style="flex-direction:column;margin-bottom:14px">
              <div class="kv"><div class="l">Tareas completadas</div><div class="v">${tareas.filter(t => t.estado === 'completada').length}/${tareas.length}</div></div>
              <div class="kv"><div class="l">Tareas vencidas</div><div class="v">${S.tareasVencidas().length}</div></div>
              <div class="kv"><div class="l">Aforo promedio ocupado</div><div class="v">${Math.round(activos.reduce((s, e) => s + S.ocupacion(e.id).pct, 0) / Math.max(1, activos.length))}%</div></div>
            </div>
            ${U.alerta('info', 'El tablero se recalcula en cada operación: crear evento, registrar asistente, mover tarea o enviar comunicado.')}
          </div>
        </div>
      </div>`;
    },
    mount(root) {
      U.qs('#btn-exp-r', root).onclick = () => U.toast('ok', 'Reporte generado', 'El reporte analítico se exportó correctamente (simulado).');
    }
  };

  /* =========================================================
     9 · BITÁCORA
     ========================================================= */
  Pages.bitacora = {
    title: 'Bitácora', crumb: 'Bitácora',
    render() {
      const b = S.bitacora();
      return `<div class="page-head">
        <div><div class="eyebrow">Auditoría</div><h1>Bitácora de operación</h1>
        <div class="sub">Registro inmutable de cada acción ejecutada por los microflujos: quién, qué, cuándo y con qué severidad.</div></div>
      </div>
      <div class="row row-wrap" style="margin-bottom:14px">
        <div class="segmented"><button class="on">Todas</button><button>Altas</button><button>Cambios</button><button>Alertas</button></div>
        <div class="spacer"></div>
        <span class="tiny muted">${b.length} registros</span>
      </div>
      <div class="card card-pad">
        <div class="timeline">
          ${b.map(x => `<div class="tl-item ${x.severidad === 'danger' ? 't-danger' : (x.severidad === 'info' ? 't-info' : '')}">
            <div class="tl-time">${F.fFechaHora(x.fecha)} · ${esc(x.usuario)} · ${esc(x.entidad)} #${x.entidadId}</div>
            <div class="tl-title">${esc(x.accion)}</div>
            <div class="tl-sub">${esc(x.detalle)}</div>
          </div>`).join('')}
        </div>
      </div>`;
    },
    mount() { }
  };

  /* =========================================================
     10 · REGISTRO PÚBLICO (portal del asistente)
     ========================================================= */
  Pages.registro = {
    title: 'Registro público', crumb: 'Registro público',
    render() {
      const evs = S.eventos().filter(e => ['confirmado', 'en_curso', 'planificacion'].includes(e.estado));
      return `<div style="max-width:760px;margin:0 auto">
        <div class="hero" style="margin-bottom:18px">
          <div class="h-eyebrow">Portal del asistente</div>
          <h1>Registro a eventos Aurelia</h1>
          <div class="h-meta"><span>${icon('lock', 14)} Formulario público · reutiliza COMP_FormularioAsistente</span></div>
        </div>
        <div class="card card-pad">
          <p class="muted" style="font-size:13px;margin-bottom:18px">Completa tus datos para solicitar acceso. Tu registro quedará en estado <b>Pendiente</b> hasta que el equipo de protocolo valide el aforo y confirme tu lugar.</p>
          ${U.formAsistente({ eventoId: evs[0] ? evs[0].id : '', eventos: evs })}
          <button class="btn btn-gold" id="btn-reg-publico">${icon('check', 15)} Solicitar registro</button>
        </div>
      </div>`;
    },
    mount(root, repaint) {
      U.qs('#btn-reg-publico', root).onclick = () => {
        const res = U.submitAsistente(root);
        if (!res.ok) return U.toast('err', 'No se pudo completar el registro', res.msg);
        U.toast('ok', 'Registro recibido', res.msg);
        repaint();
      };
    }
  };

  Pages.current = null;
  global.Pages = Pages;
  global.PagesState = { set tab(v) { detailTab = v; }, get tab() { return detailTab; } };
})(window);
