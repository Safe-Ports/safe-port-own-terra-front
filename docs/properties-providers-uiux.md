# Red de proveedores — ajustes de frontend

9 de octubre de 2026 · `feature/properties-condos-mvp` · `/properties/responsables` y `/servicio/registro?token=…`.

## 1. Veredicto

La integración existía, pero la carga de contactos, los errores ocultos y el desmontaje durante actualizaciones impedían revisar el flujo con confianza. Esta entrega corrige esos puntos y adapta la interfaz a la etapa de proveedores que backend reportó disponible en dev.

## 2. Hallazgos

| # | Severidad | Qué pasa | Dónde | Por qué importa |
|---|---|---|---|---|
| 1 | Rompe en móvil | Actualizar los datos compartidos desmontaba la ruta durante una nueva carga operativa | PropertiesWorkspace | Se perdía el enlace recién generado y la captura local; también afecta escritorio |
| 2 | Accesibilidad | Etiquetas de especialidades anidadas dentro de otra etiqueta | Habilitación y registro público | El checkbox no tenía un nombre individual fiable |
| 3 | Accesibilidad | Validación de selección/consentimiento mediante toast o controles nativos | Formularios | No daba un error visible junto al campo |
| 4 | Se ve barato | El primer proveedor mostraba cero contactos sin consultarlos | Perfil | Una red existente parecía vacía |
| 5 | Se ve barato | Fallos de búsqueda y contactos se convertían en listas vacías | Core / perfil | El usuario no podía distinguir falta de registros de un error |
| 6 | Se ve barato | Cambiar la búsqueda conservaba la selección anterior de Core | Habilitación | Podía habilitarse un proveedor diferente al texto visible |
| 7 | Se ve barato | Enlace generado sólo disponible en portapapeles o toast | Inscripción | Perderlo obligaba a generar otro; el fallback manual era difícil de usar |
| 8 | Se ve barato | Consentimiento en 7 px con !important y chips apilados | Registro público | Las reglas antiguas vencían los estilos compartidos y dificultaban la lectura |
| 9 | Pulido | La aprobación remitía a Habilitar para crear un registro de Core; portal/órdenes parecían operativos | Revisión y textos | El recorrido conducía a una acción que ese formulario no realiza |

## 3. Parches

### Conservar la vista durante invalidaciones

`src/apps/properties/components/PropertiesWorkspace.jsx` conserva Outlet durante cargas posteriores a una primera carga correcta. La carga inicial y los fallos siguen teniendo sus estados explícitos.

```jsx
const initialized = useRef(false);
if (!propertiesLoading && !propertiesError) initialized.current = true;
if (!propertiesError && (!propertiesLoading || initialized.current)) return <Outlet />;
```

Impacta todas las vistas Properties dentro del workspace: evita desmontar formularios durante actualizaciones. No altera sesiones, organizaciones, endpoints ni cache keys.

### Especialidades accesibles

En los dos formularios el grupo usa fieldset/legend, y cada opción conserva su propia etiqueta.

```jsx
<fieldset className="service-specialty-field">
  <legend>Especialidades</legend>
  <div className="registration-specialties">{/* etiquetas con checkbox individual */}</div>
</fieldset>
```

### Validaciones y errores

Habilitación exige selección de Core; contacto valida nombre/correo; registro público valida nombre, representante para empresa, correo, teléfono y consentimiento. FieldError acompaña los campos inválidos; errores de API se normalizan con parseApiError y se muestran con InlineError. Un envío fallido conserva la captura. No se añadieron requisitos de RFC, documentos o especialidades obligatorias.

```jsx
if (!enableDraft.coreProviderId) {
  setFieldErrors({ coreProviderId: "Busca y selecciona un proveedor del catálogo de Core." });
  return;
}
```

### Contactos y búsquedas

El perfil carga sus contactos automáticamente. Los fallos se muestran con reintento. Un contador de solicitudes evita que respuestas antiguas reemplacen los resultados de una selección o búsqueda más reciente. Cambiar el texto de Core invalida la selección previa. Directorio añade búsqueda por nombre/categoría y respeta el filtro de tipo al seleccionar un perfil.

### Enlace público

El enlace generado queda en un campo de sólo lectura con Copiar y Abrir formulario. Si el portapapeles falla, el campo permite seleccionarlo y copiarlo manualmente. El token permanece en estado de la vista, sin guardarlo en localStorage. Al recargar se necesita el enlace guardado por el administrador o generar uno nuevo.

### Legibilidad del registro

Se eliminan las reglas !important del consentimiento; texto de consentimiento/etiquetas ≥12 px y tipos de proveedor ≥14 px. Los chips mantienen checkbox y texto en fila, con área de interacción de 44 px. Playwright comprueba estos tamaños, además de inputs ≥16 px.

### Solicitudes y alcance

La revisión muestra especialidades, representante, cobertura y experiencia recibidos. Aprobar vincula un proveedor existente de Core y ofrece acceso al catálogo en otra pestaña para registrarlo allí si falta. Suspender/rechazar/archivar siguen exigiendo motivo. El portal se identifica como preliminar; órdenes y QR figuran como siguiente etapa. El acuse público muestra folio y evita prometer acceso automático o notificaciones por un canal no comprobado.

Los estilos particulares están en service-network.css / service-access.css, bajo roots explícitos. Conservan controles móviles, scroll del diálogo y lectura de errores; no introducen reglas !important.

## 4. Contratos consumidos

Se conservan los servicios existentes, sin inventar endpoints. Los E2E interceptan las requests y comprueban los cuerpos importantes.

| Acción | Endpoint | Body |
|---|---|---|
| Buscar catálogo Core | GET /providers | Sin body; search/limit por query |
| Habilitar | POST /service-providers | core_provider_id, kind, description, declared_availability, specialty_ids |
| Crear persona del contacto | POST /personas | nombre, correo, telefono, direccion |
| Vincular contacto | POST /service-providers/{id}/contacts | persona_id, role, invitation_mode |
| Invitar | POST /service-provider-contacts/{id}/invite | Sin body |
| Generar enlace | POST /service-enrollment-links | {} |
| Consultar formulario público | GET /public/service-enrollment/{token} | Sin body |
| Enviar solicitud pública | POST /public/service-enrollment/{token}/applications | kind, name, representative_name, email, phone, specialty_ids, coverage, experience, consent_version, consent_accepted |
| Aprobar | POST /service-provider-applications/{id}/approve | existing_core_provider_id |
| Rechazar | POST /service-provider-applications/{id}/reject | reason |
| Suspender / archivar | POST /service-providers/{id}/suspend o archive | reason |
| Reactivar | POST /service-providers/{id}/reactivate | Sin body |

Todos llevan prefijo /api/v1. Los endpoints públicos funcionan en la prueba sin sesión ni Authorization. La administración utiliza el contexto de sesión existente y sus permisos de gestionar/aprobar/invitar.

## 5. Pruebas

Resultado: **317 unitarias (56 archivos) y 289 E2E de regresión aprobados, sin flaky; 27 E2E de proveedores repetidos tras el ajuste final de legibilidad, también aprobados. Build correcto y git diff --check correcto.** El build conserva la advertencia previa de chunks >500 kB.

- ServiceNetworkPage.test.jsx: contactos iniciales, error/reintento, clipboard denegado, selección invalidada al buscar, validación por campo, motivo, aprobación/rechazo y permisos existentes.
- ServiceRegistration.test.jsx: validación/consentimiento, body público, fallo de envío con captura conservada, reintento de enlace.
- PropertiesWorkspace.test.jsx: captura conservada durante invalidación, además de carga/error iniciales.
- properties-providers.spec.js: habilitar/especialidades/contacto/invitación/suspender/reactivar/archivar; enlace/aprobar/rechazar; envío público sin sesión. Anchos 360/390/430, Chromium, Android/Chromium e iOS/WebKit; bodies interceptados y ausencia de overflow comprobada con formularios abiertos.
- Regresión general de unitarias, Playwright y build.

Las pruebas del enlace detectaron el desmontaje de la vista y fallaron antes de corregirlo. La prueba de etiqueta detectó los labels anidados. Los tests de contactos, búsqueda modificada y portapapeles también cubren fallos del comportamiento anterior.

## 6. Alcance pendiente / no modificado

No se escribieron registros en dev ni producción: las pruebas usan respuestas simuladas. Falta validar correos de invitación, revisión con permisos y usuarios reales, datos de volumen y teclado en teléfonos físicos. No se implementaron órdenes de mantenimiento, control QR/caseta, autenticación del técnico ni creación delegada de proveedor durante aprobación. El login/invitación de comunidad existente mantiene su contrato propio. No se publicó en Cloudflare ni se hizo commit; los cambios se sirven desde localhost.
