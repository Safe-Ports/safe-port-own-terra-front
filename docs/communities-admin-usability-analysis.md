# Comunidades: intuición y tiempo de uso del administrador

Fecha: 10 de octubre de 2026. Frontend: `feature/properties-condos-mvp`.

## Dictamen

La vista ofrece una base útil: comunidad, directorio, unidades y operación diaria tienen espacios identificables; buscar contactos, filtrar unidades y agregar una persona directamente a una unidad evita pasos innecesarios. Sin embargo, todavía requiere aprender cómo está organizado el sistema. Para uso cotidiano, el principal costo es encontrar el contexto correcto y recuperarlo después de navegar, más que escribir datos.

Antes de optimizar segundos, deben corregirse los flujos que pierden la comunidad seleccionada o aceptan datos que no corresponden al registro enviado. Un formulario corto que falla o guarda otra persona no es práctico. La prioridad es conseguir una operación correcta al primer intento y después reducir búsqueda, desplazamiento y decisiones.

No se asigna una calificación numérica de “intuición”: no hubo prueba con administradores reales. Los tiempos de este informe son **estimaciones de una revisión experta**, no promedios medidos, tiempos de Playwright ni rendimiento demostrado del backend.

## Alcance y evidencia

Se revisó `/properties/comunidades` para el administrador, sus formularios y las tareas de operación diaria accesibles desde esa vista: cargos, cuotas, comunicados, amenidades e invitación al portal. No incluye caseta/QR, proveedores, mantenimiento, experiencia del residente ni una auditoría completa de permisos del backend.

Se contrastaron los componentes con el adaptador de persistencia de `PropertiesDataContext`. Se realizó una exploración de navegador en local con datos simulados: dos comunidades, 30 unidades por comunidad y 60 personas. Las lecturas fueron interceptadas y las escrituras bloqueadas; no se crearon registros reales ni se probaron mutaciones contra dev. La comprobación demuestra navegación, controles y geometría; los defectos de payload se identificaron en código, no mediante escrituras reales.

Evidencia conservada:

- [Inventario de controles y navegación](communities-usability/communities-usability-evidence.json).
- [Vista móvil, 390 × 844](communities-usability/communities-admin-mobile.png).
- [Formulario de persona vinculada a unidad](communities-usability/communities-admin-member-form.png).

## Estimaciones por tarea

Supuestos: usuario que conoce la comunidad y tiene los datos a mano; sesión iniciada; respuesta de cada petición de hasta aproximadamente dos segundos; sin interrupciones. El cronómetro conceptual comienza con la comunidad abierta y termina con información correcta localizada o confirmación del registro. No incluye reunir datos fuera del sistema, escribir el contenido de un comunicado desde cero, subir fotos, activación del destinatario ni corregir configuraciones faltantes.

Los rangos consideran lectura, decisiones, escritura, navegación y revisión. Un administrador nuevo puede tardar más; no hay datos suficientes para aplicar un multiplicador universal. La columna objetivo propone criterios de diseño que deberán validarse, no mejoras ya entregadas.

| Tarea | Estimación actual, escritorio | Estimación actual, celular | Objetivo propuesto | Condición / resultado esperado |
|---|---:|---:|---|---|
| Encontrar unidad, responsable y saldo | 20–60 s | 40–90 s | 10–20 s escritorio; 15–30 s celular | Leer la ficha de la unidad correcta, sin entrar a un formulario. |
| Buscar teléfono/correo de una persona | 15–45 s | 25–60 s | 10–20 s escritorio; 15–30 s celular | Directorio, búsqueda y lectura/copia del contacto. |
| Crear persona y vincularla a una unidad | 1–2.5 min | 1.5–3 min | 45–75 s escritorio; 60–90 s celular | Datos listos; incluye rol y revisión de permisos, sin invitación. |
| Vincular una persona existente | 40–90 s | 60–120 s | 20–40 s escritorio; 30–60 s celular | La persona ya existe en la organización. |
| Llenar el contacto ampliado | 1.5–3 min | 2–4 min | Alta básica ≤60 s; extras separados | Tiempo de llenado, **no registro completo confiable**: hay campos que no se envían. |
| Invitar al portal desde una persona localizada | 30–75 s | 45–90 s | 30–60 s con resultado explícito | Correo disponible; crear/copiar invitación. Otorgar acceso es una acción distinta si corresponde. |
| Crear cargo individual válido | 45–90 s | 60–120 s | 30–45 s escritorio; 45–60 s celular | Unidad con vínculo; incluye concepto, importe y vencimiento. “Toda la comunidad” no completa este flujo. |
| Registrar pago del saldo completo | 10–20 s | 15–30 s | 30–60 s con revisión segura | Estimación del camino de un clic actual; **no se recomienda conservarlo sin revisión**. |
| Generar periodo de un plan de cuotas existente | 45–90 s | 60–120 s | 30–60 s más revisión proporcional al resultado | Incluye simular, leer resumen y confirmar; no corregir unidades sin responsable. |
| Crear plan de cuotas | 1.5–3 min | 2–4 min | 1–2 min con reglas ya decididas | Siete controles base y uno condicional; no incluye decidir reglas contables. |
| Publicar comunicado con texto preparado | 45–90 s | 60–120 s | 30–60 s más revisión de audiencia | Debe distinguir claramente publicar de guardar borrador. |
| Crear primera comunidad con inmueble | 3–5 min | 4–7 min | 2–4 min escritorio; 3–5 min celular | Asistente inicial; sin fotos ni recopilación externa. |
| Crear otra comunidad con inmueble disponible | 1–2 min | 1.5–3 min | 60–90 s | Si no hay inmueble elegible, el flujo actual queda bloqueado y requiere otra pantalla. |
| Editar datos generales de comunidad | 1–2 min | 2–3 min | 45–90 s | Sin ficha técnica, amenidades ni fotos. |
| Cambiar responsable de pago | 2–4 min | 3–5 min | 60–90 s con revisión del cambio | Estimación del recorrido manual; requiere validar historial y consecuencias antes de simplificarlo. |
| Reservar amenidad | No estimable como operación correcta | No estimable como operación correcta | Hipótesis: 45–75 s escritorio; 60–90 s celular | Primero resolver selección y envío de persona/unidad. |

No conviene sumar todos los renglones: unos corresponden al alta inicial y otros al trabajo recurrente. Tampoco conviene calcular un “promedio global” sin conocer cuántas veces ocurre cada tarea. Para obtener tiempo diario: `Σ(frecuencia diaria de tarea × tiempo medido de tarea)`, incluyendo reintentos e interrupciones según el objetivo del estudio.

## Hallazgos y prioridad

P0: corregir antes de considerar confiable la operación. P1: fricción frecuente. P2: mejora de claridad/configuración. Estas prioridades son de este análisis; no sustituyen decisiones pendientes de producto.

| Prioridad | Hallazgo verificable | Efecto cotidiano | Cambio recomendado |
|---|---|---|---|
| P0 | “Operación diaria” no incluye la comunidad en la URL. En la prueba, salir de Comunidad 2 abrió Comunidad 1. Cambiar módulo también elimina `community`; recargar vuelve a la primera. | El administrador puede operar en la comunidad incorrecta o volver a seleccionarla repetidamente. | Conservar comunidad, módulo y unidad en URL; mostrar comunidad junto a cada acción; mantener contexto al volver y recargar. |
| P0 | El formulario de contacto tiene nueve controles; tipo de persona, preferencia de comunicación y los dos campos de emergencia no se envían. Notas se envía como `direccion`. | Se dedica tiempo a información que no queda respaldada por ese contrato; puede generarse confianza falsa en un contacto de emergencia. | Alinear campos con contrato aprobado; ocultar/diferir los no soportados. Separar notas de dirección. Verificar recarga posterior. |
| P0 | Cargo ofrece “Toda la comunidad”, pero el adaptador exige unidad y persona vinculada. Además, si no encuentra responsable de pago, usa otro vínculo de la unidad. | Error después de llenar o atribución que no coincide con lo esperado. | Exigir unidad explícita para cargo individual y revisar responsable; cargo colectivo mediante plan y simulación. Resolver la regla de ausencia de responsable con producto/backend. |
| P0 | Reservación pide nombre libre; el adaptador lo ignora, no recibe `unitId` del formulario y puede tomar el primer vínculo del conjunto. | No permite asegurar a quién ni a qué unidad se registra la reserva. | Elegir persona/unidad válidas de la comunidad y enviarlas explícitamente; no recurrir al primer vínculo como sustituto. Validar duración aprobada. |
| P0 | “Registrar pago” liquida el saldo completo directamente. “Cancelar registro” llama una función presente en modo demo, ausente en el contexto persistido. | Registro financiero difícil de revisar; cancelación ofrecida sin implementación correspondiente. | Revisar persona, unidad e importe antes de confirmar; retirar/deshabilitar cancelación hasta contar con contrato real aprobado. No inventar reversión contable. |
| P1 | En celular, con 30 unidades, la matriz ocupa unos 1,855 px y la ficha seleccionada empieza cerca de y=3,304 px desde el inicio. | Varias pantallas de desplazamiento para consultar una ficha; alto costo repetido. | Abrir ficha al elegir unidad, en ruta o panel accesible; resumen y acciones primero; búsqueda siempre visible. |
| P1 | Selector de persona existente sin búsqueda: en la prueba ofrece 59 candidatos de la organización más el placeholder. | Lectura lenta y riesgo de elegir homónimos. | Combobox por nombre/correo/teléfono; priorizar coincidencias de comunidad y permitir buscar en organización con distinción explícita. |
| P1 | Alta de persona vinculada presenta 14 controles nativos en modo nuevo y 12 en existente, contando radios/checks; no son 14 campos obligatorios. | Muchas decisiones aparentes para una tarea habitual; permisos importantes quedan bajo el primer tramo visible. | Mostrar datos básicos y rol primero; resumen visible de permisos derivados y sección avanzada para modificarlos. Mantener revisión consciente del responsable de pago. |
| P1 | Una comunidad se considera preparada si hay alguna unidad y algún vínculo activo. | Puede parecer lista aunque varias unidades no tengan responsable definido. | Mostrar cobertura: unidades con responsable / total, y lista accionable de pendientes; confirmar qué roles exige producto. |
| P1 | Alta inicial usa asistente de tres pasos; alta posterior exige inmueble existente sin opción de crearlo allí. En la prueba, selector sin inmueble elegible. | El usuario abandona el alta sin saber dónde resolver la dependencia. | Entrada consistente “usar inmueble / crear inmueble”, o salida guiada que preserve borrador y retorne al alta. |
| P1 | Cambiar módulo limpia el borrador sin aviso. Comunicado crea y publica en una misma acción, con feedback genérico. | Trabajo perdido o publicación que se interpreta como simple guardado. | Avisar solo cuando haya cambios; etiqueta explícita “Publicar comunicado” y resultado con audiencia. Preview antes de publicación cuando corresponda. |
| P2 | Acciones de directorio dependen de iconos; invitación y otorgamiento de acceso son distintos. | El administrador nuevo no anticipa el efecto del botón de llave. | Acción principal con texto y estado: pendiente, invitado, acceso otorgado; no presentar invitación como acceso completo. |
| P2 | Ficha técnica, fotos y atributos compiten con datos necesarios para operar. | Formularios extensos durante tareas simples. | Separar alta básica, edición operativa y ficha avanzada; extras opcionales fuera del camino frecuente. |

## Qué conservar

- Alta de persona y vínculo en un solo formulario: evita crear contacto, salir y volver a buscarlo.
- Búsqueda de directorio por nombre/correo/teléfono/rol y paginación de diez elementos.
- Filtro de unidades: en la prueba, buscar `230` redujo la matriz a una fila y la ficha mostrada correspondió a esa unidad. No se detectó desajuste en ese recorrido.
- Simulación de cuotas antes de confirmar: reducir clics no justifica eliminar esta revisión.
- Valores iniciales, estados vacíos, modales con scroll interno y errores visibles. La presentación móvil debe aprovecharlos sin esconder las decisiones importantes.

## Propuesta de experiencia diaria

Al entrar, el administrador debería reconocer la comunidad actual, buscar unidad/persona y ver pendientes útiles. Desde la unidad: leer responsable/contacto/saldo y ejecutar “Agregar persona”, “Ver cargos” o “Invitar al portal” sin volver a seleccionar comunidad. La configuración general y la ficha técnica quedan disponibles, pero no dominan este recorrido.

La información esencial del alta de contacto es nombre y los medios de contacto necesarios para la tarea; email si se invita al portal. Rol y unidad son esenciales cuando se crea el vínculo. Campos opcionales solo deben pedir tiempo si se conservan y tienen un uso claro. El backend debe validar las mismas restricciones; ocultar un control no sustituye autorización.

En acciones de dinero, permisos, publicación o cambio de responsable, la meta es una confirmación breve con contexto correcto. No convertir todas las acciones en confirmaciones largas ni buscar siempre un único clic.

## Cómo obtener el promedio real

1. Prueba exploratoria con 5–8 administradores representativos. Sirve para descubrir problemas, no para afirmar un promedio poblacional. Incluir administradores nuevos y habituales; medir cada grupo por separado.
2. Datos controlados de comunidades pequeñas y grandes: por ejemplo 20 y 100 unidades, homónimos, personas sin email, unidades sin responsable y registros archivados. Probar escritorio y celular con orden alternado para reducir aprendizaje.
3. Dar objetivos, no instrucciones de botones: “encuentra al responsable del departamento 230”, “vincula a esta persona”, “genera un cargo individual”, “publica este aviso preparado”. Separar alta inicial y operación recurrente.
4. Medir desde que lee la tarea hasta encontrar la información correcta o confirmar persistencia tras recargar. Registrar éxito, abandono, ayuda, errores, reintentos, comunidad/persona usada y número de desplazamientos. No anotar PII en telemetría.
5. Reportar mediana, media de completados, rango y proporción de éxito; con más observaciones, percentil 90. Mostrar fallos por separado para que tareas imposibles no hagan parecer rápido al sistema. Medir latencia de API separadamente.
6. Objetivos iniciales propuestos: ≥90% de éxito sin ayuda en primer uso y ≥95% en uso habitual; cero operaciones en comunidad/persona equivocada; tareas frecuentes dentro de los objetivos de la tabla. Validarlos con producto y ajustar según los datos.

Antes/después debe usar las mismas tareas y tamaños, registrando primer intento y repetición por separado. Las múltiples lecturas de relaciones/personas y medios también merecen medición con API real; los mocks de esta exploración no permiten concluir tiempos de red.

## Verificación posterior necesaria

- Comunidad 2 → operación → cambiar módulo → recargar → volver: conservar comunidad y unidad cuando aplique.
- Cada campo ofrecido: guardar, recargar y comprobar correspondencia semántica; no basta un toast de éxito.
- Cargo sin responsable: impedir atribución implícita y explicar cómo resolverlo; colectivo: simular antes de generar.
- Reserva: persona y unidad correctas de la comunidad seleccionada; sin sustitución por primer vínculo.
- Pago/cancelación: revisión y contrato implementado, permisos correctos y resultado actualizado.
- Celular: búsqueda y ficha accesibles sin atravesar toda la matriz; combobox usable con teclado.
- Cambio de responsable: conservar historial y validar consecuencias; probar los estados aprobados antes de proponer un endpoint nuevo.

## Fuentes de implementación

- `src/apps/properties/features/community/CommunityWorkspace.jsx`: navegación, formularios, readiness y borradores.
- `src/apps/properties/features/community/CommunityOnboarding.jsx`: alta inicial.
- `src/apps/properties/features/monitoring/UnitMonitorPanel.jsx`: matriz y detalle de unidad.
- `src/apps/properties/features/condo/CondoOperationsSuite.jsx`: módulos, cargos, pagos, reservas y comunicados.
- `src/apps/properties/features/condo/QuotaPlansPanel.jsx`: planes y simulación de periodos.
- `src/apps/properties/features/portal/PortalAccessModal.jsx`: invitación/acceso.
- `src/apps/properties/data/PropertiesDataContext.jsx`: payloads y diferencias entre demo/persistencia.

Se consultaron las fuentes canónicas de producto del workspace y la estrategia de reutilización frontend. Las reglas todavía abiertas de contabilidad, permisos e historial deben resolverse allí; este análisis no las decide.

Esta entrega agrega documentación y evidencia simulada. No modifica pantallas, endpoints ni base de datos. No se ejecutó una nueva suite de tests porque no hubo cambio de aplicación; la exploración read-only del navegador completó los recorridos descritos.
