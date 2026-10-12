# Formularios del ecosistema — captura y recuperación

Fecha: 11 de octubre de 2026. Repositorio: `safe-port-own-terra-front`. Rama: `feature/properties-condos-mvp`.

Se integró el comportamiento compartido en 69 declaraciones de formulario JSX. El inventario estático contempla 61 archivos con controles o formularios; incluye buscadores y piezas reutilizables, por lo que no equivale a 61 pantallas ni a 69 formularios distintos disponibles para cada rol. El detalle reproducible está en [inventory.json](ecosystem-forms/inventory.json).

| Área | Capturas cubiertas | Cambios relevantes |
| --- | --- | --- |
| Acceso compartido | Inicio de sesión, registro, recuperación y cambio de contraseña, perfil | Envío con teclado, bloqueo mientras guarda, conservación de datos y validación; se mantiene la sesión única de Core. |
| Core | Clientes, colaboradores/equipo, proveedores, agenda, documentos y constructor de formularios públicos | Formularios nativos con acciones explícitas, etiquetas asociadas, errores visibles, modales en portal y confirmaciones dentro de la aplicación. Eliminar un evento cierra la captura después del éxito. Crear/renombrar carpetas conserva el texto ante un fallo. |
| Formularios públicos | Carga del enlace y envío de respuestas | Diferencia entre enlace inexistente y fallo recuperable de conexión; reintento de carga, foco en el primer campo obligatorio y respuestas conservadas tras un error. Los campos nuevos usan identificadores únicos. Reintentar publicación reutiliza el borrador ya creado. |
| Lands | Clientes, contratos, documentos, lotes, calculadora, apartados, citas, pagos, ingresos, egresos y devoluciones | Selección remota de clientes/contratos, validación de vínculos y cantidades, fórmula comprobada antes de guardar, captura con Enter y errores recuperables. Editar un lote dice «Aplicar al borrador», distinguiendo esa acción del guardado definitivo del proyecto. |
| Captura financiera existente | Cobros, abonos, ingresos, egresos, devoluciones y operaciones de Properties | Métodos y fechas explícitos; guardas de doble envío; reintento del comprobante separado del registro financiero. El comprobante elegido al editar un egreso también se sube. |
| Properties | Propietarios, inmuebles, unidades, comunidad/directorio, operación condominal, rentas, hospitalidad, listados, accesos, proveedores y tickets | Se conserva cada validación de negocio y se incorpora el envío protegido. El alta guiada completa la unidad antes de crear la comunidad y recuerda los pasos exitosos para reintentar sin duplicarlos. |
| Portales | Inscripción de proveedores, invitaciones/accesos, solicitudes y capturas disponibles para comunidad, residentes y proveedores | Misma infraestructura de envío y recuperación; invitaciones validan correo, solicitudes conservan contexto y se mantienen los permisos existentes. |

## Comportamiento compartido

`WorkflowForm` conserva los contratos de cada pantalla. Si la pantalla declara `noValidate`, delega a su validación existente; en el resto valida los controles nativos y el texto obligatorio compuesto únicamente por espacios. Los errores de campo permiten enfocar el control correspondiente. Los fallos asíncronos no vacían la captura.

El bloqueo usa una referencia síncrona durante una promesa y admite `busy` para mutaciones externas. Los formularios abiertos en un portal detienen la propagación del envío: crear un contacto dentro de otro flujo no envía el formulario que lo abrió. El modal compartido bloquea Escape, cierre y acciones del pie mientras su formulario está guardando.

Los diálogos se renderizan en `document.body`, con foco contenido y restaurado al cerrar. Los avisos flotantes de error también usan portal. Los formularios móviles mantienen texto de 16 px y controles accesibles; el alta de proveedores conserva encabezado y acciones mientras su cuerpo desplaza. Se corrigió el contraste del botón después de mover el formulario al portal.

## Verificación

- `npm test`: 338 pruebas aprobadas, 64 archivos.
- `npm run build`: aprobado. Sigue el aviso existente de bundles grandes.
- Corrida integral de Playwright: 334 pruebas aprobadas en Chromium y proyectos Android/iOS. Incluye autorización del frontend, Properties y los flujos de Lands.
- Los ajustes finales de formularios/acceso se comprobaron con pruebas enfocadas. La prueba de recuperación de publicación espera el error del servidor antes de reintentar; también se repite para comprobar su estabilidad.
- `git diff --check`: sin errores.
- Las pruebas de navegador interceptan las solicitudes API. No se efectuaron altas, pagos ni eliminaciones en bases de datos compartidas.

Se añadieron pruebas para validación y doble envío, recuperación de errores, formularios anidados en portales, bloqueo de cierre mientras guarda, confirmaciones, elección de archivos con teclado, alta guiada por pasos y reintento de publicación. Los nuevos E2E comprueban alta de proveedor tras fallo, carga/envío público recuperables, enlace inexistente, fórmula inválida, búsqueda de contrato fuera de los primeros cien y reutilización del borrador.

## Alcance de la comprobación

Esta entrega mejora y comprueba el frontend. Las pruebas con mocks no certifican persistencia real, entrega de correos, cobros reales, funcionamiento físico de QR ni aislamiento de datos del servidor. Los módulos que el producto mantiene como prototipo conservan esa condición; no se agregaron endpoints ni reglas contables, legales o de mantenimiento.

No existe una aplicación independiente de Finance implementada en las rutas de esta rama. Se incluyeron los formularios financieros presentes en Lands y Properties. Las operaciones que dependen de servicios todavía pendientes requieren sus contratos y validación contra el backend antes de presentarse como completas en producción.

El bloqueo frontend evita envíos simultáneos; no sustituye la idempotencia del backend ante una respuesta perdida ni la atomicidad de operaciones que escriben varios recursos. La recuperación de pasos ya confirmados permanece durante la captura actual, no después de cerrar el navegador.

## Evidencia visual

- [Proveedor: error y captura conservada en móvil](ecosystem-forms/core-provider-retry-mobile.png).
- [Formulario público: obligatorios en móvil](ecosystem-forms/public-form-validation-mobile.png).
- [Documento vinculado a contrato en escritorio](ecosystem-forms/document-contract-desktop.png).

Revisión local: `http://localhost:5173`. No se publicaron cambios ni se creó un commit.
