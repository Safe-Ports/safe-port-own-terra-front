# Properties — revisión UI/UX por vista

9 de octubre de 2026. Rama `feature/properties-condos-mvp`. Instrucciones aplicadas: `prompt-chatgpt-frontend-uiux.md` y adjunto del usuario. Trabajo realizado sobre componentes y CSS existentes; JavaScript/React y rutas conservadas.

## 1. Veredicto

La base operativa se conserva; los problemas principales eran controles demasiado pequeños en teléfono, diálogos atrapados en el contenido y una cobertura que no probaba Safari ni viewports de teléfono de 360–430 px.

## 2. Hallazgos por impacto

| # | Severidad | Qué pasa | Dónde | Por qué importa |
|---|---|---|---|---|
| 1 | Rompe en móvil | Texto de input de 8–13 px y controles de 28–32 px | Formularios de Properties y portales | Lectura difícil, objetivos táctiles pequeños y zoom al enfocar en Safari |
| 2 | Rompe en móvil | Diálogos propios anidados; shared Modal se portaba al layout, no al body | Tickets, catálogo, inquilino y Modal compartido | El scroll/z-index del padre atrapaba el overlay; teclado y foco sin garantías |
| 3 | Rompe en móvil | Rejillas con mínimos de 260–500 px y zonas que compiten por ancho | Contextos, operación comunitaria, servicio, guía | El contenido podía ampliar el scroll de la página |
| 4 | Rompe en móvil | Resplandor con inset negativo de 14 px excede el ancho disponible | Inicio, pseudo-elemento property-paths::before | El main medía 328 px pero su scroll llegaba a 342 px, aun sin hijos visibles fuera del rectángulo |
| 5 | Rompe en móvil | Altura 100vh/90vh y falta de espacio inferior seguro | Portales y overlays | Barra dinámica de Safari y notch reducen área útil |
| 6 | Accesibilidad | Sin ciclo de foco ni retorno consistente | Diálogos | Tab podía salir; cerrar dejaba el foco en un elemento desmontado |
| 7 | Accesibilidad | Foco poco visible y campos de lectura pequeños | Vistas activas y portales | Operación con teclado y seguimiento de incidencias difíciles |
| 8 | Se ve barato | Jerarquías inventadas y texto secundario de 6–10 px | Tickets, dashboard, registro, servicio | Mucha densidad y diferencias entre pantallas hermanas |
| 9 | Se ve barato | Algunos destinos podían renderizar cero datos mientras cargaba/fallaba el portafolio | Ruta Properties | Una organización vacía y un error de API parecían el mismo resultado |
| 10 | Pulido | Sólo Desktop Chrome y prueba a 768 px | Playwright | No detectaba la experiencia en teléfono ni WebKit |

## 3. Parches aplicados por hallazgo

### A. Controles, rejillas y tipografía

`src/apps/properties/components/properties-ui.css` define la base compartida con ámbito `.eco-root.properties-focus`; se importa desde PropertiesModule. Portales externos tienen selectores explícitos de sus propios roots. Se mantiene la paleta Own Terra y se unifican separación, encabezados, bordes de listas, foco, etiquetas y lectura secundaria.

```css
.eco-root.properties-focus :is(.main,.scroll-area,main,section,article,header,footer,form,nav,label){min-width:0}
.eco-root.properties-focus main :is(input:not([type=checkbox]):not([type=radio]),select,textarea){min-width:0;max-width:100%;min-height:44px;font-size:16px}
@media(max-width:760px){
.eco-root.properties-focus :is(button,a[role=button]){min-width:44px;min-height:44px}
.eco-root.properties-focus :is(.community-context,.community-detail,.condo-split,.utility-workspace,.service-layout,.access-layout,.portfolio-cell,.unit-monitor-workspace,.unicell-context){grid-template-columns:minmax(0,1fr)}
}
```

Tablas/matrices y barras que necesitan desplazamiento mantienen scroll local; no se aplica un overflow:hidden global para esconder el problema. Inputs radio/checkbox no se fuerzan a 44 px de caja; sus etiquetas siguen siendo el área de interacción. Verificar estas áreas en dispositivo físico es parte de QA manual.

Afecta: inicio, operación, propietarios, inmuebles, unidades, portafolio, comunidades/directorio, cuotas, servicios/medidores, comunicados, amenidades, comité, reportes, accesos/paquetería, tickets, proveedores, guía y previews de módulos. Fuera del shell: comunidad, servicio, login/invitación y registro. No se aplica al layout principal de Lands ni al hub de Core.

### B. Diálogos

`src/components/ui/DialogPortal.jsx` porta el overlay a document.body y mantiene un contenedor de tema sin caja (`display:contents`). Conserva ámbitos `.eco-root`/`.app-shell`, evita el contexto de apilamiento y agrega ciclo de Tab/Shift+Tab y restauración del foco. Modal compartido lo reutiliza; tickets, catálogo e inquilino preservan su contenido existente dentro del portal.

```jsx
return createPortal(
  <div className={`dialog-theme ${theme}`.trim()}>
    <div ref={overlayRef} {...props}>{children}</div>
  </div>,
  document.body,
);
```

```css
.dialog-theme,.eco-root.dialog-theme,.app-shell.dialog-theme{display:contents;position:static;width:auto;height:auto;overflow:visible}
.dialog-theme .modal-box{max-height:90dvh;min-width:0}
.dialog-theme .modal-body{min-height:0;overflow-y:auto;overscroll-behavior:contain}
```

**Impacto compartido:** Modal es infraestructura de Core/Lands además de Properties. Sus overlays ahora viven en body. Se ejecuta suite completa y navegación existente, no sólo Properties. No se elevaron z-index para tapar un problema de ancestro; los overlays editados se normalizan a 50. Overlays legados ajenos a este cambio conservan sus estilos.

Safari no enfoca siempre un botón al tocarlo. Las aperturas de propietario/ticket enfocan el disparador explícitamente antes de montar el diálogo para poder devolverle el foco.

### C. Resplandor del inicio

```css
@media(max-width:760px){.eco-root.properties-focus .property-paths::before{inset:0}.eco-root.properties-focus .property-paths{margin:0;padding:16px 0}}
```

Se limita la decoración a la sección que la contiene, sin ocultar texto ni acciones.

### D. Estados de datos

`PropertiesWorkspace.jsx` comprueba propertiesLoading/propertiesError antes de Outlet: carga anunciada con role=status/aria-busy; error normalizado con parseApiError + InlineError y botón Reintentar. El contenido se abre cuando están listos los datos iniciales. La revisión posterior de proveedores conserva Outlet durante invalidaciones para no perder formularios o enlaces; los fallos siguen teniendo estado explícito. Véase properties-providers-uiux.md. Cada formulario mantiene sus validaciones y permisos existentes.

No cambia endpoints, cache keys ni contratos de negocio. Un fallo de una query operativa que forma parte del contexto compartido ahora muestra la falla explícitamente antes de continuar; revisar con producto si más adelante se desea degradación parcial por módulo.

### E. Altura y safe area

Las alturas vh editadas de Properties/portales pasan a dvh. El contenido y los overlays reservan safe-area-inset. Los estilos compartidos están en archivo compartido, no dependen del CSS que una ruta visitada previamente haya cargado. No se introdujeron reglas !important.

### F. Encabezado compartido y cierre de sesión

El perfil móvil mostraba avatar y fallback juntos: el display inline del avatar impedía esconderlo con CSS. Properties conserva el avatar y oculta el fallback, sin alterar los encabezados de otras verticales. La prueba móvil comprueba ancho y alto ≥44 px de las acciones del topbar además de main.

El cierre de sesión de CoreTopbarActions usaba window.confirm. Se reemplaza por Modal con cancelar/confirmar y retorno del foco; el cambio afecta Core, Lands y Properties porque comparten ese componente. Dos pruebas unitarias comprueban que abrir/cancelar no llama logout y confirmar sí.

```jsx
const handleLogout = (event) => {
  event.currentTarget.focus();
  setLogoutOpen(true);
};
// El botón de confirmación del Modal llama logout(); Cancelar sólo cierra el Modal.
```

## 4. Revisión de cada vista

| Vista | Finalidad del usuario | Arreglo / comprobación |
|---|---|---|
| Inicio | Entender portafolio y entrar a Comunidades | Encabezado legible, CTA 44 px, decoración sin overflow |
| Operación | Elegir tarea diaria | Encabezados/acciones y targets mínimos |
| Propietarios | Buscar, crear y editar propietario | Lista responsive, acciones 44 px, formulario 16 px y portal |
| Inmuebles | Consultar/editar inventario | Tarjetas en una columna, controles y estado compartido |
| Unidades | Buscar unidad y operar disponibilidad | Toolbar colapsa, acciones no fuerzan ancho, formularios legibles |
| Tablero de unidades | Ver disponibilidad | Scroll local/rejilla y targets, sin abrir una app independiente |
| Portafolio | Navegar inmueble/unidad | Paneles apilados en teléfono |
| Comunidades / unidades | Consultar unidad, personas y detalle | Contexto/detalle sin mínimos de desktop, matriz con scroll local |
| Directorio | Encontrar contactos y permisos de portal | Grid ajustado, etiquetas/acciones legibles |
| Cuotas y adeudos | Configurar cuota y consultar cargos | Form/registro apilados; controles y campos táctiles |
| Servicios y medidores | Consultar lecturas | Workspace apilado y controles legibles; prototipo conserva clasificación |
| Comunicados | Crear/publicar avisos | Columna de captura sin ancho fijo |
| Amenidades | Consultar y solicitar reserva | Rejilla apilada y campos táctiles |
| Comité y votaciones | Operar consultas | Formulario responsive y targets |
| Reportes | Consultar resumen | Tipografía/controles y ausencia de overflow; no inventar métricas |
| Tickets | Crear solicitud y consultar bitácora | Form y seguimiento en portal, timestamps/chat legibles, foco/restauración |
| Accesos / paquetería | Recibir y entregar paquetes | Formulario 16 px, casilla/comunidad responsive; pases siguen bajo flag actual |
| Proveedores | Habilitar y administrar red de servicio | Perfil/directorio apilados, formularios en Modal compartido |
| Guía | Completar configuración | Hero/mapa a una columna y acciones ≥44 px |
| Preview de módulo | Entender módulo futuro | Contexto/encabezado responsive; no activa capacidad pendiente |
| Portal comunitario | Consultar operación propia | Controles/inputs y altura dinámica, sin modificar permisos |
| Portal servicio | Consultar trabajos asignados del prototipo | Paneles/header responsive, acciones y captura legibles |
| Login servicio | Entrar al flujo externo vigente | Texto de input 16 px y tarjetas sin mínimo de desktop |
| Invitación | Completar activación vigente | Inputs y tarjetas responsive; no cambia auth |
| Registro | Solicitar colaboración | Form una columna, consentimiento/texto legible; contrato existente |
| Rentas / hospedaje / publicaciones / portal inquilino / catálogo | Capacidades fuera del MVP actual | No se habilitan rutas ocultas. Portales/galerías usan portal/dvh cuando aplica; unitarias existentes cubren componentes, pero no se certifica UX de rutas deshabilitadas |

## 5. Pruebas y alcance de la evidencia

Resultado final: **306 pruebas unitarias, 55 archivos; 262 pruebas Playwright, cero fallos y cero flaky; build de producción correcto; git diff --check correcto.** Playwright incluye escritorio, Android/Chromium e iOS/WebKit a 360/390/430 px. Se inspeccionaron capturas de Inicio, Comunidades y Proveedores. El build conserva la advertencia existente sobre chunks mayores a 500 kB; no se declara resuelto ese presupuesto.

- Antes de los parches: los 11 tests iniciales a 360 px fallaron por controles pequeños, overflow decorativo y portal/foco. Esas comprobaciones permanecen en la suite y se ejecutan después de los cambios.
- `e2e/properties-mobile.spec.js`: vistas y pestañas a 360, 390 y 430 px; overflow de documento/main/scroll-area; controles visibles ≥44 px; ticket/propietario en body, input ≥16 px, cierre/restauración de foco; error API y retry.
- `e2e/properties-external.spec.js`: portales, registro, login e invitación con input legible y controles táctiles.
- Playwright conserva escritorio y añade proyectos Properties Android/Chromium y iOS/WebKit. Fixtures de API evitan tocar backend real.
- `DialogPortal.test.jsx`: theme/body/Tab/Shift+Tab/Escape/retorno del foco.
- `PropertiesWorkspace.test.jsx`: carga anunciada, error/reintento y contenido listo.
- La suite completa también cubre componentes existentes de otras verticales.

### Verificación manual pendiente de dispositivo físico

1. iPhone real: expandir/contraer barra Safari, abrir formulario, enfocar el último campo y confirmar que teclado no oculta acciones; repetir en landscape.
2. Android real: teclado/cámara si aplica, targets con pulgar y regreso del navegador.
3. Con cuenta manager/viewer real y datos de volumen: recorrer listas, abrir/editar y comprobar permisos contra backend. Los E2E de esta entrega usan mocks.
4. Revisar contraste de combinaciones semánticas y fotos reales con herramientas de accesibilidad: no se afirma auditoría WCAG completa por haber ajustado tipografía/foco.

## 6. Lo que no se tocó

No se migró stack, no se habilitaron rentas/venta/later, no se creó login/token store, no se modificó lógica contable ni auth/API backend, y no se anunció QR/seguridad como operativo por cambios visuales. No se rediseñaron Lands/Core; el modal y la confirmación de cierre de sesión compartidos, y se quitó el emoji del saludo compartido. No se publicaron cambios ni se hizo commit.

