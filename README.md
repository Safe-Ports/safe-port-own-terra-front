# OwnTerra Frontend

Frontend de OwnTerra para el ecosistema inmobiliario: Core central, OwnTerra Lands y modulos operativos de clientes, lotes, contratos, pagos, agenda y documentos.

## Scope Actual

- Login, registro, recuperacion de contrasena y sesion con tokens API.
- Entrada principal en `/ecosistema` como hub del Core.
- Mi Dia: citas, pagos vencidos, tareas y notificaciones consolidadas.
- Agenda Core compartida entre Core, Lands, Neighborhoods y Homes.
- Clientes del ecosistema con identidad unica, apps asignadas, contratos y documentos de identidad.
- Equipo del Core con usuarios, vendedores, acceso por app, roles, scope y comisiones.
- OwnTerra Vault para carpetas y documentos centralizados.
- Finanzas del ecosistema con resumen de ingresos, egresos y cobranza.
- OwnTerra Lands para dashboard, lotes, fraccionamientos, CRM, contratos, pagos, documentos, calculadora y reportes.
- Permisos frontend basados en rol, apps asignadas y permisos enviados por backend cuando existan.

## Roles Y Permisos

El modelo recomendado separa rol global de rol por app:

- Rol global: gobierna acceso al Core y administracion de la organizacion.
- Rol por app: gobierna lo que el usuario puede hacer dentro de Lands, Vault, Finanzas, Homes o Neighborhoods.
- Permisos explicitos: si backend envia `permissions`, complementan o afinan el rol por app.

Roles globales:

- `admin`: acceso completo al Core y administracion de usuarios.
- `vendor`: usuario operativo; sus capacidades finas dependen de apps/permisos asignados.

Roles por app:

- `admin`: control total en esa app.
- `manager`: lectura, escritura, clientes, ventas, documentos y reportes.
- `seller`: lectura, clientes, ventas, agenda y documentos.
- `collections`: lectura, pagos, reportes y clientes.
- `editor`: lectura, escritura y documentos.
- `viewer`: lectura.

El catalogo vive en `src/services/permissions.js`. El backend puede enviar apps del usuario en cualquiera de estas llaves: `apps`, `user_apps`, `app_access` o `applications`.

Forma esperada por app:

```json
{
  "app_key": "lands",
  "role": "seller",
  "is_active": true,
  "permissions": ["lands.clients", "lands.sales"],
  "metadata": { "scope": "assigned" }
}
```

Permisos principales:

- `core.clients`, `core.team`, `core.finance`, `core.vault`, `core.config`
- `lands.read`, `lands.clients`, `lands.sales`, `lands.documents`, `lands.payments`, `lands.reports`
- `vault.read`, `vault.write`, `finanzas.read`, `finanzas.reports`

Scopes recomendados:

- `all`: todo el inventario/operacion.
- `assigned`: solo registros asignados.
- `own`: solo registros creados o propiedad del usuario.

## Flujos Core - Lands

Flujo de equipo:

1. Admin crea usuario en Core.
2. Admin asigna apps, rol por app, comision y scope.
3. Backend devuelve apps/permisos en la sesion o endpoint de perfil.
4. Frontend muestra rutas y acciones segun `canAccessApp` y `canUseFeature`.

Flujo de cliente:

1. Cliente nace en Core como identidad unica.
2. Core asigna apps: Lands, Homes, Neighborhoods.
3. Lands usa esa identidad para pipeline comercial, contratos y pagos.
4. Core muestra historial consolidado sin duplicar al cliente.

Flujo de contrato:

1. Contrato se crea en Lands.
2. Contrato queda ligado a cliente Core y lote Lands.
3. Cliente Core muestra contrato en modo lectura.
4. Pagos generados por contrato alimentan Mi Dia, Pagos y Finanzas.

Flujo de documentos:

1. Identificacion se sube en Core/Vault.
2. Documento queda ligado a cliente, contrato, lote o carpeta.
3. Lands consume documentos reutilizables en modo lectura cuando son de identidad.
4. Vault mantiene administracion central de carpetas y archivos.

Flujo de agenda:

1. Cita se crea desde Core o desde Lands.
2. La cita viaja con `app_key`.
3. Mi Dia consolida las citas del usuario.
4. Agenda Core permite ver y filtrar por app.

Pendientes de backend para cerrar estos flujos:

- Incluir apps/permisos del usuario en login, refresh o endpoint `/me`.
- Aplicar `scope` en queries: `all`, `assigned`, `own`.
- Garantizar identidad unica del cliente entre Core y apps.
- Registrar auditoria para cambios de permisos, comisiones, documentos, contratos y pagos.
- Devolver errores con estructura estandar para que `src/services/errors.js` los traduzca.

## Modulos En Scope Cercano

- Configuracion completa del Core: empresa, apps activas, permisos base y branding.
- Gestion real de tenants/empresas cliente.
- Roadmap visible de apps del ecosistema.
- Auditoria de cambios para permisos, documentos, citas y comisiones.
- Carga CAD automatica de lotes.

## Requisitos

- Node.js 18+.
- Backend disponible en `VITE_API_URL`. En desarrollo local, si se omite, se usa `http://127.0.0.1:8000/api/v1`.
- Los builds de producción requieren `VITE_API_URL` y fallan si no está configurada.

## Desarrollo Local

Instalar dependencias:

```bash
npm install
```

Levantar Vite:

```bash
npm run dev
```

Generar build:

```bash
npm run build
```

## Variables De Entorno

Crear `.env` local a partir de `.env.example`:

```bash
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

En el proveedor de despliegue, configurar `VITE_API_URL` con la URL pública HTTPS del backend antes de ejecutar `npm run build`.

## Notas Tecnicas

- La app usa Vite, React 18, React Router y TanStack Query.
- Los servicios API viven en `src/services`.
- La sesion se guarda en `localStorage` bajo `lm_session`.
- Los permisos frontend se centralizan en `src/services/permissions.js`.
- Los errores mostrados al usuario se normalizan en `src/services/errors.js`.
- La PWA se configura en `vite.config.js` con `vite-plugin-pwa`.

## Estandar De Errores Frontend

El frontend acepta varias formas de error del backend y las traduce a mensajes seguros para usuario:

```json
{ "detail": "Mensaje legible" }
```

```json
{ "error": { "code": "RESOURCE_CONFLICT", "message": "Mensaje legible" } }
```

```json
{ "detail": [{ "loc": ["body", "email"], "msg": "Correo invalido" }] }
```

Reglas de UI:

- Validaciones locales y errores por campo se muestran inline.
- Errores de acciones API se muestran con toast.
- Errores 401, 403, 404, 409, 422, 429 y 5xx tienen fallback humano si el backend no manda mensaje.
- Mensajes tecnicos, trazas o errores internos no se muestran directamente al usuario.
