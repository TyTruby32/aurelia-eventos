# AURELIA EventOS

Prototipo funcional de gestión de eventos corporativos de alto perfil.
**Empresa ficticia:** AURELIA Eventos & Protocolo.

Proyecto académico — Actividad 4 (desarrollo de aplicaciones low-code).
**Autor:** Celso Iván Castro Vizcarra · Matrícula AL07167862.

## Enlaces

| Recurso | URL |
|---|---|
| Aplicación en funcionamiento | https://tytruby32.github.io/aurelia-eventos/ |
| Video demostrativo (2:51) | https://tytruby32.github.io/aurelia-eventos/video/AureliaEventOS_Demo.mp4 |

## Módulos

- Panel de control con indicadores operativos
- Calendario de eventos (componente reutilizable)
- Creación y seguimiento de eventos
- Registro de asistentes con validaciones de aforo y duplicados
- Asignación y seguimiento de tareas (Kanban)
- Comunicación segmentada con asistentes
- Reportes y bitácora de auditoría
- Portal público de registro

## Arquitectura

| Archivo | Responsabilidad |
|---|---|
| `js/store.js` | Modelo de datos, enumeraciones, persistencia y los 20 microflujos de negocio |
| `js/components.js` | 12 componentes reutilizables y primitivas de interfaz |
| `js/pages.js` | 10 páginas y modales operativos |
| `js/app.js` | Shell: navegación, enrutador, búsqueda global, notificaciones |
| `css/styles.css` | Sistema de diseño completo y comportamiento adaptativo |

La separación replica los módulos de Mendix: dominio, lógica, interfaz y recursos compartidos.

## Ejecución local

```bash
python3 -m http.server 8899
# abrir http://127.0.0.1:8899
```

## Entregables

- `docs/AureliaEventOS_Actividad4.docx` — documento técnico (44 páginas)
- `docs/AureliaEventOS_Presentacion.pptx` — presentación (17 diapositivas, con notas del expositor)
- `docs/erd.png` — diagrama entidad-relación
- `video/AureliaEventOS_Demo.mp4` — demostración narrada
