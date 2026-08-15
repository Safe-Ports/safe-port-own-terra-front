# Catálogo de Errores — Frontend

El frontend **consume** el catálogo generado desde el backend. Nunca inventa códigos ni mensajes propios.

---

## Archivos clave

| Archivo | Rol |
|---|---|
| `src/errors/catalog.generated.js` | Copia generada del catálogo — **no editar a mano** |
| `src/errors/catalog.js` | Acceso al catálogo + constantes `FALLBACK_CODE`, `NET_CODE`, `UI_CODE` |
| `src/errors/parseApiError.js` | Normaliza cualquier error (axios / red / crash) a un modelo común |
| `src/services/api.js` | Interceptor axios: Sentry tagging + refresh de token |
| `src/context/AppContext.jsx` | `showError(err, fallback)` — muestra toast de error |
| `src/components/shared/Toast.jsx` | Toast con severidad (rojo / ámbar / verde) |
| `src/components/shared/InlineError.jsx` | Popup flotante o bloque inline según `onDismiss` |
| `src/components/shared/FieldError.jsx` | Mensaje rojo debajo de un input (validación de campo) |
| `src/hooks/useFieldErrors.js` | Hook para validación por campo (inline) |
| `scripts/sync-errors.mjs` | Genera `catalog.generated.js` desde `shared/errors.catalog.json` |

---

## Modelo de error normalizado

`parseApiError(err, fallback)` devuelve siempre:

```js
{
  code: "OT-PAY-3001",       // código del catálogo
  title: "No se pudo completar",  // título corto según severidad
  message: "El pago ya fue procesado anteriormente.",
  action: "No es necesario volver a procesarlo.",
  requestId: "ref_a1b2c3d4e5f6",  // null si no hay
  httpStatus: 409,                 // null si sin respuesta
  severity: "warning",            // "fatal" | "error" | "warning"
  isLocalRef: false,              // true si la Ref la generó el front (sin red)
}
```

### Casos que maneja `parseApiError`

| Situación | Código resultante | requestId |
|---|---|---|
| Backend responde con envelope OT- | El del envelope | `error.request_id` del backend |
| Sin respuesta (red caída, timeout) | `OT-NET-9001` | `ref_local_...` generado en cliente |
| Respuesta sin envelope (proxy, nginx) | Mapeado por status HTTP | Header `X-Request-ID` o `ref_local_...` |

---

## Cuándo usar cada componente

### `showError(err, fallback)` — errores de API

Para cualquier error que venga de una llamada al backend. Muestra un toast con severidad y código de referencia.

```jsx
const { showError } = useAppContext();

// En un catch de mutación manual:
try {
  await clientService.save(data);
} catch (err) {
  showError(err, "Error al guardar el cliente");
}

// En onError de useMutation:
onError: (err) => showError(err, "Error al guardar"),
```

### `InlineError` con `onDismiss` — errores de API en formularios modales

Cuando quieres mostrar el error dentro del modal en vez del toast, pero el error vino del servidor.

```jsx
const [formError, setFormError] = useState(null);

// En onError de la mutación:
onError: (err) => setFormError(parseApiError(err, "Error al guardar")),

// En el JSX (fuera del formulario, sobre los campos):
<InlineError error={formError} onDismiss={() => setFormError(null)} />
```

### `FieldError` + `useFieldErrors` — validación de campos en cliente

Para errores de validación local (campo vacío, formato inválido) que deben mostrarse **debajo del input**, no como popup.

```jsx
const fe = useFieldErrors();

// Validar antes de enviar:
const errs = {};
if (!form.name.trim()) errs.name = "El nombre es obligatorio.";
if (!emailOk(form.email)) errs.email = "Ingresa un correo válido.";
if (Object.keys(errs).length) { fe.setErrors(errs); return; }

// En el input:
<input {...fe.fieldProps("name", "fi")}
  onChange={(e) => { setForm(...); fe.clear("name"); }} />
<FieldError msg={fe.errors.name} />
```

Para errores 422 del backend mapeados a campos:

```jsx
// En catch:
if (!fe.fromServer(err, { nombre: "name", correo: "email" })) {
  showError(err, "Error al guardar");
}
```

### `InlineError` sin `onDismiss` — bloque inline (LoginScreen)

Sin `onDismiss`, `InlineError` se renderiza como un bloque en el flujo normal (no popup). Úsalo solo en pantallas de login/registro donde no hay un overlay.

---

## Severidades y colores

| Severidad | Color | Cuándo |
|---|---|---|
| `fatal` | Rojo oscuro | Crash interno `OT-SYS-9000`, servicio caído |
| `error` | Rojo | Sin red `OT-NET-9001`, error de render `OT-UI-9001` |
| `warning` | Ámbar | Errores de negocio esperados (validación, conflicto, permisos) |

El color lo determina automáticamente el catálogo — no hay que setearlo a mano.

---

## Actualizar el catálogo

Cuando el backend agrega códigos nuevos:

```bash
# Desde la raíz del monorepo:
scripts/check-errors-catalog.sh --fix

# Commitea:
#   shared/errors.catalog.json
#   src/errors/catalog.generated.js
```

Para verificar que está sincronizado (CI):

```bash
scripts/check-errors-catalog.sh
```

---

## Reglas de oro

- **Nunca edites `catalog.generated.js` a mano.** Se sobreescribe al sincronizar.
- **Validación de campo → `FieldError`**. Errores de API → `showError` o `InlineError` con `onDismiss`.
- **No uses `alert()`** para errores — siempre `showError`.
- Si llega un código desconocido, el catálogo cae a `OT-SYS-9000` automáticamente.
- Los errores sin red generan una `ref_local_...` en el cliente que coincide con el tag `request_id` en Sentry.
