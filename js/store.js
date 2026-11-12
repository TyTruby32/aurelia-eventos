/* ============================================================
   AURELIA EventOS  ·  MODELO DE DATOS + LÓGICA DE NEGOCIO
   ------------------------------------------------------------
   Cada ACT_/SUB_/VAL_/FN_ representa un microflujo de negocio
   implementado en Mendix Studio Pro (ver documento técnico).
   Persistencia: localStorage (sustituye al runtime de Mendix).
   ============================================================ */
(function (global) {
  'use strict';

  const KEY = 'aurelia_eventos_db_v1';
  const EMPRESA = 'AURELIA Eventos & Protocolo';
  const USUARIO = { nombre: 'Celso I. Castro', matricula: 'AL07167862', rol: 'Director de Protocolo', iniciales: 'CC' };

  /* ---------------- Catálogos (enumeraciones) ---------------- */
  const ENUM = {
    tipoEvento: ['Cumbre ejecutiva', 'Lanzamiento de producto', 'Gala corporativa', 'Convención anual', 'Viaje de incentivo', 'Feria / Expo', 'Networking'],
    estadoEvento: ['borrador', 'planificacion', 'confirmado', 'en_curso', 'finalizado', 'cancelado'],
    tipoAsistente: ['VIP', 'Corporativo', 'Ponente', 'Prensa', 'Staff'],
    estadoAsistente: ['pendiente', 'confirmado', 'rechazado', 'checkin'],
    estadoTarea: ['pendiente', 'en_progreso', 'bloqueada', 'completada'],
    prioridad: ['Baja', 'Media', 'Alta', 'Crítica'],
    categoria: ['Logística', 'Protocolo', 'Audiovisual', 'Catering', 'Seguridad', 'Comercial', 'Producción'],
    canal: ['Correo electrónico', 'SMS', 'Notificación push', 'Mensaje interno']
  };

  const LABEL = {
    tipoEvento: {}, estadoEvento: {
      borrador: 'Borrador', planificacion: 'En planificación', confirmado: 'Confirmado',
      en_curso: 'En curso', finalizado: 'Finalizado', cancelado: 'Cancelado'
    },
    estadoAsistente: { pendiente: 'Pendiente', confirmado: 'Confirmado', rechazado: 'Rechazado', checkin: 'Check-in' },
    estadoTarea: { pendiente: 'Pendiente', en_progreso: 'En progreso', bloqueada: 'Bloqueada', completada: 'Completada' }
  };

  const TONE = {
    estadoEvento: { borrador: 'b-gray', planificacion: 'b-warn', confirmado: 'b-teal', en_curso: 'b-info', finalizado: 'b-gray', cancelado: 'b-danger' },
    estadoAsistente: { pendiente: 'b-warn', confirmado: 'b-teal', rechazado: 'b-danger', checkin: 'b-info' },
    estadoTarea: { pendiente: 'b-gray', en_progreso: 'b-info', bloqueada: 'b-danger', completada: 'b-teal' },
    prioridad: { Baja: 'b-gray', Media: 'b-info', Alta: 'b-warn', 'Crítica': 'b-danger' }
  };

  /* ---------------- Utilidades de fecha ---------------- */
  const H = 3600000, D = 86400000;
  function hoyInicio() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  // Hora local "ingenua" (sin Z): evita corrimientos de zona horaria al
  // mostrar y garantiza que la fecha capturada sea la fecha mostrada.
  const p2 = (n) => String(n).padStart(2, '0');
  function iso(d) {
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
  }
  function isoDay(d) { return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`; }
  function dt(offsetDias, hora) {
    const d = hoyInicio(); d.setDate(d.getDate() + offsetDias);
    const h = hora === undefined ? 9 : hora;
    d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
    return iso(d);
  }
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function fFecha(s) {
    if (!s) return '—';
    const d = new Date(s);
    return `${String(d.getDate()).padStart(2, '0')} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
  }
  function fFechaHora(s) { if (!s) return '—'; const d = new Date(s); return `${fFecha(s)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  function fHora(s) { if (!s) return '—'; const d = new Date(s); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  function fLarga(s) { if (!s) return '—'; const d = new Date(s); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; }
  function fCorto(s) { const d = new Date(s); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }
  function diasHasta(s) { const d = new Date(s); d.setHours(0, 0, 0, 0); return Math.round((d - hoyInicio()) / D); }
  function addDias(s, n) { const d = new Date(s); d.setDate(d.getDate() + n); return iso(d); }

  const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);
  const num = (n) => new Intl.NumberFormat('es-MX').format(n || 0);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

  /* ============================================================
     PLANTILLAS DE TAREAS POR TIPO DE EVENTO
     Reutilizadas por SUB_GenerarTareasPlantilla (modular).
     ============================================================ */
  const PLANTILLAS = {
    'Cumbre ejecutiva': [
      ['Confirmar recinto y contrato de sede', 'Logística', 'Alta', -45, 12],
      ['Diseñar agenda y guion ejecutivo', 'Protocolo', 'Alta', -30, 16],
      ['Contratar producción audiovisual (streaming)', 'Audiovisual', 'Alta', -25, 20],
      ['Definir protocolo de autoridades y escoltas', 'Seguridad', 'Crítica', -20, 14],
      ['Confirmar catering y menú de gala', 'Catering', 'Media', -18, 8],
      ['Enviar invitaciones personalizadas a ponentes', 'Protocolo', 'Alta', -15, 6],
      ['Ensayo general de escenario', 'Audiovisual', 'Media', -2, 6],
      ['Plan de evacuación y acreditación de accesos', 'Seguridad', 'Alta', -7, 10]
    ],
    'Lanzamiento de producto': [
      ['Reservar venue y fecha de revelación', 'Logística', 'Alta', -50, 8],
      ['Aprobar concepto creativo y narrativa de marca', 'Comercial', 'Crítica', -40, 18],
      ['Construir set escénico y experiencia inmersiva', 'Producción', 'Alta', -30, 40],
      ['Coordinar prensa y kit de medios', 'Comercial', 'Alta', -20, 12],
      ['Producir piezas audiovisuales del lanzamiento', 'Audiovisual', 'Alta', -25, 24],
      ['Logística de transporte para invitados clave', 'Logística', 'Media', -12, 10],
      ['Briefing de anfitriones y azafatas', 'Protocolo', 'Media', -5, 6],
      ['Prueba de producto y demo en vivo', 'Producción', 'Crítica', -3, 14]
    ],
    'Gala corporativa': [
      ['Seleccionar salón y menú de gala', 'Catering', 'Alta', -55, 10],
      ['Contratar talento artístico / orquesta', 'Producción', 'Alta', -40, 8],
      ['Diseñar mesa de honor y protocolo de recepción', 'Protocolo', 'Crítica', -25, 12],
      ['Iluminación escénica y pantallas', 'Audiovisual', 'Media', -20, 16],
      ['Programa de reconocimientos y premiación', 'Protocolo', 'Alta', -18, 10],
      ['Seguridad privada y control de accesos', 'Seguridad', 'Alta', -10, 9],
      ['Logística de traslados y valet', 'Logística', 'Media', -6, 8]
    ],
    'Convención anual': [
      ['Reservar hotel sede y bloque de habitaciones', 'Logística', 'Alta', -60, 14],
      ['Diseñar programa de contenidos y talleres', 'Protocolo', 'Alta', -45, 22],
      ['Plataforma de registro y acreditación', 'Producción', 'Alta', -35, 18],
      ['Montaje de salas simultáneas', 'Audiovisual', 'Media', -8, 20],
      ['Catering de coctel de bienvenida', 'Catering', 'Media', -20, 8],
      ['Dinámica de integración y team building', 'Producción', 'Baja', -15, 12],
      ['Traslados aeropuerto–hotel', 'Logística', 'Media', -5, 10]
    ],
    'Viaje de incentivo': [
      ['Cotizar vuelos y traslados privados', 'Logística', 'Alta', -55, 12],
      ['Bloqueo de suites en resort', 'Logística', 'Alta', -50, 8],
      ['Itinerario de experiencias y tours', 'Protocolo', 'Media', -35, 14],
      ['Protocolo de atenciones VIP en destino', 'Protocolo', 'Crítica', -28, 10],
      ['Seguro de viaje y plan médico', 'Seguridad', 'Alta', -20, 5],
      ['Kit de bienvenida y amenidades', 'Producción', 'Baja', -10, 7]
    ],
    'Feria / Expo': [
      ['Contratar piso de exhibición y montaje', 'Logística', 'Alta', -70, 25],
      ['Plano de stands y asignación de expositores', 'Comercial', 'Alta', -55, 18],
      ['Registro en línea y credencialización', 'Producción', 'Alta', -40, 16],
      ['Red eléctrica, internet y clima', 'Logística', 'Crítica', -15, 20],
      ['Convocatoria de prensa y difusión', 'Comercial', 'Media', -25, 10],
      ['Operativo de seguridad y emergencias', 'Seguridad', 'Alta', -12, 12]
    ],
    'Networking': [
      ['Definir sede y formato de encuentro', 'Logística', 'Media', -35, 6],
      ['Curar lista de invitados de alto perfil', 'Comercial', 'Alta', -25, 10],
      ['Dinámica de presentaciones cruzadas', 'Protocolo', 'Media', -18, 8],
      ['Catering ligero y mixología', 'Catering', 'Baja', -12, 6],
      ['Cobertura fotográfica y memoria del evento', 'Producción', 'Baja', -5, 5]
    ]
  };

  /* ============================================================
     SEMILLA DE DATOS
     ============================================================ */
  let seq = { evento: 0, asistente: 0, tarea: 0, mensaje: 0, inscripcion: 0, asignacion: 0, notif: 0, bitacora: 0 };

  function nextId(ent) { seq[ent] = (seq[ent] || 0) + 1; return seq[ent]; }

  const NOMBRES = [
    ['Valeria Montemayor', 'Directora General', 'Grupo Altamira', 'VIP'],
    ['Rodrigo Alcántara', 'Presidente del Consejo', 'Grupo Altamira', 'VIP'],
    ['Mariana Esquivel', 'CFO', 'Vertex Health', 'VIP'],
    ['Héctor Villalpando', 'CEO', 'Nébula Labs', 'VIP'],
    ['Sofía Larrañaga', 'Vicepresidenta Comercial', 'Banca Serena', 'VIP'],
    ['Emilio Castañeda', 'Director de Operaciones', 'Industria Norte', 'Corporativo'],
    ['Paulina Requena', 'Gerente de Marca', 'Nébula Labs', 'Corporativo'],
    ['Andrés Mendiola', 'Consultor Senior', 'Deloitte MX', 'Corporativo'],
    ['Lucía Bermúdez', 'Editora de Negocios', 'El Financiero', 'Prensa'],
    ['Joaquín Téllez', 'Reportero de Economía', 'Expansión', 'Prensa'],
    ['Dra. Irene Salgado', 'Catedrática ITAM', 'ITAM', 'Ponente'],
    ['Mtro. Óscar Fuentes', 'Especialista en Protocolo', 'Aurelia Protocolo', 'Ponente'],
    ['Karla Barrientos', 'Coordinadora de Eventos', 'Aurelia Eventos', 'Staff'],
    ['Diego Santibáñez', 'Productor Técnico', 'StageWorks', 'Staff'],
    ['Renata Ochoa', 'Chef Ejecutiva', 'Casa Lumen Catering', 'Staff'],
    ['Alejandra Pineda', 'Directora de Comunicación', 'Fundación Lumen', 'VIP'],
    ['Gabriel Moncada', 'Tesorero', 'Fundación Lumen', 'Corporativo'],
    ['Ximena Arredondo', 'Head of Sales LATAM', 'Vertex Health', 'Corporativo'],
    ['Patricio Nora', 'Director Jurídico', 'Grupo Altamira', 'Corporativo'],
    ['Frida Wagner', 'Gerente de Experiencia', 'Nébula Labs', 'Corporativo'],
    ['Tomás Escamilla', 'Director de Inversiones', 'Banca Serena', 'VIP'],
    ['Isabela Novoa', 'Coordinadora de Comunicación', 'Fundación Lumen', 'Corporativo'],
    ['Mauricio Galeana', 'Jefe de Seguridad', 'Grupo Altamira', 'Staff'],
    ['Daniela Rojas', 'Anfitriona de Protocolo', 'Aurelia Eventos', 'Staff']
  ];

  function seed() {
    seq = { evento: 0, asistente: 0, tarea: 0, mensaje: 0, inscripcion: 0, asignacion: 0, notif: 0, bitacora: 0 };

    const DB = {
      meta: { empresa: EMPRESA, version: 1, creado: iso(new Date()), usuario: USUARIO },
      eventos: [], asistentes: [], tareas: [], inscripciones: [], asignaciones: [],
      mensajes: [], notificaciones: [], bitacora: [], secuencias: {}
    };

    /* --- Asistentes maestros --- */
    NOMBRES.forEach((n, i) => {
      DB.asistentes.push({
        id: nextId('asistente'),
        nombre: n[0], puesto: n[1], empresa: n[2], tipo: n[3],
        email: n[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z ]/g, '').replace(/ +/g, '.') + '@' + (n[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '').slice(0, 12)) + '.mx',
        telefono: '+52 55 ' + String(1000 + i * 137).slice(0, 4) + ' ' + String(2000 + i * 211).slice(0, 4),
        acompanantes: n[3] === 'VIP' ? 1 : 0,
        dieta: i % 5 === 0 ? 'Vegetariana' : (i % 7 === 0 ? 'Sin gluten' : 'Ninguna'),
        estado: 'confirmado', codigo: 'AUR-' + String(1200 + i * 7).slice(0, 4), creadoEn: dt(-80 + i, 10)
      });
    });

    /* --- Eventos --- */
    const evDefs = [
      { nombre: 'Cumbre de Inversión Altamira 2026', cliente: 'Grupo Altamira', tipo: 'Cumbre ejecutiva', ini: -62, fin: -60, h: 9, lugar: 'Hotel Camino Real Polanco · Salón Virreyes', aforo: 34, pool: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23], presupuesto: 3450000, estado: 'finalizado', vip: true, resp: 'Celso I. Castro', desc: 'Encuentro anual de consejeros y family offices para revisar la tesis de inversión 2026–2030. Incluye cena de gala privada y sesiones cerradas de consejo.' },
      { nombre: 'Lanzamiento Global NÉBULA 7', cliente: 'Nébula Labs', tipo: 'Lanzamiento de producto', ini: -30, fin: -30, h: 18, lugar: 'Casa Solar · Bosques de las Lomas', aforo: 30, pool: [3,6,19,8,9,10,11,12,13,15], presupuesto: 4120000, estado: 'finalizado', vip: true, resp: 'Karla Barrientos', desc: 'Revelación internacional del dispositivo NÉBULA 7 con experiencia inmersiva de 40 minutos, demo en vivo y cobertura de 60 medios especializados.' },
      { nombre: 'Gala Benéfica Fundación Lumen', cliente: 'Fundación Lumen', tipo: 'Gala corporativa', ini: 26, fin: 26, h: 19.5, lugar: 'Museo Soumaya · Vestíbulo de Honor', aforo: 46, pool: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23], presupuesto: 5850000, estado: 'confirmado', vip: true, resp: 'Celso I. Castro', desc: 'Gala de recaudación con subasta silenciosa, programa artístico y mesa de honor presidida por el patronato. Código de vestimenta: black tie.' },
      { nombre: 'Convención Anual Vertex Health', cliente: 'Vertex Health', tipo: 'Convención anual', ini: 4, fin: 7, h: 8, lugar: 'Fiesta Americana Grand Chapultepec', aforo: 40, pool: [0,2,5,6,7,10,11,12,13,14,17,18,19,20,22,23,3,1], presupuesto: 2760000, estado: 'en_curso', vip: false, resp: 'Karla Barrientos', desc: 'Convención de fuerza de ventas: cuatro días de talleres simultáneos, premiación de desempeño y lanzamiento de la línea pediátrica.' },
      { nombre: 'Inmersión Ejecutiva Costa Careyes', cliente: 'Banca Serena', tipo: 'Viaje de incentivo', ini: 18, fin: 21, h: 11, lugar: 'Resort Careyes · Playa Rosa', aforo: 22, pool: [0,1,2,3,4,20,21], presupuesto: 1980000, estado: 'confirmado', vip: true, resp: 'Celso I. Castro', desc: 'Viaje de incentivo para los 40 ejecutivos con mejor desempeño del año, incluye traslados privados, catas y atenciones VIP en destino.' },
      { nombre: 'Expo Innovación Industrial Norte', cliente: 'Industria Norte', tipo: 'Feria / Expo', ini: 41, fin: 43, h: 10, lugar: 'Cintermex · Pabellón B', aforo: 52, pool: [5,7,12,13,22,17,18,0,2,8,9,16,11,14,21,19,10,6], presupuesto: 7300000, estado: 'planificacion', vip: false, resp: 'Diego Santibáñez', desc: 'Piso de exhibición de 4,200 m² con 96 expositores, zona de conferencias y programa de vinculación comercial con compradores internacionales.' },
      { nombre: 'Encuentro de Consejos Banca Serena', cliente: 'Banca Serena', tipo: 'Networking', ini: 12, fin: 12, h: 17, lugar: 'Terraza Reforma 26 · Piso 42', aforo: 32, pool: [0,3,4,5,8,9,20,21,16], presupuesto: 620000, estado: 'confirmado', vip: true, resp: 'Karla Barrientos', desc: 'Coctel cerrado de consejeros con dinámica de presentaciones cruzadas y lectura de coyuntura macroeconómica.' },
      { nombre: 'Aniversario 25 Aurelia · Jubileo', cliente: 'Aurelia Eventos', tipo: 'Gala corporativa', ini: 88, fin: 88, h: 20, lugar: 'Hacienda San Gabriel de las Palmas', aforo: 42, pool: [0,1,15,16], presupuesto: 3200000, estado: 'borrador', vip: true, resp: 'Celso I. Castro', desc: 'Celebración de los 25 años de la casa. Concepto en definición: mural de memorias, concierto privado y libro conmemorativo.' },
      { nombre: 'Cumbre Salud Digital 2026', cliente: 'Vertex Health', tipo: 'Cumbre ejecutiva', ini: -8, fin: -7, h: 9, lugar: 'Tecnológico de Monterrey · Auditorio', aforo: 30, pool: [2,17,6,10,12,13], presupuesto: 1150000, estado: 'cancelado', vip: false, resp: 'Karla Barrientos', desc: 'Cancelado por reprogramación presupuestal del cliente, se renegociará fecha para el segundo semestre.' }
    ];

    evDefs.forEach((e, idx) => {
      const ev = {
        id: nextId('evento'), nombre: e.nombre, cliente: e.cliente, tipo: e.tipo,
        fechaInicio: dt(e.ini, e.h), fechaFin: dt(e.fin, Math.min(e.h + 8, 23.75)),
        lugar: e.lugar, aforo: e.aforo, presupuesto: e.presupuesto,
        estado: e.estado, protocoloVIP: e.vip, responsable: e.resp, descripcion: e.desc,
        creadoEn: dt(e.ini - 45, 11), actualizadoEn: dt(-Math.abs(idx) - 1, 12),
        motivoCancelacion: e.estado === 'cancelado' ? 'Reprogramación presupuestal solicitada por el cliente.' : null
      };
      DB.eventos.push(ev);

      // Inscripciones (asistentes por evento)
      const pool = e.pool.slice();

      pool.forEach((ai, k) => {
        const a = DB.asistentes[ai];
        let est = 'confirmado';
        if (e.estado === 'finalizado') est = k % 9 === 0 ? 'checkin' : 'confirmado';
        else if (e.estado === 'borrador') est = 'pendiente';
        else if (k === 2) est = 'pendiente';
        else if (k === 5 && e.estado !== 'cancelado') est = Math.random() > 0.6 ? 'pendiente' : 'confirmado';
        DB.inscripciones.push({
          id: nextId('inscripcion'), eventoId: ev.id, asistenteId: a.id,
          fecha: dt(e.ini - 30 + k, 10), estado: est,
          notas: a.tipo === 'VIP' ? 'Requiere atención preferente en acreditación.' : ''
        });
      });

      // Tareas por plantilla (SUB_GenerarTareasPlantilla)
      if (e.estado !== 'cancelado') {
        const tpl = PLANTILLAS[e.tipo] || PLANTILLAS['Convención anual'];
        tpl.forEach((t, k) => {
          let prog = 0, estadoT = 'pendiente';
          const nT = tpl.length, rel = nT > 1 ? k / (nT - 1) : 0;
          if (e.estado === 'finalizado') { prog = 100; }
          else if (e.estado === 'en_curso') { prog = rel < 0.62 ? 100 : Math.round(80 - (rel - 0.62) * 190); }
          else if (e.estado === 'confirmado') { prog = rel < 0.34 ? 100 : Math.max(0, Math.round(72 - rel * 96)); }
          else if (e.estado === 'planificacion') { prog = Math.max(0, Math.round(64 - rel * 82)); }
          else { prog = 0; }
          prog = Math.max(0, Math.min(100, prog));
          estadoT = prog === 100 ? 'completada' : (prog > 0 ? 'en_progreso' : 'pendiente');
          if (e.estado === 'planificacion' && k === 2) estadoT = 'bloqueada';
          const tarea = {
            id: nextId('tarea'), eventoId: ev.id, titulo: t[0], categoria: t[1], prioridad: t[2],
            offsetDias: t[3], vencimiento: addDias(ev.fechaInicio, t[3]),
            horasEstimadas: t[4], progreso: prog, estado: estadoT,
            descripcion: `Actividad de ${t[1].toLowerCase()} para «${ev.nombre}». Responsable de validar entregables con el cliente antes de la fecha límite.`,
            completadaEn: prog === 100 ? addDias(ev.fechaInicio, t[3] - 1) + 'T18:00:00' : null,
            creadoEn: dt(e.ini - 45, 11)
          };
          if (estadoT === 'bloqueada') tarea.bloqueoMotivo = 'Pendiente de aprobación de presupuesto del cliente.';
          // Coherencia temporal: un hito cuya fecha ya pasó debe estar cerrado.
          if (tarea.vencimiento && new Date(tarea.vencimiento) < hoyInicio() && e.estado !== 'finalizado' && e.estado !== 'en_curso') {
            if (k % 7 === 0 && prog < 100) { tarea.progreso = 35; tarea.estado = 'en_progreso'; }
            else { tarea.progreso = 100; tarea.estado = 'completada'; tarea.completadaEn = iso(new Date()); }
            delete tarea.bloqueoMotivo;
            if (tarea.estado === 'completada') delete tarea.bloqueoMotivo;
          }

          DB.tareas.push(tarea);

          // Asignaciones de tarea
          const cand = pool.filter(x => DB.asistentes[x].tipo !== 'Prensa');
          if (cand.length && k % 2 === 0) {
            const asg = DB.asistentes[cand[(k + ev.id) % cand.length]];
            DB.asignaciones.push({
              id: nextId('asignacion'), tareaId: tarea.id, asistenteId: asg.id,
              rol: t[1] === 'Protocolo' ? 'Responsable de protocolo' : 'Coordinador de tarea',
              fecha: dt(e.ini - 20, 9)
            });
          }
        });
      }

      // Mensajes / comunicados
      if (e.estado !== 'borrador') {
        DB.mensajes.push({
          id: nextId('mensaje'), eventoId: ev.id,
          asunto: `Bienvenida · ${e.nombre}`,
          cuerpo: `Estimado(a) invitado(a): Es un honor confirmar su participación en ${e.nombre}, a celebrarse en ${e.lugar}. Le compartimos los detalles de acreditación y protocolo.`,
          canal: 'Correo electrónico', audiencia: 'Todos los asistentes',
          fecha: dt(e.ini - 21, 10), estado: 'enviado', destinatarios: pool.length, leidos: Math.round(pool.length * 0.72)
        });
        DB.mensajes.push({
          id: nextId('mensaje'), eventoId: ev.id,
          asunto: `Recordatorio de logística · ${e.nombre}`,
          cuerpo: 'Le recordamos el horario de registro y las indicaciones de acceso al recinto. Es indispensable presentar identificación oficial.',
          canal: 'SMS', audiencia: 'Asistentes confirmados',
          fecha: dt(e.ini - 3, 17), estado: e.estado === 'cancelado' ? 'cancelado' : 'enviado',
          destinatarios: Math.max(1, Math.round(pool.length * 0.8)), leidos: Math.round(pool.length * 0.5)
        });
      }
    });

    /* --- Notificaciones del sistema --- */
    [
      ['3 tareas críticas vencen esta semana', 'La Gala Benéfica Fundación Lumen requiere atención de protocolo.', 'warn', false],
      ['Nuevo registro pendiente de aprobación', 'Patricio Nora solicitó inscripción a Encuentro de Consejos.', 'info', false],
      ['Presupuesto de Expo Norte excede 15% el estimado', 'Revisar partida de montaje con producción.', 'warn', false],
      ['Evento finalizado: Cumbre de Inversión Altamira 2026', 'Cierre documental disponible en el expediente.', 'ok', true],
      ['Vertex Health en curso', 'Inició la Convención Anual, 4 días de operación.', 'info', true]
    ].forEach((n, i) => DB.notificaciones.push({
      id: nextId('notif'), texto: n[0], detalle: n[1], tipo: n[2], leido: n[3], fecha: dt(-i, 8 + i)
    }));

    /* --- Bitácora --- */
    [
      ['Creación de evento', 'evento', 3, 'Alta de «Convención Anual Vertex Health» con estado confirmado.', 'ok'],
      ['Registro de asistente', 'asistente', 2, 'Alta de Mariana Esquivel como asistente VIP.', 'ok'],
      ['Asignación de tarea', 'tarea', 5, 'Tarea «Confirmar recinto» asignada a Karla Barrientos.', 'info'],
      ['Validación de aforo', 'evento', 6, 'Expo Innovación Industrial Norte al 82% de aforo.', 'warn'],
      ['Cancelación de evento', 'evento', 9, 'Cumbre Salud Digital 2026 cancelada por el cliente.', 'danger'],
      ['Actualización de progreso', 'tarea', 12, 'Tarea de producción audiovisual al 65%.', 'info']
    ].forEach((b, i) => DB.bitacora.push({
      id: nextId('bitacora'), accion: b[0], entidad: b[1], entidadId: b[2], detalle: b[3],
      severidad: b[4], usuario: i % 3 === 0 ? 'Celso I. Castro' : (i % 3 === 1 ? 'Karla Barrientos' : 'Diego Santibáñez'),
      fecha: dt(-i, 9 + i)
    }));

    DB.secuencias = { ...seq };
    return DB;
  }

  /* ============================================================
     ESTADO + PERSISTENCIA
     ============================================================ */
  let DB = null;
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.eventos && parsed.meta && parsed.meta.version === 1) { DB = parsed; seq = parsed.secuencias || seq; return; }
      }
    } catch (e) { console.warn('Base local ilegible, se regenera.', e); }
    DB = seed();
    persist();
  }
  function persist() {
    DB.secuencias = { ...seq };
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { console.warn('No se pudo guardar', e); }
  }
  function commit() { persist(); listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
  function onChange(fn) { listeners.push(fn); }
  function reset() { localStorage.removeItem(KEY); DB = seed(); seq = { ...DB.secuencias }; commit(); }

  /* ============================================================
     SUB_BITACORA  (microflujo reutilizable de auditoría)
     ============================================================ */
  function SUB_RegistrarBitacora(accion, entidad, entidadId, detalle, severidad) {
    DB.bitacora.unshift({
      id: nextId('bitacora'), accion, entidad, entidadId, detalle: detalle || '',
      severidad: severidad || 'info', usuario: USUARIO.nombre, fecha: iso(new Date())
    });
    if (DB.bitacora.length > 240) DB.bitacora.length = 240;
  }

  /* SUB_Notificar */
  function SUB_Notificar(texto, detalle, tipo) {
    DB.notificaciones.unshift({ id: nextId('notif'), texto, detalle: detalle || '', tipo: tipo || 'info', leido: false, fecha: iso(new Date()) });
    if (DB.notificaciones.length > 80) DB.notificaciones.length = 80;
  }

  /* VAL_Email */
  function VAL_Email(email) {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(String(email || '').trim());
  }

  /* ============================================================
     SUB_GENERAR_TAREAS_PLANTILLA  (microflujo modular reutilizable)
     ============================================================ */
  function SUB_GenerarTareasPlantilla(evento) {
    const tpl = PLANTILLAS[evento.tipo] || PLANTILLAS['Convención anual'];
    const creadas = [];
    tpl.forEach(t => {
      const tarea = {
        id: nextId('tarea'), eventoId: evento.id, titulo: t[0], categoria: t[1], prioridad: t[2],
        offsetDias: t[3], vencimiento: addDias(evento.fechaInicio, t[3]),
        horasEstimadas: t[4], progreso: 0, estado: 'pendiente',
        descripcion: `Actividad de ${t[1].toLowerCase()} para «${evento.nombre}». Validar entregables con el cliente antes de la fecha límite.`,
        completadaEn: null, creadoEn: iso(new Date())
      };
      DB.tareas.push(tarea);
      creadas.push(tarea);
    });
    return creadas;
  }

  /* ============================================================
     ACT_CREAR_EVENTO  + validaciones
     ============================================================ */
  function ACT_CrearEvento(p) {
    const errs = {};
    if (!p.nombre || p.nombre.trim().length < 4) errs.nombre = 'El nombre debe tener al menos 4 caracteres.';
    if (DB.eventos.some(e => e.nombre.toLowerCase() === (p.nombre || '').trim().toLowerCase())) errs.nombre = 'Ya existe un evento con ese nombre.';
    if (!p.cliente || !p.cliente.trim()) errs.cliente = 'Indica el cliente responsable.';
    if (!p.fechaInicio) errs.fechaInicio = 'Selecciona la fecha de inicio.';
    if (!p.fechaFin) errs.fechaFin = 'Selecciona la fecha de fin.';
    if (p.fechaInicio && p.fechaFin && new Date(p.fechaFin) < new Date(p.fechaInicio)) errs.fechaFin = 'La fecha de fin no puede ser anterior al inicio.';
    const aforo = Number(p.aforo);
    if (!aforo || aforo < 1 || aforo > 20000) errs.aforo = 'El aforo debe estar entre 1 y 20,000 personas.';
    const pres = Number(p.presupuesto);
    if (isNaN(pres) || pres < 0) errs.presupuesto = 'El presupuesto no puede ser negativo.';
    if (Number(p.horasDuracion) < 0) errs.horasDuracion = 'Duración inválida.';
    if (!p.lugar || p.lugar.trim().length < 4) errs.lugar = 'Especifica el recinto o sede.';
    if (Object.keys(errs).length) return { ok: false, errs, msg: 'Revisa los campos marcados en rojo.' };

    const ev = {
      id: nextId('evento'),
      nombre: p.nombre.trim(), cliente: p.cliente.trim(), tipo: p.tipo || ENUM.tipoEvento[0],
      fechaInicio: p.fechaInicio, fechaFin: p.fechaFin || p.fechaInicio,
      lugar: p.lugar.trim(), aforo: aforo, presupuesto: pres,
      estado: p.estado || 'borrador', protocoloVIP: !!p.protocoloVIP,
      responsable: p.responsable || USUARIO.nombre, descripcion: (p.descripcion || '').trim(),
      creadoEn: iso(new Date()), actualizadoEn: iso(new Date()), motivoCancelacion: null
    };
    DB.eventos.unshift(ev);

    let tareas = [];
    if (p.generarTareas !== false) tareas = SUB_GenerarTareasPlantilla(ev);

    SUB_RegistrarBitacora('Creación de evento', 'evento', ev.id, `Alta de «${ev.nombre}» en estado ${LABEL.estadoEvento[ev.estado]}.`, 'ok');
    SUB_Notificar(`Evento creado: ${ev.nombre}`, tareas.length ? `Se generaron ${tareas.length} tareas desde la plantilla de ${ev.tipo}.` : 'Sin generación automática de tareas.', 'ok');
    commit();
    return { ok: true, data: ev, tareas: tareas.length, msg: `Evento «${ev.nombre}» creado con ${tareas.length} tareas iniciales.` };
  }

  /* ACT_ACTUALIZAR_EVENTO */
  function ACT_ActualizarEvento(id, p) {
    const ev = DB.eventos.find(e => e.id === id);
    if (!ev) return { ok: false, errs: {}, msg: 'Evento no encontrado.' };
    const errs = {};
    if (!p.nombre || p.nombre.trim().length < 4) errs.nombre = 'El nombre debe tener al menos 4 caracteres.';
    if (DB.eventos.some(e => e.id !== id && e.nombre.toLowerCase() === (p.nombre || '').trim().toLowerCase())) errs.nombre = 'Ya existe otro evento con ese nombre.';
    if (p.fechaInicio && p.fechaFin && new Date(p.fechaFin) < new Date(p.fechaInicio)) errs.fechaFin = 'La fecha de fin no puede ser anterior al inicio.';
    const aforo = Number(p.aforo);
    if (!aforo || aforo < 1) errs.aforo = 'Aforo inválido.';
    const inscritos = DB.inscripciones.filter(i => i.eventoId === id && i.estado !== 'rechazado').length;
    if (aforo && aforo < inscritos) errs.aforo = `No puedes reducir el aforo por debajo de los ${inscritos} inscritos actuales.`;
    if (Object.keys(errs).length) return { ok: false, errs, msg: 'Revisa los campos marcados.' };

    Object.assign(ev, {
      nombre: p.nombre.trim(), cliente: p.cliente, tipo: p.tipo, fechaInicio: p.fechaInicio,
      fechaFin: p.fechaFin, lugar: p.lugar, aforo: aforo, presupuesto: Number(p.presupuesto),
      estado: p.estado, protocoloVIP: !!p.protocoloVIP, responsable: p.responsable,
      descripcion: p.descripcion, actualizadoEn: iso(new Date())
    });
    SUB_RegistrarBitacora('Actualización de evento', 'evento', id, `Datos de «${ev.nombre}» actualizados.`, 'info');
    commit();
    return { ok: true, data: ev, msg: 'Cambios guardados correctamente.' };
  }

  /* ACT_CANCELAR_EVENTO — cascada + validación de motivo */
  function ACT_CancelarEvento(id, motivo) {
    const ev = DB.eventos.find(e => e.id === id);
    if (!ev) return { ok: false, msg: 'Evento no encontrado.' };
    if (ev.estado === 'cancelado') return { ok: false, msg: 'El evento ya estaba cancelado.' };
    if (ev.estado === 'finalizado') return { ok: false, msg: 'No se puede cancelar un evento finalizado.' };
    if (!motivo || motivo.trim().length < 10) return { ok: false, msg: 'El motivo de cancelación es obligatorio (mínimo 10 caracteres).' };
    ev.estado = 'cancelado'; ev.motivoCancelacion = motivo.trim(); ev.actualizadoEn = iso(new Date());
    const abiertas = DB.tareas.filter(t => t.eventoId === id && t.estado !== 'completada');
    abiertas.forEach(t => { t.estado = 'bloqueada'; t.bloqueoMotivo = 'Evento cancelado: ' + motivo.trim(); });
    const asist = DB.inscripciones.filter(i => i.eventoId === id).length;
    DB.mensajes.push({
      id: nextId('mensaje'), eventoId: id, asunto: `Aviso importante · ${ev.nombre}`,
      cuerpo: `Lamentamos informar la cancelación de ${ev.nombre}. Motivo: ${motivo.trim()}. Nuestro equipo se pondrá en contacto para dar seguimiento.`,
      canal: 'Correo electrónico', audiencia: 'Todos los asistentes', fecha: iso(new Date()),
      estado: 'enviado', destinatarios: asist, leidos: 0
    });
    SUB_RegistrarBitacora('Cancelación de evento', 'evento', id, `«${ev.nombre}» cancelado. Motivo: ${motivo.trim()}`, 'danger');
    SUB_Notificar(`Evento cancelado: ${ev.nombre}`, `Se notificó a ${asist} asistentes y se bloquearon ${abiertas.length} tareas.`, 'warn');
    commit();
    return { ok: true, msg: `Evento cancelado. ${abiertas.length} tareas bloqueadas y ${asist} asistentes notificados.` };
  }

  /* ============================================================
     ACT_REGISTRAR_ASISTENTE  (validaciones de negocio)
     ============================================================ */
  function ACT_RegistrarAsistente(p, eventoId) {
    const errs = {};
    const nombre = (p.nombre || '').trim();
    if (!nombre) errs.nombre = 'El nombre completo es obligatorio.';
    else if (nombre.split(' ').filter(Boolean).length < 2) errs.nombre = 'Captura nombre y apellidos.';
    if (!p.email) errs.email = 'El correo electrónico es obligatorio.';
    else if (!VAL_Email(p.email)) errs.email = 'El correo no tiene un formato válido.';
    if (p.telefono && !/^[+0-9()\s-]{8,20}$/.test(p.telefono)) errs.telefono = 'Teléfono inválido (solo dígitos, +, espacios).';
    if (p.tipo === 'VIP' && !p.telefono) errs.telefono = 'Los asistentes VIP requieren teléfono de contacto directo.';
    if (!p.empresa || !p.empresa.trim()) errs.empresa = 'Indica la empresa u organización.';
    const acomp = Number(p.acompanantes || 0);
    if (isNaN(acomp) || acomp < 0 || acomp > 5) errs.acompanantes = 'Acompañantes permitidos: 0 a 5.';
    if (!eventoId) errs.evento = 'Selecciona el evento de destino.';
    if (Object.keys(errs).length) return { ok: false, errs, msg: 'Revisa los datos del asistente.' };

    const ev = DB.eventos.find(e => e.id === Number(eventoId));
    if (!ev) return { ok: false, errs: { evento: 'Evento inexistente.' }, msg: 'Evento inexistente.' };
    if (ev.estado === 'cancelado') return { ok: false, errs: {}, msg: 'No es posible registrar asistentes en un evento cancelado.' };
    if (ev.estado === 'finalizado') return { ok: false, errs: {}, msg: 'El evento ya finalizó; el registro está cerrado.' };

    const emailNorm = p.email.trim().toLowerCase();
    const yaInscrito = DB.inscripciones.filter(i => i.eventoId === ev.id)
      .map(i => DB.asistentes.find(a => a.id === i.asistenteId))
      .some(a => a && a.email.toLowerCase() === emailNorm);
    if (yaInscrito) return { ok: false, errs: { email: 'Este correo ya está registrado en el evento.' }, msg: 'El asistente ya está inscrito en este evento.' };

    const ocupados = DB.inscripciones.filter(i => i.eventoId === ev.id && i.estado !== 'rechazado').length;
    if (ocupados + 1 + acomp > ev.aforo) {
      return { ok: false, errs: {}, msg: `Aforo insuficiente: el evento admite ${ev.aforo} y ya hay ${ocupados} lugares comprometidos.` };
    }

    // Reutiliza el maestro de asistentes si el correo existe
    let a = DB.asistentes.find(x => x.email.toLowerCase() === emailNorm);
    let reutilizado = false;
    if (a) { reutilizado = true; a.nombre = nombre; a.empresa = p.empresa; a.puesto = p.puesto || a.puesto; a.telefono = p.telefono || a.telefono; }
    else {
      a = {
        id: nextId('asistente'), nombre, email: emailNorm, telefono: p.telefono || '',
        empresa: p.empresa.trim(), puesto: p.puesto || '', tipo: p.tipo || 'Corporativo',
        acompanantes: acomp, dieta: p.dieta || 'Ninguna', estado: 'pendiente',
        codigo: 'AUR-' + String(1000 + nextId('asistente') * 3).slice(0, 4), creadoEn: iso(new Date())
      };
      DB.asistentes.push(a);
    }

    DB.inscripciones.push({
      id: nextId('inscripcion'), eventoId: ev.id, asistenteId: a.id,
      fecha: iso(new Date()), estado: 'pendiente', notas: p.notas || ''
    });
    if (a.tipo === 'VIP') {
      DB.notificaciones.unshift({ id: nextId('notif'), texto: 'Asistente VIP registrado', detalle: `${a.nombre} requiere atención preferente en ${ev.nombre}.`, tipo: 'warn', leido: false, fecha: iso(new Date()) });
    }
    SUB_RegistrarBitacora('Registro de asistente', 'asistente', a.id, `${a.nombre} inscrito en «${ev.nombre}» con estado Pendiente.`, 'ok');
    commit();
    return {
      ok: true, data: a, inscripcion: DB.inscripciones[DB.inscripciones.length - 1],
      msg: reutilizado ? 'Asistente existente vinculado al evento (maestro reutilizado).' : `Asistente registrado. Código de acreditación ${a.codigo}.`
    };
  }

  /* ACT_CONFIRMAR_ASISTENTE */
  function ACT_ConfirmarAsistente(inscripcionId) {
    const i = DB.inscripciones.find(x => x.id === Number(inscripcionId));
    if (!i) return { ok: false, msg: 'Inscripción no encontrada.' };
    const ev = DB.eventos.find(e => e.id === i.eventoId);
    if (ev.estado === 'cancelado') return { ok: false, msg: 'El evento está cancelado.' };
    if (i.estado === 'confirmado') return { ok: false, msg: 'El asistente ya estaba confirmado.' };
    if (i.estado === 'rechazado') return { ok: false, msg: 'La inscripción fue rechazada.' };
    const confirmados = DB.inscripciones.filter(x => x.eventoId === ev.id && x.estado === 'confirmado').length;
    if (confirmados >= ev.aforo) return { ok: false, msg: 'Aforo máximo alcanzado: no es posible confirmar más asistentes.' };
    i.estado = 'confirmado';
    const a = DB.asistentes.find(x => x.id === i.asistenteId);
    SUB_RegistrarBitacora('Confirmación de asistente', 'inscripcion', i.id, `${a.nombre} confirmado en «${ev.nombre}».`, 'ok');
    commit();
    return { ok: true, msg: `${a.nombre} confirmado.` };
  }

  function ACT_RechazarAsistente(inscripcionId, motivo) {
    const i = DB.inscripciones.find(x => x.id === Number(inscripcionId));
    if (!i) return { ok: false, msg: 'Inscripción no encontrada.' };
    i.estado = 'rechazado'; i.notas = motivo || 'Rechazado por el organizador.';
    SUB_RegistrarBitacora('Rechazo de inscripción', 'inscripcion', i.id, 'Inscripción rechazada por el organizador.', 'warn');
    commit();
    return { ok: true, msg: 'Inscripción rechazada.' };
  }

  /* ACT_CHECK_IN — solo dentro de la ventana del evento */
  function ACT_CheckIn(inscripcionId) {
    const i = DB.inscripciones.find(x => x.id === Number(inscripcionId));
    if (!i) return { ok: false, msg: 'Inscripción no encontrada.' };
    const ev = DB.eventos.find(e => e.id === i.eventoId);
    if (i.estado !== 'confirmado') return { ok: false, msg: 'Solo los asistentes confirmados pueden hacer check-in.' };
    const hoy = isoDay(new Date()), ini = isoDay(new Date(ev.fechaInicio)), fin = isoDay(new Date(ev.fechaFin));
    if (hoy < ini) return { ok: false, msg: `El check-in abre el ${fFecha(ev.fechaInicio)}, no antes.` };
    if (hoy > fin) return { ok: false, msg: 'El evento ya concluyó; ventana de check-in cerrada.' };
    i.estado = 'checkin';
    const a = DB.asistentes.find(x => x.id === i.asistenteId);
    SUB_RegistrarBitacora('Check-in de asistente', 'inscripcion', i.id, `${a.nombre} acreditado en «${ev.nombre}».`, 'ok');
    commit();
    return { ok: true, msg: `${a.nombre} acreditado correctamente.` };
  }

  /* ============================================================
     TAREAS
     ============================================================ */
  function ACT_CrearTarea(p) {
    const errs = {};
    if (!p.titulo || p.titulo.trim().length < 4) errs.titulo = 'El título debe tener al menos 4 caracteres.';
    if (!p.eventoId) errs.eventoId = 'Selecciona el evento.';
    if (!p.vencimiento) errs.vencimiento = 'Define la fecha límite.';
    if (Object.keys(errs).length) return { ok: false, errs, msg: 'Revisa los datos de la tarea.' };
    const t = {
      id: nextId('tarea'), eventoId: Number(p.eventoId), titulo: p.titulo.trim(),
      descripcion: p.descripcion || '', categoria: p.categoria || 'Logística',
      prioridad: p.prioridad || 'Media', estado: 'pendiente', progreso: 0,
      vencimiento: p.vencimiento, horasEstimadas: Number(p.horasEstimadas || 4),
      completadaEn: null, creadoEn: iso(new Date()), offsetDias: 0
    };
    DB.tareas.unshift(t);
    SUB_RegistrarBitacora('Creación de tarea', 'tarea', t.id, `«${t.titulo}» creada.`, 'info');
    commit();
    return { ok: true, data: t, msg: 'Tarea creada correctamente.' };
  }

  /* ACT_ASIGNAR_TAREA — reglas de negocio */
  function ACT_AsignarTarea(tareaId, asistenteId, rol) {
    const t = DB.tareas.find(x => x.id === Number(tareaId));
    const a = DB.asistentes.find(x => x.id === Number(asistenteId));
    if (!t) return { ok: false, msg: 'Tarea no encontrada.' };
    if (!a) return { ok: false, msg: 'Asistente no encontrado.' };
    const ev = DB.eventos.find(e => e.id === t.eventoId);
    if (ev.estado === 'cancelado') return { ok: false, msg: 'No se pueden asignar tareas de un evento cancelado.' };
    if (t.estado === 'completada') return { ok: false, msg: 'La tarea ya está completada; reábrela antes de asignarla.' };
    const inscrito = DB.inscripciones.some(i => i.eventoId === ev.id && i.asistenteId === a.id && i.estado !== 'rechazado');
    if (!inscrito) return { ok: false, msg: `${a.nombre} no está inscrito en «${ev.nombre}». Regístralo antes de asignarle tareas.` };
    if (DB.asignaciones.some(x => x.tareaId === t.id && x.asistenteId === a.id)) return { ok: false, msg: 'La tarea ya está asignada a esta persona.' };
    const abiertas = DB.asignaciones.filter(x => x.asistenteId === a.id)
      .map(x => DB.tareas.find(tt => tt.id === x.tareaId))
      .filter(tt => tt && tt.estado !== 'completada').length;
    if (abiertas >= 5) return { ok: false, msg: `${a.nombre} ya tiene ${abiertas} tareas abiertas (máximo 5). Rebalancea la carga.` };
    const asg = { id: nextId('asignacion'), tareaId: t.id, asistenteId: a.id, rol: rol || 'Coordinador de tarea', fecha: iso(new Date()) };
    DB.asignaciones.push(asg);
    SUB_RegistrarBitacora('Asignación de tarea', 'tarea', t.id, `«${t.titulo}» asignada a ${a.nombre} como ${asg.rol}.`, 'info');
    commit();
    return { ok: true, data: asg, msg: `Tarea asignada a ${a.nombre}.` };
  }

  function ACT_QuitarAsignacion(asignacionId) {
    const idx = DB.asignaciones.findIndex(x => x.id === Number(asignacionId));
    if (idx < 0) return { ok: false, msg: 'Asignación no encontrada.' };
    DB.asignaciones.splice(idx, 1);
    SUB_RegistrarBitacora('Desasignación de tarea', 'asignacion', asignacionId, 'Se retiró la asignación.', 'warn');
    commit();
    return { ok: true, msg: 'Asignación retirada.' };
  }

  /* ACT_ACTUALIZAR_PROGRESO_TAREA */
  function ACT_ActualizarProgreso(tareaId, progreso, estadoManual) {
    const t = DB.tareas.find(x => x.id === Number(tareaId));
    if (!t) return { ok: false, msg: 'Tarea no encontrada.' };
    let p = clamp(Number(progreso), 0, 100);
    if (isNaN(p)) p = 0;
    t.progreso = p;
    if (estadoManual) t.estado = estadoManual;
    else t.estado = p === 100 ? 'completada' : (p === 0 ? (t.estado === 'bloqueada' ? 'bloqueada' : 'pendiente') : 'en_progreso');
    if (p === 100) { t.completadaEn = iso(new Date()); if (t.bloqueoMotivo) delete t.bloqueoMotivo; }
    else t.completadaEn = null;
    SUB_RegistrarBitacora('Actualización de progreso', 'tarea', t.id, `«${t.titulo}» al ${p}% (${LABEL.estadoTarea[t.estado]}).`, 'info');
    commit();
    return { ok: true, msg: `Progreso actualizado al ${p}%.` };
  }

  function ACT_MoverTarea(tareaId, nuevoEstado) {
    const t = DB.tareas.find(x => x.id === Number(tareaId));
    if (!t) return { ok: false, msg: 'Tarea no encontrada.' };
    const ev = DB.eventos.find(e => e.id === t.eventoId);
    if (ev.estado === 'cancelado') return { ok: false, msg: 'El evento está cancelado; no admite cambios.' };
    if (nuevoEstado === 'completada') { t.progreso = 100; t.completadaEn = iso(new Date()); }
    else if (t.progreso === 100) t.progreso = nuevoEstado === 'en_progreso' ? 60 : 0;
    t.estado = nuevoEstado;
    SUB_RegistrarBitacora('Cambio de estado de tarea', 'tarea', t.id, `«${t.titulo}» → ${LABEL.estadoTarea[nuevoEstado]}.`, 'info');
    commit();
    return { ok: true, msg: `Tarea movida a ${LABEL.estadoTarea[nuevoEstado]}.` };
  }

  /* ACT_ENVIAR_COMUNICADO */
  function ACT_EnviarComunicado(p) {
    const errs = {};
    if (!p.asunto || p.asunto.trim().length < 4) errs.asunto = 'El asunto es obligatorio.';
    if (!p.cuerpo || p.cuerpo.trim().length < 10) errs.cuerpo = 'El mensaje debe tener al menos 10 caracteres.';
    if (!p.eventoId) errs.eventoId = 'Selecciona el evento.';
    const ev = DB.eventos.find(e => e.id === Number(p.eventoId));
    if (ev && ev.estado === 'cancelado') return { ok: false, errs: {}, msg: 'No se pueden enviar comunicados de un evento cancelado.' };
    if (Object.keys(errs).length) return { ok: false, errs, msg: 'Revisa el comunicado.' };

    let destinos = DB.inscripciones.filter(i => i.eventoId === ev.id);
    if (p.audiencia === 'Asistentes confirmados') destinos = destinos.filter(i => i.estado === 'confirmado' || i.estado === 'checkin');
    else if (p.audiencia === 'VIP') destinos = destinos.filter(i => { const a = DB.asistentes.find(x => x.id === i.asistenteId); return a && a.tipo === 'VIP'; });
    else if (p.audiencia === 'Pendientes') destinos = destinos.filter(i => i.estado === 'pendiente');
    if (!destinos.length) return { ok: false, errs: {}, msg: 'La audiencia seleccionada no tiene destinatarios.' };

    const m = {
      id: nextId('mensaje'), eventoId: ev.id, asunto: p.asunto.trim(), cuerpo: p.cuerpo.trim(),
      canal: p.canal || 'Correo electrónico', audiencia: p.audiencia || 'Todos los asistentes',
      fecha: iso(new Date()), estado: 'enviado', destinatarios: destinos.length, leidos: 0
    };
    DB.mensajes.unshift(m);
    SUB_RegistrarBitacora('Envío de comunicado', 'mensaje', m.id, `«${m.asunto}» enviado a ${destinos.length} destinatarios por ${m.canal}.`, 'ok');
    SUB_Notificar('Comunicado enviado', `${m.asunto} — ${destinos.length} destinatarios vía ${m.canal}.`, 'ok');
    commit();
    return { ok: true, data: m, count: destinos.length, msg: `Comunicado enviado a ${destinos.length} destinatarios.` };
  }

  /* ============================================================
     CONSULTAS / AGREGADOS
     ============================================================ */
  const S = {
    eventos: () => DB.eventos,
    asistentes: () => DB.asistentes,
    tareas: () => DB.tareas,
    inscripciones: () => DB.inscripciones,
    asignaciones: () => DB.asignaciones,
    mensajes: () => DB.mensajes,
    notificaciones: () => DB.notificaciones,
    bitacora: () => DB.bitacora,
    evento: id => DB.eventos.find(e => e.id === Number(id)),
    asistente: id => DB.asistentes.find(a => a.id === Number(id)),
    tarea: id => DB.tareas.find(t => t.id === Number(id)),
    tareasDe: evId => DB.tareas.filter(t => t.eventoId === Number(evId)),
    inscripcionesDe: evId => DB.inscripciones.filter(i => i.eventoId === Number(evId)),
    asistentesDe: evId => DB.inscripciones.filter(i => i.eventoId === Number(evId)).map(i => ({ ...DB.asistentes.find(a => a.id === i.asistenteId), inscripcion: i })).filter(a => a.id),
    asignadosDe: tareaId => DB.asignaciones.filter(a => a.tareaId === Number(tareaId)).map(a => ({ ...a, asistente: DB.asistentes.find(x => x.id === a.asistenteId) })).filter(x => x.asistente),
    tareasDeAsistente: asId => DB.asignaciones.filter(a => a.asistenteId === Number(asId)).map(a => DB.tareas.find(t => t.id === a.tareaId)).filter(Boolean),
    eventosDeAsistente: asId => DB.inscripciones.filter(i => i.asistenteId === Number(asId)).map(i => ({ ev: DB.eventos.find(e => e.id === i.eventoId), inscripcion: i })).filter(x => x.ev),
    mensajesDe: evId => DB.mensajes.filter(m => m.eventoId === Number(evId)),
    proximosEventos: () => DB.eventos.filter(e => e.estado !== 'finalizado' && e.estado !== 'cancelado' && new Date(e.fechaFin) >= hoyInicio()).sort((a, b) => new Date(a.fechaInicio) - new Date(b.fechaInicio)),
    tareasVencidas: () => DB.tareas.filter(t => t.estado !== 'completada' && new Date(t.vencimiento) < hoyInicio() && S.evento(t.eventoId) && S.evento(t.eventoId).estado !== 'cancelado'),
    estadoTarea: t => {
      if (t.estado === 'completada') return 'completada';
      if (new Date(t.vencimiento) < hoyInicio()) return 'vencida';
      return t.estado;
    },
    avanceEvento: evId => {
      const ts = DB.tareas.filter(t => t.eventoId === Number(evId));
      if (!ts.length) return 0;
      return Math.round(ts.reduce((s, t) => s + (t.progreso || 0), 0) / ts.length);
    },
    avancePorCategoria: evId => {
      const ts = DB.tareas.filter(t => t.eventoId === Number(evId));
      const map = {};
      ts.forEach(t => { (map[t.categoria] = map[t.categoria] || { total: 0, prog: 0, n: 0 }); map[t.categoria].prog += t.progreso; map[t.categoria].n++; });
      return Object.entries(map).map(([k, v]) => ({ categoria: k, progreso: Math.round(v.prog / v.n), tareas: v.n }));
    },
    ocupacion: evId => {
      const ev = S.evento(evId);
      const usados = DB.inscripciones.filter(i => i.eventoId === Number(evId) && i.estado !== 'rechazado')
        .reduce((s, i) => { const a = DB.asistentes.find(x => x.id === i.asistenteId); return s + 1 + (a ? (a.acompanantes || 0) : 0); }, 0);
      return { usados, aforo: ev ? ev.aforo : 0, pct: pct(usados, ev ? ev.aforo : 1) };
    },
    kpis: () => {
      const evs = DB.eventos.filter(e => e.estado !== 'cancelado');
      const activos = evs.filter(e => ['planificacion', 'confirmado', 'en_curso'].includes(e.estado)).length;
      const tareasAbiertas = DB.tareas.filter(t => t.estado !== 'completada' && S.evento(t.eventoId) && S.evento(t.eventoId).estado !== 'cancelado');
      const vencidas = tareasAbiertas.filter(t => new Date(t.vencimiento) < hoyInicio()).length;
      const asist = DB.inscripciones.filter(i => { const e = S.evento(i.eventoId); return e && e.estado !== 'cancelado'; }).length;
      const confirmados = DB.inscripciones.filter(i => i.estado === 'confirmado' || i.estado === 'checkin').length;
      const completadas = DB.tareas.filter(t => t.estado === 'completada').length;
      return {
        eventosActivos: activos, totalEventos: DB.eventos.length,
        tareasAbiertas: tareasAbiertas.length, vencidas,
        asistentes: asist, confirmados, completadas,
        cumplimiento: pct(completadas, DB.tareas.length),
        presupuesto: DB.eventos.filter(e => e.estado !== 'cancelado').reduce((s, e) => s + e.presupuesto, 0)
      };
    },
    ENUM, LABEL, TONE, PLANTILLAS
  };

  /* ---------------- API pública ---------------- */
  global.Store = {
    init: load, reset, onChange, commit,
    S, DBget: () => DB,
    USUARIO, EMPRESA, ENUM, LABEL, TONE,
    ACT_CrearEvento, ACT_ActualizarEvento, ACT_CancelarEvento,
    ACT_RegistrarAsistente, ACT_ConfirmarAsistente, ACT_RechazarAsistente, ACT_CheckIn,
    ACT_CrearTarea, ACT_AsignarTarea, ACT_QuitarAsignacion, ACT_ActualizarProgreso, ACT_MoverTarea,
    ACT_EnviarComunicado, SUB_GenerarTareasPlantilla, SUB_RegistrarBitacora, SUB_Notificar, VAL_Email,
    // utilidades de formato
    fmt: { fFecha, fFechaHora, fLarga, fCorto, fHora, money, num, pct, diasHasta, addDias, isoDay, iso, dt, hoyInicio, DIAS, MESES },
    PLANTILLAS
  };

  load();
})(window);
