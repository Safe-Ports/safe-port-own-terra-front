# Lands: intuición y tiempo de uso

Fecha: 10 de octubre de 2026. Frontend revisado en `feature/properties-condos-mvp`, la rama activa del frontend compartido. No se cambió de rama ni se modificó código de Lands.

## Dictamen

Lands conecta bien el inventario con acciones comerciales: ficha de lote, apartado, visita, cliente, contrato y cobro. El administrador tiene cobertura amplia y el asesor cuenta con acciones desde el lote que evitan reconstruir información. Esa base debe conservarse.

La experiencia todavía exige conocer qué pantalla resuelve cada tarea. “Carga de Lotes”, “Fraccionamientos”, “Track de Lotes”, “Calculadora”, “Contratos” y “Pagos” expresan módulos, pero el usuario piensa “¿está disponible?”, “¿cuánto pagaría?”, “apártalo para este cliente” o “registra lo que recibí”. Hay búsquedas que no llegan al registro concreto, selecciones que sobreviven a un filtro y cifras de mensualidad que pueden diferir entre pantallas.

La prioridad es que una tarea termine correctamente al primer intento. Después conviene reducir decisiones, búsquedas repetidas y desplazamiento. No se asigna un score numérico de intuición porque no se observó a usuarios reales.

## Alcance y método

Se revisaron las rutas de Lands web: dashboard, fraccionamientos, carga/edición/importación de lotes, track, clientes, contratos/apartados, pagos, documentos, reportes y calculadora. Clientes, agenda y documentos dependen también de Core; se incluyen sus puntos de entrada dentro del recorrido comercial, sin proponer duplicarlos en Lands.

Perfiles: administrador/gerente como referencia principal, asesor y cobranza como tareas diferenciadas. No es una auditoría completa de permisos, backend, aplicación Flutter, contabilidad ni documentos legales.

Se inspeccionaron componentes, estado, validaciones, servicios y payloads. La exploración local de navegador utilizó una sesión simulada de administrador y fixtures de 30 clientes, 25 contratos, dos fraccionamientos y 30 lotes. Las peticiones GET fueron simuladas y las escrituras bloqueadas. No se hicieron registros reales ni se certificó integración con dev. Evidencia conservada:

- [Observaciones e inventario](lands-usability/lands-usability-evidence.json).
- [Contrato en celular](lands-usability/lands-admin-contract-mobile.png).
- [Búsqueda de cliente con ficha anterior](lands-usability/lands-admin-clients-mobile.png).

Los tiempos siguientes son **estimaciones expertas, no promedios medidos**, ni tiempos de ejecución automatizada. Los errores debidos a respuestas incorrectas del fixture durante su preparación se corrigieron y no se atribuyen al producto.

## Tiempos por tarea

Supuestos: sesión iniciada, usuario familiarizado con el negocio, datos necesarios disponibles y hasta unos dos segundos de respuesta por petición. Se incluye lectura, decisión, escritura, selección y revisión. No incluye negociación, preparación de archivos, búsqueda de documentos fuera del sistema, dictamen legal, definición financiera, activación del destinatario ni esperas largas de red/procesamiento. El punto de inicio es la pantalla indicada, no siempre el dashboard.

Los objetivos son hipótesis de diseño que requieren pruebas. El usuario nuevo debe medirse por separado; no se aplica un multiplicador arbitrario. La columna actual describe tareas completables bajo las condiciones indicadas, no garantiza que el backend acepte el registro.

| Tarea y punto de entrada | Escritorio actual estimado | Celular actual estimado | Objetivo propuesto | Condiciones |
|---|---:|---:|---|---|
| Encontrar disponibilidad y precio de lote, desde Fraccionamientos | 20–60 s | 30–90 s | 15–30 s | Proyecto y código conocidos; leer ficha correcta. |
| Encontrar quién apartó/compró y vencimiento, desde Track | 20–45 s | 30–75 s | 15–30 s | Búsqueda por lote/cliente/vendedor y filtros. |
| Encontrar teléfono o correo, desde Clientes | 15–45 s | 25–60 s | 10–20 s escritorio; 15–30 s móvil | Nombre o correo conocidos; teléfono no se busca en esta lista. |
| Consultar saldo y contratos de cliente, desde Clientes | 30–75 s | 45–120 s | 20–40 s | Ficha y consultas específicas cargadas. |
| Buscar contrato concreto, desde repositorio | 45–150 s | 60–180 s | 15–30 s | Rango para 25–100 registros cargados; depende de página y orden, sin búsqueda local. Fuera del conjunto cargado no se completa allí. |
| Alta de prospecto/cliente, desde Clientes | 60–120 s | 90–180 s | 45–75 s escritorio; 60–90 s móvil | Seis campos lógicos, teléfono con selector de país; confirmar tipo. |
| Alta rápida de cliente desde lote | 45–90 s | 60–120 s | 30–60 s | Cinco campos lógicos; notas omitidas; incluye revisión de duplicado. |
| Apartar lote desde su ficha, cliente existente | 45–90 s | 60–120 s | 30–60 s | Cliente, vencimiento, monto opcional; sin archivos ni alta nueva. |
| Extender apartado | 30–60 s | 45–90 s | 20–45 s | Leer destinatario y fecha antes de confirmar. |
| Agendar visita desde lote, cliente existente | 45–90 s | 60–120 s | 30–60 s | Cliente, fecha, hora y notas opcionales; no coordinación externa. |
| Simular cotización desde lote | 45–120 s | 60–150 s | 30–60 s | Cuatro variables: precio financiado, enganche, tasa y plazo; revisar resultado. Coherencia con venta pendiente de validar. |
| Registrar contrato de venta, cliente y plan existentes | 3–6 min | 4–8 min | 2–4 min escritorio; 3–5 min móvil | Calculadora activa configurada; revisar condiciones y personas; sin adjuntos/negociación. |
| Registrar apartado mediante formulario de contrato | 2–4 min | 3–6 min | 1–2 min con reglas aprobadas | Formulario comparte campos financieros con venta; no es igual al apartado directo del lote. |
| Revisar y aprobar contrato desde bandeja | 45–120 s | 60–150 s | 45–90 s | Lectura del expediente más confirmación; no revisión jurídica externa. |
| Registrar cobro desde contrato ya localizado | 30–75 s | 45–90 s | 30–60 s | Cuota, importe y fecha claros; revisar destino. |
| Registrar cobro desde botón general de Pagos | 60–150 s | 90–180 s | 45–90 s | Cliente → contrato → cuota → modalidad → importe/fecha. |
| Abono parcial o varias cuotas | 60–120 s | 90–180 s | 45–90 s | Revisar reparto; no eliminar este paso para bajar tiempo. |
| Adjuntar un documento con vínculo precargado | 30–75 s | 45–120 s | 30–60 s | Archivo disponible; no incluye transferencia de archivo. |
| Buscar y abrir documento, desde Documentos | 20–60 s | 30–90 s | 15–30 s | Nombre/carpeta/vínculo conocidos; solo conjunto cargado. |
| Obtener PDF de contrato o estado de cuenta localizado | 15–45 s | 20–60 s | 15–30 s más generación | No incluye tiempo variable de generar/descargar PDF. |
| Cancelar contrato y documentar motivo | 60–150 s | 90–180 s | 60–120 s | Ya revisados efectos y política; no incluye ejecución de devolución. |
| Registrar devolución desde lote liberado | 45–90 s | 60–120 s | 45–75 s | Importe conocido, revisar cobrado/devuelto/retenido; sin archivo. |
| Editar ficha de lote en borrador | 2–4 min | 3–6 min | 1–2 min básica; ficha avanzada separada | No incluye publicación final del proyecto ni geometría en plano. |
| Crear fraccionamiento e inventario básico | 4–8 min | 6–12 min | 3–5 min con datos preparados | Nombre, secciones y datos básicos; no digitalización del plano. |
| Importar archivo de lotes preparado, por fraccionamiento | 3–8 min de interacción | 5–12 min de interacción | 2–5 min más revisión por errores | Separar procesamiento y corrección; volumen/archivo determinan duración. |
| Migración lotes → clientes → contratos/pagos | Sin promedio único defendible | Sin promedio único defendible | Medir por fase y volumen | Preparación de claves, conciliación y procesos en segundo plano dominan el tiempo. |
| Configurar fórmula de financiamiento | Sin promedio único defendible | No optimizar como operación móvil frecuente | Medir con administrador capacitado | Es configuración especializada; no una tarea del asesor ni una fórmula que la UI deba inventar. |

No sumar estos tiempos como si un usuario hiciera todas las tareas cada día. Medir frecuencia por perfil y calcular `tiempo diario = Σ(frecuencia × duración medida)`, incluyendo reintentos. Configuración, migración y documentos legales requieren una categoría separada de operación recurrente.

## Formularios: carga de decisiones

| Formulario | Qué pide realmente | Fricción / simplificación recomendada |
|---|---|---|
| Cliente | Nombre, apellidos, teléfono, email, tipo y notas. Nombre obligatorio; email validado si se llena. | Mantener formulario compartido y detección de identidad existente. Mostrar opcionales; confirmar si el alta comercial debe sugerir Prospecto: hoy sugiere Comprador. No cambiar esa regla sin producto. |
| Alta rápida de cliente | Lo anterior sin notas. | Buena reducción de alcance; conservar y volver automáticamente al lote original. |
| Apartado directo | Cliente, vencimiento, monto y comprobantes opcionales; atajos de vencimiento. | Buen flujo diario. Explicar qué reserva y qué dinero registra; diferenciarlo del contrato de apartado. |
| Visita | Cliente, fecha, hora y notas. | Precargar lote/proyecto y conservarlos; usar cliente existente o alta rápida. |
| Cotizador de lote | Precio financiado, enganche, tasa anual en porcentaje y plazo. | Los cuatro campos son comprensibles, pero el resultado debe corresponder al plan aprobado que luego usa el contrato. |
| Contrato | Identificación, proyecto, lote, cliente, tipo, fechas, vendedor, notas, monto, enganche, plazo, tasa/variables de fórmula, método del enganche y documentos. | La prueba encontró 15 controles nativos visibles para la configuración simulada, antes de adjuntos. El número cambia con tipo/variables/documentos; no son todos obligatorios. Separar identidad, condiciones y revisión; mostrar resumen fijo cliente/lote/mensualidad. |
| Cobro general | Cliente, contrato/lote, cuota, modalidad completa/parcial/varias, importe, fecha y comprobante. | Contexto desde la fila reduce selecciones. Selectores dependientes sin búsqueda pueden escalar mal. No ocultar reparto ni convertir todo en “pagado” de un clic. |
| Documento | Archivo, nombre, categoría, vínculo, carpeta y notas; entidad según vínculo. | Abrir desde cliente/contrato con vínculo precargado es más rápido y menos ambiguo que desde Documentos. |
| Edición de lote | Identificación, estado, medidas, orientación, dos precios, vendedor y especificaciones; plano compartido. | Distinguir datos del lote de datos del proyecto y de la venta. “Guardar” en este editor guarda borrador local; indicar qué falta para persistir/publicar. |
| Importación | Proyecto, archivo, modalidad de validación y posible actualización; preview/resultados. | Preservar simulación y conteos. Tiempo variable por errores y volumen; no dar tiempo fijo para miles de registros. |

## Hallazgos prioritarios

P0 = corregir o verificar antes de confiar en el resultado operativo; P1 = fricción frecuente; P2 = claridad/configuración. Se diferencia riesgo de código de fallo confirmado en navegador.

| Prioridad | Evidencia | Impacto | Recomendación |
|---|---|---|---|
| P0 | Cotizador de Fraccionamientos usa `calcMonthly`/`generateAmort` locales; contrato usa fórmula activa y también muestra `(monto − enganche) / meses` como cuota estimada. | Pueden aparecer tres referencias distintas de mensualidad según plan; el asesor debe explicar/recalcular. No se verificó un contrato real. | Unificar fuente del plan aprobado y etiquetar claramente simulación frente a condición registrada. No decidir nuevo esquema financiero; probar paridad con inputs idénticos. |
| P0 | Nuevo contrato sin contexto usa `clients[0]`. Confirmado: abrió con “Cliente 01” ya seleccionado. | Puede asignarse una venta a alguien que el usuario no eligió. | Cliente vacío si no hay contexto explícito; precargar solo cuando proviene de ficha y mostrarlo en resumen de revisión. |
| P0 | `quickPay` y `collectOnContract` envían `payment_method: "transfer"` sin selector en esos cobros. | Un registro de efectivo/tarjeta podría quedar como transferencia si el flujo admite esos casos. | Alinear métodos permitidos con producto/backend; solicitar o mostrar explícitamente el método. No afirmar compatibilidad con otros métodos sin contrato. |
| P0 | Adjuntar comprobante es posterior al cobro; un fallo produce aviso, seguido de toast de éxito genérico. | Puede parecer completa la operación aunque falte evidencia; repetir cobro sería un riesgo. | Resultado persistente “Cobro registrado; comprobante pendiente” y reintentar solo adjunto. Preservar el cobro ya realizado. |
| P1 | Repositorio de contratos tiene paginación local de diez, sin buscador; su guía indica que existe uno. Confirmado cero inputs en esa tarjeta. | Buscar por cliente/número exige revisar páginas; guía aumenta confusión. | Búsqueda/filtros en servidor y total real; corregir guía; filtro por proyecto, cliente y estado. |
| P1 | Búsqueda global de contrato navega a `/contratos` sin seleccionar/abrir ese contrato; lote/pago/documento también requieren revisar su destino concreto. | El usuario encuentra un resultado y tiene que buscarlo otra vez. | Deep links a registro identificado, sin saltarse permisos; restaurar lista/filtros al volver. |
| P0 | En Clientes, el detalle prioriza `selectedClientId` incluso si el registro queda fuera del filtro. Confirmado: buscar Cliente 30 después de seleccionar Cliente 01 deja una fila del 30 y ficha/acciones del 01. | Riesgo de operar sobre una persona distinta de la encontrada. | Actualizar selección o dejar aviso explícito del contexto fijado; nunca operar silenciosamente sobre alguien fuera del resultado. |
| P1 | Búsqueda local de Clientes usa nombre/email, no teléfono; Reportes y búsqueda global sí incluyen teléfono. | Mismo dato encuentra a la persona en una pantalla y no en otra. | Contrato consistente de búsqueda nombre/email/teléfono y descripción visible. |
| P1 | Contexto carga clientes 100, proyectos 50, contratos 100, pagos 200 y documentos 100; búsquedas locales solo recorren lo cargado. Pagos sí muestra aviso de cobertura parcial. | “No existe” puede significar “no está en esta tanda”; subir topes no resuelve escala. | Listas paginadas en servidor y búsqueda global completa; conservar aviso de cobertura donde corresponda y no usar muestra para totales. |
| P1 | Clientes consulta asignaciones de apps por cada cliente (N peticiones) y condiciona el estado de asignaciones al conjunto. | Con carteras grandes, más espera y fragilidad de carga. No hay latencia real medida. | Evaluar endpoint/batch de asignaciones y estados parciales; medir requests y tiempos antes de prometer mejora. |
| P1 | Contrato muestra falta de calculadora activa y “Crear calculadora” resetea borrador y sale del modal. | El administrador puede perder campos; asesor depende de configuración de otro usuario. | Preflight antes de llenar y retorno con borrador preservado; asesor recibe dependencia accionable. |
| P1 | Repositorio de contratos no usa `contractsLoading` ni un error de consulta dedicado; bandeja pendiente retorna null si no hay items, también durante carga/fallo. | Vacío aparente puede confundirse con ausencia de registros/aprobaciones. | Loading, error y retry explícitos; distinguir cero resultados de fallo. |
| P1 | Apartado desde lote actualiza estado/vencimiento/cliente/monto; apartado desde contrato usa otro flujo con fechas y financiación. | Dos botones parecidos pueden tener consecuencias diferentes. | Explicar efectos y destino de cada registro; validar continuidad entre reserva y venta con backend/producto. No fusionar sin conocer reglas. |
| P1 | Ventana de contrato en 390 × 844 muestra parte de datos iniciales; condiciones financieras quedan más abajo. | Registrar puede estar visible antes de revisar monto, plazo y mensualidad. | Resumen final con cliente, lote, plan, importe y fechas; scroll interno y foco en errores. |
| P1 | En la captura móvil del directorio, el nombre seleccionado se parte en varias líneas y las acciones ocupan espacio sobre los datos de contacto. | Más difícil comprobar rápidamente nombre y medios de contacto antes de actuar. | Nombre completo y contacto en filas legibles; acciones en carril separado y controles de llamada/correo solo con datos disponibles. |
| P1 | El cotizador pide tasa en porcentaje; edición/tipos sin calculadora usan decimal 0–1, y variables de fórmula se presentan por nombre técnico. | Hay que traducir unidades o entender identificadores para registrar condiciones. | Etiquetas legibles, unidad visible y una sola convención visual; convertir en el adaptador según contrato. No cambiar valores financieros por defecto sin aprobación. |
| P1 | Editor de Carga de Lotes permite “Guardar” que actualiza `draftProject`; persistir proyecto es otra acción. El borrador usa `lm_draft_project` sin organización en su clave. | Guardar borrador puede interpretarse como backend; al cambiar organización debe verificarse que no se retome contexto ajeno. | Etiquetas “Guardar en borrador / Guardar proyecto”, estado pendiente; aislar borrador por organización. Es riesgo de contexto a verificar, no fuga de API demostrada. |
| P2 | Navegación usa “Lotes” en metadatos y “Carga de Lotes” en sidebar; ventas/contratos comparten ruta/componente. Guía del cotizador menciona francesa/alemana aunque el modal mostrado no ofrece selector de método. | Más vocabulario y expectativas que funcionalidades visibles. | Nombres orientados a tarea y guías exactas; no añadir métodos no aprobados para cumplir el texto. |
| P2 | Algunos overlays de cobro/devolución/cotizador son backdrops manuales; Documentos inyecta reglas globales `.modal-overlay/.modal-box` con z-index 9000. | Comportamiento puede variar por pantalla y stacking context. No se demostró ocultamiento en este recorrido. | Migrar esos overlays al portal compartido y estilos scoped; verificar móvil, teclado y scroll. No resolver subiendo z-index. |

## Qué conviene conservar

- Ficha de lote con precio, disponibilidad y acciones cercanas; panel de detalle portaleado.
- Apartado con cliente buscable/alta rápida, fechas rápidas y archivos opcionales.
- Formulario de cliente compartido entre ficha y alta rápida: mismas validaciones y detección de duplicados.
- Track con búsqueda en servidor, filtros, paginación, historial y archivados; mantener contraste claro entre loading y refetch.
- Contrato con selectores de lote/cliente buscables, errores por campo y snapshot de fórmula.
- Cobro con saldo pendiente, parcial/varias cuotas y preview del reparto; no volver a pedir número de cuota a ciegas.
- Consultas específicas de contratos/pagos por cliente y cuotas por contrato: evitan depender de la muestra global para esos recorridos.
- KPIs/alertas de Pagos agregados en servidor y aviso de muestra incompleta.
- Migración en fases con conteos, simulación y avance por organización; no sacrificar conciliación por menos clics.

## Experiencia diaria propuesta

Para el asesor: buscar proyecto/lote → disponibilidad y plan → cliente → apartado o visita → contrato, conservando identificadores y condiciones. El teléfono y las acciones de seguimiento deben ser accesibles desde la ficha, con opciones habilitadas según permisos.

Para administrador: ver pendientes de aprobación, discrepancias de inventario y devoluciones; abrir el expediente exacto; revisar condiciones; confirmar resultado. Configurar planes, importar y mantener datos técnicos quedan como tareas especializadas.

Para cobranza: localizar cliente/contrato → saldo y próximas cuotas → capturar monto recibido/método/fecha → revisar reparto → registrar y adjuntar evidencia. Si falla el adjunto, recuperar la evidencia sin repetir el cobro.

La revisión de dinero, cancelación y permisos debe ser breve y contextual. Reducir tiempo de búsqueda tiene más valor que eliminar una confirmación necesaria. No se proponen fórmulas financieras, penalizaciones, impuestos o políticas de reembolso nuevas.

## Plan para medir promedio real

1. Prueba exploratoria con 6–9 participantes repartidos entre administración, asesores y cobranza; reportar por rol, experiencia y dispositivo. Muestra exploratoria, no promedio poblacional.
2. Escenarios controlados con carteras pequeñas y otras que superen topes actuales: >100 clientes/contratos/documentos, >200 pagos y varios proyectos. Incluir homónimos, correo compartido/conflictivo, faltas de datos, archivados y contrato en aprobación.
3. Objetivos sin instrucciones de botones: encontrar lote/precio, localizar cliente por teléfono, apartar, visitar, contratar con plan existente, cobrar parcial/varias cuotas, adjuntar evidencia y descargar estado de cuenta. Configuración/importación se mide aparte.
4. Inicio: lectura de tarea. Fin: dato correcto encontrado o registro correcto persistido tras recargar. Registrar ayuda, abandono, reintentos, errores, selección de persona/lote/proyecto y desplazamiento. No registrar PII en telemetría.
5. Reportar mediana, media de completados y tasa de éxito. Percentil 90 cuando haya suficientes observaciones. Fallos y tiempos de recuperación por separado; no excluirlos para presentar un sistema artificialmente rápido.
6. Separar espera de red, procesamiento de importaciones/PDF y transferencia de archivos del esfuerzo humano. Repetir tareas con orden alternado para distinguir aprendizaje de mejora.

Objetivos iniciales a validar: consultas habituales 15–30 segundos; altas simples y apartados alrededor de un minuto; contrato con plan existente 2–4 minutos en escritorio; cobro contextual 30–60 segundos. Éxito sin ayuda ≥90% primer uso y ≥95% uso habitual; cero registros en persona/lote/organización equivocados. Son metas propuestas, no resultados alcanzados.

## Verificaciones de aceptación antes de implementar mejoras

- Mismo precio, enganche, tasa y plazo: cotización y contrato deben mostrar el resultado correspondiente al mismo plan aprobado; distinguir estimaciones y snapshot.
- Alta general sin cliente elegido; alta desde ficha con cliente correcto y resumen antes de guardar.
- Buscar otro cliente después de seleccionar uno: ficha y acciones deben tener contexto inequívoco.
- Buscar contrato fuera de la primera tanda y abrir resultado global directamente; mantener filtros al volver/recargar.
- Método y fecha de cobro visibles; parcial/varias con reparto validado; fallo de adjunto recuperable sin doble cobro.
- Carga, error y retry de contratos, pendientes, lote disponible y calculadora activa; no convertir error en “sin registros”.
- Guardar borrador frente a persistir proyecto; cambiar organización; comprobar archivos y progreso aislados por organización.
- Móvil 360/390/430 px: controles, resumen, footer, teclado, scroll interno y accesibilidad de búsquedas; no asumir que screenshot sin overflow significa formulario intuitivo.
- Permisos por rol y organización en lectura y escritura, más backend; los atajos no deben cambiar quién puede actuar.

## Fuentes

- `src/routes/AppRouter.jsx`, `src/routes/navigation.js`, `src/layouts/AppShell.jsx`: rutas y shell.
- `src/pages/Fracs/index.jsx`, `src/pages/Fracs/MatrixSheet.jsx`: inventario, cotizador, apartado y visita.
- `src/pages/Lots/index.jsx`, `MigrationWizard.jsx`, `parseSheet.js`: borrador e importación.
- `src/pages/LotTrack/index.jsx`: búsqueda, filtros e historial.
- `src/pages/Clients/index.jsx`, `src/components/shared/ClientForm.jsx`, `ClientPicker.jsx`: cartera y alta.
- `src/pages/Sales/index.jsx`, `PendingApproval.jsx`, `ReleasesTable.jsx`, `src/components/shared/ContractModal.jsx`: contratos/aprobaciones/devoluciones.
- `src/pages/Payments/index.jsx`, `src/context/AppContext.jsx`: cobros, selectores, cobertura y payloads.
- `src/pages/Documents/index.jsx`, `src/pages/Reports/index.jsx`, `src/components/shared/DocumentModal.jsx`, `InlineDocumentsPanel.jsx`, `src/components/ui/GlobalSearchModal.jsx`: documentos y búsqueda.
- `src/pages/Calculator/index.jsx`, servicios de contrato/pago/lote/cliente/calculadora: configuración y contratos de llamada frontend.
- README del workspace y documentos 18/20 del vault: alcance y clasificación de implementación; no equivalen a certificación productiva.

Esta entrega agrega análisis y evidencia simulada. No cambia aplicación, endpoints ni base de datos. No se ejecutó una nueva suite de regresión porque no se modificó código del producto; la exploración visual se describe con sus límites.
