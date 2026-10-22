# Lands — mejoras de búsqueda y captura

Fecha: 10 de octubre de 2026. Rama: `feature/properties-condos-mvp`.

Implementación del análisis previo: [lands-usability-analysis.md](lands-usability-analysis.md).

## Cambios disponibles

| Recorrido | Comportamiento implementado |
| --- | --- |
| Encontrar una persona | Directorio con consulta al servidor por nombre, teléfono o correo; filtros por tipo, paginación y búsqueda conservada en URL. La ficha cambia con el resultado, sin mantener acciones sobre otra persona. |
| Registrar un cliente | Campos con etiquetas asociadas, indicación de opcionales, autocompletado y envío desde teclado. Se reutilizan las validaciones del formulario compartido. |
| Encontrar un contrato | Consulta paginada al servidor; número de contrato, cliente mediante buscador y estado. Enlaces directos permiten recuperar contratos fuera de los primeros 100 cargados por el contexto. |
| Generar un contrato | Elección explícita de cliente mediante búsqueda remota. Resumen de cliente, lote, total y mensualidad calculada con el plan activo. Configurar el plan y regresar conserva el borrador durante esa navegación. |
| Cotizar | El cotizador de fraccionamientos utiliza la misma fórmula activa que el registro de contrato. Expone variables adicionales si el plan las requiere; muestra errores y falta de configuración. |
| Registrar un cobro | Búsqueda remota de cliente y consulta de sus contratos. Selección de método (transferencia, efectivo, tarjeta o cheque), fecha, cuota y monto. Los fallos al consultar cuotas permiten reintentar. |
| Recuperar un comprobante | Si el cobro se guarda pero el archivo falla, se mantiene el aviso y se puede reintentar únicamente el adjunto. Los identificadores pendientes sobreviven a recargar la pestaña, aislados por organización y usuario. Es necesario volver a seleccionar el archivo. |
| Abrir resultados globales | Resultados de cliente, contrato, lote y pago llevan al registro concreto; documentos usan su visor. La consulta remota controla respuestas anteriores y ofrece reintento cuando falla. |
| Usar el teléfono | Formularios y filtros adaptados a pantalla estrecha; controles táctiles, contactos en su propia fila y diálogos mediante portal con desplazamiento interno. |

Las fechas de vencimiento que llegan como `YYYY-MM-DD` se muestran como fechas locales, evitando que la conversión desde UTC reste un día.

## Contratos de API utilizados

Se aprovecharon endpoints existentes. No se creó ni modificó backend.

- Core: `GET /clients` con `search`, `type`, `page`, `limit`; consulta de persona y sus aplicaciones.
- Lands: `GET /contracts` con `search`, `status`, `client_id`, `page`, `limit`; consulta de contrato por ID y contratos de una persona.
- Lands: consulta de lote por ID y de sus lotes por proyecto; consulta del plan activo de calculadora.
- Lands: consulta de cuotas, registro de cobro y carga de comprobante. Se envía el método elegido utilizando los valores que acepta el backend.

El `search` de contratos implementado en backend busca por **número**. Por eso el filtro por persona es un selector separado que envía `client_id`.

## Límites y siguiente trabajo

- Core no ofrece un filtro de directorio por aplicación. La lista consulta el directorio completo y muestra las personas vinculadas a Lands de cada página; los totales de paginación corresponden al directorio completo. Se explica en la pantalla. Un filtro de servidor por aplicación permitiría páginas y totales exclusivos de Lands sin consultas de asignación por persona.
- Reportes, documentos y la búsqueda general de la tabla de amortizaciones todavía dependen en parte de las colecciones cargadas por el contexto. Esta entrega no convierte todas las listas de Lands a paginación remota.
- El borrador del contrato conserva sus datos al ir a configurar el plan y volver; no se promete recuperación del borrador después de cerrar o recargar el navegador.
- El calendario contractual definitivo se obtiene al registrar el contrato. El cotizador no presenta una tabla de amortización local como si fuera el calendario confirmado por backend.
- No se ha medido un promedio con usuarios reales. Las pruebas verifican funcionamiento y presentación; los tiempos del análisis anterior siguen siendo estimaciones. Para medir practicidad, cronometrar encontrar cliente, registrar cliente, cotizar/contratar y cobrar, contando errores y correcciones.

## Verificación

- Suite de componentes y unidades: **322 pruebas aprobadas**, en 59 archivos.
- Regresión de navegador completa: **316 pruebas aprobadas**.
- Dentro de esa suite, Lands incluye nueve recorridos nuevos en escritorio Chromium, Android y iPhone WebKit: **27 casos**.
- Compilación de producción aprobada; `git diff --check` sin problemas.
- Pruebas de navegador con API simulada: no equivalen a validación de persistencia en el backend dev ni registran cobros reales.
- Capturas inspeccionadas: [búsqueda de contratos](lands-workflows/contracts-search-desktop.png), [captura de contrato](lands-workflows/contract-capture-desktop.png), [cliente en móvil](lands-workflows/clients-search-mobile.png), [cobro en móvil](lands-workflows/payment-capture-mobile.png).

Revisión local: http://localhost:5173/clientes, http://localhost:5173/contratos y http://localhost:5173/pagos.
